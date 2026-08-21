"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import gsap from "gsap";

export const BOSS_VARIANTS = [
  { name: "Grimble", body: "#7C4DBE", dark: "#3A2455" },
  { name: "Snorple", body: "#4CAF5E", dark: "#1E5A2E" },
  { name: "Scorcho", body: "#E5533C", dark: "#7A241A" },
  { name: "Blizzo", body: "#3B7BD6", dark: "#1B3B70" },
  { name: "King Goldjaw", body: "#E5B33C", dark: "#7A5B14" },
];

const BATTLE_SVG = `
<svg viewBox="0 -24 240 124" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="ground-g"><rect x="-40" y="-80" width="320" height="176" /></clipPath></defs>
  <g data-part="p-char">
    <g clip-path="url(#ground-g)">
      <rect data-part="p-leg1" x="28" y="86" width="8" height="10" fill="#F2A03D" />
      <rect data-part="p-leg2" x="44" y="86" width="8" height="10" fill="#F2A03D" />
    </g>
    <g data-part="p-body">
      <rect data-part="p-torso" x="20" y="44" width="40" height="46" fill="#16161E" />
      <rect x="29" y="64" width="22" height="26" fill="#F5F0E8" />
      <rect data-part="p-left-hand" x="12" y="60" width="8" height="20" fill="#16161E" />
      <rect data-part="p-right-hand" x="60" y="60" width="8" height="20" fill="#16161E" />
      <rect x="26" y="49" width="10" height="10" fill="#FFFFFF" />
      <rect x="44" y="49" width="10" height="10" fill="#FFFFFF" />
      <g data-part="p-eyes">
        <rect data-part="p-eye1" x="29" y="52" width="5" height="5" fill="#16161E" />
        <rect data-part="p-eye2" x="47" y="52" width="5" height="5" fill="#16161E" />
      </g>
      <rect data-part="p-beak" x="35" y="60" width="10" height="6" fill="#F2A03D" />
    </g>
  </g>
  <g data-part="b-char">
    <g clip-path="url(#ground-g)">
      <rect data-part="b-leg1" class="b-dark" x="160" y="78" width="14" height="18" fill="#3A2455" />
      <rect data-part="b-leg2" class="b-dark" x="196" y="78" width="14" height="18" fill="#3A2455" />
    </g>
    <g data-part="b-body">
      <rect class="b-dark" x="150" y="0" width="12" height="20" fill="#3A2455" />
      <rect class="b-dark" x="208" y="0" width="12" height="20" fill="#3A2455" />
      <rect data-part="b-torso" class="b-fill" x="150" y="12" width="70" height="70" fill="#7C4DBE" />
      <rect data-part="b-left-hand" class="b-fill" x="138" y="38" width="12" height="26" fill="#7C4DBE" />
      <rect data-part="b-right-hand" class="b-fill" x="220" y="38" width="12" height="26" fill="#7C4DBE" />
      <g data-part="b-brows">
        <rect class="b-dark" x="160" y="22" width="16" height="6" fill="#3A2455" />
        <rect class="b-dark" x="194" y="22" width="16" height="6" fill="#3A2455" />
      </g>
      <rect x="161" y="30" width="14" height="10" fill="#FFFFFF" />
      <rect x="195" y="30" width="14" height="10" fill="#FFFFFF" />
      <g data-part="b-eyes">
        <rect data-part="b-eye1" x="163" y="32" width="7" height="6" fill="#16161E" />
        <rect data-part="b-eye2" x="197" y="32" width="7" height="6" fill="#16161E" />
      </g>
      <g data-part="b-mouth">
        <rect class="b-dark" x="174" y="56" width="22" height="10" fill="#3A2455" />
        <rect x="177" y="56" width="5" height="4" fill="#FFFFFF" />
        <rect x="188" y="56" width="5" height="4" fill="#FFFFFF" />
      </g>
    </g>
    <g data-part="b-heal">
      <rect x="156" y="74" width="5" height="5" fill="#5DBB74" opacity="0" />
      <rect x="176" y="70" width="5" height="5" fill="#5DBB74" opacity="0" />
      <rect x="198" y="73" width="5" height="5" fill="#5DBB74" opacity="0" />
      <rect x="214" y="68" width="5" height="5" fill="#5DBB74" opacity="0" />
    </g>
  </g>
  <g data-part="hpbar"></g>
  <g data-part="fx"></g>
  <g data-part="confetti"></g>
</svg>`;

const P_PIVOT = "40 90";
const B_PIVOT = "185 82";
const P_LEG_X = [32, 48];
const GROUND = 96;
const NS = "http://www.w3.org/2000/svg";

const HP_GREEN = "#5DBB74";
const HP_CHIP = "#2E2E3A";
const BAR_X = 140;
const BAR_W = 90;
/* The scene svg overflows the stage top (overflow: hidden) by up to ~11
   viewBox units at the widest layout; keep the bar low enough to stay visible. */
const BAR_Y = -8;
const SEG_H = 6;
const SEG_GAP = 2;

function variantFor(level) {
  const idx = Math.min(Math.max(level || 1, 1), BOSS_VARIANTS.length) - 1;
  return BOSS_VARIANTS[idx];
}

const BattleStage = forwardRef(function BattleStage(props, ref) {
  const { hearts, maxHearts, level, levelLabel, bossName, banner, timerVisible, timerPct } = props;
  const sceneRef = useRef(null);
  const vignetteRef = useRef(null);
  const levelUpRef = useRef(null);
  const rig = useRef(null);
  const heartsRef = useRef(hearts);

  useEffect(() => {
    const sceneEl = sceneRef.current;
    sceneEl.innerHTML = BATTLE_SVG;
    const q = (n) => sceneEl.querySelector(`[data-part="${n}"]`);
    const r = {
      pChar: q("p-char"), pBody: q("p-body"), pEyes: q("p-eyes"),
      pEyeRects: [q("p-eye1"), q("p-eye2")], pLegs: [q("p-leg1"), q("p-leg2")],
      pLh: q("p-left-hand"), pRh: q("p-right-hand"),
      bChar: q("b-char"), bBody: q("b-body"), bEyes: q("b-eyes"), bTorso: q("b-torso"),
      bLh: q("b-left-hand"), bRh: q("b-right-hand"),
      bBrows: q("b-brows"), bMouth: q("b-mouth"), bHeal: [...q("b-heal").children],
    };
    rig.current = {
      sceneEl, q, r, idles: [], winTls: [],
      svg: sceneEl.querySelector("svg"),
      segs: [], shown: hearts, busy: false,
      variant: variantFor(level),
    };
    applyVariant();
    buildHpBar(maxHearts);
    paintHp(hearts);
    startIdle();
    return () => {
      stopIdle();
      killWin();
      rig.current = null;
      sceneEl.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    heartsRef.current = hearts;
    const g = rig.current;
    if (!g) return;
    if (g.segs.length !== maxHearts) buildHpBar(maxHearts);
    // during a one-shot the timeline owns segment visuals; sync happens on completion
    if (!g.busy) paintHp(hearts);
  }, [hearts, maxHearts]);

  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    g.variant = variantFor(level);
    applyVariant();
  }, [level]);

  function applyVariant() {
    const g = rig.current;
    if (!g) return;
    const v = g.variant;
    g.sceneEl.querySelectorAll(".b-fill").forEach((el) => el.setAttribute("fill", v.body));
    g.sceneEl.querySelectorAll(".b-dark").forEach((el) => el.setAttribute("fill", v.dark));
  }

  function buildHpBar(count) {
    const g = rig.current;
    if (!g) return;
    const group = g.q("hpbar");
    group.innerHTML = "";
    const frame = document.createElementNS(NS, "rect");
    frame.setAttribute("x", BAR_X - 2); frame.setAttribute("y", BAR_Y - 2);
    frame.setAttribute("width", BAR_W + 4); frame.setAttribute("height", SEG_H + 4);
    frame.setAttribute("fill", "#16161E");
    group.appendChild(frame);
    g.segs = [];
    const n = Math.max(count || 0, 1);
    const segW = (BAR_W - (n - 1) * SEG_GAP) / n;
    for (let i = 0; i < n; i++) {
      const seg = document.createElementNS(NS, "rect");
      seg.setAttribute("x", BAR_X + i * (segW + SEG_GAP));
      seg.setAttribute("y", BAR_Y);
      seg.setAttribute("width", segW);
      seg.setAttribute("height", SEG_H);
      seg.setAttribute("fill", HP_GREEN);
      group.appendChild(seg);
      g.segs.push(seg);
    }
  }

  function paintHp(count) {
    const g = rig.current;
    if (!g) return;
    g.segs.forEach((seg, i) => {
      gsap.set(seg, { clearProps: "all" });
      seg.setAttribute("fill", i < count ? HP_GREEN : HP_CHIP);
    });
    g.shown = count;
  }

  function spawnShards(seg) {
    const g = rig.current;
    if (!g) return;
    const fxGroup = g.q("fx");
    const sx = parseFloat(seg.getAttribute("x")) + parseFloat(seg.getAttribute("width")) / 2;
    const sy = BAR_Y + SEG_H / 2;
    for (let i = 0; i < 3; i++) {
      const shard = document.createElementNS(NS, "rect");
      shard.setAttribute("x", sx); shard.setAttribute("y", sy);
      shard.setAttribute("width", 2.5); shard.setAttribute("height", 2.5);
      shard.setAttribute("fill", HP_GREEN);
      fxGroup.appendChild(shard);
      gsap.timeline({ onComplete: () => shard.remove() })
        .to(shard, {
          x: (Math.random() * 2 - 1) * 16,
          y: 10 + Math.random() * 10,
          rotation: Math.random() * 180,
          duration: 0.4,
          ease: "power1.in",
        })
        .to(shard, { opacity: 0, duration: 0.12 }, "-=0.12");
    }
  }

  function spawnDamageNumber() {
    const g = rig.current;
    if (!g) return;
    const fxGroup = g.q("fx");
    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", 178 + Math.random() * 14);
    text.setAttribute("y", 14);
    text.setAttribute("font-family", "'Courier New', monospace");
    text.setAttribute("font-weight", "800");
    text.setAttribute("font-size", "15");
    text.setAttribute("fill", "#FFF3D6");
    text.setAttribute("stroke", "#16161E");
    text.setAttribute("stroke-width", "0.9");
    text.setAttribute("paint-order", "stroke");
    text.textContent = "-1";
    fxGroup.appendChild(text);
    gsap.timeline({ onComplete: () => text.remove() })
      .fromTo(text, { scale: 0.4, transformOrigin: "center", opacity: 1 },
        { scale: 1.15, duration: 0.14, ease: "back.out(3)" })
      .to(text, { y: -22, duration: 0.55, ease: "sine.out" }, 0)
      .to(text, { opacity: 0, duration: 0.2 }, 0.45);
  }

  function startIdle() {
    const g = rig.current;
    if (!g) return;
    stopIdle();
    const { r } = g;
    g.idles.push(
      gsap.timeline({ repeat: -1, yoyo: true })
        .to(r.pBody, { scaleY: 1.03, svgOrigin: P_PIVOT, duration: 1.4, ease: "sine.inOut" })
        .to([r.pLh, r.pRh], { y: -1.2, duration: 1.4, ease: "sine.inOut" }, "<"),
      gsap.timeline({ repeat: -1, repeatDelay: 2.4 })
        .to(r.pEyeRects, { scaleY: 0.15, duration: 0.07, transformOrigin: "center" })
        .to(r.pEyeRects, { scaleY: 1, duration: 0.09 }),
      gsap.timeline({ repeat: -1, yoyo: true })
        .to(r.bBody, { y: -3, scaleY: 1.02, svgOrigin: B_PIVOT, duration: 1.9, ease: "sine.inOut" })
        .to([r.bLh, r.bRh], { y: -4, duration: 1.9, ease: "sine.inOut" }, "<")
    );
  }

  function stopIdle() {
    const g = rig.current;
    if (!g) return;
    g.idles.forEach((t) => t.kill());
    g.idles = [];
  }

  function killWin() {
    const g = rig.current;
    if (!g) return;
    g.winTls.forEach((t) => t.kill());
    g.winTls = [];
  }

  function resetRig() {
    const g = rig.current;
    if (!g) return;
    const { sceneEl, q, r } = g;
    gsap.set(sceneEl.querySelectorAll("[data-part]"), { clearProps: "all" });
    gsap.set(g.svg, { clearProps: "transform" });
    applyVariant();
    r.bHeal.forEach((h) => h.setAttribute("opacity", "0"));
    q("confetti").innerHTML = "";
    q("fx").innerHTML = "";
    gsap.set(r.bChar, { opacity: 1 });
    if (vignetteRef.current) gsap.set(vignetteRef.current, { opacity: 0 });
  }

  function oneShot(build) {
    const g = rig.current;
    if (!g) return Promise.resolve();
    stopIdle();
    g.busy = true;
    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          const g2 = rig.current;
          if (g2) g2.busy = false;
          resetRig();
          paintHp(heartsRef.current);
          startIdle();
          resolve();
        },
      });
      build(tl, g.r);
    });
  }

  const playAttack = () => oneShot((tl, r) => {
    const g = rig.current;
    const seg = g.shown > 0 ? g.segs[g.shown - 1] : null;
    g.shown = Math.max(0, g.shown - 1);
    gsap.set(r.pRh, { svgOrigin: "60 60" });
    tl.to(r.pBody, { rotation: -7, x: -5, svgOrigin: P_PIVOT, duration: 0.25, ease: "power2.out" })
      .to(r.pRh, { y: -12, rotation: 28, duration: 0.25 }, "<")
      .addLabel("go")
      .to(r.pChar, { x: 64, duration: 0.2, ease: "power3.in" }, "go")
      .addLabel("hit")
      .to(r.pRh, { rotation: -34, duration: 0.1, ease: "power4.in" }, "hit")
      .to(r.bChar, { x: 10, duration: 0.12, ease: "power3.out" }, "hit")
      .to(r.bChar, { opacity: 0.25, duration: 0.06, yoyo: true, repeat: 3 }, "hit")
      .call(spawnDamageNumber, null, "hit");
    if (seg) {
      tl.set(seg, { attr: { fill: "#FFFFFF" } }, "hit")
        .to(seg, { opacity: 0.2, duration: 0.05, yoyo: true, repeat: 3 }, "hit")
        .call(() => spawnShards(seg), null, "hit+=0.06")
        .set(seg, { attr: { fill: HP_CHIP }, opacity: 1, scaleY: 0.4, transformOrigin: "center" }, "hit+=0.24")
        .to(seg, { scaleY: 1, duration: 0.15, ease: "back.out(2)" }, "hit+=0.26");
    }
    tl.to(r.pChar, { x: 0, duration: 0.3, ease: "power2.inOut", delay: 0.2 })
      .to(r.bChar, { x: 0, duration: 0.3 }, "<");
  });

  const playHurt = () => oneShot((tl, r) => {
    const g = rig.current;
    gsap.set(r.bLh, { svgOrigin: "150 38" });
    tl.to(r.bBody, { rotation: 6, x: 6, y: -4, svgOrigin: B_PIVOT, duration: 0.3, ease: "power2.out" })
      .to(r.bLh, { y: -16, rotation: -30, duration: 0.3 }, "<")
      .addLabel("go")
      .to(r.bChar, { x: -64, duration: 0.2, ease: "power3.in" }, "go")
      .addLabel("hit")
      .to(r.bLh, { rotation: 26, duration: 0.1, ease: "power4.in" }, "hit")
      .to(r.pChar, { x: -12, duration: 0.14, ease: "power3.out" }, "hit")
      .to(r.pBody, { rotation: -9, svgOrigin: P_PIVOT, duration: 0.14 }, "hit")
      .to(g.svg, { x: -5, duration: 0.05, yoyo: true, repeat: 5, ease: "none" }, "hit")
      .set(g.svg, { x: 0 }, "hit+=0.3");
    if (vignetteRef.current) {
      tl.to(vignetteRef.current, { opacity: 1, duration: 0.08 }, "hit")
        .to(vignetteRef.current, { opacity: 0, duration: 0.45 }, "hit+=0.12");
    }
    tl.to(r.bChar, { x: 0, duration: 0.35, ease: "power2.inOut", delay: 0.2 })
      .to(r.pChar, { x: 0, duration: 0.3 }, "<")
      .to(r.pBody, { rotation: 0, duration: 0.3 }, "<");
  });

  const playRecover = () => oneShot((tl, r) => {
    const g = rig.current;
    const fills = [r.bTorso, r.bLh, r.bRh];
    g.shown = g.segs.length;
    tl.to(r.bBody, { y: 4, scaleY: 0.94, svgOrigin: B_PIVOT, duration: 0.25, ease: "power2.in" })
      .addLabel("burst")
      .to(r.bBody, { y: -6, scaleY: 1.12, duration: 0.2, ease: "power3.out" }, "burst")
      .to([r.bLh, r.bRh], { y: -14, duration: 0.2 }, "burst")
      .to(fills, { attr: { fill: "#FFFFFF" }, duration: 0.18, yoyo: true, repeat: 3 }, "burst")
      .to(r.bHeal, { y: -30, opacity: 1, duration: 0.5, stagger: 0.09, ease: "sine.out" }, "burst")
      .to(r.bHeal, { opacity: 0, duration: 0.2, stagger: 0.09 }, "burst+=0.4")
      .set(g.segs, { attr: { fill: "#EAFBEF" }, stagger: 0.05 }, "burst")
      .to(g.segs, { attr: { fill: HP_GREEN }, duration: 0.12, stagger: 0.05 }, "burst+=0.08")
      .fromTo(g.segs, { scaleY: 1.6, transformOrigin: "center" },
        { scaleY: 1, duration: 0.2, ease: "back.out(2)", stagger: 0.05 }, "burst")
      .to(r.bBody, { y: 0, scaleY: 1, duration: 0.3, ease: "power2.inOut", delay: 0.3 })
      .to([r.bLh, r.bRh], { y: 0, duration: 0.3 }, "<");
  });

  function playWin(opts) {
    const g = rig.current;
    if (!g) return Promise.resolve();
    const { levelUp = false, text = "LEVEL UP" } = opts || {};
    stopIdle();
    const { q, r } = g;
    const group = q("confetti");
    group.innerHTML = "";
    const COLORS = ["#F2A03D", "#E5533C", "#5DBB74", "#3B7BD6", "#7C4DBE"];
    const bursts = [];
    for (let i = 0; i < 26; i++) {
      const rect = document.createElementNS(NS, "rect");
      const sz = 3 + Math.random() * 3;
      rect.setAttribute("x", 42); rect.setAttribute("y", 54);
      rect.setAttribute("width", sz); rect.setAttribute("height", sz);
      rect.setAttribute("fill", COLORS[i % COLORS.length]);
      rect.setAttribute("opacity", "0");
      group.appendChild(rect);
      const dx = (Math.random() * 2 - 0.55) * 95, upY = -(28 + Math.random() * 48);
      bursts.push(
        gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.9 + Math.random() * 0.9, delay: Math.random() * 0.5 })
          .set(rect, { x: 0, y: 0, opacity: 1, rotation: Math.random() * 90 })
          .to(rect, { x: dx * 0.6, y: upY, rotation: "+=140", duration: 0.55, ease: "sine.out" })
          .to(rect, { x: dx, y: GROUND - 54 - sz, rotation: "+=160", duration: 0.8, ease: "power1.in" })
          .to(rect, { opacity: 0, duration: 0.2 }, "-=0.15")
      );
    }
    r.pLegs.forEach((l, i) => gsap.set(l, { svgOrigin: `${P_LEG_X[i]} ${GROUND}` }));
    const dance = gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true });
    const BEAT = 0.32;
    for (let bar = 0; bar < 4; bar++) {
      const dir = bar % 2 === 0 ? 1 : -1;
      dance
        .to(r.pBody, { rotation: 6 * dir, x: 3 * dir, y: -4, svgOrigin: P_PIVOT, duration: BEAT, ease: "power2.out" })
        .to(dir > 0 ? r.pLegs[0] : r.pLegs[1], { scaleY: 0.55, duration: BEAT * 0.5 }, "<")
        .to(dir > 0 ? r.pLegs[0] : r.pLegs[1], { scaleY: 1, duration: BEAT * 0.5 }, `<+=${BEAT * 0.5}`)
        .to(dir > 0 ? r.pRh : r.pLh, { y: -13, rotation: 14 * dir, duration: BEAT * 0.6 }, "<")
        .to(dir > 0 ? r.pRh : r.pLh, { y: 0, rotation: 0, duration: BEAT * 0.4 }, `<+=${BEAT * 0.6}`)
        .to(r.pBody, { y: 0, duration: BEAT * 0.5 }, "<");
    }
    return new Promise((resolve) => {
      const master = gsap.timeline({ onComplete: resolve })
        .to(r.bChar, { x: "+=4", duration: 0.07, yoyo: true, repeat: 7 })
        .to(r.bChar, { rotation: -82, svgOrigin: "160 96", duration: 0.55, ease: "power3.in", delay: 0.15 })
        .to(r.bChar, { rotation: -78, duration: 0.1 })
        .to(r.bChar, { rotation: -82, duration: 0.12 })
        .to(r.bChar, { opacity: 0.55, duration: 0.5 })
        .addLabel("party", "-=0.45")
        .call(() => bursts.forEach((t) => t.play(0)), null, "party")
        .to(r.pChar, { y: -28, duration: 0.34, ease: "sine.out" }, "party+=0.12")
        .to(r.pChar, { y: 0, duration: 0.2, ease: "power3.in" }, "party+=0.5");
      if (levelUp && levelUpRef.current) {
        const lu = levelUpRef.current;
        lu.textContent = text;
        master
          .set(lu, { opacity: 1, y: 30, scale: 0.4 }, "party+=0.15")
          .to(lu, { scale: 1.15, y: 12, duration: 0.3, ease: "back.out(2.5)" }, "party+=0.15")
          .to(lu, { scale: 1, duration: 0.15 })
          .to(lu, { y: -26, duration: 1.4, ease: "sine.out" })
          .to(lu, { opacity: 0, duration: 0.4 }, "-=0.4");
      }
      master.call(() => dance.play(), null, "party+=0.75");
      g.winTls = [master, dance, ...bursts];
    });
  }

  function reset() {
    killWin();
    const g = rig.current;
    if (g) g.busy = false;
    resetRig();
    paintHp(heartsRef.current);
    if (levelUpRef.current) gsap.set(levelUpRef.current, { opacity: 0 });
    startIdle();
  }

  useImperativeHandle(ref, () => ({ playAttack, playHurt, playRecover, playWin, reset }));

  return (
    <div className="stage">
      {timerVisible ? <div className="timerbar" style={{ width: `${timerPct}%` }} /> : null}
      <div className="hud">
        <div style={{ fontWeight: 700, letterSpacing: ".04em" }}>{bossName}</div>
        <div>{levelLabel}</div>
      </div>
      {banner ? <div className="banner">{banner}</div> : null}
      <div className="scene" ref={sceneRef} />
      <div
        ref={vignetteRef}
        style={{
          position: "absolute", inset: 0, opacity: 0, pointerEvents: "none", zIndex: 2,
          background: "radial-gradient(ellipse at center, rgba(229,83,60,0) 52%, rgba(200,40,30,0.5) 100%)",
        }}
      />
      <div
        ref={levelUpRef}
        style={{
          position: "absolute", left: 0, right: 0, top: "34%", textAlign: "center",
          opacity: 0, pointerEvents: "none", zIndex: 3,
          fontFamily: "'Courier New', monospace", fontWeight: 800, fontSize: "2.1rem",
          letterSpacing: ".14em", color: "#E5B33C",
          textShadow: "2px 2px 0 #16161E, -2px 2px 0 #16161E, 2px -2px 0 #16161E, -2px -2px 0 #16161E",
        }}
      />
    </div>
  );
});

export default BattleStage;
