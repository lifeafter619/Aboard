/**
 * French (France) - Français
 * Language file for Aboard application
 */

window.translations = {
    // Common
    common: {
        confirm: 'Confirmer',
        cancel: 'Annuler',
        close: 'Fermer',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        remove: 'Retirer',
        yes: 'Oui',
        no: 'Non',
        ok: 'OK',
        apply: 'Appliquer',
        reset: 'Réinitialiser'
    },

    // App Title
    app: {
        title: 'Aboard - Tableau Blanc Minimaliste',
        name: 'Aboard'
    },

    // Toolbar
    toolbar: {
        undo: 'Annuler',
        redo: 'Rétablir',
        pen: 'Stylo',
        shape: 'Forme',
        move: 'Déplacer',
        eraser: 'Gomme',
        clear: 'Effacer',
        background: 'Arrière-plan',
        teachingTools: 'Outils',
        more: 'Plus',
        settings: 'Paramètres',
        export: 'Exporter le canevas',
        zoomOut: 'Dézoomer (-)',
        zoomIn: 'Zoomer (+)',
        fullscreen: 'Plein écran (F11)',
        zoomPlaceholder: 'Niveau de zoom (Entrer pourcentage)'
    },

    // Tools
    tools: {
        pen: {
            title: 'Stylo',
            type: 'Type de stylo',
            normal: 'Stylo normal',
            pencil: 'Crayon',
            ballpoint: 'Stylo à bille',
            fountain: 'Stylo-plume',
            brush: 'Pinceau',
            color: 'Couleur',
            colorAndSize: 'Couleur et taille',
            colorPicker: 'Sélecteur de couleur',
            size: 'Épaisseur de ligne',
            sizeLabel: 'Épaisseur : Actuelle',
            sizePx: 'px'
        },
        shape: {
            title: 'Forme',
            type: 'Type de forme',
            line: 'Ligne',
            rectangle: 'Rectangle',
            circle: 'Cercle',
            ellipse: 'Ellipse',
            arrow: 'Flèche',
            doubleArrow: 'Double flèche',
            arrowSize: 'Taille de flèche',
            hint: 'Appuyez et glissez pour dessiner, relâchez pour terminer',
            lineProperties: 'Propriétés de ligne'
        },
        eraser: {
            title: 'Gomme',
            type: 'Type de gomme',
            normal: 'Gomme normale',
            pixel: 'Gomme pixel',
            size: 'Taille de la gomme',
            shapeCircle: 'Cercle',
            shapeRectangle: 'Rectangle'
        },
        clear: {
            title: 'Effacer le canevas',
            confirm: 'Confirmer l\'effacement',
            message: 'Êtes-vous sûr de vouloir effacer le canevas ? Cette action ne peut pas être annulée.'
        },
        refresh: {
            warning: 'L\'actualisation effacera tout le contenu du canevas et ne pourra pas être récupéré. Êtes-vous sûr de vouloir actualiser ?'
        },
        lineStyle: {
            title: 'Style de ligne',
            solid: 'Plein',
            dashed: 'Tirets',
            dotted: 'Pointillé',
            wavy: 'Ondulé',
            double: 'Double',
            triple: 'Triple',
            multiLine: 'Multi-lignes',
            arrow: 'Flèche',
            doubleArrow: 'Double flèche',
            noArrow: 'Sans flèche',
            arrowType: 'Type de flèche',
            dashDensity: 'Densité des tirets',
            waveDensity: 'Densité des ondes',
            lineSpacing: 'Espacement des lignes',
            lineCount: 'Nombre de lignes'
        }
    },

    // Line Style Modal
    lineStyleModal: {
        title: 'Paramètres de style de ligne',
        openSettings: 'Plus de paramètres',
        preview: 'Aperçu'
    },

    // Time Display
    timeDisplay: {
        options: 'Options d\'affichage de l\'heure',
        showDate: 'Afficher la date',
        showTime: 'Afficher l\'heure',
        settings: 'Paramètres',
        fullscreenDisplay: 'Plein écran'
    },

    // Background
    background: {
        title: 'Arrière-plan',
        color: 'Couleur d\'arrière-plan',
        pattern: 'Motif d\'arrière-plan',
        blank: 'Vide',
        none: 'Aucun',
        dots: 'Points',
        grid: 'Grille',
        lines: 'Lignes',
        tianzige: 'Tianzige (Chinois)',
        english4line: 'Ligne anglaise 4',
        musicStaff: 'Portée musicale',
        coordinate: 'Coordonnées',
        coordinateOriginHint: 'Double-cliquez pour sélectionner l\'origine en mode Déplacer, puis faites glisser',
        image: 'Image',
        opacity: 'Opacité de l\'arrière-plan',
        opacityHint: 'Ajuster la transparence de l\'arrière-plan, 100% est complètement opaque',
        contrast: 'Contraste',
        contrastHint: 'Ajuster l\'obscurité des lignes du motif d\'arrière-plan',
        preference: 'Préférence de motif d\'arrière-plan',
        moveCoordinateOrigin: 'Déplacer l\'origine',
        moveCoordinateOriginHint: 'Cliquez puis faites glisser sur le canevas pour déplacer l\'origine des coordonnées'
    },

    // Image Controls
    imageControls: {
        confirm: 'Confirmer',
        cancel: 'Annuler',
        flipHorizontal: 'Retourner horizontalement',
        flipVertical: 'Retourner verticalement',
        rotate: 'Rotation'
    },

    // Page Navigation
    page: {
        previous: 'Précédent',
        next: 'Suivant',
        jumpPlaceholder: 'Entrer le numéro de page',
        of: ' / ',
        newPage: 'Nouvelle page'
    },

    // Settings
    settings: {
        title: 'Paramètres',
        tabs: {
            general: 'Général',
            display: 'Affichage',
            pen: 'Stylo',
            eraser: 'Gomme',
            canvas: 'Canevas',
            background: 'Arrière-plan',
            about: 'À propos',
            announcement: 'Annonce',
            more: 'Plus'
        },
        display: {
            title: 'Paramètres d\'affichage',
            theme: 'Thème',
            themeHint: 'Choisir le thème de l\'application',
            themeColor: 'Couleur du thème',
            themeColorHint: 'Couleur pour les éléments sélectionnés de la barre d\'outils',
            showZoomControls: 'Afficher les contrôles de zoom',
            showZoomControlsHint: 'Afficher les contrôles de zoom au-dessus du canevas',
            showFullscreenBtn: 'Afficher le bouton plein écran',
            showFullscreenBtnHint: 'Afficher le bouton plein écran à côté des contrôles de zoom',
            toolbarSize: 'Taille de la barre d\'outils',
            toolbarSizeLabel: 'Taille de la barre d\'outils: Actuelle',
            toolbarSizeHint: 'Ajuster la taille de la barre d\'outils inférieure',
            configScale: 'Taille du panneau de configuration',
            configScaleLabel: 'Taille du panneau de configuration: Actuelle',
            configScaleHint: 'Ajuster la taille des panneaux de configuration popup',
            colorOptions: {
                blue: 'Bleu',
                purple: 'Violet',
                green: 'Vert',
                orange: 'Orange',
                red: 'Rouge',
                pink: 'Rose',
                cyan: 'Cyan',
                yellow: 'Jaune'
            },
            colorPicker: 'Sélecteur de couleur'
        },
        general: {
            title: 'Paramètres généraux',
            language: 'Langue',
            languageHint: 'Choisir la langue de l\'interface',
            globalFont: 'Police globale',
            globalFontHint: 'Choisir la police utilisée dans l\'application',
            fonts: {
                system: 'Système par défaut',
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
            edgeSnap: 'Activer l\'alignement des bords',
            edgeSnapHint: 'Aligner automatiquement les panneaux de contrôle sur les bords de l\'écran',
            controlPosition: 'Position du bouton de contrôle',
            controlPositionHint: 'Choisir où afficher les contrôles de zoom et de pagination',
            positionTopLeft: 'En haut à gauche',
            positionTopRight: 'En haut à droite',
            positionBottomLeft: 'En bas à gauche',
            positionBottomRight: 'En bas à droite',
            canvasMode: 'Mode canevas',
            canvasModeHint: 'Choisir entre le mode pagination ou canevas infini',
            pagination: 'Pagination',
            infiniteCanvas: 'Canevas infini',
            autoSave: 'Sauvegarde automatique',
            autoSaveHint: 'Sauvegarder automatiquement vos dessins périodiquement'
        },
        canvas: {
            title: 'Paramètres du canevas',
            mode: 'Mode canevas',
            modeHint: 'Choisir le mode d\'affichage du canevas',
            size: 'Taille du canevas',
            sizeHint: 'Choisir des tailles prédéfinies ou personnaliser le canevas',
            infiniteCanvas: 'Canevas infini',
            pagination: 'Mode pagination',
            presets: {
                a4Portrait: 'A4 Portrait',
                a4Landscape: 'A4 Paysage',
                a3Portrait: 'A3 Portrait',
                a3Landscape: 'A3 Paysage',
                b5Portrait: 'B5 Portrait',
                b5Landscape: 'B5 Paysage',
                widescreen: '16:9 Grand écran',
                standard: '4:3 Standard',
                custom: 'Personnalisé'
            },
            customSize: {
                portrait: 'Portrait',
                landscape: 'Paysage',
                width: 'Largeur',
                height: 'Hauteur',
                ratio: 'Rapport d\'aspect',
                ratios: {
                    custom: 'Personnalisé',
                    '16:9': '16:9',
                    '4:3': '4:3',
                    '1:1': '1:1',
                    '3:4': '3:4 (Portrait)',
                    '9:16': '9:16 (Portrait)'
                }
            }
        },
        background: {
            title: 'Paramètres d\'arrière-plan',
            opacity: 'Opacité de l\'arrière-plan',
            opacityLabel: 'Opacité de l\'arrière-plan: Actuelle',
            opacityHint: 'Ajuster la transparence de l\'arrière-plan, 100% est complètement opaque',
            patternIntensity: 'Intensité du motif',
            patternIntensityLabel: 'Transparence du motif: Actuelle',
            patternIntensityHint: 'Ajuster l\'obscurité des lignes du motif d\'arrière-plan',
            preference: 'Préférence de motif d\'arrière-plan',
            preferenceHint: 'Choisir quels motifs afficher dans le panneau de configuration'
        },
        announcement: {
            title: 'Annonce',
            welcome: 'Bienvenue sur Aboard!',
            content: [
                'Bienvenue dans l\'application de tableau blanc Aboard!',
                '',
                'Conseils d\'utilisation:',
                '• Cliquez sur la barre d\'outils en bas pour sélectionner différents outils de dessin',
                '• Utilisez Ctrl+Z pour annuler, Ctrl+Y pour rétablir',
                '• Cliquez sur les boutons de zoom dans le coin supérieur droit ou utilisez la molette de la souris pour zoomer',
                '• Cliquez sur le bouton d\'arrière-plan pour choisir différents motifs d\'arrière-plan',
                '• Basculez entre le canevas infini ou le mode pagination dans les paramètres',
                '• Prend en charge les entrées tactiles et souris',
                '',
                'Profitez de votre travail créatif!'
            ]
        },
        about: {
            title: 'À propos d\'Aboard',
            projectIntro: 'Introduction du projet',
            description1: 'Aboard est une application de tableau blanc web minimaliste conçue pour l\'enseignement et les présentations.',
            description2: 'Elle offre une expérience de dessin fluide et des options d\'arrière-plan riches.',
            mainFeatures: 'Caractéristiques principales',
            features: {
                penTypes: 'Plusieurs types de stylos (Stylo normal, Crayon, Stylo à bille, Stylo plume, Pinceau)',
                smartEraser: 'Gomme intelligente (prend en charge le cercle et le rectangle)',
                richPatterns: 'Motifs d\'arrière-plan riches (Points, Grille, Tianzige, Anglais 4 lignes, etc.)',
                adjustable: 'Densité et transparence du motif ajustables',
                canvasModes: 'Canevas infini et mode pagination (prend en charge A4, A3, B5 et autres tailles prédéfinies)',
                customSize: 'Taille et rapport d\'aspect du canevas personnalisés',
                draggable: 'Barre d\'outils et panneaux de propriétés déplaçables',
                undoRedo: 'Fonction Annuler/Rétablir (prend en charge jusqu\'à 50 étapes)',
                smartZoom: 'Zoom intelligent (Ctrl+Molette de défilement, zoom sur la position de la souris)',
                responsive: 'Interface réactive, s\'adapte à différentes tailles d\'écran'
            },
            techStack: 'Stack technologique',
            tech: 'HTML5 Canvas • Vanilla JavaScript • CSS3',
            license: 'Licence open source',
            licenseType: 'Licence MIT',
            github: 'GitHub',
            version: 'Version'
        },
        more: {
            title: 'Plus de paramètres',
            showTimeDisplay: 'Afficher l\'heure et la date',
            showTimeDisplayHint: 'Afficher l\'heure et la date actuelles dans le coin supérieur droit'
        },
        time: {
            title: 'Paramètres d\'affichage de l\'heure',
            showDate: 'Afficher la date',
            showTime: 'Afficher l\'heure',
            timezone: 'Fuseau horaire',
            timeFormat: 'Format de l\'heure',
            timeFormat12: '12 heures (AM/PM)',
            timeFormat24: '24 heures',
            dateFormat: 'Format de date',
            dateFormatYMD: 'Année-Mois-Jour (2024-01-01)',
            dateFormatMDY: 'Mois-Jour-Année (01-01-2024)',
            dateFormatDMY: 'Jour-Mois-Année (01-01-2024)',
            dateFormatChinese: 'Chinois (2024年1月1日)',
            colorSettings: 'Paramètres de couleur',
            colorHint: 'Définir les couleurs de police et d\'arrière-plan pour l\'affichage de l\'heure',
            textColor: 'Couleur du texte',
            bgColor: 'Couleur d\'arrière-plan',
            fontSize: 'Taille de police',
            fontSizeLabel: 'Taille de police : Actuelle',
            opacity: 'Opacité',
            opacityLabel: 'Opacité : Actuelle',
            fullscreenMode: 'Mode plein écran',
            fullscreenDisabled: 'Désactivé',
            fullscreenSingle: 'Simple clic',
            fullscreenDouble: 'Double clic',
            fullscreenFontSize: 'Taille de police plein écran',
            fullscreenFontSizeLabel: 'Taille de police plein écran : Actuelle',
            fullscreenFontSizeHint: 'Ajuster la taille de police de l\'affichage de l\'heure en plein écran, plage 10%-85%',
            customColor: 'Couleur personnalisée'
        },
        about: {
            title: 'À propos d\'Aboard',
            version: 'Version',
            description: 'Aboard est une application de tableau blanc minimaliste mais puissante, conçue pour le travail créatif et la prise de notes efficace.',
            features: 'Fonctionnalités principales',
            feature1: 'Expérience de dessin fluide',
            feature2: 'Types de stylo riches',
            feature3: 'Outil gomme flexible',
            feature4: 'Motifs d\'arrière-plan riches (points, grille, Tianzige, ligne anglaise 4, etc.)',
            feature5: 'Exporter en images PNG',
            feature6: 'Fonctionnalité Annuler/Rétablir',
            feature7: 'Support tactile complet',
            feature8: 'Mode plein écran',
            feature9: 'Sauvegarde automatique',
            feature10: 'Support multilingue',
            license: 'Licence Open Source',
            github: 'Dépôt GitHub'
        }
    },

    // Feature Area
    features: {
        title: 'Fonctionnalités',
        moreFeatures: 'Plus de fonctionnalités',
        time: 'Heure',
        timer: 'Minuteur',
        randomPicker: 'Sélecteur',
        scoreboard: 'Tableau',
        insertImage: 'Image'
    },

    // Teaching Tools
    teachingTools: {
        title: 'Outils pédagogiques',
        ruler: 'Règle',
        rulerStyle1: 'Règle 1',
        rulerStyle2: 'Règle 2',
        setSquare: 'Équerre',
        setSquare60: 'Équerre 60°',
        setSquare45: 'Équerre 45°',
        hint: 'Astuce : Clic simple pour déplacer, double-clic pour redimensionner, pivoter ou supprimer',
        insertHint: 'Sélectionnez le nombre d\'outils à insérer',
        currentOnCanvas: 'Nombre actuel sur le canevas',
        addNew: 'Ajouter nouveau',
        rotate: 'Pivoter',
        resize: 'Redimensionner',
        delete: 'Supprimer',
        drawAlongEdge: 'Tracer le long du bord'
    },

    // Time Display
    timeDisplay: {
        options: 'Options d\'affichage de l\'heure',
        showDate: 'Afficher la date',
        showTime: 'Afficher l\'heure',
        settings: 'Paramètres',
        displayOptions: 'Options d\'affichage',
        dateAndTime: 'Date et heure',
        dateOnly: 'Date seulement',
        timeOnly: 'Heure seulement'
    },

    // Timer
    timer: {
        title: 'Paramètres du minuteur',
        mode: 'Mode',
        countdown: 'Compte à rebours',
        stopwatch: 'Chronomètre',
        duration: 'Durée (minutes)',
        hours: 'Heures',
        minutes: 'Minutes',
        seconds: 'Secondes',
        title: 'Titre',
        titlePlaceholder: 'Entrer le titre du minuteur',
        fontSettings: 'Paramètres de police',
        fontSize: 'Taille de police',
        adjustColor: 'Ajuster la couleur',
        colorSettings: 'Paramètres de couleur',
        textColor: 'Couleur du texte',
        bgColor: 'Couleur d\'arrière-plan',
        colors: {
            black: 'Noir',
            white: 'Blanc',
            blue: 'Bleu',
            red: 'Rouge',
            green: 'Vert',
            yellow: 'Jaune',
            orange: 'Orange',
            purple: 'Violet',
            transparent: 'Transparent'
        },
        customColor: 'Couleur personnalisée',
        start: 'Démarrer',
        adjust: 'Ajuster',
        continue: 'Continuer',
        pause: 'Pause',
        reset: 'Réinitialiser',
        stop: 'Arrêter',
        alertSetTime: 'Veuillez régler le compte à rebours',
        alertTitle: 'Alerte'
    },

    // Timezone names
    timezones: {
        'china': 'Chine (UTC+8)',
        'newyork': 'New York (UTC-5/-4)',
        'losangeles': 'Los Angeles (UTC-8/-7)',
        'chicago': 'Chicago (UTC-6/-5)',
        'london': 'Londres (UTC+0/+1)',
        'paris': 'Paris (UTC+1/+2)',
        'berlin': 'Berlin (UTC+1/+2)',
        'tokyo': 'Tokyo (UTC+9)',
        'seoul': 'Séoul (UTC+9)',
        'hongkong': 'Hong Kong (UTC+8)',
        'singapore': 'Singapour (UTC+8)',
        'dubai': 'Dubaï (UTC+4)',
        'sydney': 'Sydney (UTC+10/+11)',
        'auckland': 'Auckland (UTC+12/+13)',
        'utc': 'UTC (Temps universel coordonné)'
    },

    // Welcome Dialog
    welcome: {
        title: 'Bienvenue sur Aboard',
        content: `Bienvenue sur l'application de tableau blanc Aboard !

Conseils d'utilisation :
• Cliquez sur la barre d'outils en bas pour sélectionner différents outils de dessin
• Utilisez Ctrl+Z pour annuler, Ctrl+Y pour rétablir
• Cliquez sur les boutons de zoom en haut à droite ou utilisez la molette de la souris pour zoomer sur le canevas
• Cliquez sur le bouton arrière-plan pour choisir différents motifs d'arrière-plan
• Basculez entre le mode canevas infini ou pagination dans les paramètres
• Support des entrées tactiles et souris

Profitez de votre travail créatif !`,
        confirm: 'OK',
        noShowAgain: 'Ne plus afficher'
    },

    // Confirm Clear Dialog
    confirmClear: {
        title: 'Confirmer l\'effacement',
        message: 'Êtes-vous sûr de vouloir effacer la toile actuelle ? Cette action ne peut pas être annulée. Les autres toiles ne seront pas affectées.',
        confirm: 'Confirmer',
        cancel: 'Annuler'
    },

    // Color names
    colors: {
        black: 'Noir',
        red: 'Rouge',
        blue: 'Bleu',
        green: 'Vert',
        yellow: 'Jaune',
        orange: 'Orange',
        purple: 'Violet',
        white: 'Blanc',
        transparent: 'Transparent'
    },

    // Days of week
    days: {
        sunday: 'Dimanche',
        monday: 'Lundi',
        tuesday: 'Mardi',
        wednesday: 'Mercredi',
        thursday: 'Jeudi',
        friday: 'Vendredi',
        saturday: 'Samedi'
    }
};
