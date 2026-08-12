const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readVersion() {
  const version = readText('version.txt').trim();
  assert.match(version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, 'version.txt should contain a semver-compatible version');
  return version;
}

function testPackageMetadataUsesVersionTxt() {
  const version = readVersion();
  const packageJson = readJson('package.json');
  const packageLock = readJson('package-lock.json');

  assert.equal(packageJson.version, version, 'package.json version should match version.txt');
  assert.equal(packageLock.version, version, 'package-lock.json root version should match version.txt');
  assert.equal(packageLock.packages?.['']?.version, version, 'package-lock root package version should match version.txt');
}

function testReadmeBadgeUsesVersionTxt() {
  const version = readVersion();
  const readme = readText('README.md');

  assert.match(readme, new RegExp(`Version-${version.replace(/\./g, '\\.')}-`), 'README version badge should match version.txt');
}

function testServiceWorkerCacheVersionUsesVersionTxt() {
  const version = readVersion();
  const sw = readText('sw.js');
  const match = sw.match(/const\s+SW_VERSION\s*=\s*['"]([^'"]+)['"]/);

  assert.ok(match, 'sw.js should define SW_VERSION');
  assert.equal(match[1], version, 'Service Worker cache version should match version.txt');
}

function testManifestLinkUsesVersionTxt() {
  const version = readVersion();
  const html = readText('index.html');
  const manifest = readJson('manifest.json');
  const match = html.match(/<link\s+rel=["']manifest["']\s+href=["']manifest\.json\?v=([^"']+)["']/i);

  assert.ok(match, 'index.html should version the web app manifest URL');
  assert.equal(match[1], version, 'web app manifest URL version should match version.txt');
  manifest.icons
    .filter(icon => icon.type === 'image/png')
    .forEach(icon => {
      const iconVersion = new URL(icon.src, 'https://aboard.test/').searchParams.get('v');
      assert.equal(iconVersion, version, `${icon.src} version should match version.txt`);
    });
}

function testBuildPipelineEmbedsVersionTxtInBootstrap() {
  const bootstrap = readText('js/app/bootstrap.js');
  const buildScript = readText('scripts/build-static.js');
  const placeholder = '__ABOARD_BUILD_VERSION_PLACEHOLDER__';

  assert.match(bootstrap, /const\s+embeddedBuildVersion\s*=\s*'__ABOARD_BUILD_VERSION_PLACEHOLDER__'/,
    'source bootstrap should expose the build-version placeholder');
  assert.match(buildScript, /normalizedPath\s*===\s*'js\/app\/bootstrap\.js'/,
    'static build should identify the bootstrap module for version injection');
  assert.match(buildScript, /content\s*=\s*content\.replace\(BUILD_VERSION_PLACEHOLDER,\s*version\)/,
    'static build should replace the bootstrap placeholder with version.txt');
  assert.equal(
    bootstrap.split(placeholder).length - 1,
    2,
    'bootstrap should use the placeholder only for the embedded value and its source-tree fallback check'
  );
}

function run() {
  testPackageMetadataUsesVersionTxt();
  testReadmeBadgeUsesVersionTxt();
  testServiceWorkerCacheVersionUsesVersionTxt();
  testManifestLinkUsesVersionTxt();
  testBuildPipelineEmbedsVersionTxtInBootstrap();
  console.log('version-source-of-truth.test: all assertions passed');
}

run();
