const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function getTransformLayerTag() {
  const match = indexHtml.match(/<div\s+id=["']transform-layer["'][^>]*>/i);
  assert.ok(match, 'index.html should contain #transform-layer');
  return match[0];
}

function testTransformLayerDoesNotDisableCanvasPointerTargeting() {
  const transformLayerTag = getTransformLayerTag();

  assert.doesNotMatch(
    transformLayerTag,
    /pointer-events\s*:\s*none/i,
    '#transform-layer must not disable pointer targeting for the canvas subtree'
  );
}

function run() {
  testTransformLayerDoesNotDisableCanvasPointerTargeting();
  console.log('canvas-pointer-target.test: all assertions passed');
}

run();
