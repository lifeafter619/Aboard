/**
 * German (Germany) - Deutsch
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: 'Bestätigen',
        cancel: 'Abbrechen',
        close: 'Schließen',
        save: 'Speichern',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        add: 'Hinzufügen',
        remove: 'Entfernen',
        yes: 'Ja',
        no: 'Nein',
        ok: 'OK',
        apply: 'Anwenden',
        reset: 'Zurücksetzen'
    },

    // App Title
    app: {
        title: 'Aboard - Minimalistisches Whiteboard',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: 'Rückgängig',
        redo: 'Wiederholen',
        pen: 'Stift',
        shape: 'Form',
        move: 'Verschieben',
        eraser: 'Radiergummi',
        clear: 'Löschen',
        background: 'Hintergrund',
        teachingTools: 'Werkzeuge',
        more: 'Mehr',
        settings: 'Einstellungen',
        export: 'Leinwand exportieren',
        zoomOut: 'Verkleinern (-)',
        zoomIn: 'Vergrößern (+)',
        fullscreen: 'Vollbild (F11)',
        zoomPlaceholder: 'Zoomstufe (Prozent eingeben)'
    },

    // Tools
    tools: {
        pen: {
            title: 'Stift',
            type: 'Stifttyp',
            normal: 'Normaler Stift',
            pencil: 'Bleistift',
            ballpoint: 'Kugelschreiber',
            fountain: 'Füllfederhalter',
            brush: 'Pinsel',
            color: 'Farbe',
            colorAndSize: 'Farbe & Größe',
            colorPicker: 'Farbwähler',
            size: 'Linienstärke',
            sizeLabel: 'Stärke: Aktuell',
            sizePx: 'px'
        },
        shape: {
            title: 'Form',
            type: 'Formtyp',
            line: 'Linie',
            rectangle: 'Rechteck',
            circle: 'Kreis',
            ellipse: 'Ellipse',
            arrow: 'Pfeil',
            doubleArrow: 'Doppelpfeil',
            arrowSize: 'Pfeilgröße',
            hint: 'Drücken und ziehen zum Zeichnen, loslassen zum Beenden',
            lineProperties: 'Linieneigenschaften'
        },
        eraser: {
            title: 'Radiergummi',
            type: 'Radiergummi-Typ',
            normal: 'Normaler Radiergummi',
            pixel: 'Pixel-Radiergummi',
            size: 'Radiergummi-Größe',
            sizeLabel: 'Radiergummi-Größe: Aktuell',
            shape: 'Form',
            shapeCircle: 'Kreis',
            shapeRectangle: 'Rechteck'
        },
        clear: {
            title: 'Leinwand löschen',
            confirm: 'Löschen bestätigen',
            message: 'Möchten Sie die Leinwand wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
        },
        refresh: {
            warning: 'Beim Aktualisieren wird der gesamte Inhalt der Leinwand gelöscht und kann nicht wiederhergestellt werden. Möchten Sie wirklich aktualisieren?'
        },
        lineStyle: {
            title: 'Linienstil',
            solid: 'Durchgehend',
            dashed: 'Gestrichelt',
            dotted: 'Gepunktet',
            wavy: 'Wellig',
            double: 'Doppelt',
            triple: 'Dreifach',
            multiLine: 'Mehrfachlinien',
            arrow: 'Pfeil',
            doubleArrow: 'Doppelpfeil',
            noArrow: 'Kein Pfeil',
            arrowType: 'Pfeiltyp',
            dashDensity: 'Strichdichte',
            waveDensity: 'Wellendichte',
            lineSpacing: 'Linienabstand',
            lineCount: 'Linienanzahl'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: 'Linienstil-Einstellungen',
        openSettings: 'Weitere Einstellungen',
        preview: 'Vorschau'
    },

    // Time Display
    timeDisplay: {
        options: 'Zeitanzeigeoptionen',
        showDate: 'Datum anzeigen',
        showTime: 'Uhrzeit anzeigen',
        settings: 'Einstellungen',
        fullscreenDisplay: 'Vollbildanzeige'
    },

    // Background
    background: {
        title: 'Hintergrund',
        color: 'Hintergrundfarbe',
        pattern: 'Hintergrundmuster',
        blank: 'Leer',
        none: 'Keine',
        dots: 'Punkte',
        grid: 'Raster',
        lines: 'Linien',
        tianzige: 'Tianzige (Chinesisch)',
        english4line: 'Englisch 4-Linien',
        musicStaff: 'Notensystem',
        coordinate: 'Koordinaten',
        coordinateOriginHint: 'Doppelklicken Sie im Verschiebemodus, um den Koordinatenursprung auszuwählen und zu verschieben',
        image: 'Bild',
        opacity: 'Hintergrund-Deckkraft',
        opacityHint: 'Hintergrundtransparenz anpassen, 100% ist vollständig undurchsichtig',
        contrast: 'Kontrast',
        contrastHint: 'Die Dunkelheit der Hintergrundmusterlinien anpassen',
        preference: 'Hintergrundmuster-Präferenz',
        moveCoordinateOrigin: 'Ursprung verschieben',
        moveCoordinateOriginHint: 'Klicken und auf der Leinwand ziehen, um den Koordinatenursprung zu verschieben'
    },

    // Image Controls
    imageControls: {
        confirm: 'Bestätigen',
        cancel: 'Abbrechen',
        flipHorizontal: 'Horizontal spiegeln',
        flipVertical: 'Vertikal spiegeln',
        rotate: 'Drehen'
    },

    // Page Navigation
    page: {
        previous: 'Vorherige',
        next: 'Nächste',
        jumpPlaceholder: 'Seitenzahl eingeben',
        of: ' / ',
        newPage: 'Neue Seite'
    },

    // Settings
    settings: {
        title: 'Einstellungen',
        tabs: {
            general: 'Allgemein',
            display: 'Anzeige',
            pen: 'Stift',
            eraser: 'Radiergummi',
            canvas: 'Leinwand',
            background: 'Hintergrund',
            about: 'Über',
            announcement: 'Ankündigung',
            more: 'Mehr'
        },
        display: {
            title: 'Anzeigeeinstellungen',
            theme: 'Thema',
            themeHint: 'Anwendungsthema wählen',
            themeColor: 'Themenfarbe',
            themeColorHint: 'Farbe für ausgewählte Symbolleistenelemente',
            showZoomControls: 'Zoom-Steuerungen anzeigen',
            showZoomControlsHint: 'Zoom-Steuerungen über der Leinwand anzeigen',
            showFullscreenBtn: 'Vollbild-Schaltfläche anzeigen',
            showFullscreenBtnHint: 'Vollbild-Schaltfläche neben den Zoom-Steuerungen anzeigen',
            toolbarSize: 'Symbolleistengröße',
            toolbarSizeLabel: 'Symbolleistengröße: Aktuell',
            toolbarSizeHint: 'Größe der unteren Symbolleiste anpassen',
            configScale: 'Konfigurationspanel-Größe',
            configScaleLabel: 'Konfigurationspanel-Größe: Aktuell',
            configScaleHint: 'Größe der Popup-Konfigurationspanels anpassen',
            colorOptions: {
                blue: 'Blau',
                purple: 'Lila',
                green: 'Grün',
                orange: 'Orange',
                red: 'Rot',
                pink: 'Rosa',
                cyan: 'Cyan',
                yellow: 'Gelb'
            },
            colorPicker: 'Farbwähler'
        },
        general: {
            title: 'Allgemeine Einstellungen',
            language: 'Sprache',
            languageHint: 'Sprache der Benutzeroberfläche wählen',
            globalFont: 'Globale Schriftart',
            globalFontHint: 'Wählen Sie die Schriftart für die Anwendung',
            fonts: {
                system: 'Systemstandard',
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
            edgeSnap: 'Randausrichtung aktivieren',
            edgeSnapHint: 'Bedienfelder automatisch am Bildschirmrand ausrichten',
            controlPosition: 'Position der Steuerungstasten',
            controlPositionHint: 'Wählen Sie die Position der Zoom- und Seitensteuerung',
            positionTopLeft: 'Oben links',
            positionTopRight: 'Oben rechts',
            positionBottomLeft: 'Unten links',
            positionBottomRight: 'Unten rechts',
            canvasMode: 'Leinwandmodus',
            canvasModeHint: 'Zwischen Seitennummerierung oder unendlichem Leinwandmodus wählen',
            pagination: 'Seitennummerierung',
            infiniteCanvas: 'Unendliche Leinwand',
            autoSave: 'Automatisches Speichern',
            autoSaveHint: 'Ihre Zeichnungen regelmäßig automatisch speichern'
        },
        canvas: {
            title: 'Leinwandeinstellungen',
            mode: 'Leinwandmodus',
            modeHint: 'Wählen Sie den Leinwand-Anzeigemodus',
            size: 'Leinwandgröße',
            sizeHint: 'Wählen Sie voreingestellte Größen oder passen Sie die Leinwand an',
            infiniteCanvas: 'Unendliche Leinwand',
            pagination: 'Seitenmodus',
            presets: {
                a4Portrait: 'A4 Hochformat',
                a4Landscape: 'A4 Querformat',
                a3Portrait: 'A3 Hochformat',
                a3Landscape: 'A3 Querformat',
                b5Portrait: 'B5 Hochformat',
                b5Landscape: 'B5 Querformat',
                widescreen: '16:9 Breitbild',
                standard: '4:3 Standard',
                custom: 'Benutzerdefiniert'
            },
            customSize: {
                portrait: 'Hochformat',
                landscape: 'Querformat',
                width: 'Breite',
                height: 'Höhe',
                ratio: 'Seitenverhältnis',
                ratios: {
                    custom: 'Benutzerdefiniert',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (Hochformat)',
                    '9:16': '9:16 (Hochformat)'
                }
            }
        },
        background: {
            title: 'Hintergrundeinstellungen',
            opacity: 'Hintergrunddeckkraft',
            opacityLabel: 'Hintergrunddeckkraft: Aktuell',
        opacityHint: 'Hintergrundtransparenz anpassen, 100% ist vollständig undurchsichtig',
        contrast: 'Kontrast',
        contrastLabel: 'Mustertransparenz: Aktuell',
            opacityHint: 'Hintergrundtransparenz anpassen, 100% ist vollständig undurchsichtig',
            patternIntensity: 'Musterintensität',
            patternIntensityLabel: 'Mustertransparenz: Aktuell',
            patternIntensityHint: 'Helligkeit der Hintergrundmusterlinien anpassen',
            preference: 'Hintergrundmusterpräferenz',
            preferenceHint: 'Wählen Sie die im Konfigurationspanel anzuzeigenden Muster',
        upload: 'Hochladen'
        },
        announcement: {
            title: 'Ankündigung',
            welcome: 'Willkommen bei Aboard!',
            content: [
                'Willkommen bei der Aboard Whiteboard-Anwendung!',
                '',
                'Nutzungstipps:',
                '• Klicken Sie auf die Symbolleiste unten, um verschiedene Zeichenwerkzeuge auszuwählen',
                '• Verwenden Sie Strg+Z zum Rückgängigmachen, Strg+Y zum Wiederholen',
                '• Klicken Sie auf die Zoom-Schaltflächen oben rechts oder verwenden Sie das Mausrad zum Zoomen',
                '• Klicken Sie auf die Hintergrund-Schaltfläche, um verschiedene Hintergrundmuster auszuwählen',
                '• Wechseln Sie in den Einstellungen zwischen unbegrenzter Leinwand oder Seitenmodus',
                '• Unterstützt Touch- und Mauseingabe',
                '',
                'Viel Spaß beim Erstellen!'
            ]
        },
        about: {
            title: 'Über Aboard',
            projectIntro: 'Projekteinführung',
            description1: 'Aboard ist eine minimalistische Web-Whiteboard-Anwendung für Lehre und Präsentationen.',
            description2: 'Es bietet ein reibungsloses Zeichenerlebnis und reichhaltige Hintergrundoptionen.',
            mainFeatures: 'Hauptfunktionen',
            features: {
                penTypes: 'Mehrere Stifttypen (Normaler Stift, Bleistift, Kugelschreiber, Füllfederhalter, Pinsel)',
                smartEraser: 'Intelligenter Radiergummi (unterstützt Kreis und Rechteck)',
                richPatterns: 'Reichhaltige Hintergrundmuster (Punkte, Raster, Tianzige, Englisch 4-Linien usw.)',
                adjustable: 'Einstellbare Musterdichte und Transparenz',
                canvasModes: 'Unbegrenzte Leinwand und Seitenmodus (unterstützt A4, A3, B5 und andere voreingestellte Größen)',
                customSize: 'Benutzerdefinierte Leinwandgröße und Seitenverhältnis',
                draggable: 'Ziehbare Symbolleiste und Eigenschaftenpanels',
                undoRedo: 'Rückgängig/Wiederholen-Funktion (unterstützt bis zu 50 Schritte)',
                smartZoom: 'Intelligenter Zoom (Strg+Scrollrad, Zoom zur Mausposition)',
                responsive: 'Responsive Benutzeroberfläche, passt sich verschiedenen Bildschirmgrößen an'
            },
            techStack: 'Technologie-Stack',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: 'Open-Source-Lizenz',
            licenseType: 'MIT-Lizenz',
            github: 'GitHub',
            version: 'Version'
        },
        more: {
            title: 'Weitere Einstellungen',
            showTimeDisplay: 'Zeit und Datum anzeigen',
            showTimeDisplayHint: 'Aktuelle Zeit und Datum in der oberen rechten Ecke anzeigen'
        },
        time: {
            title: 'Zeitanzeigeeinstellungen',
            showDate: 'Datum anzeigen',
            showTime: 'Uhrzeit anzeigen',
            timezone: 'Zeitzone',
            timezoneHint: 'Wählen Sie die anzuzeigende Zeitzone',
            timeFormat: 'Zeitformat',
            timeFormatHint: 'Wählen Sie das Zeitanzeigeformat',
            timeFormat12: '12-Stunden (AM/PM)',
            timeFormat24: '24-Stunden',
            dateFormat: 'Datumsformat',
            dateFormatHint: 'Wählen Sie das Datumsanzeigeformat',
            dateFormatYMD: 'Jahr-Monat-Tag (2024-01-01)',
            dateFormatMDY: 'Monat-Tag-Jahr (01-01-2024)',
            dateFormatDMY: 'Tag-Monat-Jahr (01-01-2024)',
            dateFormatChinese: 'Chinesisch (2024年1月1日)',
            colorSettings: 'Farbeinstellungen',
            colorSettingsHint: 'Schriftart und Hintergrundfarbe für Zeitanzeige festlegen',
            colorHint: 'Schrift- und Hintergrundfarben für die Zeitanzeige festlegen',
            textColor: 'Textfarbe',
            bgColor: 'Hintergrundfarbe',
            fontSize: 'Schriftgröße',
            fontSizeLabel: 'Schriftgröße: Aktuell',
            opacity: 'Deckkraft',
            opacityLabel: 'Deckkraft: Aktuell',
            fullscreenMode: 'Vollbildmodus',
            fullscreenModeHint: 'Wählen Sie, wie die Vollbild-Zeitanzeige ausgelöst wird',
            fullscreenDisabled: 'Deaktiviert',
            fullscreenSingle: 'Einzelklick',
            fullscreenDouble: 'Doppelklick',
            fullscreenFontSize: 'Vollbild-Schriftgröße',
            fullscreenFontSizeLabel: 'Vollbild-Schriftgröße: Aktuell',
            fullscreenFontSizeHint: 'Schriftgröße der Vollbild-Zeitanzeige anpassen, Bereich 10%-85%',
            customColor: 'Benutzerdefinierte Farbe'
        },
        about: {
            title: 'Über Aboard',
            version: 'Version',
            description: 'Aboard ist eine minimalistische, aber leistungsstarke Whiteboard-Anwendung, die für kreative Arbeit und effiziente Notizen entwickelt wurde.',
            features: 'Hauptfunktionen',
            feature1: 'Reibungslose Zeichenerfahrung',
            feature2: 'Vielfältige Stifttypen',
            feature3: 'Flexibles Radiergummi-Werkzeug',
            feature4: 'Reichhaltige Hintergrundmuster (Punkte, Raster, Tianzige, Englisch 4-Linien usw.)',
            feature5: 'Export als PNG-Bilder',
            feature6: 'Rückgängig/Wiederholen-Funktionalität',
            feature7: 'Vollständige Touch-Unterstützung',
            feature8: 'Vollbildmodus',
            feature9: 'Automatisches Speichern',
            feature10: 'Mehrsprachige Unterstützung',
            license: 'Open-Source-Lizenz',
            github: 'GitHub-Repository'
        }
    },

    // Feature Area
    features: {
        title: 'Funktionen',
        moreFeatures: 'Weitere Funktionen',
        time: 'Zeit',
        timer: 'Timer',
        randomPicker: 'Auswahl',
        scoreboard: 'Punktetafel',
        insertImage: 'Bild einfügen'
    },

    // Teaching Tools
    teachingTools: {
        title: 'Lehrmittel',
        ruler: 'Lineal',
        rulerStyle1: 'Lineal 1',
        rulerStyle2: 'Lineal 2',
        setSquare: 'Geodreieck',
        setSquare60: 'Geodreieck 60°',
        setSquare45: 'Geodreieck 45°',
        hint: 'Hinweis: Einfacher Klick zum Verschieben, Doppelklick zum Größe ändern, Drehen oder Löschen',
        insertHint: 'Wählen Sie die Anzahl der einzufügenden Werkzeuge',
        currentOnCanvas: 'Aktuelle Anzahl auf der Leinwand',
        addNew: 'Neu hinzufügen',
        rotate: 'Drehen',
        resize: 'Größe ändern',
        delete: 'Löschen',
        drawAlongEdge: 'Entlang der Kante zeichnen'
    },

    // Time Display
    timeDisplay: {
        title: 'Zeitanzeige',
        settingsTitle: 'Zeitanzeigeeinstellungen',
        options: 'Zeitanzeigeoptionen',
        showDate: 'Datum anzeigen',
        showTime: 'Uhrzeit anzeigen',
        settings: 'Einstellungen',
        displayOptions: 'Anzeigeoptionen',
        dateAndTime: 'Datum und Uhrzeit',
        dateOnly: 'Nur Datum',
        timeOnly: 'Nur Uhrzeit'
    },

    // Timer
    timer: {
        settingsTitle: 'Timer-Einstellungen',
        mode: 'Modus',
        selectMode: 'Modus wählen',
        countdown: 'Countdown',
        stopwatch: 'Stoppuhr',
        duration: 'Dauer (Minuten)',
        hours: 'Stunden',
        minutes: 'Minuten',
        seconds: 'Sekunden',
        title: 'Titel',
        titlePlaceholder: 'Timer-Titel eingeben',
        setTime: 'Zeit einstellen',
        setStartTime: 'Startzeit einstellen',
        hours: 'Stunden',
        minutes: 'Minuten',
        seconds: 'Sekunden',
        title: 'Titel',
        titlePlaceholder: 'Timer-Titel eingeben',
        fontSettings: 'Schrifteinstellungen',
        fontSize: 'Schriftgröße',
        fontSizeLabel: 'Schriftgröße: Aktuell',
        fontSizeHint: 'Schriftgröße der Zeitanzeige anpassen',
        fontSizeLabel: 'Schriftgröße: Aktuell',
        adjustColor: 'Farbe anpassen',
        colorSettings: 'Farbeinstellungen',
        colorSettingsHint: 'Schriftart und Hintergrundfarbe für Zeitanzeige festlegen',
        textColor: 'Textfarbe',
        bgColor: 'Hintergrundfarbe',
        opacity: 'Deckkraft',
        opacityLabel: 'Deckkraft: Aktuell',
        fullscreenFontSize: 'Vollbild-Schriftgröße',
        fullscreenFontSizeLabel: 'Vollbild-Schriftgröße: Aktuell',
        soundSettings: 'Toneinstellungen',
        playSound: 'Alarmton abspielen, wenn Countdown endet',
        loopPlayback: 'Schleifenwiedergabe',
        loopCount: 'Schleifenzähler',
        uploadCustomAudio: 'Benutzerdefiniertes Audio hochladen',
        soundPresets: {
            classBell: 'Schulglocke (10s)',
            digitalBeep: 'Digitaler Piepton (3s)',
            gentle: 'Sanft (5s)',
            examEnd: 'Prüfungsende (8s)'
        },
        colors: {
            black: 'Schwarz',
            white: 'Weiß',
            blue: 'Blau',
            red: 'Rot',
            green: 'Grün',
            yellow: 'Gelb',
            orange: 'Orange',
            purple: 'Lila',
            transparent: 'Transparent'
        },
        customColor: 'Benutzerdefinierte Farbe',
        start: 'Starten',
        adjust: 'Anpassen',
        continue: 'Fortsetzen',
        pause: 'Pause',
        reset: 'Zurücksetzen',
        stop: 'Stoppen',
        alertSetTime: 'Bitte stellen Sie die Countdown-Zeit ein',
        alertTitle: 'Hinweis'
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
        'tokyo': 'Tokio (UTC+9)',
        'seoul': 'Seoul (UTC+9)',
        'hongkong': 'Hongkong (UTC+8)',
        'singapore': 'Singapur (UTC+8)',
        'dubai': 'Dubai (UTC+4)',
        'sydney': 'Sydney (UTC+10/+11)',
        'auckland': 'Auckland (UTC+12/+13)',
        'utc': 'UTC (Koordinierte Weltzeit)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Willkommen bei Aboard',
        content: `Willkommen bei der Aboard Whiteboard-Anwendung!

Verwendungstipps:
• Klicken Sie auf die Symbolleiste unten, um verschiedene Zeichenwerkzeuge auszuwählen
• Verwenden Sie Strg+Z zum Rückgängigmachen, Strg+Y zum Wiederholen
• Klicken Sie auf die Zoom-Schaltflächen oben rechts oder verwenden Sie das Mausrad zum Zoomen der Leinwand
• Klicken Sie auf die Hintergrund-Schaltfläche, um verschiedene Hintergrundmuster auszuwählen
• Wechseln Sie in den Einstellungen zwischen unendlicher Leinwand oder Seitennummerierungsmodus
• Unterstützt Touch- und Maus-Eingabe

Viel Spaß bei Ihrer kreativen Arbeit!`,
        confirm: 'OK',
        noShowAgain: 'Nicht mehr anzeigen'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: 'Löschen bestätigen',
        message: 'Sind Sie sicher, dass Sie die aktuelle Leinwand löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden. Andere Leinwände sind nicht betroffen.',
        confirm: 'Bestätigen',
        cancel: 'Abbrechen'
    },

    // Color names
    colors: {
        black: 'Schwarz',
        red: 'Rot',
        blue: 'Blau',
        green: 'Grün',
        yellow: 'Gelb',
        orange: 'Orange',
        purple: 'Lila',
        white: 'Weiß',
        transparent: 'Transparent',
        lightGray: 'Hellgrau',
        darkGray: 'Dunkelgrau',
        lightBlue: 'Hellblau',
        lightRed: 'Hellrot',
        lightGreen: 'Hellgrün',
        lightYellow: 'Hellgelb',
        lightOrange: 'Hellorange',
        whiteDefault: 'Weiß (Standard)'
    },

    // Days of week
    days: {
        sunday: 'Sonntag',
        monday: 'Montag',
        tuesday: 'Dienstag',
        wednesday: 'Mittwoch',
        thursday: 'Donnerstag',
        friday: 'Freitag',
        saturday: 'Samstag'
    }
};
