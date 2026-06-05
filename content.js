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

// function downloadImage(dataUrl, originalSrc) {
//   const filename = 'detected_' + (originalSrc.split('/').pop().split('?')[0] || 'output.png');
//   chrome.runtime.sendMessage({ type: 'download', url: dataUrl, filename });
// }

function downloadImage(dataUrl, originalSrc) {
  // 1. Extract the base name from the URL
  let baseName = originalSrc.split('/').pop().split('?')[0];
  
  // 2. Fallback if the URL ends in a slash or is empty
  if (!baseName) { baseName = 'output.png'; }
  
  // 3. Ensure it ends with an image extension (e.g., if originalSrc had no extension)
  if (!baseName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
    baseName += '.png'; // Default fallback extension
  }

  const filename = 'detected_' + baseName;
  
  // 4. Send to background script
  chrome.runtime.sendMessage({ type: 'download', url: dataUrl, filename });
}

run();
