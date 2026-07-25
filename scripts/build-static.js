const fs = require('fs/promises');
const path = require('path');
const { minify: minifyHtml } = require('html-minifier-terser');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BUILD_VERSION_PLACEHOLDER = '__ABOARD_BUILD_VERSION_PLACEHOLDER__';

const INCLUDED_PATHS = [
    'css',
    'img',
    'js',
    'sounds',
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

async function readBuildVersion() {
    return (await fs.readFile(path.join(ROOT_DIR, 'version.txt'), 'utf8')).trim();
}

async function minifyContent(relativePath, content) {
    const ext = path.extname(relativePath).toLowerCase();
    const normalizedPath = relativePath.split(path.sep).join('/');

    if (normalizedPath === 'js/app/bootstrap.js') {
        const version = await readBuildVersion();
        content = content.replace(BUILD_VERSION_PLACEHOLDER, version);
    }

    if (normalizedPath === 'sw.js') {
        // Guarantee cache busting on release: the dist copy of sw.js always
        // carries the version from version.txt, even if the source constant
        // was not bumped by hand.
        const version = await readBuildVersion();
        const swVersionPattern = /(const\s+SW_VERSION\s*=\s*')([^']*)(')/;
        const match = content.match(swVersionPattern);
        if (!match) {
            throw new Error('SW_VERSION constant not found in sw.js.');
        }
        if (match[2] !== version) {
            console.warn(`sw.js SW_VERSION (${match[2]}) is out of sync with version.txt (${version}); using ${version} in dist output.`);
        }
        content = content.replace(swVersionPattern, `$1${version}$3`);
    }

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
        if (normalizedPath.endsWith('.min.js')) {
            return content;
        }

        const isModule = /^\s*import\s.+from\s+['"]/m.test(content)
            || /^\s*export\s+(?:\{|\*|default\b|const\b|class\b|function\b|let\b|var\b)/m.test(content);

        const result = await minifyJs(content, {
            compress: {
                passes: 2
            },
            format: {
                comments: false
            },
            mangle: true,
            module: isModule,
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
