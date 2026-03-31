# Aboard ESM Bootstrap Refactor Design

## Context
Aboard is currently loaded through many classic `<script defer>` tags in `index.html`. The runtime works, but startup order, hidden global dependencies, and the size of `js/main.js` make the codebase hard to refactor safely.

## Goal
Introduce a new frontend architecture foundation that keeps deployment fully static, keeps UI and existing functionality intact, and gives future refactors a safe path away from implicit `window.*` coupling.

## Constraints
- Keep the project fully static-hostable.
- Do not change visual styles in this phase.
- Prioritize runtime compatibility over architectural purity.
- Avoid a big-bang rewrite of drawing, selection, background, or history.
- New architecture must coexist with legacy scripts during migration.

## Recommended Architecture
Use **native ESM + single bootstrap entry + app context + legacy bridge + feature-sliced gradual migration**.

### Why this architecture
1. **Native ESM** makes dependencies explicit and keeps deployment simple.
2. **A single bootstrap entry** centralizes startup order and removes HTML-level script orchestration.
3. **An app context** becomes the new place to obtain shared services.
4. **A legacy bridge** contains remaining `window.*` dependencies during the transition.
5. **Feature-sliced migration** allows low-risk moves one feature at a time instead of rewriting the whole app.

## Phase 1 Scope
Phase 1 only introduces the new shell around the existing runtime.

### In scope
- Replace multi-script HTML bootstrapping with one module entry.
- Add an ESM bootstrap layer under `js/app/`.
- Add an app creation flow that loads legacy scripts in a controlled order.
- Add a legacy bridge that reads/writes required globals through one place.
- Remove self-startup logic from `js/main.js` and let the bootstrap own initialization.
- Migrate `BrowserCheck` into the new module layer because it is isolated and low risk.
- Add regression tests for the new bootstrapping contract.
- Update service worker precache entries for the new app-layer files.

### Out of scope
- Refactoring drawing, selection, background, history internals.
- Styling changes.
- TypeScript, bundlers, framework adoption.
- Importing every legacy module into ESM in one pass.

## Target File Layout for Phase 1
```text
js/
  app/
    bootstrap.js
    create-app.js
    create-app-context.js
    legacy-manifest.js
    legacy-script-loader.js
  infra/
    browser-check.js
  legacy/
    runtime-bridge.js
```

## Runtime Flow After Phase 1
1. `index.html` loads only `js/app/bootstrap.js` as a module.
2. `bootstrap.js` waits for DOM readiness and calls `createApp()`.
3. `createApp()` loads legacy scripts in deterministic order.
4. `createApp()` builds the app context from the legacy bridge.
5. `BrowserCheck` runs from the new ESM layer.
6. `i18n` initializes through the bridge.
7. `DrawingBoard` is instantiated through the bridge and stored back into the runtime.

## Compatibility Strategy
- Keep legacy scripts as classic scripts for now.
- Keep lazy-loaded feature scripts untouched.
- Keep global instances available to old code while routing new code through the bridge.
- Use tests to protect the new bootstrapping contract.

## Risks and Mitigations
### Risk: startup order regressions
Mitigation: load legacy scripts sequentially from one manifest and test the HTML entry contract.

### Risk: hidden global dependency breakage
Mitigation: do not remove globals from legacy code in Phase 1; only centralize access through a bridge.

### Risk: service worker missing new files
Mitigation: update `CORE_ASSETS` together with the new bootstrap layer.

## Success Criteria
- The app starts from one module entry in `index.html`.
- `js/main.js` no longer auto-initializes the app.
- Existing core functionality remains available through the legacy runtime.
- Browser compatibility warning still works.
- New bootstrapping tests pass.

## Evidence Base
- Native browser modules: [MDN, accessed 2026-03-31, JavaScript modules, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules]
- Import maps / static-friendly modular migration context: [MDN, accessed 2026-03-31, `<script type="importmap">`, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap]
- Cross-browser support direction: [web.dev, 2023, JavaScript import maps are now supported cross-browser, https://web.dev/blog/import-maps-in-all-modern-browsers]
