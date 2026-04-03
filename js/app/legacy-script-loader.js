import { LEGACY_STARTUP_SCRIPTS } from './legacy-manifest.js';

function toAbsoluteUrl(doc, src) {
  return new URL(src, doc.baseURI).href;
}

function findExistingScript(doc, src) {
  const targetUrl = toAbsoluteUrl(doc, src);
  return Array.from(doc.scripts).find((script) => script.src && toAbsoluteUrl(doc, script.getAttribute('src')) === targetUrl);
}

export function loadClassicScript(src, { doc = document } = {}) {
  const existingScript = findExistingScript(doc, src);

  if (existingScript?.dataset.loaded === 'true') {
    return Promise.resolve(existingScript);
  }

  if (existingScript?.dataset.loaded === 'false') {
    existingScript.remove();
  }

  return new Promise((resolve, reject) => {
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
}

export async function loadLegacyScripts(scripts = LEGACY_STARTUP_SCRIPTS, options = {}) {
  for (const src of scripts) {
    await loadClassicScript(src, options);
  }
}
