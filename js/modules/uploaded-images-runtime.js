// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function loadUploadedImages() {
        const saved = localStorage.getItem('uploadedImages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load uploaded images from localStorage:', e);
                localStorage.removeItem('uploadedImages');
                return [];
            }
        }
        return [];
    
}

function saveUploadedImage(imageData) {
        // Check if we're approaching localStorage limit
        const currentSize = new Blob([localStorage.getItem('uploadedImages') || '[]']).size;
        const imageSize = new Blob([imageData]).size;
        
        // Limit to approximately 4MB total to avoid hitting localStorage limits
        if (currentSize + imageSize > 4 * 1024 * 1024) {
            const msg = window.i18n ? window.i18n.t('background.storageFull') : '存储空间不足，无法保存更多图片。请清除一些旧图片。';
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
            localStorage.setItem('uploadedImages', JSON.stringify(this.uploadedImages));
            this.updateUploadedImagesButtons();
        } catch (e) {
            console.error('Failed to save image to localStorage:', e);
            const msg = window.i18n ? window.i18n.t('background.saveError') : '保存图片失败，存储空间可能不足。';
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
            btn.className = 'pattern-option-btn uploaded-image-btn';
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
