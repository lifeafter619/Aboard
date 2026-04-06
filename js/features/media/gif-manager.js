export class GifManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.layer = this.doc.getElementById('gif-layer');
    this.gifs = new Map();
    this.nextId = 1;
    this.defaultLoopCount = 0;
    this.defaultAutoPlay = true;
    this.loadState();
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
    if (fileOrUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target.result;
        if (this.gifs.has(id)) {
          this.gifs.get(id).src = event.target.result;
          if (!options.skipSave) this.saveState();
        }
        this._initSuperGif(img, container, id, options);
      };
      reader.readAsDataURL(fileOrUrl);
    } else {
      img.src = fileOrUrl;
      src = fileOrUrl;
      img.onload = () => {
        this._initSuperGif(img, container, id, options);
      };
    }

    this._addControls(container, id);
    this._addResizeHandles(container, id);

    this.layer.appendChild(container);
    this.setupDrag(container);
    this.setupResize(container, id);

    this.gifs.set(id, {
      container,
      src,
      loopCount: options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount,
      isPlaying: options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay
    });

    if (!options.skipSave && src) this.saveState();

    return id;
  }

  async _initSuperGif(imgElement, container, id, options) {
    if (!this.win.SuperGif) {
      try {
        if (this.win.ScriptLoader?.load) {
          await this.win.ScriptLoader.load('js/modules/libgif.js');
        } else {
          console.error('ScriptLoader not found');
          return;
        }
      } catch (error) {
        console.error('Failed to load libgif.js', error);
        return;
      }
    }

    container.appendChild(imgElement);

    const autoPlay = options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay;
    const loopCount = options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount;

    const gif = new this.win.SuperGif({
      gif: imgElement,
      auto_play: autoPlay,
      loop_mode: loopCount === 0,
      vp_t: 0,
      vp_l: 0,
      on_end: () => {
        this._handleGifLoop(id);
      }
    });

    if (this.gifs.has(id)) {
      const data = this.gifs.get(id);
      data.instance = gif;
      data.loopCount = loopCount;
      data.currentLoop = 0;
      data.isPlaying = autoPlay;
    }

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
    const playBtn = data.container.querySelector('.gif-controls button');
    if (playBtn) {
      playBtn.innerHTML = data.isPlaying ? '⏸' : '▶';
    }
  }

  togglePlay(id) {
    const data = this.gifs.get(id);
    if (!data || !data.instance) return;

    if (data.isPlaying) {
      data.instance.pause();
      data.isPlaying = false;
    } else {
      data.instance.play();
      data.isPlaying = true;
    }
    this._updatePlayButton(id);
    this.saveState();
  }

  openSettings(id) {
    const data = this.gifs.get(id);
    if (!data) return;

    const input = this.win.prompt
      ? this.win.prompt('Set loop count (0 = infinite):', String(data.loopCount ?? this.defaultLoopCount))
      : prompt('Set loop count (0 = infinite):', String(data.loopCount ?? this.defaultLoopCount));
    if (input === null) return;
    const loopCount = parseInt(input, 10);
    if (!Number.isNaN(loopCount) && loopCount >= 0) {
      data.loopCount = loopCount;
      data.currentLoop = 0;
      this.saveState();
    }
  }

  removeGif(id) {
    const data = this.gifs.get(id);
    if (!data) return;

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
      if (e.target.closest('.gif-controls') || e.target.closest('.gif-resize-handle')) return;
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startLeft = parseInt(element.style.left, 10) || 0;
      startTop = parseInt(element.style.top, 10) || 0;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      if (e.type === 'touchmove') e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
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
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isResizing) return;
      if (e.type === 'touchmove') e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
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
