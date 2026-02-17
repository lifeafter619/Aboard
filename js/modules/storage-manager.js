// Storage Manager Module
// Handles persistent storage using IndexedDB for large canvas data and settings

class StorageManager {
    constructor() {
        this.dbName = 'AboardDB';
        this.storeName = 'sessions';
        this.dbVersion = 1;
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
                resolve(request.result);
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
