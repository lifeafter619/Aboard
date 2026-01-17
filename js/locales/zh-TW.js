/**
 * Chinese (Traditional) - 中文繁體
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: '確定',
        cancel: '取消',
        close: '關閉',
        save: '儲存',
        delete: '刪除',
        edit: '編輯',
        add: '新增',
        remove: '移除',
        yes: '是',
        no: '否',
        ok: '好的',
        apply: '套用',
        reset: '重置'
    },

    // App Title
    app: {
        title: 'Aboard - 簡約白板',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: '撤銷',
        redo: '重做',
        pen: '筆',
        shape: '形狀',
        move: '移動',
        eraser: '橡皮',
        clear: '清空',
        background: '背景',
        teachingTools: '教具',
        more: '更多',
        settings: '設置',
        export: '匯出畫布',
        zoomOut: '縮小 (-)',
        zoomIn: '放大 (+)',
        fullscreen: '全螢幕 (F11)',
        zoomPlaceholder: '縮放比例 (輸入百分比)'
    },

    // Tools
    tools: {
        pen: {
            title: '筆',
            type: '筆触類型',
            normal: '普通筆',
            pencil: '鉛筆',
            ballpoint: '圓珠筆',
            fountain: '鋼筆',
            brush: '毛筆',
            color: '顏色',
            colorAndSize: '顏色与粗细',
            colorPicker: '取色器',
            size: '線條粗細',
            sizeLabel: '線條粗細：目前',
            sizePx: 'px'
        },
        shape: {
            title: '形狀',
            type: '形狀類型',
            line: '直線',
            rectangle: '矩形',
            circle: '圓形',
            ellipse: '橢圓',
            arrow: '箭頭',
            doubleArrow: '雙箭頭',
            arrowSize: '箭頭大小',
            hint: '按住拖動繪製形狀，鬆開完成',
            lineProperties: '線條屬性'
        },
        eraser: {
            title: '橡皮',
            type: '橡皮類型',
            normal: '普通橡皮',
            pixel: '像素橡皮',
            size: '橡皮大小',
            sizeLabel: '橡皮擦大小：目前',
            shape: '形状',
            shapeCircle: '圓形',
            shapeRectangle: '方形'
        },
        clear: {
            title: '清空畫布',
            confirm: '确认清空',
            message: '确定要清空畫布吗？此操作无法撤銷。'
        },
        refresh: {
            warning: '刷新後畫布內容將清空且無法恢復，確定要刷新嗎？'
        },
        lineStyle: {
            title: '線條樣式',
            solid: '實線',
            dashed: '虛線',
            dotted: '點線',
            wavy: '波浪線',
            double: '雙線',
            triple: '三線',
            multiLine: '多線',
            arrow: '箭頭',
            doubleArrow: '雙箭頭',
            noArrow: '無箭頭',
            arrowType: '箭頭類型',
            dashDensity: '虛線密度',
            waveDensity: '波浪密度',
            lineSpacing: '線條間距',
            lineCount: '線條數量'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: '線條樣式設定',
        openSettings: '更多設定',
        preview: '預覽'
    },

    // Time Display
    timeDisplay: {
        options: '時間顯示選項',
        showDate: '顯示日期',
        showTime: '顯示時間',
        settings: '設定',
        fullscreenDisplay: '全螢幕顯示'
    },

    // Background
    background: {
        title: '背景',
        color: '背景顏色',
        pattern: '背景圖案',
        blank: '空白',
        none: '无',
        dots: '点阵',
        grid: '方格',
        lines: '線條',
        tianzige: '田字格',
        english4line: '英语四线格',
        musicStaff: '五线谱',
        coordinate: '坐標系',
        coordinateOriginHint: '在移動模式下雙擊選中坐標系中心可拖動移動',
        image: '上传圖片',
        density: '密度',
        densityLabel: '密度：目前',
        size: '大小',
        sizeLabel: '大小：目前',
        opacity: '背景透明度',
        opacityLabel: '背景透明度：目前',
        opacityHint: '調整背景的透明度,100%为完全不透明',
        contrast: '對比度',
        contrastLabel: '圖案透明度：目前',
        contrastHint: '調整背景圖案線條的明暗程度',
        preference: '背景圖案偏好',
        preferenceHint: '選擇在属性栏中顯示的圖案',
        upload: '上传',
        moveCoordinateOrigin: '移動座標原點',
        moveCoordinateOriginHint: '點擊按鈕後，可在畫布上拖動移動座標原點'
    },

    // Image Controls
    imageControls: {
        confirm: '確定',
        cancel: '取消',
        flipHorizontal: '水平翻轉',
        flipVertical: '垂直翻轉',
        rotate: '旋轉'
    },

    // Page Navigation
    page: {
        previous: '上一頁',
        next: '下一頁',
        jumpPlaceholder: '輸入頁码跳转',
        of: ' / ',
        newPage: '新建頁面'
    },

    // Settings
    settings: {
        title: '設置',
        tabs: {
            general: '通用',
            display: '顯示',
            pen: '筆',
            eraser: '橡皮',
            canvas: '畫布',
            background: '背景',
            about: '關於',
            announcement: '公告',
            more: '更多'
        },
        display: {
            title: '顯示設置',
            theme: '主题',
            themeHint: '選擇套用主题',
            themeColor: '主题色',
            showZoomControls: '顯示縮放控件',
            showZoomControlsHint: '勾選后，在畫布上方顯示縮放控件',
            showFullscreenBtn: '顯示全螢幕按钮',
            showFullscreenBtnHint: '勾選后，在縮放控件旁顯示全螢幕按钮',
            toolbarSize: '工具栏大小',
            toolbarSizeLabel: '工具栏大小：目前',
            toolbarSizeHint: '調整底部工具栏的大小',
            configScale: '属性栏大小',
            configScaleLabel: '属性栏大小：目前',
            configScaleHint: '調整弹出具体属性面板的大小',
            themeColorHint: '工具栏被選中时的顏色',
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
            title: '通用設置',
            language: '語言',
            languageHint: '選擇界面語言 / Choose interface language',
            globalFont: '全局字体',
            globalFontHint: '選擇套用程序使用的字体',
            fonts: {
                system: '系统預設',
                serif: '宋体（衬线体）',
                sansSerif: '黑体（无衬线体）',
                monospace: '等宽字体',
                cursive: '手写体',
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
            edgeSnap: '啟用边缘吸附',
            edgeSnapHint: '拖动控制面板时自动吸附到屏幕边缘',
            touchZoom: '觸控縮放',
            touchZoomHint: '允許雙指捏合縮放畫布',
            controlPosition: '控制按钮位置',
            controlPositionHint: '選擇縮放和分頁控件在屏幕上的顯示位置',
            positionTopLeft: '左上角',
            positionTopRight: '右上角',
            positionBottomLeft: '左下角',
            positionBottomRight: '右下角',
            canvasMode: '畫布模式',
            canvasModeHint: '選擇畫布的顯示模式',
            pagination: '分頁模式',
            infiniteCanvas: '無限畫布',
            autoSave: '自动儲存',
            autoSaveHint: '定期儲存您的繪圖内容'
        },
        canvas: {
            title: '畫布設置',
            mode: '畫布模式',
            modeHint: '選擇畫布的顯示模式',
            size: '畫布尺寸',
            sizeHint: '選擇预设尺寸或自定义畫布比例和大小',
            infiniteCanvas: '無限畫布',
            pagination: '分頁模式',
            presets: {
                a4Portrait: 'A4 竖向',
                a4Landscape: 'A4 横向',
                a3Portrait: 'A3 竖向',
                a3Landscape: 'A3 横向',
                b5Portrait: 'B5 竖向',
                b5Landscape: 'B5 横向',
                widescreen: '16:9 宽屏',
                standard: '4:3 標准',
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
            title: '背景設置',
            opacity: '背景透明度',
            opacityLabel: '背景透明度：目前',
            opacityHint: '調整背景的透明度,100%为完全不透明',
            patternIntensity: '圖案透明度',
            patternIntensityLabel: '圖案透明度：目前',
            patternIntensityHint: '調整背景圖案線條的明暗程度',
            preference: '背景圖案偏好',
            preferenceHint: '選擇在属性栏中顯示的圖案'
        },
        announcement: {
            title: '公告',
            welcome: '歡迎使用 Aboard！',
            content: [
                '歡迎使用 Aboard 白板套用！',
                '',
                '使用提示：',
                '• 点击底部工具栏選擇不同工具進行绘画',
                '• 使用 Ctrl+Z 撤銷，Ctrl+Y 重做',
                '• 点击右上角縮放按钮或使用鼠標滚轮縮放畫布',
                '• 点击背景按钮可以選擇不同的背景圖案',
                '• 在設置中可以切换無限畫布或分頁模式',
                '• 支持触控和鼠標操作',
                '',
                '链接：',
                '• GitHub 項目：https://github.com/lifeafter619/Aboard',
                '• 作者博客：https://66619.eu.org',
                '',
                '祝您使用愉快！'
            ]
        },
        about: {
            title: '關於 Aboard',
            projectIntro: '項目简介',
            description1: 'Aboard 是一个簡約的网頁白板套用，专为教学和演示设计。',
            description2: '它提供了流畅的繪圖体验和丰富的背景選項，让您的创意自由展现。',
            mainFeatures: '主要功能',
            features: {
                penTypes: '多种筆触類型（普通筆、鉛筆、圓珠筆、鋼筆、毛筆）',
                smartEraser: '智能橡皮擦（支持圓形和方形）',
                richPatterns: '丰富的背景圖案（点阵、方格、田字格、英语四线格等）',
                adjustable: '可調节的圖案密度和透明度',
                canvasModes: '無限畫布和分頁模式（支持A4、A3、B5等预设尺寸）',
                customSize: '自定义畫布尺寸和比例',
                draggable: '可拖动的工具栏和属性面板（支持垂直布局）',
                undoRedo: '撤銷/重做功能（支持最多50步）',
                smartZoom: '智能縮放（Ctrl+滚轮，縮放至鼠標位置）',
                responsive: '响應式界面，適配不同屏幕尺寸'
            },
            techStack: '技术栈',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: '开源协议',
            licenseType: 'MIT License',
            github: 'GitHub',
            version: '版本'
        },
        more: {
            title: '更多設置',
            showTimeDisplay: '顯示時間和日期',
            showTimeDisplayHint: '在右上角顯示目前時間和日期'
        },
        time: {
            title: '時間顯示設置',
            showDate: '顯示日期',
            showTime: '顯示時間',
            timezone: '时区',
            timezoneHint: '選擇要顯示的时区',
            timeFormat: '時間格式',
            timeFormatHint: '選擇時間的顯示格式',
            timeFormat12: '12小时制 (上午/下午)',
            timeFormat24: '24小时制',
            dateFormat: '日期格式',
            dateFormatHint: '選擇日期的顯示格式',
            dateFormatYMD: '年-月-日 (2024-01-01)',
            dateFormatMDY: '月-日-年 (01-01-2024)',
            dateFormatDMY: '日-月-年 (01-01-2024)',
            dateFormatChinese: '中文 (2024年1月1日)',
            colorSettings: '顏色設置',
            colorSettingsHint: '設置時間顯示的字体和背景顏色',
            colorHint: '設置時間顯示的字体和背景顏色',
            textColor: '字体顏色',
            bgColor: '背景顏色',
            fontSize: '字体大小',
            fontSizeLabel: '字體大小：當前',
            fontSizeHint: '調整時間顯示的字体大小',
            opacity: '透明度',
            opacityLabel: '透明度：當前',
            opacityHint: '調整時間顯示的透明度',
            fullscreenMode: '全螢幕模式',
            fullscreenModeHint: '選擇如何触发時間全螢幕顯示',
            fullscreenDisabled: '關閉',
            fullscreenSingle: '單擊',
            fullscreenDouble: '雙擊',
            fullscreenFontSize: '全螢幕字体大小',
            fullscreenFontSizeLabel: '全屏字體大小：當前',
            fullscreenFontSizeHint: '調整全螢幕時間顯示的字体大小，范围10%-85%',
            customColor: '自定义顏色',
            displayOptions: '顯示選項'
        }
    },

    // Feature Area
    features: {
        title: '小功能',
        moreFeatures: '更多功能',
        time: '時間',
        timer: '計時',
        randomPicker: '點名器',
        scoreboard: '計分板',
        insertImage: '插入圖片'
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
        hint: '提示：單擊移動，雙擊調整大小、旋轉和刪除',
        insertHint: '選擇要插入的教具數量',
        currentOnCanvas: '畫布上當前數量',
        addNew: '新增',
        rotate: '旋轉',
        resize: '調整大小',
        delete: '刪除',
        drawAlongEdge: '沿邊緣畫線'
    },

    // Time Display
    timeDisplay: {
        title: '時間顯示',
        settingsTitle: '時間顯示設置',
        options: '時間顯示選項',
        showDate: '顯示日期',
        showTime: '顯示時間',
        settings: '設置',
        displayOptions: '顯示選項',
        dateAndTime: '日期和時間',
        dateOnly: '仅日期',
        timeOnly: '仅時間',
        timezone: '时区',
        timeFormat: '時間格式',
        dateFormat: '日期格式',
        colorSettings: '顏色設置',
        textColor: '字体顏色',
        bgColor: '背景顏色',
        fontSize: '字体大小',
        fontSizeLabel: '字体大小：目前',
        opacity: '透明度',
        opacityLabel: '透明度：目前',
        fullscreenMode: '全螢幕模式',
        fullscreenFontSize: '全螢幕字体大小',
        fullscreenFontSizeLabel: '全螢幕字体大小：目前',
        fullscreenSliderLabel: '字体大小調节 (10%-85%)',
        customColor: '自定义顏色',
        transparent: '透明'
    },

    // Timer
    timer: {
        settingsTitle: '計時器設置',
        mode: '模式',
        selectMode: '選擇模式',
        countdown: '倒計時',
        stopwatch: '正計時',
        duration: '計時时长（分钟）',
        hours: '小时',
        minutes: '分钟',
        seconds: '秒',
        title: '計時器標题（可選）',
        titlePlaceholder: '例如：课堂演讲、考試時間等',
        setTime: '設置時間',
        setStartTime: '設置开始時間',
        fontSettings: '字体設置',
        fontSize: '字体大小',
        fontSizeLabel: '字体大小：目前',
        adjustColor: '調整顏色',
        colorSettings: '顏色設置',
        textColor: '字体顏色',
        bgColor: '背景顏色',
        opacity: '透明度',
        opacityLabel: '透明度：目前',
        fullscreenFontSize: '全螢幕字体大小',
        fullscreenFontSizeLabel: '全螢幕字体大小：目前',
        soundSettings: '声音設置',
        playSound: '倒計時结束时播放提示音',
        loopPlayback: '循环播放',
        loopCount: '循环次数',
        uploadCustomAudio: '上传自定义音频',
        soundPresets: {
            classBell: '开始铃声(10s)',
            examEnd: '考試结束(4s)',
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
            darkGray: '深灰（預設）',
            lightGray: '浅灰',
            lightRed: '浅红',
            lightBlue: '浅蓝',
            lightGreen: '浅绿',
            lightYellow: '浅黄',
            lightOrange: '浅橙',
            whiteDefault: '白色（預設）'
        },
        customColor: '自定义顏色',
        start: '开始',
        adjust: '調整',
        continue: '繼續',
        pause: '暂停',
        reset: '重置',
        stop: '停止',
        alertSetTime: '請設置倒計時時間',
        alertTitle: '提示'
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
        'utc': 'UTC (协調世界时)'
    },

    // Welcome Dialog
    welcome: {
        title: '歡迎使用 Aboard',
        content: `歡迎使用 Aboard 白板套用！

使用提示：
• 点击底部工具栏選擇不同工具進行绘画
• 使用 Ctrl+Z 撤銷，Ctrl+Y 重做
• 点击右上角縮放按钮或使用鼠標滚轮縮放畫布
• 点击背景按钮可以選擇不同的背景圖案
• 在設置中可以切换無限畫布或分頁模式
• 支持触控和鼠標操作

祝您使用愉快！`,
        confirm: '确定',
        noShowAgain: '不再弹出'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: '確認清空',
        message: '確定要清空當前畫布嗎？此操作無法撤銷，其他畫布不受影響。',
        confirm: '確定',
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
