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
    Blob,
    Uint8Array,
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

function createStatefulBoard({ currentPage, pageCount, calls }) {
  const originalHistory = [{ id: 'initial' }, { id: 'edited' }];
  const board = createBoard({ currentPage, pageCount, calls });
  board.historyManager = {
    history: originalHistory,
    historyStep: 1,
    lastRestoreHadSceneState: true
  };
  board.selectionManager = {
    selectionType: 'multi',
    selectedIndex: null,
    selectedGroupId: null,
    selectedStrokes: [0, 2],
    selectedImages: [1],
    selectedTexts: [0],
    selectedCoordinatePointIds: [],
    selectedCoordinateGroupId: null,
    multiRotation: 15,
    multiRotationCenter: { x: 50, y: 40 },
    multiBounds: { x: 10, y: 10, width: 80, height: 60 },
    hasUnsavedChanges: true,
    showControls() {},
    redrawWithSelection() {}
  };
  board.goToPageAsync = async function goToPageAsync(pageNumber) {
    calls.push(['goToPageAsync', pageNumber]);
    this.currentPage = pageNumber;
    this.historyManager.history = [{ id: `page-${pageNumber}` }];
    this.historyManager.historyStep = 0;
    this.historyManager.lastRestoreHadSceneState = false;
    this.selectionManager.selectionType = null;
    this.selectionManager.selectedStrokes = [];
    this.selectionManager.selectedImages = [];
    this.selectionManager.selectedTexts = [];
    this.selectionManager.multiRotation = 0;
    this.selectionManager.multiRotationCenter = null;
    this.selectionManager.multiBounds = null;
    this.selectionManager.hasUnsavedChanges = false;
  };
  return { board, originalHistory };
}

function createExportManager({ board, calls, ExportManager }) {
  return {
    drawingBoard: board,
    async captureCurrentPageImage(filename) {
      calls.push(['captureCurrentPageImage', filename, board.currentPage]);
      return { filename: `${filename}.png`, bytes: new Uint8Array([board.currentPage]) };
    },
    async downloadImageArchive(files, filename) {
      calls.push(['downloadImageArchive', filename, files.map(file => file.filename)]);
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

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['goToPageAsync', 1],
    ['captureCurrentPageImage', 'lesson-1', 1],
    ['goToPageAsync', 2],
    ['captureCurrentPageImage', 'lesson-2', 2],
    ['goToPageAsync', 3],
    ['captureCurrentPageImage', 'lesson-3', 3],
    ['downloadImageArchive', 'lesson', ['lesson-1.png', 'lesson-2.png', 'lesson-3.png']],
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

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['goToPageAsync', 1],
    ['captureCurrentPageImage', 'lesson-1', 1],
    ['goToPageAsync', 3],
    ['captureCurrentPageImage', 'lesson-3', 3],
    ['downloadImageArchive', 'lesson', ['lesson-1.png', 'lesson-3.png']],
    ['goToPageAsync', 4]
  ]);
}

async function testMultiPageExportPreservesEditingState() {
  const calls = [];
  const ExportManager = loadExportManagerClass(createDocumentStub());
  const { board, originalHistory } = createStatefulBoard({ currentPage: 2, pageCount: 3, calls });
  const manager = createExportManager({ board, calls, ExportManager });

  await manager.exportAllPages('lesson', 'png', 1);

  assert.equal(board.currentPage, 2, 'multi-page export must return to the original page');
  assert.equal(board.historyManager.history, originalHistory,
    'multi-page export must preserve the original undo history object');
  assert.equal(board.historyManager.historyStep, 1,
    'multi-page export must preserve the original undo position');
  assert.equal(board.historyManager.lastRestoreHadSceneState, true,
    'multi-page export must preserve history restoration metadata');
  assert.equal(board.selectionManager.selectionType, 'multi',
    'multi-page export must restore the active selection');
  assert.deepEqual(board.selectionManager.selectedStrokes, [0, 2]);
  assert.deepEqual(board.selectionManager.selectedImages, [1]);
  assert.deepEqual(board.selectionManager.selectedTexts, [0]);
  assert.equal(board.selectionManager.multiRotation, 15);
  assert.deepEqual(board.selectionManager.multiRotationCenter, { x: 50, y: 40 });
  assert.deepEqual(board.selectionManager.multiBounds, { x: 10, y: 10, width: 80, height: 60 });
  assert.equal(board.selectionManager.hasUnsavedChanges, true,
    'multi-page export must preserve pending selection edits');
}

async function testImageArchiveCreatesOneZipDownload() {
  const ExportManager = loadExportManagerClass(createDocumentStub());
  const calls = [];
  const manager = {
    drawingBoard: {
      projectManager: {
        async ensureZipLibrary() {
          return {
            zipSync(entries) {
              calls.push(['zipSync', Object.keys(entries)]);
              return new Uint8Array([80, 75]);
            }
          };
        },
        downloadBlob(blob, filename) {
          calls.push(['downloadBlob', blob.type, filename]);
        }
      }
    },
    getProjectManagerForArchive: ExportManager.prototype.getProjectManagerForArchive
  };

  await ExportManager.prototype.downloadImageArchive.call(manager, [
    { filename: 'lesson-1.png', bytes: new Uint8Array([1]) },
    { filename: 'lesson-2.png', bytes: new Uint8Array([2]) }
  ], 'lesson');

  assert.deepEqual(calls, [
    ['zipSync', ['lesson-1.png', 'lesson-2.png']],
    ['downloadBlob', 'application/zip', 'lesson.zip']
  ], 'multi-page image export must produce one downloadable archive (KNOWN_ISSUES C9)');
}

async function main() {
  await testExportAllPagesWaitsForPageReadinessBeforeEachCapture();
  await testExportSpecificPagesWaitsForPageReadinessBeforeEachCapture();
  await testMultiPageExportPreservesEditingState();
  await testImageArchiveCreatesOneZipDownload();
  console.log('export-page-readiness.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
