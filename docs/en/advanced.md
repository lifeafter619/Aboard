# Aboard Advanced Notes

## 1. Drawing and Interaction
- Canvas rendering stays centered on native browser APIs.
- Pen styles, shapes, selection, and edge-guided drawing are separated into dedicated modules.
- To keep magnified content crisp, the editable scene is also mirrored into an SVG vector preview; text, images, strokes, and shapes prefer the SVG layer while zoomed in, while export still follows the existing Canvas pipeline.
- Overlay controls for selection, rotation, resize, and image editing are managed outside the base canvas rendering path.

## 2. State, History, and Recovery
- `js/history.js` handles undo and redo snapshots.
- `js/modules/storage-manager.js` coordinates persistence and recovery with IndexedDB / local storage.
- `settings-manager` provides a single place for toolbar sizing, theme, locale, and exportable preferences.
- Cache size accounting now prefers `navigator.storage.estimate()` when available, falls back to manual cache inspection, and ignores stale async refreshes so the cleanup panel does not show outdated numbers after clearing.

## 3. Classroom Utility Layer
- The clock, timer, random picker, scoreboard, and teaching tools are intentionally kept separate from the core drawing engine.
- The “More” panel works best as an entry point, while each feature keeps its real logic in its own module.

## 4. Documentation and Translation Maintenance
- Keep the README focused on orientation and quick start; move heavier details into `docs/`.
- When new locale keys are added, update the locale file first and then verify whether `js/locales/overrides.js` still needs a backfill.
- If a locale still shows text from another language, check three things first:
  1. missing `data-i18n` markers;
  2. missing locale keys;
  3. dynamic DOM nodes that were not retranslated after locale changes.
- Recent examples include modal header actions such as `Restore Size` / `Keep Centered` and the selectable cache-cleanup confirmation dialog; these strings must stay aligned across every locale.

## 5. Deployment and Debugging
- Local development works with `node server.js` or `npm start`.
- `version.txt` plus `/api/version` support version display and update checks.
- Offline behavior is driven by `sw.js` and `pwa-manager`.

## 6. Good Next Steps
- Add lightweight Playwright smoke coverage for the most critical flows.
- Continue moving hard-coded UI labels into the locale system.
- Keep shrinking the initialization surface inside `main.js` as more features mature.
