/*
 * TRACK 04 — 声の品ぞろえ（VOICE LIBRARY）
 *
 * コンセプト: 深夜のスタジオの「テープ棚」が、2000 粒の LED ウォールに化ける。
 * 1 粒 = 1 つの声。言語は、ラジオのチューナーの針が端から端まで拾っていく。
 *
 * 絵コンテ（すべてナレーションの行・行内のフレーズ・シーン境界から計算。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に、見出し「声の品ぞろえ」が 1 文字ずつせり上がる（中央・大）。
 *                 上に MONO「04 — VOICE LIBRARY」。「品ぞろえ」だけコーラル。
 *  B1  t4-1 後半  「声の品ぞろえ」（音声の間から検出）: 見出しの下に棚板が引かれ、テープの背 30 本が左から順に立つ。
 *  B2  t4-2 前半  「すぐに使える声は、」: 見出しが左上へ収まる。中央に「VOICES」の段がせり上がり、
 *                 右の PRESET WALL に 2000 粒の空の LED が左から並ぶ。棚のテープ 30 本が（遠いものから）縮んで粒になり、
 *                 ウォールの左端中央に白い 30 粒として着地（カウンターも 0,000 → 0,030 と白で刻む）。注記「以前は 30 種類」。
 *  B3  t4-2 後半  「2000種類以上」: 左端から波が広がり 1970 粒が一気にコーラルに点灯、カウンターは 30 → 2,000（桁幅固定）。
 *                 「以上」で「+」がはね、数字がひと押し膨らんで本来の字幅に詰まり、完了の光がウォールを左から右へ抜ける。
 *                 以後ウォールには実際の声の波形が右端から流れ込む（1 列 = 1 フレーム）。
 *  B4  t4-3 冒頭  「しかも、」: VOICES の段が上へ押し上げられて一歩下がり、その下に「LANGUAGES」の段が続いて現れる。
 *                 チューナーの目盛りが引かれ、20 個の言語コード（EN-US / EN-GB のような言語-地域）の札が暗いまま並ぶ。
 *  B5  t4-3 後半  「100を超える」: ミントの針が左から右へ走り、通過した札が順にミントに灯る。カウンター 000 → 100 は
 *                 針と同じ動き（針が 9 割で 100）。「超える」で「+」。「対応しています」で針が消え、全札がひと呼吸光って LOCKED。
 *  B6  tail       両方の段が点いたまま、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FPS, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import {
  BY_RANK,
  CODES,
  Chip,
  LedWall,
  SEED,
  Spine,
  TOTAL_VOICES,
  TapeCounter,
  WALL,
  WALL_W,
  lerpColor,
  phraseStarts,
  rmsAtTime,
} from "./T4Library/parts";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t4");
const L1 = line("t4-1");
const L2 = line("t4-2");
const L3 = line("t4-3");
const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);
const IDS = ["t4-1", "t4-2", "t4-3"];

const P1b = phraseStarts("t4-1", 2, [0, 0.56])[1]; // 「声の品ぞろえ」
const P2b = phraseStarts("t4-2", 2, [0, 0.58])[1]; // 「2000種類以上」
const P3b = phraseStarts("t4-3", 2, [0, 0.23])[1]; // 「100を超える…」

const SETTLE_A = L2.start - 0.42;
const ROW_A_IN = SETTLE_A + 0.3; // 見出しが半分ほど退いてから
const FLY_DUR = 0.55;
const FLY_SPREAD = 0.22; // 遠いテープから先に飛び立ち、着地がそろうように
const FLY_A = ROW_A_IN - 0.08;
const FLY_END = FLY_A + FLY_SPREAD + FLY_DUR;
const BURST_A = Math.max(P2b - 0.3, FLY_END + 0.3);
const BURST_B = Math.max(BURST_A + 0.45, Math.min(BURST_A + 0.9, L2.end - 0.05));
const PUSH_A = L3.start - 0.3;
const SWEEP_A = Math.max(P3b - 0.1, L3.start + 0.45);
const SWEEP_B = Math.max(SWEEP_A + 0.7, Math.min(SWEEP_A + 1.25, L3.end - 1.0));
const HIT_100 = SWEEP_A + 0.536 * (SWEEP_B - SWEEP_A); // 針が 9 割（= カウンター 100）に届く時刻（ease.out の逆算）

const TM = {
  headIn: E + 0.08,
  shelf: P1b - 0.05,
  settleA: SETTLE_A,
  settleB: SETTLE_A + 0.6,
  rowAIn: ROW_A_IN,
  counterIn: ROW_A_IN + 0.18,
  gridIn: ROW_A_IN + 0.05,
  flyA: FLY_A,
  flyEnd: FLY_END,
  foot: FLY_END + 0.05,
  burstA: BURST_A,
  burstB: BURST_B,
  plus2: Math.max(BURST_B, P2b + (L2.end - P2b) * 0.72), // 「以上」
  pushA: PUSH_A,
  pushB: L3.start + 0.25,
  rowBIn: L3.start,
  sweepA: SWEEP_A,
  sweepB: SWEEP_B,
  plus3: Math.max(HIT_100 + 0.03, P3b + 0.62), // 「超える」
  lock: Math.max(SWEEP_B + 0.12, at(L3, 0.66)), // 「対応しています」
  waveIn: 0, // 下で計算（完了の光が抜けたあと）
};
TM.waveIn = TM.plus2 + 0.5;

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80, w: 479 }; // w: 見出しの幅（実測）
const BIG = 1.5;
const BIG_CY = 436;
const ROW_H = 262;
const ROW_A_Y = 312;
const ROW_A_SOLO_Y = 452; // t4-2 の間は画面の中ほど
const ROW_B_Y = 602;
const PANEL_X = 776;
const PANEL_W = 1920 - PAD_X - PANEL_X;
const WALL_X = (PANEL_W - WALL_W) / 2;
const WALL_Y = 60;
const COUNTER_SIZE = 148;

// 棚（t4-1）
const SPINE = { w: 16, h: 72, gap: 9 };
const SHELF_W = SEED * (SPINE.w + SPINE.gap) - SPINE.gap;
const SHELF_X = 960 - SHELF_W / 2;
const SHELF_Y = 592;

// チューナー
const TUNE = { upY: 64, scaleY: 142, loY: 184, chipH: 36, margin: 58 };
const chipX = (i: number) => TUNE.margin + (i * (PANEL_W - TUNE.margin * 2)) / (CODES.length - 1);
const NEEDLE_X0 = 22;
const NEEDLE_X1 = PANEL_W - 22;

// ───────── 小さな部品 ─────────
const MonoLabel: React.FC<{ color: string; text: string; p: number; led?: boolean }> = ({ color, text, p, led = true }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      opacity: p,
      transform: `translateX(${(1 - p) * -14}px)`,
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: "0.18em",
      color: C.sub,
      whiteSpace: "nowrap",
    }}
  >
    {led && <div style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 10px ${color}` }} />}
    {text}
  </div>
);

// ───────── 見出し ─────────
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const s = mix(BIG, 1, settle);
  const bigW = HEAD.w * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(BIG_CY - bigH / 2 - HEAD.y, 0, settle);
  const chars = [..."声の品ぞろえ"];
  const lab = prog(t, TM.headIn + 0.25, TM.headIn + 0.7, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.2, TM.headIn + 0.8, ease.outQuint);
  return (
    <div
      style={{
        position: "absolute",
        left: HEAD.x,
        top: HEAD.y,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 24, marginBottom: 10 }}>
        <div style={{ width: 40 * rule, height: 3, background: C.coral, borderRadius: 2 }} />
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "0.2em",
            color: C.sub,
            opacity: lab,
            transform: `translateX(${(1 - lab) * -12}px)`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.coral }}>04</span> — VOICE LIBRARY
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.05, TM.headIn + i * 0.05 + 0.5, ease.outQuint);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - p) * 105}%)`,
                  color: i >= 2 ? C.coral : C.text,
                }}
              >
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── 棚のテープ（t4-1）→ LED の 30 粒へ飛ぶ ─────────
// テープ k は LED の k 番目（中心に近い順）へ。遠いものほど早く飛び立つ
const FLY_DELAY: number[] = (() => {
  const d = Array.from({ length: SEED }, (_, k) => {
    const cell = BY_RANK[k];
    const x0 = SHELF_X + k * (SPINE.w + SPINE.gap) + SPINE.w / 2;
    const y0 = SHELF_Y + SPINE.h / 2;
    return Math.hypot(PANEL_X + WALL_X + cell.x - x0, ROW_A_SOLO_Y + WALL_Y + cell.y - y0);
  });
  const max = Math.max(...d);
  const min = Math.min(...d);
  return d.map((v) => (1 - (v - min) / Math.max(1, max - min)) * FLY_SPREAD);
})();
const flyP = (t: number, k: number) => prog(t, TM.flyA + FLY_DELAY[k], TM.flyA + FLY_DELAY[k] + FLY_DUR, ease.inOut);

const Shelf: React.FC<{ t: number; rowY: number; rowRise: number }> = ({ t, rowY, rowRise }) => {
  const board = prog(t, TM.shelf - 0.1, TM.shelf + 0.45, ease.outQuint);
  const boardOut = prog(t, TM.flyA, TM.flyA + 0.35, ease.out);
  if (board <= 0) return null;
  return (
    <>
      {/* 棚板 */}
      <div
        style={{
          position: "absolute",
          left: 960 - (SHELF_W / 2 + 28) * board,
          top: SHELF_Y + SPINE.h + 6,
          width: (SHELF_W + 56) * board,
          height: 3,
          borderRadius: 2,
          background: C.borderHi,
          opacity: 1 - boardOut,
        }}
      />
      {Array.from({ length: SEED }, (_, k) => {
        const pin = springAt(t, TM.shelf + k * 0.022, { damping: 15, stiffness: 170 });
        if (pin <= 0) return null;
        const f = flyP(t, k);
        if (f >= 1) return null;
        const x0 = SHELF_X + k * (SPINE.w + SPINE.gap);
        const y0 = SHELF_Y + (1 - pin) * 26;
        if (f <= 0) {
          return (
            <div key={k} style={{ position: "absolute", left: x0, top: y0, opacity: clamp01(pin * 1.6) }}>
              <Spine w={SPINE.w} h={SPINE.h} seed={k + 1} />
            </div>
          );
        }
        // 飛行中: 縮みながら白い粒になる
        const cell = BY_RANK[k];
        const x1 = PANEL_X + WALL_X + cell.x;
        const y1 = rowY + rowRise + WALL_Y + cell.y;
        // 形は飛び始めてすぐ粒に縮み、粒のまま目的の位置へ滑り込む
        const shrink = prog(f, 0, 0.45, ease.out);
        const w = mix(SPINE.w, WALL.cellW, shrink);
        const h = mix(SPINE.h, WALL.cellH, shrink);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: mix(x0 + SPINE.w / 2, x1 + WALL.cellW / 2, f) - w / 2,
              top: mix(y0 + SPINE.h / 2, y1 + WALL.cellH / 2, f) - h / 2,
              width: w,
              height: h,
              borderRadius: mix(3, 1.6, shrink),
              background: lerpColor(C.panelHi, C.text, prog(f, 0, 0.35)),
              boxShadow: `0 0 ${12 * Math.sin(f * Math.PI)}px rgba(243,239,231,0.7)`,
            }}
          />
        );
      })}
    </>
  );
};

// ───────── VOICES の段（カウンター + LED ウォール） ─────────
const RowVoices: React.FC<{ t: number; y: number; rise: number; wave: number[] | null; dim: number }> = ({
  t,
  y,
  rise,
  wave,
  dim,
}) => {
  const inP = prog(t, TM.rowAIn, TM.rowAIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const seedOn = Array.from({ length: SEED }, (_, k) => flyP(t, k) >= 1);
  const seeded = seedOn.filter(Boolean).length;
  const burst = prog(t, TM.burstA, TM.burstB, (x) => 1 - (1 - x) ** 4);
  const count = t < TM.burstA ? seeded : SEED + (TOTAL_VOICES - SEED) * burst;
  const plus = springAt(t, TM.plus2, { damping: 11, stiffness: 190 });
  const numColor = lerpColor(C.text, C.coral, prog(t, TM.burstA, TM.burstA + 0.12));
  const glow = prog(t, TM.burstA, TM.burstB) * (1 - dim * 0.7);
  const cIn = prog(t, TM.counterIn, TM.counterIn + 0.5, ease.outQuint);
  // 「以上」で数字全体がひと押し（ばねの行き過ぎぶんだけ膨らむ）
  const thump = t >= TM.plus2 ? 0.035 * Math.sin(Math.PI * prog(t, TM.plus2, TM.plus2 + 0.32)) : 0;
  const sweepP = prog(t, TM.plus2, TM.plus2 + 0.55, ease.inOut);
  const sweep = t >= TM.plus2 && sweepP < 1 ? mix(-0.1, 1.1, sweepP) : -1;
  const lab = prog(t, TM.rowAIn + 0.15, TM.rowAIn + 0.6, ease.outQuint);
  const foot = prog(t, TM.foot, TM.foot + 0.4, ease.outQuint);
  const status = prog(t, TM.plus2, TM.plus2 + 0.3);
  const gridIn = prog(t, TM.gridIn, TM.gridIn + 0.55, ease.out);
  return (
    <div style={{ position: "absolute", left: 0, top: y + rise, width: 1920, height: ROW_H }}>
      {/* 左: ラベル + カウンター + 注記 */}
      <div style={{ position: "absolute", left: PAD_X, top: 10, opacity: 1 - dim * 0.12 }}>
        <MonoLabel color={C.coral} text="READY-TO-USE VOICES" p={lab} />
        <div
          style={{
            marginTop: 22,
            marginLeft: -8,
            opacity: cIn,
            transformOrigin: "0% 60%",
            transform: `translateY(${(1 - cIn) * 24}px) scale(${1 + thump})`,
          }}
        >
          <TapeCounter
            value={count}
            digits={4}
            commaAt={3}
            size={COUNTER_SIZE}
            color={numColor}
            plus={plus}
            tighten={prog(t, TM.plus2, TM.plus2 + 0.4, ease.inOut)}
            glow={glow}
          />
        </div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: foot,
            transform: `translateY(${(1 - foot) * 10}px)`,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "0.08em",
            color: C.sub,
          }}
        >
          <svg width={22} height={16}>
            {[0, 1, 2].map((c) =>
              [0, 1].map((r) => (
                <rect key={`${c}${r}`} x={c * 8} y={r * 9} width={6} height={6} rx={1.4} fill={C.text} opacity={0.9} />
              )),
            )}
          </svg>
          <span>
            以前は <span style={{ color: C.text }}>30</span> 種類
          </span>
        </div>
      </div>

      {/* 右: PRESET WALL */}
      <div
        style={{
          position: "absolute",
          left: PANEL_X,
          top: 0,
          opacity: inP,
          transform: `translateY(${(1 - inP) * 40}px)`,
        }}
      >
        <Panel w={PANEL_W} h={ROW_H} accent={C.coral} glow={0.35 * status * (1 - dim)}>
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 18,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.16em",
              color: C.sub,
            }}
          >
            <div>
              PRESET WALL <span style={{ color: C.sub, opacity: 0.7 }}>· 1 DOT = 1 VOICE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: status > 0 ? C.coral : C.dim }}>
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  background: status > 0 ? C.coral : "transparent",
                  border: `1.5px solid ${status > 0 ? C.coral : C.dim}`,
                  boxSizing: "border-box",
                }}
              />
              {status > 0 ? "ONLINE" : "STANDBY"}
            </div>
          </div>
          <div style={{ position: "absolute", left: WALL_X, top: WALL_Y }}>
            <LedWall
              gridIn={gridIn}
              seedOn={seedOn}
              count={count}
              sweep={sweep}
              flashAmt={1 - prog(t, TM.burstB - 0.1, TM.burstB + 0.3)}
              wave={wave}
              waveAmt={prog(t, TM.waveIn, TM.waveIn + 0.5)}
              dim={dim * 0.42}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ───────── LANGUAGES の段（カウンター + チューナー） ─────────
const RowLanguages: React.FC<{ t: number; rms: number; rowAY: number }> = ({ t, rms, rowAY }) => {
  const inP = prog(t, TM.rowBIn, TM.rowBIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const lab = prog(t, TM.rowBIn + 0.12, TM.rowBIn + 0.55, ease.outQuint);
  const draw = prog(t, TM.rowBIn + 0.1, TM.rowBIn + 0.65, ease.outQuint);
  const sweepP = prog(t, TM.sweepA, TM.sweepB, ease.out);
  const needleX = mix(NEEDLE_X0, NEEDLE_X1, sweepP);
  const needleOn = prog(t, TM.sweepA - 0.15, TM.sweepA + 0.05) * (1 - prog(t, TM.lock - 0.05, TM.lock + 0.35));
  // 針が 9 割まで進んだところで 100 に届く（針と数字を同じ動きにする）
  const count = 100 * clamp01(sweepP / 0.9);
  const plus = springAt(t, TM.plus3, { damping: 11, stiffness: 190 });
  const thump = t >= TM.plus3 ? 0.035 * Math.sin(Math.PI * prog(t, TM.plus3, TM.plus3 + 0.32)) : 0;
  const lockPulse = t >= TM.lock ? Math.sin(Math.PI * prog(t, TM.lock, TM.lock + 0.6)) : 0;
  const locked = t >= TM.lock;
  const live = locked ? rms : 0;
  const decay = 1 - prog(t, TM.sweepB, TM.sweepB + 0.35);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        // 上の段に押し上げられるように、上の段の下端より上には来ない
        top: Math.max(ROW_B_Y + (1 - inP) * 36, rowAY + ROW_H + (ROW_B_Y - ROW_A_Y - ROW_H)),
        width: 1920,
        height: ROW_H,
        opacity: inP,
      }}
    >
      <div style={{ position: "absolute", left: PAD_X, top: 10 }}>
        <MonoLabel color={C.mint} text="LANGUAGES & DIALECTS" p={lab} />
        <div style={{ marginTop: 22, marginLeft: -8, transformOrigin: "0% 60%", transform: `scale(${1 + thump})` }}>
          <TapeCounter
            value={count}
            digits={3}
            size={COUNTER_SIZE}
            color={C.mint}
            plus={plus}
            tighten={prog(t, TM.plus3, TM.plus3 + 0.4, ease.inOut)}
            glow={clamp01(sweepP / 0.9)}
          />
        </div>
      </div>

      <div style={{ position: "absolute", left: PANEL_X, top: 0 }}>
        <Panel w={PANEL_W} h={ROW_H} accent={C.mint} glow={0.4 * (locked ? 1 : 0) + 0.3 * lockPulse}>
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 18,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.16em",
              color: C.sub,
            }}
          >
            <div>
              LANGUAGE TUNER <span style={{ color: C.sub, opacity: 0.7 }}>· LANG-REGION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: locked ? C.mint : sweepP > 0 ? C.sub : C.dim }}>
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  background: locked ? C.mint : "transparent",
                  border: `1.5px solid ${locked ? C.mint : C.dim}`,
                  boxSizing: "border-box",
                }}
              />
              {locked ? "LOCKED" : sweepP > 0 ? "SCANNING" : "STANDBY"}
            </div>
          </div>

          {/* 目盛り */}
          <svg width={PANEL_W} height={ROW_H} style={{ position: "absolute", left: 0, top: 0 }}>
            <line
              x1={NEEDLE_X0}
              x2={mix(NEEDLE_X0, NEEDLE_X1, draw)}
              y1={TUNE.scaleY}
              y2={TUNE.scaleY}
              stroke={C.borderHi}
              strokeWidth={2}
            />
            {Array.from({ length: 97 }, (_, k) => {
              const x = mix(NEEDLE_X0, NEEDLE_X1, k / 96);
              if (x > mix(NEEDLE_X0, NEEDLE_X1, draw)) return null;
              const passed = sweepP > 0 && x <= needleX;
              const h = k % 4 === 0 ? 9 : 4;
              return (
                <line
                  key={k}
                  x1={x}
                  x2={x}
                  y1={TUNE.scaleY - h}
                  y2={TUNE.scaleY + h}
                  stroke={passed ? C.mint : C.borderHi}
                  strokeOpacity={passed ? 0.55 : 1}
                  strokeWidth={1.5}
                />
              );
            })}
            {/* 札と目盛りをつなぐ細い脚 */}
            {CODES.map((_, i) => {
              const x = chipX(i);
              const up = i % 2 === 0;
              const lit = sweepP > 0 && needleX >= x;
              const p = prog(t, TM.rowBIn + 0.2 + i * 0.012, TM.rowBIn + 0.5 + i * 0.012);
              const y0 = up ? TUNE.upY + TUNE.chipH : TUNE.scaleY + 12;
              const y1 = up ? TUNE.scaleY - 12 : TUNE.loY;
              return (
                <line
                  key={i}
                  x1={x}
                  x2={x}
                  y1={y0}
                  y2={mix(y0, y1, p)}
                  stroke={lit ? C.mint : C.border}
                  strokeWidth={1.5}
                  strokeDasharray={lit ? undefined : "3 4"}
                />
              );
            })}
          </svg>

          {/* 言語コードの札 */}
          {CODES.map((code, i) => {
            const x = chipX(i);
            const up = i % 2 === 0;
            const p = prog(t, TM.rowBIn + 0.2 + i * 0.012, TM.rowBIn + 0.55 + i * 0.012, ease.outQuint);
            const litNow = sweepP > 0 && needleX >= x;
            const past = needleX - x;
            const flash = litNow ? clamp01(1 - past / 110) * decay : 0;
            const lit = litNow ? 1 : 0;
            return (
              <div
                key={code}
                style={{
                  position: "absolute",
                  left: x,
                  top: up ? TUNE.upY : TUNE.loY,
                  transform: `translate(-50%, ${(1 - p) * (up ? -10 : 10)}px)`,
                  opacity: p,
                }}
              >
                <Chip code={code} lit={lit} flash={Math.max(flash, lockPulse * 0.55)} live={live} />
              </div>
            );
          })}

          {/* 針 */}
          {needleOn > 0 && (
            <svg width={40} height={ROW_H} style={{ position: "absolute", left: needleX - 20, top: 0, overflow: "visible", opacity: needleOn }}>
              <line
                x1={20}
                x2={20}
                y1={50}
                y2={ROW_H - 26}
                stroke={C.mint}
                strokeWidth={3}
                style={{ filter: `drop-shadow(0 0 8px ${C.mint})` }}
              />
              <path d="M11 44 L29 44 L20 56 Z" fill={C.mint} />
            </svg>
          )}
        </Panel>
      </div>
    </div>
  );
};

// ───────── シーン本体 ─────────
export const T4Library: React.FC = () => {
  const t = useTime();
  const lv = useVoiceLevel(["t4-2", "t4-3"]);
  const push = prog(t, TM.pushA, TM.pushB, ease.inOut);
  const rowY = mix(ROW_A_SOLO_Y, ROW_A_Y, push);
  const dimA = push;
  // LED ウォールに流れる声の波形: 右端が今、1 列 = 1 フレーム前
  const wave = Array.from({ length: WALL.cols }, (_, c) => {
    const sec = t - (WALL.cols - 1 - c) / FPS;
    if (sec < TM.waveIn) return 0; // 波形は右端から流れ込む
    const a = rmsAtTime(IDS, sec - 1 / FPS);
    const b = rmsAtTime(IDS, sec);
    const d = rmsAtTime(IDS, sec + 1 / FPS);
    return Math.min(1, ((a + 2 * b + d) / 4) * 1.15);
  });
  return (
    <SceneShell id="t4">
      <RowVoices t={t} y={rowY} rise={0} wave={wave} dim={dimA} />
      <RowLanguages t={t} rms={lv ? lv.rms : 0} rowAY={rowY} />
      <Shelf t={t} rowY={ROW_A_SOLO_Y} rowRise={0} />
      <Headline t={t} />

      <Sfx at={TM.shelf} name="tick" volume={0.14} />
      <Sfx at={TM.flyA + FLY_DUR} name="type" volume={0.12} />
      <Sfx at={TM.burstA} name="swell" volume={0.18} />
      <Sfx at={TM.plus2} name="pop" volume={0.22} />
      <Sfx at={TM.pushA} name="whoosh" volume={0.13} />
      <Sfx at={TM.plus3} name="pop" volume={0.16} />
      <Sfx at={TM.lock} name="chime" volume={0.16} />
    </SceneShell>
  );
};
