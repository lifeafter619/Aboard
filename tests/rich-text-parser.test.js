const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRichTextParser() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'rich-text-parser.js'), 'utf8');
  const sandbox = { window: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'rich-text-parser.js' });
  return sandbox.window.RichTextParser;
}

function testFormattedUrlDoesNotIncludeGeneratedMarkupInHref() {
  const RichTextParser = loadRichTextParser();
  const html = RichTextParser.parse('**https://example.com**');

  assert.equal(
    html,
    '<b><a href="https://example.com" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">https://example.com</a></b>'
  );
}

function testUnsafeStyleDirectivesRenderContentWithoutStyleAttribute() {
  const RichTextParser = loadRichTextParser();

  assert.equal(
    RichTextParser.parse('[color=red;background:url(javascript:alert(1))]Title[/color]'),
    'Title'
  );
  assert.equal(
    RichTextParser.parse('[size=16px;position:absolute]Title[/size]'),
    'Title'
  );
}

function main() {
  testFormattedUrlDoesNotIncludeGeneratedMarkupInHref();
  testUnsafeStyleDirectivesRenderContentWithoutStyleAttribute();
  console.log('rich-text-parser.test: all assertions passed');
}

main();
