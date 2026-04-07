// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            // Update button icon to exit fullscreen
            const btn = document.getElementById('fullscreen-btn');
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
            `;
            const label = this.getFullscreenButtonTitle(true);
            btn.title = label;
            btn.setAttribute('aria-label', label);
        } else {
            // Exit fullscreen
            document.exitFullscreen();
            // Update button icon to enter fullscreen
            const btn = document.getElementById('fullscreen-btn');
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            const label = this.getFullscreenButtonTitle(false);
            btn.title = label;
            btn.setAttribute('aria-label', label);
        }
    
}

function getFullscreenButtonTitle(isExitState) {
        const i18n = window.i18n;
        if (!i18n) {
            return isExitState ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)';
        }
        const key = isExitState ? 'toolbar.exitFullscreen' : 'toolbar.fullscreen';
        const fallback = isExitState ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)';
        const translated = i18n.t(key);
        return translated === key ? fallback : translated;
    
}

function updatePatternGrid() {
        const patternGrid = document.getElementById('pattern-grid');
        const patterns = this.settingsManager.getPatternPreferences();
        
        // Hide all pattern buttons first
        patternGrid.querySelectorAll('.pattern-option-btn[data-pattern]').forEach(btn => {
            const pattern = btn.dataset.pattern;
            if (patterns[pattern]) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
    
}

function handleFullscreenChange() {
        const btn = document.getElementById('fullscreen-btn');
        if (!document.fullscreenElement) {
            // Exited fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            const label = this.getFullscreenButtonTitle(false);
            btn.title = label;
            btn.setAttribute('aria-label', label);
        } else {
            // Entered fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
            `;
            const label = this.getFullscreenButtonTitle(true);
            btn.title = label;
            btn.setAttribute('aria-label', label);
        }
    
}

function hideHistoryControls() {
        const historyControls = document.getElementById('history-controls');
        historyControls.style.display = 'none';
    
}

window.AboardDisplayRuntime = {
    toggleFullscreen(board) {
        return toggleFullscreen.call(board);
    },
    getFullscreenButtonTitle(board, isExitState) {
        return getFullscreenButtonTitle.call(board, isExitState);
    },
    updatePatternGrid(board) {
        return updatePatternGrid.call(board);
    },
    handleFullscreenChange(board) {
        return handleFullscreenChange.call(board);
    },
    hideHistoryControls(board) {
        return hideHistoryControls.call(board);
    }
};
