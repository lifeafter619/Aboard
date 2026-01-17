// Infinite Canvas Manager Module
// Handles logic for the Infinite Whiteboard mode (pagination, state management)

class InfiniteCanvasManager {
    constructor(drawingEngine, historyManager) {
        this.drawingEngine = drawingEngine;
        this.historyManager = historyManager;

        // State
        this.pages = [];
        this.currentPage = 1;

        // Load saved state
        this.loadState();

        // Ensure at least one page exists
        if (this.pages.length === 0) {
            this.addPage();
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('infinitePages');
            if (saved) {
                this.pages = JSON.parse(saved);
                this.currentPage = parseInt(localStorage.getItem('infiniteCurrentPage')) || 1;
            }
        } catch (e) {
            console.error('Failed to load infinite canvas state:', e);
            this.pages = [];
            this.currentPage = 1;
        }
    }

    saveState() {
        try {
            // Update current page with latest data from drawing engine
            this.updateCurrentPage();

            localStorage.setItem('infinitePages', JSON.stringify(this.pages));
            localStorage.setItem('infiniteCurrentPage', this.currentPage);
        } catch (e) {
            console.error('Failed to save infinite canvas state:', e);
            // Handle quota exceeded error?
        }
    }

    updateCurrentPage() {
        if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
            this.pages[this.currentPage - 1] = {
                strokes: JSON.parse(JSON.stringify(this.drawingEngine.strokes)), // Deep copy
                images: JSON.parse(JSON.stringify(this.drawingEngine.images)),
                panOffset: { ...this.drawingEngine.panOffset },
                canvasScale: this.drawingEngine.canvasScale
            };
        }
    }

    loadPage(pageIndex) {
        if (pageIndex < 1 || pageIndex > this.pages.length) return;

        // Save current before switching
        this.updateCurrentPage();
        this.saveState();

        this.currentPage = pageIndex;
        const page = this.pages[pageIndex - 1];

        // Restore state to drawing engine
        this.drawingEngine.strokes = JSON.parse(JSON.stringify(page.strokes || []));
        this.drawingEngine.images = JSON.parse(JSON.stringify(page.images || []));
        this.drawingEngine.panOffset = { ...(page.panOffset || {x: 0, y: 0}) };
        this.drawingEngine.canvasScale = page.canvasScale || 1.0;

        // Clear history for new page?
        // In standard mode, history is preserved per session but resetting typically clears it.
        // For a new page load, we should probably clear the Undo stack or save it per page.
        // For MVP, let's clear history to avoid undoing into a different page.
        this.historyManager.history = [];
        this.historyManager.historyStep = -1;
        this.historyManager.saveState(); // Save initial state of this page to history

        // Trigger render
        // Note: The caller (Main) should trigger the render loop or UI update
    }

    addPage() {
        // Save current
        if (this.pages.length > 0) {
            this.updateCurrentPage();
        }

        // Add new blank page
        this.pages.push({
            strokes: [],
            images: [],
            panOffset: { x: 0, y: 0 },
            canvasScale: 1.0
        });

        this.saveState();

        // Switch to it
        this.loadPage(this.pages.length);
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.loadPage(this.currentPage - 1);
            return true;
        }
        return false;
    }

    nextPage() {
        if (this.currentPage < this.pages.length) {
            this.loadPage(this.currentPage + 1);
        } else {
            this.addPage();
        }
        return true;
    }

    goToPage(pageIndex) {
        if (pageIndex >= 1 && pageIndex <= this.pages.length) {
            this.loadPage(pageIndex);
            return true;
        } else if (pageIndex === this.pages.length + 1) {
            this.addPage();
            return true;
        }
        return false;
    }
}
