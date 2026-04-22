const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const parsedPort = Number.parseInt(process.env.PORT, 10);
const PORT = Number.isNaN(parsedPort) ? 8080 : parsedPort;
const ROOT_DIR = __dirname;
const VERSION_FILE = path.join(ROOT_DIR, 'version.txt');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
}

function isPathInsideRoot(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function isPublicAssetPath(reqPath) {
    if (!reqPath || reqPath === '/') {
        return true;
    }

    const normalizedPath = reqPath.replace(/\\/g, '/');
    const allowedExactPaths = new Set([
        '/index.html',
        '/manifest.json',
        '/sw.js',
        '/version.txt',
        '/announcements.json'
    ]);
    if (allowedExactPaths.has(normalizedPath)) {
        return true;
    }

    const allowedPrefixes = [
        '/css/',
        '/dist/',
        '/img/',
        '/js/',
        '/public/',
        '/sounds/'
    ];

    return allowedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

function hasDotSegment(pathname) {
    return pathname
        .split('/')
        .some((segment) => segment === '.' || segment === '..');
}

function containsEncodedTraversal(pathname) {
    try {
        const decodedPath = decodeURIComponent(pathname);
        return decodedPath !== pathname && hasDotSegment(decodedPath.replace(/\\/g, '/'));
    } catch {
        return true;
    }
}

function serveStatic(reqPath, res, rawPath = reqPath) {
    const normalizedRawPath = (rawPath || reqPath || '').replace(/\\/g, '/');
    if (hasDotSegment(normalizedRawPath) || containsEncodedTraversal(normalizedRawPath)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    let safePath = reqPath;
    if (safePath === '/') {
        safePath = '/index.html';
    }

    if (!isPublicAssetPath(safePath)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    const filePath = path.normalize(path.join(ROOT_DIR, safePath));
    if (!isPathInsideRoot(filePath) && filePath !== path.join(ROOT_DIR, 'index.html')) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT' || err.code === 'EISDIR') {
                sendJson(res, 404, { error: 'Not Found' });
                return;
            }
            sendJson(res, 500, { error: 'Internal Server Error' });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}

function parseRequestUrl(req) {
    const host = typeof req?.headers?.host === 'string' && req.headers.host
        ? req.headers.host
        : 'localhost';
    const requestUrl = typeof req?.url === 'string' && req.url
        ? req.url
        : '/';

    try {
        return new URL(requestUrl, `http://${host}`);
    } catch {
        return null;
    }
}

const server = http.createServer((req, res) => {
    const url = parseRequestUrl(req);
    if (!url) {
        sendJson(res, 400, { error: 'Bad Request' });
        return;
    }

    if (url.pathname === '/api/version') {
        fs.readFile(VERSION_FILE, 'utf8', (err, versionText) => {
            if (err) {
                sendJson(res, 500, { error: 'Failed to read version file' });
                return;
            }
            sendJson(res, 200, { version: versionText.trim() });
        });
        return;
    }

    serveStatic(url.pathname, res, req.url || url.pathname);
});

server.listen(PORT, () => {
    console.log(`Aboard server running at http://localhost:${PORT}`);
});
