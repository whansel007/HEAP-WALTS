// content.js - controller

async function run() {
  const images = document.querySelectorAll('img');
  if (images.length === 0) {
    alert('No images found on this page.');
    return;
  }

  for (const img of images) {
    // Skip small images like icons/thumbnails
    if (img.naturalWidth < 200 || img.naturalHeight < 200) continue;

    console.log(`Processing image: ${img.src}`);

    const resultDataUrl = await detectBubbles(img);
    downloadImage(resultDataUrl, img.src);
  }
}

function downloadImage(dataUrl, originalSrc) {
  const filename = 'detected_' + (originalSrc.split('/').pop().split('?')[0] || 'output.png');
  chrome.runtime.sendMessage({ type: 'download', url: dataUrl, filename });
}

run();