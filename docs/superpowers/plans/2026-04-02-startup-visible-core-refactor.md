# Startup Visible-Core Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make first-load startup show and initialize the visible user surface sooner by loading a smaller visible-core first, then immediately loading the remaining non-visible startup modules.

**Architecture:** Keep the existing ESM bootstrap shell, but split startup assets into `visible-core` and `post-visible` phases. Use runtime proxies in `js/main.js` so delayed classic runtime scripts can register after `main.js` has already executed, and move heavyweight non-visible listeners/features out of the initial manifest while still starting them immediately after the first visible app shell is ready.

**Tech Stack:** Static HTML, native ES modules, classic browser scripts, service worker precache, Node built-in test runner (`node --test`)

---

### Task 1: Add startup-phase contract tests

**Files:**
- Modify: `tests/architecture/bootstrap-contract.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that:
- `js/app/legacy-manifest.js` exports separate visible-core and post-visible startup groups.
- `js/modules/ui-listeners-core-runtime.js` exists and is referenced by the visible-core manifest.
- heavyweight late-init modules such as `js/modules/ui-listeners-runtime.js`, `js/modules/teaching-tools.js`, and `js/modules/help-system.js` are not part of the visible-core startup group.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until the manifest split and new core runtime file exist.

- [ ] **Step 3: Write minimal implementation**

Create the new manifest contract and core listener runtime entry.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 2: Make delayed runtime modules safe after `main.js` evaluation

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Write the failing test**

Use the same architecture contract test as the guardrail; add assertions that the new runtime split exists rather than directly testing browser execution.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until runtime lookup is made delay-safe.

- [ ] **Step 3: Write minimal implementation**

Replace snapshot-style runtime bindings (`window.Aboard*Runtime || {}`) with delay-safe proxies so methods can resolve runtime globals that are registered later by post-visible scripts.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 3: Split startup manifests into visible-core and post-visible phases

**Files:**
- Modify: `js/app/legacy-manifest.js`
- Create: `js/modules/ui-listeners-core-runtime.js`
- Modify: `js/app/create-app.js`

- [ ] **Step 1: Write the failing test**

Extend the contract test to assert:
- visible-core includes the core drawing surface, toolbar/control runtimes, announcement support, and import/export readiness path.
- post-visible includes heavyweight non-visible startup modules.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until startup phases are split.

- [ ] **Step 3: Write minimal implementation**

Implement:
- visible-core manifest arrays
- post-visible manifest arrays
- a small core listener runtime for immediately visible controls
- `createApp()` orchestration that:
  - loads visible-core first
  - creates the board
  - eagerly warms import/export managers
  - then kicks off post-visible startup without blocking first visible readiness

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 4: Update service worker precache coverage

**Files:**
- Modify: `sw.js`
- Modify: `tests/architecture/bootstrap-contract.test.js`

- [ ] **Step 1: Write the failing test**

Assert that `sw.js` precaches the new `js/modules/ui-listeners-core-runtime.js` file and still covers the startup files required by both startup phases.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: FAIL until `sw.js` is updated.

- [ ] **Step 3: Write minimal implementation**

Add the new startup file to `CORE_ASSETS` and keep delayed startup assets cached for fast follow-up loading.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS.

### Task 5: Verification

**Files:**
- Test: `tests/architecture/bootstrap-contract.test.js`
- Test: `js/app/create-app.js`
- Test: `js/app/legacy-manifest.js`
- Test: `js/main.js`
- Test: `sw.js`

- [ ] **Step 1: Run automated verification**

Run: `node --test tests/architecture/bootstrap-contract.test.js`
Expected: PASS with zero failures.

- [ ] **Step 2: Run startup smoke check**

Run: `node server.js`
Expected: server starts successfully on port 8080.

- [ ] **Step 3: Manual browser smoke test**

Verify:
- announcement appears normally
- toolbar/canvas/import/export are available immediately on first load
- delayed features continue loading right after the visible surface is ready
