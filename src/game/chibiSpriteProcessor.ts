import boysSet1Url from '../assets/images/chibi_3d_thcs_boys_set1_1795421239384.jpg';
import boysSet2Url from '../assets/images/chibi_3d_thcs_boys_set2_1795421238730.jpg';
import girlsSet1Url from '../assets/images/chibi_3d_thcs_girls_set1_1795421238237.jpg';
import girlsSet2Url from '../assets/images/chibi_3d_thcs_girls_set2_1795421239505.jpg';

/**
 * Extracts all 20 full-body Cute 3D Chibi THCS (middle-school, ages 11–15)
 * student characters from 4 studio lineup sheets into individual transparent-background
 * PNG sprites with tight bounds, anti-aliased edge feathering, natural height ratios,
 * and consistent right-facing stride direction.
 */

export interface ProcessedChibiSprite {
  id: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  /** Relative height compared to average THCS student height (0.88..1.12) */
  heightRatio: number;
  /** Flip horizontally when walking/running left-to-right on the road */
  flipX: boolean;
  /** Vertical ratio (0..1) separating upper body/skirt from articulated lower legs */
  legSplitYRatio: number;
  /** Horizontal center-of-mass ratio (0..1) between left and right legs */
  legCenterXRatio: number;
}

interface SheetConfig {
  url: string;
  startId: number;
  count: number;
}

const CHIBI_3D_SHEETS: SheetConfig[] = [
  {
    url: boysSet1Url,
    startId: 0,
    count: 5,
  },
  {
    url: boysSet2Url,
    startId: 5,
    count: 5,
  },
  {
    url: girlsSet1Url,
    startId: 10,
    count: 5,
  },
  {
    url: girlsSet2Url,
    startId: 15,
    count: 5,
  },
];

// Characters whose original studio pose strides left — flip horizontally on the road so they run toward the gate on the right
const RIGHT_FACING_FLIP_IDS = new Set<number>([8, 14, 18, 19]);

let spriteCache: Record<number, ProcessedChibiSprite> = {};
let loadPromise: Promise<Record<number, ProcessedChibiSprite>> | null = null;
const listeners = new Set<() => void>();

export function getCachedChibi3DSprite(
  variantId: number
): ProcessedChibiSprite | null {
  return spriteCache[variantId] ?? null;
}

export function getAllCachedChibi3DSprites(): Record<number, ProcessedChibiSprite> {
  return spriteCache;
}

export function subscribeChibi3DSprites(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

function isNearStudioWhite(r: number, g: number, b: number): boolean {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  return minC >= 242 && maxC - minC <= 12;
}

function isStrictStudioWhite(r: number, g: number, b: number): boolean {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  return minC >= 250 && maxC - minC <= 4;
}

function loadHtmlImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function findHorizontalCharacterSpans(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  expectedCount: number
): Array<[number, number]> {
  const colHasContent = new Uint8Array(w);
  // Sample rows densely to detect any non-white character pixels in each column
  for (let x = 0; x < w; x++) {
    let hits = 0;
    for (let y = 0; y < h; y += 2) {
      const i = (y * w + x) * 4;
      if (!isNearStudioWhite(data[i], data[i + 1], data[i + 2])) {
        hits++;
        if (hits >= 3) {
          colHasContent[x] = 1;
          break;
        }
      }
    }
  }

  // Merge tiny 1..4px anti-aliasing gaps within a single character
  const spans: Array<[number, number]> = [];
  let inSpan = false;
  let start = 0;
  let gap = 0;

  for (let x = 0; x < w; x++) {
    if (colHasContent[x]) {
      if (!inSpan) {
        inSpan = true;
        start = x;
      }
      gap = 0;
    } else if (inSpan) {
      gap++;
      if (gap > 5) {
        spans.push([start, x - gap]);
        inSpan = false;
      }
    }
  }
  if (inSpan) {
    spans.push([start, w - 1]);
  }

  // Filter out tiny noise specks (< 3.5% of sheet width)
  const minWidth = Math.max(16, Math.floor(w * 0.035));
  const valid = spans.filter(([x0, x1]) => x1 - x0 >= minWidth);

  if (valid.length === expectedCount) {
    return valid;
  }

  // If slightly more spans (e.g. a detached waving hand or ribbon), pick/merge or fall back cleanly
  if (valid.length > expectedCount) {
    // Merge closest adjacent spans until expectedCount remain
    const merged = [...valid];
    while (merged.length > expectedCount) {
      let bestIdx = 0;
      let smallestGap = Infinity;
      for (let i = 0; i < merged.length - 1; i++) {
        const dist = merged[i + 1][0] - merged[i][1];
        if (dist < smallestGap) {
          smallestGap = dist;
          bestIdx = i;
        }
      }
      merged.splice(bestIdx, 2, [merged[bestIdx][0], merged[bestIdx + 1][1]]);
    }
    return merged;
  }

  // Fallback: evenly split into 5 vertical slices
  const step = w / expectedCount;
  return Array.from({ length: expectedCount }, (_, idx) => [
    Math.floor(idx * step),
    Math.floor((idx + 1) * step) - 1,
  ]);
}

function extractTransparentCharacter(
  sheetCanvas: HTMLCanvasElement,
  x0: number,
  x1: number,
  variantId: number
): ProcessedChibiSprite | null {
  const pad = 4;
  const srcX = Math.max(0, x0 - pad);
  const srcW = Math.min(sheetCanvas.width - srcX, x1 - x0 + 1 + pad * 2);
  const srcH = sheetCanvas.height;

  const work = document.createElement('canvas');
  work.width = srcW;
  work.height = srcH;
  const wCtx = work.getContext('2d', { willReadFrequently: true });
  if (!wCtx) return null;

  wCtx.drawImage(sheetCanvas, srcX, 0, srcW, srcH, 0, 0, srcW, srcH);
  const imgData = wCtx.getImageData(0, 0, srcW, srcH);
  const data = imgData.data;

  const visited = new Uint8Array(srcW * srcH);
  const isBg = new Uint8Array(srcW * srcH);
  const queue = new Int32Array(srcW * srcH);
  let head = 0;
  let tail = 0;

  const enqueueIfBg = (x: number, y: number, strict = false) => {
    const idx = y * srcW + x;
    if (visited[idx]) return;
    const p = idx * 4;
    const match = strict
      ? isStrictStudioWhite(data[p], data[p + 1], data[p + 2])
      : isNearStudioWhite(data[p], data[p + 1], data[p + 2]);
    if (match) {
      visited[idx] = 1;
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Seed BFS from entire outer perimeter of the character slice
  for (let x = 0; x < srcW; x++) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, srcH - 1);
  }
  for (let y = 0; y < srcH; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(srcW - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % srcW;
    const y = (idx - x) / srcW;

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x < srcW - 1) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y < srcH - 1) enqueueIfBg(x, y + 1);
  }

  // Also clear enclosed flat-white arm/strap gaps (strict pure #FFFFFF only so shaded white shirts stay 100% solid!)
  const interiorChecked = new Uint8Array(srcW * srcH);
  const pocketQueue = new Int32Array(srcW * srcH);
  for (let y = Math.floor(srcH * 0.25); y < Math.floor(srcH * 0.85); y += 2) {
    for (let x = 2; x < srcW - 2; x += 2) {
      const startIdx = y * srcW + x;
      if (isBg[startIdx] || interiorChecked[startIdx]) continue;
      const p0 = startIdx * 4;
      if (!isStrictStudioWhite(data[p0], data[p0 + 1], data[p0 + 2])) continue;

      let pHead = 0;
      let pTail = 0;
      pocketQueue[pTail++] = startIdx;
      interiorChecked[startIdx] = 1;

      while (pHead < pTail) {
        const cur = pocketQueue[pHead++];
        const cx = cur % srcW;
        const cy = (cur - cx) / srcW;
        const neighbors = [
          cx > 0 ? cur - 1 : -1,
          cx < srcW - 1 ? cur + 1 : -1,
          cy > 0 ? cur - srcW : -1,
          cy < srcH - 1 ? cur + srcW : -1,
        ];
        for (const n of neighbors) {
          if (n < 0 || isBg[n] || interiorChecked[n]) continue;
          const np = n * 4;
          if (isStrictStudioWhite(data[np], data[np + 1], data[np + 2])) {
            interiorChecked[n] = 1;
            pocketQueue[pTail++] = n;
          }
        }
      }

      // Only erase crisp flat-white enclosed studio gaps (e.g. arm-torso loop >= 18px)
      if (pTail >= 18) {
        for (let k = 0; k < pTail; k++) {
          isBg[pocketQueue[k]] = 1;
        }
      }
    }
  }

  // Apply transparency to background pixels & gentle 1px feathering on bright white outer rim
  let minX = srcW;
  let minY = srcH;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const idx = y * srcW + x;
      const p = idx * 4;
      if (isBg[idx]) {
        data[p + 3] = 0;
      } else {
        // Check 4-connected neighbors for background adjacency
        let touchesBg = false;
        if (
          (x > 0 && isBg[idx - 1]) ||
          (x < srcW - 1 && isBg[idx + 1]) ||
          (y > 0 && isBg[idx - srcW]) ||
          (y < srcH - 1 && isBg[idx + srcW])
        ) {
          touchesBg = true;
        }

        if (touchesBg) {
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const minC = Math.min(r, g, b);
          const chroma = Math.max(r, g, b) - minC;
          if (minC >= 224 && chroma <= 18) {
            const fade = Math.max(0, Math.min(1, (246 - minC) / 22));
            data[p + 3] = Math.round(fade * 255);
          }
        }

        if (data[p + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null;

  wCtx.putImageData(imgData, 0, 0);

  const cropPad = 2;
  const cx = Math.max(0, minX - cropPad);
  const cy = Math.max(0, minY - cropPad);
  const cw = Math.min(srcW - cx, maxX - minX + 1 + cropPad * 2);
  const ch = Math.min(srcH - cy, maxY - minY + 1 + cropPad * 2);

  // Normalize sprite output resolution so canvas drawImage & PNG download stay super crisp & lightweight
  const maxOutH = 380;
  const scale = ch > maxOutH ? maxOutH / ch : 1;
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(work, cx, cy, cw, ch, 0, 0, outW, outH);

  // Measure horizontal center-of-mass of the lower leg band (bottom 26%) so left/right legs split cleanly
  const legSplitYRatio = variantId < 10 ? 0.69 : 0.73;
  const legStartY = Math.max(0, Math.floor(outH * legSplitYRatio));
  let weightedXSum = 0;
  let legPixelCount = 0;
  try {
    const legData = outCtx.getImageData(0, legStartY, outW, Math.max(1, outH - legStartY)).data;
    const legRows = Math.max(1, outH - legStartY);
    for (let ly = 0; ly < legRows; ly += 2) {
      for (let lx = 0; lx < outW; lx += 2) {
        const a = legData[(ly * outW + lx) * 4 + 3];
        if (a > 60) {
          weightedXSum += lx;
          legPixelCount++;
        }
      }
    }
  } catch {
    // Fallback cleanly to horizontal center if read fails
  }
  const rawCenterX = legPixelCount > 10 ? weightedXSum / legPixelCount / outW : 0.5;
  const legCenterXRatio = Math.max(0.36, Math.min(0.64, rawCenterX));

  return {
    id: variantId,
    canvas: outCanvas,
    dataUrl: outCanvas.toDataURL('image/png'),
    width: outW,
    height: outH,
    heightRatio: ch, // Temporarily store raw pixel height; normalized across all 20 sprites below
    flipX: RIGHT_FACING_FLIP_IDS.has(variantId),
    legSplitYRatio,
    legCenterXRatio,
  };
}

/**
 * Loads and extracts all 20 individual transparent Cute 3D Chibi THCS student sprites.
 */
export function loadChibi3DSprites(): Promise<Record<number, ProcessedChibiSprite>> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const rawSprites: ProcessedChibiSprite[] = [];

    await Promise.all(
      CHIBI_3D_SHEETS.map(async (sheet) => {
        const img = await loadHtmlImage(sheet.url);
        if (!img || img.naturalWidth === 0) return;

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = w;
        sheetCanvas.height = h;
        const sCtx = sheetCanvas.getContext('2d', { willReadFrequently: true });
        if (!sCtx) return;

        sCtx.drawImage(img, 0, 0);
        const fullData = sCtx.getImageData(0, 0, w, h).data;
        const spans = findHorizontalCharacterSpans(fullData, w, h, sheet.count);

        spans.forEach(([x0, x1], idx) => {
          const id = sheet.startId + idx;
          const sprite = extractTransparentCharacter(sheetCanvas, x0, x1, id);
          if (sprite) {
            rawSprites.push(sprite);
          }
        });
      })
    );

    if (rawSprites.length > 0) {
      const avgRawHeight =
        rawSprites.reduce((sum, s) => sum + s.heightRatio, 0) / rawSprites.length;

      const nextCache: Record<number, ProcessedChibiSprite> = {};
      for (const s of rawSprites) {
        const normalizedRatio = Math.max(
          0.88,
          Math.min(1.12, s.heightRatio / Math.max(1, avgRawHeight))
        );
        nextCache[s.id] = {
          ...s,
          heightRatio: normalizedRatio,
        };
      }
      spriteCache = nextCache;
      notifyListeners();
    }

    return spriteCache;
  })();

  return loadPromise;
}
