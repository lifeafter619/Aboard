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
        const storedEraserSize = parseInt(localStorage.getItem('eraserSize'), 10);
        this.eraserSize = Number.isFinite(storedEraserSize)
            ? this.normalizeEraserSize(storedEraserSize)
            : this.getAdaptiveDefaultEraserSize();
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
        this.MULTI_LINE_MIN_DISTANCE = 0.3; // Minimum distance threshold for multi-line drawing (smooth response at slower speeds)
        this.MULTI_LINE_POINT_DISTANCE = 0.25; // Point spacing threshold to capture slow movement without jitter
        this.MULTI_LINE_BLEND_MIN = 0.7; // Minimum blend factor for perpendicular smoothing
        this.MULTI_LINE_BLEND_MAX = 0.95; // Maximum blend factor
        this.MULTI_LINE_BLEND_SCALE = 80; // Scale factor for blend calculation
        
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
        
        // Stamped images storage (for redraw support)
        this.stampedImages = [];
        this.selectedImageIndex = null;
        this.layerCounter = 1;
        this.objectIdCounter = 1;
        this.groupCounter = 1;
        this.objectGroups = [];
        this.offCanvasImageLayer = null;
        
        // Canvas scaling and panning
        this.canvasScale = parseFloat(localStorage.getItem('canvasScale')) || 1.0;
        this.panOffset = { 
            x: parseFloat(localStorage.getItem('panOffsetX')) || 0, 
            y: parseFloat(localStorage.getItem('panOffsetY')) || 0 
        };
        this.isPanning = false;
        this.lastPanPoint = null;
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
        this.penDashDensity = Math.max(1, Math.min(100, density));
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
        const dpr = window.devicePixelRatio || 1;
        return {
            x: 0,
            y: 0,
            width: this.canvas.width / dpr,
            height: this.canvas.height / dpr
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

            usedIds.add(img.objectId);
            let mirror = layer.querySelector(`[data-object-id="${img.objectId}"]`);
            if (!mirror) {
                mirror = document.createElement('img');
                mirror.dataset.objectId = img.objectId;
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
            this.ctx.lineDashOffset = -this.accumulatedDistance;
        } else if (this.penLineStyle === 'dotted') {
            const spacing = Math.max(2, 400 / Math.max(1, this.penDashDensity));
            const dotLen = this.penSize * 0.1; // Almost circular dots (with round caps)
            const gapLen = spacing * 0.6 + this.penSize; // Gap needs to account for cap width
            this.ctx.setLineDash([dotLen, gapLen]);
            this.ctx.lineDashOffset = -this.accumulatedDistance;
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
        
        if (this.currentTool === 'eraser' && this.eraserShape === 'rectangle') {
            this.eraseRectangleAtPoint(pos);
        } else if (this.penLineStyle === 'dotted' || this.penLineStyle === 'dashed') {
            // For dashed/dotted lines, draw initial dot
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
                    // Point is inside a tool, don't draw this segment
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
            return;
        }
        
        // Apply line style before drawing
        if (this.currentTool === 'pen') {
            this.applyLineStyle();
        }
        
        // Check if we can use batch drawing (Normal pen)
        const complexBrushes = ['pencil', 'brush', 'fountain', 'ballpoint', 'marker'];
        const isComplex = complexBrushes.includes(this.penType) || this.penLineStyle === 'multi';

        if (!isComplex) {
            // Optimized batch drawing for Normal pen
            // Single path operation for multiple segments
            this.ctx.beginPath();
            
            // Start from the point before the first valid point
            const startIndex = this.points.length - validPoints.length;
            // Safe check for index
            const startPoint = (startIndex > 0) ? this.points[startIndex - 1] : validPoints[0];
            
            this.ctx.moveTo(startPoint.x, startPoint.y);
            
            for (const p of validPoints) {
                this.ctx.lineTo(p.x, p.y);

                // Update accumulated distance (approximate)
                // Not strictly needed for solid lines but good for consistency
                // const dx = p.x - startPoint.x;
                // const dy = p.y - startPoint.y;
                // this.accumulatedDistance += Math.sqrt(dx*dx + dy*dy);
            }
            
            this.ctx.stroke();
        } else {
            // Fallback for complex brushes: draw segment by segment
            const startIndex = this.points.length - validPoints.length;

            for (let i = 0; i < validPoints.length; i++) {
                const currIndex = startIndex + i;
                // Need previous point
                if (currIndex === 0) continue;

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
                    eraserShape: isEraserStroke ? this.eraserShape : null,
                    rotation: 0, // Initialize rotation property
                    layerOrder: this.getNextLayerOrder(),
                    objectId: this.getNextObjectId(),
                    groupId: null
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
        this.clearStampedImages();
        this.objectGroups = [];
        this.updateOffCanvasImageMirrors();
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
        return localStorage.getItem('eraserSize') !== null;
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
            localStorage.setItem('eraserSize', String(this.eraserSize));
        }
    }
    
    setEraserShape(shape) {
        this.eraserShape = shape;
        localStorage.setItem('eraserShape', shape);
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
    
    redrawStroke(stroke) {
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
        
        // Draw the stroke
        if (stroke.points.length > 0) {
            if (stroke.tool === 'eraser' && stroke.points.length === 1) {
                this.ctx.beginPath();
                this.ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return;
            }

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
