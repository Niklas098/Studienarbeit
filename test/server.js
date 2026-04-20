// Minimal static file server for local testing (no external deps).
// Serves the project root; defaults to /test/viewer.html.
// Start: `npm start` (or `PORT=5000 npm start`).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') {
      res.writeHead(302, { Location: '/test/viewer.html' });
      res.end();
      return;
    }

    let filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Server error');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': 'no-store',
        });
        res.end(data);
      });
    });
  });
}

const HOST = '127.0.0.1';
const MAX_PORT_TRIES = 20;

function listen(port, triesLeft = MAX_PORT_TRIES) {
  const server = createServer();

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && triesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use, trying ${nextPort}...`);
      listen(nextPort, triesLeft - 1);
      return;
    }

    console.error(`Could not start server on ${HOST}:${port}`);
    console.error(error);
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    console.log(`Static server running at http://${HOST}:${port}/test/viewer.html`);
  });
}

listen(PORT);
