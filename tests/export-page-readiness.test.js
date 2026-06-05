const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub(selectedButtons = []) {
  return {
    querySelectorAll(selector) {
      if (selector === '.page-selection-group .page-selection-buttons .page-selection-btn.selected') {
        return selectedButtons;
      }
      return [];
    },
    getElementById() {
      return null;
    },
    createElement() {
      return {};
    }
  };
}

function loadExportManagerClass(document) {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'export.js'), 'utf8')}\nwindow.__ExportManager = ExportManager;`;
  const sandbox = {
    window: {
      i18n: {
        t(_key, fallback) {
          return fallback;
        }
      },
      addEventListener() {},
      removeEventListener() {}
    },
    document,
    console,
    Promise,
    Array,
    Date,
    Error,
    Image: class {},
    parseInt,
    encodeURIComponent
  };

  sandbox.globalThis = sandbox;
  sandbox.window.document = document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'export.js' });
  return sandbox.window.__ExportManager;
}

function createBoard({ currentPage, pageCount, calls }) {
  return {
    currentPage,
    pages: Array.from({ length: pageCount }, () => ({})),
    async goToPageAsync(pageNumber) {
      calls.push(['goToPageAsync', pageNumber]);
      this.currentPage = pageNumber;
    },
    goToPage(pageNumber) {
      calls.push(['goToPage', pageNumber]);
      this.currentPage = pageNumber;
    }
  };
}

function createExportManager({ board, calls, ExportManager }) {
  return {
    drawingBoard: board,
    async exportSinglePage(filename) {
      calls.push(['exportSinglePage', filename, board.currentPage]);
    },
    sleep() {
      throw new Error('multi-page export should wait for page readiness instead of using fixed sleeps');
    },
    goToExportPage: ExportManager.prototype.goToExportPage,
    exportAllPages: ExportManager.prototype.exportAllPages,
    exportSpecificPages: ExportManager.prototype.exportSpecificPages
  };
}

async function testExportAllPagesWaitsForPageReadinessBeforeEachCapture() {
  const calls = [];
  const ExportManager = loadExportManagerClass(createDocumentStub());
  const board = createBoard({ currentPage: 1, pageCount: 3, calls });
  const manager = createExportManager({ board, calls, ExportManager });

  await manager.exportAllPages('lesson', 'png', 1);

  assert.deepEqual(calls, [
    ['goToPageAsync', 1],
    ['exportSinglePage', 'lesson-1', 1],
    ['goToPageAsync', 2],
    ['exportSinglePage', 'lesson-2', 2],
    ['goToPageAsync', 3],
    ['exportSinglePage', 'lesson-3', 3],
    ['goToPageAsync', 1]
  ]);
}

async function testExportSpecificPagesWaitsForPageReadinessBeforeEachCapture() {
  const calls = [];
  const selectedButtons = [
    { dataset: { pageNum: '3' } },
    { dataset: { pageNum: '1' } }
  ];
  const ExportManager = loadExportManagerClass(createDocumentStub(selectedButtons));
  const board = createBoard({ currentPage: 4, pageCount: 4, calls });
  const manager = createExportManager({ board, calls, ExportManager });

  await manager.exportSpecificPages('lesson', 'png', 1);

  assert.deepEqual(calls, [
    ['goToPageAsync', 1],
    ['exportSinglePage', 'lesson-1', 1],
    ['goToPageAsync', 3],
    ['exportSinglePage', 'lesson-3', 3],
    ['goToPageAsync', 4]
  ]);
}

async function main() {
  await testExportAllPagesWaitsForPageReadinessBeforeEachCapture();
  await testExportSpecificPagesWaitsForPageReadinessBeforeEachCapture();
  console.log('export-page-readiness.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
