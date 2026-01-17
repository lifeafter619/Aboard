/**
 * Spanish (Spain) - Español
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: 'Confirmar',
        cancel: 'Cancelar',
        close: 'Cerrar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Añadir',
        remove: 'Quitar',
        yes: 'Sí',
        no: 'No',
        ok: 'OK',
        apply: 'Aplicar',
        reset: 'Restablecer'
    },

    // App Title
    app: {
        title: 'Aboard - Pizarra Minimalista',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: 'Deshacer',
        redo: 'Rehacer',
        pen: 'Bolígrafo',
        shape: 'Forma',
        move: 'Mover',
        eraser: 'Borrador',
        clear: 'Borrar',
        background: 'Fondo',
        teachingTools: 'Herramientas',
        more: 'Más',
        settings: 'Configuración',
        export: 'Exportar lienzo',
        zoomOut: 'Alejar (-)',
        zoomIn: 'Acercar (+)',
        fullscreen: 'Pantalla completa (F11)',
        zoomPlaceholder: 'Nivel de zoom (Introducir porcentaje)'
    },

    // Tools
    tools: {
        pen: {
            title: 'Bolígrafo',
            type: 'Tipo de bolígrafo',
            normal: 'Bolígrafo normal',
            pencil: 'Lápiz',
            ballpoint: 'Bolígrafo de bola',
            fountain: 'Pluma estilográfica',
            brush: 'Pincel',
            color: 'Color',
            colorAndSize: 'Color y tamaño',
            colorPicker: 'Selector de color',
            size: 'Grosor de línea',
            sizeLabel: 'Grosor: Actual',
            sizePx: 'px'
        },
        shape: {
            title: 'Forma',
            type: 'Tipo de forma',
            line: 'Línea',
            rectangle: 'Rectángulo',
            circle: 'Círculo',
            ellipse: 'Elipse',
            arrow: 'Flecha',
            doubleArrow: 'Doble flecha',
            arrowSize: 'Tamaño de flecha',
            hint: 'Presione y arrastre para dibujar, suelte para terminar',
            lineProperties: 'Propiedades de línea'
        },
        eraser: {
            title: 'Borrador',
            type: 'Tipo de borrador',
            normal: 'Borrador normal',
            pixel: 'Borrador de píxel',
            size: 'Tamaño del borrador',
            shapeCircle: 'Círculo',
            shapeRectangle: 'Rectángulo'
        },
        clear: {
            title: 'Borrar lienzo',
            confirm: 'Confirmar borrado',
            message: '¿Está seguro de que desea borrar el lienzo? Esta acción no se puede deshacer.'
        },
        refresh: {
            warning: 'Al actualizar se borrará todo el contenido del lienzo y no se podrá recuperar. ¿Está seguro de que desea actualizar?'
        },
        lineStyle: {
            title: 'Estilo de línea',
            solid: 'Sólido',
            dashed: 'Discontinuo',
            dotted: 'Punteado',
            wavy: 'Ondulado',
            double: 'Doble',
            triple: 'Triple',
            multiLine: 'Multilínea',
            arrow: 'Flecha',
            doubleArrow: 'Doble flecha',
            noArrow: 'Sin flecha',
            arrowType: 'Tipo de flecha',
            dashDensity: 'Densidad de guiones',
            waveDensity: 'Densidad de ondas',
            lineSpacing: 'Espaciado de líneas',
            lineCount: 'Número de líneas'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: 'Configuración de estilo de línea',
        openSettings: 'Más configuración',
        preview: 'Vista previa'
    },

    // Time Display
    timeDisplay: {
        options: 'Opciones de visualización de hora',
        showDate: 'Mostrar fecha',
        showTime: 'Mostrar hora',
        settings: 'Configuración',
        fullscreenDisplay: 'Pantalla completa'
    },

    // Background
    background: {
        title: 'Fondo',
        color: 'Color de fondo',
        pattern: 'Patrón de fondo',
        blank: 'En blanco',
        none: 'Ninguno',
        dots: 'Puntos',
        grid: 'Cuadrícula',
        lines: 'Líneas',
        tianzige: 'Tianzige (Chino)',
        english4line: 'Línea inglesa 4',
        musicStaff: 'Pentagrama',
        coordinate: 'Coordenadas',
        coordinateOriginHint: 'Doble clic para seleccionar el origen en modo Mover, luego arrastre para moverlo',
        image: 'Imagen',
        opacity: 'Opacidad del fondo',
        opacityHint: 'Ajustar la transparencia del fondo, 100% es completamente opaco',
        contrast: 'Contraste',
        contrastHint: 'Ajustar la oscuridad de las líneas del patrón de fondo',
        preference: 'Preferencia de patrón de fondo',
        moveCoordinateOrigin: 'Mover origen',
        moveCoordinateOriginHint: 'Haga clic y arrastre en el lienzo para mover el origen de coordenadas'
    },

    // Image Controls
    imageControls: {
        confirm: 'Confirmar',
        cancel: 'Cancelar',
        flipHorizontal: 'Voltear horizontal',
        flipVertical: 'Voltear vertical',
        rotate: 'Rotar'
    },

    // Page Navigation
    page: {
        previous: 'Anterior',
        next: 'Siguiente',
        jumpPlaceholder: 'Introducir número de página',
        of: ' / ',
        newPage: 'Nueva página'
    },

    // Settings
    settings: {
        title: 'Configuración',
        tabs: {
            general: 'General',
            display: 'Pantalla',
            pen: 'Bolígrafo',
            eraser: 'Borrador',
            canvas: 'Lienzo',
            background: 'Fondo',
            about: 'Acerca de',
            announcement: 'Anuncio',
            more: 'Más'
        },
        display: {
            title: 'Configuración de pantalla',
            theme: 'Tema',
            themeHint: 'Elegir tema de la aplicación',
            themeColor: 'Color del tema',
            themeColorHint: 'Color para elementos seleccionados de la barra de herramientas',
            showZoomControls: 'Mostrar controles de zoom',
            showZoomControlsHint: 'Mostrar controles de zoom sobre el lienzo',
            showFullscreenBtn: 'Mostrar botón de pantalla completa',
            showFullscreenBtnHint: 'Mostrar botón de pantalla completa junto a los controles de zoom',
            toolbarSize: 'Tamaño de la barra de herramientas',
            toolbarSizeLabel: 'Tamaño de la barra de herramientas: Actual',
            toolbarSizeHint: 'Ajustar el tamaño de la barra de herramientas inferior',
            configScale: 'Tamaño del panel de configuración',
            configScaleLabel: 'Tamaño del panel de configuración: Actual',
            configScaleHint: 'Ajustar el tamaño de los paneles de configuración emergentes',
            colorOptions: {
                blue: 'Azul',
                purple: 'Morado',
                green: 'Verde',
                orange: 'Naranja',
                red: 'Rojo',
                pink: 'Rosa',
                cyan: 'Cian',
                yellow: 'Amarillo'
            },
            colorPicker: 'Selector de color'
        },
        general: {
            title: 'Configuración general',
            language: 'Idioma',
            languageHint: 'Elegir idioma de la interfaz',
            globalFont: 'Fuente global',
            globalFontHint: 'Elegir la fuente utilizada en la aplicación',
            fonts: {
                system: 'Predeterminado del sistema',
                serif: 'Serif',
                sansSerif: 'Sans Serif',
                monospace: 'Monospace',
                cursive: 'Cursiva',
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
            edgeSnap: 'Habilitar ajuste de borde',
            edgeSnapHint: 'Ajustar automáticamente los paneles de control a los bordes de la pantalla',
            controlPosition: 'Posición del botón de control',
            controlPositionHint: 'Elegir dónde mostrar los controles de zoom y paginación',
            positionTopLeft: 'Superior izquierda',
            positionTopRight: 'Superior derecha',
            positionBottomLeft: 'Inferior izquierda',
            positionBottomRight: 'Inferior derecha',
            canvasMode: 'Modo de lienzo',
            canvasModeHint: 'Elegir entre el modo de paginación o lienzo infinito',
            pagination: 'Paginación',
            infiniteCanvas: 'Lienzo infinito',
            autoSave: 'Guardado automático',
            autoSaveHint: 'Guardar automáticamente sus dibujos periódicamente'
        },
        canvas: {
            title: 'Configuración del lienzo',
            mode: 'Modo de lienzo',
            modeHint: 'Elegir el modo de visualización del lienzo',
            size: 'Tamaño del lienzo',
            sizeHint: 'Elegir tamaños preestablecidos o personalizar el lienzo',
            infiniteCanvas: 'Lienzo infinito',
            pagination: 'Modo de paginación',
            presets: {
                a4Portrait: 'A4 Vertical',
                a4Landscape: 'A4 Horizontal',
                a3Portrait: 'A3 Vertical',
                a3Landscape: 'A3 Horizontal',
                b5Portrait: 'B5 Vertical',
                b5Landscape: 'B5 Horizontal',
                widescreen: '16:9 Pantalla ancha',
                standard: '4:3 Estándar',
                custom: 'Personalizado'
            },
            customSize: {
                portrait: 'Vertical',
                landscape: 'Horizontal',
                width: 'Ancho',
                height: 'Alto',
                ratio: 'Relación de aspecto',
                ratios: {
                    custom: 'Personalizado',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (Vertical)',
                    '9:16': '9:16 (Vertical)'
                }
            }
        },
        background: {
            title: 'Configuración de fondo',
            opacity: 'Opacidad del fondo',
            opacityLabel: 'Opacidad del fondo: Actual',
            opacityHint: 'Ajustar la transparencia del fondo, 100% es completamente opaco',
            patternIntensity: 'Intensidad del patrón',
            patternIntensityLabel: 'Transparencia del patrón: Actual',
            patternIntensityHint: 'Ajustar la oscuridad de las líneas del patrón de fondo',
            preference: 'Preferencia de patrón de fondo',
            preferenceHint: 'Elegir qué patrones mostrar en el panel de configuración'
        },
        announcement: {
            title: 'Anuncio',
            welcome: '¡Bienvenido a Aboard!',
            content: [
                '¡Bienvenido a la aplicación de pizarra Aboard!',
                '',
                'Consejos de uso:',
                '• Haga clic en la barra de herramientas en la parte inferior para seleccionar diferentes herramientas de dibujo',
                '• Use Ctrl+Z para deshacer, Ctrl+Y para rehacer',
                '• Haga clic en los botones de zoom en la esquina superior derecha o use la rueda del mouse para hacer zoom',
                '• Haga clic en el botón de fondo para elegir diferentes patrones de fondo',
                '• Cambie entre lienzo infinito o modo de paginación en la configuración',
                '• Compatible con entrada táctil y de mouse',
                '',
                '¡Disfrute de su trabajo creativo!'
            ]
        },
        about: {
            title: 'Acerca de Aboard',
            projectIntro: 'Introducción del proyecto',
            description1: 'Aboard es una aplicación de pizarra web minimalista diseñada para enseñanza y presentaciones.',
            description2: 'Proporciona una experiencia de dibujo fluida y opciones de fondo ricas.',
            mainFeatures: 'Características principales',
            features: {
                penTypes: 'Múltiples tipos de bolígrafos (Bolígrafo normal, Lápiz, Bolígrafo, Pluma estilográfica, Pincel)',
                smartEraser: 'Borrador inteligente (compatible con círculo y rectángulo)',
                richPatterns: 'Patrones de fondo ricos (Puntos, Cuadrícula, Tianzige, Inglés 4 líneas, etc.)',
                adjustable: 'Densidad y transparencia del patrón ajustables',
                canvasModes: 'Lienzo infinito y modo de paginación (compatible con A4, A3, B5 y otros tamaños preestablecidos)',
                customSize: 'Tamaño y relación de aspecto del lienzo personalizados',
                draggable: 'Barra de herramientas y paneles de propiedades arrastrables',
                undoRedo: 'Función Deshacer/Rehacer (admite hasta 50 pasos)',
                smartZoom: 'Zoom inteligente (Ctrl+Rueda de desplazamiento, zoom a la posición del mouse)',
                responsive: 'Interfaz receptiva, se adapta a diferentes tamaños de pantalla'
            },
            techStack: 'Stack tecnológico',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: 'Licencia de código abierto',
            licenseType: 'Licencia MIT',
            github: 'GitHub',
            version: 'Versión'
        },
        more: {
            title: 'Más configuraciones',
            showTimeDisplay: 'Mostrar hora y fecha',
            showTimeDisplayHint: 'Mostrar la hora y fecha actuales en la esquina superior derecha'
        },
        time: {
            title: 'Configuración de visualización de hora',
            showDate: 'Mostrar fecha',
            showTime: 'Mostrar hora',
            timezone: 'Zona horaria',
            timeFormat: 'Formato de hora',
            timeFormat12: '12 horas (AM/PM)',
            timeFormat24: '24 horas',
            dateFormat: 'Formato de fecha',
            dateFormatYMD: 'Año-Mes-Día (2024-01-01)',
            dateFormatMDY: 'Mes-Día-Año (01-01-2024)',
            dateFormatDMY: 'Día-Mes-Año (01-01-2024)',
            dateFormatChinese: 'Chino (2024年1月1日)',
            colorSettings: 'Configuración de color',
            colorHint: 'Establecer colores de fuente y fondo para la visualización de hora',
            textColor: 'Color de texto',
            bgColor: 'Color de fondo',
            fontSize: 'Tamaño de fuente',
            fontSizeLabel: 'Tamaño de fuente: Actual',
            opacity: 'Opacidad',
            opacityLabel: 'Opacidad: Actual',
            fullscreenMode: 'Modo de pantalla completa',
            fullscreenDisabled: 'Desactivado',
            fullscreenSingle: 'Clic simple',
            fullscreenDouble: 'Doble clic',
            fullscreenFontSize: 'Tamaño de fuente de pantalla completa',
            fullscreenFontSizeLabel: 'Tamaño de fuente de pantalla completa: Actual',
            fullscreenFontSizeHint: 'Ajustar el tamaño de fuente de la visualización de hora en pantalla completa, rango 10%-85%',
            customColor: 'Color personalizado'
        },
        about: {
            title: 'Acerca de Aboard',
            version: 'Versión',
            description: 'Aboard es una aplicación de pizarra minimalista pero potente, diseñada para trabajo creativo y toma de notas eficiente.',
            features: 'Características principales',
            feature1: 'Experiencia de dibujo suave',
            feature2: 'Tipos de bolígrafo variados',
            feature3: 'Herramienta de borrador flexible',
            feature4: 'Patrones de fondo ricos (puntos, cuadrícula, Tianzige, línea inglesa 4, etc.)',
            feature5: 'Exportar a imágenes PNG',
            feature6: 'Funcionalidad Deshacer/Rehacer',
            feature7: 'Soporte táctil completo',
            feature8: 'Modo de pantalla completa',
            feature9: 'Guardado automático',
            feature10: 'Soporte multiidioma',
            license: 'Licencia de código abierto',
            github: 'Repositorio de GitHub'
        }
    },

    // Feature Area
    features: {
        title: 'Características',
        moreFeatures: 'Más características',
        time: 'Hora',
        timer: 'Temporizador',
        randomPicker: 'Selector',
        scoreboard: 'Marcador',
        insertImage: 'Insertar imagen'
    },

    // Teaching Tools
    teachingTools: {
        title: 'Herramientas didácticas',
        ruler: 'Regla',
        rulerStyle1: 'Regla 1',
        rulerStyle2: 'Regla 2',
        setSquare: 'Escuadra',
        setSquare60: 'Escuadra 60°',
        setSquare45: 'Escuadra 45°',
        hint: 'Sugerencia: Clic simple para mover, doble clic para cambiar tamaño, rotar o eliminar',
        insertHint: 'Seleccione la cantidad de herramientas a insertar',
        currentOnCanvas: 'Cantidad actual en el lienzo',
        addNew: 'Agregar nuevo',
        rotate: 'Rotar',
        resize: 'Cambiar tamaño',
        delete: 'Eliminar',
        drawAlongEdge: 'Dibujar a lo largo del borde'
    },

    // Time Display
    timeDisplay: {
        options: 'Opciones de visualización de hora',
        showDate: 'Mostrar fecha',
        showTime: 'Mostrar hora',
        settings: 'Configuración',
        displayOptions: 'Opciones de visualización',
        dateAndTime: 'Fecha y hora',
        dateOnly: 'Solo fecha',
        timeOnly: 'Solo hora'
    },

    // Timer
    timer: {
        title: 'Configuración del temporizador',
        mode: 'Modo',
        countdown: 'Cuenta regresiva',
        stopwatch: 'Cronómetro',
        duration: 'Duración (minutos)',
        hours: 'Horas',
        minutes: 'Minutos',
        seconds: 'Segundos',
        title: 'Título',
        titlePlaceholder: 'Introducir título del temporizador',
        fontSettings: 'Configuración de fuente',
        fontSize: 'Tamaño de fuente',
        adjustColor: 'Ajustar color',
        colorSettings: 'Configuración de color',
        textColor: 'Color de texto',
        bgColor: 'Color de fondo',
        colors: {
            black: 'Negro',
            white: 'Blanco',
            blue: 'Azul',
            red: 'Rojo',
            green: 'Verde',
            yellow: 'Amarillo',
            orange: 'Naranja',
            purple: 'Morado',
            transparent: 'Transparente'
        },
        customColor: 'Color personalizado',
        start: 'Iniciar',
        adjust: 'Ajustar',
        continue: 'Continuar',
        pause: 'Pausar',
        reset: 'Restablecer',
        stop: 'Detener',
        alertSetTime: 'Por favor, establezca el tiempo de cuenta regresiva',
        alertTitle: 'Alerta'
    },

    // Timezone names
    timezones: {
        'china': 'China (UTC+8)',
        'newyork': 'Nueva York (UTC-5/-4)',
        'losangeles': 'Los Ángeles (UTC-8/-7)',
        'chicago': 'Chicago (UTC-6/-5)',
        'london': 'Londres (UTC+0/+1)',
        'paris': 'París (UTC+1/+2)',
        'berlin': 'Berlín (UTC+1/+2)',
        'tokyo': 'Tokio (UTC+9)',
        'seoul': 'Seúl (UTC+9)',
        'hongkong': 'Hong Kong (UTC+8)',
        'singapore': 'Singapur (UTC+8)',
        'dubai': 'Dubái (UTC+4)',
        'sydney': 'Sídney (UTC+10/+11)',
        'auckland': 'Auckland (UTC+12/+13)',
        'utc': 'UTC (Tiempo Universal Coordinado)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Bienvenido a Aboard',
        content: `¡Bienvenido a la aplicación de pizarra Aboard!

Consejos de uso:
• Haga clic en la barra de herramientas en la parte inferior para seleccionar diferentes herramientas de dibujo
• Use Ctrl+Z para deshacer, Ctrl+Y para rehacer
• Haga clic en los botones de zoom en la parte superior derecha o use la rueda del ratón para hacer zoom en el lienzo
• Haga clic en el botón de fondo para elegir diferentes patrones de fondo
• Cambie entre el modo de lienzo infinito o paginación en la configuración
• Admite entrada táctil y de ratón

¡Disfruta de tu trabajo creativo!`,
        confirm: 'OK',
        noShowAgain: 'No mostrar de nuevo'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: 'Confirmar borrado',
        message: '¿Está seguro de que desea borrar el lienzo actual? Esta acción no se puede deshacer. Otros lienzos no se verán afectados.',
        confirm: 'Confirmar',
        cancel: 'Cancelar'
    },

    // Color names
    colors: {
        black: 'Negro',
        red: 'Rojo',
        blue: 'Azul',
        green: 'Verde',
        yellow: 'Amarillo',
        orange: 'Naranja',
        purple: 'Morado',
        white: 'Blanco',
        transparent: 'Transparente'
    },

    // Days of week
    days: {
        sunday: 'Domingo',
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado'
    }
};
