#!/usr/bin/env node
/**
 * Updates the bundled PDF.js viewer to a new version.
 *
 * Usage:
 *   node setup.js [version]
 *   node setup.js 5.6.205
 *
 * What it does:
 *   1. Downloads pdfjs-<version>-dist.zip from GitHub releases
 *   2. Replaces pdfjs/build/ and pdfjs/web/ with the new files
 *   3. Re-applies the two patches the extension requires:
 *      a) Clears the default sample PDF URL in viewer.mjs
 *      b) Injects the translate bubble HTML + script tag into viewer.html
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');
const { execSync } = require('child_process');

const CURRENT_VERSION = '5.6.205';
const version = process.argv[2] || CURRENT_VERSION;
const ROOT    = __dirname;
const PDFJS   = path.join(ROOT, 'pdfjs');

// ── 1. Download ───────────────────────────────────────────────────────────────

const zipUrl  = `https://github.com/mozilla/pdf.js/releases/download/v${version}/pdfjs-${version}-dist.zip`;
const tmpZip  = path.join(os.tmpdir(), `pdfjs-${version}-dist.zip`);
const tmpDir  = path.join(os.tmpdir(), `pdfjs-${version}-dist`);

console.log(`Downloading PDF.js v${version}…`);
execSync(`curl -sL "${zipUrl}" -o "${tmpZip}"`, { stdio: 'inherit' });

console.log('Extracting…');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
execSync(`unzip -q "${tmpZip}" -d "${tmpDir}"`);

// ── 2. Replace pdfjs/build and pdfjs/web ─────────────────────────────────────

console.log('Replacing pdfjs/build and pdfjs/web…');
fs.rmSync(path.join(PDFJS, 'build'), { recursive: true, force: true });
fs.rmSync(path.join(PDFJS, 'web'),   { recursive: true, force: true });
execSync(`cp -r "${path.join(tmpDir, 'build')}" "${PDFJS}/build"`);
execSync(`cp -r "${path.join(tmpDir, 'web')}"   "${PDFJS}/web"`);

// ── 3a. Patch viewer.mjs — clear default sample PDF ──────────────────────────

console.log('Patching viewer.mjs…');
const viewerMjs = path.join(PDFJS, 'web', 'viewer.mjs');
let mjs = fs.readFileSync(viewerMjs, 'utf8');
mjs = mjs.replace(
  /value:\s*"compressed\.tracemonkey-pldi-09\.pdf"/,
  'value: ""'
);
fs.writeFileSync(viewerMjs, mjs);

// ── 3b. Patch viewer.html — inject translate bubble + script ─────────────────

console.log('Patching viewer.html…');
const viewerHtml = path.join(PDFJS, 'web', 'viewer.html');
let html = fs.readFileSync(viewerHtml, 'utf8');

const bubbleHtml = `
    <!-- Translation overlay (injected by PDF Translate extension) -->
    <div id="translate-bubble" style="display:none;position:fixed;background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.18),0 1px 4px rgba(0,0,0,.1);padding:12px 14px;min-width:200px;max-width:320px;z-index:99999;font:14px/1 system-ui,sans-serif;border:1px solid #e5e5e5;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f0f0f0;">
        <span id="tb-word" style="font-weight:600;color:#111;word-break:break-word;"></span>
        <button id="tb-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:#bbb;line-height:1;padding:0;flex-shrink:0;" title="Close">×</button>
      </div>
      <div id="tb-loading" style="color:#888;font-style:italic;font-size:13px;">Translating…</div>
      <div id="tb-result" style="color:#222;line-height:1.55;white-space:pre-wrap;word-break:break-word;"></div>
      <details id="tb-context-details" style="margin-top:8px;border-top:1px solid #f0f0f0;padding-top:8px;display:none;">
        <summary id="tb-context-summary" style="cursor:pointer;font-size:11px;color:#888;user-select:none;list-style:none;display:flex;align-items:center;gap:4px;">
          <span id="tb-context-toggle">▶</span>
          <span id="tb-context-label"></span>
        </summary>
        <div id="tb-context-text" style="margin-top:6px;font-size:11px;color:#666;line-height:1.5;max-height:80px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;background:#f9f9f9;border-radius:4px;padding:6px;"></div>
      </details>
    </div>
    <script type="module" src="translate-overlay.js"></script>`;

html = html.replace('<div id="printContainer"></div>\n  </body>', `<div id="printContainer"></div>\n${bubbleHtml}\n  </body>`);
fs.writeFileSync(viewerHtml, html);

// ── 4. Copy translate-overlay.js into pdfjs/web ───────────────────────────────

fs.copyFileSync(
  path.join(ROOT, 'src', 'translate-overlay.js'),
  path.join(PDFJS, 'web', 'translate-overlay.js')
);

console.log(`\nDone! PDF.js updated to v${version}.`);
