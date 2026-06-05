document.getElementById('run').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  document.getElementById('status').textContent = 'Running...';

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['scripts/detect.js', 'content.js']
  });

  document.getElementById('status').textContent = 'Done! Check downloads.';
});