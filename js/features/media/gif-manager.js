const GIF_DB_NAME = 'aboard-gif-storage';
const GIF_DB_VERSION = 1;
const GIF_STATE_STORE = 'gif-state';
const GIF_STATE_KEY = 'floatingGifs';
// Legacy pre-IndexedDB location; migrated once, then removed.
const GIF_LEGACY_STORAGE_KEY = 'floatingGifs';

export class GifManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.layer = this.doc.getElementById('gif-layer');
    this.gifs = new Map();
    this.nextId = 1;
    this.defaultLoopCount = 0;
    this.defaultAutoPlay = true;
    this.gifDatabase = null;
    this.handleLocaleChanged = () => this.refreshControlLabels();
    this.win.addEventListener?.('localeChanged', this.handleLocaleChanged);
    this.storageReadyPromise = this.initializePersistence();
  }

  // Persistence: large GIF data URLs blew the ~5 MB localStorage quota, so
  // state lives in IndexedDB (structured clone, no JSON string) with the old
  // localStorage path kept as a fallback and a one-time migration source.
  async initializePersistence() {
    const opened = await this.openGifDatabase();
    if (opened) {
      try {
        await this.migrateLegacyStateToIndexedDb();
        await this.loadStateFromIndexedDb();
        return;
      } catch (error) {
        console.warn('Failed to load GIFs from IndexedDB:', error);
      }
    }
    this.loadStateFromLocalStorage();
  }

  openGifDatabase() {
    this.gifDatabase = null;
    const factory = this.win?.indexedDB;
    if (!factory || typeof factory.open !== 'function') {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let request;
      try {
        request = factory.open(GIF_DB_NAME, GIF_DB_VERSION);
      } catch (error) {
        console.warn('Failed to open GIF storage database:', error);
        resolve(false);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (db && (!db.objectStoreNames || !db.objectStoreNames.contains(GIF_STATE_STORE))) {
          db.createObjectStore(GIF_STATE_STORE);
        }
      };
      request.onsuccess = () => {
        this.gifDatabase = request.result || null;
        resolve(Boolean(this.gifDatabase));
      };
      request.onerror = () => {
        console.warn('Failed to open GIF storage database:', request.error);
        resolve(false);
      };
      request.onblocked = () => resolve(false);
    });
  }

  withGifStateStore(mode, run) {
    const db = this.gifDatabase;
    if (!db || typeof db.transaction !== 'function') {
      return Promise.reject(new Error('GIF storage database unavailable'));
    }
    return new Promise((resolve, reject) => {
      let store;
      try {
        store = db.transaction(GIF_STATE_STORE, mode).objectStore(GIF_STATE_STORE);
      } catch (error) {
        reject(error);
        return;
      }
      let request;
      try {
        request = run(store);
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  async migrateLegacyStateToIndexedDb() {
    const storage = this.win?.localStorage;
    if (!storage) return;
    let legacyRaw = null;
    try {
      legacyRaw = storage.getItem(GIF_LEGACY_STORAGE_KEY);
    } catch (error) {
      return;
    }
    if (!legacyRaw) return;

    let legacyState = null;
    try {
      legacyState = JSON.parse(legacyRaw);
    } catch (error) {
      legacyState = null;
    }
    try {
      storage.removeItem(GIF_LEGACY_STORAGE_KEY);
    } catch (error) {
      // Removal is best-effort; the IndexedDB copy is authoritative now.
    }
    if (!Array.isArray(legacyState) || legacyState.length === 0) return;

    const existing = await this.withGifStateStore(
      'readonly',
      (store) => store.get(GIF_STATE_KEY)
    ).catch(() => undefined);
    if (Array.isArray(existing) && existing.length > 0) return;

    await this.withGifStateStore('readwrite', (store) => store.put(legacyState, GIF_STATE_KEY));
  }

  async loadStateFromIndexedDb() {
    const state = await this.withGifStateStore('readonly', (store) => store.get(GIF_STATE_KEY));
    if (Array.isArray(state)) {
      state.forEach((gifData) => this.addGifFromState(gifData));
    }
  }

  loadStateFromLocalStorage() {
    const storage = this.win?.localStorage;
    if (!storage) return;
    try {
      const saved = storage.getItem(GIF_LEGACY_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (Array.isArray(state)) {
          state.forEach((gifData) => this.addGifFromState(gifData));
        }
      }
    } catch (error) {
      console.warn('Failed to load GIFs from localStorage', error);
    }
  }

  addGifFromState(gifData) {
    if (!gifData || typeof gifData !== 'object' || typeof gifData.src !== 'string' || !gifData.src) {
      return;
    }
    this.addFloatingGif(gifData.src, {
      x: gifData.x,
      y: gifData.y,
      width: gifData.width,
      height: gifData.height,
      loopCount: gifData.loopCount,
      autoPlay: gifData.autoPlay,
      skipSave: true
    });
  }

  buildStateSnapshot() {
    const state = [];
    this.gifs.forEach((data) => {
      const left = parseInt(data.container.style.left, 10);
      const top = parseInt(data.container.style.top, 10);
      const width = parseInt(data.container.style.width, 10);
      const height = parseInt(data.container.style.height, 10);

      state.push({
        src: data.src,
        x: left,
        y: top,
        width,
        height,
        loopCount: data.loopCount,
        autoPlay: data.isPlaying
      });
    });
    return state;
  }

  saveState() {
    // Read positions synchronously (the caller's gesture frame owns them),
    // then write after storage initialization so early saves cannot race the
    // initial load.
    const snapshot = this.buildStateSnapshot();
    Promise.resolve(this.storageReadyPromise)
      .then(() => this.writeStateSnapshot(snapshot))
      .catch((error) => {
        console.warn('Failed to save GIFs', error);
        this.notifySaveFailure(error);
      });
  }

  async writeStateSnapshot(snapshot) {
    if (this.gifDatabase) {
      await this.withGifStateStore('readwrite', (store) => store.put(snapshot, GIF_STATE_KEY));
      this.saveFailureNotified = false;
      return;
    }

    const storage = this.win?.localStorage;
    if (!storage) return;
    try {
      storage.setItem(GIF_LEGACY_STORAGE_KEY, JSON.stringify(snapshot));
      this.saveFailureNotified = false;
    } catch (error) {
      console.warn('Failed to save GIFs to localStorage', error);
      this.notifySaveFailure(error);
    }
  }

  getText(key, fallback) {
    const translated = this.win.i18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  }

  getPlayButtonLabel(isPlaying) {
    return isPlaying
      ? this.getText('common.stop', 'Stop')
      : this.getText('common.start', 'Start');
  }

  // Every drag/resize/play-toggle re-runs saveState, so a persistent failure
  // (typically quota — a 10 MB GIF becomes a ~13 MB data URL) would spam
  // toasts; notify once until a save succeeds again.
  // Wired into the cache-clearing flows so "清除本地数据" also drops the
  // IndexedDB copy, matching how the legacy localStorage key was cleared.
  async clearPersistedState() {
    this.saveFailureNotified = false;
    if (this.gifDatabase) {
      try {
        await this.withGifStateStore('readwrite', (store) => store.clear());
      } catch (error) {
        console.warn('Failed to clear stored GIF state:', error);
      }
    }
    try {
      this.win?.localStorage?.removeItem(GIF_LEGACY_STORAGE_KEY);
    } catch (error) {
      // Best-effort; nothing else to clean up.
    }
  }

  notifySaveFailure(error) {
    if (this.saveFailureNotified) {
      return;
    }
    this.saveFailureNotified = true;

    const isQuota = Boolean(error) && (
      error.name === 'QuotaExceededError'
      || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || error.code === 22
      || error.code === 1014
    );
    const message = isQuota
      ? this.getText('gif.saveQuotaExceeded',
        'Storage quota exceeded. The GIF cannot be saved and will disappear after a reload.')
      : this.getText('errors.storageWriteFailed',
        'Saving failed. Please check browser storage permissions and try again.');
    const toast = this.win.drawingBoard?.settingsManager?.toastManager || this.win.toastManager;
    try {
      if (toast?.show) {
        toast.show(message, 'error');
      } else {
        this.win.appDialog?.showAlert?.(message, 'error');
      }
    } catch (toastError) {
      console.warn('Failed to display GIF storage-error notice:', toastError);
    }
  }

  addFloatingGif(fileOrUrl, options = {}) {
    const FileConstructor = this.win.File || (typeof File !== 'undefined' ? File : null);
    const isFileInput = Boolean(FileConstructor && fileOrUrl instanceof FileConstructor);
    if (isFileInput) {
      const validation = this.win.AboardFileValidation;
      const toast = this.win.drawingBoard?.settingsManager?.toastManager || this.win.toastManager;
      try {
        validation?.validateGifFile?.(fileOrUrl);
      } catch (error) {
        validation?.showValidationError?.(error, { toast, dialog: this.win.appDialog });
        return null;
      }
    }

    const id = `gif-${this.nextId++}`;
    const container = this.doc.createElement('div');
    container.id = id;
    container.className = 'floating-gif-container';
    container.style.position = 'absolute';
    container.style.pointerEvents = 'auto';
    container.style.cursor = 'move';
    container.style.touchAction = 'none';

    const x = options.x !== undefined ? options.x : this.win.innerWidth / 2 - 100;
    const y = options.y !== undefined ? options.y : this.win.innerHeight / 2 - 100;
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;

    if (options.width) container.style.width = `${options.width}px`;
    if (options.height) container.style.height = `${options.height}px`;

    const img = this.doc.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';

    let src = '';
    img.onload = () => {
      if (!this.gifs.has(id)) return;
      const data = this.gifs.get(id);
      data.src = img.src;
      if (!options.skipSave) this.saveState();
      void this._initSuperGif(img, container, id, options);
    };
    img.onerror = () => {
      this._handleLoadFailure(id, new Error('Failed to decode GIF image.'));
    };

    if (isFileInput) {
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target.result;
      };
      reader.onerror = () => {
        this._handleLoadFailure(id, reader.error || new Error('Failed to read GIF file.'));
      };
      reader.readAsDataURL(fileOrUrl);
    } else {
      img.src = fileOrUrl;
      src = fileOrUrl;
    }

    const controls = this._addControls(container, id);
    this._addResizeHandles(container, id);

    this.layer.appendChild(container);
    this.setupDrag(container);
    this.setupResize(container, id);

    this.gifs.set(id, {
      container,
      src,
      loopCount: options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount,
      isPlaying: options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay,
      controls
    });
    this._updatePlayButton(id);

    if (!options.skipSave && src) this.saveState();

    return id;
  }

  _handleLoadFailure(id, error) {
    if (!this.gifs.has(id)) return;
    console.warn('Failed to load GIF:', error);
    this.removeGif(id);

    const msg = this.win.i18n?.t?.('errors.fileReadFailed') || 'Failed to read the selected file.';
    const toast = this.win.drawingBoard?.settingsManager?.toastManager || this.win.toastManager;
    if (toast?.show) {
      toast.show(msg, 'error');
    } else {
      this.win.appDialog?.showAlert?.(msg, 'error');
    }
  }

  async _initSuperGif(imgElement, container, id, options) {
    if (!this.win.SuperGif) {
      try {
        if (this.win.ScriptLoader?.load) {
          await this.win.ScriptLoader.load('js/modules/libgif.js');
        } else {
          this._handleLoadFailure(id, new Error('ScriptLoader not found.'));
          return;
        }
      } catch (error) {
        this._handleLoadFailure(id, error);
        return;
      }
    }

    if (!this.gifs.has(id)) return;

    container.appendChild(imgElement);

    const autoPlay = options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay;
    const loopCount = options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount;

    try {
      const gif = new this.win.SuperGif({
        gif: imgElement,
        auto_play: autoPlay,
        loop_mode: loopCount === 0,
        vp_t: 0,
        vp_l: 0,
        on_end: () => {
          this._handleGifLoop(id);
        },
        on_error: (origin) => {
          this._handleLoadFailure(id, new Error(`GIF decoder failed: ${origin}`));
        }
      });

      const data = this.gifs.get(id);
      data.instance = gif;
      data.loopCount = loopCount;
      data.currentLoop = 0;
      data.isPlaying = autoPlay;

      gif.load(() => {
        const canvas = gif.get_canvas();
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';

          if (!options.width && !options.height) {
            container.style.width = `${canvas.width}px`;
            container.style.height = `${canvas.height}px`;
          }
        }
      });
    } catch (error) {
      this._handleLoadFailure(id, error);
    }
  }

  _handleGifLoop(id) {
    const data = this.gifs.get(id);
    if (!data) return;

    if (data.loopCount > 0) {
      data.currentLoop++;
      if (data.currentLoop >= data.loopCount) {
        data.instance.pause();
        data.isPlaying = false;
        this._updatePlayButton(id);
        this.saveState();
      }
    }
  }

  _addControls(container, id) {
    const controls = this.doc.createElement('div');
    controls.className = 'gif-controls';
    controls.style.position = 'absolute';
    controls.style.top = '-40px';
    controls.style.left = '0';
    controls.style.background = 'rgba(0, 0, 0, 0.7)';
    controls.style.padding = '5px';
    controls.style.borderRadius = '4px';
    controls.style.display = 'none';
    controls.style.gap = '5px';
    controls.style.zIndex = '1001';
    if (this.win.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
      controls.style.display = 'flex';
    }

    const playBtn = this.doc.createElement('button');
    playBtn.type = 'button';
    playBtn.dataset.gifAction = 'toggle-play';
    playBtn.innerHTML = '⏸';
    playBtn.style.color = 'white';
    playBtn.style.border = 'none';
    playBtn.style.background = 'transparent';
    playBtn.style.cursor = 'pointer';
    playBtn.style.fontSize = '16px';
    playBtn.style.minWidth = '36px';
    playBtn.style.minHeight = '36px';
    playBtn.onclick = (e) => {
      e.stopPropagation();
      this.togglePlay(id);
    };
    controls.appendChild(playBtn);

    const settingsBtn = this.doc.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.dataset.gifAction = 'open-settings';
    settingsBtn.innerHTML = '⚙';
    settingsBtn.style.color = 'white';
    settingsBtn.style.border = 'none';
    settingsBtn.style.background = 'transparent';
    settingsBtn.style.cursor = 'pointer';
    settingsBtn.style.fontSize = '16px';
    settingsBtn.style.minWidth = '36px';
    settingsBtn.style.minHeight = '36px';
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      this.openSettings(id);
    };
    controls.appendChild(settingsBtn);

    const deleteBtn = this.doc.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.gifAction = 'delete';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '16px';
    deleteBtn.style.minWidth = '36px';
    deleteBtn.style.minHeight = '36px';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeGif(id);
    };
    controls.appendChild(deleteBtn);

    container.appendChild(controls);

    container.addEventListener('mouseenter', () => {
      controls.style.display = 'flex';
    });
    container.addEventListener('mouseleave', () => {
      if (!this.win.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
        controls.style.display = 'none';
      }
    });
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.win.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
        controls.style.display = controls.style.display === 'none' ? 'flex' : 'none';
      }
    });

    return { playBtn, settingsBtn, deleteBtn };
  }

  _addResizeHandles(container) {
    const handle = this.doc.createElement('div');
    handle.className = 'gif-resize-handle';
    handle.style.position = 'absolute';
    handle.style.right = '-8px';
    handle.style.bottom = '-8px';
    handle.style.width = '18px';
    handle.style.height = '18px';
    handle.style.background = 'white';
    handle.style.border = '2px solid #007AFF';
    handle.style.borderRadius = '50%';
    handle.style.cursor = 'nwse-resize';
    handle.style.touchAction = 'none';
    handle.style.zIndex = '1002';
    container.appendChild(handle);
  }

  _updatePlayButton(id) {
    const data = this.gifs.get(id);
    if (!data) return;
    data.controls?.playBtn && (data.controls.playBtn.innerHTML = data.isPlaying ? '⏸' : '▶');
    this._updateControlLabels(id);
  }

  _updateControlLabels(id) {
    const data = this.gifs.get(id);
    if (!data?.controls) return;

    const { playBtn, settingsBtn, deleteBtn } = data.controls;
    if (playBtn) {
      const label = this.getPlayButtonLabel(data.isPlaying);
      playBtn.title = label;
      playBtn.setAttribute('aria-label', label);
      playBtn.setAttribute('aria-pressed', data.isPlaying ? 'true' : 'false');
    }

    if (settingsBtn) {
      const label = this.getText('gif.settingsTitle', 'GIF Settings');
      settingsBtn.title = label;
      settingsBtn.setAttribute('aria-label', label);
    }

    if (deleteBtn) {
      const label = this.getText('common.delete', 'Delete');
      deleteBtn.title = label;
      deleteBtn.setAttribute('aria-label', label);
    }
  }

  refreshControlLabels() {
    this.gifs.forEach((_, id) => {
      this._updateControlLabels(id);
    });
  }

  togglePlay(id) {
    const data = this.gifs.get(id);
    if (!data || !data.instance) return;

    if (data.isPlaying) {
      data.instance.pause();
      data.isPlaying = false;
    } else {
      if (data.loopCount > 0 && data.currentLoop >= data.loopCount) {
        data.currentLoop = 0;
        if (typeof data.instance.move_to === 'function') {
          data.instance.move_to(0);
        }
      }
      data.instance.play();
      data.isPlaying = true;
    }
    this._updatePlayButton(id);
    this.saveState();
  }

  openSettings(id) {
    const data = this.gifs.get(id);
    if (!data) return;

    const promptMessage = this.win.i18n?.t('gif.loopCountPrompt') || 'Set loop count (0 for infinite):';
    const invalidMessage = this.win.i18n?.t('gif.loopCountInvalid') || 'Please enter an integer that is 0 or greater.';
    const dialog = this.win.appDialog;
    if (!dialog?.showPrompt) {
      console.warn('DialogManager prompt is unavailable for GIF settings; ignoring the request.');
      dialog?.showAlert?.(invalidMessage, 'warning');
      return;
    }

    dialog.showPrompt({
      title: this.getText('gif.settingsTitle', 'GIF Settings'),
      message: promptMessage,
      label: promptMessage,
      defaultValue: String(data.loopCount ?? this.defaultLoopCount),
      inputType: 'number',
      inputMode: 'numeric',
      min: 0,
      step: 1,
      required: true,
      requiredMessage: invalidMessage,
      validate: (value) => {
        if (!/^\d+$/.test(String(value || ''))) {
          return invalidMessage;
        }
        return Number.parseInt(value, 10) >= 0 ? '' : invalidMessage;
      }
    }).then((inputValue) => {
      if (inputValue === null) return;
      const loopCount = Number.parseInt(inputValue, 10);
      if (Number.isNaN(loopCount) || loopCount < 0) {
        dialog.showAlert?.(invalidMessage, 'warning');
        return;
      }
      data.loopCount = loopCount;
      data.currentLoop = 0;
      this.saveState();
    });
  }

  removeGif(id) {
    const data = this.gifs.get(id);
    if (!data) return;

    // Stop libgif's self-rescheduling playback loop before dropping the
    // instance, otherwise it keeps running against the detached canvas.
    try {
      data.instance?.pause?.();
    } catch (e) {
      console.warn('Failed to stop GIF instance:', e);
    }

    data.container.remove();
    this.gifs.delete(id);
    this.saveState();
  }

  // Pointer events only: the container and handle set touch-action: none, so
  // touch gestures arrive as pointer events. The old triple binding
  // (pointer + mouse + touch) made every move fire twice on hybrid devices,
  // and the unguarded listeners let a second pointer hijack an active drag.
  setupDrag(element) {
    let isDragging = false;
    let activePointerId = null;
    let startX;
    let startY;
    let startLeft;
    let startTop;

    const onDown = (e) => {
      const closest = typeof e.target?.closest === 'function'
        ? e.target.closest.bind(e.target)
        : () => null;
      if (closest('.gif-controls') || closest('.gif-resize-handle')) return;
      isDragging = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left, 10) || 0;
      startTop = parseInt(element.style.top, 10) || 0;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      element.style.left = `${startLeft + (e.clientX - startX)}px`;
      element.style.top = `${startTop + (e.clientY - startY)}px`;
    };

    const onUp = (e) => {
      if (!isDragging) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
      this.saveState();
      this.doc.removeEventListener('pointermove', onMove);
      this.doc.removeEventListener('pointerup', onUp);
      this.doc.removeEventListener('pointercancel', onUp);
    };

    element.addEventListener('pointerdown', (e) => {
      onDown(e);
      if (isDragging) {
        this.doc.addEventListener('pointermove', onMove);
        this.doc.addEventListener('pointerup', onUp);
        this.doc.addEventListener('pointercancel', onUp);
      }
    });
  }

  setupResize(element, id) {
    const handle = element.querySelector('.gif-resize-handle');
    if (!handle) return;

    let isResizing = false;
    let activePointerId = null;
    let startX;
    let startY;
    let startWidth;
    let startHeight;

    const onDown = (e) => {
      e.stopPropagation();
      isResizing = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isResizing || e.pointerId !== activePointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newWidth = startWidth + dx;
      let newHeight = startHeight + dy;

      const data = this.gifs.get(id);
      if (data && data.instance) {
        const canvas = data.instance.get_canvas();
        if (canvas && canvas.width > 0) {
          const ratio = canvas.width / canvas.height;
          newHeight = newWidth / ratio;
        }
      }

      element.style.width = `${Math.max(50, newWidth)}px`;
      element.style.height = `${Math.max(50, newHeight)}px`;
    };

    const onUp = (e) => {
      if (!isResizing) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      isResizing = false;
      activePointerId = null;
      this.saveState();
      this.doc.removeEventListener('pointermove', onMove);
      this.doc.removeEventListener('pointerup', onUp);
      this.doc.removeEventListener('pointercancel', onUp);
    };

    handle.addEventListener('pointerdown', (e) => {
      onDown(e);
      if (isResizing) {
        this.doc.addEventListener('pointermove', onMove);
        this.doc.addEventListener('pointerup', onUp);
        this.doc.addEventListener('pointercancel', onUp);
      }
    });
  }
}

export function registerGifManagerGlobal(win = window, doc = document) {
  const gifManager = new GifManager(win, doc);
  win.GifManager = gifManager;
  return gifManager;
}
