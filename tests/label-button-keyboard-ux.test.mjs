import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'js', 'infra', 'label-button-keyboard.js'),
  'utf8'
);
const uiListenersSource = fs.readFileSync(
  path.join(process.cwd(), 'js', 'modules', 'ui-listeners-runtime.js'),
  'utf8'
);
const insertTextSource = fs.readFileSync(
  path.join(process.cwd(), 'js', 'modules', 'insert-text-manager.js'),
  'utf8'
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
const { bindLabelButtonKeyboardSupport } = await import(moduleUrl);

function createControl(id) {
  return {
    id,
    disabled: false,
    clickCount: 0,
    click() {
      this.clickCount += 1;
    }
  };
}

function createLabel(controlId) {
  return {
    attributes: {
      role: 'button',
      for: controlId
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    closest(selector) {
      if (selector === 'label[role="button"][for]') {
        return this;
      }
      return null;
    }
  };
}

function createPlainTarget() {
  return {
    closest() {
      return null;
    }
  };
}

function createDocumentStub(controls = []) {
  const listeners = new Map();
  const byId = new Map(controls.map((control) => [control.id, control]));

  return {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    getEventHandlers(type) {
      return listeners.get(type) || [];
    },
    getElementById(id) {
      return byId.get(id) || null;
    }
  };
}

function dispatchKeydown(doc, target, key, extra = {}) {
  let prevented = false;
  const event = {
    key,
    target,
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    preventDefault() {
      prevented = true;
      this.defaultPrevented = true;
    },
    ...extra
  };

  doc.getEventHandlers('keydown').forEach((handler) => handler(event));
  return { event, prevented };
}

function testEnterAndSpaceActivateAssociatedControl() {
  const colorPicker = createControl('custom-theme-color-picker');
  const doc = createDocumentStub([colorPicker]);
  const label = createLabel('custom-theme-color-picker');

  bindLabelButtonKeyboardSupport(doc);

  const enterResult = dispatchKeydown(doc, label, 'Enter');
  const spaceResult = dispatchKeydown(doc, label, ' ');

  assert.equal(colorPicker.clickCount, 2, 'Enter and Space should both activate the associated control');
  assert.equal(enterResult.prevented, true, 'Enter activation should prevent the default browser action');
  assert.equal(spaceResult.prevented, true, 'Space activation should prevent scrolling the page');
}

function testExistingPreventDefaultOrUnsupportedTargetsDoNotDoubleTrigger() {
  const fileInput = createControl('global-font-upload');
  const doc = createDocumentStub([fileInput]);
  const label = createLabel('global-font-upload');

  bindLabelButtonKeyboardSupport(doc);

  dispatchKeydown(doc, label, 'Enter', { defaultPrevented: true });
  dispatchKeydown(doc, createPlainTarget(), 'Enter');
  dispatchKeydown(doc, label, 'Escape');

  assert.equal(fileInput.clickCount, 0, 'already-handled and unsupported keys should not trigger activation');
}

function testBindingIsIdempotentAndRespectsDisabledOrRepeatedEvents() {
  const fileInput = createControl('insert-text-font-upload');
  const doc = createDocumentStub([fileInput]);
  const label = createLabel('insert-text-font-upload');

  bindLabelButtonKeyboardSupport(doc);
  bindLabelButtonKeyboardSupport(doc);

  assert.equal(doc.getEventHandlers('keydown').length, 1, 'binding should only install one delegated keydown handler');

  fileInput.disabled = true;
  dispatchKeydown(doc, label, 'Enter');
  fileInput.disabled = false;
  dispatchKeydown(doc, label, 'Enter', { repeat: true });

  assert.equal(fileInput.clickCount, 0, 'disabled controls and repeated keydowns should not reopen system pickers');
}

function testFontUploadsUseOnlyTheDelegatedKeyboardBinding() {
  assert.doesNotMatch(uiListenersSource, /globalFontUploadTrigger\.addEventListener\(['"]keydown['"]/);
  assert.doesNotMatch(insertTextSource, /fontUploadTrigger\.addEventListener\(['"]keydown['"]/);
}

function run() {
  testEnterAndSpaceActivateAssociatedControl();
  testExistingPreventDefaultOrUnsupportedTargetsDoNotDoubleTrigger();
  testBindingIsIdempotentAndRespectsDisabledOrRepeatedEvents();
  testFontUploadsUseOnlyTheDelegatedKeyboardBinding();
  console.log('label-button-keyboard-ux.test: all assertions passed');
}

run();
