# PDF Translate — Chrome Extension

## What this is
A Chrome extension that intercepts PDF navigation, renders PDFs in the official PDF.js viewer (v5.6.205), and lets the user select any word or phrase to get an AI-powered, context-aware translation via a floating bubble.

## Architecture

```
manifest.json          MV3 manifest — permissions: tabs, storage
background.js          Service worker: intercepts PDF URLs, proxies OpenAI API calls
pdfjs/
  build/               PDF.js library (pdf.mjs, pdf.worker.mjs, pdf.sandbox.mjs)
  web/
    viewer.html        Official pre-built PDF.js viewer, modified to inject translate-overlay
    viewer.mjs         PDF.js viewer app — one line patched: defaultUrl set to ""
    translate-overlay.js  Our addition: opens the PDF + shows translation bubble
popup/
  popup.html / popup.js  Settings UI: OpenAI API key + target language
```

## Key decisions and why

### PDF interception
`background.js` listens on `chrome.tabs.onUpdated` for URLs ending in `.pdf` and redirects the tab to `pdfjs/web/viewer.html`. The PDF URL is passed in the **hash** as `#translate-file=<encoded-url>`, NOT as `?file=`.

**Why hash, not query string?** The pre-built PDF.js viewer has a `validateFileURL()` security check that throws `"file origin does not match viewer's"` when `?file=<https://...>` is used from a `chrome-extension://` origin. Passing via hash bypasses this check. `translate-overlay.js` then calls `PDFViewerApplication.open({ url })` directly, which skips the validation.

### Using the official pre-built viewer
We download the full release zip from GitHub (`pdfjs-5.6.205-dist.zip`) and copy `build/` and `web/` into `pdfjs/`. This gives us the complete viewer with toolbar, text selection tools, highlight, annotations, etc. — for free, with correct text layer alignment.

**Why not a custom viewer?** A custom viewer had persistent text layer misalignment because manual span positioning drifted from the canvas render. The official viewer's `TextLayer` class uses the same measurements as the canvas render, so they match exactly.

### `defaultUrl` patch
`viewer.mjs` line with `value: "compressed.tracemonkey-pldi-09.pdf"` is changed to `value: ""`. This prevents the viewer from auto-loading its sample PDF before our overlay opens the real one.

### Timing: how the PDF gets opened
`viewer.mjs` calls `webViewerLoad()` immediately when parsed (not on DOMContentLoaded), so `webviewerloaded` has already fired before `translate-overlay.js` runs. The overlay skips the event and directly awaits `PDFViewerApplication.initializedPromise`, then calls `open({ url })`.

### Translation API
- **Provider:** OpenAI (`gpt-4o-mini`) via `https://api.openai.com/v1/chat/completions`
- **API key** stored in `chrome.storage.local`
- Calls are made from the **background service worker** (not the viewer page) to avoid CORS issues
- The selected word + up to 500 chars of page context (from the text layer) are sent to the model
- The bubble shows a collapsible "Context: N words, N chars" section so the user can see exactly what was sent

### HiDPI / Retina fix
Canvas is rendered at `width * devicePixelRatio` physical pixels, scaled back via CSS `width/height`, and the 2D context is pre-scaled by `dpr`. This was relevant in the old custom viewer; the official viewer handles this internally.

## Setup

```bash
npm run setup   # installs pdfjs-dist, copies build files to lib/ (legacy, no longer used)
```

The `pdfjs/` directory is committed directly (pre-built files copied from the GitHub release zip).

To load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select this folder.

## Updating PDF.js
1. Download the new release zip from `https://github.com/mozilla/pdf.js/releases`
2. Replace `pdfjs/build/` and `pdfjs/web/` with the new contents
3. Re-apply the `defaultUrl` patch in `pdfjs/web/viewer.mjs`
4. Re-add the translate bubble HTML and script tag to `pdfjs/web/viewer.html`
5. Copy `translate-overlay.js` back into `pdfjs/web/`
