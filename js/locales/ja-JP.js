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
        help: 'ヘルプ',
        export: 'エクスポート',
        apply: '適用',
        reset: 'リセット',
        restoreSize: 'サイズを元に戻す',
        keepCentered: '中央を維持'
    },

    // Gestures
    gestures: {
        pinchZoom: 'ピンチでズーム'
    },

    errors: {
        lazyLoadFailed: '{feature}の読み込みに失敗しました。ページを再読み込みしてもう一度お試しください。'
    },

    prompts: {
        localeDownloadPrompt: '{locale} の言語パックを今すぐダウンロードしますか？',
        preferredLocaleSuggestionPrompt: 'ブラウザーの優先言語が {locale} に近いことを検出しました。今すぐダウンロードして切り替えますか？'
    },

    browserCheck: {
        title: 'ブラウザー互換性の確認',
        message: '現在のブラウザーには次の必須機能がありません。',
        updateHint: '快適に利用するには、Chrome、Edge、Firefox、Safari の最新バージョンへの更新をおすすめします。',
        continueAnyway: 'このまま続行',
        features: {
            canvas: 'Canvas API',
            es6: 'モダン JavaScript（ES6）'
        }
    },
    // Recovery dialog
    recovery: {
        title: '前回のコンテンツを復元',
        message: '前回のキャンバスコンテンツが検出されました。復元しますか？',
        restore: '復元',
        discard: '破棄',
        restoreFailed: '前回の内容を復元できませんでした。もう一度お試しください。'
    },

    // App Title
    app: {
        title: 'Aboard - ミニマリストホワイトボード',
        name: 'Aboard',
        rotateScreenTitle: '画面を回転してください',
        rotateScreenTip: '縦向きモードが検出されました。レイアウトとツールバーを正しく表示するため、横向きでご利用ください。'
    },

    // Toolbar
    toolbar: {
        undo: '元に戻す',
        redo: 'やり直す',
        pen: 'ペン',
        shape: '図形',
        move: '移動',
        select: '選択',
        eraser: '消しゴム',
        clear: 'クリア',
        background: '背景',
        teachingTools: '教具',
        more: 'もっと',
        settings: '設定',
        importProject: 'プロジェクトをインポート',
        export: 'キャンバスをエクスポート',
        zoomOut: 'ズームアウト (-)',
        zoomIn: 'ズームイン (+)',
        fullscreen: 'フルスクリーン (F11)',
        exitFullscreen: 'フルスクリーンを終了 (F11)',
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
            marker: 'マーカー',
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

            triangle: '三角形',

            diamond: 'ひし形',
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
            warning: '更新すると未保存の変更が中断される場合があります。保存済みのスナップショットが見つかると、更新後に復元できます。更新してもよろしいですか？'
        },
        lineStyle: {
            title: '線種',
            solid: '実線',
            dashed: '破線',
            dotted: '点線',
            dashdot: '一点鎖線',
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
        },
        text: {
            insertTitle: 'テキスト挿入',
            editTitle: 'テキスト編集',
            placeholder: 'ここにテキストを入力',
            size: 'サイズ',
            color: '色',
            colorPicker: 'カラーピッカー',
            font: 'フォント',
            style: 'スタイル',
            bold: '太字',
            italic: '斜体',
            underline: '下線',
            strikethrough: '取り消し線',
            decorationStyle: '線の種類',
            decorationWidth: '線の太さ',
            decorationColor: '線の色',
            uploadFont: 'フォントをアップロード',
            customFonts: 'カスタムフォント',
            fontUploadSuccess: 'フォントがアップロードされました！',
            fontExists: 'このフォントは既に存在します。',
            invalidFontFormat: '無効なフォント形式です。TTF、OTF、WOFF、またはWOFF2ファイルを使用してください。',
            fontTooLarge: 'フォントファイルが大きすぎます。最大2MBまでです。',
            storageQuotaExceeded: 'ストレージ容量を超えました。カスタムフォントを削除してください。'
        },
        select: {
            mode: '選択モード',
            clickMode: 'クリック',
            rectMode: '範囲選択',
            lassoMode: 'なげなわ',
            transform: '変換',
            rotate90: '90°回転',
            flipH: '左右反転',
            flipV: '上下反転'
        }
    },



    // Line Style Modal
    lineStyleModal: {
        title: '線種設定',
        openSettings: '詳細設定',
        preview: 'プレビュー'
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
        polar: '極座標',
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
        storageFull: '保存領域が不足しているため、これ以上画像を保存できません。古い画像をいくつか削除してください。',
        saveError: '画像の保存に失敗しました。保存領域が不足している可能性があります。',
        moveCoordinateOrigin: '原点を移動',
        moveCoordinateOriginHint: 'ボタンをクリックしてキャンバス上でドラッグして座標原点を移動',
        coordinateTools: '座標設定',
        showTicks: '目盛りを表示',
        showLabels: 'ラベルを表示',
        showPointLabels: '点ラベルを表示',
        showOrigin: '原点を表示',
        connectPoints: '点を結ぶ',
        snapToGrid: 'グリッドに吸着',
        addPoint: '点を追加',
        drawPointLine: '点と線を描画',
        pointLineModeLineOnly: '線のみ',
        pointLineModeAuto: '自動連結',
        pointLineModeSelected: '選択連結',
        addPointHint: '有効にしてキャンバスをクリックすると、座標点を順に配置して自動で結びます',
        addPointHintLineOnly: '有効にするとキャンバスを順にクリックして座標点を追加し、折れ線だけを描画します',
        addPointHintAuto: '有効にするとキャンバスを順にクリックして座標点を追加し、自動で結びます',
        addPointHintSelected: '有効にするとキャンバスで座標点を追加できます。選択ツールに切り替えると、選択した点だけが結ばれます',
        addPointHintSelectedInteractive: '有効にすると空白をクリックして点を追加できます。2点を順にクリックすると接続されます',
        clearPoints: '点を消去',
        clearPlots: 'グラフを消去',
        pointsCount: '点数',
        plotExpression: '式',
        plotColor: '色',
        plotLineStyle: '線種',
        plotStrokeWidth: '太さ',
        plotRangeTitle: '表示範囲',
        plotRangeAxis: '軸',
        plotRangeMin: '最小値',
        plotRangeMax: '最大値',
        plot: '描画',
        inputPanel: '入力パネル',
        keypadNumbers: '数字',
        keypadOperators: '記号',
        keypadVariables: '変数',
        keypadFunctions: '関数',
        plotHintCartesian: '直交座標： y = f(x) を入力。sin cos PI が使えます',
        plotHintPolar: '極座標： r = f(theta) を入力。theta はラジアン、deg は度数です',
        plotPlaceholderCartesian: '例：sin(x) + 2',
        plotPlaceholderPolar: '例：2 * sin(4 * theta)',
        plotRangeMinPlaceholder: '最小値',
        plotRangeMaxPlaceholder: '最大値',
        plotAddRange: '範囲を追加',
        plotCollapse: '折りたたむ',
        plotSave: '保存',
        plotRemoveRange: '範囲を削除',
        plotNoRange: '表示範囲の制限はありません。既定では全体を表示します。',
        noPlots: 'まだ関数グラフはありません',
        coordinateStatusAddPoint: '点と線の描画モードを有効にしました',
        coordinateStatusAddPointLineOnly: '線のみモードを有効にしました。キャンバスをクリックして座標点を追加してください',
        coordinateStatusAddPointAuto: '自動連結モードを有効にしました。キャンバスをクリックして座標点を追加してください',
        coordinateStatusAddPointSelected: '選択連結モードを有効にしました。キャンバスをクリックして座標点を追加してください',
        coordinateStatusAddPointSelectedInteractive: '選択連結モードを有効にしました。空白をクリックして点を追加し、その後2点をクリックして接続してください',
        coordinateStatusSelectLineStartPoint: '最初の点を選択しました。接続する別の点をクリックしてください',
        coordinateStatusAddPointOff: '点と線の描画モードを無効にしました',
        coordinateLineExists: 'この2点の間には既に線があります',
        coordinateLineCreated: '線を接続しました',
        connectPointsEnabled: '点線表示を有効にしました',
        connectPointsDisabled: '点線表示を無効にしました',
        pointAdded: '座標点を追加しました',
        pointsCleared: '座標点を消去しました',
        plotAdded: '関数グラフを追加しました',
        plotUpdated: '関数グラフを更新しました',
        plotError: '式が無効なため描画できません',
        plotsCleared: '関数グラフを消去しました'
    },

    // Image Controls
    imageControls: {
        confirm: '確定',
        cancel: 'キャンセル',
        flipHorizontal: '左右反転',
        flipVertical: '上下反転',
        rotate: '回転'
    },

    // Selection Controls
    selection: {
        copy: 'コピー',
        delete: '削除',
        done: '完了',
        edit: '編集',
        color: '色',
        rotate90: '90°回転',
        flipH: '左右反転',
        layer: 'レイヤー',
        layerFront: '最前面へ',
        layerBack: '最背面へ',
        layerUp: '前面へ',
        layerDown: '背面へ',
        group: 'グループ化',
        ungroup: 'グループ解除',
        position: '位置'
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
        exportSuccess: '設定のエクスポートに成功しました',
        importSuccess: '設定をインポートしました',
        importError: '無効な設定ファイルです',
        importNoChange: '設定の変更が検出されませんでした',
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
            languageHint: '既定ではシステム言語を自動判定し、必要に応じていつでも手動で切り替えられます',
            globalFont: 'グローバルフォント',
            globalFontHint: 'アプリケーションで使用するフォントを選択',
            fontManagementHint: 'フォント管理：並べ替え、表示切替、名前変更、プレビューに対応',
            showFont: 'フォントを表示',
            fontPreviewSample: '日本語フォントプレビュー ABC abc 123',
            fontPreviewText: 'プレビュー文字',
            fontPreviewSize: 'プレビューサイズ',
            fontPreviewResetText: '文字を元に戻す',
            renameFont: '名前を変更',
            expandPreview: '拡大',
            confirmDeleteFont: 'カスタムフォント「{font}」を削除してもよろしいですか？',
            resetFontManagement: '初期状態に戻す',
            resetFontManagementConfirm: 'フォント管理を初期状態に戻すと、アップロード済みフォントが削除され、順序・名称・プレビュー設定もリセットされます。続行しますか？',
            downloadedLanguagePacks: 'ダウンロード済み言語パック',
            dismissedLanguageSuggestion: '言語提案の非表示状態',
            updatePreference: '更新方法',
            updatePreferenceHint: 'アップデートの準備ができたとき、更新方法を選びます',
            updatePreferencePrompt: '空き時間に更新',
            updatePreferenceAuto: '今すぐ更新',
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
            morePanelBehaviorLabel: 'その他機能パネルの動作',
            keepMorePanelOpenHint: '機能ボタンを押した後も「その他」パネルを閉じない',
            // Toolbar customization
            toolbarCustomization: 'ツールバーのカスタマイズ',
            toolbarCustomizationHint: 'ツールバーに表示するツールを選択し、ドラッグで順序を変更',
            toolbarTools: {
                undo: '元に戻す',
                redo: 'やり直し',
                pen: 'ペン',
                move: '移動',
                select: '選択',
                eraser: '消しゴム',
                clear: 'クリア',
                background: '背景',
                more: 'その他',
                settings: '設定'
            },
            // Control button settings
            controlButtonSettings: 'コントロールボタン設定',
            controlButtonSettingsHint: '表示するコントロールボタンを選択',
            controlButtons: {
                zoom: 'ズームボタン',
                pagination: 'ページネーションボタン',
                time: '時刻表示',
                fullscreen: 'フルスクリーンボタン',
                import: 'インポートボタン',
                export: 'エクスポートボタン'
            },
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
            cacheCleanupLabel: 'キャッシュクリア',
            cacheCleanupHint: 'キャッシュ使用量を確認し、カテゴリ別に削除できます（削除前に確認あり）',
            configManagementLabel: '設定管理',
            configManagementHint: '現在のアプリ設定をエクスポートまたはインポートします',
            exportConfig: '設定をエクスポート',
            importConfig: '設定をインポート',
            compatibilityLabel: '互換インポート',
            compatibilityHint: '必要なときだけ旧版 .aboard / .json のインポート互換を有効にします',
            legacyProjectImportEnabled: '旧版プロジェクトのインポート互換を有効にする',
            legacyProjectImportEnabledHint: '有効にすると、プロジェクトのインポートで .aboard / .json も受け付け、必要時に互換モジュールを読み込みます。',
            clearSettingsCache: '設定キャッシュを削除',
            clearCanvasCache: 'キャンバスキャッシュを削除',
            clearOtherCache: 'その他のキャッシュを削除',
            cacheSizeCalculating: '計算中...',
            clearSelectedCache: '選択したキャッシュを削除',
            morePanelBehaviorLabel: 'その他機能パネルの動作',
            keepMorePanelOpenHint: '機能ボタンを押した後も「その他」パネルを閉じない',
            selectCacheType: '削除するキャッシュ種類を選択してください。',
            confirmClearTitle: 'クリアを確認',
            confirmClearSelectedCache: '削除するキャッシュ項目を選択してください:',
            clearLocalDataConfirmSuffix: '続行しますか？',
            description: '時刻表示の設定は右下の時刻エリアをクリックしてください',
            showTimeDisplay: '時刻と日付を表示',
            showTimeDisplayHint: '右上隅に現在の時刻と日付を表示',
            localDataLabel: 'ローカルデータ',
            localDataHint: 'ローカルキャッシュ、キャンバス内容、設定を消去し、初回読み込み状態に戻します',
            clearLocalDataButton: 'ローカルキャッシュを消去',
            clearLocalDataConfirm: 'ローカルキャッシュ、キャンバス内容、設定を消去し、初回読み込み状態に戻します。続行しますか？'
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
        insertImage: '画像を挿入',
        insertText: 'テキスト挿入',
        classroomMode: '授業集中'
    },

    classroom: {
        modeActive: '授業中',
        prevPage: '前のページ',
        nextPage: '次のページ',
        startTimer: 'ストップウォッチ開始',
        pauseTimer: 'ストップウォッチ一時停止',
        resetTimer: 'ストップウォッチリセット',
        stopwatch: 'ストップウォッチ',
        actions: '授業ツール',
        addPage: '新しいページ',
        countdown: 'カウントダウン',
        randomPicker: 'ランダム指名',
        scoreboard: 'スコアボード',
        teachingTools: '教具',
        exit: '授業集中を終了'
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
        drawAlongEdge: 'エッジに沿って描画',
        increaseCount: '{tool} の数を増やす',
        decreaseCount: '{tool} の数を減らす',
    },

    // Time Display
    timeDisplay: {
        title: '時刻表示',
        settingsTitle: '時刻表示設定',
        options: '時刻表示オプション',
        showDate: '日付を表示',
        showTime: '時刻を表示',
        settings: '設定',
        fullscreenDisplay: 'フルスクリーン表示',
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
        fullscreenColorSettings: 'フルスクリーン色設定',
        fullscreenFontSize: 'フルスクリーンフォントサイズ',
        fullscreenFontSizeLabel: 'フルスクリーンフォントサイズ：現在',
        fullscreenFontSizeHint: 'フルスクリーンフォントサイズを調整 (10%-85%)',
        fullscreenSliderLabel: 'フォントサイズ調整 (10%-85%)',
        customColor: 'カスタムカラー',
        transparent: '透明',
        fullscreenDisabled: '無効',
        fullscreenSingle: 'シングルクリック',
        fullscreenDouble: 'ダブルクリック',
        widgetTab: 'ウィジェット表示設定',
        fullscreenTab: '全画面表示設定'
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
        preview: '試聴',
        moreSettings: '詳細設定',
        playbackSpeed: '再生速度',
        loopPlayback: 'ループ再生',
        loopCount: 'ループ回数',
        loopInterval: 'ループ間隔',
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
            transparent: '透明',
            darkGray: '濃いグレー (デフォルト)',
            lightGray: '薄いグレー',
            lightRed: '薄い赤',
            lightBlue: '薄い青',
            lightGreen: '薄い緑',
            lightYellow: '薄い黄',
            lightOrange: '薄いオレンジ',
            whiteDefault: '白 (デフォルト)'
        },
        customColor: 'カスタムカラー',
        start: '開始',
        adjust: '調整',
        continue: '続行',
        pause: '一時停止',
        reset: 'リセット',
        stop: '停止',
        audioFallback: 'タイマー終了（サウンドを再生できません）',
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
        pink: 'ピンク',
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
    },

    export: {
        imageTab: '画像を書き出す',
        projectTab: 'プロジェクトを書き出す (.zip)',
        scopeLabel: '書き出し範囲',
        scopeCurrent: '現在のページ',
        scopeAll: 'すべてのページ',
        scopeSpecific: '指定したページ',
        pageSelectionLabel: '書き出すページを選択',
        imageFormatLabel: '画像形式',
        imageQualityLabel: '画質',
        projectHint: 'ページ、背景、アセットを含む標準 .zip プロジェクトパッケージとして書き出します。インポート後もページ単位でオブジェクト編集を続けられます。旧版 .aboard のインポートは設定で互換性を有効にした場合のみ利用できます。',
        fileNameLabel: 'ファイル名',
        fileNamePrefixLabel: 'ファイル名の接頭辞',
        fileNamePlaceholder: 'ファイル名を入力',
        fileNameHint: '複数ページを書き出す場合は、ファイル名の末尾にページ番号が自動で付きます。',
        failed: 'エクスポートに失敗しました。もう一度お試しください。'
    },

    projectPackage: {
        importSuccess: 'プロジェクトをインポートしました。',
        legacyImportSuccess: '旧版プロジェクトをインポートしました。',
        importFailed: 'プロジェクトのインポートに失敗しました: {message}',
        exportFailed: 'プロジェクトのエクスポートに失敗しました: {message}',
        overwriteConfirm: 'プロジェクトをインポートすると、現在のホワイトボード内容が上書きされます。続行しますか？',
        overwriteDetail: '現在のホワイトボードのページとリソースは、プロジェクトパッケージ内の内容に置き換えられます。',
        legacyCompatibilityDisabled: '旧版 .aboard インポート互換が無効です。先に設定で旧版互換インポートを有効にしてください。',
        zipLoaderUnavailable: 'ZIP ライブラリのローダーを利用できません。',
        zipLoadFailed: 'ZIP ライブラリの読み込みに失敗しました。',
        legacyLoaderUnavailable: '旧版互換ローダーを利用できません。',
        legacyModuleLoadFailed: '旧版プロジェクト互換モジュールの読み込みに失敗しました。',
        base64DecoderUnavailable: 'Base64 デコーダーを利用できません。',
        base64EncoderUnavailable: 'Base64 エンコーダーを利用できません。',
        unsupportedPackage: 'サポートされている Aboard プロジェクトパッケージではありません。',
        missingDocument: 'プロジェクトパッケージに document.json がありません。',
        missingPages: 'プロジェクトパッケージにページデータがありません。',
        missingAsset: 'プロジェクトパッケージにリソースファイルがありません: {path}',
        missingPageFile: 'プロジェクトパッケージにページファイルがありません: {path}',
        invalidLegacyFormat: '旧版プロジェクトファイルの形式が無効です。',
        legacyMissingPages: '旧版プロジェクトファイルにページデータがありません。',
        fileTooLarge: 'プロジェクトファイルが大きすぎます。100 MB 未満のファイルをインポートしてください。',
        unsafePath: '安全でないプロジェクトパッケージのパスです：{path}',
        tooManyPages: 'プロジェクトパッケージに含まれるページ数が多すぎます。',
        assetTooLarge: 'プロジェクトパッケージに大きすぎるアセットが含まれています：{path}',
        assetsTooLarge: 'プロジェクトパッケージに埋め込まれたアセットが多すぎます。'
    },

    randomPicker: {
        importColumnPlaceholder: '列名',
        importLibraryLoadFailed: 'Excel インポートライブラリの読み込みに失敗しました。ページを再読み込みしてもう一度お試しください。'
    },

    gif: {
        settingsTitle: 'GIF設定',
        loopCountLabel: '再生回数（0 は無限ループ）',
        loopCountPrompt: 'ループ回数を設定してください（0で無限）：',
        loopCountInvalid: '0 以上の整数を入力してください。'
    }
};
