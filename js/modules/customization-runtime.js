// Extracted toolbar/control customization runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function safeCustomizationStorageGetItem(key, label = 'customization') {
        try {
                return localStorage.getItem(key);
        } catch (error) {
                console.warn(`Failed to read ${label} localStorage key "${key}":`, error);
                return null;
        }
}

function safeCustomizationStorageSetItem(key, value, label = 'customization') {
        try {
                localStorage.setItem(key, value);
                return true;
        } catch (error) {
                console.warn(`Failed to write ${label} localStorage key "${key}":`, error);
                return false;
        }
}

function initToolbarCustomization() {
        const toolbarList = document.getElementById('toolbar-customization-list');
        if (!toolbarList) return;
        
        // Load saved settings
        const savedToolbarOrder = safeCustomizationStorageGetItem('toolbarOrder', 'toolbar');
        const savedToolbarVisibility = safeCustomizationStorageGetItem('toolbarVisibility', 'toolbar');
        
        if (savedToolbarOrder) {
            try {
                const order = JSON.parse(savedToolbarOrder);
                this.reorderToolbarItems(toolbarList, order);
            } catch (e) {
                console.error('Error loading toolbar order:', e);
            }
        }
        
        if (savedToolbarVisibility) {
            try {
                const visibility = JSON.parse(savedToolbarVisibility);
                Object.keys(visibility).forEach(tool => {
                    const checkbox = document.getElementById(`toolbar-show-${tool}`);
                    if (checkbox) {
                        checkbox.checked = visibility[tool];
                    }
                });
                this.applyToolbarVisibility(visibility);
            } catch (e) {
                console.error('Error loading toolbar visibility:', e);
            }
        }
        
        // Add drag and drop handlers
        const items = toolbarList.querySelectorAll('.toolbar-item');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.tool);
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.saveToolbarOrder();
                this.applyToolbarOrder();
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = toolbarList.querySelector('.dragging');
                if (dragging && dragging !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        toolbarList.insertBefore(dragging, item);
                    } else {
                        toolbarList.insertBefore(dragging, item.nextSibling);
                    }
                }
            });
            
            // Checkbox change handler
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.saveToolbarVisibility();
                    this.applyToolbarVisibility();
                });
            }
        });
    
}

function reorderToolbarItems(container, order) {
        order.forEach(tool => {
            const item = container.querySelector(`[data-tool="${tool}"]`);
            if (item) {
                container.appendChild(item);
            }
        });
    
}

function saveToolbarOrder() {
        const items = document.querySelectorAll('#toolbar-customization-list .toolbar-item');
        const order = Array.from(items).map(item => item.dataset.tool);
        safeCustomizationStorageSetItem('toolbarOrder', JSON.stringify(order), 'toolbar');
    
}

function saveToolbarVisibility() {
        const items = document.querySelectorAll('#toolbar-customization-list .toolbar-item');
        const visibility = {};
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                visibility[item.dataset.tool] = checkbox.checked;
            }
        });
        safeCustomizationStorageSetItem('toolbarVisibility', JSON.stringify(visibility), 'toolbar');
    
}

function getToolToButtonIdMap() {
        return {
            'undo': 'undo-btn',
            'redo': 'redo-btn',
            'pen': 'pen-btn',
            'pan': 'pan-btn',
            'eraser': 'eraser-btn',
            'clear': 'clear-btn',
            'background': 'background-btn',
            'more': 'more-btn',
            'settings': 'settings-btn'
        };
    
}

function applyToolbarOrder() {
        const savedOrder = safeCustomizationStorageGetItem('toolbarOrder', 'toolbar');
        if (!savedOrder) return;
        
        try {
            const order = JSON.parse(savedOrder);
            const toolbar = document.getElementById('toolbar');
            if (!toolbar) return;
            
            const toolToButtonId = this.getToolToButtonIdMap();
            
            order.forEach(tool => {
                const btnId = toolToButtonId[tool];
                const btn = document.getElementById(btnId);
                if (btn) {
                    toolbar.appendChild(btn);
                }
            });
        } catch (e) {
            console.error('Error applying toolbar order:', e);
        }
    
}

function applyToolbarVisibility(visibility) {
        if (!visibility) {
            const savedVisibility = safeCustomizationStorageGetItem('toolbarVisibility', 'toolbar');
            if (!savedVisibility) return;
            try {
                visibility = JSON.parse(savedVisibility);
            } catch (e) {
                return;
            }
        }
        
        const toolToButtonId = this.getToolToButtonIdMap();
        
        Object.keys(visibility).forEach(tool => {
            const btnId = toolToButtonId[tool];
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = visibility[tool] ? 'flex' : 'none';
            }
        });
    
}

function initControlButtonSettings() {
        // Load saved settings
        const controlSettings = {
            zoom: safeCustomizationStorageGetItem('controlShowZoom', 'control button') !== 'false',
            pagination: safeCustomizationStorageGetItem('controlShowPagination', 'control button') !== 'false',
            time: safeCustomizationStorageGetItem('controlShowTime', 'control button') !== 'false',
            fullscreen: safeCustomizationStorageGetItem('controlShowFullscreen', 'control button') !== 'false',
            import: safeCustomizationStorageGetItem('controlShowImport', 'control button') !== 'false',
            export: safeCustomizationStorageGetItem('controlShowExport', 'control button') !== 'false'
        };
        
        // Load saved order
        const savedOrder = safeCustomizationStorageGetItem('controlButtonOrder', 'control button');
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                this.reorderControlButtonList(order);
                this.reorderControlButtons(order);
            } catch (e) {
                console.error('Failed to load control button order:', e);
            }
        }
        
        // Set checkbox states with null checks
        const zoomCheckbox = document.getElementById('control-show-zoom');
        const paginationCheckbox = document.getElementById('control-show-pagination');
        const timeCheckbox = document.getElementById('control-show-time');
        const fullscreenCheckbox = document.getElementById('control-show-fullscreen');
        const importCheckbox = document.getElementById('control-show-import');
        const exportCheckbox = document.getElementById('control-show-export');
        
        if (zoomCheckbox) zoomCheckbox.checked = controlSettings.zoom;
        if (paginationCheckbox) paginationCheckbox.checked = controlSettings.pagination;
        if (timeCheckbox) timeCheckbox.checked = controlSettings.time;
        if (fullscreenCheckbox) fullscreenCheckbox.checked = controlSettings.fullscreen;
        if (importCheckbox) importCheckbox.checked = controlSettings.import;
        if (exportCheckbox) exportCheckbox.checked = controlSettings.export;
        
        // Apply initial visibility
        this.applyControlButtonVisibility(controlSettings);
        
        // Add event listeners with null checks
        if (zoomCheckbox) {
            zoomCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowZoom', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        if (paginationCheckbox) {
            paginationCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowPagination', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        if (timeCheckbox) {
            timeCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowTime', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        if (fullscreenCheckbox) {
            fullscreenCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowFullscreen', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        if (importCheckbox) {
            importCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowImport', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        if (exportCheckbox) {
            exportCheckbox.addEventListener('change', (e) => {
                safeCustomizationStorageSetItem('controlShowExport', e.target.checked, 'control button');
                this.applyControlButtonVisibility();
            });
        }
        
        // Initialize drag-and-drop for control button ordering
        this.initControlButtonDragDrop();
    
}

function initControlButtonDragDrop() {
        const list = document.getElementById('control-button-list');
        if (!list) return;
        
        let draggedItem = null;
        
        list.querySelectorAll('.control-button-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                list.querySelectorAll('.control-button-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                draggedItem = null;
                
                // Save the new order
                this.saveControlButtonOrder();
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            item.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (item !== draggedItem) {
                    item.classList.add('drag-over');
                }
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (item !== draggedItem && draggedItem) {
                    // Swap positions
                    const allItems = [...list.querySelectorAll('.control-button-item')];
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const dropIndex = allItems.indexOf(item);
                    
                    if (draggedIndex < dropIndex) {
                        list.insertBefore(draggedItem, item.nextSibling);
                    } else {
                        list.insertBefore(draggedItem, item);
                    }
                }
                item.classList.remove('drag-over');
            });
        });
    
}

function saveControlButtonOrder() {
        const list = document.getElementById('control-button-list');
        if (!list) return;
        
        const order = [...list.querySelectorAll('.control-button-item')]
            .map(item => item.dataset.control)
            .filter(control => control !== undefined);
        safeCustomizationStorageSetItem('controlButtonOrder', JSON.stringify(order), 'control button');
        
        // Apply the order to actual control buttons
        this.reorderControlButtons(order);
    
}

function reorderControlButtonList(order) {
        const list = document.getElementById('control-button-list');
        if (!list || !order) return;
        
        order.forEach(controlName => {
            const item = list.querySelector(`[data-control="${controlName}"]`);
            if (item) {
                list.appendChild(item);
            }
        });
    
}

function reorderControlButtons(order) {
        const controlArea = document.getElementById('history-controls');
        if (!controlArea || !order) return;

        // Map control names to their element IDs.
        // NOTE: #pagination-controls and #time-display-area are independent
        // position:fixed panels living outside #history-controls. Reparenting
        // them in here would make #history-controls (which has will-change:
        // transform) their containing block and break their fixed positioning
        // and drag coordinates — so they are never moved, only shown/hidden
        // by applyControlButtonVisibility.
        const controlElements = {
            zoom: ['zoom-out-btn', 'zoom-input', 'zoom-in-btn'],
            fullscreen: ['fullscreen-btn'],
            import: ['import-project-btn'],
            export: ['export-btn-top']
        };
        
        // Get all control elements and store them
        const elements = {};
        Object.keys(controlElements).forEach(control => {
            elements[control] = controlElements[control].map(id => document.getElementById(id)).filter(el => el);
        });
        
        // Reorder based on the saved order
        order.forEach(control => {
            if (elements[control]) {
                elements[control].forEach(el => {
                    controlArea.appendChild(el);
                });
            }
        });
        
        // Append any remaining controls that weren't in the order
        Object.keys(elements).forEach(control => {
            if (!order.includes(control)) {
                elements[control].forEach(el => {
                    controlArea.appendChild(el);
                });
            }
        });
    
}

function applyControlButtonVisibility(settings) {
        if (!settings) {
            settings = {
                zoom: safeCustomizationStorageGetItem('controlShowZoom', 'control button') !== 'false',
                pagination: safeCustomizationStorageGetItem('controlShowPagination', 'control button') !== 'false',
                time: safeCustomizationStorageGetItem('controlShowTime', 'control button') !== 'false',
                fullscreen: safeCustomizationStorageGetItem('controlShowFullscreen', 'control button') !== 'false',
                import: safeCustomizationStorageGetItem('controlShowImport', 'control button') !== 'false',
                export: safeCustomizationStorageGetItem('controlShowExport', 'control button') !== 'false'
            };
        }
        
        // Zoom buttons (zoom-out, zoom-input, zoom-in)
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomInput = document.getElementById('zoom-input');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        if (zoomOutBtn) zoomOutBtn.style.display = settings.zoom ? 'flex' : 'none';
        if (zoomInput) zoomInput.style.display = settings.zoom ? 'block' : 'none';
        if (zoomInBtn) zoomInBtn.style.display = settings.zoom ? 'flex' : 'none';
        
        // Pagination controls (correct ID is pagination-controls)
        const paginationControls = document.getElementById('pagination-controls');
        if (paginationControls) paginationControls.style.display = settings.pagination ? 'flex' : 'none';
        
        // Time display - handle both the time widget and its config area
        // The main widget uses .show class with !important, so we toggle the class
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            if (settings.time) {
                timeDisplay.classList.add('show');
            } else {
                timeDisplay.classList.remove('show');
            }
        }
        // Also handle the config area visibility
        const timeDisplayArea = document.getElementById('time-display-area');
        if (timeDisplayArea) {
            if (!settings.time) {
                timeDisplayArea.style.display = 'none';
            }
            // Note: We don't restore display here because the config area is shown/hidden by clicking the time widget
        }
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) fullscreenBtn.style.display = settings.fullscreen ? 'flex' : 'none';
        
        // Import button
        const importBtn = document.getElementById('import-project-btn');
        if (importBtn) importBtn.style.display = settings.import ? 'flex' : 'none';
        
        // Export button
        const exportBtnTop = document.getElementById('export-btn-top');
        if (exportBtnTop) exportBtnTop.style.display = settings.export ? 'flex' : 'none';
    
}

window.AboardCustomizationRuntime = {
    initToolbarCustomization(board) {
        return initToolbarCustomization.call(board);
    },
    reorderToolbarItems(board, container, order) {
        return reorderToolbarItems.call(board, container, order);
    },
    saveToolbarOrder(board) {
        return saveToolbarOrder.call(board);
    },
    saveToolbarVisibility(board) {
        return saveToolbarVisibility.call(board);
    },
    getToolToButtonIdMap(board) {
        return getToolToButtonIdMap.call(board);
    },
    applyToolbarOrder(board) {
        return applyToolbarOrder.call(board);
    },
    applyToolbarVisibility(board, visibility) {
        return applyToolbarVisibility.call(board, visibility);
    },
    initControlButtonSettings(board) {
        return initControlButtonSettings.call(board);
    },
    initControlButtonDragDrop(board) {
        return initControlButtonDragDrop.call(board);
    },
    saveControlButtonOrder(board) {
        return saveControlButtonOrder.call(board);
    },
    reorderControlButtonList(board, order) {
        return reorderControlButtonList.call(board, order);
    },
    reorderControlButtons(board, order) {
        return reorderControlButtons.call(board, order);
    },
    applyControlButtonVisibility(board, settings) {
        return applyControlButtonVisibility.call(board, settings);
    }
};
