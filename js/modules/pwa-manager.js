// Timeout for resolving manual update checks (milliseconds).
const UPDATE_CHECK_TIMEOUT = 1200;
const UPDATE_APPLY_TIMEOUT = 5000;
const UPDATE_IDLE_APPLY_DELAY = 15000;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const APP_VERSION_URLS = ['version.txt', './version.txt', '/api/version'];
const UPDATE_PREFERENCE_KEY = 'updatePreference';
const PWA_PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';
const UPDATE_PREFERENCES = Object.freeze({
    PROMPT: 'prompt',
    AUTO: 'auto'
});
const PLANNED_UPDATE_MODES = Object.freeze({
    IDLE: 'idle',
    IMMEDIATE: 'immediate'
});
const UPDATE_ACTIONS = Object.freeze({
    CONTINUE: 'continue',
    PROMPT: 'prompt'
});
const UPDATE_USER_CHOICES = Object.freeze({
    IDLE: 'idle',
    IMMEDIATE: 'immediate'
});

function splitVersionParts(version) {
    const normalized = String(version || '').trim();
    if (!SEMVER_PATTERN.test(normalized)) {
        return null;
    }

    const [withoutBuildMetadata] = normalized.split('+', 1);
    const separatorIndex = withoutBuildMetadata.indexOf('-');
    const base = separatorIndex === -1
        ? withoutBuildMetadata
        : withoutBuildMetadata.slice(0, separatorIndex);
    const preRelease = separatorIndex === -1
        ? ''
        : withoutBuildMetadata.slice(separatorIndex + 1);

    return {
        numbers: base.split('.').slice(0, 3).map((segment) => parseInt(segment, 10) || 0),
        preReleaseSegments: preRelease ? preRelease.split('.') : []
    };
}

function comparePreReleaseSegments(segmentsA = [], segmentsB = []) {
    if (segmentsA.length === 0 && segmentsB.length === 0) return 0;
    if (segmentsA.length === 0) return 1;
    if (segmentsB.length === 0) return -1;

    const numericPattern = /^\d+$/;
    const maxLength = Math.max(segmentsA.length, segmentsB.length);
    for (let index = 0; index < maxLength; index++) {
        const segmentA = segmentsA[index];
        const segmentB = segmentsB[index];
        if (segmentA == null) return -1;
        if (segmentB == null) return 1;

        const isNumericA = numericPattern.test(segmentA);
        const isNumericB = numericPattern.test(segmentB);
        if (isNumericA && isNumericB) {
            const numberA = Number(segmentA);
            const numberB = Number(segmentB);
            if (numberA > numberB) return 1;
            if (numberA < numberB) return -1;
            continue;
        }

        if (isNumericA !== isNumericB) {
            return isNumericA ? -1 : 1;
        }

        if (segmentA > segmentB) return 1;
        if (segmentA < segmentB) return -1;
    }

    return 0;
}

function getServiceWorkerApi() {
    if (!('serviceWorker' in navigator)) {
        return null;
    }

    const serviceWorkerApi = navigator.serviceWorker;
    return serviceWorkerApi && typeof serviceWorkerApi === 'object'
        ? serviceWorkerApi
        : null;
}

function hasServiceWorkerMethod(serviceWorkerApi, methodName) {
    return Boolean(serviceWorkerApi && typeof serviceWorkerApi[methodName] === 'function');
}

function normalizeTranslationLocale(locale, translations, fallbackLocale = 'en-US') {
    const trimmedLocale = String(locale || '').trim();
    if (!trimmedLocale) {
        return fallbackLocale;
    }

    if (translations[trimmedLocale]) {
        return trimmedLocale;
    }

    const normalizedLocale = trimmedLocale.toLowerCase();
    const exactMatch = Object.keys(translations).find(
        (availableLocale) => availableLocale.toLowerCase() === normalizedLocale
    );
    if (exactMatch) {
        return exactMatch;
    }

    const langFamily = normalizedLocale.split('-')[0] || '';
    switch (langFamily) {
        case 'zh':
            return normalizedLocale.includes('tw')
                || normalizedLocale.includes('hk')
                || normalizedLocale.includes('mo')
                || normalizedLocale.includes('hant')
                ? 'zh-TW'
                : 'zh-CN';
        case 'en':
            return 'en-US';
        case 'ja':
            return 'ja-JP';
        case 'ko':
            return 'ko-KR';
        case 'fr':
            return 'fr-FR';
        case 'de':
            return 'de-DE';
        case 'es':
            return 'es-ES';
        default:
            return fallbackLocale;
    }
}

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.installBtn = null;
        this.shouldReloadOnControllerChange = false;
        this.serviceWorkerRegistration = null;
        this.serviceWorkerRegistrationPromise = null;
        this.pendingUpdateWorker = null;
        this.updatePreference = this.normalizeUpdatePreference(localStorage.getItem(UPDATE_PREFERENCE_KEY));
        this.startupUpdateDeferredForSession = false;
        this.autoActivateUpdates = false;
        this.autoActivateResetTimer = null;
        this.pendingIdleUpdateIntent = null;
        this.idleUpdateCheckTimer = null;
        this.idleUpdateInFlight = false;
        this.controllerChangeListenerRegistered = false;
        this.observedRegistrations = new WeakSet();
        this.observedWorkers = new WeakSet();

        // Announcement modal elements
        this.announcementStatusContainer = null;
        this.announcementStatusIndicator = null;
        this.announcementStatusText = null;
        this.announcementInstallBtn = null;

        // Update elements
        this.updateModal = null;
        this.updateModalTitle = null;
        this.updateModalMessage = null;
        this.updateModalUpdateBtn = null;
        this.updateModalLaterBtn = null;
        this.updateModalResolver = null;
        this.updateModalPromise = null;
        this.updateModalContext = null;
        this.updateModalPreviouslyFocusedElement = null;
        this.version = null;
        this.latestAvailableVersion = null;
        this.announcementVersionRow = null;
        this.checkUpdateBtn = null;

        // Local Translations
        this.translations = {
            'zh-CN': {
                'statusTitle': '应用状态',
                'currentMode': '当前模式',
                'online': '在线',
                'offline': '离线',
                'install': '安装应用',
                'version': '版本',
                'offlineMessage': '当前处于离线模式，更改已保存到本地',
                'updateAvailable': '有新版本可用',
                'updateTitle': '发现新版本',
                'updateMessage': '新版本已准备完成。你可以立即刷新更新，或在空闲时自动刷新并恢复当前白板内容。',
                'update': '立即刷新更新',
                'updateLater': '空闲时刷新更新',
                'checkUpdate': '检查更新',
                'checking': '正在检查更新...',
                'latest': '已是最新版本',
                'versionUpdateFound': '检测到新版本：{latest}（当前：{current}）'
            },
            'zh-TW': {
                'statusTitle': '應用狀態',
                'currentMode': '當前模式',
                'online': '在線',
                'offline': '離線',
                'install': '安裝應用',
                'version': '版本',
                'offlineMessage': '當前處於離線模式，更改已保存到本地',
                'updateAvailable': '有新版本可用',
                'updateTitle': '發現新版本',
                'updateMessage': '新版本已準備完成。你可以立即重新整理更新，或在空閒時自動重新整理並恢復目前白板內容。',
                'update': '立即重新整理更新',
                'updateLater': '空閒時重新整理更新',
                'checkUpdate': '檢查更新',
                'checking': '正在檢查更新...',
                'latest': '已是最新版本',
                'versionUpdateFound': '檢測到新版本：{latest}（當前：{current}）'
            },
            'en-US': {
                'statusTitle': 'App Status',
                'currentMode': 'Current Mode',
                'online': 'Online',
                'offline': 'Offline',
                'install': 'Install App',
                'version': 'Version',
                'offlineMessage': 'Offline mode. Changes are saved locally.',
                'updateAvailable': 'New version available',
                'updateTitle': 'Update Available',
                'updateMessage': 'A new version is ready. Refresh now, or let the app refresh automatically when it is idle and restore the current whiteboard session.',
                'update': 'Refresh Now',
                'updateLater': 'Refresh When Idle',
                'checkUpdate': 'Check for Updates',
                'checking': 'Checking for updates...',
                'latest': 'You are on the latest version',
                'versionUpdateFound': 'New version detected: {latest} (current: {current}).'
            },
            'ja-JP': {
                'statusTitle': 'アプリの状態',
                'currentMode': '現在のモード',
                'online': 'オンライン',
                'offline': 'オフライン',
                'install': 'アプリをインストール',
                'version': 'バージョン',
                'offlineMessage': 'オフラインモードです。変更はローカルに保存されます。',
                'updateAvailable': '新しいバージョンがあります',
                'updateTitle': 'アップデート利用可能',
                'updateMessage': '新しいバージョンの準備ができました。今すぐ再読み込みするか、アプリがアイドル状態になったときに自動で再読み込みして現在のホワイトボードを復元できます。',
                'update': '今すぐ再読み込み',
                'updateLater': '空き時間に再読み込み',
                'checkUpdate': 'アップデートを確認',
                'checking': 'アップデートを確認中...',
                'latest': '最新バージョンです',
                'versionUpdateFound': '新しいバージョンがあります：{latest}（現在：{current}）'
            },
            'ko-KR': {
                'statusTitle': '앱 상태',
                'currentMode': '현재 모드',
                'online': '온라인',
                'offline': '오프라인',
                'install': '앱 설치',
                'version': '버전',
                'offlineMessage': '오프라인 모드입니다. 변경 사항은 로컬에 저장됩니다.',
                'updateAvailable': '새 버전을 사용할 수 있습니다',
                'updateTitle': '업데이트 가능',
                'updateMessage': '새 버전이 준비되었습니다. 지금 새로고침하거나, 앱이 한가할 때 자동으로 새로고침하면서 현재 화이트보드 내용을 복원할 수 있습니다.',
                'update': '지금 새로고침',
                'updateLater': '한가할 때 새로고침',
                'checkUpdate': '업데이트 확인',
                'checking': '업데이트 확인 중...',
                'latest': '최신 버전입니다',
                'versionUpdateFound': '새 버전 감지: {latest} (현재: {current})'
            },
            'fr-FR': {
                'statusTitle': 'État de l\'application',
                'currentMode': 'Mode actuel',
                'online': 'En ligne',
                'offline': 'Hors ligne',
                'install': 'Installer l\'application',
                'version': 'Version',
                'offlineMessage': 'Mode hors ligne. Les modifications sont enregistrées localement.',
                'updateAvailable': 'Nouvelle version disponible',
                'updateTitle': 'Mise à jour disponible',
                'updateMessage': 'Nouvelle version disponible. Actualisez maintenant, ou laissez l\'application s\'actualiser automatiquement lorsqu\'elle est inactive en restaurant le tableau en cours.',
                'update': 'Actualiser maintenant',
                'updateLater': 'Actualiser au repos',
                'checkUpdate': 'Vérifier les mises à jour',
                'checking': 'Vérification des mises à jour...',
                'latest': 'Vous utilisez la dernière version',
                'versionUpdateFound': 'Nouvelle version détectée : {latest} (actuelle : {current}).'
            },
            'de-DE': {
                'statusTitle': 'App-Status',
                'currentMode': 'Aktueller Modus',
                'online': 'Online',
                'offline': 'Offline',
                'install': 'App installieren',
                'version': 'Version',
                'offlineMessage': 'Offline-Modus. Änderungen werden lokal gespeichert.',
                'updateAvailable': 'Neue Version verfügbar',
                'updateTitle': 'Update verfügbar',
                'updateMessage': 'Eine neue Version ist bereit. Jetzt neu laden oder automatisch im Leerlauf neu laden und das aktuelle Whiteboard wiederherstellen.',
                'update': 'Jetzt neu laden',
                'updateLater': 'Im Leerlauf neu laden',
                'checkUpdate': 'Nach Updates suchen',
                'checking': 'Suche nach Updates...',
                'latest': 'Sie haben die neueste Version',
                'versionUpdateFound': 'Neue Version erkannt: {latest} (aktuell: {current}).'
            },
            'es-ES': {
                'statusTitle': 'Estado de la aplicación',
                'currentMode': 'Modo actual',
                'online': 'En línea',
                'offline': 'Sin conexión',
                'install': 'Instalar aplicación',
                'version': 'Versión',
                'offlineMessage': 'Modo sin conexión. Los cambios se guardan localmente.',
                'updateAvailable': 'Nueva versión disponible',
                'updateTitle': 'Actualización disponible',
                'updateMessage': 'Hay una nueva versión lista. Recarga ahora o deja que la aplicación se recargue automáticamente cuando esté inactiva y restaure la pizarra actual.',
                'update': 'Recargar ahora',
                'updateLater': 'Recargar en inactividad',
                'checkUpdate': 'Buscar actualizaciones',
                'checking': 'Buscando actualizaciones...',
                'latest': 'Tienes la última versión',
                'versionUpdateFound': 'Nueva versión detectada: {latest} (actual: {current}).'
            }
        };
        // Fallback for other languages to English
        this.defaultLocale = 'en-US';

        this.init();
    }

    init() {
        this.registerServiceWorker();

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupUI();
                this.checkOfflineStatus();
            });
        } else {
            this.setupUI();
            this.checkOfflineStatus();
        }

        this.setupEventListeners();
    }

    getTranslation(key) {
        const locale = window.i18n ? window.i18n.getCurrentLocale() : navigator.language;
        const resolvedLocale = normalizeTranslationLocale(locale, this.translations, this.defaultLocale);
        const dict = this.translations[resolvedLocale] || this.translations[this.defaultLocale];

        return (dict && dict[key]) || key;
    }

    getVersionText(withPrefix = false) {
        if (!this.version) {
            return '--';
        }
        return withPrefix ? `v${this.version}` : this.version;
    }

    updateVersionDisplays() {
        const aboutVersion = document.getElementById('app-version');
        if (aboutVersion) {
            aboutVersion.textContent = this.getVersionText(false);
        }

        if (this.announcementVersionRow) {
            this.announcementVersionRow.textContent = `${this.getTranslation('version')}: ${this.getVersionText(true)}`;
        }
    }

    getEmbeddedBuildVersion() {
        return this.normalizeVersion(window.__ABOARD_BUILD_VERSION__);
    }

    normalizeVersion(value) {
        const version = typeof value === 'string' ? value.trim() : '';
        if (!version) {
            return null;
        }
        if (!SEMVER_PATTERN.test(version)) {
            console.warn('Invalid version format:', version);
            return null;
        }
        return version;
    }

    async fetchVersionFromSource(url) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                return null;
            }

            if (url.endsWith('/api/version')) {
                const data = await response.json();
                return this.normalizeVersion(data?.version);
            }

            return this.normalizeVersion(await response.text());
        } catch (error) {
            console.warn(`Failed to fetch version from ${url}:`, error);
            return null;
        }
    }

    async getLatestAvailableVersion() {
        for (const url of APP_VERSION_URLS) {
            const version = await this.fetchVersionFromSource(url);
            if (version) {
                this.latestAvailableVersion = version;
                return version;
            }
        }

        const embeddedBuildVersion = this.getEmbeddedBuildVersion();
        this.latestAvailableVersion = embeddedBuildVersion;
        return embeddedBuildVersion;
    }

    async loadVersion() {
        const embeddedBuildVersion = this.getEmbeddedBuildVersion();
        if (embeddedBuildVersion) {
            this.version = embeddedBuildVersion;
            this.updateVersionDisplays();
            return embeddedBuildVersion;
        }

        const latestVersion = await this.getLatestAvailableVersion();
        if (latestVersion) {
            this.version = latestVersion;
            this.updateVersionDisplays();
            return latestVersion;
        }

        return null;
    }

    compareVersions(versionA, versionB) {
        const a = splitVersionParts(versionA);
        const b = splitVersionParts(versionB);
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        for (let i = 0; i < 3; i++) {
            if (a.numbers[i] > b.numbers[i]) return 1;
            if (a.numbers[i] < b.numbers[i]) return -1;
        }
        return comparePreReleaseSegments(a.preReleaseSegments, b.preReleaseSegments);
    }

    normalizeUpdatePreference(value) {
        return value === UPDATE_PREFERENCES.AUTO
            ? UPDATE_PREFERENCES.AUTO
            : UPDATE_PREFERENCES.PROMPT;
    }

    getUpdatePreference() {
        this.updatePreference = this.normalizeUpdatePreference(localStorage.getItem(UPDATE_PREFERENCE_KEY));
        return this.updatePreference;
    }

    setUpdatePreference(value) {
        this.updatePreference = this.normalizeUpdatePreference(value);
        localStorage.setItem(UPDATE_PREFERENCE_KEY, this.updatePreference);
        return this.updatePreference;
    }

    deferUpdatePromptForCurrentSession() {
        this.startupUpdateDeferredForSession = true;
    }

    getPreferredUpdateChoice() {
        return this.getUpdatePreference() === UPDATE_PREFERENCES.AUTO
            ? UPDATE_USER_CHOICES.IMMEDIATE
            : UPDATE_USER_CHOICES.IDLE;
    }

    normalizePlannedUpdateMode(value) {
        return value === PLANNED_UPDATE_MODES.IMMEDIATE
            ? PLANNED_UPDATE_MODES.IMMEDIATE
            : PLANNED_UPDATE_MODES.IDLE;
    }

    buildPlannedUpdateIntent({ mode, reason = 'update', currentVersion = null, latestVersion = null } = {}) {
        return {
            reason: 'update',
            requestedBy: reason,
            mode: this.normalizePlannedUpdateMode(mode),
            currentVersion: currentVersion || this.version || null,
            latestVersion: latestVersion || this.latestAvailableVersion || null,
            createdAt: Date.now(),
            idleDelayMs: UPDATE_IDLE_APPLY_DELAY
        };
    }

    writePlannedUpdateIntent(intent) {
        localStorage.setItem(PWA_PLANNED_UPDATE_RELOAD_KEY, JSON.stringify(intent));
        return intent;
    }

    clearPlannedUpdateIntent() {
        localStorage.removeItem(PWA_PLANNED_UPDATE_RELOAD_KEY);
    }

    getDrawingBoard() {
        return window.drawingBoard || null;
    }

    async preparePlannedUpdateReload(intent) {
        const board = this.getDrawingBoard();
        if (!board?.persistSessionForUpdateReload) {
            return {
                canReload: false,
                intent,
                persistResult: null
            };
        }

        const persistResult = await board.persistSessionForUpdateReload(intent);
        const canReload = Boolean(persistResult?.hasSyncSnapshot || persistResult?.savedToIndexedDb);
        if (canReload) {
            this.writePlannedUpdateIntent(intent);
        }

        return {
            canReload,
            intent,
            persistResult
        };
    }

    cancelIdleUpdate() {
        if (this.idleUpdateCheckTimer) {
            window.clearInterval(this.idleUpdateCheckTimer);
            this.idleUpdateCheckTimer = null;
        }
        this.pendingIdleUpdateIntent = null;
        this.idleUpdateInFlight = false;
    }

    async applyPreparedUpdateNow(intent, { timeoutMs = UPDATE_APPLY_TIMEOUT } = {}) {
        const board = this.getDrawingBoard();
        board?.setSuppressBeforeUnloadPrompt?.(true);

        const activated = await this.applyUpdateNow({ timeoutMs });
        if (!activated) {
            board?.setSuppressBeforeUnloadPrompt?.(false);
            this.clearPlannedUpdateIntent();
        }

        return activated;
    }

    async maybeApplyIdleUpdate() {
        if (!this.pendingIdleUpdateIntent || this.idleUpdateInFlight) {
            return false;
        }

        const board = this.getDrawingBoard();
        const activity = board?.getUpdateActivitySnapshot?.() || { lastActivityAt: Date.now() };
        const isBusy = Boolean(
            activity.isDrawing
            || activity.isPinching
            || activity.isDraggingPanel
            || activity.isModalBusy
            || activity.isSelectionBusy
            || activity.isTextInputBusy
            || activity.isMediaTransformBusy
            || activity.isTeachingToolBusy
        );
        const lastActivityAt = Number(activity.lastActivityAt || 0);
        if (isBusy || !Number.isFinite(lastActivityAt) || (Date.now() - lastActivityAt) < UPDATE_IDLE_APPLY_DELAY) {
            return false;
        }

        this.idleUpdateInFlight = true;
        const intent = this.buildPlannedUpdateIntent(this.pendingIdleUpdateIntent);
        try {
            const preparedReload = await this.preparePlannedUpdateReload(intent);
            if (!preparedReload.canReload) {
                return false;
            }

            this.cancelIdleUpdate();
            return this.applyPreparedUpdateNow(intent);
        } finally {
            this.idleUpdateInFlight = false;
        }
    }

    scheduleIdleUpdate(intent) {
        this.pendingIdleUpdateIntent = this.buildPlannedUpdateIntent({
            ...intent,
            mode: PLANNED_UPDATE_MODES.IDLE
        });

        if (!this.idleUpdateCheckTimer) {
            this.idleUpdateCheckTimer = window.setInterval(() => {
                void this.maybeApplyIdleUpdate();
            }, 1000);
        }

        void this.maybeApplyIdleUpdate();
        return true;
    }

    async requestUpdateApplication({ mode, reason = 'manual', currentVersion = null, latestVersion = null } = {}) {
        const normalizedMode = this.normalizePlannedUpdateMode(mode);
        const intent = this.buildPlannedUpdateIntent({
            mode: normalizedMode,
            reason,
            currentVersion,
            latestVersion
        });

        if (normalizedMode === PLANNED_UPDATE_MODES.IDLE) {
            this.deferUpdatePromptForCurrentSession();
            return this.scheduleIdleUpdate(intent);
        }

        this.cancelIdleUpdate();
        const preparedReload = await this.preparePlannedUpdateReload(intent);
        if (!preparedReload.canReload) {
            return false;
        }

        return this.applyPreparedUpdateNow(intent);
    }

    resolveWithTimeout(promise, timeoutMs, fallback = null) {
        if (!timeoutMs || timeoutMs <= 0) {
            return promise.catch(() => fallback);
        }

        return Promise.race([
            promise.catch(() => fallback),
            new Promise((resolve) => {
                window.setTimeout(() => resolve(fallback), timeoutMs);
            })
        ]);
    }

    scheduleAutoActivateReset(timeoutMs = UPDATE_APPLY_TIMEOUT * 2) {
        if (this.autoActivateResetTimer) {
            window.clearTimeout(this.autoActivateResetTimer);
        }
        this.autoActivateResetTimer = window.setTimeout(() => {
            this.autoActivateUpdates = false;
            this.autoActivateResetTimer = null;
        }, timeoutMs);
    }

    async getServiceWorkerRegistration() {
        const serviceWorkerApi = getServiceWorkerApi();
        if (!serviceWorkerApi) {
            return null;
        }

        if (this.serviceWorkerRegistration) {
            return this.trackServiceWorkerRegistration(this.serviceWorkerRegistration);
        }

        if (this.serviceWorkerRegistrationPromise) {
            try {
                const promisedRegistration = await this.serviceWorkerRegistrationPromise;
                if (promisedRegistration) {
                    return this.trackServiceWorkerRegistration(promisedRegistration);
                }
            } catch (error) {
                console.warn('Failed to await service worker registration:', error);
            }
        }

        if (!hasServiceWorkerMethod(serviceWorkerApi, 'getRegistration')) {
            return null;
        }

        try {
            const registration = await serviceWorkerApi.getRegistration();
            return this.trackServiceWorkerRegistration(registration);
        } catch (error) {
            console.warn('Failed to get service worker registration:', error);
            return null;
        }
    }

    async registerServiceWorkerNow() {
        const serviceWorkerApi = getServiceWorkerApi();
        if (!hasServiceWorkerMethod(serviceWorkerApi, 'register')) {
            return null;
        }

        try {
            const registration = await serviceWorkerApi.register('./sw.js');
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            return this.trackServiceWorkerRegistration(registration);
        } catch (error) {
            console.log('ServiceWorker registration failed: ', error);
            return null;
        }
    }

    trackServiceWorkerRegistration(registration) {
        if (!registration) {
            return null;
        }

        this.serviceWorkerRegistration = registration;
        if (registration.waiting) {
            this.pendingUpdateWorker = registration.waiting;
        }

        if (!this.observedRegistrations.has(registration)) {
            this.observedRegistrations.add(registration);
            if (typeof registration.addEventListener === 'function') {
                registration.addEventListener('updatefound', () => {
                    this.observeInstallingWorker(registration.installing);
                });
            }
        }

        if (registration.installing) {
            this.observeInstallingWorker(registration.installing);
        }

        return registration;
    }

    observeInstallingWorker(worker) {
        if (!worker || this.observedWorkers.has(worker) || typeof worker.addEventListener !== 'function') {
            return;
        }

        this.observedWorkers.add(worker);
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    this.pendingUpdateWorker = worker;
                    if (this.autoActivateUpdates) {
                        this.activateWaitingWorker(worker);
                    } else if (!this.pendingIdleUpdateIntent && document.visibilityState === 'visible') {
                        void this.checkForUpdates(false);
                    }
                }
                return;
            }

            if (worker.state === 'redundant' && this.pendingUpdateWorker === worker) {
                this.pendingUpdateWorker = null;
            }
        });
    }

    async waitForWaitingWorker(timeoutMs = UPDATE_APPLY_TIMEOUT) {
        const registration = await this.getServiceWorkerRegistration();
        if (!registration) {
            return null;
        }

        if (registration.waiting) {
            this.pendingUpdateWorker = registration.waiting;
            return registration.waiting;
        }

        if (this.pendingUpdateWorker) {
            return this.pendingUpdateWorker;
        }

        return new Promise((resolve) => {
            let settled = false;
            let pollTimer = null;
            let timeoutTimer = null;

            const cleanup = () => {
                settled = true;
                if (pollTimer) {
                    window.clearInterval(pollTimer);
                }
                if (timeoutTimer) {
                    window.clearTimeout(timeoutTimer);
                }
            };

            const finish = (worker) => {
                if (settled) {
                    return;
                }
                cleanup();
                resolve(worker || null);
            };

            const checkForWaitingWorker = () => {
                if (registration.waiting) {
                    this.pendingUpdateWorker = registration.waiting;
                    finish(registration.waiting);
                    return true;
                }

                if (this.pendingUpdateWorker) {
                    finish(this.pendingUpdateWorker);
                    return true;
                }

                return false;
            };

            if (checkForWaitingWorker()) {
                return;
            }

            pollTimer = window.setInterval(() => {
                checkForWaitingWorker();
            }, 100);
            timeoutTimer = window.setTimeout(() => finish(null), timeoutMs);
        });
    }

    bindControllerChangeListener() {
        const serviceWorkerApi = getServiceWorkerApi();
        if (this.controllerChangeListenerRegistered || !hasServiceWorkerMethod(serviceWorkerApi, 'addEventListener')) {
            return;
        }

        this.controllerChangeListenerRegistered = true;
        let refreshing = false;
        serviceWorkerApi.addEventListener('controllerchange', () => {
            if (!refreshing && this.shouldReloadOnControllerChange) {
                refreshing = true;
                if (this.autoActivateResetTimer) {
                    window.clearTimeout(this.autoActivateResetTimer);
                    this.autoActivateResetTimer = null;
                }
                this.autoActivateUpdates = false;
                window.location.reload();
            }
        });
    }

    async collectStartupUpdateState({ timeoutMs = UPDATE_CHECK_TIMEOUT } = {}) {
        const currentVersion = this.getEmbeddedBuildVersion() || this.version || await this.loadVersion();
        const latestVersion = navigator.onLine
            ? await this.resolveWithTimeout(
                this.getLatestAvailableVersion(),
                timeoutMs,
                this.latestAvailableVersion || currentVersion || null
            )
            : (this.latestAvailableVersion || currentVersion || null);
        const registration = await this.resolveWithTimeout(
            this.getServiceWorkerRegistration(),
            timeoutMs,
            null
        );
        const waitingWorker = registration?.waiting || this.pendingUpdateWorker || null;

        return {
            currentVersion,
            latestVersion,
            registration,
            waitingWorker,
            hasWaitingWorker: Boolean(waitingWorker)
        };
    }

    determineUpdateAction({ currentVersion, latestVersion, hasWaitingWorker = false } = {}) {
        if (hasWaitingWorker) {
            return UPDATE_ACTIONS.PROMPT;
        }

        if (!currentVersion || !latestVersion || this.compareVersions(latestVersion, currentVersion) <= 0) {
            return UPDATE_ACTIONS.CONTINUE;
        }

        return UPDATE_ACTIONS.PROMPT;
    }

    activateWaitingWorker(worker) {
        const targetWorker = worker || this.pendingUpdateWorker || this.serviceWorkerRegistration?.waiting || null;
        if (!targetWorker || typeof targetWorker.postMessage !== 'function') {
            return false;
        }

        this.shouldReloadOnControllerChange = true;
        this.pendingUpdateWorker = targetWorker;

        try {
            targetWorker.postMessage({ type: 'SKIP_WAITING' });
            return true;
        } catch (error) {
            console.warn('Failed to activate waiting worker:', error);
            return false;
        }
    }

    async applyUpdateNow({ timeoutMs = UPDATE_APPLY_TIMEOUT } = {}) {
        this.autoActivateUpdates = true;
        this.scheduleAutoActivateReset(timeoutMs * 2);

        const registration = await this.getServiceWorkerRegistration();
        if (!registration) {
            this.shouldReloadOnControllerChange = true;
            window.location.reload();
            return true;
        }

        const existingWaitingWorker = registration.waiting || this.pendingUpdateWorker;
        if (existingWaitingWorker) {
            return this.activateWaitingWorker(existingWaitingWorker);
        }

        const waitingWorkerPromise = this.waitForWaitingWorker(timeoutMs);
        try {
            await registration.update();
        } catch (error) {
            console.warn('Service worker update request failed:', error);
        }

        const waitingWorker = await waitingWorkerPromise;
        if (waitingWorker) {
            return this.activateWaitingWorker(waitingWorker);
        }

        return false;
    }

    ensureUpdateModal() {
        if (this.updateModal) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'pwa-update-modal';
        modal.className = 'modal';
        modal.tabIndex = -1;

        const content = document.createElement('div');
        content.className = 'modal-content confirm-modal-content';

        const header = document.createElement('div');
        header.className = 'modal-header';
        const title = document.createElement('h2');
        header.appendChild(title);

        const body = document.createElement('div');
        body.className = 'modal-body';
        const message = document.createElement('p');
        message.className = 'confirm-message';
        message.style.whiteSpace = 'pre-line';
        body.appendChild(message);

        const footer = document.createElement('div');
        footer.className = 'confirm-buttons';

        const laterBtn = document.createElement('button');
        laterBtn.type = 'button';
        laterBtn.className = 'confirm-btn cancel-btn';
        laterBtn.addEventListener('click', () => {
            this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.IDLE);
        });

        const updateBtn = document.createElement('button');
        updateBtn.type = 'button';
        updateBtn.className = 'confirm-btn ok-btn';
        updateBtn.addEventListener('click', () => {
            this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.IMMEDIATE);
        });

        footer.appendChild(laterBtn);
        footer.appendChild(updateBtn);
        body.appendChild(footer);

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.IDLE);
            }
        });
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.IDLE);
            }
        });

        document.body.appendChild(modal);
        this.updateModal = modal;
        this.updateModalTitle = title;
        this.updateModalMessage = message;
        this.updateModalUpdateBtn = updateBtn;
        this.updateModalLaterBtn = laterBtn;
        this.refreshUpdateModalContent();
    }

    refreshUpdateModalContent() {
        if (!this.updateModal) {
            return;
        }

        if (this.updateModalTitle) {
            this.updateModalTitle.textContent = this.getTranslation('updateTitle');
        }

        let message = this.getTranslation('updateMessage');
        const { currentVersion, latestVersion } = this.updateModalContext || {};
        if (currentVersion && latestVersion && this.compareVersions(latestVersion, currentVersion) > 0) {
            const versionMessage = this.getTranslation('versionUpdateFound')
                .replace('{latest}', latestVersion)
                .replace('{current}', currentVersion);
            message = `${message}\n\n${versionMessage}`;
        }

        if (this.updateModalMessage) {
            this.updateModalMessage.textContent = message;
        }
        if (this.updateModalUpdateBtn) {
            this.syncButtonText(this.updateModalUpdateBtn, this.getTranslation('update'));
        }
        if (this.updateModalLaterBtn) {
            this.syncButtonText(this.updateModalLaterBtn, this.getTranslation('updateLater'));
        }
        const preferredChoice = this.getPreferredUpdateChoice();
        if (this.updateModalUpdateBtn && this.updateModalLaterBtn) {
            this.updateModalUpdateBtn.classList.toggle('ok-btn', preferredChoice === UPDATE_USER_CHOICES.IMMEDIATE);
            this.updateModalUpdateBtn.classList.toggle('cancel-btn', preferredChoice !== UPDATE_USER_CHOICES.IMMEDIATE);
            this.updateModalLaterBtn.classList.toggle('ok-btn', preferredChoice === UPDATE_USER_CHOICES.IDLE);
            this.updateModalLaterBtn.classList.toggle('cancel-btn', preferredChoice !== UPDATE_USER_CHOICES.IDLE);
        }
    }

    promptForUpdate({ reason = 'manual', currentVersion = null, latestVersion = null } = {}) {
        if (reason === 'startup' && this.startupUpdateDeferredForSession) {
            return Promise.resolve(UPDATE_USER_CHOICES.IDLE);
        }

        if (this.updateModalPromise) {
            return this.updateModalPromise;
        }

        this.ensureUpdateModal();
        this.updateModalPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        this.updateModalContext = { reason, currentVersion, latestVersion };
        this.refreshUpdateModalContent();
        this.updateModal.classList.add('show');
        const focusPreferredButton = () => {
            const preferredChoice = this.getPreferredUpdateChoice();
            const preferredButton = preferredChoice === UPDATE_USER_CHOICES.IMMEDIATE
                ? this.updateModalUpdateBtn
                : this.updateModalLaterBtn;
            preferredButton?.focus?.();
        };
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(focusPreferredButton);
        } else {
            focusPreferredButton();
        }

        this.updateModalPromise = new Promise((resolve) => {
            this.updateModalResolver = (choice) => {
                this.updateModalPromise = null;
                resolve(choice);
            };
        });

        return this.updateModalPromise;
    }

    resolveUpdateModalChoice(choice) {
        const resolvedChoice = choice === UPDATE_USER_CHOICES.IMMEDIATE
            ? UPDATE_USER_CHOICES.IMMEDIATE
            : UPDATE_USER_CHOICES.IDLE;

        if (resolvedChoice === UPDATE_USER_CHOICES.IDLE && this.updateModalContext?.reason === 'startup') {
            this.deferUpdatePromptForCurrentSession();
        }

        this.updateModal?.classList.remove('show');
        this.updateModalContext = null;
        const restoreFocusTarget = this.updateModalPreviouslyFocusedElement;
        this.updateModalPreviouslyFocusedElement = null;
        const restoreFocus = () => {
            restoreFocusTarget?.focus?.();
        };
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(restoreFocus);
        } else {
            restoreFocus();
        }

        const resolver = this.updateModalResolver;
        this.updateModalResolver = null;
        resolver?.(resolvedChoice);
    }

    showUpdateModal(options = {}) {
        return this.promptForUpdate(options);
    }

    registerServiceWorker() {
        const serviceWorkerApi = getServiceWorkerApi();
        if (!serviceWorkerApi) {
            return;
        }

        this.bindControllerChangeListener();

        if (!hasServiceWorkerMethod(serviceWorkerApi, 'register')) {
            return;
        }

        if (document.readyState === 'complete') {
            if (!this.serviceWorkerRegistrationPromise) {
                this.serviceWorkerRegistrationPromise = this.registerServiceWorkerNow();
            }
            return;
        }

        if (!this.serviceWorkerRegistrationPromise) {
            this.serviceWorkerRegistrationPromise = new Promise((resolve) => {
                window.addEventListener('load', () => {
                    void this.registerServiceWorkerNow().then(resolve);
                }, { once: true });
            });
        }
    }

    checkOfflineStatus() {
        if (!navigator.onLine) {
            this.showOfflineNotification();
        }
    }

    showOfflineNotification() {
        const msg = this.getTranslation('offlineMessage');
        // Try to find the ToastManager instance
        if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
            window.drawingBoard.settingsManager.toastManager.show(msg, 'warning');
        } else if (window.ToastManager) {
            // Fallback: create a temporary instance if main one isn't ready
            const toast = new window.ToastManager();
            toast.show(msg, 'warning');
        } else {
            console.warn('ToastManager not available for offline notification');
        }
    }

    setupUI() {
        this.injectSettingsUI();
        this.injectAnnouncementUI();
        this.loadVersion();
    }

    injectSettingsUI() {
        const aboutInfo = document.querySelector('#about-settings .about-info');
        if (aboutInfo && !document.getElementById('pwa-status-indicator')) {
            const section = document.createElement('div');
            section.className = 'about-section';

            // App Status Title
            const statusTitle = document.createElement('h4');
            statusTitle.dataset.pwaStatusTitle = 'true';
            statusTitle.textContent = this.getTranslation('statusTitle');

            const statusContainer = document.createElement('div');
            statusContainer.style.display = 'flex';
            statusContainer.style.alignItems = 'center';
            statusContainer.style.gap = '8px';
            statusContainer.style.marginTop = '8px';

            const statusIndicator = document.createElement('span');
            statusIndicator.id = 'pwa-status-indicator';
            this.applyIndicatorStyle(statusIndicator);

            const statusText = document.createElement('span');
            statusText.id = 'pwa-status-text';

            statusContainer.appendChild(statusIndicator);
            statusContainer.appendChild(statusText);

            // Action Buttons Container
            const actionContainer = document.createElement('div');
            actionContainer.style.marginTop = '10px';
            actionContainer.style.display = 'flex';
            actionContainer.style.gap = '10px';
            actionContainer.style.flexWrap = 'wrap';

            // Install Button
            const installBtn = this.createButton('pwa-install-btn', this.getTranslation('install'), () => this.installApp());
            installBtn.style.display = 'none'; // Hidden by default

            // Check Update Button
            const checkUpdateBtn = this.createButton('pwa-check-update-btn', this.getTranslation('checkUpdate'), () => this.checkForUpdates(true));
            checkUpdateBtn.style.backgroundColor = 'transparent';
            checkUpdateBtn.style.color = 'var(--theme-color, #007AFF)';
            checkUpdateBtn.style.border = '1px solid var(--theme-color, #007AFF)';

            actionContainer.appendChild(installBtn);
            actionContainer.appendChild(checkUpdateBtn);

            section.appendChild(statusTitle);
            section.appendChild(statusContainer);
            section.appendChild(actionContainer);

            aboutInfo.appendChild(section);

            this.statusIndicator = statusIndicator;
            this.statusText = statusText;
            this.installBtn = installBtn;
            this.checkUpdateBtn = checkUpdateBtn;

            this.updateOnlineStatus();
        }
    }

    injectAnnouncementUI() {
        const modalBody = document.querySelector('#announcement-modal .modal-body');
        const contentDiv = document.getElementById('announcement-content');
        const buttonRow = document.querySelector('#announcement-modal .announcement-buttons');

        if (modalBody && contentDiv && !document.getElementById('pwa-announcement-status')) {
            const container = document.createElement('div');
            container.id = 'pwa-announcement-status';
            container.style.marginTop = '15px';
            container.style.paddingTop = '10px';
            container.style.borderTop = '1px solid #eee';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';
            container.style.fontSize = '14px'; // Match UI font size
            container.style.color = '#333';

            // Status Row
            const statusRow = document.createElement('div');
            statusRow.style.display = 'flex';
            statusRow.style.alignItems = 'center';
            statusRow.style.gap = '8px';

            const indicator = document.createElement('span');
            this.applyIndicatorStyle(indicator);

            const text = document.createElement('span');

            statusRow.appendChild(indicator);
            statusRow.appendChild(text);

            // Version Row
            const versionRow = document.createElement('div');
            versionRow.textContent = `${this.getTranslation('version')}: ${this.getVersionText(true)}`;
            versionRow.style.color = '#666';
            versionRow.style.fontSize = '12px';

            // Install Button
            const installBtn = this.createButton('pwa-announcement-install-btn', this.getTranslation('install'), () => this.installApp());
            installBtn.classList.add('announcement-btn', 'announcement-install-btn');
            installBtn.style.display = 'none';

            container.appendChild(statusRow);
            container.appendChild(versionRow);

            // Insert after content
            if (contentDiv.nextSibling) {
                modalBody.insertBefore(container, contentDiv.nextSibling);
            } else {
                modalBody.appendChild(container);
            }

            if (buttonRow) {
                buttonRow.insertBefore(installBtn, buttonRow.firstChild);
            } else {
                container.appendChild(installBtn);
            }

            this.announcementStatusIndicator = indicator;
            this.announcementStatusText = text;
            this.announcementInstallBtn = installBtn;
            this.announcementVersionRow = versionRow;

            this.updateOnlineStatus();
        }
    }

    applyIndicatorStyle(element) {
        element.style.width = '10px';
        element.style.height = '10px';
        element.style.borderRadius = '50%';
        element.style.display = 'inline-block';
        element.style.flexShrink = '0';
    }

    syncButtonText(button, text) {
        if (!button) {
            return;
        }
        button.textContent = text;
        button.title = text;
        button.setAttribute('aria-label', text);
    }

    setActionButtonBusy(button, isBusy, text) {
        if (!button) {
            return;
        }
        button.disabled = Boolean(isBusy);
        button.setAttribute('aria-disabled', String(Boolean(isBusy)));
        button.setAttribute('aria-busy', String(Boolean(isBusy)));
        button.style.opacity = isBusy ? '0.7' : '1';
        button.style.cursor = isBusy ? 'wait' : 'pointer';
        this.syncButtonText(button, text);
    }

    createButton(id, text, onClick) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.type = 'button';
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = 'var(--theme-color, #007AFF)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';

        this.syncButtonText(btn, text);
        btn.addEventListener('click', onClick);
        return btn;
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            // Check for updates when coming online
            this.checkForUpdates(false);
            // Show toast when coming back online
            if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
                window.drawingBoard.settingsManager.toastManager.show(this.getTranslation('online'), 'success');
            }
        });

        window.addEventListener('offline', () => {
            this.updateOnlineStatus();
            this.showOfflineNotification();
        });

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButtons();
        });

        // Listen for language changes if the app supports it via custom event
        window.addEventListener('localeChanged', () => {
            this.updateLabels();
        });
    }

    showInstallButtons() {
        if (this.installBtn) this.installBtn.style.display = 'block';
        if (this.announcementInstallBtn) this.announcementInstallBtn.style.display = 'block';
    }

    hideInstallButtons() {
        if (this.installBtn) this.installBtn.style.display = 'none';
        if (this.announcementInstallBtn) this.announcementInstallBtn.style.display = 'none';
    }

    updateLabels() {
        // Refresh text content based on new locale
        const currentModeLabel = this.getTranslation('currentMode');
        const statusState = navigator.onLine ? this.getTranslation('online') : this.getTranslation('offline');
        const statusText = `${currentModeLabel}: ${statusState}`;

        // Update Settings UI
        if (this.statusText) this.statusText.textContent = statusState;

        this.syncButtonText(this.installBtn, this.getTranslation('install'));
        this.syncButtonText(this.checkUpdateBtn || document.getElementById('pwa-check-update-btn'), this.getTranslation('checkUpdate'));

        const statusTitle = document.querySelector('[data-pwa-status-title="true"]');
        if (statusTitle) {
            statusTitle.textContent = this.getTranslation('statusTitle');
        }

        // Update Announcement UI
        if (this.announcementStatusText) this.announcementStatusText.textContent = statusText;
        this.syncButtonText(this.announcementInstallBtn, this.getTranslation('install'));

        this.updateVersionDisplays();

        // Update Modal if open
        if (this.updateModal && this.updateModal.classList.contains('show')) {
            this.refreshUpdateModalContent();
        }
    }

    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const color = isOnline ? '#34C759' : '#8E8E93'; // Green or Gray

        const currentModeLabel = this.getTranslation('currentMode');
        const statusState = isOnline ? this.getTranslation('online') : this.getTranslation('offline');

        // Announcement: "Current Mode: Online"
        const announcementText = `${currentModeLabel}: ${statusState}`;

        if (this.statusIndicator) this.statusIndicator.style.backgroundColor = color;
        // Settings: Just "Online" (Cleaner for settings list)
        if (this.statusText) this.statusText.textContent = statusState;

        if (this.announcementStatusIndicator) this.announcementStatusIndicator.style.backgroundColor = color;
        if (this.announcementStatusText) this.announcementStatusText.textContent = announcementText;
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        this.deferredPrompt = null;
        this.hideInstallButtons();
    }

    async checkForUpdates(manual = false) {
        const checkUpdateBtn = this.checkUpdateBtn || document.getElementById('pwa-check-update-btn');
        if (manual && checkUpdateBtn) {
            this.setActionButtonBusy(checkUpdateBtn, true, this.getTranslation('checking'));
        }

        const finishCheck = () => {
            if (checkUpdateBtn) {
                this.setActionButtonBusy(checkUpdateBtn, false, this.getTranslation('checkUpdate'));
            }
        };
        const toastManager = window.drawingBoard?.settingsManager?.toastManager || null;

        try {
            const startupState = await this.collectStartupUpdateState();
            let { currentVersion, latestVersion, registration, waitingWorker } = startupState;

            if (!navigator.onLine && !waitingWorker) {
                if (manual) {
                    this.showOfflineNotification();
                }
                return;
            }

            if (!waitingWorker && registration && navigator.onLine) {
                const waitingWorkerPromise = this.waitForWaitingWorker(UPDATE_CHECK_TIMEOUT);
                try {
                    await registration.update();
                } catch (error) {
                    console.warn('Manual service worker refresh failed:', error);
                }
                waitingWorker = await waitingWorkerPromise;
            }

            const action = this.determineUpdateAction({
                currentVersion,
                latestVersion,
                hasWaitingWorker: Boolean(waitingWorker)
            });

            if (action === UPDATE_ACTIONS.CONTINUE) {
                if (manual && toastManager) {
                    toastManager.show(this.getTranslation('latest'), 'success');
                }
                return;
            }

            let userChoice;
            if (manual) {
                userChoice = await this.promptForUpdate({
                    reason: 'manual',
                    currentVersion,
                    latestVersion
                });
            } else {
                userChoice = this.getPreferredUpdateChoice() === UPDATE_USER_CHOICES.IMMEDIATE
                    ? UPDATE_USER_CHOICES.IMMEDIATE
                    : UPDATE_USER_CHOICES.IDLE;
            }

            let requested = await this.requestUpdateApplication({
                mode: userChoice === UPDATE_USER_CHOICES.IMMEDIATE
                    ? PLANNED_UPDATE_MODES.IMMEDIATE
                    : PLANNED_UPDATE_MODES.IDLE,
                reason: manual ? 'manual' : 'background',
                currentVersion,
                latestVersion
            });

            if (!requested && !manual) {
                userChoice = await this.promptForUpdate({
                    reason: 'background',
                    currentVersion,
                    latestVersion
                });
                requested = await this.requestUpdateApplication({
                    mode: userChoice === UPDATE_USER_CHOICES.IMMEDIATE
                        ? PLANNED_UPDATE_MODES.IMMEDIATE
                        : PLANNED_UPDATE_MODES.IDLE,
                    reason: 'background',
                    currentVersion,
                    latestVersion
                });
            }

            if (!requested && manual && toastManager && currentVersion && latestVersion) {
                toastManager.show(
                    this.getTranslation('versionUpdateFound')
                        .replace('{latest}', latestVersion)
                        .replace('{current}', currentVersion),
                    'warning'
                );
            }
        } finally {
            finishCheck();
        }
    }
}

// Initialize
window.PWAManager = PWAManager;
window.AboardPWAManager = PWAManager;
