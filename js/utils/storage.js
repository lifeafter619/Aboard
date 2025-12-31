/**
 * Storage Utility Module
 * Provides a wrapper around localStorage with error handling for private browsing mode
 * and other edge cases where localStorage may not be available.
 */

const StorageUtils = {
    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available
     */
    isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get an item from localStorage with error handling
     * @param {string} key - The key to retrieve
     * @param {*} defaultValue - Default value if key doesn't exist or error occurs
     * @returns {string|null} The stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            console.warn(`StorageUtils: Failed to get '${key}' from localStorage:`, e.message);
            return defaultValue;
        }
    },

    /**
     * Set an item in localStorage with error handling
     * @param {string} key - The key to set
     * @param {*} value - The value to store
     * @returns {boolean} True if successful, false otherwise
     */
    set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`StorageUtils: Failed to set '${key}' in localStorage:`, e.message);
            // Handle quota exceeded error - check multiple error types for cross-browser compatibility
            if (e.name === 'QuotaExceededError' || 
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
                (e.code && e.code === 22) || // Legacy quota exceeded code
                (e.code && e.code === 1014)) { // Firefox quota exceeded code
                console.warn('StorageUtils: Storage quota exceeded. Consider clearing some data.');
            }
            return false;
        }
    },

    /**
     * Remove an item from localStorage with error handling
     * @param {string} key - The key to remove
     * @returns {boolean} True if successful, false otherwise
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`StorageUtils: Failed to remove '${key}' from localStorage:`, e.message);
            return false;
        }
    },

    /**
     * Get a JSON object from localStorage
     * @param {string} key - The key to retrieve
     * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
     * @returns {*} The parsed object or default
     */
    getJSON(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch (e) {
            console.warn(`StorageUtils: Failed to parse JSON for '${key}':`, e.message);
            return defaultValue;
        }
    },

    /**
     * Set a JSON object in localStorage
     * @param {string} key - The key to set
     * @param {*} value - The object to store (will be JSON.stringify'd)
     * @returns {boolean} True if successful, false otherwise
     */
    setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`StorageUtils: Failed to set JSON for '${key}':`, e.message);
            return false;
        }
    },

    /**
     * Get a number from localStorage
     * @param {string} key - The key to retrieve
     * @param {number} defaultValue - Default value if key doesn't exist or parsing fails
     * @returns {number} The parsed number or default
     */
    getNumber(key, defaultValue = 0) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        } catch (e) {
            console.warn(`StorageUtils: Failed to get number for '${key}':`, e.message);
            return defaultValue;
        }
    },

    /**
     * Get an integer from localStorage
     * @param {string} key - The key to retrieve
     * @param {number} defaultValue - Default value if key doesn't exist or parsing fails
     * @returns {number} The parsed integer or default
     */
    getInt(key, defaultValue = 0) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
        } catch (e) {
            console.warn(`StorageUtils: Failed to get integer for '${key}':`, e.message);
            return defaultValue;
        }
    },

    /**
     * Get a boolean from localStorage
     * @param {string} key - The key to retrieve
     * @param {boolean} defaultValue - Default value if key doesn't exist
     * @returns {boolean} The parsed boolean or default
     */
    getBool(key, defaultValue = false) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return value === 'true';
        } catch (e) {
            console.warn(`StorageUtils: Failed to get boolean for '${key}':`, e.message);
            return defaultValue;
        }
    },

    /**
     * Clear all stored data (use with caution)
     * @returns {boolean} True if successful, false otherwise
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('StorageUtils: Failed to clear localStorage:', e.message);
            return false;
        }
    }
};

// Make available globally
window.StorageUtils = StorageUtils;
