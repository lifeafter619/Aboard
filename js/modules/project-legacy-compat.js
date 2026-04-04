// Legacy .aboard/.json project compatibility, loaded on demand.

async function importLegacyProject(manager, file) {
    if (!file) return false;

    const text = await file.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error('无效的旧版项目文件格式');
    }

    if (!data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
        throw new Error('旧版项目文件缺少页面数据');
    }

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

    window.appDialog?.showAlert?.('旧版项目导入成功', 'success');
    return true;
}

window.AboardLegacyProjectCompat = {
    importLegacyProject
};
