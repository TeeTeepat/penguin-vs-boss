/* Pure game rules from CONTEXT.md. No DOM, no IO. Shared by UI and tests. */

export const MODES = {
  peaceful: { label: "Peaceful", table: true,  reset: false, timed: false },
  easy:     { label: "Easy",     table: true,  reset: true,  timed: false },
  normal:   { label: "Normal",   table: false, reset: false, timed: false },
  hard:     { label: "Hard",     table: false, reset: true,  timed: true },
};

/* Hard mode only: the penguin has HP and can faint (Round lost, free retry). */
export const PENGUIN_HP = 3;

/* Topics in progression order. timer applies in Hard mode only.
   table: multiplication-table overlay allowed (Peaceful/Easy).
   weakKey: student field holding this topic's Weak Fact pool. */
export const TOPIC_ORDER = ["add2", "add3", "sub2", "sub3", "mulFacts", "div", "mul2", "mul3", "time"];
export const TOPICS = {
  add2:     { timer: 30 },
  add3:     { timer: 30 },
  sub2:     { timer: 30 },
  sub3:     { timer: 30 },
  mulFacts: { timer: 10, table: true, weakKey: "weak" },
  div:      { timer: 15, table: true, weakKey: "weakDiv" },
  mul2:     { timer: 60 },
  mul3:     { timer: 120 },
  time:     { timer: 30 },
};

/* How many Topics (in order) are open. Legacy records predate the field and
   were mid-way through ×-facts, so they default to everything through mulFacts. */
export function unlockedOf(st) {
  if (typeof st.unlocked === "number") return st.unlocked;
  return Object.keys(st.levels || {}).length ? TOPIC_ORDER.indexOf("mulFacts") + 1 : 1;
}

/* Topics the Student may pick: unlocked, minus the Teacher's allowed filter. */
export function playableTopics(st) {
  const open = TOPIC_ORDER.slice(0, unlockedOf(st));
  if (!Array.isArray(st.allowed)) return open;
  return open.filter((k) => st.allowed.includes(k));
}

/* Flawless win in Normal/Hard, or reaching max Level, opens the next Topic. */
export function nextUnlocked(st, topicKey, modeKey, newLevel, wrongs) {
  const cur = unlockedOf(st);
  if (TOPIC_ORDER.indexOf(topicKey) !== cur - 1 || cur >= TOPIC_ORDER.length) return cur;
  const flawless = wrongs === 0 && (modeKey === "normal" || modeKey === "hard");
  return flawless || newLevel >= MAX_LEVEL ? cur + 1 : cur;
}

/* Levels are keyed "topic:mode"; legacy mulFacts records used bare mode keys. */
export function levelFor(st, topicKey, modeKey) {
  const levels = st.levels || {};
  return levels[`${topicKey}:${modeKey}`] ?? (topicKey === "mulFacts" ? levels[modeKey] : undefined) ?? 1;
}

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

/* ---- question generation ----
   A question: { key, text | qKey+vars, answer, input: "num"|"hhmm",
   fmt: "num"|"clock"|"dur", clock?, factKey? }. rng injectable for tests. */

const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function genAddSub(rng, lo, hi, op) {
  let a = ri(rng, lo, hi);
  let b = ri(rng, lo, hi);
  /* Subtraction is always big − small: no negative answers at this age. */
  if (op === "-" && b > a) [a, b] = [b, a];
  const answer = op === "+" ? a + b : a - b;
  return { key: `${a}${op}${b}`, text: `${a} ${op === "-" ? "−" : "+"} ${b} = ?`, answer, input: "num", fmt: "num" };
}

function genMul(rng, lo, hi) {
  const a = ri(rng, lo, hi);
  const b = ri(rng, lo, hi);
  return { key: `${a}*${b}`, text: `${a} × ${b} = ?`, answer: a * b, input: "num", fmt: "num" };
}

const CONVERSIONS = [
  { from: "unit_week", to: "unit_day", mult: 7 },
  { from: "unit_day", to: "unit_hour", mult: 24 },
  { from: "unit_hour", to: "unit_minute", mult: 60 },
  { from: "unit_minute", to: "unit_second", mult: 60 },
];

const clockText = (h, m) => `${h}:${String(m).padStart(2, "0")}`;

function genTime(rng) {
  const kind = ri(rng, 0, 2);
  if (kind === 0) {
    const c = CONVERSIONS[ri(rng, 0, CONVERSIONS.length - 1)];
    const n = ri(rng, 2, 9);
    return {
      key: `cv${c.from}${n}`, qKey: "qConvert", vars: { n, from: c.from, to: c.to },
      answer: n * c.mult, input: "num", fmt: "num",
    };
  }
  if (kind === 1) {
    const h = ri(rng, 1, 12);
    const m = 5 * ri(rng, 0, 11);
    return {
      key: `ck${h}:${m}`, qKey: "qClock", vars: {},
      answer: { h, m }, input: "hhmm", fmt: "clock", clock: { h, m },
    };
  }
  /* Elapsed: start early enough that start + up to 3h stays before 12:00. */
  const start = ri(rng, 1, 8) * 60 + 5 * ri(rng, 0, 11);
  const dur = 5 * ri(rng, 3, 36);
  const end = start + dur;
  return {
    key: `el${start}+${dur}`, qKey: "qElapsed",
    vars: { s: clockText(Math.floor(start / 60), start % 60), e: clockText(Math.floor(end / 60), end % 60) },
    answer: { h: Math.floor(dur / 60), m: dur % 60 }, input: "hhmm", fmt: "dur",
  };
}

export function genQuestion(topicKey, st, rng, avoidKey) {
  switch (topicKey) {
    case "add2": return genAddSub(rng, 10, 99, "+");
    case "add3": return genAddSub(rng, 100, 999, "+");
    case "sub2": return genAddSub(rng, 10, 99, "-");
    case "sub3": return genAddSub(rng, 100, 999, "-");
    case "mul2": return genMul(rng, 10, 99);
    case "mul3": return genMul(rng, 100, 999);
    case "time": return genTime(rng);
    case "div": {
      const f = pickFact(factPool(st.min, st.max), st.weakDiv || {}, rng, avoidKey);
      return {
        key: factKey(f), factKey: factKey(f),
        text: `${f.a * f.b} ÷ ${f.a} = ?`, answer: f.b, input: "num", fmt: "num",
      };
    }
    default: {
      const f = pickFact(factPool(st.min, st.max), st.weak || {}, rng, avoidKey);
      return {
        key: factKey(f), factKey: factKey(f),
        text: `${f.a} × ${f.b} = ?`, answer: f.a * f.b, input: "num", fmt: "num",
      };
    }
  }
}

export function checkAnswer(q, value) {
  if (value === null || value === undefined) return false;
  if (q.input === "hhmm") return value.h === q.answer.h && value.m === q.answer.m;
  return value === q.answer;
}

export const answerText = (q) =>
  q.input === "hhmm" ? (q.fmt === "clock" ? clockText(q.answer.h, q.answer.m) : null) : String(q.answer);
