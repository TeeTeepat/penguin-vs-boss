import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { MODES, heartsForLevel, factPool, factKey, pickFact, updateWeak, applyAnswer } =
  createRequire(import.meta.url)("./logic.js");

// hearts per level: 5..9, capped
assert.equal(heartsForLevel(1), 5);
assert.equal(heartsForLevel(5), 9);
assert.equal(heartsForLevel(99), 9);

// pool: tables 6..8, second factor 2..12
const pool = factPool(6, 8);
assert.equal(pool.length, 3 * 11);
assert.ok(pool.some((f) => f.a === 7 && f.b === 12));

// mode table matches CONTEXT.md
assert.deepEqual(
  Object.entries(MODES).map(([k, m]) => [k, m.table, m.reset, m.timer]),
  [["peaceful", true, false, 0], ["easy", true, true, 0], ["normal", false, false, 0], ["hard", false, true, 10]]
);

// weak facts drawn ~3x as often
let weak = { "6x2": { streak: 0 } };
let seed = 1;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let hits = 0;
for (let i = 0; i < 5000; i++) if (factKey(pickFact(pool, weak, rng)) === "6x2") hits++;
const expected = 5000 * 3 / (pool.length - 1 + 3);
assert.ok(Math.abs(hits - expected) < expected * 0.3, `weak weighting off: ${hits} vs ~${expected}`);

// avoidKey respected
for (let i = 0; i < 200; i++) assert.notEqual(factKey(pickFact(pool, {}, rng, "6x2")), "6x2");

// weak lifecycle: wrong marks it, 3 rights in a row recover it, a wrong resets the streak
weak = updateWeak({}, "7x8", false);
assert.deepEqual(weak, { "7x8": { streak: 0 } });
weak = updateWeak(weak, "7x8", true);
weak = updateWeak(weak, "7x8", true);
weak = updateWeak(weak, "7x8", false);           // slip: streak back to 0
assert.deepEqual(weak, { "7x8": { streak: 0 } });
weak = updateWeak(weak, "7x8", true);
weak = updateWeak(weak, "7x8", true);
weak = updateWeak(weak, "7x8", true);
assert.deepEqual(weak, {});                       // recovered
assert.deepEqual(updateWeak({}, "3x3", true), {}); // right on normal fact: no-op

// hearts: right answer always -1; wrong heals to full only in reset modes
assert.equal(applyAnswer(5, 5, true, true), 4);
assert.equal(applyAnswer(1, 5, true, false), 0);
assert.equal(applyAnswer(2, 5, false, true), 5);
assert.equal(applyAnswer(2, 5, false, false), 2);

console.log("all logic tests passed");
