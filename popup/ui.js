// ============================================================================
// ui.js — RENDERING, EVENT LISTENERS, AND WIRING
//
// RULE FOR THIS FILE: this is where `document` gets touched — building HTML,
// showing/hiding elements, attaching click listeners. It should NOT invent
// business rules (like "is this a duplicate?") — instead it calls a logic.js
// function to find that out, then just displays the result. Think of
// logic.js as the kitchen and this file as the waitstaff: it takes orders
// (clicks), passes them to the kitchen, and brings back what's ready.
// ============================================================================

import {
  state,
  loadBookmarks,
  extractMangaTitle,
  getChapterLabel,
  getCurrentReading,
  getFiltered,
  getAllTags,
  saveCurrentPage,
  deleteBookmarkById,
  addTagToList,
  removeTagAt,
  beginEditing,
  stopEditing,
  saveEditedBookmark,
} from './logic.js';
import { initKanaBoard } from './kana.js';

// ── Toast ─────────────────────────────────────────────────────────────────────
// Shows a small message ("Saved!", "Already saved!") for ~2 seconds.

let toastTimer = null;
function showToast(msg, type = 'ok') {
  const el = document.getElementById('status-toast');
  el.textContent = msg;
  el.className = `status-toast ${type}`; // controls color via CSS (ok/warn/err)
  el.classList.remove('hidden');
  // Cancel any previous hide-timer first — otherwise, showing two toasts
  // quickly could let the FIRST timer hide the SECOND toast too early.
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ── Current reading bar ───────────────────────────────────────────────────────

// This function is intentionally "thin": it asks logic.js's getCurrentReading()
// for the data, and just paints whatever comes back (or hides the bar if
// there's nothing to show). All the actual detection complexity lives in
// logic.js — this file doesn't need to know how it works, just what to draw.
async function renderCurrentReading() {
  const el = document.getElementById('current-reading');
  if (!el) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const reading = tab?.url ? await getCurrentReading(tab.id) : null;

  if (!reading) {
    el.classList.add('hidden');
    return;
  }

  const mangaTitle = extractMangaTitle(reading.title || '');
  const label = getChapterLabel(reading.url, reading.title || '');
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="now-reading-label">Now reading</span>
    <span class="now-reading-title">${mangaTitle}</span>
    <span class="now-reading-chapter">${label} ${reading.chapter}</span>
  `;
}

// ── Render ────────────────────────────────────────────────────────────────────

// Rebuilds the "All Tags" dropdown (and the tag autocomplete list in the
// modal) from whatever tags currently exist across all bookmarks.
function renderTagFilterDropdown() {
  const select = document.getElementById('tag-filter');
  if (!select) return;

  const allTags = getAllTags();
  let html = '<option value="">All Tags</option>';
  allTags.forEach(tag => {
    // Re-mark whichever tag was previously selected so the dropdown doesn't
    // silently reset itself back to "All Tags" every time we re-render.
    const selected = tag === state.activeTagFilter ? 'selected' : '';
    html += `<option value="${tag}" ${selected}>${tag}</option>`;
  });
  select.innerHTML = html;

  const datalist = document.getElementById('existing-tags');
  if (datalist) {
    datalist.innerHTML = allTags.map(t => `<option value="${t}"></option>`).join('');
  }
}

// Turns ONE bookmark object into an HTML string ("card"). Used by renderList
// below via .map(), one call per bookmark.
function bookmarkCardHtml(b) {
  const tagsHtml = b.tags?.length
    ? `<div class="bookmark-tags">${b.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>`
    : '';
  const scheduleHtml = b.updateSchedule
    ? `<div class="bookmark-schedule">📅 ${b.updateSchedule}</div>`
    : '';
  const label = getChapterLabel(b.url, b.title || '');
  const chapterDisplay = b.chapter != null && b.chapter !== 0 ? b.chapter : '—';

  return `
    <div class="bookmark-card" data-id="${b.id}">
      <div class="card-main">
        <a class="card-title" href="${b.url}" target="_blank" title="${b.title || b.url}">${b.title || b.url}</a>
        <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span>
      </div>
      ${tagsHtml}
      ${scheduleHtml}
      <div class="card-meta">
        <span>${label}&nbsp;${chapterDisplay}</span>
        <div class="card-actions">
          <button class="btn-edit" data-id="${b.id}">Edit</button>
          <button class="btn-delete" data-id="${b.id}">✕</button>
        </div>
      </div>
    </div>
  `;
}

// The main render function — redraws the bookmark list based on whatever
// logic.js's getFiltered() currently returns. Called after every action that
// could change what should be visible (save, delete, edit, search, switch tab).
function renderList() {
  const list = document.getElementById('list');
  const empty = document.getElementById('empty-state');
  const filtered = getFiltered(); // ask logic.js what should be shown right now

  renderTagFilterDropdown();

  // Swap the search box's placeholder text to match the active tab
  // (e.g. "Search anime..." vs "Search manga...").
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.placeholder = state.activeMediaType === 'anime' ? 'Search anime...' : 'Search manga...';
  }

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    // Swap the empty-state icon/title/message to match the active tab, so
    // an empty Anime tab reads differently from an empty Manga tab.
    document.getElementById('empty-icon').textContent =
      state.activeMediaType === 'anime' ? '🎬' : '📚';
    document.getElementById('empty-title').textContent =
      state.activeMediaType === 'anime' ? 'No anime saved yet' : 'No manga saved yet';
    document.getElementById('empty-sub').textContent =
      state.activeMediaType === 'anime'
        ? 'Click "+ Save Page" while on an anime episode to add it.'
        : 'Click "+ Save Page" while on a manga chapter to add it.';
    return;
  }

  empty.classList.add('hidden');
  // .map() turns each bookmark into an HTML string; .join('') glues them
  // all into one big block that gets inserted into the page at once.
  list.innerHTML = filtered.map(bookmarkCardHtml).join('');

  // IMPORTANT: setting .innerHTML destroys and recreates every element
  // inside it, which means any OLD click listeners on the old buttons are
  // gone. That's why we re-attach fresh listeners to the new buttons every
  // single time the list is redrawn — skipping this would leave Edit/Delete
  // silently doing nothing.
  list.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.id))
  );
  list.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.id))
  );
}

// ── Save current page ─────────────────────────────────────────────────────────

// This is the pattern used throughout this file: call a logic.js function,
// look at what it returned, then decide how to update the screen. logic.js's
// saveCurrentPage() has no idea toasts exist — this function is the
// translator between "what happened" and "what the user sees."
async function handleSavePage() {
  const result = await saveCurrentPage();

  if (!result.ok) {
    const message = result.reason === 'duplicate' ? 'Already saved!' : 'Cannot save this page';
    showToast(message, result.reason === 'duplicate' ? 'warn' : 'err');
    return;
  }

  renderList();
  showToast('Saved!', 'ok');
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(id) {
  await deleteBookmarkById(id); // logic.js does the actual removal + saving
  renderList();                  // then we redraw to reflect it
}

// ── Edit modal ────────────────────────────────────────────────────────────────

// Redraws the little tag "chips" inside the modal, based on state.modalTags.
function renderModalTags() {
  const container = document.getElementById('modal-tags-container');
  if (!container) return;

  container.innerHTML = state.modalTags.map((tag, idx) => `
    <span class="modal-tag-chip">
      ${tag}
      <button class="btn-remove-tag" data-index="${idx}" type="button">✕</button>
    </span>
  `).join('');

  // Same "re-attach listeners after innerHTML" rule as renderList() above.
  container.querySelectorAll('.btn-remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      removeTagAt(parseInt(btn.dataset.index));
      renderModalTags();
    });
  });
}

function handleAddTag() {
  const input = document.getElementById('tag-input');
  if (!input) return;
  addTagToList(input.value); // logic.js handles trimming/lowercasing/dedup
  renderModalTags();
  input.value = ''; // clear the box regardless of whether it was added
}

// Opens the edit modal for a specific bookmark and fills in the form fields.
function openModal(id) {
  const b = beginEditing(id); // logic.js finds the bookmark + preps modalTags
  if (!b) return;

  document.getElementById('edit-chapter').value = b.chapter || 0;
  document.getElementById('edit-status').value = b.status;
  document.getElementById('edit-schedule').value = b.updateSchedule || '';
  document.getElementById('tag-input').value = '';
  renderModalTags();
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('edit-chapter').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  stopEditing(); // logic.js clears editingId/modalTags
}

async function handleSaveModal() {
  if (!state.editingId) return; // nothing being edited, nothing to do

  const chapter = parseInt(document.getElementById('edit-chapter').value) || 0;
  const status = document.getElementById('edit-status').value;
  const updateSchedule = document.getElementById('edit-schedule').value.trim();

  await saveEditedBookmark({ chapter, status, updateSchedule });
  closeModal();
  renderList();
}

// ── Translation ───────────────────────────────────────────────────────────────

// Injects the OCR/translation content scripts into the active tab on demand
// (rather than having them always running on every page).
async function runTranslation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const btn = document.getElementById('translate-btn');
  btn.textContent = '...';
  btn.disabled = true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/detect.js', 'content.js'],
    });
    showToast('Translation started!', 'ok');
  } catch (e) {
    showToast('Translation failed', 'err');
  } finally {
    btn.textContent = 'Translate';
    btn.disabled = false;
  }
}

// ── Generic "tab group" wiring ─────────────────────────────────────────────────
// Both the status filter buttons (.filter: All/Reading/Later/Finished) and
// the media tabs (.media-tab: Manga/Anime) do the exact same thing when
// clicked: un-highlight every button in the group, highlight the one that
// was clicked, update one property on `state`, then re-render. Rather than
// writing that click-handling logic twice, it's written ONCE here and
// called twice below with different arguments — this avoids duplicating
// near-identical code.
function wireTabGroup(selector, stateKey, dataAttr) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Bracket notation: state[stateKey] means "look up this property name
      // on state" — same as state.activeFilter, just done dynamically using
      // a variable instead of typing the property name directly.
      state[stateKey] = btn.dataset[dataAttr];
      renderList();
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

// Runs once, when the popup first opens (popup.js calls this). Loads saved
// data, draws the initial screen, and attaches every event listener the
// popup needs for the rest of its life.
export async function init() {
  document.getElementById('loading').classList.remove('hidden');
  await loadBookmarks();
  document.getElementById('loading').classList.add('hidden');
  renderList();
  await renderCurrentReading();

  document.getElementById('save-btn').addEventListener('click', handleSavePage);
  document.getElementById('translate-btn').addEventListener('click', runTranslation);

  document.getElementById('search').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderList();
  });

  // One call per tab group — see wireTabGroup's comment above for why this
  // isn't written out twice by hand.
  wireTabGroup('.filter', 'activeFilter', 'filter');
  wireTabGroup('.media-tab', 'activeMediaType', 'mediaType');

  document.getElementById('tag-filter').addEventListener('change', e => {
    state.activeTagFilter = e.target.value;
    renderList();
  });

  document.getElementById('btn-add-tag').addEventListener('click', handleAddTag);
  document.getElementById('tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault(); // stop the browser from doing its default Enter behavior
      handleAddTag();
    }
  });

  document.getElementById('modal-save').addEventListener('click', handleSaveModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    // Only close if the click was on the dark background itself, not on the
    // modal content box inside it (that would make it impossible to click
    // anything inside the modal without closing it).
    if (e.target === document.getElementById('modal')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && state.editingId) {
      if (document.activeElement === document.getElementById('tag-input')) {
        return; // don't submit the whole modal when the user is just adding a tag
      }
      handleSaveModal();
    }
  });

  // Hand off control to kana.js for its own self-contained feature. ui.js
  // doesn't need to know HOW the kana board works, just that calling this
  // one function sets it up.
  initKanaBoard();
}