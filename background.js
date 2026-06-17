console.log('[MangaTracker] background.js loaded');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'AUTO_UPDATE_CHAPTER') return;
  console.log('[MangaTracker] message received:', msg);

  chrome.storage.local.set({
    currentReading: {
      url: msg.url,
      title: msg.title,
      chapter: msg.chapter,
      updatedAt: Date.now(),
    }
  }, () => {
    console.log('[MangaTracker] current reading updated to ch.', msg.chapter);
  });
});