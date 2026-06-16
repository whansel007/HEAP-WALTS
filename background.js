console.log('[MangaTracker] background.js loaded');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'AUTO_UPDATE_CHAPTER') return;
  console.log('[MangaTracker] message received:', msg);

  chrome.storage.local.get('bookmarks', (result) => {
    const bookmarks = result.bookmarks || [];

    function getDomain(url) {
      try { return new URL(url).hostname; }
      catch { return null; }
    }

    const msgDomain = getDomain(msg.url);
    const idx = bookmarks.findIndex(b => getDomain(b.url) === msgDomain);

    console.log('[MangaTracker] domain:', msgDomain, 'match index:', idx);
    if (idx === -1) return;
    if (bookmarks[idx].chapter >= msg.chapter) return;

    bookmarks[idx].chapter = msg.chapter;
    bookmarks[idx].status = 'Reading';

    chrome.storage.local.set({ bookmarks }, () => {
      console.log('[MangaTracker] updated chapter to', msg.chapter);
    });
  });
});