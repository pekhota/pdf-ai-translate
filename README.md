# PDF Translate

A Chrome extension that intercepts PDF navigation and lets you select any word or phrase to get an AI-powered, context-aware translation — powered by the official PDF.js viewer and OpenAI.

![Demo: select a word, get a translation bubble with context](.github/demo.png)

## Features

- Opens all PDFs in the full-featured PDF.js viewer (text selection, highlights, annotations, search, thumbnails)
- Select any word or phrase → floating translation bubble appears instantly
- Translation uses the surrounding page text as context, so technical terms are translated accurately
- Collapsible context preview in the bubble shows exactly what was sent to the AI
- Target language configurable per user

## Installation

> No build step required — load the extension folder directly into Chrome.

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/chrome-ext-translate.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the cloned folder

5. Click the extension icon in the toolbar, enter your **OpenAI API key**, and choose a target language → **Save**

## Usage

Navigate to any `.pdf` URL in Chrome — the extension intercepts it automatically and opens it in the PDF.js viewer. Select a word or phrase with your mouse and a translation bubble will appear.

The bubble shows:
- The selected text
- The translation
- A collapsible **Context** section with the text that was sent to the AI

## How it works

| File | Purpose |
|------|---------|
| `background.js` | Intercepts `.pdf` URLs, redirects to the viewer, proxies OpenAI API calls |
| `pdfjs/web/viewer.html` | Official PDF.js viewer with translate bubble injected |
| `pdfjs/web/translate-overlay.js` | Opens the PDF via `PDFViewerApplication.open()`, handles selection and bubble |
| `src/translate-overlay.js` | Canonical source for the overlay (copied to `pdfjs/web/` by `setup.js`) |
| `popup/` | Settings UI — API key and target language |

See [AGENT.md](AGENT.md) for a detailed explanation of every architectural decision.

## Updating PDF.js

The bundled PDF.js version is **5.6.205**. To upgrade:

```bash
node setup.js 5.7.000   # replace with the target version
```

This downloads the release zip from GitHub, replaces `pdfjs/build/` and `pdfjs/web/`, and re-applies the two patches the extension requires.

## Requirements

- Chrome 116+ (Manifest V3)
- An [OpenAI API key](https://platform.openai.com/api-keys)

## License

MIT
