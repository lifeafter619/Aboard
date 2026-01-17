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
            'timer-settings-modal': 'help.features.timer',
            'random-picker-settings-modal': 'help.features.randomPicker',
            'scoreboard-feature-btn': 'help.features.scoreboard'
        };
    }

    init() {
        // Inject help buttons into config panels
        this.injectHelpButtons();

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
                        label.style.justifyContent = 'space-between';
                        label.style.width = '100%';
                        // Add padding-right to prevent overlap with close button
                        // Close button is 28px wide + 8px from right edge = 36px
                        label.style.paddingRight = '40px';
                        label.appendChild(btn);
                    }
                }
            }
        });
    }

    observeModals() {
        // MutationObserver to detect when settings modals are created/shown
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && (node.id === 'random-picker-settings-modal' || node.id === 'timer-settings-modal')) {
                            this.injectIntoModal(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true });

        // Also check existing
        const rpModal = document.getElementById('random-picker-settings-modal');
        if (rpModal) this.injectIntoModal(rpModal);

        const timerModal = document.getElementById('timer-settings-modal');
        if (timerModal) this.injectIntoModal(timerModal);
    }

    injectIntoModal(modal) {
        if (this.helpMap[modal.id] && !modal.querySelector('.help-btn')) {
            const header = modal.querySelector('.modal-header');
            if (header) {
                const btn = this.createHelpButton(this.helpMap[modal.id]);
                btn.style.marginRight = '10px';
                // Insert before close button
                const closeBtn = header.querySelector('.modal-close-btn');
                if (closeBtn) {
                    header.insertBefore(btn, closeBtn);
                } else {
                    header.appendChild(btn);
                }
            }
        }
    }

    parseRichText(text) {
        if (!text) return '';

        // Escape HTML first to prevent XSS
        let result = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Bold: **text**
        result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Underline: __text__
        result = result.replace(/__(.*?)__/g, '<u>$1</u>');

        // Color: [color=red]text[/color] or [color=#ff0000]text[/color]
        result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');

        // Size: [size=20px]text[/size]
        result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, '<span style="font-size:$1">$2</span>');

        // Newlines to breaks or divs
        // If content has multiple lines, wrap them or use <br>
        // Ideally, split by newline and wrap in divs for better spacing
        if (result.includes('\n')) {
            result = result.split('\n').map(line => {
                if (!line.trim()) return '<br>';
                // Check for lists
                if (line.trim().match(/^\d+\./)) {
                    return `<div style="margin-bottom:4px; font-weight:bold;">${line}</div>`;
                }
                if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                    return `<div style="margin-bottom:4px; padding-left:10px;">${line}</div>`;
                }
                return `<div>${line}</div>`;
            }).join('');
        }

        return result;
    }

    createHelpButton(helpKey) {
        const btn = document.createElement('button');
        btn.className = 'help-btn';
        btn.innerHTML = '?';
        btn.style.cssText = 'width:24px;height:24px;border-radius:50%;border:1px solid #ddd;background:#f5f5f5;color:#666;font-size:14px;cursor:pointer;margin-left:8px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;';
        btn.title = window.i18n.t('common.help') || 'Help';

        btn.onmouseover = () => {
            btn.style.background = '#e0e0e0';
            btn.style.borderColor = '#ccc';
        };
        btn.onmouseout = () => {
            btn.style.background = '#f5f5f5';
            btn.style.borderColor = '#ddd';
        };

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

        // Parse simple markdown-like syntax
        let formattedContent = this.parseRichText(content);
        modal.querySelector('.help-content').innerHTML = formattedContent;
        modal.classList.add('show');
    }
}

window.HelpSystem = HelpSystem;
