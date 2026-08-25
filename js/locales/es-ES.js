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
        help: 'Ayuda',
        export: 'Exportar',
        apply: 'Aplicar',
        reset: 'Restablecer',
        restoreSize: 'Restablecer tamaño',
        keepCentered: 'Mantener centrado'
    },

    // Gestures
    gestures: {
        pinchZoom: 'Pellizcar para hacer zoom'
    },

    errors: {
        lazyLoadFailed: 'No se pudo cargar {feature}. Recarga la página e inténtalo de nuevo.',
        fileRequired: 'Elige un archivo.',
        invalidFile: 'El archivo seleccionado no es válido.'
    },

    prompts: {
        localeDownloadPrompt: '¿Descargar ahora el paquete de idioma de {locale}?',
        preferredLocaleSuggestionPrompt: 'Hemos detectado que tu idioma preferido del navegador es {locale}. ¿Quieres descargarlo y cambiar ahora?'
    },

    browserCheck: {
        title: 'Compatibilidad del navegador',
        message: 'A este navegador le faltan las siguientes funciones obligatorias:',
        updateHint: 'Para disfrutar de la mejor experiencia, actualiza a la última versión de Chrome, Edge, Firefox o Safari.',
        continueAnyway: 'Continuar de todos modos',
        features: {
            canvas: 'API Canvas',
            es6: 'JavaScript moderno (ES6)',
            modernSyntax: 'Sintaxis de JavaScript moderna'
        }
    },
    // Recovery dialog
    recovery: {
        title: 'Restaurar contenido anterior',
        message: 'Se detectó contenido de lienzo anterior. ¿Desea restaurarlo?',
        restore: 'Restaurar',
        discard: 'Descartar',
        restoreFailed: 'No se pudo restaurar el contenido anterior. Inténtalo de nuevo.'
    },

    // App Title
    app: {
        title: 'Aboard - Pizarra Minimalista',
        name: 'Aboard',
        rotateScreenTitle: 'Gira la pantalla',
        rotateScreenTip: 'Se detectó el modo vertical. Para un diseño correcto y la barra de herramientas completa, usa el modo horizontal.'
    },

    // Toolbar
    toolbar: {
        undo: 'Deshacer',
        redo: 'Rehacer',
        pen: 'Bolígrafo',
        shape: 'Forma',
        move: 'Mover',
        select: 'Seleccionar',
        eraser: 'Borrador',
        clear: 'Borrar',
        background: 'Fondo',
        teachingTools: 'Herramientas',
        more: 'Más',
        settings: 'Configuración',
        importProject: 'Importar proyecto',
        export: 'Exportar lienzo',
        zoomOut: 'Alejar (-)',
        zoomIn: 'Acercar (+)',
        fullscreen: 'Pantalla completa (F11)',
        exitFullscreen: 'Salir de pantalla completa (F11)',
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
            marker: 'Marcador',
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

            triangle: 'Triángulo',

            diamond: 'Rombo',
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
            warning: 'Aboard intentará guardar la pizarra actual antes de salir para que puedas restaurarla la próxima vez que la abras.'
        },
        lineStyle: {
            title: 'Estilo de línea',
            solid: 'Sólido',
            dashed: 'Discontinuo',
            dotted: 'Punteado',
            dashdot: 'Guion y punto',
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
        },
        text: {
            insertTitle: 'Insertar texto',
            editTitle: 'Editar texto',
            placeholder: 'Ingrese el texto aquí',
            size: 'Tamaño',
            color: 'Color',
            colorPicker: 'Selector de color',
            font: 'Fuente',
            style: 'Estilo',
            bold: 'Negrita',
            italic: 'Cursiva',
            underline: 'Subrayado',
            strikethrough: 'Tachado',
            decorationStyle: 'Estilo de línea',
            decorationWidth: 'Grosor de línea',
            decorationColor: 'Color de línea',
            uploadFont: 'Cargar fuente',
            customFonts: 'Fuentes personalizadas',
            fontUploadSuccess: '¡Fuente cargada exitosamente!',
            fontExists: 'Esta fuente ya existe.',
            invalidFontFormat: 'Formato de fuente no válido. Use archivos TTF, OTF, WOFF o WOFF2.',
            fontTooLarge: 'El archivo de fuente es demasiado grande. El tamaño máximo es 2MB.',
            storageQuotaExceeded: 'Cuota de almacenamiento excedida. Elimine algunas fuentes personalizadas.'
        },
        select: {
            mode: 'Modo de selección',
            clickMode: 'Clic',
            rectMode: 'Selección por área',
            lassoMode: 'Lazo',
            transform: 'Transformar',
            rotate90: 'Rotar 90°',
            flipH: 'Voltear horizontal',
            flipV: 'Voltear vertical'
        }
    },



    // Line Style Modal
    lineStyleModal: {
        title: 'Configuración de estilo de línea',
        openSettings: 'Más configuración',
        preview: 'Vista previa'
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
        polar: 'Coordenadas polares',
        coordinateOriginHint: 'Doble clic para seleccionar el origen en modo Mover, luego arrastre para moverlo',
        image: 'Imagen',
        imagePrefix: 'Imagen',
        density: 'Densidad',
        densityLabel: 'Densidad: Actual',
        size: 'Tamaño',
        sizeLabel: 'Tamaño: Actual',
        opacity: 'Opacidad del fondo',
        opacityHint: 'Ajustar la transparencia del fondo, 100% es completamente opaco',
        contrast: 'Contraste',
        contrastHint: 'Ajustar la oscuridad de las líneas del patrón de fondo',
        preference: 'Preferencia de patrón de fondo',
        storageFull: 'No queda espacio de almacenamiento para guardar más imágenes. Elimina algunas imágenes antiguas.',
        saveError: 'No se pudo guardar la imagen. Puede que no haya suficiente espacio de almacenamiento.',
        moveCoordinateOrigin: 'Mover origen',
        moveCoordinateOriginHint: 'Haga clic y arrastre en el lienzo para mover el origen de coordenadas',
        coordinateTools: 'Configuración de coordenadas',
        showTicks: 'Mostrar escala',
        showLabels: 'Mostrar etiquetas',
        showPointLabels: 'Etiquetas de puntos',
        showOrigin: 'Mostrar origen',
        connectPoints: 'Unir puntos',
        snapToGrid: 'Ajustar a la cuadrícula',
        addPoint: 'Agregar punto',
        drawPointLine: 'Dibujar puntos y línea',
        pointLineModeLineOnly: 'Solo línea',
        pointLineModeAuto: 'Conexión automática',
        pointLineModeSelected: 'Conectar selección',
        addPointHint: 'Actívelo y haga clic en el lienzo para colocar puntos y conectarlos automáticamente',
        addPointHintLineOnly: 'Al activarlo, haga clic en el lienzo para colocar puntos y dibujar solo la polilínea',
        addPointHintAuto: 'Al activarlo, haga clic en el lienzo para colocar puntos y conectarlos automáticamente',
        addPointHintSelected: 'Al activarlo, haga clic en el lienzo para añadir puntos. Al cambiar a Selección, solo se conectarán los puntos seleccionados',
        addPointHintSelectedInteractive: 'Al activarlo, haga clic en un espacio vacío para añadir puntos y luego en dos puntos seguidos para conectarlos',
        clearPoints: 'Borrar puntos',
        clearPlots: 'Borrar gráficas',
        pointsCount: 'Puntos',
        plotExpression: 'Expresión',
        plotColor: 'Color',
        plotLineStyle: 'Estilo de línea',
        plotStrokeWidth: 'Grosor',
        plotRangeTitle: 'Rango de visualización',
        plotRangeAxis: 'Eje',
        plotRangeMin: 'Mínimo',
        plotRangeMax: 'Máximo',
        plot: 'Graficar',
        inputPanel: 'Panel de entrada',
        keypadNumbers: 'Números',
        keypadOperators: 'Símbolos',
        keypadVariables: 'Variables',
        keypadFunctions: 'Funciones',
        plotHintCartesian: 'Cartesiano: introduzca y = f(x), puede usar sin cos PI',
        plotHintPolar: 'Polar: introduzca r = f(theta), theta en radianes y deg en grados',
        plotPlaceholderCartesian: 'ej.: sin(x) + 2',
        plotPlaceholderPolar: 'ej.: 2 * sin(4 * theta)',
        plotRangeMinPlaceholder: 'Valor mínimo',
        plotRangeMaxPlaceholder: 'Valor máximo',
        plotAddRange: 'Agregar rango',
        plotCollapse: 'Contraer',
        plotSave: 'Guardar',
        plotRemoveRange: 'Eliminar rango',
        plotNoRange: 'No hay límite de rango de visualización. Se muestra todo por defecto.',
        noPlots: 'Aún no hay gráficas',
        coordinateStatusAddPoint: 'Modo de dibujar puntos y líneas activado',
        coordinateStatusAddPointLineOnly: 'Modo solo línea activado. Haga clic en el lienzo para colocar puntos de coordenadas',
        coordinateStatusAddPointAuto: 'Modo conexión automática activado. Haga clic en el lienzo para colocar puntos de coordenadas',
        coordinateStatusAddPointSelected: 'Modo conectar selección activado. Haga clic en el lienzo para colocar puntos de coordenadas',
        coordinateStatusAddPointSelectedInteractive: 'Modo conectar selección activado. Haga clic en un espacio vacío para añadir puntos y luego en dos puntos para conectarlos',
        coordinateStatusSelectLineStartPoint: 'Se ha seleccionado el primer punto. Haga clic en otro punto para conectarlos.',
        coordinateStatusAddPointOff: 'Modo de dibujar puntos y líneas desactivado',
        coordinateLineExists: 'Ya existe una línea entre estos dos puntos.',
        coordinateLineCreated: 'Línea conectada.',
        connectPointsEnabled: 'Línea de puntos activada',
        connectPointsDisabled: 'Línea de puntos desactivada',
        pointAdded: 'Punto de coordenadas agregado',
        pointAlreadyExists: 'Ya existe un punto de coordenadas en esta posición',
        pointsCleared: 'Puntos de coordenadas borrados',
        plotAdded: 'Gráfica agregada',
        plotUpdated: 'Gráfica actualizada',
        plotError: 'Expresión no válida, no se puede graficar',
        plotsCleared: 'Gráficas borradas'
    },

    // Image Controls
    imageControls: {
        confirm: 'Confirmar',
        cancel: 'Cancelar',
        flipHorizontal: 'Voltear horizontal',
        flipVertical: 'Voltear vertical',
        rotate: 'Rotar'
    },

    // Selection Controls
    selection: {
        copy: 'Copiar',
        delete: 'Eliminar',
        done: 'Listo',
        edit: 'Editar',
        color: 'Color',
        rotate90: 'Rotar 90°',
        flipH: 'Voltear horizontal',
        layer: 'Capa',
        layerFront: 'Traer al frente',
        layerBack: 'Enviar al fondo',
        layerUp: 'Subir una capa',
        layerDown: 'Bajar una capa',
        group: 'Agrupar',
        ungroup: 'Desagrupar',
        position: 'Posición'
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
        exportSuccess: 'Configuración exportada correctamente',
        importSuccess: 'Configuración importada correctamente',
        importError: 'Archivo de configuración inválido',
        importNoChange: 'No se detectaron cambios en la configuración',
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
            languageHint: 'Detecta automáticamente el idioma del sistema por defecto y permite cambiarlo manualmente en cualquier momento',
            globalFont: 'Fuente global',
            globalFontHint: 'Elegir la fuente utilizada en la aplicación',
            fontManagementHint: 'Gestión de fuentes: permite ordenar, mostrar u ocultar, renombrar y previsualizar',
            showFont: 'Mostrar fuente',
            fontPreviewSample: 'Vista previa de fuente ABC abc 123',
            fontPreviewText: 'Texto de vista previa',
            fontPreviewSize: 'Tamaño de vista previa',
            fontPreviewResetText: 'Restaurar texto',
            renameFont: 'Renombrar',
            expandPreview: 'Ampliar',
            confirmDeleteFont: '¿Seguro que quieres eliminar la fuente personalizada "{font}"?',
            resetFontManagement: 'Restaurar valores predeterminados',
            resetFontManagementConfirm: 'Restablecer la gestión de fuentes eliminará las fuentes subidas y restaurará el orden, los nombres y la vista previa predeterminados. ¿Continuar?',
            downloadedLanguagePacks: 'Paquetes de idioma descargados',
            dismissedLanguageSuggestion: 'Estado de descarte de la sugerencia de idioma',
            updatePreference: 'Modo de actualización',
            updatePreferenceHint: 'Elige cómo aplicar la actualización cuando esté lista',
            updatePreferencePrompt: 'Actualizar en inactividad',
            updatePreferenceAuto: 'Actualizar ahora',
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
            morePanelBehaviorLabel: 'Comportamiento del panel Más',
            keepMorePanelOpenHint: 'Mantener abierto el panel Más después de pulsar funciones',
            // Toolbar customization
            toolbarCustomization: 'Personalización de la barra de herramientas',
            toolbarCustomizationHint: 'Seleccione herramientas para mostrar, arrastre para reordenar',
            toolbarTools: {
                undo: 'Deshacer',
                redo: 'Rehacer',
                pen: 'Lápiz',
                move: 'Mover',
                select: 'Seleccionar',
                eraser: 'Borrador',
                clear: 'Borrar',
                background: 'Fondo',
                more: 'Más',
                settings: 'Configuración'
            },
            // Control button settings
            controlButtonSettings: 'Configuración de botones de control',
            controlButtonSettingsHint: 'Seleccione los botones de control a mostrar',
            controlButtons: {
                zoom: 'Botones de zoom',
                pagination: 'Botones de paginación',
                time: 'Visualización de hora',
                fullscreen: 'Botón de pantalla completa',
                import: 'Botón de importación',
                export: 'Botón de exportación'
            },
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
                '[color=#007AFF]Enlaces:[/color]',
                '• Proyecto en GitHub: https://github.com/lifeafter619/Aboard',
                '• Blog del autor: https://66619.eu.org',
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
            cacheCleanupLabel: 'Limpieza de caché',
            cacheCleanupHint: 'Ver uso de caché y limpiar por categoría (con confirmación antes de borrar)',
            configManagementLabel: 'Configuración',
            configManagementHint: 'Exporta o importa la configuración actual de la aplicación',
            exportConfig: 'Exportar configuración',
            importConfig: 'Importar configuración',
            compatibilityLabel: 'Importación de compatibilidad',
            compatibilityHint: 'Activa la compatibilidad con importaciones .aboard / .json antiguas solo cuando sea necesario',
            legacyProjectImportEnabled: 'Activar compatibilidad con importación de proyectos antiguos',
            legacyProjectImportEnabledHint: 'Cuando está activado, la importación de proyectos también acepta archivos .aboard / .json y carga el módulo de compatibilidad cuando hace falta.',
            clearSettingsCache: 'Limpiar caché de configuración',
            clearCanvasCache: 'Limpiar caché del lienzo',
            clearOtherCache: 'Limpiar otra caché',
            cacheSizeCalculating: 'Calculando...',
            clearSelectedCache: 'Limpiar caché seleccionada',
            morePanelBehaviorLabel: 'Comportamiento del panel Más',
            keepMorePanelOpenHint: 'Mantener abierto el panel Más después de pulsar funciones',
            selectCacheType: 'Seleccione al menos un tipo de caché.',
            confirmClearTitle: 'Confirmar limpieza',
            confirmClearSelectedCache: 'Seleccione los elementos de caché que desea limpiar:',
            clearLocalDataConfirmSuffix: '¿Continuar?',
            description: 'Para la configuración de visualización de hora, haga clic en el área de hora en la esquina inferior derecha',
            showTimeDisplay: 'Mostrar hora y fecha',
            showTimeDisplayHint: 'Mostrar la hora y fecha actuales en la esquina superior derecha',
            localDataLabel: 'Datos locales',
            localDataHint: 'Borrar caché local, contenido del lienzo y configuración, y restaurar el estado de la primera carga',
            clearLocalDataButton: 'Borrar caché local',
            clearLocalDataConfirm: 'Esto borrará la caché local, el contenido del lienzo y la configuración, y restaurará el estado de la primera carga. ¿Continuar?'
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
    },

    // Feature Area
    features: {
        title: 'Características',
        moreFeatures: 'Más características',
        time: 'Hora',
        timer: 'Temporizador',
        randomPicker: 'Selector',
        scoreboard: 'Marcador',
        insertImage: 'Insertar imagen',
        insertText: 'Insertar texto',
        classroomMode: 'Enfoque docente'
    },

    canvas: {
        drawingSurface: 'Área de dibujo de la pizarra'
    },

    classroom: {
        modeActive: 'Enfoque docente',
        prevPage: 'Página anterior',
        nextPage: 'Página siguiente',
        startTimer: 'Iniciar cronómetro',
        pauseTimer: 'Pausar cronómetro',
        resetTimer: 'Reiniciar cronómetro',
        stopwatch: 'Cronómetro',
        actions: 'Herramientas de clase',
        addPage: 'Nueva página',
        countdown: 'Cuenta atrás',
        randomPicker: 'Selección aleatoria',
        scoreboard: 'Marcador',
        teachingTools: 'Herramientas didácticas',
        laserPointer: 'Puntero láser',
        exit: 'Salir del enfoque docente'
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
        drawAlongEdge: 'Dibujar a lo largo del borde',
        increaseCount: 'Aumentar la cantidad de {tool}',
        decreaseCount: 'Disminuir la cantidad de {tool}',
    },

    // Time Display
    timeDisplay: {
        title: 'Visualización de Hora',
        settingsTitle: 'Configuración de Visualización de Hora',
        options: 'Opciones de visualización de hora',
        showDate: 'Mostrar fecha',
        showTime: 'Mostrar hora',
        settings: 'Configuración',
        fullscreenDisplay: 'Pantalla completa',
        displayOptions: 'Opciones de visualización',
        dateAndTime: 'Fecha y hora',
        dateOnly: 'Solo fecha',
        timeOnly: 'Solo hora',
        timezone: 'Zona horaria',
        timeFormat: 'Formato de hora',
        dateFormat: 'Formato de fecha',
        colorSettings: 'Configuración de color',
        textColor: 'Color de texto',
        bgColor: 'Color de fondo',
        fontSize: 'Tamaño de fuente',
        fontSizeLabel: 'Tamaño de fuente: Actual',
        opacity: 'Opacidad',
        opacityLabel: 'Opacidad: Actual',
        fullscreenMode: 'Modo pantalla completa',
        fullscreenColorSettings: 'Configuración de color en pantalla completa',
        fullscreenFontSize: 'Tamaño de fuente en pantalla completa',
        fullscreenFontSizeLabel: 'Tamaño de fuente en pantalla completa: Actual',
        fullscreenFontSizeHint: 'Ajustar tamaño de fuente en pantalla completa (10%-85%)',
        fullscreenSliderLabel: 'Tamaño de fuente (10%-85%)',
        customColor: 'Color personalizado',
        transparent: 'Transparente',
        fullscreenDisabled: 'Desactivado',
        fullscreenSingle: 'Un clic',
        fullscreenDouble: 'Doble clic',
        widgetTab: 'Configuración del widget',
        fullscreenTab: 'Configuración de pantalla completa'
    },

    // Timer
    timer: {
        settingsTitle: 'Configuración del temporizador',
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
        titleFontSize: 'Tamaño título',
        timeFontSize: 'Tamaño hora',
        fontSizeLabel: 'Tamaño: Actual',
        minimal: 'Mínimo',
        minimalMode: 'Modo mínimo',
        adjustColor: 'Ajustar color',
        colorSettings: 'Configuración de color',
        textColor: 'Color de texto',
        bgColor: 'Color de fondo',
        soundSettings: 'Configuración de sonido',
        playSound: 'Reproducir sonido al finalizar la cuenta regresiva',
        preview: 'Vista previa',
        moreSettings: 'Más ajustes',
        playbackSpeed: 'Velocidad de reproducción',
        loopPlayback: 'Reproducción en bucle',
        loopCount: 'Número de bucles',
        loopInterval: 'Intervalo de bucle',
        secondsUnit: 'seg',
        uploadCustomAudio: 'Subir audio personalizado',
        soundPresets: {
            classBell: 'Campana de clase (10s)',
            examEnd: 'Fin de examen (4s)',
            gentle: 'Suave (17s)',
            digitalBeep: 'Pitido digital (4s)'
        },
        colors: {
            black: 'Negro',
            white: 'Blanco',
            blue: 'Azul',
            red: 'Rojo',
            green: 'Verde',
            yellow: 'Amarillo',
            orange: 'Naranja',
            purple: 'Morado',
            transparent: 'Transparente',
            darkGray: 'Gris oscuro (Predeterminado)',
            lightGray: 'Gris claro',
            lightRed: 'Rojo claro',
            lightBlue: 'Azul claro',
            lightGreen: 'Verde claro',
            lightYellow: 'Amarillo claro',
            lightOrange: 'Naranja claro',
            whiteDefault: 'Blanco (Predeterminado)'
        },
        customColor: 'Color personalizado',
        start: 'Iniciar',
        adjust: 'Ajustar',
        continue: 'Continuar',
        pause: 'Pausar',
        reset: 'Restablecer',
        stop: 'Detener',
        audioFallback: 'Temporizador terminado (sonido no disponible)',
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
        pink: 'Rosa',
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
    },

    export: {
        imageTab: 'Exportar imagen',
        projectTab: 'Exportar proyecto (.zip)',
        scopeLabel: 'Alcance de la exportación',
        scopeCurrent: 'Página actual',
        scopeAll: 'Todas las páginas',
        scopeSpecific: 'Páginas específicas',
        pageSelectionLabel: 'Seleccionar páginas para exportar',
        imageFormatLabel: 'Formato de imagen',
        imageQualityLabel: 'Calidad de imagen',
        projectHint: 'Exporta como un paquete de proyecto .zip estándar que incluye páginas, fondos y recursos. Después de importarlo, podrás seguir editando objetos por página; la importación heredada de .aboard sigue siendo opcional desde Ajustes.',
        fileNameLabel: 'Nombre del archivo',
        fileNamePrefixLabel: 'Prefijo del nombre de archivo',
        fileNamePlaceholder: 'Introducir nombre del archivo',
        fileNameHint: 'Al exportar varias páginas, los números de página se añadirán automáticamente al nombre del archivo.',
        failed: 'La exportación ha fallado. Inténtalo de nuevo.'
    },

    projectPackage: {
        importSuccess: 'Proyecto importado correctamente.',
        legacyImportSuccess: 'Proyecto heredado importado correctamente.',
        importFailed: 'La importación del proyecto ha fallado: {message}',
        exportFailed: 'La exportación del proyecto ha fallado: {message}',
        overwriteConfirm: 'Importar un proyecto reemplazará el contenido actual de la pizarra. ¿Continuar?',
        overwriteDetail: 'Las páginas y recursos actuales de la pizarra se reemplazarán por el contenido del paquete del proyecto.',
        legacyCompatibilityDisabled: 'La compatibilidad de importación heredada .aboard está desactivada. Actívala primero en la configuración.',
        zipLoaderUnavailable: 'El cargador de la biblioteca ZIP no está disponible.',
        zipLoadFailed: 'No se pudo cargar la biblioteca ZIP.',
        imageDimensionsTooLarge: 'El proyecto contiene una imagen cuyas dimensiones o cantidad de píxeles son demasiado grandes.',
        legacyLoaderUnavailable: 'El cargador de compatibilidad heredada no está disponible.',
        legacyModuleLoadFailed: 'No se pudo cargar el módulo de compatibilidad de proyectos heredados.',
        base64DecoderUnavailable: 'El decodificador Base64 no está disponible.',
        base64EncoderUnavailable: 'El codificador Base64 no está disponible.',
        unsupportedPackage: 'Este no es un paquete de proyecto Aboard compatible.',
        missingDocument: 'El paquete del proyecto no incluye document.json.',
        missingPages: 'El paquete del proyecto no contiene datos de páginas.',
        missingAsset: 'El paquete del proyecto no contiene el archivo de recurso: {path}',
        missingPageFile: 'El paquete del proyecto no contiene el archivo de página: {path}',
        invalidLegacyFormat: 'Formato de archivo de proyecto heredado no válido.',
        legacyMissingPages: 'El archivo de proyecto heredado no contiene datos de páginas.',
        fileTooLarge: 'El archivo de proyecto es demasiado grande. Importa un archivo de menos de 100 MB.',
        unsafePath: 'Ruta no segura en el paquete de proyecto: {path}',
        tooManyPages: 'El paquete de proyecto contiene demasiadas páginas.',
        tooComplex: 'La complejidad del proyecto supera el límite de importación seguro.',
        assetTooLarge: 'El paquete de proyecto contiene un recurso demasiado grande: {path}',
        entryTooLarge: 'El paquete de proyecto contiene un archivo demasiado grande: {path}',
        packageTooLarge: 'El paquete de proyecto es demasiado grande al descomprimirse y no se puede importar.',
        corruptPackage: 'Este paquete de proyecto está dañado y no se puede importar.',
        assetsTooLarge: 'El paquete de proyecto contiene demasiados recursos incrustados.'
    },

    randomPicker: {
        importColumnPlaceholder: 'Columna',
        importLibraryLoadFailed: 'No se pudo cargar la biblioteca de importación de Excel. Recarga la página e inténtalo de nuevo.'
    },

    gif: {
        settingsTitle: 'Configuración GIF',
        loopCountLabel: 'Número de reproducciones (0 = bucle infinito)',
        loopCountPrompt: 'Define el número de repeticiones (0 para infinito):',
        loopCountInvalid: 'Introduce un número entero mayor o igual que 0.',
        saveQuotaExceeded: 'Se superó la cuota de almacenamiento. El GIF no se puede guardar y desaparecerá al recargar.'
    }
};
