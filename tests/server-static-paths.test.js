const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const vm = require('node:vm');

const EXPECTED_SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Frame-Options': 'SAMEORIGIN'
});

function loadServerHarness() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  let requestHandler = null;
  let readFileImpl = null;

  const fsStub = {
    readFile(...args) {
      return readFileImpl(...args);
    }
  };

  const httpStub = {
    createServer(handler) {
      requestHandler = handler;
      return {
        listen(_port, callback) {
          callback?.();
        }
      };
    }
  };

  const requireStub = (moduleName) => {
    switch (moduleName) {
      case 'http':
        return httpStub;
      case 'fs':
        return fsStub;
      case 'path':
        return path;
      case 'url':
        return require('node:url');
      case 'zlib':
        return require('node:zlib');
      default:
        throw new Error(`Unsupported module: ${moduleName}`);
    }
  };

  const context = {
    require: requireStub,
    console: {
      log() {}
    },
    process: {
      env: {}
    },
    __dirname: path.join(__dirname, '..')
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'server.js' }).runInContext(context);

  return {
    get requestHandler() {
      return requestHandler;
    },
    setReadFileImpl(impl) {
      readFileImpl = impl;
    }
  };
}

function createResponseRecorder() {
  let resolveEnd;
  const ended = new Promise((resolve) => {
    resolveEnd = resolve;
  });

  return {
    ended,
    statusCode: null,
    headers: null,
    body: '',
    chunks: [],
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk = '') {
      if (chunk !== '') {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        this.chunks.push(buffer);
        this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      }
      resolveEnd();
    },
    get rawBody() {
      return Buffer.concat(this.chunks);
    }
  };
}

function assertSecurityHeaders(headers) {
  Object.entries(EXPECTED_SECURITY_HEADERS).forEach(([name, value]) => {
    assert.equal(headers?.[name], value, `${name} should be set on every response`);
  });
}

async function testDirectoryRequestReturnsNotFoundInsteadOfServerError() {
  const harness = loadServerHarness();
  harness.setReadFileImpl((filePath, callback) => {
    assert.match(filePath, /[\\/]css[\\/]?$/);
    callback({ code: 'EISDIR' });
  });

  const res = createResponseRecorder();
  harness.requestHandler(
    {
      url: '/css/',
      headers: { host: 'localhost:8080' }
    },
    res
  );

  await res.ended;

  assert.equal(res.statusCode, 404);
  assertSecurityHeaders(res.headers);
  assert.equal(res.body, JSON.stringify({ error: 'Not Found' }));
}

async function testMalformedRequestUrlReturnsBadRequestInsteadOfThrowing() {
  const harness = loadServerHarness();
  harness.setReadFileImpl(() => {
    throw new Error('readFile should not run for malformed request URLs');
  });

  const res = createResponseRecorder();
  assert.doesNotThrow(() => {
    harness.requestHandler(
      {
        url: 'http://[::1',
        headers: { host: 'localhost:8080' }
      },
      res
    );
  });

  await res.ended;

  assert.equal(res.statusCode, 400);
  assertSecurityHeaders(res.headers);
  assert.equal(res.body, JSON.stringify({ error: 'Bad Request' }));
}

async function testStaticResponseIncludesSecurityHeaders() {
  const harness = loadServerHarness();
  harness.setReadFileImpl((filePath, callback) => {
    assert.match(filePath, /[\\/]index\.html$/);
    callback(null, Buffer.from('<!doctype html>'));
  });

  const res = createResponseRecorder();
  harness.requestHandler(
    {
      url: '/index.html',
      headers: { host: 'localhost:8080' }
    },
    res
  );

  await res.ended;

  assert.equal(res.statusCode, 200);
  assertSecurityHeaders(res.headers);
  assert.equal(res.headers?.['Content-Type'], 'text/html; charset=utf-8');
}

async function testTextStaticResponseUsesGzipWhenAccepted() {
  const harness = loadServerHarness();
  const originalBody = Buffer.from('const payload = "Aboard";\n'.repeat(160));
  harness.setReadFileImpl((filePath, callback) => {
    assert.match(filePath, /[\\/]js[\\/]drawing\.js$/);
    callback(null, originalBody);
  });

  const res = createResponseRecorder();
  harness.requestHandler(
    {
      url: '/js/drawing.js',
      headers: {
        host: 'localhost:8080',
        'accept-encoding': 'gzip'
      }
    },
    res
  );

  await res.ended;

  assert.equal(res.statusCode, 200);
  assertSecurityHeaders(res.headers);
  assert.equal(res.headers?.['Content-Type'], 'application/javascript; charset=utf-8');
  assert.equal(res.headers?.['Content-Encoding'], 'gzip');
  assert.equal(res.headers?.Vary, 'Accept-Encoding');
  assert.equal(zlib.gunzipSync(res.rawBody).toString('utf8'), originalBody.toString('utf8'));
}

async function testEncodingQZeroIsRespected() {
  const harness = loadServerHarness();
  const originalBody = Buffer.from('const payload = "Aboard";\n'.repeat(160));
  harness.setReadFileImpl((filePath, callback) => {
    assert.match(filePath, /[\\/]js[\\/]drawing\.js$/);
    callback(null, originalBody);
  });

  const res = createResponseRecorder();
  harness.requestHandler(
    {
      url: '/js/drawing.js',
      headers: {
        host: 'localhost:8080',
        'accept-encoding': 'br;q=0, gzip;q=0, *;q=1'
      }
    },
    res
  );

  await res.ended;

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers?.['Content-Encoding'], undefined);
  assert.equal(res.rawBody.toString('utf8'), originalBody.toString('utf8'));
}

function testVercelConfigDefinesMatchingSecurityHeaders() {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)')?.headers || [];
  const headerMap = Object.fromEntries(globalHeaders.map((entry) => [entry.key, entry.value]));

  Object.entries(EXPECTED_SECURITY_HEADERS).forEach(([name, value]) => {
    assert.equal(headerMap[name], value, `vercel.json should set ${name}`);
  });
}

async function run() {
  await testDirectoryRequestReturnsNotFoundInsteadOfServerError();
  await testMalformedRequestUrlReturnsBadRequestInsteadOfThrowing();
  await testStaticResponseIncludesSecurityHeaders();
  await testTextStaticResponseUsesGzipWhenAccepted();
  await testEncodingQZeroIsRespected();
  testVercelConfigDefinesMatchingSecurityHeaders();
  console.log('server-static-paths.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
