window.locale_translation_overrides = (() => {
    const sharedFontLabels = {
        notoSansSC: 'Noto Sans SC',
        notoSerifSC: 'Noto Serif SC',
        lxgwWenKai: 'LXGW WenKai',
        sourceHanSansSC: 'Source Han Sans SC',
        sourceHanSerifSC: 'Source Han Serif SC',
        inter: 'Inter',
        roboto: 'Roboto',
        openSans: 'Open Sans',
        lora: 'Lora',
        jetBrainsMono: 'JetBrains Mono',
        kaiTi: 'KaiTi',
        stXingkai: 'STXingkai'
    };

    const deepMerge = (target, source) => {
        if (!source || typeof source !== 'object') {
            return target;
        }

        Object.entries(source).forEach(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                target[key] = deepMerge(
                    target[key] && typeof target[key] === 'object' ? target[key] : {},
                    value
                );
            } else {
                target[key] = value;
            }
        });

        return target;
    };

    const localeOverrides = {
        'zh-CN': {
            settings: {
                general: {
                    languageHint: '默认自动检测系统语言，也可以随时手动切换',
                    downloadedLanguagePacks: '已下载语言包',
                    dismissedLanguageSuggestion: '语言提示忽略状态',
                    updatePreference: '更新方式',
                    updatePreferenceHint: '检测到新版本时，选择更新方式',
                    updatePreferencePrompt: '空闲时更新',
                    updatePreferenceAuto: '立即更新'
                },
                more: {
                    configManagementLabel: '配置管理',
                    configManagementHint: '导出或导入当前的应用程序设置',
                    exportConfig: '导出配置',
                    importConfig: '导入配置',
                    compatibilityLabel: '兼容导入',
                    compatibilityHint: '仅在需要时启用旧版 .aboard / .json 导入兼容',
                    legacyProjectImportEnabled: '启用旧版项目导入兼容',
                    legacyProjectImportEnabledHint: '开启后，项目导入将额外支持 .aboard / .json，并按需加载兼容模块。'
                }
            }
        },
        'en-US': {
            settings: {
                exportFailed: 'Failed to export configuration',
                general: {
                    languageHint: 'Auto-detect your language by default, and let you switch manually anytime',
                    downloadedLanguagePacks: 'Downloaded language packs',
                    dismissedLanguageSuggestion: 'Dismissed language suggestion state',
                    updatePreference: 'Update behavior',
                    updatePreferenceHint: 'Choose how updates should be applied when a new version is ready',
                    updatePreferencePrompt: 'Update when idle',
                    updatePreferenceAuto: 'Update now'
                },
                more: {
                    configManagementLabel: 'Configuration',
                    configManagementHint: 'Export or import the current application settings',
                    exportConfig: 'Export Settings',
                    importConfig: 'Import Settings',
                    compatibilityLabel: 'Compatibility Import',
                    compatibilityHint: 'Enable legacy .aboard / .json import support only when needed',
                    legacyProjectImportEnabled: 'Enable legacy project import compatibility',
                    legacyProjectImportEnabledHint: 'When enabled, project import also accepts .aboard / .json files and loads the compatibility module on demand.'
                },
                diff: {
                    current: 'Current',
                    new: 'New'
                }
            }
        },
        'zh-TW': {
            common: {
                inputRequired: '請輸入內容。',
                preview: '預覽',
                settings: '設定',
                dragToMove: '拖曳以移動'
            },
            teachingTools: {
                increaseCount: '增加 {tool} 數量',
                decreaseCount: '減少 {tool} 數量'
            },
            timeDisplay: {
                am: '上午',
                pm: '下午',
                titleFontSize: '標題字體大小',
                timeFontSize: '時間字體大小'
            },
            background: {
                imagePrefix: '圖片'
            },
            settings: {
                diff: {
                    current: '目前',
                    new: '新值'
                },
                display: {
                    showToolbarText: '顯示工具欄文字',
                    showToolbarTextHint: '是否在工具欄按鈕中顯示文字標籤'
                },
                general: {
                    fontManagementHint: '字體管理：支援排序、顯示開關、重新命名與預覽',
                    showFont: '顯示字體',
                    fontPreviewSample: '中文字體預覽 ABC abc 123',
                    updatePreference: '更新方式',
                    updatePreferenceHint: '偵測到新版本時，選擇更新方式',
                    updatePreferencePrompt: '空閒時更新',
                    updatePreferenceAuto: '立即更新',
                    fonts: {
                        notoSansSC: '思源黑體',
                        notoSerifSC: '思源宋體',
                        lxgwWenKai: '霞鶩文楷',
                        sourceHanSansSC: '思源黑體 CN',
                        sourceHanSerifSC: '思源宋體 CN',
                        inter: 'Inter',
                        roboto: 'Roboto',
                        openSans: 'Open Sans',
                        lora: 'Lora',
                        jetBrainsMono: 'JetBrains Mono',
                        kaiTi: '楷體',
                        stXingkai: '華文行楷'
                    }
                },
                time: {
                    dateFormatAuto: '自動（跟隨系統）'
                }
            },
            timer: {
                titleFontSize: '標題字體大小',
                timeFontSize: '時間字體大小'
            },
            export: {
                selectAtLeastOnePage: '請至少選擇一個頁面',
                paginationRequired: '此功能需要先啟用分頁模式',
                noPages: '目前沒有可匯出的頁面'
            }
        },
        'ja-JP': {
            common: {
                inputRequired: '内容を入力してください。',
                start: '開始',
                stop: '停止',
                preview: 'プレビュー',
                settings: '設定',
                dragToMove: 'ドラッグして移動'
            },
            errors: {
                fileReadFailed: '選択したファイルを読み取れませんでした。ファイルが破損していないか確認して、もう一度お試しください。',
                storageWriteFailed: '保存できませんでした。ブラウザーのストレージ権限を確認して、もう一度お試しください。',
                sessionSaveFailed: 'ホワイトボードの自動保存に失敗しました。現在の内容を復元できない可能性があります。早めにバックアップをエクスポートするか、設定で保存領域を整理してください。',
                sessionWriteConflict: '別の Aboard タブが自動保存を使用しています。このタブの変更は一時的に自動保存されません。別のタブを閉じてから続行してください。',
                sessionDataClearedElsewhere: '別のタブで保存済みのホワイトボードデータが消去されました。必要な内容をエクスポートしてから、このタブを再読み込みしてください。',
                clearLocalDataBlocked: '開いている別の Aboard ウィンドウにより、ローカルキャッシュの消去がブロックされました。他の Aboard タブを閉じてから、もう一度お試しください。',
                clearLocalDataFailed: 'ローカルキャッシュの消去が完了しませんでした。後でもう一度お試しください。'
            },
            teachingTools: {
                increaseCount: '{tool} の数を増やす',
                decreaseCount: '{tool} の数を減らす'
            },
            tools: {
                pen: {
                    thickness: 'ペンの太さ'
                },
                eraser: {
                    sizeLabel: '消しゴムサイズ：現在',
                    shape: '形状'
                }
            },
            timeDisplay: {
                am: '午前',
                pm: '午後',
                titleFontSize: 'タイトル文字サイズ',
                timeFontSize: '時刻文字サイズ'
            },
            background: {
                imagePrefix: '画像',
                opacityLabel: '背景の不透明度：現在',
                contrastLabel: 'パターン濃度：現在',
                preferenceHint: 'プロパティバーに表示する背景パターンを選択',
                upload: 'アップロード'
            },
            settings: {
                exportFailed: '設定のエクスポートに失敗しました',
                diff: {
                    current: '現在',
                    new: '新規',
                    title: '設定差分',
                    message: 'インポート前に、現在の設定と新しい設定の違いを確認してください。',
                    oldValue: '旧値',
                    newValue: '新値',
                    confirm: '確認してインポート',
                    cancel: 'キャンセル',
                    noChanges: '差分はありません。設定内容は同一です。'
                },
                display: {
                    showImportExportBtn: 'インポート/エクスポートボタンを表示',
                    showImportExportBtnHint: '有効にすると、ズームコントロールの横にインポート/エクスポートボタンを表示します',
                    showToolbarText: 'ツールバーの文字を表示',
                    showToolbarTextHint: 'ツールバーボタンにテキストラベルを表示するかどうか'
                },
                general: {
                    fontManagementHint: 'フォント管理：並べ替え、表示切替、名前変更、プレビューに対応',
                    showFont: 'フォントを表示',
                    fontPreviewSample: '日本語フォントプレビュー ABC abc 123',
                    updatePreference: '更新方法',
                    updatePreferenceHint: 'アップデートの準備ができたとき、更新方法を選びます',
                    updatePreferencePrompt: '空き時間に更新',
                    updatePreferenceAuto: '今すぐ更新',
                    touchZoom: 'タッチズーム',
                    touchZoomHint: '二本指のピンチ操作でキャンバスを拡大・縮小できるようにします',
                    fonts: {
                        ...sharedFontLabels
                    }
                },
                canvas: {
                    unlimitedZoom: '無制限ズームを許可',
                    unlimitedZoomHint: '標準では最大1000%まで拡大でき、有効にするとさらに最大500倍まで拡大できます'
                },
                time: {
                    timezoneHint: '表示するタイムゾーンを選択します',
                    timeFormatHint: '時刻の表示形式を選択します',
                    dateFormatHint: '日付の表示形式を選択します',
                    dateFormatAuto: 'システムに従う',
                    colorSettingsHint: '時刻ウィジェットの文字色と背景色を設定します',
                    fontSizeHint: '時刻ウィジェットの文字サイズを調整します',
                    opacityHint: '時刻ウィジェットの透明度を調整します',
                    fullscreenModeHint: '全画面表示への入り方を選択します',
                    displayOptions: '表示オプション'
                }
            },
            randomPicker: {
                namePicker: '名前抽選',
                numberPicker: '数字抽選',
                noNames: '少なくとも1つの名前を入力してください',
                settingsTitle: '抽選設定',
                modeName: '名前',
                modeNumber: '数字',
                titleLabel: 'タイトル',
                titlePlaceholder: '例：クイックチェック',
                namesLabel: '名前リスト',
                namesPlaceholder: '1行に1つずつ名前を入力',
                defaultNames: '佐藤\n鈴木\n高橋\n田中\n伊藤',
                allowRepeats: '重複を許可',
                rangeLabel: '数値範囲',
                rangeMin: '最小値',
                rangeMax: '最大値',
                importLabel: 'リストをインポート',
                importColumnPlaceholder: '列名',
                defaultColumnName: '名前',
                importBtn: 'Excel/CSVをインポート',
                importHint: '.xlsx・.xls・.csv に対応し、名前列を自動検出します',
                importSuccess: '{count} 件の名前をインポートしました',
                importNoData: '有効なデータが見つかりませんでした',
                importError: 'ファイルのインポートに失敗しました'
            },
            scoreboard: {
                title: 'スコアボード',
                addTeam: 'チームを追加',
                reset: 'リセット',
                confirmRemoveTeam: 'このチームを削除しますか？',
                teamDefault: 'チーム',
                removeTeam: 'チームを削除',
                increaseScore: '{team} に加点',
                decreaseScore: '{team} を減点',
                confirmReset: 'すべてのスコアをリセットしますか？'
            },
            timer: {
                timerTitle: 'タイマーのタイトル',
                titleFontSize: 'タイトル文字サイズ',
                timeFontSize: '時刻文字サイズ',
                minimal: '最小表示',
                minimalMode: '最小表示（ダブルクリックで復元）',
                preview: '試聴',
                customSoundQuotaExceeded: '保存領域が不足しています。カスタム通知音をいくつか削除してください。'
            },
            export: {
                selectAtLeastOnePage: '少なくとも1ページを選択してください',
                paginationRequired: 'この機能を使うにはページ分割モードを有効にしてください',
                noPages: 'エクスポートできるページがありません'
            },
            projectPackage: {
                rasterFallbackUnavailable: 'プロジェクト内容を完全に保持するためのラスター形式のページデータを利用できません。'
            }
        },
        'ko-KR': {
            common: {
                inputRequired: '내용을 입력해 주세요.',
                start: '시작',
                stop: '중지',
                preview: '미리보기',
                settings: '설정',
                dragToMove: '드래그하여 이동'
            },
            errors: {
                fileReadFailed: '선택한 파일을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인한 후 다시 시도하세요.',
                storageWriteFailed: '저장하지 못했습니다. 브라우저 저장소 권한을 확인한 후 다시 시도하세요.',
                sessionSaveFailed: '화이트보드 자동 저장에 실패했습니다. 현재 내용을 복구하지 못할 수 있습니다. 가능한 한 빨리 백업을 내보내거나 설정에서 저장 공간을 정리하세요.',
                sessionWriteConflict: '다른 Aboard 탭에서 자동 저장을 사용 중입니다. 현재 탭의 변경 사항은 당분간 자동 저장되지 않습니다. 다른 탭을 닫은 후 계속하세요.',
                sessionDataClearedElsewhere: '다른 탭에서 저장된 화이트보드 데이터를 삭제했습니다. 필요한 내용을 먼저 내보낸 다음 현재 탭을 새로고침하세요.',
                clearLocalDataBlocked: '열려 있는 다른 Aboard 창 때문에 로컬 캐시를 삭제할 수 없습니다. 다른 Aboard 탭을 닫은 후 다시 시도하세요.',
                clearLocalDataFailed: '로컬 캐시 삭제가 완료되지 않았습니다. 잠시 후 다시 시도하세요.'
            },
            teachingTools: {
                increaseCount: '{tool} 수 늘리기',
                decreaseCount: '{tool} 수 줄이기'
            },
            tools: {
                pen: {
                    thickness: '펜 굵기'
                },
                eraser: {
                    sizeLabel: '지우개 크기: 현재',
                    shape: '모양'
                }
            },
            timeDisplay: {
                am: '오전',
                pm: '오후',
                titleFontSize: '제목 글꼴 크기',
                timeFontSize: '시간 글꼴 크기'
            },
            background: {
                imagePrefix: '이미지',
                opacityLabel: '배경 불투명도: 현재',
                contrastLabel: '패턴 강도: 현재',
                preferenceHint: '속성 바에 표시할 배경 패턴을 선택하세요',
                upload: '업로드'
            },
            settings: {
                exportFailed: '설정 내보내기에 실패했습니다',
                diff: {
                    current: '현재',
                    new: '새 값',
                    title: '설정 차이',
                    message: '가져오기 전에 현재 설정과 새 설정의 차이를 확인하세요.',
                    oldValue: '이전 값',
                    newValue: '새 값',
                    confirm: '확인 후 가져오기',
                    cancel: '취소',
                    noChanges: '차이가 없습니다. 설정이 완전히 동일합니다.'
                },
                display: {
                    showImportExportBtn: '가져오기/내보내기 버튼 표시',
                    showImportExportBtnHint: '활성화하면 확대/축소 컨트롤 옆에 가져오기/내보내기 버튼을 표시합니다',
                    showToolbarText: '툴바 텍스트 표시',
                    showToolbarTextHint: '툴바 버튼에 텍스트 라벨을 표시할지 여부'
                },
                general: {
                    fontManagementHint: '글꼴 관리: 정렬, 표시 전환, 이름 변경 및 미리보기 지원',
                    showFont: '글꼴 표시',
                    fontPreviewSample: '한글 글꼴 미리보기 ABC abc 123',
                    updatePreference: '업데이트 방식',
                    updatePreferenceHint: '업데이트 준비 시 적용할 방식을 선택합니다',
                    updatePreferencePrompt: '한가할 때 업데이트',
                    updatePreferenceAuto: '지금 업데이트',
                    touchZoom: '터치 확대/축소',
                    touchZoomHint: '두 손가락 핀치 제스처로 캔버스를 확대/축소할 수 있습니다',
                    fonts: {
                        ...sharedFontLabels
                    }
                },
                canvas: {
                    unlimitedZoom: '무제한 확대 허용',
                    unlimitedZoomHint: '기본 확대 한도는 1000%이며, 활성화하면 최대 500배까지 계속 확대할 수 있습니다'
                },
                time: {
                    timezoneHint: '표시할 시간대를 선택하세요',
                    timeFormatHint: '시간 표시 형식을 선택하세요',
                    dateFormatHint: '날짜 표시 형식을 선택하세요',
                    dateFormatAuto: '시스템 설정 따르기',
                    colorSettingsHint: '시간 위젯의 글자색과 배경색을 설정합니다',
                    fontSizeHint: '시간 위젯의 글꼴 크기를 조정합니다',
                    opacityHint: '시간 위젯의 투명도를 조정합니다',
                    fullscreenModeHint: '전체 화면 진입 방식을 선택하세요',
                    displayOptions: '표시 옵션'
                }
            },
            randomPicker: {
                namePicker: '이름 추첨기',
                numberPicker: '숫자 추첨기',
                noNames: '이름을 하나 이상 입력하세요',
                settingsTitle: '추첨기 설정',
                modeName: '이름',
                modeNumber: '숫자',
                titleLabel: '제목',
                titlePlaceholder: '예: 빠른 질문',
                namesLabel: '이름 목록',
                namesPlaceholder: '한 줄에 하나씩 이름을 입력하세요',
                defaultNames: '민준\n서연\n지후\n하윤\n도윤',
                allowRepeats: '중복 허용',
                rangeLabel: '숫자 범위',
                rangeMin: '최솟값',
                rangeMax: '최댓값',
                importLabel: '목록 가져오기',
                importColumnPlaceholder: '열 이름',
                defaultColumnName: '이름',
                importBtn: 'Excel/CSV 가져오기',
                importHint: '.xlsx, .xls, .csv를 지원하며 이름 열을 자동으로 감지합니다',
                importSuccess: '{count}개의 이름을 가져왔습니다',
                importNoData: '유효한 데이터를 찾지 못했습니다',
                importError: '파일을 가져오지 못했습니다'
            },
            scoreboard: {
                title: '점수판',
                addTeam: '팀 추가',
                reset: '초기화',
                confirmRemoveTeam: '이 팀을 삭제할까요?',
                teamDefault: '팀',
                removeTeam: '팀 삭제',
                increaseScore: '{team} 점수 올리기',
                decreaseScore: '{team} 점수 내리기',
                confirmReset: '모든 점수를 초기화할까요?'
            },
            timer: {
                timerTitle: '타이머 제목',
                titleFontSize: '제목 글꼴 크기',
                timeFontSize: '시간 글꼴 크기',
                minimal: '최소 표시',
                minimalMode: '최소 표시 모드(더블클릭으로 복원)',
                preview: '미리듣기',
                customSoundQuotaExceeded: '저장 공간이 부족합니다. 사용자 지정 알림음을 일부 삭제하세요.'
            },
            export: {
                selectAtLeastOnePage: '최소 한 페이지를 선택하세요',
                paginationRequired: '이 기능을 사용하려면 페이지 모드를 먼저 활성화해야 합니다',
                noPages: '내보낼 페이지가 없습니다'
            },
            projectPackage: {
                rasterFallbackUnavailable: '프로젝트 내용을 완전히 보존하는 데 필요한 래스터 페이지 데이터를 사용할 수 없습니다.'
            }
        },
        'fr-FR': {
            common: {
                inputRequired: 'Veuillez saisir du contenu.',
                start: 'Demarrer',
                stop: 'Arreter',
                preview: 'Apercu',
                settings: 'Parametres',
                dragToMove: 'Faire glisser pour deplacer'
            },
            errors: {
                fileReadFailed: 'Impossible de lire le fichier sélectionné. Vérifiez qu\'il n\'est pas endommagé, puis réessayez.',
                storageWriteFailed: 'Échec de l\'enregistrement. Vérifiez les autorisations de stockage du navigateur, puis réessayez.',
                sessionSaveFailed: 'L\'enregistrement automatique du tableau blanc a échoué. Le contenu actuel risque de ne pas pouvoir être restauré. Exportez rapidement une sauvegarde ou libérez de l\'espace dans les paramètres.',
                sessionWriteConflict: 'Un autre onglet Aboard utilise l\'enregistrement automatique. Les modifications de cet onglet ne seront temporairement pas enregistrées automatiquement. Fermez l\'autre onglet pour continuer.',
                sessionDataClearedElsewhere: 'Un autre onglet a effacé les données enregistrées du tableau blanc. Exportez d\'abord le contenu à conserver, puis rechargez cet onglet.',
                clearLocalDataBlocked: 'Le nettoyage du cache local est bloqué par une autre fenêtre Aboard ouverte. Fermez les autres onglets Aboard, puis réessayez.',
                clearLocalDataFailed: 'Le nettoyage du cache local n\'a pas pu être terminé. Réessayez plus tard.'
            },
            teachingTools: {
                increaseCount: 'Augmenter le nombre de {tool}',
                decreaseCount: 'Diminuer le nombre de {tool}'
            },
            tools: {
                pen: {
                    thickness: 'Epaisseur du stylo'
                },
                eraser: {
                    sizeLabel: 'Taille de la gomme : Actuelle',
                    shape: 'Forme'
                }
            },
            timeDisplay: {
                am: 'AM',
                pm: 'PM',
                titleFontSize: 'Taille de police du titre',
                timeFontSize: 'Taille de police de l\'heure'
            },
            background: {
                imagePrefix: 'Image',
                opacityLabel: 'Opacite de l\'arriere-plan : Actuelle',
                contrastLabel: 'Intensite du motif : Actuelle',
                preferenceHint: 'Choisissez les motifs affiches dans la barre des proprietes',
                upload: 'Televerser'
            },
            settings: {
                exportFailed: 'Echec de l\'exportation de la configuration',
                diff: {
                    current: 'Actuel',
                    new: 'Nouveau',
                    title: 'Differences de configuration',
                    message: 'Verifiez les differences entre la configuration actuelle et la nouvelle configuration avant l\'importation.',
                    oldValue: 'Ancienne valeur',
                    newValue: 'Nouvelle valeur',
                    confirm: 'Confirmer l\'importation',
                    cancel: 'Annuler',
                    noChanges: 'Aucune différence détectée. Les réglages sont identiques.'
                },
                display: {
                    showImportExportBtn: 'Afficher les boutons d\'import/export',
                    showImportExportBtnHint: 'Une fois active, les boutons d\'import/export s\'affichent a cote des controles de zoom',
                    showToolbarText: 'Afficher le texte de la barre d\'outils',
                    showToolbarTextHint: 'Afficher ou non les libelles sur les boutons de la barre d\'outils'
                },
                general: {
                    fontManagementHint: 'Gestion des polices : tri, affichage, renommage et apercu pris en charge',
                    showFont: 'Afficher la police',
                    fontPreviewSample: 'Apercu de police ABC abc 123',
                    updatePreference: 'Mode de mise a jour',
                    updatePreferenceHint: 'Choisit comment appliquer une mise a jour lorsqu\'elle est prete',
                    updatePreferencePrompt: 'Mettre a jour au repos',
                    updatePreferenceAuto: 'Mettre a jour maintenant',
                    touchZoom: 'Zoom tactile',
                    touchZoomHint: 'Autoriser le zoom de la toile par pincement a deux doigts',
                    fonts: {
                        ...sharedFontLabels
                    }
                },
                canvas: {
                    unlimitedZoom: 'Autoriser le zoom illimite',
                    unlimitedZoomHint: 'Le zoom par defaut monte desormais a 1000 % ; activez cette option pour continuer jusqu\'a 500x'
                },
                time: {
                    timezoneHint: 'Choisissez le fuseau horaire affiche',
                    timeFormatHint: 'Choisissez le format d\'affichage de l\'heure',
                    dateFormatHint: 'Choisissez le format d\'affichage de la date',
                    dateFormatAuto: 'Suivre le systeme',
                    colorSettingsHint: 'Reglez les couleurs du texte et de l\'arriere-plan du widget temporel',
                    fontSizeHint: 'Reglez la taille du texte du widget temporel',
                    opacityHint: 'Reglez la transparence du widget temporel',
                    fullscreenModeHint: 'Choisissez le mode d\'entree en plein ecran',
                    displayOptions: 'Options d\'affichage'
                }
            },
            randomPicker: {
                namePicker: 'Selecteur de noms',
                numberPicker: 'Selecteur de nombres',
                noNames: 'Veuillez saisir au moins un nom',
                settingsTitle: 'Parametres du selecteur',
                modeName: 'Noms',
                modeNumber: 'Nombres',
                titleLabel: 'Titre',
                titlePlaceholder: 'Ex. : Interrogation eclair',
                namesLabel: 'Liste des noms',
                namesPlaceholder: 'Saisissez un nom par ligne',
                defaultNames: 'Alice\nBruno\nChloe\nDavid\nEmma',
                allowRepeats: 'Autoriser les repetitions',
                rangeLabel: 'Plage de nombres',
                rangeMin: 'Minimum',
                rangeMax: 'Maximum',
                importLabel: 'Importer une liste',
                importColumnPlaceholder: 'Colonne',
                defaultColumnName: 'Nom',
                importBtn: 'Importer Excel/CSV',
                importHint: 'Prend en charge .xlsx, .xls et .csv, et detecte automatiquement la colonne des noms',
                importSuccess: '{count} noms importes avec succes',
                importNoData: 'Aucune donnee valide n\'a ete trouvee',
                importError: 'Echec de l\'importation du fichier'
            },
            scoreboard: {
                title: 'Tableau de score',
                addTeam: 'Ajouter une equipe',
                reset: 'Reinitialiser',
                confirmRemoveTeam: 'Supprimer cette equipe ?',
                teamDefault: 'Equipe',
                removeTeam: 'Supprimer l\'equipe',
                increaseScore: 'Augmenter le score de {team}',
                decreaseScore: 'Diminuer le score de {team}',
                confirmReset: 'Reinitialiser tous les scores ?'
            },
            timer: {
                selectMode: 'Selectionner le mode',
                timerTitle: 'Titre du minuteur',
                setTime: 'Definir l\'heure',
                setStartTime: 'Definir l\'heure de depart',
                titleFontSize: 'Taille de police du titre',
                timeFontSize: 'Taille de police du temps',
                minimal: 'Minimal',
                minimalMode: 'Mode minimal',
                preview: 'Aperçu',
                opacity: 'Opacite',
                opacityLabel: 'Opacite : Actuelle',
                fullscreenFontSize: 'Taille de police en plein ecran',
                fullscreenFontSizeLabel: 'Taille de police en plein ecran : Actuelle',
                customSoundQuotaExceeded: 'Espace de stockage insuffisant. Supprimez quelques sons personnalisés.'
            },
            export: {
                selectAtLeastOnePage: 'Veuillez selectionner au moins une page',
                paginationRequired: 'Cette fonctionnalite necessite d\'activer le mode pagine',
                noPages: 'Aucune page disponible a exporter'
            },
            projectPackage: {
                rasterFallbackUnavailable: 'Les données de page matricielles nécessaires pour préserver entièrement le projet ne sont pas disponibles.'
            }
        },
        'es-ES': {
            common: {
                inputRequired: 'Introduce contenido.',
                start: 'Iniciar',
                stop: 'Detener',
                preview: 'Vista previa',
                settings: 'Configuracion',
                dragToMove: 'Arrastra para mover'
            },
            errors: {
                fileReadFailed: 'No se pudo leer el archivo seleccionado. Comprueba que no esté dañado y vuelve a intentarlo.',
                storageWriteFailed: 'No se pudo guardar. Comprueba los permisos de almacenamiento del navegador y vuelve a intentarlo.',
                sessionSaveFailed: 'Falló el guardado automático de la pizarra. Es posible que no se pueda recuperar el contenido actual. Exporta una copia de seguridad cuanto antes o libera espacio desde los ajustes.',
                sessionWriteConflict: 'Otra pestaña de Aboard está usando el guardado automático. Los cambios de esta pestaña no se guardarán automáticamente por el momento. Cierra la otra pestaña para continuar.',
                sessionDataClearedElsewhere: 'Otra pestaña borró los datos guardados de la pizarra. Exporta primero el contenido que necesites conservar y después recarga esta pestaña.',
                clearLocalDataBlocked: 'Otra ventana de Aboard abierta impide limpiar la caché local. Cierra las demás pestañas de Aboard y vuelve a intentarlo.',
                clearLocalDataFailed: 'No se pudo completar la limpieza de la caché local. Vuelve a intentarlo más tarde.'
            },
            teachingTools: {
                increaseCount: 'Aumentar la cantidad de {tool}',
                decreaseCount: 'Reducir la cantidad de {tool}'
            },
            tools: {
                pen: {
                    thickness: 'Grosor del lapiz'
                },
                eraser: {
                    sizeLabel: 'Tamano del borrador: Actual',
                    shape: 'Forma'
                }
            },
            timeDisplay: {
                am: 'AM',
                pm: 'PM',
                titleFontSize: 'Tamano de fuente del titulo',
                timeFontSize: 'Tamano de fuente de la hora'
            },
            background: {
                imagePrefix: 'Imagen',
                opacityLabel: 'Opacidad del fondo: Actual',
                contrastLabel: 'Intensidad del patron: Actual',
                preferenceHint: 'Elige los patrones que se muestran en la barra de propiedades',
                upload: 'Subir'
            },
            settings: {
                exportFailed: 'No se pudo exportar la configuracion',
                diff: {
                    current: 'Actual',
                    new: 'Nuevo',
                    title: 'Diferencias de configuracion',
                    message: 'Revisa las diferencias entre la configuracion actual y la nueva antes de importar.',
                    oldValue: 'Valor anterior',
                    newValue: 'Valor nuevo',
                    confirm: 'Confirmar importacion',
                    cancel: 'Cancelar',
                    noChanges: 'No hay diferencias. La configuración es idéntica.'
                },
                display: {
                    showImportExportBtn: 'Mostrar botones de importar/exportar',
                    showImportExportBtnHint: 'Al activarlo, los botones de importar/exportar se muestran junto a los controles de zoom',
                    showToolbarText: 'Mostrar texto en la barra de herramientas',
                    showToolbarTextHint: 'Define si los botones de la barra muestran etiquetas de texto'
                },
                general: {
                    fontManagementHint: 'Gestion de fuentes: permite ordenar, mostrar u ocultar, renombrar y previsualizar',
                    showFont: 'Mostrar fuente',
                    fontPreviewSample: 'Vista previa de fuente ABC abc 123',
                    updatePreference: 'Modo de actualizacion',
                    updatePreferenceHint: 'Elige como aplicar la actualizacion cuando este lista',
                    updatePreferencePrompt: 'Actualizar en inactividad',
                    updatePreferenceAuto: 'Actualizar ahora',
                    touchZoom: 'Zoom tactil',
                    touchZoomHint: 'Permite acercar o alejar el lienzo con dos dedos',
                    fonts: {
                        ...sharedFontLabels
                    }
                },
                canvas: {
                    unlimitedZoom: 'Permitir zoom ilimitado',
                    unlimitedZoomHint: 'El zoom predeterminado ahora llega al 1000 %; activalo para seguir ampliando hasta 500x'
                },
                time: {
                    timezoneHint: 'Elige la zona horaria que deseas mostrar',
                    timeFormatHint: 'Elige el formato de hora',
                    dateFormatHint: 'Elige el formato de fecha',
                    dateFormatAuto: 'Seguir al sistema',
                    colorSettingsHint: 'Configura los colores del texto y del fondo del widget de hora',
                    fontSizeHint: 'Ajusta el tamano del texto del widget de hora',
                    opacityHint: 'Ajusta la transparencia del widget de hora',
                    fullscreenModeHint: 'Elige como entrar en pantalla completa',
                    displayOptions: 'Opciones de visualizacion'
                }
            },
            randomPicker: {
                namePicker: 'Selector de nombres',
                numberPicker: 'Selector de numeros',
                noNames: 'Introduce al menos un nombre',
                settingsTitle: 'Configuracion del selector',
                modeName: 'Nombres',
                modeNumber: 'Numeros',
                titleLabel: 'Titulo',
                titlePlaceholder: 'Ej.: Pregunta rapida',
                namesLabel: 'Lista de nombres',
                namesPlaceholder: 'Escribe un nombre por linea',
                defaultNames: 'Ana\nLuis\nMarta\nDiego\nElena',
                allowRepeats: 'Permitir repeticiones',
                rangeLabel: 'Rango numerico',
                rangeMin: 'Minimo',
                rangeMax: 'Maximo',
                importLabel: 'Importar lista',
                importColumnPlaceholder: 'Columna',
                defaultColumnName: 'Nombre',
                importBtn: 'Importar Excel/CSV',
                importHint: 'Compatible con .xlsx, .xls y .csv; detecta automaticamente la columna de nombres',
                importSuccess: 'Se importaron {count} nombres correctamente',
                importNoData: 'No se encontraron datos validos',
                importError: 'No se pudo importar el archivo'
            },
            scoreboard: {
                title: 'Marcador',
                addTeam: 'Agregar equipo',
                reset: 'Restablecer',
                confirmRemoveTeam: 'Eliminar este equipo?',
                teamDefault: 'Equipo',
                removeTeam: 'Eliminar equipo',
                increaseScore: 'Aumentar la puntuacion de {team}',
                decreaseScore: 'Disminuir la puntuacion de {team}',
                confirmReset: 'Restablecer todas las puntuaciones?'
            },
            timer: {
                selectMode: 'Seleccionar modo',
                timerTitle: 'Titulo del temporizador',
                setTime: 'Definir tiempo',
                setStartTime: 'Definir hora inicial',
                titleFontSize: 'Tamano de fuente del titulo',
                timeFontSize: 'Tamano de fuente del tiempo',
                minimal: 'Mínimo',
                minimalMode: 'Modo mínimo',
                preview: 'Vista previa',
                opacity: 'Opacidad',
                opacityLabel: 'Opacidad: Actual',
                fullscreenFontSize: 'Tamano de fuente en pantalla completa',
                fullscreenFontSizeLabel: 'Tamano de fuente en pantalla completa: Actual',
                customSoundQuotaExceeded: 'No hay espacio de almacenamiento suficiente. Elimina algunos sonidos personalizados.'
            },
            export: {
                selectAtLeastOnePage: 'Selecciona al menos una pagina',
                paginationRequired: 'Esta funcion requiere activar primero el modo paginado',
                noPages: 'No hay paginas disponibles para exportar'
            },
            projectPackage: {
                rasterFallbackUnavailable: 'No están disponibles los datos de página rasterizados necesarios para conservar todo el contenido del proyecto.'
            }
        },
        'de-DE': {
            common: {
                inputRequired: 'Bitte geben Sie einen Inhalt ein.',
                start: 'Starten',
                stop: 'Stoppen',
                preview: 'Vorschau',
                settings: 'Einstellungen',
                dragToMove: 'Zum Verschieben ziehen'
            },
            errors: {
                fileReadFailed: 'Die ausgewählte Datei konnte nicht gelesen werden. Prüfen Sie, ob sie beschädigt ist, und versuchen Sie es erneut.',
                storageWriteFailed: 'Speichern fehlgeschlagen. Prüfen Sie die Speicherberechtigung des Browsers und versuchen Sie es erneut.',
                sessionSaveFailed: 'Die automatische Speicherung des Whiteboards ist fehlgeschlagen. Der aktuelle Inhalt kann möglicherweise nicht wiederhergestellt werden. Exportieren Sie möglichst bald eine Sicherung oder geben Sie in den Einstellungen Speicherplatz frei.',
                sessionWriteConflict: 'Ein anderer Aboard-Tab verwendet die automatische Speicherung. Änderungen in diesem Tab werden vorübergehend nicht automatisch gespeichert. Schließen Sie den anderen Tab, um fortzufahren.',
                sessionDataClearedElsewhere: 'Ein anderer Tab hat die gespeicherten Whiteboard-Daten gelöscht. Exportieren Sie zuerst alle Inhalte, die Sie behalten möchten, und laden Sie diesen Tab anschließend neu.',
                clearLocalDataBlocked: 'Ein anderes geöffnetes Aboard-Fenster blockiert das Löschen des lokalen Caches. Schließen Sie die anderen Aboard-Tabs und versuchen Sie es erneut.',
                clearLocalDataFailed: 'Der lokale Cache konnte nicht vollständig gelöscht werden. Versuchen Sie es später erneut.'
            },
            teachingTools: {
                increaseCount: 'Anzahl fur {tool} erhohen',
                decreaseCount: 'Anzahl fur {tool} verringern'
            },
            tools: {
                pen: {
                    thickness: 'Stiftdicke'
                },
                eraser: {
                    sizeLabel: 'Radiergrosse: Aktuell',
                    shape: 'Form'
                }
            },
            timeDisplay: {
                am: 'AM',
                pm: 'PM',
                titleFontSize: 'Titelschriftgrosse',
                timeFontSize: 'Zeitschriftgrosse'
            },
            background: {
                imagePrefix: 'Bild',
                opacityLabel: 'Hintergrundtransparenz: Aktuell',
                contrastLabel: 'Musterintensitat: Aktuell',
                preferenceHint: 'Wahle die Muster aus, die in der Eigenschaftenleiste angezeigt werden',
                upload: 'Hochladen'
            },
            settings: {
                exportFailed: 'Konfiguration konnte nicht exportiert werden',
                diff: {
                    current: 'Aktuell',
                    new: 'Neu',
                    title: 'Konfigurationsunterschiede',
                    message: 'Bitte prufe vor dem Import die Unterschiede zwischen der aktuellen und der neuen Konfiguration.',
                    oldValue: 'Alter Wert',
                    newValue: 'Neuer Wert',
                    confirm: 'Import bestatigen',
                    cancel: 'Abbrechen',
                    noChanges: 'Keine Unterschiede gefunden. Die Einstellungen sind identisch.'
                },
                display: {
                    showImportExportBtn: 'Import-/Export-Schaltflachen anzeigen',
                    showImportExportBtnHint: 'Wenn aktiviert, werden Import-/Export-Schaltflachen neben den Zoom-Steuerelementen angezeigt',
                    showToolbarText: 'Werkzeugleistentext anzeigen',
                    showToolbarTextHint: 'Legt fest, ob Werkzeugleistenschaltflachen Textbeschriftungen anzeigen'
                },
                general: {
                    fontManagementHint: 'Schriftverwaltung: Sortieren, Ein-/Ausblenden, Umbenennen und Vorschau werden unterstutzt',
                    showFont: 'Schrift anzeigen',
                    fontPreviewSample: 'Schriftvorschau ABC abc 123',
                    updatePreference: 'Update-Verhalten',
                    updatePreferenceHint: 'Legt fest, wie ein Update angewendet wird, sobald es bereitsteht',
                    updatePreferencePrompt: 'Im Leerlauf aktualisieren',
                    updatePreferenceAuto: 'Jetzt aktualisieren',
                    touchZoom: 'Touch-Zoom',
                    touchZoomHint: 'Erlaubt das Zoomen der Leinwand mit Zwei-Finger-Gesten',
                    fonts: {
                        ...sharedFontLabels
                    }
                },
                canvas: {
                    unlimitedZoom: 'Unbegrenztes Zoomen erlauben',
                    unlimitedZoomHint: 'Standardmassig ist jetzt ein Zoom bis 1000 % moglich; aktiviert lasst sich weiter bis 500x vergrosern'
                },
                time: {
                    timezoneHint: 'Wahle die anzuzeigende Zeitzone',
                    timeFormatHint: 'Wahle das Zeitformat',
                    dateFormatHint: 'Wahle das Datumsformat',
                    dateFormatAuto: 'Systemeinstellung verwenden',
                    colorSettingsHint: 'Lege Text- und Hintergrundfarben fur das Zeit-Widget fest',
                    fontSizeHint: 'Passe die Textgrosse des Zeit-Widgets an',
                    opacityHint: 'Passe die Transparenz des Zeit-Widgets an',
                    fullscreenModeHint: 'Wahle, wie der Vollbildmodus ausgelost wird',
                    displayOptions: 'Anzeigeoptionen'
                }
            },
            randomPicker: {
                namePicker: 'Namensauswahl',
                numberPicker: 'Zahlenauswahl',
                noNames: 'Bitte gib mindestens einen Namen ein',
                settingsTitle: 'Auswahleinstellungen',
                modeName: 'Namen',
                modeNumber: 'Zahlen',
                titleLabel: 'Titel',
                titlePlaceholder: 'Z. B. Blitzfrage',
                namesLabel: 'Namensliste',
                namesPlaceholder: 'Gib pro Zeile einen Namen ein',
                defaultNames: 'Anna\nBen\nClara\nDavid\nEmma',
                allowRepeats: 'Wiederholungen erlauben',
                rangeLabel: 'Zahlenbereich',
                rangeMin: 'Minimum',
                rangeMax: 'Maximum',
                importLabel: 'Liste importieren',
                importColumnPlaceholder: 'Spalte',
                defaultColumnName: 'Name',
                importBtn: 'Excel/CSV importieren',
                importHint: 'Unterstutzt .xlsx, .xls und .csv und erkennt die Namensspalte automatisch',
                importSuccess: '{count} Namen erfolgreich importiert',
                importNoData: 'Keine gultigen Daten gefunden',
                importError: 'Datei konnte nicht importiert werden'
            },
            scoreboard: {
                title: 'Punktestand',
                addTeam: 'Team hinzufugen',
                reset: 'Zurucksetzen',
                confirmRemoveTeam: 'Dieses Team entfernen?',
                teamDefault: 'Team',
                removeTeam: 'Team entfernen',
                increaseScore: 'Punktzahl fur {team} erhohen',
                decreaseScore: 'Punktzahl fur {team} verringern',
                confirmReset: 'Alle Punktestande zurucksetzen?'
            },
            timer: {
                settingsTitle: 'Timer-Einstellungen',
                selectMode: 'Modus auswahlen',
                timerTitle: 'Timer-Titel',
                setTime: 'Zeit festlegen',
                setStartTime: 'Startzeit festlegen',
                titleFontSize: 'Titelschriftgrosse',
                timeFontSize: 'Zeitschriftgrosse',
                minimal: 'Minimal',
                minimalMode: 'Minimalanzeige (Doppelklick zum Wiederherstellen)',
                preview: 'Vorschau',
                opacity: 'Transparenz',
                opacityLabel: 'Transparenz: Aktuell',
                fullscreenFontSize: 'Schriftgrosse im Vollbild',
                fullscreenFontSizeLabel: 'Schriftgrosse im Vollbild: Aktuell',
                customSoundQuotaExceeded: 'Nicht genügend Speicherplatz. Löschen Sie einige benutzerdefinierte Töne.'
            },
            export: {
                selectAtLeastOnePage: 'Bitte wahlen Sie mindestens eine Seite aus',
                paginationRequired: 'Diese Funktion erfordert den paginierten Modus',
                noPages: 'Keine Seiten zum Exportieren verfugbar'
            },
            projectPackage: {
                rasterFallbackUnavailable: 'Die Rasterseitendaten, die zur vollständigen Erhaltung des Projektinhalts erforderlich sind, sind nicht verfügbar.'
            }
        }
    };

    return localeOverrides;
})();


