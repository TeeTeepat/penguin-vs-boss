import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODES,
  MAX_LEVEL,
  TOPICS,
  TOPIC_ORDER,
  heartsForLevel,
  factPool,
  factKey,
  pickFact,
  updateWeak,
  applyAnswer,
  unlockedOf,
  playableTopics,
  nextUnlocked,
  levelFor,
  genQuestion,
  checkAnswer,
} from "../lib/logic.js";

function makeRng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

test("hearts per level: 5..9, capped", () => {
  assert.equal(heartsForLevel(1), 5);
  assert.equal(heartsForLevel(5), 9);
  assert.equal(heartsForLevel(99), 9);
});

test("pool: tables 6..8, second factor 2..12", () => {
  const pool = factPool(6, 8);
  assert.equal(pool.length, 3 * 11);
  assert.ok(pool.some((f) => f.a === 7 && f.b === 12));
});

test("mode table matches CONTEXT.md", () => {
  assert.deepEqual(
    Object.entries(MODES).map(([k, m]) => [k, m.table, m.reset, m.timed]),
    [
      ["peaceful", true, false, false],
      ["easy", true, true, false],
      ["normal", false, false, false],
      ["hard", false, true, true],
    ]
  );
});

test("topic timers match CONTEXT.md", () => {
  assert.deepEqual(
    TOPIC_ORDER.map((k) => [k, TOPICS[k].timer]),
    [
      ["add2", 30], ["add3", 30], ["sub2", 30], ["sub3", 30],
      ["mulFacts", 10], ["div", 15], ["mul2", 60], ["mul3", 120], ["time", 30],
    ]
  );
});

test("weak facts drawn ~3x as often", () => {
  const pool = factPool(6, 8);
  const weak = { "6x2": { streak: 0 } };
  let seed = 1;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let hits = 0;
  for (let i = 0; i < 5000; i++) if (factKey(pickFact(pool, weak, rng)) === "6x2") hits++;
  const expected = (5000 * 3) / (pool.length - 1 + 3);
  assert.ok(Math.abs(hits - expected) < expected * 0.3, `weak weighting off: ${hits} vs ~${expected}`);
});

test("avoidKey respected", () => {
  const pool = factPool(6, 8);
  let seed = 1;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++) assert.notEqual(factKey(pickFact(pool, {}, rng, "6x2")), "6x2");
});

test("weak lifecycle: wrong marks it, 3 rights in a row recover it, a wrong resets the streak", () => {
  let weak = updateWeak({}, "7x8", false);
  assert.deepEqual(weak, { "7x8": { streak: 0 } });
  weak = updateWeak(weak, "7x8", true);
  weak = updateWeak(weak, "7x8", true);
  weak = updateWeak(weak, "7x8", false); // slip: streak back to 0
  assert.deepEqual(weak, { "7x8": { streak: 0 } });
  weak = updateWeak(weak, "7x8", true);
  weak = updateWeak(weak, "7x8", true);
  weak = updateWeak(weak, "7x8", true);
  assert.deepEqual(weak, {}); // recovered
  assert.deepEqual(updateWeak({}, "3x3", true), {}); // right on normal fact: no-op
});

test("hearts: right answer always -1; wrong heals to full only in reset modes", () => {
  assert.equal(applyAnswer(5, 5, true, true), 4);
  assert.equal(applyAnswer(1, 5, true, false), 0);
  assert.equal(applyAnswer(2, 5, false, true), 5);
  assert.equal(applyAnswer(2, 5, false, false), 2);
});

/* ---- topics & progression ---- */

test("unlockedOf: explicit field wins; legacy players get through mulFacts; new records start at 1", () => {
  assert.equal(unlockedOf({ unlocked: 3, levels: {} }), 3);
  assert.equal(unlockedOf({ levels: { peaceful: 4 } }), TOPIC_ORDER.indexOf("mulFacts") + 1);
  assert.equal(unlockedOf({ levels: {} }), 1);
});

test("playableTopics: unlocked prefix filtered by teacher's allowed list", () => {
  const st = { unlocked: 3, allowed: null, levels: {} };
  assert.deepEqual(playableTopics(st), ["add2", "add3", "sub2"]);
  assert.deepEqual(playableTopics({ ...st, allowed: ["add2", "mulFacts"] }), ["add2"]);
});

test("nextUnlocked: flawless normal/hard or max level unlocks; only the frontier topic counts", () => {
  const st = { unlocked: 1, levels: {} };
  assert.equal(nextUnlocked(st, "add2", "normal", 2, 0), 2); // flawless
  assert.equal(nextUnlocked(st, "add2", "peaceful", 2, 0), 1); // flawless but wrong mode
  assert.equal(nextUnlocked(st, "add2", "peaceful", MAX_LEVEL, 3), 2); // max level
  assert.equal(nextUnlocked(st, "add2", "hard", 2, 1), 1); // not flawless
  assert.equal(nextUnlocked({ unlocked: 5, levels: {} }, "add2", "hard", 5, 0), 5); // behind the frontier
});

test("levelFor: topic:mode keys with legacy mulFacts fallback", () => {
  const st = { levels: { "add2:hard": 3, peaceful: 4 } };
  assert.equal(levelFor(st, "add2", "hard"), 3);
  assert.equal(levelFor(st, "mulFacts", "peaceful"), 4);
  assert.equal(levelFor(st, "time", "easy"), 1);
});

/* ---- question generation ---- */

const ST = { min: 2, max: 12, weak: {}, weakDiv: {} };

test("add/sub/mul generators stay in range; sub never negative", () => {
  const rng = makeRng(7);
  for (let i = 0; i < 300; i++) {
    for (const [topic, lo, hi] of [["add2", 10, 99], ["add3", 100, 999], ["sub2", 10, 99], ["mul2", 10, 99], ["mul3", 100, 999]]) {
      const q = genQuestion(topic, ST, rng);
      assert.equal(q.input, "num");
      assert.ok(Number.isInteger(q.answer));
      if (topic.startsWith("sub")) assert.ok(q.answer >= 0, `negative sub answer: ${q.text}`);
      if (topic.startsWith("add")) assert.ok(q.answer >= 2 * lo && q.answer <= 2 * hi);
      if (topic.startsWith("mul")) assert.ok(q.answer >= lo * lo && q.answer <= hi * hi);
    }
  }
});

test("div: exact division from the fact pool, answer 2..12", () => {
  const rng = makeRng(11);
  for (let i = 0; i < 200; i++) {
    const q = genQuestion("div", ST, rng);
    const m = q.text.match(/^(\d+) ÷ (\d+) = \?$/);
    assert.ok(m, q.text);
    assert.equal(Number(m[1]) / Number(m[2]), q.answer);
    assert.ok(q.answer >= 2 && q.answer <= 12);
    assert.ok(q.factKey);
  }
});

test("time: three kinds, valid answers", () => {
  const rng = makeRng(13);
  const kinds = new Set();
  for (let i = 0; i < 300; i++) {
    const q = genQuestion("time", ST, rng);
    kinds.add(q.qKey);
    if (q.qKey === "qConvert") assert.ok(Number.isInteger(q.answer) && q.answer > 0);
    if (q.qKey === "qClock") {
      assert.ok(q.answer.h >= 1 && q.answer.h <= 12);
      assert.ok(q.answer.m >= 0 && q.answer.m <= 55 && q.answer.m % 5 === 0);
      assert.deepEqual(q.clock, q.answer);
    }
    if (q.qKey === "qElapsed") {
      assert.ok(q.answer.h * 60 + q.answer.m >= 15 && q.answer.h * 60 + q.answer.m <= 180);
    }
  }
  assert.deepEqual([...kinds].sort(), ["qClock", "qConvert", "qElapsed"]);
});

test("checkAnswer: numbers and hh:mm pairs; null/timeout is wrong", () => {
  const num = { input: "num", answer: 56 };
  assert.ok(checkAnswer(num, 56));
  assert.ok(!checkAnswer(num, 55));
  assert.ok(!checkAnswer(num, null));
  const hm = { input: "hhmm", answer: { h: 1, m: 45 } };
  assert.ok(checkAnswer(hm, { h: 1, m: 45 }));
  assert.ok(!checkAnswer(hm, { h: 1, m: 40 }));
  assert.ok(!checkAnswer(hm, null));
});

test("mulFacts uses weak pool from st.weak, div from st.weakDiv", () => {
  const rng = makeRng(3);
  const st = { min: 6, max: 6, weak: { "6x9": { streak: 0 } }, weakDiv: { "6x4": { streak: 0 } } };
  let mulWeak = 0;
  let divWeak = 0;
  for (let i = 0; i < 2000; i++) {
    if (genQuestion("mulFacts", st, rng).factKey === "6x9") mulWeak++;
    if (genQuestion("div", st, rng).factKey === "6x4") divWeak++;
  }
  const base = 2000 / 11; // 11 facts in one table, uniform share
  assert.ok(mulWeak > base * 1.8, `weak × not favored: ${mulWeak}`);
  assert.ok(divWeak > base * 1.8, `weak ÷ not favored: ${divWeak}`);
});
