// Drawing Engine Module
// Handles all drawing operations, pen types, and canvas interactions

const CANVAS_VIEW_STATE_VERSION_KEY = 'canvasViewStateVersion';
const CANVAS_VIEW_STATE_VERSION = '1';

function safeDrawingStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read drawing localStorage key "${key}":`, error);
        return null;
    }
}

function safeDrawingStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write drawing localStorage key "${key}":`, error);
        return false;
    }
}

class DrawingEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Drawing state
        this.isDrawing = false;
        this.currentColor = '#000000';
        this.penSize = 5;
        this.penType = safeDrawingStorageGetItem('penType') || 'normal';
        const storedEraserSize = parseInt(safeDrawingStorageGetItem('eraserSize'), 10);
        this.eraserSize = Number.isFinite(storedEraserSize)
            ? this.normalizeEraserSize(storedEraserSize)
            : this.getAdaptiveDefaultEraserSize();
        this.eraserShape = safeDrawingStorageGetItem('eraserShape') || 'circle';
        this.currentTool = 'pen';
        
        // Line style settings for pen
        this.penLineStyle = safeDrawingStorageGetItem('penLineStyle') || 'solid';
        this.penDashDensity = parseInt(safeDrawingStorageGetItem('penDashDensity'), 10) || 10;
        this.penMultiLineCount = parseInt(safeDrawingStorageGetItem('penMultiLineCount'), 10) || 2;
        this.penMultiLineSpacing = parseInt(safeDrawingStorageGetItem('penMultiLineSpacing'), 10) || 10;
        
        // Accumulated distance for dashed line drawing
        this.accumulatedDistance = 0;
        this.isInDash = true; // Track if we're in dash or gap phase
        
        // Multi-line tracking for smooth corners
        this.multiLineLastPerpX = 0;
        this.multiLineLastPerpY = 0;
        this.multiLineLastPoints = null; // Store last offset points for each line
        this.multiLinePendingPoint = null; // Accumulate short segments
        
        // Multi-line drawing constants
        this.MULTI_LINE_MIN_DISTANCE = 0.3; // Minimum distance threshold for multi-line drawing (smooth response at slower speeds)
        this.MULTI_LINE_POINT_DISTANCE = 0.25; // Point spacing threshold to capture slow movement without jitter
        this.MULTI_LINE_BLEND_MIN = 0.7; // Minimum blend factor for perpendicular smoothing
        this.MULTI_LINE_BLEND_MAX = 0.95; // Maximum blend factor
        this.MULTI_LINE_BLEND_SCALE = 80; // Scale factor for blend calculation
        
        // Drawing buffer
        this.points = [];
        this.lastPoint = null;
        this.strokeBreakIndices = [];
        this.pendingStrokeBreak = false;
        
        // Edge drawing support
        this.edgeDrawingManager = null;
        this.isSnappedToEdge = false;
        
        // Stroke storage for selection
        this.strokes = [];
        this.selectedStrokeIndex = null;
        this.SELECTION_THRESHOLD = 10; // Distance threshold for stroke selection
        this.COPY_OFFSET = 20; // Offset for copied strokes
        
        // Stamped images storage (for redraw support)
        this.stampedImages = [];
        this.selectedImageIndex = null;
        this.layerCounter = 1;
        this.objectIdCounter = 1;
        this.groupCounter = 1;
        this.objectGroups = [];
        this.offCanvasImageLayer = null;
        this.shapeDrawingManager = null;
        this.vectorSceneSvg = null;
        this.vectorPreviewEnabled = false;
        this.vectorSceneMaskCounter = 0;
        
        // Canvas scaling and panning
        const savedCanvasScale = parseFloat(safeDrawingStorageGetItem('canvasScale'));
        const savedPanOffsetX = parseFloat(safeDrawingStorageGetItem('panOffsetX'));
        const savedPanOffsetY = parseFloat(safeDrawingStorageGetItem('panOffsetY'));
        this.canvasScale = Number.isFinite(savedCanvasScale) && savedCanvasScale > 0 ? savedCanvasScale : 1.0;
        this.panOffset = { 
            x: Number.isFinite(savedPanOffsetX) ? savedPanOffsetX : 0,
            y: Number.isFinite(savedPanOffsetY) ? savedPanOffsetY : 0
        };
        this.isPanning = false;
        this.lastPanPoint = null;
        this.viewStatePersistTimeoutId = null;
        this.viewStatePersistDelayMs = 120;

        // Live preview overlay for high-zoom pen drawing
        this.livePreviewCanvas = null;
        this.livePreviewCtx = null;
        this.livePreviewPendingDraw = false;
        this.livePreviewRafId = null;
        this.cachedLivePreviewDpr = window.devicePixelRatio || 1;
        this.lastLivePreviewRect = null;
        this.liveEraserPreviewPendingDraw = false;
        this.liveEraserPreviewRafId = null;
        this.liveEraserPreviewMaskId = 'vector-scene-live-eraser-mask';
    }

    cancelPendingViewStatePersistence() {
        if (this.viewStatePersistTimeoutId) {
            clearTimeout(this.viewStatePersistTimeoutId);
            this.viewStatePersistTimeoutId = null;
        }
    }

    flushViewStatePersistence() {
        const persistedScale = safeDrawingStorageSetItem('canvasScale', this.canvasScale);
        const persistedPanX = safeDrawingStorageSetItem('panOffsetX', this.panOffset.x);
        const persistedPanY = safeDrawingStorageSetItem('panOffsetY', this.panOffset.y);
        const persistedVersion = safeDrawingStorageSetItem(CANVAS_VIEW_STATE_VERSION_KEY, CANVAS_VIEW_STATE_VERSION);

        if (!persistedScale || !persistedPanX || !persistedPanY || !persistedVersion) {
            console.warn('Failed to persist drawing view state to localStorage.');
        }
    }

    persistViewState(options = {}) {
        const {
            immediate = false,
            debounceMs = this.viewStatePersistDelayMs
        } = options;

        if (immediate) {
            this.cancelPendingViewStatePersistence();
            this.flushViewStatePersistence();
            return;
        }

        this.cancelPendingViewStatePersistence();
        this.viewStatePersistTimeoutId = setTimeout(() => {
            this.viewStatePersistTimeoutId = null;
            this.flushViewStatePersistence();
        }, debounceMs);
    }
    
    /**
     * Set the edge drawing manager for snapping to teaching tool edges
     */
    setEdgeDrawingManager(edgeDrawingManager) {
        this.edgeDrawingManager = edgeDrawingManager;
    }

    setShapeDrawingManager(shapeDrawingManager) {
        this.shapeDrawingManager = shapeDrawingManager;
    }

    createLivePreviewCanvas() {
        if (this.livePreviewCanvas && this.livePreviewCtx) {
            return;
        }

        this.livePreviewCanvas = document.createElement('canvas');
        this.livePreviewCanvas.id = 'pen-live-preview-canvas';
        this.livePreviewCanvas.style.position = 'fixed';
        this.livePreviewCanvas.style.top = '0';
        this.livePreviewCanvas.style.left = '0';
        this.livePreviewCanvas.style.pointerEvents = 'none';
        this.livePreviewCanvas.style.zIndex = '60';
        this.livePreviewCanvas.style.display = 'none';

        document.body.appendChild(this.livePreviewCanvas);
        this.livePreviewCtx = this.livePreviewCanvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        });
    }

    ensureLivePreviewCanvas() {
        if (!this.livePreviewCanvas || !this.livePreviewCtx) {
            this.createLivePreviewCanvas();
        }
    }

    canUseLiveStrokePreview() {
        return this.currentTool === 'pen';
    }

    shouldUseLiveStrokePreview() {
        const shouldUse = this.isDrawing &&
            this.canUseLiveStrokePreview() &&
            !!window.drawingBoard?.shouldShowLiveStrokePreview?.();

        if (shouldUse) {
            this.ensureLivePreviewCanvas();
        }

        return shouldUse && !!this.livePreviewCanvas && !!this.livePreviewCtx;
    }

    canUseLiveEraserPreview() {
        return this.currentTool === 'eraser' && !!this.ensureVectorSceneSvg();
    }

    shouldUseLiveEraserPreview() {
        return this.isDrawing &&
            this.canUseLiveEraserPreview() &&
            !!window.drawingBoard?.shouldShowLiveEraserPreview?.();
    }

    syncLivePreviewCanvas() {
        if (!this.livePreviewCanvas || !this.livePreviewCtx) return;

        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.cachedLivePreviewDpr = dpr;

        const needsResize = !this.lastLivePreviewRect ||
            this.lastLivePreviewRect.width !== rect.width ||
            this.lastLivePreviewRect.height !== rect.height ||
            this.lastLivePreviewRect.dpr !== dpr;

        if (needsResize) {
            this.livePreviewCanvas.width = Math.max(1, Math.round(rect.width * dpr));
            this.livePreviewCanvas.height = Math.max(1, Math.round(rect.height * dpr));
            this.livePreviewCanvas.style.width = rect.width + 'px';
            this.livePreviewCanvas.style.height = rect.height + 'px';
        }

        this.livePreviewCanvas.style.left = rect.left + 'px';
        this.livePreviewCanvas.style.top = rect.top + 'px';
        this.lastLivePreviewRect = { width: rect.width, height: rect.height, dpr };
    }

    clearLiveStrokePreview() {
        if (!this.livePreviewCanvas || !this.livePreviewCtx) return;
        this.livePreviewCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.livePreviewCtx.clearRect(0, 0, this.livePreviewCanvas.width, this.livePreviewCanvas.height);
    }

    hideLiveStrokePreview() {
        if (this.livePreviewRafId) {
            cancelAnimationFrame(this.livePreviewRafId);
            this.livePreviewRafId = null;
        }
        this.livePreviewPendingDraw = false;
        this.clearLiveStrokePreview();
        if (this.livePreviewCanvas) {
            this.livePreviewCanvas.style.display = 'none';
        }
    }

    clearLiveEraserPreview() {
        const svg = this.vectorSceneSvg && document.body.contains(this.vectorSceneSvg)
            ? this.vectorSceneSvg
            : document.getElementById('vector-scene-svg');
        if (!svg) return;

        const root = svg.querySelector('[data-vector-scene-root="true"]');
        root?.removeAttribute('mask');
        svg.querySelector(`#${this.liveEraserPreviewMaskId}`)?.remove();
    }

    hideLiveEraserPreview() {
        if (this.liveEraserPreviewRafId) {
            cancelAnimationFrame(this.liveEraserPreviewRafId);
            this.liveEraserPreviewRafId = null;
        }
        this.liveEraserPreviewPendingDraw = false;
        this.clearLiveEraserPreview();
    }

    hideActiveToolPreview() {
        this.hideLiveStrokePreview();
        this.hideLiveEraserPreview();
    }

    scheduleLiveStrokePreview() {
        if (!this.shouldUseLiveStrokePreview()) {
            this.hideLiveStrokePreview();
            return;
        }
        if (this.livePreviewPendingDraw) return;

        this.livePreviewPendingDraw = true;
        this.livePreviewRafId = requestAnimationFrame(() => {
            this.livePreviewPendingDraw = false;
            this.livePreviewRafId = null;
            this.renderLiveStrokePreview();
        });
    }

    scheduleLiveEraserPreview() {
        if (!this.shouldUseLiveEraserPreview()) {
            this.hideLiveEraserPreview();
            return;
        }
        if (this.liveEraserPreviewPendingDraw) return;

        this.liveEraserPreviewPendingDraw = true;
        this.liveEraserPreviewRafId = requestAnimationFrame(() => {
            this.liveEraserPreviewPendingDraw = false;
            this.liveEraserPreviewRafId = null;
            this.renderLiveEraserPreview();
        });
    }

    renderActiveToolPreview() {
        if (this.currentTool === 'eraser') {
            this.renderLiveEraserPreview();
            this.hideLiveStrokePreview();
            return;
        }
        if (this.currentTool === 'pen') {
            this.renderLiveStrokePreview();
            this.hideLiveEraserPreview();
            return;
        }
        this.hideActiveToolPreview();
    }

    scheduleActiveToolPreview() {
        if (this.currentTool === 'eraser') {
            this.scheduleLiveEraserPreview();
            return;
        }
        if (this.currentTool === 'pen') {
            this.scheduleLiveStrokePreview();
            return;
        }
        this.hideActiveToolPreview();
    }

    drawStrokePathPreview() {
        if (!this.points.length) return;

        const firstPoint = this.points[0];

        if (this.penLineStyle === 'dotted' || this.penLineStyle === 'dashed') {
            this.ctx.fillStyle = this.currentColor;
            this.ctx.beginPath();
            this.ctx.arc(firstPoint.x, firstPoint.y, this.penSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(firstPoint.x, firstPoint.y);
            this.ctx.lineTo(firstPoint.x, firstPoint.y);
            this.ctx.stroke();
        }

        if (this.points.length === 1) return;

        this.applyLineStyle();

        const complexBrushes = ['pencil', 'brush', 'fountain', 'ballpoint', 'marker'];
        const isComplex = complexBrushes.includes(this.penType) || this.penLineStyle === 'multi';

        if (!isComplex) {
            this.ctx.beginPath();
            this.ctx.moveTo(firstPoint.x, firstPoint.y);

            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }

            this.ctx.stroke();
            return;
        }

        for (let i = 1; i < this.points.length; i++) {
            const prevPoint = this.points[i - 1];
            const currPoint = this.points[i];
            const dx = currPoint.x - prevPoint.x;
            const dy = currPoint.y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.accumulatedDistance += distance;

            if (this.penLineStyle === 'multi') {
                this.drawMultiLine(prevPoint, currPoint);
            } else if (this.penType === 'ballpoint') {
                this.drawBallpointStroke(prevPoint, currPoint, distance);
            } else if (this.penType === 'brush') {
                this.drawBrushStroke(prevPoint, currPoint, distance);
            } else if (this.penType === 'pencil') {
                this.drawPencilStroke(prevPoint, currPoint, distance);
            } else if (this.penType === 'fountain') {
                this.drawFountainStroke(prevPoint, currPoint, distance);
            } else if (this.penType === 'marker') {
                this.drawMarkerStroke(prevPoint, currPoint, distance);
            }
        }
    }

    renderLiveStrokePreview() {
        if (!this.shouldUseLiveStrokePreview() || !this.points.length) {
            this.hideLiveStrokePreview();
            return;
        }

        this.syncLivePreviewCanvas();
        this.clearLiveStrokePreview();

        const viewportScale = this.getViewportScale();
        if (!Number.isFinite(viewportScale) || viewportScale <= 0) {
            this.hideLiveStrokePreview();
            return;
        }

        this.livePreviewCanvas.style.display = 'block';
        this.livePreviewCtx.setTransform(
            this.cachedLivePreviewDpr * viewportScale,
            0,
            0,
            this.cachedLivePreviewDpr * viewportScale,
            0,
            0
        );

        const originalCtx = this.ctx;
        const originalAccumulatedDistance = this.accumulatedDistance;
        const originalMultiLineLastPerpX = this.multiLineLastPerpX;
        const originalMultiLineLastPerpY = this.multiLineLastPerpY;
        const originalMultiLineLastPoints = this.multiLineLastPoints;
        const originalMultiLinePendingPoint = this.multiLinePendingPoint;

        this.ctx = this.livePreviewCtx;
        this.accumulatedDistance = 0;
        this.multiLineLastPerpX = 0;
        this.multiLineLastPerpY = 0;
        this.multiLineLastPoints = null;
        this.multiLinePendingPoint = null;

        this.setupDrawingContext();
        this.drawStrokePathPreview();

        this.ctx = originalCtx;
        this.accumulatedDistance = originalAccumulatedDistance;
        this.multiLineLastPerpX = originalMultiLineLastPerpX;
        this.multiLineLastPerpY = originalMultiLineLastPerpY;
        this.multiLineLastPoints = originalMultiLineLastPoints;
        this.multiLinePendingPoint = originalMultiLinePendingPoint;
    }

    renderLiveEraserPreview() {
        if (!this.shouldUseLiveEraserPreview() || !this.points.length) {
            this.hideLiveEraserPreview();
            return;
        }

        const svg = this.ensureVectorSceneSvg();
        if (!svg) {
            this.hideLiveEraserPreview();
            return;
        }

        const root = svg.querySelector('[data-vector-scene-root="true"]');
        if (!root) {
            this.hideLiveEraserPreview();
            return;
        }

        const defs = this.ensureVectorSceneDefs(svg);
        if (!defs) {
            this.hideLiveEraserPreview();
            return;
        }

        const canvasBounds = this.getCanvasLogicalBounds();
        const padding = Math.max(64, this.getCanvasEraserSize());
        const x = this.formatSvgNumber(canvasBounds.x - padding);
        const y = this.formatSvgNumber(canvasBounds.y - padding);
        const width = this.formatSvgNumber(canvasBounds.width + padding * 2);
        const height = this.formatSvgNumber(canvasBounds.height + padding * 2);
        const maskMarkup = this.buildSvgEraserMaskMarkup({
            points: this.points,
            size: this.getCanvasEraserSize(),
            eraserShape: this.eraserShape
        });

        let mask = defs.querySelector(`#${this.liveEraserPreviewMaskId}`);
        if (!mask) {
            mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
            mask.id = this.liveEraserPreviewMaskId;
            mask.setAttribute('maskUnits', 'userSpaceOnUse');
            mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
            defs.appendChild(mask);
        }

        mask.setAttribute('x', String(x));
        mask.setAttribute('y', String(y));
        mask.setAttribute('width', String(width));
        mask.setAttribute('height', String(height));
        mask.innerHTML = `
            <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" />
            ${maskMarkup}
        `;

        root.setAttribute('mask', `url(#${this.liveEraserPreviewMaskId})`);
    }
    
    setPenLineStyle(style) {
        this.penLineStyle = style;
        safeDrawingStorageSetItem('penLineStyle', style);
    }
    
    setPenDashDensity(density) {
        this.penDashDensity = Math.max(1, Math.min(100, density));
        safeDrawingStorageSetItem('penDashDensity', this.penDashDensity);
    }
    
    setPenMultiLineCount(count) {
        this.penMultiLineCount = Math.max(2, Math.min(10, count));
        safeDrawingStorageSetItem('penMultiLineCount', this.penMultiLineCount);
    }
    
    setPenMultiLineSpacing(spacing) {
        this.penMultiLineSpacing = Math.max(5, Math.min(50, spacing));
        safeDrawingStorageSetItem('penMultiLineSpacing', this.penMultiLineSpacing);
    }

    getLineStyleDashPattern(lineStyle = 'solid', dashDensity = 10, strokeSize = this.penSize) {
        if (lineStyle === 'dashed') {
            const spacing = Math.max(2, 400 / Math.max(1, dashDensity));
            return [spacing, spacing * 0.6];
        }
        if (lineStyle === 'dotted') {
            const spacing = Math.max(2, 400 / Math.max(1, dashDensity));
            return [Math.max(1, strokeSize * 0.1), spacing * 0.6 + strokeSize];
        }
        return [];
    }

    applyStoredStrokeLineStyle(stroke) {
        const dashPattern = this.getLineStyleDashPattern(
            stroke?.lineStyle || 'solid',
            stroke?.dashDensity || 10,
            stroke?.size || this.penSize
        );
        this.ctx.setLineDash(dashPattern);
        this.ctx.lineDashOffset = 0;
    }

    getNextObjectId() {
        return `obj-${this.objectIdCounter++}`;
    }

    getNextGroupId() {
        return `group-${this.groupCounter++}`;
    }

    parseCounterValue(value, prefix) {
        if (typeof value !== 'string' || !value.startsWith(prefix)) return 0;
        const numeric = parseInt(value.slice(prefix.length), 10);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    ensureObjectId(item) {
        if (!item) return null;
        if (!item.objectId) {
            item.objectId = this.getNextObjectId();
        } else {
            this.objectIdCounter = Math.max(
                this.objectIdCounter,
                this.parseCounterValue(item.objectId, 'obj-') + 1
            );
        }
        if (typeof item.groupId === 'undefined') {
            item.groupId = null;
        }
        return item.objectId;
    }

    ensureGroup(group) {
        if (!group) return null;
        if (!group.id) {
            group.id = this.getNextGroupId();
        } else {
            this.groupCounter = Math.max(
                this.groupCounter,
                this.parseCounterValue(group.id, 'group-') + 1
            );
        }
        if (!Array.isArray(group.memberIds)) {
            group.memberIds = [];
        }
        if (!Number.isFinite(group.layerOrder)) {
            group.layerOrder = this.getNextLayerOrder();
        } else {
            this.layerCounter = Math.max(this.layerCounter, group.layerOrder + 1);
        }
        return group;
    }

    getGroupById(groupId) {
        if (!groupId) return null;
        return this.objectGroups.find(group => group?.id === groupId) || null;
    }

    getObjectRefById(objectId, textObjects = []) {
        if (!objectId) return null;
        const collections = [
            { type: 'stroke', items: this.strokes },
            { type: 'image', items: this.stampedImages },
            { type: 'text', items: textObjects || [] }
        ];
        for (const collection of collections) {
            for (let index = 0; index < collection.items.length; index++) {
                const item = collection.items[index];
                if (!item) continue;
                this.ensureObjectId(item);
                if (item.objectId === objectId) {
                    return {
                        type: collection.type,
                        index,
                        item,
                        objectId
                    };
                }
            }
        }
        return null;
    }

    getGroupMembers(groupOrId, textObjects = []) {
        const group = typeof groupOrId === 'string'
            ? this.getGroupById(groupOrId)
            : groupOrId;
        if (!group) return [];
        return (group.memberIds || [])
            .map(objectId => this.getObjectRefById(objectId, textObjects))
            .filter(Boolean)
            .sort((a, b) => {
                const layerDiff = (a.item.layerOrder || 0) - (b.item.layerOrder || 0);
                if (layerDiff !== 0) return layerDiff;
                return a.index - b.index;
            });
    }

    removeObjectFromGroups(objectId) {
        if (!objectId) return;
        this.objectGroups = this.objectGroups
            .map(group => {
                if (!group?.memberIds?.includes(objectId)) return group;
                group.memberIds = group.memberIds.filter(id => id !== objectId);
                return group;
            })
            .filter(group => group?.memberIds?.length >= 2);
    }

    cleanupGroups(textObjects = []) {
        const validObjectIds = new Set();
        [this.strokes, this.stampedImages, textObjects || []].forEach(collection => {
            collection.forEach(item => {
                if (!item) return;
                validObjectIds.add(this.ensureObjectId(item));
            });
        });

        this.objectGroups = this.objectGroups
            .map(group => {
                this.ensureGroup(group);
                group.memberIds = [...new Set((group.memberIds || []).filter(id => validObjectIds.has(id)))];
                return group;
            })
            .filter(group => group.memberIds.length >= 2);

        const validGroupIds = new Set(this.objectGroups.map(group => group.id));
        [this.strokes, this.stampedImages, textObjects || []].forEach(collection => {
            collection.forEach(item => {
                if (!item) return;
                this.ensureObjectId(item);
                if (item.groupId && !validGroupIds.has(item.groupId)) {
                    item.groupId = null;
                }
            });
        });
    }

    getCanvasLogicalBounds() {
        const logicalWidth = this.canvas.clientWidth ||
            this.canvas.offsetWidth ||
            parseFloat(this.canvas.style.width) ||
            this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.clientHeight ||
            this.canvas.offsetHeight ||
            parseFloat(this.canvas.style.height) ||
            this.canvas.height / (window.devicePixelRatio || 1);
        return {
            x: 0,
            y: 0,
            width: logicalWidth,
            height: logicalHeight
        };
    }

    rectsIntersect(a, b) {
        if (!a || !b) return false;
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    }

    getBoundsFromPoints(points) {
        if (!points?.length) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        points.forEach(point => {
            if (!point) return;
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        if (!Number.isFinite(minX)) return null;
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    rotatePoint(point, centerX, centerY, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const relX = point.x - centerX;
        const relY = point.y - centerY;
        return {
            x: centerX + relX * cos - relY * sin,
            y: centerY + relX * sin + relY * cos
        };
    }

    getImageCornerPoints(img) {
        if (!img) return [];
        const points = [
            { x: img.x, y: img.y },
            { x: img.x + img.width, y: img.y },
            { x: img.x + img.width, y: img.y + img.height },
            { x: img.x, y: img.y + img.height }
        ];
        const rotation = img.rotation || 0;
        if (!rotation) return points;
        const centerX = img.x + img.width / 2;
        const centerY = img.y + img.height / 2;
        return points.map(point => this.rotatePoint(point, centerX, centerY, rotation));
    }

    getImageVisualBounds(img) {
        return this.getBoundsFromPoints(this.getImageCornerPoints(img));
    }

    getTopLevelRenderableBounds(renderable, textObjects = []) {
        if (!renderable) return null;
        if (renderable.type === 'group') {
            const points = [];
            renderable.members?.forEach(member => {
                if (member.type === 'stroke') {
                    const bounds = this.getStrokeBounds(member.item);
                    if (bounds) {
                        points.push(
                            { x: bounds.x, y: bounds.y },
                            { x: bounds.x + bounds.width, y: bounds.y },
                            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                            { x: bounds.x, y: bounds.y + bounds.height }
                        );
                    }
                } else if (member.type === 'image') {
                    points.push(...this.getImageCornerPoints(member.item));
                } else if (member.type === 'text') {
                    const item = member.item;
                    const bounds = {
                        x: item.x,
                        y: item.y,
                        width: item.width || 0,
                        height: item.height || 0
                    };
                    points.push(
                        { x: bounds.x, y: bounds.y },
                        { x: bounds.x + bounds.width, y: bounds.y },
                        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                        { x: bounds.x, y: bounds.y + bounds.height }
                    );
                }
            });
            return this.getBoundsFromPoints(points);
        }
        if (renderable.type === 'stroke') {
            return this.getStrokeBounds(renderable.item);
        }
        if (renderable.type === 'image') {
            return this.getImageVisualBounds(renderable.item);
        }
        if (renderable.type === 'text') {
            return {
                x: renderable.item.x,
                y: renderable.item.y,
                width: renderable.item.width || 0,
                height: renderable.item.height || 0
            };
        }
        return null;
    }

    getMaxLayerOrder(textObjects = [], includeGroups = true) {
        let maxLayerOrder = 0;
        [this.strokes, this.stampedImages, textObjects || []].forEach(collection => {
            collection.forEach(item => {
                if (Number.isFinite(item?.layerOrder)) {
                    maxLayerOrder = Math.max(maxLayerOrder, item.layerOrder);
                }
            });
        });
        if (includeGroups) {
            this.objectGroups.forEach(group => {
                if (Number.isFinite(group?.layerOrder)) {
                    maxLayerOrder = Math.max(maxLayerOrder, group.layerOrder);
                }
            });
        }
        return maxLayerOrder;
    }

    ensureOffCanvasImageLayer() {
        if (this.offCanvasImageLayer && document.body.contains(this.offCanvasImageLayer)) {
            return this.offCanvasImageLayer;
        }
        const transformLayer = document.getElementById('transform-layer');
        if (!transformLayer) return null;
        let layer = document.getElementById('off-canvas-image-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'off-canvas-image-layer';
            layer.style.position = 'absolute';
            layer.style.inset = '0';
            layer.style.pointerEvents = 'none';
            layer.style.zIndex = '2';
            transformLayer.appendChild(layer);
        }
        this.offCanvasImageLayer = layer;
        return layer;
    }

    findOffCanvasImageMirror(layer, objectId) {
        if (!layer?.querySelectorAll || objectId === null || typeof objectId === 'undefined') {
            return null;
        }

        const targetId = String(objectId);
        return Array.from(layer.querySelectorAll('[data-object-id]'))
            .find(node => node?.dataset?.objectId === targetId) || null;
    }

    updateOffCanvasImageMirrors(textObjects = []) {
        const layer = this.ensureOffCanvasImageLayer();
        if (!layer) return;

        const canvasBounds = this.getCanvasLogicalBounds();
        const usedIds = new Set();

        this.stampedImages.forEach(img => {
            if (!img?.imageElement) return;
            this.ensureObjectId(img);
            const bounds = this.getImageVisualBounds(img);
            const isOutsideCanvas = !!bounds && !this.rectsIntersect(bounds, canvasBounds);
            img.wasOutsideCanvas = !!img.wasOutsideCanvas;

            if (!isOutsideCanvas) {
                img.wasOutsideCanvas = false;
                return;
            }

            if (!img.wasOutsideCanvas) {
                img.layerOrder = this.getMaxLayerOrder(textObjects, true) + 1;
            }
            img.wasOutsideCanvas = true;

            const mirrorObjectId = String(img.objectId);
            usedIds.add(mirrorObjectId);
            let mirror = this.findOffCanvasImageMirror(layer, mirrorObjectId);
            if (!mirror) {
                mirror = document.createElement('img');
                mirror.dataset.objectId = mirrorObjectId;
                mirror.style.position = 'absolute';
                mirror.style.transformOrigin = 'center center';
                mirror.style.pointerEvents = 'auto';
                mirror.style.userSelect = 'none';
                mirror.draggable = false;
                const handleMirrorSelect = (event) => {
                    event.stopPropagation();
                    window.drawingBoard?.setTool?.('select');
                    window.drawingBoard?.selectionManager?.selectObjectById?.(img.objectId);
                };
                mirror.addEventListener('mousedown', handleMirrorSelect);
                mirror.addEventListener('pointerdown', handleMirrorSelect);
                layer.appendChild(mirror);
            }

            const topLevelOrder = img.groupId
                ? (this.getGroupById(img.groupId)?.layerOrder || img.layerOrder || 1)
                : (img.layerOrder || 1);
            const scaleX = img.flipHorizontal ? -1 : 1;
            const scaleY = img.flipVertical ? -1 : 1;

            mirror.src = img.imageSrc || img.imageElement.src;
            mirror.style.left = `${img.x}px`;
            mirror.style.top = `${img.y}px`;
            mirror.style.width = `${img.width}px`;
            mirror.style.height = `${img.height}px`;
            mirror.style.zIndex = String(1000 + topLevelOrder);
            mirror.style.transform = `rotate(${img.rotation || 0}deg) scale(${scaleX}, ${scaleY})`;
        });

        Array.from(layer.querySelectorAll('[data-object-id]')).forEach(node => {
            if (!usedIds.has(node.dataset.objectId)) {
                node.remove();
            }
        });
    }

    ensureVectorSceneSvg() {
        if (this.vectorSceneSvg && document.body.contains(this.vectorSceneSvg)) {
            return this.vectorSceneSvg;
        }

        const transformLayer = document.getElementById('transform-layer');
        if (!transformLayer) return null;

        let svg = document.getElementById('vector-scene-svg');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'vector-scene-svg';
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('overflow', 'visible');
            svg.setAttribute('shape-rendering', 'geometricPrecision');
            svg.setAttribute('text-rendering', 'geometricPrecision');
            svg.setAttribute('vector-effect', 'non-scaling-stroke');
            transformLayer.insertBefore(svg, this.canvas);
        }

        this.vectorSceneSvg = svg;
        this.syncVectorSceneSvgSize();
        return svg;
    }

    syncVectorSceneSvgSize() {
        const svg = this.ensureVectorSceneSvg();
        if (!svg) return null;

        const canvasBounds = this.getCanvasLogicalBounds();
        const logicalWidth = canvasBounds.width;
        const logicalHeight = canvasBounds.height;

        svg.style.width = `${logicalWidth}px`;
        svg.style.height = `${logicalHeight}px`;
        svg.setAttribute('width', String(logicalWidth));
        svg.setAttribute('height', String(logicalHeight));
        svg.setAttribute('viewBox', `0 0 ${logicalWidth} ${logicalHeight}`);

        return { svg, logicalWidth, logicalHeight };
    }

    hasComplexShapeStroke() {
        // Stored shapes whose line style has no SVG equivalent (see
        // buildSvgShapeMarkup) must fall back to bitmap rendering.
        const complexShapeLineStyles = ['wavy', 'double', 'triple', 'multi', 'arrow', 'doubleArrow'];
        return this.strokes.some(stroke => {
            if (!stroke || stroke.renderMode !== 'shape') return false;
            // Arrow shapes have dedicated SVG markup support.
            if (stroke.shapeType === 'arrow' || stroke.shapeType === 'doubleArrow') return false;
            return complexShapeLineStyles.includes(stroke.shapeLineStyle || stroke.lineStyle || 'solid');
        });
    }

    setVectorPreviewVisible(visible) {
        this.vectorPreviewEnabled = !!visible && !this.hasComplexShapeStroke();
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('vector-preview-active', this.vectorPreviewEnabled);
        }
    }

    clearVectorScene() {
        const svg = this.ensureVectorSceneSvg();
        if (!svg) return;
        svg.innerHTML = '';
    }

    escapeSvgText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    escapeSvgAttribute(value) {
        return this.escapeSvgText(value)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatSvgNumber(value) {
        return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
    }

    getRectangleEraserSamplePoints(points = [], size = 1) {
        if (!Array.isArray(points) || !points.length) return [];

        const sampledPoints = [{ x: points[0].x, y: points[0].y }];
        const step = Math.max(1, size * 0.22);

        for (let i = 1; i < points.length; i++) {
            const startPoint = points[i - 1];
            const endPoint = points[i];
            if (!startPoint || !endPoint) continue;

            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) {
                sampledPoints.push({ x: endPoint.x, y: endPoint.y });
                continue;
            }

            const steps = Math.max(1, Math.ceil(distance / step));
            for (let stepIndex = 1; stepIndex <= steps; stepIndex++) {
                const t = stepIndex / steps;
                sampledPoints.push({
                    x: startPoint.x + dx * t,
                    y: startPoint.y + dy * t
                });
            }
        }

        return sampledPoints;
    }

    buildSvgRectangleEraserMaskPath(points = [], size = 1) {
        const sampledPoints = this.getRectangleEraserSamplePoints(points, size);
        if (!sampledPoints.length) return '';

        const half = size / 2;
        return sampledPoints.map((point) => {
            const left = this.formatSvgNumber(point.x - half);
            const top = this.formatSvgNumber(point.y - half);
            const right = this.formatSvgNumber(point.x + half);
            const bottom = this.formatSvgNumber(point.y + half);
            return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
        }).join(' ');
    }

    ensureVectorSceneDefs(svg) {
        if (!svg) return null;
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }
        return defs;
    }

    buildSvgPathFromPoints(points = []) {
        if (!Array.isArray(points) || points.length === 0) return '';
        if (points.length === 1) {
            const point = points[0];
            return `M ${point.x} ${point.y}`;
        }

        return points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');
    }

    getSvgStrokeAppearance(stroke) {
        const appearance = {
            lineWidth: stroke?.size || this.penSize,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '',
            extraMarkup: ''
        };

        if (!stroke || stroke.tool === 'eraser') {
            return appearance;
        }

        this.applyStoredStrokeLineStyle?.(stroke);
        const dashPattern = this.getLineStyleDashPattern(
            stroke.lineStyle || 'solid',
            stroke.dashDensity || 10,
            stroke.size || this.penSize
        );
        appearance.dashArray = dashPattern.length ? dashPattern.join(' ') : '';

        switch (stroke.penType) {
            case 'pencil':
                appearance.opacity = 0.68;
                appearance.lineWidth = (stroke.size || this.penSize) * 0.92;
                break;
            case 'ballpoint':
                appearance.opacity = 0.92;
                appearance.lineWidth = (stroke.size || this.penSize) * 0.95;
                break;
            case 'fountain':
                appearance.opacity = 1;
                appearance.lineWidth = (stroke.size || this.penSize) * 1.2;
                break;
            case 'brush':
                appearance.opacity = 0.78;
                appearance.lineWidth = (stroke.size || this.penSize) * 1.65;
                break;
            case 'marker':
                appearance.opacity = 0.45;
                appearance.lineWidth = (stroke.size || this.penSize) * 2.2;
                appearance.lineCap = 'square';
                break;
            default:
                break;
        }

        return appearance;
    }

    flattenRenderableObjects(textObjects = []) {
        const renderables = this.getRenderableObjects(textObjects);
        const flattened = [];

        renderables.forEach(renderable => {
            if (renderable.type === 'group') {
                renderable.members.forEach(member => flattened.push(member));
            } else {
                flattened.push(renderable);
            }
        });

        return flattened;
    }

    getRenderSceneBounds(flattenedRenderables = [], textObjects = []) {
        const canvasBounds = this.getCanvasLogicalBounds();
        let minX = canvasBounds.x;
        let minY = canvasBounds.y;
        let maxX = canvasBounds.x + canvasBounds.width;
        let maxY = canvasBounds.y + canvasBounds.height;

        flattenedRenderables.forEach(renderable => {
            const bounds = this.getTopLevelRenderableBounds(renderable, textObjects);
            if (!bounds) return;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        const padding = 256;
        return {
            x: minX - padding,
            y: minY - padding,
            width: Math.max(canvasBounds.width + padding * 2, (maxX - minX) + padding * 2),
            height: Math.max(canvasBounds.height + padding * 2, (maxY - minY) + padding * 2)
        };
    }

    buildSvgStrokeMarkup(stroke) {
        if (!stroke?.points?.length) return '';

        if (stroke.renderMode === 'shape' && this.shapeDrawingManager?.buildSvgShapeMarkup) {
            return this.shapeDrawingManager.buildSvgShapeMarkup(stroke) || '';
        }

        const appearance = this.getSvgStrokeAppearance(stroke);
        const pathData = this.getStrokePointSegments(stroke)
            .map(segment => this.buildSvgPathFromPoints(segment))
            .filter(Boolean)
            .join(' ');
        const strokeColor = this.escapeSvgAttribute(stroke.color || this.currentColor);
        const dashMarkup = appearance.dashArray ? ` stroke-dasharray="${appearance.dashArray}"` : '';

        if (stroke.lineStyle === 'multi') {
            const markup = this.getMultiLineStrokePaths(stroke).map(points => (
                `<path d="${this.buildSvgPathFromPoints(points)}" fill="none" stroke="${strokeColor}" stroke-width="${appearance.lineWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="${appearance.opacity}" />`
            )).join('');
            return `<g class="stroke-multi-line">${markup}</g>`;
        }

        if (stroke.points.length === 1) {
            const point = stroke.points[0];
            const radius = Math.max(appearance.lineWidth / 2, 0.5);
            return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${strokeColor}" fill-opacity="${appearance.opacity}" />`;
        }

        if (stroke.penType === 'brush') {
            const accentWidth = Math.max(1, appearance.lineWidth * 0.5);
            return `
                <g>
                    <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${appearance.lineWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="${appearance.opacity}"${dashMarkup} />
                    <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${accentWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="0.18" />
                </g>
            `;
        }

        return `<path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${appearance.lineWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="${appearance.opacity}"${dashMarkup} />`;
    }

    buildSvgEraserMaskMarkup(stroke) {
        if (!stroke?.points?.length) return '';

        const eraserShape = stroke.eraserShape || 'circle';
        const eraserSize = Math.max(stroke.size || 1, 1);

        if (eraserShape === 'rectangle') {
            const pathData = this.buildSvgRectangleEraserMaskPath(stroke.points, eraserSize);
            return pathData ? `<path d="${pathData}" fill="black" />` : '';
        }

        if (stroke.points.length === 1) {
            const point = stroke.points[0];
            return `<circle cx="${point.x}" cy="${point.y}" r="${eraserSize / 2}" fill="black" />`;
        }

        const pathData = this.buildSvgPathFromPoints(stroke.points);
        return `<path d="${pathData}" fill="none" stroke="black" stroke-width="${eraserSize}" stroke-linecap="round" stroke-linejoin="round" />`;
    }

    buildSvgImageMarkup(img) {
        if (!img?.imageSrc && !img?.imageElement?.src) return '';

        const href = this.escapeSvgAttribute(img.imageSrc || img.imageElement.src);
        const centerX = img.x + img.width / 2;
        const centerY = img.y + img.height / 2;
        const rotation = img.rotation || 0;
        const scaleX = img.flipHorizontal ? -1 : 1;
        const scaleY = img.flipVertical ? -1 : 1;
        const transformParts = [
            `translate(${centerX} ${centerY})`
        ];

        if (rotation) {
            transformParts.push(`rotate(${rotation})`);
        }
        if (scaleX !== 1 || scaleY !== 1) {
            transformParts.push(`scale(${scaleX} ${scaleY})`);
        }

        return `
            <image
                href="${href}"
                x="${-img.width / 2}"
                y="${-img.height / 2}"
                width="${img.width}"
                height="${img.height}"
                preserveAspectRatio="none"
                transform="${transformParts.join(' ')}"
            />
        `;
    }

    buildSvgTextMarkup(textObj) {
        if (!textObj?.text) return '';

        const padding = 4;
        const fontSize = textObj.fontSize || 48;
        const fontStyle = textObj.italic ? 'italic' : 'normal';
        const fontWeight = textObj.bold ? 'bold' : 'normal';
        const lines = String(textObj.text).split('\n');
        const lineHeight = fontSize * 1.2;
        const color = this.escapeSvgAttribute(textObj.color || '#000000');
        const fontFamily = this.escapeSvgAttribute(textObj.fontFamily || 'sans-serif');

        this.ctx.save();
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        let maxWidth = 0;
        const measuredLines = lines.map((line) => {
            const width = this.ctx.measureText(line).width;
            maxWidth = Math.max(maxWidth, width);
            return { text: line, width };
        });
        this.ctx.restore();

        const totalHeight = measuredLines.length * lineHeight + padding * 2;
        const centerX = textObj.x + (maxWidth + padding * 2) / 2;
        const centerY = textObj.y + totalHeight / 2;
        const rotation = textObj.rotation || 0;

        const textMarkup = measuredLines.map((line, index) => {
            const lineY = textObj.y + padding + (index * lineHeight);
            return `<tspan x="${textObj.x + padding}" y="${lineY}" dominant-baseline="hanging">${this.escapeSvgText(line.text)}</tspan>`;
        }).join('');

        const decorations = [];
        const decorationColor = this.escapeSvgAttribute(textObj.decorationColor || textObj.color || '#000000');
        const decorationWidth = textObj.decorationWidth || Math.max(1, fontSize * 0.05);
        const decorationStyle = textObj.decorationStyle || 'solid';
        const dashArray = decorationStyle === 'dashed'
            ? `${decorationWidth * 4} ${decorationWidth * 2}`
            : decorationStyle === 'dotted'
                ? `${decorationWidth} ${decorationWidth * 2.2}`
                : '';

        measuredLines.forEach((line, index) => {
            if (!line.width) return;
            const baseY = textObj.y + padding + (index * lineHeight);
            if (textObj.underline) {
                decorations.push(this.buildSvgDecorationMarkup(
                    textObj.x + padding,
                    baseY + fontSize * 1.05,
                    line.width,
                    decorationStyle,
                    decorationWidth,
                    decorationColor,
                    dashArray
                ));
            }
            if (textObj.strikethrough) {
                decorations.push(this.buildSvgDecorationMarkup(
                    textObj.x + padding,
                    baseY + fontSize * 0.55,
                    line.width,
                    decorationStyle,
                    decorationWidth,
                    decorationColor,
                    dashArray
                ));
            }
        });

        return `
            <g transform="${rotation ? `rotate(${rotation} ${centerX} ${centerY})` : ''}">
                <text fill="${color}" font-size="${fontSize}" font-family="${fontFamily}" font-style="${fontStyle}" font-weight="${fontWeight}">
                    ${textMarkup}
                </text>
                ${decorations.join('')}
            </g>
        `;
    }

    buildSvgDecorationMarkup(x, y, width, style, lineWidth, color, dashArray = '') {
        if (style === 'wavy') {
            const amplitude = Math.max(1, lineWidth * 1.2);
            const wavelength = Math.max(6, lineWidth * 4);
            const step = Math.max(2, wavelength / 4);
            let path = `M ${x} ${y}`;
            for (let offset = step; offset <= width; offset += step) {
                const waveY = y + Math.sin((offset / wavelength) * Math.PI * 2) * amplitude;
                path += ` L ${x + offset} ${waveY}`;
            }
            return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
        }

        const dashMarkup = dashArray ? ` stroke-dasharray="${dashArray}"` : '';
        return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round"${dashMarkup} />`;
    }

    renderVectorScene(textManager = null) {
        const svgData = this.syncVectorSceneSvgSize();
        if (!svgData) return;

        const { svg, logicalWidth, logicalHeight } = svgData;
        const textObjects = textManager?.textObjects || [];
        const flattenedRenderables = this.flattenRenderableObjects(textObjects);

        if (!flattenedRenderables.length) {
            svg.innerHTML = '';
            return;
        }

        const segments = [{ items: [], erasers: [] }];
        flattenedRenderables.forEach(renderable => {
            if (renderable.type === 'stroke' && renderable.item?.tool === 'eraser') {
                segments.forEach(segment => segment.erasers.push(renderable.item));
                segments.push({ items: [], erasers: [] });
                return;
            }

            segments[segments.length - 1].items.push(renderable);
        });

        const sceneBounds = this.getRenderSceneBounds(flattenedRenderables, textObjects);
        const defs = [];
        const content = [];

        segments.forEach((segment, index) => {
            if (!segment.items.length) return;

            const segmentMarkup = segment.items.map(renderable => {
                if (renderable.type === 'stroke') {
                    return this.buildSvgStrokeMarkup(renderable.item);
                }
                if (renderable.type === 'image') {
                    return this.buildSvgImageMarkup(renderable.item);
                }
                if (renderable.type === 'text') {
                    return this.buildSvgTextMarkup(renderable.item);
                }
                return '';
            }).join('');

            if (!segmentMarkup.trim()) return;

            if (segment.erasers.length) {
                const maskId = `vector-scene-mask-${++this.vectorSceneMaskCounter}-${index}`;
                const maskMarkup = segment.erasers
                    .map(stroke => this.buildSvgEraserMaskMarkup(stroke))
                    .join('');
                defs.push(`
                    <mask id="${maskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${sceneBounds.x}" y="${sceneBounds.y}" width="${sceneBounds.width}" height="${sceneBounds.height}">
                        <rect x="${sceneBounds.x}" y="${sceneBounds.y}" width="${sceneBounds.width}" height="${sceneBounds.height}" fill="white" />
                        ${maskMarkup}
                    </mask>
                `);
                content.push(`<g mask="url(#${maskId})">${segmentMarkup}</g>`);
            } else {
                content.push(`<g>${segmentMarkup}</g>`);
            }
        });

        svg.innerHTML = `
            <defs>${defs.join('')}</defs>
            <g id="vector-scene-root" data-vector-scene-root="true" transform="">
                ${content.join('')}
            </g>
        `;

        svg.setAttribute('overflow', 'visible');
        svg.setAttribute('viewBox', `0 0 ${logicalWidth} ${logicalHeight}`);

        if (this.shouldUseLiveEraserPreview()) {
            this.renderLiveEraserPreview();
        } else {
            this.clearLiveEraserPreview();
        }
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Adjust for canvas scale (CSS transform)
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        // Calculate position relative to canvas
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;
        
        // Clamp to canvas bounds to prevent drawing outside
        x = Math.max(0, Math.min(x, this.canvas.offsetWidth));
        y = Math.max(0, Math.min(y, this.canvas.offsetHeight));
        
        return { x, y };
    }

    getViewportScale() {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !this.canvas.offsetWidth) {
            return Math.max(0.01, this.canvasScale || 1);
        }

        return Math.max(0.01, rect.width / this.canvas.offsetWidth);
    }
    
    applyLineStyle() {
        if (this.penLineStyle === 'dashed') {
            const spacing = Math.max(2, 400 / Math.max(1, this.penDashDensity));
            const dashLen = spacing;
            const gapLen = spacing * 0.6;
            this.ctx.setLineDash([dashLen, gapLen]);
            // Positive offset continues the pattern from the distance already
            // drawn; a negative value breaks the pattern at segment seams.
            this.ctx.lineDashOffset = this.accumulatedDistance;
        } else if (this.penLineStyle === 'dotted') {
            const spacing = Math.max(2, 400 / Math.max(1, this.penDashDensity));
            const dotLen = this.penSize * 0.1; // Almost circular dots (with round caps)
            const gapLen = spacing * 0.6 + this.penSize; // Gap needs to account for cap width
            this.ctx.setLineDash([dotLen, gapLen]);
            this.ctx.lineDashOffset = this.accumulatedDistance;
        } else {
            this.ctx.setLineDash([]);
        }
    }
    
    setupDrawingContext() {
        if (this.currentTool === 'pen') {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.penSize;
            
            switch(this.penType) {
                case 'pencil':
                    this.ctx.globalAlpha = 0.7;
                    break;
                case 'ballpoint':
                    this.ctx.globalAlpha = 0.9;
                    break;
                case 'fountain':
                    this.ctx.globalAlpha = 1.0;
                    break;
                case 'brush':
                    this.ctx.globalAlpha = 0.85;
                    this.ctx.lineWidth = this.penSize * 1.5;
                    break;
                case 'marker':
                    this.ctx.globalAlpha = 0.45;
                    this.ctx.lineWidth = this.penSize * 2.2;
                    break;
                case 'normal':
                default:
                    this.ctx.globalAlpha = 1.0;
                    break;
            }
            
            // Apply line style
            this.applyLineStyle();
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            this.ctx.fillStyle = 'rgba(0,0,0,1)';
            // Always match the visible dashed eraser cursor size (WYSIWYG).
            // Use real-time viewport scale from DOM geometry instead of cached canvasScale.
            this.ctx.lineWidth = this.getCanvasEraserSize();
            this.ctx.globalAlpha = 1.0;
            this.ctx.setLineDash([]); // Always solid for eraser
            
            // Set line cap/join based on eraser shape
            if (this.eraserShape === 'rectangle') {
                this.ctx.lineCap = 'butt';
                this.ctx.lineJoin = 'miter';
            } else {
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            }
        }
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        window.drawingBoard?.syncVectorPreviewState?.();
        let pos = this.getPosition(e);
        
        // Reset accumulated distance for dashed line drawing
        this.accumulatedDistance = 0;
        this.isInDash = true;
        
        // Reset multi-line tracking
        this.multiLineLastPerpX = 0;
        this.multiLineLastPerpY = 0;
        this.multiLineLastPoints = null;
        this.multiLinePendingPoint = null;
        this.strokeBreakIndices = [];
        this.pendingStrokeBreak = false;
        
        // Check for edge snapping when pen tool is active
        if (this.currentTool === 'pen' && this.edgeDrawingManager) {
            const processed = this.edgeDrawingManager.processDrawingPoint(pos.x, pos.y);
            if (processed.blocked) {
                // Point is inside a tool, don't draw
                this.isDrawing = false;
                return;
            }
            if (processed.snapped) {
                pos = { x: processed.x, y: processed.y };
                this.isSnappedToEdge = true;
            } else {
                this.isSnappedToEdge = false;
            }
        }
        
        this.points = [pos];
        this.lastPoint = pos;
        
        this.setupDrawingContext();
        
        if (this.currentTool === 'eraser' && this.eraserShape === 'rectangle') {
            this.eraseRectangleAtPoint(pos);
        } else if (this.currentTool === 'pen' && (this.penLineStyle === 'dotted' || this.penLineStyle === 'dashed')) {
            // For dashed/dotted lines, draw initial dot
            this.ctx.fillStyle = this.currentColor;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, this.penSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }

        this.renderActiveToolPreview();
    }
    
    draw(e) {
        this.drawBatch([e]);
    }

    drawBatch(events) {
        if (!this.isDrawing || !events || events.length === 0) return;
        
        const validPoints = [];
        
        // Pre-process events to get valid points
        for (const e of events) {
            let pos = this.getPosition(e);

            // Check for edge snapping when pen tool is active
            if (this.currentTool === 'pen' && this.edgeDrawingManager) {
                const processed = this.edgeDrawingManager.processDrawingPoint(pos.x, pos.y);
                if (processed.blocked) {
                    if (this.points.length > 0) {
                        this.pendingStrokeBreak = true;
                        this.lastPoint = null;
                    }
                    continue;
                }
                if (processed.snapped) {
                    pos = { x: processed.x, y: processed.y };
                    this.isSnappedToEdge = true;
                } else {
                    this.isSnappedToEdge = false;
                }
            }

            const minPointDistance = this.penLineStyle === 'multi' ? this.MULTI_LINE_POINT_DISTANCE : 0.5;
            if (this.lastPoint &&
                Math.abs(pos.x - this.lastPoint.x) < minPointDistance &&
                Math.abs(pos.y - this.lastPoint.y) < minPointDistance) {
                continue;
            }

            if (this.pendingStrokeBreak && this.points.length > 0) {
                this.strokeBreakIndices.push(this.points.length);
            }
            this.pendingStrokeBreak = false;
            this.points.push(pos);
            validPoints.push(pos);
            this.lastPoint = pos;
        }
        
        if (validPoints.length === 0) return;

        if (this.currentTool === 'eraser' && this.eraserShape === 'rectangle') {
            const startIndex = this.points.length - validPoints.length;
            for (let i = 0; i < validPoints.length; i++) {
                const currIndex = startIndex + i;
                if (currIndex === 0) continue;
                this.eraseRectangleSegment(this.points[currIndex - 1], this.points[currIndex]);
            }
            this.scheduleActiveToolPreview();
            return;
        }
        
        // Apply line style before drawing
        if (this.currentTool === 'pen') {
            this.applyLineStyle();
        }
        
        // Check if we can use batch drawing (Normal pen)
        // Complex brush/line-style handling only applies to the pen tool;
        // the eraser must always take the plain batch path (full width, opaque).
        const complexBrushes = ['pencil', 'brush', 'fountain', 'ballpoint', 'marker'];
        const isComplex = this.currentTool === 'pen' &&
            (complexBrushes.includes(this.penType) || this.penLineStyle === 'multi');

        if (!isComplex) {
            // Optimized batch drawing for Normal pen
            // Single path operation for multiple segments
            this.ctx.beginPath();
            
            // Start from the point before the first valid point
            const startIndex = this.points.length - validPoints.length;
            // Safe check for index
            const startPoint = (startIndex > 0) ? this.points[startIndex - 1] : validPoints[0];
            
            this.ctx.moveTo(startPoint.x, startPoint.y);

            let prevPoint = startPoint;
            const breakIndices = new Set(this.strokeBreakIndices);
            for (let i = 0; i < validPoints.length; i++) {
                const p = validPoints[i];
                const pointIndex = startIndex + i;
                if (breakIndices.has(pointIndex)) {
                    this.ctx.moveTo(p.x, p.y);
                    prevPoint = p;
                    continue;
                }
                this.ctx.lineTo(p.x, p.y);

                // Accumulate stroke length so dashed/dotted phase stays
                // continuous across batches (applyLineStyle uses it as lineDashOffset)
                const dx = p.x - prevPoint.x;
                const dy = p.y - prevPoint.y;
                this.accumulatedDistance += Math.sqrt(dx * dx + dy * dy);
                prevPoint = p;
            }
            
            this.ctx.stroke();
        } else {
            // Fallback for complex brushes: draw segment by segment
            const startIndex = this.points.length - validPoints.length;

            for (let i = 0; i < validPoints.length; i++) {
                const currIndex = startIndex + i;
                // Need previous point
                if (currIndex === 0 || this.strokeBreakIndices.includes(currIndex)) continue;

                const prevPoint = this.points[currIndex - 1];
                const currPoint = this.points[currIndex];

                const dx = currPoint.x - prevPoint.x;
                const dy = currPoint.y - prevPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                this.accumulatedDistance += distance;

                if (this.penLineStyle === 'multi') {
                    this.drawMultiLine(prevPoint, currPoint);
                } else if (this.penType === 'ballpoint') {
                    this.drawBallpointStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'brush') {
                    this.drawBrushStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'pencil') {
                    this.drawPencilStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'fountain') {
                    this.drawFountainStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'marker') {
                    this.drawMarkerStroke(prevPoint, currPoint, distance);
                }
            }
        }

        this.scheduleActiveToolPreview();
    }
    
    /**
     * Draw a ballpoint pen stroke
     */
    drawBallpointStroke(prevPoint, currPoint, distance) {
        this.ctx.save();
        const minWidth = this.penSize * 0.7;
        const maxWidth = this.penSize * 1.2;
        const speedFactor = Math.min(distance / 8, 1);
        const lineWidth = maxWidth - (speedFactor * (maxWidth - minWidth));
        this.ctx.lineWidth = lineWidth;
        this.ctx.globalAlpha = 0.95;

        this.ctx.beginPath();
        this.ctx.moveTo(prevPoint.x, prevPoint.y);
        this.ctx.lineTo(currPoint.x, currPoint.y);
        this.ctx.stroke();
        this.ctx.restore();
        this.setupDrawingContext();
    }

    /**
     * Draw multiple parallel lines for multi-line style
     * Uses smoothed perpendiculars to avoid discontinuities at corners
     * @param {Object} prevPoint - Previous point with x, y coordinates
     * @param {Object} currPoint - Current point with x, y coordinates
     */
    drawMultiLine(prevPoint, currPoint) {
        const count = this.penMultiLineCount;
        const spacing = this.penMultiLineSpacing;
        
        // Calculate current perpendicular direction
        const dx = currPoint.x - prevPoint.x;
        const dy = currPoint.y - prevPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Skip drawing if points are too close (causes unstable perpendiculars)
        // Minimum distance threshold to prevent dots and artifacts when drawing slowly
        if (length < this.MULTI_LINE_MIN_DISTANCE) {
            if (!this.multiLinePendingPoint) {
                this.multiLinePendingPoint = currPoint;
                return;
            }
            const pendingDx = currPoint.x - this.multiLinePendingPoint.x;
            const pendingDy = currPoint.y - this.multiLinePendingPoint.y;
            const pendingLength = Math.sqrt(pendingDx * pendingDx + pendingDy * pendingDy);
            if (pendingLength < this.MULTI_LINE_MIN_DISTANCE) {
                return;
            }
        }
        
        // If we had a pending point, use it as the actual previous point
        const actualPrevPoint = this.multiLinePendingPoint || prevPoint;
        this.multiLinePendingPoint = null;
        
        // Recalculate with actual previous point
        const actualDx = currPoint.x - actualPrevPoint.x;
        const actualDy = currPoint.y - actualPrevPoint.y;
        const actualLength = Math.sqrt(actualDx * actualDx + actualDy * actualDy);
        
        if (actualLength < 0.001) return; // Use small epsilon instead of strict zero check
        
        // Perpendicular unit vector for current segment
        let currentPerpX = -actualDy / actualLength;
        let currentPerpY = actualDx / actualLength;
        
        // For the starting perpendicular, use the previous one if available
        // This ensures smooth connections at corners
        let startPerpX = currentPerpX;
        let startPerpY = currentPerpY;
        
        if (this.multiLineLastPerpX !== 0 || this.multiLineLastPerpY !== 0) {
            // Use the previous perpendicular for starting points
            startPerpX = this.multiLineLastPerpX;
            startPerpY = this.multiLineLastPerpY;
        }
        
        // For the ending perpendicular, blend with current for smooth transition
        // Use adaptive blend factor based on segment length
        // Longer segments = more weight on current perpendicular
        let endPerpX = currentPerpX;
        let endPerpY = currentPerpY;
        
        if (this.multiLineLastPerpX !== 0 || this.multiLineLastPerpY !== 0) {
            // Adaptive blend factor: more blending for longer segments
            const blendFactor = Math.min(
                this.MULTI_LINE_BLEND_MAX,
                this.MULTI_LINE_BLEND_MIN + actualLength / this.MULTI_LINE_BLEND_SCALE
            );
            endPerpX = currentPerpX * blendFactor + this.multiLineLastPerpX * (1 - blendFactor);
            endPerpY = currentPerpY * blendFactor + this.multiLineLastPerpY * (1 - blendFactor);
            
            // Normalize after blending
            const perpLen = Math.sqrt(endPerpX * endPerpX + endPerpY * endPerpY);
            if (perpLen > 0) {
                endPerpX /= perpLen;
                endPerpY /= perpLen;
            }
        }
        
        // Total width of multi-line
        const totalWidth = (count - 1) * spacing;
        const startOffset = -totalWidth / 2;
        
        // Calculate current offset points using the end perpendicular
        
        // Calculate current offset points using the end perpendicular
        const currentPoints = [];
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            currentPoints.push({
                x: currPoint.x + endPerpX * offset,
                y: currPoint.y + endPerpY * offset
            });
        }
        
        // Draw each line, connecting to previous points if available
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            
            this.ctx.beginPath();
            
            if (this.multiLineLastPoints && this.multiLineLastPoints[i]) {
                // Connect from previous point for smooth lines
                this.ctx.moveTo(this.multiLineLastPoints[i].x, this.multiLineLastPoints[i].y);
            } else {
                // First segment - use start perpendicular for consistency
                this.ctx.moveTo(actualPrevPoint.x + startPerpX * offset, actualPrevPoint.y + startPerpY * offset);
            }
            
            this.ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
            this.ctx.stroke();
        }
        
        // Store current perpendicular and points for next segment
        // Use the blended end perpendicular for smoother transitions
        this.multiLineLastPerpX = endPerpX;
        this.multiLineLastPerpY = endPerpY;
        this.multiLineLastPoints = currentPoints;
    }
    
    /**
     * Draw a pencil stroke with grainy texture
     */
    drawPencilStroke(prevPoint, currPoint, distance) {
        const dx = currPoint.x - prevPoint.x;
        const dy = currPoint.y - prevPoint.y;
        const angle = Math.atan2(dy, dx);
        
        // Base stroke
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        this.ctx.lineWidth = this.penSize * 0.9;
        this.ctx.beginPath();
        this.ctx.moveTo(prevPoint.x, prevPoint.y);
        this.ctx.lineTo(currPoint.x, currPoint.y);
        this.ctx.stroke();
        
        // Add grainy texture effect with thin secondary strokes
        // Use a hash-based pseudo-random to avoid patterns
        const numGrainStrokes = 2;
        for (let i = 0; i < numGrainStrokes; i++) {
            // Simple hash function for better distribution
            const hash = Math.sin(prevPoint.x * 12.9898 + currPoint.y * 78.233 + i * 43758.5453) * 43758.5453;
            const seed = hash - Math.floor(hash);
            const offset = (seed - 0.5) * this.penSize * 0.3;
            const perpX = Math.cos(angle + Math.PI / 2) * offset;
            const perpY = Math.sin(angle + Math.PI / 2) * offset;
            
            this.ctx.globalAlpha = 0.3 + seed * 0.2;
            this.ctx.lineWidth = this.penSize * 0.4;
            this.ctx.beginPath();
            this.ctx.moveTo(prevPoint.x + perpX, prevPoint.y + perpY);
            this.ctx.lineTo(currPoint.x + perpX, currPoint.y + perpY);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        this.setupDrawingContext();
    }
    
    /**
     * Draw a fountain pen stroke with elegant variable width
     */
    drawFountainStroke(prevPoint, currPoint, distance) {
        // Fountain pen has more dramatic width variation based on direction and speed
        const dx = currPoint.x - prevPoint.x;
        const dy = currPoint.y - prevPoint.y;
        const angle = Math.atan2(dy, dx);
        
        // Width varies more dramatically with speed
        const minWidth = this.penSize * 0.4;
        const maxWidth = this.penSize * 1.8;
        const speedFactor = Math.min(distance / 12, 1);
        
        // Also vary width based on stroke direction (like a calligraphy pen)
        const directionFactor = Math.abs(Math.sin(angle * 2)) * 0.3;
        const lineWidth = maxWidth - (speedFactor * (maxWidth - minWidth)) - (directionFactor * this.penSize);
        
        this.ctx.save();
        this.ctx.globalAlpha = 1.0;
        this.ctx.lineWidth = Math.max(minWidth, lineWidth);
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(prevPoint.x, prevPoint.y);
        this.ctx.lineTo(currPoint.x, currPoint.y);
        this.ctx.stroke();
        this.ctx.restore();
        this.setupDrawingContext();
    }
    
    /**
     * Draw a brush stroke with fuzzy edges and calligraphic effect
     * @param {Object} prevPoint - Previous point
     * @param {Object} currPoint - Current point
     * @param {number} distance - Distance between points (used as speed proxy)
     */
    drawBrushStroke(prevPoint, currPoint, distance) {
        const dx = currPoint.x - prevPoint.x;
        const dy = currPoint.y - prevPoint.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate brush width based on distance (faster movement = thinner for brush effect)
        const baseWidth = this.penSize * 2.0;
        const speedFactor = Math.min(distance / 12, 1);
        const brushWidth = baseWidth * (1 - speedFactor * 0.6);
        
        // Hash function for better pseudo-random distribution
        const hash = (x, y, i) => {
            const h = Math.sin(x * 12.9898 + y * 78.233 + i * 43758.5453) * 43758.5453;
            return h - Math.floor(h);
        };
        
        // Draw main stroke with varying width
        this.ctx.save();
        this.ctx.globalAlpha = 0.75;
        this.ctx.lineWidth = brushWidth;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(prevPoint.x, prevPoint.y);
        this.ctx.lineTo(currPoint.x, currPoint.y);
        this.ctx.stroke();
        
        // Add fuzzy edge effects using deterministic offsets based on point positions
        // Simulates ink spreading on paper
        const numFuzzyStrokes = 4;
        for (let i = 0; i < numFuzzyStrokes; i++) {
            // Use hash-based pseudo-random for better distribution
            const seed1 = hash(prevPoint.x, currPoint.y, i * 1.1);
            const seed2 = hash(prevPoint.y, currPoint.x, i * 2.2);
            const seed3 = hash(currPoint.x, prevPoint.y, i * 3.3);
            
            const offset = (seed1 - 0.5) * brushWidth * 0.6;
            const perpX = Math.cos(angle + Math.PI / 2) * offset;
            const perpY = Math.sin(angle + Math.PI / 2) * offset;
            
            this.ctx.globalAlpha = 0.1 + seed2 * 0.15;
            this.ctx.lineWidth = brushWidth * (0.2 + seed3 * 0.4);
            this.ctx.beginPath();
            this.ctx.moveTo(prevPoint.x + perpX, prevPoint.y + perpY);
            this.ctx.lineTo(currPoint.x + perpX, currPoint.y + perpY);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        this.setupDrawingContext(); // Restore original context settings
    }

    drawMarkerStroke(prevPoint, currPoint, distance) {
        const minWidth = this.penSize * 1.6;
        const maxWidth = this.penSize * 2.3;
        const speedFactor = Math.min(distance / 15, 1);
        const markerWidth = maxWidth - speedFactor * (maxWidth - minWidth);

        this.ctx.save();
        this.ctx.globalAlpha = 0.4;
        this.ctx.lineWidth = markerWidth;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(prevPoint.x, prevPoint.y);
        this.ctx.lineTo(currPoint.x, currPoint.y);
        this.ctx.stroke();
        this.ctx.restore();
        this.setupDrawingContext();
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.isSnappedToEdge = false;
            this.hideActiveToolPreview();
            
            // Reset edge drawing state
            if (this.edgeDrawingManager) {
                this.edgeDrawingManager.resetSnapping();
            }
            
            // Save the stroke if it has points
            if (this.points.length > 0) {
                const isEraserStroke = this.currentTool === 'eraser';
                this.strokes.push({
                    points: [...this.points],
                    color: isEraserStroke ? 'rgba(0,0,0,1)' : this.currentColor,
                    size: isEraserStroke ? this.getCanvasEraserSize() : this.penSize,
                    penType: this.penType,
                    tool: this.currentTool,
                    lineStyle: isEraserStroke ? 'solid' : this.penLineStyle,
                    dashDensity: isEraserStroke ? 10 : this.penDashDensity,
                    multiLineCount: isEraserStroke ? null : this.penMultiLineCount,
                    multiLineSpacing: isEraserStroke ? null : this.penMultiLineSpacing,
                    breakIndices: [...this.strokeBreakIndices],
                    eraserShape: isEraserStroke ? this.eraserShape : null,
                    rotation: 0, // Initialize rotation property
                    layerOrder: this.getNextLayerOrder(),
                    objectId: this.getNextObjectId(),
                    groupId: null
                });
            }
            
            this.points = [];
            this.lastPoint = null;
            this.strokeBreakIndices = [];
            this.pendingStrokeBreak = false;
            window.drawingBoard?.syncVectorPreviewState?.(true);
            return true;
        }
        return false;
    }
    
    startPanning(e) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }
    
    pan(e) {
        if (!this.isPanning || !this.lastPanPoint) return;

        // panOffset is in screen pixels (translate is applied outside scale),
        // so pointer deltas map 1:1 regardless of zoom level
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        this.persistViewState();
    }
    
    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPoint = null;
            this.persistViewState({ immediate: true });
            // Restore cursor based on current tool
            if (this.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            }
            return true;
        }
        return false;
    }
    
    clearCanvas() {
        // Reset the transform so the physical-size clear covers the full
        // buffer even when the context is DPR-scaled (matches the
        // setTransform + clearRect pattern used for the live preview canvas).
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        this.clearStrokes();
        this.clearStampedImages();
        this.objectGroups = [];
        this.updateOffCanvasImageMirrors();
        this.clearVectorScene();
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.hideActiveToolPreview();
    }
    
    setColor(color) {
        this.currentColor = color;
    }
    
    setPenSize(size) {
        this.penSize = size;
    }
    
    setPenType(type) {
        this.penType = type;
        safeDrawingStorageSetItem('penType', type);
    }
    
    normalizeEraserSize(size) {
        const numericSize = Math.round(parseFloat(size));
        if (!Number.isFinite(numericSize)) {
            return 20;
        }
        return Math.max(10, Math.min(150, numericSize));
    }

    getAdaptiveDefaultEraserSize() {
        const viewportShortEdge = Math.max(0, Math.min(window.innerWidth || 0, window.innerHeight || 0));
        const screenShortEdge = Math.max(
            viewportShortEdge,
            Math.min(window.screen?.availWidth || viewportShortEdge, window.screen?.availHeight || viewportShortEdge)
        );
        const referenceShortEdge = (viewportShortEdge * 0.7) + (screenShortEdge * 0.3);
        return Math.max(16, Math.min(30, Math.round(referenceShortEdge * 0.022)));
    }

    hasStoredEraserSizePreference() {
        return safeDrawingStorageGetItem('eraserSize') !== null;
    }

    refreshAdaptiveEraserSize() {
        if (this.hasStoredEraserSizePreference()) {
            return false;
        }
        this.eraserSize = this.getAdaptiveDefaultEraserSize();
        return true;
    }

    setEraserSize(size, options = {}) {
        const { persist = true } = options;
        this.eraserSize = this.normalizeEraserSize(size);
        if (persist) {
            safeDrawingStorageSetItem('eraserSize', String(this.eraserSize));
        }
    }
    
    setEraserShape(shape) {
        this.eraserShape = shape;
        safeDrawingStorageSetItem('eraserShape', shape);
    }

    getCanvasEraserSize() {
        return this.eraserSize / this.getViewportScale();
    }

    eraseRectangleAtPoint(point, size = this.getCanvasEraserSize()) {
        const halfSize = size / 2;
        this.ctx.fillRect(point.x - halfSize, point.y - halfSize, size, size);
    }

    eraseRectangleSegment(startPoint, endPoint, size = this.getCanvasEraserSize()) {
        const halfSize = size / 2;
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            this.eraseRectangleAtPoint(startPoint, size);
            return;
        }

        // Sample axis-aligned squares along the path so the actual erasing area
        // matches the visible square cursor and feels as continuous as the circle eraser.
        const step = Math.max(1, size * 0.22);
        const steps = Math.max(1, Math.ceil(distance / step));

        this.ctx.beginPath();
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = startPoint.x + dx * t;
            const y = startPoint.y + dy * t;
            this.ctx.rect(x - halfSize, y - halfSize, size, size);
        }
        this.ctx.fill();
    }
    
    // Stroke selection methods
    findStrokeAtPoint(x, y, threshold = null) {
        // Use default threshold if not specified
        if (threshold === null) {
            threshold = this.SELECTION_THRESHOLD;
        }
        // Search strokes in reverse order (most recent first)
        for (let i = this.strokes.length - 1; i >= 0; i--) {
            const stroke = this.strokes[i];
            if (this.isPointNearStroke(x, y, stroke, threshold)) {
                return i;
            }
        }
        return null;
    }

    getStrokeRenderedHalfWidth(stroke) {
        const size = Number(stroke?.size) || 0;
        const styleExtent = this.getStrokeStyleOuterExtent(stroke);
        switch (stroke?.penType) {
            case 'brush':
                return (size * 1.5) / 2 + styleExtent;
            case 'marker':
                return (size * 2.2) / 2 + styleExtent;
            default:
                return size / 2 + styleExtent;
        }
    }

    getStrokeStyleOuterExtent(stroke) {
        const lineStyle = stroke?.shapeLineStyle || stroke?.lineStyle || 'solid';
        let count = 1;
        if (lineStyle === 'double') count = 2;
        else if (lineStyle === 'triple') count = 3;
        else if (lineStyle === 'multi') {
            count = Number(stroke?.shapeMultiLineCount ?? stroke?.multiLineCount) || 2;
        }
        if (count <= 1) return 0;
        const spacing = Number(stroke?.shapeMultiLineSpacing ?? stroke?.multiLineSpacing) || 10;
        return Math.max(0, (count - 1) * spacing / 2);
    }

    getStrokePointSegments(stroke) {
        const points = Array.isArray(stroke?.points) ? stroke.points : [];
        if (points.length === 0) return [];
        const breakIndices = new Set((stroke.breakIndices || []).filter(index => Number.isInteger(index)));
        const segments = [[]];
        points.forEach((point, index) => {
            if (index > 0 && breakIndices.has(index)) segments.push([]);
            segments[segments.length - 1].push(point);
        });
        return segments.filter(segment => segment.length > 0);
    }

    getMultiLineStrokePaths(stroke) {
        const count = Math.max(2, Math.min(10, Number(stroke?.multiLineCount) || 2));
        const spacing = Math.max(1, Number(stroke?.multiLineSpacing) || 10);
        const offsets = Array.from({ length: count }, (_value, index) => (
            index * spacing - ((count - 1) * spacing / 2)
        ));
        const paths = [];

        for (const segment of this.getStrokePointSegments(stroke)) {
            if (segment.length === 1) {
                offsets.forEach(offset => paths.push([{ x: segment[0].x, y: segment[0].y + offset }]));
                continue;
            }
            const normals = [];
            for (let index = 0; index < segment.length - 1; index++) {
                const dx = segment[index + 1].x - segment[index].x;
                const dy = segment[index + 1].y - segment[index].y;
                const length = Math.hypot(dx, dy) || 1;
                normals.push({ x: -dy / length, y: dx / length });
            }
            const vertexNormals = segment.map((_point, index) => {
                if (index === 0) return normals[0];
                if (index === segment.length - 1) return normals[normals.length - 1];
                const x = normals[index - 1].x + normals[index].x;
                const y = normals[index - 1].y + normals[index].y;
                const length = Math.hypot(x, y) || 1;
                return { x: x / length, y: y / length };
            });
            offsets.forEach(offset => paths.push(segment.map((point, index) => ({
                x: point.x + vertexNormals[index].x * offset,
                y: point.y + vertexNormals[index].y * offset
            }))));
        }
        return paths;
    }

    getStrokeHitThreshold(stroke) {
        return Math.max(this.SELECTION_THRESHOLD, this.getStrokeRenderedHalfWidth(stroke));
    }
    
    isPointNearStroke(x, y, stroke, threshold) {
        // Check if point is within threshold distance of any segment in the stroke
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            const distance = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }
    
    distanceToSegment(px, py, x1, y1, x2, y2) {
        // Calculate perpendicular distance from point to line segment
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // Segment is a point
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }
        
        // Calculate projection parameter
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        // Calculate closest point on segment
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        // Return distance to closest point
        return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
    }
    
    selectStroke(index) {
        this.selectedStrokeIndex = index;
    }
    
    deselectStroke() {
        this.selectedStrokeIndex = null;
    }
    
    getStrokeBounds(stroke) {
        if (!stroke || stroke.points.length === 0) return null;
        
        let minX = stroke.points[0].x;
        let minY = stroke.points[0].y;
        let maxX = stroke.points[0].x;
        let maxY = stroke.points[0].y;
        
        for (const point of stroke.points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // Add padding based on stroke size
        const padding = stroke.size * 2 + this.getStrokeStyleOuterExtent(stroke);
        
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
    }
    
    drawSelectionBorder() {
        // Selection border is now handled by CSS overlay (.image-controls-box)
        // No need to draw additional border on canvas
        return;
    }
    
    copySelectedStroke() {
        if (this.selectedStrokeIndex === null) return false;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return false;
        
        // Create a copy with offset
        const copiedStroke = {
            points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
            color: stroke.color,
            size: stroke.size,
            penType: stroke.penType,
            tool: stroke.tool,
            lineStyle: stroke.lineStyle || 'solid',
            dashDensity: stroke.dashDensity || 10,
            multiLineCount: stroke.multiLineCount || null,
            multiLineSpacing: stroke.multiLineSpacing || null,
            breakIndices: Array.isArray(stroke.breakIndices) ? [...stroke.breakIndices] : [],
            renderMode: stroke.renderMode || null,
            shapeType: stroke.shapeType || null,
            shapeStart: stroke.shapeStart ? {
                x: stroke.shapeStart.x + this.COPY_OFFSET,
                y: stroke.shapeStart.y + this.COPY_OFFSET
            } : null,
            shapeEnd: stroke.shapeEnd ? {
                x: stroke.shapeEnd.x + this.COPY_OFFSET,
                y: stroke.shapeEnd.y + this.COPY_OFFSET
            } : null,
            shapeLineStyle: stroke.shapeLineStyle || null,
            shapeDashDensity: stroke.shapeDashDensity || null,
            shapeWaveDensity: stroke.shapeWaveDensity || null,
            shapeMultiLineCount: stroke.shapeMultiLineCount || null,
            shapeMultiLineSpacing: stroke.shapeMultiLineSpacing || null,
            arrowSize: stroke.arrowSize || null,
            eraserShape: stroke.eraserShape || null,
            rotation: stroke.rotation || 0,
            layerOrder: this.getNextLayerOrder(),
            objectId: this.getNextObjectId(),
            groupId: null
        };
        
        this.strokes.push(copiedStroke);
        
        // Redraw the copied stroke
        this.redrawStroke(copiedStroke);
        
        // Select the new stroke
        this.selectedStrokeIndex = this.strokes.length - 1;
        
        return true;
    }
    
    deleteSelectedStroke() {
        if (this.selectedStrokeIndex === null) return false;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return false;

        // Remove stroke from array
        this.removeObjectFromGroups(stroke.objectId);
        this.strokes.splice(this.selectedStrokeIndex, 1);
        this.selectedStrokeIndex = null;
        this.cleanupGroups();

        return true;
    }

    redrawComplexPenStroke(stroke) {
        const renderers = {
            pencil: this.drawPencilStroke,
            ballpoint: this.drawBallpointStroke,
            fountain: this.drawFountainStroke,
            brush: this.drawBrushStroke,
            marker: this.drawMarkerStroke
        };
        const renderer = renderers[stroke?.penType];
        if (typeof renderer !== 'function') return false;

        const previousState = {
            currentTool: this.currentTool,
            currentColor: this.currentColor,
            penSize: this.penSize,
            penType: this.penType,
            penLineStyle: this.penLineStyle,
            penDashDensity: this.penDashDensity,
            accumulatedDistance: this.accumulatedDistance
        };

        try {
            this.currentTool = 'pen';
            this.currentColor = stroke.color;
            this.penSize = stroke.size;
            this.penType = stroke.penType;
            this.penLineStyle = stroke.lineStyle || 'solid';
            this.penDashDensity = stroke.dashDensity || 10;
            this.accumulatedDistance = 0;
            this.setupDrawingContext();

            for (const points of this.getStrokePointSegments(stroke)) {
                if (points.length === 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(points[0].x, points[0].y);
                    this.ctx.lineTo(points[0].x, points[0].y);
                    this.ctx.stroke();
                    continue;
                }
                for (let index = 1; index < points.length; index++) {
                    const previous = points[index - 1];
                    const current = points[index];
                    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
                    this.accumulatedDistance += distance;
                    renderer.call(this, previous, current, distance);
                }
            }
        } finally {
            Object.assign(this, previousState);
        }
        return true;
    }
    
    redrawStroke(stroke) {
        if (stroke?.renderMode === 'shape' && this.shapeDrawingManager?.drawStoredShapeOnContext) {
            this.shapeDrawingManager.drawStoredShapeOnContext(this.ctx, stroke);
            return;
        }

        this.ctx.save();
        
        // Set up drawing context based on stroke properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = stroke.color;
        this.ctx.fillStyle = stroke.color;
        this.ctx.lineWidth = stroke.size;
        this.ctx.setLineDash([]);
        this.ctx.lineDashOffset = 0;

        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            this.ctx.fillStyle = 'rgba(0,0,0,1)';
            this.ctx.globalAlpha = 1.0;

            if ((stroke.eraserShape || 'circle') === 'rectangle') {
                this.ctx.lineCap = 'butt';
                this.ctx.lineJoin = 'miter';

                if (stroke.points.length > 0) {
                    this.eraseRectangleAtPoint(stroke.points[0], stroke.size);
                    for (let i = 1; i < stroke.points.length; i++) {
                        this.eraseRectangleSegment(stroke.points[i - 1], stroke.points[i], stroke.size);
                    }
                }

                this.ctx.restore();
                return;
            }
        }
        
        // Apply pen type settings
        if (stroke.tool !== 'eraser') {
            this.applyStoredStrokeLineStyle(stroke);
            switch(stroke.penType) {
                case 'pencil':
                    this.ctx.globalAlpha = 0.7;
                    break;
                case 'ballpoint':
                    this.ctx.globalAlpha = 0.9;
                    break;
                case 'fountain':
                    this.ctx.globalAlpha = 1.0;
                    break;
                case 'brush':
                    this.ctx.globalAlpha = 0.85;
                    this.ctx.lineWidth = stroke.size * 1.5;
                    break;
                case 'marker':
                    this.ctx.globalAlpha = 0.45;
                    this.ctx.lineWidth = stroke.size * 2.2;
                    this.ctx.lineCap = 'square';
                    break;
                case 'normal':
                default:
                    this.ctx.globalAlpha = 1.0;
                    break;
            }
        }

        if (stroke.tool !== 'eraser' && stroke.lineStyle === 'multi') {
            for (const points of this.getMultiLineStrokePaths(stroke)) {
                if (points.length === 0) continue;
                this.ctx.beginPath();
                this.ctx.moveTo(points[0].x, points[0].y);
                if (points.length === 1) this.ctx.lineTo(points[0].x, points[0].y);
                for (let index = 1; index < points.length; index++) {
                    this.ctx.lineTo(points[index].x, points[index].y);
                }
                this.ctx.stroke();
            }
            this.ctx.restore();
            return;
        }

        if (stroke.tool !== 'eraser' && this.redrawComplexPenStroke(stroke)) {
            this.ctx.restore();
            return;
        }
        
        // Draw the stroke
        if (stroke.points.length > 0) {
            if (stroke.tool === 'eraser' && stroke.points.length === 1) {
                this.ctx.beginPath();
                this.ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return;
            }

            const breakIndices = new Set(stroke.breakIndices || []);
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            if (stroke.points.length === 1) {
                this.ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
            }
            
            for (let i = 1; i < stroke.points.length; i++) {
                if (breakIndices.has(i)) {
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(stroke.points[i].x, stroke.points[i].y);
                } else {
                    this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    clearStrokes() {
        this.strokes = [];
        this.selectedStrokeIndex = null;
        this.renderVectorScene(window.drawingBoard?.insertTextManager || null);
    }
    
    // Stamped image management
    addStampedImage(imageData) {
        if (!imageData) return;
        this.ensureObjectId(imageData);
        imageData.groupId = imageData.groupId || null;
        if (!Number.isFinite(imageData.layerOrder)) {
            imageData.layerOrder = this.getNextLayerOrder();
        } else {
            this.layerCounter = Math.max(this.layerCounter, imageData.layerOrder + 1);
        }
        this.stampedImages.push(imageData);
        this.updateOffCanvasImageMirrors();
    }

    getNextLayerOrder() {
        return this.layerCounter++;
    }

    syncLayerCounter(textObjects = [], groups = this.objectGroups) {
        let maxLayerOrder = 0;
        let maxObjectId = 0;
        let maxGroupId = 0;

        [this.strokes, this.stampedImages, textObjects || []].forEach(collection => {
            collection.forEach(item => {
                if (!item) return;
                this.ensureObjectId(item);
                if (Number.isFinite(item.layerOrder)) {
                    maxLayerOrder = Math.max(maxLayerOrder, item.layerOrder);
                }
                maxObjectId = Math.max(maxObjectId, this.parseCounterValue(item.objectId, 'obj-'));
            });
        });

        (groups || []).forEach(group => {
            if (!group) return;
            this.ensureGroup(group);
            if (Number.isFinite(group.layerOrder)) {
                maxLayerOrder = Math.max(maxLayerOrder, group.layerOrder);
            }
            maxGroupId = Math.max(maxGroupId, this.parseCounterValue(group.id, 'group-'));
        });

        this.layerCounter = Math.max(this.layerCounter, maxLayerOrder + 1, 1);
        this.objectIdCounter = Math.max(this.objectIdCounter, maxObjectId + 1, 1);
        this.groupCounter = Math.max(this.groupCounter, maxGroupId + 1, 1);
    }

    ensureLayerOrder(item) {
        if (!item) return 0;
        this.ensureObjectId(item);
        if (!Number.isFinite(item.layerOrder)) {
            item.layerOrder = this.getNextLayerOrder();
        } else {
            this.layerCounter = Math.max(this.layerCounter, item.layerOrder + 1);
        }
        return item.layerOrder;
    }

    isSelectableStroke(stroke) {
        return !!stroke && stroke.tool !== 'eraser';
    }

    getSelectableRenderableObjects(textObjects = []) {
        return this.getRenderableObjects(textObjects).filter(renderable => {
            if (renderable.type === 'stroke') {
                return this.isSelectableStroke(renderable.item);
            }
            if (renderable.type === 'group') {
                const members = renderable.members || [];
                return members.some(member =>
                    member.type !== 'stroke' || this.isSelectableStroke(member.item)
                );
            }
            return true;
        });
    }

    getRenderableObjects(textObjects = []) {
        this.cleanupGroups(textObjects);
        const renderables = [];
        let fallbackOrder = 0;

        this.strokes.forEach((stroke, index) => {
            renderables.push({
                type: 'stroke',
                index,
                item: stroke,
                objectId: this.ensureObjectId(stroke),
                layerOrder: this.ensureLayerOrder(stroke),
                fallbackOrder: fallbackOrder++
            });
        });

        this.stampedImages.forEach((image, index) => {
            renderables.push({
                type: 'image',
                index,
                item: image,
                objectId: this.ensureObjectId(image),
                layerOrder: this.ensureLayerOrder(image),
                fallbackOrder: fallbackOrder++
            });
        });

        (textObjects || []).forEach((textObj, index) => {
            renderables.push({
                type: 'text',
                index,
                item: textObj,
                objectId: this.ensureObjectId(textObj),
                layerOrder: this.ensureLayerOrder(textObj),
                fallbackOrder: fallbackOrder++
            });
        });

        const groupedObjectIds = new Set();
        const topLevelRenderables = [];

        this.objectGroups.forEach(group => {
            this.ensureGroup(group);
            const members = this.getGroupMembers(group, textObjects);
            if (members.length < 2) return;
            members.forEach(member => groupedObjectIds.add(member.objectId));
            topLevelRenderables.push({
                type: 'group',
                groupId: group.id,
                item: group,
                objectId: group.id,
                members,
                layerOrder: group.layerOrder,
                fallbackOrder: fallbackOrder++
            });
        });

        renderables.forEach(renderable => {
            if (!renderable.item.groupId || !groupedObjectIds.has(renderable.objectId)) {
                topLevelRenderables.push(renderable);
            }
        });

        return topLevelRenderables.sort((a, b) => {
            if (a.layerOrder === b.layerOrder) {
                return a.fallbackOrder - b.fallbackOrder;
            }
            return a.layerOrder - b.layerOrder;
        });
    }

    normalizeTopLevelLayerOrders(textObjects = [], orderedRenderables = null) {
        const renderables = orderedRenderables || this.getRenderableObjects(textObjects);
        renderables.forEach((renderable, index) => {
            if (renderable.type === 'group') {
                renderable.item.layerOrder = index + 1;
            } else {
                renderable.item.layerOrder = index + 1;
            }
        });
        this.syncLayerCounter(textObjects);
    }

    groupObjects(objectIds, textObjects = []) {
        const uniqueIds = [...new Set(objectIds || [])];
        if (uniqueIds.length < 2) return null;

        const topLevelRenderables = this.getRenderableObjects(textObjects);
        const selectedRenderables = topLevelRenderables.filter(renderable =>
            renderable.type !== 'group' && uniqueIds.includes(renderable.objectId) && !renderable.item.groupId
        );

        if (selectedRenderables.length < 2) {
            return null;
        }

        const selectedIds = new Set(selectedRenderables.map(renderable => renderable.objectId));
        const memberIds = [...selectedRenderables]
            .sort((a, b) => {
                if (a.layerOrder === b.layerOrder) {
                    return a.fallbackOrder - b.fallbackOrder;
                }
                return a.layerOrder - b.layerOrder;
            })
            .map(renderable => renderable.objectId);

        const group = this.ensureGroup({
            id: this.getNextGroupId(),
            memberIds,
            layerOrder: this.getNextLayerOrder()
        });

        selectedRenderables.forEach(renderable => {
            renderable.item.groupId = group.id;
        });
        this.objectGroups.push(group);

        const highestSelectedIndex = Math.max(
            ...selectedRenderables.map(renderable => topLevelRenderables.indexOf(renderable))
        );
        const insertIndex = topLevelRenderables
            .slice(0, highestSelectedIndex + 1)
            .filter(renderable => !selectedIds.has(renderable.objectId))
            .length;

        const reordered = topLevelRenderables.filter(renderable => !selectedIds.has(renderable.objectId));
        reordered.splice(insertIndex, 0, {
            type: 'group',
            groupId: group.id,
            item: group,
            objectId: group.id,
            members: this.getGroupMembers(group, textObjects),
            layerOrder: group.layerOrder,
            fallbackOrder: highestSelectedIndex
        });

        this.normalizeTopLevelLayerOrders(textObjects, reordered);
        return group;
    }

    ungroupObjects(groupId, textObjects = []) {
        const group = this.getGroupById(groupId);
        if (!group) return [];

        const topLevelRenderables = this.getRenderableObjects(textObjects);
        const groupRenderable = topLevelRenderables.find(renderable => renderable.type === 'group' && renderable.groupId === groupId);
        if (!groupRenderable) return [];

        const members = this.getGroupMembers(group, textObjects);
        members.forEach(member => {
            member.item.groupId = null;
        });

        this.objectGroups = this.objectGroups.filter(item => item.id !== groupId);

        const reordered = [];
        topLevelRenderables.forEach(renderable => {
            if (renderable.type === 'group' && renderable.groupId === groupId) {
                reordered.push(...members);
            } else {
                reordered.push(renderable);
            }
        });

        this.normalizeTopLevelLayerOrders(textObjects, reordered);
        return members;
    }

    renderScene(textManager = null) {
        const renderables = this.getRenderableObjects(textManager?.textObjects || []);
        renderables.forEach(renderable => {
            if (renderable.type === 'group') {
                renderable.members.forEach(member => {
                    if (member.type === 'stroke') {
                        this.redrawStroke(member.item);
                    } else if (member.type === 'image') {
                        this.redrawSingleStampedImage(member.item);
                    } else if (member.type === 'text' && textManager?.drawTextObject) {
                        textManager.drawTextObject(member.item);
                    }
                });
            } else if (renderable.type === 'stroke') {
                this.redrawStroke(renderable.item);
            } else if (renderable.type === 'image') {
                this.redrawSingleStampedImage(renderable.item);
            } else if (renderable.type === 'text' && textManager?.drawTextObject) {
                textManager.drawTextObject(renderable.item);
            }
        });
        this.updateOffCanvasImageMirrors(textManager?.textObjects || []);
        this.renderVectorScene(textManager);
    }
    
    redrawStampedImages() {
        for (const img of this.stampedImages) {
            this.redrawSingleStampedImage(img);
        }
    }

    redrawSingleStampedImage(img) {
        if (!img?.imageElement) return;

        this.ctx.save();
        const centerX = img.x + img.width / 2;
        const centerY = img.y + img.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((img.rotation || 0) * Math.PI / 180);

        const flipScaleX = img.flipHorizontal ? -1 : 1;
        const flipScaleY = img.flipVertical ? -1 : 1;
        this.ctx.scale(flipScaleX, flipScaleY);

        this.ctx.drawImage(
            img.imageElement,
            -img.width / 2,
            -img.height / 2,
            img.width,
            img.height
        );
        this.ctx.restore();
    }
    
    clearStampedImages() {
        this.stampedImages = [];
        this.selectedImageIndex = null;
        this.updateOffCanvasImageMirrors();
        this.renderVectorScene(window.drawingBoard?.insertTextManager || null);
    }

    findImageAtPoint(x, y) {
        for (let i = this.stampedImages.length - 1; i >= 0; i--) {
            const img = this.stampedImages[i];
            if (!img) continue;
            const cx = img.x + img.width / 2;
            const cy = img.y + img.height / 2;
            const rot = -(img.rotation || 0) * Math.PI / 180;
            const dx = x - cx;
            const dy = y - cy;
            const localX = dx * Math.cos(rot) - dy * Math.sin(rot) + cx;
            const localY = dx * Math.sin(rot) + dy * Math.cos(rot) + cy;
            if (localX >= img.x && localX <= img.x + img.width &&
                localY >= img.y && localY <= img.y + img.height) {
                return i;
            }
        }
        return null;
    }

    selectImage(index) {
        this.selectedImageIndex = index;
    }

    deselectImage() {
        this.selectedImageIndex = null;
    }

    getImageBounds(img) {
        if (!img) return null;
        return { x: img.x, y: img.y, width: img.width, height: img.height };
    }

    copySelectedImage() {
        if (this.selectedImageIndex === null) return false;
        const img = this.stampedImages[this.selectedImageIndex];
        if (!img) return false;
        const copy = {
            imageElement: img.imageElement,
            imageSrc: img.imageSrc || img.imageElement?.src || null,
            x: img.x + this.COPY_OFFSET,
            y: img.y + this.COPY_OFFSET,
            width: img.width,
            height: img.height,
            rotation: img.rotation || 0,
            flipHorizontal: img.flipHorizontal || false,
            flipVertical: img.flipVertical || false,
            layerOrder: this.getNextLayerOrder(),
            objectId: this.getNextObjectId(),
            groupId: null
        };
        this.stampedImages.push(copy);
        this.selectedImageIndex = this.stampedImages.length - 1;
        this.updateOffCanvasImageMirrors();
        return true;
    }

    deleteSelectedImage() {
        if (this.selectedImageIndex === null) return false;
        const img = this.stampedImages[this.selectedImageIndex];
        if (!img) return false;
        this.removeObjectFromGroups(img.objectId);
        this.stampedImages.splice(this.selectedImageIndex, 1);
        this.selectedImageIndex = null;
        this.cleanupGroups();
        this.updateOffCanvasImageMirrors();
        return true;
    }
}

window.DrawingEngine = DrawingEngine;
window.AboardDrawingEngine = DrawingEngine;
