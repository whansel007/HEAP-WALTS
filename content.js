// ── Site configs ──────────────────────────────────────────────────────────────
const SITE_CONFIGS = [
  {
    name: 'MangaDex',
    match: /mangadex\.org/,
    getChapter() {
      return document.title.match(/Chapter\s+(\d+)/i)?.[1] ?? null;
    },
  },
  {
    name: 'MangaPlus',
    match: /mangaplus\.shueisha/,
    getChapter() {
      return document.title.match(/#(\d+)/)?.[1] ?? null;
    },
  },
  {
    name: 'MangaFire',
    match: /mangafire\.to/,
    getChapter() {
      return location.href.match(/chapter-(\d+)/i)?.[1] ?? null;
    },
  },
  {
    name: 'Webtoons',
    match: /webtoons\.com/,
    getChapter() {
      return location.href.match(/episode-(\d+)/i)?.[1] ?? null;
    },
  },
  {
    name: 'TCBScans',
    match: /tcbscans\./,
    getChapter() {
      return location.href.match(/chapter-(\d+)/i)?.[1] ?? null;
    },
  },
  {
    name: 'Generic',
    match: /.*/,
    getChapter() {
      const urlChapter = location.href.match(/chapter[s]?[-\/](\d+)/i)?.[1];
      if (urlChapter) return urlChapter;
      const titleChapter = document.title.match(/ch(?:apter)?\.?\s*(\d+)/i)?.[1];
      if (titleChapter) return titleChapter;
      return null;
    },
  },
];

// ── Detection ─────────────────────────────────────────────────────────────────

function getSiteConfig() {
  return SITE_CONFIGS.find(s => s.match.test(location.href));
}

function detectChapter() {
  const site = getSiteConfig();
  if (!site) return null;
  const chapter = site.getChapter();
  return chapter ? parseInt(chapter) : null;
}

// ── Update ────────────────────────────────────────────────────────────────────

function tryUpdate() {
  const chapter = detectChapter();
  const site = getSiteConfig();
  console.log(`[MangaTracker] site: ${site?.name}, chapter: ${chapter}, title: ${document.title}`);
  if (chapter) {
    chrome.runtime.sendMessage({
      type: 'AUTO_UPDATE_CHAPTER',
      url: location.href,
      title: document.title,
      chapter,
    });
  }
}

// ── Observers ─────────────────────────────────────────────────────────────────

let titleObserver = null;

function attachTitleObserver() {
  if (titleObserver) titleObserver.disconnect();
  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleObserver = new MutationObserver(() => tryUpdate());
    titleObserver.observe(titleEl, { childList: true });
  }
}

// Watch for URL changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    attachTitleObserver();
    tryUpdate();
  }
}).observe(document.body, { childList: true, subtree: true });

// Initial setup
attachTitleObserver();
tryUpdate();
