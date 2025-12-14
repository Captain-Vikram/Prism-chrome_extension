// Offscreen document: receives screenshots (data URLs), extracts color palette + percentages,
// and responds back to the sender via sendResponse. Uses a simple quantization histogram approach.

function rgbToHex(r, g, b) {
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function extractPaletteFromDataUrl(dataUrl, {maxColors = 6, sampleStep = 6, targetWidth = 800} = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          return reject(new Error('Image loaded but has 0 dimensions'));
        }
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const scale = Math.min(1, targetWidth / origW);
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h).data;
        const counts = new Map();
        let total = 0;

        // Quantize to 4 bits per channel (0-15) -> 4096 buckets
        for (let y = 0; y < h; y += sampleStep) {
          for (let x = 0; x < w; x += sampleStep) {
            const i = (y * w + x) * 4;
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];
            if (a === 0) continue; // skip transparent
            const rq = r >> 4;
            const gq = g >> 4;
            const bq = b >> 4;
            const key = (rq << 8) | (gq << 4) | bq;
            counts.set(key, (counts.get(key) || 0) + 1);
            total++;
          }
        }

        if (total === 0) return resolve([]);

        // Convert buckets to array and sort
        const items = Array.from(counts.entries()).map(([key, cnt]) => {
          const rq = (key >> 8) & 0xF;
          const gq = (key >> 4) & 0xF;
          const bq = key & 0xF;
          // representative color approximate: center of bucket
          const r = (rq << 4) + 8;
          const g = (gq << 4) + 8;
          const b = (bq << 4) + 8;
          return { key, cnt, r, g, b };
        });

        items.sort((a, b) => b.cnt - a.cnt);

        // Smart clustering: merge similar colors
        const clusters = [];
        // Threshold of 60 is roughly 13-15% of max distance (441). 
        // This effectively merges shades that are "20% dark or light" relative to each other.
        const threshold = 60; 

        for (const item of items) {
          let merged = false;
          for (const cluster of clusters) {
            const dr = item.r - cluster.r;
            const dg = item.g - cluster.g;
            const db = item.b - cluster.b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            
            if (dist < threshold) {
              cluster.cnt += item.cnt;
              merged = true;
              break;
            }
          }
          if (!merged) {
            clusters.push({ ...item });
          }
        }

        clusters.sort((a, b) => b.cnt - a.cnt);
        const top = clusters.slice(0, maxColors);
        
        const palette = top.map(it => ({
          hex: rgbToHex(it.r, it.g, it.b),
          rgb: [it.r, it.g, it.b],
          count: it.cnt,
          percent: +(100 * it.cnt / total).toFixed(2)
        }));

        resolve({ palette, width: origW, height: origH, sampledPixels: total });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'PROCESS_IMAGE') return false;
  (async () => {
    try {
      const opts = message.options || {};
      const result = await extractPaletteFromDataUrl(message.dataUrl, opts);
      sendResponse({ ok: true, result });
    } catch (err) {
      console.error('Offscreen processor error', err);
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true; // indicates async sendResponse
});
