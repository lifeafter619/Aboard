const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const SMOKE_RUNNER_PATH = path.join(REPO_ROOT, 'tests', 'drawing-smoke-cdp.mjs');

function readSmokeRunner() {
  return fs.readFileSync(SMOKE_RUNNER_PATH, 'utf8');
}

function testCdpClientRejectsPendingCommandsWhenSocketCloses() {
  const source = readSmokeRunner();

  assert.match(source, /function\s+rejectPendingCommands\s*\(/, 'CDP client should centralize pending command rejection');
  assert.match(source, /function\s+shouldRetryWaitUntilError\s*\(/, 'smoke runner should distinguish retryable waits from fatal connection loss');
  assert.match(source, /socket\.addEventListener\(['"]close['"]/, 'CDP client should listen for socket close');
  assert.match(source, /socket\.addEventListener\(['"]error['"]/, 'CDP client should listen for socket errors');
  assert.match(source, /pending\.forEach\(\(\{\s*rejectCommand\s*\}/, 'CDP client should reject all pending commands');
  assert.match(source, /CDP socket closed/, 'smoke runner should surface socket closure as a fatal error');
}

function testBrowserPathResolutionCanAvoidSystemEdge() {
  const source = readSmokeRunner();

  assert.match(source, /function\s+resolveBrowserPath\s*\(/, 'smoke runner should resolve browsers through a helper');
  assert.match(source, /PLAYWRIGHT_BROWSERS_PATH|ms-playwright/, 'smoke runner should prefer Playwright-managed Chromium when available');
  assert.match(source, /CHROME_PATH/, 'smoke runner should allow overriding Chrome path');
  assert.match(source, /EDGE_PATH/, 'smoke runner should keep Edge override compatibility');
}

function testHeadlessBrowserAvoidsGpuSandboxCrashFlags() {
  const source = readSmokeRunner();

  assert.match(source, /--no-sandbox/, 'headless smoke should disable the browser sandbox for constrained Windows test environments');
  assert.match(source, /--disable-gpu-sandbox/, 'headless smoke should avoid GPU sandbox startup crashes');
  assert.match(source, /--disable-gpu-compositing/, 'headless smoke should avoid GPU compositing');
  assert.doesNotMatch(source, /--use-gl=swiftshader/, 'headless smoke should not force SwiftShader GL when it crashes the GPU process');
}

function run() {
  testCdpClientRejectsPendingCommandsWhenSocketCloses();
  testBrowserPathResolutionCanAvoidSystemEdge();
  testHeadlessBrowserAvoidsGpuSandboxCrashFlags();
  console.log('drawing-smoke-runner-resilience.test: all assertions passed');
}

run();
