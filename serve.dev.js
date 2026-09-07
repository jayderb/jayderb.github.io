/* ============================================================
   KRINT TUFWALE — serve.dev.js
   Zero-dependency development server for running the WHOLE
   site locally: static frontend + /api proxy to the backend.

     node serve.dev.js            # web on :8000, API on :4000
     npm run serve:web            # same thing
     npm run dev                  # backend only (existing)

   Why: GitHub Pages serves the site but can't run Node, so
   locally we serve the static files ourselves and forward
   /api/* to src/index.js. In production, point API_BASE in
   script.js at your deployed backend instead.

   The proxy rewrites the Origin header to the local web origin
   so the backend's CORS/CSRF allowlist (ALLOWED_ORIGINS) only
   needs http://localhost:8000 during development.
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const WEB_PORT = process.env.WEB_PORT || 8000;
const API_PORT = process.env.PORT || 4000;
const API_HOST = '127.0.0.1';

const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.db': 'application/octet-stream',
};

function serveStatic(req, res) {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, path.normalize(urlPath));

    // Path traversal guard: never serve outside the repo root
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Not found');
        }

        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': stat.size,
            'Cache-Control': 'no-cache',
        });

        fs.createReadStream(filePath).pipe(res);
    });
}

function proxyToApi(req, res) {
    const options = {
        hostname: API_HOST,
        port: API_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            // The backend allowlists origins; present a stable one
            origin: `http://localhost:${WEB_PORT}`,
            host: `localhost:${API_PORT}`,
        },
    };

    const upstream = http.request(options, (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        upstreamRes.pipe(res);
    });

    upstream.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: `Backend not reachable on port ${API_PORT}. Start it with: npm run dev`,
        }));
    });

    req.pipe(upstream);
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/') || req.url === '/api') {
        return proxyToApi(req, res);
    }
    return serveStatic(req, res);
});

server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`Krint Tufwale web (static + /api proxy) on http://localhost:${WEB_PORT}`);
    console.log(`  -> API proxied to http://${API_HOST}:${API_PORT} (npm run dev)`);
});