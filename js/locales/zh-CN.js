/**
 * Chinese (Simplified) - 中文简体
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: '确定',
        cancel: '取消',
        close: '关闭',
        save: '保存',
        delete: '删除',
        edit: '编辑',
        add: '添加',
        remove: '移除',
        yes: '是',
        no: '否',
        ok: '好的',
        apply: '应用',
        reset: '重置',
        start: '开始',
        stop: '停止',
        preview: '预览',
        settings: '设置',
        dragToMove: '拖动以移动',
        restoreSize: '\u6062\u590d\u5927\u5c0f',
        keepCentered: '\u4fdd\u6301\u5c45\u4e2d'
    },

    // Recovery dialog
    recovery: {
        title: '恢复上次内容',
        message: '检测到上次使用时的画布内容，是否恢复？',
        restore: '恢复',
        discard: '放弃'
    },

    // App Title
    app: {
        title: 'Aboard - 简约白板',
        name: 'Aboard',
        rotateScreenTitle: '请旋转屏幕',
        rotateScreenTip: '检测到当前为竖屏模式。为获得正常排版与完整工具栏，请横屏使用。'
    },

    // Toolbar
    toolbar: {
        undo: '撤销',
        redo: '重做',
        pen: '笔',
        shape: '形状',
        move: '移动',
        select: '选择',
        eraser: '擦除',
        clear: '清空',
        background: '背景',
        teachingTools: '教具',
        more: '更多',
        settings: '设置',
        export: '导出画布',
        zoomOut: '缩小 (-)',
        zoomIn: '放大 (+)',
        fullscreen: '全屏 (F11)',
        exitFullscreen: '退出全屏 (F11)',
        zoomPlaceholder: '缩放比例 (输入百分比)'
    },

    // Tools
    tools: {
        pen: {
            title: '笔',
            type: '笔触类型',
            normal: '普通笔',
            pencil: '铅笔',
            ballpoint: '圆珠笔',
            fountain: '钢笔',
            brush: '毛笔',
            marker: '马克笔',
            color: '颜色',
            colorAndSize: '颜色与粗细',
            colorPicker: '取色器',
            size: '线条粗细',
            thickness: '笔粗细',
            sizeLabel: '线条粗细：当前',
            sizePx: 'px'
        },
        shape: {
            title: '形状',
            type: '形状类型',
            line: '直线',
            rectangle: '矩形',
            circle: '圆形',
            ellipse: '椭圆',
            arrow: '箭头',
            doubleArrow: '双箭头',
            arrowSize: '箭头大小',
            hint: '按住拖动绘制形状，松开完成',
            lineProperties: '线条属性'
        },
        eraser: {
            title: '擦除',
            type: '擦除类型',
            normal: '普通擦除',
            pixel: '像素擦除',
            size: '擦除大小',
            sizeLabel: '擦除大小：当前',
            shape: '形状',
            shapeCircle: '圆形',
            shapeRectangle: '方形'
        },
        clear: {
            title: '清空画布',
            confirm: '确认清空',
            message: '确定要清空画布吗？此操作无法撤销。'
        },
        refresh: {
            warning: '刷新后画布内容将清空且无法恢复，确定要刷新吗？'
        },
        lineStyle: {
            title: '线条样式',
            solid: '实线',
            dashed: '虚线',
            dotted: '点线',
            wavy: '波浪线',
            double: '双线',
            triple: '三线',
            multiLine: '多线',
            arrow: '箭头',
            doubleArrow: '双箭头',
            noArrow: '无箭头',
            arrowType: '箭头类型',
            dashDensity: '虚线密度',
            waveDensity: '波浪密度',
            lineSpacing: '线条间距',
            lineCount: '线条数量'
        },
        text: {
            insertTitle: '插入文字',
            editTitle: '编辑文字',
            placeholder: '在此输入文字',
            size: '大小',
            color: '颜色',
            font: '字体',
            style: '样式',
            bold: '粗体',
            italic: '斜体',
            underline: '下划线',
            strikethrough: '删除线',
            decorationStyle: '线型',
            decorationWidth: '线条粗细',
            decorationColor: '线条颜色',
            uploadFont: '上传字体',
            customFonts: '自定义字体',
            fontUploadSuccess: '字体上传成功！',
            fontExists: '该字体已存在。',
            invalidFontFormat: '无效的字体格式。请使用 TTF、OTF、WOFF 或 WOFF2 文件。',
            fontTooLarge: '字体文件过大，最大允许 2MB。',
            storageQuotaExceeded: '存储空间不足，请删除一些自定义字体。'
        },
        select: {
            mode: '选择模式',
            clickMode: '点选',
            rectMode: '框选',
            lassoMode: '套索',
            transform: '变换',
            rotate90: '旋转90°',
            flipH: '水平翻转',
            flipV: '垂直翻转'
        }
    },

    selection: {
        edit: '编辑',
        copy: '复制',
        delete: '删除',
        done: '完成',
        rotate90: '旋转90°',
        flipH: '水平翻转',
        layer: '图层',
        layerFront: '置于顶层',
        layerBack: '置于底层',
        layerUp: '上移一层',
        layerDown: '下移一层',
        group: '组合',
        ungroup: '取消组合',
        position: '位置'
    },

    // Line Style Modal
    lineStyleModal: {
        title: '线条样式设置',
        openSettings: '更多设置',
        preview: '预览'
    },

    // Time Display
    timeDisplay: {
        options: '时间显示选项',
        showDate: '显示日期',
        showTime: '显示时间',
        settings: '设置'
    },

    // Background
    background: {
        title: '背景',
        color: '背景颜色',
        pattern: '背景图案',
        blank: '空白',
        none: '无',
        dots: '点阵',
        grid: '方格',
        lines: '线条',
        tianzige: '田字格',
        english4line: '英语四线格',
        musicStaff: '五线谱',
        coordinate: '坐标系',
        polar: '极坐标',
        coordinateOriginHint: '在移动模式下双击选中坐标系中心可拖动移动',
        image: '上传图片',
        imagePrefix: '图片',
        density: '密度',
        densityLabel: '密度：当前',
        size: '大小',
        sizeLabel: '大小：当前',
        opacity: '背景透明度',
        opacityLabel: '背景透明度：当前',
        opacityHint: '调整背景的透明度,100%为完全不透明',
        contrast: '对比度',
        contrastLabel: '图案透明度：当前',
        contrastHint: '调整背景图案线条的明暗程度',
        preference: '背景图案偏好',
        preferenceHint: '选择在属性栏中显示的图案',
        upload: '上传',
        moveCoordinateOrigin: '移动坐标原点',
        moveCoordinateOriginHint: '点击按钮后，可在画布上拖动移动坐标原点',
        coordinateTools: '坐标设置',
        showTicks: '显示刻度',
        showLabels: '显示标签',
        showPointLabels: '显示点标签',
        connectPoints: '点间连线',
        snapToGrid: '吸附网格',
        addPoint: '取点',
        drawPointLine: '绘制点线',
        pointLineModeLineOnly: '仅绘制线',
        pointLineModeAuto: '自动连线',
        pointLineModeSelected: '选择连线',
        addPointHint: '开启后点击画布依次添加坐标点并自动连线',
        addPointHintLineOnly: '开启后点击画布依次添加坐标点，仅绘制折线',
        addPointHintAuto: '开启后点击画布依次添加坐标点并自动连线',
        addPointHintSelected: '开启后点击画布添加坐标点；切到选择工具后，仅选中的点会连线',
        clearPoints: '清空点',
        clearPlots: '清空图像',
        pointsCount: '点数',
        plotExpression: '函数表达式',
        plot: '绘制',
        inputPanel: '输入面板',
        keypadNumbers: '数字',
        keypadOperators: '符号',
        keypadVariables: '变量',
        keypadFunctions: '函数',
        plotHintCartesian: '直角坐标：输入 y = f(x)，可用 sin cos PI',
        plotHintPolar: '极坐标：输入 r = f(theta)，theta 为弧度，deg 为角度',
        plotPlaceholderCartesian: '如：sin(x) + 2',
        plotPlaceholderPolar: '如：2 * sin(4 * theta)',
        noPlots: '暂无函数图像',
        coordinateStatusAddPoint: '绘制点线模式已开启，点击画布依次添加坐标点',
        coordinateStatusAddPointLineOnly: '仅绘制线模式已开启，点击画布依次添加坐标点',
        coordinateStatusAddPointAuto: '自动连线模式已开启，点击画布依次添加坐标点',
        coordinateStatusAddPointSelected: '选择连线模式已开启，点击画布添加坐标点',
        coordinateStatusAddPointOff: '绘制点线模式已关闭',
        pointAdded: '已添加坐标点',
        pointsCleared: '坐标点已清空',
        plotAdded: '函数图像已添加',
        plotUpdated: '函数图像已更新',
        plotError: '表达式无效，无法绘制',
        plotsCleared: '函数图像已清空'
    },

    // Image Controls
    imageControls: {
        confirm: '确定',
        cancel: '取消',
        flipHorizontal: '水平翻转',
        flipVertical: '垂直翻转',
        rotate: '旋转'
    },

    // Selection Controls
    selection: {
        copy: '复制',
        delete: '删除',
        done: '完成',
        edit: '编辑',
        rotate90: '旋转90°',
        flipH: '水平翻转',
        layer: '图层',
        layerFront: '置于顶层',
        layerBack: '置于底层',
        layerUp: '上移一层',
        layerDown: '下移一层',
        group: '组合',
        ungroup: '取消组合',
        position: '位置'
    },

    // Page Navigation
    page: {
        previous: '上一页',
        next: '下一页',
        jumpPlaceholder: '输入页码跳转',
        of: ' / ',
        newPage: '新建页面'
    },

    // Settings
    settings: {
        title: '设置',
        exportSuccess: '配置已成功导出！',
        exportFailed: '导出配置失败',
        importSuccess: '配置已导入',
        importError: '配置文件无效',
        importNoChange: '没有检测到配置变更',
        diff: {
            current: '当前',
            new: '新',
            title: '导入配置确认',
            message: '检测到以下设置将被更改：',
            oldValue: '旧值',
            newValue: '新值',
            confirm: '确认',
            cancel: '取消'
        },
        tabs: {
            general: '通用',
            display: '显示',
            pen: '笔',
            eraser: '橡皮',
            canvas: '画布',
            background: '背景',
            about: '关于',
            announcement: '公告',
            more: '更多'
        },
        display: {
            title: '显示设置',
            theme: '主题',
            themeHint: '选择应用主题',
            themeColor: '主题色',
            showZoomControls: '显示缩放控件',
            showZoomControlsHint: '勾选后，在画布上方显示缩放控件',
            showImportExportBtn: '显示导入导出按钮',
            showImportExportBtnHint: '勾选后，在缩放控件旁显示导入导出按钮',
            showFullscreenBtn: '显示全屏按钮',
            showFullscreenBtnHint: '勾选后，在缩放控件旁显示全屏按钮',
            toolbarSize: '工具栏大小',
            toolbarSizeLabel: '工具栏大小：当前',
            toolbarSizeHint: '调整底部工具栏的大小',
            configScale: '属性栏大小',
            configScaleLabel: '属性栏大小：当前',
            configScaleHint: '调整弹出具体属性面板的大小',
            showToolbarText: '显示工具栏文字',
            showToolbarTextHint: '是否在工具栏按钮中显示文字标签',
            themeColorHint: '工具栏被选中时的颜色',
            colorOptions: {
                blue: '蓝色',
                purple: '紫色',
                green: '绿色',
                orange: '橙色',
                red: '红色',
                pink: '粉色',
                cyan: '青色',
                yellow: '黄色'
            },
            colorPicker: '取色器'
        },
        general: {
            title: '通用设置',
            language: '语言',
            languageHint: '选择界面语言',
            globalFont: '全局字体',
            globalFontHint: '选择应用程序使用的字体',
            fontManagementHint: '字体管理：支持排序、显示开关、重命名与预览',
            showFont: '显示字体',
            fontPreviewSample: '中文字体预览 ABC abc 123',
            fonts: {
                system: '系统默认',
                serif: '宋体（衬线体）',
                sansSerif: '黑体（无衬线体）',
                monospace: '等宽字体',
                cursive: '手写体',
                notoSansSC: '思源黑体',
                notoSerifSC: '思源宋体',
                lxgwWenKai: '霞鹜文楷',
                sourceHanSansSC: '思源黑体 CN',
                sourceHanSerifSC: '思源宋体 CN',
                inter: 'Inter',
                roboto: 'Roboto',
                openSans: 'Open Sans',
                lora: 'Lora',
                jetBrainsMono: 'JetBrains Mono',
                kaiTi: '楷体',
                stXingkai: '华文行楷（手写）',
                // 中文字体
                yahei: '微软雅黑',
                simsun: '宋体',
                simhei: '黑体',
                kaiti: '楷体',
                fangsong: '仿宋',
                // 常见英文字体
                arial: 'Arial',
                helvetica: 'Helvetica',
                timesNewRoman: 'Times New Roman',
                courier: 'Courier New',
                verdana: 'Verdana',
                georgia: 'Georgia',
                trebuchet: 'Trebuchet MS',
                impact: 'Impact'
            },
            edgeSnap: '启用边缘吸附',
            edgeSnapHint: '拖动控制面板时自动吸附到屏幕边缘',
            touchZoom: '触控缩放',
            touchZoomHint: '允许双指捏合缩放画布',
            morePanelBehaviorLabel: '更多功能面板行为',
            keepMorePanelOpenHint: '点击“更多”中的功能按钮后默认不关闭“更多”框',
            // Toolbar customization
            toolbarCustomization: '工具栏自定义',
            toolbarCustomizationHint: '选择要在工具栏中显示的工具，拖动可调整顺序',
            toolbarTools: {
                undo: '撤销',
                redo: '重做',
                pen: '笔',
                move: '移动',
                select: '选择',
                eraser: '擦除',
                clear: '清空',
                background: '背景',
                more: '更多',
                settings: '设置'
            },
            // Control button settings
            controlButtonSettings: '控制按钮设置',
            controlButtonSettingsHint: '选择要显示的控制按钮，拖动调整顺序',
            controlButtons: {
                zoom: '缩放按钮',
                pagination: '分页按钮',
                time: '时间显示',
                fullscreen: '全屏按钮',
                import: '导入按钮',
                export: '导出按钮'
            },
            controlPosition: '控制按钮位置',
            controlPositionHint: '选择缩放和分页控件在屏幕上的显示位置',
            positionTopLeft: '左上角',
            positionTopRight: '右上角',
            positionBottomLeft: '左下角',
            positionBottomRight: '右下角',
            canvasMode: '画布模式',
            canvasModeHint: '选择画布的显示模式',
            pagination: '分页模式',
            infiniteCanvas: '无限画布',
            autoSave: '自动保存',
            autoSaveHint: '定期保存您的绘图内容'
        },
        canvas: {
            title: '画布设置',
            mode: '画布模式',
            modeHint: '选择画布的显示模式',
            size: '画布尺寸',
            sizeHint: '选择预设尺寸或自定义画布比例和大小',
            unlimitedZoom: '允许无限放大',
            unlimitedZoomHint: '勾选后，画布可以无限放大（最高500倍）',
            infiniteCanvas: '无限画布',
            pagination: '分页模式',
            presets: {
                a4Portrait: 'A4 竖向',
                a4Landscape: 'A4 横向',
                a3Portrait: 'A3 竖向',
                a3Landscape: 'A3 横向',
                b5Portrait: 'B5 竖向',
                b5Landscape: 'B5 横向',
                widescreen: '16:9 宽屏',
                standard: '4:3 标准',
                custom: '自定义'
            },
            customSize: {
                portrait: '竖向',
                landscape: '横向',
                width: '宽度',
                height: '高度',
                ratio: '比例',
                ratios: {
                    custom: '自定义',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (竖向)',
                    '9:16': '9:16 (竖向)'
                }
            }
        },
        background: {
            title: '背景设置',
            opacity: '背景透明度',
            opacityLabel: '背景透明度：当前',
            opacityHint: '调整背景的透明度,100%为完全不透明',
            patternIntensity: '图案透明度',
            patternIntensityLabel: '图案透明度：当前',
            patternIntensityHint: '调整背景图案线条的明暗程度',
            preference: '背景图案偏好',
            preferenceHint: '选择在属性栏中显示的图案'
        },
        announcement: {
            title: '公告',
            welcome: '欢迎使用 Aboard！',
            content: [
            '**欢迎使用 Aboard 白板应用！**',
                '',
            '[color=#007AFF]使用提示：[/color]',
                '• 点击底部工具栏选择不同工具进行绘画',
            '• 使用 **Ctrl+Z** 撤销，**Ctrl+Y** 重做',
                '• 点击右上角缩放按钮或使用鼠标滚轮缩放画布',
                '• 点击背景按钮可以选择不同的背景图案',
                '• 在设置中可以切换无限画布或分页模式',
                '• 支持触控和鼠标操作',
                '',
            '[color=#007AFF]链接：[/color]',
                '• GitHub 项目：https://github.com/lifeafter619/Aboard',
                '• 作者博客：https://66619.eu.org',
                '',
            '[size=16px]**祝您使用愉快！**[/size]'
            ]
        },
        about: {
            title: '关于 Aboard',
            projectIntro: '项目简介',
            description1: 'Aboard 是一个简约的网页白板应用，专为教学和演示设计。',
            description2: '它提供了流畅的绘图体验和丰富的背景选项，让您的创意自由展现。',
            mainFeatures: '主要功能',
            features: {
                penTypes: '多种笔触类型（普通笔、铅笔、圆珠笔、钢笔、毛笔）',
                smartEraser: '智能橡皮擦（支持圆形和方形）',
                richPatterns: '丰富的背景图案（点阵、方格、田字格、英语四线格等）',
                adjustable: '可调节的图案密度和透明度',
                canvasModes: '无限画布和分页模式（支持A4、A3、B5等预设尺寸）',
                customSize: '自定义画布尺寸和比例',
                draggable: '可拖动的工具栏和属性面板（支持垂直布局）',
                undoRedo: '撤销/重做功能（支持最多50步）',
                smartZoom: '智能缩放（Ctrl+滚轮，缩放至鼠标位置）',
                responsive: '响应式界面，适配不同屏幕尺寸'
            },
            techStack: '技术栈',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: '开源协议',
            licenseType: 'MIT License',
            github: 'GitHub',
            version: '版本'
        },
        more: {
            title: '更多设置',
            cacheCleanupLabel: '缓存清理',
            cacheCleanupHint: '可查看缓存占用并按类别清理（清理前会二次确认）',
            clearSettingsCache: '清除设置项缓存',
            clearCanvasCache: '清除画布缓存',
            clearOtherCache: '清除其他缓存',
            cacheSizeCalculating: '计算中...',
            clearSelectedCache: '清理所选缓存',
            morePanelBehaviorLabel: '更多功能面板行为',
            keepMorePanelOpenHint: '点击“更多”中的功能按钮后默认不关闭“更多”框',
            selectCacheType: '请先选择要清理的缓存类型',
            confirmClearTitle: '\u786e\u8ba4\u6e05\u7406',
            confirmClearSelectedCache: '\u8bf7\u9009\u62e9\u8981\u6e05\u7406\u7684\u7f13\u5b58\u9879\uff1a',
            clearLocalDataConfirmSuffix: '确定继续吗？',
            showTimeDisplay: '显示时间和日期',
            showTimeDisplayHint: '在右上角显示当前时间和日期',
            localDataLabel: '本地数据',
            localDataHint: '清空本地缓存、画布内容和设置，并恢复首次加载状态',
            clearLocalDataButton: '清空本地缓存',
            clearLocalDataConfirm: '此操作会清空本地缓存、画布内容和设置，并恢复为首次加载状态。确定继续吗？'
        },
        time: {
            title: '时间显示设置',
            showDate: '显示日期',
            showTime: '显示时间',
            timezone: '时区',
            timezoneHint: '选择要显示的时区',
            timeFormat: '时间格式',
            timeFormatHint: '选择时间的显示格式',
            timeFormat12: '12小时制 (上午/下午)',
            timeFormat24: '24小时制',
            dateFormat: '日期格式',
            dateFormatHint: '选择日期的显示格式',
            dateFormatAuto: '自动 (跟随系统)',
            dateFormatYMD: '年-月-日 (2024-01-01)',
            dateFormatMDY: '月-日-年 (01-01-2024)',
            dateFormatDMY: '日-月-年 (01-01-2024)',
            dateFormatChinese: '中文 (2024年1月1日)',
            colorSettings: '颜色设置',
            colorSettingsHint: '设置时间显示的字体和背景颜色',
            colorHint: '设置时间显示的字体和背景颜色',
            textColor: '字体颜色',
            bgColor: '背景颜色',
            fontSize: '字体大小',
            fontSizeLabel: '字体大小：当前',
            fontSizeHint: '调整时间显示的字体大小',
            opacity: '透明度',
            opacityLabel: '透明度：当前',
            opacityHint: '调整时间显示的透明度',
            fullscreenMode: '全屏模式',
            fullscreenModeHint: '选择如何触发时间全屏显示',
            fullscreenDisabled: '关闭',
            fullscreenSingle: '单击',
            fullscreenDouble: '双击',
            fullscreenFontSize: '全屏字体大小',
            fullscreenFontSizeLabel: '全屏字体大小：当前',
            fullscreenFontSizeHint: '调整全屏时间显示的字体大小，范围10%-85%',
            customColor: '自定义颜色',
            displayOptions: '显示选项'
        }
    },

    // Feature Area
    features: {
        title: '小功能',
        moreFeatures: '更多功能',
        time: '时间',
        timer: '计时',
        randomPicker: '点名器',
        scoreboard: '计分板',
        insertImage: '插入图片',
        insertText: '插入文字'
    },

    // Random Picker
    randomPicker: {
        namePicker: '姓名点名器',
        numberPicker: '数字点名器',
        noNames: '请添加名单',
        settingsTitle: '点名器设置',
        modeName: '姓名模式',
        modeNumber: '数字模式',
        titleLabel: '标题',
        titlePlaceholder: '自定义标题（可选）',
        namesLabel: '名单列表（每行一个）',
        namesPlaceholder: '张三\n李四\n王五',
        defaultNames: '张三\n李四\n王五\n赵六\n孙七',
        allowRepeats: '允许重复抽取',
        rangeLabel: '数字范围',
        importLabel: '导入名单 (Excel/CSV)',
        defaultColumnName: '姓名',
        importBtn: '选择文件导入',
        importHint: '提示：自动读取表格中对应列名的内容',
        importSuccess: '成功导入 {count} 个名字',
        importNoData: '未找到指定列的数据，请检查列名设置',
        importError: '文件解析失败'
    },

    // Scoreboard
    scoreboard: {
        title: '计分板',
        addTeam: '添加队伍',
        reset: '重置分数',
        confirmRemoveTeam: '确定要移除这个队伍吗？',
        teamDefault: '队伍',
        removeTeam: '删除队伍',
        confirmReset: '确定要重置所有分数吗？'
    },

    // Teaching Tools
    teachingTools: {
        title: '教具',
        ruler: '直尺',
        rulerStyle1: '直尺 1',
        rulerStyle2: '直尺 2',
        setSquare: '三角板',
        setSquare60: '三角板 60°',
        setSquare45: '三角板 45°',
        hint: '提示：单击移动，双击调整大小、旋转和删除',
        insertHint: '选择要插入的教具数量',
        currentOnCanvas: '画布上当前数量',
        addNew: '新增',
        rotate: '旋转',
        resize: '调整大小',
        delete: '删除',
        drawAlongEdge: '沿边缘画线'
    },

    // Time Display
    timeDisplay: {
        title: '时间显示',
        settingsTitle: '时间显示设置',
        options: '时间显示选项',
        showDate: '显示日期',
        showTime: '显示时间',
        settings: '设置',
        am: '上午',
        pm: '下午',
        fullscreenDisplay: '全屏显示',
        displayOptions: '显示选项',
        dateAndTime: '日期和时间',
        dateOnly: '仅日期',
        timeOnly: '仅时间',
        timezone: '时区',
        timeFormat: '时间格式',
        dateFormat: '日期格式',
        colorSettings: '颜色设置',
        textColor: '字体颜色',
        bgColor: '背景颜色',
        fontSize: '字体大小',
        fontSizeLabel: '字体大小：当前',
        opacity: '透明度',
        opacityLabel: '透明度：当前',
        fullscreenMode: '全屏模式',
        fullscreenColorSettings: '全屏颜色设置',
        fullscreenFontSize: '全屏字体大小',
        fullscreenFontSizeLabel: '全屏字体大小：当前',
        fullscreenFontSizeHint: '调整全屏时间显示的字体大小，范围10%-85%',
        fullscreenSliderLabel: '字体大小调节 (10%-85%)',
        titleFontSize: '标题/日期字体大小',
        timeFontSize: '时间字体大小',
        customColor: '自定义颜色',
        transparent: '透明',
        fullscreenDisabled: '关闭',
        fullscreenSingle: '单击',
        fullscreenDouble: '双击'
    },

    // Timer
    timer: {
        title: '计时器',
        settingsTitle: '计时器设置',
        mode: '模式',
        selectMode: '选择模式',
        countdown: '倒计时',
        stopwatch: '正计时',
        duration: '设置总时间',
        hours: '小时',
        minutes: '分钟',
        seconds: '秒',
        timerTitle: '计时器标题（可选）',
        titlePlaceholder: '例如：课堂演讲、考试时间等',
        setTime: '设置时间',
        setStartTime: '设置开始时间',
        titleFontSize: '标题字体大小',
        timeFontSize: '时间字体大小',
        fontSettings: '字体设置',
        fontSize: '字体大小',
        fontSizeLabel: '字体大小：当前',
        minimal: '最简',
        minimalMode: '最简显示 (双击恢复)',
        adjustColor: '调整颜色',
        colorSettings: '颜色设置',
        textColor: '字体颜色',
        bgColor: '背景颜色',
        opacity: '透明度',
        opacityLabel: '透明度：当前',
        fullscreenFontSize: '全屏字体大小',
        fullscreenFontSizeLabel: '全屏字体大小：当前',
        soundSettings: '声音设置',
        playSound: '倒计时结束时播放提示音',
        preview: '预览',
        moreSettings: '更多设置',
        playbackSpeed: '播放倍速',
        loopPlayback: '循环播放',
        loopCount: '循环次数',
        loopInterval: '循环间隔',
        seconds: '秒',
        uploadCustomAudio: '上传自定义音频',
        soundPresets: {
            classBell: '开始铃声(10s)',
            examEnd: '考试结束(4s)',
            gentle: '柔和(17s)',
            digitalBeep: '结束铃声(4s)'
        },
        colors: {
            black: '黑色',
            white: '白色',
            blue: '蓝色',
            red: '红色',
            green: '绿色',
            yellow: '黄色',
            orange: '橙色',
            purple: '紫色',
            transparent: '透明',
            darkGray: '深灰（默认）',
            lightGray: '浅灰',
            lightRed: '浅红',
            lightBlue: '浅蓝',
            lightGreen: '浅绿',
            lightYellow: '浅黄',
            lightOrange: '浅橙',
            whiteDefault: '白色（默认）'
        },
        customColor: '自定义颜色',
        start: '开始',
        adjust: '调整',
        continue: '继续',
        pause: '暂停',
        reset: '重置',
        stop: '停止',
        alertSetTime: '请设置倒计时时间',
        alertTitle: '提示'
    },

    // Export
    export: {
        selectAtLeastOnePage: '请至少选择一页',
        paginationRequired: '需要分页',
        noPages: '没有可用页面'
    },

    // Timezone names
    timezones: {
        'china': '中国 (UTC+8)',
        'newyork': '纽约 (UTC-5/-4)',
        'losangeles': '洛杉矶 (UTC-8/-7)',
        'chicago': '芝加哥 (UTC-6/-5)',
        'london': '伦敦 (UTC+0/+1)',
        'paris': '巴黎 (UTC+1/+2)',
        'berlin': '柏林 (UTC+1/+2)',
        'tokyo': '东京 (UTC+9)',
        'seoul': '首尔 (UTC+9)',
        'hongkong': '香港 (UTC+8)',
        'singapore': '新加坡 (UTC+8)',
        'dubai': '迪拜 (UTC+4)',
        'sydney': '悉尼 (UTC+10/+11)',
        'auckland': '奥克兰 (UTC+12/+13)',
        'utc': 'UTC (协调世界时)'
    },

    // Welcome Dialog
    welcome: {
        title: '欢迎使用 Aboard',
        content: `欢迎使用 Aboard 白板应用！

使用提示：
• 点击底部工具栏选择不同工具进行绘画
• 使用 Ctrl+Z 撤销，Ctrl+Y 重做
• 点击右上角缩放按钮或使用鼠标滚轮缩放画布
• 点击背景按钮可以选择不同的背景图案
• 在设置中可以切换无限画布或分页模式
• 支持触控和鼠标操作

祝您使用愉快！`,
        confirm: '确定',
        noShowAgain: '不再弹出'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: '确认清空',
        message: '确定要清空当前画布吗？此操作无法撤销，其他画布不受影响。',
        confirm: '确定',
        cancel: '取消'
    },

    // Color names
    colors: {
        black: '黑色',
        red: '红色',
        blue: '蓝色',
        green: '绿色',
        yellow: '黄色',
        orange: '橙色',
        purple: '紫色',
        white: '白色',
        transparent: '透明'
    },

    // Days of week
    days: {
        sunday: '星期日',
        monday: '星期一',
        tuesday: '星期二',
        wednesday: '星期三',
        thursday: '星期四',
        friday: '星期五',
        saturday: '星期六'
    }
};
