// popup.js — reading list manager

const API_BASE = 'http://localhost:3001/api';
const DEFAULT_API_KEY = 'manga-tracker-dev-key';

let bookmarks = [];
let activeFilter = 'all';
let searchQuery = '';
let activeTagFilter = '';
let editingId = null;
let modalTags = [];

// ── Storage ───────────────────────────────────────────────────────────────────

async function loadBookmarks() {
  const { bookmarks: stored = [] } = await chrome.storage.local.get('bookmarks');
  bookmarks = stored;
}

async function persistBookmarks() {
  await chrome.storage.local.set({ bookmarks });
}

async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  return apiKey || DEFAULT_API_KEY;
}

// ── Optional backend sync ─────────────────────────────────────────────────────

async function syncToBackend(method, path, body) {
  try {
    const key = await getApiKey();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    };
    if (body) opts.body = JSON.stringify(body);
    await fetch(`${API_BASE}${path}`, opts);
  } catch (_) {
    // backend is optional
  }
}

// ── Manga title extraction ────────────────────────────────────────────────────

function extractMangaTitle(rawTitle) {
  return rawTitle
    .replace(/^\d+\s*\|\s*/, '')                // remove leading "1 | "
    .replace(/chapter\s*\d+\s*[-–]?\s*/i, '')   // remove "Chapter 6 - "
    .replace(/[-–]\s*MangaDex\s*$/i, '')         // remove "- MangaDex"
    .replace(/[-–]\s*MANGA Plus\s*$/i, '')        // remove "- MANGA Plus"
    .trim();
}

// ── Current reading bar ───────────────────────────────────────────────────────

async function showCurrentReading() {
  const el = document.getElementById('current-reading');
  if (!el) return;

  // First check the active tab directly
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab?.url) {
    // Ask content.js to detect the chapter on the current tab
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Run detection inline
          const titleChapter = document.title.match(/Chapter\s+(\d+)/i)?.[1]
            ?? document.title.match(/#(\d+)/)?.[1]
            ?? document.title.match(/ch(?:apter)?\.?\s*(\d+)/i)?.[1]
            ?? null;
          return {
            chapter: titleChapter ? parseInt(titleChapter) : null,
            title: document.title,
            url: location.href,
          };
        },
      });

      const { chapter, title, url } = results[0].result;

      if (chapter) {
        // Update currentReading in storage so savePage() can use it
        await chrome.storage.local.set({
          currentReading: {
            url,
            title,
            chapter,
            updatedAt: Date.now(),
          }
        });

        const mangaTitle = extractMangaTitle(title);
        el.classList.remove('hidden');
        el.innerHTML = `
          <span class="now-reading-label">Now reading</span>
          <span class="now-reading-title">${mangaTitle}</span>
          <span class="now-reading-chapter">Ch. ${chapter}</span>
        `;
        return;
      }
    } catch (_) {
      // Tab might not be a manga page, fall through to stored value
    }
  }

  // Fallback: use stored currentReading
  const { currentReading } = await chrome.storage.local.get('currentReading');
  if (!currentReading) { el.classList.add('hidden'); return; }

  const age = Date.now() - currentReading.updatedAt;
  if (age > 10 * 60 * 1000) { el.classList.add('hidden'); return; }

  const mangaTitle = extractMangaTitle(currentReading.title || '');
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="now-reading-label">Now reading</span>
    <span class="now-reading-title">${mangaTitle}</span>
    <span class="now-reading-chapter">Ch. ${currentReading.chapter}</span>
  `;
}

// ── Render ────────────────────────────────────────────────────────────────────

function getFiltered() {
  return bookmarks.filter(b => {
    const matchFilter = activeFilter === 'all' || b.status === activeFilter;
    const matchSearch = (b.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = !activeTagFilter || (b.tags && b.tags.includes(activeTagFilter));
    return matchFilter && matchSearch && matchTag;
  });
}

function updateTagFilterDropdown() {
  const select = document.getElementById('tag-filter');
  if (!select) return;

  const allTags = new Set();
  bookmarks.forEach(b => {
    if (b.tags) {
      b.tags.forEach(t => allTags.add(t));
    }
  });

  const currentSelection = activeTagFilter;

  let html = '<option value="">All Tags</option>';
  Array.from(allTags).sort().forEach(tag => {
    const selected = tag === currentSelection ? 'selected' : '';
    html += `<option value="${tag}" ${selected}>${tag}</option>`;
  });
  select.innerHTML = html;

  const datalist = document.getElementById('existing-tags');
  if (datalist) {
    datalist.innerHTML = Array.from(allTags).sort()
      .map(t => `<option value="${t}"></option>`)
      .join('');
  }
}

function renderList() {
  const list = document.getElementById('list');
  const empty = document.getElementById('empty-state');
  const filtered = getFiltered();

  updateTagFilterDropdown();

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = filtered.map(b => {
    const tagsHtml = b.tags && b.tags.length > 0
      ? `<div class="bookmark-tags">${b.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>`
      : '';
    return `
      <div class="bookmark-card" data-id="${b.id}">
        <div class="card-main">
          <a class="card-title" href="${b.url}" target="_blank" title="${b.title || b.url}">${b.title || b.url}</a>
          <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span>
        </div>
        ${tagsHtml}
        <div class="card-meta">
          <span>Ch.&nbsp;${b.chapter != null && b.chapter !== 0 ? b.chapter : '—'}</span>
          <div class="card-actions">
            <button class="btn-edit" data-id="${b.id}">Edit</button>
            <button class="btn-delete" data-id="${b.id}">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.id))
  );
  list.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteBookmark(btn.dataset.id))
  );
}

// ── Save current page ─────────────────────────────────────────────────────────

async function savePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  const title = tab.title || url;

  if (!url.startsWith('http')) {
    showToast('Cannot save this page', 'err');
    return;
  }

  if (bookmarks.find(b => b.url === url)) {
    showToast('Already saved!', 'warn');
    return;
  }

  const mangaTitle = extractMangaTitle(title);

  // Try to get current chapter from auto-detection
  const { currentReading } = await chrome.storage.local.get('currentReading');
  const currentChapter = currentReading?.url === url ? currentReading.chapter : 0;

  const bookmark = {
    id: Date.now().toString(),
    url,
    title,
    mangaTitle,
    chapter: currentChapter,  // use detected chapter if available
    status: 'Later',
    tags: [],
    savedAt: new Date().toISOString(),
  };

  bookmarks.unshift(bookmark);
  await persistBookmarks();
  syncToBackend('POST', '/bookmarks', bookmark);
  renderList();
  showToast('Saved!', 'ok');
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteBookmark(id) {
  bookmarks = bookmarks.filter(b => b.id !== id);
  await persistBookmarks();
  syncToBackend('DELETE', `/bookmarks/${id}`);
  renderList();
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function renderModalTags() {
  const container = document.getElementById('modal-tags-container');
  if (!container) return;
  container.innerHTML = modalTags.map((tag, idx) => `
    <span class="modal-tag-chip">
      ${tag}
      <button class="btn-remove-tag" data-index="${idx}" type="button">✕</button>
    </span>
  `).join('');

  container.querySelectorAll('.btn-remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      modalTags.splice(idx, 1);
      renderModalTags();
    });
  });
}

function addTag() {
  const input = document.getElementById('tag-input');
  if (!input) return;
  const tag = input.value.trim().toLowerCase();
  if (tag && !modalTags.includes(tag)) {
    modalTags.push(tag);
    renderModalTags();
  }
  input.value = '';
}

function openModal(id) {
  const b = bookmarks.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  modalTags = b.tags ? [...b.tags] : [];
  document.getElementById('edit-chapter').value = b.chapter || 0;
  document.getElementById('edit-status').value = b.status;
  document.getElementById('tag-input').value = '';
  renderModalTags();
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('edit-chapter').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editingId = null;
  modalTags = [];
}

async function saveModal() {
  if (!editingId) return;
  const chapter = parseInt(document.getElementById('edit-chapter').value) || 0;
  const status = document.getElementById('edit-status').value;

  const idx = bookmarks.findIndex(b => b.id === editingId);
  if (idx === -1) return;
  bookmarks[idx] = { ...bookmarks[idx], chapter, status, tags: [...modalTags] };

  await persistBookmarks();
  syncToBackend('PUT', `/bookmarks/${editingId}`, { chapter, status, tags: [...modalTags] });
  closeModal();
  renderList();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg, type = 'ok') {
  const el = document.getElementById('status-toast');
  el.textContent = msg;
  el.className = `status-toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ── Translation ───────────────────────────────────────────────────────────────

async function runTranslation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('translate-btn').textContent = '...';
  document.getElementById('translate-btn').disabled = true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/detect.js', 'content.js'],
    });
    showToast('Translation started!', 'ok');
  } catch (e) {
    showToast('Translation failed', 'err');
  } finally {
    document.getElementById('translate-btn').textContent = 'Translate';
    document.getElementById('translate-btn').disabled = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  document.getElementById('loading').classList.remove('hidden');
  await loadBookmarks();
  document.getElementById('loading').classList.add('hidden');
  renderList();
  await showCurrentReading();

  document.getElementById('save-btn').addEventListener('click', savePage);
  document.getElementById('translate-btn').addEventListener('click', runTranslation);

  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderList();
  });

  document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderList();
    });
  });

  document.getElementById('tag-filter').addEventListener('change', e => {
    activeTagFilter = e.target.value;
    renderList();
  });

  document.getElementById('btn-add-tag').addEventListener('click', addTag);
  document.getElementById('tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });

  document.getElementById('modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && editingId) {
      if (document.activeElement === document.getElementById('tag-input')) {
        return; // Don't submit the modal when adding a tag
      }
      saveModal();
    }
  });
}

init();
