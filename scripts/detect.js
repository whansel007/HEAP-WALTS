function detectBubbles(imgElement) {
  return new Promise((resolve) => {
    console.log('detectBubbles called', imgElement.naturalWidth, imgElement.naturalHeight);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    try {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgElement, 0, 0);
      console.log('drawImage done');
    } catch (e) {
      console.error('drawImage failed:', e);
      return;
    }

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log('getImageData done');
    } catch (e) {
      console.error('getImageData failed (probably CORS):', e);
      return;
    }

    const { data, width, height } = imageData;

    const isWhite = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200;
    };

    const isDark = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] < 100;
    };

    const visited = new Set();

    const floodFill = (startX, startY) => {
      const stack = [[startX, startY]];
      let minX = startX, maxX = startX, minY = startY, maxY = startY;
      let count = 0;

      while (stack.length) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (!isWhite(x, y)) continue;

        visited.add(key);
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;

        stack.push([x + 2, y], [x - 2, y], [x, y + 2], [x, y - 2]);
      }

      return { count, minX, maxX, minY, maxY };
    };

    const hasDarkBorder = (x, y, w, h) => {
      let dark = 0, total = 0;
      const m = 6;
      for (let i = x; i < x + w; i += 4) {
        if (y - m >= 0 && isDark(i, y - m)) dark++;
        if (y + h + m < height && isDark(i, y + h + m)) dark++;
        total += 2;
      }
      for (let j = y; j < y + h; j += 4) {
        if (x - m >= 0 && isDark(x - m, j)) dark++;
        if (x + w + m < width && isDark(x + w + m, j)) dark++;
        total += 2;
      }
      return dark / total > 0.1;
    };

    const isUniformWhite = (x, y, w, h) => {
      let white = 0, total = 0;
      for (let j = y + 4; j < y + h - 4; j += 4) {
        for (let i = x + 4; i < x + w - 4; i += 4) {
          if (isWhite(i, j)) white++;
          total++;
        }
      }
      return total > 0 && white / total > 0.6;
    };

    const bubbles = [];
    let stats = { tooSmall: 0, tooBig: 0, aspect: 0, fill: 0, uniform: 0, border: 0, passed: 0 };
    console.log('starting scan...');

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const key = `${x},${y}`;
        if (visited.has(key) || !isWhite(x, y)) continue;

        const { count, minX, maxX, minY, maxY } = floodFill(x, y);
        const bw = maxX - minX, bh = maxY - minY;

        if (count < 100 || bw < 40 || bh < 30) { stats.tooSmall++; continue; }
        if (count > width * height * 0.5) { stats.tooBig++; continue; }
        const aspect = bw / bh;
        if (aspect < 0.1 || aspect > 6) { stats.aspect++; continue; }
        const fillRatio = count / ((bw * bh) / 4);
        if (fillRatio < 0.3) { stats.fill++; continue; }
        if (!isUniformWhite(minX, minY, bw, bh)) { stats.uniform++; continue; }
        if (!hasDarkBorder(minX, minY, bw, bh)) { stats.border++; continue; }

        console.log(`Bubble found at x:${minX} y:${minY} w:${bw} h:${bh}`);
        stats.passed++;
        bubbles.push({ x: minX, y: minY, w: bw, h: bh });
      }
    }

    console.log('Filter stats:', stats);
    console.log(`Total bubbles found: ${bubbles.length}`);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    for (const { x, y, w, h } of bubbles) {
      ctx.strokeRect(x, y, w, h);
    }

    resolve(canvas.toDataURL('image/png'));
  });
}