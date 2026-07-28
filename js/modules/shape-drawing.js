// Shape Drawing Module
// Handles drawing shapes (line, rectangle, circle, etc.) on the canvas
// Uses the same properties as the pen tool (color, size, pen type)

function safeShapeDrawingStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read shape drawing localStorage key "${key}":`, error);
        return null;
    }
}

function safeShapeDrawingStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write shape drawing localStorage key "${key}":`, error);
        return false;
    }
}

class ShapeDrawingManager {
    constructor(canvas, ctx, drawingEngine, historyManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawingEngine = drawingEngine;
        this.historyManager = historyManager;
        
        // Shape drawing state
        this.isDrawing = false;
        this.currentShape = 'line';
        this.startPoint = null;
        this.endPoint = null;
        
        // Line style settings
        this.lineStyle = 'solid'; // solid, dashed, dotted, wavy, double, triple, arrow, doubleArrow
        this.dashDensity = 10; // Dash segment length
        this.waveDensity = 10; // Wave frequency
        this.multiLineCount = 2; // Number of lines for multi-line styles
        this.multiLineSpacing = 4; // Spacing between multiple lines
        
        // Arrow drawing constants
        this.ARROW_ANGLE = Math.PI / 6; // Arrow head angle (30 degrees)
        this.ARROW_LINE_OFFSET = 0.8; // Factor to shorten line at arrow ends
        this.ARROW_SIZE_DEFAULT = 15; // Default arrow size
        this.ARROW_SIZE_MIN_SETTING = 5; // Minimum configurable arrow size
        this.ARROW_SIZE_MAX_SETTING = 100; // Maximum configurable arrow size
        
        // Arrow size setting (independent from line thickness)
        this.arrowSize = this.ARROW_SIZE_DEFAULT;
        
        // Preview layer (optional canvas overlay for live preview)
        this.previewCanvas = null;
        this.previewCtx = null;
        
        // Performance optimization: requestAnimationFrame throttling
        this.pendingDraw = false;
        this.rafId = null;
        
        // Canvas CSS scale factor (updated in syncPreviewCanvas)
        this.canvasCssScale = 1.0;
        
        // Load saved settings
        this.loadSettings();
    }
    
    loadSettings() {
        this.lineStyle = safeShapeDrawingStorageGetItem('shapeLineStyle') || 'solid';
        this.dashDensity = parseInt(safeShapeDrawingStorageGetItem('shapeDashDensity'), 10) || 10;
        this.waveDensity = parseInt(safeShapeDrawingStorageGetItem('shapeWaveDensity'), 10) || 10;
        this.multiLineCount = parseInt(safeShapeDrawingStorageGetItem('shapeMultiLineCount'), 10) || 2;
        this.multiLineSpacing = parseInt(safeShapeDrawingStorageGetItem('shapeMultiLineSpacing'), 10) || 4;
        this.arrowSize = parseInt(safeShapeDrawingStorageGetItem('shapeArrowSize'), 10) || this.ARROW_SIZE_DEFAULT;
    }
    
    saveSettings() {
        safeShapeDrawingStorageSetItem('shapeLineStyle', this.lineStyle);
        safeShapeDrawingStorageSetItem('shapeDashDensity', this.dashDensity);
        safeShapeDrawingStorageSetItem('shapeWaveDensity', this.waveDensity);
        safeShapeDrawingStorageSetItem('shapeMultiLineCount', this.multiLineCount);
        safeShapeDrawingStorageSetItem('shapeMultiLineSpacing', this.multiLineSpacing);
        safeShapeDrawingStorageSetItem('shapeArrowSize', this.arrowSize);
    }
    
    setArrowSize(size) {
        this.arrowSize = Math.max(this.ARROW_SIZE_MIN_SETTING, Math.min(this.ARROW_SIZE_MAX_SETTING, size));
        this.saveSettings();
    }
    
    setLineStyle(style) {
        this.lineStyle = style;
        this.saveSettings();
    }
    
    setDashDensity(density) {
        this.dashDensity = Math.max(1, Math.min(100, density));
        this.saveSettings();
    }
    
    setWaveDensity(density) {
        this.waveDensity = Math.max(5, Math.min(30, density));
        this.saveSettings();
    }
    
    setMultiLineCount(count) {
        this.multiLineCount = Math.max(2, Math.min(10, count));
        this.saveSettings();
    }
    
    setMultiLineSpacing(spacing) {
        this.multiLineSpacing = Math.max(5, Math.min(50, spacing));
        this.saveSettings();
    }
    
    /**
     * Get the scale factor for preview drawing.
     * This accounts for both the canvas CSS scale (zoom) and DPR to ensure
     * the preview matches the final drawing appearance.
     * @param {boolean} isPreview - Whether this is for preview (true) or final drawing (false)
     * @returns {number} The scale factor to apply
     */
    getPreviewScaleFactor(isPreview) {
        return isPreview ? this.canvasCssScale : 1;
    }
    
    createPreviewCanvas() {
        if (this.previewCanvas && this.previewCtx) {
            return;
        }

        // Create an overlay canvas for shape preview
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.id = 'shape-preview-canvas';
        this.previewCanvas.style.position = 'fixed';
        this.previewCanvas.style.top = '0';
        this.previewCanvas.style.left = '0';
        this.previewCanvas.style.pointerEvents = 'none';
        this.previewCanvas.style.zIndex = '50';
        this.previewCanvas.style.display = 'none';
        
        document.body.appendChild(this.previewCanvas);
        // Use performance-optimized canvas context options
        this.previewCtx = this.previewCanvas.getContext('2d', {
            alpha: true,
            desynchronized: true  // Reduces latency on supported browsers
        });
        
        // Cache DPR to avoid repeated lookups
        this.cachedDpr = window.devicePixelRatio || 1;
        this.lastCanvasRect = null;
    }

    ensurePreviewCanvas() {
        if (!this.previewCanvas || !this.previewCtx) {
            this.createPreviewCanvas();
        }
    }
    
    syncPreviewCanvas() {
        this.ensurePreviewCanvas();

        // Sync preview canvas size with main canvas position and size on screen
        const rect = this.canvas.getBoundingClientRect();
        // Refresh the cached DPR every sync: dragging the window to a monitor
        // with a different scale factor changes devicePixelRatio, and a stale
        // value leaves the preview blurry and clearPreview misaligned.
        const dpr = window.devicePixelRatio || 1;
        const dprChanged = dpr !== this.cachedDpr;
        this.cachedDpr = dpr;

        // Calculate the CSS scale factor of the main canvas
        // This is the ratio of displayed size to actual size
        // Guard against division by zero when canvas is hidden
        const offsetWidth = this.canvas.offsetWidth;
        this.canvasCssScale = offsetWidth > 0 ? rect.width / offsetWidth : 1.0;
        
        // Only resize if dimensions actually changed (avoid expensive operations)
        // Note: Position is always updated after this block regardless of resize
        const needsResize = dprChanged || !this.lastCanvasRect ||
            this.lastCanvasRect.width !== rect.width ||
            this.lastCanvasRect.height !== rect.height;
        
        if (needsResize) {
            // Set canvas buffer size (physical pixels = CSS pixels * DPR)
            this.previewCanvas.width = rect.width * dpr;
            this.previewCanvas.height = rect.height * dpr;
            
            // Set CSS size to match the main canvas display size
            this.previewCanvas.style.width = rect.width + 'px';
            this.previewCanvas.style.height = rect.height + 'px';
            
            // Apply DPR scaling once after resize
            // This allows drawing in CSS pixel coordinates while the buffer is sized for retina
            this.previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        
        // Always update position (cheap operation) - handles canvas movement without resize
        this.previewCanvas.style.left = rect.left + 'px';
        this.previewCanvas.style.top = rect.top + 'px';
        
        // Cache the rect for next comparison
        this.lastCanvasRect = { width: rect.width, height: rect.height };
    }
    
    setShape(shape) {
        this.currentShape = shape;
    }
    
    getPosition(e) {
        // Get position relative to the canvas bounding rect (screen coordinates)
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
            y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        };
    }
    
    getCanvasPosition(e) {
        // Get position in canvas coordinate space for drawing on main canvas
        return this.drawingEngine.getPosition(e);
    }
    
    startDrawing(e) {
        this.ensurePreviewCanvas();
        this.isDrawing = true;
        window.drawingBoard?.syncVectorPreviewState?.();
        // Store both screen coordinates (for preview) and canvas coordinates (for final drawing)
        this.startPoint = this.getCanvasPosition(e);  // Canvas coords for final draw
        this.startScreenPoint = this.getPosition(e);   // Screen coords for preview
        this.endPoint = null;
        this.endScreenPoint = null;
        
        // Sync and show preview canvas
        this.syncPreviewCanvas();
        this.previewCanvas.style.display = 'block';
    }
    
    draw(e) {
        if (!this.isDrawing || !this.startPoint) return;
        
        this.endPoint = this.getCanvasPosition(e);     // Canvas coords for final draw
        this.endScreenPoint = this.getPosition(e);      // Screen coords for preview
        
        // Use requestAnimationFrame to throttle preview updates for better performance
        // This prevents excessive redraws on older devices during fast mouse movements
        if (!this.pendingDraw) {
            this.pendingDraw = true;
            this.rafId = requestAnimationFrame(() => {
                this.pendingDraw = false;
                // Only draw preview if we have both start and end points
                if (this.startScreenPoint && this.endScreenPoint) {
                    this.clearPreview();
                    this.drawShapePreview();
                }
            });
        }
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        // Cancel any pending animation frame
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
            this.pendingDraw = false;
        }
        
        // Draw final shape on main canvas using canvas coordinates
        if (this.startPoint && this.endPoint) {
            this.drawFinalShape();

            const storedStroke = this.createStoredShapeStroke();
            if (storedStroke) {
                this.drawingEngine.strokes.push(storedStroke);
            }
            
            // Save to history
            if (this.historyManager) {
                this.historyManager.saveState();
            }
        }
        
        // Reset state
        this.isDrawing = false;
        this.startPoint = null;
        this.endPoint = null;
        this.startScreenPoint = null;
        this.endScreenPoint = null;
        
        // Hide preview canvas
        this.clearPreview();
        this.previewCanvas.style.display = 'none';
        window.drawingBoard?.syncVectorPreviewState?.(true);
    }
    
    clearPreview() {
        if (!this.previewCanvas || !this.previewCtx) {
            return;
        }

        // Optimized clear: just clear the rect without resetting transform.
        // 
        // Coordinate system note:
        // - The canvas buffer is sized at (width * dpr) x (height * dpr) pixels
        // - syncPreviewCanvas() applies a DPR scale transform via setTransform(dpr, 0, 0, dpr, 0, 0)
        // - This means drawing coordinates are in CSS pixels, not physical pixels
        // - clearRect needs CSS pixel dimensions (canvas.width/dpr, canvas.height/dpr)
        //   because the transform scales our coordinates up by DPR
        const dpr = this.cachedDpr;
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width / dpr, this.previewCanvas.height / dpr);
    }
    
    setupDrawingContext(ctx, isPreview = false) {
        // Use same properties as pen tool
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = this.drawingEngine.currentColor;
        ctx.fillStyle = 'transparent';
        
        // Calculate line width
        let lineWidth = this.drawingEngine.penSize;
        
        // Apply pen type effects
        switch(this.drawingEngine.penType) {
            case 'pencil':
                ctx.globalAlpha = 0.7;
                break;
            case 'ballpoint':
                ctx.globalAlpha = 0.9;
                break;
            case 'fountain':
                ctx.globalAlpha = 1.0;
                break;
            case 'brush':
                ctx.globalAlpha = 0.85;
                lineWidth = this.drawingEngine.penSize * 1.5;
                break;
            case 'marker':
                ctx.globalAlpha = 0.45;
                lineWidth = this.drawingEngine.penSize * 2.2;
                ctx.lineCap = 'square';
                break;
            case 'normal':
            default:
                ctx.globalAlpha = 1.0;
                break;
        }
        
        // For preview canvas: the context has setTransform(dpr, 0, 0, dpr, 0, 0) applied,
        // which scales all drawing operations including lineWidth. To match the final
        // drawing (which doesn't have this transform), we need to compensate by dividing
        // lineWidth by DPR when drawing on the preview canvas.
        // Additionally, we need to account for the CSS scale of the main canvas (zoom level).
        // The preview is drawn in screen coordinates, but the final shape is drawn in canvas
        // coordinates. When the canvas is zoomed, its CSS transform affects how the final
        // drawing appears. We multiply by canvasCssScale to make the preview match the final.
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        lineWidth = lineWidth * scaleFactor;
        
        ctx.lineWidth = lineWidth;
        
        // Apply line style
        this.applyLineStyle(ctx, isPreview);
    }
    
    applyLineStyle(ctx, isPreview = false) {
        ctx.setLineDash([]);
        
        // Calculate visual spacing based on density value
        const spacing = Math.max(2, 400 / Math.max(1, this.dashDensity))
            * this.getPreviewScaleFactor(isPreview);

        switch(this.lineStyle) {
            case 'dashed':
                ctx.setLineDash([spacing, spacing * 0.6]);
                break;
            case 'dotted':
                ctx.setLineDash([2, spacing * 0.6]);
                break;
            case 'solid':
            case 'wavy':
            case 'double':
            case 'triple':
            default:
                ctx.setLineDash([]);
                break;
        }
    }
    
    drawShapePreview() {
        this.setupDrawingContext(this.previewCtx, true);
        
        // Use screen coordinates for preview (matches what user sees on screen)
        switch(this.currentShape) {
            case 'line':
                this.drawLineWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true);
                break;
            case 'arrow':
                this.drawArrowLine(this.previewCtx, this.startScreenPoint, this.endScreenPoint, false, true);
                break;
            case 'doubleArrow':
                this.drawArrowLine(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true, true);
                break;
            case 'rectangle':
                this.drawRectangleWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true);
                break;
            case 'circle':
                this.drawCircleWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true);
                break;
            case 'ellipse':
                this.drawEllipseWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true);
                break;
            case 'triangle':
            case 'diamond':
                this.drawPolygonWithStyle(
                    this.previewCtx,
                    this.getShapeSelectionPoints(this.currentShape, this.startScreenPoint, this.endScreenPoint),
                    true
                );
                break;
        }

        // Reset line dash
        this.previewCtx.setLineDash([]);
    }
    
    drawFinalShape() {
        this.setupDrawingContext(this.ctx, false);
        
        switch(this.currentShape) {
            case 'line':
                this.drawLineWithStyle(this.ctx, this.startPoint, this.endPoint, false);
                break;
            case 'arrow':
                this.drawArrowLine(this.ctx, this.startPoint, this.endPoint, false, false);
                break;
            case 'doubleArrow':
                this.drawArrowLine(this.ctx, this.startPoint, this.endPoint, true, false);
                break;
            case 'rectangle':
                this.drawRectangleWithStyle(this.ctx, this.startPoint, this.endPoint, false);
                break;
            case 'circle':
                this.drawCircleWithStyle(this.ctx, this.startPoint, this.endPoint, false);
                break;
            case 'ellipse':
                this.drawEllipseWithStyle(this.ctx, this.startPoint, this.endPoint, false);
                break;
            case 'triangle':
            case 'diamond':
                this.drawPolygonWithStyle(
                    this.ctx,
                    this.getShapeSelectionPoints(this.currentShape, this.startPoint, this.endPoint),
                    false
                );
                break;
        }

        // Reset context
        this.ctx.globalAlpha = 1.0;
        this.ctx.setLineDash([]);
    }

    createStoredShapeStroke() {
        if (!this.startPoint || !this.endPoint || !this.drawingEngine) return null;

        return {
            points: this.getShapeSelectionPoints(this.currentShape, this.startPoint, this.endPoint),
            color: this.drawingEngine.currentColor,
            size: this.drawingEngine.penSize,
            penType: this.drawingEngine.penType,
            tool: 'pen',
            lineStyle: this.lineStyle,
            dashDensity: this.dashDensity,
            rotation: 0,
            layerOrder: this.drawingEngine.getNextLayerOrder(),
            objectId: this.drawingEngine.getNextObjectId(),
            groupId: null,
            renderMode: 'shape',
            shapeType: this.currentShape,
            shapeStart: { ...this.startPoint },
            shapeEnd: { ...this.endPoint },
            shapeLineStyle: this.lineStyle,
            shapeDashDensity: this.dashDensity,
            shapeWaveDensity: this.waveDensity,
            shapeMultiLineCount: this.multiLineCount,
            shapeMultiLineSpacing: this.multiLineSpacing,
            arrowSize: this.arrowSize
        };
    }

    getShapeSelectionPoints(shapeType, start, end) {
        if (!start || !end) return [];

        switch (shapeType) {
            case 'rectangle': {
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const width = Math.abs(end.x - start.x);
                const height = Math.abs(end.y - start.y);
                return [
                    { x, y },
                    { x: x + width, y },
                    { x: x + width, y: y + height },
                    { x, y: y + height },
                    { x, y }
                ];
            }
            case 'circle': {
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                return this.sampleEllipsePoints(start, radius, radius, 32, true);
            }
            case 'ellipse': {
                const radiusX = Math.abs(end.x - start.x);
                const radiusY = Math.abs(end.y - start.y);
                return this.sampleEllipsePoints(start, radiusX, radiusY, 36, true);
            }
            case 'triangle': {
                const minX = Math.min(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxX = Math.max(start.x, end.x);
                const maxY = Math.max(start.y, end.y);
                const midX = (minX + maxX) / 2;
                return [
                    { x: midX, y: minY },
                    { x: maxX, y: maxY },
                    { x: minX, y: maxY },
                    { x: midX, y: minY }
                ];
            }
            case 'diamond': {
                const minX = Math.min(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxX = Math.max(start.x, end.x);
                const maxY = Math.max(start.y, end.y);
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;
                return [
                    { x: midX, y: minY },
                    { x: maxX, y: midY },
                    { x: midX, y: maxY },
                    { x: minX, y: midY },
                    { x: midX, y: minY }
                ];
            }
            case 'arrow':
            case 'doubleArrow':
            case 'line':
            default:
                return [
                    { x: start.x, y: start.y },
                    { x: end.x, y: end.y }
                ];
        }
    }

    sampleEllipsePoints(center, radiusX, radiusY, segments = 32, closePath = false) {
        const points = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: center.x + Math.cos(angle) * radiusX,
                y: center.y + Math.sin(angle) * radiusY
            });
        }
        if (closePath && points.length) {
            points.push({ ...points[0] });
        }
        return points;
    }

    applyStoredShapeSettings(stroke) {
        if (!stroke) return;
        this.lineStyle = stroke.shapeLineStyle || stroke.lineStyle || 'solid';
        this.dashDensity = stroke.shapeDashDensity || stroke.dashDensity || 10;
        this.waveDensity = stroke.shapeWaveDensity || this.waveDensity;
        this.multiLineCount = stroke.shapeMultiLineCount || this.multiLineCount;
        this.multiLineSpacing = stroke.shapeMultiLineSpacing || this.multiLineSpacing;
        this.arrowSize = stroke.arrowSize || this.arrowSize;
    }

    drawStoredShapeOnContext(ctx, stroke) {
        if (!ctx || !stroke) return;

        const fallbackStart = stroke.points?.[0] || stroke.shapeStart;
        const fallbackEnd = stroke.points?.[stroke.points.length - 1] || stroke.shapeEnd;
        if (!fallbackStart || !fallbackEnd) return;

        const previousSettings = {
            lineStyle: this.lineStyle,
            dashDensity: this.dashDensity,
            waveDensity: this.waveDensity,
            multiLineCount: this.multiLineCount,
            multiLineSpacing: this.multiLineSpacing,
            arrowSize: this.arrowSize,
            enginePenSize: this.drawingEngine ? this.drawingEngine.penSize : null
        };

        this.applyStoredShapeSettings(stroke);
        if (this.drawingEngine && Number.isFinite(stroke.size)) {
            // Wavy amplitude derives from the engine pen size, so use the stored stroke size.
            this.drawingEngine.penSize = stroke.size;
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.setLineDash([]);

        switch (stroke.penType) {
            case 'pencil':
                ctx.globalAlpha = 0.7;
                break;
            case 'ballpoint':
                ctx.globalAlpha = 0.9;
                break;
            case 'fountain':
                ctx.globalAlpha = 1.0;
                break;
            case 'brush':
                ctx.globalAlpha = 0.85;
                ctx.lineWidth = stroke.size * 1.5;
                break;
            case 'marker':
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = stroke.size * 2.2;
                ctx.lineCap = 'square';
                break;
            default:
                ctx.globalAlpha = 1.0;
                break;
        }

        this.applyLineStyle(ctx);

        const styledShapeLineStyles = ['wavy', 'double', 'triple', 'multi', 'arrow', 'doubleArrow'];

        if (stroke.shapeType === 'arrow' || stroke.shapeType === 'doubleArrow') {
            this.drawArrowLine(ctx, fallbackStart, fallbackEnd, stroke.shapeType === 'doubleArrow', false);
        } else if (
            (stroke.shapeType === 'triangle' || stroke.shapeType === 'diamond')
            && styledShapeLineStyles.includes(this.lineStyle)
            && Array.isArray(stroke.points) && stroke.points.length > 2
        ) {
            // Polygon vertices already carry any move/resize/rotation, so
            // restyle directly from them instead of deriving start/end geometry.
            this.drawPolygonWithStyle(ctx, stroke.points, false);
        } else if (stroke.shapeType && styledShapeLineStyles.includes(this.lineStyle)) {
            // Re-run the final drawing path so wavy/double/triple/multi (and
            // arrow line styles) survive redraw instead of collapsing to a
            // plain outline. Geometry is derived from the current points so
            // moved/resized shapes stay in place.
            const geometry = this.getStoredShapeGeometry(stroke, fallbackStart, fallbackEnd);
            const drawWithGeometry = () => {
                switch (stroke.shapeType) {
                    case 'rectangle':
                        this.drawRectangleWithStyle(ctx, geometry.start, geometry.end, false);
                        break;
                    case 'circle':
                    case 'ellipse':
                        // drawEllipseWithStyle renders a circle when both radii match.
                        this.drawEllipseWithStyle(ctx, geometry.start, geometry.end, false);
                        break;
                    default:
                        this.drawLineWithStyle(ctx, geometry.start, geometry.end, false);
                        break;
                }
            };

            if (geometry.transform && typeof ctx.transform === 'function') {
                ctx.save();
                ctx.transform(
                    geometry.transform.a,
                    geometry.transform.b,
                    geometry.transform.c,
                    geometry.transform.d,
                    geometry.transform.e,
                    geometry.transform.f
                );
                drawWithGeometry();
                ctx.restore();
            } else {
                drawWithGeometry();
            }
        } else if (Array.isArray(stroke.points) && stroke.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            if (stroke.shapeType !== 'line') {
                ctx.closePath();
            }
            ctx.stroke();
        } else {
            this.drawLineWithStyle(ctx, fallbackStart, fallbackEnd, false);
        }

        ctx.restore();
        this.lineStyle = previousSettings.lineStyle;
        this.dashDensity = previousSettings.dashDensity;
        this.waveDensity = previousSettings.waveDensity;
        this.multiLineCount = previousSettings.multiLineCount;
        this.multiLineSpacing = previousSettings.multiLineSpacing;
        this.arrowSize = previousSettings.arrowSize;
        if (this.drawingEngine && previousSettings.enginePenSize !== null) {
            this.drawingEngine.penSize = previousSettings.enginePenSize;
        }
    }

    /**
     * Derive the start/end (or center/edge) geometry for redrawing a stored
     * shape from its current points, so shapes that were moved or resized
     * keep their position. Falls back to the provided points when the
     * geometry cannot be derived.
     */
    getStoredShapeGeometry(stroke, fallbackStart, fallbackEnd) {
        const points = Array.isArray(stroke.points) ? stroke.points : [];

        if (stroke.shapeType === 'rectangle' && points.length >= 4) {
            const origin = points[0];
            const widthVector = {
                x: points[1].x - origin.x,
                y: points[1].y - origin.y
            };
            const heightVector = {
                x: points[3].x - origin.x,
                y: points[3].y - origin.y
            };
            const width = Math.hypot(widthVector.x, widthVector.y);
            const height = Math.hypot(heightVector.x, heightVector.y);

            if (width > 0.001 && height > 0.001) {
                return {
                    start: { x: 0, y: 0 },
                    end: { x: width, y: height },
                    transform: {
                        a: widthVector.x / width,
                        b: widthVector.y / width,
                        c: heightVector.x / height,
                        d: heightVector.y / height,
                        e: origin.x,
                        f: origin.y
                    }
                };
            }
        }

        if ((stroke.shapeType === 'circle' || stroke.shapeType === 'ellipse') && points.length >= 8) {
            const isClosed = Math.hypot(
                points[0].x - points[points.length - 1].x,
                points[0].y - points[points.length - 1].y
            ) < 0.001;
            const perimeter = isClosed ? points.slice(0, -1) : points;
            const segmentCount = perimeter.length;

            if (segmentCount >= 8) {
                const right = perimeter[0];
                const bottom = perimeter[Math.round(segmentCount / 4) % segmentCount];
                const left = perimeter[Math.round(segmentCount / 2) % segmentCount];
                const top = perimeter[Math.round(segmentCount * 3 / 4) % segmentCount];
                const center = {
                    x: (right.x + bottom.x + left.x + top.x) / 4,
                    y: (right.y + bottom.y + left.y + top.y) / 4
                };
                const radiusXVector = {
                    x: (right.x - left.x) / 2,
                    y: (right.y - left.y) / 2
                };
                const radiusYVector = {
                    x: (bottom.x - top.x) / 2,
                    y: (bottom.y - top.y) / 2
                };
                const radiusX = Math.hypot(radiusXVector.x, radiusXVector.y);
                const radiusY = Math.hypot(radiusYVector.x, radiusYVector.y);

                if (radiusX > 0.001 && radiusY > 0.001) {
                    return {
                        start: { x: 0, y: 0 },
                        end: { x: radiusX, y: radiusY },
                        transform: {
                            a: radiusXVector.x / radiusX,
                            b: radiusXVector.y / radiusX,
                            c: radiusYVector.x / radiusY,
                            d: radiusYVector.y / radiusY,
                            e: center.x,
                            f: center.y
                        }
                    };
                }
            }
        }

        if ((stroke.shapeType === 'rectangle' || stroke.shapeType === 'circle' || stroke.shapeType === 'ellipse') && points.length > 1) {
            let minX = points[0].x;
            let minY = points[0].y;
            let maxX = points[0].x;
            let maxY = points[0].y;
            for (const point of points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
            if (stroke.shapeType === 'rectangle') {
                return { start: { x: minX, y: minY }, end: { x: maxX, y: maxY } };
            }
            // circle/ellipse: center plus an edge point encoding both radii
            return {
                start: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
                end: { x: maxX, y: maxY }
            };
        }

        if (points.length > 1) {
            return { start: points[0], end: points[points.length - 1] };
        }

        return { start: fallbackStart, end: fallbackEnd };
    }

    buildSvgShapeMarkup(stroke) {
        if (!stroke) return '';

        const fallbackStart = stroke.points?.[0] || stroke.shapeStart;
        const fallbackEnd = stroke.points?.[stroke.points.length - 1] || stroke.shapeEnd;
        if (!fallbackStart || !fallbackEnd) return '';

        const previousSettings = {
            lineStyle: this.lineStyle,
            dashDensity: this.dashDensity,
            waveDensity: this.waveDensity,
            multiLineCount: this.multiLineCount,
            multiLineSpacing: this.multiLineSpacing,
            arrowSize: this.arrowSize
        };

        this.applyStoredShapeSettings(stroke);

        const strokeColor = String(stroke.color || '#000000')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const appearance = {
            lineWidth: stroke.size,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        };

        switch (stroke.penType) {
            case 'pencil':
                appearance.opacity = 0.7;
                break;
            case 'ballpoint':
                appearance.opacity = 0.9;
                break;
            case 'brush':
                appearance.opacity = 0.85;
                appearance.lineWidth = stroke.size * 1.5;
                break;
            case 'marker':
                appearance.opacity = 0.45;
                appearance.lineWidth = stroke.size * 2.2;
                appearance.lineCap = 'square';
                break;
            default:
                break;
        }

        const dashPattern = this.lineStyle === 'dashed'
            ? `${Math.max(2, 400 / Math.max(1, this.dashDensity))} ${Math.max(2, 400 / Math.max(1, this.dashDensity)) * 0.6}`
            : this.lineStyle === 'dotted'
                ? `2 ${Math.max(2, 400 / Math.max(1, this.dashDensity)) * 0.6}`
                : '';
        const dashMarkup = dashPattern ? ` stroke-dasharray="${dashPattern}"` : '';

        let markup = '';
        if (stroke.shapeType === 'arrow' || stroke.shapeType === 'doubleArrow') {
            markup = this.buildSvgArrowMarkup({
                ...stroke,
                shapeStart: fallbackStart,
                shapeEnd: fallbackEnd
            }, strokeColor, appearance);
        } else {
            const points = (stroke.points && stroke.points.length > 1)
                ? stroke.points
                : this.getShapeSelectionPoints(stroke.shapeType, fallbackStart, fallbackEnd);
            const pathData = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
            const closeCommand = stroke.shapeType !== 'line' ? ' Z' : '';
            markup = `<path d="${pathData}${closeCommand}" fill="none" stroke="${strokeColor}" stroke-width="${appearance.lineWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="${appearance.opacity}"${dashMarkup} />`;
        }

        this.lineStyle = previousSettings.lineStyle;
        this.dashDensity = previousSettings.dashDensity;
        this.waveDensity = previousSettings.waveDensity;
        this.multiLineCount = previousSettings.multiLineCount;
        this.multiLineSpacing = previousSettings.multiLineSpacing;
        this.arrowSize = previousSettings.arrowSize;

        return markup;
    }

    buildSvgArrowMarkup(stroke, strokeColor, appearance) {
        const start = stroke.shapeStart;
        const end = stroke.shapeEnd;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.001) return '';

        const nx = dx / length;
        const ny = dy / length;
        const arrowSize = stroke.arrowSize || this.arrowSize;
        const arrowAngle = this.ARROW_ANGLE;
        const lineOffset = this.ARROW_LINE_OFFSET;

        const dashPattern = this.lineStyle === 'dashed'
            ? `${Math.max(2, 400 / Math.max(1, this.dashDensity))} ${Math.max(2, 400 / Math.max(1, this.dashDensity)) * 0.6}`
            : this.lineStyle === 'dotted'
                ? `2 ${Math.max(2, 400 / Math.max(1, this.dashDensity)) * 0.6}`
                : '';
        const dashMarkup = dashPattern ? ` stroke-dasharray="${dashPattern}"` : '';

        const endArrowBase = {
            x: end.x - nx * arrowSize * lineOffset,
            y: end.y - ny * arrowSize * lineOffset
        };
        const endArrowLeft = {
            x: end.x - nx * arrowSize * Math.cos(arrowAngle) - ny * arrowSize * Math.sin(arrowAngle),
            y: end.y - ny * arrowSize * Math.cos(arrowAngle) + nx * arrowSize * Math.sin(arrowAngle)
        };
        const endArrowRight = {
            x: end.x - nx * arrowSize * Math.cos(arrowAngle) + ny * arrowSize * Math.sin(arrowAngle),
            y: end.y - ny * arrowSize * Math.cos(arrowAngle) - nx * arrowSize * Math.sin(arrowAngle)
        };

        let lineStart = start;
        if (stroke.shapeType === 'doubleArrow') {
            lineStart = {
                x: start.x + nx * arrowSize * lineOffset,
                y: start.y + ny * arrowSize * lineOffset
            };
        }

        const parts = [
            `<path d="M ${lineStart.x} ${lineStart.y} L ${endArrowBase.x} ${endArrowBase.y}" fill="none" stroke="${strokeColor}" stroke-width="${appearance.lineWidth}" stroke-linecap="${appearance.lineCap}" stroke-linejoin="${appearance.lineJoin}" stroke-opacity="${appearance.opacity}"${dashMarkup} />`,
            `<path d="M ${end.x} ${end.y} L ${endArrowLeft.x} ${endArrowLeft.y} L ${endArrowRight.x} ${endArrowRight.y} Z" fill="${strokeColor}" fill-opacity="${appearance.opacity}" />`
        ];

        if (stroke.shapeType === 'doubleArrow') {
            const startArrowLeft = {
                x: start.x + nx * arrowSize * Math.cos(arrowAngle) - ny * arrowSize * Math.sin(arrowAngle),
                y: start.y + ny * arrowSize * Math.cos(arrowAngle) + nx * arrowSize * Math.sin(arrowAngle)
            };
            const startArrowRight = {
                x: start.x + nx * arrowSize * Math.cos(arrowAngle) + ny * arrowSize * Math.sin(arrowAngle),
                y: start.y + ny * arrowSize * Math.cos(arrowAngle) - nx * arrowSize * Math.sin(arrowAngle)
            };
            parts.push(`<path d="M ${start.x} ${start.y} L ${startArrowLeft.x} ${startArrowLeft.y} L ${startArrowRight.x} ${startArrowRight.y} Z" fill="${strokeColor}" fill-opacity="${appearance.opacity}" />`);
        }

        return `<g>${parts.join('')}</g>`;
    }
    
    drawLineWithStyle(ctx, start, end, isPreview = false) {
        if (!start || !end) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyLine(ctx, start, end, isPreview);
                break;
            case 'double':
                this.drawMultiLine(ctx, start, end, 2, isPreview);
                break;
            case 'triple':
                this.drawMultiLine(ctx, start, end, 3, isPreview);
                break;
            case 'multi':
                this.drawMultiLine(ctx, start, end, this.multiLineCount, isPreview);
                break;
            case 'arrow':
                this.drawArrowLine(ctx, start, end, false, isPreview);
                break;
            case 'doubleArrow':
                this.drawArrowLine(ctx, start, end, true, isPreview);
                break;
            default:
                this.drawLine(ctx, start, end);
                break;
        }
    }
    
    /**
     * Draw a closed polygon (triangle, diamond, ...) with the current line
     * style. `points` is an ordered vertex list; a closing vertex equal to
     * the first is optional.
     */
    drawPolygonWithStyle(ctx, points, isPreview = false) {
        if (!ctx || !Array.isArray(points) || points.length < 3) return;

        const closed = Math.hypot(
            points[0].x - points[points.length - 1].x,
            points[0].y - points[points.length - 1].y
        ) < 0.001;
        const vertices = closed ? points.slice(0, -1) : points;
        if (vertices.length < 3) return;

        const edges = vertices.map((vertex, index) => [
            vertex,
            vertices[(index + 1) % vertices.length]
        ]);

        switch (this.lineStyle) {
            case 'wavy':
                for (const [from, to] of edges) {
                    this.drawWavyLine(ctx, from, to, isPreview);
                }
                break;
            case 'double':
            case 'triple':
            case 'multi': {
                const count = this.lineStyle === 'double'
                    ? 2
                    : this.lineStyle === 'triple' ? 3 : this.multiLineCount;
                const spacing = this.multiLineSpacing || 4;
                const centroid = vertices.reduce(
                    (acc, vertex) => ({ x: acc.x + vertex.x / vertices.length, y: acc.y + vertex.y / vertices.length }),
                    { x: 0, y: 0 }
                );
                for (let ring = 0; ring < count; ring++) {
                    ctx.beginPath();
                    vertices.forEach((vertex, index) => {
                        const dx = vertex.x - centroid.x;
                        const dy = vertex.y - centroid.y;
                        const distance = Math.hypot(dx, dy);
                        const inset = Math.min(ring * spacing, Math.max(0, distance - 1));
                        const scale = distance > 0.001 ? (distance - inset) / distance : 1;
                        const x = centroid.x + dx * scale;
                        const y = centroid.y + dy * scale;
                        if (index === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.closePath();
                    ctx.stroke();
                }
                break;
            }
            default:
                ctx.beginPath();
                vertices.forEach((vertex, index) => {
                    if (index === 0) ctx.moveTo(vertex.x, vertex.y);
                    else ctx.lineTo(vertex.x, vertex.y);
                });
                ctx.closePath();
                ctx.stroke();
                break;
        }
    }

    drawRectangleWithStyle(ctx, start, end, isPreview = false) {
        if (!start || !end) return;
        
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        switch(this.lineStyle) {
            case 'wavy':
                // Draw wavy rectangle (4 wavy lines)
                this.drawWavyLine(ctx, {x: x, y: y}, {x: x + width, y: y}, isPreview); // top
                this.drawWavyLine(ctx, {x: x + width, y: y}, {x: x + width, y: y + height}, isPreview); // right
                this.drawWavyLine(ctx, {x: x + width, y: y + height}, {x: x, y: y + height}, isPreview); // bottom
                this.drawWavyLine(ctx, {x: x, y: y + height}, {x: x, y: y}, isPreview); // left
                break;
            case 'double':
            case 'triple':
                const count = this.lineStyle === 'double' ? 2 : 3;
                this.drawMultiRectangle(ctx, x, y, width, height, count, isPreview);
                break;
            case 'multi':
                this.drawMultiRectangle(ctx, x, y, width, height, this.multiLineCount, isPreview);
                break;
            default:
                ctx.beginPath();
                ctx.rect(x, y, width, height);
                ctx.stroke();
                break;
        }
    }
    
    /**
     * Draw circle with various line styles
     * Circle is drawn from center point outward to edge (radius)
     */
    drawCircleWithStyle(ctx, center, edge, isPreview = false) {
        if (!center || !edge) return;
        
        // Calculate radius from center to edge point
        const dx = edge.x - center.x;
        const dy = edge.y - center.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        if (radius < 2) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyCircle(ctx, center, radius, isPreview);
                break;
            case 'double':
                this.drawMultiCircle(ctx, center, radius, 2, isPreview);
                break;
            case 'triple':
                this.drawMultiCircle(ctx, center, radius, 3, isPreview);
                break;
            case 'multi':
                this.drawMultiCircle(ctx, center, radius, this.multiLineCount, isPreview);
                break;
            default:
                // Solid, dashed, dotted - use standard arc
                ctx.beginPath();
                ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }
    
    /**
     * Draw wavy circle using bezier curves
     */
    drawWavyCircle(ctx, center, radius, isPreview = false) {
        // For preview, scale the wave parameters to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const waveAmplitude = this.drawingEngine.penSize * 1.2 * scaleFactor;
        const waveDensity = this.waveDensity * scaleFactor;
        const numWaves = Math.max(12, Math.floor(radius * Math.PI * 2 / waveDensity));
        
        ctx.beginPath();
        
        for (let i = 0; i <= numWaves; i++) {
            const angle = (i / numWaves) * Math.PI * 2;
            const nextAngle = ((i + 1) / numWaves) * Math.PI * 2;
            
            // Alternate wave amplitude
            const waveOffset = (i % 2 === 0) ? waveAmplitude : -waveAmplitude;
            const currentRadius = radius + waveOffset;
            
            const x = center.x + Math.cos(angle) * currentRadius;
            const y = center.y + Math.sin(angle) * currentRadius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                // Calculate control point
                const midAngle = (angle + ((i - 1) / numWaves) * Math.PI * 2) / 2;
                const prevWaveOffset = ((i - 1) % 2 === 0) ? waveAmplitude : -waveAmplitude;
                const midRadius = radius + (waveOffset + prevWaveOffset) / 2;
                const cpX = center.x + Math.cos(midAngle) * midRadius;
                const cpY = center.y + Math.sin(midAngle) * midRadius;
                
                ctx.quadraticCurveTo(cpX, cpY, x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
    
    /**
     * Draw multiple concentric circles (for double/triple line style)
     */
    drawMultiCircle(ctx, center, radius, count, isPreview = false) {
        // For preview, scale the spacing to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const spacing = this.multiLineSpacing * scaleFactor;
        const totalSpacing = (count - 1) * spacing;
        const startOffset = -totalSpacing / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            const circleRadius = Math.max(1, radius + offset);
            
            ctx.beginPath();
            ctx.arc(center.x, center.y, circleRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawLine(ctx, start, end) {
        if (!start || !end) return;
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    /**
     * Draw an arrow line (with arrowhead at end, optionally at start too)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} start - Start point {x, y}
     * @param {Object} end - End point {x, y}
     * @param {boolean} isDouble - Whether to draw arrowheads at both ends
     * @param {boolean} isPreview - Whether this is a preview drawing (needs scaling)
     */
    drawArrowLine(ctx, start, end, isDouble, isPreview = false) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 0.001) return; // Use epsilon for floating point comparison
        
        // Normalize direction
        const nx = dx / length;
        const ny = dy / length;
        
        // Use independent arrow size setting
        // Apply preview scale factor to match what will appear on the final canvas
        const arrowSize = this.arrowSize * this.getPreviewScaleFactor(isPreview);
        const arrowAngle = this.ARROW_ANGLE;
        const lineOffset = this.ARROW_LINE_OFFSET;
        
        // End arrow
        const endArrowBase = {
            x: end.x - nx * arrowSize * lineOffset,
            y: end.y - ny * arrowSize * lineOffset
        };
        
        const endArrowLeft = {
            x: end.x - nx * arrowSize * Math.cos(arrowAngle) - ny * arrowSize * Math.sin(arrowAngle),
            y: end.y - ny * arrowSize * Math.cos(arrowAngle) + nx * arrowSize * Math.sin(arrowAngle)
        };
        
        const endArrowRight = {
            x: end.x - nx * arrowSize * Math.cos(arrowAngle) + ny * arrowSize * Math.sin(arrowAngle),
            y: end.y - ny * arrowSize * Math.cos(arrowAngle) - nx * arrowSize * Math.sin(arrowAngle)
        };
        
        // Draw main line (shortened to accommodate arrow heads)
        ctx.beginPath();
        if (isDouble) {
            ctx.moveTo(start.x + nx * arrowSize * lineOffset, start.y + ny * arrowSize * lineOffset);
        } else {
            ctx.moveTo(start.x, start.y);
        }
        ctx.lineTo(endArrowBase.x, endArrowBase.y);
        ctx.stroke();
        
        // Draw end arrow head (filled triangle)
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(endArrowLeft.x, endArrowLeft.y);
        ctx.lineTo(endArrowRight.x, endArrowRight.y);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        
        // Draw start arrow head if double arrow
        if (isDouble) {
            const startArrowLeft = {
                x: start.x + nx * arrowSize * Math.cos(arrowAngle) - ny * arrowSize * Math.sin(arrowAngle),
                y: start.y + ny * arrowSize * Math.cos(arrowAngle) + nx * arrowSize * Math.sin(arrowAngle)
            };
            
            const startArrowRight = {
                x: start.x + nx * arrowSize * Math.cos(arrowAngle) + ny * arrowSize * Math.sin(arrowAngle),
                y: start.y + ny * arrowSize * Math.cos(arrowAngle) - nx * arrowSize * Math.sin(arrowAngle)
            };
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(startArrowLeft.x, startArrowLeft.y);
            ctx.lineTo(startArrowRight.x, startArrowRight.y);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    drawWavyLine(ctx, start, end, isPreview = false) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Calculate wave parameters
        // For preview, scale the wave parameters to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const waveLength = this.waveDensity * scaleFactor;
        const waveAmplitude = this.drawingEngine.penSize * 1.5 * scaleFactor;
        const numSegments = Math.max(4, Math.floor(length / (waveLength / 2)));
        
        // Calculate perpendicular direction for wave offset
        const perpX = -dy / length;
        const perpY = dx / length;
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        
        // Draw smooth sine wave using quadratic curves
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            const x = start.x + dx * t;
            const y = start.y + dy * t;
            
            // Calculate wave offset using sine function
            const waveOffset = Math.sin(t * Math.PI * (length / waveLength)) * waveAmplitude;
            
            // Calculate control point for smooth curve
            const prevT = (i - 0.5) / numSegments;
            const cpX = start.x + dx * prevT + perpX * waveOffset;
            const cpY = start.y + dy * prevT + perpY * waveOffset;
            
            ctx.quadraticCurveTo(cpX, cpY, x + perpX * waveOffset * 0.5, y + perpY * waveOffset * 0.5);
        }
        
        // Draw final segment to end point
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    drawMultiLine(ctx, start, end, count, isPreview = false) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Calculate perpendicular direction
        const perpX = -dy / length;
        const perpY = dx / length;
        
        // For preview, scale the spacing to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const spacing = this.multiLineSpacing * scaleFactor;
        const totalWidth = (count - 1) * spacing;
        const startOffset = -totalWidth / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            ctx.beginPath();
            ctx.moveTo(start.x + perpX * offset, start.y + perpY * offset);
            ctx.lineTo(end.x + perpX * offset, end.y + perpY * offset);
            ctx.stroke();
        }
    }
    
    drawMultiRectangle(ctx, x, y, width, height, count, isPreview = false) {
        // For preview, scale the spacing to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const spacing = this.multiLineSpacing * scaleFactor;
        const totalOffset = (count - 1) * spacing;
        const startOffset = -totalOffset / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            ctx.beginPath();
            ctx.rect(
                x - offset,
                y - offset,
                width + offset * 2,
                height + offset * 2
            );
            ctx.stroke();
        }
    }
    
    /**
     * Draw ellipse with various line styles
     * Ellipse is drawn from center point outward to edge (defines radii)
     */
    drawEllipseWithStyle(ctx, center, edge, isPreview = false) {
        if (!center || !edge) return;
        
        // Calculate radii from center to edge point
        const radiusX = Math.abs(edge.x - center.x);
        const radiusY = Math.abs(edge.y - center.y);
        
        if (radiusX < 2 && radiusY < 2) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyEllipse(ctx, center, radiusX, radiusY, isPreview);
                break;
            case 'double':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, 2, isPreview);
                break;
            case 'triple':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, 3, isPreview);
                break;
            case 'multi':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, this.multiLineCount, isPreview);
                break;
            default:
                // Solid, dashed, dotted - use standard ellipse
                ctx.beginPath();
                ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }
    
    /**
     * Draw wavy ellipse using bezier curves
     */
    drawWavyEllipse(ctx, center, radiusX, radiusY, isPreview = false) {
        // For preview, scale the wave parameters to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const waveAmplitude = this.drawingEngine.penSize * 1.2 * scaleFactor;
        const waveDensity = this.waveDensity * scaleFactor;
        const avgRadius = (radiusX + radiusY) / 2;
        const numWaves = Math.max(12, Math.floor(avgRadius * Math.PI * 2 / waveDensity));
        
        ctx.beginPath();
        
        for (let i = 0; i <= numWaves; i++) {
            const angle = (i / numWaves) * Math.PI * 2;
            
            // Alternate wave amplitude
            const waveOffset = (i % 2 === 0) ? waveAmplitude : -waveAmplitude;
            const currentRadiusX = radiusX + waveOffset;
            const currentRadiusY = radiusY + waveOffset;
            
            const x = center.x + Math.cos(angle) * currentRadiusX;
            const y = center.y + Math.sin(angle) * currentRadiusY;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                // Calculate control point
                const midAngle = (angle + ((i - 1) / numWaves) * Math.PI * 2) / 2;
                const prevWaveOffset = ((i - 1) % 2 === 0) ? waveAmplitude : -waveAmplitude;
                const midRadiusX = radiusX + (waveOffset + prevWaveOffset) / 2;
                const midRadiusY = radiusY + (waveOffset + prevWaveOffset) / 2;
                const cpX = center.x + Math.cos(midAngle) * midRadiusX;
                const cpY = center.y + Math.sin(midAngle) * midRadiusY;
                
                ctx.quadraticCurveTo(cpX, cpY, x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
    
    /**
     * Draw multiple concentric ellipses (for double/triple line style)
     */
    drawMultiEllipse(ctx, center, radiusX, radiusY, count, isPreview = false) {
        // For preview, scale the spacing to match the final drawing
        const scaleFactor = this.getPreviewScaleFactor(isPreview);
        const spacing = this.multiLineSpacing * scaleFactor;
        const totalSpacing = (count - 1) * spacing;
        const startOffset = -totalSpacing / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            const ellipseRadiusX = Math.max(1, radiusX + offset);
            const ellipseRadiusY = Math.max(1, radiusY + offset);
            
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, ellipseRadiusX, ellipseRadiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Cleanup
    destroy() {
        // Cancel any pending animation frame
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.previewCanvas && this.previewCanvas.parentNode) {
            this.previewCanvas.parentNode.removeChild(this.previewCanvas);
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ShapeDrawingManager = ShapeDrawingManager;
    window.AboardShapeDrawingManager = ShapeDrawingManager;
}
