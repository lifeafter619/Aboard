// Extracted event setup runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function bindIfPresent(element, eventName, handler, options) {
        element?.addEventListener?.(eventName, handler, options);
}

function getLazyFeatureLabel(key, fallback) {
        if (!window.i18n?.t) {
            return fallback;
        }

        const translated = window.i18n.t(key);
        return translated && translated !== key ? translated : fallback;
}

function openAttachedFilePicker({
        accept = '',
        doc = document,
        win = window,
        onFilesSelected
}) {
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';

        const parent = doc.body || doc.documentElement;
        let cleanedUp = false;

        const cleanup = () => {
            if (cleanedUp) {
                return;
            }
            cleanedUp = true;
            input.removeEventListener?.('cancel', cleanup);
            win.removeEventListener?.('focus', handleWindowFocus);
            input.remove?.();
        };

        const handleWindowFocus = () => {
            win.setTimeout(() => {
                if (!input.files?.length) {
                    cleanup();
                }
            }, 0);
        };

        input.addEventListener('cancel', cleanup, { once: true });
        input.addEventListener('change', async (event) => {
            try {
                if (event.target.files?.length) {
                    await onFilesSelected?.(event.target.files, event);
                }
            } finally {
                cleanup();
            }
        }, { once: true });

        parent?.appendChild?.(input);
        win.addEventListener?.('focus', handleWindowFocus, { once: true });
        input.click();
        return input;
}

function getEventTargetClosest(target) {
        return typeof target?.closest === 'function'
            ? target.closest.bind(target)
            : () => null;
}

function setupEventListeners() {
        const shouldUsePointerPinch = () => this.isPointerPinching
            || Array.from(this.activePointers.values()).some(pointer => pointer.pointerType === 'pen');

        // Canvas drawing events - use Pointer Events for unified Mouse/Touch/Pen support
        // Track all pointers for multi-touch gesture detection (pinch zoom)
        document.addEventListener('pointerdown', (e) => {
            // Track all touch and pen pointers for multi-touch gesture detection
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY,
                    pointerType: e.pointerType
                });
                
                // Check for multi-touch pinch gesture (2+ pointers)
                if (this.activePointers.size >= 2 && shouldUsePointerPinch()) {
                    this.isPointerPinching = true;
                    this.handlePointerPinchStart();
                }
            }
            
            // Ignore multi-touch secondary pointers for drawing (allow pinch zoom to handle them)
            if (!e.isPrimary) return;
            
            // If pinching, don't start drawing
            if (this.isPinching) return;

            const closest = getEventTargetClosest(e.target);

            // Skip if clicking on UI elements (except canvas)
            // 如果正在编辑笔迹，点击工具栏或属性栏时自动保存
                if (this.strokeControls.isActive && 
                    (closest('#toolbar') || closest('#config-area'))) {
                    this.strokeControls.hideControls();
                    if (this.historyManager) {
                        this.historyManager.saveState();
                    }
                }
                
                if (closest('#toolbar') || 
                    closest('#config-area') || 
                    closest('#history-controls') || 
                    closest('#pagination-controls') ||
                    closest('#time-display-area') ||
                    closest('#time-display') ||
                    closest('#feature-area') ||
                    closest('.modal') ||
                    closest('.timer-display-widget') ||
                    closest('.random-picker-widget') ||
                    closest('.scoreboard-widget') ||
                    closest('.feature-widget') ||
                    closest('.canvas-image-selection') ||
                    closest('.time-fullscreen-modal') ||
                    closest('.timer-fullscreen-modal') ||
                    closest('#time-display-settings-modal') ||
                    closest('#timer-settings-modal') ||
                    closest('#selection-controls-overlay') ||
                    closest('#insert-image-overlay') ||
                    closest('#image-controls-overlay') ||
                    closest('input[type="range"]')) {
                    return;
                }
            
            // 如果正在使用选择工具并且点击在选择控件内，不要触发新的选择
            if (this.selectionManager && this.selectionManager.hasSelection()) {
                if (closest('#selection-controls-overlay')) {
                    return;
                }
            }
            
            // 如果正在编辑笔迹，点击画布其他位置时自动保存并切换到笔模式
            if (this.strokeControls.isActive) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Check if clicking inside the stroke controls overlay
                if (!closest('#stroke-controls-overlay')) {
                    // Clicking outside the stroke controls, save and switch to pen
                    this.strokeControls.hideControls();
                    if (this.historyManager) {
                        this.historyManager.saveState();
                    }
                    this.setTool('pen', false);
                    // Continue with pen drawing by calling startDrawing
                    this.drawingEngine.startDrawing(e);
                    return;
                }
            }
            
            if (this.isCoordinatePointMode && this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const pointMode = this.getCoordinatePointLineMode();
                if (pointMode === 'selected') {
                    const hitPoint = this.backgroundManager.findCoordinatePointNearCanvasPoint(point.x, point.y);
                    if (hitPoint) {
                        this.handleSelectedCoordinateLinePointClick(hitPoint.id);
                        return;
                    }
                }
                const addedPoint = this.backgroundManager.addCoordinatePoint(point.x, point.y);
                if (addedPoint?.duplicate) {
                    return;
                }
                this.resetSelectedCoordinateLineConnection();
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
                this.showCoordinateToast('background.pointAdded', 'Coordinate point added', 'success');
                return;
            }

            // Check if clicking on coordinate origin point (in coordinate origin drag mode or background mode)
            if (this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const { x, y } = point;
                
                // Check if in coordinate origin drag mode (button clicked)
                if (this.isCoordinateOriginDragMode) {
                    // In drag mode, anywhere on canvas starts dragging the origin
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    this.canvas.style.cursor = 'grabbing';
                    return;
                }
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    if (this.drawingEngine.currentTool === 'background') {
                        // In background mode, single click to drag
                        this.isDraggingCoordinateOrigin = true;
                        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                        return;
                    }
                    // In pan mode, we'll handle this in dblclick event
                }
            }
            
            // Auto-switch to pen mode if currently in background mode
            // But not if image controls are active (user is manipulating background image)
            if (this.drawingEngine.currentTool === 'background' && !this.imageControls.isActive) {
                this.setTool('pen', false); // Don't show config panel
            }

            if (this.drawingEngine.currentTool === 'more') {
                const hasActiveMoreFeature = !!document.querySelector('#feature-area .feature-btn.active');
                if (!hasActiveMoreFeature) {
                    this.setTool('pan', false);
                }
            }
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || this.drawingEngine.currentTool === 'pan') {
                this.drawingEngine.startPanning(e);
                this.scheduleRenderQualityUpdate();
            } else if (this.drawingEngine.currentTool === 'select') {
                // Handle selection tool
                this.selectionManager.startSelection(e);
            } else if (this.drawingEngine.currentTool === 'shape') {
                // Handle shape drawing
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.shapeDrawingManager.startDrawing(e);
                this.scheduleRenderQualityUpdate();
            } else if (this.drawingEngine.currentTool === 'pen' || this.drawingEngine.currentTool === 'eraser') {
                // Don't start drawing if interacting with teaching tools
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.drawingEngine.startDrawing(e);
                this.scheduleRenderQualityUpdate();
                // Show eraser cursor only when actually erasing on canvas
                if (this.drawingEngine.currentTool === 'eraser') {
                    this.showEraserCursor();
                }
            }
        });
        
        document.addEventListener('pointermove', (e) => {
            // Update pointer position for multi-touch gesture tracking
            if ((e.pointerType === 'touch' || e.pointerType === 'pen') && this.activePointers.has(e.pointerId)) {
                this.activePointers.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY,
                    pointerType: e.pointerType
                });
                
                // Handle pinch gesture if we have 2+ pointers
                if (this.isPointerPinching && this.activePointers.size >= 2) {
                    this.handlePointerPinchMove();
                    return; // Don't continue with normal drawing during pinch
                }
            }
            
            // Ignore multi-touch secondary pointers
            if (!e.isPrimary) return;

            // Ignore pointer move if we are pinching (avoids conflict with touchmove)
            if (this.hasTwoFingers || this.isPinching) return;

            // Don't draw when dragging panels or teaching tools
            if (this.isDraggingPanel || (this.teachingToolsManager && this.teachingToolsManager.isInteracting)) {
                return;
            }

            // Explicitly check if target is a feature widget part (double protection)
            const closest = getEventTargetClosest(e.target);
            if (closest('.feature-widget') || closest('#feature-area')) {
                return;
            }
            
            if (this.isDraggingCoordinateOrigin) {
                this.dragCoordinateOrigin(e);
            } else if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isBoxSelecting) {
                this.selectionManager.continueBoxSelection(e);
            } else if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isLassoSelecting) {
                this.selectionManager.continueLassoSelection(e);
            } else if (this.drawingEngine.isPanning) {
                this.drawingEngine.pan(e);
                this.applyPanTransform();
            } else if (this.shapeDrawingManager && this.shapeDrawingManager.isDrawing) {
                // Handle shape drawing
                this.shapeDrawingManager.draw(e);
            } else if (this.drawingEngine.isDrawing) {
                // Pointer events provide coalesced events for higher precision (smoother curves)
                if (e.getCoalescedEvents) {
                    const events = e.getCoalescedEvents();
                    // Use optimized batch drawing
                    this.drawingEngine.drawBatch(events);
                } else {
                    this.drawingEngine.draw(e);
                }
            }

            // Update eraser cursor for all cases
            this.updateEraserCursor(e);
        });
        
        document.addEventListener('pointerup', (e) => {
            // Remove pointer from tracking
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.delete(e.pointerId);

                // End pinch if we no longer have 2+ pointers
                if (this.isPointerPinching && this.activePointers.size < 2) {
                    this.handlePointerPinchEnd();
                    this.isPointerPinching = false;
                }

                // Clear map when empty to prevent memory leak
                if (this.activePointers.size === 0) {
                    this.activePointers.clear();
                    this.isPointerPinching = false;
                }
            }
            
            if (!e.isPrimary) return;
            this.stopDraggingCoordinateOrigin();
            if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isBoxSelecting) {
                this.selectionManager.endBoxSelection(e);
            }
            if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isLassoSelecting) {
                this.selectionManager.endLassoSelection(e);
            }
            this.handleDrawingComplete();
            this.drawingEngine.stopPanning();
            this.scheduleRenderQualityUpdate();
            // Hide eraser cursor when erasing stops
            if (this.drawingEngine.currentTool === 'eraser') {
                this.hideEraserCursor();
            }
        });
        
        document.addEventListener('pointercancel', (e) => {
            // Remove pointer from tracking on cancel
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.delete(e.pointerId);

                // End pinch if we no longer have 2+ pointers
                if (this.isPointerPinching && this.activePointers.size < 2) {
                    this.handlePointerPinchEnd();
                    this.isPointerPinching = false;
                }

                // Clear map when empty to prevent memory leak
                if (this.activePointers.size === 0) {
                    this.activePointers.clear();
                    this.isPointerPinching = false;
                }
            }
            this.scheduleRenderQualityUpdate();
            // Hide eraser cursor when pointer is cancelled
            if (this.drawingEngine.currentTool === 'eraser') {
                this.hideEraserCursor();
            }
        });
        
        // Double-click handler for coordinate origin selection in pan mode
        this.canvas.addEventListener('dblclick', (e) => {
            // In pan mode, double-click to select coordinate origin
            if (this.drawingEngine.currentTool === 'pan' && 
                this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const { x, y } = point;
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    // Visual feedback - change cursor
                    this.canvas.style.cursor = 'move';
                }
            }
        });
        
        this.canvas.addEventListener('mouseenter', (e) => {
            // Only show eraser cursor when actively erasing (mouse button down)
            if (this.drawingEngine.currentTool === 'eraser' && this.drawingEngine.isDrawing) {
                this.showEraserCursor();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            // Hide eraser cursor when leaving canvas
            this.hideEraserCursor();
        });
        
        // Touch events - Only for gestures (Pinch Zoom)
        // Drawing is now handled by Pointer Events
        const resetTouchGestureState = () => {
            this.isPotentialTap = false;
            this.isPotentialGesture = false;
            this.maxTouchesInGesture = 0;
        };

        const endTouchPinchGesture = () => {
            if (this.isPinching || this.hasTwoFingers) {
                this.handlePinchEnd();
            }
            this.hasTwoFingers = false;
        };

        this.canvas.addEventListener('touchstart', (e) => {
            // Don't start drawing if interacting with teaching tools
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // If two or more fingers (or pen + finger), handle pinch
            if (e.touches.length >= 2) {
                e.preventDefault(); // Prevent default zoom/scroll
                this.hasTwoFingers = true;

                // If we were drawing (via pointer events), stop it
                if (this.drawingEngine.isDrawing) {
                    this.discardCurrentStroke();
                }

                // If we were panning (via pointer events), stop it to let pinch handle it
                if (this.drawingEngine.isPanning) {
                    this.drawingEngine.stopPanning();
                }

                this.handlePinchStart(e);
            }

            // General gesture detection logic (for 1, 2, 3+ fingers)
            if (e.touches.length === 1) {
                // Start of a new gesture sequence
                this.maxTouchesInGesture = 1;
                this.gestureStartTime = Date.now();
                this.isPotentialGesture = true;

                // Single tap detection specific
                this.isPotentialTap = true;
                this.currentTapStart = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    time: Date.now()
                };
            } else {
                // Continuation of gesture (adding fingers)
                this.maxTouchesInGesture = Math.max(this.maxTouchesInGesture, e.touches.length);
                this.isPotentialGesture = true;
                this.isPotentialTap = false; // Not a single tap if multiple fingers
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // Tap detection - invalidate if moved too much
            if (this.isPotentialTap && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.currentTapStart.x;
                const dy = e.touches[0].clientY - this.currentTapStart.y;
                if (dx * dx + dy * dy > 100) { // 10px threshold squared
                    this.isPotentialTap = false;
                }
            }

            if (e.touches.length >= 2) {
                e.preventDefault();
                this.handlePinchMove(e);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // Tap detection
            if (e.changedTouches.length === 1 && e.touches.length === 0) { // All fingers lifted
                // Double tap logic (single finger)
                if (this.isPotentialTap) {
                    const tapTime = Date.now();
                    // Check if it's a double tap
                    if (this.lastTapTime && (tapTime - this.lastTapTime < 300)) {
                        // Check distance between taps
                        const dx = this.currentTapStart.x - this.lastTapPos.x;
                        const dy = this.currentTapStart.y - this.lastTapPos.y;
                        if (dx * dx + dy * dy < 900) { // 30px threshold squared
                            this.handleDoubleTap(e.changedTouches[0]);
                            this.lastTapTime = 0; // Reset
                            this.isPotentialTap = false;
                            e.preventDefault();
                        }
                    } else {
                        this.lastTapTime = tapTime;
                        this.lastTapPos = { ...this.currentTapStart };
                    }
                }

                // Multi-touch gesture (Undo/Redo)
                // Only if not a valid double-tap candidate (to avoid conflict, although double tap is 1 finger)
                if (this.isPotentialGesture && !this.isPotentialTap) {
                    const gestureTime = Date.now();
                    if (gestureTime - this.gestureStartTime < 400) { // 400ms for multi-touch tap
                        if (this.maxTouchesInGesture === 2) {
                            // 2-finger tap: Undo
                            if (this.historyManager.undo()) {
                                this.drawingEngine.clearStrokes();
                                this.drawingEngine.stampedImages = [];
                                this.drawingEngine.objectGroups = [];
                                this.insertTextManager?.clearTextObjects?.();
                                this.drawingEngine.clearVectorScene();
                                this.drawingEngine.setVectorPreviewVisible(false);
                                this.updateUI();
                                this.saveSessionDebounced();
                            }
                            e.preventDefault();
                        } else if (this.maxTouchesInGesture === 3) {
                            // 3-finger tap: Redo
                            if (this.historyManager.redo()) {
                                this.drawingEngine.clearStrokes();
                                this.drawingEngine.stampedImages = [];
                                this.drawingEngine.objectGroups = [];
                                this.insertTextManager?.clearTextObjects?.();
                                this.drawingEngine.clearVectorScene();
                                this.drawingEngine.setVectorPreviewVisible(false);
                                this.updateUI();
                                this.saveSessionDebounced();
                            }
                            e.preventDefault();
                        }
                    }
                }
            }

            if (e.touches.length === 0) {
                resetTouchGestureState();
            }

            // If we still have enough fingers to pinch, re-anchor to prevent jumps
            if (e.touches.length >= 2 && this.isPinching) {
                this.handlePinchStart(e);
            }

            if (e.touches.length < 2) {
                endTouchPinchGesture();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', () => {
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }

            resetTouchGestureState();
            endTouchPinchGesture();
        }, { passive: false });
        
        // Toolbar buttons
        bindIfPresent(document.getElementById('pen-btn'), 'click', () => this.setTool('pen'));
        bindIfPresent(document.getElementById('pan-btn'), 'click', () => this.setTool('pan'));
        bindIfPresent(document.getElementById('select-btn'), 'click', () => this.setTool('select'));
        bindIfPresent(document.getElementById('eraser-btn'), 'click', () => this.setTool('eraser'));
        bindIfPresent(document.getElementById('background-btn'), 'click', () => this.setTool('background'));
        bindIfPresent(document.getElementById('clear-btn'), 'click', () => this.confirmClear());
        bindIfPresent(document.getElementById('settings-btn'), 'click', () => this.openSettings());
        bindIfPresent(document.getElementById('more-btn'), 'click', () => this.setTool('more'));
        
        // Shape and Teaching Tools buttons in More menu
        bindIfPresent(document.getElementById('more-shape-btn'), 'click', () => this.setTool('shape'));
        bindIfPresent(document.getElementById('more-teaching-tools-btn'), 'click', () => {
            this.exitShapeMode();
            this.teachingToolsManager?.showModal?.();
        });
        
        bindIfPresent(document.getElementById('config-close-btn'), 'click', () => this.closeConfigPanel());
        bindIfPresent(document.getElementById('feature-close-btn'), 'click', () => this.closeFeaturePanel());
        
        // History buttons
        bindIfPresent(document.getElementById('undo-btn'), 'click', () => {
            if (this.historyManager.undo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.drawingEngine.stampedImages = [];
                this.drawingEngine.objectGroups = [];
                this.insertTextManager?.clearTextObjects?.();
                this.drawingEngine.clearVectorScene();
                this.drawingEngine.setVectorPreviewVisible(false);
                this.updateUI();
                this.saveSessionDebounced();
            }
        });
        
        bindIfPresent(document.getElementById('redo-btn'), 'click', () => {
            if (this.historyManager.redo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.drawingEngine.stampedImages = [];
                this.drawingEngine.objectGroups = [];
                this.insertTextManager?.clearTextObjects?.();
                this.drawingEngine.clearVectorScene();
                this.drawingEngine.setVectorPreviewVisible(false);
                this.updateUI();
                this.saveSessionDebounced();
            }
        });
        
        // Zoom controls
        const zoomInput = document.getElementById('zoom-input');
        bindIfPresent(document.getElementById('zoom-in-btn'), 'click', () => this.zoomIn());
        bindIfPresent(document.getElementById('zoom-out-btn'), 'click', () => this.zoomOut());
        bindIfPresent(zoomInput, 'change', (e) => this.setZoom(e.target.value));
        bindIfPresent(zoomInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                this.setZoom(e.target.value);
            }
        });
        
        // Fullscreen button
        bindIfPresent(document.getElementById('fullscreen-btn'), 'click', () => this.toggleFullscreen());
        
        // Export button (moved to top controls, always visible)
        bindIfPresent(document.getElementById('export-btn-top'), 'click', async () => {
            try {
                const exportManager = await this.getExportManager();
                exportManager.showModal();
            } catch (error) {
                this.showLazyLoadError(getLazyFeatureLabel('toolbar.export', 'Export'), error);
            }
        });

        // Import Project Button
        bindIfPresent(document.getElementById('import-project-btn'), 'click', async () => {
            openAttachedFilePicker({
                accept: this.settingsManager?.legacyProjectImportEnabled
                    ? '.zip,.aboard,.json'
                    : '.zip',
                onFilesSelected: async (files) => {
                    try {
                        const projectManager = await this.getProjectManager();
                        await projectManager.importProject(files[0]);
                    } catch (error) {
                        this.showLazyLoadError(getLazyFeatureLabel('settings.more.compatibilityLabel', 'Project Import'), error);
                    }
                }
            });
        });

        // Pagination controls - merged next and add button
        const pageInput = document.getElementById('page-input');
        bindIfPresent(document.getElementById('prev-page-btn'), 'click', () => this.prevPage());
        bindIfPresent(document.getElementById('next-or-add-page-btn'), 'click', () => this.nextOrAddPage());
        bindIfPresent(pageInput, 'change', (e) => this.goToPage(parseInt(e.target.value, 10)));
        bindIfPresent(pageInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(e.target.value, 10));
            }
        });
        
        // Setup additional event listeners for tools, settings, and keyboard
        this.setupToolConfigListeners();
        this.setupKeyboardShortcuts();
        this.setupDraggablePanels();
        
        // Debounce resize handler for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            this.syncInteractiveOverlays();
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Recalculate fit scale and re-center canvas for new viewport size
                this.recalculateAndRecenterCanvas();
                this.applyZoom(false); // Apply new fit scale without updating config-area
                // Update toolbar text visibility on resize
                this.settingsManager.updateToolbarTextVisibility();
                // Reposition config-area to stay properly positioned above toolbar
                this.positionConfigArea();
                // Reposition toolbars to ensure they stay within viewport
                this.repositionToolbarsOnResize();
                // Reposition modals to ensure they stay within viewport
                this.repositionModalsOnResize();
                this.positionCoordinatePointPanel();
                // Keep the adaptive default eraser size aligned with the current viewport.
                this.refreshAdaptiveEraserSize();
                this.syncInteractiveOverlays();
            }, 150); // 150ms debounce delay
        });
        
        // Ctrl+scroll to zoom canvas
        this.setupCanvasZoom();
    
}

window.AboardEventSetupRuntime = {
    setupEventListeners(board) {
        return setupEventListeners.call(board);
    }
};
