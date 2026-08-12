#!/usr/bin/env node
/**
 * scripts/serve-static-export.mjs
 *
 * Minimal, dependency-free static file server for the Next.js static export
 * in `out/`. Used by Playwright's `webServer` (see playwright.config.ts) so
 * E2E tests run against the actual production artifact instead of the dev
 * server.
 *
 * Node built-ins only — no third-party HTTP server package.
 *
 * Usage:
 *   node scripts/serve-static-export.mjs            # binds 127.0.0.1:4173
 *   node scripts/serve-static-export.mjs --port 5000
 *   PORT=5000 node scripts/serve-static-export.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "out");
const HOST = "127.0.0.1"; // loopback only — never bind 0.0.0.0

const portArgIndex = process.argv.indexOf("--port");
const PORT = Number(
  portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4173,
);

// ── MIME types for the file kinds this export actually produces ────────────
const MIME_BY_EXT = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/** Sniff a content type for extensionless files (e.g. the exported
 *  `opengraph-image` route) from the first bytes — small, no dependency. */
function sniffContentType(buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return "application/octet-stream";
}

function contentTypeFor(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  return sniffContentType(buffer);
}

/** Resolve a request pathname to a file under OUT_DIR, or null. Handles:
 *    /                → out/index.html
 *    /dev, /dev/       → out/dev/index.html   (directory index)
 *    /robots.txt       → out/robots.txt        (direct file)
 *    /opengraph-image  → out/opengraph-image    (extensionless direct file)
 *    /missing          → null (caller serves 404.html)
 *  Rejects path traversal by requiring the resolved path stay inside OUT_DIR.
 */
function resolveFile(outDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // malformed escape sequence
  }

  // Strip query/hash already removed by caller. Normalize away "..".
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(outDir, relative);

  // Path-traversal guard: resolved path must stay inside outDir.
  if (resolved !== outDir && !resolved.startsWith(outDir + path.sep)) {
    return null;
  }

  // Prefer directory indexes first. Checking the directory itself before
  // `index.html` is fine functionally, but on some WSL/NTFS setups an empty
  // relative path briefly races during export refresh; resolving the index
  // file first keeps `/` deterministic.
  const indexCandidate = path.join(resolved, "index.html");
  const candidates = relative === "" || relative.endsWith("/")
    ? [indexCandidate, resolved]
    : [resolved, indexCandidate];

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // continue to next candidate
    }
  }
  return null;
}

function serveNotFound(res, outDir) {
  const notFoundPath = path.join(outDir, "404.html");
  try {
    const body = fs.readFileSync(notFoundPath);
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

/**
 * Build a static-file request handler rooted at `outDir`. Exported so other
 * scripts (e.g. `scripts/e2e/customer-auth-server.ts`, IMP-009) can layer
 * additional routes — such as a reverse-proxy prefix — in front of the same
 * static-export serving logic instead of duplicating it.
 */
export function createStaticExportHandler(outDir) {
  return function handleRequest(req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }

    const url = new URL(req.url ?? "/", "http://static-export.invalid");
    const filePath = resolveFile(outDir, url.pathname);

    if (!filePath) {
      serveNotFound(res, outDir);
      return;
    }

    try {
      const body = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": contentTypeFor(filePath, body) });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      serveNotFound(res, outDir);
    }
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR) || !fs.statSync(OUT_DIR).isDirectory()) {
    console.error(
      `\n✗  ${OUT_DIR} does not exist.\n   Run "npm run build" first to generate the static export.\n`,
    );
    process.exit(1);
  }

  const server = http.createServer(createStaticExportHandler(OUT_DIR));

  server.listen(PORT, HOST, () => {
    console.log(`✓  Serving out/ at http://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Only run the standalone server when this file is executed directly —
// importers (e.g. the customer-auth E2E harness) just want the handler.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
