/**
 * Korean (South Korea) - 한국어
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: '확인',
        cancel: '취소',
        close: '닫기',
        save: '저장',
        delete: '삭제',
        edit: '편집',
        add: '추가',
        remove: '제거',
        yes: '예',
        no: '아니오',
        ok: '확인',
        help: '도움말',
        export: '내보내기',
        apply: '적용',
        reset: '재설정',
        restoreSize: '크기 복원',
        keepCentered: '가운데 유지'
    },

    // Gestures
    gestures: {
        pinchZoom: '핀치 줌'
    },

    errors: {
        lazyLoadFailed: '{feature} 기능을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
    },

    prompts: {
        localeDownloadPrompt: '{locale} 언어 팩을 지금 다운로드하시겠습니까?',
        preferredLocaleSuggestionPrompt: '브라우저 기본 언어가 {locale}에 더 가깝습니다. 지금 다운로드하고 전환하시겠습니까?'
    },

    browserCheck: {
        title: '브라우저 호환성 안내',
        message: '현재 브라우저에 다음 필수 기능이 없습니다.',
        updateHint: '원활한 사용을 위해 Chrome, Edge, Firefox, Safari 최신 버전으로 업데이트해 주세요.',
        continueAnyway: '계속 진행',
        features: {
            canvas: 'Canvas API',
            es6: '최신 JavaScript(ES6)'
        }
    },
    // Recovery dialog
    recovery: {
        title: '이전 콘텐츠 복원',
        message: '이전 캔버스 콘텐츠가 감지되었습니다. 복원하시겠습니까?',
        restore: '복원',
        discard: '삭제',
        restoreFailed: '이전 콘텐츠를 복원하지 못했습니다. 다시 시도해 주세요.'
    },

    // App Title
    app: {
        title: 'Aboard - 미니멀 화이트보드',
        name: 'Aboard',
        rotateScreenTitle: '화면을 회전해 주세요',
        rotateScreenTip: '세로 모드가 감지되었습니다. 올바른 레이아웃과 전체 도구 모음을 위해 가로 모드로 사용해 주세요.'
    },

    // Toolbar
    toolbar: {
        undo: '실행 취소',
        redo: '다시 실행',
        pen: '펜',
        shape: '도형',
        move: '이동',
        select: '선택',
        eraser: '지우개',
        clear: '지우기',
        background: '배경',
        teachingTools: '교구',
        more: '더보기',
        settings: '설정',
        importProject: '프로젝트 가져오기',
        export: '캔버스 내보내기',
        zoomOut: '축소 (-)',
        zoomIn: '확대 (+)',
        fullscreen: '전체 화면 (F11)',
        exitFullscreen: '전체 화면 종료 (F11)',
        zoomPlaceholder: '확대/축소 수준 (백분율 입력)'
    },

    // Tools
    tools: {
        pen: {
            title: '펜',
            type: '펜 유형',
            normal: '일반 펜',
            pencil: '연필',
            ballpoint: '볼펜',
            fountain: '만년필',
            brush: '붓',
            marker: '마커',
            color: '색상',
            colorAndSize: '색상 및 크기',
            colorPicker: '색상 선택기',
            size: '선 굵기',
            sizeLabel: '굵기: 현재',
            sizePx: 'px'
        },
        shape: {
            title: '도형',
            type: '도형 유형',
            line: '직선',
            rectangle: '사각형',
            circle: '원',
            ellipse: '타원',
            arrow: '화살표',
            doubleArrow: '양방향 화살표',
            arrowSize: '화살표 크기',
            hint: '눌러서 드래그하여 도형 그리기, 놓으면 완성',
            lineProperties: '선 속성'
        },
        eraser: {
            title: '지우개',
            type: '지우개 유형',
            normal: '일반 지우개',
            pixel: '픽셀 지우개',
            size: '지우개 크기',
            sizeLabel: '지우개 크기: 현재',
            shape: '모양',
            shapeCircle: '원형',
            shapeRectangle: '사각형'
        },
        clear: {
            title: '캔버스 지우기',
            confirm: '지우기 확인',
            message: '캔버스를 지우시겠습니까? 이 작업은 취소할 수 없습니다.'
        },
        refresh: {
            warning: '새로 고침하면 저장되지 않은 변경 사항이 중단될 수 있습니다. 저장된 스냅샷이 있으면 새로 고침 후 복원할 수 있습니다. 새로 고침하시겠습니까?'
        },
        lineStyle: {
            title: '선 스타일',
            solid: '실선',
            dashed: '파선',
            dotted: '점선',
            dashdot: '점쇄선',
            wavy: '물결선',
            double: '이중선',
            triple: '삼중선',
            multiLine: '다중선',
            arrow: '화살표',
            doubleArrow: '양방향 화살표',
            noArrow: '화살표 없음',
            arrowType: '화살표 유형',
            dashDensity: '파선 밀도',
            waveDensity: '물결 밀도',
            lineSpacing: '선 간격',
            lineCount: '선 개수'
        },
        text: {
            insertTitle: '텍스트 삽입',
            editTitle: '텍스트 편집',
            placeholder: '여기에 텍스트 입력',
            size: '크기',
            color: '색상',
            colorPicker: '색상 선택기',
            font: '글꼴',
            style: '스타일',
            bold: '굵게',
            italic: '기울임',
            underline: '밑줄',
            strikethrough: '취소선',
            decorationStyle: '선 스타일',
            decorationWidth: '선 두께',
            decorationColor: '선 색상',
            uploadFont: '글꼴 업로드',
            customFonts: '사용자 정의 글꼴',
            fontUploadSuccess: '글꼴이 업로드되었습니다!',
            fontExists: '이 글꼴은 이미 존재합니다.',
            invalidFontFormat: '잘못된 글꼴 형식입니다. TTF, OTF, WOFF 또는 WOFF2 파일을 사용하세요.',
            fontTooLarge: '글꼴 파일이 너무 큽니다. 최대 2MB까지 허용됩니다.',
            storageQuotaExceeded: '저장 공간이 초과되었습니다. 사용자 정의 글꼴을 삭제해 주세요.'
        },
        select: {
            mode: '선택 모드',
            clickMode: '클릭',
            rectMode: '영역 선택',
            lassoMode: '올가미',
            transform: '변환',
            rotate90: '90° 회전',
            flipH: '좌우 반전',
            flipV: '상하 반전'
        }
    },

    selection: {
        edit: '편집',
        color: '색상',
        copy: '복사',
        delete: '삭제',
        done: '완료',
        rotate90: '90° 회전',
        flipH: '좌우 반전',
        layer: '레이어',
        layerFront: '맨 앞으로',
        layerBack: '맨 뒤로',
        layerUp: '앞으로 한 단계',
        layerDown: '뒤로 한 단계',
        group: '그룹',
        ungroup: '그룹 해제',
        position: '위치'
    },

    // Line Style Modal
    lineStyleModal: {
        title: '선 스타일 설정',
        openSettings: '더 많은 설정',
        preview: '미리보기'
    },

    // Time Display
    timeDisplay: {
        options: '시간 표시 옵션',
        showDate: '날짜 표시',
        showTime: '시간 표시',
        settings: '설정',
        fullscreenDisplay: '전체 화면 표시'
    },

    // Background
    background: {
        title: '배경',
        color: '배경색',
        pattern: '배경 패턴',
        blank: '빈 화면',
        none: '없음',
        dots: '점',
        grid: '격자',
        lines: '선',
        tianzige: '田字格 (중국)',
        english4line: '영어 4선',
        musicStaff: '오선보',
        coordinate: '좌표계',
        polar: '극좌표',
        coordinateOriginHint: '이동 모드에서 더블클릭하여 좌표 원점 선택 후 드래그하여 이동',
        image: '이미지',
        density: '밀도',
        densityLabel: '밀도: 현재',
        size: '크기',
        sizeLabel: '크기: 현재',
        opacity: '배경 불투명도',
        opacityLabel: '배경 불투명도: 현재',
        opacityHint: '배경 투명도를 조정합니다. 100%는 완전 불투명',
        contrast: '대비',
        contrastLabel: '패턴 투명도: 현재',
        contrastHint: '배경 패턴 선의 명암을 조정합니다',
        preference: '배경 패턴 기본 설정',
        upload: '업로드',
        storageFull: '저장 공간이 부족하여 더 많은 이미지를 저장할 수 없습니다. 오래된 이미지를 일부 정리해 주세요.',
        saveError: '이미지를 저장하지 못했습니다. 저장 공간이 부족할 수 있습니다.',
        moveCoordinateOrigin: '원점 이동',
        moveCoordinateOriginHint: '버튼을 클릭한 후 캔버스에서 드래그하여 좌표 원점 이동',
        coordinateTools: '좌표 설정',
        showTicks: '눈금 표시',
        showLabels: '라벨 표시',
        showPointLabels: '점 라벨 표시',
        showOrigin: '원점 표시',
        connectPoints: '점 연결',
        snapToGrid: '격자에 맞춤',
        addPoint: '점 추가',
        drawPointLine: '점·선 그리기',
        pointLineModeLineOnly: '선만 그리기',
        pointLineModeAuto: '자동 연결',
        pointLineModeSelected: '선택 연결',
        addPointHint: '활성화 후 캔버스를 클릭하면 좌표점을 순서대로 찍고 자동으로 연결합니다',
        addPointHintLineOnly: '활성화 후 캔버스를 순서대로 클릭하면 좌표점을 찍고 선만 그립니다',
        addPointHintAuto: '활성화 후 캔버스를 클릭하면 좌표점을 순서대로 찍고 자동으로 연결합니다',
        addPointHintSelected: '활성화 후 캔버스에 좌표점을 추가할 수 있습니다. 선택 도구로 전환하면 선택한 점만 연결됩니다',
        addPointHintSelectedInteractive: '활성화 후 빈 공간을 클릭해 점을 추가하고, 두 점을 차례로 클릭해 연결할 수 있습니다',
        clearPoints: '점 지우기',
        clearPlots: '그래프 지우기',
        pointsCount: '점 개수',
        plotExpression: '식',
        plotColor: '색상',
        plotLineStyle: '선 스타일',
        plotStrokeWidth: '선 두께',
        plotRangeTitle: '표시 범위',
        plotRangeAxis: '축',
        plotRangeMin: '최솟값',
        plotRangeMax: '최댓값',
        plot: '그리기',
        inputPanel: '입력 패널',
        keypadNumbers: '숫자',
        keypadOperators: '기호',
        keypadVariables: '변수',
        keypadFunctions: '함수',
        plotHintCartesian: '직교좌표: y = f(x)를 입력하세요. sin cos PI 사용 가능',
        plotHintPolar: '극좌표: r = f(theta)를 입력하세요. theta는 라디안, deg는 도 단위',
        plotPlaceholderCartesian: '예: sin(x) + 2',
        plotPlaceholderPolar: '예: 2 * sin(4 * theta)',
        plotRangeMinPlaceholder: '최솟값',
        plotRangeMaxPlaceholder: '최댓값',
        plotAddRange: '범위 추가',
        plotCollapse: '접기',
        plotSave: '저장',
        plotRemoveRange: '범위 삭제',
        plotNoRange: '표시 범위 제한이 없습니다. 기본적으로 전체를 표시합니다.',
        noPlots: '아직 그래프가 없습니다',
        coordinateStatusAddPoint: '점·선 그리기 모드가 켜졌습니다',
        coordinateStatusAddPointLineOnly: '선만 그리기 모드가 켜졌습니다. 캔버스를 클릭해 좌표점을 추가하세요',
        coordinateStatusAddPointAuto: '자동 연결 모드가 켜졌습니다. 캔버스를 클릭해 좌표점을 추가하세요',
        coordinateStatusAddPointSelected: '선택 연결 모드가 켜졌습니다. 캔버스를 클릭해 좌표점을 추가하세요',
        coordinateStatusAddPointSelectedInteractive: '선택 연결 모드가 켜졌습니다. 빈 공간을 클릭해 점을 추가한 뒤 두 점을 클릭해 연결하세요',
        coordinateStatusSelectLineStartPoint: '첫 번째 점을 선택했습니다. 연결할 다른 점을 클릭하세요',
        coordinateStatusAddPointOff: '점·선 그리기 모드가 꺼졌습니다',
        coordinateLineExists: '이 두 점 사이에는 이미 선이 있습니다',
        coordinateLineCreated: '선이 연결되었습니다',
        connectPointsEnabled: '점선 그리기가 켜졌습니다',
        connectPointsDisabled: '점선 그리기가 꺼졌습니다',
        pointAdded: '좌표점이 추가되었습니다',
        pointsCleared: '좌표점이 삭제되었습니다',
        plotAdded: '함수 그래프가 추가되었습니다',
        plotUpdated: '함수 그래프가 업데이트되었습니다',
        plotError: '식이 올바르지 않아 그릴 수 없습니다',
        plotsCleared: '함수 그래프가 삭제되었습니다'
    },

    // Image Controls
    imageControls: {
        confirm: '확인',
        cancel: '취소',
        flipHorizontal: '좌우 반전',
        flipVertical: '상하 반전',
        rotate: '회전'
    },

    // Selection Controls
    selection: {
        copy: '복사',
        delete: '삭제',
        done: '완료',
        edit: '편집',
        color: '색상',
        rotate90: '90° 회전',
        flipH: '좌우 뒤집기',
        layer: '레이어',
        layerFront: '맨 앞으로',
        layerBack: '맨 뒤로',
        layerUp: '앞으로 한 단계',
        layerDown: '뒤로 한 단계',
        group: '그룹',
        ungroup: '그룹 해제',
        position: '위치'
    },

    // Page Navigation
    page: {
        previous: '이전',
        next: '다음',
        jumpPlaceholder: '페이지 번호 입력',
        of: ' / ',
        newPage: '새 페이지'
    },

    // Settings
    settings: {
        title: '설정',
        exportSuccess: '설정이 성공적으로 내보내졌습니다',
        importSuccess: '설정을 성공적으로 가져왔습니다',
        importError: '잘못된 구성 파일입니다',
        importNoChange: '설정 변경이 감지되지 않았습니다',
        tabs: {
            general: '일반',
            display: '표시',
            pen: '펜',
            eraser: '지우개',
            canvas: '캔버스',
            background: '배경',
            about: '정보',
            announcement: '공지사항',
            more: '더보기'
        },
        display: {
            title: '표시 설정',
            theme: '테마',
            themeHint: '애플리케이션 테마 선택',
            themeColor: '테마 색상',
            themeColorHint: '선택된 툴바 항목의 색상',
            showZoomControls: '확대/축소 컨트롤 표시',
            showZoomControlsHint: '캔버스 위에 확대/축소 컨트롤 표시',
            showFullscreenBtn: '전체 화면 버튼 표시',
            showFullscreenBtnHint: '확대/축소 컨트롤 옆에 전체 화면 버튼 표시',
            toolbarSize: '툴바 크기',
            toolbarSizeLabel: '툴바 크기: 현재',
            toolbarSizeHint: '하단 툴바 크기 조정',
            configScale: '구성 패널 크기',
            configScaleLabel: '구성 패널 크기: 현재',
            configScaleHint: '팝업 구성 패널 크기 조정',
            colorOptions: {
                blue: '파란색',
                purple: '보라색',
                green: '녹색',
                orange: '주황색',
                red: '빨간색',
                pink: '분홍색',
                cyan: '청록색',
                yellow: '노란색'
            },
            colorPicker: '색상 선택기'
        },
        general: {
            title: '일반 설정',
            language: '언어',
            languageHint: '기본적으로 시스템 언어를 자동 감지하며, 언제든지 수동으로 전환할 수 있습니다',
            globalFont: '전역 글꼴',
            globalFontHint: '애플리케이션에서 사용할 글꼴 선택',
            fontManagementHint: '글꼴 관리: 정렬, 표시 전환, 이름 변경 및 미리보기 지원',
            showFont: '글꼴 표시',
            fontPreviewSample: '한글 글꼴 미리보기 ABC abc 123',
            fontPreviewText: '미리보기 문구',
            fontPreviewSize: '미리보기 크기',
            fontPreviewResetText: '문구 복원',
            renameFont: '이름 변경',
            expandPreview: '확대',
            confirmDeleteFont: '사용자 지정 글꼴 "{font}"을 삭제하시겠습니까?',
            resetFontManagementConfirm: '글꼴 관리를 초기 상태로 되돌리면 업로드한 글꼴이 삭제되고 글꼴 순서, 이름, 미리보기 설정도 재설정됩니다. 계속하시겠습니까?',
            downloadedLanguagePacks: '다운로드한 언어 팩',
            dismissedLanguageSuggestion: '언어 제안 숨김 상태',
            updatePreference: '업데이트 방식',
            updatePreferenceHint: '업데이트 준비 시 적용할 방식을 선택합니다',
            updatePreferencePrompt: '한가할 때 업데이트',
            updatePreferenceAuto: '지금 업데이트',
            fonts: {
                system: '시스템 기본값',
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
            edgeSnap: '가장자리 스냅 활성화',
            edgeSnapHint: '드래그 시 컨트롤 패널을 화면 가장자리에 자동 정렬',
            morePanelBehaviorLabel: '더보기 패널 동작',
            keepMorePanelOpenHint: '기능 버튼 클릭 후에도 더보기 패널 유지',
            // Toolbar customization
            toolbarCustomization: '툴바 사용자 정의',
            toolbarCustomizationHint: '툴바에 표시할 도구를 선택하고 드래그하여 순서 조정',
            toolbarTools: {
                undo: '실행 취소',
                redo: '다시 실행',
                pen: '펜',
                move: '이동',
                select: '선택',
                eraser: '지우개',
                clear: '지우기',
                background: '배경',
                more: '더보기',
                settings: '설정'
            },
            // Control button settings
            controlButtonSettings: '컨트롤 버튼 설정',
            controlButtonSettingsHint: '표시할 컨트롤 버튼 선택',
            controlButtons: {
                zoom: '확대/축소 버튼',
                pagination: '페이지 매김 버튼',
                time: '시간 표시',
                fullscreen: '전체 화면 버튼',
                import: '가져오기 버튼',
                export: '내보내기 버튼'
            },
            controlPosition: '컨트롤 버튼 위치',
            controlPositionHint: '확대/축소 및 페이지 매김 컨트롤 표시 위치 선택',
            positionTopLeft: '왼쪽 위',
            positionTopRight: '오른쪽 위',
            positionBottomLeft: '왼쪽 아래',
            positionBottomRight: '오른쪽 아래',
            canvasMode: '캔버스 모드',
            canvasModeHint: '페이지 매김 또는 무한 캔버스 모드 선택',
            pagination: '페이지 매김',
            infiniteCanvas: '무한 캔버스',
            autoSave: '자동 저장',
            autoSaveHint: '주기적으로 그림을 자동 저장'
        },
        canvas: {
            title: '캔버스 설정',
            mode: '캔버스 모드',
            modeHint: '캔버스 표시 모드 선택',
            size: '캔버스 크기',
            sizeHint: '사전 설정 크기를 선택하거나 캔버스 사용자 정의',
            infiniteCanvas: '무한 캔버스',
            pagination: '페이지 모드',
            presets: {
                a4Portrait: 'A4 세로',
                a4Landscape: 'A4 가로',
                a3Portrait: 'A3 세로',
                a3Landscape: 'A3 가로',
                b5Portrait: 'B5 세로',
                b5Landscape: 'B5 가로',
                widescreen: '16:9 와이드스크린',
                standard: '4:3 표준',
                custom: '사용자 정의'
            },
            customSize: {
                portrait: '세로',
                landscape: '가로',
                width: '너비',
                height: '높이',
                ratio: '종횡비',
                ratios: {
                    custom: '사용자 정의',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (세로)',
                    '9:16': '9:16 (세로)'
                }
            }
        },
        background: {
            title: '배경 설정',
            opacity: '배경 불투명도',
            opacityLabel: '배경 불투명도: 현재',
            opacityHint: '배경 투명도 조정, 100%는 완전히 불투명',
            patternIntensity: '패턴 강도',
            patternIntensityLabel: '패턴 투명도: 현재',
            patternIntensityHint: '배경 패턴 선의 어두움 조정',
            preference: '배경 패턴 설정',
            preferenceHint: '구성 패널에 표시할 패턴 선택'
        },
        announcement: {
            title: '공지사항',
            welcome: 'Aboard에 오신 것을 환영합니다!',
            content: [
                'Aboard 화이트보드 애플리케이션에 오신 것을 환영합니다!',
                '',
                '사용 팁:',
                '• 하단의 툴바를 클릭하여 다양한 그리기 도구 선택',
                '• Ctrl+Z로 실행 취소, Ctrl+Y로 다시 실행',
                '• 오른쪽 상단의 확대/축소 버튼을 클릭하거나 마우스 휠을 사용하여 확대/축소',
                '• 배경 버튼을 클릭하여 다양한 배경 패턴 선택',
                '• 설정에서 무한 캔버스 또는 페이지 모드로 전환',
                '• 터치 및 마우스 입력 모두 지원',
                '',
                '창의적인 작업을 즐기세요!'
            ]
        },
        about: {
            title: 'Aboard 정보',
            projectIntro: '프로젝트 소개',
            description1: 'Aboard는 교육 및 프레젠테이션을 위해 설계된 미니멀리스트 웹 화이트보드 애플리케이션입니다.',
            description2: '부드러운 그리기 경험과 풍부한 배경 옵션을 제공합니다.',
            mainFeatures: '주요 기능',
            features: {
                penTypes: '다양한 펜 유형 (일반 펜, 연필, 볼펜, 만년필, 브러시)',
                smartEraser: '스마트 지우개 (원형 및 사각형 지원)',
                richPatterns: '풍부한 배경 패턴 (점, 격자, 田字格, 영어 4선 등)',
                adjustable: '조정 가능한 패턴 밀도 및 투명도',
                canvasModes: '무한 캔버스 및 페이지 모드 (A4, A3, B5 등 사전 설정 크기 지원)',
                customSize: '사용자 정의 캔버스 크기 및 종횡비',
                draggable: '드래그 가능한 툴바 및 속성 패널',
                undoRedo: '실행 취소/다시 실행 기능 (최대 50단계 지원)',
                smartZoom: '스마트 확대/축소 (Ctrl+스크롤 휠, 마우스 위치로 확대/축소)',
                responsive: '반응형 인터페이스, 다양한 화면 크기에 적응'
            },
            techStack: '기술 스택',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: '오픈 소스 라이선스',
            licenseType: 'MIT 라이선스',
            github: 'GitHub',
            version: '버전'
        },
        more: {
            title: '추가 설정',
            cacheCleanupLabel: '캐시 정리',
            cacheCleanupHint: '캐시 사용량을 확인하고 항목별로 정리할 수 있습니다(정리 전 확인)',
            configManagementLabel: '설정 관리',
            configManagementHint: '현재 애플리케이션 설정을 내보내거나 가져옵니다',
            exportConfig: '설정 내보내기',
            importConfig: '설정 가져오기',
            compatibilityLabel: '호환 가져오기',
            compatibilityHint: '필요할 때만 예전 .aboard / .json 가져오기 호환을 활성화합니다',
            legacyProjectImportEnabled: '구버전 프로젝트 가져오기 호환 사용',
            legacyProjectImportEnabledHint: '활성화하면 프로젝트 가져오기가 .aboard / .json 파일도 허용하고 필요 시 호환 모듈을 불러옵니다.',
            clearSettingsCache: '설정 캐시 삭제',
            clearCanvasCache: '캔버스 캐시 삭제',
            clearOtherCache: '기타 캐시 삭제',
            cacheSizeCalculating: '계산 중...',
            clearSelectedCache: '선택한 캐시 정리',
            morePanelBehaviorLabel: '더보기 패널 동작',
            keepMorePanelOpenHint: '기능 버튼 클릭 후에도 더보기 패널 유지',
            selectCacheType: '삭제할 캐시 유형을 하나 이상 선택하세요.',
            confirmClearTitle: '정리 확인',
            confirmClearSelectedCache: '정리할 캐시 항목을 선택하세요:',
            clearLocalDataConfirmSuffix: '계속하시겠습니까?',
            description: '시간 표시 설정은 오른쪽 하단 시간 영역을 클릭하세요',
            showTimeDisplay: '시간 및 날짜 표시',
            showTimeDisplayHint: '오른쪽 상단에 현재 시간 및 날짜 표시',
            localDataLabel: '로컬 데이터',
            localDataHint: '로컬 캐시, 캔버스 내용, 설정을 지우고 최초 로드 상태로 복원합니다',
            clearLocalDataButton: '로컬 캐시 지우기',
            clearLocalDataConfirm: '로컬 캐시, 캔버스 내용, 설정을 모두 지우고 최초 로드 상태로 복원합니다. 계속하시겠습니까?'
        },
        time: {
            title: '시간 표시 설정',
            showDate: '날짜 표시',
            showTime: '시간 표시',
            timezone: '시간대',
            timeFormat: '시간 형식',
            timeFormat12: '12시간제 (오전/오후)',
            timeFormat24: '24시간제',
            dateFormat: '날짜 형식',
            dateFormatYMD: '년-월-일 (2024-01-01)',
            dateFormatMDY: '월-일-년 (01-01-2024)',
            dateFormatDMY: '일-월-년 (01-01-2024)',
            dateFormatChinese: '중국어 (2024年1月1日)',
            colorSettings: '색상 설정',
            colorHint: '시간 표시를 위한 글꼴 및 배경색 설정',
            textColor: '텍스트 색상',
            bgColor: '배경색',
            fontSize: '글꼴 크기',
            fontSizeLabel: '글꼴 크기: 현재',
            opacity: '불투명도',
            opacityLabel: '불투명도: 현재',
            fullscreenMode: '전체 화면 모드',
            fullscreenDisabled: '비활성화',
            fullscreenSingle: '한 번 클릭',
            fullscreenDouble: '두 번 클릭',
            fullscreenFontSize: '전체 화면 글꼴 크기',
            fullscreenFontSizeLabel: '전체화면 글꼴 크기: 현재',
            fullscreenFontSizeHint: '전체 화면 시간 표시 글꼴 크기 조정, 범위 10%-85%',
            customColor: '사용자 정의 색상'
        }
    },

    // Feature Area
    features: {
        title: '기능',
        moreFeatures: '더 많은 기능',
        time: '시간',
        timer: '타이머',
        randomPicker: '추첨기',
        scoreboard: '점수판',
        insertImage: '이미지 삽입',
        insertText: '텍스트 삽입'
    },

    // Teaching Tools
    teachingTools: {
        title: '교구',
        ruler: '자',
        rulerStyle1: '자 1',
        rulerStyle2: '자 2',
        setSquare: '삼각자',
        setSquare60: '삼각자 60°',
        setSquare45: '삼각자 45°',
        hint: '힌트: 단일 클릭으로 이동, 더블클릭하여 크기 조절, 회전 또는 삭제',
        insertHint: '삽입할 교구 수를 선택하세요',
        currentOnCanvas: '캔버스의 현재 수량',
        addNew: '새로 추가',
        rotate: '회전',
        resize: '크기 조절',
        delete: '삭제',
        drawAlongEdge: '가장자리를 따라 그리기',
        increaseCount: '{tool} 수량 늘리기',
        decreaseCount: '{tool} 수량 줄이기',
    },

    // Time Display
    timeDisplay: {
        title: '시간 표시',
        settingsTitle: '시간 표시 설정',
        options: '시간 표시 옵션',
        showDate: '날짜 표시',
        showTime: '시간 표시',
        settings: '설정',
        fullscreenDisplay: '전체 화면 표시',
        displayOptions: '표시 옵션',
        dateAndTime: '날짜 및 시간',
        dateOnly: '날짜만',
        timeOnly: '시간만',
        timezone: '시간대',
        timezoneHint: '표시할 시간대 선택',
        timeFormat: '시간 형식',
        timeFormatHint: '시간 표시 형식 선택',
        dateFormat: '날짜 형식',
        dateFormatHint: '날짜 표시 형식 선택',
        colorSettings: '색상 설정',
        colorSettingsHint: '시간 표시의 글꼴 및 배경색 설정',
        textColor: '텍스트 색상',
        bgColor: '배경색',
        fontSize: '글꼴 크기',
        fontSizeHint: '시간 표시 글꼴 크기 조정',
        fontSizeLabel: '글꼴 크기: 현재',
        opacity: '불투명도',
        opacityLabel: '불투명도: 현재',
        fullscreenMode: '전체 화면 모드',
        fullscreenModeHint: '시간 전체 화면 표시 트리거 선택',
        fullscreenColorSettings: '전체 화면 색상 설정',
        fullscreenFontSize: '전체 화면 글꼴 크기',
        fullscreenFontSizeLabel: '전체 화면 글꼴 크기: 현재',
        fullscreenFontSizeHint: '전체 화면 글꼴 크기 조정 (10%-85%)',
        fullscreenSliderLabel: '글꼴 크기 조정 (10%-85%)',
        customColor: '사용자 정의 색상',
        transparent: '투명',
        fullscreenDisabled: '비활성화',
        fullscreenSingle: '한 번 클릭',
        fullscreenDouble: '두 번 클릭'
    },

    // Timer
    timer: {
        settingsTitle: '타이머 설정',
        mode: '모드',
        selectMode: '모드 선택',
        countdown: '카운트다운',
        stopwatch: '스톱워치',
        duration: '기간 (분)',
        hours: '시간',
        minutes: '분',
        seconds: '초',
        title: '제목',
        titlePlaceholder: '타이머 제목 입력',
        setTime: '시간 설정',
        setStartTime: '시작 시간 설정',
        fontSettings: '글꼴 설정',
        fontSize: '글꼴 크기',
        fontSizeLabel: '글꼴 크기: 현재',
        adjustColor: '색상 조정',
        colorSettings: '색상 설정',
        textColor: '텍스트 색상',
        bgColor: '배경색',
        opacity: '불투명도',
        opacityLabel: '불투명도: 현재',
        fullscreenFontSize: '전체 화면 글꼴 크기',
        fullscreenFontSizeLabel: '전체 화면 글꼴 크기: 현재',
        soundSettings: '사운드 설정',
        playSound: '카운트다운 종료 시 알림 소리 재생',
        preview: '미리듣기',
        moreSettings: '더 많은 설정',
        playbackSpeed: '재생 속도',
        loopPlayback: '반복 재생',
        loopCount: '반복 횟수',
        loopInterval: '반복 간격',
        uploadCustomAudio: '사용자 정의 오디오 업로드',
        soundPresets: {
            classBell: '수업 종 (10초)',
            digitalBeep: '디지털 비프 (3초)',
            gentle: '부드러운 (5초)',
            examEnd: '시험 종료 (8초)'
        },
        colors: {
            black: '검정',
            white: '흰색',
            blue: '파란색',
            red: '빨간색',
            green: '녹색',
            yellow: '노란색',
            orange: '주황색',
            purple: '보라색',
            transparent: '투명',
            darkGray: '어두운 회색 (기본값)',
            lightGray: '밝은 회색',
            lightRed: '밝은 빨간색',
            lightBlue: '밝은 파란색',
            lightGreen: '밝은 녹색',
            lightYellow: '밝은 노란색',
            lightOrange: '밝은 주황색',
            whiteDefault: '흰색 (기본값)'
        },
        customColor: '사용자 정의 색상',
        start: '시작',
        adjust: '조정',
        continue: '계속',
        pause: '일시 정지',
        reset: '재설정',
        stop: '정지',
        audioFallback: '타이머 종료 (소리를 재생할 수 없음)',
        alertSetTime: '카운트다운 시간을 설정해주세요',
        alertTitle: '알림'
    },

    // Timezone names
    timezones: {
        'china': '중국 (UTC+8)',
        'newyork': '뉴욕 (UTC-5/-4)',
        'losangeles': '로스앤젤레스 (UTC-8/-7)',
        'chicago': '시카고 (UTC-6/-5)',
        'london': '런던 (UTC+0/+1)',
        'paris': '파리 (UTC+1/+2)',
        'berlin': '베를린 (UTC+1/+2)',
        'tokyo': '도쿄 (UTC+9)',
        'seoul': '서울 (UTC+9)',
        'hongkong': '홍콩 (UTC+8)',
        'singapore': '싱가포르 (UTC+8)',
        'dubai': '두바이 (UTC+4)',
        'sydney': '시드니 (UTC+10/+11)',
        'auckland': '오클랜드 (UTC+12/+13)',
        'utc': 'UTC (협정 세계시)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Aboard에 오신 것을 환영합니다',
        content: `Aboard 화이트보드 애플리케이션에 오신 것을 환영합니다!

사용 팁:
• 하단 도구 모음을 클릭하여 다양한 그리기 도구 선택
• Ctrl+Z로 실행 취소, Ctrl+Y로 다시 실행
• 오른쪽 상단의 확대/축소 버튼을 클릭하거나 마우스 휠을 사용하여 캔버스 확대/축소
• 배경 버튼을 클릭하여 다양한 배경 패턴 선택
• 설정에서 무한 캔버스 또는 페이지 매김 모드로 전환
• 터치 및 마우스 입력 모두 지원

창의적인 작업을 즐기세요!`,
        confirm: '확인',
        noShowAgain: '다시 표시하지 않음'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: '지우기 확인',
        message: '현재 캔버스를 지우시겠습니까? 이 작업은 취소할 수 없습니다. 다른 캔버스는 영향을 받지 않습니다.',
        confirm: '확인',
        cancel: '취소'
    },

    // Color names
    colors: {
        black: '검정',
        red: '빨간색',
        blue: '파란색',
        green: '녹색',
        yellow: '노란색',
        orange: '주황색',
        purple: '보라색',
        pink: '분홍색',
        white: '흰색',
        transparent: '투명',
        lightGray: '밝은 회색',
        darkGray: '어두운 회색',
        lightBlue: '밝은 파란색',
        lightRed: '밝은 빨간색',
        lightGreen: '밝은 녹색',
        lightYellow: '밝은 노란색',
        lightOrange: '밝은 주황색',
        whiteDefault: '흰색 (기본값)'
    },

    // Days of week
    days: {
        sunday: '일요일',
        monday: '월요일',
        tuesday: '화요일',
        wednesday: '수요일',
        thursday: '목요일',
        friday: '금요일',
        saturday: '토요일'
    },

    export: {
        imageTab: '이미지 내보내기',
        projectTab: '프로젝트 내보내기 (.zip)',
        scopeLabel: '내보내기 범위',
        scopeCurrent: '현재 페이지',
        scopeAll: '모든 페이지',
        scopeSpecific: '지정한 페이지',
        pageSelectionLabel: '내보낼 페이지 선택',
        imageFormatLabel: '이미지 형식',
        imageQualityLabel: '이미지 품질',
        projectHint: '페이지 장면, 배경, 자산 라이브러리를 포함한 표준 .zip 프로젝트 패키지로 내보냅니다. 가져온 뒤에도 페이지별 객체 편집을 계속할 수 있으며, 구버전 .aboard 가져오기는 설정에서 호환성을 켠 경우에만 사용할 수 있습니다.',
        fileNameLabel: '파일 이름',
        fileNamePrefixLabel: '파일 이름 접두사',
        fileNamePlaceholder: '파일 이름 입력',
        fileNameHint: '여러 페이지를 내보낼 때는 파일 이름 뒤에 페이지 번호가 자동으로 붙습니다.',
        failed: '내보내기에 실패했습니다. 다시 시도해 주세요.'
    },

    projectPackage: {
        importSuccess: '프로젝트를 가져왔습니다.',
        legacyImportSuccess: '구버전 프로젝트를 가져왔습니다.',
        importFailed: '프로젝트 가져오기에 실패했습니다: {message}',
        exportFailed: '프로젝트 내보내기에 실패했습니다: {message}',
        overwriteConfirm: '프로젝트를 가져오면 현재 화이트보드 내용이 덮어써집니다. 계속하시겠습니까?',
        overwriteDetail: '현재 화이트보드의 페이지와 리소스가 프로젝트 패키지의 내용으로 교체됩니다.',
        legacyCompatibilityDisabled: '구버전 .aboard 가져오기 호환이 비활성화되어 있습니다. 먼저 설정에서 구버전 호환 가져오기를 켜 주세요.',
        zipLoaderUnavailable: 'ZIP 라이브러리 로더를 사용할 수 없습니다.',
        zipLoadFailed: 'ZIP 라이브러리를 불러오지 못했습니다.',
        legacyLoaderUnavailable: '구버전 호환 로더를 사용할 수 없습니다.',
        legacyModuleLoadFailed: '구버전 프로젝트 호환 모듈을 불러오지 못했습니다.',
        base64DecoderUnavailable: 'Base64 디코더를 사용할 수 없습니다.',
        base64EncoderUnavailable: 'Base64 인코더를 사용할 수 없습니다.',
        unsupportedPackage: '지원되는 Aboard 프로젝트 패키지가 아닙니다.',
        missingDocument: '프로젝트 패키지에 document.json이 없습니다.',
        missingPages: '프로젝트 패키지에 페이지 데이터가 없습니다.',
        missingAsset: '프로젝트 패키지에 리소스 파일이 없습니다: {path}',
        missingPageFile: '프로젝트 패키지에 페이지 파일이 없습니다: {path}',
        invalidLegacyFormat: '구버전 프로젝트 파일 형식이 올바르지 않습니다.',
        legacyMissingPages: '구버전 프로젝트 파일에 페이지 데이터가 없습니다.'
    },

    randomPicker: {
        importColumnPlaceholder: '열 이름',
        importLibraryLoadFailed: 'Excel 가져오기 라이브러리를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
    },

    gif: {
        settingsTitle: 'GIF 설정',
        loopCountLabel: '재생 횟수 (0은 무한 반복)',
        loopCountPrompt: '반복 횟수를 설정하세요(0은 무한 반복):',
        loopCountInvalid: '0 이상의 정수를 입력해 주세요.'
    }
};
