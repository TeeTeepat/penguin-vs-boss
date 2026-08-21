/* Pure game rules from CONTEXT.md. No DOM, no IO. Shared by UI and tests. */

export const MODES = {
  peaceful: { label: "Peaceful", table: true,  reset: false, timer: 0 },
  easy:     { label: "Easy",     table: true,  reset: true,  timer: 0 },
  normal:   { label: "Normal",   table: false, reset: false, timer: 0 },
  hard:     { label: "Hard",     table: false, reset: true,  timer: 10 },
};

export const MAX_LEVEL = 5;
/* Level 1 = 5 Hearts, each Level adds one, cap Level 5 = 9 */
export const heartsForLevel = (level) => 4 + Math.min(Math.max(level, 1), MAX_LEVEL);

export const factKey = (f) => `${f.a}x${f.b}`;

/* Full pool is 2x2..12x12; Teacher narrows the table (first factor) range. */
export function factPool(min, max) {
  const pool = [];
  for (let a = min; a <= max; a++)
    for (let b = 2; b <= 12; b++) pool.push({ a, b });
  return pool;
}

/* Weak Facts served with ~3x the chance. Avoids repeating the previous fact
   when the pool allows it. rng is injectable for tests. */
export function pickFact(pool, weak, rng, avoidKey) {
  let candidates = pool.filter((f) => factKey(f) !== avoidKey);
  if (!candidates.length) candidates = pool;
  const weights = candidates.map((f) => (weak[factKey(f)] ? 3 : 1));
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/* Weak map: { "7x8": { streak: n } }. Wrong answer marks (or re-marks) the
   fact weak with streak 0; a Weak Fact recovers after 3 rights in a row. */
export function updateWeak(weak, key, correct) {
  const next = { ...weak };
  if (!correct) {
    next[key] = { streak: 0 };
    return next;
  }
  if (next[key]) {
    const streak = next[key].streak + 1;
    if (streak >= 3) delete next[key];
    else next[key] = { streak };
  }
  return next;
}

/* Hearts are Boss HP counting down. Right answer removes one; wrong answer
   heals the Boss to full only in Modes with reset. 0 = Round won. */
export function applyAnswer(hearts, maxHearts, correct, resetOnWrong) {
  if (correct) return Math.max(0, hearts - 1);
  return resetOnWrong ? maxHearts : hearts;
}
