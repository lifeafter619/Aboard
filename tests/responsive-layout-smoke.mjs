import { spawn } from 'node:child_process';
import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const PORT = process.env.PORT || '18084';
const DEBUG_PORT = process.env.DEBUG_PORT || '18085';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROME_PATH = process.env.CHROME_PATH || '';
const EDGE_PATH = process.env.EDGE_PATH || '';
const PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '';
const WINDOWS_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

const VIEWPORTS = [
  { name: 'phone-portrait', width: 360, height: 640, mobile: true, deviceScaleFactor: 2 },
  { name: 'phone-landscape', width: 640, height: 360, mobile: true, deviceScaleFactor: 2 },
  { name: 'tablet-portrait', width: 768, height: 1024, mobile: false, deviceScaleFactor: 1 },
  { name: 'small-window', width: 620, height: 375, mobile: false, deviceScaleFactor: 1 },
  { name: 'classroom-laptop', width: 1366, height: 768, mobile: false, deviceScaleFactor: 1 },
  { name: 'full-hd', width: 1920, height: 1080, mobile: false, deviceScaleFactor: 1 },
  { name: 'ultrawide-classroom', width: 3440, height: 1440, mobile: false, deviceScaleFactor: 1 },
  { name: 'large-4k', width: 3840, height: 2160, mobile: false, deviceScaleFactor: 1 }
];

const STATES = [
  {
    name: 'baseline',
    setup: `async () => {
      const board = window.drawingBoard;
      if (board?.pages?.length < 2 && typeof board.addPage === 'function') board.addPage();
      board?.setTool?.('pen', false);
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls'],
    nonOverlap: [['#history-controls', '#pagination-controls']]
  },
  {
    name: 'pen-config',
    setup: `async () => {
      window.drawingBoard?.setTool?.('pen', true);
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls', '#config-area'],
    nonOverlap: [['#config-area', '#toolbar']]
  },
  {
    name: 'shape-config',
    setup: `async () => {
      window.drawingBoard?.setTool?.('shape', true);
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls', '#config-area'],
    nonOverlap: [['#config-area', '#toolbar']]
  },
  {
    name: 'background-config',
    setup: `async () => {
      window.drawingBoard?.setTool?.('background', true);
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls', '#config-area'],
    nonOverlap: [['#config-area', '#toolbar']]
  },
  {
    name: 'background-coordinate-config',
    setup: `async () => {
      const board = window.drawingBoard;
      board?.setTool?.('background', true);
      board?.backgroundManager?.setBackgroundPattern?.('coordinate');
      board?.updateBackgroundUI?.();
    }`,
    selectors: [
      '#toolbar',
      '#history-controls',
      '#pagination-controls',
      '#config-area',
      '#background-config.coordinate-pattern-active',
      '#background-coordinate-actions',
      '#pattern-density-group',
      '#move-origin-btn'
    ],
    nonOverlap: [['#config-area', '#toolbar']]
  },
  {
    name: 'background-polar-config',
    setup: `async () => {
      const board = window.drawingBoard;
      board?.setTool?.('background', true);
      board?.backgroundManager?.setBackgroundPattern?.('polar');
      board?.updateBackgroundUI?.();
    }`,
    selectors: [
      '#toolbar',
      '#history-controls',
      '#pagination-controls',
      '#config-area',
      '#background-config.coordinate-pattern-active',
      '#background-coordinate-actions',
      '#pattern-density-group',
      '#move-origin-btn'
    ],
    nonOverlap: [['#config-area', '#toolbar']]
  },
  {
    name: 'more-panel',
    setup: `async () => {
      window.drawingBoard?.setTool?.('more', true);
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls', '#feature-area'],
    nonOverlap: [['#feature-area', '#toolbar']]
  },
  {
    name: 'classroom-mode',
    setup: `async () => {
      const board = window.drawingBoard;
      if (!board?.classroomModeManager && typeof window.AboardClassroomModeManager === 'function') {
        board.classroomModeManager = new window.AboardClassroomModeManager(board);
      }
      board?.classroomModeManager?.enter?.();
    }`,
    selectors: [
      '#classroom-mode-bar',
      '.classroom-tool-dock',
      '.classroom-session-dock',
      '#classroom-pen-btn',
      '#classroom-eraser-btn',
      '#classroom-select-btn',
      '#classroom-pan-btn',
      '#classroom-pen-settings-btn',
      '#classroom-undo-btn',
      '#classroom-redo-btn',
      '#classroom-prev-page-btn',
      '#classroom-next-page-btn',
      '#classroom-timer-toggle-btn',
      '#classroom-timer-reset-btn',
      '#classroom-actions-btn',
      '#classroom-fullscreen-btn',
      '#classroom-exit-btn'
    ],
    nonOverlap: [['.classroom-tool-dock', '.classroom-session-dock']]
  },
  {
    name: 'classroom-laser',
    setup: `async () => {
      const board = window.drawingBoard;
      if (!board?.classroomModeManager && typeof window.AboardClassroomModeManager === 'function') {
        board.classroomModeManager = new window.AboardClassroomModeManager(board);
      }
      board?.classroomModeManager?.enter?.();
      window.__laserHistoryLengthBefore = board?.historyManager?.history?.length ?? 0;
      const button = document.getElementById('classroom-laser-btn');
      const rect = button?.getBoundingClientRect?.();
      const hitTarget = rect
        ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        : null;
      window.__laserButtonHitTarget = Boolean(button && (hitTarget === button || button.contains(hitTarget)));
      button?.click?.();
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 0,
        clientX: Math.round(window.innerWidth / 2),
        clientY: Math.round(window.innerHeight / 2)
      }));
      board?.classroomModeManager?.renderLaserFrame?.();
    }`,
    selectors: [
      '#classroom-mode-bar',
      '#classroom-laser-overlay',
      '.classroom-tool-dock',
      '.classroom-session-dock',
      '#classroom-laser-btn[aria-pressed="true"]'
    ],
    nonOverlap: [['.classroom-tool-dock', '.classroom-session-dock']]
  },
  {
    name: 'classroom-pen-settings',
    setup: `async () => {
      const board = window.drawingBoard;
      if (!board?.classroomModeManager && typeof window.AboardClassroomModeManager === 'function') {
        board.classroomModeManager = new window.AboardClassroomModeManager(board);
      }
      board?.classroomModeManager?.enter?.();
      board?.classroomModeManager?.setPenSettingsOpen?.(true);
    }`,
    selectors: [
      '.classroom-tool-dock',
      '.classroom-session-dock',
      '#classroom-pen-settings',
      '#classroom-pen-size-slider'
    ],
    nonOverlap: [
      ['.classroom-tool-dock', '.classroom-session-dock'],
      ['#classroom-pen-settings', '.classroom-session-dock']
    ]
  },
  {
    name: 'classroom-actions',
    setup: `async () => {
      const board = window.drawingBoard;
      if (!board?.classroomModeManager && typeof window.AboardClassroomModeManager === 'function') {
        board.classroomModeManager = new window.AboardClassroomModeManager(board);
      }
      board?.classroomModeManager?.enter?.();
      board?.classroomModeManager?.setActionsOpen?.(true);
    }`,
    selectors: [
      '.classroom-tool-dock',
      '.classroom-session-dock',
      '#classroom-actions-panel',
      '#classroom-add-page-action',
      '#classroom-timer-action',
      '#classroom-random-picker-action',
      '#classroom-scoreboard-action',
      '#classroom-teaching-tools-action'
    ],
    nonOverlap: [
      ['.classroom-tool-dock', '.classroom-session-dock'],
      ['#classroom-actions-panel', '.classroom-session-dock'],
      ['#classroom-actions-panel', '.classroom-tool-dock']
    ]
  },
  {
    name: 'time-panel',
    setup: `async () => {
      const board = window.drawingBoard;
      board?.setTool?.('more', true);
      board?.timeDisplayControls?.showTimeDisplayArea?.();
    }`,
    selectors: ['#toolbar', '#history-controls', '#pagination-controls', '#feature-area', '#time-display-area', '#time-display'],
    nonOverlap: [['#time-display-area', '#toolbar'], ['#feature-area', '#toolbar']]
  },
  {
    name: 'settings-modal',
    setup: `async () => {
      window.drawingBoard?.openSettings?.();
    }`,
    selectors: ['#settings-modal .modal-content']
  },
  {
    name: 'timer-modal',
    setup: `async () => {
      const board = window.drawingBoard;
      const manager = await board?.getTimerManager?.();
      manager?.showSettingsModal?.();
    }`,
    selectors: ['#timer-settings-modal .timer-modal-content']
  },
  {
    name: 'time-display-settings-modal',
    setup: `async () => {
      window.drawingBoard?.timeDisplaySettingsModal?.show?.();
    }`,
    selectors: ['#time-display-settings-modal .timer-modal-content']
  }
];

function createFatalCdpError(message, cause = null) {
  const error = new Error(message);
  error.code = 'CDP_CONNECTION_CLOSED';
  if (cause) error.cause = cause;
  return error;
}

function shouldRetryWaitUntilError(error) {
  return error?.code !== 'CDP_CONNECTION_CLOSED';
}

async function pathExists(filePath) {
  if (!filePath) return false;
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
    if (await pathExists(candidate)) return candidate;
  }

  throw new Error('No Chromium-compatible browser found. Set BROWSER_PATH, CHROME_PATH, or EDGE_PATH to run the responsive smoke test.');
}

function wait(ms) {
  return new Promise(resolveWait => setTimeout(resolveWait, ms));
}

function waitForProcessExit(processRef, timeoutMs = 3000) {
  if (!processRef || processRef.exitCode !== null || processRef.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise(resolveWait => {
    const timeout = setTimeout(resolveWait, timeoutMs);
    processRef.once('exit', () => {
      clearTimeout(timeout);
      resolveWait();
    });
  });
}

async function stopProcess(processRef) {
  if (!processRef || processRef.exitCode !== null || processRef.signalCode !== null) {
    return;
  }

  processRef.kill();
  await waitForProcessExit(processRef);
}

async function removeDirectoryWithRetry(directoryPath, { attempts = 8, delayMs = 250 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(directoryPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const retryable = error?.code === 'EBUSY' || error?.code === 'EPERM' || error?.code === 'ENOTEMPTY';
      if (!retryable || attempt === attempts) {
        throw error;
      }
      await wait(delayMs * attempt);
    }
  }
}

async function waitUntil(fn, { timeoutMs = 15000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      if (!shouldRetryWaitUntilError(error)) throw error;
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw lastError || new Error('Timed out waiting for condition');
}

function waitForServer(processRef) {
  return new Promise((resolveWait, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for local server to start')), 15000);
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
    if (closed) return;
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

  socket.addEventListener('close', () => markClosed('CDP socket closed'));
  socket.addEventListener('error', event => markClosed('CDP socket closed after an error', event?.error || event));

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
      if (!eventHandlers.has(method)) eventHandlers.set(method, new Set());
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

async function dismissPortraitOverlay(cdp) {
  await evaluate(cdp, `(() => {
    const overlay = document.getElementById('portrait-orientation-overlay');
    const visible = overlay && getComputedStyle(overlay).display !== 'none';
    if (visible) {
      document.body.classList.add('portrait-orientation-dismissed');
      document.getElementById('portrait-orientation-continue-btn')?.click?.();
    }
    return true;
  })()`);
  await wait(100);
}

function jsString(value) {
  return JSON.stringify(value);
}

async function runState(cdp, viewport, state) {
  await evaluate(cdp, `(${state.setup})()`);
  await wait(350);
  return evaluate(cdp, `(() => {
    const viewport = ${jsString(viewport)};
    const state = ${jsString({ name: state.name, selectors: state.selectors, nonOverlap: state.nonOverlap || [] })};
    const tolerance = 1;
    const issues = [];
    const measured = {};
    const visibleElements = [];

    const rectFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };

    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') !== 0
        && rect.width > 0
        && rect.height > 0;
    };

    const overlaps = (a, b) => a.left < b.right - tolerance
      && a.right > b.left + tolerance
      && a.top < b.bottom - tolerance
      && a.bottom > b.top + tolerance;

    const hasHorizontalOverflow = (element) => element.scrollWidth > element.clientWidth + 2;

    for (const selector of state.selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        issues.push({ type: 'missing', selector });
        continue;
      }
      if (!isVisible(element)) {
        issues.push({ type: 'not-visible', selector });
        continue;
      }

      const rect = rectFor(element);
      measured[selector] = rect;
      visibleElements.push({ selector, element, rect });

      if (rect.left < -tolerance || rect.top < -tolerance
        || rect.right > window.innerWidth + tolerance
        || rect.bottom > window.innerHeight + tolerance) {
        issues.push({ type: 'out-of-viewport', selector, rect });
      }

      if (rect.width > window.innerWidth + tolerance || rect.height > window.innerHeight + tolerance) {
        issues.push({ type: 'larger-than-viewport', selector, rect });
      }
    }

    for (const [firstSelector, secondSelector] of state.nonOverlap) {
      const first = measured[firstSelector];
      const second = measured[secondSelector];
      if (first && second && overlaps(first, second)) {
        issues.push({ type: 'overlap', selectors: [firstSelector, secondSelector], first, second });
      }
    }

    if (state.name === 'shape-config') {
      const configArea = document.getElementById('config-area');
      const shapePanel = document.querySelector('#shape-config.active');
      if (!isVisible(shapePanel)) {
        issues.push({ type: 'shape-panel-not-visible' });
      }
      if (isVisible(configArea)) {
        if (hasHorizontalOverflow(configArea)) {
          issues.push({
            type: 'horizontal-overflow',
            selector: '#config-area',
            clientWidth: configArea.clientWidth,
            scrollWidth: configArea.scrollWidth
          });
        }
        const overflowY = getComputedStyle(configArea).overflowY;
        if (configArea.scrollHeight > configArea.clientHeight + 2 && !['auto', 'scroll'].includes(overflowY)) {
          issues.push({
            type: 'shape-panel-not-scrollable',
            overflowY,
            clientHeight: configArea.clientHeight,
            scrollHeight: configArea.scrollHeight
          });
        }
      }
    }

    if (state.name === 'pen-config') {
      const compactControls = [
        { selector: '#config-close-btn', maxWidth: 36, maxHeight: 36 },
        { selector: '#pen-config .color-btn', maxWidth: 48, maxHeight: 48 },
        { selector: '#pen-config .pen-type-btn', maxHeight: 44 },
        { selector: '#pen-line-style-settings-btn', maxHeight: 50 }
      ];

      compactControls.forEach(({ selector, maxWidth = Infinity, maxHeight = Infinity }) => {
        const element = document.querySelector(selector);
        if (!isVisible(element)) {
          issues.push({ type: 'compact-pen-control-not-visible', selector });
          return;
        }
        const rect = rectFor(element);
        if (rect.width > maxWidth + tolerance || rect.height > maxHeight + tolerance) {
          issues.push({
            type: 'oversized-pen-config-control',
            selector,
            rect,
            maxWidth,
            maxHeight
          });
        }
      });
    }

    if (state.name.startsWith('background')) {
      ['#config-area', '#background-config', '#pattern-grid', '#background-coordinate-actions'].forEach((selector) => {
        const element = document.querySelector(selector);
        if (isVisible(element) && hasHorizontalOverflow(element)) {
          issues.push({
            type: 'horizontal-overflow',
            selector,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth
          });
        }
      });

      const backgroundConfig = document.querySelector('#background-config.active');
      if (isVisible(backgroundConfig)) {
        const groups = Array.from(backgroundConfig.children)
          .filter((child) => child.classList.contains('config-group'));
        const colorGroup = groups[0];
        const patternGroup = groups[1];
        if (isVisible(colorGroup) && isVisible(patternGroup)) {
          const colorRect = rectFor(colorGroup);
          const patternRect = rectFor(patternGroup);
          if (overlaps(colorRect, patternRect)) {
            issues.push({
              type: 'background-internal-overlap',
              selectors: ['#background-config > .config-group:first-child', '#pattern-grid'],
              first: colorRect,
              second: patternRect
            });
          }
        }
      }
    }

    if (state.name.startsWith('classroom-')) {
      ['.classroom-tool-dock', '.classroom-session-dock'].forEach((selector) => {
        const dock = document.querySelector(selector);
        if (isVisible(dock) && hasHorizontalOverflow(dock)) {
          issues.push({
            type: 'horizontal-overflow',
            selector,
            clientWidth: dock.clientWidth,
            scrollWidth: dock.scrollWidth
          });
        }
      });

      ['#toolbar', '#history-controls', '#pagination-controls', '#feature-area', '#config-area'].forEach((selector) => {
        const element = document.querySelector(selector);
        if (isVisible(element)) {
          issues.push({ type: 'classroom-ui-not-hidden', selector });
        }
      });

      if (state.name === 'classroom-laser') {
        if (window.__laserButtonHitTarget !== true) {
          issues.push({ type: 'laser-button-not-hit-target' });
        }
        const overlay = document.getElementById('classroom-laser-overlay');
        const context = overlay?.getContext?.('2d');
        if (overlay && context) {
          const scaleX = overlay.width / window.innerWidth;
          const scaleY = overlay.height / window.innerHeight;
          const sampleSize = Math.max(8, Math.round(24 * Math.max(scaleX, scaleY)));
          const sampleX = Math.max(0, Math.round((window.innerWidth / 2) * scaleX - sampleSize / 2));
          const sampleY = Math.max(0, Math.round((window.innerHeight / 2) * scaleY - sampleSize / 2));
          const pixels = context.getImageData(sampleX, sampleY, sampleSize, sampleSize).data;
          let paintedPixels = 0;
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 0) paintedPixels += 1;
          }
          if (paintedPixels === 0) {
            const manager = window.drawingBoard?.classroomModeManager;
            issues.push({
              type: 'laser-overlay-blank',
              pointer: manager?.currentLaserPoint || null,
              trailPointCount: manager?.laserPoints?.length ?? null,
              framePending: Boolean(manager?.laserFrameId),
              overlayWidth: overlay.width,
              overlayHeight: overlay.height,
              sampleX,
              sampleY,
              sampleSize,
              documentHidden: document.hidden
            });
          }
        }

        const historyLength = window.drawingBoard?.historyManager?.history?.length ?? 0;
        if (historyLength !== window.__laserHistoryLengthBefore) {
          issues.push({
            type: 'laser-mutated-history',
            before: window.__laserHistoryLengthBefore,
            after: historyLength
          });
        }
      }
    }

    return {
      viewport: viewport.name,
      state: state.name,
      width: window.innerWidth,
      height: window.innerHeight,
      issues,
      measured
    };
  })()`);
}

async function runResponsiveChecks(cdp, screenshotDir = '', viewports = VIEWPORTS, states = STATES) {
  const failures = [];
  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: viewport.mobile
    });
    await cdp.send('Page.navigate', { url: BASE_URL });
    await cdp.send('Page.bringToFront');
    await waitUntil(() => evaluate(cdp, 'location.href.startsWith("http://127.0.0.1") && document.readyState === "complete"'), { timeoutMs: 15000 });
    await waitUntil(() => evaluate(cdp, '!!window.drawingBoard?.drawingEngine'), { timeoutMs: 15000 });
    await wait(500);
    await dismissPortraitOverlay(cdp);

    for (const state of states) {
      const result = await runState(cdp, viewport, state);
      if (result.issues.length > 0) failures.push(result);
      if (screenshotDir && state.name.startsWith('classroom-')) {
        console.log(`classroom measurement: ${JSON.stringify(result)}`);
        const screenshot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false
        });
        await writeFile(join(screenshotDir, `${viewport.name}-${state.name}.png`), Buffer.from(screenshot.data, 'base64'));
      }
      await evaluate(cdp, `(() => {
        document.querySelectorAll('.modal.show, .timer-modal.show, #timer-settings-modal.show').forEach(element => element.classList.remove('show'));
        document.getElementById('config-area')?.classList.remove('show');
        document.getElementById('feature-area')?.classList.remove('show');
        document.getElementById('time-display-area')?.classList.remove('show');
        window.drawingBoard?.classroomModeManager?.exit?.();
        window.drawingBoard?.setTool?.('pen', false);
        return true;
      })()`);
      await wait(80);
    }
  }
  return failures;
}

async function main() {
  const repoRoot = resolve(join(import.meta.dirname, '..'));
  const profileDir = join(repoRoot, '.tmp', `responsive-smoke-profile-${Date.now()}`);
  const screenshotDir = process.argv.includes('--capture-classroom')
    ? join(repoRoot, '.tmp', 'classroom-mode-screenshots')
    : '';
  const viewportArg = process.argv.find((argument) => argument.startsWith('--viewport='));
  const requestedViewport = viewportArg?.slice('--viewport='.length);
  const activeViewports = requestedViewport
    ? VIEWPORTS.filter((viewport) => viewport.name === requestedViewport)
    : VIEWPORTS;
  const activeStates = process.argv.includes('--classroom-only')
    ? STATES.filter((state) => state.name.startsWith('classroom-'))
    : STATES;
  if (requestedViewport && activeViewports.length === 0) {
    throw new Error(`Unknown viewport: ${requestedViewport}`);
  }
  await mkdir(profileDir, { recursive: true });
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const browserPath = await resolveBrowserPath();

  const server = spawn(process.execPath, ['server.js'], {
    cwd: repoRoot,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--disable-gpu-compositing',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
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

    cdp = createCdpClient(await connectWebSocket(target.webSocketDebuggerUrl));
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Page.bringToFront');
    const failures = await runResponsiveChecks(cdp, screenshotDir, activeViewports, activeStates);
    if (failures.length > 0) {
      throw new Error(`Responsive layout failures:\\n${JSON.stringify(failures, null, 2)}`);
    }
    console.log(`responsive-layout-smoke: ${activeViewports.length} viewports x ${activeStates.length} states passed`);
    if (screenshotDir) console.log(`classroom screenshots: ${screenshotDir}`);
  } finally {
    cdp?.close();
    await Promise.all([
      stopProcess(browser),
      stopProcess(server)
    ]);
    await removeDirectoryWithRetry(profileDir);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
