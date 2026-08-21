const STORAGE_KEY = "pvb.muted";

let ctx = null;
let muted = true;
let loaded = false;

function loadMuted() {
  if (loaded) return;
  loaded = true;
  // localStorage can throw in private mode; default stays muted
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v !== null) muted = v === "1";
  } catch {
    muted = true;
  }
}

export function isMuted() {
  loadMuted();
  return muted;
}

export function setMuted(value) {
  loadMuted();
  muted = !!value;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // storage unavailable; keep in-memory value
  }
}

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  // browsers create contexts suspended until a user gesture; sfx is only
  // called from gesture handlers, so resume here
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function note(c, { type, freq, at, dur, vol = 0.15, slide }) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, at + dur);
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function play(build) {
  loadMuted();
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  build(c, c.currentTime + 0.01);
}

export const sfx = {
  hit() {
    play((c, t) => {
      note(c, { type: "square", freq: 560, at: t, dur: 0.07, slide: 220 });
      note(c, { type: "square", freq: 900, at: t + 0.04, dur: 0.09, slide: 330, vol: 0.1 });
    });
  },
  hurt() {
    play((c, t) => {
      note(c, { type: "square", freq: 220, at: t, dur: 0.28, slide: 70, vol: 0.18 });
    });
  },
  heal() {
    play((c, t) => {
      [440, 554, 659].forEach((f, i) => {
        note(c, { type: "triangle", freq: f, at: t + i * 0.08, dur: 0.14, vol: 0.14 });
      });
    });
  },
  win() {
    play((c, t) => {
      [523, 659, 784, 1047].forEach((f, i) => {
        note(c, { type: "square", freq: f, at: t + i * 0.12, dur: i === 3 ? 0.32 : 0.11, vol: 0.12 });
      });
    });
  },
  tap() {
    play((c, t) => {
      note(c, { type: "triangle", freq: 880, at: t, dur: 0.05, vol: 0.1 });
    });
  },
};
