(function () {
    if (typeof window === 'undefined') {
        return;
    }

    const MB = 1024 * 1024;
    const LIMITS = Object.freeze({
        image: 10 * MB,
        gif: 10 * MB,
        audio: 5 * MB,
        spreadsheet: 5 * MB,
        project: 100 * MB
    });

    function getText(key, fallback, replacements = {}) {
        const translated = window.i18n?.t?.(key);
        const template = translated && translated !== key ? translated : fallback;
        return Object.entries(replacements).reduce(
            (message, [name, value]) => message.split(`{${name}}`).join(value),
            template
        );
    }

    function formatBytes(bytes) {
        const size = Number(bytes || 0);
        if (!Number.isFinite(size) || size <= 0) {
            return '0 MB';
        }
        if (size % MB === 0) {
            return `${size / MB} MB`;
        }
        return `${Math.round((size / MB) * 10) / 10} MB`;
    }

    function getExtension(file) {
        const name = String(file?.name || '').toLowerCase();
        const index = name.lastIndexOf('.');
        return index >= 0 ? name.slice(index + 1) : '';
    }

    function isAllowedFileType(file, { mimeTypes = [], mimePrefixes = [], extensions = [] }) {
        const type = String(file?.type || '').toLowerCase();
        const extension = getExtension(file);
        const mimeAllowed = type && (
            mimeTypes.includes(type) ||
            mimePrefixes.some((prefix) => type.startsWith(prefix))
        );
        const extensionAllowed = extension && extensions.includes(extension);
        return Boolean(mimeAllowed || extensionAllowed);
    }

    function validateFile(file, {
        label,
        maxBytes,
        mimeTypes = [],
        mimePrefixes = [],
        extensions = [],
        tooLargeKey,
        tooLargeMessage,
        unsupportedKey,
        unsupportedMessage
    }) {
        if (!file) {
            throw new Error(getText('errors.fileRequired', 'Please choose a file.'));
        }

        const size = Number(file.size || 0);
        if (Number.isFinite(size) && size > maxBytes) {
            throw new Error(getText(
                tooLargeKey,
                tooLargeMessage || `Selected ${label} is too large. Please choose a file under {max}.`,
                { max: formatBytes(maxBytes) }
            ));
        }

        if (!isAllowedFileType(file, { mimeTypes, mimePrefixes, extensions })) {
            throw new Error(getText(
                unsupportedKey,
                unsupportedMessage || `Unsupported ${label} type.`
            ));
        }

        return true;
    }

    function showValidationError(error, { toast, dialog, fallback } = {}) {
        const message = error?.message || fallback || getText('errors.invalidFile', 'The selected file is invalid.');
        try {
            if (toast?.show) {
                toast.show(message, 'error');
                return;
            }
        } catch (toastError) {
            console.warn('Failed to display file validation toast:', toastError);
        }
        dialog?.showAlert?.(message, 'error');
    }

    window.AboardFileValidation = Object.freeze({
        LIMITS,
        formatBytes,
        validateFile,
        validateImageFile(file) {
            return validateFile(file, {
                label: 'image',
                maxBytes: LIMITS.image,
                mimePrefixes: ['image/'],
                extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'svg'],
                tooLargeKey: 'errors.imageTooLarge',
                unsupportedKey: 'errors.unsupportedImageType'
            });
        },
        validateGifFile(file) {
            return validateFile(file, {
                label: 'GIF',
                maxBytes: LIMITS.gif,
                mimeTypes: ['image/gif'],
                extensions: ['gif'],
                tooLargeKey: 'errors.gifTooLarge',
                unsupportedKey: 'errors.unsupportedGifType'
            });
        },
        validateAudioFile(file) {
            return validateFile(file, {
                label: 'audio file',
                maxBytes: LIMITS.audio,
                mimePrefixes: ['audio/'],
                extensions: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'webm'],
                tooLargeKey: 'errors.audioTooLarge',
                unsupportedKey: 'errors.unsupportedAudioType'
            });
        },
        validateSpreadsheetFile(file) {
            return validateFile(file, {
                label: 'spreadsheet',
                maxBytes: LIMITS.spreadsheet,
                mimeTypes: [
                    'text/csv',
                    'application/csv',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ],
                extensions: ['csv', 'xls', 'xlsx'],
                tooLargeKey: 'errors.spreadsheetTooLarge',
                unsupportedKey: 'errors.unsupportedSpreadsheetType'
            });
        },
        validateProjectFile(file) {
            return validateFile(file, {
                label: 'project file',
                maxBytes: LIMITS.project,
                mimeTypes: ['application/json', 'application/zip', 'application/x-zip-compressed'],
                extensions: ['zip', 'aboard', 'json'],
                tooLargeKey: 'projectPackage.fileTooLarge',
                tooLargeMessage: 'Project file is too large. Please import a file under 100 MB.',
                unsupportedKey: 'projectPackage.unsupportedImportType'
            });
        },
        showValidationError
    });
})();
