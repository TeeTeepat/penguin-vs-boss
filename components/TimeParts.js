"use client";

import { useState } from "react";

/* Analog clock for clock-reading questions. */
export function ClockFace({ h, m }) {
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minAngle = m * 6;
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    ticks.push(
      <line
        key={i}
        x1={50 + 42 * Math.sin(a)}
        y1={50 - 42 * Math.cos(a)}
        x2={50 + 46 * Math.sin(a)}
        y2={50 - 46 * Math.cos(a)}
        stroke="#1c1c28"
        strokeWidth={i % 3 === 0 ? 3 : 1.5}
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" width="150" height="150" role="img" aria-label={`${h}:${m}`}>
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#1c1c28" strokeWidth="3" />
      {ticks}
      <line
        x1="50" y1="50"
        x2={50 + 24 * Math.sin((hourAngle * Math.PI) / 180)}
        y2={50 - 24 * Math.cos((hourAngle * Math.PI) / 180)}
        stroke="#1c1c28" strokeWidth="5" strokeLinecap="round"
      />
      <line
        x1="50" y1="50"
        x2={50 + 38 * Math.sin((minAngle * Math.PI) / 180)}
        y2={50 - 38 * Math.cos((minAngle * Math.PI) / 180)}
        stroke="#e74c3c" strokeWidth="3" strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="3" fill="#1c1c28" />
    </svg>
  );
}

/* Two-box hours/minutes answer entry for clock and elapsed-time questions. */
export function TimeAnswer({ onAnswer, disabled, labels }) {
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const clean = (v) => v.replace(/\D/g, "").slice(0, 2);
  const ready = h !== "" && m !== "";
  return (
    <div className="inkpad">
      <div className="row" style={{ justifyContent: "center", alignItems: "center" }}>
        <input
          className="timebox"
          inputMode="numeric"
          value={h}
          disabled={disabled}
          onChange={(e) => setH(clean(e.target.value))}
        />
        <span>{labels.hourShort}</span>
        <input
          className="timebox"
          inputMode="numeric"
          value={m}
          disabled={disabled}
          onChange={(e) => setM(clean(e.target.value))}
        />
        <span>{labels.minShort}</span>
        <button
          type="button"
          className="inkpad-key inkpad-key-attack"
          disabled={disabled || !ready}
          onClick={() => onAnswer({ h: Number(h), m: Number(m) })}
        >
          {labels.attack}
        </button>
      </div>
    </div>
  );
}
