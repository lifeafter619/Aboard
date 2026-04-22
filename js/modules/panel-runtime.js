const EDGE_SNAP_DISTANCE = 30;
const PANEL_EDGE_MARGIN = 10;
const MIN_EDGE_UNSNAP_DISTANCE = 90;
const EDGE_UNSNAP_BUFFER = 20;
const PANEL_DRAG_START_THRESHOLD = 8;

function repositionToolbarsOnResize(board) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;
    const toolbar = document.getElementById('toolbar');

    if (isPortrait && toolbar && !toolbar.classList.contains('user-positioned')) {
        toolbar.classList.add('vertical');
        toolbar.style.right = '20px';
        toolbar.style.left = 'auto';
        toolbar.style.top = '50%';
        toolbar.style.bottom = 'auto';
        toolbar.style.transform = 'translateY(-50%)';
    } else if (!isPortrait && toolbar && !toolbar.classList.contains('user-positioned')) {
        toolbar.classList.remove('vertical');
        toolbar.style.left = '50%';
        toolbar.style.right = 'auto';
        toolbar.style.top = 'auto';
        toolbar.style.bottom = '20px';
        toolbar.style.transform = 'translateX(-50%)';
    }

    const EDGE_SPACING = 10;
    const panels = [
        document.getElementById('toolbar'),
        document.getElementById('history-controls'),
        document.getElementById('config-area'),
        document.getElementById('time-display-area'),
        document.getElementById('feature-area'),
        document.getElementById('pagination-controls'),
        document.getElementById('timer-display')
    ];

    panels.forEach(panel => {
        if (!panel) {
            return;
        }

        let rect = panel.getBoundingClientRect();
        const appliedRelative = applyRelativePanelPosition(panel, rect, windowWidth, windowHeight, EDGE_SPACING);
        if (appliedRelative) {
            rect = panel.getBoundingClientRect();
        }
        const computedStyle = window.getComputedStyle(panel);

        let left = computedStyle.left;
        let top = computedStyle.top;
        let right = computedStyle.right;
        let bottom = computedStyle.bottom;

        const hasCenteredPosition = left === '50%'
            || computedStyle.transform.includes('translateX')
            || computedStyle.transform.includes('translateY');
        const hasExplicitPosition = !hasCenteredPosition && (left !== 'auto' || top !== 'auto' || right !== 'auto' || bottom !== 'auto');

        if (hasCenteredPosition && !hasExplicitPosition) {
            if (rect.right > windowWidth - EDGE_SPACING) {
                panel.style.left = `${Math.max(EDGE_SPACING, windowWidth - rect.width - EDGE_SPACING)}px`;
                panel.style.right = 'auto';
                panel.style.transform = panel.style.transform ? panel.style.transform.replace(/translateX\([^)]*\)/, '') : '';
            } else if (rect.left < EDGE_SPACING) {
                panel.style.left = `${EDGE_SPACING}px`;
                panel.style.right = 'auto';
                panel.style.transform = panel.style.transform ? panel.style.transform.replace(/translateX\([^)]*\)/, '') : '';
            }
            if (rect.bottom > windowHeight - EDGE_SPACING) {
                panel.style.bottom = `${EDGE_SPACING}px`;
                panel.style.top = 'auto';
            } else if (rect.top < EDGE_SPACING) {
                panel.style.top = `${EDGE_SPACING}px`;
                panel.style.bottom = 'auto';
            }
            return;
        }

        if (!hasExplicitPosition) {
            return;
        }

        left = parseFloat(left) || 0;
        top = parseFloat(top) || 0;
        right = right !== 'auto' ? parseFloat(right) : null;
        bottom = bottom !== 'auto' ? parseFloat(bottom) : null;

        if (right !== null) {
            const actualLeft = windowWidth - right - rect.width;
            if (actualLeft < 0) {
                panel.style.right = `${EDGE_SPACING}px`;
            }
        } else if (left + rect.width > windowWidth - EDGE_SPACING) {
            const newLeft = Math.max(EDGE_SPACING, windowWidth - rect.width - EDGE_SPACING);
            panel.style.left = `${newLeft}px`;
            panel.style.right = 'auto';
        }

        if (bottom !== null) {
            const actualTop = windowHeight - bottom - rect.height;
            if (actualTop < 0) {
                panel.style.bottom = `${EDGE_SPACING}px`;
            }
        } else if (top + rect.height > windowHeight - EDGE_SPACING) {
            const newTop = Math.max(EDGE_SPACING, windowHeight - rect.height - EDGE_SPACING);
            panel.style.top = `${newTop}px`;
            panel.style.bottom = 'auto';
        }

        if (left < EDGE_SPACING && left !== 0) {
            panel.style.left = `${EDGE_SPACING}px`;
        }
        if (top < EDGE_SPACING && top !== 0) {
            panel.style.top = `${EDGE_SPACING}px`;
        }
    });
}

function applyRelativePanelPosition(panel, rect, windowWidth, windowHeight, edgeSpacing) {
    const relativeLeft = panel.dataset.relativeLeft;
    const relativeTop = panel.dataset.relativeTop;
    let applied = false;

    if (relativeLeft !== undefined) {
        const availableWidth = Math.max(1, windowWidth - rect.width);
        const ratio = Math.min(1, Math.max(0, parseFloat(relativeLeft)));
        const newLeft = availableWidth * ratio;
        panel.style.left = `${Math.min(windowWidth - rect.width - edgeSpacing, Math.max(edgeSpacing, newLeft))}px`;
        panel.style.right = 'auto';
        applied = true;
    }

    if (relativeTop !== undefined) {
        const availableHeight = Math.max(1, windowHeight - rect.height);
        const ratio = Math.min(1, Math.max(0, parseFloat(relativeTop)));
        const newTop = availableHeight * ratio;
        panel.style.top = `${Math.min(windowHeight - rect.height - edgeSpacing, Math.max(edgeSpacing, newTop))}px`;
        panel.style.bottom = 'auto';
        applied = true;
    }

    return applied;
}

function storePanelRelativePosition(panel) {
    if (!panel) {
        return;
    }

    const rect = panel.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const availableWidth = Math.max(1, windowWidth - rect.width);
    const availableHeight = Math.max(1, windowHeight - rect.height);

    const nextLeft = Math.min(1, Math.max(0, rect.left / availableWidth)).toFixed(3);
    const nextTop = Math.min(1, Math.max(0, rect.top / availableHeight)).toFixed(3);

    if (panel.dataset.relativeLeft !== nextLeft) {
        panel.dataset.relativeLeft = nextLeft;
    }
    if (panel.dataset.relativeTop !== nextTop) {
        panel.dataset.relativeTop = nextTop;
    }
}

function setupDraggablePanels(board) {
    const historyControls = document.getElementById('history-controls');
    const configArea = document.getElementById('config-area');
    const timeDisplayArea = document.getElementById('time-display-area');
    const featureArea = document.getElementById('feature-area');
    const toolbar = document.getElementById('toolbar');
    const paginationControls = document.getElementById('pagination-controls');

    const handleDragStart = (event, element) => {
        if (typeof event.button === 'number' && event.button !== 0) {
            return;
        }

        const closest = typeof event.target?.closest === 'function'
            ? event.target.closest.bind(event.target)
            : () => null;
        const isDragHandle = closest('.panel-drag-handle');
        if (!isDragHandle && (closest('button') || closest('input'))) {
            return;
        }

        event.stopPropagation();

        const rect = element.getBoundingClientRect();
        const primaryTouch = event.touches?.[0];
        const clientX = primaryTouch ? primaryTouch.clientX : event.clientX;
        const clientY = primaryTouch ? primaryTouch.clientY : event.clientY;

        board.dragOffset.x = clientX - rect.left;
        board.dragOffset.y = clientY - rect.top;

        board.draggedElementWidth = rect.width;
        board.draggedElementHeight = rect.height;
        if (board.settingsManager.edgeSnapEnabled && element.classList.contains('vertical')) {
            const nearLeftEdge = rect.left <= EDGE_SNAP_DISTANCE;
            const nearRightEdge = (window.innerWidth - rect.right) <= EDGE_SNAP_DISTANCE;
            board.dragSnapSide = nearLeftEdge ? 'left' : (nearRightEdge ? 'right' : null);
        } else {
            board.dragSnapSide = null;
        }

        board.pendingPanelDrag = {
            element,
            startX: clientX,
            startY: clientY
        };

        event.preventDefault();
    };

    [historyControls, configArea, timeDisplayArea, featureArea, toolbar, paginationControls]
        .filter(Boolean)
        .forEach(element => {
            element.addEventListener('pointerdown', event => handleDragStart(event, element));
            element.addEventListener('mousedown', event => handleDragStart(event, element));
            element.addEventListener('touchstart', event => handleDragStart(event, element), { passive: false });
        });

    const handleDragEnd = () => {
        if (board.isDraggingPanel && board.draggedElement) {
            board.draggedElement.classList.remove('dragging');
            board.draggedElement.style.transition = '';

            if (board.draggedElement.id === 'toolbar') {
                board.draggedElement.classList.add('user-positioned');
                if (board.settingsManager.edgeSnapEnabled) {
                    const rect = board.draggedElement.getBoundingClientRect();
                    const nearLeftEdge = rect.left <= EDGE_SNAP_DISTANCE;
                    const nearRightEdge = (window.innerWidth - rect.right) <= EDGE_SNAP_DISTANCE;
                    if (nearLeftEdge) {
                        board.draggedElement.style.left = `${PANEL_EDGE_MARGIN}px`;
                    } else if (nearRightEdge) {
                        board.draggedElement.style.left = `${window.innerWidth - rect.width - PANEL_EDGE_MARGIN}px`;
                    }
                }
            }

            if (board.draggedElement.id === 'config-area'
                || board.draggedElement.id === 'feature-area'
                || board.draggedElement.id === 'time-display-area') {
                board.draggedElement.dataset.userDragged = 'true';
            }

            storePanelRelativePosition(board.draggedElement);

            board.isDraggingPanel = false;
            board.draggedElement = null;
            board.dragSnapSide = null;
        }
        board.pendingPanelDrag = null;
    };

    const handleDragMove = event => {
        if ((event.type === 'mousemove' || event.type === 'pointermove') && typeof event.buttons === 'number' && event.buttons === 0) {
            handleDragEnd();
            return;
        }

        const primaryTouch = event.touches?.[0];
        const clientX = primaryTouch ? primaryTouch.clientX : event.clientX;
        const clientY = primaryTouch ? primaryTouch.clientY : event.clientY;

        if (!board.isDraggingPanel && board.pendingPanelDrag) {
            const distance = Math.hypot(clientX - board.pendingPanelDrag.startX, clientY - board.pendingPanelDrag.startY);
            if (distance < PANEL_DRAG_START_THRESHOLD) {
                return;
            }

            board.isDraggingPanel = true;
            board.draggedElement = board.pendingPanelDrag.element;
            board.draggedElement.classList.add('dragging');
            board.draggedElement.style.transition = 'none';
        }

        if (!board.isDraggingPanel || !board.draggedElement) {
            return;
        }

        let x = clientX - board.dragOffset.x;
        let y = clientY - board.dragOffset.y;

        const edgeSnapDistance = EDGE_SNAP_DISTANCE;
        const edgeUnsnapDistance = Math.max(MIN_EDGE_UNSNAP_DISTANCE, edgeSnapDistance + EDGE_UNSNAP_BUFFER);
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isConfigArea = board.draggedElement.id === 'config-area';
        const isTimeDisplayArea = board.draggedElement.id === 'time-display-area';
        const isFeatureArea = board.draggedElement.id === 'feature-area';
        const shouldApplyVerticalLive = isConfigArea || isTimeDisplayArea || isFeatureArea;

        let snappedToEdge = false;
        let isVertical = false;
        let snappedLeft = false;
        let snappedRight = false;

        const currentRect = board.draggedElement.getBoundingClientRect();
        const currentWidth = currentRect.width;
        const currentHeight = currentRect.height;

        if (board.settingsManager.edgeSnapEnabled) {
            const keepSnapLeft = board.dragSnapSide === 'left' && x <= edgeUnsnapDistance;
            const keepSnapRight = board.dragSnapSide === 'right' && (x + currentWidth) >= windowWidth - edgeUnsnapDistance;
            const canSnapLeft = x <= edgeSnapDistance;
            const canSnapRight = (x + currentWidth) >= windowWidth - edgeSnapDistance;

            if (keepSnapLeft || canSnapLeft) {
                x = PANEL_EDGE_MARGIN;
                snappedToEdge = true;
                isVertical = true;
                snappedLeft = true;
                board.dragSnapSide = 'left';
            } else if (keepSnapRight || canSnapRight) {
                x = windowWidth - currentWidth - PANEL_EDGE_MARGIN;
                snappedToEdge = true;
                isVertical = true;
                snappedRight = true;
                board.dragSnapSide = 'right';
            } else if (board.dragSnapSide) {
                board.dragSnapSide = null;
            }

            if (y < edgeSnapDistance) {
                y = PANEL_EDGE_MARGIN;
                snappedToEdge = true;
            }
            if (y + currentHeight > windowHeight - edgeSnapDistance) {
                y = windowHeight - currentHeight - PANEL_EDGE_MARGIN;
                snappedToEdge = true;
            }
        }

        if (shouldApplyVerticalLive && snappedToEdge && isVertical) {
            board.draggedElement.classList.add('vertical');
            if (snappedRight) {
                const newWidth = board.draggedElement.getBoundingClientRect().width;
                x = windowWidth - newWidth - PANEL_EDGE_MARGIN;
            } else if (snappedLeft) {
                x = PANEL_EDGE_MARGIN;
            }
            const newRect = board.draggedElement.getBoundingClientRect();
            board.draggedElementWidth = newRect.width;
            board.draggedElementHeight = newRect.height;
        } else if (shouldApplyVerticalLive) {
            board.draggedElement.classList.remove('vertical');
            const newRect = board.draggedElement.getBoundingClientRect();
            board.draggedElementWidth = newRect.width;
            board.draggedElementHeight = newRect.height;
        }

        const finalRect = board.draggedElement.getBoundingClientRect();
        x = Math.max(0, Math.min(x, windowWidth - finalRect.width));
        y = Math.max(0, Math.min(y, windowHeight - finalRect.height));

        board.draggedElement.style.left = `${x}px`;
        board.draggedElement.style.top = `${y}px`;
        if (board.draggedElement.id === 'config-area') {
            const scale = board.settingsManager.configScale || 1;
            board.draggedElement.style.transformOrigin = 'top left';
            board.draggedElement.style.transform = `scale(${scale})`;
        } else {
            board.draggedElement.style.transform = 'none';
        }
        board.draggedElement.style.right = 'auto';
        board.draggedElement.style.bottom = 'auto';
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('pointerup', handleDragEnd);
    document.addEventListener('pointercancel', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('touchcancel', handleDragEnd);
}

function clampFloatingPanelToViewport(panel, edgeSpacing = 12) {
    if (!panel) {
        return;
    }

    const rect = panel.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (rect.left < edgeSpacing) {
        dx = edgeSpacing - rect.left;
    } else if (rect.right > window.innerWidth - edgeSpacing) {
        dx = window.innerWidth - edgeSpacing - rect.right;
    }

    if (rect.top < edgeSpacing) {
        dy = edgeSpacing - rect.top;
    } else if (rect.bottom > window.innerHeight - edgeSpacing) {
        dy = window.innerHeight - edgeSpacing - rect.bottom;
    }

    if (dx !== 0) {
        if (panel.style.left && panel.style.left !== 'auto') {
            const left = parseFloat(panel.style.left) || 0;
            panel.style.left = `${left + dx}px`;
        } else if (panel.style.right && panel.style.right !== 'auto') {
            const right = parseFloat(panel.style.right) || 0;
            panel.style.right = `${right - dx}px`;
        }
    }

    if (dy !== 0) {
        if (panel.style.top && panel.style.top !== 'auto') {
            const top = parseFloat(panel.style.top) || 0;
            panel.style.top = `${top + dy}px`;
        } else if (panel.style.bottom && panel.style.bottom !== 'auto') {
            const bottom = parseFloat(panel.style.bottom) || 0;
            panel.style.bottom = `${bottom - dy}px`;
        }
    }
}

window.AboardPanelRuntime = {
    EDGE_SNAP_DISTANCE,
    PANEL_EDGE_MARGIN,
    MIN_EDGE_UNSNAP_DISTANCE,
    EDGE_UNSNAP_BUFFER,
    PANEL_DRAG_START_THRESHOLD,
    repositionToolbarsOnResize,
    applyRelativePanelPosition,
    storePanelRelativePosition,
    setupDraggablePanels,
    clampFloatingPanelToViewport
};
