// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function setupModalInteractionLock() {
        const updateModalState = () => {
            const hasBlockingModal = !!document.querySelector('.modal.show:not(.non-blocking-modal), .time-fullscreen-modal.show, .timer-fullscreen-modal.show');
            document.body.classList.toggle('overlay-modal-open', hasBlockingModal);
        };
        const observer = new MutationObserver(updateModalState);
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        updateModalState();
    
}

window.AboardOverlayLockRuntime = {
    setupModalInteractionLock(board) {
        return setupModalInteractionLock.call(board);
    }
};
