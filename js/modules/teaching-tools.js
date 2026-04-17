// Teaching Tools Module - Ruler and Set Square for classroom use
// Allows inserting, moving, rotating, and resizing rulers and set squares

class TeachingToolsManager {
    constructor(canvas, ctx, historyManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        
        // Scale factor reference (will be set by main.js)
        this.canvasScaleFactor = 1.0;
        
        // Callback for when tools are inserted
        this.onToolsInserted = null;
        
        // Tools on canvas
        this.tools = [];
        this.selectedTool = null;
        this.isDragging = false;
        this.isRotating = false;
        this.isResizing = false;
        this.activeResizeHandle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.rotateStart = 0;
        this.resizeStart = { width: 0, height: 0, x: 0, y: 0 };
        
        // Flag to prevent drawing while interacting with tools
        this.isInteracting = false;
        
        // Touch/pinch state for tools
        this.toolPinchState = {
            active: false,
            initialDistance: 0,
            initialWidth: 0,
            initialHeight: 0,
            initialRotation: 0,
            initialAngle: 0
        };
        
        // Tool images
        this.rulerImage = null;
        this.rulerImage1 = null;
        this.rulerImage2 = null;
        this.setSquareImage = null;
        this.setSquareImage1 = null;
        this.setSquareImage2 = null;
        this.imagesLoaded = false;
        
        // Modal state - counts for each tool variant
        this.ruler1Count = 0;
        this.ruler2Count = 0;
        this.setSquare60Count = 0;
        this.setSquare45Count = 0;
        
        // Control overlay
        this.controlOverlay = null;
        
        this.loadImages();
        this.createModal();
        this.setupEventListeners();
        this.localeChangeHandler = () => {
            this.updateCounterButtonLabels();
        };
        window.addEventListener('localeChanged', this.localeChangeHandler);
    }
    
    loadImages() {
        let loadedCount = 0;
        const totalImages = 4;
        const checkLoaded = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
                this.imagesLoaded = true;
            }
        };
        
        // Ruler style 1
        this.rulerImage1 = new Image();
        this.rulerImage1.onload = checkLoaded;
        this.rulerImage1.onerror = () => console.error('Failed to load ruler_1 image');
        this.rulerImage1.src = 'img/ruler_1.png';
        
        // Ruler style 2
        this.rulerImage2 = new Image();
        this.rulerImage2.onload = checkLoaded;
        this.rulerImage2.onerror = () => console.error('Failed to load ruler_2 image');
        this.rulerImage2.src = 'img/ruler_2.png';
        
        // Set square 60° (√3:1 aspect ratio)
        this.setSquareImage1 = new Image();
        this.setSquareImage1.onload = checkLoaded;
        this.setSquareImage1.onerror = () => console.error('Failed to load set_square_1 image');
        this.setSquareImage1.src = 'img/set_square_1.png';
        
        // Set square 45° (1:1 aspect ratio)
        this.setSquareImage2 = new Image();
        this.setSquareImage2.onload = checkLoaded;
        this.setSquareImage2.onerror = () => console.error('Failed to load set_square_2 image');
        this.setSquareImage2.src = 'img/set_square_2.png';
        
        // For backward compatibility
        this.rulerImage = this.rulerImage1;
        this.setSquareImage = this.setSquareImage1;
    }
    
    createModal() {
        const closeTitle = window.i18n?.t?.('common.close') || 'Close';
        // Create the modal HTML
        const modal = document.createElement('div');
        modal.id = 'teaching-tools-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content teaching-tools-modal-content">
                <div class="modal-header">
                    <h2 data-i18n="teachingTools.title">Teaching Tools</h2>
                    <button id="teaching-tools-close-btn" class="modal-close-btn" data-i18n-title="common.close" title="${closeTitle}" aria-label="${closeTitle}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="teaching-tools-body">
                    <div class="teaching-tools-current-count-section">
                        <div class="teaching-tools-section-label" data-i18n="teachingTools.currentOnCanvas">Currently on canvas</div>
                        <div class="teaching-tools-current-row teaching-tools-current-row-4">
                            <div class="teaching-tool-current-item">
                                <span data-i18n="teachingTools.rulerStyle1">Ruler 1</span>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="currentRuler1" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="current-ruler1-count" class="counter-input" value="0" min="0" max="10" readonly>
                                    <button class="counter-btn plus-btn" data-tool="currentRuler1" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="teaching-tool-current-item">
                                <span data-i18n="teachingTools.rulerStyle2">Ruler 2</span>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="currentRuler2" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="current-ruler2-count" class="counter-input" value="0" min="0" max="10" readonly>
                                    <button class="counter-btn plus-btn" data-tool="currentRuler2" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="teaching-tool-current-item">
                                <span data-i18n="teachingTools.setSquare60">Set Square 60°</span>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="currentSetSquare60" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="current-set-square-60-count" class="counter-input" value="0" min="0" max="10" readonly>
                                    <button class="counter-btn plus-btn" data-tool="currentSetSquare60" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="teaching-tool-current-item">
                                <span data-i18n="teachingTools.setSquare45">Set Square 45°</span>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="currentSetSquare45" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="current-set-square-45-count" class="counter-input" value="0" min="0" max="10" readonly>
                                    <button class="counter-btn plus-btn" data-tool="currentSetSquare45" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="teaching-tools-new-section">
                        <div class="teaching-tools-section-label" data-i18n="teachingTools.addNew">Add New</div>
                        <div class="teaching-tools-row teaching-tools-row-4">
                            <!-- Ruler Style 1 Section -->
                            <div class="teaching-tool-item">
                                <div class="teaching-tool-preview">
                                    <img src="img/ruler_1.png" alt="直尺 1" data-i18n-alt="teachingTools.rulerStyle1" class="teaching-tool-image">
                                </div>
                                <div class="teaching-tool-label" data-i18n="teachingTools.rulerStyle1">Ruler 1</div>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="ruler1" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="ruler1-count-input" class="counter-input" value="0" min="0" max="10">
                                    <button class="counter-btn plus-btn" data-tool="ruler1" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Ruler Style 2 Section -->
                            <div class="teaching-tool-item">
                                <div class="teaching-tool-preview">
                                    <img src="img/ruler_2.png" alt="直尺 2" data-i18n-alt="teachingTools.rulerStyle2" class="teaching-tool-image">
                                </div>
                                <div class="teaching-tool-label" data-i18n="teachingTools.rulerStyle2">Ruler 2</div>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="ruler2" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="ruler2-count-input" class="counter-input" value="0" min="0" max="10">
                                    <button class="counter-btn plus-btn" data-tool="ruler2" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Set Square 60° Section -->
                            <div class="teaching-tool-item">
                                <div class="teaching-tool-preview">
                                    <img src="img/set_square_1.png" alt="三角板 60°" data-i18n-alt="teachingTools.setSquare60" class="teaching-tool-image set-square-image">
                                </div>
                                <div class="teaching-tool-label" data-i18n="teachingTools.setSquare60">Set Square 60°</div>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="setSquare60" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="set-square-60-count-input" class="counter-input" value="0" min="0" max="10">
                                    <button class="counter-btn plus-btn" data-tool="setSquare60" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Set Square 45° Section -->
                            <div class="teaching-tool-item">
                                <div class="teaching-tool-preview">
                                    <img src="img/set_square_2.png" alt="三角板 45°" data-i18n-alt="teachingTools.setSquare45" class="teaching-tool-image set-square-image">
                                </div>
                                <div class="teaching-tool-label" data-i18n="teachingTools.setSquare45">Set Square 45°</div>
                                <div class="teaching-tool-counter">
                                    <button class="counter-btn minus-btn" data-tool="setSquare45" data-action="minus" title="Decrease count" aria-label="Decrease count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <input type="number" id="set-square-45-count-input" class="counter-input" value="0" min="0" max="10">
                                    <button class="counter-btn plus-btn" data-tool="setSquare45" data-action="plus" title="Increase count" aria-label="Increase count">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="teaching-tools-hint">
                        <span data-i18n="teachingTools.hint">Tip: Click to move, double-click to resize/rotate/delete</span>
                    </div>
                </div>
                <div class="teaching-tools-footer">
                    <button id="teaching-tools-confirm-btn" class="teaching-tools-confirm-btn" data-i18n="common.confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Setup modal event listeners
        this.setupModalListeners();
        window.i18n?.applyTranslations?.();
        this.updateCounterButtonLabels();
    }

    getText(key, fallback, replacements = null) {
        const translated = window.i18n?.t?.(key);
        const value = translated && translated !== key ? translated : fallback;
        if (!replacements || typeof value !== 'string') {
            return value;
        }

        return Object.entries(replacements).reduce(
            (message, [name, replacement]) => message.replaceAll(`{${name}}`, String(replacement ?? '')),
            value
        );
    }

    updateCounterButtonLabels() {
        const modal = document.getElementById('teaching-tools-modal');
        if (!modal) {
            return;
        }

        modal.querySelectorAll('.counter-btn').forEach((button) => {
            const action = button.dataset.action;
            const item =
                button.closest('.teaching-tool-current-item')?.querySelector('span')?.textContent?.trim()
                || button.closest('.teaching-tool-item')?.querySelector('.teaching-tool-label')?.textContent?.trim()
                || this.getText('teachingTools.title', 'Teaching Tools');
            const label = action === 'minus'
                ? this.getText('teachingTools.decreaseCount', 'Decrease count for {tool}', { tool: item })
                : this.getText('teachingTools.increaseCount', 'Increase count for {tool}', { tool: item });

            button.title = label;
            button.setAttribute('aria-label', label);
        });

        modal.querySelectorAll('.counter-input').forEach((input) => {
            const item =
                input.closest('.teaching-tool-current-item')?.querySelector('span')?.textContent?.trim()
                || input.closest('.teaching-tool-item')?.querySelector('.teaching-tool-label')?.textContent?.trim()
                || this.getText('teachingTools.title', 'Teaching Tools');
            input.setAttribute('aria-label', item);
            input.title = item;
        });
    }
    
    // Get counts of tools currently on canvas, separated by variant
    getToolCounts() {
        const ruler1Count = this.tools.filter(t => t.type === 'ruler' && t.variant === 1).length;
        const ruler2Count = this.tools.filter(t => t.type === 'ruler' && t.variant === 2).length;
        const setSquare60Count = this.tools.filter(t => t.type === 'setSquare' && t.variant === 60).length;
        const setSquare45Count = this.tools.filter(t => t.type === 'setSquare' && t.variant === 45).length;
        // Also provide totals for backward compatibility
        const rulerCount = ruler1Count + ruler2Count;
        const setSquareCount = setSquare60Count + setSquare45Count;
        return { ruler1Count, ruler2Count, setSquare60Count, setSquare45Count, rulerCount, setSquareCount };
    }
    
    // Update the current count display in modal
    updateCurrentCountDisplay() {
        const counts = this.getToolCounts();
        
        // Update individual count displays
        const ruler1El = document.getElementById('current-ruler1-count');
        const ruler2El = document.getElementById('current-ruler2-count');
        const setSquare60El = document.getElementById('current-set-square-60-count');
        const setSquare45El = document.getElementById('current-set-square-45-count');
        
        if (ruler1El) ruler1El.value = counts.ruler1Count;
        if (ruler2El) ruler2El.value = counts.ruler2Count;
        if (setSquare60El) setSquare60El.value = counts.setSquare60Count;
        if (setSquare45El) setSquare45El.value = counts.setSquare45Count;
        
        // Helper function to update button states
        const updateButtonState = (toolName, count) => {
            const minusBtn = document.querySelector(`[data-tool="${toolName}"][data-action="minus"]`);
            const plusBtn = document.querySelector(`[data-tool="${toolName}"][data-action="plus"]`);
            
            if (minusBtn) {
                if (count <= 0) {
                    minusBtn.classList.add('disabled');
                    minusBtn.disabled = true;
                } else {
                    minusBtn.classList.remove('disabled');
                    minusBtn.disabled = false;
                }
            }
            
            // Plus button is only disabled if count is 0 (for "current" controls)
            if (plusBtn && toolName.startsWith('current')) {
                if (count <= 0) {
                    plusBtn.classList.add('disabled');
                    plusBtn.disabled = true;
                } else {
                    plusBtn.classList.remove('disabled');
                    plusBtn.disabled = false;
                }
            }
        };
        
        // Update button states for each variant
        updateButtonState('currentRuler1', counts.ruler1Count);
        updateButtonState('currentRuler2', counts.ruler2Count);
        updateButtonState('currentSetSquare60', counts.setSquare60Count);
        updateButtonState('currentSetSquare45', counts.setSquare45Count);
    }
    
    // Remove the last tool of a specific type and variant
    removeLastToolOfType(type, variant = null) {
        // Find all tools of this type and variant, then remove the last one (LIFO)
        let toolsOfType;
        if (variant !== null) {
            toolsOfType = this.tools.filter(t => t.type === type && t.variant === variant);
        } else {
            toolsOfType = this.tools.filter(t => t.type === type);
        }
        if (toolsOfType.length > 0) {
            const lastTool = toolsOfType[toolsOfType.length - 1];
            this.removeTool(lastTool);
        }
    }
    
    /**
     * Calculate the tool size based on original image aspect ratio, 
     * scaled to approximately 20% of canvas area
     * @param {HTMLImageElement} image - The image element
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {Object} - {width, height} of the tool
     */
    calculateToolSize(image, canvasWidth, canvasHeight) {
        // Use actual image dimensions to preserve original aspect ratio
        const imgWidth = image.naturalWidth || image.width;
        const imgHeight = image.naturalHeight || image.height;
        
        if (!imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
            // Fallback to default size if image not loaded or has invalid dimensions
            return { width: 200, height: 100 };
        }
        
        const aspectRatio = imgWidth / imgHeight;
        
        // Target approximately 20% of canvas area
        // To achieve 20% area while preserving aspect ratio:
        // targetArea = width * height = width * (width / aspectRatio) = width² / aspectRatio
        // Therefore: width = sqrt(targetArea * aspectRatio)
        const canvasArea = canvasWidth * canvasHeight;
        const targetArea = canvasArea * 0.20;
        
        // Calculate dimensions that preserve aspect ratio and approximate target area
        let toolWidth = Math.sqrt(targetArea * aspectRatio);
        let toolHeight = toolWidth / aspectRatio;
        
        // Ensure the tool doesn't exceed 50% of canvas width or height
        const maxWidth = canvasWidth * 0.5;
        const maxHeight = canvasHeight * 0.5;
        
        if (toolWidth > maxWidth) {
            toolWidth = maxWidth;
            toolHeight = toolWidth / aspectRatio;
        }
        if (toolHeight > maxHeight) {
            toolHeight = maxHeight;
            toolWidth = toolHeight * aspectRatio;
        }
        
        // Minimum size constraint
        const minSize = 50;
        if (toolWidth < minSize) {
            toolWidth = minSize;
            toolHeight = toolWidth / aspectRatio;
        }
        if (toolHeight < minSize) {
            toolHeight = minSize;
            toolWidth = toolHeight * aspectRatio;
        }
        
        return { 
            width: Math.round(toolWidth), 
            height: Math.round(toolHeight) 
        };
    }
    
    // Add a new tool of a specific type
    addToolOfType(type, variant = 1) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleFactor = this.canvasScaleFactor;
        // Get canvas dimensions in unscaled coordinates
        const canvasWidth = rect.width / scaleFactor;
        const canvasHeight = rect.height / scaleFactor;
        // Get center in canvas coordinates
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        if (type === 'ruler') {
            const image = variant === 2 ? this.rulerImage2 : this.rulerImage1;
            const size = this.calculateToolSize(image, canvasWidth, canvasHeight);
            this.addTool({
                type: 'ruler',
                variant: variant,
                x: centerX - size.width / 2 + Math.random() * 50,
                y: centerY - size.height / 2 + Math.random() * 50,
                width: size.width,
                height: size.height,
                rotation: 0,
                image: image
            });
        } else if (type === 'setSquare60') {
            const size = this.calculateToolSize(this.setSquareImage1, canvasWidth, canvasHeight);
            this.addTool({
                type: 'setSquare',
                variant: 60,
                x: centerX - size.width / 2 + Math.random() * 50,
                y: centerY - size.height / 2 + Math.random() * 50,
                width: size.width,
                height: size.height,
                rotation: 0,
                image: this.setSquareImage1
            });
        } else if (type === 'setSquare45') {
            const size = this.calculateToolSize(this.setSquareImage2, canvasWidth, canvasHeight);
            this.addTool({
                type: 'setSquare',
                variant: 45,
                x: centerX - size.width / 2 + Math.random() * 50,
                y: centerY - size.height / 2 + Math.random() * 50,
                width: size.width,
                height: size.height,
                rotation: 0,
                image: this.setSquareImage2
            });
        }
    }
    
    setupModalListeners() {
        // Close button
        document.getElementById('teaching-tools-close-btn').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Click outside to close
        document.getElementById('teaching-tools-modal').addEventListener('click', (e) => {
            if (e.target.id === 'teaching-tools-modal') {
                this.hideModal();
            }
        });
        
        // Counter buttons for new tools
        document.querySelectorAll('#teaching-tools-modal .counter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.dataset.tool;
                const action = btn.dataset.action;
                
                // Handle current count adjustments for individual variants (directly modify canvas)
                if (tool === 'currentRuler1') {
                    if (action === 'plus') {
                        this.addToolOfType('ruler', 1);
                    } else if (action === 'minus') {
                        this.removeLastToolOfType('ruler', 1);
                    }
                    this.updateCurrentCountDisplay();
                    return;
                }
                
                if (tool === 'currentRuler2') {
                    if (action === 'plus') {
                        this.addToolOfType('ruler', 2);
                    } else if (action === 'minus') {
                        this.removeLastToolOfType('ruler', 2);
                    }
                    this.updateCurrentCountDisplay();
                    return;
                }
                
                if (tool === 'currentSetSquare60') {
                    if (action === 'plus') {
                        this.addToolOfType('setSquare60');
                    } else if (action === 'minus') {
                        this.removeLastToolOfType('setSquare', 60);
                    }
                    this.updateCurrentCountDisplay();
                    return;
                }
                
                if (tool === 'currentSetSquare45') {
                    if (action === 'plus') {
                        this.addToolOfType('setSquare45');
                    } else if (action === 'minus') {
                        this.removeLastToolOfType('setSquare', 45);
                    }
                    this.updateCurrentCountDisplay();
                    return;
                }
                
                // Handle new tool count adjustments for specific variants
                let input, countProp;
                switch (tool) {
                    case 'ruler1':
                        input = document.getElementById('ruler1-count-input');
                        countProp = 'ruler1Count';
                        break;
                    case 'ruler2':
                        input = document.getElementById('ruler2-count-input');
                        countProp = 'ruler2Count';
                        break;
                    case 'setSquare60':
                        input = document.getElementById('set-square-60-count-input');
                        countProp = 'setSquare60Count';
                        break;
                    case 'setSquare45':
                        input = document.getElementById('set-square-45-count-input');
                        countProp = 'setSquare45Count';
                        break;
                    default:
                        return;
                }
                
                if (!input) return;

                let value = parseInt(input.value, 10) || 0;
                if (action === 'plus' && value < 10) {
                    value++;
                } else if (action === 'minus' && value > 0) {
                    value--;
                }
                input.value = value;
                this[countProp] = value;
            });
        });
        
        // Input change for new tools
        const inputConfigs = [
            { id: 'ruler1-count-input', prop: 'ruler1Count' },
            { id: 'ruler2-count-input', prop: 'ruler2Count' },
            { id: 'set-square-60-count-input', prop: 'setSquare60Count' },
            { id: 'set-square-45-count-input', prop: 'setSquare45Count' }
        ];
        
        inputConfigs.forEach(config => {
            const el = document.getElementById(config.id);
            if (el) {
                el.addEventListener('change', (e) => {
                    let value = parseInt(e.target.value, 10) || 0;
                    value = Math.max(0, Math.min(10, value));
                    e.target.value = value;
                    this[config.prop] = value;
                });
            }
        });
        
        // Confirm button
        document.getElementById('teaching-tools-confirm-btn').addEventListener('click', () => {
            this.insertTools();
            this.hideModal();
        });
    }
    
    setupEventListeners() {
        // Store bound handlers for cleanup
        this._boundHandlers = {
            mouseMove: (e) => this.handleMouseMove(e),
            mouseUp: (e) => this.handleMouseUp(e),
            pointerMove: (e) => this.handleMouseMove(e),
            pointerUp: (e) => this.handleMouseUp(e),
            touchMove: (e) => this.handleTouchMove(e),
            touchEnd: (e) => this.handleTouchEnd(e),
            click: (e) => {
                const target = e.target;
                const closest = typeof target?.closest === 'function'
                    ? target.closest.bind(target)
                    : () => null;
                if (!closest('#teaching-tools-modal') &&
                    !closest('.teaching-tool-overlay')) {
                    this.deselectTool();
                }
            }
        };
        
        // Mouse events for dragging/resizing tools
        document.addEventListener('mousemove', this._boundHandlers.mouseMove);
        document.addEventListener('mouseup', this._boundHandlers.mouseUp);
        document.addEventListener('pointermove', this._boundHandlers.pointerMove);
        document.addEventListener('pointerup', this._boundHandlers.pointerUp);
        document.addEventListener('pointercancel', this._boundHandlers.pointerUp);
        
        // Touch events for pinch zoom on tools
        document.addEventListener('touchmove', this._boundHandlers.touchMove, { passive: false });
        document.addEventListener('touchend', this._boundHandlers.touchEnd);
        document.addEventListener('touchcancel', this._boundHandlers.touchEnd);
        
        // Click outside to deselect
        document.addEventListener('click', this._boundHandlers.click);
    }
    
    handleMouseMove(e) {
        // Dragging can work with _draggedTool (any tool being dragged)
        if (this.isDragging && this._draggedTool) {
            const canvasCoords = this.screenToCanvasCoords(e.clientX, e.clientY);
            this._draggedTool.x = canvasCoords.x - this.dragOffset.x;
            this._draggedTool.y = canvasCoords.y - this.dragOffset.y;
            this.updateToolOverlay(this._draggedTool);
            return;
        }
        
        // Rotating and resizing only work with selectedTool (double-clicked)
        if (!this.selectedTool) return;
        
        if (this.isRotating) {
            const rect = this.canvas.getBoundingClientRect();
            const centerX = this.selectedTool.x + this.selectedTool.width / 2;
            const centerY = this.selectedTool.y + this.selectedTool.height / 2;
            const angle = Math.atan2(e.clientY - rect.top - centerY, e.clientX - rect.left - centerX);
            this.selectedTool.rotation += (angle - this.rotateStart) * (180 / Math.PI);
            this.rotateStart = angle;
            this.updateToolOverlay(this.selectedTool);
        } else if (this.isResizing && this.activeResizeHandle) {
            this.handleResize(e);
        }
    }
    
    handleResize(e) {
        const tool = this.selectedTool;
        const handle = this.activeResizeHandle;
        
        // Convert mouse position to canvas coordinates (accounting for scale)
        const canvasCoords = this.screenToCanvasCoords(e.clientX, e.clientY);
        const mouseX = canvasCoords.x;
        const mouseY = canvasCoords.y;
        
        // Get the center of the tool for rotation calculations
        const centerX = this.resizeStart.x + this.resizeStart.width / 2;
        const centerY = this.resizeStart.y + this.resizeStart.height / 2;
        
        // Transform mouse position to local coordinate space (accounting for rotation)
        const localMouse = this.rotatePoint(mouseX, mouseY, centerX, centerY, -tool.rotation);
        
        let newX = tool.x;
        let newY = tool.y;
        let newWidth = tool.width;
        let newHeight = tool.height;
        
        // Prevent division by zero
        if (this.resizeStart.height === 0) return;
        const aspectRatio = this.resizeStart.width / this.resizeStart.height;
        
        switch (handle) {
            case 'nw':
                newWidth = this.resizeStart.x + this.resizeStart.width - localMouse.x;
                newHeight = newWidth / aspectRatio;
                newX = this.resizeStart.x + this.resizeStart.width - newWidth;
                newY = this.resizeStart.y + this.resizeStart.height - newHeight;
                break;
            case 'ne':
                newWidth = localMouse.x - this.resizeStart.x;
                newHeight = newWidth / aspectRatio;
                newY = this.resizeStart.y + this.resizeStart.height - newHeight;
                break;
            case 'sw':
                newWidth = this.resizeStart.x + this.resizeStart.width - localMouse.x;
                newHeight = newWidth / aspectRatio;
                newX = this.resizeStart.x + this.resizeStart.width - newWidth;
                break;
            case 'se':
                newWidth = localMouse.x - this.resizeStart.x;
                newHeight = newWidth / aspectRatio;
                break;
            case 'n':
                newHeight = this.resizeStart.y + this.resizeStart.height - localMouse.y;
                newY = this.resizeStart.y + this.resizeStart.height - newHeight;
                break;
            case 's':
                newHeight = localMouse.y - this.resizeStart.y;
                break;
            case 'w':
                newWidth = this.resizeStart.x + this.resizeStart.width - localMouse.x;
                newX = this.resizeStart.x + this.resizeStart.width - newWidth;
                break;
            case 'e':
                newWidth = localMouse.x - this.resizeStart.x;
                break;
        }
        
        // Apply minimum size constraints
        const minSize = 30;
        if (newWidth >= minSize) {
            tool.width = newWidth;
            tool.x = newX;
        }
        if (newHeight >= minSize) {
            tool.height = newHeight;
            tool.y = newY;
        }
        
        this.updateToolOverlay(tool);
    }
    
    handleMouseUp(e) {
        if (this.isDragging || this.isRotating || this.isResizing) {
            this.isDragging = false;
            this.isRotating = false;
            this.isResizing = false;
            this.activeResizeHandle = null;
            this.isInteracting = false;
            this._draggedTool = null;
        }
    }
    
    handleTouchMove(e) {
        if (!this.selectedTool) return;
        
        // Handle pinch zoom for teaching tools
        if (e.touches.length === 2 && this.toolPinchState.active) {
            e.preventDefault();
            e.stopPropagation();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate current distance and angle
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Prevent division by zero
            if (this.toolPinchState.initialDistance < 1) return;
            
            // Calculate scale factor
            const scale = distance / this.toolPinchState.initialDistance;
            
            // Apply scale to tool dimensions
            this.selectedTool.width = this.toolPinchState.initialWidth * scale;
            this.selectedTool.height = this.toolPinchState.initialHeight * scale;
            
            // Apply rotation
            const angleDiff = (angle - this.toolPinchState.initialAngle) * (180 / Math.PI);
            this.selectedTool.rotation = this.toolPinchState.initialRotation + angleDiff;
            
            this.updateToolOverlay(this.selectedTool);
        }
    }
    
    handleTouchEnd(e) {
        if (this.toolPinchState.active) {
            this.toolPinchState.active = false;
            this.isInteracting = false;
        }
        if (this.isDragging) {
            this.isDragging = false;
            this.isInteracting = false;
            this._draggedTool = null;
        }
    }
    
    showModal() {
        // Reset new tool counts to 0
        this.ruler1Count = 0;
        this.ruler2Count = 0;
        this.setSquare60Count = 0;
        this.setSquare45Count = 0;
        
        const ruler1Input = document.getElementById('ruler1-count-input');
        const ruler2Input = document.getElementById('ruler2-count-input');
        const setSquare60Input = document.getElementById('set-square-60-count-input');
        const setSquare45Input = document.getElementById('set-square-45-count-input');
        
        if (ruler1Input) ruler1Input.value = 0;
        if (ruler2Input) ruler2Input.value = 0;
        if (setSquare60Input) setSquare60Input.value = 0;
        if (setSquare45Input) setSquare45Input.value = 0;
        
        // Update current count display
        this.updateCurrentCountDisplay();
        
        // Update i18n if available
        if (window.i18n && window.i18n.applyTranslations) {
            window.i18n.applyTranslations();
        }
        this.updateCounterButtonLabels();
        
        document.getElementById('teaching-tools-modal').classList.add('show');
    }
    
    hideModal() {
        document.getElementById('teaching-tools-modal').classList.remove('show');
    }
    
    insertTools() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleFactor = this.canvasScaleFactor;
        // Get canvas dimensions in unscaled coordinates
        const canvasWidth = (canvasRect.right - canvasRect.left) / scaleFactor;
        const canvasHeight = (canvasRect.bottom - canvasRect.top) / scaleFactor;
        // Get center in canvas coordinates
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Calculate tool sizes based on original image aspect ratios and ~20% canvas area
        const ruler1Size = this.calculateToolSize(this.rulerImage1, canvasWidth, canvasHeight);
        const ruler2Size = this.calculateToolSize(this.rulerImage2, canvasWidth, canvasHeight);
        const setSquare60Size = this.calculateToolSize(this.setSquareImage1, canvasWidth, canvasHeight);
        const setSquare45Size = this.calculateToolSize(this.setSquareImage2, canvasWidth, canvasHeight);
        
        // Insert ruler style 1
        for (let i = 0; i < this.ruler1Count; i++) {
            const offsetX = (i - this.ruler1Count / 2) * 50;
            const offsetY = (i - this.ruler1Count / 2) * 30;
            this.addTool({
                type: 'ruler',
                variant: 1,
                x: centerX - ruler1Size.width / 2 + offsetX,
                y: centerY - ruler1Size.height - 20 + offsetY,
                width: ruler1Size.width,
                height: ruler1Size.height,
                rotation: 0,
                image: this.rulerImage1
            });
        }
        
        // Insert ruler style 2
        for (let i = 0; i < this.ruler2Count; i++) {
            const offsetX = (i - this.ruler2Count / 2) * 50;
            const offsetY = (i - this.ruler2Count / 2) * 30;
            this.addTool({
                type: 'ruler',
                variant: 2,
                x: centerX - ruler2Size.width / 2 + offsetX,
                y: centerY + 20 + offsetY,
                width: ruler2Size.width,
                height: ruler2Size.height,
                rotation: 0,
                image: this.rulerImage2
            });
        }
        
        // Insert 60° set squares
        for (let i = 0; i < this.setSquare60Count; i++) {
            const offsetX = (i - this.setSquare60Count / 2) * 50;
            const offsetY = (i - this.setSquare60Count / 2) * 30;
            this.addTool({
                type: 'setSquare',
                variant: 60,
                x: centerX - setSquare60Size.width / 2 + offsetX,
                y: centerY + ruler2Size.height + 40 + offsetY,
                width: setSquare60Size.width,
                height: setSquare60Size.height,
                rotation: 0,
                image: this.setSquareImage1
            });
        }
        
        // Insert 45° set squares
        for (let i = 0; i < this.setSquare45Count; i++) {
            const offsetX = (i - this.setSquare45Count / 2) * 50;
            const offsetY = (i - this.setSquare45Count / 2) * 30;
            this.addTool({
                type: 'setSquare',
                variant: 45,
                x: centerX - setSquare45Size.width / 2 + offsetX,
                y: centerY + ruler2Size.height + setSquare60Size.height + 60 + offsetY,
                width: setSquare45Size.width,
                height: setSquare45Size.height,
                rotation: 0,
                image: this.setSquareImage2
            });
        }
        
        this.redrawTools();
        
        // Trigger callback when tools are inserted
        if (this.onToolsInserted && typeof this.onToolsInserted === 'function') {
            this.onToolsInserted();
        }
    }
    
    addTool(tool) {
        tool.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.tools.push(tool);
        this.createToolOverlay(tool);
    }
    
    createToolOverlay(tool) {
        const overlay = document.createElement('div');
        overlay.className = 'teaching-tool-overlay';
        overlay.dataset.toolId = tool.id;
        
        // Add type-specific class for styling (e.g., triangle clip for set square)
        if (tool.type === 'setSquare') {
            overlay.classList.add('set-square-tool');
            // Add variant-specific class for 45° vs 60° set squares
            if (tool.variant === 45) {
                overlay.classList.add('set-square-45');
            } else {
                overlay.classList.add('set-square-60');
            }
        } else if (tool.type === 'ruler') {
            overlay.classList.add('ruler-tool');
        }
        
        // Store variant info for edge drawing logic
        overlay.dataset.variant = tool.variant || '';
        
        // Create inner image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'teaching-tool-image-container';
        
        // Create the image element
        const img = document.createElement('img');
        img.src = tool.image.src;
        img.className = 'teaching-tool-img';
        img.draggable = false;
        imageContainer.appendChild(img);
        overlay.appendChild(imageContainer);
        
        // Create Word-style resize handles (8 handles)
        const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handles.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `teaching-tool-resize-handle handle-${pos}`;
            handle.dataset.handle = pos;
            overlay.appendChild(handle);
        });
        
        // Create rotate handle
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'teaching-tool-rotate-handle';
        rotateHandle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
            </svg>
        `;
        overlay.appendChild(rotateHandle);
        
        // Create delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'teaching-tool-delete-btn';
        deleteBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        overlay.appendChild(deleteBtn);
        
        this.updateToolOverlay(tool, overlay);
        this.setupToolOverlayEvents(tool, overlay);
        
        document.body.appendChild(overlay);
        tool.overlay = overlay;
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    updateToolOverlayControlsLayout(tool, overlay) {
        if (!overlay) return;
        const safeWidth = Math.max(overlay.offsetWidth || 1, 1);
        const safeHeight = Math.max(overlay.offsetHeight || 1, 1);
        const minSide = Math.max(Math.min(safeWidth, safeHeight), 1);

        const handleSize = this.clamp(minSide * 0.14, 10, 18);
        const rotateSize = this.clamp(minSide * 0.22, 24, 36);
        const deleteSize = this.clamp(minSide * 0.22, 24, 36);
        const iconSize = this.clamp(rotateSize * 0.55, 14, 18);
        const inset = this.clamp(minSide * 0.08, 4, 10);
        const outsideTop = safeHeight >= rotateSize * 2.4 ? -(rotateSize + 10) : inset;
        const centerX = safeWidth / 2;
        const deleteRight = safeWidth >= deleteSize * 2.2 ? -Math.round(deleteSize * 0.25) : inset;

        overlay.style.setProperty('--tt-handle-size', `${handleSize}px`);
        overlay.style.setProperty('--tt-handle-offset', `${-(handleSize / 2)}px`);
        overlay.style.setProperty('--tt-rotate-size', `${rotateSize}px`);
        overlay.style.setProperty('--tt-delete-size', `${deleteSize}px`);
        overlay.style.setProperty('--tt-control-top', `${outsideTop}px`);
        overlay.style.setProperty('--tt-control-icon-size', `${iconSize}px`);
        overlay.style.setProperty('--tt-delete-right', `${deleteRight}px`);

        const rotateHandle = overlay.querySelector('.teaching-tool-rotate-handle');
        const deleteBtn = overlay.querySelector('.teaching-tool-delete-btn');
        if (rotateHandle) {
            rotateHandle.style.left = `${centerX}px`;
        }
        if (deleteBtn && safeWidth < deleteSize * 2.2) {
            deleteBtn.style.top = `${inset}px`;
        } else if (deleteBtn) {
            deleteBtn.style.top = '';
        }
    }
    
    setupToolOverlayEvents(tool, overlay) {
        const getEventTargetClosest = (target) => typeof target?.closest === 'function'
            ? target.closest.bind(target)
            : () => null;

        // Prevent default touch behavior
        overlay.addEventListener('touchstart', (e) => {
            // For set squares, check if touch is in the free-drawing area (bottom-right)
            if (tool.type === 'setSquare' && e.touches.length === 1) {
                const touch = e.touches[0];
                if (this.isPointInSetSquareFreeArea(touch.clientX, touch.clientY, tool)) {
                    // Allow the event to pass through for free drawing
                    return;
                }
            }
            
            // Two-finger gesture for pinch zoom - only if tool is already selected
            if (e.touches.length === 2 && this.selectedTool === tool) {
                e.preventDefault();
                e.stopPropagation();
                
                this.isInteracting = true;
                
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const initialDistance = Math.sqrt(dx * dx + dy * dy);
                
                // Ensure minimum distance to prevent division by zero
                this.toolPinchState = {
                    active: true,
                    initialDistance: Math.max(initialDistance, 1),
                    initialWidth: tool.width,
                    initialHeight: tool.height,
                    initialRotation: tool.rotation,
                    initialAngle: Math.atan2(dy, dx)
                };
            } else if (e.touches.length === 1) {
                // Single finger - only drag, don't select for editing
                const closest = getEventTargetClosest(e.target);
                if (!closest('.teaching-tool-resize-handle') &&
                    !closest('.teaching-tool-rotate-handle') &&
                    !closest('.teaching-tool-delete-btn')) {
                    
                    this.isDragging = true;
                    this.isInteracting = true;
                    this._draggedTool = tool;
                    
                    const touch = e.touches[0];
                    const canvasCoords = this.screenToCanvasCoords(touch.clientX, touch.clientY);
                    this.dragOffset.x = canvasCoords.x - tool.x;
                    this.dragOffset.y = canvasCoords.y - tool.y;
                }
            }
        }, { passive: false });
        
        overlay.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1 && this._draggedTool === tool) {
                e.preventDefault();
                const touch = e.touches[0];
                const canvasCoords = this.screenToCanvasCoords(touch.clientX, touch.clientY);
                tool.x = canvasCoords.x - this.dragOffset.x;
                tool.y = canvasCoords.y - this.dragOffset.y;
                this.updateToolOverlay(tool);
            }
        }, { passive: false });
        
        // Mouse drag - single click only moves, doesn't select for editing
        const startOverlayDrag = (e) => {
            // For set squares, check if click is in the free-drawing area (bottom-right)
            if (tool.type === 'setSquare' && this.isPointInSetSquareFreeArea(e.clientX, e.clientY, tool)) {
                // Allow the event to pass through for free drawing
                return;
            }
            
            // If clicking on control handles, only allow if tool is selected
            const closest = getEventTargetClosest(e.target);
            if (closest('.teaching-tool-resize-handle') ||
                closest('.teaching-tool-rotate-handle') ||
                closest('.teaching-tool-delete-btn')) {
                // Only allow if this tool is already selected
                if (this.selectedTool !== tool) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // Single click just drags, doesn't select
            this.isDragging = true;
            this.isInteracting = true;
            this._draggedTool = tool;
            
            const canvasCoords = this.screenToCanvasCoords(e.clientX, e.clientY);
            this.dragOffset.x = canvasCoords.x - tool.x;
            this.dragOffset.y = canvasCoords.y - tool.y;
        };
        overlay.addEventListener('mousedown', startOverlayDrag);
        overlay.addEventListener('pointerdown', startOverlayDrag);
        
        // Double-click to select and show controls
        overlay.addEventListener('dblclick', (e) => {
            // For set squares, check if double-click is in the free-drawing area (bottom-right)
            if (tool.type === 'setSquare' && this.isPointInSetSquareFreeArea(e.clientX, e.clientY, tool)) {
                // Allow the event to pass through, don't select the tool
                return;
            }
            
            e.stopPropagation();
            this.selectTool(tool);
        });
        
        // Resize handles - only work if tool is already selected
        overlay.querySelectorAll('.teaching-tool-resize-handle').forEach(handle => {
            const startResize = (e) => {
                if (this.selectedTool !== tool) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                this.isResizing = true;
                this.isInteracting = true;
                this.activeResizeHandle = handle.dataset.handle;
                this.resizeStart = {
                    width: tool.width,
                    height: tool.height,
                    x: tool.x,
                    y: tool.y,
                    mouseX: e.clientX,
                    mouseY: e.clientY
                };
            };
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('pointerdown', startResize);
        });
        
        // Rotate handle - only works if tool is already selected
        const rotateHandle = overlay.querySelector('.teaching-tool-rotate-handle');
        const startRotate = (e) => {
            if (this.selectedTool !== tool) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            this.isRotating = true;
            this.isInteracting = true;
            
            const rect = this.canvas.getBoundingClientRect();
            const centerX = tool.x + tool.width / 2;
            const centerY = tool.y + tool.height / 2;
            this.rotateStart = Math.atan2(e.clientY - rect.top - centerY, e.clientX - rect.left - centerX);
        };
        rotateHandle.addEventListener('mousedown', startRotate);
        rotateHandle.addEventListener('pointerdown', startRotate);
        
        // Delete button - only works if tool is already selected
        overlay.querySelector('.teaching-tool-delete-btn').addEventListener('click', (e) => {
            if (this.selectedTool !== tool) return;
            
            e.preventDefault();
            e.stopPropagation();
            this.removeTool(tool);
        });
    }
    
    updateToolOverlay(tool, overlay = null) {
        overlay = overlay || tool.overlay;
        if (!overlay) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleFactor = this.canvasScaleFactor;
        
        // Convert tool position from canvas space to screen space
        // Tool x,y are in unscaled canvas coordinates
        // We need to convert to screen coordinates
        const screenX = canvasRect.left + tool.x * scaleFactor;
        const screenY = canvasRect.top + tool.y * scaleFactor;
        
        overlay.style.position = 'fixed';
        overlay.style.left = screenX + 'px';
        overlay.style.top = screenY + 'px';
        overlay.style.width = (tool.width * scaleFactor) + 'px';
        overlay.style.height = (tool.height * scaleFactor) + 'px';
        overlay.style.transform = `rotate(${tool.rotation}deg)`;
        overlay.style.transformOrigin = 'center center';
        overlay.style.zIndex = '100';
        this.updateToolOverlayControlsLayout(tool, overlay);
        
        // Show/hide controls based on selection
        const isSelected = this.selectedTool === tool;
        overlay.classList.toggle('selected', isSelected);
    }
    
    removeTool(tool) {
        const index = this.tools.indexOf(tool);
        if (index > -1) {
            this.tools.splice(index, 1);
            if (tool.overlay) {
                tool.overlay.remove();
            }
        }
        if (this.selectedTool === tool) {
            this.selectedTool = null;
        }
        this.redrawTools();
    }
    
    selectTool(tool) {
        // Deselect previous tool
        if (this.selectedTool && this.selectedTool !== tool) {
            this.selectedTool.overlay?.classList.remove('selected');
        }
        this.selectedTool = tool;
        if (tool.overlay) {
            tool.overlay.classList.add('selected');
        }
    }
    
    deselectTool() {
        if (this.selectedTool) {
            this.selectedTool.overlay?.classList.remove('selected');
            this.selectedTool = null;
        }
    }
    
    /**
     * Convert screen coordinates to canvas coordinates, accounting for canvas scale transform
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate
     * @returns {Object} - {x, y} in canvas coordinate space
     */
    screenToCanvasCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleFactor = this.canvasScaleFactor;
        
        // The canvas is centered using translate(-50%, -50%) and then scaled
        // rect gives us the transformed bounds, so we need to:
        // 1. Get position relative to the rect (which is the visible canvas)
        // 2. Convert from screen space to canvas space by dividing by scale
        
        // Get the unscaled canvas dimensions
        const unscaledWidth = this.canvas.offsetWidth;
        const unscaledHeight = this.canvas.offsetHeight;
        
        // Position relative to the canvas rect
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        
        // Convert to canvas coordinates by dividing by scale
        const x = relX / scaleFactor;
        const y = relY / scaleFactor;
        
        return { x, y };
    }
    
    // Helper function to rotate a point around a center
    rotatePoint(px, py, cx, cy, angle) {
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const nx = (cos * (px - cx)) + (sin * (py - cy)) + cx;
        const ny = (cos * (py - cy)) - (sin * (px - cx)) + cy;
        return { x: nx, y: ny };
    }
    
    // Helper function to transform point to tool's local coordinate space (accounting for rotation)
    transformToToolSpace(x, y, tool) {
        const centerX = tool.x + tool.width / 2;
        const centerY = tool.y + tool.height / 2;
        // Rotate point in opposite direction to get local coordinates
        return this.rotatePoint(x, y, centerX, centerY, -tool.rotation);
    }
    
    /**
     * Check if a screen point is in the bottom-right area of a set square
     * The bottom-right area is below the diagonal from top-right to bottom-left
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate  
     * @param {Object} tool - The teaching tool
     * @returns {boolean} - true if point is in the free-drawing area
     */
    isPointInSetSquareFreeArea(clientX, clientY, tool) {
        if (tool.type !== 'setSquare') {
            return false;
        }
        
        // Get position relative to the overlay element
        const overlay = tool.overlay;
        if (!overlay) return false;
        
        const rect = overlay.getBoundingClientRect();
        
        // Get position relative to overlay (0,0 is top-left)
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        
        // Normalize to 0-1 range
        const normalizedX = relX / rect.width;
        const normalizedY = relY / rect.height;
        
        // Check if point is below the diagonal line from top-right (1,0) to bottom-left (0,1)
        // The line equation: normalizedX + normalizedY = 1
        // Points below/right of this line satisfy: normalizedX + normalizedY > 1
        return (normalizedX + normalizedY) > 1;
    }
    
    getToolAtPosition(x, y) {
        // Check tools in reverse order (top-most first)
        for (let i = this.tools.length - 1; i >= 0; i--) {
            const tool = this.tools[i];
            // Transform point to tool's local coordinate space
            const localPoint = this.transformToToolSpace(x, y, tool);
            // Now check against unrotated bounding box
            if (localPoint.x >= tool.x && localPoint.x <= tool.x + tool.width &&
                localPoint.y >= tool.y && localPoint.y <= tool.y + tool.height) {
                return tool;
            }
        }
        return null;
    }
    
    redrawTools() {
        // Update all tool overlays
        this.tools.forEach(tool => {
            this.updateToolOverlay(tool);
        });
    }
    
    // Check if a point is near the edge of a tool (for drawing along edges)
    isNearToolEdge(x, y, tolerance = 10) {
        for (const tool of this.tools) {
            // Transform point to tool's local coordinate space
            const localPoint = this.transformToToolSpace(x, y, tool);
            // Check if near edges in local space
            if (this.isNearRectEdge(localPoint.x, localPoint.y, tool, tolerance)) {
                return { tool, edge: this.getNearestEdge(localPoint.x, localPoint.y, tool) };
            }
        }
        return null;
    }
    
    isNearRectEdge(x, y, tool, tolerance) {
        const { x: tx, y: ty, width, height } = tool;
        
        // Check each edge (in local coordinate space)
        const nearTop = Math.abs(y - ty) < tolerance && x >= tx && x <= tx + width;
        const nearBottom = Math.abs(y - (ty + height)) < tolerance && x >= tx && x <= tx + width;
        const nearLeft = Math.abs(x - tx) < tolerance && y >= ty && y <= ty + height;
        const nearRight = Math.abs(x - (tx + width)) < tolerance && y >= ty && y <= ty + height;
        
        return nearTop || nearBottom || nearLeft || nearRight;
    }
    
    getNearestEdge(x, y, tool) {
        const { x: tx, y: ty, width, height } = tool;
        const distances = [
            { edge: 'top', dist: Math.abs(y - ty) },
            { edge: 'bottom', dist: Math.abs(y - (ty + height)) },
            { edge: 'left', dist: Math.abs(x - tx) },
            { edge: 'right', dist: Math.abs(x - (tx + width)) }
        ];
        distances.sort((a, b) => a.dist - b.dist);
        return distances[0].edge;
    }
    
    // Snap point to tool edge
    snapToEdge(x, y, tool, edge) {
        switch (edge) {
            case 'top':
                return { x, y: tool.y };
            case 'bottom':
                return { x, y: tool.y + tool.height };
            case 'left':
                return { x: tool.x, y };
            case 'right':
                return { x: tool.x + tool.width, y };
            default:
                return { x, y };
        }
    }
    
    // Clean up when destroyed
    destroy() {
        // Remove event listeners
        if (this._boundHandlers) {
            document.removeEventListener('mousemove', this._boundHandlers.mouseMove);
            document.removeEventListener('mouseup', this._boundHandlers.mouseUp);
            document.removeEventListener('pointermove', this._boundHandlers.pointerMove);
            document.removeEventListener('pointerup', this._boundHandlers.pointerUp);
            document.removeEventListener('pointercancel', this._boundHandlers.pointerUp);
            document.removeEventListener('touchmove', this._boundHandlers.touchMove);
            document.removeEventListener('touchend', this._boundHandlers.touchEnd);
            document.removeEventListener('touchcancel', this._boundHandlers.touchEnd);
            document.removeEventListener('click', this._boundHandlers.click);
        }
        if (this.localeChangeHandler) {
            window.removeEventListener('localeChanged', this.localeChangeHandler);
            this.localeChangeHandler = null;
        }
        
        // Remove all tool overlays
        this.tools.forEach(tool => {
            if (tool.overlay) {
                tool.overlay.remove();
            }
        });
        this.tools = [];
        
        // Remove modal
        const modal = document.getElementById('teaching-tools-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.TeachingToolsManager = TeachingToolsManager;
    window.AboardTeachingToolsManager = TeachingToolsManager;
}
