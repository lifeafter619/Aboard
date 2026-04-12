/**
 * Performance Configuration
 * 前端性能优化配置
 */

export const PERFORMANCE_CONFIG = {
    // 启用延迟加载
    enableLazyLoading: true,

    // 启用资源预加载
    enablePreloading: true,

    // 延迟加载时机(ms)
    deferLoadDelay: 100,

    // 关键资源优先级
    criticalResources: [
        'js/drawing.js',
        'js/history.js',
        'js/main.js',
        'js/background.js',
    ],

    // 按需加载的功能模块
    lazyModules: {
        // 导出功能 - 点击导出按钮时加载
        export: {
            scripts: ['js/export.js'],
            trigger: 'export-btn-click',
        },

        // Excel库 - 仅在导入/导出Excel时加载
        xlsx: {
            scripts: ['js/libs/xlsx.full.min.js'],
            trigger: 'xlsx-operation',
            size: '944KB', // 最大的库,必须延迟加载
        },

        // 计时器 - 点击计时器按钮时加载
        timer: {
            scripts: ['js/modules/timer.js'],
            trigger: 'timer-btn-click',
        },

        // 随机选择器
        randomPicker: {
            scripts: ['js/modules/random-picker.js'],
            trigger: 'random-picker-btn-click',
        },

        // 计分板
        scoreboard: {
            scripts: ['js/modules/scoreboard.js'],
            trigger: 'scoreboard-btn-click',
        },

        // 教学工具
        teachingTools: {
            scripts: ['js/modules/teaching-tools.js'],
            trigger: 'teaching-tools-btn-click',
        },

        // 形状绘制 - 选择shape工具时加载
        shape: {
            scripts: [
                'js/modules/shape-drawing.js',
                'js/shape-insertion.js'
            ],
            trigger: 'shape-tool-select',
        },

        // 文本插入 - 选择text工具时加载
        text: {
            scripts: [
                'js/modules/insert-text-manager.js',
                'js/text-insertion.js'
            ],
            trigger: 'text-tool-select',
        },
    },

    // 预加载策略
    preloadStrategy: {
        // 在浏览器空闲时预加载这些模块
        idlePreload: [
            'js/export.js',
            'js/modules/timer.js',
        ],

        // 鼠标悬停时预加载
        hoverPreload: {
            'export-btn-top': ['js/export.js'],
            'timer-btn': ['js/modules/timer.js'],
        },
    },

    // 国际化优化 - 仅加载当前语言
    i18nOptimization: {
        enabled: true,
        // 语言文件映射
        localeFiles: {
            'zh-CN': 'js/locales/zh-CN.js',
            'zh-TW': 'js/locales/zh-TW.js',
            'en-US': 'js/locales/en-US.js',
            'ja-JP': 'js/locales/ja-JP.js',
            'ko-KR': 'js/locales/ko-KR.js',
            'de-DE': 'js/locales/de-DE.js',
            'fr-FR': 'js/locales/fr-FR.js',
            'es-ES': 'js/locales/es-ES.js',
        },
    },
};

/**
 * 性能监控配置
 */
export const PERFORMANCE_METRICS = {
    // 记录关键性能指标
    trackMetrics: true,

    // 监控的指标
    metrics: [
        'FCP',  // First Contentful Paint
        'LCP',  // Largest Contentful Paint
        'FID',  // First Input Delay
        'CLS',  // Cumulative Layout Shift
        'TTFB', // Time to First Byte
    ],

    // 性能预算(ms)
    budget: {
        FCP: 1800,  // 首次内容绘制 < 1.8s
        LCP: 2500,  // 最大内容绘制 < 2.5s
        FID: 100,   // 首次输入延迟 < 100ms
        CLS: 0.1,   // 累积布局偏移 < 0.1
        TTFB: 600,  // 首字节时间 < 600ms
    },
};
