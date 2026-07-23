// ============================================================================
// logic.js — DATA, STORAGE, AND BUSINESS RULES
//
// RULE FOR THIS FILE: never touch `document` here (no getElementById,
// innerHTML, etc). This file only cares about DATA — what's saved, what's
// true about a bookmark, what should happen when you save/delete/edit one.
// All screen-drawing lives in ui.js instead. Keeping that split makes each
// file easier to reason about on its own.
// ============================================================================

const DEFAULT_API_KEY = 'manga-tracker-dev-key';
const DEFAULT_API_BASE = 'http://localhost:3001/api';

export async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  return apiBase || DEFAULT_API_BASE;
}

export async function saveSetting(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAnimeTemplate() {
  const { animeTemplate } = await chrome.storage.local.get('animeTemplate');
  const oldDefault1 = 'https://www.miruro.to/watch/101280/{NAME}?ep=1';
  const oldDefault2 = 'https://www.miruro.to/watch/101280/{name}?ep=1';
  if (!animeTemplate || animeTemplate === oldDefault1 || animeTemplate === oldDefault2) {
    return 'https://www.miruro.to/search?query={NAME}';
  }
  return animeTemplate;
}

export async function getMangaTemplate() {
  const { mangaTemplate } = await chrome.storage.local.get('mangaTemplate');
  if (!mangaTemplate) {
    return 'https://mangadex.org/search?q={NAME}';
  }
  return mangaTemplate;
}

// ── Shared state ────────────────────────────────────────────────────────────
// This ONE object holds everything about "what's currently going on" in the
// popup. Both logic.js and ui.js import this exact same object (not a copy),
// so when either file changes a property on it, the other file sees the
// change immediately. This is how the two files stay in sync without needing
// to pass data back and forth constantly.
export const state = {
  bookmarks: [],            // the full list of saved manga/anime
  activeFilter: 'all',      // status filter: 'all' | 'Current' | 'Later' | 'Finished'
  activeMediaType: 'manga', // which tab is selected: 'manga' | 'anime'
  searchQuery: '',          // whatever's currently typed in the search box
  activeTagFilter: '',      // which tag (if any) is selected in the dropdown
  editingId: null,          // id of the bookmark currently open in the edit modal (null = modal closed)
  modalTags: [],            // working copy of tags being edited in the modal (kept separate so Cancel doesn't affect the real bookmark)
};

// ── Storage ───────────────────────────────────────────────────────────────────
// chrome.storage.local is Chrome's built-in database for extensions.
// Data saved here survives closing the popup, closing the browser, everything
// — until it's explicitly deleted or the extension is uninstalled.

// Reads saved bookmarks from storage INTO state.bookmarks.
export async function loadBookmarks() {
  // .get() returns { bookmarks: [...] }. This line pulls that property out
  // and renames it to `stored`, defaulting to [] if nothing's saved yet.
  const { bookmarks: stored = [] } = await chrome.storage.local.get('bookmarks');
  
  // Migrate any old 'Reading' status to the more neutral 'Current' status
  let migrated = false;
  stored.forEach(b => {
    if (b.status === 'Reading') {
      b.status = 'Current';
      migrated = true;
    }
  });

  state.bookmarks = stored;
  
  if (migrated) {
    await persistBookmarks();
  }
}

// Writes the CURRENT state.bookmarks array back out to storage.
export async function persistBookmarks() {
  await chrome.storage.local.set({ bookmarks: state.bookmarks });
}

// Reads a user-set API key if one exists, otherwise falls back to the dev key.
export async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  return apiKey || DEFAULT_API_KEY;
}

// ── Optional backend sync ─────────────────────────────────────────────────────
// Mirrors changes to a local backend server, if one happens to be running.
// This is entirely optional — the extension works fully without it, using
// just chrome.storage.local. That's why any errors here are silently ignored.
export async function syncToBackend(method, path, body) {
  try {
    const key = await getApiKey();
    const base = await getApiBase();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    };
    if (body) opts.body = JSON.stringify(body);
    await fetch(`${base}${path}`, opts);
  } catch (_) {
    // backend is optional — if it's not running, that's fine, do nothing
  }
}

// ── Title / chapter / media-type parsing ──────────────────────────────────────

// Browser tab titles are messy, e.g. "12 | Chapter 6 - One Piece - MangaDex".
// This chains .replace() calls, each stripping one piece of junk, to end up
// with just "One Piece".
export function extractMangaTitle(rawTitle) {
  return rawTitle
    .replace(/^\d+\s*\|\s*/, '')                              // leading "12 | "
    .replace(/(?:chapter|episode)\s*\d+\s*[-–]?\s*/i, '')      // "Chapter 6 - "
    .replace(/ep\s*\d+\s*[-–]?\s*/i, '')                       // "Ep 6 - "
    .replace(/(?:[-–]\s*)?MangaDex\s*$/i, '')                  // trailing site name
    .replace(/(?:[-–]\s*)?MANGA Plus\s*$/i, '')
    .replace(/(?:[-–]\s*)?Miruro\s*$/i, '')
    .replace(/(?:[-–]\s*)?MyAnimeList(?:\.net)?\s*$/i, '')
    .replace(/(?:[-–]|\|)\s*VIZ\s*$/i, '') 
    .trim();
}

// Sites that are always manga, even though their URLs happen to contain
// words like "episode" that would otherwise trigger the anime/Ep. guess
// below (e.g. Shonen Jump+ uses /episode/12345 in its URLs for CHAPTERS).
const FORCE_MANGA_SITES = [
  /shonenjumpplus\.com/,
  /viz\.com/,
];

// Decides whether something should be labeled "Ep." (episode-based, anime)
// or "Ch." (chapter-based, manga) by checking known site URL/title patterns.
export function getChapterLabel(url, title = '') {
  if (FORCE_MANGA_SITES.some(p => p.test(url || ''))) {
    return 'Ch.';
  }
  
  const isEpisodeStyle =
    (url || '').toLowerCase().includes('miruro.to') ||
    /[?&](?:ep|episode)=/i.test(url) ||
    /(?:ep|episode)[s]?[-\/]\d+/i.test(url) ||
    /ep(?:isode)?\.?\s*\d+/i.test(title);

  return isEpisodeStyle ? 'Ep.' : 'Ch.';
}

// Figures out whether a bookmark is 'anime' or 'manga'.
// New bookmarks get a `mediaType` field set directly when they're saved
// (see saveCurrentPage below). Older bookmarks saved before this feature
// existed won't have that field, so this function falls back to re-deriving
// it from the same Ep./Ch. logic used elsewhere. This kind of "if the new
// field exists use it, otherwise compute it the old way" check is a common
// pattern when adding a feature to an app that already has saved data.
export function getMediaType(bookmark) {
  if (bookmark.mediaType) return bookmark.mediaType;
  return getChapterLabel(bookmark.url, bookmark.title || '') === 'Ep.' ? 'anime' : 'manga';
}

// ── Current reading detection ─────────────────────────────────────────────────

// Tries to figure out what chapter/episode the given tab is currently on.
// Plan A: actively detect it right now (detectChapterOnTab, below).
// Plan B: if that fails, fall back to whatever was last detected, but only
// if it's less than 10 minutes old — otherwise it's probably stale.
// Returns { chapter, title, url } or null if nothing usable is available.
export async function getCurrentReading(tabId) {
  const detected = await detectChapterOnTab(tabId);
  if (detected) return detected;

  const { currentReading } = await chrome.storage.local.get('currentReading');
  if (!currentReading) return null;

  const age = Date.now() - currentReading.updatedAt;
  if (age > 10 * 60 * 1000) return null; // 10 * 60 * 1000 ms = 10 minutes

  return currentReading;
}

// NOT exported — this is a private helper only used by getCurrentReading
// above. Nothing outside this file needs to call it directly.
async function detectChapterOnTab(tabId) {
  try {
    // chrome.scripting.executeScript runs the given function INSIDE the
    // actual webpage (not inside the extension popup). That's why the
    // function body below can use `location.href` and `document.title` —
    // those refer to the manga/anime site's page, not our popup.
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = location.href;
        const title = document.title;
        let chapter = null;

        // Site-specific patterns first (more reliable)...
        if (/mangadex\.org/.test(url)) {
          chapter = title.match(/Chapter\s+(\d+)/i)?.[1];
        } else if (/mangaplus\.shueisha/.test(url)) {
          chapter = title.match(/#(\d+)/)?.[1];
        } else if (/mangafire\.to/.test(url) || /tcbscans\./.test(url)) {
          chapter = url.match(/chapter-(\d+)/i)?.[1];
        } else if (/webtoons\.com/.test(url)) {
          chapter = url.match(/episode-(\d+)/i)?.[1];
        } else if (/shonenjumpplus\.com/.test(url)) {
          chapter = title.match(/第(\d+)話/)?.[1];
        }

        // ...then generic fallback patterns if none of those matched.
        if (!chapter) {
          chapter = url.match(/[?&](?:ep|episode)=(\d+)(?:[&#]|$)/i)?.[1]
            || url.match(/(?:ep|episode)[s]?[-\/](\d+)/i)?.[1]
            || url.match(/chapter[s]?[-\/](\d+)/i)?.[1]
            || title.match(/ch(?:apter)?\.?\s*(\d+)/i)?.[1]
            || title.match(/ep(?:isode)?\.?\s*(\d+)/i)?.[1]
            || title.match(/Chapter\s+(\d+)/i)?.[1]
            || title.match(/#(\d+)/)?.[1];
        }

        return { chapter: chapter ? parseInt(chapter) : null, title, url };
      },
    });

    const { chapter, title, url } = results[0].result;
    if (!chapter) return null;

    // Remember this so getCurrentReading can fall back to it later even if
    // the user switches to a tab where detection doesn't work.
    const reading = { url, title, chapter, updatedAt: Date.now() };
    await chrome.storage.local.set({ currentReading: reading });
    return reading;
  } catch (_) {
    // Tab probably isn't a manga/anime page, or script injection failed
    // (e.g. chrome:// pages don't allow it). Either way, just report "nothing found."
    return null;
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

// Returns only the bookmarks that should currently be visible, based on
// EVERYTHING in state at once: active tab, status filter, search text, tag.
// .filter() keeps an item only if the callback returns true for it.
export function getFiltered() {
  return state.bookmarks.filter(b => {
    const matchMediaType = getMediaType(b) === state.activeMediaType;
    const matchFilter = state.activeFilter === 'all' || b.status === state.activeFilter;
    const matchSearch = (b.title || '').toLowerCase().includes(state.searchQuery.toLowerCase());
    const matchTag = !state.activeTagFilter || (b.tags && b.tags.includes(state.activeTagFilter));
    // A bookmark only survives if ALL FOUR conditions are true.
    return matchMediaType && matchFilter && matchSearch && matchTag;
  });
}

// Collects every unique tag across all bookmarks, alphabetically sorted.
// Used to populate the tag filter dropdown and the tag autocomplete list.
export function getAllTags() {
  const allTags = new Set(); // Set automatically ignores duplicates
  state.bookmarks.forEach(b => {
    if (b.tags) b.tags.forEach(t => allTags.add(t));
  });
  return Array.from(allTags).sort();
}

// ── Save current page ─────────────────────────────────────────────────────────

// Saves whatever page is currently open as a new bookmark.
// Notice this function does NOT show a toast or touch the screen — it just
// returns a plain object describing what happened. It's up to ui.js to
// decide how to display that result. This keeps logic.js screen-free.
//
// Returns { ok: true, bookmark } on success,
//      or { ok: false, reason: 'invalid' | 'duplicate' } on failure.
export async function saveCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url = tab.url;
  const title = tab.title || url;

  if (!url.startsWith('http')) {
    return { ok: false, reason: 'invalid' }; // e.g. a chrome:// page
  }

  const malAnimeMatch = url.match(/myanimelist\.net\/anime\/(\d+)\/([^/?#]+)/i);
  const malMangaMatch = url.match(/myanimelist\.net\/manga\/(\d+)\/([^/?#]+)/i);
  let detectedMediaType = null;

  if (malAnimeMatch) {
    const rawName = malAnimeMatch[2];
    const name = rawName.replace(/_/g, '+');
    const template = await getAnimeTemplate();
    url = template.replace(/\{name\}/i, name);
    detectedMediaType = 'anime';
  } else if (malMangaMatch) {
    const rawName = malMangaMatch[2];
    const name = rawName.replace(/_/g, '+');
    const template = await getMangaTemplate();
    url = template.replace(/\{name\}/i, name);
    detectedMediaType = 'manga';
  }

  if (state.bookmarks.find(b => b.url === url)) {
    return { ok: false, reason: 'duplicate' };
  }

  // If we already detected a chapter for this exact URL, reuse it.
  const { currentReading } = await chrome.storage.local.get('currentReading');
  let currentChapter = currentReading?.url === url ? currentReading.chapter : 0;

  if (malAnimeMatch && currentChapter === 0) {
    const epMatch = url.match(/[?&](?:ep|episode)=(\d+)/i);
    if (epMatch) {
      currentChapter = parseInt(epMatch[1]) || 1;
    }
  } else if (malMangaMatch && currentChapter === 0) {
    const chMatch = url.match(/[?&](?:ch|chapter)=(\d+)/i);
    if (chMatch) {
      currentChapter = parseInt(chMatch[1]) || 1;
    }
  }

  const { defaultStatus = 'Later' } = await chrome.storage.local.get('defaultStatus');

  // THE BOOKMARK OBJECT STRUCTURE IS OVER HERE YOOO!!!!! RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGHHHHHHHHHHHH
  const bookmark = {
    id: Date.now().toString(), // timestamp as a quick unique id
    url,
    title,
    mangaTitle: extractMangaTitle(title),
    mediaType: detectedMediaType || (getChapterLabel(url, title) === 'Ep.' ? 'anime' : 'manga'),
    chapter: currentChapter,
    status: defaultStatus,
    tags: [],
    updateSchedule: '',
    savedAt: new Date().toISOString(),
  };

  state.bookmarks.unshift(bookmark); // add to the FRONT (newest first)
  await persistBookmarks();
  syncToBackend('POST', '/bookmarks', bookmark);

  return { ok: true, bookmark };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteBookmarkById(id) {
  // .filter() returns a NEW array excluding the matching bookmark — arrays
  // in JS don't have a built-in "remove by value" method, so filtering out
  // everything except what you want to keep is the standard approach.
  state.bookmarks = state.bookmarks.filter(b => b.id !== id);
  await persistBookmarks();
  syncToBackend('DELETE', `/bookmarks/${id}`);
}

// ── Edit / modal-related logic ────────────────────────────────────────────────
// These functions manage the "working copy" of tags (state.modalTags) used
// while the edit modal is open, separate from the bookmark's real tags until
// Save is clicked. This means clicking Cancel can just discard modalTags
// without needing to undo anything.

export function addTagToList(tag) {
  const clean = tag.trim().toLowerCase();
  if (clean && !state.modalTags.includes(clean)) {
    state.modalTags.push(clean);
  }
}

export function removeTagAt(index) {
  state.modalTags.splice(index, 1); // remove 1 item at position `index`
}

// Call when opening the modal for a given bookmark id.
// Returns the bookmark being edited, or null if it wasn't found.
export function beginEditing(id) {
  const b = state.bookmarks.find(b => b.id === id);
  if (!b) return null;
  state.editingId = id;
  // [...b.tags] makes a COPY of the array (the spread operator), not a
  // reference to the original — so editing modalTags won't accidentally
  // change the real bookmark until saveEditedBookmark runs.
  state.modalTags = b.tags ? [...b.tags] : [];
  return b;
}

// Call when closing the modal without saving (Cancel, Escape, click outside).
export function stopEditing() {
  state.editingId = null;
  state.modalTags = [];
}

export async function saveEditedBookmark({ title, url, chapter, status, updateSchedule, mediaType }) {
  const idx = state.bookmarks.findIndex(b => b.id === state.editingId);
  if (idx === -1) return false;

  // { ...state.bookmarks[idx], chapter, status, ... } spreads all the
  // EXISTING fields of the bookmark, then overwrites just the ones we're
  // editing — a common "update a few fields, keep the rest" pattern.
  state.bookmarks[idx] = {
    ...state.bookmarks[idx],
    title,
    url,
    mangaTitle: extractMangaTitle(title),
    chapter,
    status,
    updateSchedule,
    mediaType,
    tags: [...state.modalTags],
  };

  await persistBookmarks();
  syncToBackend('PUT', `/bookmarks/${state.editingId}`, {
    title,
    url,
    chapter,
    status,
    updateSchedule,
    mediaType,
    tags: [...state.modalTags],
  });

  return true;
}

export async function clearAllBookmarks() {
  state.bookmarks = [];
  await persistBookmarks();
}

export async function importBookmarks(newBookmarks) {
  if (!Array.isArray(newBookmarks)) {
    throw new Error('Not a valid bookmarks array');
  }

  // Validate that each item has the minimum fields
  const isValid = newBookmarks.every(b => b && typeof b === 'object' && b.id && b.url && b.title);
  if (!isValid) {
    throw new Error('Missing required bookmark fields (id, url, title)');
  }

  // Set of imported IDs to identify overlap with existing bookmarks
  const importedIds = new Set(newBookmarks.map(b => b.id));

  // Map and sanitize the imported bookmarks, preserving their order in the JSON file
  const processedNew = newBookmarks.map(b => ({
    id: b.id,
    url: b.url,
    title: b.title,
    mangaTitle: b.mangaTitle || extractMangaTitle(b.title),
    mediaType: b.mediaType || (getChapterLabel(b.url, b.title) === 'Ep.' ? 'anime' : 'manga'),
    chapter: typeof b.chapter === 'number' ? b.chapter : parseInt(b.chapter) || 0,
    status: b.status || 'Later',
    tags: Array.isArray(b.tags) ? b.tags : [],
    updateSchedule: b.updateSchedule || '',
    savedAt: b.savedAt || new Date().toISOString(),
  }));

  // Keep existing bookmarks that were NOT in the imported list, in their current order
  const remainingExisting = state.bookmarks.filter(b => !importedIds.has(b.id));

  // Combine lists: imported bookmarks first (keeping JSON file order), then remaining existing ones
  state.bookmarks = [...processedNew, ...remainingExisting];

  await persistBookmarks();
  return true;
}

export async function updateBookmarkToCurrentTab(id) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    return { ok: false, reason: 'invalid_tab' };
  }

  const url = tab.url;
  const title = tab.title || url;

  // Run chapter detection
  const reading = await getCurrentReading(tab.id);
  let chapter = reading ? reading.chapter : 0;

  const idx = state.bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return { ok: false, reason: 'not_found' };

  // Parse and transform MyAnimeList URLs if applicable
  let transformedUrl = url;
  let mediaType = getChapterLabel(url, title) === 'Ep.' ? 'anime' : 'manga';

  const malAnimeMatch = url.match(/myanimelist\.net\/anime\/(\d+)\/([^/?#]+)/i);
  const malMangaMatch = url.match(/myanimelist\.net\/manga\/(\d+)\/([^/?#]+)/i);

  if (malAnimeMatch) {
    const rawName = malAnimeMatch[2];
    const name = rawName.replace(/_/g, '+');
    const template = await getAnimeTemplate();
    transformedUrl = template.replace(/\{name\}/i, name);
    mediaType = 'anime';
    if (chapter === 0) {
      const epMatch = transformedUrl.match(/[?&](?:ep|episode)=(\d+)/i);
      chapter = epMatch ? parseInt(epMatch[1]) : 1;
    }
  } else if (malMangaMatch) {
    const rawName = malMangaMatch[2];
    const name = rawName.replace(/_/g, '+');
    const template = await getMangaTemplate();
    transformedUrl = template.replace(/\{name\}/i, name);
    mediaType = 'manga';
    if (chapter === 0) {
      const chMatch = transformedUrl.match(/[?&](?:ch|chapter)=(\d+)/i);
      chapter = chMatch ? parseInt(chMatch[1]) : 1;
    }
  }

  state.bookmarks[idx] = {
    ...state.bookmarks[idx],
    url: transformedUrl,
    title,
    mangaTitle: extractMangaTitle(title),
    chapter: chapter || state.bookmarks[idx].chapter, // maintain old chapter count if 0
    mediaType,
  };

  await persistBookmarks();
  syncToBackend('PUT', `/bookmarks/${id}`, state.bookmarks[idx]);

  return { ok: true, bookmark: state.bookmarks[idx] };
}

export async function reorderBookmarks(newOrderIds) {
  const visibleIndices = [];
  state.bookmarks.forEach((b, index) => {
    if (newOrderIds.includes(b.id)) {
      visibleIndices.push(index);
    }
  });

  const visibleMap = new Map();
  state.bookmarks.forEach(b => {
    if (newOrderIds.includes(b.id)) {
      visibleMap.set(b.id, b);
    }
  });

  newOrderIds.forEach((id, i) => {
    const originalIndex = visibleIndices[i];
    state.bookmarks[originalIndex] = visibleMap.get(id);
  });

  await persistBookmarks();
}