// Legacy .aboard/.json project compatibility, loaded on demand.

function getProjectPackageText(manager, key, fallback, replacements = null) {
    if (typeof manager?.t === 'function') {
        return manager.t(key, fallback, replacements);
    }

    const translated = window.i18n?.t?.(key) || fallback;
    if (!replacements || typeof translated !== 'string') {
        return translated;
    }

    return Object.entries(replacements).reduce(
        (message, [name, value]) => message.split(`{${name}}`).join(String(value ?? '')),
        translated
    );
}

async function importLegacyProject(manager, file) {
    if (!file) return false;

    const text = await file.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error(getProjectPackageText(manager, 'projectPackage.invalidLegacyFormat', 'Invalid legacy project file format.'));
    }

    if (!data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
        throw new Error(getProjectPackageText(manager, 'projectPackage.legacyMissingPages', 'The legacy project file does not contain page data.'));
    }
    manager.normalizeImportedPageNumber(data.pages.length);

    const confirmed = await manager.confirmImportOverwrite();
    if (!confirmed) {
        return false;
    }

    const orderedPages = [...data.pages].sort((a, b) => (a.index || 0) - (b.index || 0));
    const pagesImageData = [];
    for (const page of orderedPages) {
        const imageData = await manager.base64ToImageData(page.data);
        pagesImageData.push(imageData || manager.createBlankPageImageData());
    }

    const importedCurrentPage = Math.min(
        Math.max(parseInt(data.currentPage ?? data.settings?.currentPage ?? 1, 10) || 1, 1),
        Math.max(1, pagesImageData.length)
    );

    const pageScenes = {};
    const editablePage = parseInt(data.sceneState?.editablePage, 10);
    if (data.sceneState && Number.isInteger(editablePage) && editablePage >= 1) {
        pageScenes[String(editablePage)] = {
            ...manager.cloneSerializable(data.sceneState),
            pageNumber: editablePage
        };
    }

    await manager.applyImportedProjectState({
        settings: data.settings || {},
        uploadedImages: Array.isArray(data.uploadedImages) ? manager.cloneSerializable(data.uploadedImages) : [],
        globalBackground: data.globalBackground || null,
        pageBackgrounds: manager.buildImportedPageBackgrounds(orderedPages, data.pageBackgrounds || {}),
        pageScenes,
        pagesImageData,
        currentPage: importedCurrentPage,
        pageCount: pagesImageData.length
    });

    window.appDialog?.showAlert?.(getProjectPackageText(manager, 'projectPackage.legacyImportSuccess', 'Legacy project imported successfully.'), 'success');
    return true;
}

window.AboardLegacyProjectCompat = {
    importLegacyProject
};
