// Translation overlay for the PDF.js pre-built viewer.
// Runs as a module inside an extension page so chrome.runtime is available.

// ── Load the PDF ──────────────────────────────────────────────────────────────
// The URL is in the hash as #translate-file=<encoded-url> so the viewer's
// built-in ?file= handler (which enforces same-origin) is never triggered.
const hashParams = new URLSearchParams(window.location.hash.slice(1));
const pdfUrl = hashParams.get('translate-file');

if (pdfUrl) {
  // By the time this module runs, viewer.mjs has already called run().
  // We just need to wait for initialization to finish, then open the file.
  (async () => {
    await window.PDFViewerApplication.initializedPromise;
    window.PDFViewerApplication.open({ url: pdfUrl });
  })();
}


const bubble          = document.getElementById('translate-bubble');
const tbWord          = document.getElementById('tb-word');
const tbLoad          = document.getElementById('tb-loading');
const tbResult        = document.getElementById('tb-result');
const tbContextDetails = document.getElementById('tb-context-details');
const tbContextLabel  = document.getElementById('tb-context-label');
const tbContextText   = document.getElementById('tb-context-text');
const tbContextToggle = document.getElementById('tb-context-toggle');

document.getElementById('tb-close').addEventListener('click', hide);

tbContextDetails.addEventListener('toggle', () => {
  tbContextToggle.textContent = tbContextDetails.open ? '▼' : '▶';
});

document.addEventListener('mousedown', (e) => {
  if (!bubble.contains(e.target)) hide();
});

let timer = null;
document.addEventListener('mouseup', (e) => {
  if (bubble.contains(e.target)) return;
  clearTimeout(timer);
  timer = setTimeout(() => handleSelection(e), 350);
});

function hide() {
  bubble.style.display = 'none';
}

async function handleSelection() {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text || text.length < 2) return;

  const context = extractContext(selection);

  positionBubble(selection.getRangeAt(0).getBoundingClientRect());

  tbWord.textContent = text;
  tbLoad.style.display = 'block';
  tbResult.textContent = '';
  tbResult.style.color = '#222';

  // Show context info
  if (context) {
    const words = context.trim().split(/\s+/).length;
    tbContextLabel.textContent = `Context: ${words} words, ${context.length} chars`;
    tbContextText.textContent = context;
    tbContextDetails.open = false;
    tbContextToggle.textContent = '▶';
    tbContextDetails.style.display = 'block';
  } else {
    tbContextDetails.style.display = 'none';
  }

  bubble.style.display = 'block';

  try {
    const res = await chrome.runtime.sendMessage({ type: 'TRANSLATE', word: text, context });
    tbLoad.style.display = 'none';
    if (res.error) {
      tbResult.style.color = '#c62828';
      tbResult.textContent = res.error;
    } else {
      tbResult.textContent = res.translation;
    }
  } catch {
    tbLoad.style.display = 'none';
    tbResult.style.color = '#c62828';
    tbResult.textContent = 'Translation failed. Check your API key in the extension popup.';
  }
}

function extractContext(selection) {
  if (!selection.rangeCount) return '';
  let node = selection.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && !node.classList?.contains('textLayer')) node = node.parentElement;
  return node ? node.textContent.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
}

function positionBubble(rect) {
  const GAP = 10;
  const W   = 320;
  let top  = rect.bottom + GAP;
  let left = rect.left;

  if (top + 120 > window.innerHeight) top = rect.top - 140;
  if (left + W  > window.innerWidth - GAP) left = window.innerWidth - W - GAP;
  if (left < GAP) left = GAP;

  bubble.style.top  = top  + 'px';
  bubble.style.left = left + 'px';
}
