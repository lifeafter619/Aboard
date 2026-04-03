# Update Reload Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate-vs-idle update application flows that auto-save and auto-restore the whiteboard so users do not need to manually refresh.

**Architecture:** Extend the PWA manager into an update coordinator, add a planned reload persistence contract between the update layer and session layer, and teach startup recovery to auto-restore planned update reloads without the generic recovery prompt.

**Tech Stack:** Vanilla JS modules, Service Worker, localStorage, IndexedDB-backed `StorageManager`, Node built-in test runner.

---

### Task 1: Add tests and pure helpers for planned update reload behavior

**Files:**
- Create: `tests/update-reload.test.js`
- Modify: `package.json`
- Modify: `js/app/startup-update-policy.js`
- Create: `js/app/planned-update-reload.js`

- [ ] Step 1: Write failing tests for planned reload intent persistence and idle-safe decision helpers.
- [ ] Step 2: Run `node --test tests/update-reload.test.js` and verify failure.
- [ ] Step 3: Implement minimal pure helpers in `js/app/planned-update-reload.js` and any needed exports in `startup-update-policy.js`.
- [ ] Step 4: Re-run `node --test tests/update-reload.test.js` and verify pass.
- [ ] Step 5: Update `package.json` with a `test` script using Node’s built-in test runner.

### Task 2: Implement update choice modal and reload orchestration

**Files:**
- Modify: `js/modules/pwa-manager.js`
- Modify: `js/locales/overrides.js`
- Modify: `index.html`
- Modify: `js/modules/settings-manager.js`
- Modify: `js/modules/ui-listeners-runtime.js`

- [ ] Step 1: Add failing tests for any new pure helper logic introduced by the modal/default preference wiring.
- [ ] Step 2: Implement the two-action update modal (`立即刷新更新` / `空闲时刷新更新`) and default preference plumbing.
- [ ] Step 3: Wire waiting-worker detection and manual/startup flows to the new modal outcomes.
- [ ] Step 4: Add planned idle scheduling, user-activity tracking hooks, and unload-warning suppression for planned update reloads.
- [ ] Step 5: Run targeted tests and verify they stay green.

### Task 3: Add board persistence hooks and auto-restore after planned update reload

**Files:**
- Modify: `js/main.js`
- Modify: `js/modules/session-runtime.js`
- Modify: `js/modules/session-persistence-runtime.js`
- Modify: `js/app/create-app.js`
- Modify: `js/app/create-app-context.js` if new context wiring is needed

- [ ] Step 1: Add failing tests for planned update restore intent handling if covered by helper tests.
- [ ] Step 2: Implement board methods for activity snapshots and forced persistence before update reload.
- [ ] Step 3: Auto-restore planned update reloads during startup and clear the intent after success.
- [ ] Step 4: Fall back to the existing recovery modal if planned auto-restore cannot complete.
- [ ] Step 5: Re-run the helper tests.

### Task 4: Verify end-to-end behavior at repository level

**Files:**
- Modify as needed from previous tasks only

- [ ] Step 1: Run `npm test`.
- [ ] Step 2: Run `npm run build`.
- [ ] Step 3: Run any local smoke checks for version/update routes if new helpers require them.
- [ ] Step 4: Inspect `git diff` for scope creep and trim if necessary.
