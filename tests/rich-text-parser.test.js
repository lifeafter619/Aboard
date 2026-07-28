const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRichTextParser() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'infra', 'rich-text-parser.js'), 'utf8')
    .replace(/^export class RichTextParser/m, 'class RichTextParser')
    .replace(/^export function registerRichTextParserGlobal/m, 'function registerRichTextParserGlobal');
  const sandbox = { window: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nregisterRichTextParserGlobal(window);`, sandbox, { filename: 'rich-text-parser.js' });
  return sandbox.window.RichTextParser;
}

// The legacy js/modules copy was removed; only the infra parser exists now,
// so all tests exercise the single real implementation.

function testFormattedUrlDoesNotIncludeGeneratedMarkupInHref() {
  const RichTextParser = loadRichTextParser();
  const html = RichTextParser.parse('**https://example.com**');

  assert.equal(
    html,
    '<b><a href="https://example.com" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">https://example.com</a></b>'
  );
}

function testUrlFormattingMarkersRemainLiteralInsideLink() {
  const RichTextParser = loadRichTextParser();
  const url = 'https://example.com/study__guide__v2.pdf';
  const html = RichTextParser.parse(url);

  assert.equal(
    html,
    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">${url}</a>`
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

async function testRuntimeParserRejectsUnsafeStyleDirectives() {
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

async function testUserTextThatLooksLikeLinkPlaceholderStaysText() {
  const RichTextParser = loadRichTextParser();

  assert.equal(
    RichTextParser.parse('Keep %%ABOARD_LINK_0%% literal'),
    'Keep %%ABOARD_LINK_0%% literal'
  );
  assert.equal(
    RichTextParser.parse('https://example.com %%ABOARD_LINK_0%%'),
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">https://example.com</a> %%ABOARD_LINK_0%%'
  );
}

async function main() {
  testFormattedUrlDoesNotIncludeGeneratedMarkupInHref();
  testUrlFormattingMarkersRemainLiteralInsideLink();
  testUnsafeStyleDirectivesRenderContentWithoutStyleAttribute();
  await testRuntimeParserRejectsUnsafeStyleDirectives();
  await testUserTextThatLooksLikeLinkPlaceholderStaysText();
  console.log('rich-text-parser.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
