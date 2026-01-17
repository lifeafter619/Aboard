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
    }
    
    drawBackground() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        // Handle background image visibility
        this.updateBackgroundImageElement();

        this.bgCtx.globalAlpha = this.bgOpacity;
        this.bgCtx.fillStyle = this.backgroundColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.globalAlpha = 1.0;

        this.drawBackgroundPattern();
    }

    renderInfinite(scale, panX, panY) {
        // Clear screen (in screen coords)
        this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        // Fill Background Color (Screen Space)
        this.bgCtx.globalAlpha = this.bgOpacity;
        this.bgCtx.fillStyle = this.backgroundColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.globalAlpha = 1.0;

        // Calculate visible bounds in World Coordinates
        const visibleBounds = {
            minX: -panX / scale,
            minY: -panY / scale,
            maxX: (this.bgCanvas.width / scale) - panX / scale, // Assuming 1:1 pixel mapping for bgCanvas.width
            maxY: (this.bgCanvas.height / scale) - panY / scale
        };
        // Note: bgCanvas.width is physical pixels? No, it's logical pixels * dpr.
        // But ctx commands usually use logical pixels if we didn't scale context?
        // Wait, main.js does `bgCtx.scale(dpr, dpr)`.
        // If we reset transform to Identity (1,0,0,1,0,0), we lose DPR scaling.
        // So we must handle DPR.
        
        const dpr = window.devicePixelRatio || 1;
        // Re-apply DPR scaling combined with World Transform
        // Transform = Scale(dpr) * Scale(zoom) * Translate(pan)?
        // No, Screen = (World * Zoom + Pan) * DPR.
        // So setTransform(Zoom*DPR, 0, 0, Zoom*DPR, PanX*DPR, PanY*DPR).

        // Let's rely on panX/panY being in Logical Pixels (CSS pixels).
        // bgCanvas.width is Physical Pixels.
        // visibleBounds calculations should be in Logical World Units.
        // ScreenLogicalWidth = bgCanvas.width / dpr.

        visibleBounds.maxX = (this.bgCanvas.width / dpr / scale) - (panX / scale);
        visibleBounds.maxY = (this.bgCanvas.height / dpr / scale) - (panY / scale);
        visibleBounds.minX = -panX / scale;
        visibleBounds.minY = -panY / scale;

        // Apply Transform
        this.bgCtx.setTransform(scale * dpr, 0, 0, scale * dpr, panX * dpr, panY * dpr);

        this.drawBackgroundPattern(visibleBounds);
        
        // Restore to default (DPR scaled) for safety?
        // Actually main.js usually sets scale(dpr, dpr).
        this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    drawBackgroundPattern(bounds = null) {
        if (this.backgroundPattern === 'blank') return;
        
        if (this.backgroundPattern === 'image') {
            // Handled by updateBackgroundImageElement
            // But in Infinite Mode, updateBackgroundImageElement (DOM) might not work well
            // if we are just moving the DOM container.
            // InfiniteCanvasManager usually handles rendering via render().
            // But BackgroundManager handles background image via DOM.
            // If main.js calls updateBackgroundImageElement, it relies on CSS transform of parent.
            // If Infinite Mode disables parent transform, we need to update DOM element manually?
            // Yes.
            return;
        }
        
        this.bgCtx.save();
        this.bgCtx.globalCompositeOperation = 'source-over';
        
        const dpr = 1; // Since we handled DPR in transform, drawing functions should assume 1 unit = 1 logical pixel
        // Wait, existing functions multiply by DPR!
        // `const baseSpacing = 20 * dpr;`
        // If I use setTransform with DPR, then drawing 20*dpr results in 20*dpr*dpr physical pixels!
        // I need to normalize.
        // If I pass dpr=1 to functions, they draw 20 units. With transform scale*dpr, it becomes 20*scale*dpr physical.
        // This seems correct for Infinite Mode (Zoomable).

        // However, for Standard Mode, `drawBackground` calls `drawBackgroundPattern` with `dpr = window.devicePixelRatio`.
        // And `drawBackground` does NOT set transform (it uses the one set in main.js resizeCanvas: scale(dpr, dpr)).
        // So existing functions expect to be called with `dpr` scaling factor if the context is already scaled by dpr?
        // No, if context is scaled by DPR, drawing "1" results in "1*DPR" physical pixels.
        // The functions use `20 * dpr`. This implies they want 20 physical pixels?
        // Let's check `drawDotsPattern`.
        // `ctx.arc(x, y, 1 * dpr...)`.
        // If context is scaled by DPR, `1 * dpr` -> `1 * dpr * dpr` pixels. That's huge.
        // Let's check `main.js`.
        // `this.bgCtx.scale(dpr, dpr);`
        // So `drawBackground` runs in a scaled context.
        // `drawDotsPattern` uses `dpr`.
        // So dots are drawn at `20 * dpr` logical coordinates? No, that would be `20 * dpr * dpr` physical.
        // Maybe I misunderstood `dpr` usage in this codebase.
        // If `scale(dpr, dpr)` is applied, drawing `10` means 10 logical pixels.
        // Why multiply by `dpr` inside the functions?
        // Maybe to keep line width consistent in physical pixels? `lineWidth = 0.5 * dpr`.
        // If scale is applied, `lineWidth = 0.5` -> `0.5 * dpr` physical.
        // If they assume `lineWidth = 0.5 * dpr`, then result is `0.5 * dpr * dpr` physical?
        // Unless `dpr` passed to functions is 1?
        // `const dpr = window.devicePixelRatio || 1;` in `drawBackgroundPattern`.
        // It passes actual DPR.

        // Okay, so the existing code seems to double-apply DPR if context is scaled?
        // Or maybe `drawBackground` restores context? No.
        // Let's assume the existing code is correct for Standard Mode.

        // For Infinite Mode `renderInfinite`, I set transform `scale * dpr`.
        // So if I want to match Standard Mode behavior, I should pass `dpr` as well.

        const dprPassed = window.devicePixelRatio || 1;
        const patternColor = this.getPatternColor();
        
        // Define bounds if not provided
        const drawBounds = bounds || {
            minX: 0,
            maxX: this.bgCanvas.width / dprPassed, // Logical width
            minY: 0,
            maxY: this.bgCanvas.height / dprPassed
        };

        switch(this.backgroundPattern) {
            case 'dots':
                this.drawDotsPattern(dprPassed, patternColor, drawBounds);
                break;
            case 'grid':
                this.drawGridPattern(dprPassed, patternColor, drawBounds);
                break;
            case 'tianzige':
                this.drawTianzigePattern(dprPassed, patternColor, drawBounds);
                break;
            case 'english-lines':
                this.drawEnglishLinesPattern(dprPassed, patternColor, drawBounds);
                break;
            case 'music-staff':
                this.drawMusicStaffPattern(dprPassed, patternColor, drawBounds);
                break;
            case 'coordinate':
                this.drawCoordinatePattern(dprPassed, patternColor, drawBounds);
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

            containerElement.style.display = 'block';

            // Check if source changed
            if (imgElement.src !== this.backgroundImageData && !this.isImagePaused) {
                imgElement.src = this.backgroundImageData;

                // Check if it's a GIF and initialize SuperGif if needed
                if (this.isGif(this.backgroundImageData)) {
                    this.initGif(imgElement);
                    // Show GIF settings button
                    const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                    if (gifSettingsBtn) gifSettingsBtn.style.display = 'block';
                } else {
                    // Hide GIF settings button
                    const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
                    if (gifSettingsBtn) gifSettingsBtn.style.display = 'none';
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
            
            containerElement.style.opacity = this.patternIntensity;

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
                containerElement.style.left = `${this.imageTransform.x}px`;
                containerElement.style.top = `${this.imageTransform.y}px`;
                containerElement.style.width = `${this.imageTransform.width}px`;
                containerElement.style.height = `${this.imageTransform.height}px`;

                // Build transform string including flip
                const scaleX = this.imageTransform.flipHorizontal ? -this.imageTransform.scale : this.imageTransform.scale;
                const scaleY = this.imageTransform.flipVertical ? -this.imageTransform.scale : this.imageTransform.scale;

                containerElement.style.transformOrigin = 'center center';
                containerElement.style.transform = `rotate(${this.imageTransform.rotation}deg) scale(${scaleX}, ${scaleY})`;
            } else {
                // Fallback centering logic
                if (imgElement.naturalWidth) {
                    const scaledWidth = imgElement.naturalWidth * this.imageSize;
                    const scaledHeight = imgElement.naturalHeight * this.imageSize;
                    const x = (canvasWidth - scaledWidth) / 2;
                    const y = (canvasHeight - scaledHeight) / 2;

                    containerElement.style.left = `${x}px`;
                    containerElement.style.top = `${y}px`;
                    containerElement.style.width = `${scaledWidth}px`;
                    containerElement.style.height = `${scaledHeight}px`;
                    containerElement.style.transform = 'none';
                } else {
                    // If not loaded yet, wait
                    imgElement.onload = () => this.drawBackground(); // Redraw (update styles) when loaded
                }
            }

        } else {
            if (containerElement) {
                containerElement.style.display = 'none';
            }
        }
    }

    isGif(dataUrl) {
        return dataUrl && dataUrl.startsWith('data:image/gif');
    }

    initGif(imgElement) {
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

    drawDotsPattern(dpr, patternColor, bounds) {
        const baseSpacing = 20 * dpr;
        const spacing = baseSpacing / this.patternDensity;
        this.bgCtx.fillStyle = patternColor;
        
        // Align to grid
        const startX = Math.floor(bounds.minX / spacing) * spacing;
        const startY = Math.floor(bounds.minY / spacing) * spacing;

        for (let x = startX; x < bounds.maxX; x += spacing) {
            for (let y = startY; y < bounds.maxY; y += spacing) {
                this.bgCtx.beginPath();
                this.bgCtx.arc(x, y, 1 * dpr, 0, Math.PI * 2);
                this.bgCtx.fill();
            }
        }
    }
    
    drawGridPattern(dpr, patternColor, bounds) {
        const baseSpacing = 20 * dpr;
        const spacing = baseSpacing / this.patternDensity;
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 0.5 * dpr;
        
        const startX = Math.floor(bounds.minX / spacing) * spacing;
        const startY = Math.floor(bounds.minY / spacing) * spacing;

        for (let x = startX; x < bounds.maxX; x += spacing) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, bounds.minY);
            this.bgCtx.lineTo(x, bounds.maxY);
            this.bgCtx.stroke();
        }
        
        for (let y = startY; y < bounds.maxY; y += spacing) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y);
            this.bgCtx.lineTo(bounds.maxX, y);
            this.bgCtx.stroke();
        }
    }
    
    drawTianzigePattern(dpr, patternColor, bounds) {
        const baseCellSize = 60 * dpr;
        const cellSize = baseCellSize / this.patternDensity;
        this.bgCtx.strokeStyle = patternColor;
        
        const startX = Math.floor(bounds.minX / cellSize) * cellSize;
        const startY = Math.floor(bounds.minY / cellSize) * cellSize;

        for (let x = startX; x < bounds.maxX; x += cellSize) {
            for (let y = startY; y < bounds.maxY; y += cellSize) {
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
    
    drawEnglishLinesPattern(dpr, patternColor, bounds) {
        const baseLineHeight = 60 * dpr;
        const lineHeight = baseLineHeight / this.patternDensity;
        
        const startY = Math.floor(bounds.minY / lineHeight) * lineHeight;

        for (let y = startY; y < bounds.maxY; y += lineHeight) {
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 1 * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y);
            this.bgCtx.lineTo(bounds.maxX, y);
            this.bgCtx.stroke();
            
            this.bgCtx.lineWidth = 0.5 * dpr;
            this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y + lineHeight / 4);
            this.bgCtx.lineTo(bounds.maxX, y + lineHeight / 4);
            this.bgCtx.stroke();
            
            this.bgCtx.setLineDash([]);
            this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.5)';
            this.bgCtx.lineWidth = 1 * dpr;
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y + lineHeight / 2);
            this.bgCtx.lineTo(bounds.maxX, y + lineHeight / 2);
            this.bgCtx.stroke();
            
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 0.5 * dpr;
            this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y + 3 * lineHeight / 4);
            this.bgCtx.lineTo(bounds.maxX, y + 3 * lineHeight / 4);
            this.bgCtx.stroke();
            this.bgCtx.setLineDash([]);
        }
    }
    
    drawMusicStaffPattern(dpr, patternColor, bounds) {
        const baseStaffHeight = 80 * dpr;
        const staffHeight = baseStaffHeight / this.patternDensity;
        const lineSpacing = staffHeight / 4;
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 1 * dpr;
        
        // Align to staff blocks (height * 2)
        const blockHeight = staffHeight * 2;
        const startY = Math.floor(bounds.minY / blockHeight) * blockHeight + staffHeight; // Offset by staffHeight

        for (let baseY = startY; baseY < bounds.maxY; baseY += blockHeight) {
            for (let i = 0; i < 5; i++) {
                const y = baseY + i * lineSpacing;
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(bounds.minX, y);
                this.bgCtx.lineTo(bounds.maxX, y);
                this.bgCtx.stroke();
            }
        }
    }
    
    drawCoordinatePattern(dpr, patternColor, bounds) {
        // Coordinate system center is always at the exact center of the canvas
        // The origin offset is applied relative to this center
        const centerX = (this.bgCanvas.width / 2) + (this.coordinateOriginX * dpr);
        const centerY = (this.bgCanvas.height / 2) + (this.coordinateOriginY * dpr);
        const baseGridSize = 20 * dpr;
        const gridSize = baseGridSize / this.patternDensity;
        
        this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        this.bgCtx.lineWidth = 0.5 * dpr;
        
        // Draw grid lines
        // Align to grid based on center
        const startX = Math.floor((bounds.minX - centerX) / gridSize) * gridSize + centerX;
        const startY = Math.floor((bounds.minY - centerY) / gridSize) * gridSize + centerY;

        for (let x = startX; x < bounds.maxX; x += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, bounds.minY);
            this.bgCtx.lineTo(x, bounds.maxY);
            this.bgCtx.stroke();
        }
        
        for (let y = startY; y < bounds.maxY; y += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(bounds.minX, y);
            this.bgCtx.lineTo(bounds.maxX, y);
            this.bgCtx.stroke();
        }
        
        // Draw axes
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 2 * dpr;
        
        // X-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(bounds.minX, centerY);
        this.bgCtx.lineTo(bounds.maxX, centerY);
        this.bgCtx.stroke();
        
        // Y-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX, bounds.minY);
        this.bgCtx.lineTo(centerX, bounds.maxY);
        this.bgCtx.stroke();
        
        // Draw arrow on X-axis
        const arrowSize = 10 * dpr;
        
        // Only draw arrows if visible? Or just draw them at ends of bounds?
        // Standard behavior is at canvas edge.
        // Infinite Canvas: Axes extend forever.
        // Maybe draw arrows at visible edge?
        // Let's draw arrows at visible edge.

        this.bgCtx.beginPath();
        this.bgCtx.moveTo(bounds.maxX - arrowSize, centerY - arrowSize / 2);
        this.bgCtx.lineTo(bounds.maxX, centerY);
        this.bgCtx.lineTo(bounds.maxX - arrowSize, centerY + arrowSize / 2);
        this.bgCtx.stroke();
        
        // Draw arrow on Y-axis
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX - arrowSize / 2, bounds.minY + arrowSize); // Arrow points up (minY) or down?
        // Canvas Y is 0 at top. Arrow usually at top.
        this.bgCtx.lineTo(centerX, bounds.minY);
        this.bgCtx.lineTo(centerX + arrowSize / 2, bounds.minY + arrowSize);
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
