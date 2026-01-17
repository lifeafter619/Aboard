/**
 * Japanese (Japan) - 日本語
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: '確認',
        cancel: 'キャンセル',
        close: '閉じる',
        save: '保存',
        delete: '削除',
        edit: '編集',
        add: '追加',
        remove: '削除',
        yes: 'はい',
        no: 'いいえ',
        ok: 'OK',
        apply: '適用',
        reset: 'リセット'
    },

    // App Title
    app: {
        title: 'Aboard - ミニマリストホワイトボード',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: '元に戻す',
        redo: 'やり直す',
        pen: 'ペン',
        shape: '図形',
        move: '移動',
        eraser: '消しゴム',
        clear: 'クリア',
        background: '背景',
        teachingTools: '教具',
        more: 'もっと',
        settings: '設定',
        export: 'キャンバスをエクスポート',
        zoomOut: 'ズームアウト (-)',
        zoomIn: 'ズームイン (+)',
        fullscreen: 'フルスクリーン (F11)',
        zoomPlaceholder: 'ズームレベル (パーセントを入力)'
    },

    // Tools
    tools: {
        pen: {
            title: 'ペン',
            type: 'ペンの種類',
            normal: '通常ペン',
            pencil: '鉛筆',
            ballpoint: 'ボールペン',
            fountain: '万年筆',
            brush: 'ブラシ',
            color: '色',
            colorAndSize: '色とサイズ',
            colorPicker: 'カラーピッカー',
            size: '線の太さ',
            sizeLabel: '太さ：現在',
            sizePx: 'px'
        },
        shape: {
            title: '図形',
            type: '図形の種類',
            line: '直線',
            rectangle: '四角形',
            circle: '円',
            ellipse: '楕円',
            arrow: '矢印',
            doubleArrow: '双方向矢印',
            arrowSize: '矢印のサイズ',
            hint: 'ドラッグして図形を描画、離して完成',
            lineProperties: '線の属性'
        },
        eraser: {
            title: '消しゴム',
            type: '消しゴムの種類',
            normal: '通常消しゴム',
            pixel: 'ピクセル消しゴム',
            size: '消しゴムのサイズ',
            sizeLabel: '消しゴムのサイズ：現在',
            shape: '形状',
            shapeCircle: '円形',
            shapeRectangle: '四角形'
        },
        clear: {
            title: 'キャンバスをクリア',
            confirm: 'クリアを確認',
            message: 'キャンバスをクリアしてもよろしいですか？この操作は元に戻せません。'
        },
        refresh: {
            warning: '更新するとキャンバスの内容がすべてクリアされ、復元できません。更新してもよろしいですか？'
        },
        lineStyle: {
            title: '線種',
            solid: '実線',
            dashed: '破線',
            dotted: '点線',
            wavy: '波線',
            double: '二重線',
            triple: '三重線',
            multiLine: '多重線',
            arrow: '矢印',
            doubleArrow: '双方向矢印',
            noArrow: '矢印なし',
            arrowType: '矢印の種類',
            dashDensity: '破線の密度',
            waveDensity: '波の密度',
            lineSpacing: '線の間隔',
            lineCount: '線の数'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: '線種設定',
        openSettings: '詳細設定',
        preview: 'プレビュー'
    },

    // Time Display
    timeDisplay: {
        options: '時刻表示オプション',
        showDate: '日付を表示',
        showTime: '時刻を表示',
        settings: '設定',
        fullscreenDisplay: 'フルスクリーン表示'
    },

    // Background
    background: {
        title: '背景',
        color: '背景色',
        pattern: '背景パターン',
        blank: '空白',
        none: 'なし',
        dots: 'ドット',
        grid: 'グリッド',
        lines: 'ライン',
        tianzige: '田字格（中国）',
        english4line: '英語4線',
        musicStaff: '五線譜',
        coordinate: '座標系',
        coordinateOriginHint: '移動モードでダブルクリックして座標原点を選択し、ドラッグして移動',
        image: '画像',
        density: '密度',
        densityLabel: '密度：現在',
        size: 'サイズ',
        sizeLabel: 'サイズ：現在',
        opacity: '背景の不透明度',
        opacityLabel: '背景不透明度：現在',
        opacityHint: '背景の透明度を調整します。100%は完全に不透明',
        contrast: 'コントラスト',
        contrastLabel: 'パターン透明度：現在',
        contrastHint: '背景パターン線の明暗を調整します',
        preference: '背景パターンの設定',
        upload: 'アップロード',
        moveCoordinateOrigin: '原点を移動',
        moveCoordinateOriginHint: 'ボタンをクリックしてキャンバス上でドラッグして座標原点を移動'
    },

    // Image Controls
    imageControls: {
        confirm: '確定',
        cancel: 'キャンセル',
        flipHorizontal: '左右反転',
        flipVertical: '上下反転',
        rotate: '回転'
    },

    // Page Navigation
    page: {
        previous: '前へ',
        next: '次へ',
        jumpPlaceholder: 'ページ番号を入力',
        of: ' / ',
        newPage: '新しいページ'
    },

    // Settings
    settings: {
        title: '設定',
        tabs: {
            general: '一般',
            display: '表示',
            pen: 'ペン',
            eraser: '消しゴム',
            canvas: 'キャンバス',
            background: '背景',
            about: 'について',
            announcement: 'お知らせ',
            more: 'もっと'
        },
        display: {
            title: '表示設定',
            theme: 'テーマ',
            themeHint: 'アプリケーションテーマを選択',
            themeColor: 'テーマカラー',
            themeColorHint: '選択されたツールバーアイテムの色',
            showZoomControls: 'ズームコントロールを表示',
            showZoomControlsHint: 'キャンバス上にズームコントロールを表示',
            showFullscreenBtn: 'フルスクリーンボタンを表示',
            showFullscreenBtnHint: 'ズームコントロールの隣にフルスクリーンボタンを表示',
            toolbarSize: 'ツールバーサイズ',
            toolbarSizeLabel: 'ツールバーサイズ：現在',
            toolbarSizeHint: '下部ツールバーのサイズを調整',
            configScale: '構成パネルサイズ',
            configScaleLabel: '構成パネルサイズ：現在',
            configScaleHint: 'ポップアップ構成パネルのサイズを調整',
            colorOptions: {
                blue: '青',
                purple: '紫',
                green: '緑',
                orange: 'オレンジ',
                red: '赤',
                pink: 'ピンク',
                cyan: 'シアン',
                yellow: '黄'
            },
            colorPicker: 'カラーピッカー'
        },
        general: {
            title: '一般設定',
            language: '言語',
            languageHint: 'インターフェース言語を選択',
            globalFont: 'グローバルフォント',
            globalFontHint: 'アプリケーションで使用するフォントを選択',
            fonts: {
                system: 'システムデフォルト',
                serif: 'Serif',
                sansSerif: 'Sans Serif',
                monospace: 'Monospace',
                cursive: 'Cursive',
                yahei: 'Microsoft YaHei',
                simsun: 'SimSun',
                simhei: 'SimHei',
                kaiti: 'KaiTi',
                fangsong: 'FangSong',
                arial: 'Arial',
                helvetica: 'Helvetica',
                timesNewRoman: 'Times New Roman',
                courier: 'Courier New',
                verdana: 'Verdana',
                georgia: 'Georgia',
                trebuchet: 'Trebuchet MS',
                impact: 'Impact'
            },
            edgeSnap: 'エッジスナップを有効化',
            edgeSnapHint: 'ドラッグ時にコントロールパネルを画面端に自動配置',
            controlPosition: 'コントロールボタンの位置',
            controlPositionHint: 'ズームとページネーションコントロールの表示位置を選択',
            positionTopLeft: '左上',
            positionTopRight: '右上',
            positionBottomLeft: '左下',
            positionBottomRight: '右下',
            canvasMode: 'キャンバスモード',
            canvasModeHint: 'ページネーションまたは無限キャンバスモードを選択',
            pagination: 'ページネーション',
            infiniteCanvas: '無限キャンバス',
            autoSave: '自動保存',
            autoSaveHint: '定期的に描画を自動保存'
        },
        canvas: {
            title: 'キャンバス設定',
            mode: 'キャンバスモード',
            modeHint: 'キャンバス表示モードを選択',
            size: 'キャンバスサイズ',
            sizeHint: 'プリセットサイズを選択するか、キャンバスをカスタマイズ',
            infiniteCanvas: '無限キャンバス',
            pagination: 'ページモード',
            presets: {
                a4Portrait: 'A4 縦向き',
                a4Landscape: 'A4 横向き',
                a3Portrait: 'A3 縦向き',
                a3Landscape: 'A3 横向き',
                b5Portrait: 'B5 縦向き',
                b5Landscape: 'B5 横向き',
                widescreen: '16:9 ワイドスクリーン',
                standard: '4:3 標準',
                custom: 'カスタム'
            },
            customSize: {
                portrait: '縦向き',
                landscape: '横向き',
                width: '幅',
                height: '高さ',
                ratio: 'アスペクト比',
                ratios: {
                    custom: 'カスタム',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (縦向き)',
                    '9:16': '9:16 (縦向き)'
                }
            }
        },
        background: {
            title: '背景設定',
            opacity: '背景不透明度',
            opacityLabel: '背景不透明度：現在',
            opacityHint: '背景の透明度を調整、100%は完全に不透明',
            patternIntensity: 'パターン強度',
            patternIntensityLabel: 'パターン透明度：現在',
            patternIntensityHint: '背景パターンラインの暗さを調整',
            preference: '背景パターン設定',
            preferenceHint: '構成パネルに表示するパターンを選択'
        },
        announcement: {
            title: 'お知らせ',
            welcome: 'Aboardへようこそ！',
            content: [
                'Aboardホワイトボードアプリケーションへようこそ！',
                '',
                '使い方のヒント：',
                '• 下部のツールバーをクリックして、さまざまな描画ツールを選択',
                '• Ctrl+Zで元に戻す、Ctrl+Yでやり直す',
                '• 右上のズームボタンをクリックするか、マウスホイールを使用してズーム',
                '• 背景ボタンをクリックして、さまざまな背景パターンを選択',
                '• 設定で無限キャンバスまたはページモードを切り替え',
                '• タッチとマウス入力の両方をサポート',
                '',
                'クリエイティブな作業をお楽しみください！'
            ]
        },
        about: {
            title: 'Aboardについて',
            projectIntro: 'プロジェクト紹介',
            description1: 'Aboardは、教育とプレゼンテーション用に設計されたミニマリストWebホワイトボードアプリケーションです。',
            description2: 'スムーズな描画体験と豊富な背景オプションを提供します。',
            mainFeatures: '主な機能',
            features: {
                penTypes: '複数のペンタイプ（通常ペン、鉛筆、ボールペン、万年筆、ブラシ）',
                smartEraser: 'スマート消しゴム（円形と長方形をサポート）',
                richPatterns: '豊富な背景パターン（ドット、グリッド、田字格、英語4線など）',
                adjustable: '調整可能なパターン密度と透明度',
                canvasModes: '無限キャンバスとページモード（A4、A3、B5などのプリセットサイズをサポート）',
                customSize: 'カスタムキャンバスサイズとアスペクト比',
                draggable: 'ドラッグ可能なツールバーとプロパティパネル',
                undoRedo: '元に戻す/やり直し機能（最大50ステップをサポート）',
                smartZoom: 'スマートズーム（Ctrl+スクロールホイール、マウス位置へのズーム）',
                responsive: 'レスポンシブインターフェース、さまざまな画面サイズに適応'
            },
            techStack: '技術スタック',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: 'オープンソースライセンス',
            licenseType: 'MITライセンス',
            github: 'GitHub',
            version: 'バージョン'
        },
        more: {
            title: 'その他の設定',
            showTimeDisplay: '時刻と日付を表示',
            showTimeDisplayHint: '右上隅に現在の時刻と日付を表示'
        },
        time: {
            title: '時刻表示設定',
            showDate: '日付を表示',
            showTime: '時刻を表示',
            timezone: 'タイムゾーン',
            timeFormat: '時刻形式',
            timeFormat12: '12時間制 (AM/PM)',
            timeFormat24: '24時間制',
            dateFormat: '日付形式',
            dateFormatYMD: '年-月-日 (2024-01-01)',
            dateFormatMDY: '月-日-年 (01-01-2024)',
            dateFormatDMY: '日-月-年 (01-01-2024)',
            dateFormatChinese: '中国語 (2024年1月1日)',
            colorSettings: '色設定',
            colorHint: '時刻表示のフォントと背景色を設定',
            textColor: 'テキスト色',
            bgColor: '背景色',
            fontSize: 'フォントサイズ',
            fontSizeLabel: 'フォントサイズ：現在',
            opacity: '不透明度',
            opacityLabel: '不透明度：現在',
            fullscreenMode: 'フルスクリーンモード',
            fullscreenDisabled: '無効',
            fullscreenSingle: 'シングルクリック',
            fullscreenDouble: 'ダブルクリック',
            fullscreenFontSize: 'フルスクリーンフォントサイズ',
            fullscreenFontSizeLabel: 'フルスクリーンフォントサイズ：現在',
            fullscreenFontSizeHint: 'フルスクリーン時刻表示のフォントサイズを調整、範囲10%-85%',
            customColor: 'カスタムカラー'
        }
    },

    // Feature Area
    features: {
        title: '機能',
        moreFeatures: 'その他の機能',
        time: '時刻',
        timer: 'タイマー',
        randomPicker: '抽選器',
        scoreboard: 'スコアボード',
        insertImage: '画像を挿入'
    },

    // Teaching Tools
    teachingTools: {
        title: '教具',
        ruler: '定規',
        rulerStyle1: '定規 1',
        rulerStyle2: '定規 2',
        setSquare: '三角定規',
        setSquare60: '三角定規 60°',
        setSquare45: '三角定規 45°',
        hint: 'ヒント：シングルクリックで移動、ダブルクリックでサイズ変更、回転、削除',
        insertHint: '挿入する教具の数を選択',
        currentOnCanvas: 'キャンバス上の現在の数',
        addNew: '新規追加',
        rotate: '回転',
        resize: 'サイズ変更',
        delete: '削除',
        drawAlongEdge: 'エッジに沿って描画'
    },

    // Time Display
    timeDisplay: {
        title: '時刻表示',
        settingsTitle: '時刻表示設定',
        options: '時刻表示オプション',
        showDate: '日付を表示',
        showTime: '時刻を表示',
        settings: '設定',
        displayOptions: '表示オプション',
        dateAndTime: '日付と時刻',
        dateOnly: '日付のみ',
        timeOnly: '時刻のみ',
        timezone: 'タイムゾーン',
        timezoneHint: '表示するタイムゾーンを選択',
        timeFormat: '時刻形式',
        timeFormatHint: '時刻の表示形式を選択',
        dateFormat: '日付形式',
        dateFormatHint: '日付の表示形式を選択',
        colorSettings: '色設定',
        colorSettingsHint: '時刻表示のフォントと背景色を設定',
        textColor: 'テキスト色',
        bgColor: '背景色',
        fontSize: 'フォントサイズ',
        fontSizeHint: '時刻表示のフォントサイズを調整',
        fontSizeLabel: 'フォントサイズ：現在',
        opacity: '不透明度',
        opacityLabel: '不透明度：現在',
        fullscreenMode: 'フルスクリーンモード',
        fullscreenModeHint: '時刻をフルスクリーン表示するトリガーを選択',
        fullscreenFontSize: 'フルスクリーンフォントサイズ',
        fullscreenFontSizeLabel: 'フルスクリーンフォントサイズ：現在',
        fullscreenSliderLabel: 'フォントサイズ調整 (10%-85%)',
        customColor: 'カスタムカラー',
        transparent: '透明'
    },

    // Timer
    timer: {
        settingsTitle: 'タイマー設定',
        mode: 'モード',
        selectMode: 'モードを選択',
        countdown: 'カウントダウン',
        stopwatch: 'ストップウォッチ',
        duration: '期間（分）',
        hours: '時',
        minutes: '分',
        seconds: '秒',
        title: 'タイトル',
        titlePlaceholder: 'タイマーのタイトルを入力',
        setTime: '時刻設定',
        setStartTime: '開始時刻設定',
        fontSettings: 'フォント設定',
        fontSize: 'フォントサイズ',
        fontSizeLabel: 'フォントサイズ：現在',
        adjustColor: '色を調整',
        colorSettings: '色設定',
        textColor: 'テキスト色',
        bgColor: '背景色',
        opacity: '不透明度',
        opacityLabel: '不透明度：現在',
        fullscreenFontSize: 'フルスクリーンフォントサイズ',
        fullscreenFontSizeLabel: 'フルスクリーンフォントサイズ：現在',
        soundSettings: 'サウンド設定',
        playSound: 'カウントダウン終了時にアラート音を再生',
        loopPlayback: 'ループ再生',
        loopCount: 'ループ回数',
        uploadCustomAudio: 'カスタムオーディオをアップロード',
        soundPresets: {
            classBell: 'クラスベル (10秒)',
            digitalBeep: 'デジタルビープ (3秒)',
            gentle: 'ジェントル (5秒)',
            examEnd: '試験終了 (8秒)'
        },
        colors: {
            black: '黒',
            white: '白',
            blue: '青',
            red: '赤',
            green: '緑',
            yellow: '黄',
            orange: 'オレンジ',
            purple: '紫',
            transparent: '透明'
        },
        customColor: 'カスタムカラー',
        start: '開始',
        adjust: '調整',
        continue: '続行',
        pause: '一時停止',
        reset: 'リセット',
        stop: '停止',
        alertSetTime: 'カウントダウン時間を設定してください',
        alertTitle: '警告'
    },

    // Timezone names
    timezones: {
        'china': '中国 (UTC+8)',
        'newyork': 'ニューヨーク (UTC-5/-4)',
        'losangeles': 'ロサンゼルス (UTC-8/-7)',
        'chicago': 'シカゴ (UTC-6/-5)',
        'london': 'ロンドン (UTC+0/+1)',
        'paris': 'パリ (UTC+1/+2)',
        'berlin': 'ベルリン (UTC+1/+2)',
        'tokyo': '東京 (UTC+9)',
        'seoul': 'ソウル (UTC+9)',
        'hongkong': '香港 (UTC+8)',
        'singapore': 'シンガポール (UTC+8)',
        'dubai': 'ドバイ (UTC+4)',
        'sydney': 'シドニー (UTC+10/+11)',
        'auckland': 'オークランド (UTC+12/+13)',
        'utc': 'UTC (協定世界時)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Aboardへようこそ',
        content: `Aboardホワイトボードアプリケーションへようこそ！

使用のヒント：
• 下部のツールバーをクリックして、さまざまな描画ツールを選択
• Ctrl+Zで元に戻す、Ctrl+Yでやり直し
• 右上のズームボタンをクリックするか、マウスホイールでキャンバスをズーム
• 背景ボタンをクリックして、さまざまな背景パターンを選択
• 設定で無限キャンバスまたはページネーションモードを切り替え
• タッチとマウス入力の両方をサポート

クリエイティブな作業をお楽しみください！`,
        confirm: 'OK',
        noShowAgain: '再度表示しない'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: 'クリアの確認',
        message: '現在のキャンバスをクリアしてもよろしいですか？この操作は元に戻せません。他のキャンバスには影響しません。',
        confirm: '確認',
        cancel: 'キャンセル'
    },

    // Color names
    colors: {
        black: '黒',
        red: '赤',
        blue: '青',
        green: '緑',
        yellow: '黄',
        orange: 'オレンジ',
        purple: '紫',
        white: '白',
        transparent: '透明',
        lightGray: '薄いグレー',
        darkGray: '濃いグレー',
        lightBlue: '薄い青',
        lightRed: '薄い赤',
        lightGreen: '薄い緑',
        lightYellow: '薄い黄',
        lightOrange: '薄いオレンジ',
        whiteDefault: '白（デフォルト）'
    },

    // Days of week
    days: {
        sunday: '日曜日',
        monday: '月曜日',
        tuesday: '火曜日',
        wednesday: '水曜日',
        thursday: '木曜日',
        friday: '金曜日',
        saturday: '土曜日'
    }
};
