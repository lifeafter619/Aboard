# Update Reload Experience Design

**Date:** 2026-04-03

## Goal
Allow installed users to apply updates without manual refresh while preserving whiteboard state. When an update is ready, users can choose between immediate refresh or idle refresh.

## User Experience
- When a new service worker update reaches the waiting state, the app surfaces a modal with two actions:
  - **立即刷新更新**: persist the current session, suppress the unload warning, activate the waiting worker, and reload immediately.
  - **空闲时刷新更新**: persist the current session, keep the update pending, monitor user activity, and reload automatically after 15 seconds of safe idleness.
- Existing settings are repurposed from `prompt/auto` to a default recommendation/focus between the two actions so the UI keeps one stable preference surface.
- A planned update reload should auto-restore the session after boot instead of showing the generic recovery modal.

## Architecture
- `js/modules/pwa-manager.js` becomes the update orchestration entrypoint. It owns the update-ready modal, tracks pending update plans, records idle timers, and triggers the reload pipeline.
- `DrawingBoard`/session runtimes expose a focused persistence API for planned reloads and an activity snapshot API that tells the update coordinator whether the board is safe to refresh.
- `create-app.js` keeps the startup gate but routes user choice into the new orchestration paths.

## Planned Reload Pipeline
1. Detect a waiting worker or newer remote version.
2. Present the two-choice modal.
3. Persist session data synchronously and asynchronously.
4. Persist a planned-reload intent in storage with reason=`update` and mode=`immediate|idle`.
5. For immediate mode, activate the waiting worker right away.
6. For idle mode, monitor recent pointer/keyboard/input activity and only activate once the board is idle and not actively drawing, dragging, resizing, pinching, or text-editing.
7. On `controllerchange`, reload without the normal manual-refresh warning.
8. On next boot, detect the planned update intent and auto-restore the session, then clear the intent.

## Recovery Scope
Guaranteed restore scope for this change:
- current page bitmap
- all persisted pages
- page backgrounds and global background settings
- strokes, stamped images, text objects, view state, uploaded image references

Out of scope unless already persisted elsewhere:
- transient open dialogs and temporary widget drag positions during the reload moment
- in-progress text input that has not yet been committed

## Safety Rules
- Never auto-refresh while active drawing/shape drawing/pinch/selection drag/modal drag/modal resize/image transform/text input is live.
- If async persistence fails, fall back to the synchronous local snapshot and continue only when that snapshot exists.
- Suppress the generic `beforeunload` warning only for a planned update reload.
- If auto-restore fails, fall back to the existing recovery modal.

## Testing Strategy
- Unit tests for update decision helpers and planned reload intent handling.
- Unit tests for idle gating helpers with busy vs idle activity snapshots.
- Smoke verification: build succeeds, update preference UI renders, and planned reload auto-restore path preserves persisted session data.