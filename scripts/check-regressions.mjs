import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const nodeRequire = createRequire(import.meta.url);

const serverSource = fs.readFileSync(path.join(repoRoot, 'server.js'), 'utf8');
const backgroundSource = fs.readFileSync(path.join(repoRoot, 'js/background.js'), 'utf8');
const uiListenersSource = fs.readFileSync(path.join(repoRoot, 'js/modules/ui-listeners-runtime.js'), 'utf8');

let failures = 0;

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function createMockResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    }
  };
}

function createEventTarget(initialValue = '') {
  return {
    value: initialValue,
    textContent: '',
    checked: false,
    style: {},
    listeners: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    dispatch(eventName) {
      const handler = this.listeners[eventName];
      if (typeof handler === 'function') {
        handler({ target: this, currentTarget: this, preventDefault() {} });
      }
    },
    closest() { return null; },
    click() {},
    setAttribute() {}
  };
}

function loadServerModule({ port = '8080', rootDir = repoRoot } = {}) {
  const records = {
    handler: null,
    listenPort: null,
    readFiles: []
  };

  const fakeHttp = {
    createServer(handler) {
      records.handler = handler;
      return {
        listen(listenPort, callback) {
          records.listenPort = listenPort;
          if (typeof callback === 'function') {
            callback();
          }
        }
      };
    }
  };

  const fakeFs = {
    readFile(filePath, encodingOrCallback, callback) {
      const handler = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
      const resolvedPath = String(filePath);

      if (resolvedPath.endsWith('version.txt')) {
        handler(null, '2.4.3\n');
        return;
      }

      records.readFiles.push(resolvedPath);
      handler(null, Buffer.from('ok'));
    }
  };

  const sandbox = {
    require(moduleName) {
      if (moduleName === 'http') return fakeHttp;
      if (moduleName === 'fs') return fakeFs;
      return nodeRequire(moduleName);
    },
    process: { env: { PORT: String(port) } },
    __dirname: rootDir,
    console: { log() {}, error() {}, warn() {} },
    Buffer,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(serverSource, sandbox, { filename: 'server.js' });
  return records;
}

async function invokeHandler(handler, url) {
  const response = createMockResponse();
  const request = {
    url,
    headers: { host: 'localhost:8080' }
  };

  await handler(request, response);
  return response;
}

function loadBackgroundManager(localStorageValues = {}) {
  const sandbox = {
    window: {},
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(localStorageValues, key)
          ? String(localStorageValues[key])
          : null;
      },
      setItem() {},
      removeItem() {}
    },
    console: { log() {}, error() {}, warn() {} },
    setTimeout() {},
    clearTimeout() {},
    JSON,
    Math,
    Buffer
  };

  vm.runInNewContext(backgroundSource, sandbox, { filename: 'js/background.js' });
  return sandbox.window.BackgroundManager;
}

function loadUiListenersRuntime() {
  const elements = {
    'bg-opacity-slider': createEventTarget('100'),
    'bg-opacity-value': createEventTarget('100'),
    'bg-opacity-input': createEventTarget('100')
  };

  const document = {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    addEventListener() {}
  };

  const sandbox = {
    window: {},
    document,
    localStorage: {
      setItem() {},
      getItem() {
        return null;
      }
    },
    console: { log() {}, error() {}, warn() {} },
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(uiListenersSource, sandbox, { filename: 'js/modules/ui-listeners-runtime.js' });

  const calls = { opacity: null };
  const board = {
    settingsManager: { populateGlobalFontSelect() {} },
    backgroundManager: {
      setOpacity(value) {
        calls.opacity = value;
      }
    },
    updateMaxCanvasScale() {},
    updateZoomControlsVisibility() {},
    updateImportExportBtnVisibility() {},
    updateFullscreenBtnVisibility() {},
    applyCanvasSize() {},
    closeSettings() {},
    clearCanvas() {},
    bringElementToFront() {},
    getCacheSizeSummary: async () => ({ settings: 0, canvas: 0, other: 0 }),
    formatBytes(value) {
      return String(value);
    },
    clearSelectedCache: async () => {},
    updateCacheSizeDisplay: async () => {},
    showConfigDiffModal() {}
  };

  sandbox.window.AboardUiListenersRuntime.setupSettingsListeners(board);

  return { elements, calls };
}

await runCheck('server keeps PORT=0 instead of falling back to 8080', async () => {
  const records = loadServerModule({ port: '0' });
  assert.equal(records.listenPort, 0);
});

await runCheck('server rejects raw and encoded traversal probes with 403', async () => {
  const records = loadServerModule();
  assert.equal(typeof records.handler, 'function');

  const rawTraversal = await invokeHandler(records.handler, '/js/../package.json');
  assert.equal(rawTraversal.statusCode, 403);

  const encodedTraversal = await invokeHandler(records.handler, '/js/%2e%2e%2fpackage.json');
  assert.equal(encodedTraversal.statusCode, 403);
});

await runCheck('background manager preserves a saved opacity of 0', async () => {
  const BackgroundManager = loadBackgroundManager({ bgOpacity: '0' });
  const manager = new BackgroundManager({}, {});
  assert.equal(manager.bgOpacity, 0);
});

await runCheck('background opacity input accepts 0 without snapping back to 100', async () => {
  const { elements, calls } = loadUiListenersRuntime();
  const opacityInput = elements['bg-opacity-input'];
  const opacitySlider = elements['bg-opacity-slider'];
  const opacityValue = elements['bg-opacity-value'];

  opacityInput.value = '0';
  opacityInput.dispatch('input');

  assert.equal(String(opacityInput.value), '0');
  assert.equal(String(opacitySlider.value), '0');
  assert.equal(String(opacityValue.textContent), '0');
  assert.equal(calls.opacity, 0);
});

if (failures > 0) {
  console.error(`\n${failures} regression check(s) failed.`);
  process.exit(1);
}

console.log('\nAll regression checks passed.');
