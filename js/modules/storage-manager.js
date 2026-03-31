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

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
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
        });
    }

    async saveSession(data) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
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
                console.error('Failed to save session');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.setSessionSizeEstimate(StorageManager.estimateSessionSize(sessionData));
                resolve();
            };
        });
    }

    async loadSession() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('current_session');

            request.onerror = () => {
                console.error('Failed to load session');
                reject(request.error);
            };

            request.onsuccess = () => {
                const result = request.result;
                if (result && !this.getSessionSizeEstimate()) {
                    this.setSessionSizeEstimate(StorageManager.estimateSessionSize(result));
                }
                resolve(result);
            };
        });
    }

    async hasSession() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count('current_session');

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result > 0);
            };
        });
    }

    async clearSession() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete('current_session');

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.clearSessionSizeEstimate();
                resolve();
            };
        });
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

    // Helper: Convert ImageData to Blob
    static async imageDataToBlob(imageData) {
        if (!imageData) return null;
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);

        return new Promise(resolve => {
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/png'); // PNG is lossless, safer for restoring exact state
        });
    }

    // Helper: Convert Blob to ImageData
    static async blobToImageData(blob) {
        if (!blob) return null;
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

window.AboardStorageManager = StorageManager;
