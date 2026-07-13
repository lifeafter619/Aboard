// Background Management Module
// Handles background colors, patterns, and rendering

function safeBackgroundStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read background localStorage key "${key}":`, error);
        return null;
    }
}

function safeBackgroundStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write background localStorage key "${key}":`, error);
        return false;
    }
}

function safeBackgroundStorageRemoveItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove background localStorage key "${key}":`, error);
        return false;
    }
}

const BACKGROUND_STORAGE_REMOVE = 'remove';

class BackgroundManager {
    constructor(bgCanvas, bgCtx) {
        this.bgCanvas = bgCanvas;
        this.bgCtx = bgCtx;
        
        this.backgroundColor = safeBackgroundStorageGetItem('backgroundColor') || '#ffffff';
        this.backgroundPattern = safeBackgroundStorageGetItem('backgroundPattern') || 'blank';
        const savedBgOpacity = parseFloat(safeBackgroundStorageGetItem('bgOpacity'));
        const savedPatternIntensity = parseFloat(safeBackgroundStorageGetItem('patternIntensity'));
        const savedPatternDensity = parseFloat(safeBackgroundStorageGetItem('patternDensity'));
        const savedImageSize = parseFloat(safeBackgroundStorageGetItem('imageSize'));
        const savedCoordinateOriginX = parseFloat(safeBackgroundStorageGetItem('coordinateOriginX'));
        const savedCoordinateOriginY = parseFloat(safeBackgroundStorageGetItem('coordinateOriginY'));
        this.bgOpacity = Number.isNaN(savedBgOpacity) ? 1.0 : savedBgOpacity;
        this.patternIntensity = Number.isNaN(savedPatternIntensity) ? 0.5 : savedPatternIntensity;
        this.patternDensity = Number.isNaN(savedPatternDensity) ? 1.0 : savedPatternDensity;
        this.backgroundImage = null;
        this.backgroundImageData = safeBackgroundStorageGetItem('backgroundImageData') || null;
        this.backgroundImageLoadToken = 0;
        this.gifInitToken = 0;
        this.pendingGifSource = null;
        this.gifInstance = null;
        this.imageSize = Number.isNaN(savedImageSize) ? 1.0 : savedImageSize;
        this.isImagePaused = false; // State for GIF playback control
        this.imageStaticData = null; // Store static frame for paused GIF
        
        // Coordinate system origin offset
        this.coordinateOriginX = Number.isNaN(savedCoordinateOriginX) ? 0 : savedCoordinateOriginX;
        this.coordinateOriginY = Number.isNaN(savedCoordinateOriginY) ? 0 : savedCoordinateOriginY;
        
        this.imageTransform = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scale: 1.0,
            flipHorizontal: false,
            flipVertical: false
        };
        this.backgroundOutsideLayerOrder = 1;
        this.backgroundWasOutsideCanvas = false;
        
        // Load saved transform if exists
        const savedTransform = safeBackgroundStorageGetItem('imageTransform');
        if (savedTransform) {
            try {
            this.imageTransform = JSON.parse(savedTransform);
            if (this.imageTransform.scale &&
                this.imageTransform.scale !== 1 &&
                this.imageTransform.width > 0 &&
                this.imageTransform.height > 0) {
                const factor = Math.abs(this.imageTransform.scale);
                const newWidth = this.imageTransform.width * factor;
                const newHeight = this.imageTransform.height * factor;
                this.imageTransform.x -= (newWidth - this.imageTransform.width) / 2;
                this.imageTransform.y -= (newHeight - this.imageTransform.height) / 2;
                this.imageTransform.width = newWidth;
                this.imageTransform.height = newHeight;
                this.imageTransform.scale = 1;
            }
            } catch (e) {
                console.warn('Failed to parse saved imageTransform, using defaults:', e);
            }
        }
        
        // Load saved image if exists
        if (this.backgroundImageData) {
            // Keep backgroundImage null until the data URL is decoded; consumers
            // (e.g. ImageControls.copyImageToCanvas) expect an HTMLImageElement,
            // never a raw data-URL string.
            if (typeof Image === 'function') {
                const restoredSource = this.backgroundImageData;
                const loadToken = ++this.backgroundImageLoadToken;
                const restoredImage = new Image();
                restoredImage.onload = () => {
                    if (loadToken === this.backgroundImageLoadToken
                        && restoredSource === this.backgroundImageData) {
                        this.backgroundImage = restoredImage;
                    }
                };
                restoredImage.onerror = () => {
                    if (loadToken === this.backgroundImageLoadToken
                        && restoredSource === this.backgroundImageData) {
                        console.warn('Failed to restore saved background image');
                    }
                };
                restoredImage.src = restoredSource;
            }
            // Also need to initialize the DOM element if it doesn't exist?
            // The DOM element logic is handled in drawBackgroundPattern/updateBackgroundImageElement
            if (this.backgroundPattern === 'image') {
                // Defer drawing until next frame to ensure DOM is ready if called from constructor
                setTimeout(() => this.drawBackground(), 0);
            }
        }

        this.gifLoopCount = 0; // Default infinite
        this.currentGifLoop = 0;

        this.coordinateOverlayCanvas = null;
        this.coordinateOverlayCtx = null;
        this.coordinateOverlaySvg = null;
        this.backgroundPatternSvg = null;
        let savedCoordinateOverlayState = null;
        try {
            savedCoordinateOverlayState = JSON.parse(safeBackgroundStorageGetItem('coordinateOverlayState') || 'null');
        } catch (error) {
            console.warn('Failed to parse coordinate overlay state, using defaults:', error);
        }
        this.coordinateOverlayState = this.sanitizeCoordinateOverlayState(savedCoordinateOverlayState);

        // Cache the latest applied DOM state to reduce unnecessary style writes/reflows
        this.imageDomStateCache = {
            display: null,
            opacity: null,
            left: null,
            top: null,
            width: null,
            height: null,
            transform: null,
            transformOrigin: null,
            pointerEvents: null,
            zIndex: null,
            gifSettingsDisplay: null
        };
        this.backgroundUiStateCache = null;
        this.pendingBackgroundStorageWrites = new Map();
        this.backgroundStorageFlushTimer = null;
        this.backgroundStorageFlushDelayMs = 80;
    }

    setStyleIfChanged(element, property, value, cacheKey = property) {
        if (!element || !element.style) return;
        if (this.imageDomStateCache[cacheKey] === value) return;
        element.style[property] = value;
        this.imageDomStateCache[cacheKey] = value;
    }

    emitBackgroundUiState() {
        const nextState = JSON.stringify({
            hasImage: this.backgroundPattern === 'image' && !!this.backgroundImageData,
            isGif: this.isGif(this.backgroundImageData),
            isPaused: !!this.isImagePaused
        });

        if (this.backgroundUiStateCache === nextState) {
            return;
        }

        this.backgroundUiStateCache = nextState;
        const detail = JSON.parse(nextState);
        window.dispatchEvent(new CustomEvent('backgroundMediaStateChanged', { detail }));
    }

    queueBackgroundStorageWrite(key, value) {
        this.pendingBackgroundStorageWrites.set(key, { value });
        this.scheduleBackgroundStorageFlush();
    }

    queueBackgroundStorageRemoval(key) {
        this.pendingBackgroundStorageWrites.set(key, { type: BACKGROUND_STORAGE_REMOVE });
        this.scheduleBackgroundStorageFlush();
    }

    scheduleBackgroundStorageFlush() {
        if (this.backgroundStorageFlushTimer !== null) {
            return;
        }

        if (typeof setTimeout !== 'function') {
            this.flushPendingBackgroundStorageWrites();
            return;
        }

        this.backgroundStorageFlushTimer = setTimeout(() => {
            this.backgroundStorageFlushTimer = null;
            this.flushPendingBackgroundStorageWrites();
        }, this.backgroundStorageFlushDelayMs);
    }

    flushPendingBackgroundStorageWrites() {
        if (this.backgroundStorageFlushTimer !== null && typeof clearTimeout === 'function') {
            clearTimeout(this.backgroundStorageFlushTimer);
            this.backgroundStorageFlushTimer = null;
        }

        if (!(this.pendingBackgroundStorageWrites instanceof Map) || this.pendingBackgroundStorageWrites.size === 0) {
            return;
        }

        const pendingWrites = Array.from(this.pendingBackgroundStorageWrites.entries());
        this.pendingBackgroundStorageWrites.clear();

        pendingWrites.forEach(([key, operation]) => {
            if (operation?.type === BACKGROUND_STORAGE_REMOVE) {
                safeBackgroundStorageRemoveItem(key);
                return;
            }

            safeBackgroundStorageSetItem(key, operation?.value);
        });
    }

    flushPendingPersistence() {
        this.flushPendingBackgroundStorageWrites();
    }

    hasBackgroundImage() {
        return this.backgroundPattern === 'image' &&
            !!this.backgroundImageData &&
            this.imageTransform.width > 0 &&
            this.imageTransform.height > 0;
    }

    getCanvasLogicalBounds() {
        const logicalWidth = this.bgCanvas.clientWidth ||
            this.bgCanvas.offsetWidth ||
            parseFloat(this.bgCanvas.style.width) ||
            this.bgCanvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.bgCanvas.clientHeight ||
            this.bgCanvas.offsetHeight ||
            parseFloat(this.bgCanvas.style.height) ||
            this.bgCanvas.height / (window.devicePixelRatio || 1);
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

    isBackgroundImageOutsideCanvas() {
        const bounds = this.getBackgroundImageVisualBounds();
        return !!bounds && !this.rectsIntersect(bounds, this.getCanvasLogicalBounds());
    }

    applyOutsideLayerAction(action, drawingEngine, textObjects = []) {
        if (!this.isBackgroundImageOutsideCanvas()) return false;

        const outsideRenderables = drawingEngine.getRenderableObjects(textObjects || []).filter(renderable => {
            if (renderable.type === 'stroke') return false;
            const bounds = drawingEngine.getTopLevelRenderableBounds(renderable, textObjects || []);
            return !!bounds && !drawingEngine.rectsIntersect(bounds, drawingEngine.getCanvasLogicalBounds());
        });
        const orders = outsideRenderables
            .map(renderable => renderable.layerOrder || 0)
            .sort((a, b) => a - b);
        const currentOrder = this.backgroundOutsideLayerOrder || (orders[orders.length - 1] || 0) + 1;
        let nextOrder = currentOrder;

        switch (action) {
            case 'bring-to-front':
                nextOrder = (orders[orders.length - 1] || 0) + 1;
                break;
            case 'send-to-back':
                nextOrder = (orders[0] || 0) - 1;
                break;
            case 'move-forward': {
                const higherOrder = orders.find(order => order > currentOrder);
                nextOrder = higherOrder !== undefined ? higherOrder + 1 : currentOrder;
                break;
            }
            case 'move-backward': {
                const lowerOrders = orders.filter(order => order < currentOrder);
                nextOrder = lowerOrders.length ? lowerOrders[lowerOrders.length - 1] - 1 : currentOrder;
                break;
            }
            default:
                return false;
        }

        if (nextOrder === currentOrder) return false;
        this.backgroundOutsideLayerOrder = nextOrder;

        this.drawBackground();
        return true;
    }

    getBackgroundImageTransform() {
        if (!this.hasBackgroundImage()) {
            return null;
        }

        return {
            x: this.imageTransform.x,
            y: this.imageTransform.y,
            width: this.imageTransform.width,
            height: this.imageTransform.height,
            rotation: this.imageTransform.rotation || 0,
            flipHorizontal: !!this.imageTransform.flipHorizontal,
            flipVertical: !!this.imageTransform.flipVertical,
            scale: 1
        };
    }

    getBackgroundImageCornerPoints() {
        const transform = this.getBackgroundImageTransform();
        if (!transform) return [];

        const centerX = transform.x + transform.width / 2;
        const centerY = transform.y + transform.height / 2;
        const rotationRad = (transform.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rotationRad);
        const sin = Math.sin(rotationRad);
        const halfWidth = transform.width / 2;
        const halfHeight = transform.height / 2;

        return [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ].map(point => ({
            x: centerX + point.x * cos - point.y * sin,
            y: centerY + point.x * sin + point.y * cos
        }));
    }

    getBackgroundImageVisualBounds() {
        const corners = this.getBackgroundImageCornerPoints();
        if (corners.length === 0) return null;

        const xs = corners.map(point => point.x);
        const ys = corners.map(point => point.y);

        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
        };
    }

    isPointInBackgroundImage(x, y) {
        const transform = this.getBackgroundImageTransform();
        if (!transform) return false;

        const centerX = transform.x + transform.width / 2;
        const centerY = transform.y + transform.height / 2;
        const relX = x - centerX;
        const relY = y - centerY;
        const rotationRad = -(transform.rotation || 0) * Math.PI / 180;
        const localX = relX * Math.cos(rotationRad) - relY * Math.sin(rotationRad);
        const localY = relX * Math.sin(rotationRad) + relY * Math.cos(rotationRad);

        return Math.abs(localX) <= transform.width / 2 && Math.abs(localY) <= transform.height / 2;
    }
    
    drawBackground() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        // Handle background image visibility
        this.updateBackgroundImageElement();

        // If using image pattern, we might want to make canvas background transparent or specific color
        // If the user wants opacity control over the background COLOR when image is behind:
        // Current logic: Image replaces background color? Or sits on top?
        // If image is an element behind canvas (or z-indexed), we need transparency.
        // But we put image element behind background canvas?
        // Let's assume we want: Background Color -> Image Element -> Background Pattern (Grid)
        // But `drawBackground` fills color first.
        // If pattern is 'image', we should NOT fill opaque color if we want to see the image element (if it's behind).
        // However, we decided to put image element ON TOP of bgCanvas (or handled via DOM).

        // If pattern is 'image', we handle it via DOM element.
        // We still fill background color on bgCanvas as a base layer?
        // If image is transparent (e.g. PNG), we see background color.

        this.bgCtx.globalAlpha = this.bgOpacity;
        this.bgCtx.fillStyle = this.backgroundColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.globalAlpha = 1.0;
        
        this.drawBackgroundPattern();
        this.renderCoordinateOverlay();
        
        // Performance optimization: Avoid synchronous localStorage writes in draw loop
        // These are now handled in setters
    }
    
    drawBackgroundPattern() {
        if (this.renderBackgroundPatternLayer()) {
            return;
        }

        if (this.backgroundPattern === 'blank' || this.backgroundPattern === 'image') {
            return;
        }

        this.bgCtx.save();
        this.bgCtx.globalCompositeOperation = 'source-over';

        const dpr = window.devicePixelRatio || 1;
        const patternColor = this.getPatternColor();

        switch(this.backgroundPattern) {
            case 'dots':
                this.drawDotsPattern(dpr, patternColor);
                break;
            case 'grid':
                this.drawGridPattern(dpr, patternColor);
                break;
            case 'tianzige':
                this.drawTianzigePattern(dpr, patternColor);
                break;
            case 'english-lines':
                this.drawEnglishLinesPattern(dpr, patternColor);
                break;
            case 'music-staff':
                this.drawMusicStaffPattern(dpr, patternColor);
                break;
            case 'coordinate':
                this.drawCoordinatePattern(dpr, patternColor);
                break;
            case 'polar':
                this.drawPolarPattern(dpr, patternColor);
                break;
        }

        this.bgCtx.restore();
    }

    getCanvasLogicalSize() {
        return {
            width: this.bgCanvas.clientWidth ||
                this.bgCanvas.offsetWidth ||
                parseFloat(this.bgCanvas.style.width) ||
                (this.bgCanvas.width / (window.devicePixelRatio || 1)),
            height: this.bgCanvas.clientHeight ||
                this.bgCanvas.offsetHeight ||
                parseFloat(this.bgCanvas.style.height) ||
                (this.bgCanvas.height / (window.devicePixelRatio || 1))
        };
    }

    ensureBackgroundPatternSvg() {
        if (this.backgroundPatternSvg && document.body.contains(this.backgroundPatternSvg)) {
            return this.backgroundPatternSvg;
        }

        const transformLayer = document.getElementById('transform-layer');
        if (!transformLayer) return null;

        let svg = document.getElementById('background-pattern-svg');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'background-pattern-svg';
            svg.style.position = 'absolute';
            svg.style.inset = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '0';
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('overflow', 'hidden');
            svg.setAttribute('shape-rendering', 'geometricPrecision');
            svg.setAttribute('text-rendering', 'geometricPrecision');

            const gifLayer = document.getElementById('gif-layer');
            if (gifLayer) {
                transformLayer.insertBefore(svg, gifLayer);
            } else {
                const canvas = document.getElementById('canvas');
                if (canvas) {
                    transformLayer.insertBefore(svg, canvas);
                } else {
                    transformLayer.appendChild(svg);
                }
            }
        }

        this.backgroundPatternSvg = svg;
        return svg;
    }

    syncBackgroundPatternSvgSize() {
        const svg = this.ensureBackgroundPatternSvg();
        if (!svg) return null;

        const { width, height } = this.getCanvasLogicalSize();
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        return { svg, logicalWidth: width, logicalHeight: height };
    }

    renderBackgroundPatternLayer() {
        const svgData = this.syncBackgroundPatternSvgSize();
        if (!svgData) return false;

        const { svg, logicalWidth, logicalHeight } = svgData;
        if (this.backgroundPattern === 'blank' || this.backgroundPattern === 'image') {
            svg.style.display = 'none';
            svg.innerHTML = '';
            return true;
        }

        svg.style.display = 'block';
        svg.innerHTML = this.getBackgroundPatternSvgMarkup(logicalWidth, logicalHeight);
        return true;
    }

    getBackgroundPatternSvgMarkup(logicalWidth, logicalHeight) {
        switch (this.backgroundPattern) {
            case 'dots':
                return this.renderDotsPatternSvg(logicalWidth, logicalHeight);
            case 'grid':
                return this.renderGridPatternSvg(logicalWidth, logicalHeight);
            case 'tianzige':
                return this.renderTianzigePatternSvg(logicalWidth, logicalHeight);
            case 'english-lines':
                return this.renderEnglishLinesPatternSvg(logicalWidth, logicalHeight);
            case 'music-staff':
                return this.renderMusicStaffPatternSvg(logicalWidth, logicalHeight);
            case 'coordinate':
                return this.renderCoordinatePatternSvg(logicalWidth, logicalHeight);
            case 'polar':
                return this.renderPolarPatternSvg(logicalWidth, logicalHeight);
            default:
                return '';
        }
    }

    renderDotsPatternSvg(logicalWidth, logicalHeight) {
        const spacing = 20 / this.patternDensity;
        const patternColor = this.getPatternColor();
        const radius = Math.max(0.7, Math.min(2.2, 1.1 / Math.sqrt(Math.max(this.patternDensity, 0.2))));
        const parts = [];

        for (let x = spacing; x < logicalWidth; x += spacing) {
            for (let y = spacing; y < logicalHeight; y += spacing) {
                parts.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${patternColor}"></circle>`);
            }
        }

        return `<g class="background-pattern-dots">${parts.join('')}</g>`;
    }

    renderGridPatternSvg(logicalWidth, logicalHeight) {
        const spacing = 20 / this.patternDensity;
        const patternColor = this.getPatternColor();
        const pathParts = [];

        for (let x = spacing; x < logicalWidth; x += spacing) {
            pathParts.push(`M ${x} 0 L ${x} ${logicalHeight}`);
        }

        for (let y = spacing; y < logicalHeight; y += spacing) {
            pathParts.push(`M 0 ${y} L ${logicalWidth} ${y}`);
        }

        return `<path d="${pathParts.join(' ')}" fill="none" stroke="${patternColor}" stroke-width="0.5"></path>`;
    }

    renderTianzigePatternSvg(logicalWidth, logicalHeight) {
        const cellSize = 60 / this.patternDensity;
        const patternColor = this.getPatternColor();
        const outer = [];
        const inner = [];

        for (let x = 0; x < logicalWidth; x += cellSize) {
            for (let y = 0; y < logicalHeight; y += cellSize) {
                outer.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="none" stroke="${patternColor}" stroke-width="2"></rect>`);
                inner.push(`M ${x + cellSize / 2} ${y} L ${x + cellSize / 2} ${y + cellSize}`);
                inner.push(`M ${x} ${y + cellSize / 2} L ${x + cellSize} ${y + cellSize / 2}`);
                inner.push(`M ${x} ${y} L ${x + cellSize} ${y + cellSize}`);
                inner.push(`M ${x + cellSize} ${y} L ${x} ${y + cellSize}`);
            }
        }

        return `${outer.join('')}<path d="${inner.join(' ')}" fill="none" stroke="${patternColor}" stroke-width="0.5"></path>`;
    }

    renderEnglishLinesPatternSvg(logicalWidth, logicalHeight) {
        const lineHeight = 60 / this.patternDensity;
        const patternColor = this.getPatternColor();
        const midlineColor = this.isLightBackground() ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.5)';
        const parts = [];

        for (let y = lineHeight; y < logicalHeight; y += lineHeight) {
            parts.push(`<line x1="0" y1="${y}" x2="${logicalWidth}" y2="${y}" stroke="${patternColor}" stroke-width="1"></line>`);
            parts.push(`<line x1="0" y1="${y + lineHeight / 4}" x2="${logicalWidth}" y2="${y + lineHeight / 4}" stroke="${patternColor}" stroke-width="0.5" stroke-dasharray="5 5"></line>`);
            parts.push(`<line x1="0" y1="${y + lineHeight / 2}" x2="${logicalWidth}" y2="${y + lineHeight / 2}" stroke="${midlineColor}" stroke-width="1"></line>`);
            parts.push(`<line x1="0" y1="${y + (3 * lineHeight / 4)}" x2="${logicalWidth}" y2="${y + (3 * lineHeight / 4)}" stroke="${patternColor}" stroke-width="0.5" stroke-dasharray="5 5"></line>`);
        }

        return `<g class="background-pattern-english-lines">${parts.join('')}</g>`;
    }

    renderMusicStaffPatternSvg(logicalWidth, logicalHeight) {
        const staffHeight = 80 / this.patternDensity;
        const lineSpacing = staffHeight / 4;
        const patternColor = this.getPatternColor();
        const pathParts = [];

        for (let startY = staffHeight; startY < logicalHeight; startY += staffHeight * 2) {
            for (let i = 0; i < 5; i++) {
                const y = startY + i * lineSpacing;
                pathParts.push(`M 0 ${y} L ${logicalWidth} ${y}`);
            }
        }

        return `<path d="${pathParts.join(' ')}" fill="none" stroke="${patternColor}" stroke-width="1"></path>`;
    }

    renderSvgArrowHead(endX, endY, angle, headSize, color, strokeWidth = 2) {
        const x1 = endX - headSize * Math.cos(angle - Math.PI / 6);
        const y1 = endY - headSize * Math.sin(angle - Math.PI / 6);
        const x2 = endX - headSize * Math.cos(angle + Math.PI / 6);
        const y2 = endY - headSize * Math.sin(angle + Math.PI / 6);
        return `<path d="M ${endX} ${endY} L ${x1} ${y1} M ${endX} ${endY} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"></path>`;
    }

    renderCoordinatePatternSvg(logicalWidth, logicalHeight) {
        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize('coordinate');
        const gridColor = this.getAdaptivePatternColor(0.18, 0.08);
        const axisColor = this.getPatternColor();
        const gridPath = [];
        const arrowSize = Math.max(8, Math.min(14, unitSize * 0.45));
        const normalizedXStart = ((origin.x % unitSize) + unitSize) % unitSize;
        const normalizedYStart = ((origin.y % unitSize) + unitSize) % unitSize;

        for (let x = normalizedXStart; x <= logicalWidth; x += unitSize) {
            gridPath.push(`M ${x} 0 L ${x} ${logicalHeight}`);
        }

        for (let y = normalizedYStart; y <= logicalHeight; y += unitSize) {
            gridPath.push(`M 0 ${y} L ${logicalWidth} ${y}`);
        }

        const parts = [
            `<path d="${gridPath.join(' ')}" fill="none" stroke="${gridColor}" stroke-width="0.5"></path>`,
            `<line x1="0" y1="${origin.y}" x2="${logicalWidth}" y2="${origin.y}" stroke="${axisColor}" stroke-width="2"></line>`,
            `<line x1="${origin.x}" y1="0" x2="${origin.x}" y2="${logicalHeight}" stroke="${axisColor}" stroke-width="2"></line>`,
            this.renderSvgArrowHead(logicalWidth, origin.y, 0, arrowSize, axisColor, 2),
            this.renderSvgArrowHead(origin.x, 0, -Math.PI / 2, arrowSize, axisColor, 2)
        ];

        return `<g class="background-pattern-coordinate">${parts.join('')}</g>`;
    }

    renderPolarPatternSvg(logicalWidth, logicalHeight) {
        const origin = this.getPatternOriginLogical();
        const radiusStep = this.getCoordinateUnitSize('polar');
        const angleStep = this.getPolarAngleStep();
        const minorColor = this.getAdaptivePatternColor(0.18, 0.07);
        const majorColor = this.getAdaptivePatternColor(0.38, 0.14);
        const axisColor = this.getPatternColor();
        const maxRadius = Math.max(
            Math.hypot(origin.x, origin.y),
            Math.hypot(logicalWidth - origin.x, origin.y),
            Math.hypot(origin.x, logicalHeight - origin.y),
            Math.hypot(logicalWidth - origin.x, logicalHeight - origin.y)
        );
        const majorRingInterval = 5;
        const majorAngleInterval = angleStep <= 15 ? 30 : angleStep <= 30 ? 45 : 90;
        const parts = [];

        for (let ringIndex = 1, radius = radiusStep; radius < maxRadius; ringIndex++, radius += radiusStep) {
            const isMajorRing = ringIndex % majorRingInterval === 0;
            parts.push(`<circle cx="${origin.x}" cy="${origin.y}" r="${radius}" fill="none" stroke="${isMajorRing ? majorColor : minorColor}" stroke-width="${isMajorRing ? 1 : 0.5}"></circle>`);
        }

        for (let angleDeg = 0; angleDeg < 360; angleDeg += angleStep) {
            const angleRad = angleDeg * Math.PI / 180;
            const endPoint = this.getRayEndpointForBounds(origin.x, origin.y, angleRad, logicalWidth, logicalHeight);
            const isAxis = angleDeg % 90 === 0;
            const isMajorRay = angleDeg % majorAngleInterval === 0;
            const stroke = isAxis ? axisColor : (isMajorRay ? majorColor : minorColor);
            const strokeWidth = isAxis ? 2 : (isMajorRay ? 1 : 0.5);
            parts.push(`<line x1="${origin.x}" y1="${origin.y}" x2="${endPoint.x}" y2="${endPoint.y}" stroke="${stroke}" stroke-width="${strokeWidth}"></line>`);
        }

        const positiveXAxisEnd = this.getRayEndpointForBounds(origin.x, origin.y, 0, logicalWidth, logicalHeight);
        if (positiveXAxisEnd.distance > 0) {
            parts.push(this.renderSvgArrowHead(positiveXAxisEnd.x, positiveXAxisEnd.y, 0, 10, axisColor, 2));
        }

        const positiveYAxisEnd = this.getRayEndpointForBounds(origin.x, origin.y, Math.PI / 2, logicalWidth, logicalHeight);
        if (positiveYAxisEnd.distance > 0) {
            parts.push(this.renderSvgArrowHead(positiveYAxisEnd.x, positiveYAxisEnd.y, -Math.PI / 2, 10, axisColor, 2));
        }

        const angleGuideRadius = Math.min(radiusStep * 1.5, 42);
        const guideEndX = origin.x + angleGuideRadius;
        const guideEndY = origin.y;
        parts.push(`<path d="M ${guideEndX} ${guideEndY} A ${angleGuideRadius} ${angleGuideRadius} 0 0 0 ${origin.x + angleGuideRadius * Math.cos(-Math.PI / 3)} ${origin.y + angleGuideRadius * Math.sin(-Math.PI / 3)}" fill="none" stroke="${majorColor}" stroke-width="1"></path>`);
        parts.push(this.renderSvgArrowHead(guideEndX, guideEndY, 0, 8, majorColor, 1.4));

        return `<g class="background-pattern-polar">${parts.join('')}</g>`;
    }
    
    updateBackgroundImageElement() {
        let containerElement = document.getElementById('background-image-container');
        let imgElement = document.getElementById('background-image-element');
        
        if (this.backgroundPattern === 'image' && this.backgroundImageData) {
            if (!containerElement) {
                containerElement = document.createElement('div');
                containerElement.id = 'background-image-container';
                containerElement.style.position = 'absolute';
                containerElement.style.pointerEvents = 'none';
                containerElement.style.zIndex = '0'; // Same as bgCanvas
                const handleBackgroundContainerDown = (event) => {
                    if (!this.isBackgroundImageOutsideCanvas()) return;
                    event.stopPropagation();
                    event.preventDefault?.();
                    window.drawingBoard?.setTool?.('select');
                    window.drawingBoard?.selectionManager?.selectBackgroundImage?.();
                };
                containerElement.addEventListener('mousedown', handleBackgroundContainerDown);
                containerElement.addEventListener('pointerdown', handleBackgroundContainerDown);
                containerElement.addEventListener('touchstart', handleBackgroundContainerDown, { passive: false });

                // Append to transform-layer
                const transformLayer = document.getElementById('transform-layer');
                if (transformLayer) {
                    transformLayer.insertBefore(containerElement, document.getElementById('canvas'));
                } else {
                    document.body.insertBefore(containerElement, document.getElementById('canvas'));
                }
            }

            if (!imgElement) {
                imgElement = document.createElement('img');
                imgElement.id = 'background-image-element';
                imgElement.style.width = '100%';
                imgElement.style.height = '100%';
                imgElement.style.display = 'block';
                containerElement.appendChild(imgElement);
            }

            this.setStyleIfChanged(containerElement, 'display', 'block');

            const sourceChanged = imgElement.getAttribute('src') !== this.backgroundImageData;
            if (sourceChanged) {
                this.stopGifInstance();
                this.restoreBackgroundGifImage(imgElement);
                imgElement.src = this.backgroundImageData;
            }

            // Check if it's a GIF and initialize SuperGif if needed. A source
            // can remain unchanged after its wrapper was removed, so instance
            // state—not only img.src—must participate in this decision.
            if (this.isGif(this.backgroundImageData)) {
                if (!this.gifInstance && this.pendingGifSource !== this.backgroundImageData) {
                    this.initGif(imgElement);
                }
                const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                if (gifSettingsBtn) {
                    this.setStyleIfChanged(gifSettingsBtn, 'display', 'block', 'gifSettingsDisplay');
                }
            } else {
                const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                if (gifSettingsBtn) {
                    this.setStyleIfChanged(gifSettingsBtn, 'display', 'none', 'gifSettingsDisplay');
                }
                if (this.gifInstance || this.pendingGifSource) {
                    this.stopGifInstance();
                    this.restoreBackgroundGifImage(imgElement);
                }
            }

            // Apply transformations to container
            const logicalSize = this.getCanvasLogicalSize();
            const canvasWidth = logicalSize.width;
            const canvasHeight = logicalSize.height;
            
            this.setStyleIfChanged(containerElement, 'opacity', String(this.patternIntensity));

            // Handle paused state (freeze GIF or static image)
            if (this.isImagePaused) {
                 if (this.gifInstance) {
                     this.gifInstance.pause();
                 }
            } else {
                 if (this.gifInstance && !this.gifInstance.get_playing()) {
                     this.gifInstance.play();
                 }
            }

            if (this.imageTransform.width > 0 && this.imageTransform.height > 0) {
                // Apply transformations using CSS
                this.setStyleIfChanged(containerElement, 'left', `${this.imageTransform.x}px`);
                this.setStyleIfChanged(containerElement, 'top', `${this.imageTransform.y}px`);
                this.setStyleIfChanged(containerElement, 'width', `${this.imageTransform.width}px`);
                this.setStyleIfChanged(containerElement, 'height', `${this.imageTransform.height}px`);

                // Build transform string including flip
                const scaleX = this.imageTransform.flipHorizontal ? -1 : 1;
                const scaleY = this.imageTransform.flipVertical ? -1 : 1;

                this.setStyleIfChanged(containerElement, 'transformOrigin', 'center center');
                this.setStyleIfChanged(containerElement, 'transform', `rotate(${this.imageTransform.rotation}deg) scale(${scaleX}, ${scaleY})`);
            } else {
                // Fallback centering logic
                if (imgElement.naturalWidth) {
                    const scaledWidth = imgElement.naturalWidth * this.imageSize;
                    const scaledHeight = imgElement.naturalHeight * this.imageSize;
                    const x = (canvasWidth - scaledWidth) / 2;
                    const y = (canvasHeight - scaledHeight) / 2;

                    this.setStyleIfChanged(containerElement, 'left', `${x}px`);
                    this.setStyleIfChanged(containerElement, 'top', `${y}px`);
                    this.setStyleIfChanged(containerElement, 'width', `${scaledWidth}px`);
                    this.setStyleIfChanged(containerElement, 'height', `${scaledHeight}px`);
                    this.setStyleIfChanged(containerElement, 'transform', 'none');
                } else {
                    // If not loaded yet, wait
                    imgElement.onload = () => this.drawBackground(); // Redraw (update styles) when loaded
                }
            }

            const isOutsideCanvas = this.isBackgroundImageOutsideCanvas();
            if (isOutsideCanvas && !this.backgroundWasOutsideCanvas) {
                const maxLayerOrder = window.drawingBoard?.drawingEngine?.getMaxLayerOrder?.(
                    window.drawingBoard?.insertTextManager?.textObjects || [],
                    true
                ) || 0;
                this.backgroundOutsideLayerOrder = maxLayerOrder + 1;
            }
            this.backgroundWasOutsideCanvas = isOutsideCanvas;
            this.setStyleIfChanged(containerElement, 'pointerEvents', isOutsideCanvas ? 'auto' : 'none', 'pointerEvents');
            this.setStyleIfChanged(
                containerElement,
                'zIndex',
                isOutsideCanvas ? String(1000 + (this.backgroundOutsideLayerOrder || 1)) : '0',
                'zIndex'
            );

        } else {
            if (this.gifInstance || this.pendingGifSource) {
                this.stopGifInstance();
                this.restoreBackgroundGifImage(imgElement);
            }
            if (containerElement) {
                this.setStyleIfChanged(containerElement, 'display', 'none');
            }
            this.backgroundWasOutsideCanvas = false;
            const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
            if (gifSettingsBtn) {
                this.setStyleIfChanged(gifSettingsBtn, 'display', 'none', 'gifSettingsDisplay');
            }
        }

        this.emitBackgroundUiState();
    }

    isGif(dataUrl) {
        return dataUrl && dataUrl.startsWith('data:image/gif');
    }

    restoreBackgroundGifImage(imgElement) {
        const container = document.getElementById('background-image-container');
        if (!container) {
            if (imgElement) {
                imgElement.style.display = 'block';
            }
            return false;
        }

        const existingJsgif = typeof container.querySelector === 'function'
            ? container.querySelector('.jsgif')
            : null;
        if (existingJsgif) {
             existingJsgif.remove();
             if (imgElement) {
                 container.appendChild(imgElement);
             }
        }

        if (imgElement) {
            imgElement.style.display = 'block';
        }

        return Boolean(existingJsgif);
    }

    stopGifInstance({ invalidatePending = true } = {}) {
        if (invalidatePending) {
            this.gifInitToken = (this.gifInitToken || 0) + 1;
            this.pendingGifSource = null;
        }
        // libgif keeps playing through a self-rescheduling timer chain that
        // only pause() stops; dropping the reference alone leaks the loop and
        // every decoded frame.
        try {
            this.gifInstance?.pause?.();
        } catch (e) {
            console.warn('Failed to stop background GIF instance:', e);
        }
        this.gifInstance = null;
        if (typeof document !== 'undefined') {
            try {
                const imgElement = document.getElementById('background-image-element');
                this.restoreBackgroundGifImage(imgElement);
            } catch (e) {
                console.warn('Failed to restore the background GIF image element:', e);
            }
        }
    }

    async initGif(imgElement) {
        const expectedSource = this.backgroundImageData;
        if (!imgElement) {
            return;
        }
        if (!this.isGif(expectedSource)) {
            imgElement.style.display = 'block';
            return;
        }

        // Do this before the DOM-identity guard below. When the wrapper is
        // unavailable, the image cannot be discoverable through that guard,
        // but it still needs to remain visible as a static fallback.
        if (!document.getElementById('background-image-container')) {
            this.stopGifInstance();
            imgElement.style.display = 'block';
            return;
        }
        if (this.pendingGifSource === expectedSource) {
            return;
        }

        const initToken = (this.gifInitToken || 0) + 1;
        this.gifInitToken = initToken;
        this.pendingGifSource = expectedSource;
        const isCurrentInitialization = () => initToken === this.gifInitToken
            && expectedSource === this.backgroundImageData
            && this.backgroundPattern === 'image'
            && imgElement.getAttribute('src') === expectedSource
            && document.getElementById('background-image-element') === imgElement;

        // Ensure SuperGif is loaded
        if (!window.SuperGif) {
            try {
                if (window.ScriptLoader) {
                    await ScriptLoader.load('js/modules/libgif.js');
                } else {
                    console.error('ScriptLoader not found');
                    if (isCurrentInitialization()) this.pendingGifSource = null;
                    return;
                }
            } catch (e) {
                console.error('Failed to load libgif.js', e);
                if (isCurrentInitialization()) this.pendingGifSource = null;
                return;
            }
        }

        if (!isCurrentInitialization()) {
            return;
        }

        // Clear previous instance if exists (remove jsgif wrapper if any)
        const container = document.getElementById('background-image-container');
        if (!container) {
            this.stopGifInstance();
            if (imgElement) {
                imgElement.style.display = 'block';
            }
            if (isCurrentInitialization()) this.pendingGifSource = null;
            return;
        }

        // If there is already a jsgif div, remove it and restore img
        this.restoreBackgroundGifImage(imgElement);

        this.stopGifInstance({ invalidatePending: false });

        let gifInstance = null;
        try {
            gifInstance = new SuperGif({
                gif: imgElement,
                auto_play: !this.isImagePaused,
                loop_mode: this.gifLoopCount === 0 ? true : false,
                vp_t: 0, vp_l: 0,
                on_end: () => {
                   this.handleGifLoop(gifInstance, initToken, expectedSource);
                }
            });
            if (!isCurrentInitialization()) {
                gifInstance.pause?.();
                return;
            }
            this.gifInstance = gifInstance;
            this.pendingGifSource = null;

            this.currentGifLoop = 0;

            gifInstance.load(() => {
                if (!isCurrentInitialization() || this.gifInstance !== gifInstance) {
                    gifInstance.pause?.();
                    return;
                }
                const canvas = gifInstance.get_canvas();
                if (canvas) {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                }
                this.emitBackgroundUiState();
            });
        } catch(e) {
            if (isCurrentInitialization()) {
                this.pendingGifSource = null;
                if (this.gifInstance === gifInstance) {
                    this.gifInstance = null;
                }
            }
            console.error("Failed to init SuperGif", e);
        }
    }

    handleGifLoop(instance = this.gifInstance, initToken = this.gifInitToken, source = this.backgroundImageData) {
        if (instance !== this.gifInstance
            || initToken !== this.gifInitToken
            || source !== this.backgroundImageData) {
            return;
        }
        if (this.gifLoopCount > 0) {
            this.currentGifLoop++;
            if (this.currentGifLoop >= this.gifLoopCount) {
                instance.pause();
                this.isImagePaused = true;
                // Dispatch event for UI update
                window.dispatchEvent(new CustomEvent('backgroundGifPaused'));
                this.emitBackgroundUiState();
            }
        }
    }
    
    setGifLoopCount(count) {
        this.gifLoopCount = count;
        // Re-init gif to apply loop mode if needed or just reset counter
        // SuperGif doesn't allow changing loop_mode dynamically easily.
        // But we handle loop counting manually in handleGifLoop mostly.
        this.currentGifLoop = 0;

        // Update loop_mode config if we re-init
        // For now, assume manual handling is enough or re-init on next load
        // Force re-init by setting src to same?
        // Or better, just rely on manual handling.

        // If we change from 0 (infinite) to N, we need to start counting.
        // If we change from N to 0, we need to stop counting/stopping.
    }

    drawDotsPattern(dpr, patternColor) {
        const baseSpacing = 20 * dpr;
        const spacing = baseSpacing / this.patternDensity;
        this.bgCtx.fillStyle = patternColor;
        
        for (let x = spacing; x < this.bgCanvas.width; x += spacing) {
            for (let y = spacing; y < this.bgCanvas.height; y += spacing) {
                this.bgCtx.beginPath();
                this.bgCtx.arc(x, y, 1 * dpr, 0, Math.PI * 2);
                this.bgCtx.fill();
            }
        }
    }
    
    drawGridPattern(dpr, patternColor) {
        const baseSpacing = 20 * dpr;
        const spacing = baseSpacing / this.patternDensity;
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 0.5 * dpr;
        
        for (let x = spacing; x < this.bgCanvas.width; x += spacing) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, 0);
            this.bgCtx.lineTo(x, this.bgCanvas.height);
            this.bgCtx.stroke();
        }
        
        for (let y = spacing; y < this.bgCanvas.height; y += spacing) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y);
            this.bgCtx.lineTo(this.bgCanvas.width, y);
            this.bgCtx.stroke();
        }
    }
    
    drawTianzigePattern(dpr, patternColor) {
        const baseCellSize = 60 * dpr;
        const cellSize = baseCellSize / this.patternDensity;
        this.bgCtx.strokeStyle = patternColor;
        
        for (let x = 0; x < this.bgCanvas.width; x += cellSize) {
            for (let y = 0; y < this.bgCanvas.height; y += cellSize) {
                this.bgCtx.lineWidth = 2 * dpr;
                this.bgCtx.strokeRect(x, y, cellSize, cellSize);
                
                this.bgCtx.lineWidth = 0.5 * dpr;
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x + cellSize / 2, y);
                this.bgCtx.lineTo(x + cellSize / 2, y + cellSize);
                this.bgCtx.stroke();
                
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x, y + cellSize / 2);
                this.bgCtx.lineTo(x + cellSize, y + cellSize / 2);
                this.bgCtx.stroke();
                
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x, y);
                this.bgCtx.lineTo(x + cellSize, y + cellSize);
                this.bgCtx.stroke();
                
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x + cellSize, y);
                this.bgCtx.lineTo(x, y + cellSize);
                this.bgCtx.stroke();
            }
        }
    }
    
    drawEnglishLinesPattern(dpr, patternColor) {
        const baseLineHeight = 60 * dpr;
        const lineHeight = baseLineHeight / this.patternDensity;
        
        for (let y = lineHeight; y < this.bgCanvas.height; y += lineHeight) {
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 1 * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y);
            this.bgCtx.lineTo(this.bgCanvas.width, y);
            this.bgCtx.stroke();
            
            this.bgCtx.lineWidth = 0.5 * dpr;
            this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y + lineHeight / 4);
            this.bgCtx.lineTo(this.bgCanvas.width, y + lineHeight / 4);
            this.bgCtx.stroke();
            
            this.bgCtx.setLineDash([]);
            this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.5)';
            this.bgCtx.lineWidth = 1 * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y + lineHeight / 2);
            this.bgCtx.lineTo(this.bgCanvas.width, y + lineHeight / 2);
            this.bgCtx.stroke();
            
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 0.5 * dpr;
            this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y + 3 * lineHeight / 4);
            this.bgCtx.lineTo(this.bgCanvas.width, y + 3 * lineHeight / 4);
            this.bgCtx.stroke();
            this.bgCtx.setLineDash([]);
        }
    }
    
    drawMusicStaffPattern(dpr, patternColor) {
        const baseStaffHeight = 80 * dpr;
        const staffHeight = baseStaffHeight / this.patternDensity;
        const lineSpacing = staffHeight / 4;
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 1 * dpr;
        
        for (let startY = staffHeight; startY < this.bgCanvas.height; startY += staffHeight * 2) {
            for (let i = 0; i < 5; i++) {
                const y = startY + i * lineSpacing;
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y);
                this.bgCtx.lineTo(this.bgCanvas.width, y);
                this.bgCtx.stroke();
            }
        }
    }

    supportsMovableOrigin(pattern = this.backgroundPattern) {
        return pattern === 'coordinate' || pattern === 'polar';
    }

    getPatternOrigin(dpr = window.devicePixelRatio || 1) {
        return {
            centerX: (this.bgCanvas.width / 2) + (this.coordinateOriginX * dpr),
            centerY: (this.bgCanvas.height / 2) + (this.coordinateOriginY * dpr)
        };
    }

    getAdaptivePatternColor(opacityMultiplier = 1, minOpacity = 0) {
        const alpha = Math.max(minOpacity, Math.min(this.patternIntensity * opacityMultiplier, 1));
        return this.isLightBackground()
            ? `rgba(0, 0, 0, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`;
    }

    drawOriginPoint(centerX, centerY, dpr, fillColor = this.getPatternColor()) {
        this.bgCtx.fillStyle = fillColor;
        this.bgCtx.beginPath();
        this.bgCtx.arc(centerX, centerY, 5 * dpr, 0, Math.PI * 2);
        this.bgCtx.fill();
        this.bgCtx.strokeStyle = this.backgroundColor;
        this.bgCtx.lineWidth = 2 * dpr;
        this.bgCtx.stroke();
    }

    getRayEndpointForBounds(centerX, centerY, angleRad, width, height) {
        const directionX = Math.cos(angleRad);
        const directionY = -Math.sin(angleRad);
        const intersections = [];

        if (Math.abs(directionX) > 1e-6) {
            intersections.push((0 - centerX) / directionX);
            intersections.push((width - centerX) / directionX);
        }

        if (Math.abs(directionY) > 1e-6) {
            intersections.push((0 - centerY) / directionY);
            intersections.push((height - centerY) / directionY);
        }

        const validDistances = intersections.filter(distance => distance > 0);
        const distance = validDistances.length > 0 ? Math.min(...validDistances) : 0;

        return {
            x: centerX + directionX * distance,
            y: centerY + directionY * distance,
            distance
        };
    }

    getRayEndpoint(centerX, centerY, angleRad) {
        return this.getRayEndpointForBounds(centerX, centerY, angleRad, this.bgCanvas.width, this.bgCanvas.height);
    }

    drawArrowHead(startX, startY, endX, endY, dpr, color) {
        const angle = Math.atan2(endY - startY, endX - startX);
        const headSize = 10 * dpr;

        this.bgCtx.save();
        this.bgCtx.strokeStyle = color;
        this.bgCtx.lineWidth = 2 * dpr;
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(endX, endY);
        this.bgCtx.lineTo(
            endX - headSize * Math.cos(angle - Math.PI / 6),
            endY - headSize * Math.sin(angle - Math.PI / 6)
        );
        this.bgCtx.moveTo(endX, endY);
        this.bgCtx.lineTo(
            endX - headSize * Math.cos(angle + Math.PI / 6),
            endY - headSize * Math.sin(angle + Math.PI / 6)
        );
        this.bgCtx.stroke();
        this.bgCtx.restore();
    }

    getPolarAngleStep() {
        if (this.patternDensity >= 2.5) return 10;
        if (this.patternDensity >= 1.6) return 15;
        if (this.patternDensity >= 1.0) return 30;
        if (this.patternDensity >= 0.6) return 45;
        return 60;
    }

    getDefaultCoordinateOverlayState() {
        return {
            showTicks: true,
            showLabels: true,
            showPointLabels: true,
            showOrigin: true,
            pointLineMode: 'auto',
            connectPoints: true,
            snapToGrid: true,
            lineColor: '#2563eb',
            points: [],
            plots: [],
            groups: []
        };
    }

    normalizeCoordinatePointLineMode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        return ['line', 'auto', 'selected'].includes(normalized) ? normalized : 'auto';
    }

    sanitizeCoordinateOverlayState(state) {
        const defaults = this.getDefaultCoordinateOverlayState();
        const nextState = state && typeof state === 'object' ? state : {};
        const pointLineMode = this.normalizeCoordinatePointLineMode(
            nextState.pointLineMode ?? (nextState.connectPoints === false ? 'selected' : defaults.pointLineMode)
        );
        const sanitizedPoints = Array.isArray(nextState.points)
            ? nextState.points
                .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
                .map((point, index) => ({
                    id: point.id || `pt-${Date.now()}-${index}`,
                    x: this.roundToDecimals(point.x, 4),
                    y: this.roundToDecimals(point.y, 4),
                    color: point.color || this.getCoordinatePaletteColor(index)
                }))
            : [];
        const validPointIds = new Set(sanitizedPoints.map(point => point.id));
        const sanitizedGroups = Array.isArray(nextState.groups)
            ? nextState.groups
                .map((group, index) => {
                    const pointIds = [...new Set((Array.isArray(group?.pointIds) ? group.pointIds : [])
                        .filter(pointId => validPointIds.has(pointId)))];
                    if (pointIds.length < 2) return null;
                    return {
                        id: group.id || `coord-group-${Date.now()}-${index}`,
                        pointIds,
                        line: group.line === true
                    };
                })
                .filter(Boolean)
            : [];

        return {
            ...defaults,
            showTicks: nextState.showTicks !== false,
            showLabels: nextState.showLabels !== false,
            showPointLabels: nextState.showPointLabels !== false,
            showOrigin: nextState.showOrigin !== false,
            pointLineMode,
            connectPoints: pointLineMode !== 'selected',
            snapToGrid: nextState.snapToGrid !== false,
            lineColor: typeof nextState.lineColor === 'string' && nextState.lineColor.trim()
                ? nextState.lineColor.trim()
                : defaults.lineColor,
            points: sanitizedPoints,
            plots: Array.isArray(nextState.plots)
                ? nextState.plots
                    .filter(plot => typeof plot?.expression === 'string' && plot.expression.trim())
                    .map((plot, index) => {
                        const coordinateType = plot.coordinateType === 'polar' ? 'polar' : 'coordinate';
                        return {
                            id: plot.id || `plot-${Date.now()}-${index}`,
                            expression: this.normalizePlotExpression(plot.expression, coordinateType),
                            coordinateType,
                            color: plot.color || this.getCoordinatePaletteColor(index + 2),
                            strokeWidth: this.normalizePlotStrokeWidth(plot.strokeWidth),
                            dashStyle: this.normalizePlotDashStyle(plot.dashStyle),
                            segments: this.sanitizeCoordinatePlotSegments(plot.segments, coordinateType)
                        };
                    })
                : [],
            groups: sanitizedGroups
        };
    }

    normalizePlotStrokeWidth(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return 2.5;
        return Math.max(1, Math.min(12, this.roundToDecimals(numericValue, 2)));
    }

    normalizePlotDashStyle(value) {
        const normalized = String(value || 'solid').trim().toLowerCase();
        return ['solid', 'dashed', 'dotted', 'dashdot'].includes(normalized) ? normalized : 'solid';
    }

    getAllowedPlotAxes(coordinateType = this.backgroundPattern) {
        return coordinateType === 'polar' ? ['theta', 'r'] : ['x', 'y'];
    }

    sanitizeCoordinatePlotSegments(segments, coordinateType = this.backgroundPattern) {
        if (!Array.isArray(segments)) return [];
        const allowedAxes = this.getAllowedPlotAxes(coordinateType);
        return segments
            .map((segment, index) => {
                const axis = allowedAxes.includes(segment?.axis) ? segment.axis : allowedAxes[0];
                let min = segment?.min === '' || segment?.min === null || typeof segment?.min === 'undefined'
                    ? null
                    : Number(segment.min);
                let max = segment?.max === '' || segment?.max === null || typeof segment?.max === 'undefined'
                    ? null
                    : Number(segment.max);

                min = Number.isFinite(min) ? this.roundToDecimals(min, 4) : null;
                max = Number.isFinite(max) ? this.roundToDecimals(max, 4) : null;

                if (min === null && max === null) return null;
                if (min !== null && max !== null && min > max) {
                    [min, max] = [max, min];
                }

                return {
                    id: segment?.id || `segment-${Date.now()}-${index}`,
                    axis,
                    min,
                    max
                };
            })
            .filter(Boolean);
    }

    getPlotStrokeDasharray(plot, scale = 1) {
        const width = Math.max(1, this.normalizePlotStrokeWidth(plot?.strokeWidth || 2.5) * Math.max(scale, 0.2));
        switch (this.normalizePlotDashStyle(plot?.dashStyle)) {
            case 'dashed':
                return `${width * 4} ${width * 2.5}`;
            case 'dotted':
                return `${width * 1.2} ${width * 2.2}`;
            case 'dashdot':
                return `${width * 4} ${width * 2.2} ${width * 1.2} ${width * 2.2}`;
            default:
                return '';
        }
    }

    plotMatchesSegments(plot, valueMap = {}) {
        const segments = Array.isArray(plot?.segments) ? plot.segments : [];
        if (segments.length === 0) return true;

        return segments.some(segment => {
            const value = valueMap[segment.axis];
            if (!Number.isFinite(value)) return false;
            if (segment.min !== null && value < segment.min) return false;
            if (segment.max !== null && value > segment.max) return false;
            return true;
        });
    }

    validateCoordinatePlotExpression(expression, coordinateType = this.backgroundPattern) {
        const normalizedExpression = this.normalizePlotExpression(expression, coordinateType);
        if (!normalizedExpression) {
            throw new Error('empty-expression');
        }

        const preparedExpression = this.preparePlotExpression(normalizedExpression, coordinateType);
        const evaluator = this.createPlotEvaluator(preparedExpression, coordinateType);
        const sampleInputs = coordinateType === 'polar'
            ? [[0, 0, 0], [0, Math.PI / 4, 45], [0, Math.PI / 2, 90]]
            : [[-1, 0, 0], [0, 0, 0], [1, 0, 0]];

        let canEvaluate = false;
        for (const [x, theta, deg] of sampleInputs) {
            try {
                const result = evaluator(x, theta, deg, Math.PI, Math.E);
                if (typeof result === 'number') {
                    canEvaluate = true;
                    break;
                }
            } catch (error) {
                // ignore partial-domain sample failures
            }
        }

        if (!canEvaluate) {
            throw new Error('invalid-expression');
        }

        return normalizedExpression;
    }

    persistCoordinateOverlayState() {
        this.queueBackgroundStorageWrite('coordinateOverlayState', JSON.stringify(this.coordinateOverlayState));
    }

    getCoordinateOverlayState() {
        const clone = typeof window.safeDeepClone === 'function'
            ? window.safeDeepClone
            : (value) => JSON.parse(JSON.stringify(value));
        return clone(this.coordinateOverlayState);
    }

    setCoordinateOverlayState(state, options = {}) {
        const { persist = true, redraw = true } = options;
        this.coordinateOverlayState = this.sanitizeCoordinateOverlayState(state);

        if (persist) {
            this.persistCoordinateOverlayState();
        }

        if (redraw) {
            this.renderCoordinateOverlay();
        }
    }

    updateCoordinateOverlayOptions(partialState, options = {}) {
        this.setCoordinateOverlayState({
            ...this.coordinateOverlayState,
            ...(partialState || {})
        }, options);
    }

    getCoordinatePaletteColor(index = 0) {
        const palette = ['#ef4444', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
        return palette[Math.abs(index) % palette.length];
    }

    getCoordinateLineColor() {
        return this.coordinateOverlayState.lineColor || this.getAdaptivePatternColor(0.74, 0.24);
    }

    getCoordinatePointLineMode() {
        return this.normalizeCoordinatePointLineMode(this.coordinateOverlayState.pointLineMode);
    }

    shouldShowCoordinatePoints() {
        return this.getCoordinatePointLineMode() !== 'line';
    }

    getTransientCoordinateSelectionLinePointIds() {
        if (this.getCoordinatePointLineMode() !== 'selected') {
            return [];
        }

        const selectionManager = window.drawingBoard?.selectionManager;
        if (!selectionManager?.isCoordinateSelection?.()) {
            return [];
        }

        return Array.isArray(selectionManager.selectedCoordinatePointIds)
            ? [...new Set(selectionManager.selectedCoordinatePointIds.filter(Boolean))]
            : [];
    }

    getCoordinatePointEntries(pointIds = null) {
        const points = this.coordinateOverlayState.points || [];
        const idSet = Array.isArray(pointIds) ? new Set(pointIds) : null;
        return points
            .filter(point => !idSet || idSet.has(point.id))
            .map((point, index) => {
                const canvasPoint = this.mathToCanvasLogicalPoint(point.x, point.y);
                return {
                    ...point,
                    index,
                    canvasX: canvasPoint.x,
                    canvasY: canvasPoint.y
                };
            });
    }

    getCanvasScreenMetrics() {
        const rect = this.bgCanvas.getBoundingClientRect();
        const logicalWidth = this.bgCanvas.offsetWidth || this.bgCanvas.clientWidth || (this.bgCanvas.width / this.getCoordinateOverlayDpr());
        const logicalHeight = this.bgCanvas.offsetHeight || this.bgCanvas.clientHeight || (this.bgCanvas.height / this.getCoordinateOverlayDpr());
        const scaleX = logicalWidth > 0 ? rect.width / logicalWidth : 1;
        const scaleY = logicalHeight > 0 ? rect.height / logicalHeight : 1;
        const visualScale = Math.max(Math.min((scaleX + scaleY) / 2, 12), 0.1);

        return {
            rect,
            logicalWidth,
            logicalHeight,
            viewportWidth: window.innerWidth || document.documentElement.clientWidth || logicalWidth,
            viewportHeight: window.innerHeight || document.documentElement.clientHeight || logicalHeight,
            scaleX,
            scaleY,
            visualScale
        };
    }

    canvasLogicalToScreenPoint(canvasX, canvasY, metrics = this.getCanvasScreenMetrics()) {
        return {
            x: metrics.rect.left + canvasX * metrics.scaleX,
            y: metrics.rect.top + canvasY * metrics.scaleY
        };
    }

    mathToScreenPoint(x, y, pattern = this.backgroundPattern, metrics = this.getCanvasScreenMetrics()) {
        const logicalPoint = this.mathToCanvasLogicalPoint(x, y, pattern);
        return this.canvasLogicalToScreenPoint(logicalPoint.x, logicalPoint.y, metrics);
    }

    getCoordinatePointIds() {
        return this.coordinateOverlayState.points.map(point => point.id);
    }

    getCoordinateGroupById(groupId) {
        if (!groupId) return null;
        return (this.coordinateOverlayState.groups || []).find(group => group.id === groupId) || null;
    }

    findCoordinateGroupByPointIds(pointIds = [], options = {}) {
        const uniqueIds = [...new Set(Array.isArray(pointIds) ? pointIds.filter(Boolean) : [])];
        if (uniqueIds.length < 2) return null;

        const expectedIds = [...uniqueIds].sort();
        return (this.coordinateOverlayState.groups || []).find(group => {
            if (!group || group.pointIds.length !== expectedIds.length) {
                return false;
            }
            if (typeof options.line === 'boolean' && !!group.line !== options.line) {
                return false;
            }
            const groupIds = [...group.pointIds].sort();
            return groupIds.every((pointId, index) => pointId === expectedIds[index]);
        }) || null;
    }

    createCoordinateGroup(pointIds = [], options = {}) {
        const normalizedPointIds = [...new Set((Array.isArray(pointIds) ? pointIds : [])
            .filter(pointId => this.getCoordinatePointIds().includes(pointId)))];
        if (normalizedPointIds.length < 2) return null;

        const existingGroup = this.findCoordinateGroupByPointIds(normalizedPointIds, { line: options.line === true });
        if (existingGroup) {
            return existingGroup;
        }

        const nextState = this.getCoordinateOverlayState();
        const group = {
            id: `coord-group-${Date.now()}-${nextState.groups.length}`,
            pointIds: normalizedPointIds,
            line: options.line === true
        };
        nextState.groups.push(group);
        this.setCoordinateOverlayState(nextState, options);
        return group;
    }

    removeCoordinateGroup(groupId, options = {}) {
        if (!groupId) return false;
        const nextState = this.getCoordinateOverlayState();
        const initialLength = nextState.groups.length;
        nextState.groups = nextState.groups.filter(group => group.id !== groupId);
        if (nextState.groups.length === initialLength) return false;
        this.setCoordinateOverlayState(nextState, options);
        return true;
    }

    hasCoordinateSelectableContent() {
        return (this.coordinateOverlayState.points?.length || 0) > 0;
    }

    distancePointToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) {
            return Math.hypot(px - x1, py - y1);
        }
        const t = Math.max(0, Math.min(1, (((px - x1) * dx) + ((py - y1) * dy)) / ((dx * dx) + (dy * dy))));
        const nearestX = x1 + (t * dx);
        const nearestY = y1 + (t * dy);
        return Math.hypot(px - nearestX, py - nearestY);
    }

    buildCoordinateLineSegmentsFromPointIds(pointIds = [], segmentPrefix = 'coord-line') {
        const entries = this.getCoordinatePointEntries(pointIds);
        if (entries.length < 2) {
            return [];
        }

        const segments = [];
        for (let i = 1; i < entries.length; i++) {
            segments.push({
                id: `${segmentPrefix}-${entries[i - 1].id}-${entries[i].id}-${i}`,
                start: entries[i - 1],
                end: entries[i],
                pointIds: [entries[i - 1].id, entries[i].id]
            });
        }
        return segments;
    }

    getCoordinateLinePaths(options = {}) {
        const { includeTransientSelection = false } = options;
        const mode = this.getCoordinatePointLineMode();

        if (mode === 'selected') {
            const paths = (this.coordinateOverlayState.groups || [])
                .filter(group => group?.line === true)
                .map(group => ({
                    id: group.id,
                    pointIds: [...group.pointIds]
                }))
                .filter(group => group.pointIds.length > 1);

            if (includeTransientSelection) {
                const transientIds = this.getTransientCoordinateSelectionLinePointIds();
                if (transientIds.length > 1) {
                    const signature = transientIds.join('|');
                    const hasSamePath = paths.some(path => path.pointIds.join('|') === signature);
                    if (!hasSamePath) {
                        paths.push({
                            id: 'coord-line-selection-preview',
                            pointIds: transientIds,
                            transient: true
                        });
                    }
                }
            }

            return paths;
        }

        const allPointIds = this.getCoordinatePointIds();
        if (allPointIds.length < 2) {
            return [];
        }

        return [{
            id: 'coord-line-all-points',
            pointIds: allPointIds
        }];
    }

    getCoordinateLineSegments(options = {}) {
        return this.getCoordinateLinePaths(options)
            .flatMap(path => this.buildCoordinateLineSegmentsFromPointIds(path.pointIds, path.id));
    }

    findCoordinatePointNearCanvasPoint(canvasX, canvasY, threshold = 10) {
        const entries = this.getCoordinatePointEntries();
        for (let i = entries.length - 1; i >= 0; i--) {
            const point = entries[i];
            if (Math.hypot(canvasX - point.canvasX, canvasY - point.canvasY) <= threshold) {
                return point;
            }
        }
        return null;
    }

    findCoordinatePointByMathPosition(x, y, tolerance = 0.0001) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
        }
        return (this.coordinateOverlayState.points || []).find(point =>
            Math.abs(point.x - x) <= tolerance && Math.abs(point.y - y) <= tolerance
        ) || null;
    }

    hitTestCoordinateOverlay(canvasX, canvasY, threshold = 10) {
        const hitPoint = this.findCoordinatePointNearCanvasPoint(canvasX, canvasY, threshold);
        if (hitPoint) {
            return { type: 'point', pointId: hitPoint.id };
        }

        const segments = this.getCoordinateLineSegments();
        for (const segment of segments) {
            const distance = this.distancePointToSegment(
                canvasX,
                canvasY,
                segment.start.canvasX,
                segment.start.canvasY,
                segment.end.canvasX,
                segment.end.canvasY
            );
            if (distance <= threshold) {
                return {
                    type: 'line',
                    segmentId: segment.id,
                    pointIds: segment.pointIds
                };
            }
        }

        return null;
    }

    getCoordinateSelectionBounds(pointIds = null, padding = 10, options = {}) {
        const entries = this.getCoordinatePointEntries(pointIds);
        if (entries.length === 0) return null;
        const minWidth = Number.isFinite(options?.minWidth) ? Math.max(0, options.minWidth) : 132;
        const minHeight = Number.isFinite(options?.minHeight) ? Math.max(0, options.minHeight) : 56;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        entries.forEach(point => {
            minX = Math.min(minX, point.canvasX);
            minY = Math.min(minY, point.canvasY);
            maxX = Math.max(maxX, point.canvasX);
            maxY = Math.max(maxY, point.canvasY);
        });

        return {
            x: minX - padding,
            y: minY - padding,
            width: Math.max(minWidth, (maxX - minX) + padding * 2),
            height: Math.max(minHeight, (maxY - minY) + padding * 2)
        };
    }

    updateCoordinatePoints(pointUpdates = [], options = {}) {
        if (!Array.isArray(pointUpdates) || pointUpdates.length === 0) return false;
        const updateMap = new Map(pointUpdates.filter(update => update?.id).map(update => [update.id, update]));
        if (updateMap.size === 0) return false;

        const nextState = this.getCoordinateOverlayState();
        let changed = false;
        nextState.points = nextState.points.map(point => {
            const update = updateMap.get(point.id);
            if (!update) return point;
            changed = true;
            return {
                ...point,
                x: Number.isFinite(update.x) ? this.roundToDecimals(update.x, 4) : point.x,
                y: Number.isFinite(update.y) ? this.roundToDecimals(update.y, 4) : point.y,
                color: typeof update.color === 'string' && update.color.trim() ? update.color.trim() : point.color
            };
        });

        if (!changed) return false;
        this.setCoordinateOverlayState(nextState, options);
        return true;
    }

    setCoordinatePointsColor(pointIds, color, options = {}) {
        if (!Array.isArray(pointIds) || !pointIds.length || !color) return false;
        return this.updateCoordinatePoints(pointIds.map(id => ({ id, color })), options);
    }

    setCoordinateLineColor(color, options = {}) {
        if (typeof color !== 'string' || !color.trim()) return false;
        this.updateCoordinateOverlayOptions({ lineColor: color.trim() }, options);
        return true;
    }

    removeCoordinatePoints(pointIds, options = {}) {
        if (!Array.isArray(pointIds) || pointIds.length === 0) return false;
        const idSet = new Set(pointIds);
        const nextState = this.getCoordinateOverlayState();
        const initialLength = nextState.points.length;
        nextState.points = nextState.points.filter(point => !idSet.has(point.id));
        if (nextState.points.length === initialLength) return false;
        nextState.groups = (nextState.groups || [])
            .map(group => ({
                ...group,
                pointIds: group.pointIds.filter(pointId => !idSet.has(pointId))
            }))
            .filter(group => group.pointIds.length >= 2);
        this.setCoordinateOverlayState(nextState, options);
        return true;
    }

    escapeSvgText(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    sanitizeSvgColor(value, fallback = '#2563eb') {
        const normalized = String(value ?? '').trim();

        if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
            return normalized.toLowerCase();
        }

        if (/^(?:rgb|hsl)a?\(\s*[-\d.%\s,]+\)$/i.test(normalized)) {
            return normalized.replace(/\s+/g, ' ').trim();
        }

        const keyword = normalized.toLowerCase();
        const safeKeywords = new Set([
            'transparent',
            'currentcolor',
            'black',
            'white',
            'red',
            'green',
            'blue',
            'yellow',
            'orange',
            'purple',
            'pink',
            'gray',
            'grey',
            'brown',
            'cyan',
            'magenta'
        ]);
        if (safeKeywords.has(keyword)) {
            return keyword === 'currentcolor' ? 'currentColor' : keyword;
        }

        return fallback;
    }

    roundToDecimals(value, decimals = 2) {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
    }

    formatCoordinateValue(value, decimals = 2) {
        if (!Number.isFinite(value)) return '';
        let rounded = this.roundToDecimals(value, decimals);
        if (Object.is(rounded, -0)) {
            rounded = 0;
        }
        return String(rounded).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    }

    getCoordinateOverlayDpr() {
        const logicalWidth = this.bgCanvas.clientWidth || 0;
        if (logicalWidth > 0) {
            return this.bgCanvas.width / logicalWidth;
        }
        return window.devicePixelRatio || 1;
    }

    getPatternOriginLogical(dpr = this.getCoordinateOverlayDpr()) {
        return {
            x: (this.bgCanvas.width / (2 * dpr)) + this.coordinateOriginX,
            y: (this.bgCanvas.height / (2 * dpr)) + this.coordinateOriginY
        };
    }

    getCoordinateUnitSize(pattern = this.backgroundPattern) {
        if (pattern !== 'coordinate' && pattern !== 'polar') {
            return 20;
        }
        return 20 / this.patternDensity;
    }

    mathToCanvasLogicalPoint(x, y, pattern = this.backgroundPattern) {
        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize(pattern);
        return {
            x: origin.x + x * unitSize,
            y: origin.y - y * unitSize
        };
    }

    canvasLogicalToMathPoint(canvasX, canvasY, options = {}) {
        const { snap = this.coordinateOverlayState.snapToGrid, decimals = 2 } = options;
        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize();

        let x = (canvasX - origin.x) / unitSize;
        let y = (origin.y - canvasY) / unitSize;

        if (snap) {
            x = Math.round(x);
            y = Math.round(y);
        } else {
            x = this.roundToDecimals(x, decimals);
            y = this.roundToDecimals(y, decimals);
        }

        return { x, y };
    }

    ensureCoordinateOverlayCanvas() {
        if (this.coordinateOverlayCanvas && document.body.contains(this.coordinateOverlayCanvas)) {
            return this.coordinateOverlayCanvas;
        }

        const transformLayer = document.getElementById('transform-layer');
        if (!transformLayer) return null;

        let overlayCanvas = document.getElementById('coordinate-overlay-canvas');
        if (!overlayCanvas) {
            overlayCanvas = document.createElement('canvas');
            overlayCanvas.id = 'coordinate-overlay-canvas';
            overlayCanvas.style.position = 'absolute';
            overlayCanvas.style.inset = '0';
            overlayCanvas.style.width = '100%';
            overlayCanvas.style.height = '100%';
            overlayCanvas.style.pointerEvents = 'none';
            overlayCanvas.style.zIndex = '0';

            const gifLayer = document.getElementById('gif-layer');
            if (gifLayer) {
                transformLayer.insertBefore(overlayCanvas, gifLayer);
            } else {
                transformLayer.appendChild(overlayCanvas);
            }
        }

        this.coordinateOverlayCanvas = overlayCanvas;
        this.coordinateOverlayCtx = overlayCanvas.getContext('2d');
        return overlayCanvas;
    }

    syncCoordinateOverlayCanvasSize() {
        const overlayCanvas = this.ensureCoordinateOverlayCanvas();
        if (!overlayCanvas || !this.coordinateOverlayCtx) return null;

        const logicalWidth = this.bgCanvas.clientWidth || (this.bgCanvas.width / (window.devicePixelRatio || 1));
        const logicalHeight = this.bgCanvas.clientHeight || (this.bgCanvas.height / (window.devicePixelRatio || 1));
        const dpr = logicalWidth > 0 ? this.bgCanvas.width / logicalWidth : this.getCoordinateOverlayDpr();

        if (overlayCanvas.width !== this.bgCanvas.width || overlayCanvas.height !== this.bgCanvas.height) {
            overlayCanvas.width = this.bgCanvas.width;
            overlayCanvas.height = this.bgCanvas.height;
        }

        overlayCanvas.style.width = `${logicalWidth}px`;
        overlayCanvas.style.height = `${logicalHeight}px`;

        this.coordinateOverlayCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.coordinateOverlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        this.coordinateOverlayCtx.scale(dpr, dpr);

        return {
            canvas: overlayCanvas,
            ctx: this.coordinateOverlayCtx,
            dpr,
            logicalWidth,
            logicalHeight
        };
    }

    ensureCoordinateOverlaySvg() {
        if (this.coordinateOverlaySvg && document.body.contains(this.coordinateOverlaySvg)) {
            return this.coordinateOverlaySvg;
        }

        let overlaySvg = document.getElementById('coordinate-overlay-svg');
        if (!overlaySvg) {
            overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            overlaySvg.id = 'coordinate-overlay-svg';
            overlaySvg.style.position = 'fixed';
            overlaySvg.style.left = '0';
            overlaySvg.style.top = '0';
            overlaySvg.style.width = '100vw';
            overlaySvg.style.height = '100vh';
            overlaySvg.style.pointerEvents = 'none';
            overlaySvg.style.zIndex = '2';
            overlaySvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            overlaySvg.setAttribute('overflow', 'visible');
            overlaySvg.setAttribute('shape-rendering', 'geometricPrecision');
            overlaySvg.setAttribute('text-rendering', 'geometricPrecision');
            document.body.appendChild(overlaySvg);
        }

        this.coordinateOverlaySvg = overlaySvg;
        return overlaySvg;
    }

    syncCoordinateOverlaySvgSize() {
        const overlaySvg = this.ensureCoordinateOverlaySvg();
        if (!overlaySvg) return null;

        const metrics = this.getCanvasScreenMetrics();
        overlaySvg.style.width = `${metrics.viewportWidth}px`;
        overlaySvg.style.height = `${metrics.viewportHeight}px`;
        overlaySvg.setAttribute('width', String(metrics.viewportWidth));
        overlaySvg.setAttribute('height', String(metrics.viewportHeight));
        overlaySvg.setAttribute('viewBox', `0 0 ${metrics.viewportWidth} ${metrics.viewportHeight}`);

        return {
            svg: overlaySvg,
            logicalWidth: metrics.logicalWidth,
            logicalHeight: metrics.logicalHeight,
            metrics
        };
    }

    renderCoordinateOriginSvg(origin, metrics) {
        if (!this.coordinateOverlayState.showOrigin) return '';
        const screenOrigin = this.canvasLogicalToScreenPoint(origin.x, origin.y, metrics);
        const fill = this.getAdaptivePatternColor(0.9, 0.28);
        const stroke = this.backgroundColor;
        const radius = Math.max(4.5, Math.min(16, 5.5 * metrics.visualScale));
        const strokeWidth = Math.max(1.2, Math.min(5, 2 * metrics.visualScale));
        return `
            <g class="coordinate-origin-marker">
                <circle cx="${screenOrigin.x}" cy="${screenOrigin.y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"></circle>
            </g>
        `;
    }

    getCoordinateLabelInterval(unitSize) {
        if (unitSize < 12) return 10;
        if (unitSize < 18) return 5;
        if (unitSize < 30) return 2;
        return 1;
    }

    getPolarAngleLabelStep() {
        const angleStep = this.getPolarAngleStep();
        if (angleStep <= 10) return 30;
        if (angleStep <= 15) return 45;
        if (angleStep <= 30) return 45;
        return 90;
    }

    normalizePlotExpression(expression, coordinateType = this.backgroundPattern) {
        let normalized = String(expression || '').trim();
        if (!normalized) return '';

        if (coordinateType === 'polar') {
            normalized = normalized.replace(/^r\s*=\s*/i, '');
        } else {
            normalized = normalized.replace(/^y\s*=\s*/i, '');
        }

        return normalized.trim();
    }

    normalizePlotToken(token) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) return token;

        const lower = token.toLowerCase();
        if (lower === 'pi') return 'PI';
        if (lower === 'e') return 'E';
        if (lower === 'x' || lower === 'theta' || lower === 'deg') return lower;
        if (lower === 'ln') return 'log';
        return lower;
    }

    isPlotNumberToken(token) {
        return /^(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(token);
    }

    isPlotNamedValueToken(token) {
        return token === 'x' || token === 'theta' || token === 'deg' || token === 'PI' || token === 'E';
    }

    isPlotIdentifierToken(token) {
        return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token);
    }

    shouldInsertImplicitMultiplication(previousToken, nextToken) {
        if (!previousToken || !nextToken) return false;

        const previousBlockedTokens = new Set(['+', '-', '*', '/', '^', '**', ',', '(']);
        const nextBlockedTokens = new Set(['+', '-', '*', '/', '^', '**', ',', ')']);
        if (previousBlockedTokens.has(previousToken) || nextBlockedTokens.has(nextToken)) {
            return false;
        }

        const previousEndsValue = this.isPlotNumberToken(previousToken)
            || previousToken === ')'
            || this.isPlotNamedValueToken(previousToken);
        const nextStartsValue = this.isPlotNumberToken(nextToken)
            || nextToken === '('
            || this.isPlotNamedValueToken(nextToken)
            || (this.isPlotIdentifierToken(nextToken) && !this.isPlotNamedValueToken(nextToken));

        return previousEndsValue && nextStartsValue;
    }

    tokenizePlotExpression(expression) {
        const compactExpression = String(expression || '').replace(/\s+/g, '');
        if (!compactExpression) return [];

        const tokenPattern = /(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?|PI|E|theta|deg|x|[A-Za-z_][A-Za-z0-9_]*|\*\*|[()+\-*/^,]/gi;
        const tokens = [];
        let currentIndex = 0;

        while (currentIndex < compactExpression.length) {
            tokenPattern.lastIndex = currentIndex;
            const match = tokenPattern.exec(compactExpression);
            if (!match || match.index !== currentIndex) {
                throw new Error('invalid-expression');
            }

            tokens.push(this.normalizePlotToken(match[0]));
            currentIndex = tokenPattern.lastIndex;
        }

        return tokens;
    }

    preparePlotExpression(expression, coordinateType = this.backgroundPattern) {
        let normalized = this.normalizePlotExpression(expression, coordinateType);
        if (!normalized) return '';

        const replacements = [
            [/π/gi, 'PI'],
            [/θ/gi, 'theta'],
            [/[（﹙［【]/g, '('],
            [/[）﹚］】]/g, ')'],
            [/[＋﹢]/g, '+'],
            [/[－﹣−–—]/g, '-'],
            [/[×✕✖＊·•]/g, '*'],
            [/[÷／]/g, '/'],
            [/[，、]/g, ','],
            [/。/g, '.'],
            [/＝/g, '='],
            [/[＾˄]/g, '^']
        ];

        replacements.forEach(([pattern, value]) => {
            normalized = normalized.replace(pattern, value);
        });

        const tokens = this.tokenizePlotExpression(normalized);
        if (tokens.length === 0) {
            throw new Error('empty-expression');
        }

        const preparedTokens = [];
        tokens.forEach((token, index) => {
            const previousToken = preparedTokens.length ? preparedTokens[preparedTokens.length - 1] : null;
            if (this.shouldInsertImplicitMultiplication(previousToken, token)) {
                preparedTokens.push('*');
            }
            preparedTokens.push(token === '^' ? '**' : token);
        });

        return preparedTokens.join('');
    }

    buildSafePlotEvaluator(preparedExpression) {
        const tokens = this.tokenizePlotExpression(preparedExpression);
        if (tokens.length === 0) {
            throw new Error('invalid-expression');
        }
        const rpn = this.convertPlotTokensToRpn(tokens);
        return (x, theta, deg, PI, E) => this.evaluatePlotRpn(rpn, {
            x,
            theta,
            deg,
            PI: PI ?? Math.PI,
            E: E ?? Math.E
        });
    }

    convertPlotTokensToRpn(tokens) {
        // Function allowlist: everything the old `with (Math) { return ... }` path
        // exposed, minus mutating/irrelevant members (random, eval-adjacent, etc).
        // Keep in sync with evaluatePlotRpn. Function nodes carry `argCount`
        // so variadic Math helpers preserve their original call boundaries.
        const functionArity = BackgroundManager.PLOT_FUNCTION_ARITY;
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, 'u+': 3, 'u-': 3, '**': 4 };
        const rightAssoc = new Set(['**', 'u+', 'u-']);
        const binaryOps = new Set(['+', '-', '*', '/', '**']);

        const output = [];
        const stack = [];
        let previousToken = null;

        const isValueToken = (token) => {
            if (token === null) return false;
            if (/^(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(token)) return true;
            if (token === 'x' || token === 'theta' || token === 'deg' || token === 'PI' || token === 'E') return true;
            if (token === ')') return true;
            return false;
        };

        const isFunctionName = (token) => Object.prototype.hasOwnProperty.call(functionArity, token);

        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index];

            if (/^(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(token)) {
                output.push({ kind: 'number', value: Number(token) });
                previousToken = token;
                continue;
            }

            if (token === 'x' || token === 'theta' || token === 'deg' || token === 'PI' || token === 'E') {
                output.push({ kind: 'variable', name: token });
                previousToken = token;
                continue;
            }

            if (isFunctionName(token)) {
                stack.push({ kind: 'function', name: token });
                previousToken = token;
                continue;
            }

            if (token === ',') {
                while (stack.length > 0 && stack[stack.length - 1].kind !== 'paren') {
                    output.push(stack.pop());
                }
                if (stack.length === 0) {
                    throw new Error('invalid-expression');
                }
                const callFrame = stack[stack.length - 1];
                if (!callFrame.call || !isValueToken(previousToken)) {
                    throw new Error('invalid-expression');
                }
                callFrame.argumentCount += 1;
                previousToken = token;
                continue;
            }

            if (binaryOps.has(token)) {
                const isUnary = !isValueToken(previousToken) && (token === '+' || token === '-');
                const opName = isUnary ? (token === '-' ? 'u-' : 'u+') : token;
                const opPrecedence = precedence[opName];
                while (stack.length > 0) {
                    const top = stack[stack.length - 1];
                    if (top.kind !== 'operator' && top.kind !== 'function') break;
                    if (top.kind === 'function') {
                        output.push(stack.pop());
                        continue;
                    }
                    // Treat a leading sign as applying to the whole power term
                    // (`-x^2` => `-(x^2)`), while still allowing negative
                    // exponents (`2^-3`). So when we are reading a unary sign,
                    // we keep a pending exponent on the stack until its right
                    // operand has been parsed.
                    if ((opName === 'u+' || opName === 'u-') && top.name === '**') {
                        break;
                    }
                    const topPrecedence = precedence[top.name];
                    const shouldPop = rightAssoc.has(opName)
                        ? topPrecedence > opPrecedence
                        : topPrecedence >= opPrecedence;
                    if (!shouldPop) break;
                    output.push(stack.pop());
                }
                stack.push({ kind: 'operator', name: opName });
                previousToken = token;
                continue;
            }

            if (token === '(') {
                stack.push({
                    kind: 'paren',
                    call: isFunctionName(previousToken),
                    argumentCount: 0
                });
                previousToken = token;
                continue;
            }

            if (token === ')') {
                while (stack.length > 0 && stack[stack.length - 1].kind !== 'paren') {
                    output.push(stack.pop());
                }
                if (stack.length === 0) {
                    throw new Error('invalid-expression');
                }
                const paren = stack.pop();
                if (paren.call) {
                    const argCount = isValueToken(previousToken) ? paren.argumentCount + 1 : 0;
                    if (stack.length === 0 || stack[stack.length - 1].kind !== 'function') {
                        throw new Error('invalid-expression');
                    }
                    output.push({
                        ...stack.pop(),
                        argCount
                    });
                }
                previousToken = token;
                continue;
            }

            // Any identifier that is not in the function allowlist (and not one of
            // the known variables) is rejected — this is how we keep the
            // evaluator's attack surface bounded.
            throw new Error('invalid-expression');
        }

        while (stack.length > 0) {
            const top = stack.pop();
            if (top.kind === 'paren') {
                throw new Error('invalid-expression');
            }
            output.push(top);
        }

        return output;
    }

    evaluatePlotRpn(rpn, variables) {
        const functionArity = BackgroundManager.PLOT_FUNCTION_ARITY;
        const stack = [];
        for (let index = 0; index < rpn.length; index++) {
            const node = rpn[index];
            if (node.kind === 'number') {
                stack.push(node.value);
                continue;
            }
            if (node.kind === 'variable') {
                stack.push(variables[node.name]);
                continue;
            }
            if (node.kind === 'operator') {
                if (node.name === 'u-' || node.name === 'u+') {
                    if (stack.length < 1) throw new Error('invalid-expression');
                    const arg = stack.pop();
                    stack.push(node.name === 'u-' ? -arg : +arg);
                    continue;
                }
                if (stack.length < 2) throw new Error('invalid-expression');
                const right = stack.pop();
                const left = stack.pop();
                switch (node.name) {
                    case '+': stack.push(left + right); break;
                    case '-': stack.push(left - right); break;
                    case '*': stack.push(left * right); break;
                    case '/': stack.push(left / right); break;
                    case '**': stack.push(Math.pow(left, right)); break;
                    default: throw new Error('invalid-expression');
                }
                continue;
            }
            if (node.kind === 'function') {
                const arity = functionArity[node.name];
                const fn = Math[node.name];
                if (typeof fn !== 'function') {
                    throw new Error('invalid-expression');
                }
                const argCount = Number.isInteger(node.argCount) ? node.argCount : arity.max;
                if (argCount < arity.min || argCount > arity.max) {
                    throw new Error('invalid-expression');
                }
                if (stack.length < argCount) {
                    throw new Error('invalid-expression');
                }
                const args = stack.splice(stack.length - argCount, argCount);
                stack.push(fn.apply(null, args));
                continue;
            }
            throw new Error('invalid-expression');
        }
        if (stack.length !== 1) {
            throw new Error('invalid-expression');
        }
        return stack[0];
    }

    createPlotEvaluator(expression, coordinateType = this.backgroundPattern) {
        const normalized = this.preparePlotExpression(expression, coordinateType);

        try {
            // Previously this compiled the expression with `new Function(..., "with(Math){ return (...) }")`.
            // That works, but it means any coordinate expression — including ones imported
            // from an untrusted project `.zip` — is executed as real JavaScript. The
            // safe evaluator below tokenises, converts to RPN via shunting-yard, and
            // walks the RPN with a whitelist of Math helpers, so arbitrary code in an
            // imported board cannot run in the current user's origin.
            return this.buildSafePlotEvaluator(normalized);
        } catch (error) {
            throw new Error('invalid-expression');
        }
    }

    addCoordinatePoint(canvasX, canvasY, options = {}) {
        const point = this.canvasLogicalToMathPoint(canvasX, canvasY, options);
        const duplicatePoint =
            this.findCoordinatePointByMathPosition(point.x, point.y) ||
            this.findCoordinatePointNearCanvasPoint(canvasX, canvasY, options.duplicateThreshold ?? 12);
        if (duplicatePoint) {
            return {
                ...duplicatePoint,
                duplicate: true
            };
        }

        const nextState = this.getCoordinateOverlayState();
        nextState.points.push({
            id: `pt-${Date.now()}-${nextState.points.length}`,
            x: point.x,
            y: point.y,
            color: options.color || this.getCoordinatePaletteColor(nextState.points.length)
        });
        this.setCoordinateOverlayState(nextState, options);
        return nextState.points[nextState.points.length - 1];
    }

    clearCoordinatePoints() {
        this.updateCoordinateOverlayOptions({ points: [] });
    }

    addCoordinatePlot(expression, coordinateType = this.backgroundPattern, color = null) {
        const normalizedType = coordinateType === 'polar' ? 'polar' : 'coordinate';
        const normalizedExpression = this.validateCoordinatePlotExpression(expression, normalizedType);
        const nextState = this.getCoordinateOverlayState();
        const sameTypePlots = nextState.plots.filter(plot => plot.coordinateType === normalizedType);
        nextState.plots.push({
            id: `plot-${Date.now()}-${nextState.plots.length}`,
            expression: normalizedExpression,
            coordinateType: normalizedType,
            color: color || this.getCoordinatePaletteColor(sameTypePlots.length + 1),
            strokeWidth: 2.5,
            dashStyle: 'solid',
            segments: []
        });
        this.setCoordinateOverlayState(nextState);
        return nextState.plots[nextState.plots.length - 1];
    }

    updateCoordinatePlot(plotId, partialPlot = {}, options = {}) {
        if (!plotId) return false;

        const nextState = this.getCoordinateOverlayState();
        let changed = false;
        nextState.plots = nextState.plots.map(plot => {
            if (plot.id !== plotId) return plot;
            changed = true;

            const nextType = partialPlot.coordinateType
                ? (partialPlot.coordinateType === 'polar' ? 'polar' : 'coordinate')
                : plot.coordinateType;
            const nextExpression = Object.prototype.hasOwnProperty.call(partialPlot, 'expression')
                ? this.validateCoordinatePlotExpression(partialPlot.expression, nextType)
                : plot.expression;

            return {
                ...plot,
                expression: nextExpression,
                coordinateType: nextType,
                color: typeof partialPlot.color === 'string' && partialPlot.color.trim()
                    ? partialPlot.color.trim()
                    : plot.color,
                strokeWidth: Object.prototype.hasOwnProperty.call(partialPlot, 'strokeWidth')
                    ? this.normalizePlotStrokeWidth(partialPlot.strokeWidth)
                    : this.normalizePlotStrokeWidth(plot.strokeWidth),
                dashStyle: Object.prototype.hasOwnProperty.call(partialPlot, 'dashStyle')
                    ? this.normalizePlotDashStyle(partialPlot.dashStyle)
                    : this.normalizePlotDashStyle(plot.dashStyle),
                segments: Object.prototype.hasOwnProperty.call(partialPlot, 'segments')
                    ? this.sanitizeCoordinatePlotSegments(partialPlot.segments, nextType)
                    : this.sanitizeCoordinatePlotSegments(plot.segments, nextType)
            };
        });

        if (!changed) return false;
        this.setCoordinateOverlayState(nextState, options);
        return true;
    }

    removeCoordinatePlot(plotId) {
        this.updateCoordinateOverlayOptions({
            plots: this.coordinateOverlayState.plots.filter(plot => plot.id !== plotId)
        });
    }

    clearCoordinatePlots(coordinateType = this.backgroundPattern) {
        this.updateCoordinateOverlayOptions({
            plots: this.coordinateOverlayState.plots.filter(plot => plot.coordinateType !== coordinateType)
        });
    }

    getPointDisplayLabel(point, index, pattern = this.backgroundPattern) {
        if (pattern === 'polar') {
            const radius = Math.sqrt((point.x ** 2) + (point.y ** 2));
            const theta = (Math.atan2(point.y, point.x) * 180 / Math.PI + 360) % 360;
            return `P${index + 1}(${this.formatCoordinateValue(radius)}, ${this.formatCoordinateValue(theta, 1)}°)`;
        }

        return `P${index + 1}(${this.formatCoordinateValue(point.x)}, ${this.formatCoordinateValue(point.y)})`;
    }

    renderCartesianTicksAndLabels(origin, unitSize, logicalWidth, logicalHeight, metrics) {
        const { showTicks, showLabels } = this.coordinateOverlayState;
        if (!showTicks && !showLabels) return '';

        const axisColor = this.getAdaptivePatternColor(0.82, 0.24);
        const labelColor = this.getAdaptivePatternColor(0.76, 0.22);
        const tickSize = Math.max(4, Math.min(14, 5 * metrics.visualScale));
        const fontSize = Math.max(11, Math.min(48, unitSize * 0.55 * metrics.visualScale));
        const lineWidth = Math.max(1, Math.min(4, metrics.visualScale));
        const labelInterval = this.getCoordinateLabelInterval(unitSize);
        const xMin = Math.ceil((0 - origin.x) / unitSize);
        const xMax = Math.floor((logicalWidth - origin.x) / unitSize);
        const yMin = Math.ceil((origin.y - logicalHeight) / unitSize);
        const yMax = Math.floor(origin.y / unitSize);
        const screenOrigin = this.canvasLogicalToScreenPoint(origin.x, origin.y, metrics);
        const axisVisibleX = screenOrigin.y >= -tickSize && screenOrigin.y <= metrics.viewportHeight + tickSize;
        const axisVisibleY = screenOrigin.x >= -tickSize && screenOrigin.x <= metrics.viewportWidth + tickSize;
        const parts = [];

        if (showTicks && axisVisibleX) {
            for (let x = xMin; x <= xMax; x++) {
                if (x === 0) continue;
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x + x * unitSize, origin.y, metrics);
                parts.push(`<line x1="${screenPoint.x}" y1="${screenOrigin.y - tickSize}" x2="${screenPoint.x}" y2="${screenOrigin.y + tickSize}" stroke="${axisColor}" stroke-width="${lineWidth}"></line>`);
            }
        }

        if (showTicks && axisVisibleY) {
            for (let y = yMin; y <= yMax; y++) {
                if (y === 0) continue;
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x, origin.y - y * unitSize, metrics);
                parts.push(`<line x1="${screenOrigin.x - tickSize}" y1="${screenPoint.y}" x2="${screenOrigin.x + tickSize}" y2="${screenPoint.y}" stroke="${axisColor}" stroke-width="${lineWidth}"></line>`);
            }
        }

        if (showLabels && axisVisibleX) {
            const labelY = Math.min(metrics.viewportHeight - fontSize - 6, screenOrigin.y + (8 * metrics.visualScale));
            for (let x = xMin; x <= xMax; x++) {
                if (x === 0 || x % labelInterval !== 0) continue;
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x + x * unitSize, origin.y, metrics);
                parts.push(`<text x="${screenPoint.x}" y="${labelY}" fill="${labelColor}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="hanging">${this.escapeSvgText(this.formatCoordinateValue(x, 0))}</text>`);
            }
        }

        if (showLabels && axisVisibleY) {
            const textAnchor = screenOrigin.x > metrics.viewportWidth - (fontSize * 3.2) ? 'end' : 'start';
            const labelX = textAnchor === 'end'
                ? screenOrigin.x - (8 * metrics.visualScale)
                : screenOrigin.x + (8 * metrics.visualScale);
            for (let y = yMin; y <= yMax; y++) {
                if (y === 0 || y % labelInterval !== 0) continue;
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x, origin.y - y * unitSize, metrics);
                parts.push(`<text x="${labelX}" y="${screenPoint.y}" fill="${labelColor}" font-size="${fontSize}" text-anchor="${textAnchor}" dominant-baseline="middle">${this.escapeSvgText(this.formatCoordinateValue(y, 0))}</text>`);
            }
        }

        if (showLabels && axisVisibleX && axisVisibleY) {
            parts.push(`<text x="${screenOrigin.x + (6 * metrics.visualScale)}" y="${screenOrigin.y + (6 * metrics.visualScale)}" fill="${labelColor}" font-size="${fontSize}" text-anchor="start" dominant-baseline="hanging">0</text>`);
        }

        return `<g class="coordinate-cartesian-labels">${parts.join('')}</g>`;
    }

    renderPolarTicksAndLabels(origin, unitSize, logicalWidth, logicalHeight, metrics) {
        const { showTicks, showLabels } = this.coordinateOverlayState;
        if (!showTicks && !showLabels) return '';

        const labelColor = this.getAdaptivePatternColor(0.76, 0.22);
        const tickColor = this.getAdaptivePatternColor(0.82, 0.24);
        const fontSize = Math.max(11, Math.min(48, unitSize * 0.55 * metrics.visualScale));
        const lineWidth = Math.max(1, Math.min(4, metrics.visualScale));
        const radiusInterval = this.getCoordinateLabelInterval(unitSize);
        const safeRadius = Math.max(0, Math.min(origin.x, logicalWidth - origin.x, origin.y, logicalHeight - origin.y) - 18);
        const maxRadiusUnits = Math.floor(Math.max(
            Math.hypot(origin.x, origin.y),
            Math.hypot(logicalWidth - origin.x, origin.y),
            Math.hypot(origin.x, logicalHeight - origin.y),
            Math.hypot(logicalWidth - origin.x, logicalHeight - origin.y)
        ) / unitSize);
        const angleStep = this.getPolarAngleLabelStep();
        const screenOrigin = this.canvasLogicalToScreenPoint(origin.x, origin.y, metrics);
        const parts = [];

        if (showTicks) {
            for (let radius = 1; radius <= maxRadiusUnits; radius++) {
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x + radius * unitSize, origin.y, metrics);
                if (screenPoint.x < -12 || screenPoint.x > metrics.viewportWidth + 12) continue;
                const tickHalf = Math.max(3, Math.min(10, 4 * metrics.visualScale));
                parts.push(`<line x1="${screenPoint.x}" y1="${screenOrigin.y - tickHalf}" x2="${screenPoint.x}" y2="${screenOrigin.y + tickHalf}" stroke="${tickColor}" stroke-width="${lineWidth}"></line>`);
            }

            if (safeRadius > 24) {
                for (let angle = 0; angle < 360; angle += angleStep) {
                    const rad = angle * Math.PI / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const startPoint = this.canvasLogicalToScreenPoint(origin.x + (safeRadius - 6) * cos, origin.y - (safeRadius - 6) * sin, metrics);
                    const endPoint = this.canvasLogicalToScreenPoint(origin.x + safeRadius * cos, origin.y - safeRadius * sin, metrics);
                    parts.push(`<line x1="${startPoint.x}" y1="${startPoint.y}" x2="${endPoint.x}" y2="${endPoint.y}" stroke="${tickColor}" stroke-width="${lineWidth}"></line>`);
                }
            }
        }

        if (showLabels) {
            for (let radius = radiusInterval; radius <= maxRadiusUnits; radius += radiusInterval) {
                const screenPoint = this.canvasLogicalToScreenPoint(origin.x + radius * unitSize, origin.y, metrics);
                if (screenPoint.x > metrics.viewportWidth - 12 || screenOrigin.y < 16 || screenOrigin.y > metrics.viewportHeight - 4) continue;
                parts.push(`<text x="${screenPoint.x + (4 * metrics.visualScale)}" y="${screenOrigin.y - (6 * metrics.visualScale)}" fill="${labelColor}" font-size="${fontSize}" text-anchor="start" dominant-baseline="auto">${this.escapeSvgText(this.formatCoordinateValue(radius, 0))}</text>`);
            }

            if (safeRadius > 28) {
                for (let angle = 0; angle < 360; angle += angleStep) {
                    const rad = angle * Math.PI / 180;
                    const labelRadius = safeRadius - 14;
                    const labelPoint = this.canvasLogicalToScreenPoint(origin.x + labelRadius * Math.cos(rad), origin.y - labelRadius * Math.sin(rad), metrics);
                    parts.push(`<text x="${labelPoint.x}" y="${labelPoint.y}" fill="${labelColor}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${angle}°</text>`);
                }
            }
        }

        return `<g class="coordinate-polar-labels">${parts.join('')}</g>`;
    }

    renderCoordinatePlots(logicalWidth, logicalHeight, metrics) {
        const activePlots = this.coordinateOverlayState.plots.filter(plot => plot.coordinateType === this.backgroundPattern);
        if (activePlots.length === 0) return '';

        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize();
        const parts = [];

        activePlots.forEach((plot, index) => {
            try {
                const evaluator = this.createPlotEvaluator(plot.expression, plot.coordinateType);
                const strokeWidth = Math.max(1, Math.min(24, this.normalizePlotStrokeWidth(plot.strokeWidth) * metrics.visualScale));
                const strokeDasharray = this.getPlotStrokeDasharray(plot, metrics.visualScale);
                const dashAttr = strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : '';
                let pathData = '';
                let isCurrentSegmentOpen = false;

                if (plot.coordinateType === 'polar') {
                    const totalSamples = Math.max(720, Math.min(2160, Math.round(720 * Math.min(Math.max(metrics.visualScale, 1), 3))));
                    for (let i = 0; i <= totalSamples; i++) {
                        const theta = (Math.PI * 2 * i) / totalSamples;
                        const deg = theta * 180 / Math.PI;
                        let radius;
                        try {
                            radius = evaluator(0, theta, deg, Math.PI, Math.E);
                        } catch (error) {
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        if (!Number.isFinite(radius) || !this.plotMatchesSegments(plot, { theta, r: radius })) {
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        const x = radius * Math.cos(theta);
                        const y = radius * Math.sin(theta);
                        const point = this.mathToScreenPoint(x, y, 'polar', metrics);

                        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        if (!isCurrentSegmentOpen) {
                            pathData += `M ${point.x} ${point.y} `;
                            isCurrentSegmentOpen = true;
                        } else {
                            pathData += `L ${point.x} ${point.y} `;
                        }
                    }
                } else {
                    const xMin = (0 - origin.x) / unitSize;
                    const xMax = (logicalWidth - origin.x) / unitSize;
                    const totalSamples = Math.max(320, Math.min(2400, Math.round(metrics.viewportWidth * Math.min(Math.max(metrics.visualScale, 1), 3))));
                    let previousPoint = null;

                    for (let i = 0; i <= totalSamples; i++) {
                        const x = xMin + ((xMax - xMin) * i / totalSamples);
                        let y;
                        try {
                            y = evaluator(x, 0, 0, Math.PI, Math.E);
                        } catch (error) {
                            previousPoint = null;
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        if (!Number.isFinite(y) || !this.plotMatchesSegments(plot, { x, y })) {
                            previousPoint = null;
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        const point = this.mathToScreenPoint(x, y, 'coordinate', metrics);
                        const isLargeJump = previousPoint && Math.abs(point.y - previousPoint.y) > metrics.viewportHeight * 1.5;

                        if (!isCurrentSegmentOpen || isLargeJump) {
                            pathData += `M ${point.x} ${point.y} `;
                            isCurrentSegmentOpen = true;
                        } else {
                            pathData += `L ${point.x} ${point.y} `;
                        }

                        previousPoint = point;
                    }
                }

                if (pathData.trim()) {
                    const safePlotColor = this.sanitizeSvgColor(plot.color, this.getCoordinatePaletteColor(index + 2));
                    parts.push(`<path d="${pathData.trim()}" fill="none" stroke="${safePlotColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}></path>`);
                }
            } catch (error) {
                console.warn('Failed to render coordinate plot:', plot.expression, error);
            }
        });

        return `<g class="coordinate-plot-group">${parts.join('')}</g>`;
    }

    renderCoordinatePoints(metrics) {
        const points = this.coordinateOverlayState.points;
        if (points.length === 0) return '';

        const entries = this.getCoordinatePointEntries();
        const screenEntries = entries.map(point => ({
            ...point,
            screen: this.canvasLogicalToScreenPoint(point.canvasX, point.canvasY, metrics)
        }));
        const pointRadius = Math.max(4, Math.min(20, 5 * metrics.visualScale));
        const pointStrokeWidth = Math.max(1.2, Math.min(6, 2 * metrics.visualScale));
        const lineStrokeWidth = Math.max(1.5, Math.min(10, 2 * metrics.visualScale));
        const labelOffset = Math.max(6, Math.min(18, 8 * metrics.visualScale));
        const labelFontSize = Math.max(12, Math.min(42, 12 * metrics.visualScale));
        const parts = [];
        const shouldShowPoints = this.shouldShowCoordinatePoints();
        const safeLineColor = this.sanitizeSvgColor(this.getCoordinateLineColor(), '#2563eb');
        const safeBackgroundColor = this.sanitizeSvgColor(this.backgroundColor, '#ffffff');

        this.getCoordinateLinePaths({ includeTransientSelection: true }).forEach(path => {
            const pointMap = new Map(screenEntries.map(point => [point.id, point]));
            const pathEntries = path.pointIds
                .map(pointId => pointMap.get(pointId))
                .filter(Boolean);
            if (pathEntries.length < 2) {
                return;
            }
            const polylinePoints = pathEntries.map(point => `${point.screen.x},${point.screen.y}`).join(' ');
            const opacityAttr = path.transient ? ' opacity="0.72"' : '';
            parts.push(`<polyline points="${polylinePoints}" fill="none" stroke="${safeLineColor}" stroke-width="${lineStrokeWidth}" stroke-linejoin="round" stroke-linecap="round"${opacityAttr}></polyline>`);
        });

        screenEntries.forEach((point, index) => {
            const color = this.sanitizeSvgColor(point.color || this.getCoordinatePaletteColor(index), this.getCoordinatePaletteColor(index));
            if (shouldShowPoints) {
                parts.push(`<circle cx="${point.screen.x}" cy="${point.screen.y}" r="${pointRadius}" fill="${color}" stroke="${safeBackgroundColor}" stroke-width="${pointStrokeWidth}"></circle>`);
            }

            if (shouldShowPoints && this.coordinateOverlayState.showPointLabels) {
                parts.push(`<text x="${point.screen.x + labelOffset}" y="${point.screen.y - labelOffset}" fill="${color}" font-size="${labelFontSize}" text-anchor="start" dominant-baseline="auto">${this.escapeSvgText(this.getPointDisplayLabel(point, point.index))}</text>`);
            }
        });

        return `<g class="coordinate-point-group">${parts.join('')}</g>`;
    }

    getCanvasScreenRect(metrics) {
        return {
            x: metrics.rect.left,
            y: metrics.rect.top,
            width: metrics.logicalWidth * metrics.scaleX,
            height: metrics.logicalHeight * metrics.scaleY
        };
    }

    buildCoordinateOverlayMarkup(logicalWidth, logicalHeight, metrics, options = {}) {
        const { clipToCanvas = true, clipId = 'coordinate-overlay-clip' } = options;
        if (!this.supportsMovableOrigin()) {
            return '';
        }

        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize();
        const parts = [];

        if (this.backgroundPattern === 'polar') {
            parts.push(this.renderPolarTicksAndLabels(origin, unitSize, logicalWidth, logicalHeight, metrics));
        } else {
            parts.push(this.renderCartesianTicksAndLabels(origin, unitSize, logicalWidth, logicalHeight, metrics));
        }

        parts.push(this.renderCoordinatePlots(logicalWidth, logicalHeight, metrics));
        parts.push(this.renderCoordinatePoints(metrics));
        parts.push(this.renderCoordinateOriginSvg(origin, metrics));

        const content = parts.filter(Boolean).join('');
        if (!content || !clipToCanvas) {
            return content;
        }

        const canvasRect = this.getCanvasScreenRect(metrics);
        return `
            <defs>
                <clipPath id="${clipId}">
                    <rect x="${canvasRect.x}" y="${canvasRect.y}" width="${canvasRect.width}" height="${canvasRect.height}"></rect>
                </clipPath>
            </defs>
            <g clip-path="url(#${clipId})">${content}</g>
        `;
    }

    getCoordinateOverlayExportMetrics(logicalWidth, logicalHeight) {
        return {
            rect: { left: 0, top: 0 },
            logicalWidth,
            logicalHeight,
            viewportWidth: logicalWidth,
            viewportHeight: logicalHeight,
            scaleX: 1,
            scaleY: 1,
            visualScale: 1
        };
    }

    getCoordinateOverlaySvgDocument(logicalWidth, logicalHeight) {
        if (!this.supportsMovableOrigin()) {
            return '';
        }

        const metrics = this.getCoordinateOverlayExportMetrics(logicalWidth, logicalHeight);
        const innerMarkup = this.buildCoordinateOverlayMarkup(logicalWidth, logicalHeight, metrics, {
            clipToCanvas: true,
            clipId: 'coordinate-overlay-export-clip'
        });
        if (!innerMarkup) return '';

        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${logicalWidth}" height="${logicalHeight}" viewBox="0 0 ${logicalWidth} ${logicalHeight}" overflow="hidden" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
                ${innerMarkup}
            </svg>
        `;
    }

    getBackgroundPatternSvgDocument(logicalWidth, logicalHeight) {
        if (this.backgroundPattern === 'blank' || this.backgroundPattern === 'image') {
            return '';
        }

        const innerMarkup = this.getBackgroundPatternSvgMarkup(logicalWidth, logicalHeight);
        if (!innerMarkup) return '';

        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${logicalWidth}" height="${logicalHeight}" viewBox="0 0 ${logicalWidth} ${logicalHeight}" overflow="hidden" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
                ${innerMarkup}
            </svg>
        `;
    }

    renderCoordinateOverlay() {
        const overlayData = this.syncCoordinateOverlaySvgSize();
        if (!overlayData) return;

        const { svg, logicalWidth, logicalHeight, metrics } = overlayData;
        const legacyCanvas = document.getElementById('coordinate-overlay-canvas');

        if (!this.supportsMovableOrigin()) {
            svg.style.display = 'none';
            if (legacyCanvas) {
                legacyCanvas.style.display = 'none';
            }
            return;
        }

        svg.style.display = 'block';
        if (legacyCanvas) {
            legacyCanvas.style.display = 'none';
        }

        svg.innerHTML = this.buildCoordinateOverlayMarkup(logicalWidth, logicalHeight, metrics, {
            clipToCanvas: true,
            clipId: 'coordinate-overlay-screen-clip'
        });
    }
    
    drawCoordinatePattern(dpr, patternColor) {
        const { centerX, centerY } = this.getPatternOrigin(dpr);
        const baseGridSize = 20 * dpr;
        const gridSize = baseGridSize / this.patternDensity;
        
        this.bgCtx.strokeStyle = this.getAdaptivePatternColor(0.18, 0.08);
        this.bgCtx.lineWidth = 0.5 * dpr;
        
        // Draw grid lines
        for (let x = centerX % gridSize; x < this.bgCanvas.width; x += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, 0);
            this.bgCtx.lineTo(x, this.bgCanvas.height);
            this.bgCtx.stroke();
        }
        
        for (let y = centerY % gridSize; y < this.bgCanvas.height; y += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y);
            this.bgCtx.lineTo(this.bgCanvas.width, y);
            this.bgCtx.stroke();
        }
        
        // Draw axes
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 2 * dpr;
        
        // X-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(0, centerY);
        this.bgCtx.lineTo(this.bgCanvas.width, centerY);
        this.bgCtx.stroke();
        
        // Y-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX, 0);
        this.bgCtx.lineTo(centerX, this.bgCanvas.height);
        this.bgCtx.stroke();
        
        // Draw arrow on X-axis
        const arrowSize = 10 * dpr;
        
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(this.bgCanvas.width - arrowSize, centerY - arrowSize / 2);
        this.bgCtx.lineTo(this.bgCanvas.width, centerY);
        this.bgCtx.lineTo(this.bgCanvas.width - arrowSize, centerY + arrowSize / 2);
        this.bgCtx.stroke();
        
        // Draw arrow on Y-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX - arrowSize / 2, arrowSize);
        this.bgCtx.lineTo(centerX, 0);
        this.bgCtx.lineTo(centerX + arrowSize / 2, arrowSize);
        this.bgCtx.stroke();
        
        // Draw draggable origin point
        this.drawOriginPoint(centerX, centerY, dpr, patternColor);
    }

    drawPolarPattern(dpr, patternColor) {
        const { centerX, centerY } = this.getPatternOrigin(dpr);
        const baseRadiusStep = 20 * dpr;
        const radiusStep = baseRadiusStep / this.patternDensity;
        const angleStep = this.getPolarAngleStep();
        const minorColor = this.getAdaptivePatternColor(0.18, 0.07);
        const majorColor = this.getAdaptivePatternColor(0.38, 0.14);
        const maxRadius = Math.max(
            Math.hypot(centerX, centerY),
            Math.hypot(this.bgCanvas.width - centerX, centerY),
            Math.hypot(centerX, this.bgCanvas.height - centerY),
            Math.hypot(this.bgCanvas.width - centerX, this.bgCanvas.height - centerY)
        );
        const majorRingInterval = 5;
        const majorAngleInterval = angleStep <= 15 ? 30 : angleStep <= 30 ? 45 : 90;

        for (let ringIndex = 1, radius = radiusStep; radius < maxRadius; ringIndex++, radius += radiusStep) {
            const isMajorRing = ringIndex % majorRingInterval === 0;
            this.bgCtx.strokeStyle = isMajorRing ? majorColor : minorColor;
            this.bgCtx.lineWidth = (isMajorRing ? 1 : 0.5) * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.bgCtx.stroke();
        }

        for (let angleDeg = 0; angleDeg < 360; angleDeg += angleStep) {
            const angleRad = angleDeg * Math.PI / 180;
            const endPoint = this.getRayEndpoint(centerX, centerY, angleRad);
            const isAxis = angleDeg % 90 === 0;
            const isMajorRay = angleDeg % majorAngleInterval === 0;

            this.bgCtx.strokeStyle = isAxis ? patternColor : (isMajorRay ? majorColor : minorColor);
            this.bgCtx.lineWidth = (isAxis ? 2 : isMajorRay ? 1 : 0.5) * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(centerX, centerY);
            this.bgCtx.lineTo(endPoint.x, endPoint.y);
            this.bgCtx.stroke();
        }

        const positiveXAxisEnd = this.getRayEndpoint(centerX, centerY, 0);
        if (positiveXAxisEnd.distance > 0) {
            this.drawArrowHead(centerX, centerY, positiveXAxisEnd.x, positiveXAxisEnd.y, dpr, patternColor);
        }

        const positiveYAxisEnd = this.getRayEndpoint(centerX, centerY, Math.PI / 2);
        if (positiveYAxisEnd.distance > 0) {
            this.drawArrowHead(centerX, centerY, positiveYAxisEnd.x, positiveYAxisEnd.y, dpr, patternColor);
        }

        const angleGuideRadius = Math.min(radiusStep * 1.5, 42 * dpr);
        this.bgCtx.strokeStyle = majorColor;
        this.bgCtx.lineWidth = 1 * dpr;
        this.bgCtx.beginPath();
        this.bgCtx.arc(centerX, centerY, angleGuideRadius, 0, -Math.PI / 3, true);
        this.bgCtx.stroke();
        this.drawArrowHead(
            centerX + angleGuideRadius * Math.cos(-Math.PI / 3.1),
            centerY + angleGuideRadius * Math.sin(-Math.PI / 3.1),
            centerX + angleGuideRadius,
            centerY,
            dpr * 0.8,
            majorColor
        );

        this.drawOriginPoint(centerX, centerY, dpr, patternColor);
    }
    
    isLightBackground() {
        const r = parseInt(this.backgroundColor.slice(1, 3), 16);
        const g = parseInt(this.backgroundColor.slice(3, 5), 16);
        const b = parseInt(this.backgroundColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
    }
    
    getPatternColor() {
        return this.getAdaptivePatternColor(1);
    }
    
    setBackgroundColor(color) {
        this.backgroundColor = color;
        safeBackgroundStorageSetItem('backgroundColor', this.backgroundColor);
        this.drawBackground();
    }
    
    setBackgroundPattern(pattern) {
        if (pattern !== 'image') {
            // A file picker or saved-image decode may still be in flight. A
            // newer explicit pattern choice must win over that stale result.
            this.backgroundImageLoadToken = (this.backgroundImageLoadToken || 0) + 1;
        }
        this.backgroundPattern = pattern;
        safeBackgroundStorageSetItem('backgroundPattern', this.backgroundPattern);
        this.drawBackground();
        this.emitBackgroundUiState();
    }
    
    setOpacity(opacity) {
        this.bgOpacity = opacity;
        safeBackgroundStorageSetItem('bgOpacity', this.bgOpacity);
        this.drawBackground();
    }
    
    setPatternIntensity(intensity) {
        this.patternIntensity = intensity;
        safeBackgroundStorageSetItem('patternIntensity', this.patternIntensity);
        this.drawBackground();
    }
    
    setPatternDensity(density) {
        this.patternDensity = density;
        safeBackgroundStorageSetItem('patternDensity', density);
        this.drawBackground();
    }
    
    setBackgroundImage(imageData) {
        const loadToken = (this.backgroundImageLoadToken || 0) + 1;
        this.backgroundImageLoadToken = loadToken;
        const preserveTransform = this.imageTransform.width > 0 && this.imageTransform.height > 0;
        const existingTransform = preserveTransform ? { ...this.imageTransform } : null;
        
        return new Promise((resolve) => {
            // Create an Image object to get dimensions for ImageControls
            const img = new Image();
            img.onload = () => {
                if (loadToken !== this.backgroundImageLoadToken) {
                    resolve(false);
                    return;
                }
                this.stopGifInstance();
                this.restoreBackgroundGifImage(document.getElementById('background-image-element'));
                this.backgroundImageData = imageData;
                this.backgroundImage = img;
                this.isImagePaused = false;
                this.imageStaticData = null;
                this.currentGifLoop = 0;
                safeBackgroundStorageSetItem('backgroundImageData', imageData);

                if (existingTransform) {
                    this.imageTransform = {
                        ...existingTransform,
                        scale: 1,
                        flipHorizontal: !!existingTransform.flipHorizontal,
                        flipVertical: !!existingTransform.flipVertical
                    };
                } else {
                    // If this is a new image, reset transform to center it
                    this.imageTransform = {
                        x: 0,
                        y: 0,
                        width: 0, // Resetting width/height forces ImageControls to recalculate
                        height: 0,
                        rotation: 0,
                        scale: 1.0,
                        flipHorizontal: false,
                        flipVertical: false
                    };
                }

                this.backgroundPattern = 'image';
                this.drawBackground();
                this.emitBackgroundUiState();
                resolve(true);
            };
            img.onerror = () => {
                if (loadToken !== this.backgroundImageLoadToken) {
                    resolve(false);
                    return;
                }
                console.warn('Failed to load background image');
                this.emitBackgroundUiState();
                resolve(false);
            };
            img.src = imageData;
        });
    }

    toggleImagePlayback() {
        if (this.backgroundPattern !== 'image' || !this.backgroundImageData || !this.isGif(this.backgroundImageData)) {
            this.emitBackgroundUiState();
            return false;
        }

        this.isImagePaused = !this.isImagePaused;

        if (this.gifInstance) {
            if (this.isImagePaused) {
                this.gifInstance.pause();
            } else {
                if (this.gifLoopCount > 0 && this.currentGifLoop >= this.gifLoopCount) {
                    this.currentGifLoop = 0;
                    if (typeof this.gifInstance.move_to === 'function') {
                        this.gifInstance.move_to(0);
                    }
                }
                this.gifInstance.play();
            }
        }

        this.emitBackgroundUiState();
        return true;
    }

    captureStaticFrame() {
        // Deprecated/Unused with SuperGif
    }
    
    setImageSize(size) {
        const previousSize = this.imageSize || 1;
        this.imageSize = size;
        this.queueBackgroundStorageWrite('imageSize', size);
        // If transform exists, scale width/height directly so the visual image and control box stay aligned
        if (this.imageTransform.width > 0 && this.imageTransform.height > 0) {
            const factor = previousSize > 0 ? (size / previousSize) : size;
            const newWidth = Math.max(1, this.imageTransform.width * factor);
            const newHeight = Math.max(1, this.imageTransform.height * factor);
            this.imageTransform.x -= (newWidth - this.imageTransform.width) / 2;
            this.imageTransform.y -= (newHeight - this.imageTransform.height) / 2;
            this.imageTransform.width = newWidth;
            this.imageTransform.height = newHeight;
            this.imageTransform.scale = 1;
            this.queueBackgroundStorageWrite('imageTransform', JSON.stringify(this.imageTransform));
        }
        if (this.backgroundPattern === 'image') {
            this.drawBackground();
        }
    }
    
    updateImageTransform(transform) {
        this.imageTransform = {
            ...transform,
            scale: 1,
            flipHorizontal: !!transform.flipHorizontal,
            flipVertical: !!transform.flipVertical
        };
        this.queueBackgroundStorageWrite('imageTransform', JSON.stringify(this.imageTransform));
        if (this.backgroundPattern === 'image') {
            this.drawBackground();
        }
    }

    clearBackgroundImage() {
        this.backgroundImageLoadToken = (this.backgroundImageLoadToken || 0) + 1;
        this.backgroundImage = null;
        this.backgroundImageData = null;
        this.isImagePaused = false;
        this.imageStaticData = null;
        this.currentGifLoop = 0;
        this.stopGifInstance();
        this.imageTransform = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scale: 1,
            flipHorizontal: false,
            flipVertical: false
        };
        this.backgroundWasOutsideCanvas = false;
        this.backgroundOutsideLayerOrder = 1;

        this.queueBackgroundStorageRemoval('backgroundImageData');
        this.queueBackgroundStorageRemoval('imageTransform');
        this.queueBackgroundStorageRemoval('backgroundImageConfirmed');

        if (this.backgroundPattern === 'image') {
            this.backgroundPattern = 'blank';
            this.queueBackgroundStorageWrite('backgroundPattern', this.backgroundPattern);
        }

        this.flushPendingBackgroundStorageWrites();
        this.drawBackground();
        this.emitBackgroundUiState();
    }
    
    getImageData() {
        if (!this.backgroundImage) return null;
        return {
            width: this.backgroundImage.width,
            height: this.backgroundImage.height,
            src: this.backgroundImageData
        };
    }
    
    setCoordinateOrigin(x, y) {
        this.coordinateOriginX = x;
        this.coordinateOriginY = y;
        this.queueBackgroundStorageWrite('coordinateOriginX', x);
        this.queueBackgroundStorageWrite('coordinateOriginY', y);
        if (this.supportsMovableOrigin()) {
            this.drawBackground();
        }
    }
    
    getCoordinateOrigin() {
        return {
            x: this.coordinateOriginX,
            y: this.coordinateOriginY
        };
    }
    
    isPointNearCoordinateOrigin(canvasX, canvasY, threshold = 15) {
        if (!this.supportsMovableOrigin()) return false;

        const { x, y } = this.getPatternOriginLogical();
        const distance = Math.sqrt(Math.pow(canvasX - x, 2) + Math.pow(canvasY - y, 2));
        return distance < threshold;
    }
}

window.BackgroundManager = BackgroundManager;
window.AboardBackgroundManager = BackgroundManager;

// Allowlist for the safe coordinate-plot evaluator. Every function here must be
// a well-known pure member of `Math`. `max = Infinity` marks variadic
// functions whose argument count is preserved by the RPN parser.
BackgroundManager.PLOT_FUNCTION_ARITY = Object.freeze({
    sin: { min: 1, max: 1 },
    cos: { min: 1, max: 1 },
    tan: { min: 1, max: 1 },
    asin: { min: 1, max: 1 },
    acos: { min: 1, max: 1 },
    atan: { min: 1, max: 1 },
    atan2: { min: 2, max: 2 },
    sinh: { min: 1, max: 1 },
    cosh: { min: 1, max: 1 },
    tanh: { min: 1, max: 1 },
    asinh: { min: 1, max: 1 },
    acosh: { min: 1, max: 1 },
    atanh: { min: 1, max: 1 },
    log: { min: 1, max: 1 },
    log2: { min: 1, max: 1 },
    log10: { min: 1, max: 1 },
    log1p: { min: 1, max: 1 },
    exp: { min: 1, max: 1 },
    expm1: { min: 1, max: 1 },
    pow: { min: 2, max: 2 },
    sqrt: { min: 1, max: 1 },
    cbrt: { min: 1, max: 1 },
    abs: { min: 1, max: 1 },
    floor: { min: 1, max: 1 },
    ceil: { min: 1, max: 1 },
    round: { min: 1, max: 1 },
    trunc: { min: 1, max: 1 },
    sign: { min: 1, max: 1 },
    fround: { min: 1, max: 1 },
    max: { min: 0, max: Infinity },
    min: { min: 0, max: Infinity },
    hypot: { min: 0, max: Infinity }
});
