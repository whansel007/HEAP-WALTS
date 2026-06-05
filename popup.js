// popup.js — reading list manager

const API_BASE = 'http://localhost:3001/api';
const DEFAULT_API_KEY = 'manga-tracker-dev-key';

let bookmarks = [];
let activeFilter = 'all';
let searchQuery = '';
let editingId = null;

// ── Storage ──────────────────────────────────────────────────────────────────

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

// ── Optional backend sync (fails silently — local storage is primary) ────────

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

// ── Render ────────────────────────────────────────────────────────────────────

function getFiltered() {
  return bookmarks.filter(b => {
    const matchFilter = activeFilter === 'all' || b.status === activeFilter;
    const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });
}

function renderList() {
  const list = document.getElementById('list');
  const empty = document.getElementById('empty-state');
  const filtered = getFiltered();

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = filtered.map(b => `
    <div class="bookmark-card" data-id="${b.id}">
      <div class="card-main">
        <a class="card-title" href="${b.url}" target="_blank" title="${b.title}">${b.title}</a>
        <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span>
      </div>
      <div class="card-meta">
        <span>Ch.&nbsp;${b.chapter || '—'}</span>
        <div class="card-actions">
          <button class="btn-edit" data-id="${b.id}">Edit</button>
          <button class="btn-delete" data-id="${b.id}">✕</button>
        </div>
      </div>
    </div>
  `).join('');

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

  if (bookmarks.find(b => b.url === url)) {
    showToast('Already saved!', 'warn');
    return;
  }

  const bookmark = {
    id: Date.now().toString(),
    url,
    title,
    chapter: 0,
    status: 'Later',
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

function openModal(id) {
  const b = bookmarks.find(b => b.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('edit-chapter').value = b.chapter || 0;
  document.getElementById('edit-status').value = b.status;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('edit-chapter').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editingId = null;
}

async function saveModal() {
  if (!editingId) return;
  const chapter = parseInt(document.getElementById('edit-chapter').value) || 0;
  const status = document.getElementById('edit-status').value;

  const idx = bookmarks.findIndex(b => b.id === editingId);
  if (idx === -1) return;
  bookmarks[idx] = { ...bookmarks[idx], chapter, status };

  await persistBookmarks();
  syncToBackend('PUT', `/bookmarks/${editingId}`, { chapter, status });
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

// ── Translation (existing pipeline) ──────────────────────────────────────────

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

  document.getElementById('modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && editingId) saveModal();
  });
}

init();
