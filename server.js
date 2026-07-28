const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const zlib = require('zlib');

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
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
};

const COMPRESSIBLE_EXTENSIONS = new Set([
    '.css',
    '.html',
    '.js',
    '.json',
    '.svg',
    '.txt',
    '.webmanifest'
]);
const COMPRESSION_MIN_BYTES = 1024;

// Static asset caching: HTML and version.txt must be revalidated on every
// load so updates are picked up promptly; other static assets are safe to
// cache for a short conservative window and revalidate via Last-Modified.
const LONG_LIVED_EXTENSIONS = new Set([
    '.js',
    '.css',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.mp3',
    '.wav',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf'
]);

function getCacheControl(ext) {
    return LONG_LIVED_EXTENSIONS.has(ext) ? 'public, max-age=3600' : 'no-cache';
}

function isNotModifiedSince(req, stats) {
    const ifModifiedSince = Date.parse(req?.headers?.['if-modified-since'] || '');
    if (Number.isNaN(ifModifiedSince)) {
        return false;
    }

    // HTTP dates have one-second resolution; drop sub-second mtime precision.
    return Math.floor(stats.mtimeMs / 1000) * 1000 <= ifModifiedSince;
}

// stat is only used to enrich responses with validation headers; degrade
// gracefully when it is unavailable (e.g. minimal fs shims in tests).
function statForCaching(filePath, callback) {
    if (typeof fs.stat !== 'function') {
        callback(null, null);
        return;
    }
    fs.stat(filePath, callback);
}

const SECURITY_HEADERS = Object.freeze({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Frame-Options': 'SAMEORIGIN'
});

function withSecurityHeaders(headers = {}) {
    return {
        ...SECURITY_HEADERS,
        ...headers
    };
}

function parseAcceptEncoding(headerValue) {
    const preferences = new Map();
    String(headerValue || '').toLowerCase().split(',').forEach((entry) => {
        const [name, ...params] = entry.trim().split(';').map((part) => part.trim());
        if (!name) {
            return;
        }
        const qParam = params.find((param) => param.startsWith('q='));
        const qValue = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
        preferences.set(name, Number.isFinite(qValue) ? qValue : 0);
    });
    return preferences;
}

function getEncodingPreference(preferences, encoding) {
    if (preferences.has(encoding)) {
        return preferences.get(encoding);
    }
    if (preferences.has('*')) {
        return preferences.get('*');
    }
    return 0;
}

function selectCompressionEncoding(req, ext, data) {
    if (!COMPRESSIBLE_EXTENSIONS.has(ext) || data.length < COMPRESSION_MIN_BYTES) {
        return null;
    }

    const header = String(req?.headers?.['accept-encoding'] || '').toLowerCase();
    const preferences = parseAcceptEncoding(header);
    return ['br', 'gzip']
        .map((encoding) => ({
            encoding,
            q: getEncodingPreference(preferences, encoding)
        }))
        .filter((candidate) => candidate.q > 0)
        .sort((a, b) => b.q - a.q)[0]?.encoding || null;
}

function compressData(data, encoding, callback) {
    if (encoding === 'br') {
        zlib.brotliCompress(data, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 5
            }
        }, callback);
        return;
    }

    zlib.gzip(data, { level: 6 }, callback);
}

function sendStaticData(req, res, ext, mimeType, data, cacheHeaders = {}) {
    const headers = {
        'Content-Type': mimeType,
        ...cacheHeaders
    };
    if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
        headers.Vary = 'Accept-Encoding';
    }

    const encoding = selectCompressionEncoding(req, ext, data);
    if (!encoding) {
        res.writeHead(200, withSecurityHeaders(headers));
        res.end(data);
        return;
    }

    compressData(data, encoding, (error, compressedData) => {
        if (error) {
            console.warn(`Failed to ${encoding}-compress static response:`, error);
            res.writeHead(200, withSecurityHeaders(headers));
            res.end(data);
            return;
        }

        res.writeHead(200, withSecurityHeaders({
            ...headers,
            'Content-Encoding': encoding
        }));
        res.end(compressedData);
    });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, withSecurityHeaders({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    }));
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
        '/version.txt'
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

function serveStatic(req, reqPath, res) {
    const normalizedReqPath = (reqPath || '').replace(/\\/g, '/');
    if (hasDotSegment(normalizedReqPath) || containsEncodedTraversal(normalizedReqPath)) {
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

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    statForCaching(filePath, (statErr, stats) => {
        const hasFileStats = Boolean(!statErr && stats && typeof stats.isDirectory === 'function' && !stats.isDirectory());
        const cacheHeaders = {
            'Cache-Control': getCacheControl(ext)
        };
        if (hasFileStats) {
            cacheHeaders['Last-Modified'] = stats.mtime.toUTCString();
            if (isNotModifiedSince(req, stats)) {
                const notModifiedHeaders = { ...cacheHeaders };
                if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
                    // Keep 304 cache-key semantics consistent with the 200
                    // path, which varies on Accept-Encoding.
                    notModifiedHeaders.Vary = 'Accept-Encoding';
                }
                res.writeHead(304, withSecurityHeaders(notModifiedHeaders));
                res.end();
                return;
            }
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

            sendStaticData(req, res, ext, mimeType, data, cacheHeaders);
        });
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

    serveStatic(req, url.pathname, res);
});

server.listen(PORT, () => {
    console.log(`Aboard server running at http://localhost:${PORT}`);
});
