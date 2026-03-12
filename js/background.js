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
        
        // Load saved transform if exists
        const savedTransform = localStorage.getItem('imageTransform');
        if (savedTransform) {
            this.imageTransform = JSON.parse(savedTransform);
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
            gifSettingsDisplay: null
        };
    }

    setStyleIfChanged(element, property, value, cacheKey = property) {
        if (!element || !element.style) return;
        if (this.imageDomStateCache[cacheKey] === value) return;
        element.style[property] = value;
        this.imageDomStateCache[cacheKey] = value;
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
                const scaleX = this.imageTransform.flipHorizontal ? -this.imageTransform.scale : this.imageTransform.scale;
                const scaleY = this.imageTransform.flipVertical ? -this.imageTransform.scale : this.imageTransform.scale;

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

        } else {
            if (containerElement) {
                this.setStyleIfChanged(containerElement, 'display', 'none');
            }
        }
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
    
    drawCoordinatePattern(dpr, patternColor) {
        // Coordinate system center is always at the exact center of the canvas
        // The origin offset is applied relative to this center
        const centerX = (this.bgCanvas.width / 2) + (this.coordinateOriginX * dpr);
        const centerY = (this.bgCanvas.height / 2) + (this.coordinateOriginY * dpr);
        const baseGridSize = 20 * dpr;
        const gridSize = baseGridSize / this.patternDensity;
        
        this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
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
        this.bgCtx.fillStyle = patternColor;
        this.bgCtx.beginPath();
        this.bgCtx.arc(centerX, centerY, 5 * dpr, 0, Math.PI * 2);
        this.bgCtx.fill();
        this.bgCtx.strokeStyle = this.backgroundColor;
        this.bgCtx.lineWidth = 2 * dpr;
        this.bgCtx.stroke();
    }
    
    isLightBackground() {
        const r = parseInt(this.backgroundColor.slice(1, 3), 16);
        const g = parseInt(this.backgroundColor.slice(3, 5), 16);
        const b = parseInt(this.backgroundColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
    }
    
    getPatternColor() {
        const baseOpacity = Math.min(this.patternIntensity, 1.0);
        return this.isLightBackground() ? 
            `rgba(0, 0, 0, ${baseOpacity})` : 
            `rgba(255, 255, 255, ${baseOpacity})`;
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
        localStorage.setItem('backgroundImageData', imageData);
        
        return new Promise((resolve) => {
            // Create an Image object to get dimensions for ImageControls
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;

                // If this is a new image, reset transform to center it
                this.imageTransform = {
                    x: 0,
                    y: 0,
                    width: 0, // Resetting width/height forces ImageControls to recalculate
                    height: 0,
                    rotation: 0,
                    scale: 1.0
                };

                this.backgroundPattern = 'image';
                this.drawBackground();
                resolve();
            };
            img.src = imageData;
        });
    }

    toggleImagePlayback() {
        if (!this.backgroundPattern === 'image' || !this.backgroundImageData) return;

        this.isImagePaused = !this.isImagePaused;

        if (this.gifInstance) {
            if (this.isImagePaused) {
                this.gifInstance.pause();
            } else {
                if (this.gifLoopCount > 0 && this.currentGifLoop >= this.gifLoopCount) {
                    this.currentGifLoop = 0;
                }
                this.gifInstance.play();
            }
        } else {
            // Fallback for non-GIFs
            this.updateBackgroundImageElement();
        }
    }

    captureStaticFrame() {
        // Deprecated/Unused with SuperGif
    }
    
    setImageSize(size) {
        this.imageSize = size;
        localStorage.setItem('imageSize', size);
        // If transform exists, update the scale in transform as well
        if (this.imageTransform.width > 0 && this.imageTransform.height > 0) {
            this.imageTransform.scale = size;
            localStorage.setItem('imageTransform', JSON.stringify(this.imageTransform));
        }
        if (this.backgroundPattern === 'image') {
            this.drawBackground();
        }
    }
    
    updateImageTransform(transform) {
        this.imageTransform = transform;
        localStorage.setItem('imageTransform', JSON.stringify(transform));
        if (this.backgroundPattern === 'image') {
            this.drawBackground();
        }
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
        if (this.backgroundPattern === 'coordinate') {
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
        if (this.backgroundPattern !== 'coordinate') return false;
        
        const dpr = window.devicePixelRatio || 1;
        // Center is always at exact canvas center (matching drawCoordinatePattern)
        const centerX = (this.bgCanvas.width / (2 * dpr)) + this.coordinateOriginX;
        const centerY = (this.bgCanvas.height / (2 * dpr)) + this.coordinateOriginY;
        
        const distance = Math.sqrt(Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - centerY, 2));
        return distance < threshold;
    }
}
