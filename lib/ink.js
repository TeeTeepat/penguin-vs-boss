// $P point-cloud digit recognizer plus left-to-right stroke segmentation.
// Strokes are arrays of {x,y} point arrays. Pure functions, no DOM.

const N = 32;
/* Gap between digits, as a fraction of writing height. Height, not stroke
   width, is the size proxy — a bare-line "1" has near-zero width. */
const GAP_RATIO = 0.18;
const MIN_HEIGHT = 20;
/* Marks smaller than this (both axes) are stray dots, not digits. */
const DOT_SIZE = 10;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(strokes) {
  let len = 0;
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      len += dist(stroke[i - 1], stroke[i]);
    }
  }
  return len;
}

// Resample the multistroke to n points spaced evenly along path length.
// Interpolation never crosses a stroke boundary.
function resample(strokes, n) {
  const src = strokes
    .filter((s) => s.length > 0)
    .map((s) => s.map((p) => ({ x: p.x, y: p.y })));
  if (src.length === 0) return [];
  const interval = pathLength(src) / (n - 1);
  const out = [{ x: src[0][0].x, y: src[0][0].y }];
  if (interval === 0) {
    while (out.length < n) out.push({ ...out[0] });
    return out;
  }
  let acc = 0;
  for (const stroke of src) {
    let prev = stroke[0];
    let i = 1;
    while (i < stroke.length) {
      const cur = stroke[i];
      const d = dist(prev, cur);
      if (acc + d >= interval && d > 0) {
        const t = (interval - acc) / d;
        const q = {
          x: prev.x + t * (cur.x - prev.x),
          y: prev.y + t * (cur.y - prev.y),
        };
        out.push(q);
        prev = q;
        acc = 0;
      } else {
        acc += d;
        prev = cur;
        i++;
      }
    }
  }
  while (out.length < n) out.push({ ...out[out.length - 1] });
  return out.slice(0, n);
}

function bounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// Uniform scale by the larger bbox side, then translate centroid to origin.
function normalize(points) {
  const b = bounds(points);
  const scale = Math.max(b.maxX - b.minX, b.maxY - b.minY) || 1;
  const scaled = points.map((p) => ({
    x: (p.x - b.minX) / scale,
    y: (p.y - b.minY) / scale,
  }));
  let cx = 0;
  let cy = 0;
  for (const p of scaled) {
    cx += p.x;
    cy += p.y;
  }
  cx /= scaled.length;
  cy /= scaled.length;
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy }));
}

function toCloud(strokes) {
  const pts = resample(strokes, N);
  if (pts.length === 0) return null;
  return normalize(pts);
}

function cloudDistance(pts1, pts2, start) {
  const n = pts1.length;
  const matched = new Array(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let minD = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = dist(pts1[i], pts2[j]);
        if (d < minD) {
          minD = d;
          index = j;
        }
      }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * minD;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyCloudMatch(pts, tmpl) {
  const n = pts.length;
  const step = Math.floor(Math.pow(n, 0.5));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(pts, tmpl, i);
    const d2 = cloudDistance(tmpl, pts, i);
    min = Math.min(min, d1, d2);
  }
  return min;
}

// Canonical polylines in a 100x100 box, y down. Kid forms included:
// plain vertical 1, open 4, simple and crossed 7.
export const TEMPLATES = [
  { digit: 0, strokes: [[{ x: 50, y: 2 }, { x: 72, y: 10 }, { x: 80, y: 30 }, { x: 80, y: 70 }, { x: 72, y: 90 }, { x: 50, y: 98 }, { x: 28, y: 90 }, { x: 20, y: 70 }, { x: 20, y: 30 }, { x: 28, y: 10 }, { x: 50, y: 2 }]] },
  { digit: 0, strokes: [[{ x: 50, y: 2 }, { x: 65, y: 12 }, { x: 70, y: 32 }, { x: 70, y: 68 }, { x: 65, y: 88 }, { x: 50, y: 98 }, { x: 35, y: 88 }, { x: 30, y: 68 }, { x: 30, y: 32 }, { x: 35, y: 12 }, { x: 50, y: 2 }]] },
  { digit: 1, strokes: [[{ x: 50, y: 0 }, { x: 50, y: 100 }]] },
  { digit: 1, strokes: [[{ x: 30, y: 20 }, { x: 55, y: 0 }, { x: 55, y: 100 }]] },
  { digit: 2, strokes: [[{ x: 20, y: 25 }, { x: 30, y: 8 }, { x: 50, y: 2 }, { x: 70, y: 10 }, { x: 76, y: 28 }, { x: 68, y: 48 }, { x: 45, y: 68 }, { x: 20, y: 95 }, { x: 78, y: 95 }]] },
  { digit: 2, strokes: [[{ x: 18, y: 30 }, { x: 28, y: 10 }, { x: 50, y: 3 }, { x: 72, y: 12 }, { x: 75, y: 32 }, { x: 55, y: 58 }, { x: 20, y: 92 }, { x: 78, y: 92 }]] },
  { digit: 3, strokes: [[{ x: 20, y: 12 }, { x: 40, y: 2 }, { x: 62, y: 6 }, { x: 72, y: 22 }, { x: 62, y: 40 }, { x: 42, y: 48 }, { x: 62, y: 55 }, { x: 74, y: 72 }, { x: 62, y: 92 }, { x: 38, y: 98 }, { x: 18, y: 86 }]] },
  { digit: 3, strokes: [[{ x: 25, y: 8 }, { x: 50, y: 0 }, { x: 70, y: 15 }, { x: 65, y: 38 }, { x: 45, y: 48 }, { x: 68, y: 58 }, { x: 72, y: 80 }, { x: 50, y: 98 }, { x: 22, y: 90 }]] },
  { digit: 4, strokes: [[{ x: 45, y: 0 }, { x: 12, y: 58 }, { x: 80, y: 58 }], [{ x: 62, y: 30 }, { x: 62, y: 100 }]] },
  { digit: 4, strokes: [[{ x: 50, y: 5 }, { x: 20, y: 62 }, { x: 85, y: 62 }], [{ x: 65, y: 20 }, { x: 65, y: 100 }]] },
  { digit: 5, strokes: [[{ x: 75, y: 2 }, { x: 22, y: 2 }, { x: 18, y: 45 }, { x: 45, y: 38 }, { x: 68, y: 50 }, { x: 72, y: 72 }, { x: 58, y: 92 }, { x: 32, y: 98 }, { x: 14, y: 84 }]] },
  { digit: 5, strokes: [[{ x: 24, y: 6 }, { x: 20, y: 45 }, { x: 48, y: 38 }, { x: 70, y: 52 }, { x: 70, y: 75 }, { x: 52, y: 94 }, { x: 25, y: 96 }, { x: 12, y: 82 }], [{ x: 24, y: 6 }, { x: 78, y: 6 }]] },
  { digit: 6, strokes: [[{ x: 65, y: 2 }, { x: 40, y: 25 }, { x: 22, y: 55 }, { x: 18, y: 78 }, { x: 30, y: 95 }, { x: 55, y: 96 }, { x: 68, y: 80 }, { x: 62, y: 62 }, { x: 42, y: 58 }, { x: 25, y: 70 }]] },
  { digit: 6, strokes: [[{ x: 70, y: 5 }, { x: 35, y: 35 }, { x: 20, y: 70 }, { x: 30, y: 92 }, { x: 55, y: 95 }, { x: 65, y: 78 }, { x: 55, y: 60 }, { x: 30, y: 65 }]] },
  { digit: 7, strokes: [[{ x: 15, y: 5 }, { x: 75, y: 5 }, { x: 40, y: 100 }]] },
  { digit: 7, strokes: [[{ x: 15, y: 5 }, { x: 75, y: 5 }, { x: 40, y: 100 }], [{ x: 25, y: 50 }, { x: 65, y: 50 }]] },
  { digit: 8, strokes: [[{ x: 50, y: 2 }, { x: 25, y: 10 }, { x: 20, y: 30 }, { x: 35, y: 46 }, { x: 50, y: 50 }, { x: 70, y: 60 }, { x: 75, y: 80 }, { x: 60, y: 96 }, { x: 38, y: 95 }, { x: 25, y: 80 }, { x: 35, y: 60 }, { x: 50, y: 50 }, { x: 68, y: 40 }, { x: 72, y: 18 }, { x: 60, y: 4 }, { x: 50, y: 2 }]] },
  { digit: 8, strokes: [[{ x: 50, y: 4 }, { x: 30, y: 8 }, { x: 24, y: 26 }, { x: 34, y: 44 }, { x: 50, y: 50 }, { x: 30, y: 58 }, { x: 24, y: 78 }, { x: 38, y: 96 }, { x: 62, y: 96 }, { x: 76, y: 78 }, { x: 70, y: 58 }, { x: 50, y: 50 }, { x: 66, y: 44 }, { x: 76, y: 26 }, { x: 70, y: 8 }, { x: 50, y: 4 }]] },
  { digit: 9, strokes: [[{ x: 72, y: 12 }, { x: 50, y: 2 }, { x: 28, y: 12 }, { x: 24, y: 32 }, { x: 38, y: 46 }, { x: 60, y: 46 }, { x: 72, y: 32 }, { x: 72, y: 12 }, { x: 70, y: 55 }, { x: 62, y: 100 }]] },
  { digit: 9, strokes: [[{ x: 70, y: 8 }, { x: 40, y: 2 }, { x: 24, y: 20 }, { x: 28, y: 42 }, { x: 52, y: 50 }, { x: 70, y: 40 }, { x: 70, y: 8 }, { x: 70, y: 100 }]] },
];

const TEMPLATE_CLOUDS = TEMPLATES.map((t) => ({
  digit: t.digit,
  cloud: toCloud(t.strokes),
}));

export function recognizeDigit(strokes) {
  const cloud = toCloud(strokes || []);
  if (!cloud) return { digit: null, score: 0 };
  let best = Infinity;
  let bestDigit = null;
  for (const t of TEMPLATE_CLOUDS) {
    const d = greedyCloudMatch(cloud, t.cloud);
    if (d < best) {
      best = d;
      bestDigit = t.digit;
    }
  }
  return { digit: bestDigit, score: 1 / (1 + best) };
}

export function segmentStrokes(strokes) {
  const items = (strokes || [])
    .map((stroke, order) => {
      const b = bounds(stroke);
      return { stroke, order, minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY };
    })
    .filter((it) => it.stroke.length > 0)
    .sort((a, b) => a.minX - b.minX);
  if (items.length === 0) return [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minY = Math.min(minY, it.minY);
    maxY = Math.max(maxY, it.maxY);
  }
  const height = Math.max(maxY - minY, MIN_HEIGHT);
  const groups = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && it.minX - last.maxX < GAP_RATIO * height) {
      last.items.push(it);
      last.maxX = Math.max(last.maxX, it.maxX);
      continue;
    }
    groups.push({ maxX: it.maxX, items: [it] });
  }
  return groups.map((g) =>
    g.items.sort((a, b) => a.order - b.order).map((it) => it.stroke)
  );
}

export function recognizeNumber(strokes) {
  /* Drop stray-dot groups (palm taps) so "6" + a speck reads as 6, not 61. */
  const groups = segmentStrokes(strokes).filter((g) => {
    const b = bounds(g.flat());
    return b.maxX - b.minX >= DOT_SIZE || b.maxY - b.minY >= DOT_SIZE;
  });
  const digits = groups.map((g) => recognizeDigit(g));
  if (digits.length === 0 || digits.some((d) => d.digit === null)) {
    return { value: null, digits };
  }
  return { value: Number(digits.map((d) => d.digit).join("")), digits };
}
