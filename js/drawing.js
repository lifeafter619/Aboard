// Drawing Engine Module
// Handles all drawing operations, pen types, and canvas interactions

class DrawingEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Drawing state
        this.isDrawing = false;
        this.currentColor = '#000000';
        this.penSize = 5;
        this.penType = localStorage.getItem('penType') || 'normal';
        this.eraserSize = 20;
        this.eraserShape = localStorage.getItem('eraserShape') || 'circle';
        this.currentTool = 'pen';
        
        // Line style settings for pen
        this.penLineStyle = localStorage.getItem('penLineStyle') || 'solid';
        this.penDashDensity = parseInt(localStorage.getItem('penDashDensity')) || 10;
        this.penMultiLineCount = parseInt(localStorage.getItem('penMultiLineCount')) || 2;
        this.penMultiLineSpacing = parseInt(localStorage.getItem('penMultiLineSpacing')) || 10;
        
        // Accumulated distance for dashed line drawing
        this.accumulatedDistance = 0;
        this.isInDash = true; // Track if we're in dash or gap phase
        
        // Multi-line tracking for smooth corners
        this.multiLineLastPerpX = 0;
        this.multiLineLastPerpY = 0;
        this.multiLineLastPoints = null; // Store last offset points for each line
        this.multiLinePendingPoint = null; // Accumulate short segments
        
        // Multi-line drawing constants
        this.MULTI_LINE_MIN_DISTANCE = 1.2; // Minimum distance threshold for multi-line drawing (balanced for smooth curves at slow speeds)
        this.MULTI_LINE_BLEND_MIN = 0.7; // Minimum blend factor for perpendicular smoothing
        this.MULTI_LINE_BLEND_MAX = 0.95; // Maximum blend factor
        this.MULTI_LINE_BLEND_SCALE = 50; // Scale factor for blend calculation
        
        // Drawing buffer
        this.points = [];
        this.lastPoint = null;
        
        // Edge drawing support
        this.edgeDrawingManager = null;
        this.isSnappedToEdge = false;
        
        // Stroke storage for selection
        this.strokes = [];
        this.selectedStrokeIndex = null;
        this.SELECTION_THRESHOLD = 10; // Distance threshold for stroke selection
        this.COPY_OFFSET = 20; // Offset for copied strokes
        
        // Canvas scaling and panning
        this.canvasScale = parseFloat(localStorage.getItem('canvasScale')) || 1.0;
        this.panOffset = { 
            x: parseFloat(localStorage.getItem('panOffsetX')) || 0, 
            y: parseFloat(localStorage.getItem('panOffsetY')) || 0 
        };
        this.isPanning = false;
        this.lastPanPoint = null;

        // Shape renderer (injected)
        this.shapeRenderer = null;

        // Coordinate mapper (injected for infinite canvas)
        this.coordinateMapper = null;
    }
    
    /**
     * Set the shape renderer (ShapeDrawingManager)
     */
    setShapeRenderer(renderer) {
        this.shapeRenderer = renderer;
    }

    /**
     * Set coordinate mapper function (screen -> world)
     */
    setCoordinateMapper(mapper) {
        this.coordinateMapper = mapper;
    }

    /**
     * Set the edge drawing manager for snapping to teaching tool edges
     */
    setEdgeDrawingManager(edgeDrawingManager) {
        this.edgeDrawingManager = edgeDrawingManager;
    }
    
    setPenLineStyle(style) {
        this.penLineStyle = style;
        localStorage.setItem('penLineStyle', style);
    }
    
    setPenDashDensity(density) {
        this.penDashDensity = Math.max(3, Math.min(30, density));
        localStorage.setItem('penDashDensity', this.penDashDensity);
    }
    
    setPenMultiLineCount(count) {
        this.penMultiLineCount = Math.max(2, Math.min(10, count));
        localStorage.setItem('penMultiLineCount', this.penMultiLineCount);
    }
    
    setPenMultiLineSpacing(spacing) {
        this.penMultiLineSpacing = Math.max(5, Math.min(50, spacing));
        localStorage.setItem('penMultiLineSpacing', this.penMultiLineSpacing);
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Standard Paged Mode logic (Screen/Canvas Pixel Coords)
        if (!this.coordinateMapper) {
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
        
        // Infinite Mode logic (Screen -> World)
        // coordinateMapper takes clientX, clientY and returns world {x, y}
        // It should handle offset relative to canvas logic internally if needed,
        // but typically mapped from raw client coordinates.
        // Or we pass relative coordinates?
        // Let's pass clientX/Y relative to canvas rect to be safe/consistent?
        // But getPosition typically starts with relative coords.
        // InfiniteCanvasManager.getWorldPosition takes (screenX, screenY).
        // Let's pass e.clientX - rect.left, e.clientY - rect.top.
        
        return this.coordinateMapper(e.clientX - rect.left, e.clientY - rect.top);
    }
    
    applyLineStyle() {
        // For freehand drawing, we don't use setLineDash anymore
        // Instead, we handle dash/dot patterns in the draw() method
        this.ctx.setLineDash([]);
    }
    
    /**
     * Check if current point should be drawn based on dash pattern
     * Returns true if we should draw, false if we're in a gap
     */
    shouldDrawDash(distance) {
        if (this.penLineStyle === 'solid' || this.penLineStyle === 'multi') {
            return true;
        }
        
        // Get dash and gap lengths based on style and density
        let dashLength, gapLength;
        
        if (this.penLineStyle === 'dashed') {
            // Dash density controls the length of dashes
            dashLength = this.penDashDensity;
            gapLength = this.penDashDensity * 0.6;
        } else if (this.penLineStyle === 'dotted') {
            // Dotted: small dots with gaps controlled by density
            dashLength = this.penSize * 1.5;
            gapLength = this.penDashDensity * 0.8;
        } else {
            return true; // Default to solid
        }
        
        const cycleLength = dashLength + gapLength;
        
        // Add distance to accumulated
        this.accumulatedDistance += distance;
        
        // Check where we are in the cycle
        const positionInCycle = this.accumulatedDistance % cycleLength;
        
        // Return true if we're in the dash phase
        return positionInCycle < dashLength;
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
            this.ctx.lineWidth = this.eraserSize;
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
        let pos = this.getPosition(e);
        
        // Reset accumulated distance for dashed line drawing
        this.accumulatedDistance = 0;
        this.isInDash = true;
        
        // Reset multi-line tracking
        this.multiLineLastPerpX = 0;
        this.multiLineLastPerpY = 0;
        this.multiLineLastPoints = null;
        this.multiLinePendingPoint = null;
        
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
        
        // For dashed/dotted lines, draw initial dot
        if (this.penLineStyle === 'dotted' || this.penLineStyle === 'dashed') {
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, this.penSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        let pos = this.getPosition(e);
        
        // Check for edge snapping when pen tool is active
        if (this.currentTool === 'pen' && this.edgeDrawingManager) {
            const processed = this.edgeDrawingManager.processDrawingPoint(pos.x, pos.y);
            if (processed.blocked) {
                // Point is inside a tool, don't draw this segment
                return;
            }
            if (processed.snapped) {
                pos = { x: processed.x, y: processed.y };
                this.isSnappedToEdge = true;
            } else {
                this.isSnappedToEdge = false;
            }
        }
        
        if (this.lastPoint && 
            Math.abs(pos.x - this.lastPoint.x) < 0.5 && 
            Math.abs(pos.y - this.lastPoint.y) < 0.5) {
            return;
        }
        
        this.points.push(pos);
        
        if (this.points.length >= 2) {
            const lastIndex = this.points.length - 1;
            const prevPoint = this.points[lastIndex - 1];
            const currPoint = this.points[lastIndex];
            
            // Calculate distance between points for pressure simulation
            // Larger distance = faster movement = less pressure
            const dx = currPoint.x - prevPoint.x;
            const dy = currPoint.y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if we should draw this segment (for dashed/dotted lines)
            const shouldDraw = this.shouldDrawDash(distance);
            
            // Apply pen-specific drawing effects with line style support
            // All pen types now support multi-line, dashed, and dotted styles
            if (shouldDraw) {
                if (this.penLineStyle === 'multi') {
                    // Draw multiple parallel lines for all pen types
                    this.drawMultiLine(prevPoint, currPoint);
                } else if (this.penType === 'ballpoint') {
                    // Ballpoint pen: smooth ink flow with slight pressure variation
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
                } else if (this.penType === 'brush') {
                    // Brush pen: soft edges with ink spread effect like calligraphy
                    this.drawBrushStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'pencil') {
                    // Pencil: grainy texture with lighter strokes
                    this.drawPencilStroke(prevPoint, currPoint, distance);
                } else if (this.penType === 'fountain') {
                    // Fountain pen: variable line width with elegant flow
                    this.drawFountainStroke(prevPoint, currPoint, distance);
                } else {
                    // Normal pen: consistent line width
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevPoint.x, prevPoint.y);
                    this.ctx.lineTo(currPoint.x, currPoint.y);
                    this.ctx.stroke();
                }
            }
            
            this.lastPoint = currPoint;
        } else {
            this.lastPoint = pos;
        }
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
            // For very short segments, accumulate in pending point
            if (!this.multiLinePendingPoint) {
                this.multiLinePendingPoint = currPoint;
            }
            return;
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
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.isSnappedToEdge = false;
            
            // Reset edge drawing state
            if (this.edgeDrawingManager) {
                this.edgeDrawingManager.resetSnapping();
            }
            
            // Save the stroke if it has points
            if (this.points.length > 0) {
                this.strokes.push({
                    points: [...this.points],
                    color: this.currentColor,
                    size: this.penSize,
                    penType: this.penType,
                    tool: this.currentTool,
                    rotation: 0 // Initialize rotation property
                });
            }
            
            this.points = [];
            this.lastPoint = null;
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
        
        // Reduce pan sensitivity with a damping factor
        const dampingFactor = 0.5; // Lower value = less sensitive
        const dx = (e.clientX - this.lastPanPoint.x) / this.canvasScale * dampingFactor;
        const dy = (e.clientY - this.lastPanPoint.y) / this.canvasScale * dampingFactor;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        
        localStorage.setItem('panOffsetX', this.panOffset.x);
        localStorage.setItem('panOffsetY', this.panOffset.y);
    }
    
    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPoint = null;
            // Restore cursor based on current tool
            if (this.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            }
            return true;
        }
        return false;
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.clearStrokes();
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    setColor(color) {
        this.currentColor = color;
    }
    
    setPenSize(size) {
        this.penSize = size;
    }
    
    setPenType(type) {
        this.penType = type;
        localStorage.setItem('penType', type);
    }
    
    setEraserSize(size) {
        this.eraserSize = size;
    }
    
    setEraserShape(shape) {
        this.eraserShape = shape;
        localStorage.setItem('eraserShape', shape);
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
        const padding = stroke.size * 2;
        
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
    }
    
    drawSelectionBorder() {
        if (this.selectedStrokeIndex === null) return;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return;
        
        const bounds = this.getStrokeBounds(stroke);
        if (!bounds) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#999999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.restore();
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
            tool: stroke.tool
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
        this.strokes.splice(this.selectedStrokeIndex, 1);
        this.selectedStrokeIndex = null;
        
        return true;
    }
    
    redrawAll() {
        if (!this.strokes) return;
        for (const stroke of this.strokes) {
            this.redrawStroke(stroke);
        }

        // Draw current stroke in progress
        if (this.isDrawing && this.points.length > 0) {
            // Construct a temporary stroke object
            const tempStroke = {
                points: this.points,
                color: this.currentColor,
                size: this.penSize,
                penType: this.penType,
                tool: this.currentTool,
                // Shape drawing logic handles preview separately via ShapeDrawingManager.draw()
                // which draws to preview canvas (screen coords) or main canvas?
                // ShapeDrawingManager handles its own preview.
                // BUT in Infinite Mode, main canvas is cleared.
                // ShapeDrawingManager uses a separate preview canvas overlay?
                // Yes, previewCanvas.
                // Is previewCanvas transformed?
                // InfiniteCanvasManager resets transforms on container.
                // ShapeDrawingManager.syncPreviewCanvas handles sizing.
                // If ShapeDrawingManager uses screen coords for preview, it should be fine IF the preview canvas is on top.
                // However, DrawingEngine handles PEN tools.
            };

            // Don't redraw shape tool current stroke here, handled by ShapeDrawingManager preview
            if (this.currentTool !== 'shape') {
                this.redrawStroke(tempStroke);
            }
        }
    }

    redrawStroke(stroke) {
        // Handle shape strokes
        if (stroke.type === 'shape' && this.shapeRenderer) {
            this.ctx.save();

            // Configure context
            this.ctx.strokeStyle = stroke.color;
            this.ctx.fillStyle = 'transparent'; // Shapes currently don't support fill in this app
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            // Calculate line width logic same as in ShapeDrawingManager
            let lineWidth = stroke.size;
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
                    lineWidth = stroke.size * 1.5;
                    break;
                case 'normal':
                default:
                    this.ctx.globalAlpha = 1.0;
                    break;
            }
            this.ctx.lineWidth = lineWidth;

            // Apply style to renderer temporarily
            const prevLineStyle = this.shapeRenderer.lineStyle;
            const prevDashDensity = this.shapeRenderer.dashDensity;
            const prevWaveDensity = this.shapeRenderer.waveDensity;
            const prevMultiLineCount = this.shapeRenderer.multiLineCount;
            const prevMultiLineSpacing = this.shapeRenderer.multiLineSpacing;
            const prevArrowSize = this.shapeRenderer.arrowSize;

            if (stroke.style) {
                this.shapeRenderer.lineStyle = stroke.style.lineStyle;
                this.shapeRenderer.dashDensity = stroke.style.dashDensity;
                this.shapeRenderer.waveDensity = stroke.style.waveDensity;
                this.shapeRenderer.multiLineCount = stroke.style.multiLineCount;
                this.shapeRenderer.multiLineSpacing = stroke.style.multiLineSpacing;
                this.shapeRenderer.arrowSize = stroke.style.arrowSize;
            }

            // Apply line style to context (dashed/dotted)
            this.shapeRenderer.applyLineStyle(this.ctx);

            // Draw based on shape type
            switch(stroke.shapeType) {
                case 'line':
                    this.shapeRenderer.drawLineWithStyle(this.ctx, stroke.start, stroke.end);
                    break;
                case 'arrow':
                    this.shapeRenderer.drawArrowLine(this.ctx, stroke.start, stroke.end, false);
                    break;
                case 'doubleArrow':
                    this.shapeRenderer.drawArrowLine(this.ctx, stroke.start, stroke.end, true);
                    break;
                case 'rectangle':
                    this.shapeRenderer.drawRectangleWithStyle(this.ctx, stroke.start, stroke.end);
                    break;
                case 'circle':
                    this.shapeRenderer.drawCircleWithStyle(this.ctx, stroke.start, stroke.end);
                    break;
                case 'ellipse':
                    this.shapeRenderer.drawEllipseWithStyle(this.ctx, stroke.start, stroke.end);
                    break;
            }

            // Restore renderer state
            this.shapeRenderer.lineStyle = prevLineStyle;
            this.shapeRenderer.dashDensity = prevDashDensity;
            this.shapeRenderer.waveDensity = prevWaveDensity;
            this.shapeRenderer.multiLineCount = prevMultiLineCount;
            this.shapeRenderer.multiLineSpacing = prevMultiLineSpacing;
            this.shapeRenderer.arrowSize = prevArrowSize;

            this.ctx.restore();
            return;
        }

        this.ctx.save();
        
        // Set up drawing context based on stroke properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.size;
        
        // Apply pen type settings
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
            case 'normal':
            default:
                this.ctx.globalAlpha = 1.0;
                break;
        }
        
        // Draw the stroke
        if (stroke.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    clearStrokes() {
        this.strokes = [];
        this.selectedStrokeIndex = null;
    }
}
