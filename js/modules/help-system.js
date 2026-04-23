/**
 * Help System Module
 * Manages contextual help for configuration panels
 */
class HelpSystem {
    constructor() {
        this.helpMap = {
            'pen-config': 'help.tools.pen',
            'shape-config': 'help.tools.shape',
            'eraser-config': 'help.tools.eraser',
            'select-config': 'help.tools.select',
            'background-config': 'help.background',
            'coordinate-tools-modal': 'help.background',
            'coordinate-point-modal': 'help.background',
            'settings-modal': 'help.settings',
            'time-display-area': 'help.features.timeDisplay',
            'timer-settings-modal': 'help.features.timer',
            'random-picker-settings-modal': 'help.features.randomPicker',
            'teaching-tools-modal': 'help.features.teachingTools',
            // time-display-area help is injected into panel title by HelpSystem.
            'time-display-settings-modal': 'help.features.timeDisplay',
            'insert-text-modal': 'help.features.insertText',
            'line-style-modal': 'help.tools.lineStyle'
        };
        this.helpModalPreviouslyFocusedElement = null;

    }

    init() {
        // Inject help buttons into config panels
        this.injectHelpButtons();
        this.injectIntoSpecialPanels();
        this.bindDataHelpButtons();
        this.removeUnsupportedFeatureButtonHelpButtons();
        this.refreshHelpButtonLabels();

        // Listen for dynamic modals
        this.observeModals();

        window.addEventListener('localeChanged', () => {
            this.injectHelpButtons();
            this.injectIntoSpecialPanels();
            this.checkExistingModals();
            this.bindDataHelpButtons();
            this.removeUnsupportedFeatureButtonHelpButtons();
            this.refreshHelpButtonLabels();
        });
    }

    injectHelpButtons() {
        // Config Panels (Pen, Shape, Eraser, Background)
        const configPanels = document.querySelectorAll('.config-panel');
        configPanels.forEach(panel => {
            if (this.helpMap[panel.id] && !panel.querySelector('.help-btn')) {
                const btn = this.createHelpButton(this.helpMap[panel.id]);
                // Append to the first config-group label if exists, or just prepend
                const firstGroup = panel.querySelector('.config-group');
                if (firstGroup) {
                    const label = firstGroup.querySelector('label');
                    if (label) {
                        this.attachHelpButtonToInlineContainer(label, btn);
                    }
                }
            }
        });
    }

    injectIntoSpecialPanels() {
        const timeDisplayArea = document.getElementById('time-display-area');
        if (timeDisplayArea) {
            this.injectIntoPanel(timeDisplayArea);
        }
    }

    bindDataHelpButtons() {
        document.querySelectorAll('[data-help-key]').forEach((btn) => {
            this.bindHelpButton(btn);
        });
    }

    bindHelpButton(btn) {
        if (!btn || btn.dataset.helpBound === 'true') {
            return;
        }

        btn.dataset.helpBound = 'true';

        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const helpKey = btn.dataset.helpKey;
            if (helpKey) {
                this.showHelp(helpKey);
            }
        });

        if (btn.tagName === 'BUTTON' || btn.getAttribute('role') === 'button') {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    const helpKey = btn.dataset.helpKey;
                    if (helpKey) {
                        this.showHelp(helpKey);
                    }
                }
            });
        }
    }

    observeModals() {
        // List of modal IDs that should have help buttons
        const helpModalIds = [
            'settings-modal',
            'coordinate-tools-modal',
            'coordinate-point-modal',
            'random-picker-settings-modal',
            'timer-settings-modal',
            'teaching-tools-modal',
            'time-display-settings-modal',
            'insert-text-modal',
            'line-style-modal'
        ];
        
        // MutationObserver to detect when settings modals are created/shown
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && helpModalIds.includes(node.id)) {
                            this.injectIntoModal(node);
                        }
                    });
                }
                // Also check for class changes (modal being shown)
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('show')) {
                        this.checkAndInjectModal(target.id);
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        // Check existing modals after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.checkExistingModals();
        }, 100);
    }
    
    checkExistingModals() {
        const modalIds = ['settings-modal', 'coordinate-tools-modal', 'coordinate-point-modal', 'random-picker-settings-modal', 'timer-settings-modal', 'teaching-tools-modal', 'time-display-settings-modal', 'insert-text-modal', 'line-style-modal'];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) this.injectIntoModal(modal);
        });
        
    }
    
    checkAndInjectModal(modalId) {
        if (this.helpMap[modalId]) {
            const modal = document.getElementById(modalId);
            if (modal) this.injectIntoModal(modal);
        }
    }

    injectIntoModal(modal) {
        if (this.helpMap[modal.id] && !modal.querySelector('.help-btn')) {
            // Try standard .modal-header or specific custom modal headers
            const header = modal.querySelector('.modal-header')
                || modal.querySelector('.timer-modal-header')
                || modal.querySelector('.line-style-modal-header');
            if (header) {
                const btn = this.createHelpButton(this.helpMap[modal.id]);
                btn.style.marginLeft = '8px';
                btn.style.marginRight = '0';
                btn.style.flexShrink = '0';
                
                // Find the h2 title element and insert help button after it
                const h2 = header.querySelector('h2');
                if (h2) {
                    if (!h2.querySelector('.help-btn')) {
                        this.attachHelpButtonToInlineContainer(h2, btn, {
                            display: 'inline-flex',
                            width: 'auto'
                        });
                    }
                } else {
                    // Fallback: insert before close button
                    const closeBtn = header.querySelector('.modal-close-btn');
                    if (closeBtn) {
                        header.insertBefore(btn, closeBtn);
                    } else {
                        header.appendChild(btn);
                    }
                }
            }
        }
    }
    
    injectIntoPanel(panel) {
        if (this.helpMap[panel.id] && !panel.querySelector('.help-btn')) {
            const firstGroup = panel.querySelector('.config-group');
            if (firstGroup) {
                const label = firstGroup.querySelector('label');
                if (label && !label.querySelector('.help-btn')) {
                    const btn = this.createHelpButton(this.helpMap[panel.id]);
                    this.attachHelpButtonToInlineContainer(label, btn);
                }
            }
        }
    }

    ensureInlineTextWrapper(container) {
        if (!container) {
            return null;
        }

        let wrapper = Array.from(container.children).find(child => child.classList?.contains('help-inline-text'));
        if (wrapper) {
            return wrapper;
        }

        const hasOwnTranslation = container.hasAttribute('data-i18n');
        const hasNonHelpElementChildren = Array.from(container.children).some(
            child => !child.classList?.contains('help-btn')
        );

        if (!hasOwnTranslation && hasNonHelpElementChildren) {
            return null;
        }

        wrapper = document.createElement('span');
        wrapper.className = 'help-inline-text';

        if (hasOwnTranslation) {
            wrapper.setAttribute('data-i18n', container.getAttribute('data-i18n'));
            container.removeAttribute('data-i18n');
        }

        while (container.firstChild) {
            wrapper.appendChild(container.firstChild);
        }

        container.appendChild(wrapper);
        return wrapper;
    }

    attachHelpButtonToInlineContainer(container, btn, options = {}) {
        const {
            display = 'flex',
            width = '100%'
        } = options;

        if (container.tagName === 'LABEL') {
            let wrapper = container.parentElement;
            if (!wrapper || !wrapper.classList.contains('help-inline-container')) {
                wrapper = document.createElement('div');
                wrapper.className = 'help-inline-container';
                container.parentNode.insertBefore(wrapper, container);
                wrapper.appendChild(container);
            }

            wrapper.style.display = display;
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'flex-start';
            wrapper.style.gap = '8px';
            if (width) {
                wrapper.style.width = width;
            }

            container.style.marginBottom = '0';
            container.style.flex = '1 1 auto';
            btn.style.marginLeft = '0';
            wrapper.appendChild(btn);
            return;
        }

        this.ensureInlineTextWrapper(container);
        container.style.display = display;
        container.style.alignItems = 'center';
        container.style.justifyContent = 'flex-start';
        container.style.gap = '8px';
        if (width) {
            container.style.width = width;
        }
        btn.style.marginLeft = '0';
        container.appendChild(btn);
    }

    createHelpButton(helpKey) {
        const btn = document.createElement('button');
        btn.className = 'help-btn color-picker-icon-btn';
        btn.type = 'button';
        btn.dataset.helpKey = helpKey;
        btn.setAttribute('data-i18n-title', 'common.help');
        btn.setAttribute('aria-label', window.i18n?.t('common.help') || 'Help');
        btn.title = window.i18n?.t('common.help') || 'Help';
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                <line x1="12" y1="17" x2="12" y2="17"></line>
            </svg>
        `;
        btn.style.cssText = 'width:28px;height:28px;margin-left:8px;flex-shrink:0;';
        this.bindHelpButton(btn);
        return btn;
    }

    removeUnsupportedFeatureButtonHelpButtons() {
        document.querySelectorAll('#feature-area .feature-btn .help-btn').forEach((btn) => {
            btn.remove();
        });
    }

    refreshHelpButtonLabels() {
        const helpLabel = window.i18n?.t('common.help') || 'Help';
        const helpButtons = document.querySelectorAll(
            '.help-btn, .random-picker-help-btn, .scoreboard-help-btn, .timer-help-btn, .image-help-btn'
        );

        helpButtons.forEach((btn) => {
            btn.title = helpLabel;
            btn.setAttribute('aria-label', helpLabel);
        });
    }

    showHelp(key) {
        const content = window.i18n.t(key);
        const modalId = 'help-modal';
        let modal = document.getElementById(modalId);
        const scheduleFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (callback) => callback();
        const closeModal = () => {
            if (!modal) {
                return;
            }
            modal.classList.remove('show');
            const restoreFocusTarget = this.helpModalPreviouslyFocusedElement;
            this.helpModalPreviouslyFocusedElement = null;
            scheduleFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        };

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'help-modal-title');
            modal.setAttribute('aria-describedby', 'help-modal-content');
            modal.tabIndex = -1;
            // Set highest z-index to ensure help modal is always on top
            modal.style.zIndex = '99999';
            modal.innerHTML = `
                <div class="modal-content help-modal-content">
                    <div class="modal-header">
                        <h2 id="help-modal-title"></h2>
                        <button class="modal-close-btn" type="button" data-i18n-title="common.close" aria-label="Close" title="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="help-modal-content" class="help-content"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            window.drawingBoard?.registerResizableModal?.({
                key: 'helpModal',
                selector: '#help-modal .help-modal-content',
                minWidth: 420,
                minHeight: 320
            });
            window.drawingBoard?.syncResizableModalState?.(modalId);

            modal.querySelector('.modal-close-btn').addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal();
                }
            });
        }

        this.helpModalPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;

        // Update title in case language changed
        modal.querySelector('#help-modal-title').textContent = window.i18n.t('common.help');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const closeLabel = window.i18n?.t('common.close') || 'Close';
        if (closeBtn) {
            closeBtn.title = closeLabel;
            closeBtn.setAttribute('aria-label', closeLabel);
        }

        const helpContentElement = modal.querySelector('.help-content');
        if (helpContentElement) {
            if (window.RichTextParser) {
                helpContentElement.innerHTML = window.RichTextParser.parse(content);
            } else {
                helpContentElement.textContent = Array.isArray(content)
                    ? content.join('\n')
                    : String(content || '');
            }
            helpContentElement.scrollTop = 0;
        }
        modal.classList.add('show');
        scheduleFrame(() => {
            closeBtn?.focus?.();
        });
    }
}

window.HelpSystem = HelpSystem;
window.AboardHelpSystem = HelpSystem;
