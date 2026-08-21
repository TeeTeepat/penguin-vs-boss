"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeNumber } from "../lib/ink";

const INK_WIDTH = 6;
const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

// The pad remounts per question (key={qCount}); remember the chosen input
// mode so the keypad fallback survives across questions.
let lastPadMode = false;

export default function InkPad({ onAnswer, disabled, labels }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const activePointerRef = useRef(null);
  const rectRef = useRef(null);
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

  const clearInk = useCallback(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    activePointerRef.current = null;
    submittedRef.current = false;
    setPreview("");
    redraw();
  }, [redraw]);

  // Size the drawing buffer to the on-screen box, crisp on retina.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const fit = () => {
      // clientWidth/Height exclude the dashed border; sizing the bitmap from
      // the border box would stretch it and offset the ink from the pen.
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
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

  const updatePreview = useCallback(() => {
    const { value } = recognizeNumber(strokesRef.current);
    setPreview(value === null ? "" : String(value));
  }, []);

  const pointFromEvent = (e) => {
    const rect = rectRef.current;
    const canvas = canvasRef.current;
    return {
      x: e.clientX - rect.left - canvas.clientLeft,
      y: e.clientY - rect.top - canvas.clientTop,
    };
  };

  // Append only the newest segment; full redraws happen on end/clear/resize.
  const drawSegment = (from, to) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = INK_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c1c28";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + (from === to ? 0.1 : 0), to.y);
    ctx.stroke();
  };

  // Single-pointer: a palm or second finger landing mid-stroke is ignored
  // instead of hijacking the stroke in progress.
  const handlePointerDown = (e) => {
    if (disabled || submittedRef.current) return;
    if (activePointerRef.current !== null) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    rectRef.current = canvasRef.current.getBoundingClientRect();
    const p = pointFromEvent(e);
    activeStrokeRef.current = [p];
    drawSegment(p, p);
  };

  const handlePointerMove = (e) => {
    if (e.pointerId !== activePointerRef.current) return;
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e];
    for (const ev of events) {
      const p = pointFromEvent(ev);
      drawSegment(stroke[stroke.length - 1], p);
      stroke.push(p);
    }
  };

  const handlePointerEnd = (e) => {
    if (e.pointerId !== activePointerRef.current) return;
    if (!activeStrokeRef.current) return;
    e.preventDefault();
    strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    activeStrokeRef.current = null;
    activePointerRef.current = null;
    redraw();
    updatePreview();
  };

  const attackInk = () => {
    if (disabled || submittedRef.current) return;
    const { value } = recognizeNumber(strokesRef.current);
    if (value === null) return;
    submittedRef.current = true;
    onAnswer(value);
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
    /* 6 digits covers the biggest answer (999 × 999 = 998001). */
    setTyped((t) => (t.length >= 6 ? t : t + key));
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
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          width: "100%",
          height: "220px",
          display: "block",
        }}
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
        <button
          type="button"
          className="inkpad-key inkpad-key-attack"
          disabled={disabled || preview === ""}
          onClick={attackInk}
        >
          {labels.attack}
        </button>
        <button type="button" className="inkpad-toggle" onClick={switchMode}>
          {labels.pad}
        </button>
      </div>
    </div>
  );
}
