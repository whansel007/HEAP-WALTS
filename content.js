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

function getSiteConfig() {
  return SITE_CONFIGS.find(s => s.match.test(location.href));
}

function detectChapter() {
  const site = getSiteConfig();
  if (!site) return null;
  const chapter = site.getChapter();
  return chapter ? parseInt(chapter) : null;
}

function tryUpdate() {
  const chapter = detectChapter();
  const site = getSiteConfig();
  console.log(`[MangaTracker] site: ${site?.name}, chapter: ${chapter}`);
  if (chapter) {
    chrome.runtime.sendMessage({
      type: 'AUTO_UPDATE_CHAPTER',
      url: location.href,
      chapter,
    });
  }
}

// Watch title changes (React/SPA apps set title after load)
const titleEl = document.querySelector('title');
if (titleEl) {
  new MutationObserver(() => tryUpdate()).observe(titleEl, { childList: true });
}

// Watch URL changes (SPA navigation between chapters)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    tryUpdate();
  }
}).observe(document.body, { childList: true, subtree: true });

tryUpdate();