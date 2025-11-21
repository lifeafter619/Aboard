// UI Panel Positioning Module
// Handles positioning and sizing of UI panels like config-area, toolbar, etc.

class UIPanelManager {
    constructor() {
        this.EDGE_SPACING = 10; // Minimum spacing from viewport edges
    }
    
    /**
     * Fix config-area positioning to prevent it from touching the toolbar
     * This function calculates the appropriate bottom position and max-height
     */
    fixConfigAreaPosition() {
        const configArea = document.getElementById('config-area');
        const toolbar = document.getElementById('toolbar');
        
        if (!configArea || !toolbar) return;
        
        // Get toolbar dimensions and position
        const toolbarRect = toolbar.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate toolbar's distance from bottom
        const toolbarDistanceFromBottom = windowHeight - toolbarRect.top;
        
        // Set config-area bottom to be at least 20px above the toolbar
        const minBottomSpacing = 20;
        const configAreaBottom = toolbarDistanceFromBottom + minBottomSpacing;
        
        // Calculate max-height for config-area
        // Leave space for: toolbar height + spacing + top spacing
        const topSpacing = 20; // Space from top of viewport
        const maxHeight = windowHeight - toolbarDistanceFromBottom - minBottomSpacing - topSpacing;
        
        // Apply the calculated values
        configArea.style.bottom = `${configAreaBottom}px`;
        configArea.style.maxHeight = `${maxHeight}px`;
    }
    
    /**
     * Reposition all toolbars and panels after window resize
     * Ensures they stay within the viewport
     */
    repositionPanelsOnResize() {
        const panels = [
            document.getElementById('history-controls'),
            document.getElementById('config-area'),
            document.getElementById('time-display-area'),
            document.getElementById('feature-area'),
            document.getElementById('toolbar'),
            document.getElementById('pagination-controls'),
            document.getElementById('timer-display')
        ];
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        panels.forEach(panel => {
            if (!panel) return;
            
            const rect = panel.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panel);
            
            // Get current position
            let left = parseFloat(computedStyle.left) || 0;
            let top = parseFloat(computedStyle.top) || 0;
            let right = computedStyle.right !== 'auto' ? parseFloat(computedStyle.right) : null;
            let bottom = computedStyle.bottom !== 'auto' ? parseFloat(computedStyle.bottom) : null;
            
            // Check if panel is positioned and might overflow
            const hasCustomPosition = computedStyle.left !== 'auto' || computedStyle.top !== 'auto' || 
                                     computedStyle.right !== 'auto' || computedStyle.bottom !== 'auto';
            
            if (!hasCustomPosition) return;
            
            // Adjust position if overflowing
            if (right !== null) {
                // Panel is right-aligned - check if actual left position would be negative
                const actualLeft = windowWidth - right - rect.width;
                if (actualLeft < 0) {
                    panel.style.right = `${this.EDGE_SPACING}px`;
                }
            } else if (left + rect.width > windowWidth - this.EDGE_SPACING) {
                // Panel overflows right edge
                const newLeft = Math.max(this.EDGE_SPACING, windowWidth - rect.width - this.EDGE_SPACING);
                panel.style.left = `${newLeft}px`;
                panel.style.right = 'auto';
            }
            
            if (bottom !== null) {
                // Panel is bottom-aligned - check if actual top position would be negative
                const actualTop = windowHeight - bottom - rect.height;
                if (actualTop < 0) {
                    panel.style.bottom = `${this.EDGE_SPACING}px`;
                }
            } else if (top + rect.height > windowHeight - this.EDGE_SPACING) {
                // Panel overflows bottom edge
                const newTop = Math.max(this.EDGE_SPACING, windowHeight - rect.height - this.EDGE_SPACING);
                panel.style.top = `${newTop}px`;
                panel.style.bottom = 'auto';
            }
            
            // Ensure panel doesn't overflow left or top edges
            if (left < this.EDGE_SPACING) {
                panel.style.left = `${this.EDGE_SPACING}px`;
            }
            if (top < this.EDGE_SPACING) {
                panel.style.top = `${this.EDGE_SPACING}px`;
            }
        });
        
        // Fix config-area positioning after general repositioning
        this.fixConfigAreaPosition();
    }
}
