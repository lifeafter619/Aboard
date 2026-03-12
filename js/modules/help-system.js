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
            'background-config': 'help.background',
            'time-display-area': 'help.features.timeDisplay',
            'timer-settings-modal': 'help.features.timer',
            'random-picker-settings-modal': 'help.features.randomPicker',
            'teaching-tools-modal': 'help.features.teachingTools',
            // time-display-area help is injected into panel title by HelpSystem.
            'time-display-settings-modal': 'help.features.timeDisplay',
            'insert-text-modal': 'help.features.insertText'
        };
    }

    init() {
        // Inject help buttons into config panels
        this.injectHelpButtons();
        this.injectIntoSpecialPanels();
        this.bindDataHelpButtons();

        // Listen for dynamic modals
        this.observeModals();
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
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                        label.style.justifyContent = 'flex-start';
                        label.style.width = '100%';
                        // Prevent clicking label from triggering the button (which is valid for labels containing buttons)
                        label.style.pointerEvents = 'none';
                        btn.style.pointerEvents = 'auto';
                        btn.style.marginLeft = '8px';
                        label.appendChild(btn);
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
            if (btn.dataset.helpBound === 'true') return;
            btn.dataset.helpBound = 'true';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const helpKey = btn.dataset.helpKey;
                if (helpKey) {
                    this.showHelp(helpKey);
                }
            });
        });
    }

    observeModals() {
        // List of modal IDs that should have help buttons
        const helpModalIds = [
            'random-picker-settings-modal',
            'timer-settings-modal',
            'teaching-tools-modal',
            'time-display-settings-modal',
            'insert-text-modal'
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
        const modalIds = ['random-picker-settings-modal', 'timer-settings-modal', 'teaching-tools-modal', 'time-display-settings-modal', 'insert-text-modal'];
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
            // Try standard .modal-header or specific .timer-modal-header
            const header = modal.querySelector('.modal-header') || modal.querySelector('.timer-modal-header');
            if (header) {
                const btn = this.createHelpButton(this.helpMap[modal.id]);
                btn.style.marginLeft = '8px';
                btn.style.marginRight = '0';
                btn.style.flexShrink = '0';
                
                // Find the h2 title element and insert help button after it
                const h2 = header.querySelector('h2');
                if (h2) {
                    // Wrap h2 text with span if not already wrapped
                    if (!h2.querySelector('.help-btn')) {
                        // Make h2 a flex container to align title and help button
                        h2.style.display = 'flex';
                        h2.style.alignItems = 'center';
                        h2.style.gap = '8px';
                        h2.appendChild(btn);
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
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.justifyContent = 'flex-start';
                    label.style.width = '100%';
                    // Prevent clicking label from triggering the button
                    label.style.pointerEvents = 'none';
                    btn.style.pointerEvents = 'auto';
                    btn.style.marginLeft = '8px';
                    label.appendChild(btn);
                }
            }
        }
    }

    createHelpButton(helpKey) {
        const btn = document.createElement('button');
        btn.className = 'help-btn color-picker-icon-btn';
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                <line x1="12" y1="17" x2="12" y2="17"></line>
            </svg>
        `;
        btn.style.cssText = 'width:28px;height:28px;margin-left:8px;flex-shrink:0;';
        btn.title = window.i18n.t('common.help') || 'Help';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showHelp(helpKey);
        });

        return btn;
    }

    showHelp(key) {
        const content = window.i18n.t(key);
        const modalId = 'help-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            // Set highest z-index to ensure help modal is always on top
            modal.style.zIndex = '99999';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:500px;">
                    <div class="modal-header">
                        <h2>${window.i18n.t('common.help')}</h2>
                        <button class="modal-close-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="modal-body help-content" style="white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #333;"></div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.modal-close-btn').addEventListener('click', () => {
                modal.classList.remove('show');
            });

            modal.addEventListener('click', (e) => {
                if(e.target === modal) modal.classList.remove('show');
            });
        }

        // Update title in case language changed
        modal.querySelector('h2').textContent = window.i18n.t('common.help');

        // Parse simple markdown-like syntax using RichTextParser
        let formattedContent = window.RichTextParser ? window.RichTextParser.parse(content) : content;
        modal.querySelector('.help-content').innerHTML = formattedContent;
        modal.classList.add('show');
    }
}

window.HelpSystem = HelpSystem;
