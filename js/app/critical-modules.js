/**
 * Critical Modules Configuration
 * 定义关键模块和非关键模块,用于优化加载策略
 */

export const CRITICAL_MODULES = [
    // 核心绘图引擎
    'js/drawing.js',
    'js/history.js',

    // 基础UI
    'js/main.js',

    // 国际化(仅加载当前语言)
    // 'js/modules/i18n.js' - 由bootstrap动态加载
];

export const DEFERRED_MODULES = [
    // 导出功能(首次使用时加载)
    'js/export.js',

    // 高级功能
    'js/modules/timer.js',
    'js/modules/random-picker.js',
    'js/modules/scoreboard.js',
    'js/modules/teaching-tools.js',

    // 形状绘制(使用shape工具时加载)
    'js/modules/shape-drawing.js',
    'js/shape-insertion.js',

    // 文本插入(使用text工具时加载)
    'js/modules/insert-text-manager.js',
    'js/text-insertion.js',
];

export const LAZY_MODULES = {
    // 按功能分组的延迟加载模块
    export: ['js/export.js'],
    timer: ['js/modules/timer.js'],
    randomPicker: ['js/modules/random-picker.js'],
    scoreboard: ['js/modules/scoreboard.js'],
    teachingTools: ['js/modules/teaching-tools.js'],
    shape: ['js/modules/shape-drawing.js', 'js/shape-insertion.js'],
    text: ['js/modules/insert-text-manager.js', 'js/text-insertion.js'],
    xlsx: ['js/libs/xlsx.full.min.js'], // 仅在导入/导出Excel时加载
};
