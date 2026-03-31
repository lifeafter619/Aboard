const TOOL_CONFIG_PANEL_GAP = 8;
const MAX_FEATURE_WIDGET_ZINDEX = 1900;

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
            panel.style.left = `${parseFloat(panel.style.left) + dx}px`;
        } else if (panel.style.right && panel.style.right !== 'auto') {
            panel.style.right = `${parseFloat(panel.style.right) - dx}px`;
        }
    }

    if (dy !== 0) {
        if (panel.style.top && panel.style.top !== 'auto') {
            panel.style.top = `${parseFloat(panel.style.top) + dy}px`;
        } else if (panel.style.bottom && panel.style.bottom !== 'auto') {
            panel.style.bottom = `${parseFloat(panel.style.bottom) - dy}px`;
        }
    }
}

function positionConfigArea(board) {
    const configArea = document.getElementById('config-area');
    const toolbar = document.getElementById('toolbar');
    const featureArea = document.getElementById('feature-area');

    if (!configArea || !toolbar) {
        return;
    }

    if (configArea.dataset.userDragged === 'true') {
        return;
    }

    const toolbarRect = toolbar.getBoundingClientRect();
    const isVertical = toolbar.classList.contains('vertical');
    const tool = board.drawingEngine.currentTool;
    const gap = TOOL_CONFIG_PANEL_GAP;
    let toolButtonId = null;
    if (!tool) {
        console.warn('No active tool found for toolbar mapping.');
    } else {
        toolButtonId = board.toolButtonIds[tool];
        if (!toolButtonId) {
            console.warn(`No toolbar button mapping found for tool '${tool}'. Expected one of: ${Object.keys(board.toolButtonIds).join(', ')}.`);
        }
    }
    const toolButton = toolButtonId ? document.getElementById(toolButtonId) : null;
    if (toolButtonId && !toolButton) {
        console.warn(`Toolbar button element not found for tool '${tool}' (ID: ${toolButtonId}).`);
    }
    const toolRect = toolButton ? toolButton.getBoundingClientRect() : null;
    const referenceRect = toolRect || toolbarRect;

    configArea.style.left = '';
    configArea.style.top = '';
    configArea.style.bottom = '';
    configArea.style.right = '';
    configArea.style.transform = '';
    configArea.style.transformOrigin = '';

    const scale = board.settingsManager.configScale || 1;
    const shouldAnchorToShapeFeature = tool === 'shape'
        && featureArea?.classList.contains('show')
        && toolRect;

    if (shouldAnchorToShapeFeature) {
        const referenceCenterY = referenceRect.top + referenceRect.height / 2;
        const placeOnLeft = referenceRect.left > window.innerWidth / 2;
        configArea.style.left = placeOnLeft
            ? `${referenceRect.left - gap}px`
            : `${referenceRect.right + gap}px`;
        configArea.style.right = 'auto';
        configArea.style.top = `${referenceCenterY}px`;
        configArea.style.bottom = 'auto';
        configArea.style.transformOrigin = placeOnLeft ? 'right center' : 'left center';
        configArea.style.transform = placeOnLeft
            ? `translate(-100%, -50%) scale(${scale})`
            : `translate(0, -50%) scale(${scale})`;
        clampFloatingPanelToViewport(configArea);
        return;
    }

    if (isVertical) {
        const referenceCenterY = referenceRect.top + referenceRect.height / 2;
        if (toolbarRect.left < window.innerWidth / 2) {
            configArea.style.left = `${referenceRect.right + gap}px`;
        } else {
            configArea.style.right = `${window.innerWidth - referenceRect.left + gap}px`;
            configArea.style.left = 'auto';
        }
        configArea.style.top = `${referenceCenterY}px`;
        configArea.style.transformOrigin = 'center center';
        configArea.style.transform = `translateY(-50%) scale(${scale})`;
    } else {
        const referenceCenterX = referenceRect.left + referenceRect.width / 2;
        const referenceTop = referenceRect.top;
        configArea.style.left = `${referenceCenterX}px`;
        configArea.style.bottom = `${window.innerHeight - referenceTop + gap}px`;
        configArea.style.top = 'auto';
        configArea.style.transformOrigin = 'center bottom';
        configArea.style.transform = `translateX(-50%) scale(${scale})`;
    }

    clampFloatingPanelToViewport(configArea);
}

function positionCoordinatePointPanel() {
    const modal = document.getElementById('coordinate-point-modal');
    const content = modal?.querySelector('.coordinate-point-modal-content');
    const toggleBtn = document.getElementById('coordinate-point-toggle-btn');
    const configArea = document.getElementById('config-area');

    if (!modal || !content || !toggleBtn || !configArea || !modal.classList.contains('show')) {
        return;
    }

    if (content.classList.contains('modal-custom-sized')) {
        return;
    }

    const buttonRect = toggleBtn.getBoundingClientRect();
    const configRect = configArea.getBoundingClientRect();
    if (!buttonRect.width || !buttonRect.height || !configRect.width || !configRect.height) {
        return;
    }

    const horizontalInset = 12;
    const verticalInset = 12;
    const gap = 14;
    const measuredWidth = Math.min(content.offsetWidth || 328, window.innerWidth - horizontalInset * 2);
    const measuredHeight = Math.min(content.offsetHeight || 420, window.innerHeight - verticalInset * 2);
    const preferredLeft = buttonRect.left + (buttonRect.width / 2) - (measuredWidth / 2);
    const left = Math.max(horizontalInset, Math.min(window.innerWidth - measuredWidth - horizontalInset, preferredLeft));
    const preferredTop = Math.min(
        buttonRect.top - measuredHeight - gap,
        configRect.top - measuredHeight - gap
    );
    const top = Math.max(verticalInset, preferredTop);
    const availableHeight = Math.max(240, window.innerHeight - top - verticalInset);

    content.style.position = 'fixed';
    content.style.left = `${left}px`;
    content.style.top = `${top}px`;
    content.style.right = 'auto';
    content.style.bottom = 'auto';
    content.style.margin = '0';
    content.style.transform = 'none';
    content.style.maxHeight = `${availableHeight}px`;
}

function positionFeatureArea() {
    const featureArea = document.getElementById('feature-area');
    const moreBtn = document.getElementById('more-btn');
    if (!featureArea || !moreBtn) {
        return;
    }
    if (featureArea.dataset.userDragged === 'true') {
        return;
    }

    const gap = TOOL_CONFIG_PANEL_GAP + 8;
    const moreBtnRect = moreBtn.getBoundingClientRect();

    featureArea.style.left = `${moreBtnRect.left + (moreBtnRect.width / 2)}px`;
    featureArea.style.top = `${moreBtnRect.top - gap}px`;
    featureArea.style.right = 'auto';
    featureArea.style.bottom = 'auto';
    featureArea.style.transform = 'translate(-50%, -100%)';
    clampFloatingPanelToViewport(featureArea);
}

function bringElementToFront(board, element) {
    if (!element) {
        return;
    }
    if (board.featureWidgetZIndex > MAX_FEATURE_WIDGET_ZINDEX) {
        const floatingPanels = document.querySelectorAll('.feature-widget, .timer-display-widget, #feature-area, #config-area, #time-display-area');
        board.featureWidgetZIndex = 1200;
        floatingPanels.forEach(panel => {
            board.featureWidgetZIndex += 1;
            panel.style.zIndex = String(board.featureWidgetZIndex);
        });
    }
    board.featureWidgetZIndex += 1;
    element.style.zIndex = String(board.featureWidgetZIndex);
}

function bringLatestElement(board, selector) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        bringElementToFront(board, elements[elements.length - 1]);
    }
}

window.AboardLayoutRuntime = {
    TOOL_CONFIG_PANEL_GAP,
    MAX_FEATURE_WIDGET_ZINDEX,
    clampFloatingPanelToViewport,
    positionConfigArea,
    positionCoordinatePointPanel,
    positionFeatureArea,
    bringElementToFront,
    bringLatestElement
};
