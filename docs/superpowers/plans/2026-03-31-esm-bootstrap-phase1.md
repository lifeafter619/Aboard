# ESM Bootstrap Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single ESM startup entry and app bootstrap shell while preserving existing Aboard functionality.

**Architecture:** Add a thin module-based startup layer under `js/app/`, keep legacy scripts intact, and instantiate the existing `DrawingBoard` through a controlled runtime bridge. Migrate only the isolated browser compatibility check into the new layer and defer risky domain refactors.

**Tech Stack:** Static HTML, native ES modules, classic browser scripts, service worker precache, Node built-in test runner (`node --test`)

---

### Task 1: Add failing architecture contract tests

**Files:**
- Create: `tests/architecture/bootstrap-contract.test.js`
- Test: `tests/architecture/bootstrap-contract.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `index.html` loads `js/app/bootstrap.js` as a module entry.
- `index.html` no longer boots `js/main.js` directly.
- `js/main.js` exposes `window.DrawingBoard = DrawingBoard`.
- `js/main.js` no longer instantiates `new DrawingBoard()` on load.
- `sw.js` precaches the new `js/app/*` files.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL because the bootstrap files and contracts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create the app-layer shell and remove legacy auto-start from `js/main.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 2: Add ESM bootstrap shell and legacy loading flow

**Files:**
- Create: `js/app/bootstrap.js`
- Create: `js/app/create-app.js`
- Create: `js/app/create-app-context.js`
- Create: `js/app/legacy-manifest.js`
- Create: `js/app/legacy-script-loader.js`
- Create: `js/legacy/runtime-bridge.js`
- Modify: `index.html`
- Modify: `js/main.js`

- [ ] **Step 1: Write the failing test**

Use the contract test from Task 1 as the guardrail.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until the new files and HTML wiring exist.

- [ ] **Step 3: Write minimal implementation**

Implement:
- single module entry in HTML
- sequential classic-script loader for legacy files
- runtime bridge for globals
- app context creator
- bootstrap startup orchestration
- `window.DrawingBoard = DrawingBoard` export in `js/main.js`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 3: Migrate BrowserCheck into the new ESM layer

**Files:**
- Create: `js/infra/browser-check.js`
- Modify: `js/app/create-app.js`
- Modify: `js/app/legacy-manifest.js`

- [ ] **Step 1: Write the failing test**

Extend the contract test to ensure the legacy manifest no longer requires `js/modules/browser-check.js` and the new browser-check module exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until the new module is wired.

- [ ] **Step 3: Write minimal implementation**

Move browser compatibility startup into the ESM shell and remove it from the legacy startup manifest.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 4: Update service worker precache list

**Files:**
- Modify: `sw.js`
- Test: `tests/architecture/bootstrap-contract.test.js`

- [ ] **Step 1: Write the failing test**

Assert the new app-layer files are included in `CORE_ASSETS`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until `sw.js` is updated.

- [ ] **Step 3: Write minimal implementation**

Add all new bootstrapping files to `CORE_ASSETS` and keep the legacy runtime assets needed after Phase 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 5: Verification

**Files:**
- Test: `tests/architecture/bootstrap-contract.test.js`
- Test: `index.html`, `js/main.js`, `sw.js`

- [ ] **Step 1: Run automated verification**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS with zero failures.

- [ ] **Step 2: Run startup smoke check**

Run: `node server.js`
Expected: server starts successfully on port 8080.

- [ ] **Step 3: Manual browser smoke test**

Verify the app opens and the main board initializes without visible UI regressions.
