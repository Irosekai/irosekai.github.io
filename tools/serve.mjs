/**
 * 零依赖静态服务器 —— 本地预览用。
 *
 *   node tools/serve.mjs          # http://localhost:4173
 *   node tools/serve.mjs 8080     # 指定端口
 *
 * 注意：ES Module 不能通过 file:// 加载，所以本地预览必须走 HTTP。
 */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(ROOT, normalized);
}

const server = createServer((req, res) => {
  let filePath = safePath(req.url === '/' ? '/index.html' : req.url);

  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    // 回退到 404 页面，和 GitHub Pages 行为一致
    const fallback = join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    createReadStream(fallback).pipe(res);
    return;
  }

  try {
    statSync(filePath);
  } catch {
    const fallback = join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    createReadStream(fallback).pipe(res);
    return;
  }

  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    // 本地预览禁用缓存，避免改完看不到效果
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`斓世 / Irosekai — 本地预览`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  root: ${ROOT}`);
});
