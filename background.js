chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'download') {
    chrome.downloads.download({ url: msg.url, filename: 'detected_' + msg.filename });
  }
});