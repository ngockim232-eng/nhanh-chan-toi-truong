export interface DogPartCanvas {
  canvas: HTMLCanvasElement;
  /** Normalized pivot point (0..1 of full dog width/height) */
  pivotX: number;
  pivotY: number;
}

export interface DogSpriteParts {
  tail: DogPartCanvas;
  backLeftLeg: DogPartCanvas;
  backRightLeg: DogPartCanvas;
  torso: DogPartCanvas;
  frontLeftLeg: DogPartCanvas;
  frontRightLeg: DogPartCanvas;
  head: DogPartCanvas;
}

export interface ProcessedDogSprite {
  canvas: HTMLCanvasElement;
  parts: DogSpriteParts;
  dataUrl: string;
  width: number;
  height: number;
}

let cachedPromise: Promise<ProcessedDogSprite | null> | null = null;

type Point = [number, number];

function createMaskedPart(
  source: HTMLCanvasElement,
  polygonNorm: Point[],
  pivotX: number,
  pivotY: number,
  featherPx = 2.5
): DogPartCanvas {
  const w = source.width;
  const h = source.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return { canvas: out, pivotX, pivotY };

  ctx.save();
  ctx.beginPath();
  polygonNorm.forEach(([u, v], idx) => {
    const px = u * w;
    const py = v * h;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  if (featherPx > 0 && 'filter' in ctx) {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.filter = `blur(${featherPx}px)`;
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(source, 0, 0);
  } else {
    ctx.clip();
    ctx.drawImage(source, 0, 0);
  }
  ctx.restore();

  return { canvas: out, pivotX, pivotY };
}

function createTorsoCanvas(
  source: HTMLCanvasElement,
  cutPolygonsNorm: Point[][]
): DogPartCanvas {
  const w = source.width;
  const h = source.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return { canvas: out, pivotX: 0.48, pivotY: 0.56 };

  ctx.drawImage(source, 0, 0);

  // Erase only the free-standing lower legs & tail so solid upper chest/shoulder/neck remains behind moving limbs & head
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  if ('filter' in ctx) {
    ctx.filter = 'blur(2px)';
  }
  ctx.fillStyle = '#000000';
  for (const poly of cutPolygonsNorm) {
    ctx.beginPath();
    poly.forEach(([u, v], idx) => {
      const px = u * w;
      const py = v * h;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  return { canvas: out, pivotX: 0.48, pivotY: 0.56 };
}

/**
 * Segments the tightly cropped transparent bulldog sprite into 7 smoothly overlapping
 * anatomical layers (tail, 4 legs, solid core torso, and expressive barking head)
 * so the dog visibly gallops with all four legs, wags its tail, and nods/lunges its head!
 */
function buildArticulatedDogParts(cropped: HTMLCanvasElement): DogSpriteParts {
  // 1. Tail (upper-left fluffy white/orange tail)
  const tailPoly: Point[] = [
    [0.04, 0.0],
    [0.27, 0.0],
    [0.29, 0.31],
    [0.2, 0.36],
    [0.04, 0.28],
  ];

  // 2. Back-Left Hind Leg (far left)
  const backLeftPoly: Point[] = [
    [0.0, 0.46],
    [0.24, 0.44],
    [0.25, 0.68],
    [0.2, 0.96],
    [0.0, 0.96],
  ];

  // 3. Back-Right Inner Hind Leg (peeking between chest and front-left calf)
  const backRightPoly: Point[] = [
    [0.41, 0.64],
    [0.62, 0.64],
    [0.63, 0.94],
    [0.46, 0.94],
    [0.41, 0.78],
  ];

  // 4. Front-Left Leg (near foreground white leg & large paw)
  const frontLeftPoly: Point[] = [
    [0.2, 0.56],
    [0.41, 0.55],
    [0.54, 0.84],
    [0.55, 1.0],
    [0.26, 1.0],
    [0.19, 0.74],
  ];

  // 5. Front-Right Leg (right-most white leg & large paw, staying cleanly below chin/snout)
  const frontRightPoly: Point[] = [
    [0.64, 0.61],
    [0.86, 0.52],
    [0.98, 0.76],
    [1.0, 1.0],
    [0.66, 1.0],
    [0.63, 0.78],
  ];

  // 6. Expressive Head (floppy ears, eyes, snout, barking mouth & red collar upper rim)
  const headPoly: Point[] = [
    [0.28, 0.0],
    [0.95, 0.0],
    [0.96, 0.34],
    [0.88, 0.48],
    [0.77, 0.63],
    [0.62, 0.67],
    [0.44, 0.58],
    [0.34, 0.39],
    [0.27, 0.24],
  ];

  // Cutouts erased from torso (lower free-standing leg shafts, tail, and upper ear tips)
  // Upper shoulders, hips, and neck stay solid on torso so rotating limbs & head NEVER reveal a gap!
  const torsoCuts: Point[][] = [
    // Tail cutout
    [
      [0.0, 0.0],
      [0.27, 0.0],
      [0.27, 0.29],
      [0.17, 0.33],
      [0.0, 0.26],
    ],
    // Back-left lower leg cutout
    [
      [0.0, 0.62],
      [0.21, 0.64],
      [0.21, 1.0],
      [0.0, 1.0],
    ],
    // Back-right inner lower leg cutout
    [
      [0.42, 0.69],
      [0.63, 0.69],
      [0.63, 1.0],
      [0.46, 1.0],
    ],
    // Front-left lower leg cutout
    [
      [0.22, 0.67],
      [0.43, 0.67],
      [0.56, 0.88],
      [0.56, 1.0],
      [0.22, 1.0],
    ],
    // Front-right lower leg cutout
    [
      [0.65, 0.65],
      [0.92, 0.63],
      [1.0, 0.82],
      [1.0, 1.0],
      [0.65, 1.0],
    ],
    // Head outer crown/ears/snout cutout (keep neck & inner collar intact so head movement never leaves a seam)
    [
      [0.27, 0.0],
      [1.0, 0.0],
      [1.0, 0.49],
      [0.84, 0.54],
      [0.74, 0.34],
      [0.42, 0.32],
      [0.27, 0.24],
    ],
  ];

  return {
    tail: createMaskedPart(cropped, tailPoly, 0.24, 0.31, 2),
    backLeftLeg: createMaskedPart(cropped, backLeftPoly, 0.16, 0.54, 2.5),
    backRightLeg: createMaskedPart(cropped, backRightPoly, 0.47, 0.68, 2),
    torso: createTorsoCanvas(cropped, torsoCuts),
    frontLeftLeg: createMaskedPart(cropped, frontLeftPoly, 0.32, 0.6, 2.5),
    frontRightLeg: createMaskedPart(cropped, frontRightPoly, 0.75, 0.61, 2.5),
    head: createMaskedPart(cropped, headPoly, 0.56, 0.41, 2),
  };
}

/**
 * Loads the uploaded dog image, removes its outer solid white background using
 * perimeter BFS flood-fill + anti-aliased fringe smoothing, and builds 7 articulated
 * body parts for lively galloping legs, wagging tail, and animated barking head.
 */
export function loadTransparentDogSprite(
  src = '/assets/aistudio/image_185c8ab8.png'
): Promise<ProcessedDogSprite | null> {
  if (cachedPromise) return cachedPromise;

  cachedPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(null);
          return;
        }

        const work = document.createElement('canvas');
        work.width = w;
        work.height = h;
        const ctx = work.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const visited = new Uint8Array(w * h);
        const isBgMask = new Uint8Array(w * h);

        const isNearWhite = (idx: number, threshold: number, maxSat: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const a = data[p + 3];
          if (a < 25) return true;
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          return minC >= threshold && maxC - minC <= maxSat;
        };

        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const enqueueIfBg = (x: number, y: number) => {
          const idx = y * w + x;
          if (visited[idx]) return;
          if (isNearWhite(idx, 226, 28)) {
            visited[idx] = 1;
            isBgMask[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < w; x++) {
          enqueueIfBg(x, 0);
          enqueueIfBg(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          enqueueIfBg(0, y);
          enqueueIfBg(w - 1, y);
        }

        while (head < tail) {
          const idx = queue[head++];
          const x = idx % w;
          const y = (idx - x) / w;

          if (x > 0) enqueueIfBg(x - 1, y);
          if (x < w - 1) enqueueIfBg(x + 1, y);
          if (y > 0) enqueueIfBg(x, y - 1);
          if (y < h - 1) enqueueIfBg(x, y + 1);
        }

        for (let i = 0; i < w * h; i++) {
          if (isBgMask[i]) {
            data[i * 4 + 3] = 0;
          }
        }

        for (let pass = 0; pass < 2; pass++) {
          const toFade: number[] = [];
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              if (isBgMask[idx]) continue;

              const touchesBg =
                isBgMask[idx - 1] ||
                isBgMask[idx + 1] ||
                isBgMask[idx - w] ||
                isBgMask[idx + w];

              if (touchesBg) {
                const p = idx * 4;
                const r = data[p];
                const g = data[p + 1];
                const b = data[p + 2];
                const lum = (r + g + b) / 3;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);

                if (lum > 215 && sat < 34) {
                  toFade.push(idx);
                } else if (lum > 185 && sat < 28 && pass === 0) {
                  data[p + 3] = Math.min(data[p + 3], 130);
                }
              }
            }
          }
          for (const idx of toFade) {
            isBgMask[idx] = 1;
            data[idx * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          resolve(null);
          return;
        }

        const pad = 2;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
        const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

        const cropped = document.createElement('canvas');
        cropped.width = cropW;
        cropped.height = cropH;
        const cCtx = cropped.getContext('2d');
        if (!cCtx) {
          resolve(null);
          return;
        }
        cCtx.drawImage(work, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const parts = buildArticulatedDogParts(cropped);

        resolve({
          canvas: cropped,
          parts,
          dataUrl: cropped.toDataURL('image/png'),
          width: cropW,
          height: cropH,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  return cachedPromise;
}
