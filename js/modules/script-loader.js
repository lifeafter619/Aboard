/**
 * Script Loader Module
 * dynamically loads scripts when needed
 */
class ScriptLoader {
    static pendingLoads = new Map();

    static load(src) {
        if (this.pendingLoads.has(src)) {
            return this.pendingLoads.get(src);
        }

        const existingScript = Array.from(document.scripts).find(
            (script) => script.getAttribute('src') === src
        );

        if (existingScript?.dataset.loaded === 'true') {
            return Promise.resolve();
        }

        const promise = new Promise((resolve, reject) => {
            const script = existingScript || document.createElement('script');

            const cleanup = () => {
                script.removeEventListener('load', handleLoad);
                script.removeEventListener('error', handleError);
            };

            const handleLoad = () => {
                script.dataset.loaded = 'true';
                cleanup();
                resolve();
            };

            const handleError = () => {
                cleanup();
                this.pendingLoads.delete(src);
                if (!existingScript) {
                    script.remove();
                }
                reject(new Error(`Failed to load script: ${src}`));
            };

            script.addEventListener('load', handleLoad, { once: true });
            script.addEventListener('error', handleError, { once: true });

            if (!existingScript) {
                script.src = src;
                script.async = true;
                document.head.appendChild(script);
            }
        });

        const trackedPromise = promise.finally(() => {
            if (this.pendingLoads.get(src) === trackedPromise) {
                this.pendingLoads.delete(src);
            }
        });

        this.pendingLoads.set(src, trackedPromise);
        return trackedPromise;
    }
}

window.ScriptLoader = ScriptLoader;
