import { spawn } from 'node:child_process';
import { access, mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const PORT = process.env.PORT || '18080';
const DEBUG_PORT = process.env.DEBUG_PORT || '18081';
const TARGET_URL = process.env.TARGET_URL || '';
const BASE_URL = TARGET_URL || `http://127.0.0.1:${PORT}`;
const STATIC_ROOT = process.env.STATIC_ROOT || '';
const CHROME_PATH = process.env.CHROME_PATH || '';
const EDGE_PATH = process.env.EDGE_PATH || '';
const PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '';
const WINDOWS_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

function createFatalCdpError(message, cause = null) {
  const error = new Error(message);
  error.code = 'CDP_CONNECTION_CLOSED';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function shouldRetryWaitUntilError(error) {
  return error?.code !== 'CDP_CONNECTION_CLOSED';
}

async function pathExists(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getPlaywrightBrowserRoots() {
  const roots = [];
  if (PLAYWRIGHT_BROWSERS_PATH && PLAYWRIGHT_BROWSERS_PATH !== '0') {
    roots.push(PLAYWRIGHT_BROWSERS_PATH);
  }
  if (process.env.LOCALAPPDATA) {
    roots.push(join(process.env.LOCALAPPDATA, 'ms-playwright'));
  }
  if (process.env.USERPROFILE) {
    roots.push(join(process.env.USERPROFILE, '.cache', 'ms-playwright'));
  }
  return [...new Set(roots)];
}

async function collectPlaywrightChromiumCandidates() {
  const candidates = [];
  const executableSuffixes = [
    ['chrome-win64', 'chrome.exe'],
    ['chrome-win', 'chrome.exe'],
    ['chrome-linux', 'chrome'],
    ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium']
  ];

  for (const root of getPlaywrightBrowserRoots()) {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    const chromiumDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const directory of chromiumDirs) {
      for (const suffix of executableSuffixes) {
        candidates.push(join(root, directory, ...suffix));
      }
    }
  }

  return candidates;
}

async function resolveBrowserPath() {
  const candidates = [
    process.env.BROWSER_PATH,
    CHROME_PATH,
    EDGE_PATH,
    ...(await collectPlaywrightChromiumCandidates()),
    ...WINDOWS_BROWSER_CANDIDATES
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('No Chromium-compatible browser found. Set BROWSER_PATH, CHROME_PATH, or EDGE_PATH to run the smoke test.');
}

function wait(ms) {
  return new Promise(resolveWait => setTimeout(resolveWait, ms));
}

function createStaticServerScript() {
  return `
    const http = require('node:http');
    const fs = require('node:fs');
    const path = require('node:path');
    const root = path.resolve(process.argv[1]);
    const port = Number(process.argv[2]);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf'
    };

    function isInsideRoot(filePath) {
      const relative = path.relative(root, filePath);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    }

    http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1:' + port);
      const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const filePath = path.normalize(path.join(root, requestPath));
      if (!isInsideRoot(filePath)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    }).listen(port, '127.0.0.1', () => {
      console.log('Aboard server running at http://127.0.0.1:' + port);
    });
  `;
}

function spawnLocalServer() {
  if (TARGET_URL) {
    return null;
  }

  if (!STATIC_ROOT) {
    return spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  return spawn(process.execPath, ['-e', createStaticServerScript(), resolve(STATIC_ROOT), PORT], {
    cwd: process.cwd(),
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function waitUntil(fn, { timeoutMs = 15000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      if (!shouldRetryWaitUntilError(error)) {
        throw error;
      }
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw lastError || new Error('Timed out waiting for condition');
}

function waitForServer(processRef) {
  return new Promise((resolveWait, reject) => {
    if (!processRef) {
      resolveWait();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for local server to start'));
    }, 15000);

    processRef.stdout.on('data', data => {
      if (String(data).includes('Aboard server running')) {
        clearTimeout(timeout);
        resolveWait();
      }
    });

    processRef.on('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Local server exited before startup completed: ${code}`));
    });
  });
}

function connectWebSocket(url) {
  return new Promise((resolveSocket, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => resolveSocket(socket), { once: true });
    socket.addEventListener('error', () => reject(new Error(`Failed to connect CDP socket: ${url}`)), { once: true });
  });
}

function createCdpClient(socket) {
  let id = 0;
  let closed = false;
  const pending = new Map();
  const eventHandlers = new Map();

  function rejectPendingCommands(error) {
    pending.forEach(({ rejectCommand }) => rejectCommand(error));
    pending.clear();
  }

  function markClosed(reason, cause = null) {
    if (closed) {
      return;
    }
    closed = true;
    rejectPendingCommands(createFatalCdpError(reason, cause));
  }

  socket.addEventListener('message', event => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      markClosed('CDP socket closed after receiving malformed protocol data', error);
      socket.close();
      return;
    }

    if (message.id && pending.has(message.id)) {
      const { resolveCommand, rejectCommand } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        rejectCommand(new Error(`${message.error.message}: ${message.error.data || ''}`));
      } else {
        resolveCommand(message.result || {});
      }
      return;
    }

    if (message.method && eventHandlers.has(message.method)) {
      for (const handler of eventHandlers.get(message.method)) {
        handler(message.params || {});
      }
    }
  });

  socket.addEventListener('close', () => {
    markClosed('CDP socket closed');
  });

  socket.addEventListener('error', event => {
    markClosed('CDP socket closed after an error', event?.error || event);
  });

  return {
    send(method, params = {}) {
      if (closed || socket.readyState !== WebSocket.OPEN) {
        return Promise.reject(createFatalCdpError(`CDP socket closed before ${method}`));
      }

      const commandId = ++id;
      return new Promise((resolveCommand, rejectCommand) => {
        pending.set(commandId, { resolveCommand, rejectCommand });
        try {
          socket.send(JSON.stringify({ id: commandId, method, params }));
        } catch (error) {
          pending.delete(commandId);
          rejectCommand(createFatalCdpError(`CDP socket closed while sending ${method}`, error));
        }
      });
    },
    on(method, handler) {
      if (!eventHandlers.has(method)) {
        eventHandlers.set(method, new Set());
      }
      eventHandlers.get(method).add(handler);
    },
    close() {
      markClosed('CDP socket closed by test cleanup');
      socket.close();
    }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description
      || result.exceptionDetails.exception?.value
      || result.exceptionDetails.text;
    throw new Error(`Evaluation failed: ${description}`);
  }
  return result.result?.value;
}

async function dispatchDrag(cdp, start, end) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: start.x,
    y: start.y,
    button: 'none'
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: start.x,
    y: start.y,
    button: 'left',
    clickCount: 1
  });

  for (let i = 1; i <= 8; i += 1) {
    const progress = i / 8;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
      button: 'left',
      buttons: 1
    });
  }

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: end.x,
    y: end.y,
    button: 'left',
    clickCount: 1
  });
  await wait(250);
}

async function click(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await wait(120);
}

async function dismissBlockingModals(cdp) {
  const modalButton = await evaluate(cdp, `(() => {
    const modal = document.querySelector('.modal.show:not(.non-blocking-modal)');
    if (!modal) return null;
    const button = modal.querySelector('button, [role="button"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  if (modalButton) {
    await click(cdp, modalButton.x, modalButton.y);
  }
}

async function getCanvasSample(cdp) {
  return evaluate(cdp, `(() => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let alphaPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) alphaPixels += 1;
    }
    return {
      alphaPixels,
      strokes: window.drawingBoard?.drawingEngine?.strokes?.length ?? -1,
      tool: window.drawingBoard?.drawingEngine?.currentTool,
      hasShapeManager: !!window.drawingBoard?.shapeDrawingManager,
      shapeIsDrawing: !!window.drawingBoard?.shapeDrawingManager?.isDrawing,
      shapeStart: window.drawingBoard?.shapeDrawingManager?.startPoint || null,
      shapeEnd: window.drawingBoard?.shapeDrawingManager?.endPoint || null,
      configRect: (() => {
        const rect = document.getElementById('config-area')?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      })(),
      featureRect: (() => {
        const rect = document.getElementById('feature-area')?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      })(),
      bodyClass: document.body.className,
      vectorDisplay: document.getElementById('vector-scene-svg')
        ? getComputedStyle(document.getElementById('vector-scene-svg')).display
        : 'missing',
      canvasOpacity: getComputedStyle(canvas).opacity
    };
  })()`);
}

async function getVisibleCanvasDarkPixelSample(cdp, rect) {
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return evaluate(cdp, `(async () => {
    const payload = ${JSON.stringify({ data: screenshot.data, rect })};
    const image = new Image();
    image.src = 'data:image/png;base64,' + payload.data;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const scaleX = image.naturalWidth / window.innerWidth;
    const scaleY = image.naturalHeight / window.innerHeight;
    const sampleRect = {
      x: Math.max(0, Math.floor(payload.rect.x * scaleX)),
      y: Math.max(0, Math.floor(payload.rect.y * scaleY)),
      width: Math.max(1, Math.floor(payload.rect.width * scaleX)),
      height: Math.max(1, Math.floor(payload.rect.height * scaleY))
    };
    const data = ctx.getImageData(sampleRect.x, sampleRect.y, sampleRect.width, sampleRect.height).data;
    let darkPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && data[i] < 80 && data[i + 1] < 80 && data[i + 2] < 80) {
        darkPixels += 1;
      }
    }
    return {
      darkPixels,
      imageSize: { width: image.naturalWidth, height: image.naturalHeight },
      scale: { x: scaleX, y: scaleY },
      sampleRect
    };
  })()`);
}

async function findDrawableCanvasPoint(cdp, xRatio = 0.2, yRatio = 0.2) {
  return evaluate(cdp, `(() => {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const blockedSelector = [
      '#toolbar',
      '#config-area',
      '#history-controls',
      '#pagination-controls',
      '#time-display-area',
      '#feature-area',
      '.modal',
      '.timer-display-widget',
      '.random-picker-widget',
      '.scoreboard-widget',
      '.feature-widget',
      '.canvas-image-selection',
      '#selection-controls-overlay',
      '#insert-image-overlay',
      '#image-controls-overlay',
      'input[type="range"]'
    ].join(',');
    const candidates = [
      [${xRatio}, ${yRatio}],
      [0.08, 0.08],
      [0.92, 0.08],
      [0.08, 0.45],
      [0.92, 0.45],
      [0.50, 0.08],
      [0.50, 0.50]
    ];
    for (const [xFactor, yFactor] of candidates) {
      const x = rect.x + rect.width * xFactor;
      const y = rect.y + rect.height * yFactor;
      const element = document.elementFromPoint(x, y);
      if (!element?.closest?.(blockedSelector)) {
        return {
          x,
          y,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          target: {
            tagName: element?.tagName || null,
            id: element?.id || null,
            className: String(element?.className || '')
          }
        };
      }
    }
    const element = document.elementFromPoint(rect.x + rect.width * ${xRatio}, rect.y + rect.height * ${yRatio});
    return {
      x: rect.x + rect.width * ${xRatio},
      y: rect.y + rect.height * ${yRatio},
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      target: {
        tagName: element?.tagName || null,
        id: element?.id || null,
        className: String(element?.className || '')
      }
    };
  })()`);
}

async function getToolbarHitTarget(cdp) {
  return evaluate(cdp, `(() => {
    const button = document.querySelector('#toolbar .tool-btn, #history-controls button');
    if (!button) {
      return null;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const element = document.elementFromPoint(x, y);
    return {
      x,
      y,
      expectedId: button.id || null,
      expectedClassName: String(button.className || ''),
      target: {
        tagName: element?.tagName || null,
        id: element?.id || null,
        className: String(element?.className || ''),
        insideToolbar: !!element?.closest?.('#toolbar, #history-controls')
      }
    };
  })()`);
}

async function main() {
  const profileDir = resolve('.tmp', `cdp-profile-${Date.now()}`);
  await mkdir(profileDir, { recursive: true });
  const browserPath = await resolveBrowserPath();

  const server = spawnLocalServer();

  console.log(`drawing-smoke-cdp: using browser ${browserPath}`);
  const browser = spawn(browserPath, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--window-size=1280,900',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--disable-gpu-compositing',
    '--no-sandbox',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], {
    stdio: ['ignore', 'ignore', 'pipe']
  });

  server?.stderr.on('data', data => process.stderr.write(data));
  browser.stderr.on('data', data => process.stderr.write(data));

  let cdp;
  try {
    await waitForServer(server);

    const target = await waitUntil(async () => {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(BASE_URL)}`, {
        method: 'PUT'
      });
      if (!response.ok) return null;
      return response.json();
    });

    const socket = await connectWebSocket(target.webSocketDebuggerUrl);
    cdp = createCdpClient(socket);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    cdp.on('Runtime.exceptionThrown', params => {
      const description = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text;
      if (description) {
        console.error(`browser exception: ${description}`);
      }
    });
    cdp.on('Runtime.consoleAPICalled', params => {
      if (params.type === 'error') {
        const text = (params.args || []).map(arg => arg.value || arg.description || '').join(' ');
        console.error(`browser console error: ${text}`);
      }
    });
    await cdp.send('Page.navigate', { url: BASE_URL });

    await waitUntil(() => evaluate(cdp, `location.href.startsWith(${JSON.stringify(BASE_URL)}) && document.readyState === "complete"`), { timeoutMs: 15000 });
    await waitUntil(() => evaluate(cdp, '!!window.drawingBoard?.drawingEngine'), { timeoutMs: 15000 });
    await wait(500);
    await dismissBlockingModals(cdp);

    const toolbarHitTarget = await getToolbarHitTarget(cdp);
    if (!toolbarHitTarget?.target?.insideToolbar) {
      throw new Error(`Toolbar control was blocked by another layer: ${JSON.stringify(toolbarHitTarget)}`);
    }

    const penPoint = await findDrawableCanvasPoint(cdp, 0.35, 0.35);
    if (penPoint.target.id !== 'canvas') {
      throw new Error(`Drawable point did not target the canvas: ${JSON.stringify(penPoint)}`);
    }
    const rect = penPoint.rect;

    await dispatchDrag(
      cdp,
      { x: penPoint.x, y: penPoint.y },
      { x: penPoint.x + rect.width * 0.18, y: penPoint.y + rect.height * 0.18 }
    );
    const penSample = await getCanvasSample(cdp);
    if (penSample.strokes < 1 || penSample.alphaPixels < 1) {
      throw new Error(`Pen did not persist drawing: ${JSON.stringify(penSample)}`);
    }
    const visiblePenSample = await getVisibleCanvasDarkPixelSample(cdp, rect);
    if (visiblePenSample.darkPixels < 1) {
      throw new Error(`Pen updated canvas data but was not visible in the page screenshot: ${JSON.stringify({
        penSample,
        visiblePenSample
      })}`);
    }

    const moreRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('more-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, moreRect.x, moreRect.y);

    const shapeRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('more-shape-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, shapeRect.x, shapeRect.y);
    await evaluate(cdp, `(() => {
      const manager = window.drawingBoard?.shapeDrawingManager;
      window.__shapeSmokeCounters = { start: 0, draw: 0, stop: 0 };
      if (!manager || manager.__smokeWrapped) return;
      const originalStart = manager.startDrawing.bind(manager);
      const originalDraw = manager.draw.bind(manager);
      const originalStop = manager.stopDrawing.bind(manager);
      manager.startDrawing = (...args) => {
        window.__shapeSmokeCounters.start += 1;
        return originalStart(...args);
      };
      manager.draw = (...args) => {
        window.__shapeSmokeCounters.draw += 1;
        return originalDraw(...args);
      };
      manager.stopDrawing = (...args) => {
        window.__shapeSmokeCounters.stop += 1;
        return originalStop(...args);
      };
      manager.__smokeWrapped = true;
    })()`);

    const shapePoint = await findDrawableCanvasPoint(cdp, 0.18, 0.18);
    const shapeHitTarget = {
      ...shapePoint.target,
      point: { x: shapePoint.x, y: shapePoint.y },
      rect: shapePoint.rect
    };

    await dispatchDrag(
      cdp,
      { x: shapePoint.x, y: shapePoint.y },
      { x: shapePoint.x + rect.width * 0.16, y: shapePoint.y + rect.height * 0.16 }
    );
    const shapeSample = await getCanvasSample(cdp);
    shapeSample.shapeCounters = await evaluate(cdp, 'window.__shapeSmokeCounters || null');
    shapeSample.shapeHitTarget = shapeHitTarget;
    if (shapeSample.strokes < 2 || shapeSample.alphaPixels <= penSample.alphaPixels) {
      throw new Error(`Shape did not persist drawing: ${JSON.stringify({ penSample, shapeSample })}`);
    }

    await evaluate(cdp, `(() => {
      window.drawingBoard?.setTool?.('pen', false);
      window.drawingBoard?.setZoom?.('200');
    })()`);
    await wait(350);

    const zoomPenBefore = await getCanvasSample(cdp);
    const zoomPenPoint = await findDrawableCanvasPoint(cdp, 0.72, 0.28);
    await dispatchDrag(
      cdp,
      { x: zoomPenPoint.x, y: zoomPenPoint.y },
      {
        x: zoomPenPoint.x + zoomPenPoint.rect.width * 0.08,
        y: zoomPenPoint.y + zoomPenPoint.rect.height * 0.08
      }
    );
    const zoomPenSample = await getCanvasSample(cdp);
    if (zoomPenSample.strokes <= zoomPenBefore.strokes || zoomPenSample.alphaPixels <= zoomPenBefore.alphaPixels) {
      throw new Error(`Zoomed pen did not persist drawing: ${JSON.stringify({ zoomPenBefore, zoomPenSample, zoomPenPoint })}`);
    }

    await evaluate(cdp, `(() => {
      window.drawingBoard?.setTool?.('pen', false);
      window.drawingBoard?.drawingEngine?.setPenType?.('marker');
    })()`);
    const markerPoint = await findDrawableCanvasPoint(cdp, 0.25, 0.72);
    await dispatchDrag(
      cdp,
      { x: markerPoint.x, y: markerPoint.y },
      {
        x: markerPoint.x + markerPoint.rect.width * 0.16,
        y: markerPoint.y - markerPoint.rect.height * 0.08
      }
    );
    const markerZoomState = await evaluate(cdp, `(() => ({
      strokes: window.drawingBoard?.drawingEngine?.strokes?.length ?? -1,
      vectorPreviewActive: document.body.classList.contains('vector-preview-active'),
      canvasOpacity: getComputedStyle(document.getElementById('canvas')).opacity,
      vectorDisplay: document.getElementById('vector-scene-svg')
        ? getComputedStyle(document.getElementById('vector-scene-svg')).display
        : 'missing'
    }))()`);
    if (markerZoomState.vectorPreviewActive || markerZoomState.canvasOpacity === '0') {
      throw new Error(`Marker strokes should stay on the visible raster canvas at high zoom: ${JSON.stringify(markerZoomState)}`);
    }

    await evaluate(cdp, `window.drawingBoard?.setTool?.('select', false)`);
    const selectCursor = await evaluate(cdp, `getComputedStyle(document.getElementById('canvas')).cursor`);
    if (selectCursor !== 'default') {
      throw new Error(`Select tool should use the default cursor, got ${JSON.stringify(selectCursor)}`);
    }

    const classroomMoreRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('more-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, classroomMoreRect.x, classroomMoreRect.y);
    await waitUntil(() => evaluate(cdp, `document.getElementById('feature-area')?.classList.contains('show')`), { timeoutMs: 5000 });

    const classroomRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-mode-feature-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, classroomRect.x, classroomRect.y);

    const classroomState = await waitUntil(async () => {
      const state = await evaluate(cdp, `(() => {
        const bar = document.getElementById('classroom-mode-bar');
        const status = document.getElementById('classroom-mode-status');
        const entry = document.getElementById('classroom-mode-feature-btn');
        const style = bar ? getComputedStyle(bar) : null;
        return {
          active: document.body.classList.contains('classroom-mode-active'),
          barVisible: !!bar && style?.display !== 'none' && style?.visibility !== 'hidden',
          featurePanelHidden: !document.getElementById('feature-area')?.classList.contains('show'),
          statusText: status?.textContent?.trim() || '',
          entryPressed: entry?.getAttribute('aria-pressed') === 'true'
        };
      })()`);
      return state.active && state.barVisible ? state : null;
    }, { timeoutMs: 5000 });

    if (!classroomState.featurePanelHidden || !classroomState.statusText || !classroomState.entryPressed) {
      throw new Error(`Classroom mode click did not expose clear active feedback: ${JSON.stringify(classroomState)}`);
    }

    const classroomBaseline = await evaluate(cdp, `(() => ({
      strokes: window.drawingBoard?.drawingEngine?.strokes?.length ?? -1,
      tool: window.drawingBoard?.drawingEngine?.currentTool || ''
    }))()`);
    const classroomEraserRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-eraser-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, classroomEraserRect.x, classroomEraserRect.y);
    const classroomEraserState = await evaluate(cdp, `(() => ({
      tool: window.drawingBoard?.drawingEngine?.currentTool || '',
      strokes: window.drawingBoard?.drawingEngine?.strokes?.length ?? -1,
      isDrawing: !!window.drawingBoard?.drawingEngine?.isDrawing,
      pressed: document.getElementById('classroom-eraser-btn')?.getAttribute('aria-pressed')
    }))()`);
    if (classroomEraserState.tool !== 'eraser'
      || classroomEraserState.pressed !== 'true'
      || classroomEraserState.isDrawing
      || classroomEraserState.strokes !== classroomBaseline.strokes) {
      throw new Error(`Classroom tool click leaked into the canvas or failed to switch tools: ${JSON.stringify(classroomEraserState)}`);
    }

    const penSettingsRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-pen-settings-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, penSettingsRect.x, penSettingsRect.y);
    await waitUntil(() => evaluate(cdp, `!document.getElementById('classroom-pen-settings')?.hidden`), { timeoutMs: 3000 });

    const redRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-color-red').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, redRect.x, redRect.y);
    await evaluate(cdp, `(() => {
      const slider = document.getElementById('classroom-pen-size-slider');
      slider.value = '12';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    const classroomPenState = await evaluate(cdp, `(() => ({
      tool: window.drawingBoard?.drawingEngine?.currentTool || '',
      color: window.drawingBoard?.drawingEngine?.currentColor || '',
      penSize: window.drawingBoard?.drawingEngine?.penSize,
      sizeLabel: document.getElementById('classroom-pen-size-value')?.textContent,
      baseColor: document.getElementById('custom-color-picker')?.value || '',
      basePenSize: document.getElementById('pen-size-slider')?.value || ''
    }))()`);
    if (classroomPenState.tool !== 'pen'
      || classroomPenState.color.toUpperCase() !== '#FF3B30'
      || classroomPenState.penSize !== 12
      || classroomPenState.sizeLabel !== '12'
      || classroomPenState.baseColor.toUpperCase() !== '#FF3B30'
      || classroomPenState.basePenSize !== '12') {
      throw new Error(`Classroom pen controls did not update the drawing engine: ${JSON.stringify(classroomPenState)}`);
    }

    const timerToggleRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-timer-toggle-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, timerToggleRect.x, timerToggleRect.y);
    await wait(1100);
    const classroomTimerState = await evaluate(cdp, `(() => ({
      running: !!window.drawingBoard?.classroomModeManager?.isTimerRunning,
      display: document.getElementById('classroom-timer-display')?.textContent || ''
    }))()`);
    if (!classroomTimerState.running || classroomTimerState.display === '00:00') {
      throw new Error(`Classroom timer did not start from the session dock: ${JSON.stringify(classroomTimerState)}`);
    }

    const classroomExitRect = await evaluate(cdp, `(() => {
      const rect = document.getElementById('classroom-exit-btn').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await click(cdp, classroomExitRect.x, classroomExitRect.y);
    const classroomExitState = await evaluate(cdp, `(() => ({
      active: document.body.classList.contains('classroom-mode-active'),
      timerRunning: !!window.drawingBoard?.classroomModeManager?.isTimerRunning,
      hidden: !!document.getElementById('classroom-mode-bar')?.hidden
    }))()`);
    if (classroomExitState.active || classroomExitState.timerRunning || !classroomExitState.hidden) {
      throw new Error(`Classroom exit did not restore the board UI cleanly: ${JSON.stringify(classroomExitState)}`);
    }

    console.log('drawing-smoke-cdp: pen, shape, zoomed pen, marker zoom, select cursor, and classroom workflow checks passed');
  } finally {
    cdp?.close();
    browser.kill();
    server?.kill();
    await wait(200);
    await rm(profileDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
