const apiKeyInput = document.getElementById('apiKey');
const targetLangSelect = document.getElementById('targetLang');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

chrome.storage.local.get(['apiKey', 'targetLang'], ({ apiKey, targetLang }) => {
  if (apiKey) apiKeyInput.value = apiKey;
  if (targetLang) targetLangSelect.value = targetLang;
});

saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const targetLang = targetLangSelect.value;

  chrome.storage.local.set({ apiKey, targetLang }, () => {
    statusEl.textContent = 'Saved!';
    setTimeout(() => (statusEl.textContent = ''), 2000);
  });
});
