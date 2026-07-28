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
  const testRunner = readText('scripts/run-tests.js');
  assert.match(packageJson.scripts?.['test:smoke'] || '', /node tests\/drawing-smoke-cdp\.mjs/, 'test:smoke should include drawing persistence browser coverage');
  assert.match(packageJson.scripts?.['test:smoke'] || '', /node tests\/responsive-layout-smoke\.mjs/, 'test:smoke should include responsive layout browser coverage');
  assert.match(packageJson.scripts?.test || '', /run-tests\.js core|test:core/, 'npm test should run the lightweight core suite');
  assert.match(packageJson.scripts?.['test:full'] || '', /run-tests\.js full/, 'test:full should run the complete regression suite');
  assert.match(testRunner, /tests\/drawing-smoke-cdp\.mjs/, 'full suite runner should include drawing persistence browser coverage');
  assert.match(testRunner, /tests\/responsive-layout-smoke\.mjs/, 'full suite runner should include responsive layout browser coverage');
}

function testRetiredStrokeEditorIsNotLoaded() {
  const manifest = readText('js/app/legacy-manifest.js');
  const serviceWorker = readText('sw.js');
  const runtimeDependencies = readText('js/app/create-board-runtime-dependencies.js');
  const legacyConstruction = readText('js/modules/board-construction.js');

  assert.doesNotMatch(manifest, /stroke-controls\.js/,
    'the unreachable legacy stroke editor should not be loaded during startup');
  assert.doesNotMatch(serviceWorker, /stroke-controls\.js/,
    'the unreachable legacy stroke editor should not occupy the offline cache');
  assert.doesNotMatch(runtimeDependencies, /\bStrokeControls\b/,
    'selection construction should not depend on the retired stroke editor');
  assert.doesNotMatch(legacyConstruction, /\bStrokeControls\b/,
    'legacy fallback construction should not depend on the retired stroke editor');
}

function testPaginationControlsUseCompactTargets() {
  const html = readText('index.html');
  const css = readText('css/modules/pagination.css');
  const paginationRule = css.match(/#pagination-controls\s*\{(?<body>[\s\S]*?)\}/);
  const pageNavRule = css.match(/\.page-nav-btn\s*\{(?<body>[\s\S]*?)\}/);
  const pageInputRule = css.match(/\.page-input\s*\{(?<body>[\s\S]*?)\}/);

  assert.match(html, /href="css\/modules\/pagination\.css"/, 'index.html should load pagination controls as a CSS module');
  assert.ok(paginationRule, 'pagination.css should define #pagination-controls');
  assert.ok(pageNavRule, 'pagination.css should define .page-nav-btn');
  assert.ok(pageInputRule, 'pagination.css should define .page-input');
  assert.match(paginationRule.groups.body, /gap:\s*6px/, 'pagination controls should use compact spacing');
  assert.match(paginationRule.groups.body, /padding:\s*6px\s+8px/, 'pagination controls should use compact padding');
  assert.match(pageNavRule.groups.body, /width:\s*40px/, 'pagination buttons should be visually compact');
  assert.match(pageNavRule.groups.body, /height:\s*40px/, 'pagination buttons should be visually compact');
  assert.doesNotMatch(pageNavRule.groups.body, /min-width:\s*var\(--touch-target-size\)/, 'pagination buttons should not force the global 44px target size');
  assert.doesNotMatch(pageNavRule.groups.body, /min-height:\s*var\(--touch-target-size\)/, 'pagination buttons should not force the global 44px target size');
  assert.match(pageInputRule.groups.body, /width:\s*48px/, 'pagination input should be narrower');
  assert.match(pageInputRule.groups.body, /height:\s*40px/, 'pagination input should be visually compact');
  assert.doesNotMatch(pageInputRule.groups.body, /min-height:\s*var\(--touch-target-size\)/, 'pagination input should not force the global 44px target size');
}

function testTimeDisplayAreaStylesLiveInModule() {
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/time-display.css');

  assert.match(moduleCss, /#time-display-area\s*\{/, 'time display module should own #time-display-area styles');
  assert.match(moduleCss, /\.time-display-settings-btn-with-text\s*\{/, 'time display module should own time display area actions');
  assert.doesNotMatch(coreCss, /\/\*\s*Time Display Area Styles\s*\*\//, 'style.css should not keep time display area styles after module extraction');
  assert.doesNotMatch(coreCss, /#time-display-area\s*\{/, 'style.css should not define #time-display-area directly');
}

function testCoordinateToolStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/coordinate-tools.css');

  assert.match(html, /href="css\/modules\/coordinate-tools\.css"/, 'index.html should load coordinate tools as a CSS module');
  assert.match(moduleCss, /\.coordinate-tools-modal-content\s*\{/, 'coordinate tools module should own the main modal styles');
  assert.match(moduleCss, /\.coordinate-point-modal-content\s*\{/, 'coordinate tools module should own point modal styles');
  assert.match(moduleCss, /\.coordinate-keypad-modal-content\s*\{/, 'coordinate tools module should own keypad modal styles');
  assert.match(moduleCss, /\.coordinate-plot-editor-btn\s*\{/, 'coordinate tools module should own plot editor button styles');
  assert.doesNotMatch(coreCss, /\.coordinate-tools-modal-content\s*\{/, 'style.css should not define coordinate tools modal styles directly');
  assert.doesNotMatch(coreCss, /\.coordinate-point-modal-content\s*\{/, 'style.css should not define coordinate point modal styles directly');
  assert.doesNotMatch(coreCss, /\.coordinate-keypad-modal-content\s*\{/, 'style.css should not define coordinate keypad modal styles directly');
}

function testSelectionControlStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/selection-controls.css');

  assert.match(html, /href="css\/modules\/selection-controls\.css"/, 'index.html should load selection controls as a CSS module');
  assert.match(moduleCss, /\.image-controls-overlay\s*\{/, 'selection controls module should own image controls overlay styles');
  assert.match(moduleCss, /\.image-controls-box\s*\{/, 'selection controls module should own image controls box styles');
  assert.match(moduleCss, /\.image-controls-toolbar\s*\{/, 'selection controls module should own image controls toolbar styles');
  assert.match(moduleCss, /\.image-control-btn\s*\{/, 'selection controls module should own image control button styles');
  assert.match(moduleCss, /\.selection-layer-menu\s*\{/, 'selection controls module should own selection layer menu styles');
  assert.match(moduleCss, /\.selection-color-popover\s*\{/, 'selection controls module should own selection color popover styles');
  assert.match(moduleCss, /\.selection-coordinate-position-list\s*\{/, 'selection controls module should own coordinate position list styles');
  assert.match(moduleCss, /\.selection-box\s*\{/, 'selection controls module should own canvas image selection box styles');
  assert.match(moduleCss, /\.selection-action-buttons\s*\{/, 'selection controls module should own selection action button group styles');
  assert.match(moduleCss, /\.image-context-menu\s*\{/, 'selection controls module should own image context menu styles');
  assert.match(moduleCss, /@media\s*\(-webkit-min-device-pixel-ratio:\s*2\),\s*\(min-resolution:\s*192dpi\)\s*\{[\s\S]*\.selection-box,[\s\S]*\.resize-handle\s*\{[\s\S]*border-width:\s*1px/, 'selection controls module should keep high-DPI selection borders');
  assert.doesNotMatch(coreCss, /\.image-controls-overlay\s*\{/, 'style.css should not define image controls overlay styles directly');
  assert.doesNotMatch(coreCss, /\.image-controls-box\s*\{/, 'style.css should not define image controls box styles directly');
  assert.doesNotMatch(coreCss, /\.image-controls-toolbar\s*\{/, 'style.css should not define image controls toolbar styles directly');
  assert.doesNotMatch(coreCss, /^\.resize-handle\s*[,{]/m, 'style.css should not define global resize handle styles directly');
  assert.doesNotMatch(coreCss, /\.selection-color-popover\s*\{/, 'style.css should not define selection color popover styles directly');
  assert.doesNotMatch(coreCss, /\.selection-coordinate-position-list\s*\{/, 'style.css should not define coordinate position list styles directly');
  assert.doesNotMatch(coreCss, /\.selection-box\s*\{/, 'style.css should not define canvas image selection box styles directly');
  assert.doesNotMatch(coreCss, /\.selection-action-buttons\s*\{/, 'style.css should not define selection action button group styles directly');
  assert.doesNotMatch(coreCss, /\.image-context-menu\s*\{/, 'style.css should not define image context menu styles directly');
}

function testExportModalStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/export.css');

  assert.match(html, /href="css\/modules\/export\.css"/, 'index.html should load export styles as a CSS module');
  assert.match(moduleCss, /\.export-modal-content\s*\{/, 'export module should own export modal content styles');
  assert.match(moduleCss, /\.export-modal-content\s+\.modal-body\s*\{/, 'export module should own export modal body scrolling styles');
  assert.match(moduleCss, /\.export-options\s*\{/, 'export module should own export option layout styles');
  assert.match(moduleCss, /\.export-format-btn\s*\{/, 'export module should own export format button styles');
  assert.match(moduleCss, /\.export-filename-input\s*\{/, 'export module should own export filename input styles');
  assert.doesNotMatch(coreCss, /\/\*\s*Export Modal Styles\s*\*\//, 'style.css should not keep export modal styles after module extraction');
  assert.doesNotMatch(coreCss, /\.export-modal-content\s*\{/, 'style.css should not define export modal content styles directly');
  assert.doesNotMatch(coreCss, /\.export-options\s*\{/, 'style.css should not define export option layout styles directly');
  assert.doesNotMatch(coreCss, /\.export-format-btn\s*\{/, 'style.css should not define export format button styles directly');
  assert.doesNotMatch(coreCss, /\.export-filename-input\s*\{/, 'style.css should not define export filename input styles directly');
}

function testDialogStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/dialogs.css');
  const runtime = readText('js/modules/modal-runtime.js');

  assert.match(html, /href="css\/modules\/dialogs\.css"/, 'index.html should load dialog styles as a CSS module');
  assert.match(moduleCss, /\.confirm-modal-content\s*\{/, 'dialogs module should own confirm modal styles');
  assert.match(moduleCss, /\.app-confirm-options\s*\{/, 'dialogs module should own app confirm option styles');
  assert.match(moduleCss, /\.announcement-modal-content\s*\{/, 'dialogs module should own announcement modal styles');
  assert.match(moduleCss, /\.announcement-buttons\s*\{/, 'dialogs module should own announcement action styles');
  assert.match(
    moduleCss,
    /\.announcement-modal-content\s*\{[\s\S]*width:\s*min\(500px,\s*calc\(100vw - 24px\)\)/,
    'announcement modal should fit within narrow mobile viewports'
  );
  assert.match(
    moduleCss,
    /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.announcement-modal-content\s*\{[\s\S]*min-width:\s*0/,
    'announcement modal should drop fixed minimum width on phones'
  );
  assert.match(
    runtime,
    /key:\s*'announcementModal',[\s\S]*responsiveMinWidth:\s*320/,
    'announcement modal runtime should use a responsive minimum width'
  );
  assert.doesNotMatch(coreCss, /\/\*\s*Confirm Modal\s*\*\//, 'style.css should not keep confirm modal styles after module extraction');
  assert.doesNotMatch(coreCss, /\/\*\s*Announcement modal styles\s*\*\//, 'style.css should not keep announcement modal styles after module extraction');
  assert.doesNotMatch(coreCss, /\.confirm-modal-content\s*\{/, 'style.css should not define confirm modal styles directly');
  assert.doesNotMatch(coreCss, /\.announcement-modal-content\s*\{/, 'style.css should not define announcement modal styles directly');
}

function testInsertTextModalStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/insert-text.css');

  assert.match(html, /href="css\/modules\/insert-text\.css"/, 'index.html should load insert text styles as a CSS module');
  assert.match(moduleCss, /\.text-input-modal-content\s*\{/, 'insert text module should own text input modal content styles');
  assert.match(moduleCss, /\.text-input-modal-content\s+\.modal-body\s*\{/, 'insert text module should own text input modal body scrolling styles');
  assert.match(moduleCss, /\.text-input-area\s*\{/, 'insert text module should own text input area styles');
  assert.match(moduleCss, /\.text-input-controls\s*\{/, 'insert text module should own text input controls layout');
  assert.match(moduleCss, /@media\s*\(max-height:\s*720px\),\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.text-input-modal-content\s*\{[\s\S]*min-width:\s*0/, 'insert text module should keep narrow viewport modal override');
  assert.doesNotMatch(coreCss, /\/\*\s*Text Input Modal\s*\*\//, 'style.css should not keep text input modal styles after module extraction');
  assert.doesNotMatch(coreCss, /\.text-input-modal-content\s*\{/, 'style.css should not define text input modal content styles directly');
  assert.doesNotMatch(coreCss, /\.text-input-area\s*\{/, 'style.css should not define text input area styles directly');
  assert.doesNotMatch(coreCss, /\.text-input-controls\s*\{/, 'style.css should not define text input controls layout directly');
}

function testFontManagementStylesLiveInModule() {
  const html = readText('index.html');
  const coreCss = readText('css/style.css');
  const moduleCss = readText('css/modules/font-management.css');

  assert.match(
    html,
    /<link\s+[^>]*rel="preload"[^>]*as="style"[^>]*href="css\/modules\/font-management\.css"[^>]*fetchpriority="low"/,
    'index.html should load font management styles as a low-priority CSS module'
  );
  assert.match(moduleCss, /\.font-management-list\s*\{/, 'font management module should own the list styles');
  assert.match(moduleCss, /\.font-preview-panel\s*\{/, 'font management module should own inline preview styles');
  assert.match(moduleCss, /\.font-preview-modal-content\s*\{/, 'font management module should own preview modal styles');
  assert.match(moduleCss, /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*\.font-preview-modal-content\s*\{/, 'font management module should keep responsive preview modal styles');
  assert.doesNotMatch(coreCss, /\.font-management-list\s*\{/, 'style.css should not define font management list styles directly');
  assert.doesNotMatch(coreCss, /\.font-preview-panel\s*\{/, 'style.css should not define inline font preview styles directly');
  assert.doesNotMatch(coreCss, /\.font-preview-modal-content\s*\{/, 'style.css should not define font preview modal styles directly');
}

function testDeferredStylePreloadsUseLowFetchPriority() {
  const html = readText('index.html');
  const deferredStylePreloads = [...html.matchAll(/<link\s+[^>]*rel="preload"[^>]*as="style"[^>]*>/gi)]
    .map(([tag]) => tag);

  assert.ok(deferredStylePreloads.length > 0, 'index.html should keep feature CSS as deferred style preloads');
  const missingLowPriority = deferredStylePreloads.filter((tag) => !/\sfetchpriority="low"/i.test(tag));

  assert.deepEqual(
    missingLowPriority,
    [],
    `deferred CSS preloads should use low fetch priority: ${missingLowPriority.join(', ')}`
  );
}

function testNonFirstPaintCssModulesAreDeferred() {
  const html = readText('index.html');
  const htmlWithoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
  const nonFirstPaintModules = [
    'coordinate-tools',
    'selection-controls',
    'shape'
  ];

  nonFirstPaintModules.forEach((moduleName) => {
    assert.doesNotMatch(
      htmlWithoutNoscript,
      new RegExp(`<link\\s+[^>]*rel="stylesheet"[^>]*href="css/modules/${moduleName}\\.css"`),
      `${moduleName}.css should not block first paint`
    );
    assert.match(
      html,
      new RegExp(`<link\\s+[^>]*rel="preload"[^>]*as="style"[^>]*href="css/modules/${moduleName}\\.css"[^>]*fetchpriority="low"`),
      `${moduleName}.css should be applied through a low-priority deferred style preload`
    );
  });
}

function collectJsSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'libs') {
        return [];
      }
      return collectJsSourceFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function testProductionSourcesAvoidReplaceAllForLegacyWebViews() {
  const jsRoot = path.join(REPO_ROOT, 'js');
  const offenders = collectJsSourceFiles(jsRoot).flatMap((filePath) => {
    const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) => (
        line.includes('.replaceAll(')
          ? [`${relativePath}:${index + 1}`]
          : []
      ));
  });

  assert.deepEqual(
    offenders,
    [],
    `production JS should avoid String.prototype.replaceAll for older WebView/Safari compatibility: ${offenders.join(', ')}`
  );
}

function testProductionSourcesAvoidPromiseFinallyForLegacyWebViews() {
  const jsRoot = path.join(REPO_ROOT, 'js');
  const offenders = collectJsSourceFiles(jsRoot).flatMap((filePath) => {
    const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) => (
        line.includes('.finally(')
          ? [`${relativePath}:${index + 1}`]
          : []
      ));
  });

  assert.deepEqual(
    offenders,
    [],
    `production JS should avoid Promise.prototype.finally for older WebView/Safari compatibility: ${offenders.join(', ')}`
  );
}

function testLegacyStartupAvoidsAggregateError() {
  const loader = readText('js/app/legacy-script-loader.js');
  assert.doesNotMatch(
    loader,
    /\bAggregateError\b/,
    'legacy startup must not depend on AggregateError, which is newer than the supported browser baseline'
  );
}

function testStylesAvoidHasSelectorForLegacyWebViews() {
  const cssRoot = path.join(REPO_ROOT, 'css');
  const offenders = fs.readdirSync(cssRoot, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(cssRoot, entry.name);
    const files = entry.isDirectory()
      ? fs.readdirSync(entryPath).map((name) => path.join(entryPath, name))
      : [entryPath];

    return files
      .filter((filePath) => filePath.endsWith('.css'))
      .flatMap((filePath) => {
        const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
        return fs.readFileSync(filePath, 'utf8')
          .split(/\r?\n/)
          .flatMap((line, index) => (
            line.includes(':has(')
              ? [`${relativePath}:${index + 1}`]
              : []
          ));
      });
  });

  assert.deepEqual(
    offenders,
    [],
    `CSS should avoid :has() selectors for older WebView/Safari compatibility: ${offenders.join(', ')}`
  );
}

function testHtmlAvoidsInlineFixedModalWidths() {
  const html = readText('index.html');
  const offenders = [...html.matchAll(/<[^>]*class="[^"]*\bmodal-content\b[^"]*"[^>]*style="[^"]*(?:width|min-width|max-width):\s*[0-9][0-9][0-9]px[^"]*"/gi)]
    .map((match) => {
      const line = html.slice(0, match.index).split(/\r?\n/).length;
      return `index.html:${line}`;
    });

  assert.deepEqual(
    offenders,
    [],
    `modal content should not use inline fixed widths that override responsive CSS: ${offenders.join(', ')}`
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
  testRetiredStrokeEditorIsNotLoaded();
  testPaginationControlsUseCompactTargets();
  testTimeDisplayAreaStylesLiveInModule();
  testCoordinateToolStylesLiveInModule();
  testSelectionControlStylesLiveInModule();
  testExportModalStylesLiveInModule();
  testDialogStylesLiveInModule();
  testInsertTextModalStylesLiveInModule();
  testFontManagementStylesLiveInModule();
  testDeferredStylePreloadsUseLowFetchPriority();
  testNonFirstPaintCssModulesAreDeferred();
  testProductionSourcesAvoidReplaceAllForLegacyWebViews();
  testProductionSourcesAvoidPromiseFinallyForLegacyWebViews();
  testLegacyStartupAvoidsAggregateError();
  testStylesAvoidHasSelectorForLegacyWebViews();
  testHtmlAvoidsInlineFixedModalWidths();
  testAnnouncementModalResponsiveMinimumWidthIsApplied();
  console.log('project-quality-guards.test: all assertions passed');
}

run();
