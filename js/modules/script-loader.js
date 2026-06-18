/**
 * Script Loader Module
 * dynamically loads scripts when needed
 */
class ScriptLoader {
    static pendingLoads = new Map();
    static documentRef = null;

    static toAbsoluteUrl(src, doc = this.documentRef || document) {
        return new URL(src, doc.baseURI).href;
    }

    static findExistingScript(src, doc = this.documentRef || document) {
        const targetUrl = this.toAbsoluteUrl(src, doc);
        return Array.from(doc.scripts).find((script) => {
            const scriptSrc = script.getAttribute('src');
            return scriptSrc && this.toAbsoluteUrl(scriptSrc, doc) === targetUrl;
        });
    }

    static load(src, doc = this.documentRef || document) {
        const targetUrl = this.toAbsoluteUrl(src, doc);

        if (this.pendingLoads.has(targetUrl)) {
            return this.pendingLoads.get(targetUrl);
        }

        const existingScript = this.findExistingScript(src, doc);

        if (existingScript?.dataset.loaded === 'true') {
            return Promise.resolve(existingScript);
        }

        if (existingScript && existingScript.dataset.loaded !== 'false') {
            existingScript.dataset.loaded = 'true';
            return Promise.resolve(existingScript);
        }

        const promise = new Promise((resolve, reject) => {
            const script = existingScript || doc.createElement('script');

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
                this.pendingLoads.delete(targetUrl);
                if (!existingScript || script.dataset.loaded === 'false') {
                    script.remove();
                }
                reject(new Error(`Failed to load script: ${src}`));
            };

            script.addEventListener('load', handleLoad, { once: true });
            script.addEventListener('error', handleError, { once: true });

            if (!existingScript) {
                script.dataset.loaded = 'false';
                script.src = src;
                script.async = true;
                doc.head.appendChild(script);
            }
        });

        const trackedPromise = promise.then((script) => {
            if (this.pendingLoads.get(targetUrl) === trackedPromise) {
                this.pendingLoads.delete(targetUrl);
            }
            return script;
        }, (error) => {
            if (this.pendingLoads.get(targetUrl) === trackedPromise) {
                this.pendingLoads.delete(targetUrl);
            }
            throw error;
        });

        this.pendingLoads.set(targetUrl, trackedPromise);
        return trackedPromise;
    }
}

window.ScriptLoader = ScriptLoader;
