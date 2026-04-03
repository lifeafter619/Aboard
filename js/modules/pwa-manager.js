// Timeout for resolving manual update checks (milliseconds).
const UPDATE_CHECK_TIMEOUT = 1200;
const UPDATE_APPLY_TIMEOUT = 5000;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const APP_VERSION_URLS = ['version.txt', './version.txt', '/api/version'];
const UPDATE_PREFERENCE_KEY = 'updatePreference';
const UPDATE_PREFERENCES = Object.freeze({
    PROMPT: 'prompt',
    AUTO: 'auto'
});
const UPDATE_ACTIONS = Object.freeze({
    CONTINUE: 'continue',
    PROMPT: 'prompt',
    ACTIVATE: 'activate'
});
const UPDATE_USER_CHOICES = Object.freeze({
    LATER: 'later',
    UPDATE: 'update'
});

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
        this.version = null;
        this.latestAvailableVersion = null;
        this.announcementVersionRow = null;

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
                'updateMessage': '新版本已下载完毕。是否立即刷新以应用更新？\n(选择“稍后”将在下次启动时应用)',
                'update': '立即更新',
                'updateLater': '稍后',
                'checkUpdate': '检查更新',
                'checking': '正在检查更新...',
                'latest': '已是最新版本',
                'versionUpdateFound': '检测到新版本：{latest}（当前：{current}），请刷新更新。'
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
                'updateMessage': '新版本已下載完畢。是否立即刷新以應用更新？\n(選擇“稍後”將在下次啟動時應用)',
                'update': '立即更新',
                'updateLater': '稍後',
                'checkUpdate': '檢查更新',
                'checking': '正在檢查更新...',
                'latest': '已是最新版本',
                'versionUpdateFound': '檢測到新版本：{latest}（當前：{current}），請重新整理更新。'
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
                'updateMessage': 'New version downloaded. Refresh now to apply?\n(Select "Later" to apply on next launch)',
                'update': 'Update Now',
                'updateLater': 'Later',
                'checkUpdate': 'Check for Updates',
                'checking': 'Checking for updates...',
                'latest': 'You are on the latest version',
                'versionUpdateFound': 'New version detected: {latest} (current: {current}). Please refresh to update.'
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
                'updateMessage': '新しいバージョンがダウンロードされました。今すぐ更新しますか？\n(「後で」を選択すると次回起動時に適用されます)',
                'update': '今すぐ更新',
                'updateLater': '後で',
                'checkUpdate': 'アップデートを確認',
                'checking': 'アップデートを確認中...',
                'latest': '最新バージョンです',
                'versionUpdateFound': '新しいバージョンがあります：{latest}（現在：{current}）。更新のため再読み込みしてください。'
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
                'updateMessage': '새 버전이 다운로드되었습니다. 지금 업데이트하시겠습니까?\n(\'나중에\'를 선택하면 다음 실행 시 적용됩니다)',
                'update': '지금 업데이트',
                'updateLater': '나중에',
                'checkUpdate': '업데이트 확인',
                'checking': '업데이트 확인 중...',
                'latest': '최신 버전입니다',
                'versionUpdateFound': '새 버전 감지: {latest} (현재: {current}). 새로고침하여 업데이트하세요.'
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
                'updateMessage': 'Nouvelle version téléchargée. Actualiser maintenant pour appliquer ?\n(Sélectionnez "Plus tard" pour appliquer au prochain lancement)',
                'update': 'Mettre à jour',
                'updateLater': 'Plus tard',
                'checkUpdate': 'Vérifier les mises à jour',
                'checking': 'Vérification des mises à jour...',
                'latest': 'Vous utilisez la dernière version',
                'versionUpdateFound': 'Nouvelle version détectée : {latest} (actuelle : {current}). Veuillez actualiser pour mettre à jour.'
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
                'updateMessage': 'Neue Version heruntergeladen. Jetzt aktualisieren?\n(Wählen Sie "Später", um es beim nächsten Start anzuwenden)',
                'update': 'Jetzt aktualisieren',
                'updateLater': 'Später',
                'checkUpdate': 'Nach Updates suchen',
                'checking': 'Suche nach Updates...',
                'latest': 'Sie haben die neueste Version',
                'versionUpdateFound': 'Neue Version erkannt: {latest} (aktuell: {current}). Bitte zum Aktualisieren neu laden.'
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
                'updateMessage': 'Nueva versión descargada. ¿Actualizar ahora?\n(Seleccione "Más tarde" para aplicar en el próximo inicio)',
                'update': 'Actualizar ahora',
                'updateLater': 'Más tarde',
                'checkUpdate': 'Buscar actualizaciones',
                'checking': 'Buscando actualizaciones...',
                'latest': 'Tienes la última versión',
                'versionUpdateFound': 'Nueva versión detectada: {latest} (actual: {current}). Actualiza recargando la página.'
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
        // Try exact match, then language family (e.g. 'zh'), then default
        let dict = this.translations[locale] ||
                   this.translations[locale.split('-')[0]] ||
                   (locale.startsWith('zh') ? this.translations['zh-CN'] : this.translations[this.defaultLocale]);

        return dict[key] || key;
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
        const parseVersion = (version) => {
            if (!SEMVER_PATTERN.test(String(version || '').trim())) {
                return null;
            }
            const [base, pre = ''] = String(version || '').split('-', 2);
            const numbers = base.split('.').slice(0, 3).map(v => parseInt(v, 10) || 0);
            return { numbers, pre };
        };
        const a = parseVersion(versionA);
        const b = parseVersion(versionB);
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        for (let i = 0; i < 3; i++) {
            if (a.numbers[i] > b.numbers[i]) return 1;
            if (a.numbers[i] < b.numbers[i]) return -1;
        }
        if (!a.pre && b.pre) return 1;
        if (a.pre && !b.pre) return -1;
        if (a.pre && b.pre) return a.pre.localeCompare(b.pre);
        return 0;
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
        if (!('serviceWorker' in navigator)) {
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

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            return this.trackServiceWorkerRegistration(registration);
        } catch (error) {
            console.warn('Failed to get service worker registration:', error);
            return null;
        }
    }

    async registerServiceWorkerNow() {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
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
            registration.addEventListener('updatefound', () => {
                this.observeInstallingWorker(registration.installing);
            });
        }

        if (registration.installing) {
            this.observeInstallingWorker(registration.installing);
        }

        return registration;
    }

    observeInstallingWorker(worker) {
        if (!worker || this.observedWorkers.has(worker)) {
            return;
        }

        this.observedWorkers.add(worker);
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    this.pendingUpdateWorker = worker;
                    if (this.autoActivateUpdates) {
                        this.activateWaitingWorker(worker);
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
        if (this.controllerChangeListenerRegistered || !('serviceWorker' in navigator)) {
            return;
        }

        this.controllerChangeListenerRegistered = true;
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
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
        const preference = this.getUpdatePreference();

        if (hasWaitingWorker) {
            return preference === UPDATE_PREFERENCES.AUTO
                ? UPDATE_ACTIONS.ACTIVATE
                : UPDATE_ACTIONS.PROMPT;
        }

        if (!currentVersion || !latestVersion || this.compareVersions(latestVersion, currentVersion) <= 0) {
            return UPDATE_ACTIONS.CONTINUE;
        }

        return preference === UPDATE_PREFERENCES.AUTO
            ? UPDATE_ACTIONS.ACTIVATE
            : UPDATE_ACTIONS.PROMPT;
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
        laterBtn.className = 'confirm-btn cancel-btn';
        laterBtn.addEventListener('click', () => {
            this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.LATER);
        });

        const updateBtn = document.createElement('button');
        updateBtn.className = 'confirm-btn ok-btn';
        updateBtn.addEventListener('click', () => {
            this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.UPDATE);
        });

        footer.appendChild(laterBtn);
        footer.appendChild(updateBtn);
        body.appendChild(footer);

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.resolveUpdateModalChoice(UPDATE_USER_CHOICES.LATER);
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
            this.updateModalUpdateBtn.textContent = this.getTranslation('update');
        }
        if (this.updateModalLaterBtn) {
            this.updateModalLaterBtn.textContent = this.getTranslation('updateLater');
        }
    }

    promptForUpdate({ reason = 'manual', currentVersion = null, latestVersion = null } = {}) {
        if (reason === 'startup' && this.startupUpdateDeferredForSession) {
            return Promise.resolve(UPDATE_USER_CHOICES.LATER);
        }

        this.ensureUpdateModal();
        this.updateModalContext = { reason, currentVersion, latestVersion };
        this.refreshUpdateModalContent();
        this.updateModal.classList.add('show');

        if (this.updateModalPromise) {
            return this.updateModalPromise;
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
        const resolvedChoice = choice === UPDATE_USER_CHOICES.UPDATE
            ? UPDATE_USER_CHOICES.UPDATE
            : UPDATE_USER_CHOICES.LATER;

        if (resolvedChoice === UPDATE_USER_CHOICES.LATER && this.updateModalContext?.reason === 'startup') {
            this.deferUpdatePromptForCurrentSession();
        }

        this.updateModal?.classList.remove('show');
        this.updateModalContext = null;

        const resolver = this.updateModalResolver;
        this.updateModalResolver = null;
        resolver?.(resolvedChoice);
    }

    showUpdateModal(options = {}) {
        return this.promptForUpdate(options);
    }

    registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        this.bindControllerChangeListener();

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

    createButton(id, text, onClick) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.textContent = text;
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = 'var(--theme-color, #007AFF)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';

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

        if (this.installBtn) this.installBtn.textContent = this.getTranslation('install');
        const checkUpdateBtn = document.getElementById('pwa-check-update-btn');
        if (checkUpdateBtn) checkUpdateBtn.textContent = this.getTranslation('checkUpdate');

        const statusTitle = document.querySelector('[data-pwa-status-title="true"]');
        if (statusTitle) {
            statusTitle.textContent = this.getTranslation('statusTitle');
        }

        // Update Announcement UI
        if (this.announcementStatusText) this.announcementStatusText.textContent = statusText;
        if (this.announcementInstallBtn) this.announcementInstallBtn.textContent = this.getTranslation('install');

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
        const checkUpdateBtn = document.getElementById('pwa-check-update-btn');
        if (manual && checkUpdateBtn) {
            checkUpdateBtn.disabled = true;
            checkUpdateBtn.textContent = this.getTranslation('checking');
        }

        const finishCheck = () => {
            if (checkUpdateBtn) {
                checkUpdateBtn.disabled = false;
                checkUpdateBtn.textContent = this.getTranslation('checkUpdate');
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

            if (!manual && action === UPDATE_ACTIONS.PROMPT) {
                return;
            }

            if (action === UPDATE_ACTIONS.ACTIVATE) {
                const activated = await this.applyUpdateNow();
                if (!activated && manual && toastManager && currentVersion && latestVersion) {
                    toastManager.show(
                        this.getTranslation('versionUpdateFound')
                            .replace('{latest}', latestVersion)
                            .replace('{current}', currentVersion),
                        'warning'
                    );
                }
                return;
            }

            const userChoice = await this.promptForUpdate({
                reason: manual ? 'manual' : 'background',
                currentVersion,
                latestVersion
            });
            if (userChoice === UPDATE_USER_CHOICES.UPDATE) {
                const activated = await this.applyUpdateNow();
                if (!activated && manual && toastManager && currentVersion && latestVersion) {
                    toastManager.show(
                        this.getTranslation('versionUpdateFound')
                            .replace('{latest}', latestVersion)
                            .replace('{current}', currentVersion),
                        'warning'
                    );
                }
            }
        } finally {
            finishCheck();
        }
    }
}

// Initialize
window.PWAManager = PWAManager;
window.AboardPWAManager = PWAManager;
