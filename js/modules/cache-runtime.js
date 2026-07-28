// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const CACHE_SESSION_WRITE_EPOCH_KEY = 'aboardSessionWriteEpoch';

function safeCacheStorageRemoveItem(storage, key, storageLabel = 'storage') {
        try {
            storage?.removeItem?.(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove ${storageLabel} key "${key}":`, error);
            return false;
        }
}

function safeCacheStorageClear(storage, storageLabel = 'storage') {
        try {
            storage?.clear?.();
            return true;
        } catch (error) {
            console.warn(`Failed to clear ${storageLabel}:`, error);
            return false;
        }
}

function safeCacheStorageGetItem(storage, key, storageLabel = 'storage') {
        try {
            return storage?.getItem?.(key) ?? null;
        } catch (error) {
            console.warn(`Failed to read ${storageLabel} key "${key}":`, error);
            return null;
        }
}

function getStorageKeysSafely(storage, storageLabel = 'storage') {
        try {
            const keys = [];
            const length = Number(storage?.length || 0);
            for (let i = 0; i < length; i += 1) {
                const key = storage.key(i);
                if (key) {
                    keys.push(key);
                }
            }
            return keys;
        } catch (error) {
            console.warn(`Failed to enumerate ${storageLabel} keys:`, error);
            return null;
        }
}

function getCacheKeyGroups() {
        const settingsKeys = new Set([
            'toolbarSize', 'configScale', 'controlPosition', 'edgeSnapEnabled', 'touchZoomEnabled',
            'unlimitedZoom', 'showZoomControls', 'showImportExportBtn', 'showFullscreenBtn',
            'showToolbarText', 'keepMorePanelOpen', 'canvasWidth', 'canvasHeight', 'canvasPreset',
            'themeColor', 'globalFont', 'locale', 'customFonts', 'fontPreferences', 'fontPreviewSettings',
            'patternPreferences', 'modalSizePreferences', 'modalCenterPreferences', 'toolbarOrder',
            'toolbarVisibility', 'controlShowZoom', 'controlShowPagination', 'controlShowTime',
            'controlShowFullscreen', 'controlShowImport', 'controlShowExport', 'controlButtonOrder',
            'updatePreference', 'legacyProjectImportEnabled', 'aboardLocalePreferenceMode',
            'aboardDownloadedLocales', 'aboardDeferredLocaleSuggestionDismissed', 'collapsedSections',
            'penType',
            'penLineStyle', 'penDashDensity', 'penMultiLineCount', 'penMultiLineSpacing',
            'eraserShape', 'eraserSize', 'lineStyle',
            'shapeLineStyle', 'shapeDashDensity', 'shapeWaveDensity', 'shapeMultiLineCount',
            'shapeMultiLineSpacing', 'shapeArrowSize',
            'timeDisplayEnabled', 'timeDisplayMode', 'timeDisplayTimeFormat', 'timeDisplayDateFormat',
            'timeDisplayColor', 'timeDisplayBgColor', 'timeDisplayFontSize', 'timeDisplayOpacity',
            'timeDisplayShowDate', 'timeDisplayShowTime', 'timeDisplayFullscreenMode',
            'timeDisplayFullscreenFontSize', 'timeDisplayFullscreenTitleFontSize',
            'timeDisplayFullscreenColor', 'timeDisplayFullscreenBgColor',
            'timeDisplayFullscreenOpacity', 'timeDisplayTimezone',
            'scoreboard_data', 'randomPickerConfig', 'timerCustomSounds', 'hideAnnouncement'
        ]);
        const settingsKeyPrefixes = ['scoreboard_data_'];
        const canvasKeys = new Set([
            'savedCanvasData', 'savedBgCanvasData', 'savedCanvasTimestamp',
            'savedCurrentPage', 'pageBackgrounds', 'pageScenes',
            'backgroundColor', 'backgroundPattern', 'bgOpacity',
            'patternIntensity', 'patternDensity',
            'backgroundImageData', 'backgroundImageConfirmed',
            'imageTransform', 'imageSize',
            'coordinateOriginX', 'coordinateOriginY', 'coordinateOverlayState',
            'backgroundOutsideLayerOrder',
            'uploadedImages', 'floatingGifs',
            'canvasScale', 'panOffsetX', 'panOffsetY', 'canvasViewStateVersion',
            'aboardSessionSizeEstimate',
            this?.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot',
            'aboardPlannedUpdateReload'
        ]);
        const canvasKeyPrefixes = [];
        const internalKeys = new Set([CACHE_SESSION_WRITE_EPOCH_KEY]);
        return { settingsKeys, settingsKeyPrefixes, canvasKeys, canvasKeyPrefixes, internalKeys };
    
}

function cacheKeyMatches(key, exactKeys, prefixes = []) {
        return exactKeys.has(key) || prefixes.some(prefix => key.startsWith(prefix));
}

function removeCacheKeyGroup(storage, storageLabel, exactKeys, prefixes = []) {
        let succeeded = true;
        exactKeys.forEach(key => {
            succeeded = safeCacheStorageRemoveItem(storage, key, storageLabel) && succeeded;
        });
        if (prefixes.length === 0) {
            return succeeded;
        }

        const storageKeys = getStorageKeysSafely(storage, storageLabel);
        if (storageKeys === null) {
            return false;
        }
        storageKeys.forEach(key => {
            if (prefixes.some(prefix => key.startsWith(prefix))) {
                succeeded = safeCacheStorageRemoveItem(storage, key, storageLabel) && succeeded;
            }
        });
        return succeeded;
}

function getStorageEntrySize(key, value) {
        return new Blob([`${key}${value || ''}`]).size;
    
}

async function withTimeout(promise, timeoutMs, fallbackValue = null) {
        let timerId = null;
        try {
            return await Promise.race([
                Promise.resolve(promise),
                new Promise(resolve => {
                    timerId = window.setTimeout(() => resolve(fallbackValue), timeoutMs);
                })
            ]);
        } finally {
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
        }
    
}

function getServiceWorkerReadyPromise() {
        if (!('serviceWorker' in navigator)) {
            return null;
        }
        const readyPromise = navigator.serviceWorker?.ready;
        if (!readyPromise || typeof readyPromise.then !== 'function') {
            return null;
        }
        return readyPromise;
    
}

async function waitForServiceWorkerCacheReady(timeoutMs = 2000) {
        if (!('serviceWorker' in navigator)) {
            return false;
        }
        if (navigator.serviceWorker.controller) {
            return true;
        }
        const readyPromise = getServiceWorkerReadyPromise();
        if (!readyPromise) {
            return false;
        }
        try {
            const readyResult = await this.withTimeout(
                Promise.resolve(readyPromise).then(() => true).catch(() => false),
                timeoutMs,
                false
            );
            return !!readyResult;
        } catch (e) {
            console.warn('Failed while waiting for Service Worker cache readiness:', e);
            return false;
        }
    
}

function scheduleCacheSizeRetryWhenReady() {
        if (this.cacheSizeRetryScheduled || !('serviceWorker' in navigator) || navigator.serviceWorker.controller) {
            return;
        }

        const readyPromise = getServiceWorkerReadyPromise();
        if (!readyPromise) {
            this.cacheSizeRetryScheduled = false;
            return;
        }

        this.cacheSizeRetryScheduled = true;
        Promise.resolve(readyPromise)
            .then(() => {
                this.cacheSizeRetryScheduled = false;
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal?.classList.contains('show')) {
                    this.updateCacheSizeDisplay();
                }
            })
            .catch(() => {
                this.cacheSizeRetryScheduled = false;
            });
    
}

function getCacheStorageSizeSnapshot() {
        try {
            const raw = localStorage.getItem(this.cacheStorageSizeSnapshotKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const bytes = Number(parsed?.bytes);
            const fingerprint = typeof parsed?.fingerprint === 'string' ? parsed.fingerprint : '';
            if (!Number.isFinite(bytes) || bytes < 0 || !fingerprint) {
                return null;
            }
            return { fingerprint, bytes: Math.round(bytes) };
        } catch (e) {
            console.warn('Failed to read cache storage size snapshot:', e);
            return null;
        }
    
}

function setCacheStorageSizeSnapshot(fingerprint, bytes) {
        try {
            const normalizedBytes = Math.max(0, Math.round(Number(bytes) || 0));
            if (!fingerprint) {
                localStorage.removeItem(this.cacheStorageSizeSnapshotKey);
                return;
            }
            localStorage.setItem(this.cacheStorageSizeSnapshotKey, JSON.stringify({
                fingerprint,
                bytes: normalizedBytes
            }));
        } catch (e) {
            console.warn('Failed to persist cache storage size snapshot:', e);
        }
    
}

function clearCacheStorageSizeSnapshot() {
        try {
            localStorage.removeItem(this.cacheStorageSizeSnapshotKey);
        } catch (e) {
            console.warn('Failed to clear cache storage size snapshot:', e);
        }
    
}

async function buildCacheStorageFingerprint() {
        if (!('caches' in window)) {
            return 'unsupported';
        }
        try {
            const cacheNames = await caches.keys();
            if (cacheNames.length === 0) {
                return 'empty';
            }
            cacheNames.sort();
            const parts = [];
            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                const urls = requests.map(request => request.url).sort();
                parts.push(`${cacheName}::${urls.length}::${urls.join('|')}`);
            }
            return parts.join('||');
        } catch (e) {
            console.warn('Failed to build Cache Storage fingerprint:', e);
            return '';
        }
    
}

async function measureExactCacheStorageUsage() {
        let total = 0;
        if (!('caches' in window)) {
            return total;
        }
        try {
            const cacheKeys = await caches.keys();
            const totals = await Promise.all(cacheKeys.map(async (cacheName) => {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                const responseSizes = await Promise.all(requests.map(async (request) => {
                    try {
                        const response = await cache.match(request);
                        if (!response) {
                            return 0;
                        }
                        const contentLength = Number(response.headers.get('content-length'));
                        if (Number.isFinite(contentLength) && contentLength >= 0) {
                            return contentLength;
                        }
                        const blob = await response.clone().blob();
                        return blob.size;
                    } catch (innerError) {
                        console.warn('Failed to inspect cached response size:', request.url, innerError);
                        return 0;
                    }
                }));
                return responseSizes.reduce((sum, size) => sum + size, 0);
            }));
            total = totals.reduce((sum, size) => sum + size, 0);
        } catch (e) {
            console.warn('Failed to estimate Cache Storage size:', e);
        }
        return total;
    
}

async function getExactCacheStorageUsage() {
        if (!('caches' in window)) {
            this.clearCacheStorageSizeSnapshot();
            return 0;
        }

        const fingerprint = await this.buildCacheStorageFingerprint();
        if (fingerprint === 'unsupported' || fingerprint === 'empty') {
            this.setCacheStorageSizeSnapshot(fingerprint, 0);
            return 0;
        }

        const snapshot = this.getCacheStorageSizeSnapshot();
        if (snapshot && snapshot.fingerprint === fingerprint) {
            return snapshot.bytes;
        }

        const measuredBytes = await this.measureExactCacheStorageUsage();
        this.setCacheStorageSizeSnapshot(fingerprint, measuredBytes);
        return measuredBytes;
    
}

function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        const val = bytes / Math.pow(1024, idx);
        return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
    
}

async function getCacheSizeSummary() {
        const {
            settingsKeys,
            settingsKeyPrefixes = [],
            canvasKeys,
            canvasKeyPrefixes = [],
            internalKeys: groupedInternalKeys = new Set()
        } = this.getCacheKeyGroups();
        const summary = { settings: 0, canvas: 0, other: 0 };
        const internalKeys = new Set([this.cacheStorageSizeSnapshotKey, ...groupedInternalKeys]);
        const addStorageUsage = (storage, storageLabel) => {
            const storageKeys = getStorageKeysSafely(storage, storageLabel);
            if (storageKeys === null) {
                return;
            }
            storageKeys.forEach((key) => {
                if (!key || internalKeys.has(key)) return;
                const val = safeCacheStorageGetItem(storage, key, storageLabel);
                const size = this.getStorageEntrySize(key, val);
                if (cacheKeyMatches(key, settingsKeys, settingsKeyPrefixes)) summary.settings += size;
                else if (cacheKeyMatches(key, canvasKeys, canvasKeyPrefixes)) summary.canvas += size;
                else summary.other += size;
            });
        };

        addStorageUsage(localStorage, 'localStorage');
        addStorageUsage(sessionStorage, 'sessionStorage');

        let indexedDbCanvasUsage = this.storageManager?.getSessionSizeEstimate?.() || 0;
        if (!indexedDbCanvasUsage) {
            try {
                const session = await this.storageManager.loadSession();
                indexedDbCanvasUsage = StorageManager.estimateSessionSize(session);
                if (indexedDbCanvasUsage > 0) {
                    this.storageManager.setSessionSizeEstimate(indexedDbCanvasUsage);
                }
            } catch (e) {
                console.warn('Failed to estimate IndexedDB size:', e);
            }
        }
        summary.canvas += indexedDbCanvasUsage;

        let cacheUsage = 0;
        const shouldWaitForServiceWorker = 'serviceWorker' in navigator && !navigator.serviceWorker.controller;
        if (shouldWaitForServiceWorker) {
            const serviceWorkerReady = await this.waitForServiceWorkerCacheReady();
            if (!serviceWorkerReady) {
                this.scheduleCacheSizeRetryWhenReady();
            }
        }
        cacheUsage = await this.withTimeout(
            this.getExactCacheStorageUsage(),
            2500,
            this.getCacheStorageSizeSnapshot()?.bytes || 0
        );
        summary.other += cacheUsage;

        return summary;
    
}

async function updateCacheSizeDisplay() {
        const settingsSizeEl = document.getElementById('settings-cache-size');
        const canvasSizeEl = document.getElementById('canvas-cache-size');
        const otherSizeEl = document.getElementById('other-cache-size');
        if (!settingsSizeEl || !canvasSizeEl || !otherSizeEl) return;
        const requestToken = ++this.cacheSizeRequestToken;
        try {
            const summary = await this.getCacheSizeSummary();
            if (requestToken !== this.cacheSizeRequestToken) {
                return;
            }
            settingsSizeEl.textContent = this.formatBytes(summary.settings);
            canvasSizeEl.textContent = this.formatBytes(summary.canvas);
            otherSizeEl.textContent = this.formatBytes(summary.other);
        } catch (e) {
            console.warn('Failed to update cache size display:', e);
            if (requestToken !== this.cacheSizeRequestToken) {
                return;
            }
            settingsSizeEl.textContent = '0 B';
            canvasSizeEl.textContent = '0 B';
            otherSizeEl.textContent = '0 B';
        }
    
}

async function clearSelectedCache(options) {
        const {
            settingsKeys,
            settingsKeyPrefixes = [],
            canvasKeys,
            canvasKeyPrefixes = [],
            internalKeys = new Set()
        } = this.getCacheKeyGroups();
        let cleanupSucceeded = true;

        if (typeof this.isSessionWriteAllowed === 'function' && !this.isSessionWriteAllowed()) {
            showClearAllLocalDataFailure(this, { reason: 'blocked' });
            return false;
        }

        if (options.canvas) {
            const cleared = await this.clearSessionData();
            if (!cleared) {
                return false;
            }
            cleanupSucceeded = removeCacheKeyGroup(
                localStorage, 'localStorage', canvasKeys, canvasKeyPrefixes
            ) && cleanupSucceeded;
            cleanupSucceeded = removeCacheKeyGroup(
                sessionStorage, 'sessionStorage', canvasKeys, canvasKeyPrefixes
            ) && cleanupSucceeded;
        }

        if (options.settings) {
            cleanupSucceeded = removeCacheKeyGroup(
                localStorage, 'localStorage', settingsKeys, settingsKeyPrefixes
            ) && cleanupSucceeded;
            cleanupSucceeded = removeCacheKeyGroup(
                sessionStorage, 'sessionStorage', settingsKeys, settingsKeyPrefixes
            ) && cleanupSucceeded;
        }

        if (options.other) {
            const shouldPreserve = key => internalKeys.has(key)
                || (!options.settings && cacheKeyMatches(key, settingsKeys, settingsKeyPrefixes))
                || (!options.canvas && cacheKeyMatches(key, canvasKeys, canvasKeyPrefixes));

            const localKeys = getStorageKeysSafely(localStorage, 'localStorage');
            if (localKeys === null) {
                cleanupSucceeded = false;
            } else {
                localKeys.forEach(key => {
                    if (!shouldPreserve(key)) {
                        cleanupSucceeded = safeCacheStorageRemoveItem(localStorage, key, 'localStorage') && cleanupSucceeded;
                    }
                });
            }
            const sessionKeys = getStorageKeysSafely(sessionStorage, 'sessionStorage');
            if (sessionKeys === null) {
                cleanupSucceeded = false;
            } else {
                sessionKeys.forEach(key => {
                    if (!shouldPreserve(key)) {
                        cleanupSucceeded = safeCacheStorageRemoveItem(sessionStorage, key, 'sessionStorage') && cleanupSucceeded;
                    }
                });
            }

            if ('caches' in window) {
                try {
                    const cacheKeys = await caches.keys();
                    const cacheResults = await Promise.all(cacheKeys.map(key => caches.delete(key)));
                    cleanupSucceeded = cacheResults.every(Boolean) && cleanupSucceeded;
                } catch (error) {
                    console.warn('Failed to clear Cache Storage:', error);
                    cleanupSucceeded = false;
                }
            }
            this.setCacheStorageSizeSnapshot('empty', 0);
        }

        if (!cleanupSucceeded) {
            showClearAllLocalDataFailure(this, { reason: 'error' });
        }
        return cleanupSucceeded;

}

function getCacheRuntimeText(key, fallback) {
        const translated = window.i18n?.t?.(key);
        return translated && translated !== key ? translated : fallback;
}

function showClearAllLocalDataFailure(board, deleteResult) {
        const isBlocked = deleteResult?.reason === 'blocked';
        const isInvalidated = board.sessionWriteLockState === 'invalidated';
        const message = isInvalidated
            ? getCacheRuntimeText(
                'errors.sessionDataClearedElsewhere',
                'Saved board data was cleared in another tab. Reload before clearing again.'
            )
            : isBlocked
            ? getCacheRuntimeText(
                'errors.clearLocalDataBlocked',
                'Local data cleanup is blocked by another open Aboard window. Close other Aboard tabs and try again.'
            )
            : getCacheRuntimeText(
                'errors.clearLocalDataFailed',
                'Local data cleanup could not finish. Please try again.'
            );

        if (board.settingsManager?.toastManager?.show) {
            board.settingsManager.toastManager.show(message, isBlocked || isInvalidated ? 'warning' : 'error');
            return;
        }

        window.appDialog?.showAlert?.(message, isBlocked || isInvalidated ? 'warning' : 'error');
}

async function clearAllLocalData() {
        if (typeof this.isSessionWriteAllowed === 'function' && !this.isSessionWriteAllowed()) {
            showClearAllLocalDataFailure(this, { reason: 'blocked' });
            return false;
        }

        this.isClearingLocalData = true;
        try {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            const sessionCleared = await this.clearSessionData();
            if (!sessionCleared) {
                return false;
            }
            const localStorageCleared = safeCacheStorageClear(localStorage, 'localStorage');
            const sessionStorageCleared = safeCacheStorageClear(sessionStorage, 'sessionStorage');
            const sessionWriteEpochPersisted = !localStorageCleared
                || typeof this.persistSessionWriteEpoch !== 'function'
                || this.persistSessionWriteEpoch() !== false;

            let cacheStorageCleared = true;
            if ('caches' in window) {
                try {
                    const cacheKeys = await caches.keys();
                    const cacheResults = await Promise.all(cacheKeys.map(key => caches.delete(key)));
                    cacheStorageCleared = cacheResults.every(Boolean);
                } catch (error) {
                    console.warn('Failed to clear Cache Storage:', error);
                    cacheStorageCleared = false;
                }
            }
            if (!localStorageCleared
                || !sessionStorageCleared
                || !sessionWriteEpochPersisted
                || !cacheStorageCleared) {
                showClearAllLocalDataFailure(this, { reason: 'error' });
                return false;
            }
            this.setCacheStorageSizeSnapshot('empty', 0);
            return true;
        } finally {
            this.isClearingLocalData = false;
        }
    
}

window.AboardCacheRuntime = {
    getCacheKeyGroups(board) {
        return getCacheKeyGroups.call(board);
    },
    getStorageEntrySize(board, key, value) {
        return getStorageEntrySize.call(board, key, value);
    },
    withTimeout(board, promise, timeoutMs, fallbackValue) {
        return withTimeout.call(board, promise, timeoutMs, fallbackValue);
    },
    waitForServiceWorkerCacheReady(board, timeoutMs) {
        return waitForServiceWorkerCacheReady.call(board, timeoutMs);
    },
    scheduleCacheSizeRetryWhenReady(board) {
        return scheduleCacheSizeRetryWhenReady.call(board);
    },
    getCacheStorageSizeSnapshot(board) {
        return getCacheStorageSizeSnapshot.call(board);
    },
    setCacheStorageSizeSnapshot(board, fingerprint, bytes) {
        return setCacheStorageSizeSnapshot.call(board, fingerprint, bytes);
    },
    clearCacheStorageSizeSnapshot(board) {
        return clearCacheStorageSizeSnapshot.call(board);
    },
    buildCacheStorageFingerprint(board) {
        return buildCacheStorageFingerprint.call(board);
    },
    measureExactCacheStorageUsage(board) {
        return measureExactCacheStorageUsage.call(board);
    },
    getExactCacheStorageUsage(board) {
        return getExactCacheStorageUsage.call(board);
    },
    formatBytes(board, bytes) {
        return formatBytes.call(board, bytes);
    },
    getCacheSizeSummary(board) {
        return getCacheSizeSummary.call(board);
    },
    updateCacheSizeDisplay(board) {
        return updateCacheSizeDisplay.call(board);
    },
    clearSelectedCache(board, options) {
        return clearSelectedCache.call(board, options);
    },
    clearAllLocalData(board) {
        return clearAllLocalData.call(board);
    }
};
