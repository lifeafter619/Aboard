import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const PORT = process.env.PORT || '18080';
const DEBUG_PORT = process.env.DEBUG_PORT || '18081';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EDGE_PATH = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function wait(ms) {
  return new Promise(resolveWait => setTimeout(resolveWait, ms));
}

async function waitUntil(fn, { timeoutMs = 15000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw lastError || new Error('Timed out waiting for condition');
}

function waitForServer(processRef) {
  return new Promise((resolveWait, reject) => {
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
  const pending = new Map();
  const eventHandlers = new Map();

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
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

  return {
    send(method, params = {}) {
      const commandId = ++id;
      socket.send(JSON.stringify({ id: commandId, method, params }));
      return new Promise((resolveCommand, rejectCommand) => {
        pending.set(commandId, { resolveCommand, rejectCommand });
      });
    },
    on(method, handler) {
      if (!eventHandlers.has(method)) {
        eventHandlers.set(method, new Set());
      }
      eventHandlers.get(method).add(handler);
    },
    close() {
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

async function main() {
  const profileDir = resolve('.tmp', `cdp-profile-${Date.now()}`);
  await mkdir(profileDir, { recursive: true });

  const server = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const browser = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--window-size=1280,900',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], {
    stdio: ['ignore', 'ignore', 'pipe']
  });

  server.stderr.on('data', data => process.stderr.write(data));
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

    await waitUntil(() => evaluate(cdp, 'location.href.startsWith("http://127.0.0.1") && document.readyState === "complete"'), { timeoutMs: 15000 });
    await waitUntil(() => evaluate(cdp, '!!window.drawingBoard?.drawingEngine'), { timeoutMs: 15000 });
    await wait(500);
    await dismissBlockingModals(cdp);

    const penPoint = await findDrawableCanvasPoint(cdp, 0.35, 0.35);
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

    console.log('drawing-smoke-cdp: pen and shape persisted visible canvas content');
  } finally {
    cdp?.close();
    browser.kill();
    server.kill();
    await wait(200);
    await rm(profileDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
