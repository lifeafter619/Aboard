// Export Module
// Handles exporting canvas content to image files

function getExportText(key, fallback) {
    if (!window.i18n?.t) {
        return fallback;
    }

    const translated = window.i18n.t(key);
    return translated && translated !== key ? translated : fallback;
}

function escapeExportHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getActiveExportTab() {
    return document.querySelector('.export-tab-btn.active')?.dataset.tab || 'image';
}

function getActiveProjectExportScope() {
    return document.querySelector('.export-project-scope-btn.active')?.dataset.scope || 'current';
}

function getActiveImageExportScope() {
    return document.querySelector('.export-scope-btn.active')?.dataset.scope || 'current';
}

function getActiveExportFormat() {
    return document.querySelector('.export-format-btn.active')?.dataset.format || 'png';
}

class ExportManager {
    constructor(canvas, bgCanvas, drawingBoard = null) {
        this.canvas = canvas;
        this.bgCanvas = bgCanvas;
        this.drawingBoard = drawingBoard;
        this.exportModal = null;
        this.previouslyFocusedElement = null;
        this.handleLocaleChanged = () => {
            this.refreshTranslations();
        };
        
        this.createExportModal();
        this.setupEventListeners();
        this.setupTabAccessibility();
        window.addEventListener('localeChanged', this.handleLocaleChanged);
    }
    
    createExportModal() {
        const title = getExportText('toolbar.export', 'Export Canvas');
        const closeTitle = getExportText('common.close', 'Close');
        const imageTab = getExportText('export.imageTab', 'Export Image');
        const projectTab = getExportText('export.projectTab', 'Export Project (.zip)');
        const scopeLabel = getExportText('export.scopeLabel', 'Export Scope');
        const currentPage = getExportText('export.scopeCurrent', 'Current Page');
        const allPages = getExportText('export.scopeAll', 'All Pages');
        const specificPages = getExportText('export.scopeSpecific', 'Specific Pages');
        const pageSelection = getExportText('export.pageSelectionLabel', 'Select Pages to Export');
        const imageFormat = getExportText('export.imageFormatLabel', 'Image Format');
        const imageQuality = getExportText('export.imageQualityLabel', 'Image Quality');
        const projectHint = getExportText(
            'export.projectHint',
            'Export as a standard .zip project package including pages, backgrounds, and assets. After importing, you can continue editing page objects individually; legacy .aboard imports remain optional in Settings.'
        );
        const filenameLabel = getExportText('export.fileNameLabel', 'File Name');
        const filenamePlaceholder = getExportText('export.fileNamePlaceholder', 'Enter file name');
        const filenameHint = getExportText('export.fileNameHint', 'When exporting multiple pages, page numbers will be appended automatically.');
        const cancelLabel = getExportText('common.cancel', 'Cancel');
        const confirmLabel = getExportText('common.export', 'Export');

        const modalHTML = `
            <div id="export-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title" tabindex="-1">
                <div class="modal-content export-modal-content">
                    <div class="modal-header">
                        <h2 id="export-modal-title">${escapeExportHtml(title)}</h2>
                        <button id="export-close-btn" type="button" class="modal-close-btn" data-i18n-title="common.close" title="${escapeExportHtml(closeTitle)}" aria-label="${escapeExportHtml(closeTitle)}">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Tabs -->
                        <div class="export-tab-nav">
                            <button id="export-tab-image-btn" type="button" class="export-tab-btn active" data-tab="image">${escapeExportHtml(imageTab)}</button>
                            <button id="export-tab-project-btn" type="button" class="export-tab-btn" data-tab="project">${escapeExportHtml(projectTab)}</button>
                        </div>

                        <!-- Image Export Tab -->
                        <div id="export-tab-image" class="export-tab-content active">
                            <div class="export-options">
                                <div class="export-group">
                                    <label id="export-image-scope-label">${escapeExportHtml(scopeLabel)}</label>
                                    <div class="button-size-options button-size-options-3">
                                        <button id="export-image-scope-current-btn" type="button" class="export-scope-btn active" data-scope="current">${escapeExportHtml(currentPage)}</button>
                                        <button id="export-image-scope-all-btn" type="button" class="export-scope-btn" data-scope="all">${escapeExportHtml(allPages)}</button>
                                        <button id="export-image-scope-specific-btn" type="button" class="export-scope-btn" data-scope="specific">${escapeExportHtml(specificPages)}</button>
                                    </div>
                                </div>
                                <div class="export-group page-selection-group" style="display: none;">
                                    <label id="export-image-page-selection-label">${escapeExportHtml(pageSelection)}</label>
                                    <div class="page-selection-buttons"></div>
                                </div>
                                <div class="export-group">
                                    <label id="export-image-format-label">${escapeExportHtml(imageFormat)}</label>
                                    <div class="button-size-options button-size-options-2">
                                        <button type="button" class="export-format-btn active" data-format="png">PNG</button>
                                        <button type="button" class="export-format-btn" data-format="jpeg">JPEG</button>
                                    </div>
                                </div>
                                <div class="export-group" id="jpeg-quality-group" style="display: none;">
                                    <label><span id="export-image-quality-label">${escapeExportHtml(imageQuality)}</span> <span id="export-quality-value">90</span>%</label>
                                    <input type="range" id="export-quality-slider" min="1" max="100" value="90" class="slider" aria-label="${escapeExportHtml(imageQuality)}">
                                </div>
                            </div>
                        </div>

                        <!-- Project Export Tab -->
                        <div id="export-tab-project" class="export-tab-content">
                            <div class="export-options">
                                <div class="export-group">
                                    <label id="export-project-scope-label">${escapeExportHtml(scopeLabel)}</label>
                                    <div class="button-size-options button-size-options-3">
                                        <button id="export-project-scope-current-btn" type="button" class="export-project-scope-btn active" data-scope="current">${escapeExportHtml(currentPage)}</button>
                                        <button id="export-project-scope-all-btn" type="button" class="export-project-scope-btn" data-scope="all">${escapeExportHtml(allPages)}</button>
                                        <button id="export-project-scope-specific-btn" type="button" class="export-project-scope-btn" data-scope="specific">${escapeExportHtml(specificPages)}</button>
                                    </div>
                                </div>
                                <div class="export-group project-page-selection-group" style="display: none;">
                                    <label id="export-project-page-selection-label">${escapeExportHtml(pageSelection)}</label>
                                    <div class="project-page-selection-buttons page-selection-buttons"></div>
                                </div>
                                <div class="export-group">
                                    <p id="export-project-hint" class="export-hint">
                                        ${escapeExportHtml(projectHint)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Shared Filename & Actions -->
                        <div style="margin-top: 20px;">
                            <div class="export-group" id="filename-group">
                                <label id="filename-label">${escapeExportHtml(filenameLabel)}</label>
                                <input type="text" id="export-filename" class="export-filename-input" value="aboard-export" placeholder="${escapeExportHtml(filenamePlaceholder)}" aria-label="${escapeExportHtml(filenameLabel)}">
                                <p class="export-hint" id="export-filename-hint" style="display: none;">${escapeExportHtml(filenameHint)}</p>
                            </div>
                            <div class="export-actions">
                                <button id="export-cancel-btn" type="button" class="button-secondary">${escapeExportHtml(cancelLabel)}</button>
                                <button id="export-confirm-btn" type="button" class="button-primary">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 5px;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span id="export-confirm-btn-label">${escapeExportHtml(confirmLabel)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.exportModal = document.getElementById('export-modal');
        window.i18n?.applyTranslations?.();
        this.refreshTranslations();
    }

    setElementText(selector, text) {
        const element = this.exportModal?.querySelector(selector);
        if (element) {
            element.textContent = text;
        }
    }

    getTabButtons() {
        return this.exportModal ? Array.from(document.querySelectorAll('.export-tab-btn')) : [];
    }

    getTabPanels() {
        return this.exportModal ? Array.from(document.querySelectorAll('.export-tab-content')) : [];
    }

    getActiveTabButton() {
        const tabButtons = this.getTabButtons();
        return tabButtons.find((btn) => btn.classList.contains('active')) || tabButtons[0] || null;
    }

    activateTab(targetTab, { focus = false } = {}) {
        const tabButtons = this.getTabButtons();
        const tabPanels = this.getTabPanels();
        if (tabButtons.length === 0) {
            return null;
        }

        const fallbackTab = tabButtons[0]?.dataset.tab || 'image';
        const nextTab = tabButtons.some((btn) => btn.dataset.tab === targetTab)
            ? targetTab
            : fallbackTab;
        let activeButton = null;

        tabButtons.forEach((btn) => {
            const isActive = btn.dataset.tab === nextTab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.tabIndex = isActive ? 0 : -1;
            if (isActive) {
                activeButton = btn;
            }
        });

        tabPanels.forEach((panel) => {
            const isActive = panel.id === `export-tab-${nextTab}`;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        const activeScope = nextTab === 'project'
            ? getActiveProjectExportScope()
            : getActiveImageExportScope();
        this.updateUIForScope(activeScope, nextTab);

        if (focus) {
            activeButton?.focus?.();
        }

        return activeButton;
    }

    handleTabKeydown(event) {
        const tabButtons = this.getTabButtons();
        if (tabButtons.length === 0) {
            return;
        }

        const currentIndex = tabButtons.indexOf(event.currentTarget);
        if (currentIndex === -1) {
            return;
        }

        let nextIndex = null;
        switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
            nextIndex = (currentIndex + 1) % tabButtons.length;
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
            nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
            break;
        case 'Home':
            nextIndex = 0;
            break;
        case 'End':
            nextIndex = tabButtons.length - 1;
            break;
        default:
            return;
        }

        event.preventDefault();
        const nextButton = tabButtons[nextIndex];
        this.activateTab(nextButton?.dataset.tab, { focus: true });
    }

    setupTabAccessibility() {
        const tabButtons = this.getTabButtons();
        const tabPanels = this.getTabPanels();
        if (tabButtons.length === 0) {
            return;
        }

        tabButtons.forEach((btn, index) => {
            const tabName = btn.dataset.tab || `tab-${index + 1}`;
            if (!btn.id) {
                btn.id = `export-tab-btn-${tabName}`;
            }
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-controls', `export-tab-${tabName}`);

            if (btn.dataset.tabBindingsInitialized !== 'true') {
                btn.dataset.tabBindingsInitialized = 'true';
                btn.addEventListener('click', () => {
                    this.activateTab(tabName);
                });
                btn.addEventListener('keydown', (event) => {
                    this.handleTabKeydown(event);
                });
            }
        });

        tabPanels.forEach((panel) => {
            panel.setAttribute('role', 'tabpanel');
            const labelledBy = tabButtons.find((btn) => `export-tab-${btn.dataset.tab}` === panel.id);
            if (labelledBy) {
                panel.setAttribute('aria-labelledby', labelledBy.id);
            }
        });

        this.activateTab(this.getActiveTabButton()?.dataset.tab);
    }

    refreshTranslations() {
        if (!this.exportModal) {
            return;
        }

        const closeTitle = getExportText('common.close', 'Close');
        const closeBtn = document.getElementById('export-close-btn');
        if (closeBtn) {
            closeBtn.title = closeTitle;
            closeBtn.setAttribute('aria-label', closeTitle);
        }

        this.setElementText('#export-modal-title', getExportText('toolbar.export', 'Export Canvas'));
        this.setElementText('#export-tab-image-btn', getExportText('export.imageTab', 'Export Image'));
        this.setElementText('#export-tab-project-btn', getExportText('export.projectTab', 'Export Project (.zip)'));
        this.setElementText('#export-image-scope-label', getExportText('export.scopeLabel', 'Export Scope'));
        this.setElementText('#export-project-scope-label', getExportText('export.scopeLabel', 'Export Scope'));
        this.setElementText('#export-image-scope-current-btn', getExportText('export.scopeCurrent', 'Current Page'));
        this.setElementText('#export-image-scope-all-btn', getExportText('export.scopeAll', 'All Pages'));
        this.setElementText('#export-image-scope-specific-btn', getExportText('export.scopeSpecific', 'Specific Pages'));
        this.setElementText('#export-project-scope-current-btn', getExportText('export.scopeCurrent', 'Current Page'));
        this.setElementText('#export-project-scope-all-btn', getExportText('export.scopeAll', 'All Pages'));
        this.setElementText('#export-project-scope-specific-btn', getExportText('export.scopeSpecific', 'Specific Pages'));
        this.setElementText('#export-image-page-selection-label', getExportText('export.pageSelectionLabel', 'Select Pages to Export'));
        this.setElementText('#export-project-page-selection-label', getExportText('export.pageSelectionLabel', 'Select Pages to Export'));
        this.setElementText('#export-image-format-label', getExportText('export.imageFormatLabel', 'Image Format'));
        this.setElementText('#export-image-quality-label', getExportText('export.imageQualityLabel', 'Image Quality'));
        this.setElementText('#export-project-hint', getExportText(
            'export.projectHint',
            'Export as a standard .zip project package including pages, backgrounds, and assets. After importing, you can continue editing page objects individually; legacy .aboard imports remain optional in Settings.'
        ));
        this.setElementText('#export-filename-hint', getExportText(
            'export.fileNameHint',
            'When exporting multiple pages, page numbers will be appended automatically.'
        ));
        this.setElementText('#export-cancel-btn', getExportText('common.cancel', 'Cancel'));
        this.setElementText('#export-confirm-btn-label', getExportText('common.export', 'Export'));

        const filenameInput = document.getElementById('export-filename');
        if (filenameInput) {
            filenameInput.placeholder = getExportText('export.fileNamePlaceholder', 'Enter file name');
        }

        const activeTab = getActiveExportTab();
        const activeScope = activeTab === 'project'
            ? getActiveProjectExportScope()
            : getActiveImageExportScope();
        this.updateUIForScope(activeScope, activeTab);
        window.i18n?.applyTranslations?.();
    }
    
    setupEventListeners() {
        // Image Export Scope
        document.querySelectorAll('.export-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                
                const scope = targetButton.dataset.scope;
                this.updateUIForScope(scope, 'image');
            });
        });

        // Project Export Scope
        document.querySelectorAll('.export-project-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                document.querySelectorAll('.export-project-scope-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');

                const scope = targetButton.dataset.scope;
                this.updateUIForScope(scope, 'project');
            });
        });
        
        // Format buttons
        document.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                
                // Show/hide quality slider for JPEG
                const format = targetButton.dataset.format;
                const qualityGroup = document.getElementById('jpeg-quality-group');
                if (format === 'jpeg') {
                    qualityGroup.style.display = 'block';
                } else {
                    qualityGroup.style.display = 'none';
                }
            });
        });
        
        // Quality slider
        const qualitySlider = document.getElementById('export-quality-slider');
        const qualityValue = document.getElementById('export-quality-value');
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value;
        });
        
        // Close buttons
        document.getElementById('export-close-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('export-cancel-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Confirm export
        document.getElementById('export-confirm-btn').addEventListener('click', () => {
            this.handleExportConfirm();
        });
        
        // Click outside to close
        this.exportModal.addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                this.closeModal();
            }
        });

        this.exportModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeModal();
            }
        });
    }
    
    updateUIForScope(scope, type) {
        let selectionGroup, buttonsContainer;

        if (type === 'image') {
            selectionGroup = document.querySelector('.page-selection-group');
            buttonsContainer = document.querySelector('.page-selection-buttons');
        } else {
            selectionGroup = document.querySelector('.project-page-selection-group');
            buttonsContainer = document.querySelector('.project-page-selection-buttons');
        }

        const filenameHint = document.getElementById('export-filename-hint');
        const filenameLabel = document.getElementById('filename-label');
        
        // Update selection UI
        if (scope === 'specific') {
            selectionGroup.style.display = 'block';
            this.generatePageSelectionButtons(buttonsContainer);
        } else {
            selectionGroup.style.display = 'none';
        }

        // Update filename hint (only relevant for Image export "All/Specific" where it generates multiple files)
        // For project export, it's always one file
        if (type === 'image' && (scope === 'all' || scope === 'specific')) {
            filenameHint.style.display = 'block';
            filenameLabel.textContent = getExportText('export.fileNamePrefixLabel', 'File Name Prefix');
        } else {
            filenameHint.style.display = 'none';
            filenameLabel.textContent = getExportText('export.fileNameLabel', 'File Name');
        }
    }
    
    generatePageSelectionButtons(container) {
        if (!container) return;
        
        container.innerHTML = '';

        const renderHint = (text) => {
            const hint = document.createElement('p');
            hint.className = 'export-hint';
            hint.textContent = text;
            container.appendChild(hint);
        };
        
        if (!this.drawingBoard || !this.drawingBoard.pages) {
            renderHint(getExportText('export.paginationRequired', 'Pagination required'));
            return;
        }
        
        const pageCount = this.drawingBoard.pages.length;
        if (pageCount === 0) {
            renderHint(getExportText('export.noPages', 'No pages'));
            return;
        }
        
        // Create a checkbox button for each page (show even if there's only 1 page)
        for (let i = 0; i < pageCount; i++) {
            const pageNum = i + 1;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'page-selection-btn';
            button.dataset.pageNum = pageNum;
            button.textContent = pageNum;
            
            // Select current page by default
            if (this.drawingBoard.currentPage === pageNum) {
                button.classList.add('selected');
            }
            
            button.addEventListener('click', () => {
                button.classList.toggle('selected');
            });
            
            container.appendChild(button);
        }
    }

    handleExportConfirm() {
        const activeTab = getActiveExportTab();

        if (activeTab === 'image') {
            this.exportCanvas().catch(error => {
                console.error('Export failed:', error);
                const message = getExportText('export.failed', 'Export failed. Please try again.');
                window.appDialog?.showAlert?.(message, 'error');
            });
        } else {
            this.exportProject().catch(error => {
                console.error('Project export failed:', error);
                const message = getExportText('export.failed', 'Export failed. Please try again.');
                window.appDialog?.showAlert?.(message, 'error');
            });
        }
    }

    async exportProject() {
        const scope = getActiveProjectExportScope();
        const filename = document.getElementById('export-filename').value || 'aboard-project';

        let selectedPages = [];
        if (scope === 'specific') {
            const selectedButtons = document.querySelectorAll('.project-page-selection-buttons .page-selection-btn.selected');
            if (selectedButtons.length === 0) {
                const msg = getExportText('export.selectAtLeastOnePage', 'Please select at least one page to export');
                window.appDialog?.showAlert(msg, 'warning');
                return;
            }
            selectedPages = Array.from(selectedButtons).map(btn => parseInt(btn.dataset.pageNum, 10));
        }

        let projectManager = this.drawingBoard?.projectManager || null;

        if (!projectManager && typeof this.drawingBoard?.getProjectManager === 'function') {
            try {
                projectManager = await this.drawingBoard.getProjectManager();
            } catch (error) {
                console.error('Failed to load ProjectManager:', error);
                const message = getExportText('export.failed', 'Export failed. Please try again.');
                window.appDialog?.showAlert?.(message, 'error');
                return;
            }
        }

        if (!projectManager) {
            console.error('ProjectManager not found');
            const message = getExportText('export.failed', 'Export failed. Please try again.');
            window.appDialog?.showAlert?.(message, 'error');
            return;
        }

        const exportSucceeded = await projectManager.exportProject(scope, filename, selectedPages);
        if (exportSucceeded === false) {
            return;
        }

        this.closeModal();
    }
    
    showModal() {
        this.refreshTranslations();
        this.previouslyFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;

        // Set default filename with timestamp in user's current timezone
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
        document.getElementById('export-filename').value = `aboard-${timestamp}`;

        // Reset tab state
        document.querySelectorAll('.export-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-tab-btn[data-tab="image"]')?.classList.add('active');
        document.querySelectorAll('.export-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('export-tab-image')?.classList.add('active');

        // Reset image export state
        document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-scope-btn[data-scope="current"]')?.classList.add('active');
        document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-format-btn[data-format="png"]')?.classList.add('active');
        const qualityGroup = document.getElementById('jpeg-quality-group');
        const qualitySlider = document.getElementById('export-quality-slider');
        const qualityValue = document.getElementById('export-quality-value');
        if (qualitySlider) qualitySlider.value = '90';
        if (qualityValue) qualityValue.textContent = '90';
        if (qualityGroup) qualityGroup.style.display = 'none';
        this.updateUIForScope('current', 'image');

        // Reset project export state
        document.querySelectorAll('.export-project-scope-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-project-scope-btn[data-scope="current"]')?.classList.add('active');
        this.updateUIForScope('current', 'project');
        this.activateTab('image');
        this.exportModal.classList.add('show');
        const focusActiveTab = () => {
            (this.getActiveTabButton() || document.getElementById('export-close-btn'))?.focus?.();
        };
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(focusActiveTab);
        } else {
            focusActiveTab();
        }
    }
    
    closeModal() {
        this.exportModal.classList.remove('show');
        const restoreFocusTarget = this.previouslyFocusedElement;
        this.previouslyFocusedElement = null;
        const restoreFocus = () => {
            restoreFocusTarget?.focus?.();
        };
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(restoreFocus);
        } else {
            restoreFocus();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = source;
        });
    }

    getLogicalCanvasSize() {
        const size = this.drawingBoard?.backgroundManager?.getCanvasLogicalSize?.();
        if (size?.width && size?.height) {
            return size;
        }

        const dpr = window.devicePixelRatio || 1;
        return {
            width: this.canvas.clientWidth || (this.canvas.width / dpr),
            height: this.canvas.clientHeight || (this.canvas.height / dpr)
        };
    }

    async drawSvgDocument(tempCtx, svgDocument, outputWidth, outputHeight) {
        if (!svgDocument) return;
        const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument)}`;
        const svgImage = await this.loadImage(source);
        tempCtx.drawImage(svgImage, 0, 0, outputWidth, outputHeight);
    }

    async drawBackgroundImage(tempCtx, outputWidth, outputHeight) {
        const backgroundManager = this.drawingBoard?.backgroundManager;
        if (!backgroundManager || backgroundManager.backgroundPattern !== 'image' || !backgroundManager.backgroundImageData) {
            return;
        }

        const logicalSize = this.getLogicalCanvasSize();
        const scaleX = outputWidth / logicalSize.width;
        const scaleY = outputHeight / logicalSize.height;
        const image = await this.loadImage(backgroundManager.backgroundImageData);
        let transform = backgroundManager.getBackgroundImageTransform?.();

        if (!transform) {
            const width = image.naturalWidth * (backgroundManager.imageSize || 1);
            const height = image.naturalHeight * (backgroundManager.imageSize || 1);
            transform = {
                x: (logicalSize.width - width) / 2,
                y: (logicalSize.height - height) / 2,
                width,
                height,
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false
            };
        }

        tempCtx.save();
        tempCtx.globalAlpha = backgroundManager.patternIntensity ?? 1;
        tempCtx.translate((transform.x + transform.width / 2) * scaleX, (transform.y + transform.height / 2) * scaleY);
        tempCtx.rotate(((transform.rotation || 0) * Math.PI) / 180);
        tempCtx.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1);
        tempCtx.drawImage(
            image,
            -(transform.width * scaleX) / 2,
            -(transform.height * scaleY) / 2,
            transform.width * scaleX,
            transform.height * scaleY
        );
        tempCtx.restore();
    }

    async renderCurrentPageToCanvas(tempCanvas, tempCtx) {
        const backgroundManager = this.drawingBoard?.backgroundManager;
        const logicalSize = this.getLogicalCanvasSize();

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(this.bgCanvas, 0, 0);
        await this.drawBackgroundImage(tempCtx, tempCanvas.width, tempCanvas.height);

        if (backgroundManager) {
            await this.drawSvgDocument(
                tempCtx,
                backgroundManager.getBackgroundPatternSvgDocument?.(logicalSize.width, logicalSize.height),
                tempCanvas.width,
                tempCanvas.height
            );
        }

        tempCtx.drawImage(this.canvas, 0, 0);

        if (backgroundManager) {
            await this.drawSvgDocument(
                tempCtx,
                backgroundManager.getCoordinateOverlaySvgDocument?.(logicalSize.width, logicalSize.height),
                tempCanvas.width,
                tempCanvas.height
            );
        }
    }

    downloadCanvas(tempCanvas, filename, format, quality) {
        const dataURL = format === 'jpeg'
            ? tempCanvas.toDataURL('image/jpeg', quality)
            : tempCanvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataURL;
        link.click();
    }
    
    async exportCanvas() {
        const scope = getActiveImageExportScope();
        const format = getActiveExportFormat();
        const filename = document.getElementById('export-filename').value || 'aboard-export';
        const quality = parseInt(document.getElementById('export-quality-slider').value, 10) / 100;
        if (scope === 'specific') {
            const selectedButtons = document.querySelectorAll('.page-selection-group .page-selection-buttons .page-selection-btn.selected');
            if (selectedButtons.length === 0) {
                window.appDialog?.showAlert(getExportText('export.selectAtLeastOnePage', 'Please select at least one page to export'), 'warning');
                return;
            }
        }

        this.closeModal();

        if (scope === 'current') {
            await this.exportSinglePage(filename, format, quality);
        } else if (scope === 'all' && this.drawingBoard) {
            await this.exportAllPages(filename, format, quality);
        } else if (scope === 'specific' && this.drawingBoard) {
            await this.exportSpecificPages(filename, format, quality);
        } else {
            await this.exportSinglePage(filename, format, quality);
        }
    }
    
    async exportSinglePage(filename, format, quality) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        await this.renderCurrentPageToCanvas(tempCanvas, tempCtx);
        this.downloadCanvas(tempCanvas, filename, format, quality);
    }
    
    async exportAllPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            await this.exportSinglePage(baseFilename, format, quality);
            return;
        }

        const currentPage = this.drawingBoard.currentPage;
        try {
            for (let pageNum = 1; pageNum <= this.drawingBoard.pages.length; pageNum++) {
                await this.drawingBoard.goToPageAsync(pageNum);
                await this.exportSinglePage(`${baseFilename}-${pageNum}`, format, quality);
            }
        } finally {
            if (currentPage !== this.drawingBoard.currentPage) {
                this.drawingBoard.goToPage(currentPage);
            }
        }
    }
    
    async exportSpecificPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            await this.exportSinglePage(baseFilename, format, quality);
            return;
        }
        
        const selectedButtons = document.querySelectorAll('.page-selection-group .page-selection-buttons .page-selection-btn.selected');
        if (selectedButtons.length === 0) {
            window.appDialog?.showAlert(getExportText('export.selectAtLeastOnePage', 'Please select at least one page to export'), 'warning');
            return;
        }
        
        const selectedPages = Array.from(selectedButtons).map(btn => parseInt(btn.dataset.pageNum, 10));
        selectedPages.sort((a, b) => a - b);
        const currentPage = this.drawingBoard.currentPage;

        try {
            for (const pageNum of selectedPages) {
                await this.drawingBoard.goToPageAsync(pageNum);
                await this.exportSinglePage(`${baseFilename}-${pageNum}`, format, quality);
            }
        } finally {
            if (currentPage !== this.drawingBoard.currentPage) {
                this.drawingBoard.goToPage(currentPage);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}
