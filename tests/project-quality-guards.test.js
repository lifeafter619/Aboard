const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

function run() {
  testViewportAllowsUserScaling();
  testPortraitOverlayHasContinuePath();
  testScriptsDirectoryIsNotGloballyIgnored();
  testPackageExposesBrowserSmokeScript();
  console.log('project-quality-guards.test: all assertions passed');
}

run();
