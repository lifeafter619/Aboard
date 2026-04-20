// Storage Manager Module
// Handles persistent storage using IndexedDB for large canvas data and settings

class StorageManager {
    constructor() {
        this.dbName = 'AboardDB';
        this.storeName = 'sessions';
        this.dbVersion = 1;
        this.sizeEstimateKey = 'aboardSessionSizeEstimate';
        this.db = null;
        this.initPromise = this.initDB();
    }

    async initDB() {
        if (this.db) return this.db;

        if (typeof indexedDB === 'undefined' || typeof indexedDB?.open !== 'function') {
            console.warn('IndexedDB is unavailable; session persistence will run in degraded mode.');
            return null;
        }

        return new Promise((resolve) => {
            let request;
            try {
                request = indexedDB.open(this.dbName, this.dbVersion);
            } catch (error) {
                console.warn('IndexedDB initialization failed; session persistence disabled:', error);
                resolve(null);
                return;
            }

            request.onerror = (event) => {
                console.warn('IndexedDB error; session persistence disabled:', event.target.error);
                resolve(null);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onblocked = () => {
                console.warn('IndexedDB initialization blocked; session persistence disabled.');
                resolve(null);
            };
        });
    }

    async saveSession(data) {
        const db = await this.initPromise;
        if (!db || !this.db) {
            return false;
        }

        try {
            return await new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // We use a fixed ID 'current_session' because we only persist one session for restoration
                const sessionData = {
                    id: 'current_session',
                    timestamp: Date.now(),
                    ...data
                };

                const request = store.put(sessionData);

                request.onerror = () => {
                    console.warn('Failed to save session:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    this.setSessionSizeEstimate(StorageManager.estimateSessionSize(sessionData));
                    resolve(true);
                };
            });
        } catch (error) {
            console.warn('Session save skipped because IndexedDB is unavailable:', error);
            return false;
        }
    }

    async loadSession() {
        const db = await this.initPromise;
        if (!db || !this.db) {
            return null;
        }

        try {
            return await new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('current_session');

                request.onerror = () => {
                    console.warn('Failed to load session:', request.error);
                    resolve(null);
                };

                request.onsuccess = () => {
                    const result = request.result;
                    if (result && !this.getSessionSizeEstimate()) {
                        this.setSessionSizeEstimate(StorageManager.estimateSessionSize(result));
                    }
                    resolve(result || null);
                };
            });
        } catch (error) {
            console.warn('Session load skipped because IndexedDB is unavailable:', error);
            return null;
        }
    }

    async hasSession() {
        const db = await this.initPromise;
        if (!db || !this.db) {
            return false;
        }

        try {
            return await new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.count('current_session');

                request.onerror = () => {
                    console.warn('Failed to check session presence:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    resolve(request.result > 0);
                };
            });
        } catch (error) {
            console.warn('Session presence check skipped because IndexedDB is unavailable:', error);
            return false;
        }
    }

    async clearSession() {
        const db = await this.initPromise;
        if (!db || !this.db) {
            this.clearSessionSizeEstimate();
            return false;
        }

        try {
            return await new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete('current_session');

                request.onerror = () => {
                    console.warn('Failed to clear session:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    this.clearSessionSizeEstimate();
                    resolve(true);
                };
            });
        } catch (error) {
            console.warn('Session clear skipped because IndexedDB is unavailable:', error);
            this.clearSessionSizeEstimate();
            return false;
        }
    }

    closeDB() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    getSessionSizeEstimate() {
        try {
            const raw = localStorage.getItem(this.sizeEstimateKey);
            const bytes = Number(raw);
            return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
        } catch (e) {
            console.warn('Failed to read session size estimate:', e);
            return 0;
        }
    }

    setSessionSizeEstimate(bytes) {
        try {
            const normalizedBytes = Math.max(0, Math.round(Number(bytes) || 0));
            if (normalizedBytes > 0) {
                localStorage.setItem(this.sizeEstimateKey, String(normalizedBytes));
            } else {
                localStorage.removeItem(this.sizeEstimateKey);
            }
        } catch (e) {
            console.warn('Failed to persist session size estimate:', e);
        }
    }

    clearSessionSizeEstimate() {
        try {
            localStorage.removeItem(this.sizeEstimateKey);
        } catch (e) {
            console.warn('Failed to clear session size estimate:', e);
        }
    }

    static estimateSessionSize(sessionData) {
        if (!sessionData) return 0;

        let total = 0;
        if (Array.isArray(sessionData.pages)) {
            total += sessionData.pages.reduce((sum, page) => {
                if (page instanceof Blob) {
                    return sum + page.size;
                }
                return sum;
            }, 0);
        }

        const metadata = {
            id: sessionData.id || '',
            timestamp: sessionData.timestamp || 0,
            settings: sessionData.settings || null,
            canvasWidth: sessionData.canvasWidth || 0,
            canvasHeight: sessionData.canvasHeight || 0
        };
        total += new Blob([JSON.stringify(metadata)]).size;

        return total;
    }

    static decodeBase64(base64Value) {
        if (typeof atob === 'function') {
            return atob(base64Value);
        }

        throw new Error('Base64 decoding is unavailable.');
    }

    static dataUrlToBlob(dataUrl) {
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
            throw new Error('Invalid data URL.');
        }

        const separatorIndex = dataUrl.indexOf(',');
        if (separatorIndex < 0) {
            throw new Error('Malformed data URL.');
        }

        const metadata = dataUrl.slice(0, separatorIndex);
        const payload = dataUrl.slice(separatorIndex + 1);
        const mimeTypeMatch = metadata.match(/^data:([^;,]+)/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'application/octet-stream';

        if (metadata.includes(';base64')) {
            const binary = StorageManager.decodeBase64(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new Blob([bytes], { type: mimeType });
        }

        return new Blob([decodeURIComponent(payload)], { type: mimeType });
    }

    static async loadImageElement(sourceUrl) {
        if (typeof Image !== 'function') {
            throw new Error('Image constructor is unavailable.');
        }

        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (error) => reject(error || new Error('Image failed to load.'));
            image.src = sourceUrl;
        });
    }

    static async loadBlobAsImage(blob) {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            const objectUrl = URL.createObjectURL(blob);
            try {
                return await StorageManager.loadImageElement(objectUrl);
            } finally {
                if (typeof URL.revokeObjectURL === 'function') {
                    URL.revokeObjectURL(objectUrl);
                }
            }
        }

        if (typeof FileReader !== 'function') {
            throw new Error('No supported blob decoding fallback is available.');
        }

        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Failed to read blob as a data URL.'));
            reader.readAsDataURL(blob);
        });

        return StorageManager.loadImageElement(dataUrl);
    }

    // Helper: Convert ImageData to Blob
    static async imageDataToBlob(imageData) {
        if (!imageData) return null;
        if (typeof document?.createElement !== 'function') {
            console.warn('Canvas export is unavailable; failed to create a temporary canvas.');
            return null;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            if (!ctx || typeof ctx.putImageData !== 'function') {
                console.warn('Canvas export is unavailable; failed to acquire a 2D context.');
                return null;
            }

            ctx.putImageData(imageData, 0, 0);

            if (typeof canvas.toBlob === 'function') {
                return await new Promise(resolve => {
                    canvas.toBlob(blob => {
                        resolve(blob || null);
                    }, 'image/png'); // PNG is lossless, safer for restoring exact state
                });
            }

            if (typeof canvas.toDataURL === 'function') {
                return StorageManager.dataUrlToBlob(canvas.toDataURL('image/png'));
            }

            console.warn('Canvas export is unavailable; no supported blob fallback exists.');
            return null;
        } catch (error) {
            console.warn('Failed to convert image data into a blob:', error);
            return null;
        }
    }
    
    // Helper: Convert Blob to ImageData
    static async blobToImageData(blob) {
        if (!blob) return null;
        if (typeof document?.createElement !== 'function') {
            console.warn('Canvas restore is unavailable; failed to create a temporary canvas.');
            return null;
        }

        let source = null;
        try {
            if (typeof createImageBitmap === 'function') {
                try {
                    source = await createImageBitmap(blob);
                } catch (error) {
                    console.warn('createImageBitmap failed during session restore, falling back to Image decoding:', error);
                }
            }

            if (!source) {
                source = await StorageManager.loadBlobAsImage(blob);
            }

            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d');
            if (!ctx || typeof ctx.drawImage !== 'function' || typeof ctx.getImageData !== 'function') {
                console.warn('Canvas restore is unavailable; failed to acquire a 2D context.');
                return null;
            }

            ctx.drawImage(source, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (error) {
            console.warn('Failed to restore image data from blob:', error);
            return null;
        } finally {
            if (source && typeof source.close === 'function') {
                source.close();
            }
        }
    }
}

window.AboardStorageManager = StorageManager;
