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

function run() {
  testPackageMetadataUsesVersionTxt();
  testReadmeBadgeUsesVersionTxt();
  testServiceWorkerCacheVersionUsesVersionTxt();
  console.log('version-source-of-truth.test: all assertions passed');
}

run();
