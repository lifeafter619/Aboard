// Project Manager Module
// Handles exporting and importing full project state as standard ZIP packages,
// while keeping legacy .aboard parsing available on demand.

const PROJECT_PACKAGE_MIME = 'application/vnd.aboard.project+zip';
const PROJECT_PACKAGE_SCHEMA_VERSION = 1;
const ZIP_LIBRARY_SCRIPT = 'js/libs/fflate.min.js';
const LEGACY_PROJECT_COMPAT_SCRIPT = 'js/modules/project-legacy-compat.js';

class ProjectManager {
    constructor(drawingBoard) {
        this.drawingBoard = drawingBoard;
    }

    t(key, fallback = '', replacements = null) {
        const translated = window.i18n?.t?.(key) || fallback;
        if (!replacements || typeof translated !== 'string') {
            return translated;
        }

        return Object.entries(replacements).reduce(
            (message, [name, value]) => message.replaceAll(`{${name}}`, String(value ?? '')),
            translated
        );
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
        if (!backgroundData) {
            return;
        }

        const bm = this.drawingBoard.backgroundManager;

        if (typeof backgroundData.backgroundColor !== 'undefined') bm.backgroundColor = backgroundData.backgroundColor;
        if (typeof backgroundData.backgroundPattern !== 'undefined') bm.backgroundPattern = backgroundData.backgroundPattern;
        if (typeof backgroundData.bgOpacity !== 'undefined') bm.bgOpacity = backgroundData.bgOpacity;
        if (typeof backgroundData.patternIntensity !== 'undefined') bm.patternIntensity = backgroundData.patternIntensity;
        if (typeof backgroundData.patternDensity !== 'undefined') bm.patternDensity = backgroundData.patternDensity;
        if (typeof backgroundData.imageSize !== 'undefined') bm.imageSize = backgroundData.imageSize;
        if (typeof backgroundData.coordinateOriginX !== 'undefined') {
            bm.setCoordinateOrigin?.(backgroundData.coordinateOriginX, backgroundData.coordinateOriginY);
        }
        bm.setCoordinateOverlayState?.(backgroundData.coordinateOverlayState, { persist: false, redraw: false });
        if (backgroundData.imageTransform) {
            bm.updateImageTransform?.(backgroundData.imageTransform);
        }
        if (typeof backgroundData.gifLoopCount !== 'undefined') {
            bm.setGifLoopCount?.(backgroundData.gifLoopCount);
        }
        if (typeof backgroundData.backgroundOutsideLayerOrder !== 'undefined') {
            bm.backgroundOutsideLayerOrder = backgroundData.backgroundOutsideLayerOrder;
        }

        if (backgroundData.backgroundImageData) {
            bm.backgroundImageData = backgroundData.backgroundImageData;
            bm.backgroundImage = await this.loadImageElement(backgroundData.backgroundImageData);
        } else {
            bm.backgroundImageData = null;
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
        return Promise.all((uploadedImages || []).map(async (image, index) => {
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
        return (uploadedImages || []).map((image, index) => ({
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
        serialized.stampedImages = await Promise.all((scene.stampedImages || []).map(async (image, index) => {
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
        inflated.stampedImages = (inflated.stampedImages || []).map((image) => {
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
            const pagePayload = {
                schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
                id: pageId,
                index: pageNumber,
                sourcePageIndex: originalPageNumber,
                background: serializedBackground,
                scene: serializedScene
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

    async importProject(file) {
        if (!file) return;

        try {
            const importKind = await this.detectImportKind(file);
            if (importKind === 'legacy') {
                if (!this.drawingBoard.settingsManager?.legacyProjectImportEnabled) {
                    throw new Error(this.t(
                        'projectPackage.legacyCompatibilityDisabled',
                        'Legacy .aboard import compatibility is disabled. Enable it in Settings first.'
                    ));
                }
                const legacyCompat = await this.ensureLegacyCompat();
                return legacyCompat.importLegacyProject(this, file);
            }

            return this.importZipProject(file);
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
        const documentPath = manifestBytes
            ? (JSON.parse(zipLib.strFromU8(manifestBytes)).document || 'document.json')
            : 'document.json';
        const documentBytes = archive[documentPath];
        if (!documentBytes) {
            throw new Error(this.t('projectPackage.missingDocument', 'The project package is missing document.json.'));
        }

        const documentPayload = JSON.parse(zipLib.strFromU8(documentBytes));
        if (!Array.isArray(documentPayload.pages) || documentPayload.pages.length === 0) {
            throw new Error(this.t('projectPackage.missingPages', 'The project package does not contain page data.'));
        }

        const assetCache = new Map();
        const resolveAssetDataUrl = (assetRef) => {
            if (!assetRef?.path) {
                return null;
            }
            if (assetCache.has(assetRef.path)) {
                return assetCache.get(assetRef.path);
            }
            const assetBytes = archive[assetRef.path];
            if (!assetBytes) {
                throw new Error(this.t('projectPackage.missingAsset', 'The project package is missing asset file: {path}', {
                    path: assetRef.path
                }));
            }
            const mime = assetRef.mime || this.getAssetMimeFromPath(assetRef.path);
            const dataUrl = this.bytesToDataUrl(assetBytes, mime);
            assetCache.set(assetRef.path, dataUrl);
            return dataUrl;
        };

        const pageScenes = {};
        const pageBackgrounds = {};
        let pageCount = 0;

        for (const pageEntry of documentPayload.pages) {
            const pageBytes = archive[pageEntry.path];
            if (!pageBytes) {
                throw new Error(this.t('projectPackage.missingPageFile', 'The project package is missing page file: {path}', {
                    path: pageEntry.path
                }));
            }
            const pagePayload = JSON.parse(zipLib.strFromU8(pageBytes));
            const pageIndex = parseInt(pagePayload.index ?? pageEntry.index, 10) || (pageCount + 1);
            pageCount = Math.max(pageCount, pageIndex);

            if (pagePayload.background) {
                pageBackgrounds[String(pageIndex)] = this.inflateBackgroundFromPackage(pagePayload.background, resolveAssetDataUrl);
            }
            if (pagePayload.scene) {
                pageScenes[String(pageIndex)] = this.inflateSceneFromPackage(pagePayload.scene, resolveAssetDataUrl);
            }
        }

        await this.applyImportedProjectState({
            settings: documentPayload.settings || {},
            uploadedImages: this.inflateUploadedImagesFromPackage(documentPayload.uploadedImages || [], resolveAssetDataUrl),
            globalBackground: this.inflateBackgroundFromPackage(documentPayload.globalBackground || null, resolveAssetDataUrl),
            pageBackgrounds,
            pageScenes,
            currentPage: parseInt(documentPayload.currentPage, 10) || 1,
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
        currentPage = 1,
        pageCount = 1
    } = {}) {
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
        localStorage.setItem('uploadedImages', JSON.stringify(this.drawingBoard.uploadedImages));

        // 3. Restore backgrounds and scenes
        this.drawingBoard.pageBackgrounds = this.cloneSerializable(pageBackgrounds || {});
        localStorage.setItem('pageBackgrounds', JSON.stringify(this.drawingBoard.pageBackgrounds));
        await this.applyGlobalBackground(globalBackground || null);
        await this.drawingBoard.applySerializedPageScenes(pageScenes || {});

        // 4. Restore page raster cache
        const normalizedPageCount = Math.max(
            1,
            pageCount || 1,
            Object.keys(this.drawingBoard.pageBackgrounds || {}).length,
            Object.keys(this.drawingBoard.pageScenes || {}).length,
            parseInt(currentPage, 10) || 1
        );

        if (Array.isArray(pagesImageData) && pagesImageData.length > 0) {
            this.drawingBoard.pages = [...pagesImageData];
            while (this.drawingBoard.pages.length < normalizedPageCount) {
                this.drawingBoard.pages.push(this.createBlankPageImageData());
            }
        } else {
            this.drawingBoard.pages = await this.renderPagesFromCurrentScenes(normalizedPageCount);
        }

        if (!Array.isArray(this.drawingBoard.pages) || this.drawingBoard.pages.length === 0) {
            this.drawingBoard.pages = [this.createBlankPageImageData()];
        }

        const importedCurrentPage = Math.min(
            Math.max(parseInt(currentPage, 10) || 1, 1),
            this.drawingBoard.pages.length
        );

        // 5. Reset UI to the imported target page
        this.drawingBoard.currentPage = importedCurrentPage;
        this.drawingBoard.loadPage(importedCurrentPage);
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
