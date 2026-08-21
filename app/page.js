"use client";

import { useEffect, useRef, useState } from "react";
import {
  MODES,
  MAX_LEVEL,
  heartsForLevel,
  factKey,
  factPool,
  pickFact,
  updateWeak,
  applyAnswer,
} from "../lib/logic";
import { t } from "../lib/i18n";
import { sfx, setMuted, isMuted } from "../lib/sound";
import BattleStage, { BOSS_VARIANTS } from "../components/BattleStage";
import TablePanel from "../components/TableOverlay";
import InkPad from "../components/InkPad";

const LANG_KEY = "pvb.lang";

const NUMS = [];
for (let n = 2; n <= 12; n++) NUMS.push(n);

function bossNameFor(level) {
  const idx = Math.min(Math.max(level || 1, 1), BOSS_VARIANTS.length) - 1;
  return BOSS_VARIANTS[idx].name;
}

async function api(path, method, body) {
  const res = await fetch(path, {
    method: method || "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method || "GET"} ${path} failed (${res.status})`);
  return res.json();
}

export default function Page() {
  const [screen, setScreen] = useState("pick");
  const [error, setError] = useState("");

  const [lang, setLang] = useState("th");
  const langRef = useRef("th");
  const [muted, setMutedState] = useState(true);

  const [students, setStudents] = useState([]);
  const [teacherRows, setTeacherRows] = useState([]);
  const [newName, setNewName] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const confirmTimer = useRef(null);

  const [current, setCurrent] = useState(null);
  const currentRef = useRef(null);

  const roundRef = useRef(null);
  const stageRef = useRef(null);
  const timerRef = useRef(null);

  const [hearts, setHearts] = useState(0);
  const [maxHearts, setMaxHearts] = useState(0);
  const [roundMeta, setRoundMeta] = useState(null);
  const [question, setQuestion] = useState("");
  const [qCount, setQCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [banner, setBanner] = useState(null);
  const [winVisible, setWinVisible] = useState(false);
  const [tableAllowed, setTableAllowed] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerPct, setTimerPct] = useState(0);
  const [tableOpen, setTableOpen] = useState(false);

  /* Esc closes the table */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setTableOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMutedState(isMuted());
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "th" || saved === "en") {
        setLang(saved);
        langRef.current = saved;
      }
    } catch {
      // storage unavailable; keep the default
    }
    loadStudents();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(confirmTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleLang() {
    sfx.tap();
    const next = lang === "th" ? "en" : "th";
    setLang(next);
    langRef.current = next;
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // storage unavailable; keep in-memory value
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.tap();
  }

  function toggleTable() {
    sfx.tap();
    setTableOpen((v) => !v);
  }

  function setStudent(st) {
    currentRef.current = st;
    setCurrent(st);
  }

  function savePatch(id, body) {
    api(`/api/students/${id}`, "PATCH", body).catch(() => setError("errSave"));
  }

  async function loadStudents() {
    try {
      const data = await api("/api/students");
      setStudents(data.students);
    } catch {
      setError("errLoadStudents");
    }
  }

  async function loadTeacher() {
    try {
      const data = await api("/api/students");
      const rows = await Promise.all(
        data.students.map((s) => api(`/api/students/${s.id}`).then((d) => d.student))
      );
      setTeacherRows(rows);
    } catch {
      setError("errLoadStudents");
    }
  }

  function stopRound() {
    clearInterval(timerRef.current);
    roundRef.current = null;
    setTableOpen(false);
    setBusy(false);
    if (stageRef.current) stageRef.current.reset();
  }

  function go(name) {
    sfx.tap();
    if (name !== "battle") stopRound();
    setError("");
    setScreen(name);
    if (name === "pick") loadStudents();
    if (name === "teacher") loadTeacher();
  }

  async function pickStudent(id) {
    sfx.tap();
    try {
      const data = await api(`/api/students/${id}`);
      setStudent(data.student);
      go("mode");
    } catch {
      setError("errLoadStudent");
    }
  }

  async function addStudent() {
    const name = newName.trim();
    if (!name) return;
    try {
      await api("/api/students", "POST", { name });
      setNewName("");
      loadTeacher();
    } catch {
      setError("errAdd");
    }
  }

  async function removeStudent(id) {
    if (confirmId !== id) {
      setConfirmId(id);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmId(null), 2000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmId(null);
    try {
      await api(`/api/students/${id}`, "DELETE");
      loadTeacher();
    } catch {
      setError("errRemove");
    }
  }

  function applyRange(id, loVal, hiVal) {
    const min = Math.min(loVal, hiVal);
    const max = Math.max(loVal, hiVal);
    setTeacherRows((rows) => rows.map((r) => (r.id === id ? { ...r, min, max } : r)));
    savePatch(id, { min, max });
  }

  /* ---- battle ---- */

  function startRound(modeKey) {
    sfx.tap();
    const st = currentRef.current;
    if (!st) return;
    if (stageRef.current) stageRef.current.reset();
    const mode = MODES[modeKey];
    const level = st.levels[modeKey] || 1;
    const max = heartsForLevel(level);
    roundRef.current = {
      modeKey, mode, level,
      maxHearts: max, hearts: max,
      fact: null, lastKey: null, busy: false,
    };
    setMaxHearts(max);
    setHearts(max);
    setRoundMeta({ modeKey, level });
    setWinVisible(false);
    setBanner(null);
    setTableAllowed(mode.table);
    setTimerVisible(!!mode.timer);
    setTimerPct(0);
    setError("");
    setScreen("battle");
    nextFact();
  }

  function nextFact() {
    const round = roundRef.current;
    const st = currentRef.current;
    if (!round || !st) return;
    const pool = factPool(st.min, st.max);
    round.fact = pickFact(pool, st.weak, Math.random, round.lastKey);
    round.lastKey = factKey(round.fact);
    setQuestion(`${round.fact.a} x ${round.fact.b} = ?`);
    setQCount((c) => c + 1);
    setFeedback(null);
    setHearts(round.hearts);
    setBusy(false);
    startTimer();
  }

  function startTimer() {
    clearInterval(timerRef.current);
    const round = roundRef.current;
    if (!round.mode.timer) return;
    const total = round.mode.timer * 1000;
    const deadline = Date.now() + total;
    setTimerPct(100);
    timerRef.current = setInterval(() => {
      const left = deadline - Date.now();
      setTimerPct(Math.max(0, (left / total) * 100));
      if (left <= 0) {
        clearInterval(timerRef.current);
        answer(null);
      }
    }, 100);
  }

  async function answer(value) {
    const round = roundRef.current;
    if (!round || round.busy) return;
    round.busy = true;
    setBusy(true);
    clearInterval(timerRef.current);
    const st = currentRef.current;
    const f = round.fact;
    const key = factKey(f);
    const product = f.a * f.b;
    const correct = value === product;
    const weak = updateWeak(st.weak, key, correct);
    setStudent({ ...st, weak });
    savePatch(st.id, { weak });
    const vars = { a: f.a, b: f.b, c: product };
    if (correct) {
      setFeedback({ key: "feedbackHit", vars, cls: "good" });
      round.hearts = applyAnswer(round.hearts, round.maxHearts, true, round.mode.reset);
      setHearts(round.hearts);
      sfx.hit();
      await stageRef.current.playAttack();
      if (round.hearts === 0) return winRound();
    } else {
      setFeedback({ key: value === null ? "feedbackSlow" : "feedbackMiss", vars, cls: "bad" });
      sfx.hurt();
      await stageRef.current.playHurt();
      if (round.mode.reset) {
        round.hearts = round.maxHearts;
        setHearts(round.hearts);
        sfx.heal();
        await stageRef.current.playRecover();
      }
    }
    if (!roundRef.current) return;
    round.busy = false;
    nextFact();
  }

  function winRound() {
    const round = roundRef.current;
    const st = currentRef.current;
    const leveledUp = round.level < MAX_LEVEL;
    const newLevel = Math.min(round.level + 1, MAX_LEVEL);
    const levels = { ...st.levels, [round.modeKey]: newLevel };
    setStudent({ ...st, levels });
    savePatch(st.id, { levels });
    clearInterval(timerRef.current);
    setQuestion("");
    setWinVisible(true);
    setBanner(leveledUp ? { key: "bannerLevelUp", vars: { lvl: newLevel } } : { key: "bannerWin" });
    sfx.win();
    stageRef.current.playWin({
      levelUp: leveledUp,
      text: t(langRef.current, "levelUpFx", { lvl: newLevel }),
    });
  }

  const sc = (name) => "screen" + (screen === name ? " active" : "");
  const levelNow = roundMeta ? roundMeta.level : 1;
  const levelLabel = roundMeta
    ? t(lang, "levelLabel", { mode: t(lang, `mode_${roundMeta.modeKey}`), lvl: roundMeta.level })
    : "";

  return (
    <>
      <div className="topbar">
        <button type="button" onClick={toggleMute}>
          {t(lang, muted ? "soundOff" : "soundOn")}
        </button>
        <button type="button" onClick={toggleLang}>
          {lang === "th" ? "EN" : "TH"}
        </button>
      </div>

      <h1>{t(lang, "title")}</h1>
      {error ? <p className="error">{t(lang, error)}</p> : null}

      <div className={sc("pick")}>
        <h2>{t(lang, "whoPlaying")}</h2>
        <div className="list">
          {students.map((st) => (
            <button key={st.id} className="big" onClick={() => pickStudent(st.id)}>
              {st.name}
            </button>
          ))}
        </div>
        {students.length === 0 ? (
          <p className="muted">{t(lang, "noStudents")}</p>
        ) : null}
        <button className="ghost" onClick={() => go("teacher")}>{t(lang, "teacher")}</button>
      </div>

      <div className={sc("teacher")}>
        <h2>{t(lang, "teacher")}</h2>
        <div className="row">
          <input
            placeholder={t(lang, "namePlaceholder")}
            maxLength={24}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addStudent(); }}
          />
          <button onClick={addStudent}>{t(lang, "add")}</button>
        </div>
        <div className="list">
          {teacherRows.map((st) => (
            <div key={st.id} className="card">
              <div>
                <b>{st.name}</b>
                <br />
                <small>
                  {t(lang, "weakFacts")}{" "}
                  {Object.keys(st.weak || {}).join(", ") || t(lang, "noneWeak")}
                </small>
              </div>
              <div className="row">
                <span>{t(lang, "tables")}</span>
                <select
                  value={st.min}
                  onChange={(e) => applyRange(st.id, Number(e.target.value), st.max)}
                >
                  {NUMS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>{t(lang, "to")}</span>
                <select
                  value={st.max}
                  onChange={(e) => applyRange(st.id, st.min, Number(e.target.value))}
                >
                  {NUMS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button className="ghost" onClick={() => removeStudent(st.id)}>
                  {confirmId === st.id ? t(lang, "confirmRemove") : t(lang, "remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={() => go("pick")}>{t(lang, "back")}</button>
      </div>

      <div className={sc("mode")}>
        <h2>{current ? t(lang, "pickModeNamed", { name: current.name }) : t(lang, "pickMode")}</h2>
        <div className="list">
          {Object.keys(MODES).map((key) => {
            const lvl = (current && current.levels[key]) || 1;
            return (
              <button key={key} className="big modecard" onClick={() => startRound(key)}>
                <b>{t(lang, "modeCard", { mode: t(lang, `mode_${key}`), lvl })}</b>
                <span>
                  {t(lang, `hint_${key}`)} {t(lang, "bossHp", { hp: heartsForLevel(lvl) })}
                </span>
              </button>
            );
          })}
        </div>
        <button className="ghost" onClick={() => go("pick")}>{t(lang, "back")}</button>
      </div>

      <div className={sc("battle")}>
        <BattleStage
          ref={stageRef}
          hearts={hearts}
          maxHearts={maxHearts}
          level={levelNow}
          levelLabel={levelLabel}
          bossName={bossNameFor(levelNow)}
          banner={banner ? t(lang, banner.key, banner.vars) : ""}
          timerVisible={timerVisible}
          timerPct={timerPct}
        />
        <div className="question">{question}</div>
        {!winVisible ? (
          <InkPad
            key={qCount}
            onAnswer={answer}
            disabled={busy}
            labels={{
              clear: t(lang, "clear"),
              attack: t(lang, "attack"),
              write: t(lang, "write"),
              pad: t(lang, "pad"),
            }}
          />
        ) : null}
        <div className={feedback ? `feedback ${feedback.cls}` : "feedback"}>
          {feedback ? t(lang, feedback.key, feedback.vars) : ""}
        </div>
        {winVisible ? (
          <div className="row">
            <button
              className="big"
              style={{ width: "auto" }}
              onClick={() => startRound(roundRef.current.modeKey)}
            >
              {t(lang, "nextBoss")}
            </button>
            <button className="ghost" onClick={() => go("mode")}>{t(lang, "changeMode")}</button>
            <button className="ghost" onClick={() => go("pick")}>{t(lang, "home")}</button>
          </div>
        ) : null}
        {tableAllowed ? <TablePanel open={tableOpen} /> : null}
        <div className="row">
          {tableAllowed ? (
            <button className={tableOpen ? "big toggled" : "big"} style={{ width: "auto" }} onClick={toggleTable}>
              {t(lang, tableOpen ? "hideTable" : "showTable")}
            </button>
          ) : null}
          <button className="ghost" onClick={() => go("mode")}>{t(lang, "quit")}</button>
        </div>
      </div>
    </>
  );
}
