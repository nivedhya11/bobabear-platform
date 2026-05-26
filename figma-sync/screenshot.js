#!/usr/bin/env node
/**
 * figma-sync/screenshot.js
 *
 * Captures each landing-page section at 1440 × <section-height> px and
 * saves the PNGs to figma-sync/<SectionName>.png — ready to import into
 * the matching Figma frame stubs as reference overlays.
 *
 * Prerequisites
 *   • Dev server running:  npm run dev          (defaults to port 3000)
 *   • Playwright + Chromium installed:
 *       npm install -D playwright
 *       npx playwright install chromium
 *
 * Usage
 *   node figma-sync/screenshot.js            # uses port 3000
 *   node figma-sync/screenshot.js --port 3001
 *   PORT=3001 node figma-sync/screenshot.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────

const PORT    = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : (process.env.PORT ?? '3000');

const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR  = path.join(__dirname); // figma-sync/ lives next to this script

// ── Sections ──────────────────────────────────────────────────────────────────
// selector    — CSS/ARIA selector for the section root element
// maxHeight   — cap the screenshot at this height (px); omit → full element
//               SignatureDrops is 400 vh (sticky scroll) on desktop — we clip
//               to one viewport so Figma gets a usable first-fold reference.

const SECTIONS = [
  { name: 'Hero',           selector: '#top'              },
  { name: 'Marquee',        selector: '[role="marquee"]'  },
  { name: 'SignatureDrops', selector: '#drops', maxH: 960 },
  { name: 'MenuCatalog',    selector: '#menu'             },
  { name: 'TheBear',        selector: '#bear'             },
  { name: 'MerchDrop',      selector: '#merch'            },
  { name: 'AccessCTA',      selector: '#access'           },
  { name: 'Footer',         selector: 'footer'            },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // ── Check dev server is up ────────────────────────────────────────────────
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      http.get(BASE_URL, resolve).on('error', reject);
    });
  } catch {
    console.error(`\n✗  Cannot reach ${BASE_URL}`);
    console.error('   Start the dev server first:  npm run dev\n');
    process.exit(1);
  }

  // ── Launch browser ────────────────────────────────────────────────────────
  const browser = await chromium.launch();
  const ctx     = await browser.newContext({
    viewport:    { width: 1440, height: 900 },
    deviceScaleFactor: 2,          // retina — crisper type in Figma
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();

  // Disable CSS animations so screenshots are deterministic
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `*, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }`;
    document.head.appendChild(style);
  });

  // 'networkidle' hangs on Next.js dev (HMR websocket stays open) — use 'load'
  // then wait explicitly for fonts + JS layout.
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => document.fonts.ready);
  // Framer Motion / IntersectionObserver initial paint
  await page.waitForTimeout(1200);

  // ── Screenshot each section ───────────────────────────────────────────────
  const results = [];

  for (const { name, selector, maxH } of SECTIONS) {
    const el = page.locator(selector).first();

    // Scroll so the section enters the viewport (triggers IS observers etc.)
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);

    const box = await el.boundingBox();
    if (!box) {
      console.warn(`⚠   ${name} — element not found (selector: "${selector}"), skipping`);
      continue;
    }

    // Clip height: honour maxH cap, fall back to the element's natural height
    const clipH   = maxH ? Math.min(box.height, maxH) : Math.round(box.height);
    const outPath = path.join(OUT_DIR, `${name}.png`);

    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: Math.round(box.y), width: 1440, height: clipH },
    });

    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`✓  ${name.padEnd(16)} → figma-sync/${name}.png  (1440 × ${clipH} px, ${kb} KB)`);
    results.push({ name, path: outPath, width: 1440, height: clipH });
  }

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n── ${results.length} screenshots saved to figma-sync/ ──\n`);
  results.forEach(r =>
    console.log(`   ${r.path.replace(process.cwd(), '.')}`)
  );
  console.log();
}

run().catch((err) => { console.error(err); process.exit(1); });
