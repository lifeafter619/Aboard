const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk = '') {
      this.body += chunk;
      resolveEnd();
    }
  };
}

function assertSecurityHeaders(headers) {
  assert.equal(headers?.['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers?.['Referrer-Policy'], 'strict-origin-when-cross-origin');
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

async function run() {
  await testDirectoryRequestReturnsNotFoundInsteadOfServerError();
  await testMalformedRequestUrlReturnsBadRequestInsteadOfThrowing();
  await testStaticResponseIncludesSecurityHeaders();
  console.log('server-static-paths.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
