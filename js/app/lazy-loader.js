/**
 * Lazy Loader Module
 * 按需加载非关键JavaScript模块,提升首屏加载速度
 */

class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * 动态加载JS模块
     * @param {string} src - 脚本路径
     * @param {boolean} isModule - 是否为ES模块
     * @returns {Promise<void>}
     */
    loadScript(src, isModule = false) {
        // 如果已加载,直接返回
        if (this.loadedModules.has(src)) {
            return Promise.resolve();
        }

        // 如果正在加载,返回现有Promise
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            if (isModule) {
                script.type = 'module';
            }

            script.onload = () => {
                this.loadedModules.add(src);
                this.loadingPromises.delete(src);
                resolve();
            };

            script.onerror = () => {
                this.loadingPromises.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });

        this.loadingPromises.set(src, promise);
        return promise;
    }

    /**
     * 批量加载脚本
     * @param {string[]} scripts - 脚本路径数组
     * @returns {Promise<void[]>}
     */
    loadScripts(scripts) {
        return Promise.all(scripts.map(src => this.loadScript(src)));
    }

    /**
     * 预加载脚本(不执行)
     * @param {string} src - 脚本路径
     */
    preloadScript(src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = src;
        document.head.appendChild(link);
    }

    /**
     * 延迟加载非关键模块
     * @param {string[]} modules - 模块路径数组
     * @param {number} delay - 延迟时间(ms)
     */
    deferLoad(modules, delay = 0) {
        if (delay > 0) {
            setTimeout(() => this.loadScripts(modules), delay);
        } else {
            // 使用requestIdleCallback在浏览器空闲时加载
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => this.loadScripts(modules), { timeout: 2000 });
            } else {
                setTimeout(() => this.loadScripts(modules), 100);
            }
        }
    }
}

// 导出单例
window.LazyLoader = new LazyLoader();
