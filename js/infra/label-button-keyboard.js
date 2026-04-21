const LABEL_BUTTON_BINDING_FLAG = '__aboardLabelButtonKeyboardSupportBound';

function isActivationKey(key) {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

function findActivatableLabel(target) {
  if (!target || typeof target.closest !== 'function') {
    return null;
  }

  const label = target.closest('label[role="button"][for]');
  return label && typeof label.getAttribute === 'function' ? label : null;
}

function resolveAssociatedControl(doc, label) {
  const controlId = label?.getAttribute?.('for');
  if (!controlId || typeof doc?.getElementById !== 'function') {
    return null;
  }

  return doc.getElementById(controlId);
}

function shouldSkipKeyboardActivation(event) {
  return event.defaultPrevented
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || !isActivationKey(event.key);
}

export function bindLabelButtonKeyboardSupport(doc = document) {
  if (!doc || doc[LABEL_BUTTON_BINDING_FLAG]) {
    return;
  }

  doc[LABEL_BUTTON_BINDING_FLAG] = true;
  doc.addEventListener('keydown', (event) => {
    if (shouldSkipKeyboardActivation(event)) {
      return;
    }

    const label = findActivatableLabel(event.target);
    if (!label) {
      return;
    }

    const control = resolveAssociatedControl(doc, label);
    if (!control || control.disabled) {
      return;
    }

    event.preventDefault();
    if (event.repeat) {
      return;
    }

    if (typeof control.click === 'function') {
      control.click();
      return;
    }

    if (typeof label.click === 'function') {
      label.click();
    }
  });
}
