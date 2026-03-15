class GifManager {
    constructor() {
        this.layer = document.getElementById('gif-layer');
        this.gifs = new Map(); // Store active GIF instances
        this.nextId = 1;

        // Settings for new GIFs
        this.defaultLoopCount = 0; // 0 = infinite
        this.defaultAutoPlay = true;

        // Load saved state
        this.loadState();
    }

    // --- Persistence ---
    saveState() {
        const state = [];
        this.gifs.forEach((data, id) => {
            // Get current position & size
            const left = parseInt(data.container.style.left, 10);
            const top = parseInt(data.container.style.top, 10);
            const width = parseInt(data.container.style.width, 10);
            const height = parseInt(data.container.style.height, 10);

            state.push({
                src: data.src,
                x: left,
                y: top,
                width: width,
                height: height,
                loopCount: data.loopCount,
                autoPlay: data.isPlaying
            });
        });

        try {
            localStorage.setItem('floatingGifs', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save GIFs to localStorage', e);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('floatingGifs');
            if (saved) {
                const state = JSON.parse(saved);
                state.forEach(gifData => {
                    this.addFloatingGif(gifData.src, {
                        x: gifData.x,
                        y: gifData.y,
                        width: gifData.width,
                        height: gifData.height,
                        loopCount: gifData.loopCount,
                        autoPlay: gifData.autoPlay,
                        skipSave: true // Don't save while loading
                    });
                });
            }
        } catch (e) {
            console.warn('Failed to load GIFs from localStorage', e);
        }
    }

    // --- Floating GIF Management ---

    addFloatingGif(fileOrUrl, options = {}) {
        const id = `gif-${this.nextId++}`;
        const container = document.createElement('div');
        container.id = id;
        container.className = 'floating-gif-container';
        container.style.position = 'absolute';
        container.style.pointerEvents = 'auto'; // Enable interaction
        container.style.cursor = 'move';
        container.style.touchAction = 'none';

        // Initial position (center if not specified)
        const x = options.x !== undefined ? options.x : window.innerWidth / 2 - 100;
        const y = options.y !== undefined ? options.y : window.innerHeight / 2 - 100;
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;

        // Size will be set after load if not provided, or forced if provided
        if (options.width) container.style.width = `${options.width}px`;
        if (options.height) container.style.height = `${options.height}px`;

        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.display = 'block';

        // Handle File object or URL string
        let src = '';
        if (fileOrUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                // Update map with source once available
                if (this.gifs.has(id)) {
                    this.gifs.get(id).src = e.target.result;
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

        // Add controls overlay (initially hidden, shown on hover/click)
        this._addControls(container, id);
        this._addResizeHandles(container, id);

        this.layer.appendChild(container);
        this.setupDrag(container);
        this.setupResize(container, id);

        // Placeholder entry (updated later)
        this.gifs.set(id, {
            container: container,
            src: src, // Store source for persistence
            loopCount: options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount,
            isPlaying: options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay
        });

        if (!options.skipSave && src) this.saveState();

        return id;
    }

    async _initSuperGif(imgElement, container, id, options) {
        // Ensure SuperGif is loaded
        if (!window.SuperGif) {
            try {
                if (window.ScriptLoader) {
                    await ScriptLoader.load('js/modules/libgif.js');
                } else {
                    console.error('ScriptLoader not found');
                    return;
                }
            } catch (e) {
                console.error('Failed to load libgif.js', e);
                return;
            }
        }

        // SuperGif requires the img element to be in the DOM initially or passed directly
        container.appendChild(imgElement);

        // Options
        const autoPlay = options.autoPlay !== undefined ? options.autoPlay : this.defaultAutoPlay;
        const loopCount = options.loopCount !== undefined ? options.loopCount : this.defaultLoopCount;

        const gif = new SuperGif({
            gif: imgElement,
            auto_play: autoPlay,
            loop_mode: loopCount === 0 ? true : false,
            vp_t: 0, vp_l: 0, // viewport position
            on_end: () => {
                this._handleGifLoop(id);
            }
        });

        // Update instance data
        if (this.gifs.has(id)) {
            const data = this.gifs.get(id);
            data.instance = gif;
            data.loopCount = loopCount;
            data.currentLoop = 0;
            data.isPlaying = autoPlay;
        }

        gif.load(() => {
            // Callback when loaded
            const canvas = gif.get_canvas();
            if (canvas) {
                // Ensure canvas fills container
                canvas.style.width = '100%';
                canvas.style.height = '100%';

                // If dimensions were not explicitly set, resize container to match native size
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
        const controls = document.createElement('div');
        controls.className = 'gif-controls';
        controls.style.position = 'absolute';
        controls.style.top = '-40px';
        controls.style.left = '0';
        controls.style.background = 'rgba(0, 0, 0, 0.7)';
        controls.style.padding = '5px';
        controls.style.borderRadius = '4px';
        controls.style.display = 'none'; // Show on hover/active
        controls.style.gap = '5px';
        controls.style.zIndex = '1001';
        if (window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
            controls.style.display = 'flex';
        }

        // Play/Pause
        const playBtn = document.createElement('button');
        playBtn.innerHTML = '⏸'; // Default icon
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

        // Settings (Loop Count)
        const settingsBtn = document.createElement('button');
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

        // Delete
        const deleteBtn = document.createElement('button');
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

        // Hover events
        if (!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
            container.addEventListener('mouseenter', () => controls.style.display = 'flex');
            container.addEventListener('mouseleave', () => controls.style.display = 'none');
        }

        // Store control references
        if(this.gifs.has(id)) {
            const data = this.gifs.get(id);
            data.controls = { playBtn };
        }
    }

    _addResizeHandles(container, id) {
        // Add one handle at bottom-right for simplicity, or 4 corners
        // Let's add bottom-right corner
        const handle = document.createElement('div');
        handle.className = 'gif-resize-handle';
        handle.style.position = 'absolute';
        handle.style.width = '20px';
        handle.style.height = '20px';
        handle.style.right = '-4px';
        handle.style.bottom = '-4px';
        handle.style.cursor = 'nwse-resize';
        handle.style.background = 'rgba(255, 255, 255, 0.5)';
        handle.style.border = '1px solid #333';
        handle.style.zIndex = '1001';
        handle.style.display = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ? 'block' : 'none'; // Show on hover

        container.appendChild(handle);

        if (!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
            container.addEventListener('mouseenter', () => handle.style.display = 'block');
            container.addEventListener('mouseleave', () => handle.style.display = 'none');
        }
    }

    _updatePlayButton(id) {
        const data = this.gifs.get(id);
        if (!data || !data.controls) return;

        data.controls.playBtn.innerHTML = data.isPlaying ? '⏸' : '▶';
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
            }
            data.instance.play();
            data.isPlaying = true;
        }
        this._updatePlayButton(id);
        this.saveState();
    }

    removeGif(id) {
        const data = this.gifs.get(id);
        if (data) {
            data.container.remove();
            this.gifs.delete(id);
            this.saveState();
        }
    }

    openSettings(id) {
        const data = this.gifs.get(id);
        if (!data) return;

        // Custom Modal for Loop Count
        // Reusing standard prompt for now as per plan, can be enhanced later if requested specifically.
        const count = prompt(window.i18n.t('gif.loopCountPrompt') || 'Set loop count (0 for infinite):', data.loopCount);
        if (count !== null && !isNaN(count)) {
            data.loopCount = parseInt(count);
            data.currentLoop = 0;
            this.saveState();
        }
    }

    // --- Drag Logic ---
    setupDrag(element) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onDown = (e) => {
            if (e.target.closest('button') || e.target.classList.contains('gif-resize-handle')) return;
            isDragging = true;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;

            // element.offsetLeft is relative to offsetParent (#gif-layer).
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;

            element.style.zIndex = '1000'; // Bring to front
            e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;
            if (e.type === 'touchmove') e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        };

        const onUp = () => {
            isDragging = false;
            element.style.zIndex = '';
            this.saveState();

            // Remove temp listeners
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('touchend', onUp);
            document.removeEventListener('pointercancel', onUp);
            document.removeEventListener('touchcancel', onUp);
        };

        const onDownWrapper = (e) => {
            onDown(e);
            if (isDragging) {
                document.addEventListener('mousemove', onMove);
                document.addEventListener('pointermove', onMove);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('mouseup', onUp);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('touchend', onUp);
                document.addEventListener('pointercancel', onUp);
                document.addEventListener('touchcancel', onUp);
            }
        };

        element.addEventListener('mousedown', onDownWrapper);
        element.addEventListener('pointerdown', onDownWrapper);
        element.addEventListener('touchstart', onDownWrapper, { passive: false });
    }

    // --- Resize Logic ---
    setupResize(element, id) {
        const handle = element.querySelector('.gif-resize-handle');
        if (!handle) return;

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

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

            // Maintain Aspect Ratio if possible?
            // Actually GIF aspect ratio is fixed by the canvas inside it.
            // But we scale the container.

            let newWidth = startWidth + dx;
            let newHeight = startHeight + dy;

            // Enforce aspect ratio
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

                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('touchend', onUp);
                document.removeEventListener('pointercancel', onUp);
                document.removeEventListener('touchcancel', onUp);
            }
        };

        const onDownWrapper = (e) => {
            onDown(e);
            if (isResizing) {
                document.addEventListener('mousemove', onMove);
                document.addEventListener('pointermove', onMove);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('mouseup', onUp);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('touchend', onUp);
                document.addEventListener('pointercancel', onUp);
                document.addEventListener('touchcancel', onUp);
            }
        };

        handle.addEventListener('mousedown', onDownWrapper);
        handle.addEventListener('pointerdown', onDownWrapper);
        handle.addEventListener('touchstart', onDownWrapper, { passive: false });
    }
}

// Export singleton
window.GifManager = new GifManager();
