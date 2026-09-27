/*
 * TRACK 04 — 声の品ぞろえ（VOICE LIBRARY）
 *
 * コンセプト: 深夜のスタジオの「テープ棚」が、2000 粒の LED ウォールに化ける。
 * 1 粒 = 1 つの声。言語は、ラジオのチューナーの針が端から端まで拾っていく。
 *
 * 絵コンテ（すべてナレーションの行・行内のフレーズ・シーン境界から計算。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に、見出し「声の品ぞろえ」が 1 文字ずつせり上がる（中央・大）。
 *                 上に MONO「04 — VOICE LIBRARY」。「品ぞろえ」だけコーラル。
 *  B1  t4-1 全体  「トラック4は、」の頭から見出しの下に棚板がゆっくり引かれ、テープの背 30 本が左から順に立つ
 *                 （最後の数本が「声の品ぞろえ」の頭にそろう。見出しだけの静止時間を作らない）。
 *  B2  t4-2 前半  「すぐに使える声は、」: 見出しが左上へ収まる。中央に「VOICE PRESETS」の段がせり上がり、
 *                 右の PRESET WALL に 2000 粒の空の LED が左から並ぶ。棚のテープ 30 本が（遠いものから）縮んで粒になり、
 *                 ウォールの左端中央に白い 30 粒として着地（カウンターも 0,000 → 0,030 と白で刻む）。
 *                 着地と同時に、カウンターの下に注記「以前は30種類」（30px・白）、白い粒の横に札「以前の30」。
 *  B3  t4-2 後半  「2000種類以上」: 左端から波が広がり 1970 粒が一気にコーラルに点灯、カウンターは 30 → 2,000（桁幅固定）。
 *                 「以上」で「+」がはね、数字がひと押し膨らんで本来の字幅に詰まり、完了の光がウォールを左から右へ抜ける。
 *                 札「以前の30」はここで退く。以後ウォールには実際の声の波形が右端から流れ込む（1 列 = 1 フレーム）。
 *  B4  t4-3 冒頭  「しかも、」: VOICES の段が上へ押し上げられて一歩下がり、その下に「LANG-REGION」の段が続いて現れる。
 *                 チューナーの目盛り（0〜100 の数字だけ。個別の言語名は出さない＝台本にない事実を足さない）が引かれる。
 *  B5  t4-3 後半  「100を超える」: ミントの針が左から右へ走り、通過した数字が順に灯り、目盛りの下には針が通った瞬間の
 *                 声が記録されていく。カウンター 000 → 100 は針の位置の値そのもの（針が 9 割で 100）。
 *                 「超える」で「+」、100 の先の帯がミントに満ち、注記「方言もふくめて」。
 *                 「対応しています」で針が消え、目盛りがひと呼吸光って TUNED。
 *  B6  tail       両方の段が点いたまま、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, FPS, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import {
  BY_RANK,
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

// 棚は「トラック4は、」の頭からゆっくり組み上がり、「声の品ぞろえ」の頭で最後の数本が立つ（見出しのあとの空白をなくす）
const SHELF_A = Math.min(P1b - 0.05, Math.max(L1.start, E + 0.5));
const SPINE_STAGGER = Math.min(0.05, Math.max(0.022, (P1b + 0.25 - SHELF_A - 0.2) / (SEED - 1)));

const TM = {
  headIn: E + 0.08,
  shelf: SHELF_A,
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

// チューナー（数字の目盛り・針・声の記録）
const DIAL = { x0: 44, x1: PANEL_W - 44, numY: 62, scaleY: 126, barY: 196, barMax: 34 };

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

// 白い粒 3×2（ウォールに着地した「以前の 30」と同じ見た目）
const SeedIcon: React.FC = () => (
  <svg width={30} height={21} style={{ flex: "none" }}>
    {[0, 1, 2].map((c) =>
      [0, 1].map((r) => <rect key={`${c}${r}`} x={c * 11} y={r * 12} width={8} height={8} rx={1.8} fill={C.text} />),
    )}
  </svg>
);

// ウォールの白い 30 粒（左端・中央）を指す札。座標はウォール内
const SEED_R = Math.max(...BY_RANK.slice(0, SEED).map((c) => c.x + WALL.cellW));
const SeedCallout: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0) return null;
  const y = WALL.rows * WALL.pitchY * 0.5 - 1;
  const x0 = SEED_R + 6;
  const len = 26 * p;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: p }}>
      <div style={{ position: "absolute", left: x0, top: y - 1, width: len, height: 2, background: C.text, borderRadius: 1 }} />
      <div
        style={{
          position: "absolute",
          left: x0 + len,
          top: y,
          transform: `translate(${(1 - p) * -8}px, -50%)`,
          height: 40,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          borderRadius: 9,
          background: "rgba(14,16,20,0.92)",
          border: `1.5px solid ${C.text}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 24,
          color: C.text,
          whiteSpace: "nowrap",
        }}
      >
        以前の<span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 26, color: "#FFFFFF", marginLeft: "0.08em" }}>30</span>
      </div>
    </div>
  );
};

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
  const board = prog(t, TM.shelf - 0.1, TM.shelf + 0.9, ease.outQuint);
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
        const pin = springAt(t, TM.shelf + 0.2 + k * SPINE_STAGGER, { damping: 15, stiffness: 170 });
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
  // ウォールの白い 30 粒に付く札「以前の30」: 着地で出て、点灯の波が広がりきったら退く
  const callout = prog(t, TM.foot, TM.foot + 0.35, ease.outQuint) * (1 - prog(t, TM.plus2, TM.plus2 + 0.3, ease.out));
  return (
    <div style={{ position: "absolute", left: 0, top: y + rise, width: 1920, height: ROW_H }}>
      {/* 左: ラベル + カウンター + 注記 */}
      <div style={{ position: "absolute", left: PAD_X, top: 10, opacity: 1 - dim * 0.12 }}>
        <MonoLabel color={C.coral} text="VOICE PRESETS" p={lab} />
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
        {/* 注記: 以前は30種類（ウォールの白い 30 粒と同じ白い粒のアイコン） */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: foot,
            transform: `translateY(${(1 - foot) * 10}px)`,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.2,
            color: C.text,
            whiteSpace: "nowrap",
          }}
        >
          <SeedIcon />
          <span>
            以前は
            <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 34, color: "#FFFFFF", margin: "0 0.06em" }}>30</span>
            種類
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
            <SeedCallout p={callout} />
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ───────── LANG-REGION の段（カウンター + チューナー） ─────────
// 目盛りは言語の「数」だけ（個別の言語名は出さない）。針の位置の値 = カウンターの値。
// 針は V_END（≈111）まで振れ、100 を越えた先はミントの「+」帯になる。
const DIAL_V_END = 100 / 0.9;
const dialX = (v: number) => mix(DIAL.x0, DIAL.x1, v / DIAL_V_END);
// ease.out（cubic）の逆: 針が割合 f に届く時刻
const passTime = (f: number) => mix(TM.sweepA, TM.sweepB, 1 - Math.cbrt(1 - clamp01(f)));
const TRAIL_N = 54;
const TRAIL = Array.from({ length: TRAIL_N }, (_, k) => {
  const x = mix(DIAL.x0 + 8, DIAL.x1 - 8, k / (TRAIL_N - 1));
  const f = (x - DIAL.x0) / (DIAL.x1 - DIAL.x0);
  const tp = passTime(f);
  // 針が通った瞬間の声（前後 1 フレームでならす）を記録する
  const r = (rmsAtTime(["t4-3"], tp - 1 / FPS) + 2 * rmsAtTime(["t4-3"], tp) + rmsAtTime(["t4-3"], tp + 1 / FPS)) / 4;
  return { x, f, amp: clamp01(r * 1.35) };
});

const RowLanguages: React.FC<{ t: number; rms: number; rowAY: number }> = ({ t, rms, rowAY }) => {
  const inP = prog(t, TM.rowBIn, TM.rowBIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const lab = prog(t, TM.rowBIn + 0.12, TM.rowBIn + 0.55, ease.outQuint);
  const draw = prog(t, TM.rowBIn + 0.1, TM.rowBIn + 0.75, ease.outQuint);
  const drawX = mix(DIAL.x0, DIAL.x1, draw);
  const sweepP = prog(t, TM.sweepA, TM.sweepB, ease.out);
  const needleX = mix(DIAL.x0, DIAL.x1, sweepP);
  const needleOn = prog(t, TM.sweepA - 0.15, TM.sweepA + 0.05) * (1 - prog(t, TM.lock - 0.05, TM.lock + 0.35));
  // 針の位置の値がそのままカウンター（針が 9 割で 100）
  const count = 100 * clamp01(sweepP / 0.9);
  const plus = springAt(t, TM.plus3, { damping: 11, stiffness: 190 });
  const plusZone = prog(t, TM.plus3, TM.plus3 + 0.35, ease.outQuint);
  const thump = t >= TM.plus3 ? 0.035 * Math.sin(Math.PI * prog(t, TM.plus3, TM.plus3 + 0.32)) : 0;
  const lockPulse = t >= TM.lock ? Math.sin(Math.PI * prog(t, TM.lock, TM.lock + 0.6)) : 0;
  const locked = t >= TM.lock;
  const live = locked ? rms : 0;
  const decay = 1 - prog(t, TM.sweepB, TM.sweepB + 0.35);
  const note = prog(t, TM.plus3 + 0.2, TM.plus3 + 0.6, ease.outQuint);
  const passed = (x: number) => sweepP > 0 && needleX >= x;
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
        <MonoLabel color={C.mint} text="LANG-REGION" p={lab} />
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
        <div
          style={{
            marginTop: 16,
            opacity: note,
            transform: `translateY(${(1 - note) * 10}px)`,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.2,
            color: C.text,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.mint }}>方言</span>もふくめて
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
              LANGUAGE TUNER <span style={{ color: C.sub, opacity: 0.7 }}>· COUNT</span>
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
              {locked ? "TUNED" : sweepP > 0 ? "SCANNING" : "STANDBY"}
            </div>
          </div>

          <svg width={PANEL_W} height={ROW_H} style={{ position: "absolute", left: 0, top: 0 }}>
            {/* 100 を越えた先の「+」帯 */}
            <rect
              x={dialX(100)}
              y={DIAL.scaleY - 3}
              width={Math.max(0, (DIAL.x1 - dialX(100)) * plusZone)}
              height={6}
              rx={3}
              fill={C.mint}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 6px ${C.mint})` }}
            />
            {/* 目盛りの線 */}
            <line x1={DIAL.x0} x2={drawX} y1={DIAL.scaleY} y2={DIAL.scaleY} stroke={C.borderHi} strokeWidth={2} />
            {Array.from({ length: Math.floor(DIAL_V_END / 2) + 1 }, (_, k) => {
              const v = k * 2;
              const x = dialX(v);
              if (x > drawX) return null;
              const h = v % 10 === 0 ? 12 : v % 10 === 4 || v % 10 === 6 ? 4 : 6;
              const on = passed(x);
              return (
                <line
                  key={k}
                  x1={x}
                  x2={x}
                  y1={DIAL.scaleY - h}
                  y2={DIAL.scaleY + h}
                  stroke={on ? C.mint : v % 10 === 0 ? C.sub : C.borderHi}
                  strokeOpacity={on ? 0.7 : 1}
                  strokeWidth={v % 10 === 0 ? 2 : 1.5}
                />
              );
            })}
            {/* 針が通った瞬間の声の記録（通過前は暗い点） */}
            {TRAIL.map((b, k) => {
              if (b.x > drawX) return null;
              const on = passed(b.x);
              const hh = on ? 3 + DIAL.barMax * b.amp * (locked ? 0.8 + 0.4 * live : 1) : 1.5;
              const fresh = on ? clamp01(1 - (needleX - b.x) / 90) * decay : 0;
              return (
                <rect
                  key={k}
                  x={b.x - 2.5}
                  y={DIAL.barY - hh}
                  width={5}
                  height={hh * 2}
                  rx={2.5}
                  fill={on ? lerpColor(C.mint, "#E4FFF6", fresh) : C.border}
                  opacity={on ? 0.55 + 0.45 * Math.max(fresh, lockPulse) : 1}
                />
              );
            })}
          </svg>

          {/* 目盛りの数字（0〜100、100 には「+」） */}
          {Array.from({ length: 11 }, (_, i) => {
            const v = i * 10;
            const x = dialX(v);
            const p = prog(t, TM.rowBIn + 0.2 + i * 0.03, TM.rowBIn + 0.55 + i * 0.03, ease.outQuint);
            const on = passed(x);
            const flash = on ? clamp01(1 - (needleX - x) / 110) * decay : 0;
            return (
              <div
                key={v}
                style={{
                  position: "absolute",
                  left: x,
                  top: DIAL.numY,
                  transform: `translate(-50%, ${(1 - p) * -8}px) scale(${1 + 0.18 * flash})`,
                  opacity: p,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 20,
                  letterSpacing: "0.02em",
                  color: on ? lerpColor(C.text, C.mint, Math.max(flash, v === 100 ? 1 : 0)) : C.dim,
                  textShadow: on ? `0 0 ${Math.round(4 + 14 * Math.max(flash, lockPulse))}px rgba(59,227,180,${0.25 + 0.5 * Math.max(flash, lockPulse)})` : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {v}
                {v === 100 && (
                  <span style={{ position: "absolute", left: "100%", opacity: clamp01(plus * 2), marginLeft: 2, color: C.mint }}>+</span>
                )}
              </div>
            );
          })}

          {/* 針 */}
          {needleOn > 0 && (
            <svg width={40} height={ROW_H} style={{ position: "absolute", left: needleX - 20, top: 0, overflow: "visible", opacity: needleOn }}>
              <line
                x1={20}
                x2={20}
                y1={DIAL.numY + 30}
                y2={ROW_H - 18}
                stroke={C.mint}
                strokeWidth={3}
                style={{ filter: `drop-shadow(0 0 8px ${C.mint})` }}
              />
              <path d={`M11 ${DIAL.numY + 24} L29 ${DIAL.numY + 24} L20 ${DIAL.numY + 36} Z`} fill={C.mint} />
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
