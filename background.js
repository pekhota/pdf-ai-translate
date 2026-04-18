// ---------- PDF interception ----------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'loading' &&
    tab.url &&
    isPdfUrl(tab.url) &&
    !tab.url.startsWith(chrome.runtime.getURL(''))
  ) {
    // Pass the URL in the hash so the viewer doesn't auto-load it
    // (auto-load triggers a same-origin check that blocks https:// files).
    // translate-overlay.js reads the hash and calls PDFViewerApplication.open() instead.
    const viewerUrl =
      chrome.runtime.getURL('pdfjs/web/viewer.html') +
      '#translate-file=' + encodeURIComponent(tab.url);
    chrome.tabs.update(tabId, { url: viewerUrl });
  }
});

function isPdfUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.endsWith('.pdf');
  } catch {
    return false;
  }
}

// ---------- Translation ----------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    handleTranslation(message.word, message.context)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // keep message channel open for async response
  }
});

async function handleTranslation(word, context) {
  const { apiKey, targetLang } = await chrome.storage.local.get(['apiKey', 'targetLang']);

  if (!apiKey) {
    return { error: 'No API key set — click the extension icon to configure.' };
  }

  const lang = targetLang || 'Ukrainian';

  const prompt = context
    ? `Translate the word or phrase "${word}" to ${lang}.
It appears in this context from a document: "${context}"

Provide a concise, context-aware translation. If it's a single word, pick the meaning that best fits the context. Reply with just the translation and a one-sentence explanation if the meaning is non-obvious.`
    : `Translate "${word}" to ${lang}. Be concise.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return { translation: data.choices[0]?.message?.content?.trim() };
}
