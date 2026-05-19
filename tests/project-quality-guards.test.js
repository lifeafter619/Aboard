const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.join(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function testViewportAllowsUserScaling() {
  const html = readText('index.html');
  const viewportMatch = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i);
  assert.ok(viewportMatch, 'index.html should define a viewport meta tag');

  const viewportContent = viewportMatch[1];
  assert.ok(!/user-scalable\s*=\s*no/i.test(viewportContent), 'viewport must not disable user scaling');
  assert.ok(!/maximum-scale\s*=\s*1(?:\.0)?(?:\D|$)/i.test(viewportContent), 'viewport must not cap zoom at 1x');
}

function testPortraitOverlayHasContinuePath() {
  const html = readText('index.html');
  const css = readText('css/style.css');
  const bootstrap = readText('js/app/bootstrap.js');

  assert.match(html, /id="portrait-orientation-continue-btn"/, 'portrait orientation overlay should expose a continue button');
  assert.match(css, /portrait-orientation-dismissed/, 'CSS should support dismissing the portrait overlay');
  assert.match(bootstrap, /portrait-orientation-continue-btn/, 'startup code should bind the portrait continue button');
}

function testScriptsDirectoryIsNotGloballyIgnored() {
  const gitignore = readText('.gitignore');
  const ignoredScriptsRule = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line === 'scripts/' || line === '/scripts/' || line === 'scripts');

  assert.equal(ignoredScriptsRule, undefined, 'scripts/ must not be globally ignored because build scripts are source files');
}

function testPackageExposesBrowserSmokeScript() {
  const packageJson = JSON.parse(readText('package.json'));
  assert.equal(packageJson.scripts?.['test:smoke'], 'node tests/drawing-smoke-cdp.mjs');
  assert.match(packageJson.scripts?.test || '', /test:smoke|drawing-smoke-cdp\.mjs/, 'npm test should include the browser smoke coverage');
}

function testPaginationControlsUseTouchSizedTargets() {
  const css = readText('css/style.css');
  const pageNavRule = css.match(/\.page-nav-btn\s*\{(?<body>[\s\S]*?)\}/);
  const pageInputRule = css.match(/\.page-input\s*\{(?<body>[\s\S]*?)\}/);

  assert.ok(pageNavRule, 'style.css should define .page-nav-btn');
  assert.ok(pageInputRule, 'style.css should define .page-input');
  assert.match(pageNavRule.groups.body, /min-width:\s*var\(--touch-target-size\)/, 'pagination buttons should keep a 44px touch width');
  assert.match(pageNavRule.groups.body, /min-height:\s*var\(--touch-target-size\)/, 'pagination buttons should keep a 44px touch height');
  assert.match(pageInputRule.groups.body, /min-height:\s*var\(--touch-target-size\)/, 'pagination input should keep a 44px touch height');
}

function testAnnouncementModalFitsNarrowViewports() {
  const css = readText('css/style.css');
  const runtime = readText('js/modules/modal-runtime.js');

  assert.match(
    css,
    /\.announcement-modal-content\s*\{[\s\S]*width:\s*min\(500px,\s*calc\(100vw - 24px\)\)/,
    'announcement modal should fit within narrow mobile viewports'
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.announcement-modal-content\s*\{[\s\S]*min-width:\s*0/,
    'announcement modal should drop fixed minimum width on phones'
  );
  assert.match(
    runtime,
    /key:\s*'announcementModal',[\s\S]*responsiveMinWidth:\s*320/,
    'announcement modal runtime should use a responsive minimum width'
  );
}

function loadModalRuntimeForViewport({ innerWidth, innerHeight }) {
  const sandbox = {
    console,
    window: { innerWidth, innerHeight }
  };
  vm.createContext(sandbox);
  vm.runInContext(readText('js/modules/modal-runtime.js'), sandbox, { filename: 'modal-runtime.js' });
  return sandbox.window.AboardModalRuntime;
}

function testAnnouncementModalResponsiveMinimumWidthIsApplied() {
  const runtime = loadModalRuntimeForViewport({ innerWidth: 400, innerHeight: 640 });
  const content = {
    dataset: {
      modalResizeMinWidth: '420',
      modalResizeResponsiveMinWidth: '320',
      modalResizeMinHeight: '280'
    }
  };

  assert.equal(
    runtime.getModalLayoutBounds(content).minWidth,
    320,
    'announcement modal should use its responsive minimum width before it hits the viewport edge'
  );
}

function run() {
  testViewportAllowsUserScaling();
  testPortraitOverlayHasContinuePath();
  testScriptsDirectoryIsNotGloballyIgnored();
  testPackageExposesBrowserSmokeScript();
  testPaginationControlsUseTouchSizedTargets();
  testAnnouncementModalFitsNarrowViewports();
  testAnnouncementModalResponsiveMinimumWidthIsApplied();
  console.log('project-quality-guards.test: all assertions passed');
}

run();
