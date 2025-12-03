// Shape Drawing Module
// Handles drawing shapes (line, rectangle, circle, etc.) on the canvas
// Uses the same properties as the pen tool (color, size, pen type)

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
        this.ARROW_SIZE_MAX_SETTING = 50; // Maximum configurable arrow size
        
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
        
        // Create preview canvas for live shape preview
        this.createPreviewCanvas();
        
        // Load saved settings
        this.loadSettings();
    }
    
    loadSettings() {
        this.lineStyle = localStorage.getItem('shapeLineStyle') || 'solid';
        this.dashDensity = parseInt(localStorage.getItem('shapeDashDensity')) || 10;
        this.waveDensity = parseInt(localStorage.getItem('shapeWaveDensity')) || 10;
        this.multiLineCount = parseInt(localStorage.getItem('shapeMultiLineCount')) || 2;
        this.multiLineSpacing = parseInt(localStorage.getItem('shapeMultiLineSpacing')) || 4;
        this.arrowSize = parseInt(localStorage.getItem('shapeArrowSize')) || this.ARROW_SIZE_DEFAULT;
    }
    
    saveSettings() {
        localStorage.setItem('shapeLineStyle', this.lineStyle);
        localStorage.setItem('shapeDashDensity', this.dashDensity);
        localStorage.setItem('shapeWaveDensity', this.waveDensity);
        localStorage.setItem('shapeMultiLineCount', this.multiLineCount);
        localStorage.setItem('shapeMultiLineSpacing', this.multiLineSpacing);
        localStorage.setItem('shapeArrowSize', this.arrowSize);
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
        this.dashDensity = Math.max(5, Math.min(40, density));
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
    
    createPreviewCanvas() {
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
    
    syncPreviewCanvas() {
        // Sync preview canvas size with main canvas position and size on screen
        const rect = this.canvas.getBoundingClientRect();
        const dpr = this.cachedDpr;
        
        // Calculate the CSS scale factor of the main canvas
        // This is the ratio of displayed size to actual size
        // Guard against division by zero when canvas is hidden
        const offsetWidth = this.canvas.offsetWidth;
        this.canvasCssScale = offsetWidth > 0 ? rect.width / offsetWidth : 1.0;
        
        // Only resize if dimensions actually changed (avoid expensive operations)
        // Note: Position is always updated after this block regardless of resize
        const needsResize = !this.lastCanvasRect ||
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
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    getCanvasPosition(e) {
        // Get position in canvas coordinate space for drawing on main canvas
        return this.drawingEngine.getPosition(e);
    }
    
    startDrawing(e) {
        this.isDrawing = true;
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
    }
    
    clearPreview() {
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
        ctx.strokeStyle = this.drawingEngine.shapeColor; // Use shapeColor
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
            case 'normal':
            default:
                ctx.globalAlpha = 1.0;
                break;
        }
        
        // For preview canvas: the context has setTransform(dpr, 0, 0, dpr, 0, 0) applied,
        // which scales all drawing operations including lineWidth. To match the final
        // drawing (which doesn't have this transform), we need to compensate by dividing
        // lineWidth by DPR when drawing on the preview canvas.
        if (isPreview) {
            lineWidth = lineWidth / this.cachedDpr;
        }
        
        ctx.lineWidth = lineWidth;
        
        // Apply line style
        this.applyLineStyle(ctx);
    }
    
    applyLineStyle(ctx) {
        ctx.setLineDash([]);
        
        switch(this.lineStyle) {
            case 'dashed':
                ctx.setLineDash([this.dashDensity, this.dashDensity / 2]);
                break;
            case 'dotted':
                ctx.setLineDash([2, this.dashDensity / 2]);
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
                this.drawLineWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint);
                break;
            case 'arrow':
                this.drawArrowLine(this.previewCtx, this.startScreenPoint, this.endScreenPoint, false);
                break;
            case 'doubleArrow':
                this.drawArrowLine(this.previewCtx, this.startScreenPoint, this.endScreenPoint, true);
                break;
            case 'rectangle':
                this.drawRectangleWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint);
                break;
            case 'circle':
                this.drawCircleWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint);
                break;
            case 'ellipse':
                this.drawEllipseWithStyle(this.previewCtx, this.startScreenPoint, this.endScreenPoint);
                break;
        }
        
        // Reset line dash
        this.previewCtx.setLineDash([]);
    }
    
    drawFinalShape() {
        this.setupDrawingContext(this.ctx, false);
        
        switch(this.currentShape) {
            case 'line':
                this.drawLineWithStyle(this.ctx, this.startPoint, this.endPoint);
                break;
            case 'arrow':
                this.drawArrowLine(this.ctx, this.startPoint, this.endPoint, false);
                break;
            case 'doubleArrow':
                this.drawArrowLine(this.ctx, this.startPoint, this.endPoint, true);
                break;
            case 'rectangle':
                this.drawRectangleWithStyle(this.ctx, this.startPoint, this.endPoint);
                break;
            case 'circle':
                this.drawCircleWithStyle(this.ctx, this.startPoint, this.endPoint);
                break;
            case 'ellipse':
                this.drawEllipseWithStyle(this.ctx, this.startPoint, this.endPoint);
                break;
        }
        
        // Reset context
        this.ctx.globalAlpha = 1.0;
        this.ctx.setLineDash([]);
    }
    
    drawLineWithStyle(ctx, start, end) {
        if (!start || !end) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyLine(ctx, start, end);
                break;
            case 'double':
                this.drawMultiLine(ctx, start, end, 2);
                break;
            case 'triple':
                this.drawMultiLine(ctx, start, end, 3);
                break;
            case 'multi':
                this.drawMultiLine(ctx, start, end, this.multiLineCount);
                break;
            case 'arrow':
                this.drawArrowLine(ctx, start, end, false);
                break;
            case 'doubleArrow':
                this.drawArrowLine(ctx, start, end, true);
                break;
            default:
                this.drawLine(ctx, start, end);
                break;
        }
    }
    
    drawRectangleWithStyle(ctx, start, end) {
        if (!start || !end) return;
        
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        switch(this.lineStyle) {
            case 'wavy':
                // Draw wavy rectangle (4 wavy lines)
                this.drawWavyLine(ctx, {x: x, y: y}, {x: x + width, y: y}); // top
                this.drawWavyLine(ctx, {x: x + width, y: y}, {x: x + width, y: y + height}); // right
                this.drawWavyLine(ctx, {x: x + width, y: y + height}, {x: x, y: y + height}); // bottom
                this.drawWavyLine(ctx, {x: x, y: y + height}, {x: x, y: y}); // left
                break;
            case 'double':
            case 'triple':
                const count = this.lineStyle === 'double' ? 2 : 3;
                this.drawMultiRectangle(ctx, x, y, width, height, count);
                break;
            case 'multi':
                this.drawMultiRectangle(ctx, x, y, width, height, this.multiLineCount);
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
    drawCircleWithStyle(ctx, center, edge) {
        if (!center || !edge) return;
        
        // Calculate radius from center to edge point
        const dx = edge.x - center.x;
        const dy = edge.y - center.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        if (radius < 2) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyCircle(ctx, center, radius);
                break;
            case 'double':
                this.drawMultiCircle(ctx, center, radius, 2);
                break;
            case 'triple':
                this.drawMultiCircle(ctx, center, radius, 3);
                break;
            case 'multi':
                this.drawMultiCircle(ctx, center, radius, this.multiLineCount);
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
    drawWavyCircle(ctx, center, radius) {
        const waveAmplitude = this.drawingEngine.penSize * 1.2;
        const numWaves = Math.max(12, Math.floor(radius * Math.PI * 2 / this.waveDensity));
        
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
    drawMultiCircle(ctx, center, radius, count) {
        const totalSpacing = (count - 1) * this.multiLineSpacing;
        const startOffset = -totalSpacing / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * this.multiLineSpacing;
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
     */
    drawArrowLine(ctx, start, end, isDouble) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 0.001) return; // Use epsilon for floating point comparison
        
        // Normalize direction
        const nx = dx / length;
        const ny = dy / length;
        
        // Use independent arrow size setting
        const arrowSize = this.arrowSize;
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
    
    drawWavyLine(ctx, start, end) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Calculate wave parameters
        const waveLength = this.waveDensity;
        const waveAmplitude = this.drawingEngine.penSize * 1.5;
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
    
    drawMultiLine(ctx, start, end, count) {
        if (!start || !end) return;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Calculate perpendicular direction
        const perpX = -dy / length;
        const perpY = dx / length;
        
        const totalWidth = (count - 1) * this.multiLineSpacing;
        const startOffset = -totalWidth / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * this.multiLineSpacing;
            ctx.beginPath();
            ctx.moveTo(start.x + perpX * offset, start.y + perpY * offset);
            ctx.lineTo(end.x + perpX * offset, end.y + perpY * offset);
            ctx.stroke();
        }
    }
    
    drawMultiRectangle(ctx, x, y, width, height, count) {
        const totalOffset = (count - 1) * this.multiLineSpacing;
        const startOffset = -totalOffset / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * this.multiLineSpacing;
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
    drawEllipseWithStyle(ctx, center, edge) {
        if (!center || !edge) return;
        
        // Calculate radii from center to edge point
        const radiusX = Math.abs(edge.x - center.x);
        const radiusY = Math.abs(edge.y - center.y);
        
        if (radiusX < 2 && radiusY < 2) return;
        
        switch(this.lineStyle) {
            case 'wavy':
                this.drawWavyEllipse(ctx, center, radiusX, radiusY);
                break;
            case 'double':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, 2);
                break;
            case 'triple':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, 3);
                break;
            case 'multi':
                this.drawMultiEllipse(ctx, center, radiusX, radiusY, this.multiLineCount);
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
    drawWavyEllipse(ctx, center, radiusX, radiusY) {
        const waveAmplitude = this.drawingEngine.penSize * 1.2;
        const avgRadius = (radiusX + radiusY) / 2;
        const numWaves = Math.max(12, Math.floor(avgRadius * Math.PI * 2 / this.waveDensity));
        
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
    drawMultiEllipse(ctx, center, radiusX, radiusY, count) {
        const totalSpacing = (count - 1) * this.multiLineSpacing;
        const startOffset = -totalSpacing / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * this.multiLineSpacing;
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
}
