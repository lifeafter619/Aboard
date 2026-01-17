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
        apply: '적용',
        reset: '재설정'
    },

    // App Title
    app: {
        title: 'Aboard - 미니멀 화이트보드',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: '실행 취소',
        redo: '다시 실행',
        pen: '펜',
        shape: '도형',
        move: '이동',
        eraser: '지우개',
        clear: '지우기',
        background: '배경',
        teachingTools: '교구',
        more: '더보기',
        settings: '설정',
        export: '캔버스 내보내기',
        zoomOut: '축소 (-)',
        zoomIn: '확대 (+)',
        fullscreen: '전체 화면 (F11)',
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
            warning: '새로 고침하면 캔버스 내용이 모두 지워지며 복구할 수 없습니다. 새로 고침하시겠습니까?'
        },
        lineStyle: {
            title: '선 스타일',
            solid: '실선',
            dashed: '파선',
            dotted: '점선',
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
        }
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
        moveCoordinateOrigin: '원점 이동',
        moveCoordinateOriginHint: '버튼을 클릭한 후 캔버스에서 드래그하여 좌표 원점 이동'
    },

    // Image Controls
    imageControls: {
        confirm: '확인',
        cancel: '취소',
        flipHorizontal: '좌우 반전',
        flipVertical: '상하 반전',
        rotate: '회전'
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
            languageHint: '인터페이스 언어 선택',
            globalFont: '전역 글꼴',
            globalFontHint: '애플리케이션에서 사용할 글꼴 선택',
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
            showTimeDisplay: '시간 및 날짜 표시',
            showTimeDisplayHint: '오른쪽 상단에 현재 시간 및 날짜 표시'
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
        insertImage: '이미지 삽입'
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
        drawAlongEdge: '가장자리를 따라 그리기'
    },

    // Time Display
    timeDisplay: {
        title: '시간 표시',
        settingsTitle: '시간 표시 설정',
        options: '시간 표시 옵션',
        showDate: '날짜 표시',
        showTime: '시간 표시',
        settings: '설정',
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
        fullscreenFontSize: '전체 화면 글꼴 크기',
        fullscreenFontSizeLabel: '전체 화면 글꼴 크기: 현재',
        fullscreenSliderLabel: '글꼴 크기 조정 (10%-85%)',
        customColor: '사용자 정의 색상',
        transparent: '투명'
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
        loopPlayback: '반복 재생',
        loopCount: '반복 횟수',
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
            transparent: '투명'
        },
        customColor: '사용자 정의 색상',
        start: '시작',
        adjust: '조정',
        continue: '계속',
        pause: '일시 정지',
        reset: '재설정',
        stop: '정지',
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
    }
};
