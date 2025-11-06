// Collapsible Settings Module
// Handles collapsible sections in settings panels

class CollapsibleManager {
    constructor() {
        this.collapsedState = this.loadCollapsedState();
        this.initializeCollapsibles();
    }
    
    loadCollapsedState() {
        const saved = localStorage.getItem('collapsedSections');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load collapsed state:', e);
            }
        }
        return {}; // All sections expanded by default
    }
    
    saveCollapsedState() {
        localStorage.setItem('collapsedSections', JSON.stringify(this.collapsedState));
    }
    
    initializeCollapsibles() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Find all settings groups that should be collapsible
        const settingsGroups = document.querySelectorAll('.settings-group');
        
        settingsGroups.forEach((group, index) => {
            // Add unique ID if not present
            if (!group.id) {
                group.id = `settings-group-${index}`;
            }
            
            this.makeCollapsible(group);
        });
    }
    
    makeCollapsible(group) {
        const groupId = group.id;
        
        // Don't add collapsible to already collapsible groups
        if (group.classList.contains('collapsible')) {
            return;
        }
        
        // Find the label (first direct child that's a label or has text)
        let labelElement = group.querySelector(':scope > label');
        if (!labelElement) {
            // Skip if no label found
            return;
        }
        
        // Mark as collapsible
        group.classList.add('collapsible');
        
        // Create header wrapper
        const header = document.createElement('div');
        header.className = 'settings-group-header';
        
        // Create collapse toggle
        const toggle = document.createElement('div');
        toggle.className = 'collapse-toggle';
        toggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
        
        // Move label into header
        header.appendChild(toggle);
        header.appendChild(labelElement);
        
        // Create content wrapper for remaining elements
        const content = document.createElement('div');
        content.className = 'settings-group-content';
        
        // Move all remaining children to content
        while (group.firstChild) {
            content.appendChild(group.firstChild);
        }
        
        // Remove the label from content (it's now in header)
        if (content.contains(labelElement)) {
            content.removeChild(labelElement);
        }
        
        // Add header and content back to group
        group.appendChild(header);
        group.appendChild(content);
        
        // Restore collapsed state
        if (this.collapsedState[groupId]) {
            group.classList.add('collapsed');
        }
        
        // Set initial max-height for animation
        if (!group.classList.contains('collapsed')) {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
        
        // Add click handler
        header.addEventListener('click', () => {
            this.toggleCollapse(group);
        });
    }
    
    toggleCollapse(group) {
        const content = group.querySelector('.settings-group-content');
        const isCollapsed = group.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            group.classList.remove('collapsed');
            content.style.maxHeight = content.scrollHeight + 'px';
            this.collapsedState[group.id] = false;
        } else {
            // Collapse
            // Set current height first for animation
            content.style.maxHeight = content.scrollHeight + 'px';
            // Force reflow
            content.offsetHeight;
            // Then collapse
            content.style.maxHeight = '0px';
            group.classList.add('collapsed');
            this.collapsedState[group.id] = true;
        }
        
        this.saveCollapsedState();
    }
    
    // Public method to refresh a specific group's max-height
    refreshGroup(groupId) {
        const group = document.getElementById(groupId);
        if (group && !group.classList.contains('collapsed')) {
            const content = group.querySelector('.settings-group-content');
            if (content) {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        }
    }
    
    // Public method to refresh all groups
    refreshAll() {
        document.querySelectorAll('.settings-group.collapsible:not(.collapsed)').forEach(group => {
            const content = group.querySelector('.settings-group-content');
            if (content) {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    }
}
