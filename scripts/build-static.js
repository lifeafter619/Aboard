const fs = require('fs/promises');
const path = require('path');
const { minify: minifyHtml } = require('html-minifier-terser');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const INCLUDED_PATHS = [
    'css',
    'img',
    'js',
    'sounds',
    'announcements.json',
    'index.html',
    'manifest.json',
    'sw.js',
    'version.txt'
];

const TEXT_EXTENSIONS = new Set([
    '.css',
    '.html',
    '.js',
    '.json',
    '.svg',
    '.txt',
    '.webmanifest'
]);

async function removeDirIfExists(targetPath) {
    await fs.rm(targetPath, { recursive: true, force: true });
}

async function ensureDir(targetPath) {
    await fs.mkdir(targetPath, { recursive: true });
}

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function minifyContent(relativePath, content) {
    const ext = path.extname(relativePath).toLowerCase();

    if (ext === '.html') {
        return minifyHtml(content, {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            decodeEntities: true,
            keepClosingSlash: true,
            minifyCSS: true,
            minifyJS: false,
            removeComments: true,
            removeEmptyAttributes: false,
            removeRedundantAttributes: false
        });
    }

    if (ext === '.css') {
        const result = new CleanCSS({
            level: 2
        }).minify(content);

        if (result.errors?.length) {
            throw new Error(`CSS minify failed for ${relativePath}: ${result.errors.join('; ')}`);
        }

        return result.styles;
    }

    if (ext === '.js') {
        const isModule = /^\s*import\s.+from\s+['"]/m.test(content)
            || /^\s*export\s+(?:\{|\*|default\b|const\b|class\b|function\b|let\b|var\b)/m.test(content);
        if (!isModule) {
            return content;
        }

        const result = await minifyJs(content, {
            compress: {
                passes: 2
            },
            format: {
                comments: false
            },
            mangle: true,
            module: true,
            sourceMap: false,
            toplevel: false
        });

        if (!result.code) {
            throw new Error(`JS minify returned empty output for ${relativePath}`);
        }

        return result.code;
    }

    if (ext === '.json' || ext === '.webmanifest') {
        return JSON.stringify(JSON.parse(content));
    }

    if (ext === '.svg') {
        return content.replace(/>\s+</g, '><').trim();
    }

    if (ext === '.txt') {
        return content.trimEnd() + '\n';
    }

    return content;
}

async function copyFileWithOptionalMinify(sourcePath, destinationPath, relativePath) {
    const ext = path.extname(sourcePath).toLowerCase();
    await ensureDir(path.dirname(destinationPath));

    if (!TEXT_EXTENSIONS.has(ext)) {
        await fs.copyFile(sourcePath, destinationPath);
        return;
    }

    const content = await fs.readFile(sourcePath, 'utf8');
    const output = await minifyContent(relativePath, content);
    await fs.writeFile(destinationPath, output, 'utf8');
}

async function copyEntry(relativePath) {
    const sourcePath = path.join(ROOT_DIR, relativePath);
    const destinationPath = path.join(DIST_DIR, relativePath);
    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
        const entries = await fs.readdir(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
            await copyEntry(path.join(relativePath, entry.name));
        }
        return;
    }

    await copyFileWithOptionalMinify(sourcePath, destinationPath, relativePath);
}

async function main() {
    await removeDirIfExists(DIST_DIR);
    await ensureDir(DIST_DIR);

    for (const relativePath of INCLUDED_PATHS) {
        if (!(await pathExists(path.join(ROOT_DIR, relativePath)))) {
            throw new Error(`Missing required build input: ${relativePath}`);
        }
        await copyEntry(relativePath);
    }

    console.log(`Static build complete: ${path.relative(ROOT_DIR, DIST_DIR)}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
