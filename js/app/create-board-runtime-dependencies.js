import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';

function resolvePreferredConstructor(win, preferredNames) {
  for (const name of preferredNames) {
    const ctor = resolveLegacyConstructor(win, name);
    if (typeof ctor === 'function') {
      return ctor;
    }
  }

  return undefined;
}

function getCanvasContext(canvas, options) {
  return canvas?.getContext?.('2d', options) || null;
}

function instantiateOptionalDependency(label, ctor, args = []) {
  if (typeof ctor !== 'function') {
    return undefined;
  }

  try {
    return Reflect.construct(ctor, args);
  } catch (error) {
    console.warn(`Aboard ${label} failed to initialize, continuing with degraded behavior:`, error);
    return null;
  }
}

export function createBoardRuntimeDependencies({ win = window, doc = document, boardDependencies = {} } = {}) {
  const canvas = doc.getElementById('canvas');
  const bgCanvas = doc.getElementById('background-canvas');
  const eraserCursor = doc.getElementById('eraser-cursor');

  if (!canvas || !bgCanvas) {
    return {};
  }

  const ctx = getCanvasContext(canvas, {
    desynchronized: true,
    alpha: true,
    willReadFrequently: true
  });
  const bgCtx = getCanvasContext(bgCanvas);

  const DrawingEngine = resolvePreferredConstructor(win, ['AboardDrawingEngine', 'DrawingEngine']);
  const HistoryManager = resolvePreferredConstructor(win, ['AboardHistoryManager', 'HistoryManager']);
  const BackgroundManager = resolvePreferredConstructor(win, ['AboardBackgroundManager', 'BackgroundManager']);
  const ImageControls = resolvePreferredConstructor(win, ['AboardImageControls', 'ImageControls']);
  const StrokeControls = resolvePreferredConstructor(win, ['AboardStrokeControls', 'StrokeControls']);
  const SelectionManager = resolvePreferredConstructor(win, ['AboardSelectionManager', 'SelectionManager']);
  const TeachingToolsManager = resolvePreferredConstructor(win, ['AboardTeachingToolsManager', 'TeachingToolsManager']);
  const ShapeDrawingManager = resolvePreferredConstructor(win, ['AboardShapeDrawingManager', 'ShapeDrawingManager']);
  const LineStyleModal = resolvePreferredConstructor(win, ['AboardLineStyleModal', 'LineStyleModal']);
  const EdgeDrawingManager = resolvePreferredConstructor(win, ['AboardEdgeDrawingManager', 'EdgeDrawingManager']);

  const drawingEngine = typeof DrawingEngine === 'function' ? new DrawingEngine(canvas, ctx) : undefined;
  const historyManager = typeof HistoryManager === 'function' ? new HistoryManager(canvas, ctx) : undefined;
  const backgroundManager = typeof BackgroundManager === 'function' ? new BackgroundManager(bgCanvas, bgCtx) : undefined;
  const imageControls = typeof ImageControls === 'function' && backgroundManager
    ? instantiateOptionalDependency('ImageControls', ImageControls, [backgroundManager])
    : undefined;
  const strokeControls = typeof StrokeControls === 'function' && drawingEngine && historyManager
    ? new StrokeControls(drawingEngine, canvas, ctx, historyManager)
    : undefined;
  const selectionManager = typeof SelectionManager === 'function' && drawingEngine && strokeControls
    ? new SelectionManager(canvas, ctx, drawingEngine, strokeControls)
    : undefined;

  selectionManager?.setHistoryManager?.(historyManager);
  selectionManager?.setBackgroundManager?.(backgroundManager);

  const teachingToolsManager = typeof TeachingToolsManager === 'function' && historyManager
    ? instantiateOptionalDependency('TeachingToolsManager', TeachingToolsManager, [canvas, ctx, historyManager])
    : undefined;
  const shapeDrawingManager = typeof ShapeDrawingManager === 'function' && drawingEngine && historyManager
    ? new ShapeDrawingManager(canvas, ctx, drawingEngine, historyManager)
    : undefined;
  drawingEngine?.setShapeDrawingManager?.(shapeDrawingManager);

  const lineStyleModal = typeof LineStyleModal === 'function' && drawingEngine && shapeDrawingManager
    ? instantiateOptionalDependency('LineStyleModal', LineStyleModal, [drawingEngine, shapeDrawingManager])
    : undefined;

  const edgeDrawingManager = typeof EdgeDrawingManager === 'function' && teachingToolsManager && drawingEngine
    ? instantiateOptionalDependency('EdgeDrawingManager', EdgeDrawingManager, [teachingToolsManager, drawingEngine])
    : undefined;
  drawingEngine?.setEdgeDrawingManager?.(edgeDrawingManager);

  return {
    canvas,
    ctx,
    bgCanvas,
    bgCtx,
    eraserCursor,
    drawingEngine,
    historyManager,
    backgroundManager,
    imageControls,
    strokeControls,
    selectionManager,
    teachingToolsManager,
    shapeDrawingManager,
    lineStyleModal,
    edgeDrawingManager,
    settingsManager: boardDependencies.settingsManager
  };
}
