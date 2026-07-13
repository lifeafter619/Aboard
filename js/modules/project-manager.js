// Project Manager Module
// Handles exporting and importing full project state as standard ZIP packages,
// while keeping legacy .aboard parsing available on demand.

const PROJECT_PACKAGE_MIME = 'application/vnd.aboard.project+zip';
const PROJECT_PACKAGE_SCHEMA_VERSION = 1;
const PROJECT_IMPORT_MAX_BYTES = 100 * 1024 * 1024;
const PROJECT_IMPORT_MAX_PAGES = 300;
const PROJECT_IMPORT_MAX_ASSET_BYTES = 25 * 1024 * 1024;
const PROJECT_IMPORT_MAX_TOTAL_ASSET_BYTES = 150 * 1024 * 1024;
const ZIP_LIBRARY_SCRIPT = 'js/libs/fflate.min.js';
const LEGACY_PROJECT_COMPAT_SCRIPT = 'js/modules/project-legacy-compat.js';

function safeProjectStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write project localStorage key "${key}":`, error);
        return false;
    }
}

function getDefaultCoordinateOverlayState(backgroundManager) {
    if (typeof backgroundManager?.getDefaultCoordinateOverlayState === 'function') {
        return backgroundManager.getDefaultCoordinateOverlayState();
    }

    return {
        showTicks: true,
        showLabels: true,
        showPointLabels: true,
        showOrigin: true,
        pointLineMode: 'auto',
        connectPoints: true,
        snapToGrid: true,
        lineColor: '#2563eb',
        points: [],
        plots: [],
        groups: []
    };
}

function getDefaultImageTransform() {
    return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scale: 1,
        flipHorizontal: false,
        flipVertical: false
    };
}

function normalizeImageTransform(transform) {
    const nextTransform = transform && typeof transform === 'object' ? transform : {};
    const defaults = getDefaultImageTransform();
    const scale = Number.isFinite(nextTransform.scale) ? nextTransform.scale : defaults.scale;
    let x = Number.isFinite(nextTransform.x) ? nextTransform.x : defaults.x;
    let y = Number.isFinite(nextTransform.y) ? nextTransform.y : defaults.y;
    let width = Number.isFinite(nextTransform.width) ? nextTransform.width : defaults.width;
    let height = Number.isFinite(nextTransform.height) ? nextTransform.height : defaults.height;

    if (scale && scale !== 1 && width > 0 && height > 0) {
        const factor = Math.abs(scale);
        const newWidth = width * factor;
        const newHeight = height * factor;
        x -= (newWidth - width) / 2;
        y -= (newHeight - height) / 2;
        width = newWidth;
        height = newHeight;
    }

    return {
        x,
        y,
        width,
        height,
        rotation: Number.isFinite(nextTransform.rotation) ? nextTransform.rotation : defaults.rotation,
        scale: 1,
        flipHorizontal: !!nextTransform.flipHorizontal,
        flipVertical: !!nextTransform.flipVertical
    };
}

function normalizeImportedBackgroundState(backgroundManager, backgroundData) {
    const nextBackground = backgroundData && typeof backgroundData === 'object' ? backgroundData : {};
    const hasCoordinateOverlayState = Object.prototype.hasOwnProperty.call(nextBackground, 'coordinateOverlayState');
    return {
        backgroundColor: typeof nextBackground.backgroundColor === 'string' ? nextBackground.backgroundColor : '#ffffff',
        backgroundPattern: typeof nextBackground.backgroundPattern === 'string' ? nextBackground.backgroundPattern : 'blank',
        bgOpacity: Number.isFinite(nextBackground.bgOpacity) ? nextBackground.bgOpacity : 1,
        patternIntensity: Number.isFinite(nextBackground.patternIntensity) ? nextBackground.patternIntensity : 0.5,
        patternDensity: Number.isFinite(nextBackground.patternDensity) ? nextBackground.patternDensity : 1,
        imageSize: Number.isFinite(nextBackground.imageSize) && nextBackground.imageSize > 0 ? nextBackground.imageSize : 1,
        backgroundImageData: typeof nextBackground.backgroundImageData === 'string' && nextBackground.backgroundImageData
            ? nextBackground.backgroundImageData
            : null,
        coordinateOriginX: Number.isFinite(nextBackground.coordinateOriginX) ? nextBackground.coordinateOriginX : 0,
        coordinateOriginY: Number.isFinite(nextBackground.coordinateOriginY) ? nextBackground.coordinateOriginY : 0,
        coordinateOverlayState: hasCoordinateOverlayState
            ? nextBackground.coordinateOverlayState
            : getDefaultCoordinateOverlayState(backgroundManager),
        imageTransform: normalizeImageTransform(nextBackground.imageTransform),
        gifLoopCount: Number.isFinite(nextBackground.gifLoopCount) && nextBackground.gifLoopCount >= 0
            ? nextBackground.gifLoopCount
            : 0,
        backgroundOutsideLayerOrder: Number.isFinite(nextBackground.backgroundOutsideLayerOrder)
            && nextBackground.backgroundOutsideLayerOrder >= 1
            ? nextBackground.backgroundOutsideLayerOrder
            : 1
    };
}

function resetTransientBackgroundMediaState(backgroundManager) {
    if (!backgroundManager || typeof backgroundManager !== 'object') {
        return;
    }

    backgroundManager.backgroundImageLoadToken = (backgroundManager.backgroundImageLoadToken || 0) + 1;
    backgroundManager.stopGifInstance?.();
    backgroundManager.currentGifLoop = 0;
    backgroundManager.isImagePaused = false;
    backgroundManager.imageStaticData = null;
}

class ProjectManager {
    constructor(drawingBoard) {
        this.drawingBoard = drawingBoard;
    }

    t(key, fallback = '', replacements = null) {
        const translatedValue = window.i18n?.t?.(key);
        const translated = translatedValue && translatedValue !== key ? translatedValue : fallback;
        if (!replacements || typeof translated !== 'string') {
            return translated;
        }

        return Object.entries(replacements).reduce(
            (message, [name, value]) => message.split(`{${name}}`).join(String(value ?? '')),
            translated
        );
    }

    normalizeImportedPageNumber(value, fallback = 1) {
        const rawValue = value ?? fallback;
        const normalized = Number(typeof rawValue === 'string' ? rawValue.trim() : rawValue);
        if (!Number.isInteger(normalized) || normalized < 1 || normalized > PROJECT_IMPORT_MAX_PAGES) {
            throw new Error(this.t('projectPackage.tooManyPages', 'The project package contains too many pages.'));
        }
        return normalized;
    }

    normalizeImportedPageKeys(pageMap = {}) {
        if (!pageMap || typeof pageMap !== 'object') {
            return [];
        }

        return Object.keys(pageMap).map((pageNumber) => this.normalizeImportedPageNumber(pageNumber));
    }

    async ensureZipLibrary() {
        if (typeof window !== 'undefined' && window.fflate) {
            return window.fflate;
        }
        if (typeof fflate !== 'undefined') {
            return fflate;
        }
        if (!window.ScriptLoader?.load) {
            throw new Error(this.t('projectPackage.zipLoaderUnavailable', 'ZIP library loader is not available.'));
        }
        await window.ScriptLoader.load(ZIP_LIBRARY_SCRIPT);
        if (typeof window !== 'undefined' && window.fflate) {
            return window.fflate;
        }
        if (typeof fflate !== 'undefined') {
            return fflate;
        }
        throw new Error(this.t('projectPackage.zipLoadFailed', 'Failed to load the ZIP library.'));
    }

    async ensureLegacyCompat() {
        if (window.AboardLegacyProjectCompat) {
            return window.AboardLegacyProjectCompat;
        }
        if (!this.drawingBoard.settingsManager?.legacyProjectImportEnabled) {
            throw new Error(this.t('projectPackage.legacyCompatibilityDisabled', 'Legacy .aboard import compatibility is disabled.'));
        }
        if (!window.ScriptLoader?.load) {
            throw new Error(this.t('projectPackage.legacyLoaderUnavailable', 'Legacy compatibility loader is not available.'));
        }
        await window.ScriptLoader.load(LEGACY_PROJECT_COMPAT_SCRIPT);
        if (!window.AboardLegacyProjectCompat) {
            throw new Error(this.t('projectPackage.legacyModuleLoadFailed', 'Failed to load the legacy project compatibility module.'));
        }
        return window.AboardLegacyProjectCompat;
    }

    sanitizeFilename(filename, fallback = 'aboard-project') {
        const normalized = String(filename || '')
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        return normalized || fallback;
    }

    stripKnownProjectExtension(filename) {
        return this.sanitizeFilename(String(filename || '').replace(/\.(zip|aboard|json)$/i, ''));
    }

    // Helper to convert ImageData to Base64 string
    async imageDataToBase64(imageData) {
        if (!imageData) return null;
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    // Helper to convert Base64 string to ImageData
    async base64ToImageData(base64) {
        if (!base64) return null;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
            };
            img.onerror = reject;
            img.src = base64;
        });
    }

    cloneSerializable(value) {
        if (value === null || typeof value === 'undefined') {
            return value;
        }

        try {
            if (typeof window !== 'undefined' && typeof window.safeDeepClone === 'function') {
                return window.safeDeepClone(value);
            }
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            console.warn('Failed to deep-clone serializable value:', error);
            return value;
        }
    }

    getCurrentCanvasImageData() {
        return this.drawingBoard.ctx.getImageData(
            0,
            0,
            this.drawingBoard.canvas.width,
            this.drawingBoard.canvas.height
        );
    }

    createBlankPageImageData() {
        return this.drawingBoard.ctx.createImageData(
            this.drawingBoard.canvas.width,
            this.drawingBoard.canvas.height
        );
    }

    getBackgroundSnapshot() {
        const bm = this.drawingBoard.backgroundManager;
        return {
            backgroundColor: bm.backgroundColor,
            backgroundPattern: bm.backgroundPattern,
            bgOpacity: bm.bgOpacity,
            patternIntensity: bm.patternIntensity,
            patternDensity: bm.patternDensity,
            imageSize: bm.imageSize,
            backgroundImageData: bm.backgroundImageData,
            coordinateOriginX: bm.coordinateOriginX,
            coordinateOriginY: bm.coordinateOriginY,
            coordinateOverlayState: this.cloneSerializable(bm.getCoordinateOverlayState?.() || null),
            imageTransform: this.cloneSerializable(bm.imageTransform || null),
            gifLoopCount: bm.gifLoopCount,
            backgroundOutsideLayerOrder: bm.backgroundOutsideLayerOrder
        };
    }

    getPageBackgroundSnapshot(pageNumber) {
        if (pageNumber === this.drawingBoard.currentPage) {
            return this.getBackgroundSnapshot();
        }

        const pageBackground = this.drawingBoard.pageBackgrounds?.[pageNumber];
        return pageBackground ? this.cloneSerializable(pageBackground) : null;
    }

    buildExportDescriptor(scope, selectedPages = []) {
        const totalPages = Math.max(1, this.drawingBoard.pages?.length || 0);
        const currentPage = Math.min(Math.max(this.drawingBoard.currentPage || 1, 1), totalPages);

        this.drawingBoard.pages[currentPage - 1] = this.getCurrentCanvasImageData();
        this.drawingBoard.pageBackgrounds = this.drawingBoard.pageBackgrounds || {};
        this.drawingBoard.pageBackgrounds[currentPage] = this.getBackgroundSnapshot();
        this.drawingBoard.saveCurrentPageScene?.(currentPage);

        let originalPageNumbers = [];
        if (scope === 'current') {
            originalPageNumbers = [currentPage];
        } else if (scope === 'specific') {
            originalPageNumbers = [...new Set((selectedPages || [])
                .map((page) => parseInt(page, 10))
                .filter((page) => Number.isInteger(page) && page >= 1 && page <= totalPages))]
                .sort((a, b) => a - b);
        } else {
            originalPageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (originalPageNumbers.length === 0) {
            originalPageNumbers = [currentPage];
        }

        const currentPagePosition = originalPageNumbers.indexOf(currentPage);
        return {
            originalPageNumbers,
            currentPage: currentPagePosition >= 0 ? currentPagePosition + 1 : 1,
            totalPages: originalPageNumbers.length
        };
    }

    buildImportedPageBackgrounds(pageDescriptors = [], rawPageBackgrounds = {}) {
        const normalizedBackgrounds = {};
        const orderedPages = [...pageDescriptors].sort((a, b) => (a.index || 0) - (b.index || 0));

        orderedPages.forEach((pageDescriptor, sequentialIndex) => {
            const sequentialKey = String(sequentialIndex + 1);
            const indexKey = String(pageDescriptor.index);
            const originalIndexKey = pageDescriptor.originalIndex ? String(pageDescriptor.originalIndex) : null;
            const lookupKeys = [];

            if (originalIndexKey) {
                lookupKeys.push(sequentialKey, originalIndexKey, indexKey);
            } else if (pageDescriptor.index === sequentialIndex + 1) {
                lookupKeys.push(sequentialKey, indexKey);
            } else {
                lookupKeys.push(indexKey, sequentialKey);
            }

            const dedupedLookupKeys = [...new Set(lookupKeys.filter(Boolean))];
            const matchedKey = dedupedLookupKeys.find((key) => Object.prototype.hasOwnProperty.call(rawPageBackgrounds || {}, key));
            if (matchedKey) {
                normalizedBackgrounds[String(sequentialIndex + 1)] = this.cloneSerializable(rawPageBackgrounds[matchedKey]);
            }
        });

        return normalizedBackgrounds;
    }

    async loadImageElement(source) {
        if (!source) return null;
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = source;
        });
    }

    async applyGlobalBackground(backgroundData) {
        const bm = this.drawingBoard.backgroundManager;
        const normalizedBackground = normalizeImportedBackgroundState(bm, backgroundData);

        resetTransientBackgroundMediaState(bm);
        const backgroundLoadToken = bm.backgroundImageLoadToken;
        bm.backgroundImageData = normalizedBackground.backgroundImageData;
        bm.backgroundImage = null;
        bm.backgroundColor = normalizedBackground.backgroundColor;
        bm.backgroundPattern = normalizedBackground.backgroundPattern;
        bm.bgOpacity = normalizedBackground.bgOpacity;
        bm.patternIntensity = normalizedBackground.patternIntensity;
        bm.patternDensity = normalizedBackground.patternDensity;
        bm.imageSize = normalizedBackground.imageSize;
        if (typeof bm.setCoordinateOrigin === 'function') {
            bm.setCoordinateOrigin(normalizedBackground.coordinateOriginX, normalizedBackground.coordinateOriginY);
        } else {
            bm.coordinateOriginX = normalizedBackground.coordinateOriginX;
            bm.coordinateOriginY = normalizedBackground.coordinateOriginY;
        }
        bm.setCoordinateOverlayState?.(
            this.cloneSerializable(normalizedBackground.coordinateOverlayState),
            { persist: false, redraw: false }
        );
        if (typeof bm.updateImageTransform === 'function') {
            bm.updateImageTransform(normalizedBackground.imageTransform);
        } else {
            bm.imageTransform = this.cloneSerializable(normalizedBackground.imageTransform);
        }
        if (typeof bm.setGifLoopCount === 'function') {
            bm.setGifLoopCount(normalizedBackground.gifLoopCount);
        } else {
            bm.gifLoopCount = normalizedBackground.gifLoopCount;
        }
        bm.backgroundOutsideLayerOrder = normalizedBackground.backgroundOutsideLayerOrder;

        if (normalizedBackground.backgroundImageData) {
            const loadedImage = await this.loadImageElement(normalizedBackground.backgroundImageData);
            if (backgroundLoadToken === bm.backgroundImageLoadToken
                && normalizedBackground.backgroundImageData === bm.backgroundImageData) {
                bm.backgroundImage = loadedImage;
            }
        } else {
            bm.backgroundImage = null;
        }
    }

    clearSceneState() {
        this.drawingBoard.clearPageSceneRuntimeState?.();
    }

    async restoreSceneState(sceneState) {
        const normalizedScene = sceneState
            ? {
                ...sceneState,
                pageNumber: sceneState.pageNumber || sceneState.editablePage || 1
            }
            : null;
        await this.drawingBoard.applySerializedPageScenes(normalizedScene ? { [String(normalizedScene.pageNumber)]: normalizedScene } : {});
        this.drawingBoard.restorePageScene?.(normalizedScene?.pageNumber || 1);
    }

    getSettingsSnapshot(currentPage) {
        return {
            canvasWidth: this.drawingBoard.settingsManager.canvasWidth,
            canvasHeight: this.drawingBoard.settingsManager.canvasHeight,
            canvasPreset: this.drawingBoard.settingsManager.canvasPreset,
            unlimitedZoom: this.drawingBoard.settingsManager.unlimitedZoom,
            currentPage
        };
    }

    getFileExtensionForMime(mime = '') {
        const normalizedMime = String(mime).toLowerCase();
        if (normalizedMime.includes('png')) return 'png';
        if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) return 'jpg';
        if (normalizedMime.includes('webp')) return 'webp';
        if (normalizedMime.includes('gif')) return 'gif';
        if (normalizedMime.includes('svg')) return 'svg';
        if (normalizedMime.includes('bmp')) return 'bmp';
        return 'bin';
    }

    parseDataUrl(dataUrl) {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
            return null;
        }

        const match = dataUrl.match(/^data:([^;,]+)?((?:;[^,]+)*?)(;base64)?,(.*)$/s);
        if (!match) {
            return null;
        }

        const mime = match[1] || 'application/octet-stream';
        const isBase64 = Boolean(match[3]);
        const payload = match[4] || '';
        let bytes;

        if (isBase64) {
            if (typeof atob === 'function') {
                const binary = atob(payload);
                bytes = new Uint8Array(binary.length);
                for (let index = 0; index < binary.length; index++) {
                    bytes[index] = binary.charCodeAt(index);
                }
            } else if (typeof Buffer !== 'undefined') {
                bytes = new Uint8Array(Buffer.from(payload, 'base64'));
            } else {
                throw new Error(this.t('projectPackage.base64DecoderUnavailable', 'Base64 decoder is not available.'));
            }
        } else {
            const decoded = decodeURIComponent(payload);
            bytes = new TextEncoder().encode(decoded);
        }

        return { mime, bytes };
    }

    encodeBase64(bytes) {
        if (typeof btoa === 'function') {
            let binary = '';
            const chunkSize = 0x8000;
            for (let index = 0; index < bytes.length; index += chunkSize) {
                const chunk = bytes.subarray(index, index + chunkSize);
                binary += String.fromCharCode(...chunk);
            }
            return btoa(binary);
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        throw new Error(this.t('projectPackage.base64EncoderUnavailable', 'Base64 encoder is not available.'));
    }

    bytesToDataUrl(bytes, mime = 'application/octet-stream') {
        return `data:${mime};base64,${this.encodeBase64(bytes)}`;
    }

    async hashBytes(bytes) {
        if (globalThis.crypto?.subtle?.digest) {
            const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
        }

        let hash = 2166136261;
        for (const value of bytes) {
            hash ^= value;
            hash = Math.imul(hash, 16777619);
        }
        return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }

    createAssetStore() {
        return {
            byHash: new Map(),
            files: []
        };
    }

    async registerDataUrlAsset(assetStore, dataUrl, preferredName = 'asset') {
        const parsed = this.parseDataUrl(dataUrl);
        if (!parsed) {
            return null;
        }

        const hash = await this.hashBytes(parsed.bytes);
        const existing = assetStore.byHash.get(hash);
        if (existing) {
            return existing;
        }

        const extension = this.getFileExtensionForMime(parsed.mime);
        const sanitizedName = this.sanitizeFilename(preferredName, 'asset').toLowerCase().replace(/\.[a-z0-9]+$/i, '');
        const asset = {
            id: `sha256-${hash}`,
            hash,
            mime: parsed.mime,
            path: `assets/${sanitizedName}-${hash.slice(0, 12)}.${extension}`,
            bytes: parsed.bytes
        };
        assetStore.byHash.set(hash, asset);
        assetStore.files.push(asset);
        return asset;
    }

    async serializeBackgroundForPackage(backgroundData, assetStore) {
        if (!backgroundData) {
            return null;
        }

        const serialized = this.cloneSerializable(backgroundData);
        if (serialized.backgroundImageData) {
            const asset = await this.registerDataUrlAsset(assetStore, serialized.backgroundImageData, 'background');
            if (asset) {
                serialized.backgroundImageAsset = {
                    id: asset.id,
                    path: asset.path,
                    mime: asset.mime
                };
            }
            delete serialized.backgroundImageData;
        }

        return serialized;
    }

    inflateBackgroundFromPackage(backgroundData, resolveAssetDataUrl) {
        if (!backgroundData) {
            return null;
        }

        const inflated = this.cloneSerializable(backgroundData);
        if (inflated.backgroundImageAsset) {
            inflated.backgroundImageData = resolveAssetDataUrl(inflated.backgroundImageAsset);
            delete inflated.backgroundImageAsset;
        }
        return inflated;
    }

    async serializeUploadedImagesForPackage(uploadedImages, assetStore) {
        const imageEntries = Array.isArray(uploadedImages) ? uploadedImages : [];
        return Promise.all(imageEntries.map(async (image, index) => {
            const asset = await this.registerDataUrlAsset(assetStore, image?.data, image?.name || `library-image-${index + 1}`);
            return {
                id: image?.id || `uploaded-${index + 1}`,
                name: image?.name || `Image ${index + 1}`,
                asset: asset ? {
                    id: asset.id,
                    path: asset.path,
                    mime: asset.mime
                } : null
            };
        }));
    }

    inflateUploadedImagesFromPackage(uploadedImages, resolveAssetDataUrl) {
        const imageEntries = Array.isArray(uploadedImages) ? uploadedImages : [];
        return imageEntries.map((image, index) => ({
            id: image?.id || `uploaded-${index + 1}`,
            name: image?.name || `Image ${index + 1}`,
            data: image?.asset ? resolveAssetDataUrl(image.asset) : null
        })).filter((image) => image.data);
    }

    async serializeSceneForPackage(scene, assetStore) {
        if (!scene) {
            return null;
        }

        const serialized = this.cloneSerializable(scene);
        const stampedImages = Array.isArray(scene.stampedImages) ? scene.stampedImages : [];
        serialized.stampedImages = await Promise.all(stampedImages.map(async (image, index) => {
            const nextImage = this.cloneSerializable(image);
            const imageSrc = image?.imageSrc || image?.src || null;
            if (imageSrc) {
                const asset = await this.registerDataUrlAsset(assetStore, imageSrc, `page-image-${index + 1}`);
                if (asset) {
                    nextImage.imageAsset = {
                        id: asset.id,
                        path: asset.path,
                        mime: asset.mime
                    };
                }
            }
            delete nextImage.imageElement;
            delete nextImage.src;
            delete nextImage.imageSrc;
            return nextImage;
        }));

        return serialized;
    }

    inflateSceneFromPackage(scene, resolveAssetDataUrl) {
        if (!scene) {
            return null;
        }

        const inflated = this.cloneSerializable(scene);
        const stampedImages = Array.isArray(inflated.stampedImages) ? inflated.stampedImages : [];
        inflated.stampedImages = stampedImages.map((image) => {
            const nextImage = this.cloneSerializable(image);
            if (nextImage.imageAsset) {
                nextImage.imageSrc = resolveAssetDataUrl(nextImage.imageAsset);
                delete nextImage.imageAsset;
            } else if (nextImage.imageSrc || nextImage.src) {
                nextImage.imageSrc = nextImage.imageSrc || nextImage.src;
            }
            delete nextImage.src;
            return nextImage;
        });
        return inflated;
    }

    createPackageManifest(documentPath = 'document.json') {
        return {
            packageType: 'aboard/project-package',
            schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
            mimetype: PROJECT_PACKAGE_MIME,
            document: documentPath,
            exportedAt: new Date().toISOString(),
            generator: {
                app: 'Aboard',
                version: window.__ABOARD_BUILD_VERSION__ || null
            },
            capabilities: [
                'page-scenes-v1',
                'page-raster-fallback-v1',
                'asset-pool-v1',
                'page-backgrounds-v1',
                'uploaded-image-library-v1'
            ]
        };
    }

    async createProjectPackage(scope, filename, selectedPages = []) {
        const zipLib = await this.ensureZipLibrary();
        const exportDescriptor = this.buildExportDescriptor(scope, selectedPages);
        const assetStore = this.createAssetStore();
        const serializedScenes = this.drawingBoard.getSerializedPageScenes?.(exportDescriptor.originalPageNumbers) || {};
        const pages = [];
        const pageEntries = {};

        for (let exportIndex = 0; exportIndex < exportDescriptor.originalPageNumbers.length; exportIndex++) {
            const originalPageNumber = exportDescriptor.originalPageNumbers[exportIndex];
            const pageNumber = exportIndex + 1;
            const pageId = `page-${String(pageNumber).padStart(4, '0')}`;
            const pagePath = `pages/${pageId}.json`;
            const serializedScene = await this.serializeSceneForPackage(serializedScenes[String(originalPageNumber)] || null, assetStore);
            const serializedBackground = await this.serializeBackgroundForPackage(this.getPageBackgroundSnapshot(originalPageNumber), assetStore);
            let rasterAsset = null;
            if (this.drawingBoard.pageRasterFallbackPages instanceof Set
                && this.drawingBoard.pageRasterFallbackPages.has(originalPageNumber)) {
                const rasterBase = this.drawingBoard.getPageRasterFallbackBase?.(originalPageNumber)
                    // A legacy raster-only page has no scene, so its complete
                    // page bitmap is also a safe base. Never use a composite
                    // bitmap when a scene exists or it would be drawn twice.
                    || (!serializedScene
                        ? this.drawingBoard.pages?.[originalPageNumber - 1] || null
                        : null);
                const rasterDataUrl = await this.imageDataToBase64(rasterBase);
                const registeredRaster = await this.registerDataUrlAsset(
                    assetStore,
                    rasterDataUrl,
                    `page-raster-${pageNumber}`
                );
                if (!registeredRaster) {
                    throw new Error(this.t(
                        'projectPackage.rasterFallbackUnavailable',
                        'Raster page data required to preserve the project is unavailable.'
                    ));
                }
                rasterAsset = {
                    id: registeredRaster.id,
                    path: registeredRaster.path,
                    mime: registeredRaster.mime
                };
            }
            const pagePayload = {
                schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
                id: pageId,
                index: pageNumber,
                sourcePageIndex: originalPageNumber,
                background: serializedBackground,
                scene: serializedScene,
                raster: rasterAsset
            };

            pages.push({
                id: pageId,
                index: pageNumber,
                sourcePageIndex: originalPageNumber,
                path: pagePath
            });
            pageEntries[pagePath] = zipLib.strToU8(JSON.stringify(pagePayload));
        }

        const documentPayload = {
            schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
            currentPage: exportDescriptor.currentPage,
            settings: this.getSettingsSnapshot(exportDescriptor.currentPage),
            globalBackground: await this.serializeBackgroundForPackage(this.getBackgroundSnapshot(), assetStore),
            uploadedImages: await this.serializeUploadedImagesForPackage(this.drawingBoard.uploadedImages || [], assetStore),
            pages
        };

        const zipEntries = {
            mimetype: [zipLib.strToU8(PROJECT_PACKAGE_MIME), { level: 0 }],
            'manifest.json': zipLib.strToU8(JSON.stringify(this.createPackageManifest('document.json'))),
            'document.json': zipLib.strToU8(JSON.stringify(documentPayload)),
            ...pageEntries
        };

        assetStore.files.forEach((asset) => {
            zipEntries[asset.path] = asset.bytes;
        });

        const zipBytes = zipLib.zipSync(zipEntries, { level: 6 });
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        return {
            blob,
            filename: `${this.stripKnownProjectExtension(filename)}.zip`
        };
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportProject(scope, filename, selectedPages = []) {
        try {
            const projectPackage = await this.createProjectPackage(scope, filename, selectedPages);
            this.downloadBlob(projectPackage.blob, projectPackage.filename);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            window.appDialog?.showAlert?.(
                this.t('projectPackage.exportFailed', 'Project export failed: {message}', { message: error.message }),
                'error'
            );
            return false;
        }
    }

    async confirmImportOverwrite() {
        const confirmMessage = this.t('projectPackage.overwriteConfirm', 'Importing a project will replace the current board content. Continue?');
        if (typeof window.appDialog?.showConfirm === 'function') {
            return window.appDialog.showConfirm({
                title: window.i18n?.t('common.confirm') || 'Confirm',
                message: confirmMessage,
                footerText: this.t('projectPackage.overwriteDetail', 'The current whiteboard pages and assets will be replaced by the project package.'),
                confirmText: window.i18n?.t('common.confirm') || 'Confirm',
                cancelText: window.i18n?.t('common.cancel') || 'Cancel'
            });
        }

        console.warn('DialogManager is unavailable for project import confirmation; cancelling the import.');
        return false;
    }

    getImportKindFromName(fileName = '') {
        const normalized = String(fileName || '').toLowerCase();
        if (normalized.endsWith('.zip')) return 'zip';
        if (normalized.endsWith('.aboard') || normalized.endsWith('.json')) return 'legacy';
        return null;
    }

    async detectImportKind(file) {
        const fromName = this.getImportKindFromName(file?.name || '');
        if (fromName) {
            return fromName;
        }

        const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        if (header[0] === 0x50 && header[1] === 0x4b) {
            return 'zip';
        }
        return 'legacy';
    }

    getAssetMimeFromPath(path = '') {
        const normalized = String(path).toLowerCase();
        if (normalized.endsWith('.png')) return 'image/png';
        if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
        if (normalized.endsWith('.webp')) return 'image/webp';
        if (normalized.endsWith('.gif')) return 'image/gif';
        if (normalized.endsWith('.svg')) return 'image/svg+xml';
        if (normalized.endsWith('.bmp')) return 'image/bmp';
        return 'application/octet-stream';
    }

    validateProjectFileSize(file) {
        const size = Number(file?.size || 0);
        if (Number.isFinite(size) && size > PROJECT_IMPORT_MAX_BYTES) {
            throw new Error(this.t('projectPackage.fileTooLarge', 'Project file is too large. Please import a file under 100 MB.'));
        }
    }

    validateProjectPackagePath(packagePath, { label = 'path', allowedPrefixes = null } = {}) {
        const normalizedPath = String(packagePath || '').replace(/\\/g, '/').trim();
        if (!normalizedPath
            || normalizedPath.startsWith('/')
            || /^[a-zA-Z]:\//.test(normalizedPath)
            || normalizedPath.split('/').some(segment => segment === '.' || segment === '..')) {
            throw new Error(this.t('projectPackage.unsafePath', 'Unsafe project package path: {path}', { path: normalizedPath || label }));
        }

        if (Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0
            && !allowedPrefixes.some(prefix => (prefix.endsWith('/')
                ? normalizedPath.startsWith(prefix)
                : normalizedPath === prefix))) {
            throw new Error(this.t('projectPackage.unsafePath', 'Unsafe project package path: {path}', { path: normalizedPath }));
        }

        return normalizedPath;
    }

    validateProjectPackageStructure(documentPayload, archive) {
        if (!Array.isArray(documentPayload?.pages) || documentPayload.pages.length === 0) {
            throw new Error(this.t('projectPackage.missingPages', 'The project package does not contain page data.'));
        }

        if (documentPayload.pages.length > PROJECT_IMPORT_MAX_PAGES) {
            throw new Error(this.t('projectPackage.tooManyPages', 'The project package contains too many pages.'));
        }

        if (Object.prototype.hasOwnProperty.call(documentPayload, 'currentPage')) {
            this.normalizeImportedPageNumber(documentPayload.currentPage);
        }

        documentPayload.pages.forEach((pageEntry) => {
            if (pageEntry && Object.prototype.hasOwnProperty.call(pageEntry, 'index')) {
                this.normalizeImportedPageNumber(pageEntry.index);
            }
        });

        let totalAssetBytes = 0;
        Object.entries(archive || {}).forEach(([entryPath, bytes]) => {
            const normalizedPath = this.validateProjectPackagePath(entryPath, { label: 'archive entry' });
            const byteLength = Number(bytes?.byteLength || bytes?.length || 0);
            if (normalizedPath.startsWith('assets/')) {
                if (byteLength > PROJECT_IMPORT_MAX_ASSET_BYTES) {
                    throw new Error(this.t('projectPackage.assetTooLarge', 'The project package contains an asset that is too large: {path}', { path: normalizedPath }));
                }
                totalAssetBytes += byteLength;
            }
        });

        if (totalAssetBytes > PROJECT_IMPORT_MAX_TOTAL_ASSET_BYTES) {
            throw new Error(this.t('projectPackage.assetsTooLarge', 'The project package contains too many embedded assets.'));
        }
    }

    async importProject(file) {
        if (!file) return;

        try {
            this.validateProjectFileSize(file);

            const importKind = await this.detectImportKind(file);
            if (importKind === 'legacy') {
                if (!this.drawingBoard.settingsManager?.legacyProjectImportEnabled) {
                    throw new Error(this.t(
                        'projectPackage.legacyCompatibilityDisabled',
                        'Legacy .aboard import compatibility is disabled. Enable it in Settings first.'
                    ));
                }
                const legacyCompat = await this.ensureLegacyCompat();
                return await legacyCompat.importLegacyProject(this, file);
            }

            return await this.importZipProject(file);
        } catch (error) {
            console.error('Import failed:', error);
            window.appDialog?.showAlert?.(
                this.t('projectPackage.importFailed', 'Project import failed: {message}', { message: error.message }),
                'error'
            );
            return false;
        }
    }

    async importZipProject(file) {
        const zipLib = await this.ensureZipLibrary();
        const confirmed = await this.confirmImportOverwrite();
        if (!confirmed) {
            return false;
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        const archive = zipLib.unzipSync(bytes);
        const mimetype = archive.mimetype ? zipLib.strFromU8(archive.mimetype) : null;
        if (mimetype && mimetype !== PROJECT_PACKAGE_MIME) {
            throw new Error(this.t('projectPackage.unsupportedPackage', 'This is not a supported Aboard project package.'));
        }

        const manifestBytes = archive['manifest.json'];
        const documentPath = this.validateProjectPackagePath(
            manifestBytes
                ? (JSON.parse(zipLib.strFromU8(manifestBytes)).document || 'document.json')
                : 'document.json',
            { label: 'document path', allowedPrefixes: ['document.json', 'documents/'] }
        );
        const documentBytes = archive[documentPath];
        if (!documentBytes) {
            throw new Error(this.t('projectPackage.missingDocument', 'The project package is missing document.json.'));
        }

        const documentPayload = JSON.parse(zipLib.strFromU8(documentBytes));
        this.validateProjectPackageStructure(documentPayload, archive);

        const assetCache = new Map();
        const resolveAssetDataUrl = (assetRef) => {
            if (!assetRef?.path) {
                return null;
            }
            const assetPath = this.validateProjectPackagePath(assetRef.path, {
                label: 'asset path',
                allowedPrefixes: ['assets/']
            });
            if (assetCache.has(assetPath)) {
                return assetCache.get(assetPath);
            }
            const assetBytes = archive[assetPath];
            if (!assetBytes) {
                throw new Error(this.t('projectPackage.missingAsset', 'The project package is missing asset file: {path}', {
                    path: assetPath
                }));
            }
            const mime = assetRef.mime || this.getAssetMimeFromPath(assetPath);
            const dataUrl = this.bytesToDataUrl(assetBytes, mime);
            assetCache.set(assetPath, dataUrl);
            return dataUrl;
        };

        const pageScenes = {};
        const pageBackgrounds = {};
        const pagesImageData = [];
        const rasterFallbackPages = new Set();
        let pageCount = 0;

        for (const pageEntry of documentPayload.pages) {
            const pagePath = this.validateProjectPackagePath(pageEntry.path, {
                label: 'page path',
                allowedPrefixes: ['pages/']
            });
            const pageBytes = archive[pagePath];
            if (!pageBytes) {
                throw new Error(this.t('projectPackage.missingPageFile', 'The project package is missing page file: {path}', {
                    path: pagePath
                }));
            }
            const pagePayload = JSON.parse(zipLib.strFromU8(pageBytes));
            const pageIndex = this.normalizeImportedPageNumber(pagePayload.index ?? pageEntry.index, pageCount + 1);
            pageCount = Math.max(pageCount, pageIndex);

            if (pagePayload.background) {
                pageBackgrounds[String(pageIndex)] = this.inflateBackgroundFromPackage(pagePayload.background, resolveAssetDataUrl);
            }
            if (pagePayload.scene) {
                pageScenes[String(pageIndex)] = this.inflateSceneFromPackage(pagePayload.scene, resolveAssetDataUrl);
            }
            if (pagePayload.raster) {
                const rasterDataUrl = resolveAssetDataUrl(pagePayload.raster);
                const rasterImageData = await this.base64ToImageData(rasterDataUrl);
                if (!rasterImageData) {
                    throw new Error(this.t(
                        'projectPackage.rasterFallbackUnavailable',
                        'Raster page data required to preserve the project is unavailable.'
                    ));
                }
                pagesImageData[pageIndex - 1] = rasterImageData;
                rasterFallbackPages.add(pageIndex);
            }
        }

        await this.applyImportedProjectState({
            settings: documentPayload.settings || {},
            uploadedImages: this.inflateUploadedImagesFromPackage(documentPayload.uploadedImages || [], resolveAssetDataUrl),
            globalBackground: this.inflateBackgroundFromPackage(documentPayload.globalBackground || null, resolveAssetDataUrl),
            pageBackgrounds,
            pageScenes,
            pagesImageData: pagesImageData.some(Boolean) ? pagesImageData : null,
            rasterFallbackPages,
            currentPage: this.normalizeImportedPageNumber(documentPayload.currentPage, 1),
            pageCount
        });

        window.appDialog?.showAlert?.(this.t('projectPackage.importSuccess', 'Project imported successfully.'), 'success');
        return true;
    }

    async renderPagesFromCurrentScenes(pageCount) {
        const renderedPages = [];
        const textManager = this.drawingBoard.insertTextManager || null;

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            this.drawingBoard.ctx.clearRect(0, 0, this.drawingBoard.canvas.width, this.drawingBoard.canvas.height);
            this.drawingBoard.restorePageScene?.(pageNumber);
            this.drawingBoard.drawingEngine.renderScene?.(textManager);
            renderedPages.push(this.getCurrentCanvasImageData());
        }

        return renderedPages;
    }

    async applyImportedProjectState({
        settings = {},
        uploadedImages = [],
        globalBackground = null,
        pageBackgrounds = {},
        pageScenes = {},
        pagesImageData = null,
        rasterFallbackPages = null,
        currentPage = 1,
        pageCount = 1
    } = {}) {
        const normalizedCurrentPage = this.normalizeImportedPageNumber(currentPage, 1);
        const normalizedExplicitPageCount = this.normalizeImportedPageNumber(pageCount, 1);
        const pageBackgroundNumbers = this.normalizeImportedPageKeys(pageBackgrounds);
        const pageSceneNumbers = this.normalizeImportedPageKeys(pageScenes);
        const pagesImageDataCount = Array.isArray(pagesImageData) && pagesImageData.length > 0
            ? this.normalizeImportedPageNumber(pagesImageData.length)
            : 0;
        const normalizedPageCount = Math.max(
            1,
            normalizedExplicitPageCount,
            pagesImageDataCount,
            ...pageBackgroundNumbers,
            ...pageSceneNumbers,
            normalizedCurrentPage
        );

        // 1. Restore settings
        if (settings.canvasWidth && settings.canvasHeight) {
            this.drawingBoard.settingsManager.setCanvasSize(settings.canvasWidth, settings.canvasHeight);

            const widthInput = document.getElementById('canvas-width-input');
            const heightInput = document.getElementById('canvas-height-input');
            if (widthInput) widthInput.value = settings.canvasWidth;
            if (heightInput) heightInput.value = settings.canvasHeight;
        }

        if (settings.canvasPreset) {
            this.drawingBoard.settingsManager.canvasPreset = settings.canvasPreset;
        }

        if (typeof settings.unlimitedZoom !== 'undefined') {
            this.drawingBoard.settingsManager.unlimitedZoom = settings.unlimitedZoom;
            const zoomCheck = document.getElementById('unlimited-zoom-checkbox');
            if (zoomCheck) zoomCheck.checked = settings.unlimitedZoom;
            this.drawingBoard.updateMaxCanvasScale?.();
        }

        this.drawingBoard.applyCanvasSize();

        // 2. Restore uploaded image library
        this.drawingBoard.uploadedImages = Array.isArray(uploadedImages)
            ? this.cloneSerializable(uploadedImages)
            : [];
        this.drawingBoard.updateUploadedImagesButtons?.();
        safeProjectStorageSetItem('uploadedImages', JSON.stringify(this.drawingBoard.uploadedImages));

        // 3. Restore backgrounds and scenes
        this.drawingBoard.pageBackgrounds = this.cloneSerializable(pageBackgrounds || {});
        const hasExplicitRasterFallbackPages = rasterFallbackPages !== null
            && typeof rasterFallbackPages !== 'undefined';
        const importedRasterFallbackPages = new Set();
        if (hasExplicitRasterFallbackPages) {
            const explicitPages = rasterFallbackPages instanceof Set
                ? Array.from(rasterFallbackPages)
                : (Array.isArray(rasterFallbackPages) ? rasterFallbackPages : []);
            explicitPages.forEach((pageNumber) => {
                const normalizedPage = Number(pageNumber);
                if (Number.isInteger(normalizedPage)
                    && normalizedPage >= 1
                    && normalizedPage <= normalizedPageCount
                    && pagesImageData?.[normalizedPage - 1]) {
                    importedRasterFallbackPages.add(normalizedPage);
                }
            });
        } else if (Array.isArray(pagesImageData)) {
            // Legacy projects do not identify raster bases separately. Their
            // complete bitmap is safe as a base only when no editable scene is
            // present for that page.
            pagesImageData.forEach((pageBitmap, index) => {
                const pageNumber = index + 1;
                if (pageBitmap && !pageScenes?.[String(pageNumber)]) {
                    importedRasterFallbackPages.add(pageNumber);
                }
            });
        }
        this.drawingBoard.pageRasterFallbackPages = importedRasterFallbackPages;
        this.drawingBoard.pageRasterFallbackBases = new Map();
        this.drawingBoard.pageRasterFallbackScaledBases = new Map();
        importedRasterFallbackPages.forEach((pageNumber) => {
            const rasterBase = pagesImageData?.[pageNumber - 1] || null;
            if (rasterBase) {
                this.drawingBoard.pageRasterFallbackBases.set(pageNumber, rasterBase);
            }
        });
        safeProjectStorageSetItem('pageBackgrounds', JSON.stringify(this.drawingBoard.pageBackgrounds));
        await this.applyGlobalBackground(globalBackground || null);
        await this.drawingBoard.applySerializedPageScenes(pageScenes || {});

        // 4. Restore page raster cache
        if (Array.isArray(pagesImageData) && pagesImageData.length > 0) {
            this.drawingBoard.pages = Array.from(
                { length: pagesImageData.length },
                (_, index) => pagesImageData[index] || null
            );
            while (this.drawingBoard.pages.length < normalizedPageCount) {
                this.drawingBoard.pages.push(null);
            }
        } else {
            // Editable package pages are fully represented by their scenes;
            // keep their raster cache lazy instead of allocating every full
            // canvas during import.
            this.drawingBoard.pages = Array.from({ length: normalizedPageCount }, () => null);
        }

        if (!Array.isArray(this.drawingBoard.pages) || this.drawingBoard.pages.length === 0) {
            this.drawingBoard.pages = [null];
        }

        const importedCurrentPage = Math.min(
            Math.max(normalizedCurrentPage, 1),
            this.drawingBoard.pages.length
        );

        // 5. Reset UI to the imported target page
        this.drawingBoard.currentPage = importedCurrentPage;
        await this.drawingBoard.loadPage(importedCurrentPage);
        this.drawingBoard.enforcePageBitmapMemoryBudget?.();
        this.drawingBoard.updatePaginationUI();
        this.drawingBoard.updateBackgroundUI();
        this.drawingBoard.updateUI?.();

        // 6. Persist imported state
        this.drawingBoard.saveSessionDebounced();
    }
}

if (typeof window !== 'undefined') {
    window.ProjectManager = ProjectManager;
}
