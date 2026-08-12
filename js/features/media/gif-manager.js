export class GifManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.layer = this.doc.getElementById('gif-layer');
    this.gifs = new Map();
    this.nextId = 1;
    this.defaultLoopCount = 0;
    this.defaultAutoPlay = true;
    this.handleLocaleChanged = () => this.refreshControlLabels();
    this.win.addEventListener?.('localeChanged', this.handleLocaleChanged);
    this.loadState();
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

  saveState() {
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

    try {
      localStorage.setItem('floatingGifs', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save GIFs to localStorage', error);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('floatingGifs');
      if (saved) {
        const state = JSON.parse(saved);
        state.forEach((gifData) => {
          this.addFloatingGif(gifData.src, {
            x: gifData.x,
            y: gifData.y,
            width: gifData.width,
            height: gifData.height,
            loopCount: gifData.loopCount,
            autoPlay: gifData.autoPlay,
            skipSave: true
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load GIFs from localStorage', error);
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

  setupDrag(element) {
    let isDragging = false;
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
      const primaryTouch = e.touches?.[0];
      const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
      const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startLeft = parseInt(element.style.left, 10) || 0;
      startTop = parseInt(element.style.top, 10) || 0;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      if (e.type === 'touchmove') e.preventDefault();
      const primaryTouch = e.touches?.[0];
      const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
      const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
      element.style.left = `${startLeft + (clientX - startX)}px`;
      element.style.top = `${startTop + (clientY - startY)}px`;
    };

    const onUp = () => {
      if (isDragging) {
        isDragging = false;
        this.saveState();
        this.doc.removeEventListener('mousemove', onMove);
        this.doc.removeEventListener('pointermove', onMove);
        this.doc.removeEventListener('touchmove', onMove);
        this.doc.removeEventListener('mouseup', onUp);
        this.doc.removeEventListener('pointerup', onUp);
        this.doc.removeEventListener('touchend', onUp);
        this.doc.removeEventListener('pointercancel', onUp);
        this.doc.removeEventListener('touchcancel', onUp);
      }
    };

    const onDownWrapper = (e) => {
      onDown(e);
      if (isDragging) {
        this.doc.addEventListener('mousemove', onMove);
        this.doc.addEventListener('pointermove', onMove);
        this.doc.addEventListener('touchmove', onMove, { passive: false });
        this.doc.addEventListener('mouseup', onUp);
        this.doc.addEventListener('pointerup', onUp);
        this.doc.addEventListener('touchend', onUp);
        this.doc.addEventListener('pointercancel', onUp);
        this.doc.addEventListener('touchcancel', onUp);
      }
    };

    element.addEventListener('mousedown', onDownWrapper);
    element.addEventListener('pointerdown', onDownWrapper);
    element.addEventListener('touchstart', onDownWrapper, { passive: false });
  }

  setupResize(element, id) {
    const handle = element.querySelector('.gif-resize-handle');
    if (!handle) return;

    let isResizing = false;
    let startX;
    let startY;
    let startWidth;
    let startHeight;

    const onDown = (e) => {
      e.stopPropagation();
      isResizing = true;
      const primaryTouch = e.touches?.[0];
      const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
      const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isResizing) return;
      if (e.type === 'touchmove') e.preventDefault();
      const primaryTouch = e.touches?.[0];
      const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
      const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
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

    const onUp = () => {
      if (isResizing) {
        isResizing = false;
        this.saveState();
        this.doc.removeEventListener('mousemove', onMove);
        this.doc.removeEventListener('pointermove', onMove);
        this.doc.removeEventListener('touchmove', onMove);
        this.doc.removeEventListener('mouseup', onUp);
        this.doc.removeEventListener('pointerup', onUp);
        this.doc.removeEventListener('touchend', onUp);
        this.doc.removeEventListener('pointercancel', onUp);
        this.doc.removeEventListener('touchcancel', onUp);
      }
    };

    const onDownWrapper = (e) => {
      onDown(e);
      if (isResizing) {
        this.doc.addEventListener('mousemove', onMove);
        this.doc.addEventListener('pointermove', onMove);
        this.doc.addEventListener('touchmove', onMove, { passive: false });
        this.doc.addEventListener('mouseup', onUp);
        this.doc.addEventListener('pointerup', onUp);
        this.doc.addEventListener('touchend', onUp);
        this.doc.addEventListener('pointercancel', onUp);
        this.doc.addEventListener('touchcancel', onUp);
      }
    };

    handle.addEventListener('mousedown', onDownWrapper);
    handle.addEventListener('pointerdown', onDownWrapper);
    handle.addEventListener('touchstart', onDownWrapper, { passive: false });
  }
}

export function registerGifManagerGlobal(win = window, doc = document) {
  const gifManager = new GifManager(win, doc);
  win.GifManager = gifManager;
  return gifManager;
}
