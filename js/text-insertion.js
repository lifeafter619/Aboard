// Text Insertion Module
// Handles text insertion, editing, and manipulation

class TextInsertionManager {
    constructor(canvas, ctx, historyManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        
        // Text objects storage
        this.textObjects = [];
        this.selectedTextIndex = null;
        
        // Text input state
        this.isInputting = false;
        this.inputPosition = { x: 0, y: 0 };
        
        // Default text properties
        this.defaultFontSize = 24;
        this.defaultColor = '#000000';
        this.defaultFontFamily = 'Arial, sans-serif';
        
        // Manipulation state
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.dragStart = { x: 0, y: 0 };
        this.resizeHandle = null;
        
        this.HANDLE_SIZE = 8;
        this.ROTATION_HANDLE_DISTANCE = 30;
    }
    
    // Start text input at mouse position
    startTextInput(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.inputPosition = { x, y };
        this.showTextInputDialog();
    }
    
    // Show text input dialog
    showTextInputDialog() {
        // Create modal for text input
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = 'text-input-modal';
        modal.innerHTML = `
            <div class="modal-content text-input-modal-content">
                <div class="modal-header">
                    <h2>插入文字</h2>
                    <button id="text-input-close-btn" class="modal-close-btn" title="关闭">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <textarea id="text-input-area" class="text-input-area" placeholder="请输入文字..." autofocus></textarea>
                    <div class="text-input-controls">
                        <div class="text-control-group">
                            <label>字号 <span id="text-font-size-value">${this.defaultFontSize}</span>px</label>
                            <input type="range" id="text-font-size-slider" min="12" max="72" value="${this.defaultFontSize}" class="slider">
                        </div>
                        <div class="text-control-group">
                            <label>颜色</label>
                            <div class="color-picker-row">
                                <button class="color-btn active" data-text-color="#000000" style="background-color: #000000;" title="黑色"></button>
                                <button class="color-btn" data-text-color="#FF0000" style="background-color: #FF0000;" title="红色"></button>
                                <button class="color-btn" data-text-color="#0000FF" style="background-color: #0000FF;" title="蓝色"></button>
                                <button class="color-btn" data-text-color="#00FF00" style="background-color: #00FF00;" title="绿色"></button>
                                <label class="color-picker-icon-btn" for="text-custom-color-picker" title="取色器">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                                        <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                                    </svg>
                                    <input type="color" id="text-custom-color-picker" class="custom-color-picker-input" value="${this.defaultColor}">
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="text-input-buttons">
                        <button id="text-input-cancel-btn" class="confirm-btn cancel-btn">取消</button>
                        <button id="text-input-ok-btn" class="confirm-btn ok-btn">确定</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        this.isInputting = true;
        this.setupTextInputListeners(modal);
        
        // Focus on textarea
        setTimeout(() => {
            document.getElementById('text-input-area').focus();
        }, 100);
    }
    
    setupTextInputListeners(modal) {
        const textarea = document.getElementById('text-input-area');
        const fontSizeSlider = document.getElementById('text-font-size-slider');
        const fontSizeValue = document.getElementById('text-font-size-value');
        const okBtn = document.getElementById('text-input-ok-btn');
        const cancelBtn = document.getElementById('text-input-cancel-btn');
        const closeBtn = document.getElementById('text-input-close-btn');
        const customColorPicker = document.getElementById('text-custom-color-picker');
        
        let currentFontSize = this.defaultFontSize;
        let currentColor = this.defaultColor;
        
        // Font size slider
        fontSizeSlider.addEventListener('input', (e) => {
            currentFontSize = parseInt(e.target.value);
            fontSizeValue.textContent = currentFontSize;
        });
        
        // Color buttons
        document.querySelectorAll('.color-btn[data-text-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentColor = e.target.dataset.textColor;
                document.querySelectorAll('.color-btn[data-text-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Custom color picker
        customColorPicker.addEventListener('input', (e) => {
            currentColor = e.target.value;
            document.querySelectorAll('.color-btn[data-text-color]').forEach(b => b.classList.remove('active'));
        });
        
        // OK button
        okBtn.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) {
                this.insertText(text, currentFontSize, currentColor);
            }
            this.closeTextInputDialog(modal);
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.closeTextInputDialog(modal);
        });
        
        // Close button
        closeBtn.addEventListener('click', () => {
            this.closeTextInputDialog(modal);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTextInputDialog(modal);
            }
        });
        
        // Enter to confirm (Ctrl+Enter for new line)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const text = textarea.value.trim();
                if (text) {
                    this.insertText(text, currentFontSize, currentColor);
                }
                this.closeTextInputDialog(modal);
            }
        });
    }
    
    closeTextInputDialog(modal) {
        modal.remove();
        this.isInputting = false;
    }
    
    // Insert text object
    insertText(text, fontSize, color) {
        const textObj = {
            text: text,
            x: this.inputPosition.x,
            y: this.inputPosition.y,
            fontSize: fontSize,
            color: color,
            fontFamily: this.defaultFontFamily,
            rotation: 0,
            scale: 1.0,
            width: 0,
            height: 0
        };
        
        // Calculate text dimensions
        this.ctx.save();
        this.ctx.font = `${fontSize}px ${this.defaultFontFamily}`;
        const lines = text.split('\n');
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = this.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        textObj.width = maxWidth;
        textObj.height = fontSize * 1.2 * lines.length; // Approximate height
        this.ctx.restore();
        
        this.textObjects.push(textObj);
        
        // Auto-select the newly inserted text
        this.selectedTextIndex = this.textObjects.length - 1;
        
        // Render text immediately
        this.drawAllTextObjects();
        this.drawTextSelection();
        
        if (this.historyManager) {
            this.historyManager.saveState();
        }
    }
    
    // Draw all text objects
    drawAllTextObjects() {
        this.textObjects.forEach(textObj => {
            this.drawTextObject(textObj);
        });
    }
    
    // Draw a single text object
    drawTextObject(textObj) {
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(textObj.x, textObj.y);
        this.ctx.rotate(textObj.rotation * Math.PI / 180);
        this.ctx.scale(textObj.scale, textObj.scale);
        
        // Draw text
        this.ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
        this.ctx.fillStyle = textObj.color;
        this.ctx.textBaseline = 'top';
        
        // Support multi-line text
        const lines = textObj.text.split('\n');
        lines.forEach((line, i) => {
            this.ctx.fillText(line, 0, i * textObj.fontSize * 1.2);
        });
        
        this.ctx.restore();
    }
    
    // Draw selection handles for selected text
    drawTextSelection() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return;
        
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return;
        
        this.ctx.save();
        
        // Draw bounding box
        this.ctx.translate(textObj.x, textObj.y);
        this.ctx.rotate(textObj.rotation * Math.PI / 180);
        this.ctx.scale(textObj.scale, textObj.scale);
        
        const width = textObj.width;
        const height = textObj.height * textObj.text.split('\n').length;
        
        // Draw box
        this.ctx.strokeStyle = '#007AFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-5, -5, width + 10, height + 10);
        
        // Draw corner handles
        this.ctx.fillStyle = '#007AFF';
        const handleSize = this.HANDLE_SIZE;
        
        // Top-left
        this.ctx.fillRect(-5 - handleSize/2, -5 - handleSize/2, handleSize, handleSize);
        // Top-right
        this.ctx.fillRect(width + 5 - handleSize/2, -5 - handleSize/2, handleSize, handleSize);
        // Bottom-left
        this.ctx.fillRect(-5 - handleSize/2, height + 5 - handleSize/2, handleSize, handleSize);
        // Bottom-right
        this.ctx.fillRect(width + 5 - handleSize/2, height + 5 - handleSize/2, handleSize, handleSize);
        
        // Draw rotation handle
        this.ctx.beginPath();
        this.ctx.arc(width / 2, -this.ROTATION_HANDLE_DISTANCE, handleSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(width / 2, -5);
        this.ctx.lineTo(width / 2, -this.ROTATION_HANDLE_DISTANCE + handleSize/2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    // Check if point is near text object
    hitTestText(x, y) {
        for (let i = this.textObjects.length - 1; i >= 0; i--) {
            const textObj = this.textObjects[i];
            
            // Transform point to text's local space
            const dx = x - textObj.x;
            const dy = y - textObj.y;
            
            const cos = Math.cos(-textObj.rotation * Math.PI / 180);
            const sin = Math.sin(-textObj.rotation * Math.PI / 180);
            
            const localX = (dx * cos - dy * sin) / textObj.scale;
            const localY = (dx * sin + dy * cos) / textObj.scale;
            
            const width = textObj.width;
            const height = textObj.height * textObj.text.split('\n').length;
            
            if (localX >= -5 && localX <= width + 5 && 
                localY >= -5 && localY <= height + 5) {
                return i;
            }
        }
        return -1;
    }
    
    // Select text object
    selectText(index) {
        this.selectedTextIndex = index;
        this.redrawCanvas();
    }
    
    // Deselect text
    deselectText() {
        this.selectedTextIndex = null;
        this.redrawCanvas();
    }
    
    // Copy selected text
    copySelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return false;
        
        // Create a copy with offset
        const copy = {
            ...textObj,
            x: textObj.x + 20,
            y: textObj.y + 20
        };
        
        this.textObjects.push(copy);
        this.selectedTextIndex = this.textObjects.length - 1;
        this.redrawCanvas();
        
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        return true;
    }
    
    // Delete selected text
    deleteSelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        
        this.textObjects.splice(this.selectedTextIndex, 1);
        this.selectedTextIndex = null;
        this.redrawCanvas();
        
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        return true;
    }
    
    // Start dragging selected text
    startDrag(e) {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        this.isDragging = true;
        this.dragStart = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    // Drag text
    dragText(e) {
        if (!this.isDragging || this.selectedTextIndex === null) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        const dx = currentX - this.dragStart.x;
        const dy = currentY - this.dragStart.y;
        
        const textObj = this.textObjects[this.selectedTextIndex];
        textObj.x += dx;
        textObj.y += dy;
        
        this.dragStart = { x: currentX, y: currentY };
        this.redrawCanvas();
    }
    
    // Stop dragging
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.historyManager) {
                this.historyManager.saveState();
            }
        }
    }
    
    // Redraw canvas with all text objects
    redrawCanvas() {
        // This will be called by main app to trigger full redraw
        // We just draw text objects and selection
        this.drawAllTextObjects();
        this.drawTextSelection();
    }
    
    // Get all text objects for serialization
    getTextObjects() {
        return this.textObjects;
    }
    
    // Set text objects (for loading)
    setTextObjects(objects) {
        this.textObjects = objects || [];
        this.redrawCanvas();
    }
    
    // Clear all text objects
    clearAllText() {
        this.textObjects = [];
        this.selectedTextIndex = null;
    }
    
    // Check if has selected text
    hasSelection() {
        return this.selectedTextIndex !== null && this.selectedTextIndex >= 0;
    }
}
