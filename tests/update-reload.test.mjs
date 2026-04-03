import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const startupPolicy = await import(pathToFileURL(path.resolve('D:/Project/Aboard/js/app/startup-update-policy.js')).href);
const plannedReload = await import(pathToFileURL(path.resolve('D:/Project/Aboard/js/app/planned-update-reload.js')).href);

const {
  UPDATE_PREFERENCES,
  STARTUP_UPDATE_ACTIONS,
  STARTUP_UPDATE_USER_CHOICES,
  resolveStartupUpdateAction,
  shouldContinuePostVisibleStartup
} = startupPolicy;

const {
  normalizePlannedUpdateMode,
  createPlannedUpdateIntent,
  parsePlannedUpdateIntent,
  shouldApplyIdleUpdate,
  PLANNED_UPDATE_MODES
} = plannedReload;

const tests = [
  {
    name: 'startup update actions no longer expose legacy activate path',
    run() {
      assert.deepEqual(
        Object.keys(STARTUP_UPDATE_ACTIONS).sort(),
        ['CONTINUE', 'PROMPT']
      );
    }
  },
  {
    name: 'startup update gate prompts even for immediate-preference users when a newer version exists',
    run() {
      assert.equal(
        resolveStartupUpdateAction({
          currentVersion: '1.0.0',
          latestVersion: '1.0.1',
          updatePreference: UPDATE_PREFERENCES.AUTO,
          hasWaitingWorker: false
        }),
        STARTUP_UPDATE_ACTIONS.PROMPT
      );
    }
  },
  {
    name: 'startup continues post-visible work when the user chooses idle refresh',
    run() {
      assert.equal(
        shouldContinuePostVisibleStartup({
          action: STARTUP_UPDATE_ACTIONS.PROMPT,
          userChoice: STARTUP_UPDATE_USER_CHOICES.IDLE
        }),
        true
      );
    }
  },
  {
    name: 'startup stops post-visible work when the user chooses immediate refresh',
    run() {
      assert.equal(
        shouldContinuePostVisibleStartup({
          action: STARTUP_UPDATE_ACTIONS.PROMPT,
          userChoice: STARTUP_UPDATE_USER_CHOICES.IMMEDIATE
        }),
        false
      );
    }
  },
  {
    name: 'planned update intent parsing rejects invalid payloads',
    run() {
      assert.equal(parsePlannedUpdateIntent('{bad json'), null);
      assert.equal(parsePlannedUpdateIntent(JSON.stringify({ mode: 'later' })), null);
    }
  },
  {
    name: 'planned update intent creation normalizes mode and marks update reason',
    run() {
      const intent = createPlannedUpdateIntent({ mode: 'immediate', latestVersion: '2.0.0' });
      assert.equal(intent.mode, PLANNED_UPDATE_MODES.IMMEDIATE);
      assert.equal(intent.reason, 'update');
      assert.equal(intent.latestVersion, '2.0.0');
      assert.ok(typeof intent.createdAt === 'number');
    }
  },
  {
    name: 'planned update mode defaults to idle for unknown values',
    run() {
      assert.equal(normalizePlannedUpdateMode('unknown'), PLANNED_UPDATE_MODES.IDLE);
    }
  },
  {
    name: 'idle update only applies after enough inactivity and with no busy flags',
    run() {
      const now = 20_000;
      assert.equal(
        shouldApplyIdleUpdate({
          now,
          idleMs: 15_000,
          activity: {
            lastActivityAt: 1_000,
            isDrawing: false,
            isPinching: false,
            isDraggingPanel: false,
            isModalBusy: false,
            isSelectionBusy: false,
            isTextInputBusy: false,
            isMediaTransformBusy: false,
            isTeachingToolBusy: false
          }
        }),
        true
      );

      assert.equal(
        shouldApplyIdleUpdate({
          now,
          idleMs: 15_000,
          activity: {
            lastActivityAt: 10_000,
            isDrawing: false,
            isPinching: false,
            isDraggingPanel: false,
            isModalBusy: false,
            isSelectionBusy: false,
            isTextInputBusy: false,
            isMediaTransformBusy: false,
            isTeachingToolBusy: false
          }
        }),
        false
      );

      assert.equal(
        shouldApplyIdleUpdate({
          now,
          idleMs: 15_000,
          activity: {
            lastActivityAt: 1_000,
            isDrawing: true,
            isPinching: false,
            isDraggingPanel: false,
            isModalBusy: false,
            isSelectionBusy: false,
            isTextInputBusy: false,
            isMediaTransformBusy: false,
            isTeachingToolBusy: false
          }
        }),
        false
      );
    }
  }
];

let passed = 0;
for (const testCase of tests) {
  try {
    await testCase.run();
    console.log(`PASS ${testCase.name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  console.log(`All ${passed} tests passed.`);
}
