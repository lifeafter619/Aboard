// Background Management Module
// Handles background colors, patterns, and rendering

class BackgroundManager {
    constructor(bgCanvas, bgCtx) {
        this.bgCanvas = bgCanvas;
        this.bgCtx = bgCtx;
        
        this.backgroundColor = localStorage.getItem('backgroundColor') || '#ffffff';
        this.backgroundPattern = localStorage.getItem('backgroundPattern') || 'blank';
        this.bgOpacity = parseFloat(localStorage.getItem('bgOpacity')) || 1.0;
        this.patternIntensity = parseFloat(localStorage.getItem('patternIntensity')) || 0.5;
        this.patternDensity = parseFloat(localStorage.getItem('patternDensity')) || 1.0;
        this.backgroundImage = null;
        this.backgroundImageData = localStorage.getItem('backgroundImageData') || null;
        this.imageSize = parseFloat(localStorage.getItem('imageSize')) || 1.0;
        this.isImagePaused = false; // State for GIF playback control
        this.imageStaticData = null; // Store static frame for paused GIF
        
        // Coordinate system origin offset
        this.coordinateOriginX = parseFloat(localStorage.getItem('coordinateOriginX')) || 0;
        this.coordinateOriginY = parseFloat(localStorage.getItem('coordinateOriginY')) || 0;
        
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
        const savedTransform = localStorage.getItem('imageTransform');
        if (savedTransform) {
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
        }
        
        // Load saved image if exists
        if (this.backgroundImageData) {
            this.backgroundImage = this.backgroundImageData;
            // Also need to initialize the DOM element if it doesn't exist?
            // The DOM element logic is handled in drawBackgroundPattern/updateBackgroundImageElement
            if (this.backgroundPattern === 'image') {
                // Defer drawing until next frame to ensure DOM is ready if called from constructor
                setTimeout(() => this.drawBackground(), 0);
            }
        }

        this.gifInstance = null; // Store SuperGif instance
        this.gifLoopCount = 0; // Default infinite
        this.currentGifLoop = 0;

        this.coordinateOverlayCanvas = null;
        this.coordinateOverlayCtx = null;
        let savedCoordinateOverlayState = null;
        try {
            savedCoordinateOverlayState = JSON.parse(localStorage.getItem('coordinateOverlayState') || 'null');
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

    hasBackgroundImage() {
        return this.backgroundPattern === 'image' &&
            !!this.backgroundImageData &&
            this.imageTransform.width > 0 &&
            this.imageTransform.height > 0;
    }

    getCanvasLogicalBounds() {
        const dpr = window.devicePixelRatio || 1;
        return {
            x: 0,
            y: 0,
            width: this.bgCanvas.width / dpr,
            height: this.bgCanvas.height / dpr
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
        if (this.backgroundPattern === 'blank') return;
        
        if (this.backgroundPattern === 'image') {
            // Handled by updateBackgroundImageElement
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

            // Check if source changed
            if (imgElement.src !== this.backgroundImageData && !this.isImagePaused) {
                imgElement.src = this.backgroundImageData;

                // Check if it's a GIF and initialize SuperGif if needed
                if (this.isGif(this.backgroundImageData)) {
                    this.initGif(imgElement);
                    // Show GIF settings button
                    const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                    if (gifSettingsBtn) {
                        this.setStyleIfChanged(gifSettingsBtn, 'display', 'block', 'gifSettingsDisplay');
                    }
                } else {
                    // Hide GIF settings button
                    const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                    if (gifSettingsBtn) {
                        this.setStyleIfChanged(gifSettingsBtn, 'display', 'none', 'gifSettingsDisplay');
                    }
                    if (this.gifInstance) {
                        this.gifInstance = null;
                        // Restore img if SuperGif modified DOM
                        const container = document.getElementById('background-image-container');
                        const existingJsgif = container.querySelector('.jsgif');
                        if (existingJsgif) {
                             existingJsgif.remove();
                             container.appendChild(imgElement);
                             imgElement.style.display = 'block';
                        }
                    }
                }
            }

            // Apply transformations to container
            const dpr = window.devicePixelRatio || 1;
            const canvasWidth = this.bgCanvas.width / dpr;
            const canvasHeight = this.bgCanvas.height / dpr;
            
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

    async initGif(imgElement) {
        // Ensure SuperGif is loaded
        if (!window.SuperGif) {
            try {
                if (window.ScriptLoader) {
                    await ScriptLoader.load('js/modules/libgif.js');
                } else {
                    console.error('ScriptLoader not found');
                    return;
                }
            } catch (e) {
                console.error('Failed to load libgif.js', e);
                return;
            }
        }

        // Clear previous instance if exists (remove jsgif wrapper if any)
        const container = document.getElementById('background-image-container');
        // If there is already a jsgif div, remove it and restore img
        const existingJsgif = container.querySelector('.jsgif');
        if (existingJsgif) {
             existingJsgif.remove();
             container.appendChild(imgElement);
             imgElement.style.display = 'block';
        }

        this.gifInstance = null;

        try {
            this.gifInstance = new SuperGif({
                gif: imgElement,
                auto_play: !this.isImagePaused,
                loop_mode: this.gifLoopCount === 0 ? true : false,
                vp_t: 0, vp_l: 0,
                on_end: () => {
                   this.handleGifLoop();
                }
            });

            this.currentGifLoop = 0;

            this.gifInstance.load(() => {
                const canvas = this.gifInstance.get_canvas();
                if (canvas) {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                }
                this.emitBackgroundUiState();
            });
        } catch(e) {
            console.error("Failed to init SuperGif", e);
        }
    }

    handleGifLoop() {
        if (this.gifLoopCount > 0) {
            this.currentGifLoop++;
            if (this.currentGifLoop >= this.gifLoopCount) {
                this.gifInstance.pause();
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

    getRayEndpoint(centerX, centerY, angleRad) {
        const directionX = Math.cos(angleRad);
        const directionY = -Math.sin(angleRad);
        const intersections = [];

        if (Math.abs(directionX) > 1e-6) {
            intersections.push((0 - centerX) / directionX);
            intersections.push((this.bgCanvas.width - centerX) / directionX);
        }

        if (Math.abs(directionY) > 1e-6) {
            intersections.push((0 - centerY) / directionY);
            intersections.push((this.bgCanvas.height - centerY) / directionY);
        }

        const validDistances = intersections.filter(distance => distance > 0);
        const distance = validDistances.length > 0 ? Math.min(...validDistances) : 0;

        return {
            x: centerX + directionX * distance,
            y: centerY + directionY * distance,
            distance
        };
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
            connectPoints: true,
            snapToGrid: true,
            points: [],
            plots: []
        };
    }

    sanitizeCoordinateOverlayState(state) {
        const defaults = this.getDefaultCoordinateOverlayState();
        const nextState = state && typeof state === 'object' ? state : {};

        return {
            ...defaults,
            showTicks: nextState.showTicks !== false,
            showLabels: nextState.showLabels !== false,
            showPointLabels: nextState.showPointLabels !== false,
            connectPoints: nextState.connectPoints !== false,
            snapToGrid: nextState.snapToGrid !== false,
            points: Array.isArray(nextState.points)
                ? nextState.points
                    .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
                    .map((point, index) => ({
                        id: point.id || `pt-${Date.now()}-${index}`,
                        x: this.roundToDecimals(point.x, 4),
                        y: this.roundToDecimals(point.y, 4),
                        color: point.color || this.getCoordinatePaletteColor(index)
                    }))
                : [],
            plots: Array.isArray(nextState.plots)
                ? nextState.plots
                    .filter(plot => typeof plot?.expression === 'string' && plot.expression.trim())
                    .map((plot, index) => ({
                        id: plot.id || `plot-${Date.now()}-${index}`,
                        expression: this.normalizePlotExpression(plot.expression, plot.coordinateType),
                        coordinateType: plot.coordinateType === 'polar' ? 'polar' : 'coordinate',
                        color: plot.color || this.getCoordinatePaletteColor(index + 2)
                    }))
                : []
        };
    }

    persistCoordinateOverlayState() {
        localStorage.setItem('coordinateOverlayState', JSON.stringify(this.coordinateOverlayState));
    }

    getCoordinateOverlayState() {
        return JSON.parse(JSON.stringify(this.coordinateOverlayState));
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

    createPlotEvaluator(expression) {
        const normalized = this.normalizePlotExpression(expression).replace(/\^/g, '**');
        return new Function('x', 'theta', 'deg', 'PI', 'E', `with (Math) { return (${normalized}); }`);
    }

    addCoordinatePoint(canvasX, canvasY, options = {}) {
        const point = this.canvasLogicalToMathPoint(canvasX, canvasY, options);
        const nextState = this.getCoordinateOverlayState();
        nextState.points.push({
            id: `pt-${Date.now()}-${nextState.points.length}`,
            x: point.x,
            y: point.y,
            color: options.color || this.getCoordinatePaletteColor(nextState.points.length)
        });
        this.setCoordinateOverlayState(nextState);
        return nextState.points[nextState.points.length - 1];
    }

    clearCoordinatePoints() {
        this.updateCoordinateOverlayOptions({ points: [] });
    }

    addCoordinatePlot(expression, coordinateType = this.backgroundPattern, color = null) {
        const normalizedExpression = this.normalizePlotExpression(expression, coordinateType);
        if (!normalizedExpression) {
            throw new Error('empty-expression');
        }

        const evaluator = this.createPlotEvaluator(normalizedExpression);
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
                // Try next sample point so functions with partial domains can still be plotted.
            }
        }

        if (!canEvaluate) {
            throw new Error('invalid-expression');
        }

        const nextState = this.getCoordinateOverlayState();
        const sameTypePlots = nextState.plots.filter(plot => plot.coordinateType === coordinateType);
        nextState.plots.push({
            id: `plot-${Date.now()}-${nextState.plots.length}`,
            expression: normalizedExpression,
            coordinateType: coordinateType === 'polar' ? 'polar' : 'coordinate',
            color: color || this.getCoordinatePaletteColor(sameTypePlots.length + 1)
        });
        this.setCoordinateOverlayState(nextState);
        return nextState.plots[nextState.plots.length - 1];
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

    renderCartesianTicksAndLabels(ctx, origin, unitSize, logicalWidth, logicalHeight) {
        const { showTicks, showLabels } = this.coordinateOverlayState;
        if (!showTicks && !showLabels) return;

        const axisColor = this.getAdaptivePatternColor(0.82, 0.24);
        const labelColor = this.getAdaptivePatternColor(0.76, 0.22);
        const tickSize = 5;
        const labelInterval = this.getCoordinateLabelInterval(unitSize);
        const xMin = Math.ceil((0 - origin.x) / unitSize);
        const xMax = Math.floor((logicalWidth - origin.x) / unitSize);
        const yMin = Math.ceil((origin.y - logicalHeight) / unitSize);
        const yMax = Math.floor(origin.y / unitSize);
        const axisVisibleX = origin.y >= 0 && origin.y <= logicalHeight;
        const axisVisibleY = origin.x >= 0 && origin.x <= logicalWidth;

        ctx.save();
        ctx.strokeStyle = axisColor;
        ctx.fillStyle = labelColor;
        ctx.lineWidth = 1;
        ctx.font = `${Math.max(11, Math.min(14, unitSize * 0.55))}px sans-serif`;

        if (showTicks && axisVisibleX) {
            for (let x = xMin; x <= xMax; x++) {
                if (x === 0) continue;
                const px = origin.x + x * unitSize;
                ctx.beginPath();
                ctx.moveTo(px, origin.y - tickSize);
                ctx.lineTo(px, origin.y + tickSize);
                ctx.stroke();
            }
        }

        if (showTicks && axisVisibleY) {
            for (let y = yMin; y <= yMax; y++) {
                if (y === 0) continue;
                const py = origin.y - y * unitSize;
                ctx.beginPath();
                ctx.moveTo(origin.x - tickSize, py);
                ctx.lineTo(origin.x + tickSize, py);
                ctx.stroke();
            }
        }

        if (showLabels && axisVisibleX) {
            const labelY = Math.min(logicalHeight - 18, origin.y + 8);
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';
            for (let x = xMin; x <= xMax; x++) {
                if (x === 0 || x % labelInterval !== 0) continue;
                const px = origin.x + x * unitSize;
                ctx.fillText(this.formatCoordinateValue(x, 0), px, labelY);
            }
        }

        if (showLabels && axisVisibleY) {
            ctx.textBaseline = 'middle';
            ctx.textAlign = origin.x > logicalWidth - 52 ? 'right' : 'left';
            const labelX = origin.x > logicalWidth - 52 ? origin.x - 8 : origin.x + 8;
            for (let y = yMin; y <= yMax; y++) {
                if (y === 0 || y % labelInterval !== 0) continue;
                const py = origin.y - y * unitSize;
                ctx.fillText(this.formatCoordinateValue(y, 0), labelX, py);
            }
        }

        if (showLabels && axisVisibleX && axisVisibleY) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('0', origin.x + 6, origin.y + 6);
        }

        ctx.restore();
    }

    renderPolarTicksAndLabels(ctx, origin, unitSize, logicalWidth, logicalHeight) {
        const { showTicks, showLabels } = this.coordinateOverlayState;
        if (!showTicks && !showLabels) return;

        const labelColor = this.getAdaptivePatternColor(0.76, 0.22);
        const tickColor = this.getAdaptivePatternColor(0.82, 0.24);
        const radiusInterval = this.getCoordinateLabelInterval(unitSize);
        const safeRadius = Math.max(0, Math.min(origin.x, logicalWidth - origin.x, origin.y, logicalHeight - origin.y) - 18);
        const maxRadiusUnits = Math.floor(Math.max(
            Math.hypot(origin.x, origin.y),
            Math.hypot(logicalWidth - origin.x, origin.y),
            Math.hypot(origin.x, logicalHeight - origin.y),
            Math.hypot(logicalWidth - origin.x, logicalHeight - origin.y)
        ) / unitSize);
        const angleStep = this.getPolarAngleLabelStep();

        ctx.save();
        ctx.strokeStyle = tickColor;
        ctx.fillStyle = labelColor;
        ctx.lineWidth = 1;
        ctx.font = `${Math.max(11, Math.min(14, unitSize * 0.55))}px sans-serif`;

        if (showTicks) {
            for (let radius = 1; radius <= maxRadiusUnits; radius++) {
                const px = origin.x + radius * unitSize;
                if (px < 0 || px > logicalWidth) continue;
                ctx.beginPath();
                ctx.moveTo(px, origin.y - 4);
                ctx.lineTo(px, origin.y + 4);
                ctx.stroke();
            }

            if (safeRadius > 24) {
                for (let angle = 0; angle < 360; angle += angleStep) {
                    const rad = angle * Math.PI / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    ctx.beginPath();
                    ctx.moveTo(origin.x + (safeRadius - 6) * cos, origin.y - (safeRadius - 6) * sin);
                    ctx.lineTo(origin.x + safeRadius * cos, origin.y - safeRadius * sin);
                    ctx.stroke();
                }
            }
        }

        if (showLabels) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            for (let radius = radiusInterval; radius <= maxRadiusUnits; radius += radiusInterval) {
                const px = origin.x + radius * unitSize;
                if (px > logicalWidth - 12 || origin.y < 16 || origin.y > logicalHeight - 4) continue;
                ctx.fillText(this.formatCoordinateValue(radius, 0), px + 4, origin.y - 6);
            }

            if (safeRadius > 28) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let angle = 0; angle < 360; angle += angleStep) {
                    const rad = angle * Math.PI / 180;
                    const labelRadius = safeRadius - 14;
                    ctx.fillText(
                        `${angle}°`,
                        origin.x + labelRadius * Math.cos(rad),
                        origin.y - labelRadius * Math.sin(rad)
                    );
                }
            }
        }

        ctx.restore();
    }

    renderCoordinatePlots(ctx, logicalWidth, logicalHeight) {
        const activePlots = this.coordinateOverlayState.plots.filter(plot => plot.coordinateType === this.backgroundPattern);
        if (activePlots.length === 0) return;

        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize();

        activePlots.forEach(plot => {
            try {
                const evaluator = this.createPlotEvaluator(plot.expression);
                ctx.save();
                ctx.strokeStyle = plot.color;
                ctx.lineWidth = 2.5;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.beginPath();

                let hasSegment = false;
                let isCurrentSegmentOpen = false;

                if (plot.coordinateType === 'polar') {
                    const totalSamples = 720;
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

                        if (!Number.isFinite(radius)) {
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        const x = radius * Math.cos(theta);
                        const y = radius * Math.sin(theta);
                        const point = this.mathToCanvasLogicalPoint(x, y, 'polar');

                        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        if (!isCurrentSegmentOpen) {
                            ctx.moveTo(point.x, point.y);
                            isCurrentSegmentOpen = true;
                        } else {
                            ctx.lineTo(point.x, point.y);
                        }
                        hasSegment = true;
                    }
                } else {
                    const xMin = (0 - origin.x) / unitSize;
                    const xMax = (logicalWidth - origin.x) / unitSize;
                    const totalSamples = Math.max(240, Math.min(1600, Math.round(logicalWidth)));
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

                        if (!Number.isFinite(y)) {
                            previousPoint = null;
                            isCurrentSegmentOpen = false;
                            continue;
                        }

                        const point = this.mathToCanvasLogicalPoint(x, y, 'coordinate');
                        const isLargeJump = previousPoint && Math.abs(point.y - previousPoint.y) > logicalHeight * 1.5;

                        if (!isCurrentSegmentOpen || isLargeJump) {
                            ctx.moveTo(point.x, point.y);
                            isCurrentSegmentOpen = true;
                        } else {
                            ctx.lineTo(point.x, point.y);
                        }

                        previousPoint = point;
                        hasSegment = true;
                    }
                }

                if (hasSegment) {
                    ctx.stroke();
                }
                ctx.restore();
            } catch (error) {
                console.warn('Failed to render coordinate plot:', plot.expression, error);
            }
        });
    }

    renderCoordinatePoints(ctx) {
        const points = this.coordinateOverlayState.points;
        if (points.length === 0) return;

        const lineColor = this.getAdaptivePatternColor(0.74, 0.24);

        ctx.save();

        if (this.coordinateOverlayState.connectPoints && points.length > 1) {
            ctx.beginPath();
            points.forEach((point, index) => {
                const canvasPoint = this.mathToCanvasLogicalPoint(point.x, point.y);
                if (index === 0) {
                    ctx.moveTo(canvasPoint.x, canvasPoint.y);
                } else {
                    ctx.lineTo(canvasPoint.x, canvasPoint.y);
                }
            });
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        points.forEach((point, index) => {
            const canvasPoint = this.mathToCanvasLogicalPoint(point.x, point.y);

            ctx.beginPath();
            ctx.fillStyle = point.color || this.getCoordinatePaletteColor(index);
            ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.backgroundColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            if (this.coordinateOverlayState.showPointLabels) {
                ctx.fillStyle = point.color || this.getCoordinatePaletteColor(index);
                ctx.font = '12px sans-serif';
                ctx.textBaseline = 'bottom';
                ctx.textAlign = 'left';
                ctx.fillText(this.getPointDisplayLabel(point, index), canvasPoint.x + 8, canvasPoint.y - 8);
            }
        });

        ctx.restore();
    }

    renderCoordinateOverlay() {
        const overlayData = this.syncCoordinateOverlayCanvasSize();
        if (!overlayData) return;

        const { canvas, ctx, logicalWidth, logicalHeight } = overlayData;

        if (!this.supportsMovableOrigin()) {
            canvas.style.display = 'none';
            return;
        }

        canvas.style.display = 'block';

        const origin = this.getPatternOriginLogical();
        const unitSize = this.getCoordinateUnitSize();

        if (this.backgroundPattern === 'polar') {
            this.renderPolarTicksAndLabels(ctx, origin, unitSize, logicalWidth, logicalHeight);
        } else {
            this.renderCartesianTicksAndLabels(ctx, origin, unitSize, logicalWidth, logicalHeight);
        }

        this.renderCoordinatePlots(ctx, logicalWidth, logicalHeight);
        this.renderCoordinatePoints(ctx);
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
        localStorage.setItem('backgroundColor', this.backgroundColor);
        this.drawBackground();
    }
    
    setBackgroundPattern(pattern) {
        this.backgroundPattern = pattern;
        localStorage.setItem('backgroundPattern', this.backgroundPattern);
        this.drawBackground();
        this.emitBackgroundUiState();
    }
    
    setOpacity(opacity) {
        this.bgOpacity = opacity;
        localStorage.setItem('bgOpacity', this.bgOpacity);
        this.drawBackground();
    }
    
    setPatternIntensity(intensity) {
        this.patternIntensity = intensity;
        localStorage.setItem('patternIntensity', this.patternIntensity);
        this.drawBackground();
    }
    
    setPatternDensity(density) {
        this.patternDensity = density;
        localStorage.setItem('patternDensity', density);
        this.drawBackground();
    }
    
    setBackgroundImage(imageData) {
        this.backgroundImageData = imageData;
        this.isImagePaused = false;
        this.imageStaticData = null;
        this.currentGifLoop = 0;
        localStorage.setItem('backgroundImageData', imageData);
        const preserveTransform = this.imageTransform.width > 0 && this.imageTransform.height > 0;
        const existingTransform = preserveTransform ? { ...this.imageTransform } : null;
        
        return new Promise((resolve) => {
            // Create an Image object to get dimensions for ImageControls
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;

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
                resolve();
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
        localStorage.setItem('imageSize', size);
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
            localStorage.setItem('imageTransform', JSON.stringify(this.imageTransform));
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
        localStorage.setItem('imageTransform', JSON.stringify(this.imageTransform));
        if (this.backgroundPattern === 'image') {
            this.drawBackground();
        }
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundImageData = null;
        this.isImagePaused = false;
        this.imageStaticData = null;
        this.currentGifLoop = 0;
        this.gifInstance = null;
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

        localStorage.removeItem('backgroundImageData');
        localStorage.removeItem('imageTransform');
        localStorage.removeItem('backgroundImageConfirmed');

        if (this.backgroundPattern === 'image') {
            this.backgroundPattern = 'blank';
            localStorage.setItem('backgroundPattern', this.backgroundPattern);
        }

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
        localStorage.setItem('coordinateOriginX', x);
        localStorage.setItem('coordinateOriginY', y);
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
