const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadFileValidation() {
  const context = {
    window: {
      i18n: {
        t(key) {
          return key;
        }
      }
    },
    console: { warn() {} },
    Object,
    String,
    Number,
    Math,
    Array,
    RegExp
  };
  context.globalThis = context;
  context.self = context;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'file-validation.js'), 'utf8'),
    context,
    { filename: 'file-validation.js' }
  );
  return context.window.AboardFileValidation;
}

function testRejectsOversizedImages() {
  const validation = loadFileValidation();

  assert.throws(
    () => validation.validateImageFile({
      name: 'huge.png',
      type: 'image/png',
      size: 11 * 1024 * 1024
    }),
    /too large/i,
    'image validation should reject files above the configured limit'
  );
}

function testAllowsExtensionFallbackWhenMimeTypeIsMissing() {
  const validation = loadFileValidation();

  assert.doesNotThrow(
    () => validation.validateAudioFile({
      name: 'bell.mp3',
      type: '',
      size: 1024
    }),
    'audio validation should allow known extensions when browser MIME sniffing is empty'
  );
}

function testRejectsUnsupportedSpreadsheetTypes() {
  const validation = loadFileValidation();

  assert.throws(
    () => validation.validateSpreadsheetFile({
      name: 'names.exe',
      type: 'application/x-msdownload',
      size: 1024
    }),
    /unsupported/i,
    'spreadsheet validation should reject unsupported extensions and MIME types'
  );
}

function testShowsValidationErrorsThroughToast() {
  const validation = loadFileValidation();
  const calls = [];

  validation.showValidationError(new Error('Invalid file'), {
    toast: {
      show(message, type) {
        calls.push({ message, type });
      }
    }
  });

  assert.deepEqual(calls, [{ message: 'Invalid file', type: 'error' }]);
}

function main() {
  testRejectsOversizedImages();
  testAllowsExtensionFallbackWhenMimeTypeIsMissing();
  testRejectsUnsupportedSpreadsheetTypes();
  testShowsValidationErrorsThroughToast();
  console.log('file-validation-utility.test: all assertions passed');
}

main();
