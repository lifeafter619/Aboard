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
        reset: '重置',
        start: '開始',
        stop: '停止',
        restoreSize: '恢復大小',
        keepCentered: '保持置中'
    },

    // Recovery dialog
    recovery: {
        title: '恢復上次內容',
        message: '檢測到上次使用時的畫布內容，是否恢復？',
        restore: '恢復',
        discard: '放棄'
    },

    // App Title
    app: {
        title: 'Aboard - 簡約白板',
        name: 'Aboard',
        rotateScreenTitle: '請旋轉螢幕',
        rotateScreenTip: '偵測到目前為直向模式。為了正常排版與完整工具列，請以橫向使用。'
    },

    // Toolbar
    toolbar: {
        undo: '撤銷',
        redo: '重做',
        pen: '筆',
        shape: '形狀',
        move: '移動',
        select: '選擇',
        eraser: '擦除',
        clear: '清空',
        background: '背景',
        teachingTools: '教具',
        more: '更多',
        settings: '設定',
        export: '匯出畫布',
        zoomOut: '縮小 (-)',
        zoomIn: '放大 (+)',
        fullscreen: '全螢幕 (F11)',
        exitFullscreen: '退出全螢幕 (F11)',
        zoomPlaceholder: '縮放比例 (輸入百分比)'
    },

    // Tools
    tools: {
        pen: {
            title: '筆',
            type: '筆觸類型',
            normal: '普通筆',
            pencil: '鉛筆',
            ballpoint: '圓珠筆',
            fountain: '鋼筆',
            brush: '毛筆',
            marker: '麥克筆',
            color: '顏色',
            colorAndSize: '顏色與粗細',
            colorPicker: '取色器',
            size: '線條粗細',
            thickness: '筆粗細',
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
            title: '擦除',
            type: '擦除類型',
            normal: '普通擦除',
            pixel: '像素擦除',
            size: '擦除大小',
            sizeLabel: '擦除大小：目前',
            shape: '形狀',
            shapeCircle: '圓形',
            shapeRectangle: '方形'
        },
        clear: {
            title: '清空畫布',
            confirm: '確認清空',
            message: '確定要清空畫布嗎？此操作無法撤銷。'
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
        },
        text: {
            insertTitle: '插入文字',
            editTitle: '編輯文字',
            placeholder: '在此輸入文字',
            size: '大小',
            color: '顏色',
            font: '字體',
            style: '樣式',
            bold: '粗體',
            italic: '斜體',
            underline: '底線',
            strikethrough: '刪除線',
            decorationStyle: '線型',
            decorationWidth: '線條粗細',
            decorationColor: '線條顏色',
            uploadFont: '上傳字體',
            customFonts: '自訂字體',
            fontUploadSuccess: '字體上傳成功！',
            fontExists: '該字體已存在。',
            invalidFontFormat: '無效的字體格式。請使用 TTF、OTF、WOFF 或 WOFF2 檔案。',
            fontTooLarge: '字體檔案過大，最大允許 2MB。',
            storageQuotaExceeded: '儲存空間不足，請刪除一些自訂字體。'
        },
        select: {
            mode: '選擇模式',
            clickMode: '點選',
            rectMode: '框選',
            lassoMode: '套索',
            transform: '變換',
            rotate90: '旋轉90°',
            flipH: '水平翻轉',
            flipV: '垂直翻轉'
        }
    },

    selection: {
        edit: '編輯',
        copy: '複製',
        delete: '刪除',
        done: '完成',
        rotate90: '旋轉90°',
        flipH: '水平翻轉',
        layer: '圖層',
        layerFront: '置於頂層',
        layerBack: '置於底層',
        layerUp: '上移一層',
        layerDown: '下移一層'
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
        none: '無',
        dots: '點陣',
        grid: '方格',
        lines: '線條',
        tianzige: '田字格',
        english4line: '英語四線格',
        musicStaff: '五線譜',
        coordinate: '座標系',
        coordinateOriginHint: '在移動模式下雙擊選中座標系中心可拖動移動',
        image: '上傳圖片',
        density: '密度',
        densityLabel: '密度：目前',
        size: '大小',
        sizeLabel: '大小：目前',
        opacity: '背景透明度',
        opacityLabel: '背景透明度：目前',
        opacityHint: '調整背景的透明度,100%為完全不透明',
        contrast: '對比度',
        contrastLabel: '圖案透明度：目前',
        contrastHint: '調整背景圖案線條的明暗程度',
        preference: '背景圖案偏好',
        preferenceHint: '選擇在屬性欄中顯示的圖案',
        upload: '上傳',
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

    // Selection Controls
    selection: {
        copy: '複製',
        delete: '刪除',
        done: '完成',
        edit: '編輯',
        rotate90: '旋轉90°',
        flipH: '水平翻轉',
        layer: '圖層',
        layerFront: '置於頂層',
        layerBack: '置於底層',
        layerUp: '上移一層',
        layerDown: '下移一層'
    },

    // Page Navigation
    page: {
        previous: '上一頁',
        next: '下一頁',
        jumpPlaceholder: '輸入頁碼跳轉',
        of: ' / ',
        newPage: '新建頁面'
    },

    // Settings
    settings: {
        title: '設定',
        exportSuccess: '設定匯出成功！',
        exportFailed: '匯出設定失敗',
        importSuccess: '設定已匯入',
        importError: '設定檔無效',
        importNoChange: '未偵測到設定變更',
        diff: {
            title: '設定差異',
            message: '偵測到匯入設定與目前設定存在差異：',
            oldValue: '目前值',
            newValue: '新值',
            confirm: '確認更新',
            cancel: '取消',
            noChanges: '未偵測到差異，設定完全相同。'
        },
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
            title: '顯示設定',
            theme: '主題',
            themeHint: '選擇套用主題',
            themeColor: '主題色',
            showZoomControls: '顯示縮放控件',
            showZoomControlsHint: '勾選後，在畫布上方顯示縮放控件',
            showImportExportBtn: '顯示匯入匯出按鈕',
            showImportExportBtnHint: '勾選後，在縮放控件旁顯示匯入匯出按鈕',
            showFullscreenBtn: '顯示全螢幕按鈕',
            showFullscreenBtnHint: '勾選後，在縮放控件旁顯示全螢幕按鈕',
            toolbarSize: '工具欄大小',
            toolbarSizeLabel: '工具欄大小：目前',
            toolbarSizeHint: '調整底部工具欄的大小',
            configScale: '屬性欄大小',
            configScaleLabel: '屬性欄大小：目前',
            configScaleHint: '調整彈出具體屬性面板的大小',
            themeColorHint: '工具欄被選中時的顏色',
            colorOptions: {
                blue: '藍色',
                purple: '紫色',
                green: '綠色',
                orange: '橙色',
                red: '紅色',
                pink: '粉色',
                cyan: '青色',
                yellow: '黃色'
            },
            colorPicker: '取色器'
        },
        general: {
            title: '通用設定',
            language: '語言',
            languageHint: '選擇介面語言',
            globalFont: '全局字體',
            globalFontHint: '選擇套用程序使用的字體',
            fonts: {
                system: '系統預設',
                serif: '宋體（襯線體）',
                sansSerif: '黑體（無襯線體）',
                monospace: '等寬字體',
                cursive: '手寫体',
                // 中文字体
                yahei: '微軟雅黑',
                simsun: '宋體',
                simhei: '黑體',
                kaiti: '楷體',
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
            edgeSnap: '啟用邊緣吸附',
            edgeSnapHint: '拖動控制面板時自動吸附到屏幕邊緣',
            touchZoom: '觸控縮放',
            touchZoomHint: '允許雙指捏合縮放畫布',
            morePanelBehaviorLabel: '更多功能面板行為',
            keepMorePanelOpenHint: '點擊「更多」中的功能按鈕後預設不關閉「更多」框',
            // Toolbar customization
            toolbarCustomization: '工具列自訂',
            toolbarCustomizationHint: '選擇要在工具列中顯示的工具，拖動可調整順序',
            toolbarTools: {
                undo: '復原',
                redo: '重做',
                pen: '筆',
                move: '移動',
                select: '選擇',
                eraser: '擦除',
                clear: '清空',
                background: '背景',
                more: '更多',
                settings: '設定'
            },
            // Control button settings
            controlButtonSettings: '控制按鈕設定',
            controlButtonSettingsHint: '選擇要顯示的控制按鈕',
            controlButtons: {
                zoom: '縮放按鈕',
                pagination: '分頁按鈕',
                time: '時間顯示',
                fullscreen: '全螢幕按鈕',
                import: '匯入按鈕',
                export: '匯出按鈕'
            },
            controlPosition: '控制按鈕位置',
            controlPositionHint: '選擇縮放和分頁控件在屏幕上的顯示位置',
            positionTopLeft: '左上角',
            positionTopRight: '右上角',
            positionBottomLeft: '左下角',
            positionBottomRight: '右下角',
            canvasMode: '畫布模式',
            canvasModeHint: '選擇畫布的顯示模式',
            pagination: '分頁模式',
            infiniteCanvas: '無限畫布',
            autoSave: '自動儲存',
            autoSaveHint: '定期儲存您的繪圖內容'
        },
        canvas: {
            title: '畫布設定',
            mode: '畫布模式',
            modeHint: '選擇畫布的顯示模式',
            size: '畫布尺寸',
            sizeHint: '選擇預設尺寸或自定義畫布比例和大小',
            unlimitedZoom: '允許無限放大',
            unlimitedZoomHint: '勾選後，畫布可以無限放大（最高500倍）',
            infiniteCanvas: '無限畫布',
            pagination: '分頁模式',
            presets: {
                a4Portrait: 'A4 豎向',
                a4Landscape: 'A4 橫向',
                a3Portrait: 'A3 豎向',
                a3Landscape: 'A3 橫向',
                b5Portrait: 'B5 豎向',
                b5Landscape: 'B5 橫向',
                widescreen: '16:9 寬屏',
                standard: '4:3 標準',
                custom: '自定義'
            },
            customSize: {
                portrait: '豎向',
                landscape: '橫向',
                width: '寬度',
                height: '高度',
                ratio: '比例',
                ratios: {
                    custom: '自定義',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (豎向)',
                    '9:16': '9:16 (豎向)'
                }
            }
        },
        background: {
            title: '背景設定',
            opacity: '背景透明度',
            opacityLabel: '背景透明度：目前',
            opacityHint: '調整背景的透明度,100%為完全不透明',
            patternIntensity: '圖案透明度',
            patternIntensityLabel: '圖案透明度：目前',
            patternIntensityHint: '調整背景圖案線條的明暗程度',
            preference: '背景圖案偏好',
            preferenceHint: '選擇在屬性欄中顯示的圖案'
        },
        announcement: {
            title: '公告',
            welcome: '歡迎使用 Aboard！',
            content: [
                '歡迎使用 Aboard 白板套用！',
                '',
                '使用提示：',
                '• 點擊底部工具欄選擇不同工具進行繪畫',
                '• 使用 Ctrl+Z 撤銷，Ctrl+Y 重做',
                '• 點擊右上角縮放按鈕或使用滑鼠滾輪縮放畫布',
                '• 點擊背景按鈕可以選擇不同的背景圖案',
                '• 在設定中可以切換無限畫布或分頁模式',
                '• 支持觸控和滑鼠操作',
                '',
                '鏈接：',
                '• GitHub 項目：https://github.com/lifeafter619/Aboard',
                '• 作者博客：https://66619.eu.org',
                '',
                '祝您使用愉快！'
            ]
        },
        about: {
            title: '關於 Aboard',
            projectIntro: '項目簡介',
            description1: 'Aboard 是一個簡約的網頁白板套用，專為教學和演示設計。',
            description2: '它提供了流暢的繪圖體驗和豐富的背景選項，讓您的創意自由展現。',
            mainFeatures: '主要功能',
            features: {
                penTypes: '多種筆觸類型（普通筆、鉛筆、圓珠筆、鋼筆、毛筆）',
                smartEraser: '智能橡皮擦（支持圓形和方形）',
                richPatterns: '豐富的背景圖案（點陣、方格、田字格、英語四線格等）',
                adjustable: '可調節的圖案密度和透明度',
                canvasModes: '無限畫布和分頁模式（支持A4、A3、B5等預設尺寸）',
                customSize: '自定義畫布尺寸和比例',
                draggable: '可拖動的工具欄和屬性面板（支持垂直布局）',
                undoRedo: '撤銷/重做功能（支持最多50步）',
                smartZoom: '智能縮放（Ctrl+滾輪，縮放至滑鼠位置）',
                responsive: '響應式界面，適配不同屏幕尺寸'
            },
            techStack: '技術棧',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: '開源協議',
            licenseType: 'MIT License',
            github: 'GitHub',
            version: '版本'
        },
        more: {
            title: '更多設定',
            cacheCleanupLabel: '快取清理',
            cacheCleanupHint: '可查看快取占用並按類別清理（清理前會二次確認）',
            clearSettingsCache: '清除設定項快取',
            clearCanvasCache: '清除畫布快取',
            clearOtherCache: '清除其他快取',
            cacheSizeCalculating: '計算中...',
            clearSelectedCache: '清理所選快取',
            morePanelBehaviorLabel: '更多功能面板行為',
            keepMorePanelOpenHint: '點擊「更多」中的功能按鈕後預設不關閉「更多」框',
            selectCacheType: '請先選擇要清理的快取類型',
            confirmClearTitle: '確認清理',
            confirmClearSelectedCache: '請選擇要清理的快取項目：',
            clearLocalDataConfirmSuffix: '確定繼續嗎？',
            description: '時間顯示相關設定請點擊右下角時間區域進入設定界面',
            showTimeDisplay: '顯示時間和日期',
            showTimeDisplayHint: '在右上角顯示目前時間和日期',
            localDataLabel: '本地資料',
            localDataHint: '清空本地快取、畫布內容和設定，並恢復首次載入狀態',
            clearLocalDataButton: '清空本地快取',
            clearLocalDataConfirm: '此操作會清空本地快取、畫布內容和設定，並恢復為首次載入狀態。確定繼續嗎？'
        },
        time: {
            title: '時間顯示設定',
            showDate: '顯示日期',
            showTime: '顯示時間',
            timezone: '時區',
            timezoneHint: '選擇要顯示的時區',
            timeFormat: '時間格式',
            timeFormatHint: '選擇時間的顯示格式',
            timeFormat12: '12小時制 (上午/下午)',
            timeFormat24: '24小時制',
            dateFormat: '日期格式',
            dateFormatHint: '選擇日期的顯示格式',
            dateFormatYMD: '年-月-日 (2024-01-01)',
            dateFormatMDY: '月-日-年 (01-01-2024)',
            dateFormatDMY: '日-月-年 (01-01-2024)',
            dateFormatChinese: '中文 (2024年1月1日)',
            colorSettings: '顏色設定',
            colorSettingsHint: '設定時間顯示的字體和背景顏色',
            colorHint: '設定時間顯示的字體和背景顏色',
            textColor: '字體顏色',
            bgColor: '背景顏色',
            fontSize: '字體大小',
            fontSizeLabel: '字體大小：當前',
            fontSizeHint: '調整時間顯示的字體大小',
            opacity: '透明度',
            opacityLabel: '透明度：當前',
            opacityHint: '調整時間顯示的透明度',
            fullscreenMode: '全螢幕模式',
            fullscreenModeHint: '選擇如何觸發時間全螢幕顯示',
            fullscreenDisabled: '關閉',
            fullscreenSingle: '單擊',
            fullscreenDouble: '雙擊',
            fullscreenFontSize: '全螢幕字體大小',
            fullscreenFontSizeLabel: '全屏字體大小：當前',
            fullscreenFontSizeHint: '調整全螢幕時間顯示的字體大小，範圍10%-85%',
            customColor: '自定義顏色',
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
        insertImage: '插入圖片',
        insertText: '插入文字'
    },

    // Random Picker
    randomPicker: {
        namePicker: '姓名點名器',
        numberPicker: '數字點名器',
        noNames: '請添加名單',
        settingsTitle: '點名器設定',
        modeName: '姓名模式',
        modeNumber: '數字模式',
        titleLabel: '標題',
        titlePlaceholder: '自定義標題（可選）',
        namesLabel: '名單列表（每行一個）',
        namesPlaceholder: '張三\n李四\n王五',
        defaultNames: '張三\n李四\n王五\n趙六\n孫七',
        allowRepeats: '允許重複抽取',
        rangeLabel: '數字範圍',
        importLabel: '匯入名單 (Excel/CSV)',
        defaultColumnName: '姓名',
        importBtn: '選擇檔案匯入',
        importHint: '提示：自動讀取表格中對應列名的內容',
        importSuccess: '成功匯入 {count} 個名字',
        importNoData: '未找到指定列的數據，請檢查列名設定',
        importError: '檔案解析失敗'
    },

    // Scoreboard
    scoreboard: {
        title: '計分板',
        addTeam: '添加隊伍',
        reset: '重置分數',
        confirmRemoveTeam: '確定要移除這個隊伍嗎？',
        teamDefault: '隊伍',
        removeTeam: '刪除隊伍',
        confirmReset: '確定要重置所有分數嗎？'
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
        settingsTitle: '時間顯示設定',
        options: '時間顯示選項',
        showDate: '顯示日期',
        showTime: '顯示時間',
        settings: '設定',
        fullscreenDisplay: '全螢幕顯示',
        displayOptions: '顯示選項',
        dateAndTime: '日期和時間',
        dateOnly: '僅日期',
        timeOnly: '僅時間',
        timezone: '時區',
        timeFormat: '時間格式',
        dateFormat: '日期格式',
        colorSettings: '顏色設定',
        textColor: '字體顏色',
        bgColor: '背景顏色',
        fontSize: '字體大小',
        fontSizeLabel: '字體大小：目前',
        opacity: '透明度',
        opacityLabel: '透明度：目前',
        fullscreenMode: '全螢幕模式',
        fullscreenColorSettings: '全螢幕顏色設定',
        fullscreenFontSize: '全螢幕字體大小',
        fullscreenFontSizeLabel: '全螢幕字體大小：目前',
        fullscreenFontSizeHint: '調整全螢幕時間顯示的字體大小，範圍10%-85%',
        fullscreenSliderLabel: '字體大小調節 (10%-85%)',
        customColor: '自定義顏色',
        transparent: '透明',
        fullscreenDisabled: '關閉',
        fullscreenSingle: '單擊',
        fullscreenDouble: '雙擊'
    },

    // Timer
    timer: {
        title: '計時器',
        settingsTitle: '計時器設定',
        mode: '模式',
        selectMode: '選擇模式',
        countdown: '倒計時',
        stopwatch: '正計時',
        duration: '計時時長（分鐘）',
        hours: '小時',
        minutes: '分鐘',
        seconds: '秒',
        timerTitle: '計時器標題（可選）',
        titlePlaceholder: '例如：課堂演講、考試時間等',
        setTime: '設定時間',
        setStartTime: '設定開始時間',
        fontSettings: '字體設定',
        fontSize: '字體大小',
        fontSizeLabel: '字體大小：目前',
        minimal: '最簡',
        minimalMode: '最簡顯示 (雙擊恢復)',
        adjustColor: '調整顏色',
        colorSettings: '顏色設定',
        textColor: '字體顏色',
        bgColor: '背景顏色',
        opacity: '透明度',
        opacityLabel: '透明度：目前',
        fullscreenFontSize: '全螢幕字體大小',
        fullscreenFontSizeLabel: '全螢幕字體大小：目前',
        soundSettings: '聲音設定',
        playSound: '倒計時結束時播放提示音',
        preview: '試聽',
        moreSettings: '更多設定',
        playbackSpeed: '播放倍速',
        loopPlayback: '循環播放',
        loopCount: '循環次數',
        loopInterval: '循環間隔',
        uploadCustomAudio: '上傳自定義音頻',
        soundPresets: {
            classBell: '開始鈴聲(10s)',
            examEnd: '考試結束(4s)',
            gentle: '柔和(17s)',
            digitalBeep: '結束鈴聲(4s)'
        },
        colors: {
            black: '黑色',
            white: '白色',
            blue: '藍色',
            red: '紅色',
            green: '綠色',
            yellow: '黃色',
            orange: '橙色',
            purple: '紫色',
            transparent: '透明',
            darkGray: '深灰（預設）',
            lightGray: '淺灰',
            lightRed: '淺紅',
            lightBlue: '淺藍',
            lightGreen: '淺綠',
            lightYellow: '淺黃',
            lightOrange: '淺橙',
            whiteDefault: '白色（預設）'
        },
        customColor: '自定義顏色',
        start: '開始',
        adjust: '調整',
        continue: '繼續',
        pause: '暫停',
        reset: '重置',
        stop: '停止',
        alertSetTime: '請設定倒計時時間',
        alertTitle: '提示'
    },

    // Timezone names
    timezones: {
        'china': '中國 (UTC+8)',
        'newyork': '紐約 (UTC-5/-4)',
        'losangeles': '洛杉磯 (UTC-8/-7)',
        'chicago': '芝加哥 (UTC-6/-5)',
        'london': '倫敦 (UTC+0/+1)',
        'paris': '巴黎 (UTC+1/+2)',
        'berlin': '柏林 (UTC+1/+2)',
        'tokyo': '東京 (UTC+9)',
        'seoul': '首爾 (UTC+9)',
        'hongkong': '香港 (UTC+8)',
        'singapore': '新加坡 (UTC+8)',
        'dubai': '迪拜 (UTC+4)',
        'sydney': '悉尼 (UTC+10/+11)',
        'auckland': '奧克蘭 (UTC+12/+13)',
        'utc': 'UTC (協調世界時)'
    },

    // Welcome Dialog
    welcome: {
        title: '歡迎使用 Aboard',
        content: `歡迎使用 Aboard 白板套用！

使用提示：
• 點擊底部工具欄選擇不同工具進行繪畫
• 使用 Ctrl+Z 撤銷，Ctrl+Y 重做
• 點擊右上角縮放按鈕或使用滑鼠滾輪縮放畫布
• 點擊背景按鈕可以選擇不同的背景圖案
• 在設定中可以切換無限畫布或分頁模式
• 支持觸控和滑鼠操作

祝您使用愉快！`,
        confirm: '確定',
        noShowAgain: '不再彈出'
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
        red: '紅色',
        blue: '藍色',
        green: '綠色',
        yellow: '黃色',
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
