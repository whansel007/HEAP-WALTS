// dictionary.js — Japanese dictionary lookup (Jisho.org)
//
// Same shape as kana.js: a self-contained mini-feature with its own data
// fetching and its own DOM handling, exposing just one function —
// initDictionary — for ui.js to call. ui.js doesn't need to know how
// lookups work internally.

const JISHO_API = 'https://jisho.org/api/v1/search/words';

async function lookupWord(word) {
  const res = await fetch(`${JISHO_API}?keyword=${encodeURIComponent(word)}&exact=1`);
  if (!res.ok) throw new Error(`Jisho API error: ${res.status}`);
  const data = await res.json();
  return data.data;
}

function renderDictResults(word, results) {
  const container = document.getElementById('dict-results');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = `<p class="dict-empty">No results for "${word}"</p>`;
    return;
  }

  container.innerHTML = results.slice(0, 8).map(entry => {
    const japanese = entry.japanese[0] || {};
    const wordText = japanese.word || japanese.reading || '';
    const reading = japanese.reading || '';
    const meanings = entry.senses
      .slice(0, 3)
      .map(s => s.english_definitions.join(', '))
      .join(' • ');
    const tags = entry.senses[0]?.parts_of_speech?.join(', ') || '';

    return `
      <div class="dict-entry">
        <div class="dict-entry-head">
          <span class="dict-word">${wordText}</span>
          ${reading && reading !== wordText ? `<span class="dict-reading">${reading}</span>` : ''}
        </div>
        <div class="dict-meaning">${meanings}</div>
        ${tags ? `<div class="dict-tags">${tags}</div>` : ''}
      </div>
    `;
  }).join('');
}
function cleanQuery(raw) {
  return raw
    .trim()
    .replace(/[\n\r\t]/g, '')
    .replace(/[。、「」『』！？!?.,]/g, '')
    .split(/\s+/)[0]; // if multiple words/sentence, just use the first
}

// Exact matches and "common" words first; everything else after, in
// whatever order Jisho returned them.
function sortResults(query, results) {
  const isExact = entry =>
    entry.japanese.some(j => j.word === query || j.reading === query);

  return [...results].sort((a, b) => {
    const aExact = isExact(a) ? 1 : 0;
    const bExact = isExact(b) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aCommon = a.is_common ? 1 : 0;
    const bCommon = b.is_common ? 1 : 0;
    return bCommon - aCommon;
  });
}

async function runDictSearch(rawWord) {
  const container = document.getElementById('dict-results');
  const word = cleanQuery(rawWord);

  if (!word) {
    container.innerHTML = `<p class="dict-empty">Nothing to search</p>`;
    return;
  }

  container.innerHTML = `<p class="dict-loading">Searching...</p>`;
  try {
    const results = await lookupWord(word);
    renderDictResults(word, sortResults(word, results));
  } catch (e) {
    container.innerHTML = `<p class="dict-empty">Lookup failed. Check your connection.</p>`;
  }
}

async function getSelectedTextFromPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return '';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });
    return (results[0]?.result || '').trim();
  } catch (_) {
    return '';
  }
}

function openDictModal(prefillText) {
  document.getElementById('dict-modal').classList.remove('hidden');
  const input = document.getElementById('dict-input');
  input.value = prefillText || '';
  document.getElementById('dict-results').innerHTML = '';
  input.focus();
  if (prefillText) runDictSearch(prefillText);
}

function closeDictModal() {
  document.getElementById('dict-modal').classList.add('hidden');
}

// The one function ui.js calls to wire up the dictionary button + modal.
export function initDictionary() {
  document.getElementById('translate-btn').addEventListener('click', async () => {
    const selected = await getSelectedTextFromPage();
    openDictModal(selected);
  });

  document.getElementById('dict-close').addEventListener('click', closeDictModal);
  document.getElementById('dict-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('dict-modal')) closeDictModal();
  });

  document.getElementById('dict-search-btn').addEventListener('click', () => {
    const word = document.getElementById('dict-input').value.trim();
    if (word) runDictSearch(word);
  });

  document.getElementById('dict-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const word = e.target.value.trim();
      if (word) runDictSearch(word);
    }
  });
}