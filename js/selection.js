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
        this.backgroundManager = null; // Set later via setBackgroundManager
        
        this.isActive = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedStrokes = [];
        
        // Current selection type and index
        this.selectionType = null; // 'stroke', 'text', 'image', 'group', or 'multi'
        this.selectedIndex = null;
        this.selectedGroupId = null;
        
        // Dragging state
        this.isDragging = false;
        this.hasDragMoved = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartObjectPos = { x: 0, y: 0 };
        // Pointer that started the active drag/resize/rotate gesture. Moves
        // and lift-offs from any other pointer (palm, second finger) must not
        // drive or end the gesture.
        this.activePointerId = null;
        
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
        this.DRAG_MOVE_THRESHOLD = 3;
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
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.multiImageDragStartPositions = []; // Starting positions for images in multi-drag
        this.multiTextDragStartPositions = []; // Starting positions for texts in multi-drag
        this.coordinateDragStartPositions = [];
        this.multiBounds = null;
        this.multiRotation = 0; // Accumulated rotation for multi-select
        this.multiRotationCenter = null;
        this.multiStrokeRotateStart = [];
        this.multiImageRotateStart = [];
        this.multiTextRotateStart = [];
        this.clipboard = null;
        this.layerMenuVisible = false;
        this.layerMenuOutsideListener = null;
        this.layerMenuOutsideListenerAttached = false;
        this.layerMenuPreviouslyFocusedElement = null;
        this.coordinatePositionPreviouslyFocusedElement = null;
        this.selectionColorPresetValues = ['#ef4444', '#f97316', '#eab308', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#111827'];
        this.selectionColorPopoverVisible = false;
        this.selectionColorPopoverPreviouslyFocusedElement = null;
        this.selectionColorPopoverOutsideListener = null;
        this.selectionColorPopoverOutsideListenerAttached = false;
        
        // Create selection controls overlay
        this.createSelectionControls();
    }
    
    setTextManager(textManager) {
        this.textManager = textManager;
    }
    
    setHistoryManager(historyManager) {
        this.historyManager = historyManager;
    }

    setBackgroundManager(backgroundManager) {
        this.backgroundManager = backgroundManager;
    }

    isCoordinateSelection() {
        return this.selectionType === 'coordinate-point' ||
            this.selectionType === 'coordinate-points' ||
            this.selectionType === 'coordinate-line';
    }

    getCoordinateSelectionBounds(options = {}) {
        if (!this.backgroundManager || this.selectedCoordinatePointIds.length === 0) return null;
        return this.backgroundManager.getCoordinateSelectionBounds(
            this.selectedCoordinatePointIds,
            options.padding ?? 10,
            {
                minWidth: 0,
                minHeight: 0,
                ...options
            }
        );
    }

    getSelectedCoordinateGroup() {
        return this.selectedCoordinateGroupId
            ? this.backgroundManager?.getCoordinateGroupById?.(this.selectedCoordinateGroupId) || null
            : null;
    }

    commitCoordinateSelectionChange(saveHistory = true) {
        if (!this.backgroundManager) return;
        if (typeof this.backgroundManager.persistCoordinateOverlayState === 'function') {
            this.backgroundManager.persistCoordinateOverlayState();
        }
        this.backgroundManager.renderCoordinateOverlay();
        if (window.drawingBoard?.savePageBackground) {
            window.drawingBoard.savePageBackground(window.drawingBoard.currentPage);
        }
        if (window.drawingBoard?.updateBackgroundUI) {
            window.drawingBoard.updateBackgroundUI();
        }
        if (saveHistory) {
            this.saveHistory();
            this.hasUnsavedChanges = false;
        }
    }

    isCompoundSelection() {
        return this.selectionType === 'multi' || this.selectionType === 'group';
    }

    getSelectedGroup() {
        return this.selectedGroupId
            ? this.drawingEngine.getGroupById(this.selectedGroupId)
            : null;
    }

    getSelectedObjectIds() {
        const ids = [];
        this.selectedStrokes.forEach(idx => {
            const stroke = this.drawingEngine.strokes[idx];
            if (stroke?.objectId) ids.push(stroke.objectId);
        });
        this.selectedImages.forEach(idx => {
            const img = this.drawingEngine.stampedImages[idx];
            if (img?.objectId) ids.push(img.objectId);
        });
        if (this.textManager) {
            this.selectedTexts.forEach(idx => {
                const textObj = this.textManager.textObjects[idx];
                if (textObj?.objectId) ids.push(textObj.objectId);
            });
        }
        return ids;
    }

    selectionContainsGroupedObjects() {
        return this.getSelectedObjectIds().some(objectId => {
            const ref = this.drawingEngine.getObjectRefById(objectId, this.textManager?.textObjects || []);
            return !!ref?.item?.groupId;
        });
    }

    refreshSelectedGroupMembers() {
        if (this.selectionType !== 'group' || !this.selectedGroupId) return;
        const members = this.drawingEngine.getGroupMembers(this.selectedGroupId, this.textManager?.textObjects || []);
        this.selectedStrokes = members.filter(member => member.type === 'stroke').map(member => member.index);
        this.selectedImages = members.filter(member => member.type === 'image').map(member => member.index);
        this.selectedTexts = members.filter(member => member.type === 'text').map(member => member.index);
    }

    selectGroup(groupId) {
        const group = this.drawingEngine.getGroupById(groupId);
        if (!group) return false;
        this.drawingEngine.deselectStroke();
        this.drawingEngine.deselectImage();
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }
        this.selectionType = 'group';
        this.selectedGroupId = groupId;
        this.selectedIndex = null;
        this.multiRotation = 0;
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.refreshSelectedGroupMembers();
        this.showControls();
        this.redrawWithSelection();
        return true;
    }

    selectObjectById(objectId) {
        const ref = this.drawingEngine.getObjectRefById(objectId, this.textManager?.textObjects || []);
        if (!ref) return false;
        if (ref.item?.groupId) {
            return this.selectGroup(ref.item.groupId);
        }
        if (ref.type === 'stroke') {
            this.selectStroke(ref.index);
            return true;
        }
        if (ref.type === 'image') {
            this.selectImage(ref.index);
            return true;
        }
        if (ref.type === 'text') {
            this.selectText(ref.index);
            return true;
        }
        return false;
    }

    hitImageAtPoint(img, x, y) {
        if (!img) return false;
        const cx = img.x + img.width / 2;
        const cy = img.y + img.height / 2;
        const rot = -(img.rotation || 0) * Math.PI / 180;
        const dx = x - cx;
        const dy = y - cy;
        const localX = dx * Math.cos(rot) - dy * Math.sin(rot) + cx;
        const localY = dx * Math.sin(rot) + dy * Math.cos(rot) + cy;
        return localX >= img.x && localX <= img.x + img.width &&
            localY >= img.y && localY <= img.y + img.height;
    }

    hitTextAtPoint(textObj, index, x, y) {
        const bounds = this.getTextObjectSelectionBounds(index);
        return !!bounds &&
            x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }

    getTopRenderableAtPoint(x, y) {
        const renderables = this.drawingEngine.getRenderableObjects(this.textManager?.textObjects || []);
        for (let i = renderables.length - 1; i >= 0; i--) {
            const renderable = renderables[i];
            if (renderable.type === 'group') {
                const members = [...(renderable.members || [])].sort((a, b) => {
                    if (a.layerOrder === b.layerOrder) {
                        return a.fallbackOrder - b.fallbackOrder;
                    }
                    return a.layerOrder - b.layerOrder;
                });
                for (let j = members.length - 1; j >= 0; j--) {
                    const member = members[j];
                    if (member.type === 'stroke' && this.drawingEngine.isPointNearStroke(x, y, member.item, this.drawingEngine.SELECTION_THRESHOLD)) {
                        return { type: 'group', groupId: renderable.groupId };
                    }
                    if (member.type === 'image' && this.hitImageAtPoint(member.item, x, y)) {
                        return { type: 'group', groupId: renderable.groupId };
                    }
                    if (member.type === 'text' && this.hitTextAtPoint(member.item, member.index, x, y)) {
                        return { type: 'group', groupId: renderable.groupId };
                    }
                }
            } else if (renderable.type === 'stroke' && this.drawingEngine.isPointNearStroke(x, y, renderable.item, this.drawingEngine.SELECTION_THRESHOLD)) {
                return { type: 'stroke', index: renderable.index };
            } else if (renderable.type === 'image' && this.hitImageAtPoint(renderable.item, x, y)) {
                return { type: 'image', index: renderable.index };
            } else if (renderable.type === 'text' && this.hitTextAtPoint(renderable.item, renderable.index, x, y)) {
                return { type: 'text', index: renderable.index };
            }
        }
        return null;
    }

    expandGroupedSelection(foundStrokes, foundImages, foundTexts) {
        const strokeSet = new Set(foundStrokes || []);
        const imageSet = new Set(foundImages || []);
        const textSet = new Set(foundTexts || []);
        const groupIds = new Set();

        strokeSet.forEach(index => {
            const stroke = this.drawingEngine.strokes[index];
            if (stroke?.groupId) groupIds.add(stroke.groupId);
        });
        imageSet.forEach(index => {
            const img = this.drawingEngine.stampedImages[index];
            if (img?.groupId) groupIds.add(img.groupId);
        });
        if (this.textManager) {
            textSet.forEach(index => {
                const textObj = this.textManager.textObjects[index];
                if (textObj?.groupId) groupIds.add(textObj.groupId);
            });
        }

        groupIds.forEach(groupId => {
            const members = this.drawingEngine.getGroupMembers(groupId, this.textManager?.textObjects || []);
            members.forEach(member => {
                if (member.type === 'stroke') strokeSet.add(member.index);
                if (member.type === 'image') imageSet.add(member.index);
                if (member.type === 'text') textSet.add(member.index);
            });
        });

        return {
            strokes: [...strokeSet],
            images: [...imageSet],
            texts: [...textSet],
            groupIds: [...groupIds]
        };
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
                    <div class="rotate-handle" id="selection-rotate-handle" data-i18n-title="imageControls.rotate" aria-label="Rotate">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Rotate 90° button -->
                    <div class="selection-transform-handle" id="selection-rotate90-handle" data-i18n-title="selection.rotate90" aria-label="Rotate 90°" title="Rotate 90°">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M21 8a9 9 0 1 0-2.67 6.33"/>
                        </svg>
                    </div>
                    
                    <!-- Flip horizontal button -->
                    <div class="selection-transform-handle" id="selection-flip-h-handle" data-i18n-title="selection.flipH" aria-label="Flip Horizontal" title="Flip Horizontal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M12 3v18M8 6l-5 6 5 6M16 6l5 6-5 6"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with action buttons -->
                    <div class="image-controls-toolbar selection-action-toolbar">
                        <button id="selection-edit-btn" class="image-control-btn" data-i18n-title="selection.edit" aria-label="Edit" title="Edit" style="display:none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button id="selection-copy-btn" class="image-control-btn" data-i18n-title="selection.copy" aria-label="Copy" title="Copy">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <div id="selection-color-wrapper" class="selection-color-picker-wrapper" style="display:none;">
                            <button id="selection-color-btn" type="button" class="image-control-btn selection-color-btn" data-i18n-title="selection.color" aria-label="Color" title="Color" aria-expanded="false">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3c4.97 0 9 3.58 9 8 0 2.76-1.57 4.91-4.14 5.96-.65.26-1.06.9-1.06 1.6V20a1 1 0 0 1-1 1h-2.5a1.5 1.5 0 0 1-1.5-1.5v-.34a2 2 0 0 0-2-2H8a5 5 0 0 1-5-5c0-5.08 4.03-9.16 9-9.16Z"></path>
                                    <circle cx="7.5" cy="10.5" r="1"></circle>
                                    <circle cx="12" cy="8.5" r="1"></circle>
                                    <circle cx="16.5" cy="10.5" r="1"></circle>
                                </svg>
                            </button>
                            <div id="selection-color-popover" class="selection-color-popover" style="display:none;">
                                <div class="selection-color-presets">
                                    ${this.getSelectionColorPresetMarkup()}
                                </div>
                                <button id="selection-color-picker-toggle-btn" type="button" class="selection-color-picker-toggle" data-i18n="tools.pen.colorPicker">取色器</button>
                                <input id="selection-color-input" type="color" class="selection-color-input" tabindex="-1" aria-hidden="true">
                            </div>
                        </div>
                        <button id="selection-position-btn" class="image-control-btn" data-i18n-title="selection.position" aria-label="Position" title="Position" style="display:none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 3v18"></path>
                                <path d="M3 12h18"></path>
                                <path d="m7 7 5-5 5 5"></path>
                                <path d="m7 17 5 5 5-5"></path>
                            </svg>
                        </button>
                        <div class="selection-layer-menu-wrapper">
                            <button id="selection-layer-btn" class="image-control-btn" data-i18n-title="selection.layer" aria-label="Layer" title="Layer">
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
                        <button id="selection-group-btn" class="image-control-btn" data-i18n-title="selection.group" aria-label="Group" title="Group" style="display:none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="5" height="5" rx="1"></rect>
                                <rect x="16" y="3" width="5" height="5" rx="1"></rect>
                                <rect x="9.5" y="16" width="5" height="5" rx="1"></rect>
                                <circle cx="12" cy="11" r="1.75"></circle>
                                <path d="M8 5.5 10.7 9"></path>
                                <path d="M16 5.5 13.3 9"></path>
                                <path d="M12 16 12 12.75"></path>
                            </svg>
                        </button>
                        <button id="selection-ungroup-btn" class="image-control-btn" data-i18n-title="selection.ungroup" aria-label="Ungroup" title="Ungroup" style="display:none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="11" r="1.75"></circle>
                                <rect x="3" y="3" width="5" height="5" rx="1"></rect>
                                <rect x="16" y="3" width="5" height="5" rx="1"></rect>
                                <rect x="9.5" y="16" width="5" height="5" rx="1"></rect>
                                <path d="M10.8 9.8 8 6.2"></path>
                                <path d="M13.2 9.8 16 6.2"></path>
                                <path d="M12 12.2 12 15.8"></path>
                                <path d="M6.4 6.2 8 6.2 8 7.8"></path>
                                <path d="M17.6 6.2 16 6.2 16 7.8"></path>
                                <path d="M10.5 14.2 12 15.8 13.5 14.2"></path>
                            </svg>
                        </button>
                        <button id="selection-delete-btn" class="image-control-btn image-cancel-btn" data-i18n-title="selection.delete" aria-label="Delete" title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                        <button id="selection-done-btn" class="image-control-btn image-done-btn" data-i18n-title="selection.done" aria-label="Done" title="Done">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div id="selection-coordinate-position-modal" class="modal">
                <div class="modal-content coordinate-position-modal-content">
                    <div class="modal-header">
                        <h2 id="selection-coordinate-position-title" data-i18n="selection.position">位置</h2>
                        <button id="selection-coordinate-position-close-btn" class="modal-close-btn" type="button" data-i18n-title="common.close" title="Close" aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="selection-coordinate-position-list" class="selection-coordinate-position-list"></div>
                        <div class="announcement-buttons">
                            <button id="selection-coordinate-position-cancel-btn" class="announcement-btn secondary-btn" type="button" data-i18n="common.cancel">取消</button>
                            <button id="selection-coordinate-position-save-btn" class="announcement-btn ok-btn" type="button" data-i18n="common.confirm">确定</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('selection-controls-overlay');
        this.controlBox = document.getElementById('selection-controls-box');
        this.layerMenu = document.getElementById('selection-layer-menu');
        this.layerButton = document.getElementById('selection-layer-btn');
        this.rotateHandle = document.getElementById('selection-rotate-handle');
        this.rotate90Handle = document.getElementById('selection-rotate90-handle');
        this.flipHHandle = document.getElementById('selection-flip-h-handle');
        this.toolbar = this.controlBox.querySelector('.selection-action-toolbar');
        this.colorWrapper = document.getElementById('selection-color-wrapper');
        this.colorPopover = document.getElementById('selection-color-popover');
        this.colorInput = document.getElementById('selection-color-input');
        this.colorButton = document.getElementById('selection-color-btn');
        this.coordinatePositionModal = document.getElementById('selection-coordinate-position-modal');
        this.coordinatePositionList = document.getElementById('selection-coordinate-position-list');
        
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

        window.i18n?.applyTranslations?.();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const getEventTargetHelpers = (target) => {
            const closest = typeof target?.closest === 'function'
                ? target.closest.bind(target)
                : () => null;
            const hasClass = (className) => Boolean(target?.classList?.contains?.(className));
            const safeContains = (element) => {
                try {
                    return Boolean(element?.contains?.(target));
                } catch (error) {
                    return false;
                }
            };

            return { closest, hasClass, safeContains };
        };

        // Drag selection box
        this.controlBox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const target = e.target;
            const { closest, hasClass } = getEventTargetHelpers(target);
            if (target === this.controlBox || closest('.image-controls-box') === this.controlBox) {
                if (!hasClass('resize-handle') && 
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.selection-transform-handle') &&
                    !closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const target = e.target;
            const { closest, hasClass } = getEventTargetHelpers(target);
            if (target === this.controlBox || closest('.image-controls-box') === this.controlBox) {
                if (!hasClass('resize-handle') && 
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.selection-transform-handle') &&
                    !closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            const target = e.target;
            const { closest, hasClass } = getEventTargetHelpers(target);
            if (target === this.controlBox || closest('.image-controls-box') === this.controlBox) {
                if (!hasClass('resize-handle') && 
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.selection-transform-handle') &&
                    !closest('.image-controls-toolbar')) {
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
        if (this.rotateHandle) {
            this.rotateHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            this.rotateHandle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            this.rotateHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            }, { passive: false });
        }
        
        // Global mouse/touch events
        const handleMove = (e) => {
            // Only the pointer that started the gesture may drive it; a palm
            // or second finger elsewhere on the screen must be ignored.
            if (e.type === 'pointermove' && this.activePointerId !== null &&
                typeof e.pointerId === 'number' && e.pointerId !== this.activePointerId) {
                return;
            }
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
                // When pointer events started this gesture the pointermove
                // handler above already drives it with per-pointer filtering;
                // running the touch path too would bypass that filter.
                if (this.activePointerId !== null) {
                    return;
                }
                if (this.isDragging) {
                    this.drag(e);
                } else if (this.isResizing) {
                    this.resize(e);
                } else if (this.isRotating) {
                    this.rotate(e);
                }
            }
        }, { passive: false });

        const endGesture = () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
            this.activePointerId = null;
        };

        const isForeignPointer = (e) => (
            this.activePointerId !== null &&
            typeof e.pointerId === 'number' &&
            e.pointerId !== this.activePointerId
        );

        document.addEventListener('mouseup', () => {
            endGesture();
        });

        document.addEventListener('pointerup', (e) => {
            // A palm or second finger lifting must not end the gesture.
            if (isForeignPointer(e)) return;
            endGesture();
        });

        document.addEventListener('touchend', (e) => {
            // While the gesture is pointer-driven, let pointerup own the
            // lifecycle as long as any touch remains on screen.
            if (this.activePointerId !== null && e.touches && e.touches.length > 0) {
                return;
            }
            endGesture();
        });

        // Also handle pointer cancel (e.g., when touch is interrupted)
        document.addEventListener('pointercancel', (e) => {
            if (isForeignPointer(e)) return;
            endGesture();
        });

        document.addEventListener('touchcancel', () => {
            endGesture();
        });

        // Action buttons - need to handle both mousedown and click to prevent event propagation
        const copyBtn = document.getElementById('selection-copy-btn');
        const colorBtn = document.getElementById('selection-color-btn');
        const colorWrapper = this.colorWrapper;
        const colorPopover = this.colorPopover;
        const colorPickerToggleBtn = document.getElementById('selection-color-picker-toggle-btn');
        const positionBtn = document.getElementById('selection-position-btn');
        const colorInput = this.colorInput;
        const deleteBtn = document.getElementById('selection-delete-btn');
        const doneBtn = document.getElementById('selection-done-btn');
        const editBtn = document.getElementById('selection-edit-btn');
        const groupBtn = document.getElementById('selection-group-btn');
        const ungroupBtn = document.getElementById('selection-ungroup-btn');
        const rotate90Handle = this.rotate90Handle;
        const flipHHandle = this.flipHHandle;
        const layerBtn = document.getElementById('selection-layer-btn');
        const layerMenu = document.getElementById('selection-layer-menu');
        const coordinatePositionModal = this.coordinatePositionModal;
        const coordinatePositionCloseBtn = document.getElementById('selection-coordinate-position-close-btn');
        const coordinatePositionCancelBtn = document.getElementById('selection-coordinate-position-cancel-btn');
        const coordinatePositionSaveBtn = document.getElementById('selection-coordinate-position-save-btn');
        
        // Add mousedown/pointerdown handlers to prevent events from propagating to document
        [copyBtn, colorBtn, colorPickerToggleBtn, positionBtn, deleteBtn, doneBtn, editBtn, groupBtn, ungroupBtn, rotate90Handle, flipHHandle, layerBtn].forEach(btn => {
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

        if (colorWrapper) {
            ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach(eventName => {
                colorWrapper.addEventListener(eventName, (e) => {
                    e.stopPropagation();
                }, eventName === 'touchstart' ? { passive: true } : undefined);
            });
        }

        if (colorBtn) {
            colorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleSelectionColorPopover();
            });
        }

        this.configureSelectionColorPopoverAccessibility();
        this.bindSelectionColorPopoverKeyboardSupport();

        if (colorPopover) {
            ['mousedown', 'pointerdown', 'click'].forEach(eventName => {
                colorPopover.addEventListener(eventName, (e) => {
                    e.stopPropagation();
                });
            });
        }

        if (colorPopover) {
            colorPopover.querySelectorAll('.selection-color-swatch').forEach((swatch) => {
                swatch.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const color = swatch.dataset.color;
                    if (!color) return;
                    if (this.applySelectionColor(color)) {
                        this.syncSelectionColorUI(color);
                    }
                    this.hideSelectionColorPopover({ restoreFocus: true });
                });
            });
        }

        if (colorPickerToggleBtn && colorInput) {
            colorPickerToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.syncSelectionColorUI();
                if (typeof colorInput.showPicker === 'function') {
                    colorInput.showPicker();
                } else {
                    colorInput.click();
                }
            });
        }

        if (colorInput) {
            colorInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            colorInput.addEventListener('input', (e) => {
                e.stopPropagation();
                if (this.applySelectionColor(e.target.value)) {
                    this.syncSelectionColorUI(e.target.value);
                }
            });
            colorInput.addEventListener('change', (e) => {
                e.stopPropagation();
                if (this.applySelectionColor(e.target.value)) {
                    this.syncSelectionColorUI(e.target.value);
                }
                this.hideSelectionColorPopover({ restoreFocus: true });
            });
        }

        if (positionBtn) {
            positionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.openCoordinatePositionEditor();
            });
        }
        
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

        if (groupBtn) {
            groupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.groupSelection();
            });
        }

        if (ungroupBtn) {
            ungroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.ungroupSelection();
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

        this.configureLayerMenuAccessibility();
        this.bindLayerMenuKeyboardSupport();

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
                const { safeContains } = getEventTargetHelpers(e.target);
                if (safeContains(this.layerMenu) || safeContains(this.layerButton)) return;
                this.hideLayerMenu();
            };
        }
        if (!this.layerMenuOutsideListenerAttached) {
            document.addEventListener('mousedown', this.layerMenuOutsideListener);
            document.addEventListener('pointerdown', this.layerMenuOutsideListener);
            document.addEventListener('touchstart', this.layerMenuOutsideListener, { passive: true });
            this.layerMenuOutsideListenerAttached = true;
        }

        if (!this.selectionColorPopoverOutsideListener) {
            this.selectionColorPopoverOutsideListener = (e) => {
                if (!this.selectionColorPopoverVisible || !this.colorWrapper) return;
                const { safeContains } = getEventTargetHelpers(e.target);
                if (safeContains(this.colorWrapper)) return;
                this.hideSelectionColorPopover();
            };
        }
        if (!this.selectionColorPopoverOutsideListenerAttached) {
            document.addEventListener('mousedown', this.selectionColorPopoverOutsideListener);
            document.addEventListener('pointerdown', this.selectionColorPopoverOutsideListener);
            document.addEventListener('touchstart', this.selectionColorPopoverOutsideListener, { passive: true });
            this.selectionColorPopoverOutsideListenerAttached = true;
        }

        this.configureCoordinatePositionDialog();
        this.bindCoordinatePositionDialogDismissal();

        [coordinatePositionCloseBtn, coordinatePositionCancelBtn].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.closeCoordinatePositionEditor();
            });
        });

        if (coordinatePositionSaveBtn) {
            coordinatePositionSaveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.applyCoordinatePositionEditor();
            });
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

    showLayerMenu(focusIndex = 0) {
        if (!this.layerMenu) return;
        this.configureLayerMenuAccessibility();
        if (!this.layerMenuVisible) {
            this.layerMenuPreviouslyFocusedElement = this.getFocusableElement();
        }
        this.layerMenu.classList.add('show');
        this.layerMenuVisible = true;
        this.layerButton?.setAttribute('aria-expanded', 'true');
        this.scheduleCoordinatePositionFrame(() => {
            this.focusLayerMenuItem(focusIndex) || this.layerMenu?.focus?.();
        });
    }

    hideLayerMenu({ restoreFocus = false } = {}) {
        if (!this.layerMenu) return;
        this.layerMenu.classList.remove('show');
        this.layerMenuVisible = false;
        this.layerButton?.setAttribute('aria-expanded', 'false');
        const restoreFocusTarget = restoreFocus ? this.layerMenuPreviouslyFocusedElement : null;
        this.layerMenuPreviouslyFocusedElement = null;
        if (restoreFocusTarget) {
            this.scheduleCoordinatePositionFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        }
    }

    getFocusableElement() {
        return document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
    }

    getLayerMenuItems() {
        return this.layerMenu
            ? Array.from(this.layerMenu.querySelectorAll('[data-layer-action]'))
            : [];
    }

    focusLayerMenuItem(index = 0) {
        const items = this.getLayerMenuItems();
        if (!items.length) return null;
        const normalizedIndex = Math.min(Math.max(index, 0), items.length - 1);
        const target = items[normalizedIndex];
        target?.focus?.();
        return target || null;
    }

    getSelectionColorSwatches() {
        return this.colorPopover
            ? Array.from(this.colorPopover.querySelectorAll('.selection-color-swatch'))
            : [];
    }

    focusSelectionColorSwatch(index = 0) {
        const swatches = this.getSelectionColorSwatches();
        if (!swatches.length) return null;
        const normalizedIndex = Math.min(Math.max(index, 0), swatches.length - 1);
        const target = swatches[normalizedIndex];
        target?.focus?.();
        return target || null;
    }

    scheduleCoordinatePositionFrame(callback) {
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(callback);
            return;
        }
        callback();
    }

    configureSelectionColorPopoverAccessibility() {
        if (this.colorButton) {
            this.colorButton.setAttribute('aria-controls', 'selection-color-popover');
            this.colorButton.setAttribute('aria-expanded', this.selectionColorPopoverVisible ? 'true' : 'false');
        }
        if (this.colorPopover) {
            this.colorPopover.setAttribute('role', 'group');
            this.colorPopover.setAttribute('aria-label', 'Selection color options');
            this.colorPopover.tabIndex = -1;
        }
    }

    bindSelectionColorPopoverKeyboardSupport() {
        if (!this.colorButton || !this.colorPopover) {
            return;
        }

        if (this.colorButton.dataset.keyboardBindingsInitialized !== 'true') {
            this.colorButton.dataset.keyboardBindingsInitialized = 'true';
            this.colorButton.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    this.toggleSelectionColorPopover(true, { focusIndex: 0 });
                } else if (event.key === 'Escape' && this.selectionColorPopoverVisible) {
                    event.preventDefault();
                    this.hideSelectionColorPopover({ restoreFocus: true });
                }
            });
        }

        if (this.colorPopover.dataset.keyboardBindingsInitialized === 'true') {
            return;
        }

        this.colorPopover.dataset.keyboardBindingsInitialized = 'true';
        this.colorPopover.addEventListener('keydown', (event) => {
            const swatches = this.getSelectionColorSwatches();
            if (!swatches.length) return;

            const currentIndex = swatches.indexOf(event.target);
            if (event.key === 'Escape') {
                event.preventDefault();
                this.hideSelectionColorPopover({ restoreFocus: true });
                return;
            }
            if (event.key === 'Home') {
                event.preventDefault();
                this.focusSelectionColorSwatch(0);
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                this.focusSelectionColorSwatch(swatches.length - 1);
                return;
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % swatches.length : 0;
                this.focusSelectionColorSwatch(nextIndex);
                return;
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                const previousIndex = currentIndex >= 0 ? (currentIndex - 1 + swatches.length) % swatches.length : swatches.length - 1;
                this.focusSelectionColorSwatch(previousIndex);
            }
        });
    }

    configureLayerMenuAccessibility() {
        if (this.layerButton) {
            this.layerButton.setAttribute('aria-haspopup', 'menu');
            this.layerButton.setAttribute('aria-controls', 'selection-layer-menu');
            this.layerButton.setAttribute('aria-expanded', this.layerMenuVisible ? 'true' : 'false');
        }
        if (this.layerMenu) {
            this.layerMenu.setAttribute('role', 'menu');
            this.layerMenu.tabIndex = -1;
        }
        this.getLayerMenuItems().forEach((item) => {
            item.setAttribute('role', 'menuitem');
        });
    }

    bindLayerMenuKeyboardSupport() {
        if (!this.layerButton || !this.layerMenu) {
            return;
        }

        if (this.layerButton.dataset.keyboardBindingsInitialized !== 'true') {
            this.layerButton.dataset.keyboardBindingsInitialized = 'true';
            this.layerButton.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.showLayerMenu();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    const lastIndex = Math.max(this.getLayerMenuItems().length - 1, 0);
                    this.showLayerMenu(lastIndex);
                } else if (event.key === 'Escape' && this.layerMenuVisible) {
                    event.preventDefault();
                    this.hideLayerMenu({ restoreFocus: true });
                }
            });
        }

        if (this.layerMenu.dataset.keyboardBindingsInitialized === 'true') {
            return;
        }

        this.layerMenu.dataset.keyboardBindingsInitialized = 'true';
        this.layerMenu.addEventListener('keydown', (event) => {
            const items = this.getLayerMenuItems();
            if (!items.length) return;

            const currentIndex = items.indexOf(event.target);
            if (event.key === 'Escape') {
                event.preventDefault();
                this.hideLayerMenu({ restoreFocus: true });
                return;
            }
            if (event.key === 'Home') {
                event.preventDefault();
                this.focusLayerMenuItem(0);
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                this.focusLayerMenuItem(items.length - 1);
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
                this.focusLayerMenuItem(nextIndex);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                const previousIndex = currentIndex >= 0 ? (currentIndex - 1 + items.length) % items.length : items.length - 1;
                this.focusLayerMenuItem(previousIndex);
            }
        });
    }

    configureCoordinatePositionDialog() {
        if (!this.coordinatePositionModal) return;
        this.coordinatePositionModal.setAttribute('role', 'dialog');
        this.coordinatePositionModal.setAttribute('aria-modal', 'true');
        this.coordinatePositionModal.setAttribute('aria-labelledby', 'selection-coordinate-position-title');
        this.coordinatePositionModal.setAttribute('aria-describedby', 'selection-coordinate-position-list');
        this.coordinatePositionModal.tabIndex = -1;
    }

    bindCoordinatePositionDialogDismissal() {
        if (!this.coordinatePositionModal || this.coordinatePositionModal.dataset.keyboardBindingsInitialized === 'true') {
            return;
        }

        this.coordinatePositionModal.dataset.keyboardBindingsInitialized = 'true';
        this.coordinatePositionModal.addEventListener('click', (event) => {
            if (event.target === this.coordinatePositionModal) {
                this.closeCoordinatePositionEditor();
            }
        });
        this.coordinatePositionModal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeCoordinatePositionEditor();
            }
        });
    }

    updateLayerMenuVisibility() {
        if (!this.layerButton) return;
        const shouldShowLayerButton = !!this.selectionType &&
            (this.selectionType === 'group' ||
                (!this.isCompoundSelection() &&
                    (this.selectionType !== 'background' || this.backgroundManager?.isBackgroundImageOutsideCanvas?.())));
        this.layerButton.style.display = shouldShowLayerButton ? '' : 'none';
        if (!shouldShowLayerButton) {
            this.hideLayerMenu();
        }
    }

    applyLayerAction(action) {
        if (!this.hasSelection()) return;

        if (this.selectionType === 'background') {
            if (!this.backgroundManager?.isBackgroundImageOutsideCanvas?.()) return;
            const changed = this.backgroundManager.applyOutsideLayerAction?.(action, this.drawingEngine, this.textManager?.textObjects || []);
            this.hideLayerMenu({ restoreFocus: true });
            this.updateControlBox();
            if (changed) {
                this.saveHistory();
            }
            return;
        }

        const renderables = this.drawingEngine.getRenderableObjects(this.textManager?.textObjects || []);
        const selectedRenderable = this.selectionType === 'group'
            ? renderables.find(renderable => renderable.type === 'group' && renderable.groupId === this.selectedGroupId)
            : renderables.find(renderable =>
                renderable.type === this.selectionType && renderable.index === this.selectedIndex
            );

        if (!selectedRenderable) return;

        const currentIndex = renderables.indexOf(selectedRenderable);
        let targetIndex = currentIndex;

        switch (action) {
            case 'bring-to-front':
                targetIndex = renderables.length - 1;
                break;
            case 'send-to-back':
                targetIndex = 0;
                break;
            case 'move-forward':
                targetIndex = Math.min(renderables.length - 1, currentIndex + 1);
                break;
            case 'move-backward':
                targetIndex = Math.max(0, currentIndex - 1);
                break;
            default:
                return;
        }

        if (targetIndex === currentIndex) {
            this.hideLayerMenu({ restoreFocus: true });
            return;
        }

        renderables.splice(currentIndex, 1);
        renderables.splice(targetIndex, 0, selectedRenderable);
        this.drawingEngine.normalizeTopLevelLayerOrders(this.textManager?.textObjects || [], renderables);
        this.hideLayerMenu({ restoreFocus: true });
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
    
    getCanvasScales() {
        const rect = this.canvas.getBoundingClientRect();
        return {
            scaleX: rect.width / (this.canvas.offsetWidth || rect.width || 1),
            scaleY: rect.height / (this.canvas.offsetHeight || rect.height || 1)
        };
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

        const target = this.getTopRenderableAtPoint(coords.x, coords.y);
        if (target) {
            if (target.type === 'group') {
                this.selectGroup(target.groupId);
            } else if (target.type === 'stroke') {
                this.selectStroke(target.index);
            } else if (target.type === 'image') {
                this.selectImage(target.index);
            } else if (target.type === 'text') {
                this.selectText(target.index);
            }
            return true;
        }

        const coordinateTarget = this.backgroundManager?.hitTestCoordinateOverlay?.(coords.x, coords.y);
        if (coordinateTarget) {
            if (coordinateTarget.type === 'point') {
                return this.selectCoordinatePoints([coordinateTarget.pointId]);
            }
            if (coordinateTarget.type === 'line') {
                return this.selectCoordinatePoints(
                    coordinateTarget.pointIds || this.backgroundManager.getCoordinatePointIds(),
                    { line: true }
                );
            }
        }

        if (this.backgroundManager?.isPointInBackgroundImage?.(coords.x, coords.y)) {
            this.selectBackgroundImage();
            return true;
        }
        
        // If not on any object, deselect everything
        this.clearSelection();
        
        return false;
    }
    
    selectStroke(index) {
        this.selectionType = 'stroke';
        this.selectedIndex = index;
        this.selectedGroupId = null;
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.drawingEngine.selectStroke(index);
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectText(index) {
        this.selectionType = 'text';
        this.selectedIndex = index;
        this.selectedGroupId = null;
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        if (this.textManager) {
            this.textManager.selectedTextIndex = index;
        }
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectImage(index) {
        this.selectionType = 'image';
        this.selectedIndex = index;
        this.selectedGroupId = null;
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.drawingEngine.selectImage(index);
        this.showControls();
        this.redrawWithSelection();
    }

    selectCoordinatePoints(pointIds, options = {}) {
        if (!this.backgroundManager || !Array.isArray(pointIds) || pointIds.length === 0) return false;
        const validPointIds = new Set(this.backgroundManager.getCoordinatePointIds?.() || []);
        const uniqueIds = [...new Set(pointIds.filter(pointId => validPointIds.has(pointId)))];
        if (uniqueIds.length === 0) return false;
        this.drawingEngine.deselectStroke();
        this.drawingEngine.deselectImage();
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }

        this.selectionType = options.line
            ? 'coordinate-line'
            : (uniqueIds.length === 1 ? 'coordinate-point' : 'coordinate-points');
        this.selectedIndex = null;
        this.selectedGroupId = null;
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.selectedCoordinatePointIds = uniqueIds;
        this.selectedCoordinateGroupId = options.groupId
            || this.backgroundManager.findCoordinateGroupByPointIds?.(uniqueIds, { line: options.line === true })?.id
            || null;
        this.showControls();
        this.redrawWithSelection();
        return true;
    }

    selectBackgroundImage() {
        if (!this.backgroundManager?.hasBackgroundImage?.()) return;
        this.drawingEngine.deselectStroke();
        this.drawingEngine.deselectImage();
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }
        this.selectionType = 'background';
        this.selectedIndex = null;
        this.selectedGroupId = null;
        this.selectedStrokes = [];
        this.selectedImages = [];
        this.selectedTexts = [];
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.showControls();
        this.redrawWithSelection();
    }

    getSelectionColorPresetMarkup() {
        return this.selectionColorPresetValues.map((color) => `
            <button
                type="button"
                class="selection-color-swatch"
                data-color="${color}"
                title="${color}"
                aria-label="${color}"
                style="--selection-swatch-color: ${color};"
            ></button>
        `).join('');
    }

    getSelectedCoordinateColor() {
        if (!this.isCoordinateSelection()) {
            return '#2563eb';
        }

        if (this.selectionType === 'coordinate-line') {
            return this.backgroundManager?.getCoordinateOverlayState?.().lineColor || '#2563eb';
        }

        return this.backgroundManager?.getCoordinatePointEntries?.(this.selectedCoordinatePointIds)?.[0]?.color || '#2563eb';
    }

    syncSelectionColorUI(color = this.getSelectedCoordinateColor()) {
        if (!color) return;
        const normalizedColor = String(color).trim().toLowerCase();

        if (this.colorInput) {
            this.colorInput.value = normalizedColor;
        }

        if (this.colorButton) {
            this.colorButton.style.setProperty('--selection-color-preview', normalizedColor);
        }

        if (this.colorPopover) {
            this.colorPopover.querySelectorAll('.selection-color-swatch').forEach((swatch) => {
                swatch.classList.toggle('active', String(swatch.dataset.color || '').trim().toLowerCase() === normalizedColor);
            });
        }
    }

    toggleSelectionColorPopover(force, {
        restoreFocus = false,
        focusIndex = null
    } = {}) {
        if (!this.colorPopover || !this.colorWrapper || !this.colorButton) return false;

        const wasVisible = this.selectionColorPopoverVisible;
        const nextVisible = this.isCoordinateSelection() && (typeof force === 'boolean'
            ? force
            : !this.selectionColorPopoverVisible);

        this.configureSelectionColorPopoverAccessibility();
        if (nextVisible && !wasVisible) {
            this.selectionColorPopoverPreviouslyFocusedElement = this.getFocusableElement();
        }
        this.selectionColorPopoverVisible = nextVisible;
        this.colorWrapper.classList.toggle('show-color-popover', nextVisible);
        this.colorPopover.style.display = nextVisible ? 'flex' : 'none';
        this.colorButton.setAttribute('aria-expanded', nextVisible ? 'true' : 'false');

        if (nextVisible) {
            this.syncSelectionColorUI();
            if (typeof focusIndex === 'number') {
                this.scheduleCoordinatePositionFrame(() => {
                    this.focusSelectionColorSwatch(focusIndex) || this.colorPopover?.focus?.();
                });
            }
        } else {
            const restoreFocusTarget = restoreFocus ? this.selectionColorPopoverPreviouslyFocusedElement : null;
            this.selectionColorPopoverPreviouslyFocusedElement = null;
            if (restoreFocusTarget) {
                this.scheduleCoordinatePositionFrame(() => {
                    restoreFocusTarget?.focus?.();
                });
            }
        }

        return nextVisible;
    }

    hideSelectionColorPopover(options = {}) {
        this.toggleSelectionColorPopover(false, options);
    }
    
    showControls() {
        this.overlay.style.display = 'block';
        this.controlBox.classList.toggle('text-selection-only', this.selectionType === 'text');
        this.controlBox.classList.toggle('coordinate-selection-only', this.isCoordinateSelection());
        this.hideLayerMenu();
        this.updateLayerMenuVisibility();
        this.backgroundManager?.renderCoordinateOverlay?.();
        // Show edit button only for text selections
        const editBtn = document.getElementById('selection-edit-btn');
        const colorWrapper = this.colorWrapper;
        const positionBtn = document.getElementById('selection-position-btn');
        const copyBtn = document.getElementById('selection-copy-btn');
        const groupBtn = document.getElementById('selection-group-btn');
        const ungroupBtn = document.getElementById('selection-ungroup-btn');
        if (editBtn) {
            editBtn.style.display = (this.selectionType === 'text') ? '' : 'none';
        }
        if (colorWrapper) {
            colorWrapper.style.display = this.isCoordinateSelection() ? '' : 'none';
        }
        if (positionBtn) {
            positionBtn.style.display = this.isCoordinateSelection() ? '' : 'none';
        }
        if (copyBtn) {
            copyBtn.style.display = (this.selectionType === 'background' || this.isCoordinateSelection()) ? 'none' : '';
        }
        if (groupBtn) {
            const totalSelected = this.selectedStrokes.length + this.selectedImages.length + this.selectedTexts.length;
            const shouldShowCoordinateGroup = this.isCoordinateSelection() &&
                this.selectedCoordinatePointIds.length > 1 &&
                !this.selectedCoordinateGroupId;
            groupBtn.style.display = (shouldShowCoordinateGroup || (!this.isCoordinateSelection() && this.isCompoundSelection() &&
                totalSelected > 1 &&
                !this.selectionContainsGroupedObjects())) ? '' : 'none';
        }
        if (ungroupBtn) {
            const shouldShowCoordinateUngroup = this.isCoordinateSelection() && !!this.selectedCoordinateGroupId;
            ungroupBtn.style.display = (shouldShowCoordinateUngroup || (!this.isCoordinateSelection() && this.selectionType === 'group')) ? '' : 'none';
        }
        if (this.isCoordinateSelection()) {
            this.syncSelectionColorUI();
        } else {
            this.hideSelectionColorPopover();
        }
        this.updateControlBox();
    }
    
    hideControls() {
        this.overlay.style.display = 'none';
        this.controlBox.classList.remove('text-selection-only');
        this.controlBox.classList.remove('coordinate-selection-only');
        this.hideLayerMenu();
        this.hideSelectionColorPopover();
        this.closeCoordinatePositionEditor(false);
        this.backgroundManager?.renderCoordinateOverlay?.();
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    positionCoordinateSelectionToolbar({ boxLeft, boxTop, boxWidth, boxHeight, toolbarWidth, toolbarHeight, sideGap, inset }) {
        if (!this.toolbar) return;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const viewportInset = Math.max(12, inset + 4);
        const centeredTop = this.clamp(
            boxTop + (boxHeight / 2) - (toolbarHeight / 2),
            viewportInset,
            Math.max(viewportInset, viewportHeight - toolbarHeight - viewportInset)
        );
        const rightLeft = boxLeft + boxWidth + sideGap;
        const leftLeft = boxLeft - sideGap - toolbarWidth;
        const fitsRight = rightLeft + toolbarWidth <= viewportWidth - viewportInset;
        const fitsLeft = leftLeft >= viewportInset;

        this.toolbar.classList.add('coordinate-toolbar-side');
        this.toolbar.style.display = 'flex';
        this.toolbar.style.flexDirection = 'row';
        this.toolbar.style.flexWrap = 'nowrap';
        this.toolbar.style.justifyContent = 'center';
        this.toolbar.style.alignItems = 'center';
        this.toolbar.style.justifyItems = '';
        this.toolbar.style.gridTemplateColumns = '';
        this.toolbar.style.width = 'auto';
        this.toolbar.style.bottom = 'auto';
        this.toolbar.style.right = 'auto';

        if (fitsRight || !fitsLeft) {
            this.toolbar.style.left = `${boxWidth + sideGap}px`;
            this.toolbar.style.top = `${centeredTop - boxTop}px`;
            this.toolbar.style.transform = 'translateY(-50%)';
            return;
        }

        if (fitsLeft) {
            this.toolbar.style.left = `${-sideGap}px`;
            this.toolbar.style.top = `${centeredTop - boxTop}px`;
            this.toolbar.style.transform = 'translate(-100%, -50%)';
            return;
        }

        const centeredLeft = this.clamp(
            boxLeft + (boxWidth / 2) - (toolbarWidth / 2),
            viewportInset,
            Math.max(viewportInset, viewportWidth - toolbarWidth - viewportInset)
        );
        this.toolbar.style.left = `${centeredLeft - boxLeft}px`;
        this.toolbar.style.top = `${boxHeight + sideGap}px`;
        this.toolbar.style.transform = 'translateX(0)';
    }

    updateAdaptiveControlsLayout(boxWidth, boxHeight, boxLeft = null, boxTop = null) {
        const safeWidth = Math.max(boxWidth, 1);
        const safeHeight = Math.max(boxHeight, 1);
        const minSide = Math.max(Math.min(safeWidth, safeHeight), 1);

        const resizeHandleSize = this.clamp(minSide * 0.18, 10, 12);
        this.controlBox.style.setProperty('--resize-handle-size', `${resizeHandleSize}px`);
        this.controlBox.style.setProperty('--resize-handle-offset', `${-(resizeHandleSize / 2)}px`);

        const floatingSize = this.clamp(minSide * 0.28, 20, 36);
        const floatingIconSize = this.clamp(floatingSize * 0.56, 12, 20);
        const floatingGap = this.clamp(floatingSize * 0.2, 4, 10);
        const inset = this.clamp(minSide * 0.08, 4, 10);
        const outsideTop = safeHeight >= floatingSize * 2.5 ? -(floatingSize + 8) : inset;
        const insideTop = inset;
        const rowSpan = floatingSize * 3 + floatingGap * 2;
        const doubleSpan = floatingSize * 2 + floatingGap;
        const centerX = safeWidth / 2;
        let leftPosition;
        let centerPosition;
        let rightPosition;
        if (safeWidth >= rowSpan + inset * 2) {
            leftPosition = { left: centerX - (floatingSize + floatingGap), top: outsideTop };
            centerPosition = { left: centerX, top: outsideTop };
            rightPosition = { left: centerX + (floatingSize + floatingGap), top: outsideTop };
        } else if (safeWidth >= doubleSpan + inset * 2) {
            centerPosition = { left: centerX, top: outsideTop };
            leftPosition = { left: centerX - ((floatingSize + floatingGap) / 2), top: insideTop };
            rightPosition = { left: centerX + ((floatingSize + floatingGap) / 2), top: insideTop };
        } else {
            const sideOffset = this.clamp(floatingSize * 0.75, floatingSize * 0.55, Math.max(floatingSize * 0.75, (safeWidth / 2) - (floatingSize / 2)));
            centerPosition = { left: centerX, top: insideTop };
            leftPosition = { left: this.clamp(centerX - sideOffset, floatingSize / 2, safeWidth - floatingSize / 2), top: insideTop + floatingSize + floatingGap };
            rightPosition = { left: this.clamp(centerX + sideOffset, floatingSize / 2, safeWidth - floatingSize / 2), top: insideTop + floatingSize + floatingGap };
        }

        [
            { element: this.rotate90Handle, position: leftPosition },
            { element: this.rotateHandle, position: centerPosition },
            { element: this.flipHHandle, position: rightPosition }
        ].forEach(({ element, position }) => {
            if (!element || !position) return;

            element.style.left = `${position.left}px`;
            element.style.top = `${position.top}px`;
            element.style.width = `${floatingSize}px`;
            element.style.height = `${floatingSize}px`;
            element.style.setProperty('--handle-connector-top', `${floatingSize}px`);
            element.style.setProperty('--handle-connector-height', `${Math.max(8, Math.round(floatingSize * 0.35))}px`);

            const icon = element.querySelector('svg');
            if (icon) {
                icon.style.width = `${floatingIconSize}px`;
                icon.style.height = `${floatingIconSize}px`;
            }
        });

        this.controlBox.style.setProperty('--floating-control-size', `${floatingSize}px`);
        this.controlBox.style.setProperty('--floating-control-icon-size', `${floatingIconSize}px`);

        if (!this.toolbar) return;

        const toolbarItems = Array.from(this.toolbar.children).filter((item) => {
            if (getComputedStyle(item).display === 'none') return false;
            if (item.classList.contains('selection-layer-menu-wrapper')) {
                const trigger = item.querySelector('.image-control-btn');
                return !!trigger && getComputedStyle(trigger).display !== 'none';
            }
            return true;
        });
        const toolbarButtons = Array.from(this.toolbar.querySelectorAll('.image-control-btn'));
        const visibleCount = Math.max(toolbarItems.length, 1);
        const isCoordinateSelection = this.isCoordinateSelection();
        const toolbarButtonSize = this.clamp(
            Math.min(safeWidth * 0.28, minSide * 0.56),
            isCoordinateSelection ? 30 : 34,
            isCoordinateSelection ? 42 : 52
        );
        const toolbarGap = this.clamp(toolbarButtonSize * (isCoordinateSelection ? 0.14 : 0.18), isCoordinateSelection ? 4 : 6, isCoordinateSelection ? 8 : 10);
        const toolbarPaddingX = this.clamp(toolbarButtonSize * (isCoordinateSelection ? 0.18 : 0.24), isCoordinateSelection ? 6 : 8, isCoordinateSelection ? 10 : 14);
        const toolbarPaddingY = this.clamp(toolbarButtonSize * (isCoordinateSelection ? 0.14 : 0.18), isCoordinateSelection ? 5 : 6, isCoordinateSelection ? 9 : 12);
        const toolbarHorizontalWidth = (toolbarButtonSize * visibleCount) + (toolbarGap * Math.max(visibleCount - 1, 0)) + toolbarPaddingX * 2;
        const toolbarGridColumns = visibleCount >= 4 ? 3 : 2;
        const toolbarGridWidth = (toolbarButtonSize * Math.min(visibleCount, toolbarGridColumns)) + (toolbarGap * Math.max(Math.min(visibleCount, toolbarGridColumns) - 1, 0)) + toolbarPaddingX * 2;

        toolbarButtons.forEach((button) => {
            button.style.width = `${toolbarButtonSize}px`;
            button.style.height = `${toolbarButtonSize}px`;

            const icon = button.querySelector('svg');
            if (icon) {
                const toolbarIconSize = this.clamp(toolbarButtonSize * 0.48, 16, 24);
                icon.style.width = `${toolbarIconSize}px`;
                icon.style.height = `${toolbarIconSize}px`;
            }
        });

        this.controlBox.style.setProperty('--toolbar-button-size', `${toolbarButtonSize}px`);
        this.controlBox.style.setProperty('--toolbar-gap', `${toolbarGap}px`);
        this.controlBox.style.setProperty('--toolbar-padding-x', `${toolbarPaddingX}px`);
        this.controlBox.style.setProperty('--toolbar-padding-y', `${toolbarPaddingY}px`);

        this.toolbar.classList.toggle('coordinate-toolbar-side', isCoordinateSelection);
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const toolbarViewportMaxWidth = Math.max(220, viewportWidth - 24);
        const canKeepHorizontal = toolbarHorizontalWidth <= toolbarViewportMaxWidth || visibleCount <= 2;

        this.toolbar.style.display = 'flex';
        this.toolbar.style.flexDirection = 'row';
        this.toolbar.style.flexWrap = 'nowrap';
        this.toolbar.style.justifyContent = 'center';
        this.toolbar.style.alignItems = 'center';
        this.toolbar.style.justifyItems = '';
        this.toolbar.style.gridTemplateColumns = '';
        this.toolbar.style.width = 'auto';
        this.toolbar.style.maxWidth = isCoordinateSelection ? 'none' : `${toolbarViewportMaxWidth}px`;

        if (isCoordinateSelection && Number.isFinite(boxLeft) && Number.isFinite(boxTop)) {
            const toolbarHeight = toolbarButtonSize + toolbarPaddingY * 2;
            const toolbarWidth = toolbarHorizontalWidth;
            const sideGap = Math.max(12, toolbarPaddingX + 6);
            this.positionCoordinateSelectionToolbar({
                boxLeft,
                boxTop,
                boxWidth: safeWidth,
                boxHeight: safeHeight,
                toolbarWidth,
                toolbarHeight,
                sideGap,
                inset
            });
            return;
        }

        this.toolbar.style.left = `${centerX}px`;
        this.toolbar.style.top = 'auto';
        this.toolbar.style.right = 'auto';
        this.toolbar.style.bottom = safeHeight >= toolbarButtonSize * 2.5
            ? `${-(toolbarButtonSize + toolbarPaddingY + 10)}px`
            : `${inset}px`;
        this.toolbar.style.transform = 'translateX(-50%)';

        if (!isCoordinateSelection && !canKeepHorizontal) {
            this.toolbar.style.bottom = `${inset}px`;
            if (toolbarGridWidth <= toolbarViewportMaxWidth && visibleCount > 4) {
                this.toolbar.style.display = 'grid';
                this.toolbar.style.gridTemplateColumns = `repeat(${toolbarGridColumns}, minmax(0, 1fr))`;
                this.toolbar.style.justifyItems = 'center';
                this.toolbar.style.width = `${Math.min(toolbarViewportMaxWidth, toolbarGridWidth)}px`;
            } else {
                this.toolbar.style.flexDirection = 'column';
            }
        }
    }
    
    updateControlBox() {
        if (this.selectionType === null) return;
        if (this.selectionType === 'group') {
            this.refreshSelectedGroupMembers();
        }
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && !this.isCoordinateSelection() && this.selectedIndex === null) return;
        
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            bounds = {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height
            };
            rotation = transform.rotation || 0;
        } else if (this.isCoordinateSelection()) {
            bounds = this.getCoordinateSelectionBounds();
            rotation = 0;
        } else if (this.isCompoundSelection()) {
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

        this.updateAdaptiveControlsLayout(actualWidth, actualHeight, actualX, actualY);
    }
    
    // Drag handling
    startDrag(e) {
        if (this.isCompoundSelection()) {
            // Multi-select drag
        } else if (this.selectionType !== 'background' && !this.isCoordinateSelection() && this.selectedIndex === null) {
            return;
        }
        
        e.preventDefault();
        if (this.isDragging || this.isResizing || this.isRotating) {
            // A gesture is already in progress — a second pointer landing on
            // the box (palm) must not restart the drag and steal ownership.
            return;
        }
        this.isDragging = true;
        if (typeof e.pointerId === 'number') {
            this.activePointerId = e.pointerId;
        }
        this.dragStartPos = this.getClientPos(e);
        this.hasDragMoved = false;

        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            const bounds = stroke ? this.drawingEngine.getStrokeBounds(stroke) : null;
            if (!bounds) {
                this.isDragging = false;
                return;
            }
            this.dragStartObjectPos = { x: bounds.x, y: bounds.y };
            // Store original positions
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) {
                this.isDragging = false;
                return;
            }
            this.dragStartObjectPos = { x: textObj.x, y: textObj.y };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) {
                this.isDragging = false;
                return;
            }
            this.dragStartObjectPos = { x: img.x, y: img.y };
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) {
                this.isDragging = false;
                return;
            }
            this.dragStartObjectPos = { x: transform.x, y: transform.y };
        } else if (this.isCoordinateSelection()) {
            this.coordinateDragStartPositions = this.backgroundManager
                ? this.backgroundManager.getCoordinateOverlayState().points
                    .filter(point => this.selectedCoordinatePointIds.includes(point.id))
                    .map(point => ({ id: point.id, x: point.x, y: point.y }))
                : [];
            if (this.coordinateDragStartPositions.length === 0) {
                this.isDragging = false;
                return;
            }
        } else if (this.isCompoundSelection()) {
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
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && !this.isCoordinateSelection() && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const rect = this.canvas.getBoundingClientRect();
        
        // Convert screen delta to canvas coordinate delta
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        const deltaX = (pos.x - this.dragStartPos.x) * scaleX;
        const deltaY = (pos.y - this.dragStartPos.y) * scaleY;

        if (!this.hasDragMoved) {
            const screenDeltaX = pos.x - this.dragStartPos.x;
            const screenDeltaY = pos.y - this.dragStartPos.y;
            const threshold = this.DRAG_MOVE_THRESHOLD || 3;
            if (Math.hypot(screenDeltaX, screenDeltaY) < threshold) {
                return;
            }
            this.hasDragMoved = true;
        }
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            for (let point of stroke.points) {
                if (point.originalX !== undefined) {
                    point.x = point.originalX + deltaX;
                    point.y = point.originalY + deltaY;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return;
            textObj.x = this.dragStartObjectPos.x + deltaX;
            textObj.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            img.x = this.dragStartObjectPos.x + deltaX;
            img.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                x: this.dragStartObjectPos.x + deltaX,
                y: this.dragStartObjectPos.y + deltaY
            });
        } else if (this.isCoordinateSelection()) {
            const unitSize = this.backgroundManager?.getCoordinateUnitSize?.() || 1;
            const deltaMathX = deltaX / unitSize;
            const deltaMathY = -deltaY / unitSize;
            this.backgroundManager?.updateCoordinatePoints(
                this.coordinateDragStartPositions.map(point => ({
                    id: point.id,
                    x: point.x + deltaMathX,
                    y: point.y + deltaMathY
                })),
                { persist: false }
            );
        } else if (this.isCompoundSelection()) {
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
            const didMove = !!this.hasDragMoved;
            this.isDragging = false;
            this.hasDragMoved = false;
            if (didMove) {
                this.hasUnsavedChanges = true;
            }
            this.controlBox.style.cursor = 'move';
            if (didMove && this.selectionType === 'background') {
                this.backgroundManager?.flushPendingPersistence?.();
            }
            
            // Clear original position markers for strokes
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.isCoordinateSelection()) {
                this.coordinateDragStartPositions = [];
                if (didMove) {
                    this.commitCoordinateSelectionChange(true);
                }
            } else if (this.isCompoundSelection()) {
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
        if (this.isDragging || this.isResizing || this.isRotating) return;
        if (this.isCoordinateSelection()) return;
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && this.selectedIndex === null) return;

        const resizeStartPos = this.getClientPos(e);
        let resizeStartBounds = null;

        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            resizeStartBounds = this.drawingEngine.getStrokeBounds(stroke);
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return;
            if (typeof this.textManager.normalizeTextObjectScale === 'function') {
                this.textManager.normalizeTextObjectScale(textObj);
            }
            const bounds = this.getTextObjectBounds(this.selectedIndex);
            if (!bounds) return;
            resizeStartBounds = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                fontSize: textObj.fontSize
            };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            resizeStartBounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            resizeStartBounds = {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height
            };
        } else if (this.isCompoundSelection()) {
            resizeStartBounds = this.getMultiBounds();
            if (!resizeStartBounds) return;
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
                        if (!bounds) continue;
                        this.multiTextResizeStart.push({ idx, x: textObj.x, y: textObj.y, width: bounds.width, height: bounds.height, fontSize: textObj.fontSize });
                    }
                }
            }
        }

        if (!resizeStartBounds) return;

        this.isResizing = true;
        if (typeof e.pointerId === 'number') {
            this.activePointerId = e.pointerId;
        }
        this.resizeHandle = handle;
        this.resizeStartPos = resizeStartPos;
        this.resizeStartBounds = resizeStartBounds;
    }
    
    resize(e) {
        if (!this.isResizing || !this.resizeStartBounds) return;
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const { scaleX, scaleY } = this.getCanvasScales();
        let deltaX = (pos.x - this.resizeStartPos.x) / scaleX;
        let deltaY = (pos.y - this.resizeStartPos.y) / scaleY;
        const rotation = this.getActiveSelectionRotation();
        if (rotation) {
            const localDelta = this.rotateDelta(deltaX, deltaY, -rotation);
            deltaX = localDelta.x;
            deltaY = localDelta.y;
        }
        
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                x: newBounds.x,
                y: newBounds.y,
                width: newBounds.width,
                height: newBounds.height
            });
        } else if (this.isCompoundSelection()) {
            // Guard against zero-width/height start bounds producing NaN coordinates
            const safeStartWidth = Math.max(startBounds.width, 1);
            const safeStartHeight = Math.max(startBounds.height, 1);
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined && point.originalY !== undefined) {
                            const relX = (point.originalX - startBounds.x) / safeStartWidth;
                            const relY = (point.originalY - startBounds.y) / safeStartHeight;
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
                        const relX = (start.x - startBounds.x) / safeStartWidth;
                        const relY = (start.y - startBounds.y) / safeStartHeight;
                        const relW = start.width / safeStartWidth;
                        const relH = start.height / safeStartHeight;
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
                        const relX = (start.x - startBounds.x) / safeStartWidth;
                        const relY = (start.y - startBounds.y) / safeStartHeight;
                        const scaleRatio = newBounds.width / safeStartWidth;
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
            if (this.selectionType === 'background') {
                this.backgroundManager?.flushPendingPersistence?.();
            }
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.isCompoundSelection()) {
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return null;
            bounds = { x: transform.x, y: transform.y, width: transform.width, height: transform.height };
        } else if (this.isCoordinateSelection()) {
            bounds = this.getCoordinateSelectionBounds();
        } else if (this.isCompoundSelection()) {
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
        if (this.isDragging || this.isResizing || this.isRotating) return;
        if (this.isCoordinateSelection()) return;
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && this.selectedIndex === null) return;

        const center = this.getControlBoxScreenCenter();
        if (!center) return;

        this.isRotating = true;
        if (typeof e.pointerId === 'number') {
            this.activePointerId = e.pointerId;
        }

        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) {
                this.isRotating = false;
                return;
            }
            this.rotateStartRotation = stroke.rotation || 0;
            stroke.originalBounds = this.getStrokeSelectionBounds(stroke);
            if (stroke.originalBounds) {
                stroke.rotationCenter = {
                    x: stroke.originalBounds.x + stroke.originalBounds.width / 2,
                    y: stroke.originalBounds.y + stroke.originalBounds.height / 2
                };
            }
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) {
                this.isRotating = false;
                return;
            }
            this.rotateStartRotation = textObj.rotation || 0;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) {
                this.isRotating = false;
                return;
            }
            this.rotateStartRotation = img.rotation || 0;
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) {
                this.isRotating = false;
                return;
            }
            this.rotateStartRotation = transform.rotation || 0;
        } else if (this.isCompoundSelection()) {
            this.rotateStartRotation = this.multiRotation;
            this.multiBounds = this.getMultiSelectionBounds();
            this.multiRotationCenter = this.multiBounds
                ? {
                    x: this.multiBounds.x + this.multiBounds.width / 2,
                    y: this.multiBounds.y + this.multiBounds.height / 2
                }
                : null;
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

        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
    }
    
    rotate(e) {
        if (!this.isRotating) return;
        if (!this.isCompoundSelection() && this.selectionType !== 'background' && this.selectedIndex === null) return;
        
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                rotation: this.normalizeAngle(this.rotateStartRotation + angleDelta)
            });
        } else if (this.isCompoundSelection()) {
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
            if (this.selectionType === 'background') {
                this.backgroundManager?.flushPendingPersistence?.();
            }
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                    delete stroke.originalBounds;
                }
            } else if (this.isCompoundSelection()) {
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
    applySelectionColor(color) {
        if (!this.isCoordinateSelection() || !this.backgroundManager || !color) return false;

        const changed = this.selectionType === 'coordinate-line'
            ? this.backgroundManager.setCoordinateLineColor(color)
            : this.backgroundManager.setCoordinatePointsColor(this.selectedCoordinatePointIds, color);

        if (!changed) return false;

        this.commitCoordinateSelectionChange(true);
        this.updateControlBox();
        return true;
    }

    openCoordinatePositionEditor() {
        if (!this.isCoordinateSelection() || !this.backgroundManager || !this.coordinatePositionModal || !this.coordinatePositionList) {
            return false;
        }

        const entries = this.backgroundManager.getCoordinatePointEntries(this.selectedCoordinatePointIds);
        if (!entries.length) return false;

        this.coordinatePositionList.innerHTML = entries.map((point, index) => `
            <div class="selection-coordinate-position-item">
                <div class="selection-coordinate-position-title">${this.escapeHtml(this.backgroundManager.getPointDisplayLabel(point, point.index ?? index))}</div>
                <div class="selection-coordinate-position-fields">
                    <label>
                        <span>X</span>
                        <input type="number" step="0.1" data-point-id="${this.escapeHtml(point.id)}" data-axis="x" value="${this.escapeHtml(point.x ?? '')}" aria-label="X">
                    </label>
                    <label>
                        <span>Y</span>
                        <input type="number" step="0.1" data-point-id="${this.escapeHtml(point.id)}" data-axis="y" value="${this.escapeHtml(point.y ?? '')}" aria-label="Y">
                    </label>
                </div>
            </div>
        `).join('');

        this.configureCoordinatePositionDialog();
        if (!this.coordinatePositionModal.classList.contains('show')) {
            this.coordinatePositionPreviouslyFocusedElement = this.getFocusableElement();
        }
        this.coordinatePositionModal.classList.add('show');
        const closeBtn = document.getElementById('selection-coordinate-position-close-btn');
        const saveBtn = document.getElementById('selection-coordinate-position-save-btn');
        const firstInput = this.coordinatePositionList.querySelector('input[data-point-id][data-axis]');
        const focusTarget = firstInput || saveBtn || closeBtn || this.coordinatePositionModal;
        this.scheduleCoordinatePositionFrame(() => {
            focusTarget?.focus?.();
        });
        return true;
    }

    closeCoordinatePositionEditor(shouldRefocus = true) {
        if (!this.coordinatePositionModal) return;
        this.coordinatePositionModal.classList.remove('show');
        const restoreFocusTarget = shouldRefocus ? this.coordinatePositionPreviouslyFocusedElement : null;
        this.coordinatePositionPreviouslyFocusedElement = null;
        if (shouldRefocus && this.hasSelection()) {
            this.updateControlBox();
        }
        if (restoreFocusTarget) {
            this.scheduleCoordinatePositionFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        }
    }

    applyCoordinatePositionEditor() {
        if (!this.isCoordinateSelection() || !this.backgroundManager || !this.coordinatePositionList) return false;

        const inputs = Array.from(this.coordinatePositionList.querySelectorAll('input[data-point-id][data-axis]'));
        if (!inputs.length) return false;

        const updates = new Map();
        let hasInvalidValue = false;

        inputs.forEach(input => {
            const pointId = input.dataset.pointId;
            const axis = input.dataset.axis;
            const value = parseFloat(input.value);

            if (!pointId || !axis) return;

            if (!Number.isFinite(value)) {
                hasInvalidValue = true;
                input.classList.add('invalid');
                return;
            }

            input.classList.remove('invalid');
            if (!updates.has(pointId)) {
                updates.set(pointId, { id: pointId });
            }
            updates.get(pointId)[axis] = value;
        });

        if (hasInvalidValue) {
            return false;
        }

        const changed = this.backgroundManager.updateCoordinatePoints([...updates.values()]);
        if (!changed) {
            this.closeCoordinatePositionEditor();
            return false;
        }

        this.commitCoordinateSelectionChange(true);
        this.closeCoordinatePositionEditor();
        this.updateControlBox();
        this.redrawWithSelection();
        return true;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    copySelection() {
        if (this.isCoordinateSelection()) {
            return false;
        }
        if (this.selectionType === 'background') {
            return false;
        }
        // Cache the selection for paste while still duplicating on the canvas.
        this.cacheSelection();
        if (this.isCompoundSelection()) {
            const wasGroupedSelection = this.selectionType === 'group';
            if (this.selectedStrokes.length === 0 && this.selectedImages.length === 0 && this.selectedTexts.length === 0) return false;
            const newStrokeIndices = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    // Reuse createStrokeCopy so shape metadata survives, then
                    // apply the copy offset (shapeStart/shapeEnd move with points).
                    const copiedStroke = {
                        ...this.createStrokeCopy(stroke),
                        points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
                        shapeStart: stroke.shapeStart ? { x: stroke.shapeStart.x + this.COPY_OFFSET, y: stroke.shapeStart.y + this.COPY_OFFSET } : null,
                        shapeEnd: stroke.shapeEnd ? { x: stroke.shapeEnd.x + this.COPY_OFFSET, y: stroke.shapeEnd.y + this.COPY_OFFSET } : null,
                        layerOrder: this.drawingEngine.getNextLayerOrder(),
                        objectId: this.drawingEngine.getNextObjectId(),
                        groupId: null
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
                        imageSrc: img.imageSrc || img.imageElement?.src || null,
                        x: img.x + this.COPY_OFFSET,
                        y: img.y + this.COPY_OFFSET,
                        width: img.width,
                        height: img.height,
                        rotation: img.rotation || 0,
                        flipHorizontal: img.flipHorizontal || false,
                        flipVertical: img.flipVertical || false,
                        layerOrder: this.drawingEngine.getNextLayerOrder(),
                        objectId: this.drawingEngine.getNextObjectId(),
                        groupId: null
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
                            y: textObj.y + this.COPY_OFFSET,
                            layerOrder: this.drawingEngine.getNextLayerOrder(),
                            objectId: this.drawingEngine.getNextObjectId(),
                            groupId: null
                        };
                        this.textManager.textObjects.push(copiedText);
                        newTextIndices.push(this.textManager.textObjects.length - 1);
                    }
                }
            }
            this.selectedStrokes = newStrokeIndices;
            this.selectedImages = newImageIndices;
            this.selectedTexts = newTextIndices;
            this.selectedCoordinatePointIds = [];
            this.selectedCoordinateGroupId = null;
            this.multiRotation = 0;
            this.selectedGroupId = null;
            this.selectionType = 'multi';
            if (wasGroupedSelection) {
                const createdGroup = this.drawingEngine.groupObjects(this.getSelectedObjectIds(), this.textManager?.textObjects || []);
                if (createdGroup) {
                    this.selectGroup(createdGroup.id);
                }
            }
            this.updateControlBox();
            this.redrawWithSelection();
            this.saveHistory();
            return true;
        }
        
        if (this.selectionType !== 'background' && this.selectedIndex === null) return false;
        
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
        const hasBackgroundImage = this.backgroundManager?.hasBackgroundImage?.() || false;
        const hasCoordinateOverlay = this.backgroundManager?.hasCoordinateSelectableContent?.() || false;
        return hasStrokes || hasImages || hasTexts || hasBackgroundImage || hasCoordinateOverlay;
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
        } else if (this.isCompoundSelection()) {
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
        this.clipboard = {
            strokes: cachedStrokes,
            images: cachedImages,
            texts: cachedTexts,
            grouped: this.selectionType === 'group'
        };
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
                points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
                shapeStart: stroke.shapeStart ? { x: stroke.shapeStart.x + this.COPY_OFFSET, y: stroke.shapeStart.y + this.COPY_OFFSET } : null,
                shapeEnd: stroke.shapeEnd ? { x: stroke.shapeEnd.x + this.COPY_OFFSET, y: stroke.shapeEnd.y + this.COPY_OFFSET } : null,
                layerOrder: this.drawingEngine.getNextLayerOrder(),
                objectId: this.drawingEngine.getNextObjectId(),
                groupId: null
            };
            this.drawingEngine.strokes.push(copiedStroke);
            newStrokeIndices.push(this.drawingEngine.strokes.length - 1);
        }

        for (const img of this.clipboard.images || []) {
            const copiedImage = this.applyPasteOffset({
                ...img,
                layerOrder: this.drawingEngine.getNextLayerOrder(),
                objectId: this.drawingEngine.getNextObjectId(),
                groupId: null
            }, this.COPY_OFFSET, this.COPY_OFFSET);
            this.drawingEngine.stampedImages.push(copiedImage);
            newImageIndices.push(this.drawingEngine.stampedImages.length - 1);
        }

        if (this.textManager) {
            for (const textObj of this.clipboard.texts || []) {
                const copiedText = this.createTextCopy(textObj);
                copiedText.layerOrder = this.drawingEngine.getNextLayerOrder();
                copiedText.objectId = this.drawingEngine.getNextObjectId();
                copiedText.groupId = null;
                const offsetText = this.applyPasteOffset(copiedText, this.COPY_OFFSET, this.COPY_OFFSET);
                this.textManager.textObjects.push(offsetText);
                newTextIndices.push(this.textManager.textObjects.length - 1);
            }
        }

        const total = newStrokeIndices.length + newImageIndices.length + newTextIndices.length;
        if (total === 0) return false;

        window.drawingBoard?.setTool?.('select', false);

        // Update clipboard positions so continuous Ctrl+V cascades
        if (this.clipboard.strokes) {
            this.clipboard.strokes = this.clipboard.strokes.map(s => ({
                ...s,
                points: s.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
                shapeStart: s.shapeStart ? { x: s.shapeStart.x + this.COPY_OFFSET, y: s.shapeStart.y + this.COPY_OFFSET } : null,
                shapeEnd: s.shapeEnd ? { x: s.shapeEnd.x + this.COPY_OFFSET, y: s.shapeEnd.y + this.COPY_OFFSET } : null
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
            this.selectedCoordinatePointIds = [];
            this.selectedCoordinateGroupId = null;
            this.multiRotation = 0;
            this.selectionType = 'multi';
            this.selectedGroupId = null;
            this.selectedIndex = null;
            this.showControls();
            this.redrawWithSelection();
            if (this.clipboard.grouped) {
                this.groupSelection(false);
            }
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
            lineStyle: stroke.lineStyle || 'solid',
            dashDensity: stroke.dashDensity || 10,
            renderMode: stroke.renderMode || null,
            shapeType: stroke.shapeType || null,
            shapeStart: stroke.shapeStart ? { ...stroke.shapeStart } : null,
            shapeEnd: stroke.shapeEnd ? { ...stroke.shapeEnd } : null,
            shapeLineStyle: stroke.shapeLineStyle || null,
            shapeDashDensity: stroke.shapeDashDensity || null,
            shapeWaveDensity: stroke.shapeWaveDensity || null,
            shapeMultiLineCount: stroke.shapeMultiLineCount || null,
            shapeMultiLineSpacing: stroke.shapeMultiLineSpacing || null,
            arrowSize: stroke.arrowSize || null,
            eraserShape: stroke.eraserShape || null,
            rotation: stroke.rotation || 0,
            layerOrder: stroke.layerOrder || 0
        };
    }

    createImageCopy(img) {
        return {
            imageElement: img.imageElement,
            imageSrc: img.imageSrc || img.imageElement?.src || null,
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
            rotation: img.rotation || 0,
            flipHorizontal: img.flipHorizontal || false,
            flipVertical: img.flipVertical || false,
            layerOrder: img.layerOrder || 0
        };
    }

    createTextCopy(textObj) {
        if (typeof window.safeDeepClone === 'function') {
            return window.safeDeepClone(textObj);
        }
        // Fallback for environments where the shared helper is not yet registered.
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
        if (this.isCoordinateSelection()) {
            if (!this.backgroundManager || this.selectedCoordinatePointIds.length === 0) return false;
            const result = this.backgroundManager.removeCoordinatePoints(this.selectedCoordinatePointIds);
            if (!result) return false;
            this.commitCoordinateSelectionChange(true);
            this.clearSelection();
            return true;
        }

        if (this.selectionType === 'group') {
            if (!this.selectedGroupId) return false;
            const groupMembers = this.drawingEngine.getGroupMembers(this.selectedGroupId, this.textManager?.textObjects || []);
            const strokeIndices = groupMembers.filter(member => member.type === 'stroke').map(member => member.index).sort((a, b) => b - a);
            const imageIndices = groupMembers.filter(member => member.type === 'image').map(member => member.index).sort((a, b) => b - a);
            const textIndices = groupMembers.filter(member => member.type === 'text').map(member => member.index).sort((a, b) => b - a);

            strokeIndices.forEach(idx => {
                const stroke = this.drawingEngine.strokes[idx];
                this.drawingEngine.removeObjectFromGroups(stroke?.objectId);
                this.drawingEngine.strokes.splice(idx, 1);
            });
            imageIndices.forEach(idx => {
                const img = this.drawingEngine.stampedImages[idx];
                this.drawingEngine.removeObjectFromGroups(img?.objectId);
                this.drawingEngine.stampedImages.splice(idx, 1);
            });
            if (this.textManager) {
                textIndices.forEach(idx => {
                    const textObj = this.textManager.textObjects[idx];
                    this.drawingEngine.removeObjectFromGroups(textObj?.objectId);
                    this.textManager.textObjects.splice(idx, 1);
                });
            }
            this.drawingEngine.objectGroups = this.drawingEngine.objectGroups.filter(group => group.id !== this.selectedGroupId);
            this.drawingEngine.cleanupGroups(this.textManager?.textObjects || []);
            this.clearSelection();
            this.redrawCanvas();
            this.saveHistory();
            return true;
        }

        if (this.isCompoundSelection()) {
            if (this.selectedStrokes.length === 0 && this.selectedImages.length === 0 && this.selectedTexts.length === 0) return false;
            // Sort indices in descending order to remove from end first
            const sortedStrokes = [...this.selectedStrokes].sort((a, b) => b - a);
            for (const idx of sortedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                this.drawingEngine.removeObjectFromGroups(stroke?.objectId);
                this.drawingEngine.strokes.splice(idx, 1);
            }
            const sortedImages = [...this.selectedImages].sort((a, b) => b - a);
            for (const idx of sortedImages) {
                const img = this.drawingEngine.stampedImages[idx];
                this.drawingEngine.removeObjectFromGroups(img?.objectId);
                this.drawingEngine.stampedImages.splice(idx, 1);
            }
            if (this.textManager) {
                const sortedTexts = [...this.selectedTexts].sort((a, b) => b - a);
                for (const idx of sortedTexts) {
                    const textObj = this.textManager.textObjects[idx];
                    this.drawingEngine.removeObjectFromGroups(textObj?.objectId);
                    this.textManager.textObjects.splice(idx, 1);
                }
            }
            this.drawingEngine.cleanupGroups(this.textManager?.textObjects || []);
            this.clearSelection();
            this.redrawCanvas();
            this.saveHistory();
            return true;
        }
        
        if (this.selectionType !== 'background' && this.selectedIndex === null) return false;
        
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
        } else if (this.selectionType === 'background') {
            if (!this.backgroundManager?.hasBackgroundImage?.()) return false;
            this.backgroundManager.clearBackgroundImage();
            window.drawingBoard?.updateBackgroundUI?.();
            this.clearSelection();
            this.saveHistory();
            return true;
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

        // Fully clear the selection, not just the overlay: an invisible
        // selection left behind would let a stray Delete/Backspace (or
        // Ctrl+C) act on the text with no visual cue.
        this.clearSelection({ skipRedraw: true });

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

    groupSelection(saveHistory = true) {
        if (this.isCoordinateSelection()) {
            if (!this.backgroundManager || this.selectedCoordinatePointIds.length < 2 || this.selectedCoordinateGroupId) {
                return false;
            }
            const coordinateMode = this.backgroundManager.getCoordinatePointLineMode?.() || 'auto';
            const group = this.backgroundManager.createCoordinateGroup(this.selectedCoordinatePointIds, {
                line: this.selectionType === 'coordinate-line' || coordinateMode === 'selected',
                persist: true,
                redraw: true
            });
            if (!group) return false;
            this.selectCoordinatePoints(group.pointIds, {
                line: group.line === true,
                groupId: group.id
            });
            if (saveHistory) {
                this.saveHistory();
            }
            return true;
        }

        if (this.selectionType !== 'multi') return false;
        const objectIds = this.getSelectedObjectIds();
        if (objectIds.length < 2 || this.selectionContainsGroupedObjects()) {
            return false;
        }
        const group = this.drawingEngine.groupObjects(objectIds, this.textManager?.textObjects || []);
        if (!group) return false;
        this.selectGroup(group.id);
        if (saveHistory) {
            this.saveHistory();
        }
        return true;
    }

    ungroupSelection(saveHistory = true) {
        if (this.isCoordinateSelection()) {
            if (!this.backgroundManager || !this.selectedCoordinateGroupId) return false;
            const group = this.getSelectedCoordinateGroup();
            if (!group) return false;
            const removed = this.backgroundManager.removeCoordinateGroup(this.selectedCoordinateGroupId, {
                persist: true,
                redraw: true
            });
            if (!removed) return false;
            this.selectCoordinatePoints(group.pointIds, { line: group.line === true });
            if (saveHistory) {
                this.saveHistory();
            }
            return true;
        }

        if (this.selectionType !== 'group' || !this.selectedGroupId) return false;
        const members = this.drawingEngine.ungroupObjects(this.selectedGroupId, this.textManager?.textObjects || []);
        if (!members.length) return false;

        this.selectedGroupId = null;
        this.selectedStrokes = members.filter(member => member.type === 'stroke').map(member => member.index);
        this.selectedImages = members.filter(member => member.type === 'image').map(member => member.index);
        this.selectedTexts = members.filter(member => member.type === 'text').map(member => member.index);
        this.selectionType = 'multi';
        this.selectedIndex = null;
        this.multiRotation = 0;
        this.selectedCoordinateGroupId = null;
        this.showControls();
        this.redrawWithSelection();
        if (saveHistory) {
            this.saveHistory();
        }
        return true;
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                rotation: this.normalizeAngle((transform.rotation || 0) + 90)
            });
        } else if (this.isCompoundSelection()) {
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
        if (this.selectionType === 'text') return;
        
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                flipHorizontal: !transform.flipHorizontal
            });
        } else if (this.isCompoundSelection()) {
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
        } else if (this.selectionType === 'background') {
            const transform = this.backgroundManager?.getBackgroundImageTransform?.();
            if (!transform) return;
            this.backgroundManager.updateImageTransform({
                ...transform,
                flipVertical: !transform.flipVertical
            });
        } else if (this.isCompoundSelection()) {
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
        return this.selectionType === 'background' ||
            this.isCoordinateSelection() ||
            this.selectedIndex !== null ||
            (this.isCompoundSelection() && (this.selectedStrokes.length > 0 || this.selectedImages.length > 0 || this.selectedTexts.length > 0));
    }
    
    clearSelection(options = {}) {
        this.selectionType = null;
        this.selectedIndex = null;
        this.selectedGroupId = null;
        this.hasUnsavedChanges = false;
        this.hasDragMoved = false;
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
        this.selectedCoordinatePointIds = [];
        this.selectedCoordinateGroupId = null;
        this.coordinateDragStartPositions = [];
        this.multiRotation = 0;
        this.multiRotationCenter = null;
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
        // Scene-restore flows clear the selection while drawingEngine still
        // holds the OUTGOING scene arrays; redrawing here would paint the old
        // scene over the freshly restored bitmap. Those callers pass
        // skipRedraw and repaint (or keep the restored bitmap) themselves.
        if (!options.skipRedraw) {
            this.redrawCanvas();
        }
    }
    
    redrawWithSelection() {
        // Redraw the canvas to show the selection border
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        // Clear canvas: reset the transform so the physical-size clear covers
        // the full buffer even when the context is DPR-scaled.
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        const board = window.drawingBoard;
        const rasterFallbackBase = board?.getPageRasterFallbackBase?.(board.currentPage) || null;
        if (rasterFallbackBase) {
            this.ctx.putImageData(rasterFallbackBase, 0, 0);
        }
        
        // Check if there is vector content to redraw
        const hasVectorContent = this.drawingEngine.strokes.length > 0 ||
            this.drawingEngine.stampedImages.length > 0 ||
            (this.textManager && this.textManager.textObjects && this.textManager.textObjects.length > 0);
        
        if (hasVectorContent) {
            this.drawingEngine.renderScene(this.textManager);
        } else if (!rasterFallbackBase) {
            // No vector content: restore base canvas from history to preserve
            // pixel content (e.g. after session restore where vector data is not available)
            if (this.historyManager && this.historyManager.historyStep >= 0) {
                const baseState = this.historyManager.history[this.historyManager.historyStep];
                const baseImageData = typeof this.historyManager.getEntryImageData === 'function'
                    ? this.historyManager.getEntryImageData(baseState)
                    : (baseState?.imageData || baseState);
                if (baseImageData?.data && typeof baseImageData.width === 'number' && typeof baseImageData.height === 'number') {
                    this.ctx.putImageData(baseImageData, 0, 0);
                }
            }
            this.drawingEngine.updateOffCanvasImageMirrors(this.textManager?.textObjects || []);
        }
        
        // Draw selection border if something is selected
        if (this.selectionType === 'stroke') {
            this.drawingEngine.drawSelectionBorder();
        } else if (this.selectionType === 'text' && this.textManager) {
            this.textManager.drawTextSelection();
        }

        window.drawingBoard?.syncVectorPreviewState?.();
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

        const foundCoordinatePointIds = [];
        const foundCoordinateLinePointIds = [];
        if (this.backgroundManager?.hasCoordinateSelectableContent?.()) {
            const coordinatePoints = this.backgroundManager.getCoordinatePointEntries();
            coordinatePoints.forEach(point => {
                if (point.canvasX >= canvasSelRect.x &&
                    point.canvasX <= canvasSelRect.x + canvasSelRect.width &&
                    point.canvasY >= canvasSelRect.y &&
                    point.canvasY <= canvasSelRect.y + canvasSelRect.height) {
                    foundCoordinatePointIds.push(point.id);
                }
            });

            const coordinateSegments = this.backgroundManager.getCoordinateLineSegments();
            coordinateSegments.forEach(segment => {
                if (this.segmentIntersectsRect(
                    segment.start.canvasX,
                    segment.start.canvasY,
                    segment.end.canvasX,
                    segment.end.canvasY,
                    canvasSelRect
                )) {
                    foundCoordinateLinePointIds.push(...(segment.pointIds || []));
                }
            });
        }
        
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        
        const backgroundBounds = this.backgroundManager?.getBackgroundImageVisualBounds?.();
        const foundBackground = !!(this.backgroundManager?.hasBackgroundImage?.() &&
            backgroundBounds &&
            this.rectsIntersect(canvasSelRect, backgroundBounds));

        this.applyFoundSelection(
            foundStrokes,
            foundImages,
            foundTexts,
            foundBackground,
            foundCoordinatePointIds,
            foundCoordinateLinePointIds
        );
    }
    
    // Apply selection from found strokes, images, and texts (shared by box and lasso selection)
    applyFoundSelection(foundStrokes, foundImages, foundTexts = [], foundBackground = false, foundCoordinatePointIds = [], foundCoordinateLinePointIds = []) {
        const expandedSelection = this.expandGroupedSelection(foundStrokes, foundImages, foundTexts);
        const coordinateIds = [...new Set(foundCoordinatePointIds || [])];
        const coordinateLineIds = [...new Set(foundCoordinateLinePointIds || [])];
        const totalFound = expandedSelection.strokes.length + expandedSelection.images.length + expandedSelection.texts.length + (foundBackground ? 1 : 0);
        const hasCoordinateFound = coordinateIds.length > 0 || coordinateLineIds.length > 0;

        if (totalFound === 0 && hasCoordinateFound) {
            if (coordinateLineIds.length > 0) {
                this.selectCoordinatePoints([...new Set([...coordinateLineIds, ...coordinateIds])], { line: true });
            } else {
                this.selectCoordinatePoints(coordinateIds);
            }
            return;
        }
        
        if (totalFound === 0) {
            return;
        } else if (!foundBackground && expandedSelection.groupIds.length === 1 &&
            totalFound === expandedSelection.strokes.length + expandedSelection.images.length + expandedSelection.texts.length) {
            this.selectGroup(expandedSelection.groupIds[0]);
        } else if (totalFound === 1 && expandedSelection.strokes.length === 1) {
            this.selectStroke(expandedSelection.strokes[0]);
        } else if (totalFound === 1 && expandedSelection.images.length === 1) {
            this.selectImage(expandedSelection.images[0]);
        } else if (totalFound === 1 && expandedSelection.texts.length === 1) {
            this.selectText(expandedSelection.texts[0]);
        } else if (totalFound === 1 && foundBackground) {
            this.selectBackgroundImage();
        } else {
            // Multi-select: include strokes, images, and texts
            this.selectedStrokes = expandedSelection.strokes;
            this.selectedImages = expandedSelection.images;
            this.selectedTexts = expandedSelection.texts;
            this.selectedCoordinatePointIds = [];
            this.selectedCoordinateGroupId = null;
            this.multiRotation = 0;
            this.selectionType = 'multi';
            this.selectedGroupId = null;
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

    orientation(ax, ay, bx, by, cx, cy) {
        const value = ((by - ay) * (cx - bx)) - ((bx - ax) * (cy - by));
        if (Math.abs(value) < 1e-7) return 0;
        return value > 0 ? 1 : 2;
    }

    onSegment(ax, ay, bx, by, cx, cy) {
        return bx <= Math.max(ax, cx) &&
            bx >= Math.min(ax, cx) &&
            by <= Math.max(ay, cy) &&
            by >= Math.min(ay, cy);
    }

    segmentsIntersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
        const o1 = this.orientation(a1x, a1y, a2x, a2y, b1x, b1y);
        const o2 = this.orientation(a1x, a1y, a2x, a2y, b2x, b2y);
        const o3 = this.orientation(b1x, b1y, b2x, b2y, a1x, a1y);
        const o4 = this.orientation(b1x, b1y, b2x, b2y, a2x, a2y);

        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && this.onSegment(a1x, a1y, b1x, b1y, a2x, a2y)) return true;
        if (o2 === 0 && this.onSegment(a1x, a1y, b2x, b2y, a2x, a2y)) return true;
        if (o3 === 0 && this.onSegment(b1x, b1y, a1x, a1y, b2x, b2y)) return true;
        if (o4 === 0 && this.onSegment(b1x, b1y, a2x, a2y, b2x, b2y)) return true;
        return false;
    }

    segmentIntersectsRect(x1, y1, x2, y2, rect) {
        if ((x1 >= rect.x && x1 <= rect.x + rect.width && y1 >= rect.y && y1 <= rect.y + rect.height) ||
            (x2 >= rect.x && x2 <= rect.x + rect.width && y2 >= rect.y && y2 <= rect.y + rect.height)) {
            return true;
        }

        const corners = [
            [rect.x, rect.y, rect.x + rect.width, rect.y],
            [rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height],
            [rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height],
            [rect.x, rect.y + rect.height, rect.x, rect.y]
        ];
        return corners.some(([ax, ay, bx, by]) => this.segmentsIntersect(x1, y1, x2, y2, ax, ay, bx, by));
    }

    segmentIntersectsPolygon(x1, y1, x2, y2, polygon) {
        if (this.pointInPolygon(x1, y1, polygon) || this.pointInPolygon(x2, y2, polygon)) {
            return true;
        }
        for (let i = 0; i < polygon.length; i++) {
            const nextIndex = (i + 1) % polygon.length;
            if (this.segmentsIntersect(
                x1, y1, x2, y2,
                polygon[i].x, polygon[i].y,
                polygon[nextIndex].x, polygon[nextIndex].y
            )) {
                return true;
            }
        }
        return false;
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

    rotateDelta(deltaX, deltaY, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        return {
            x: deltaX * cos - deltaY * sin,
            y: deltaX * sin + deltaY * cos
        };
    }

    getActiveSelectionRotation() {
        if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
            return this.drawingEngine.strokes[this.selectedIndex]?.rotation || 0;
        }
        if (this.selectionType === 'text' && this.selectedIndex !== null && this.textManager) {
            return this.textManager.textObjects[this.selectedIndex]?.rotation || 0;
        }
        if (this.selectionType === 'image' && this.selectedIndex !== null) {
            return this.drawingEngine.stampedImages[this.selectedIndex]?.rotation || 0;
        }
        if (this.selectionType === 'background') {
            return this.backgroundManager?.getBackgroundImageTransform?.()?.rotation || 0;
        }
        if (this.isCompoundSelection()) {
            return this.multiRotation || 0;
        }
        return 0;
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
        const centerX = Number.isFinite(stroke.rotationCenter?.x)
            ? stroke.rotationCenter.x
            : bounds.x + bounds.width / 2;
        const centerY = Number.isFinite(stroke.rotationCenter?.y)
            ? stroke.rotationCenter.y
            : bounds.y + bounds.height / 2;
        const unrotatedPoints = stroke.points.map(point =>
            this.rotatePoint(point.x, point.y, centerX, centerY, -rotation)
        );
        const unrotatedBounds = this.getBoundsFromPoints(unrotatedPoints);
        if (!unrotatedBounds) return null;
        const padding = Number.isFinite(stroke.size) ? stroke.size * 2 : 0;
        return {
            x: unrotatedBounds.x - padding,
            y: unrotatedBounds.y - padding,
            width: unrotatedBounds.width + padding * 2,
            height: unrotatedBounds.height + padding * 2
        };
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
        const centerX = Number.isFinite(this.multiRotationCenter?.x)
            ? this.multiRotationCenter.x
            : axisBounds.x + axisBounds.width / 2;
        const centerY = Number.isFinite(this.multiRotationCenter?.y)
            ? this.multiRotationCenter.y
            : axisBounds.y + axisBounds.height / 2;
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
        const bounds = {
            x: textObj.x,
            y: textObj.y,
            width: maxWidth + padding * 2,
            height: lines.length * lineHeight + padding * 2
        };
        textObj.width = bounds.width;
        textObj.height = bounds.height;
        return bounds;
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

        const foundCoordinatePointIds = [];
        const foundCoordinateLinePointIds = [];
        if (this.backgroundManager?.hasCoordinateSelectableContent?.()) {
            const coordinatePoints = this.backgroundManager.getCoordinatePointEntries();
            coordinatePoints.forEach(point => {
                if (this.pointInPolygon(point.canvasX, point.canvasY, canvasLassoPoints)) {
                    foundCoordinatePointIds.push(point.id);
                }
            });

            const coordinateSegments = this.backgroundManager.getCoordinateLineSegments();
            coordinateSegments.forEach(segment => {
                if (this.segmentIntersectsPolygon(
                    segment.start.canvasX,
                    segment.start.canvasY,
                    segment.end.canvasX,
                    segment.end.canvasY,
                    canvasLassoPoints
                )) {
                    foundCoordinateLinePointIds.push(...(segment.pointIds || []));
                }
            });
        }
        
        const backgroundBounds = this.backgroundManager?.getBackgroundImageVisualBounds?.();
        const foundBackground = !!(this.backgroundManager?.hasBackgroundImage?.() &&
            backgroundBounds &&
            this.polygonIntersectsRect(canvasLassoPoints, backgroundBounds));

        this.applyFoundSelection(
            foundStrokes,
            foundImages,
            foundTexts,
            foundBackground,
            foundCoordinatePointIds,
            foundCoordinateLinePointIds
        );
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

window.SelectionManager = SelectionManager;
window.AboardSelectionManager = SelectionManager;
