// Preserves legacy board instance semantics by invoking methods with board as this.

function normalizePageNumber(pageNumber, fallback = 1) {
    const normalized = parseInt(pageNumber, 10);
    return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function ensurePageScenesStore() {
    if (!this.pageScenes || typeof this.pageScenes !== 'object') {
        this.pageScenes = {};
    }
    return this.pageScenes;
}

function cloneSerializable(value) {
    if (value === null || typeof value === 'undefined') {
        return value;
    }

    try {
        if (typeof window !== 'undefined' && typeof window.safeDeepClone === 'function') {
            return window.safeDeepClone(value);
        }
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to clone page scene value:', error);
        return value;
    }
}

function toFiniteNumber(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
}

function toFiniteOptionalNumber(value, fallback = null) {
    if (value === null || typeof value === 'undefined') {
        return fallback;
    }
    return toFiniteNumber(value, fallback);
}

function normalizePoint(point) {
    if (!point || typeof point !== 'object') {
        return null;
    }

    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }

    return { x, y };
}

function normalizeOptionalPoint(point) {
    return normalizePoint(point);
}

function normalizeTextObject(textObj) {
    if (!textObj || typeof textObj !== 'object') {
        return null;
    }

    const normalized = { ...textObj };
    const numericFields = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fontSize: 48,
        decorationWidth: 2,
        rotation: 0,
        scale: 1,
        layerOrder: 0
    };

    Object.entries(numericFields).forEach(([field, fallback]) => {
        if (Object.prototype.hasOwnProperty.call(normalized, field)) {
            normalized[field] = toFiniteNumber(normalized[field], fallback);
        }
    });

    return normalized;
}

function serializeStroke(stroke, drawingEngine) {
    if (!stroke) return null;

    return {
        points: Array.isArray(stroke.points)
            ? stroke.points.map((point) => normalizePoint(point)).filter(Boolean)
            : [],
        color: stroke.color,
        size: stroke.size,
        penType: stroke.penType,
        tool: stroke.tool,
        lineStyle: stroke.lineStyle || 'solid',
        dashDensity: stroke.dashDensity || 10,
        renderMode: stroke.renderMode || null,
        shapeType: stroke.shapeType || null,
        shapeStart: stroke.shapeStart ? { ...stroke.shapeStart } : null,
        shapeEnd: stroke.shapeEnd ? { ...stroke.shapeEnd } : null,
        shapeLineStyle: stroke.shapeLineStyle || null,
        shapeDashDensity: stroke.shapeDashDensity || null,
        shapeWaveDensity: stroke.shapeWaveDensity || null,
        shapeMultiLineCount: stroke.shapeMultiLineCount || null,
        shapeMultiLineSpacing: stroke.shapeMultiLineSpacing || null,
        arrowSize: stroke.arrowSize || null,
        eraserShape: stroke.eraserShape || null,
        rotation: stroke.rotation || 0,
        layerOrder: stroke.layerOrder || 0,
        objectId: stroke.objectId || drawingEngine?.getNextObjectId?.(),
        groupId: stroke.groupId || null
    };
}

function serializeStampedImage(img, options = {}) {
    if (!img) return null;

    const serialized = {
        imageSrc: img.imageSrc || (img.imageElement ? img.imageElement.src : null),
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height,
        rotation: img.rotation || 0,
        flipHorizontal: img.flipHorizontal || false,
        flipVertical: img.flipVertical || false,
        layerOrder: img.layerOrder || 0,
        objectId: img.objectId || null,
        groupId: img.groupId || null
    };

    if (options.includeImageElement && img.imageElement) {
        serialized.imageElement = img.imageElement;
    }

    return serialized;
}

function normalizeStroke(stroke) {
    if (!stroke) return null;
    return {
        ...stroke,
        points: Array.isArray(stroke.points)
            ? stroke.points.map((point) => normalizePoint(point)).filter(Boolean)
            : [],
        size: toFiniteOptionalNumber(stroke.size, 0),
        lineStyle: stroke.lineStyle || 'solid',
        dashDensity: toFiniteOptionalNumber(stroke.dashDensity, 10),
        shapeStart: normalizeOptionalPoint(stroke.shapeStart),
        shapeEnd: normalizeOptionalPoint(stroke.shapeEnd),
        shapeDashDensity: toFiniteOptionalNumber(stroke.shapeDashDensity, null),
        shapeWaveDensity: toFiniteOptionalNumber(stroke.shapeWaveDensity, null),
        shapeMultiLineCount: toFiniteOptionalNumber(stroke.shapeMultiLineCount, null),
        shapeMultiLineSpacing: toFiniteOptionalNumber(stroke.shapeMultiLineSpacing, null),
        arrowSize: toFiniteOptionalNumber(stroke.arrowSize, null),
        rotation: toFiniteNumber(stroke.rotation, 0),
        layerOrder: toFiniteNumber(stroke.layerOrder, 0),
        groupId: stroke.groupId || null
    };
}

function normalizeStampedImage(img) {
    if (!img) return null;
    return {
        ...img,
        imageSrc: img.imageSrc || img.src || null,
        imageElement: img.imageElement || null,
        x: toFiniteNumber(img.x, 0),
        y: toFiniteNumber(img.y, 0),
        width: toFiniteNumber(img.width, 0),
        height: toFiniteNumber(img.height, 0),
        rotation: toFiniteNumber(img.rotation, 0),
        flipHorizontal: !!img.flipHorizontal,
        flipVertical: !!img.flipVertical,
        layerOrder: toFiniteNumber(img.layerOrder, 0),
        groupId: img.groupId || null
    };
}

function hasSceneContent(scene) {
    if (!scene || typeof scene !== 'object') {
        return false;
    }

    return Boolean(
        (scene.objectGroups && scene.objectGroups.length) ||
        (scene.textObjects && scene.textObjects.length) ||
        (scene.strokes && scene.strokes.length) ||
        (scene.stampedImages && scene.stampedImages.length)
    );
}

function capturePageScene(pageNumber = this.currentPage, options = {}) {
    const normalizedPage = normalizePageNumber(pageNumber, this.currentPage || 1);
    const includeEmpty = options.includeEmpty === true;
    const includeImageElements = options.includeImageElements !== false;
    const drawingEngine = this.drawingEngine;
    const insertTextManager = this.insertTextManager;
    const textObjects = insertTextManager?.getTextObjects?.() || insertTextManager?.textObjects || [];

    const scene = {
        pageNumber: normalizedPage,
        objectGroups: Array.isArray(drawingEngine?.objectGroups)
            ? cloneSerializable(drawingEngine.objectGroups)
            : [],
        textObjects: insertTextManager
            ? cloneSerializable(Array.isArray(textObjects) ? textObjects : [])
            // Text module not loaded (e.g. lazy-load failed offline): keep the
            // page's previously stored text instead of capturing "no text",
            // which would erase it from storage on the next save.
            : cloneSerializable(ensurePageScenesStore.call(this)[String(normalizedPage)]?.textObjects || []),
        strokes: Array.isArray(drawingEngine?.strokes)
            ? drawingEngine.strokes
                .map((stroke) => serializeStroke(stroke, drawingEngine))
                .filter(Boolean)
            : [],
        stampedImages: Array.isArray(drawingEngine?.stampedImages)
            ? drawingEngine.stampedImages
                .map((img) => serializeStampedImage(img, { includeImageElement: includeImageElements }))
                .filter(Boolean)
            : []
    };

    if (!includeEmpty && !hasSceneContent(scene)) {
        return null;
    }

    return scene;
}

function saveCurrentPageScene(pageNumber = this.currentPage, options = {}) {
    const normalizedPage = normalizePageNumber(pageNumber, this.currentPage || 1);
    const pageScenes = ensurePageScenesStore.call(this);
    const scene = capturePageScene.call(this, normalizedPage, options);

    if (scene) {
        pageScenes[String(normalizedPage)] = scene;
    } else {
        delete pageScenes[String(normalizedPage)];
    }

    return scene;
}

function getPageScene(pageNumber = this.currentPage, options = {}) {
    const normalizedPage = normalizePageNumber(pageNumber, this.currentPage || 1);
    const scene = ensurePageScenesStore.call(this)[String(normalizedPage)] || null;

    if (!scene) {
        return null;
    }

    if (options.serializable) {
        return serializeScene(scene);
    }

    if (options.clone) {
        return cloneSerializable(serializeScene(scene));
    }

    return scene;
}

function serializeScene(scene) {
    if (!scene) {
        return null;
    }

    const serialized = {
        pageNumber: normalizePageNumber(scene.pageNumber, 1),
        objectGroups: Array.isArray(scene.objectGroups)
            ? cloneSerializable(scene.objectGroups)
            : [],
        textObjects: Array.isArray(scene.textObjects)
            ? scene.textObjects.map((textObj) => normalizeTextObject(textObj)).filter(Boolean)
            : [],
        strokes: Array.isArray(scene.strokes)
            ? scene.strokes.map((stroke) => serializeStroke(stroke)).filter(Boolean)
            : [],
        stampedImages: Array.isArray(scene.stampedImages)
            ? scene.stampedImages.map((img) => serializeStampedImage(img, { includeImageElement: false })).filter(Boolean)
            : []
    };

    return hasSceneContent(serialized) ? serialized : null;
}

function getSerializedPageScenes(pageNumbers = null, options = {}) {
    const includeCurrentPage = options.includeCurrentPage !== false;
    if (includeCurrentPage) {
        saveCurrentPageScene.call(this, this.currentPage, { includeEmpty: false, includeImageElements: true });
    }

    const pageScenes = ensurePageScenesStore.call(this);
    let targetPages = [];

    if (Array.isArray(pageNumbers) && pageNumbers.length > 0) {
        targetPages = [...new Set(pageNumbers.map((pageNumber) => normalizePageNumber(pageNumber)).filter((pageNumber) => pageNumber > 0))]
            .sort((a, b) => a - b);
    } else {
        targetPages = Object.keys(pageScenes)
            .map((pageNumber) => normalizePageNumber(pageNumber, 0))
            .filter((pageNumber) => pageNumber > 0)
            .sort((a, b) => a - b);
    }

    const serializedScenes = {};
    targetPages.forEach((pageNumber) => {
        const scene = pageNumber === this.currentPage && includeCurrentPage
            ? capturePageScene.call(this, pageNumber, { includeEmpty: false, includeImageElements: false })
            : serializeScene(pageScenes[String(pageNumber)] || null);
        if (scene) {
            serializedScenes[String(pageNumber)] = scene;
        }
    });

    return serializedScenes;
}

function clearPageSceneRuntimeState() {
    // skipRedraw: at this point drawingEngine still holds the outgoing
    // scene — clearSelection's default redraw would paint that old scene
    // over the bitmap the caller just restored (undo/redo, page switch).
    this.selectionManager?.clearSelection?.({ skipRedraw: true });

    if (this.insertTextManager?.clearTextObjects) {
        this.insertTextManager.clearTextObjects();
    }

    const drawingEngine = this.drawingEngine;
    drawingEngine.strokes = [];
    drawingEngine.stampedImages = [];
    drawingEngine.objectGroups = [];
    drawingEngine.selectedStrokeIndex = null;
    drawingEngine.selectedImageIndex = null;
    drawingEngine.clearVectorScene?.();
    drawingEngine.setVectorPreviewVisible?.(false);
    drawingEngine.updateOffCanvasImageMirrors?.([]);
}

function restorePageScene(pageNumber = this.currentPage, options = {}) {
    const normalizedPage = normalizePageNumber(pageNumber, this.currentPage || 1);
    const scene = options.scene ?? ensurePageScenesStore.call(this)[String(normalizedPage)] ?? null;

    clearPageSceneRuntimeState.call(this);

    if (!scene) {
        return null;
    }

    if (Array.isArray(scene.textObjects) && scene.textObjects.length > 0) {
        if (!this.insertTextManager?.setTextObjects) {
            console.warn('InsertTextManager is not ready; text objects cannot be restored yet for page', normalizedPage);
        } else {
            this.insertTextManager.setTextObjects(scene.textObjects.map((textObj) => normalizeTextObject(textObj)).filter(Boolean));
            this.selectionManager?.setTextManager?.(this.insertTextManager);
        }
    }

    const drawingEngine = this.drawingEngine;
    drawingEngine.strokes = Array.isArray(scene.strokes)
        ? scene.strokes.map((stroke) => normalizeStroke(stroke)).filter(Boolean)
        : [];
    drawingEngine.stampedImages = Array.isArray(scene.stampedImages)
        ? scene.stampedImages.map((img) => normalizeStampedImage(img)).filter(Boolean)
        : [];
    drawingEngine.objectGroups = Array.isArray(scene.objectGroups)
        ? cloneSerializable(scene.objectGroups)
        : [];

    drawingEngine.syncLayerCounter?.(this.insertTextManager?.textObjects || [], drawingEngine.objectGroups);
    drawingEngine.cleanupGroups?.(this.insertTextManager?.textObjects || []);
    drawingEngine.updateOffCanvasImageMirrors?.(this.insertTextManager?.textObjects || []);
    return scene;
}

async function loadImageElement(source) {
    if (!source) return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = source;
    });
}

async function hydrateSerializedScene(scene) {
    if (!scene) {
        return null;
    }

    const normalizedScene = {
        pageNumber: normalizePageNumber(scene.pageNumber, 1),
        objectGroups: Array.isArray(scene.objectGroups)
            ? cloneSerializable(scene.objectGroups)
            : [],
        textObjects: Array.isArray(scene.textObjects)
            ? scene.textObjects.map((textObj) => normalizeTextObject(textObj)).filter(Boolean)
            : [],
        strokes: Array.isArray(scene.strokes)
            ? scene.strokes.map((stroke) => normalizeStroke(stroke)).filter(Boolean)
            : [],
        stampedImages: Array.isArray(scene.stampedImages)
            ? await Promise.all(scene.stampedImages.map(async (img) => {
                const normalizedImage = normalizeStampedImage(img);
                if (!normalizedImage) return null;
                if (!normalizedImage.imageElement && normalizedImage.imageSrc) {
                    normalizedImage.imageElement = await loadImageElement(normalizedImage.imageSrc);
                }
                return normalizedImage;
            }))
            : []
    };

    normalizedScene.stampedImages = normalizedScene.stampedImages.filter(Boolean);
    return hasSceneContent(normalizedScene) ? normalizedScene : null;
}

async function applySerializedPageScenes(serializedScenes = {}) {
    const pageScenes = {};
    const entries = Object.entries(serializedScenes || {})
        .map(([pageNumber, scene]) => [String(normalizePageNumber(pageNumber, 0)), scene])
        .filter(([pageNumber]) => pageNumber !== '0')
        .sort((a, b) => Number(a[0]) - Number(b[0]));

    const hasTextScenes = entries.some(([, scene]) => Array.isArray(scene?.textObjects) && scene.textObjects.length > 0);
    if (hasTextScenes && !this.insertTextManager && typeof this.getInsertTextManager === 'function') {
        try {
            await this.getInsertTextManager();
        } catch (error) {
            console.warn('Failed to prepare InsertTextManager while restoring serialized page scenes:', error);
        }
    }

    for (const [pageNumber, scene] of entries) {
        const hydratedScene = await hydrateSerializedScene.call(this, scene);
        if (hydratedScene) {
            pageScenes[pageNumber] = hydratedScene;
        }
    }

    this.pageScenes = pageScenes;
    return this.pageScenes;
}

function clearAllPageScenes(options = {}) {
    this.pageScenes = {};
    if (options.clearRuntime !== false) {
        clearPageSceneRuntimeState.call(this);
    }
}

window.AboardPageSceneRuntime = {
    ensurePageScenesStore(board) {
        return ensurePageScenesStore.call(board);
    },
    cloneSerializable,
    hasSceneContent,
    capturePageScene(board, pageNumber = board.currentPage, options = {}) {
        return capturePageScene.call(board, pageNumber, options);
    },
    saveCurrentPageScene(board, pageNumber = board.currentPage, options = {}) {
        return saveCurrentPageScene.call(board, pageNumber, options);
    },
    getPageScene(board, pageNumber = board.currentPage, options = {}) {
        return getPageScene.call(board, pageNumber, options);
    },
    getSerializedPageScenes(board, pageNumbers = null, options = {}) {
        return getSerializedPageScenes.call(board, pageNumbers, options);
    },
    clearPageSceneRuntimeState(board) {
        return clearPageSceneRuntimeState.call(board);
    },
    restorePageScene(board, pageNumber = board.currentPage, options = {}) {
        return restorePageScene.call(board, pageNumber, options);
    },
    hydrateSerializedScene(board, scene) {
        return hydrateSerializedScene.call(board, scene);
    },
    applySerializedPageScenes(board, serializedScenes = {}) {
        return applySerializedPageScenes.call(board, serializedScenes);
    },
    clearAllPageScenes(board, options = {}) {
        return clearAllPageScenes.call(board, options);
    },
    serializeScene
};
