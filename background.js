chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'download') {
    // filename already includes 'detected_' prefix — don't add it again
    chrome.downloads.download({ url: msg.url, filename: msg.filename });
  }
});
