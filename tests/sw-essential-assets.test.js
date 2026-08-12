const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const REPO_ROOT = path.join(__dirname, '..');
const ENTRY_FILES = [
  'js/main.js',
  'js/app/bootstrap.js'
];
const LEGACY_MANIFEST_ARRAY_NAMES = [
  'VISIBLE_CORE_SERVICE_SCRIPTS',
  'VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS',
  'VISIBLE_CORE_STARTUP_SCRIPTS',
  'POST_VISIBLE_SERVICE_SCRIPTS',
  'POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS',
  'POST_VISIBLE_STARTUP_SCRIPTS'
];

const IMPORT_RE = /^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm;

function readText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function collectStaticModuleClosure(entryFiles) {
  const visited = new Set();
  const queue = [...entryFiles];

  while (queue.length > 0) {
    const relPath = queue.shift().replace(/\\/g, '/');
    if (visited.has(relPath)) {
      continue;
    }

    visited.add(relPath);
    const source = readText(relPath);
    for (const match of source.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        continue;
      }

      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(relPath), specifier)
      );
      queue.push(resolved);
    }
  }

  return [...visited].sort();
}

function readEssentialCoreAssets() {
  const source = readText('sw.js');
  const match = source.match(/const ESSENTIAL_CORE_ASSETS = \[(.*?)\];/s);
  assert.ok(match, 'ESSENTIAL_CORE_ASSETS should exist in sw.js');

  return new Set(
    [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) =>
      assetPath.replace(/^\.\//, '')
    )
  );
}

function readCoreAssets() {
  const source = readText('sw.js');
  const match = source.match(/const CORE_ASSETS = \[(.*?)\];/s);
  assert.ok(match, 'CORE_ASSETS should exist in sw.js');

  return new Set(
    [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) =>
      assetPath.replace(/^\.\//, '')
    )
  );
}

function readPngDimensions(relPath) {
  const png = fs.readFileSync(path.join(REPO_ROOT, relPath));
  assert.equal(
    png.subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a',
    `${relPath} should be a valid PNG file`
  );

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

function readPngContentBounds(relPath) {
  const png = fs.readFileSync(path.join(REPO_ROOT, relPath));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(png[24], 8, `${relPath} should use 8-bit PNG channels`);
  assert.equal(png[25], 2, `${relPath} should use RGB PNG color data`);
  assert.equal(png[28], 0, `${relPath} should not use PNG interlacing`);

  const idatChunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') {
      idatChunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }

  const encoded = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 3;
  const rowLength = width * bytesPerPixel;
  const previous = Buffer.alloc(rowLength);
  const current = Buffer.alloc(rowLength);
  const bounds = { left: width, top: height, right: -1, bottom: -1 };
  let sourceOffset = 0;

  const paeth = (left, above, upperLeft) => {
    const estimate = left + above - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const aboveDistance = Math.abs(estimate - above);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
    return aboveDistance <= upperLeftDistance ? above : upperLeft;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = encoded[sourceOffset++];
    for (let index = 0; index < rowLength; index += 1) {
      const raw = encoded[sourceOffset++];
      const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
      const above = previous[index];
      const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? above
          : filter === 3 ? Math.floor((left + above) / 2)
            : filter === 4 ? paeth(left, above, upperLeft)
              : 0;
      current[index] = (raw + predictor) & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = x * bytesPerPixel;
      const isWhite = current[pixelOffset] >= 250
        && current[pixelOffset + 1] >= 250
        && current[pixelOffset + 2] >= 250;
      if (!isWhite) {
        bounds.left = Math.min(bounds.left, x);
        bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x);
        bounds.bottom = Math.max(bounds.bottom, y);
      }
    }

    current.copy(previous);
  }

  return bounds;
}

function readLegacyManifestArray(arrayName) {
  const source = readText('js/app/legacy-manifest.js');
  const match = source.match(new RegExp(`export const ${arrayName} = \\[(.*?)\\];`, 's'));
  assert.ok(match, `${arrayName} should exist in js/app/legacy-manifest.js`);

  return [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) => assetPath);
}

function testEssentialCacheCoversOfflineBootstrapImportClosure() {
  const requiredModules = collectStaticModuleClosure(ENTRY_FILES);
  const essentialAssets = readEssentialCoreAssets();
  const missingModules = requiredModules.filter((modulePath) => !essentialAssets.has(modulePath));

  assert.deepEqual(
    missingModules,
    [],
    `ESSENTIAL_CORE_ASSETS is missing offline bootstrap modules: ${missingModules.join(', ')}`
  );
}

function testEssentialCacheCoversLegacyStartupAssets() {
  const essentialAssets = readEssentialCoreAssets();
  const requiredAssets = LEGACY_MANIFEST_ARRAY_NAMES.flatMap((arrayName) => readLegacyManifestArray(arrayName));
  const missingAssets = requiredAssets.filter((assetPath) => !essentialAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `ESSENTIAL_CORE_ASSETS is missing legacy startup assets: ${missingAssets.join(', ')}`
  );
}

function testCorePrecacheExcludesLargeLazyAssets() {
  const coreAssets = readCoreAssets();
  const largeLazyAssets = [
    'js/libs/xlsx.full.min.js',
    'js/libs/fflate.min.js',
    'img/ruler_1.png',
    'img/ruler_2.png',
    'img/set_square_1.png',
    'img/set_square_2.png',
    'sounds/class-bell.MP3',
    'sounds/exam-end.MP3',
    'sounds/gentle-alarm.MP3',
    'sounds/digital-beep.MP3'
  ];
  const stillPrecached = largeLazyAssets.filter((asset) => coreAssets.has(asset));

  assert.deepEqual(
    stillPrecached,
    [],
    `Large lazy assets should be runtime-cached on demand, not core-precached: ${stillPrecached.join(', ')}`
  );
}

function testRuntimeCacheCoversLazyTimerAudioAssets() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { isRuntimeCacheableRequest };`;
  const sandbox = {
    console: {
      warn() {}
    },
    self: {
      location: {
        origin: 'https://example.test'
      },
      addEventListener() {}
    },
    Set,
    URL
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const createRequest = (destination = '') => ({
    mode: 'cors',
    destination,
    headers: {
      has() {
        return false;
      }
    }
  });
  const audioUrl = new URL('https://example.test/sounds/class-bell.MP3');

  assert.equal(
    sandbox.__swTestExports.isRuntimeCacheableRequest(createRequest('audio'), audioUrl),
    true,
    'timer audio requests should be runtime-cacheable when the browser marks destination=audio'
  );
  assert.equal(
    sandbox.__swTestExports.isRuntimeCacheableRequest(createRequest(''), audioUrl),
    true,
    'timer audio requests should be runtime-cacheable by file extension when destination is unavailable'
  );
}

function testCorePrecacheCoversIndexClassicScripts() {
  const html = readText('index.html');
  const coreAssets = readCoreAssets();
  const scriptSources = [...html.matchAll(/<script\s+(?![^>]*type=["']module["'])[^>]*src=["']([^"']+)["']/gi)]
    .map(([, assetPath]) => assetPath.replace(/^\.\//, ''));
  const missingAssets = scriptSources.filter((assetPath) => !coreAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `CORE_ASSETS is missing classic script entries used by index.html: ${missingAssets.join(', ')}`
  );
}

function testCorePrecacheCoversIndexStylesheets() {
  const html = readText('index.html');
  const coreAssets = readCoreAssets();
  const stylesheetSources = [...html.matchAll(/<link\s+[^>]*(?:rel=["']stylesheet["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']stylesheet["'])/gi)]
    .map(([, hrefAfterRel, hrefBeforeRel]) => (hrefAfterRel || hrefBeforeRel).replace(/^\.\//, ''));
  const missingAssets = stylesheetSources.filter((assetPath) => !coreAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `CORE_ASSETS is missing stylesheet entries used by index.html: ${missingAssets.join(', ')}`
  );
}

async function testNavigationTimeoutFallsBackAndRefreshesInBackground() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { navigationNetworkFirst };`;
  let resolveNetwork;
  const networkResponsePromise = new Promise((resolve) => {
    resolveNetwork = resolve;
  });
  const cachedResponse = new Response('<html>cached</html>', {
    headers: { 'content-type': 'text/html' }
  });
  const cacheWrites = [];
  const cache = {
    async match(key) {
      assert.equal(key, './index.html');
      return cachedResponse.clone();
    },
    async put(key, response) {
      cacheWrites.push({ key, body: await response.text() });
    }
  };
  const sandbox = {
    console: { warn() {} },
    self: {
      location: { origin: 'https://example.test' },
      addEventListener() {}
    },
    caches: { async open() { return cache; } },
    fetch() { return networkResponsePromise; },
    Headers,
    Request,
    Response,
    Promise,
    Set,
    URL,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  let backgroundRefresh = null;
  const event = {
    waitUntil(promise) {
      backgroundRefresh = promise;
    }
  };
  const response = await sandbox.__swTestExports.navigationNetworkFirst(
    { url: 'https://example.test/board', mode: 'navigate' },
    { timeoutMs: 1, event }
  );

  assert.equal(await response.text(), '<html>cached</html>',
    'a stalled navigation should quickly return the cached app shell');
  assert.ok(backgroundRefresh, 'the late network request should keep running as service-worker background work');

  resolveNetwork(new Response('<html>fresh</html>', {
    status: 200,
    headers: { 'content-type': 'text/html' }
  }));
  await backgroundRefresh;
  assert.deepEqual(cacheWrites, [{ key: './index.html', body: '<html>fresh</html>' }],
    'a late successful navigation should refresh the cached app shell');
}

async function testFailedNavigationResponseFallsBackToCachedShell() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { navigationNetworkFirst };`;
  const cachedResponse = new Response('<html>cached</html>');
  const cache = {
    async match() {
      return cachedResponse.clone();
    },
    async put() {
      assert.fail('an unsuccessful navigation response must not replace the cached shell');
    }
  };
  const sandbox = {
    console: { warn() {} },
    self: { location: { origin: 'https://example.test' }, addEventListener() {} },
    caches: { async open() { return cache; } },
    async fetch() { return new Response('gateway error', { status: 502 }); },
    Headers,
    Request,
    Response,
    Promise,
    Set,
    URL,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const response = await sandbox.__swTestExports.navigationNetworkFirst(
    { url: 'https://example.test/board', mode: 'navigate' },
    { timeoutMs: 50 }
  );
  assert.equal(await response.text(), '<html>cached</html>',
    'a 5xx navigation should use the cached app shell instead of showing a server error page');
}

async function testNonHtmlNavigationDoesNotReplaceCachedShell() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { navigationNetworkFirst };`;
  const cacheWrites = [];
  const cache = {
    async match() {
      return null;
    },
    async put(key, response) {
      cacheWrites.push({
        key,
        contentType: response.headers.get('content-type'),
        body: await response.text()
      });
    }
  };
  const sandbox = {
    console: { warn() {} },
    self: { location: { origin: 'https://example.test' }, addEventListener() {} },
    caches: { async open() { return cache; } },
    async fetch() {
      return new Response('<svg>icon</svg>', {
        status: 200,
        headers: { 'content-type': 'image/svg+xml' }
      });
    },
    Headers,
    Request,
    Response,
    Promise,
    Set,
    URL,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const response = await sandbox.__swTestExports.navigationNetworkFirst(
    { url: 'https://example.test/img/icon.svg', mode: 'navigate' },
    { timeoutMs: 50 }
  );

  assert.equal(await response.text(), '<svg>icon</svg>');
  assert.deepEqual(cacheWrites, [],
    'a non-HTML navigation response must not replace the cached app shell');
}

async function testRangeAudioUsesAFullResponseCache() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { handleMediaRequest, MEDIA_CACHE_NAME };`;
  const audioBytes = Uint8Array.from({ length: 10 }, (_, index) => index);
  let cachedResponse = null;
  let fetchCalls = 0;
  const cache = {
    async match() {
      return cachedResponse?.clone() || null;
    },
    async put(_request, response) {
      cachedResponse = response.clone();
    }
  };
  const sandbox = {
    console: { warn() {} },
    self: {
      location: { origin: 'https://example.test' },
      addEventListener() {}
    },
    caches: { async open() { return cache; } },
    async fetch(request) {
      fetchCalls += 1;
      assert.equal(request.headers.has('range'), false,
        'the cache-filling media request must remove Range so the response is complete');
      return new Response(audioBytes, {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' }
      });
    },
    Headers,
    Request,
    Response,
    Promise,
    Set,
    URL,
    Uint8Array,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const firstResponse = await sandbox.__swTestExports.handleMediaRequest(new Request(
    'https://example.test/sounds/class-bell.MP3',
    { headers: { Range: 'bytes=2-5' } }
  ));
  assert.equal(firstResponse.status, 206);
  assert.equal(firstResponse.headers.get('content-range'), 'bytes 2-5/10');
  assert.deepEqual([...new Uint8Array(await firstResponse.arrayBuffer())], [2, 3, 4, 5]);
  assert.equal(fetchCalls, 1, 'the first range request should fetch one complete media response');

  sandbox.fetch = async () => {
    throw new Error('offline');
  };
  const cachedRangeResponse = await sandbox.__swTestExports.handleMediaRequest(new Request(
    'https://example.test/sounds/class-bell.MP3',
    { headers: { Range: 'bytes=6-' } }
  ));
  assert.equal(cachedRangeResponse.status, 206);
  assert.deepEqual([...new Uint8Array(await cachedRangeResponse.arrayBuffer())], [6, 7, 8, 9],
    'later range requests should be sliced from the cached complete response while offline');
}

function testInstallablePwaIconsExistAndArePrecached() {
  const manifest = JSON.parse(readText('manifest.json'));
  const coreAssets = readCoreAssets();
  const requiredIcons = [
    { path: 'img/icon-192.png', size: 192 },
    { path: 'img/icon-512.png', size: 512 }
  ];

  for (const { path: iconPath, size } of requiredIcons) {
    const icon = manifest.icons?.find((entry) => entry.src?.split('?')[0] === iconPath);
    assert.ok(icon, `manifest.json should include ${iconPath}`);
    assert.equal(icon.type, 'image/png', `${iconPath} should declare image/png`);
    assert.equal(icon.sizes, `${size}x${size}`, `${iconPath} should declare its exact dimensions`);
    assert.deepEqual(
      readPngDimensions(iconPath),
      { width: size, height: size },
      `${iconPath} should contain a ${size}x${size} PNG`
    );
    const bounds = readPngContentBounds(iconPath);
    assert.ok(bounds.left <= size * 0.05, `${iconPath} artwork should reach the left side of the canvas`);
    assert.ok(bounds.right >= size * 0.95, `${iconPath} artwork should reach the right side of the canvas`);
    assert.ok(coreAssets.has(icon.src), `${icon.src} should be available in the offline core cache`);
  }

  const maskableIcon = manifest.icons?.find((entry) => (
    String(entry.purpose || '').split(/\s+/).includes('maskable')
  ));
  assert.equal(maskableIcon?.src?.split('?')[0], 'img/icon-512.png',
    'manifest.json should expose the 512px PNG as a maskable icon');
}

async function testOptionalPrecacheLimitsConcurrentFetches() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { precacheCoreAssets, CORE_ASSETS, ESSENTIAL_CORE_ASSETS };`;
  let activeFetches = 0;
  let maxActiveFetches = 0;
  let optionalFetchCount = 0;

  const sandbox = {
    console: {
      warn() {}
    },
    self: {
      location: {
        origin: 'https://example.test'
      },
      addEventListener() {}
    },
    fetch: async () => {
      activeFetches += 1;
      optionalFetchCount += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise((resolve) => setTimeout(resolve, 0));
      activeFetches -= 1;
      return {
        ok: true,
        status: 200
      };
    },
    Promise,
    Set,
    URL,
    setTimeout,
    Request: class RequestStub {
      constructor(url, init = {}) {
        this.url = url;
        this.cache = init.cache;
      }
    }
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const cache = {
    async addAll(assets) {
      assert.deepEqual(
        assets.map((entry) => (typeof entry === 'string' ? entry : entry.url)),
        sandbox.__swTestExports.ESSENTIAL_CORE_ASSETS
      );
      for (const entry of assets) {
        assert.equal(
          entry.cache,
          'reload',
          'essential precache requests must bypass the HTTP cache so a new SW version never installs stale files'
        );
      }
    },
    async put() {}
  };

  await sandbox.__swTestExports.precacheCoreAssets(cache);

  assert.ok(optionalFetchCount > 6, 'test fixture should exercise more optional assets than the concurrency cap');
  assert.ok(
    maxActiveFetches <= 6,
    `optional service worker precache fetches should be capped at 6 concurrent requests, saw ${maxActiveFetches}`
  );
}

async function run() {
  testEssentialCacheCoversOfflineBootstrapImportClosure();
  testEssentialCacheCoversLegacyStartupAssets();
  testCorePrecacheExcludesLargeLazyAssets();
  testRuntimeCacheCoversLazyTimerAudioAssets();
  await testNavigationTimeoutFallsBackAndRefreshesInBackground();
  await testFailedNavigationResponseFallsBackToCachedShell();
  await testNonHtmlNavigationDoesNotReplaceCachedShell();
  await testRangeAudioUsesAFullResponseCache();
  testCorePrecacheCoversIndexClassicScripts();
  testCorePrecacheCoversIndexStylesheets();
  testInstallablePwaIconsExistAndArePrecached();
  await testOptionalPrecacheLimitsConcurrentFetches();
  console.log('sw-essential-assets.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
