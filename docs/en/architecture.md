# Aboard Architecture

## 1. Goals
- Prioritize teaching and presentation workflows, especially on large touch displays.
- Keep deployment simple by staying close to native web APIs.
- Split complex capabilities into focused modules so the codebase remains maintainable.

## 2. Runtime Layers
### UI Shell
- `index.html` contains the main layout, toolbar, settings panels, dialogs, and most `data-i18n` markers.

### Control Layer
- `js/main.js` initializes the app, coordinates tool switching, and wires modules together.
- `js/modules/settings-manager.js` owns user preferences, sizing, and theme synchronization.
- `js/modules/i18n.js` handles locale detection, translation loading, and DOM updates.

### Feature Modules
- Drawing: `js/drawing.js`, `js/history.js`, `js/selection.js`, `js/modules/shape-drawing.js`, `js/modules/edge-drawing.js`.
- Content insertion: `js/insert-image.js`, `js/modules/insert-text-manager.js`, `js/image-controls.js`.
- Classroom helpers: `js/modules/timer.js`, `js/time-display.js`, `js/modules/random-picker.js`, `js/modules/scoreboard.js`, `js/modules/teaching-tools.js`.
- Support modules: `js/modules/storage-manager.js`, `js/modules/pwa-manager.js`, `js/modules/dialog-manager.js`, `js/modules/help-system.js`.

### Styling Layer
- `css/style.css` holds shared layout, toolbar, panel, and interaction styling.
- `css/modules/` keeps feature-specific styles isolated by capability.

### Service Layer
- `server.js` serves local files and exposes `/api/version`.
- `sw.js` manages offline caching and update behavior.

## 3. Core Data Flow
1. The user interacts with the toolbar or a panel.
2. `main.js` or the relevant feature module updates the active tool and configuration.
3. Drawing or helper modules render, create objects, or refresh overlays.
4. History and storage modules persist snapshots and recovery data.
5. Settings and i18n modules keep theme, language, and UI labels in sync.

## 4. Localization Strategy
- Base locale files live in `js/locales/*.js`.
- Help content lives in `js/locales/help/*.js`.
- `js/locales/overrides.js` now centralizes translation backfills so one locale does not leak text from another locale.
- `js/modules/i18n.js` merges locale data, help content, and overrides before applying translations.

## 5. Key Files
- `index.html`: static entry shell.
- `js/main.js`: main coordinator.
- `js/modules/`: home of most complex features.
- `css/style.css`: shared foundation.
- `css/modules/`: focused styling by module.
- `public/README.*.md`: language-specific entry docs.
- `docs/`: architecture and advanced notes.

## 6. Why This Split Works
- Modular feature files make regression checks easier as the app grows.
- Isolated style files reduce cross-feature UI breakage.
- Separate documentation and localization layers let the project evolve without turning the README into a dump of implementation detail.
