// Collapsible Settings Module
// Handles collapsible sections in settings panels

function safeCollapsibleStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read collapsed localStorage key "${key}":`, error);
        return null;
    }
}

function safeCollapsibleStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write collapsed localStorage key "${key}":`, error);
        return false;
    }
}

class CollapsibleManager {
    constructor() {
        this.collapsedState = this.loadCollapsedState();
        this.initializeCollapsibles();
    }
    
    loadCollapsedState() {
        const saved = safeCollapsibleStorageGetItem('collapsedSections');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load collapsed state:', e);
            }
        }
        return { default: true }; // All sections collapsed by default to save space
    }
    
    saveCollapsedState() {
        safeCollapsibleStorageSetItem('collapsedSections', JSON.stringify(this.collapsedState));
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
        
        // Check if this group has only one checkbox (and nothing else significant)
        // Cache all queries for better performance
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');
        const checkboxCount = checkboxes.length;
        
        // Early return optimization: if we have exactly 1 checkbox, check other elements
        if (checkboxCount === 1) {
            const otherInputs = group.querySelectorAll('input:not([type="checkbox"]), select, textarea, button');
            const hints = group.querySelectorAll('.settings-hint');
            
            // Skip collapsible for simple single-checkbox settings
            // We allow up to 1 hint (description text) without making it collapsible
            const MAX_HINTS_FOR_SIMPLE_SETTING = 1;
            if (otherInputs.length === 0 && hints.length <= MAX_HINTS_FOR_SIMPLE_SETTING) {
                return;
            }
        }
        
        // Mark as collapsible
        group.classList.add('collapsible');
        
        // Create header wrapper
        const header = document.createElement('div');
        header.className = 'settings-group-header';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        
        // Create collapse toggle
        const toggle = document.createElement('div');
        toggle.className = 'collapse-toggle';
        toggle.setAttribute('aria-hidden', 'true');
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
        content.id = `${groupId}-content`;
        
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
        
        // Restore collapsed state: default to collapsed unless explicitly saved as expanded (false)
        // This ensures groups start collapsed to save space, and user preferences are preserved
        if (this.collapsedState[groupId] !== false) {
            group.classList.add('collapsed');
        }
        
        this.syncAccessibilityState(group);
        this.syncContentHeight(group);
        
        // Add click handler
        header.addEventListener('click', () => {
            this.toggleCollapse(group);
        });
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleCollapse(group);
            }
        });
    }
    
    toggleCollapse(group) {
        const content = group.querySelector('.settings-group-content');
        if (!content) {
            return;
        }
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
        
        this.syncAccessibilityState(group);
        this.saveCollapsedState();
    }

    syncAccessibilityState(group) {
        const header = group.querySelector(':scope > .settings-group-header');
        const content = group.querySelector(':scope > .settings-group-content');
        if (!header || !content) {
            return;
        }

        header.setAttribute('aria-controls', content.id);
        header.setAttribute('aria-expanded', group.classList.contains('collapsed') ? 'false' : 'true');
        content.setAttribute('aria-hidden', group.classList.contains('collapsed') ? 'true' : 'false');
    }

    syncContentHeight(group) {
        const content = group.querySelector(':scope > .settings-group-content');
        if (!content) {
            return;
        }

        if (group.classList.contains('collapsed')) {
            content.style.maxHeight = '0px';
            return;
        }

        content.style.maxHeight = content.scrollHeight + 'px';
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
            this.syncContentHeight(group);
        });
    }
}

window.CollapsibleManager = CollapsibleManager;
window.AboardCollapsibleManager = CollapsibleManager;
