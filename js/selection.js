// Selection Module
// Handles selection of drawn strokes, images, and text

class SelectionManager {
    constructor(canvas, ctx, drawingEngine, strokeControls) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawingEngine = drawingEngine;
        this.strokeControls = strokeControls;
        this.textManager = null; // Set later via setTextManager
        this.historyManager = null; // Set later via setHistoryManager
        
        this.isActive = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedStrokes = [];
        
        // Current selection type and index
        this.selectionType = null; // 'stroke', 'text', 'image', or 'multi'
        this.selectedIndex = null;
        
        // Dragging state
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartObjectPos = { x: 0, y: 0 };
        
        // Rotating state
        this.isRotating = false;
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        
        // Resizing state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartBounds = null;
        
        // Track if changes were made that need to be saved
        this.hasUnsavedChanges = false;
        
        // Constants
        this.COPY_OFFSET = 20;
        this.HANDLE_SIZE = 8;
        this.ROTATION_HANDLE_DISTANCE = 30;
        this.HANDLE_THRESHOLD = 10;
        this.MIN_SIZE = 10;
        this.TEXT_LINE_HEIGHT = 1.2; // Aligns with insert-text line height calculation.
        this.TEXT_BOUNDS_PADDING = 4;
        
        // For lasso/rectangle selection
        this.selectionMode = 'click'; // 'click', 'rectangle', or 'lasso'
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        
        // Lasso selection state
        this.isLassoSelecting = false;
        this.lassoPoints = []; // Array of {x, y} screen coords
        
        // Multi-select state
        this.multiDragStartPositions = [];
        this.selectedImages = []; // Array of image indices for multi-select
        this.selectedTexts = []; // Array of text indices for multi-select
        this.multiImageDragStartPositions = []; // Starting positions for images in multi-drag
        this.multiTextDragStartPositions = []; // Starting positions for texts in multi-drag
        this.multiBounds = null;
        this.multiRotation = 0; // Accumulated rotation for multi-select
        this.multiStrokeRotateStart = [];
        this.multiImageRotateStart = [];
        this.multiTextRotateStart = [];
        this.clipboard = null;
        this.layerMenuVisible = false;
        this.layerMenuOutsideListener = null;
        this.layerMenuOutsideListenerAttached = false;
        
        // Create selection controls overlay
        this.createSelectionControls();
    }
    
    setTextManager(textManager) {
        this.textManager = textManager;
    }
    
    setHistoryManager(historyManager) {
        this.historyManager = historyManager;
    }
    
    createSelectionControls() {
        // Create selection controls overlay similar to stroke-controls
        const controlsHTML = `
            <div id="selection-controls-overlay" class="image-controls-overlay" style="display: none; z-index: 1500;">
                <div id="selection-controls-box" class="image-controls-box">
                    <!-- Corner resize handles -->
                    <div class="resize-handle top-left" data-handle="top-left"></div>
                    <div class="resize-handle top-right" data-handle="top-right"></div>
                    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
                    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>
                    
                    <!-- Edge resize handles -->
                    <div class="resize-handle top" data-handle="top"></div>
                    <div class="resize-handle right" data-handle="right"></div>
                    <div class="resize-handle bottom" data-handle="bottom"></div>
                    <div class="resize-handle left" data-handle="left"></div>
                    
                    <!-- Rotation handle -->
                    <div class="rotate-handle" id="selection-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Rotate 90° button -->
                    <div class="selection-transform-handle" id="selection-rotate90-handle" data-i18n-title="selection.rotate90" title="Rotate 90°">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M21 8a9 9 0 1 0-2.67 6.33"/>
                        </svg>
                    </div>
                    
                    <!-- Flip horizontal button -->
                    <div class="selection-transform-handle" id="selection-flip-h-handle" data-i18n-title="selection.flipH" title="Flip Horizontal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M12 3v18M8 6l-5 6 5 6M16 6l5 6-5 6"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with action buttons -->
                    <div class="image-controls-toolbar selection-action-toolbar">
                        <button id="selection-edit-btn" class="image-control-btn" data-i18n-title="selection.edit" title="Edit" style="display:none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button id="selection-copy-btn" class="image-control-btn" data-i18n-title="selection.copy" title="Copy">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <div class="selection-layer-menu-wrapper">
                            <button id="selection-layer-btn" class="image-control-btn" data-i18n-title="selection.layer" title="Layer">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                </svg>
                            </button>
                            <div id="selection-layer-menu" class="selection-layer-menu">
                                <button class="selection-layer-item" data-layer-action="bring-to-front" data-i18n="selection.layerFront">Bring to Front</button>
                                <button class="selection-layer-item" data-layer-action="send-to-back" data-i18n="selection.layerBack">Send to Back</button>
                                <button class="selection-layer-item" data-layer-action="move-forward" data-i18n="selection.layerUp">Move Forward</button>
                                <button class="selection-layer-item" data-layer-action="move-backward" data-i18n="selection.layerDown">Move Backward</button>
                            </div>
                        </div>
                        <button id="selection-delete-btn" class="image-control-btn image-cancel-btn" data-i18n-title="selection.delete" title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                        <button id="selection-done-btn" class="image-control-btn image-done-btn" data-i18n-title="selection.done" title="Done">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('selection-controls-overlay');
        this.controlBox = document.getElementById('selection-controls-box');
        this.layerMenu = document.getElementById('selection-layer-menu');
        this.layerButton = document.getElementById('selection-layer-btn');
        
        // Box selection rectangle overlay
        this.boxSelectDiv = document.createElement('div');
        this.boxSelectDiv.id = 'box-select-rect';
        this.boxSelectDiv.style.cssText = 'display:none; position:fixed; border:2px dashed #888; background:rgba(128,128,128,0.1); pointer-events:none; z-index:1400;';
        document.body.appendChild(this.boxSelectDiv);
        
        // Lasso selection SVG overlay
        this.lassoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.lassoSvg.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1400;';
        this.lassoPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        this.lassoPath.setAttribute('fill', 'rgba(128,128,128,0.1)');
        this.lassoPath.setAttribute('stroke', '#888');
        this.lassoPath.setAttribute('stroke-width', '2');
        this.lassoPath.setAttribute('stroke-dasharray', '6 4');
        this.lassoSvg.appendChild(this.lassoPath);
        document.body.appendChild(this.lassoSvg);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Drag selection box
        this.controlBox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.selection-transform-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.selection-transform-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.selection-transform-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        }, { passive: false });
        
        // Resize handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            });
            handle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            });
            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            }, { passive: false });
        });
        
        // Rotation handle
        const rotateHandle = document.getElementById('selection-rotate-handle');
        if (rotateHandle) {
            rotateHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            rotateHandle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            rotateHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            }, { passive: false });
        }
        
        // Global mouse/touch events
        const handleMove = (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            } else if (this.isRotating) {
                this.rotate(e);
            }
        };
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('pointermove', handleMove);
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging || this.isResizing || this.isRotating) {
                e.preventDefault();
                if (this.isDragging) {
                    this.drag(e);
                } else if (this.isResizing) {
                    this.resize(e);
                } else if (this.isRotating) {
                    this.rotate(e);
                }
            }
        }, { passive: false });
        
        document.addEventListener('mouseup', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('pointerup', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('touchend', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Also handle pointer cancel (e.g., when touch is interrupted)
        document.addEventListener('pointercancel', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('touchcancel', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Action buttons - need to handle both mousedown and click to prevent event propagation
        const copyBtn = document.getElementById('selection-copy-btn');
        const deleteBtn = document.getElementById('selection-delete-btn');
        const doneBtn = document.getElementById('selection-done-btn');
        const editBtn = document.getElementById('selection-edit-btn');
        const rotate90Handle = document.getElementById('selection-rotate90-handle');
        const flipHHandle = document.getElementById('selection-flip-h-handle');
        const layerBtn = document.getElementById('selection-layer-btn');
        const layerMenu = document.getElementById('selection-layer-menu');
        
        // Add mousedown/pointerdown handlers to prevent events from propagating to document
        [copyBtn, deleteBtn, doneBtn, editBtn, rotate90Handle, flipHHandle, layerBtn].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
        });
        
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.copySelection();
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteSelection();
        });
        
        doneBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.finishSelection();
        });
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.editSelectedText();
            });
        }
        
        if (rotate90Handle) {
            rotate90Handle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.rotate90();
            });
        }
        
        if (flipHHandle) {
            flipHHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.flipHorizontal();
            });
        }

        if (layerBtn && layerMenu) {
            layerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleLayerMenu();
            });

            layerMenu.querySelectorAll('[data-layer-action]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.applyLayerAction(item.dataset.layerAction);
                });
            });
        }

        if (!this.layerMenuOutsideListener) {
            this.layerMenuOutsideListener = (e) => {
                if (!this.layerMenuVisible || !this.layerMenu || !this.layerButton) return;
                if (this.layerMenu.contains(e.target) || this.layerButton.contains(e.target)) return;
                this.hideLayerMenu();
            };
        }
        if (!this.layerMenuOutsideListenerAttached) {
            document.addEventListener('mousedown', this.layerMenuOutsideListener);
            this.layerMenuOutsideListenerAttached = true;
        }
    }

    toggleLayerMenu() {
        if (!this.layerMenu) return;
        if (this.layerMenuVisible) {
            this.hideLayerMenu();
        } else {
            this.showLayerMenu();
        }
    }

    showLayerMenu() {
        if (!this.layerMenu) return;
        this.layerMenu.classList.add('show');
        this.layerMenuVisible = true;
    }

    hideLayerMenu() {
        if (!this.layerMenu) return;
        this.layerMenu.classList.remove('show');
        this.layerMenuVisible = false;
    }

    updateLayerMenuVisibility() {
        if (!this.layerButton) return;
        const shouldShowLayerButton = this.selectionType && this.selectionType !== 'multi';
        this.layerButton.style.display = shouldShowLayerButton ? '' : 'none';
        if (!shouldShowLayerButton) {
            this.hideLayerMenu();
        }
    }

    applyLayerAction(action) {
        if (!this.hasSelection() || this.selectionType === 'multi') return;

        let collection = null;
        let updateSelection = null;
        if (this.selectionType === 'stroke') {
            collection = this.drawingEngine.strokes;
            updateSelection = (index) => {
                this.selectedIndex = index;
                this.drawingEngine.selectStroke(index);
            };
        } else if (this.selectionType === 'image') {
            collection = this.drawingEngine.stampedImages;
            updateSelection = (index) => {
                this.selectedIndex = index;
                this.drawingEngine.selectImage(index);
            };
        } else if (this.selectionType === 'text' && this.textManager) {
            collection = this.textManager.textObjects;
            updateSelection = (index) => {
                this.selectedIndex = index;
                this.textManager.selectedTextIndex = index;
            };
        }

        if (!collection || this.selectedIndex === null) return;

        const maxIndex = collection.length - 1;
        let targetIndex = this.selectedIndex;
        switch (action) {
            case 'bring-to-front':
                targetIndex = maxIndex;
                break;
            case 'send-to-back':
                targetIndex = 0;
                break;
            case 'move-forward':
                targetIndex = Math.min(maxIndex, this.selectedIndex + 1);
                break;
            case 'move-backward':
                targetIndex = Math.max(0, this.selectedIndex - 1);
                break;
            default:
                return;
        }

        if (targetIndex === this.selectedIndex) {
            this.hideLayerMenu();
            return;
        }

        const [item] = collection.splice(this.selectedIndex, 1);
        collection.splice(targetIndex, 0, item);
        updateSelection(targetIndex);
        this.hideLayerMenu();
        this.redrawWithSelection();
        this.updateControlBox();
        this.saveHistory();
    }
    
    // Normalize angle to 0-360 degrees
    normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }
    
    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    getCanvasScale() {
        const computedStyle = window.getComputedStyle(this.canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        return matrix.a || 1;
    }
    
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const pos = this.getClientPos(e);
        const x = pos.x - rect.left;
        const y = pos.y - rect.top;
        
        // Adjust coordinates for canvas scale
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        let adjustedX = x * scaleX;
        let adjustedY = y * scaleY;
        
        return { x: adjustedX, y: adjustedY };
    }

    isEventOnCanvas(e) {
        const rect = this.canvas.getBoundingClientRect();
        const pos = this.getClientPos(e);
        const x = pos.x - rect.left;
        const y = pos.y - rect.top;
        return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    }

    activate() {
        this.isActive = true;
        this.canvas.style.cursor = 'crosshair';
    }
    
    deactivate() {
        this.isActive = false;
        this.clearSelection();
        this.canvas.style.cursor = 'default';
    }

    startSelection(e) {
        if (!this.isActive) return false;

        if (!this.hasSelectableContent()) {
            return false;
        }
        
        // Don't start new selection if clicking on the selection controls overlay
        if (e.target && e.target.closest && e.target.closest('#selection-controls-overlay')) {
            return false;
        }
        
        this.isSelecting = true;
        const coords = this.getCanvasCoordinates(e);
        
        // Rectangle selection mode
        if (this.selectionMode === 'rectangle') {
            this.startBoxSelection(e);
            return true;
        }
        
        // Lasso selection mode
        if (this.selectionMode === 'lasso') {
            this.startLassoSelection(e);
            return true;
        }
        
        // Click selection mode
        // First, check for text objects
        if (this.textManager && this.textManager.textObjects && this.textManager.textObjects.length > 0) {
            const textIndex = this.textManager.hitTestText(coords.x, coords.y);
            if (textIndex >= 0) {
                this.selectText(textIndex);
                return true;
            }
        }
        
        // Check for stamped images
        const imageIndex = this.drawingEngine.findImageAtPoint(coords.x, coords.y);
        if (imageIndex !== null) {
            this.selectImage(imageIndex);
            return true;
        }
        
        // Then check for strokes
        const strokeIndex = this.drawingEngine.findStrokeAtPoint(coords.x, coords.y);
        if (strokeIndex !== null) {
            this.selectStroke(strokeIndex);
            return true;
        }
        
        // If not on any object, deselect everything
        this.clearSelection();
        
        return false;
    }
    
    selectStroke(index) {
        this.selectionType = 'stroke';
        this.selectedIndex = index;
        this.drawingEngine.selectStroke(index);
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectText(index) {
        this.selectionType = 'text';
        this.selectedIndex = index;
        if (this.textManager) {
            this.textManager.selectedTextIndex = index;
        }
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectImage(index) {
        this.selectionType = 'image';
        this.selectedIndex = index;
        this.drawingEngine.selectImage(index);
        this.showControls();
        this.redrawWithSelection();
    }
    
    showControls() {
        this.overlay.style.display = 'block';
        this.controlBox.classList.toggle('text-selection-only', this.selectionType === 'text');
        this.hideLayerMenu();
        this.updateLayerMenuVisibility();
        // Show edit button only for text selections
        const editBtn = document.getElementById('selection-edit-btn');
        if (editBtn) {
            editBtn.style.display = (this.selectionType === 'text') ? '' : 'none';
        }
        this.updateControlBox();
    }
    
    hideControls() {
        this.overlay.style.display = 'none';
        this.controlBox.classList.remove('text-selection-only');
        this.hideLayerMenu();
    }
    
    updateControlBox() {
        if (this.selectionType === null) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        let bounds = null;
        let rotation = 0;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            if (this.isRotating && stroke.originalBounds) {
                bounds = stroke.originalBounds;
            } else {
                bounds = this.getStrokeSelectionBounds(stroke);
            }
            rotation = stroke.rotation || 0;
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return;
            bounds = this.getTextObjectBounds(this.selectedIndex);
            if (!bounds) return;
            rotation = textObj.rotation || 0;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            bounds = this.drawingEngine.getImageBounds(img);
            rotation = img.rotation || 0;
        } else if (this.selectionType === 'multi') {
            // During rotation, use the saved original bounds to keep box shape fixed
            if (this.isRotating && this.multiBounds) {
                bounds = this.multiBounds;
            } else {
                bounds = this.getMultiSelectionBounds();
            }
            rotation = this.multiRotation || 0;
        }
        
        if (!bounds) return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // Use the same scale calculation as getCanvasCoordinates for consistency
        const scaleX = rect.width / this.canvas.offsetWidth;
        const scaleY = rect.height / this.canvas.offsetHeight;
        
        // Calculate actual position and size accounting for canvas transform
        // bounds coordinates are in canvas pixel space, need to convert to screen space
        const actualX = rect.left + (bounds.x * scaleX);
        const actualY = rect.top + (bounds.y * scaleY);
        const actualWidth = bounds.width * scaleX;
        const actualHeight = bounds.height * scaleY;
        
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transformOrigin = 'center center';
        this.controlBox.style.transform = `rotate(${rotation}deg)`;
    }
    
    // Drag handling
    startDrag(e) {
        if (this.selectionType === 'multi') {
            // Multi-select drag
        } else if (this.selectedIndex === null) {
            return;
        }
        
        e.preventDefault();
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            this.dragStartObjectPos = { x: bounds.x, y: bounds.y };
            // Store original positions
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            this.dragStartObjectPos = { x: textObj.x, y: textObj.y };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.dragStartObjectPos = { x: img.x, y: img.y };
        } else if (this.selectionType === 'multi') {
            this.multiDragStartPositions = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                }
            }
            this.multiImageDragStartPositions = [];
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    this.multiImageDragStartPositions.push({ idx, x: img.x, y: img.y });
                }
            }
            this.multiTextDragStartPositions = [];
            for (const idx of this.selectedTexts) {
                if (this.textManager && this.textManager.textObjects[idx]) {
                    const textObj = this.textManager.textObjects[idx];
                    this.multiTextDragStartPositions.push({ idx, x: textObj.x, y: textObj.y });
                }
            }
        }
        
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const rect = this.canvas.getBoundingClientRect();
        
        // Convert screen delta to canvas coordinate delta
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        const deltaX = (pos.x - this.dragStartPos.x) * scaleX;
        const deltaY = (pos.y - this.dragStartPos.y) * scaleY;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            for (let point of stroke.points) {
                if (point.originalX !== undefined) {
                    point.x = point.originalX + deltaX;
                    point.y = point.originalY + deltaY;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            textObj.x = this.dragStartObjectPos.x + deltaX;
            textObj.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.x = this.dragStartObjectPos.x + deltaX;
            img.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'multi') {
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined) {
                            point.x = point.originalX + deltaX;
                            point.y = point.originalY + deltaY;
                        }
                    }
                }
            }
            for (const startPos of this.multiImageDragStartPositions) {
                const img = this.drawingEngine.stampedImages[startPos.idx];
                if (img) {
                    img.x = startPos.x + deltaX;
                    img.y = startPos.y + deltaY;
                }
            }
            for (const startPos of this.multiTextDragStartPositions) {
                if (this.textManager && this.textManager.textObjects[startPos.idx]) {
                    const textObj = this.textManager.textObjects[startPos.idx];
                    textObj.x = startPos.x + deltaX;
                    textObj.y = startPos.y + deltaY;
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.hasUnsavedChanges = true;
            this.controlBox.style.cursor = 'move';
            
            // Clear original position markers for strokes
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
                this.multiImageDragStartPositions = [];
                this.multiTextDragStartPositions = [];
            }
        }
    }
    startResize(e, handle) {
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            this.resizeStartBounds = this.drawingEngine.getStrokeBounds(stroke);
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (typeof this.textManager.normalizeTextObjectScale === 'function') {
                this.textManager.normalizeTextObjectScale(textObj);
            }
            const bounds = this.getTextObjectBounds(this.selectedIndex);
            if (!bounds) return;
            this.resizeStartBounds = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                fontSize: textObj.fontSize
            };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.resizeStartBounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        } else if (this.selectionType === 'multi') {
            this.resizeStartBounds = this.getMultiBounds();
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                }
            }
            this.multiImageResizeStart = [];
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    this.multiImageResizeStart.push({ idx, x: img.x, y: img.y, width: img.width, height: img.height });
                }
            }
            this.multiTextResizeStart = [];
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        if (typeof this.textManager.normalizeTextObjectScale === 'function') {
                            this.textManager.normalizeTextObjectScale(textObj);
                        }
                        const bounds = this.getTextObjectBounds(idx);
                        this.multiTextResizeStart.push({ idx, x: textObj.x, y: textObj.y, width: bounds.width, height: bounds.height, fontSize: textObj.fontSize });
                    }
                }
            }
        }
    }
    
    resize(e) {
        if (!this.isResizing || !this.resizeStartBounds) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const canvasScale = this.getCanvasScale();
        const deltaX = (pos.x - this.resizeStartPos.x) / canvasScale;
        const deltaY = (pos.y - this.resizeStartPos.y) / canvasScale;
        
        const startBounds = this.resizeStartBounds;
        let newBounds = { ...startBounds };
        
        // Calculate new bounds based on handle
        switch (this.resizeHandle) {
            case 'top-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'top-right':
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'bottom-right':
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'top':
                newBounds.y = startBounds.y + deltaY;
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom':
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                break;
            case 'right':
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                break;
        }
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            for (let point of stroke.points) {
                if (point.originalX !== undefined && point.originalY !== undefined) {
                    const relX = (point.originalX - startBounds.x) / startBounds.width;
                    const relY = (point.originalY - startBounds.y) / startBounds.height;
                    point.x = newBounds.x + relX * newBounds.width;
                    point.y = newBounds.y + relY * newBounds.height;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            const scaleRatio = newBounds.width / startBounds.width;
            const minFontSize = (this.textManager && this.textManager.MIN_FONT_SIZE) ? this.textManager.MIN_FONT_SIZE : 12;
            textObj.fontSize = Math.max(minFontSize, startBounds.fontSize * scaleRatio);
            textObj.scale = 1;
            textObj.x = newBounds.x;
            textObj.y = newBounds.y;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.x = newBounds.x;
            img.y = newBounds.y;
            img.width = newBounds.width;
            img.height = newBounds.height;
        } else if (this.selectionType === 'multi') {
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined && point.originalY !== undefined) {
                            const relX = (point.originalX - startBounds.x) / startBounds.width;
                            const relY = (point.originalY - startBounds.y) / startBounds.height;
                            point.x = newBounds.x + relX * newBounds.width;
                            point.y = newBounds.y + relY * newBounds.height;
                        }
                    }
                }
            }
            if (this.multiImageResizeStart) {
                for (const start of this.multiImageResizeStart) {
                    const img = this.drawingEngine.stampedImages[start.idx];
                    if (img) {
                        const relX = (start.x - startBounds.x) / startBounds.width;
                        const relY = (start.y - startBounds.y) / startBounds.height;
                        const relW = start.width / startBounds.width;
                        const relH = start.height / startBounds.height;
                        img.x = newBounds.x + relX * newBounds.width;
                        img.y = newBounds.y + relY * newBounds.height;
                        img.width = Math.max(this.MIN_SIZE, relW * newBounds.width);
                        img.height = Math.max(this.MIN_SIZE, relH * newBounds.height);
                    }
                }
            }
            if (this.multiTextResizeStart) {
                for (const start of this.multiTextResizeStart) {
                    if (this.textManager && this.textManager.textObjects[start.idx]) {
                        const textObj = this.textManager.textObjects[start.idx];
                        const relX = (start.x - startBounds.x) / startBounds.width;
                        const relY = (start.y - startBounds.y) / startBounds.height;
                        const scaleRatio = newBounds.width / startBounds.width;
                        const minFontSize = (this.textManager && this.textManager.MIN_FONT_SIZE) ? this.textManager.MIN_FONT_SIZE : 12;
                        textObj.x = newBounds.x + relX * newBounds.width;
                        textObj.y = newBounds.y + relY * newBounds.height;
                        textObj.fontSize = Math.max(minFontSize, start.fontSize * scaleRatio);
                        textObj.scale = 1;
                    }
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.hasUnsavedChanges = true;
            this.resizeHandle = null;
            this.resizeStartBounds = null;
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
                this.multiImageResizeStart = [];
                this.multiTextResizeStart = [];
            }
        }
    }
    
    // Rotation handling
    
    // Calculate the screen-space center of the control box from canvas coordinates.
    // This avoids using getBoundingClientRect() which returns the axis-aligned
    // bounding box and changes size/position as the element rotates.
    getControlBoxScreenCenter() {
        let bounds = null;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return null;
            bounds = (this.isRotating && stroke.originalBounds) ? stroke.originalBounds : this.getStrokeSelectionBounds(stroke);
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return null;
            bounds = this.getTextObjectBounds(this.selectedIndex);
            if (!bounds) return null;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return null;
            bounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        } else if (this.selectionType === 'multi') {
            // During rotation, use the saved original bounds center
            bounds = (this.isRotating && this.multiBounds) ? this.multiBounds : this.getMultiSelectionBounds();
        }
        
        if (!bounds) return null;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.offsetWidth;
        const scaleY = rect.height / this.canvas.offsetHeight;
        
        const centerX = rect.left + (bounds.x + bounds.width / 2) * scaleX;
        const centerY = rect.top + (bounds.y + bounds.height / 2) * scaleY;
        return { x: centerX, y: centerY };
    }
    
    startRotate(e) {
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        this.isRotating = true;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            this.rotateStartRotation = stroke.rotation || 0;
            stroke.originalBounds = this.getStrokeSelectionBounds(stroke);
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            this.rotateStartRotation = textObj.rotation || 0;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.rotateStartRotation = img.rotation || 0;
        } else if (this.selectionType === 'multi') {
            this.rotateStartRotation = this.multiRotation;
            this.multiBounds = this.getMultiSelectionBounds();
            this.multiStrokeRotateStart = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                    this.multiStrokeRotateStart.push({ idx, rotation: stroke.rotation || 0 });
                }
            }
            this.multiImageRotateStart = [];
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    this.multiImageRotateStart.push({ idx, x: img.x, y: img.y, width: img.width, height: img.height, rotation: img.rotation || 0 });
                }
            }
            this.multiTextRotateStart = [];
            for (const idx of this.selectedTexts) {
                if (this.textManager && this.textManager.textObjects[idx]) {
                    const textObj = this.textManager.textObjects[idx];
                    this.multiTextRotateStart.push({ idx, x: textObj.x, y: textObj.y, rotation: textObj.rotation || 0 });
                }
            }
        }
        
        const center = this.getControlBoxScreenCenter();
        if (!center) return;
        
        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
    }
    
    rotate(e) {
        if (!this.isRotating) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const center = this.getControlBoxScreenCenter();
        if (!center) return;
        
        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            stroke.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
            
            const bounds = stroke.originalBounds || this.drawingEngine.getStrokeBounds(stroke);
            const strokeCenterX = bounds.x + bounds.width / 2;
            const strokeCenterY = bounds.y + bounds.height / 2;
            
            const angleRad = (stroke.rotation - this.rotateStartRotation) * Math.PI / 180;
            for (let point of stroke.points) {
                if (point.originalX !== undefined && point.originalY !== undefined) {
                    const relX = point.originalX - strokeCenterX;
                    const relY = point.originalY - strokeCenterY;
                    const rotatedX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                    const rotatedY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                    point.x = strokeCenterX + rotatedX;
                    point.y = strokeCenterY + rotatedY;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            textObj.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
        } else if (this.selectionType === 'multi') {
            const bounds = this.multiBounds;
            if (!bounds) return;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const angleRad = angleDelta * Math.PI / 180;
            // Update the multi rotation angle for CSS transform
            this.multiRotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined && point.originalY !== undefined) {
                            const relX = point.originalX - centerX;
                            const relY = point.originalY - centerY;
                            point.x = centerX + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                            point.y = centerY + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                        }
                    }
                    const start = this.multiStrokeRotateStart.find(item => item.idx === idx);
                    if (start) {
                        stroke.rotation = this.normalizeAngle(start.rotation + angleDelta);
                    }
                }
            }
            if (this.multiImageRotateStart) {
                for (const start of this.multiImageRotateStart) {
                    const img = this.drawingEngine.stampedImages[start.idx];
                    if (img) {
                        const imgCenterX = start.x + start.width / 2;
                        const imgCenterY = start.y + start.height / 2;
                        const relX = imgCenterX - centerX;
                        const relY = imgCenterY - centerY;
                        const newCenterX = centerX + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                        const newCenterY = centerY + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                        img.x = newCenterX - start.width / 2;
                        img.y = newCenterY - start.height / 2;
                        img.rotation = this.normalizeAngle(start.rotation + angleDelta);
                    }
                }
            }
            if (this.multiTextRotateStart) {
                for (const start of this.multiTextRotateStart) {
                    if (this.textManager && this.textManager.textObjects[start.idx]) {
                        const textObj = this.textManager.textObjects[start.idx];
                        const textBounds = this.getTextObjectBounds(start.idx);
                        if (!textBounds) continue;
                        const txtCenterX = start.x + textBounds.width / 2;
                        const txtCenterY = start.y + textBounds.height / 2;
                        const relX = txtCenterX - centerX;
                        const relY = txtCenterY - centerY;
                        const newCenterX = centerX + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                        const newCenterY = centerY + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                        textObj.x = newCenterX - textBounds.width / 2;
                        textObj.y = newCenterY - textBounds.height / 2;
                        textObj.rotation = this.normalizeAngle(start.rotation + angleDelta);
                    }
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopRotate() {
        if (this.isRotating) {
            this.isRotating = false;
            this.hasUnsavedChanges = true;
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                    delete stroke.originalBounds;
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
                this.multiStrokeRotateStart = [];
                this.multiImageRotateStart = [];
                this.multiTextRotateStart = [];
                // Clear multiBounds so it recalculates from new positions; keep multiRotation
                this.multiBounds = null;
            }
        }
    }
    
    // Action methods
    copySelection() {
        // Cache the selection for paste while still duplicating on the canvas.
        this.cacheSelection();
        if (this.selectionType === 'multi') {
            if (this.selectedStrokes.length === 0 && this.selectedImages.length === 0 && this.selectedTexts.length === 0) return false;
            const newStrokeIndices = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    const copiedStroke = {
                        points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
                        color: stroke.color,
                        size: stroke.size,
                        penType: stroke.penType,
                        tool: stroke.tool,
                        rotation: stroke.rotation || 0
                    };
                    this.drawingEngine.strokes.push(copiedStroke);
                    newStrokeIndices.push(this.drawingEngine.strokes.length - 1);
                }
            }
            const newImageIndices = [];
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    const copiedImage = {
                        imageElement: img.imageElement,
                        x: img.x + this.COPY_OFFSET,
                        y: img.y + this.COPY_OFFSET,
                        width: img.width,
                        height: img.height,
                        rotation: img.rotation || 0,
                        flipHorizontal: img.flipHorizontal || false,
                        flipVertical: img.flipVertical || false
                    };
                    this.drawingEngine.stampedImages.push(copiedImage);
                    newImageIndices.push(this.drawingEngine.stampedImages.length - 1);
                }
            }
            const newTextIndices = [];
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        const copiedText = {
                            ...textObj,
                            x: textObj.x + this.COPY_OFFSET,
                            y: textObj.y + this.COPY_OFFSET
                        };
                        this.textManager.textObjects.push(copiedText);
                        newTextIndices.push(this.textManager.textObjects.length - 1);
                    }
                }
            }
            this.selectedStrokes = newStrokeIndices;
            this.selectedImages = newImageIndices;
            this.selectedTexts = newTextIndices;
            this.multiRotation = 0;
            this.updateControlBox();
            this.redrawWithSelection();
            this.saveHistory();
            return true;
        }
        
        if (this.selectedIndex === null) return false;
        
        if (this.selectionType === 'stroke') {
            const result = this.drawingEngine.copySelectedStroke();
            if (result) {
                this.selectedIndex = this.drawingEngine.strokes.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'text' && this.textManager) {
            const result = this.textManager.copySelectedText();
            if (result) {
                this.selectedIndex = this.textManager.textObjects.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'image') {
            const result = this.drawingEngine.copySelectedImage();
            if (result) {
                this.selectedIndex = this.drawingEngine.stampedImages.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        }
        
        return false;
    }

    hasSelectableContent() {
        const hasStrokes = this.drawingEngine.strokes.length > 0;
        const hasImages = this.drawingEngine.stampedImages.length > 0;
        const hasTexts = this.textManager && this.textManager.textObjects && this.textManager.textObjects.length > 0;
        return hasStrokes || hasImages || hasTexts;
    }

    cacheSelection() {
        if (!this.hasSelection()) {
            // Clear previous clipboard when nothing is selected.
            this.clipboard = null;
            return false;
        }
        const cachedStrokes = [];
        const cachedImages = [];
        const cachedTexts = [];

        if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (stroke) {
                cachedStrokes.push(this.createStrokeCopy(stroke));
            }
        } else if (this.selectionType === 'image' && this.selectedIndex !== null) {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (img) {
                cachedImages.push(this.createImageCopy(img));
            }
        } else if (this.selectionType === 'text' && this.selectedIndex !== null && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (textObj) {
                cachedTexts.push(this.createTextCopy(textObj));
            }
        } else if (this.selectionType === 'multi') {
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    cachedStrokes.push(this.createStrokeCopy(stroke));
                }
            }
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    cachedImages.push(this.createImageCopy(img));
                }
            }
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        cachedTexts.push(this.createTextCopy(textObj));
                    }
                }
            }
        }

        if (cachedStrokes.length === 0 && cachedImages.length === 0 && cachedTexts.length === 0) {
            this.clipboard = null;
            return false;
        }
        this.clipboard = { strokes: cachedStrokes, images: cachedImages, texts: cachedTexts };
        return true;
    }

    pasteClipboard() {
        if (!this.clipboard) return false;
        const newStrokeIndices = [];
        const newImageIndices = [];
        const newTextIndices = [];

        for (const stroke of this.clipboard.strokes || []) {
            const copiedStroke = {
                ...stroke,
                points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET }))
            };
            this.drawingEngine.strokes.push(copiedStroke);
            newStrokeIndices.push(this.drawingEngine.strokes.length - 1);
        }

        for (const img of this.clipboard.images || []) {
            const copiedImage = this.applyPasteOffset({ ...img }, this.COPY_OFFSET, this.COPY_OFFSET);
            this.drawingEngine.stampedImages.push(copiedImage);
            newImageIndices.push(this.drawingEngine.stampedImages.length - 1);
        }

        if (this.textManager) {
            for (const textObj of this.clipboard.texts || []) {
                const copiedText = this.createTextCopy(textObj);
                const offsetText = this.applyPasteOffset(copiedText, this.COPY_OFFSET, this.COPY_OFFSET);
                this.textManager.textObjects.push(offsetText);
                newTextIndices.push(this.textManager.textObjects.length - 1);
            }
        }

        const total = newStrokeIndices.length + newImageIndices.length + newTextIndices.length;
        if (total === 0) return false;

        // Update clipboard positions so continuous Ctrl+V cascades
        if (this.clipboard.strokes) {
            this.clipboard.strokes = this.clipboard.strokes.map(s => ({
                ...s,
                points: s.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET }))
            }));
        }
        if (this.clipboard.images) {
            this.clipboard.images = this.clipboard.images.map(img => this.applyPasteOffset({ ...img }, this.COPY_OFFSET, this.COPY_OFFSET));
        }
        if (this.clipboard.texts) {
            this.clipboard.texts = this.clipboard.texts.map(t => this.applyPasteOffset(this.createTextCopy(t), this.COPY_OFFSET, this.COPY_OFFSET));
        }

        if (total === 1 && newStrokeIndices.length === 1) {
            this.selectStroke(newStrokeIndices[0]);
        } else if (total === 1 && newImageIndices.length === 1) {
            this.selectImage(newImageIndices[0]);
        } else if (total === 1 && newTextIndices.length === 1) {
            this.selectText(newTextIndices[0]);
        } else {
            this.selectedStrokes = newStrokeIndices;
            this.selectedImages = newImageIndices;
            this.selectedTexts = newTextIndices;
            this.multiRotation = 0;
            this.selectionType = 'multi';
            this.selectedIndex = null;
            this.showControls();
            this.redrawWithSelection();
        }

        this.saveHistory();
        return true;
    }

    createStrokeCopy(stroke) {
        return {
            points: stroke.points.map(p => ({ x: p.x, y: p.y })),
            color: stroke.color,
            size: stroke.size,
            penType: stroke.penType,
            tool: stroke.tool,
            rotation: stroke.rotation || 0
        };
    }

    createImageCopy(img) {
        return {
            imageElement: img.imageElement,
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
            rotation: img.rotation || 0,
            flipHorizontal: img.flipHorizontal || false,
            flipVertical: img.flipVertical || false
        };
    }

    createTextCopy(textObj) {
        // Use structuredClone when available; fallback for environments without it (e.g., older embedded browsers).
        if (typeof structuredClone === 'function') {
            return structuredClone(textObj);
        }
        try {
            return JSON.parse(JSON.stringify(textObj));
        } catch (error) {
            console.warn('Failed to deep copy text object:', error);
            // Fallback preserves top-level fields when deep cloning fails; nested data may be dropped.
            return { ...textObj };
        }
    }

    applyPasteOffset(obj, offsetX, offsetY) {
        return {
            ...obj,
            x: obj.x + offsetX,
            y: obj.y + offsetY
        };
    }
    
    deleteSelection() {
        if (this.selectionType === 'multi') {
            if (this.selectedStrokes.length === 0 && this.selectedImages.length === 0 && this.selectedTexts.length === 0) return false;
            // Sort indices in descending order to remove from end first
            const sortedStrokes = [...this.selectedStrokes].sort((a, b) => b - a);
            for (const idx of sortedStrokes) {
                this.drawingEngine.strokes.splice(idx, 1);
            }
            const sortedImages = [...this.selectedImages].sort((a, b) => b - a);
            for (const idx of sortedImages) {
                this.drawingEngine.stampedImages.splice(idx, 1);
            }
            if (this.textManager) {
                const sortedTexts = [...this.selectedTexts].sort((a, b) => b - a);
                for (const idx of sortedTexts) {
                    this.textManager.textObjects.splice(idx, 1);
                }
            }
            this.clearSelection();
            this.redrawCanvas();
            this.saveHistory();
            return true;
        }
        
        if (this.selectedIndex === null) return false;
        
        if (this.selectionType === 'stroke') {
            const result = this.drawingEngine.deleteSelectedStroke();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'text' && this.textManager) {
            const result = this.textManager.deleteSelectedText();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'image') {
            const result = this.drawingEngine.deleteSelectedImage();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        }
        
        return false;
    }
    
    finishSelection() {
        // Only save history if something was actually changed (moved, resized, rotated)
        // Copy and delete operations already save history themselves
        if (this.hasUnsavedChanges) {
            this.saveHistory();
        }
        this.clearSelection();
    }
    
    editSelectedText() {
        if (this.selectionType !== 'text' || this.selectedIndex === null) return;
        if (!this.textManager) return;
        
        const textObj = this.textManager.textObjects[this.selectedIndex];
        if (!textObj) return;
        
        // Store the index for after editing
        const editIndex = this.selectedIndex;
        
        // Clear the selection overlay first
        this.hideControls();
        
        // Use the text manager's edit method if available
        if (typeof this.textManager.editExistingText === 'function') {
            this.textManager.editExistingText(editIndex);
        }
    }
    
    saveHistory() {
        if (this.historyManager) {
            this.historyManager.saveState();
        }
    }
    
    rotate90() {
        if (!this.hasSelection()) return;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) return;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const angleRad = Math.PI / 2;
            for (let point of stroke.points) {
                const relX = point.x - cx;
                const relY = point.y - cy;
                point.x = cx + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                point.y = cy + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
            }
            stroke.rotation = this.normalizeAngle((stroke.rotation || 0) + 90);
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return;
            textObj.rotation = this.normalizeAngle((textObj.rotation || 0) + 90);
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            img.rotation = this.normalizeAngle((img.rotation || 0) + 90);
        } else if (this.selectionType === 'multi') {
            const bounds = this.getMultiBounds();
            if (!bounds) return;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const angleRad = Math.PI / 2;
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        const relX = point.x - cx;
                        const relY = point.y - cy;
                        point.x = cx + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                        point.y = cy + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                    }
                    stroke.rotation = this.normalizeAngle((stroke.rotation || 0) + 90);
                }
            }
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    const imgCX = img.x + img.width / 2;
                    const imgCY = img.y + img.height / 2;
                    const relX = imgCX - cx;
                    const relY = imgCY - cy;
                    const newCX = cx + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                    const newCY = cy + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                    img.x = newCX - img.width / 2;
                    img.y = newCY - img.height / 2;
                    img.rotation = this.normalizeAngle((img.rotation || 0) + 90);
                }
            }
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        const textBounds = this.getTextObjectBounds(idx);
                        if (!textBounds) continue;
                        const txtCX = textObj.x + textBounds.width / 2;
                        const txtCY = textObj.y + textBounds.height / 2;
                        const relX = txtCX - cx;
                        const relY = txtCY - cy;
                        const newCX = cx + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                        const newCY = cy + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                        textObj.x = newCX - textBounds.width / 2;
                        textObj.y = newCY - textBounds.height / 2;
                        textObj.rotation = this.normalizeAngle((textObj.rotation || 0) + 90);
                    }
                }
            }
            this.multiRotation = this.normalizeAngle((this.multiRotation || 0) + 90);
        }
        
        this.hasUnsavedChanges = true;
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    flipHorizontal() {
        if (!this.hasSelection()) return;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) return;
            const cx = bounds.x + bounds.width / 2;
            for (let point of stroke.points) {
                point.x = 2 * cx - point.x;
            }
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            img.flipHorizontal = !(img.flipHorizontal || false);
        } else if (this.selectionType === 'multi') {
            const bounds = this.getMultiBounds();
            if (!bounds) return;
            const cx = bounds.x + bounds.width / 2;
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.x = 2 * cx - point.x;
                    }
                }
            }
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    const imgCX = img.x + img.width / 2;
                    img.x = 2 * cx - imgCX - img.width / 2;
                    img.flipHorizontal = !(img.flipHorizontal || false);
                }
            }
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        const textBounds = this.getTextObjectBounds(idx);
                        if (!textBounds) continue;
                        const txtCX = textObj.x + textBounds.width / 2;
                        textObj.x = 2 * cx - txtCX - textBounds.width / 2;
                    }
                }
            }
        }
        
        this.hasUnsavedChanges = true;
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    flipVertical() {
        if (!this.hasSelection()) return;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) return;
            const cy = bounds.y + bounds.height / 2;
            for (let point of stroke.points) {
                point.y = 2 * cy - point.y;
            }
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            img.flipVertical = !(img.flipVertical || false);
        } else if (this.selectionType === 'multi') {
            const bounds = this.getMultiBounds();
            if (!bounds) return;
            const cy = bounds.y + bounds.height / 2;
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.y = 2 * cy - point.y;
                    }
                }
            }
            for (const idx of this.selectedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                if (img) {
                    const imgCY = img.y + img.height / 2;
                    img.y = 2 * cy - imgCY - img.height / 2;
                    img.flipVertical = !(img.flipVertical || false);
                }
            }
            if (this.textManager) {
                for (const idx of this.selectedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    if (textObj) {
                        const textBounds = this.getTextObjectBounds(idx);
                        if (!textBounds) continue;
                        const txtCY = textObj.y + textBounds.height / 2;
                        textObj.y = 2 * cy - txtCY - textBounds.height / 2;
                    }
                }
            }
        }
        
        this.hasUnsavedChanges = true;
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    continueSelection(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.selectionEnd = { x, y };
        
        // Draw selection rectangle
        this.drawSelectionRect();
    }
    
    endSelection() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
    }
    
    drawSelectionRect() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const width = this.selectionEnd.x - this.selectionStart.x;
        const height = this.selectionEnd.y - this.selectionStart.y;
        
        this.ctx.strokeRect(this.selectionStart.x, this.selectionStart.y, width, height);
        
        this.ctx.restore();
    }
    
    hasSelection() {
        return this.selectedIndex !== null || (this.selectionType === 'multi' && (this.selectedStrokes.length > 0 || this.selectedImages.length > 0 || this.selectedTexts.length > 0));
    }
    
    clearSelection() {
        this.selectionType = null;
        this.selectedIndex = null;
        this.hasUnsavedChanges = false;
        this.hideLayerMenu();
        this.drawingEngine.deselectStroke();
        this.drawingEngine.deselectImage();
        this.drawingEngine.selectedImageIndex = null;
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }
        this.hideControls();
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.multiRotation = 0;
        this.multiBounds = null;
        this.multiStrokeRotateStart = [];
        this.multiImageRotateStart = [];
        this.multiTextRotateStart = [];
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        if (this.boxSelectDiv) {
            this.boxSelectDiv.style.display = 'none';
        }
        this.isLassoSelecting = false;
        this.lassoPoints = [];
        if (this.lassoSvg) {
            this.lassoSvg.style.display = 'none';
        }
        this.redrawCanvas();
    }
    
    redrawWithSelection() {
        // Redraw the canvas to show the selection border
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Check if there is vector content to redraw
        const hasVectorContent = this.drawingEngine.strokes.length > 0 ||
            this.drawingEngine.stampedImages.length > 0 ||
            (this.textManager && this.textManager.textObjects && this.textManager.textObjects.length > 0);
        
        if (hasVectorContent) {
            // Redraw from vector data
            // Redraw stamped images (preserves inserted images during selection operations)
            this.drawingEngine.redrawStampedImages();
            
            // Redraw all strokes
            for (const stroke of this.drawingEngine.strokes) {
                this.drawingEngine.redrawStroke(stroke);
            }
            
            // Redraw all text objects
            if (this.textManager) {
                this.textManager.drawAllTextObjects();
            }
        } else {
            // No vector content: restore base canvas from history to preserve
            // pixel content (e.g. after session restore where vector data is not available)
            if (this.historyManager && this.historyManager.historyStep >= 0) {
                const baseState = this.historyManager.history[this.historyManager.historyStep];
                if (baseState) {
                    this.ctx.putImageData(baseState, 0, 0);
                }
            }
        }
        
        // Draw selection border if something is selected
        if (this.selectionType === 'stroke') {
            this.drawingEngine.drawSelectionBorder();
        } else if (this.selectionType === 'text' && this.textManager) {
            this.textManager.drawTextSelection();
        }
    }
    
    // Box selection methods
    startBoxSelection(e) {
        this.clearSelection();
        this.isBoxSelecting = true;
        const pos = this.getClientPos(e);
        this.boxSelectStart = { x: pos.x, y: pos.y };
        this.boxSelectEnd = { x: pos.x, y: pos.y };
        this.boxSelectDiv.style.display = 'block';
        this.updateBoxSelectDiv();
    }
    
    continueBoxSelection(e) {
        if (!this.isBoxSelecting) return;
        const pos = this.getClientPos(e);
        this.boxSelectEnd = { x: pos.x, y: pos.y };
        this.updateBoxSelectDiv();
    }
    
    updateBoxSelectDiv() {
        if (!this.boxSelectStart || !this.boxSelectEnd) return;
        const left = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const top = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const width = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
        const height = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);
        this.boxSelectDiv.style.left = left + 'px';
        this.boxSelectDiv.style.top = top + 'px';
        this.boxSelectDiv.style.width = width + 'px';
        this.boxSelectDiv.style.height = height + 'px';
    }
    
    endBoxSelection(e) {
        if (!this.isBoxSelecting) return;
        this.isBoxSelecting = false;
        this.boxSelectDiv.style.display = 'none';
        
        if (!this.boxSelectStart || !this.boxSelectEnd) return;
        
        // Convert screen coordinates to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const selLeft = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const selTop = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const selRight = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const selBottom = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
        
        const canvasSelRect = {
            x: (selLeft - rect.left) * scaleX,
            y: (selTop - rect.top) * scaleY,
            width: (selRight - selLeft) * scaleX,
            height: (selBottom - selTop) * scaleY
        };
        
        // Find strokes whose bounding boxes intersect the selection rectangle
        const foundStrokes = [];
        for (let i = 0; i < this.drawingEngine.strokes.length; i++) {
            const stroke = this.drawingEngine.strokes[i];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (bounds && this.rectsIntersect(canvasSelRect, bounds)) {
                foundStrokes.push(i);
            }
        }
        
        // Find stamped images whose bounding boxes intersect the selection rectangle
        const foundImages = [];
        for (let i = 0; i < this.drawingEngine.stampedImages.length; i++) {
            const img = this.drawingEngine.stampedImages[i];
            const bounds = this.drawingEngine.getImageBounds(img);
            if (bounds && this.rectsIntersect(canvasSelRect, bounds)) {
                foundImages.push(i);
            }
        }
        
        // Find text objects whose bounding boxes intersect the selection rectangle
        const foundTexts = [];
        if (this.textManager && this.textManager.textObjects) {
            for (let i = 0; i < this.textManager.textObjects.length; i++) {
                const bounds = this.getTextObjectSelectionBounds(i);
                if (bounds && this.rectsIntersect(canvasSelRect, bounds)) {
                    foundTexts.push(i);
                }
            }
        }
        
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        
        this.applyFoundSelection(foundStrokes, foundImages, foundTexts);
    }
    
    // Apply selection from found strokes, images, and texts (shared by box and lasso selection)
    applyFoundSelection(foundStrokes, foundImages, foundTexts = []) {
        const totalFound = foundStrokes.length + foundImages.length + foundTexts.length;
        
        if (totalFound === 0) {
            return;
        } else if (totalFound === 1 && foundStrokes.length === 1) {
            this.selectStroke(foundStrokes[0]);
        } else if (totalFound === 1 && foundImages.length === 1) {
            this.selectImage(foundImages[0]);
        } else if (totalFound === 1 && foundTexts.length === 1) {
            this.selectText(foundTexts[0]);
        } else {
            // Multi-select: include strokes, images, and texts
            this.selectedStrokes = foundStrokes;
            this.selectedImages = foundImages;
            this.selectedTexts = foundTexts;
            this.multiRotation = 0;
            this.selectionType = 'multi';
            this.selectedIndex = null;
            this.showControls();
            this.redrawWithSelection();
        }
    }
    
    rectsIntersect(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    rotatePoint(x, y, centerX, centerY, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const relX = x - centerX;
        const relY = y - centerY;
        return {
            x: centerX + relX * cos - relY * sin,
            y: centerY + relX * sin + relY * cos
        };
    }

    /**
     * Build a CSS font string for text measurements.
     * @param {Object} textObj - Text object containing font settings.
     * @param {number} fontSize - Font size in pixels.
     * @returns {string} CSS font string, e.g. "italic bold 16px Arial".
     */
    buildTextFontString(textObj, fontSize) {
        const fontStyle = textObj.italic ? 'italic' : 'normal';
        const fontWeight = textObj.bold ? 'bold' : 'normal';
        const fontFamily = textObj.fontFamily || 'Arial, sans-serif';
        return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    }

    getBoundsFromPoints(points) {
        if (!points || points.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of points) {
            if (!point) continue;
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        if (minX === Infinity) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    getStrokeSelectionBounds(stroke) {
        if (!stroke) return null;
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return null;
        const rotation = stroke.rotation || 0;
        if (!rotation) return bounds;
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const unrotatedPoints = stroke.points.map(point =>
            this.rotatePoint(point.x, point.y, centerX, centerY, -rotation)
        );
        return this.getBoundsFromPoints(unrotatedPoints);
    }

    getImageCornerPoints(img) {
        if (!img) return [];
        const corners = [
            { x: img.x, y: img.y },
            { x: img.x + img.width, y: img.y },
            { x: img.x + img.width, y: img.y + img.height },
            { x: img.x, y: img.y + img.height }
        ];
        const rotation = img.rotation || 0;
        if (!rotation) return corners;
        const centerX = img.x + img.width / 2;
        const centerY = img.y + img.height / 2;
        return corners.map(point => this.rotatePoint(point.x, point.y, centerX, centerY, rotation));
    }

    getTextCornerPoints(textObj, bounds) {
        if (!textObj || !bounds) return [];
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height }
        ];
        const rotation = textObj.rotation || 0;
        if (!rotation) return corners;
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        return corners.map(point => this.rotatePoint(point.x, point.y, centerX, centerY, rotation));
    }

    getMultiSelectionBounds() {
        if (this.selectedStrokes.length === 0 && this.selectedImages.length === 0 && this.selectedTexts.length === 0) return null;
        const points = [];
        for (const idx of this.selectedStrokes) {
            const stroke = this.drawingEngine.strokes[idx];
            if (!stroke) continue;
            for (const point of stroke.points) {
                points.push({ x: point.x, y: point.y });
            }
        }
        for (const idx of this.selectedImages) {
            const img = this.drawingEngine.stampedImages[idx];
            points.push(...this.getImageCornerPoints(img));
        }
        if (this.textManager) {
            for (const idx of this.selectedTexts) {
                const textObj = this.textManager.textObjects[idx];
                const bounds = this.getTextObjectBounds(idx);
                points.push(...this.getTextCornerPoints(textObj, bounds));
            }
        }
        const axisBounds = this.getBoundsFromPoints(points);
        if (!axisBounds) return null;
        const rotation = this.multiRotation || 0;
        if (!rotation) return axisBounds;
        const centerX = axisBounds.x + axisBounds.width / 2;
        const centerY = axisBounds.y + axisBounds.height / 2;
        const unrotatedPoints = points.map(point =>
            this.rotatePoint(point.x, point.y, centerX, centerY, -rotation)
        );
        return this.getBoundsFromPoints(unrotatedPoints);
    }

    getTextObjectSelectionBounds(index) {
        if (!this.textManager || !this.textManager.textObjects) return null;
        const textObj = this.textManager.textObjects[index];
        const bounds = this.getTextObjectBounds(index);
        if (!textObj || !bounds) return null;
        const corners = this.getTextCornerPoints(textObj, bounds);
        return this.getBoundsFromPoints(corners);
    }

    polygonIntersectsRect(polygon, rect) {
        if (!polygon || polygon.length === 0 || !rect) return false;
        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];
        if (corners.some(corner => this.pointInPolygon(corner.x, corner.y, polygon))) {
            return true;
        }
        if (polygon.some(point => point.x >= rect.x && point.x <= rect.x + rect.width &&
            point.y >= rect.y && point.y <= rect.y + rect.height)) {
            return true;
        }
        return false;
    }
    
    // Get bounds for a text object by index
    getTextObjectBounds(index) {
        if (!this.textManager || !this.textManager.textObjects) return null;
        const textObj = this.textManager.textObjects[index];
        if (!textObj) return null;
        const fontSize = textObj.fontSize * (textObj.scale || 1);
        const text = textObj.text || '';
        const lines = text.split('\n');
        let maxWidth = 0;
        const previousFont = this.ctx.font;
        this.ctx.font = this.buildTextFontString(textObj, fontSize);
        lines.forEach(line => {
            const metrics = this.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        this.ctx.font = previousFont;
        const lineHeight = fontSize * this.TEXT_LINE_HEIGHT;
        const padding = this.TEXT_BOUNDS_PADDING;
        return {
            x: textObj.x,
            y: textObj.y,
            width: maxWidth + padding * 2,
            height: lines.length * lineHeight + padding * 2
        };
    }
    
    getMultiBounds() {
        return this.getMultiSelectionBounds();
    }
    
    // Lasso selection methods
    startLassoSelection(e) {
        this.clearSelection();
        this.isLassoSelecting = true;
        const pos = this.getClientPos(e);
        this.lassoPoints = [{ x: pos.x, y: pos.y }];
        this.lassoSvg.style.display = 'block';
        this.updateLassoPath();
    }
    
    continueLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        const pos = this.getClientPos(e);
        this.lassoPoints.push({ x: pos.x, y: pos.y });
        this.updateLassoPath();
    }
    
    updateLassoPath() {
        if (this.lassoPoints.length === 0) return;
        const pointsStr = this.lassoPoints.map(p => `${p.x},${p.y}`).join(' ');
        this.lassoPath.setAttribute('points', pointsStr);
    }
    
    endLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        this.isLassoSelecting = false;
        this.lassoSvg.style.display = 'none';
        
        if (this.lassoPoints.length < 3) {
            this.lassoPoints = [];
            return;
        }
        
        // Convert lasso screen points to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.lassoPoints = [];
            return;
        }
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const canvasLassoPoints = this.lassoPoints.map(p => ({
            x: (p.x - rect.left) * scaleX,
            y: (p.y - rect.top) * scaleY
        }));
        
        this.lassoPoints = [];
        
        // Find strokes with any point inside the lasso polygon
        const foundStrokes = [];
        for (let i = 0; i < this.drawingEngine.strokes.length; i++) {
            const stroke = this.drawingEngine.strokes[i];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) continue;
            // Check if center of stroke bounds is inside lasso
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            if (this.pointInPolygon(cx, cy, canvasLassoPoints)) {
                foundStrokes.push(i);
                continue;
            }
            // Also check if any stroke point is inside lasso
            for (const pt of stroke.points) {
                if (this.pointInPolygon(pt.x, pt.y, canvasLassoPoints)) {
                    foundStrokes.push(i);
                    break;
                }
            }
        }
        
        // Find stamped images inside lasso
        const foundImages = [];
        for (let i = 0; i < this.drawingEngine.stampedImages.length; i++) {
            const img = this.drawingEngine.stampedImages[i];
            const bounds = this.drawingEngine.getImageBounds(img);
            if (!bounds) continue;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            if (this.pointInPolygon(cx, cy, canvasLassoPoints)) {
                foundImages.push(i);
            }
        }
        
        // Find text objects inside lasso
        const foundTexts = [];
        if (this.textManager && this.textManager.textObjects) {
            for (let i = 0; i < this.textManager.textObjects.length; i++) {
                const bounds = this.getTextObjectSelectionBounds(i);
                if (!bounds) continue;
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;
                if (this.pointInPolygon(cx, cy, canvasLassoPoints) ||
                    this.polygonIntersectsRect(canvasLassoPoints, bounds)) {
                    foundTexts.push(i);
                }
            }
        }
        
        this.applyFoundSelection(foundStrokes, foundImages, foundTexts);
    }
    
    // Ray-casting point-in-polygon algorithm
    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
