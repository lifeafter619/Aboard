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
        this.imageTransform = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scale: 1.0
        };
        
        // Load saved transform if exists
        const savedTransform = localStorage.getItem('imageTransform');
        if (savedTransform) {
            this.imageTransform = JSON.parse(savedTransform);
        }
        
        // Load saved image if exists
        if (this.backgroundImageData) {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                if (this.backgroundPattern === 'image') {
                    this.drawBackground();
                }
            };
            img.src = this.backgroundImageData;
        }
    }
    
    drawBackground() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        this.bgCtx.globalAlpha = this.bgOpacity;
        this.bgCtx.fillStyle = this.backgroundColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.globalAlpha = 1.0;
        
        this.drawBackgroundPattern();
        
        localStorage.setItem('backgroundColor', this.backgroundColor);
        localStorage.setItem('backgroundPattern', this.backgroundPattern);
        localStorage.setItem('bgOpacity', this.bgOpacity);
        localStorage.setItem('patternIntensity', this.patternIntensity);
    }
    
    drawBackgroundPattern() {
        if (this.backgroundPattern === 'blank') return;
        
        if (this.backgroundPattern === 'image' && this.backgroundImage) {
            this.drawImagePattern();
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
    
    drawImagePattern() {
        if (!this.backgroundImage) return;
        
        this.bgCtx.save();
        this.bgCtx.globalAlpha = this.patternIntensity;
        
        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = this.bgCanvas.width / dpr;
        const canvasHeight = this.bgCanvas.height / dpr;
        
        // Use transform if available, otherwise fall back to simple centering
        if (this.imageTransform.width > 0 && this.imageTransform.height > 0) {
            // Apply transformations
            const centerX = this.imageTransform.x + this.imageTransform.width / 2;
            const centerY = this.imageTransform.y + this.imageTransform.height / 2;
            
            this.bgCtx.translate(centerX, centerY);
            this.bgCtx.rotate(this.imageTransform.rotation * Math.PI / 180);
            this.bgCtx.scale(this.imageTransform.scale, this.imageTransform.scale);
            this.bgCtx.translate(-centerX, -centerY);
            
            this.bgCtx.drawImage(
                this.backgroundImage,
                this.imageTransform.x,
                this.imageTransform.y,
                this.imageTransform.width,
                this.imageTransform.height
            );
        } else {
            // Fall back to simple centered image
            const scaledWidth = this.backgroundImage.width * this.imageSize;
            const scaledHeight = this.backgroundImage.height * this.imageSize;
            const x = (canvasWidth - scaledWidth) / 2;
            const y = (canvasHeight - scaledHeight) / 2;
            
            this.bgCtx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
        }
        
        this.bgCtx.restore();
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
        const centerX = this.bgCanvas.width / 2;
        const centerY = this.bgCanvas.height / 2;
        const baseGridSize = 20 * dpr;
        const gridSize = baseGridSize / this.patternDensity;
        
        this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        this.bgCtx.lineWidth = 0.5 * dpr;
        
        for (let x = 0; x < this.bgCanvas.width; x += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, 0);
            this.bgCtx.lineTo(x, this.bgCanvas.height);
            this.bgCtx.stroke();
        }
        
        for (let y = 0; y < this.bgCanvas.height; y += gridSize) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y);
            this.bgCtx.lineTo(this.bgCanvas.width, y);
            this.bgCtx.stroke();
        }
        
        this.bgCtx.strokeStyle = patternColor;
        this.bgCtx.lineWidth = 2 * dpr;
        
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(0, centerY);
        this.bgCtx.lineTo(this.bgCanvas.width, centerY);
        this.bgCtx.stroke();
        
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX, 0);
        this.bgCtx.lineTo(centerX, this.bgCanvas.height);
        this.bgCtx.stroke();
        
        const arrowSize = 10 * dpr;
        
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(this.bgCanvas.width - arrowSize, centerY - arrowSize / 2);
        this.bgCtx.lineTo(this.bgCanvas.width, centerY);
        this.bgCtx.lineTo(this.bgCanvas.width - arrowSize, centerY + arrowSize / 2);
        this.bgCtx.stroke();
        
        this.bgCtx.beginPath();
        this.bgCtx.moveTo(centerX - arrowSize / 2, arrowSize);
        this.bgCtx.lineTo(centerX, 0);
        this.bgCtx.lineTo(centerX + arrowSize / 2, arrowSize);
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
        this.drawBackground();
    }
    
    setBackgroundPattern(pattern) {
        this.backgroundPattern = pattern;
        this.drawBackground();
    }
    
    setOpacity(opacity) {
        this.bgOpacity = opacity;
        this.drawBackground();
    }
    
    setPatternIntensity(intensity) {
        this.patternIntensity = intensity;
        this.drawBackground();
    }
    
    setPatternDensity(density) {
        this.patternDensity = density;
        localStorage.setItem('patternDensity', density);
        this.drawBackground();
    }
    
    setBackgroundImage(imageData) {
        this.backgroundImageData = imageData;
        localStorage.setItem('backgroundImageData', imageData);
        
        const img = new Image();
        img.onload = () => {
            this.backgroundImage = img;
            this.backgroundPattern = 'image';
            this.drawBackground();
        };
        img.src = imageData;
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
}
