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

export function loadClassicScript(src, { doc = document, retries = 1 } = {}) {
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

  const retryLimit = Number.isInteger(retries) && retries > 0 ? retries : 0;
  let retryCount = 0;

  const promise = new Promise((resolve, reject) => {
    const startAttempt = () => {
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
        if (retryCount < retryLimit) {
          retryCount += 1;
          startAttempt();
          return;
        }
        reject(new Error(`Failed to load legacy script after ${retryCount + 1} attempt(s): ${src}`));
      };

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });

      script.src = src;
      script.async = false;
      script.defer = true;
      script.dataset.loaded = 'false';
      doc.head.appendChild(script);
    };

    startAttempt();
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
  const results = await Promise.allSettled(
    scripts.map((src) => Promise.resolve().then(() => loadClassicScript(src, options)))
  );
  const loaded = [];
  const failures = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded.push({ src: scripts[index], script: result.value });
      return;
    }
    failures.push({ src: scripts[index], error: result.reason });
  });

  if (failures.length > 0 && !options.continueOnError) {
    const error = new Error(
      `Failed to load ${failures.length} legacy script(s): ${failures.map(({ src }) => src).join(', ')}`
    );
    error.errors = failures.map((failure) => failure.error);
    error.failures = failures;
    throw error;
  }

  return { loaded, failures, results };
}
