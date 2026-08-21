import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATES,
  recognizeDigit,
  segmentStrokes,
  recognizeNumber,
} from "../lib/ink.js";

// Deterministic pseudo-random for repeatable jitter.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function jitter(strokes, amount, rng) {
  return strokes.map((stroke) =>
    stroke.map((p) => ({
      x: p.x + (rng() * 2 - 1) * amount,
      y: p.y + (rng() * 2 - 1) * amount,
    }))
  );
}

function scaled(strokes, factor) {
  return strokes.map((stroke) =>
    stroke.map((p) => ({ x: p.x * factor, y: p.y * factor }))
  );
}

function shifted(strokes, dx) {
  return strokes.map((stroke) =>
    stroke.map((p) => ({ x: p.x + dx, y: p.y }))
  );
}

test("every template recognizes itself", () => {
  for (const t of TEMPLATES) {
    const result = recognizeDigit(t.strokes);
    assert.equal(result.digit, t.digit, `template for ${t.digit} misread as ${result.digit}`);
    assert.ok(result.score > 0);
  }
});

test("recognition tolerates +-3px jitter", () => {
  const rng = makeRng(42);
  for (const t of TEMPLATES) {
    const noisy = jitter(t.strokes, 3, rng);
    const result = recognizeDigit(noisy);
    assert.equal(result.digit, t.digit, `jittered ${t.digit} misread as ${result.digit}`);
  }
});

test("recognition tolerates 2x scale", () => {
  for (const t of TEMPLATES) {
    const big = scaled(t.strokes, 2);
    const result = recognizeDigit(big);
    assert.equal(result.digit, t.digit, `scaled ${t.digit} misread as ${result.digit}`);
  }
});

test("segmentation splits two separated clouds left-to-right", () => {
  const seven = TEMPLATES.find((t) => t.digit === 7).strokes;
  const one = TEMPLATES.find((t) => t.digit === 1).strokes;
  // Draw the right digit first to prove ordering is spatial, not temporal.
  const strokes = [...shifted(one, 250), ...seven];
  const groups = segmentStrokes(strokes);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], seven);
  assert.deepEqual(groups[1], shifted(one, 250));
});

test("segmentation keeps a multi-stroke digit together", () => {
  const four = TEMPLATES.find((t) => t.digit === 4).strokes;
  const groups = segmentStrokes(four);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
});

test("recognizeNumber composes 42 from a 4-cloud left of a 2-cloud", () => {
  const four = TEMPLATES.find((t) => t.digit === 4).strokes;
  const two = TEMPLATES.find((t) => t.digit === 2).strokes;
  const strokes = [...four, ...shifted(two, 200)];
  const result = recognizeNumber(strokes);
  assert.equal(result.value, 42);
  assert.equal(result.digits.length, 2);
  assert.equal(result.digits[0].digit, 4);
  assert.equal(result.digits[1].digit, 2);
});

test("recognizeNumber returns null value for no ink", () => {
  const result = recognizeNumber([]);
  assert.equal(result.value, null);
  assert.deepEqual(result.digits, []);
});
