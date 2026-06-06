// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function safeUploadedImagesStorageGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`Failed to read uploaded images localStorage key "${key}":`, error);
            return null;
        }
}

function safeUploadedImagesStorageSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn(`Failed to write uploaded images localStorage key "${key}":`, error);
            return false;
        }
}

function safeUploadedImagesStorageRemoveItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove uploaded images localStorage key "${key}":`, error);
            return false;
        }
}

function loadUploadedImages() {
        const saved = safeUploadedImagesStorageGetItem('uploadedImages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load uploaded images from localStorage:', e);
                safeUploadedImagesStorageRemoveItem('uploadedImages');
                return [];
            }
        }
        return [];
    
}

function saveUploadedImage(imageData) {
        // Check if we're approaching localStorage limit
        const currentSize = new Blob([safeUploadedImagesStorageGetItem('uploadedImages') || '[]']).size;
        const imageSize = new Blob([imageData]).size;
        
        // Limit to approximately 4MB total to avoid hitting localStorage limits
        if (currentSize + imageSize > 4 * 1024 * 1024) {
            const msg = window.i18n?.t('background.storageFull') || 'Storage is full. Please remove some old images before saving more.';
            if (this.settingsManager.toastManager) {
                this.settingsManager.toastManager.show(msg, 'warning');
            } else {
                window.appDialog?.showAlert(msg, 'warning');
            }
            return;
        }
        
        const imageId = `img_${Date.now()}`;
        const imgPrefix = window.i18n ? window.i18n.t('background.imagePrefix') : 'Image ';
        this.uploadedImages.push({
            id: imageId,
            data: imageData,
            name: `${imgPrefix}${this.uploadedImages.length + 1}`
        });
        
        try {
            const persisted = safeUploadedImagesStorageSetItem('uploadedImages', JSON.stringify(this.uploadedImages));
            if (!persisted) {
                throw new Error('uploaded-images-persistence-failed');
            }
            this.updateUploadedImagesButtons();
        } catch (e) {
            console.error('Failed to save image to localStorage:', e);
            const msg = window.i18n?.t('background.saveError') || 'Failed to save image. Storage may be full.';
            if (this.settingsManager.toastManager) {
                this.settingsManager.toastManager.show(msg, 'error');
            } else {
                window.appDialog?.showAlert(msg, 'error');
            }
            this.uploadedImages.pop(); // Remove the image we just added
        }
    
}

function updateUploadedImagesButtons() {
        const patternGrid = document.getElementById('pattern-grid');
        
        // Remove existing uploaded image buttons
        patternGrid.querySelectorAll('.uploaded-image-btn').forEach(btn => btn.remove());
        
        // Add buttons for each uploaded image
        this.uploadedImages.forEach((image, index) => {
            const btn = document.createElement('button');
            btn.className = 'pattern-option-btn pattern-choice-btn uploaded-image-btn';
            btn.dataset.imageId = image.id;
            btn.textContent = image.name;
            btn.addEventListener('click', async () => {
                this.imageControls.resetConfirmation();
                await this.backgroundManager.setBackgroundImage(image.data);
                this.updateBackgroundUI();
                const imgData = this.backgroundManager.getImageData();
                if (imgData) {
                    this.imageControls.showControls(imgData);
                }
            });
            
            // Insert before the upload button
            const uploadBtn = patternGrid.querySelector('#image-pattern-btn');
            patternGrid.insertBefore(btn, uploadBtn);
        });
    
}

window.AboardUploadedImagesRuntime = {
    loadUploadedImages(board) {
        return loadUploadedImages.call(board);
    },
    saveUploadedImage(board, imageData) {
        return saveUploadedImage.call(board, imageData);
    },
    updateUploadedImagesButtons(board) {
        return updateUploadedImagesButtons.call(board);
    }
};
