"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeNumber } from "../lib/ink";

const AUTO_SUBMIT_MS = 1000;
const INK_WIDTH = 6;
const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

// The pad remounts per question (key={qCount}); remember the chosen input
// mode so the keypad fallback survives across questions.
let lastPadMode = false;

export default function InkPad({ onAnswer, disabled, labels }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const prevDisabledRef = useRef(disabled);
  const [preview, setPreview] = useState("");
  const [padMode, setPadMode] = useState(() => lastPadMode);
  const [typed, setTyped] = useState("");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = INK_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c1c28";
    const strokes = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current;
    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      // A tap leaves a dot instead of nothing.
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.1, stroke[0].y);
      ctx.stroke();
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearInk = useCallback(() => {
    clearTimer();
    strokesRef.current = [];
    activeStrokeRef.current = null;
    submittedRef.current = false;
    setPreview("");
    redraw();
  }, [clearTimer, redraw]);

  // Size the drawing buffer to the on-screen box, crisp on retina.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw, padMode]);

  // Safety reset when the question unlocks without a remount.
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      clearInk();
      setTyped("");
    }
    prevDisabledRef.current = disabled;
  }, [disabled, clearInk]);

  useEffect(() => clearTimer, [clearTimer]);

  const scheduleSubmit = useCallback(() => {
    clearTimer();
    const { value } = recognizeNumber(strokesRef.current);
    setPreview(value === null ? "" : String(value));
    if (value === null) return;
    timerRef.current = setTimeout(() => {
      if (submittedRef.current) return;
      const result = recognizeNumber(strokesRef.current);
      if (result.value === null) return;
      submittedRef.current = true;
      onAnswer(result.value);
    }, AUTO_SUBMIT_MS);
  }, [clearTimer, onAnswer]);

  const pointFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (disabled || submittedRef.current) return;
    e.preventDefault();
    clearTimer();
    canvasRef.current.setPointerCapture(e.pointerId);
    activeStrokeRef.current = [pointFromEvent(e)];
    redraw();
  };

  const handlePointerMove = (e) => {
    if (!activeStrokeRef.current) return;
    e.preventDefault();
    activeStrokeRef.current.push(pointFromEvent(e));
    redraw();
  };

  const handlePointerEnd = (e) => {
    if (!activeStrokeRef.current) return;
    e.preventDefault();
    strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    activeStrokeRef.current = null;
    redraw();
    scheduleSubmit();
  };

  const switchMode = () => {
    clearInk();
    setTyped("");
    setPadMode((m) => {
      lastPadMode = !m;
      return !m;
    });
  };

  const pressKey = (key) => {
    if (disabled) return;
    setTyped((t) => (t.length >= 3 ? t : t + key));
  };

  const attack = () => {
    if (disabled || typed === "") return;
    onAnswer(Number(typed));
  };

  if (padMode) {
    return (
      <div className="inkpad inkpad-padmode">
        <div className="inkpreview">{typed || " "}</div>
        <div className="inkpad-keys">
          {PAD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="inkpad-key"
              disabled={disabled}
              onClick={() => pressKey(key)}
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            className="inkpad-key inkpad-key-clear"
            disabled={disabled}
            onClick={() => setTyped("")}
          >
            {labels.clear}
          </button>
          <button
            type="button"
            className="inkpad-key inkpad-key-attack"
            disabled={disabled || typed === ""}
            onClick={attack}
          >
            {labels.attack}
          </button>
        </div>
        <div className="inkpad-toolbar">
          <button type="button" className="inkpad-toggle" onClick={switchMode}>
            {labels.write}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inkpad inkpad-inkmode">
      <div className="inkpreview">{preview || " "}</div>
      <canvas
        ref={canvasRef}
        className="inkcanvas"
        style={{ touchAction: "none", width: "100%", height: "220px", display: "block" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <div className="inkpad-toolbar">
        <button
          type="button"
          className="inkpad-clear"
          disabled={disabled}
          onClick={clearInk}
        >
          {labels.clear}
        </button>
        <button type="button" className="inkpad-toggle" onClick={switchMode}>
          {labels.pad}
        </button>
      </div>
    </div>
  );
}
