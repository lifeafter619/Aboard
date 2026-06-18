import { LEGACY_STARTUP_SCRIPTS } from './legacy-manifest.js';

const pendingClassicScriptLoads = new WeakMap();

function toAbsoluteUrl(doc, src) {
  return new URL(src, doc.baseURI).href;
}

function findExistingScript(doc, src) {
  const targetUrl = toAbsoluteUrl(doc, src);
  return Array.from(doc.scripts).find((script) => script.src && toAbsoluteUrl(doc, script.getAttribute('src')) === targetUrl);
}

function getPendingScriptLoadMap(doc) {
  let pendingLoads = pendingClassicScriptLoads.get(doc);
  if (!pendingLoads) {
    pendingLoads = new Map();
    pendingClassicScriptLoads.set(doc, pendingLoads);
  }
  return pendingLoads;
}

export function loadClassicScript(src, { doc = document } = {}) {
  const targetUrl = toAbsoluteUrl(doc, src);
  const pendingLoads = getPendingScriptLoadMap(doc);

  if (pendingLoads.has(targetUrl)) {
    return pendingLoads.get(targetUrl);
  }

  const existingScript = findExistingScript(doc, src);

  if (existingScript?.dataset.loaded === 'true') {
    return Promise.resolve(existingScript);
  }

  if (existingScript && existingScript.dataset.loaded !== 'false') {
    existingScript.dataset.loaded = 'true';
    return Promise.resolve(existingScript);
  }

  if (existingScript?.dataset.loaded === 'false') {
    existingScript.remove();
  }

  const promise = new Promise((resolve, reject) => {
    const script = doc.createElement('script');

    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    const handleLoad = () => {
      script.dataset.loaded = 'true';
      cleanup();
      resolve(script);
    };

    const handleError = () => {
      cleanup();
      script.remove();
      reject(new Error(`Failed to load legacy script: ${src}`));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    script.src = src;
    script.async = false;
    script.defer = true;
    script.dataset.loaded = 'false';
    doc.head.appendChild(script);
  });

  const loadPromise = promise.then((script) => {
    if (pendingLoads.get(targetUrl) === loadPromise) {
      pendingLoads.delete(targetUrl);
    }
    return script;
  }, (error) => {
    if (pendingLoads.get(targetUrl) === loadPromise) {
      pendingLoads.delete(targetUrl);
    }
    throw error;
  });

  pendingLoads.set(targetUrl, loadPromise);
  return loadPromise;
}

export async function loadLegacyScripts(scripts = LEGACY_STARTUP_SCRIPTS, options = {}) {
  await Promise.all(scripts.map((src) => loadClassicScript(src, options)));
}
