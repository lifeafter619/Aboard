// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function persistBoardViewState(board, options = {}) {
        if (typeof board?.drawingEngine?.persistViewState === 'function') {
                board.drawingEngine.persistViewState(options);
                return;
        }
        window.AboardBoardHelpersRuntime?.persistViewState?.(board, options);
}

function updateEraserCursor(e) {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.eraserCursor.style.left = e.clientX + 'px';
            this.eraserCursor.style.top = e.clientY + 'px';
            this.eraserCursor.style.width = this.drawingEngine.eraserSize + 'px';
            this.eraserCursor.style.height = this.drawingEngine.eraserSize + 'px';
        }
    
}

function updateEraserCursorShape() {
        if (this.drawingEngine.eraserShape === 'rectangle') {
            this.eraserCursor.style.borderRadius = '0';
        } else {
            this.eraserCursor.style.borderRadius = '50%';
        }
    
}

function showEraserCursor() {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.updateEraserCursorShape();
            this.eraserCursor.style.display = 'block';
        }
    
}

function hideEraserCursor() {
        this.eraserCursor.style.display = 'none';
    
}

function handlePinchStart(e) {
        if (e.touches.length < 2) return;
        if (!this.settingsManager.touchZoomEnabled) return;

        this.isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastPinchDistance = this.getPinchDistance(touch1, touch2);
        this.lastPinchCenter = this.getPinchCenter(touch1, touch2);
        this.scheduleRenderQualityUpdate();

        // Show pinch zoom indicator
        const indicator = document.getElementById('pinch-zoom-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }

}

function handlePinchMove(e) {
        if (!this.isPinching || e.touches.length < 2) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = this.getPinchDistance(touch1, touch2);
        const currentCenter = this.getPinchCenter(touch1, touch2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Check if moved significantly to invalidate tap gesture
            const moveThreshold = 5;
            if (Math.abs(currentDistance - this.lastPinchDistance) > moveThreshold ||
                Math.abs(currentCenter.x - this.lastPinchCenter.x) > moveThreshold ||
                Math.abs(currentCenter.y - this.lastPinchCenter.y) > moveThreshold) {
                this.isPotentialGesture = false;
            }

            // Calculate zoom ratio
            const scaleRatio = currentDistance / this.lastPinchDistance;

            // Calculate new scale with limits
            const currentScale = this.drawingEngine.canvasScale;
            let newScale = currentScale * scaleRatio;
            newScale = Math.max(this.MIN_CANVAS_SCALE, Math.min(this.MAX_CANVAS_SCALE, newScale));

            // Recalculate effective scale ratio after clamping
            const effectiveScaleRatio = newScale / currentScale;
            
            this.drawingEngine.canvasScale = newScale;
            this.updateZoomUI();
            
            // Adjust pan offset to zoom towards the pinch center
            // Visual center of the canvas (relative to screen)
            // Since transform origin is center center, visual center is at screen center + pan offset
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;

            // The point on canvas under the last pinch center
            // We want to keep this point under the new pinch center (conceptually)
            // Formula: Pan_new = Pan_old + (PinchCenter_old - VisualCenter_old) * (1 - ScaleRatio) + (PinchCenter_new - PinchCenter_old)

            // Vector from visual center to last pinch center
            // visualCenter = screenCenter + panOffset
            const visualCenterX = screenCenterX + this.drawingEngine.panOffset.x;
            const visualCenterY = screenCenterY + this.drawingEngine.panOffset.y;
            
            const offsetX = this.lastPinchCenter.x - visualCenterX;
            const offsetY = this.lastPinchCenter.y - visualCenterY;

            // 1. Zoom effect (keeping lastPinchCenter fixed relative to canvas content)
            let newPanX = this.drawingEngine.panOffset.x + offsetX * (1 - effectiveScaleRatio);
            let newPanY = this.drawingEngine.panOffset.y + offsetY * (1 - effectiveScaleRatio);

            // 2. Pan effect (moving content with fingers)
            newPanX += (currentCenter.x - this.lastPinchCenter.x);
            newPanY += (currentCenter.y - this.lastPinchCenter.y);

            this.drawingEngine.panOffset.x = newPanX;
            this.drawingEngine.panOffset.y = newPanY;
            
            // Apply zoom using applyZoom for consistency
            this.applyZoom(false);
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    
}

function handlePinchEnd() {
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
        this.scheduleRenderQualityUpdate();

        // Hide pinch zoom indicator
        const indicator = document.getElementById('pinch-zoom-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }

        // Save state after pinch ends
        persistBoardViewState(this, { immediate: true });

}

function getPinchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    
}

function getPinchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    
}

function handlePointerPinchStart() {
        if (!this.settingsManager.touchZoomEnabled) return;

        // Get the first two pointers
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length < 2) return;

        this.isPinching = true;
        this.hasTwoFingers = true;

        // If we were drawing, stop and discard the current stroke
        if (this.drawingEngine.isDrawing) {
            this.discardCurrentStroke();
        }

        // If we were panning, stop it
        if (this.drawingEngine.isPanning) {
            this.drawingEngine.stopPanning();
        }

        // Calculate initial pinch distance and center
        const p1 = pointers[0];
        const p2 = pointers[1];
        this.lastPinchDistance = this.getPointerDistance(p1, p2);
        this.lastPinchCenter = this.getPointerCenter(p1, p2);
        this.scheduleRenderQualityUpdate();

        // Show pinch zoom indicator
        const indicator = document.getElementById('pinch-zoom-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }

}

function handlePointerPinchMove() {
        if (!this.isPinching) return;
        
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length < 2) return;
        
        const p1 = pointers[0];
        const p2 = pointers[1];
        const currentDistance = this.getPointerDistance(p1, p2);
        const currentCenter = this.getPointerCenter(p1, p2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Calculate zoom ratio
            const scaleRatio = currentDistance / this.lastPinchDistance;
            
            // Calculate new scale with limits
            const currentScale = this.drawingEngine.canvasScale;
            let newScale = currentScale * scaleRatio;
            newScale = Math.max(this.MIN_CANVAS_SCALE, Math.min(this.MAX_CANVAS_SCALE, newScale));
            
            // Recalculate effective scale ratio after clamping
            const effectiveScaleRatio = newScale / currentScale;
            
            this.drawingEngine.canvasScale = newScale;
            this.updateZoomUI();
            
            // Adjust pan offset to zoom towards the pinch center
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const visualCenterX = screenCenterX + this.drawingEngine.panOffset.x;
            const visualCenterY = screenCenterY + this.drawingEngine.panOffset.y;
            
            const offsetX = this.lastPinchCenter.x - visualCenterX;
            const offsetY = this.lastPinchCenter.y - visualCenterY;
            
            // 1. Zoom effect (keeping lastPinchCenter fixed relative to canvas content)
            let newPanX = this.drawingEngine.panOffset.x + offsetX * (1 - effectiveScaleRatio);
            let newPanY = this.drawingEngine.panOffset.y + offsetY * (1 - effectiveScaleRatio);
            
            // 2. Pan effect (moving content with fingers)
            newPanX += (currentCenter.x - this.lastPinchCenter.x);
            newPanY += (currentCenter.y - this.lastPinchCenter.y);
            
            this.drawingEngine.panOffset.x = newPanX;
            this.drawingEngine.panOffset.y = newPanY;
            
            // Apply zoom (false = don't update config-area scale)
            this.applyZoom(false);
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    
}

function handlePointerPinchEnd() {
        this.isPinching = false;
        this.hasTwoFingers = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
        this.scheduleRenderQualityUpdate();

        // Hide pinch zoom indicator
        const indicator = document.getElementById('pinch-zoom-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }

        // Save state after pinch ends
        persistBoardViewState(this, { immediate: true });

}

function getPointerDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    
}

function getPointerCenter(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    
}

function applyPanTransform() {
        // Apply pan offset using CSS transform for better performance
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;
        // Use the combined fit scale and user zoom scale
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        
        if (this.transformLayer) {
            if (!this.settingsManager.infiniteCanvas) {
                // In paginated mode, center canvas using position and translate
                this.transformLayer.style.position = 'absolute';
                this.transformLayer.style.left = '50%';
                this.transformLayer.style.top = '50%';

                // Combine translate and scale
                const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${finalScale})`;
                this.transformLayer.style.transform = transform;
            } else {
                // In infinite mode, combine translate and scale
                const transform = `translate(${panX}px, ${panY}px) scale(${finalScale})`;
                this.transformLayer.style.transform = transform;
            }
            
            // Ensure children don't have conflicting transforms
            this.canvas.style.transform = 'none';
            this.bgCanvas.style.transform = 'none';
        }

        this.syncInteractiveOverlays();
    
}

function syncInteractiveOverlays() {
        this.backgroundManager?.renderCoordinateOverlay?.();
        this.selectionManager?.updateControlBox?.();
        this.strokeControls?.updateControlBox?.();
        if (this.imageControls?.isActive) {
            this.imageControls.updateControlBox();
        }
        this.syncVectorPreviewState();
    
}

function shouldShowLiveStrokePreview() {
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        return finalScale > 1.05 && this.drawingEngine?.currentTool === 'pen';
    
}

function shouldShowLiveEraserPreview() {
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        return finalScale > 1.05 && this.drawingEngine?.currentTool === 'eraser';
    
}

function hasVectorPreviewContent() {
        const hasText = !!(this.insertTextManager?.textObjects?.length);
        const hasLiveStrokePreview = !!this.drawingEngine?.shouldUseLiveStrokePreview?.();
        const hasLiveEraserPreview = !!this.drawingEngine?.shouldUseLiveEraserPreview?.();
        const hasShapePreview = !!this.shapeDrawingManager?.isDrawing;
        return this.drawingEngine.strokes.length > 0 ||
            this.drawingEngine.stampedImages.length > 0 ||
            hasText ||
            hasLiveStrokePreview ||
            hasLiveEraserPreview ||
            hasShapePreview;
    
}

function shouldUseVectorPreview() {
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        const hasStoredMarkerStroke = this.drawingEngine?.strokes?.some?.((stroke) =>
            stroke?.tool !== 'eraser' && stroke?.penType === 'marker'
        ) || false;
        const hasLiveDrawingPreview = !!(
            this.drawingEngine?.shouldUseLiveStrokePreview?.() ||
            this.drawingEngine?.shouldUseLiveEraserPreview?.()
        );
        const hasBlockingTransientOverlay = !!(
            this.insertImageManager?.isActive ||
            this.insertTextManager?.isActive ||
            this.selectionManager?.hasSelection?.() ||
            this.strokeControls?.isActive ||
            (this.drawingEngine.isDrawing && !hasLiveDrawingPreview) ||
            (this.shapeDrawingManager?.isDrawing && !this.shapeDrawingManager?.previewCanvas)
        );

        return finalScale > 1.05 &&
            this.hasVectorPreviewContent() &&
            !hasStoredMarkerStroke &&
            !hasBlockingTransientOverlay;
    
}

function syncVectorPreviewState(forceRender = false) {
        if (forceRender || this.hasVectorPreviewContent()) {
            this.drawingEngine.renderVectorScene(this.insertTextManager || null);
        }

        const shouldShow = this.shouldUseVectorPreview();
        this.drawingEngine.setVectorPreviewVisible(shouldShow);
    
}

window.AboardInteractionRuntime = {
    updateEraserCursor(board, e) {
        return updateEraserCursor.call(board, e);
    },
    updateEraserCursorShape(board) {
        return updateEraserCursorShape.call(board);
    },
    showEraserCursor(board) {
        return showEraserCursor.call(board);
    },
    hideEraserCursor(board) {
        return hideEraserCursor.call(board);
    },
    handlePinchStart(board, e) {
        return handlePinchStart.call(board, e);
    },
    handlePinchMove(board, e) {
        return handlePinchMove.call(board, e);
    },
    handlePinchEnd(board) {
        return handlePinchEnd.call(board);
    },
    getPinchDistance(board, touch1, touch2) {
        return getPinchDistance.call(board, touch1, touch2);
    },
    getPinchCenter(board, touch1, touch2) {
        return getPinchCenter.call(board, touch1, touch2);
    },
    handlePointerPinchStart(board) {
        return handlePointerPinchStart.call(board);
    },
    handlePointerPinchMove(board) {
        return handlePointerPinchMove.call(board);
    },
    handlePointerPinchEnd(board) {
        return handlePointerPinchEnd.call(board);
    },
    getPointerDistance(board, p1, p2) {
        return getPointerDistance.call(board, p1, p2);
    },
    getPointerCenter(board, p1, p2) {
        return getPointerCenter.call(board, p1, p2);
    },
    applyPanTransform(board) {
        return applyPanTransform.call(board);
    },
    syncInteractiveOverlays(board) {
        return syncInteractiveOverlays.call(board);
    },
    shouldShowLiveStrokePreview(board) {
        return shouldShowLiveStrokePreview.call(board);
    },
    shouldShowLiveEraserPreview(board) {
        return shouldShowLiveEraserPreview.call(board);
    },
    hasVectorPreviewContent(board) {
        return hasVectorPreviewContent.call(board);
    },
    shouldUseVectorPreview(board) {
        return shouldUseVectorPreview.call(board);
    },
    syncVectorPreviewState(board, forceRender) {
        return syncVectorPreviewState.call(board, forceRender);
    }
};
