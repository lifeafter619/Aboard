/**
 * English (US) - English
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: 'Confirm',
        cancel: 'Cancel',
        close: 'Close',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        remove: 'Remove',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        apply: 'Apply',
        reset: 'Reset',
        start: 'Start',
        stop: 'Stop'
    },

    // App Title
    app: {
        title: 'Aboard - Simple Whiteboard',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: 'Undo',
        redo: 'Redo',
        pen: 'Pen',
        shape: 'Shape',
        move: 'Move',
        eraser: 'Eraser',
        clear: 'Clear',
        background: 'Backgrnd',
        teachingTools: 'Tools',
        more: 'More',
        settings: 'Settings',
        export: 'Export Canvas',
        zoomOut: 'Zoom Out (-)',
        zoomIn: 'Zoom In (+)',
        fullscreen: 'Fullscreen (F11)',
        zoomPlaceholder: 'Zoom Level (Enter %)'
    },

    // Tools
    tools: {
        pen: {
            title: 'Pen',
            type: 'Pen Type',
            normal: 'Normal',
            pencil: 'Pencil',
            ballpoint: 'Ballpoint',
            fountain: 'Fountain',
            brush: 'Brush',
            color: 'Color',
            colorAndSize: 'Color & Size',
            colorPicker: 'Color Picker',
            size: 'Line Thickness',
            sizeLabel: 'Thickness: Current',
            sizePx: 'px'
        },
        shape: {
            title: 'Shape',
            type: 'Shape Type',
            line: 'Line',
            rectangle: 'Rectangle',
            circle: 'Circle',
            ellipse: 'Ellipse',
            arrow: 'Arrow',
            doubleArrow: 'Double Arrow',
            arrowSize: 'Arrow Size',
            hint: 'Press and drag to draw shape, release to finish',
            lineProperties: 'Line Properties'
        },
        eraser: {
            title: 'Eraser',
            type: 'Eraser Type',
            normal: 'Normal Eraser',
            pixel: 'Pixel Eraser',
            size: 'Eraser Size',
            sizeLabel: 'Eraser Size: Current',
            shape: 'Shape',
            shapeCircle: 'Circle',
            shapeRectangle: 'Square'
        },
        clear: {
            title: 'Clear Canvas',
            confirm: 'Confirm Clear',
            message: 'Are you sure you want to clear the canvas? This action cannot be undone.'
        },
        refresh: {
            warning: 'Refreshing will clear all canvas content and cannot be recovered. Are you sure you want to refresh?'
        },
        lineStyle: {
            title: 'Line Style',
            solid: 'Solid',
            dashed: 'Dashed',
            dotted: 'Dotted',
            wavy: 'Wavy',
            double: 'Double',
            triple: 'Triple',
            multiLine: 'Multi-line',
            arrow: 'Arrow',
            doubleArrow: 'Double Arrow',
            noArrow: 'No Arrow',
            arrowType: 'Arrow Type',
            dashDensity: 'Dash Density',
            waveDensity: 'Wave Density',
            lineSpacing: 'Line Spacing',
            lineCount: 'Line Count'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: 'Line Style Settings',
        openSettings: 'More Settings',
        preview: 'Preview'
    },

    // Time Display
    timeDisplay: {
        options: 'Time Display Options',
        showDate: 'Show Date',
        showTime: 'Show Time',
        settings: 'Settings'
    },

    // Background
    background: {
        title: 'Background',
        color: 'Background Color',
        pattern: 'Background Pattern',
        blank: 'Blank',
        none: 'None',
        dots: 'Dots',
        grid: 'Grid',
        lines: 'Lines',
        tianzige: 'Tianzige',
        english4line: 'English 4-Line',
        musicStaff: 'Music Staff',
        coordinate: 'Coordinate',
        coordinateOriginHint: 'Double-click coordinate center in Move mode to drag origin',
        image: 'Upload Image',
        density: 'Density',
        densityLabel: 'Density: Current',
        size: 'Size',
        sizeLabel: 'Size: Current',
        opacity: 'Background Opacity',
        opacityLabel: 'Background Opacity: Current',
        opacityHint: 'Adjust background transparency, 100% is fully opaque',
        contrast: 'Pattern Contrast',
        contrastLabel: 'Pattern Contrast: Current',
        contrastHint: 'Adjust pattern darkness/intensity',
        preference: 'Pattern Preference',
        preferenceHint: 'Choose patterns shown in properties bar',
        upload: 'Upload',
        moveCoordinateOrigin: 'Move Origin',
        moveCoordinateOriginHint: 'Click and drag on canvas to move coordinate origin'
    },

    // Image Controls
    imageControls: {
        confirm: 'Confirm',
        cancel: 'Cancel',
        flipHorizontal: 'Flip Horizontal',
        flipVertical: 'Flip Vertical',
        rotate: 'Rotate'
    },

    // Page Navigation
    page: {
        previous: 'Previous Page',
        next: 'Next Page',
        jumpPlaceholder: 'Enter page number',
        of: ' / ',
        newPage: 'New Page'
    },

    // Settings
    settings: {
        title: 'Settings',
        tabs: {
            general: 'General',
            display: 'Display',
            pen: 'Pen',
            eraser: 'Eraser',
            canvas: 'Canvas',
            background: 'Background',
            about: 'About',
            announcement: 'News',
            more: 'More'
        },
        display: {
            title: 'Display Settings',
            theme: 'Theme',
            themeHint: 'Choose application theme',
            themeColor: 'Theme Color',
            showZoomControls: 'Show Zoom Controls',
            showZoomControlsHint: 'Show zoom controls above canvas',
            showFullscreenBtn: 'Show Fullscreen Button',
            showFullscreenBtnHint: 'Show fullscreen button next to zoom controls',
            toolbarSize: 'Toolbar Size',
            toolbarSizeLabel: 'Toolbar Size: Current',
            toolbarSizeHint: 'Adjust bottom toolbar size',
            configScale: 'Config Panel Size',
            configScaleLabel: 'Config Panel Size: Current',
            configScaleHint: 'Adjust properties panel size',
            themeColorHint: 'Color of toolbar when selected',
            colorOptions: {
                blue: 'Blue',
                purple: 'Purple',
                green: 'Green',
                orange: 'Orange',
                red: 'Red',
                pink: 'Pink',
                cyan: 'Cyan',
                yellow: 'Yellow'
            },
            colorPicker: 'Color Picker'
        },
        general: {
            title: 'General Settings',
            language: 'Language',
            languageHint: 'Choose interface language',
            globalFont: 'Global Font',
            globalFontHint: 'Choose application font',
            fonts: {
                system: 'System Default',
                serif: 'Serif',
                sansSerif: 'Sans-Serif',
                monospace: 'Monospace',
                cursive: 'Handwritten',
                // Chinese fonts
                yahei: 'Microsoft YaHei',
                simsun: 'SimSun',
                simhei: 'SimHei',
                kaiti: 'KaiTi',
                fangsong: 'FangSong',
                // Common fonts
                arial: 'Arial',
                helvetica: 'Helvetica',
                timesNewRoman: 'Times New Roman',
                courier: 'Courier New',
                verdana: 'Verdana',
                georgia: 'Georgia',
                trebuchet: 'Trebuchet MS',
                impact: 'Impact'
            },
            edgeSnap: 'Enable Edge Snap',
            edgeSnapHint: 'Auto-snap panels to screen edges when dragging',
            controlPosition: 'Control Position',
            controlPositionHint: 'Position of zoom and pagination controls',
            positionTopLeft: 'Top Left',
            positionTopRight: 'Top Right',
            positionBottomLeft: 'Bottom Left',
            positionBottomRight: 'Bottom Right',
            canvasMode: 'Canvas Mode',
            canvasModeHint: 'Choose canvas display mode',
            pagination: 'Pagination Mode',
            infiniteCanvas: 'Infinite Canvas',
            autoSave: 'Auto Save',
            autoSaveHint: 'Periodically save your drawing',
            touchZoom: 'Touch Zoom',
            touchZoomHint: 'Allow pinch gesture to zoom canvas'
        },
        canvas: {
            title: 'Canvas Settings',
            mode: 'Canvas Mode',
            modeHint: 'Choose canvas display mode',
            size: 'Canvas Size',
            sizeHint: 'Choose preset size or custom size/ratio',
            infiniteCanvas: 'Infinite Canvas',
            pagination: 'Pagination Mode',
            presets: {
                a4Portrait: 'A4 Portrait',
                a4Landscape: 'A4 Landscape',
                a3Portrait: 'A3 Portrait',
                a3Landscape: 'A3 Landscape',
                b5Portrait: 'B5 Portrait',
                b5Landscape: 'B5 Landscape',
                widescreen: '16:9 Widescreen',
                standard: '4:3 Standard',
                custom: 'Custom'
            },
            customSize: {
                portrait: 'Portrait',
                landscape: 'Landscape',
                width: 'Width',
                height: 'Height',
                ratio: 'Ratio',
                ratios: {
                    custom: 'Custom',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (Portrait)',
                    '9:16': '9:16 (Portrait)'
                }
            }
        },
        background: {
            title: 'Background Settings',
            opacity: 'Background Opacity',
            opacityLabel: 'Background Opacity: Current',
            opacityHint: 'Adjust background transparency, 100% is fully opaque',
            patternIntensity: 'Pattern Contrast',
            patternIntensityLabel: 'Pattern Contrast: Current',
            patternIntensityHint: 'Adjust background pattern intensity',
            preference: 'Pattern Preference',
            preferenceHint: 'Choose patterns shown in properties bar'
        },
        announcement: {
            title: 'Announcements',
            welcome: 'Welcome to Aboard!',
            content: [
                'Welcome to Aboard Whiteboard Application!',
                '',
                'Tips:',
                '• Click bottom toolbar to select different tools',
                '• Use Ctrl+Z to Undo, Ctrl+Y to Redo',
                '• Click top-right zoom buttons or use mouse wheel to zoom',
                '• Click Background button to choose different patterns',
                '• Switch between Infinite Canvas or Pagination Mode in Settings',
                '• Supports both touch and mouse interactions',
                '',
                'Links:',
                '• GitHub Project: https://github.com/lifeafter619/Aboard',
                '• Author Blog: https://66619.eu.org',
                '',
                'Enjoy using Aboard!'
            ]
        },
        about: {
            title: 'About Aboard',
            projectIntro: 'Project Introduction',
            description1: 'Aboard is a simple web whiteboard application designed for teaching and presentations.',
            description2: 'It provides smooth drawing experience and rich background options to let your creativity flow.',
            mainFeatures: 'Main Features',
            features: {
                penTypes: 'Multiple pen types (Normal, Pencil, Ballpoint, Fountain, Brush)',
                smartEraser: 'Smart eraser (supports Circle and Square)',
                richPatterns: 'Rich background patterns (Dots, Grid, Tianzige, English 4-line, etc.)',
                adjustable: 'Adjustable pattern density and transparency',
                canvasModes: 'Infinite Canvas and Pagination Mode (supports A4, A3, B5 presets)',
                customSize: 'Custom canvas size and ratio',
                draggable: 'Draggable toolbar and properties panel (supports vertical layout)',
                undoRedo: 'Undo/Redo functionality (supports up to 50 steps)',
                smartZoom: 'Smart zoom (Ctrl+Scroll to zoom at mouse position)',
                responsive: 'Responsive interface for different screen sizes'
            },
            techStack: 'Tech Stack',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: 'License',
            licenseType: 'MIT License',
            github: 'GitHub',
            version: 'Version'
        },
        more: {
            title: 'More Settings',
            showTimeDisplay: 'Show Date & Time',
            showTimeDisplayHint: 'Display current date and time in top-right corner'
        },
        time: {
            title: 'Time Display Settings',
            showDate: 'Show Date',
            showTime: 'Show Time',
            timezone: 'Timezone',
            timezoneHint: 'Choose timezone to display',
            timeFormat: 'Time Format',
            timeFormatHint: 'Choose time display format',
            timeFormat12: '12-Hour (AM/PM)',
            timeFormat24: '24-Hour',
            dateFormat: 'Date Format',
            dateFormatHint: 'Choose date display format',
            dateFormatAuto: 'Auto (System)',
            dateFormatYMD: 'YYYY-MM-DD (2024-01-01)',
            dateFormatMDY: 'MM-DD-YYYY (01-01-2024)',
            dateFormatDMY: 'DD-MM-YYYY (01-01-2024)',
            dateFormatChinese: 'Chinese (2024年1月1日)',
            colorSettings: 'Color Settings',
            colorSettingsHint: 'Set font and background color for time display',
            colorHint: 'Set font and background color for time display',
            textColor: 'Text Color',
            bgColor: 'Background Color',
            fontSize: 'Font Size',
            fontSizeLabel: 'Font Size: Current',
            fontSizeHint: 'Adjust font size for time display',
            opacity: 'Opacity',
            opacityLabel: 'Opacity: Current',
            opacityHint: 'Adjust opacity for time display',
            fullscreenMode: 'Fullscreen Mode',
            fullscreenModeHint: 'Choose how to trigger fullscreen time display',
            fullscreenDisabled: 'Disabled',
            fullscreenSingle: 'Single Click',
            fullscreenDouble: 'Double Click',
            fullscreenFontSize: 'Fullscreen Font Size',
            fullscreenFontSizeLabel: 'Fullscreen Font Size: Current',
            fullscreenFontSizeHint: 'Adjust fullscreen font size (10%-85%)',
            customColor: 'Custom Color',
            displayOptions: 'Display Options'
        }
    },

    // Feature Area
    features: {
        title: 'Features',
        moreFeatures: 'More Features',
        time: 'Time',
        timer: 'Timer',
        randomPicker: 'Picker',
        scoreboard: 'Score',
        insertImage: 'Insert Image'
    },

    // Random Picker
    randomPicker: {
        namePicker: 'Name Picker',
        numberPicker: 'Number Picker',
        noNames: 'Please add names',
        settingsTitle: 'Picker Settings',
        modeName: 'Name Mode',
        modeNumber: 'Number Mode',
        titleLabel: 'Title',
        titlePlaceholder: 'Custom Title (Optional)',
        namesLabel: 'Names List (One per line)',
        namesPlaceholder: 'Student A\nStudent B\nStudent C',
        defaultNames: 'Student A\nStudent B\nStudent C\nStudent D\nStudent E',
        allowRepeats: 'Allow Repeats',
        rangeLabel: 'Number Range',
        importLabel: 'Import Names (Excel/CSV)',
        defaultColumnName: 'Name',
        importBtn: 'Select File',
        importHint: 'Tip: Reads data from the specified column name',
        importSuccess: 'Successfully imported {count} names',
        importNoData: 'No data found in specified column. Check column name.',
        importError: 'Failed to parse file'
    },

    // Scoreboard
    scoreboard: {
        title: 'Scoreboard',
        addTeam: 'Add Team',
        reset: 'Reset Scores',
        confirmRemoveTeam: 'Are you sure you want to remove this team?',
        teamDefault: 'Team',
        removeTeam: 'Remove Team',
        confirmReset: 'Are you sure you want to reset all scores?'
    },

    // Teaching Tools
    teachingTools: {
        title: 'Teaching Tools',
        ruler: 'Ruler',
        rulerStyle1: 'Ruler 1',
        rulerStyle2: 'Ruler 2',
        setSquare: 'Set Square',
        setSquare60: 'Set Square 60°',
        setSquare45: 'Set Square 45°',
        hint: 'Tip: Click to move, double-click to resize/rotate/delete',
        insertHint: 'Select quantity to insert',
        currentOnCanvas: 'Currently on canvas',
        addNew: 'Add New',
        rotate: 'Rotate',
        resize: 'Resize',
        delete: 'Delete',
        drawAlongEdge: 'Draw Along Edge'
    },

    // Time Display
    timeDisplay: {
        title: 'Time Display',
        settingsTitle: 'Time Display Settings',
        options: 'Time Display Options',
        showDate: 'Show Date',
        showTime: 'Show Time',
        settings: 'Settings',
        fullscreenDisplay: 'Fullscreen',
        displayOptions: 'Display Options',
        dateAndTime: 'Date & Time',
        dateOnly: 'Date Only',
        timeOnly: 'Time Only',
        timezone: 'Timezone',
        timeFormat: 'Time Format',
        dateFormat: 'Date Format',
        colorSettings: 'Color Settings',
        textColor: 'Text Color',
        bgColor: 'Background Color',
        fontSize: 'Font Size',
        fontSizeLabel: 'Font Size: Current',
        opacity: 'Opacity',
        opacityLabel: 'Opacity: Current',
        fullscreenMode: 'Fullscreen Mode',
        fullscreenFontSize: 'Fullscreen Font Size',
        fullscreenFontSizeLabel: 'Fullscreen Font Size: Current',
        fullscreenFontSizeHint: 'Adjust fullscreen font size (10%-85%)',
        fullscreenSliderLabel: 'Font Size (10%-85%)',
        customColor: 'Custom Color',
        transparent: 'Transparent',
        fullscreenDisabled: 'Disabled',
        fullscreenSingle: 'Single Click',
        fullscreenDouble: 'Double Click'
    },

    // Timer
    timer: {
        title: 'Timer',
        settingsTitle: 'Timer Settings',
        mode: 'Mode',
        selectMode: 'Select Mode',
        countdown: 'Countdown',
        stopwatch: 'Stopwatch',
        duration: 'Set Duration',
        hours: 'Hours',
        minutes: 'Minutes',
        seconds: 'Seconds',
        timerTitle: 'Timer Title (Optional)',
        titlePlaceholder: 'e.g., Presentation, Exam, etc.',
        setTime: 'Set Time',
        setStartTime: 'Set Start Time',
        fontSettings: 'Font Settings',
        fontSize: 'Font Size',
        fontSizeLabel: 'Font Size: Current',
        minimal: 'Minimal',
        minimalMode: 'Minimal Mode (Double-click to restore)',
        adjustColor: 'Adjust Color',
        colorSettings: 'Color Settings',
        textColor: 'Text Color',
        bgColor: 'Background Color',
        opacity: 'Opacity',
        opacityLabel: 'Opacity: Current',
        fullscreenFontSize: 'Fullscreen Font Size',
        fullscreenFontSizeLabel: 'Fullscreen Font Size: Current',
        soundSettings: 'Sound Settings',
        playSound: 'Play sound when timer ends',
        loopPlayback: 'Loop Playback',
        loopCount: 'Loop Count',
        uploadCustomAudio: 'Upload Custom Audio',
        soundPresets: {
            classBell: 'Class Bell (10s)',
            examEnd: 'Exam End (4s)',
            gentle: 'Gentle (17s)',
            digitalBeep: 'Digital Beep (4s)'
        },
        colors: {
            black: 'Black',
            white: 'White',
            blue: 'Blue',
            red: 'Red',
            green: 'Green',
            yellow: 'Yellow',
            orange: 'Orange',
            purple: 'Purple',
            transparent: 'Transparent',
            darkGray: 'Dark Gray (Default)',
            lightGray: 'Light Gray',
            lightRed: 'Light Red',
            lightBlue: 'Light Blue',
            lightGreen: 'Light Green',
            lightYellow: 'Light Yellow',
            lightOrange: 'Light Orange',
            whiteDefault: 'White (Default)'
        },
        customColor: 'Custom Color',
        start: 'Start',
        adjust: 'Adjust',
        continue: 'Continue',
        pause: 'Pause',
        reset: 'Reset',
        stop: 'Stop',
        alertSetTime: 'Please set the countdown time',
        alertTitle: 'Alert'
    },

    // Export
    export: {
        selectAtLeastOnePage: 'Please select at least one page to export',
        paginationRequired: 'Currently in Infinite Canvas mode. Please enable Pagination Mode in Settings to use this feature.',
        noPages: 'No pages to export.'
    },

    // Timezone names
    timezones: {
        'china': 'China (UTC+8)',
        'newyork': 'New York (UTC-5/-4)',
        'losangeles': 'Los Angeles (UTC-8/-7)',
        'chicago': 'Chicago (UTC-6/-5)',
        'london': 'London (UTC+0/+1)',
        'paris': 'Paris (UTC+1/+2)',
        'berlin': 'Berlin (UTC+1/+2)',
        'tokyo': 'Tokyo (UTC+9)',
        'seoul': 'Seoul (UTC+9)',
        'hongkong': 'Hong Kong (UTC+8)',
        'singapore': 'Singapore (UTC+8)',
        'dubai': 'Dubai (UTC+4)',
        'sydney': 'Sydney (UTC+10/+11)',
        'auckland': 'Auckland (UTC+12/+13)',
        'utc': 'UTC (Coordinated Universal Time)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Welcome to Aboard',
        content: `Welcome to Aboard Whiteboard Application!

Tips:
• Click bottom toolbar to select different tools
• Use Ctrl+Z to Undo, Ctrl+Y to Redo
• Click top-right zoom buttons or use mouse wheel to zoom
• Click Background button to choose different patterns
• Switch between Infinite Canvas or Pagination Mode in Settings
• Supports both touch and mouse interactions

Enjoy using Aboard!`,
        confirm: 'OK',
        noShowAgain: 'Don\'t show again'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: 'Confirm Clear',
        message: 'Are you sure you want to clear the canvas? This action cannot be undone.',
        confirm: 'Confirm',
        cancel: 'Cancel'
    },

    // Color names
    colors: {
        black: 'Black',
        red: 'Red',
        blue: 'Blue',
        green: 'Green',
        yellow: 'Yellow',
        orange: 'Orange',
        purple: 'Purple',
        white: 'White',
        transparent: 'Transparent'
    },

    // Days of week
    days: {
        sunday: 'Sunday',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday'
    }
};
