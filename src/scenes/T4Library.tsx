/*
 * TRACK 04 — 「声の棚」（見出しは section("t4").title をそのまま使う）
 *
 * コンセプト: 深夜のスタジオの壁ぎわにあるテープの棚。棚の 30 本が 2000 粒の LED ウォールに化け（1 粒 = 1 つの声）、
 * 言語はラジオのチューナーの針が数えていく。最後に、オープンリールで 30 秒録った「あなたの声」のリールが
 * 小さな 1 粒になって、ウォールに 1 つ加わる（札は YOU）。
 * 使わないもの: 中央タイトル＋下線、コピーのアイコン、サンプル → 同じ声のカードを並べる構図、人物＋音波のアイコン。
 *
 * 絵コンテ（すべてナレーションの行・行内のフレーズ・シーン境界から計算。秒は直書きしない）
 *  B0  enter        テープが抜けはじめると、左上の見出し「声の棚」（「棚」だけコーラル。t4-1 の間は 1.4 倍）が 1 文字ずつせり上がり、
 *                   上に MONO「04 — VOICE SHELF」。見出しの下で、棚板が左から引かれる。
 *  B1  t4-1 前半    「声の棚も、」… 棚板の上にテープの背 30 本が左から順に立つ（板の下に小さな番号 01 と 30）。
 *  B2  t4-1 後半    「ぐっと広がりました。」… 棚板が右へ一気に伸びて画面の外まで届き（先端にコーラルの光）、
 *                   先端が通りかかった所から点線の空き区画が次々に立つ。
 *  B3  t4-2 前半    「プリセットは、」… 見出しが等倍へ収まり、空き区画と棚板が退き、30 本の背はその場で縮んで白い粒の列になる。
 *                   画面の中ほどに PRESETS の段（左: カウンター / 右: PRESET WALL 2000 粒の空の LED）がせり上がる。
 *                   「30種類から」… 白い 30 粒が（遠いものから）流れるように飛び、ウォールの左端中央にそろって着地
 *                   （カウンター 0,000 → 0,030 を白で刻む。注記「以前は30種類」、白い粒に札「以前の30」）。
 *  B4  t4-2 後半    「一気に2000超えへ。」… 左端から波が広がり 1970 粒がコーラルに点灯、カウンター 30 → 2,000。
 *                   「超えへ」で「+」がはね、数字が本来の字幅に詰まり、完了の光がウォールを抜ける。以後ウォールには声の波形が流れる。
 *  B5  t4-3         「話せることばも、」… PRESETS の段が上へ押し上げられて一歩下がり、その下に LANGUAGES & DIALECTS の段と
 *                   チューナーの目盛り（0〜100 の数字だけ。言語名は出さない）。
 *                   「方言まで入れて」… ミントの針が左から走り、カウンターは針の値。注記「方言もふくめて」。
 *                   「100以上。」… 「100」で針が 100 に届き、「以上」で「+」と 100 の先の帯。針が消えて TUNED。
 *  B6  t4-4 前半    行の頭で LANGUAGES の段が沈んで消え、同じ場所に VOICE SAMPLE の段（左: 分:秒カウンター /
 *                   右: TAPE DECK のオープンリール 2 つ）がせり上がる。
 *                   「30秒ぶん声を録れば、」… リールが回り出し、ヘッドから右へ送られるテープに実際の声の波形が録られていく。
 *                   カウンター 00:00 → 00:30 はテープの送り量そのもの。フレーズの終わりで 00:30 に止まり、コーラルに。TAKE OK。
 *  B7  t4-4 中盤    「あなたの声も、」… 巻き取り側のリールにコーラルのマスキングテープ「YOU」が落ちて貼られる。注記「あなたの声」。
 *  B8  t4-4 後半    「この棚に」… 巻き取りリールが少し持ち上がり、弧を描いて上の PRESET WALL へ飛びながら縮む
 *                   （札は同じ大きさのまま付いていく）。ウォールが一段暗くなる。
 *                   「1本加わります。」… 右寄りの 1 粒だけが白く点いて、コーラルの輪が締まり、波紋がウォールを渡る。
 *                   札「YOU」は粒の左上に貼られ、輪から引き出し線が引かれる。実際の声に合わせて粒の光がわずかに脈打ち、次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Sfx } from "../components/Sfx";
import { VUMeter } from "../components/Meters";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, FPS, MONO, PAD_X } from "../theme";
import { line, section, sceneEnter, wipeInto } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import {
  BY_RANK,
  CELLS,
  EmptySlot,
  LedWall,
  SEED,
  Spine,
  TOTAL_VOICES,
  TapeCounter,
  WALL,
  WALL_W,
  lerpColor,
  rmsAtTime,
  rmsLerp,
} from "./T4Library/parts";
import { Reel, TapeLabel, TimeCounter, tangentPoint, transport, transportInv } from "./T4Library/deck";
import { phrases } from "./T4Library/timing";

// ───────── タイミング（すべて行・行内のフレーズ・シーン境界から計算） ─────────
const E = sceneEnter("t4");
const UNC = wipeInto("t4")?.uncover ?? E; // テープが抜けはじめる時刻
const L1 = line("t4-1");
const L2 = line("t4-2");
const L3 = line("t4-3");
const L4 = line("t4-4");
const IDS = ["t4-1", "t4-2", "t4-3", "t4-4"];

const [, P1b] = phrases("t4-1", [0.42]); // 声の棚も、 / ぐっと広がりました。
const [, P2b, P2c] = phrases("t4-2", [0.28, 0.7]); // プリセットは、 / 30種類から / 一気に2000超えへ。
const [, P3b, P3c] = phrases("t4-3", [0.45, 0.82]); // 話せることばも、 / 方言まで入れて / 100以上。
const [P4a, P4b, P4c] = phrases("t4-4", [0.36, 0.61]); // 30秒ぶん声を録れば、 / あなたの声も、 / この棚に1本加わります。

const FLY_DUR = 0.7;
const FLY_SPREAD = 0.25; // 遠いテープから先に飛び立ち、着地がそろうように
const ROW_A_IN = L2.start - 0.12;
const LAND_A = Math.max(P2b.start + 0.05, ROW_A_IN + 0.95); // 「30種類から」で白い 30 粒が着地
const BURST_A = Math.max(P2c.start - 0.1, LAND_A + 0.4); // 「一気に」
const BURST_B = Math.max(BURST_A + 0.45, Math.min(BURST_A + 0.8, L2.end - 0.02));
const SWEEP_A = Math.max(P3b.start - 0.05, L3.start + 0.55); // 「方言まで入れて」
const HIT_100 = Math.max(P3c.start + 0.04, SWEEP_A + 0.55); // 「100」
const SWEEP_B = SWEEP_A + (HIT_100 - SWEEP_A) / 0.536; // ease.out で 9 割（= 100）が HIT_100 に来る
const PLUS3 = Math.max(HIT_100 + 0.05, mix(P3c.start, P3c.end, 0.45)); // 「以上」
const LOCK = PLUS3 + 0.3;
const SWAP_A = Math.max(LOCK + 0.12, L4.start - 0.35);
const REC_IN = SWAP_A + 0.22;
const REC_A = Math.max(P4a.start + 0.05, REC_IN + 0.2); // 「30秒ぶん」
const REC_B = Math.max(REC_A + 0.9, P4a.end - 0.02); // 「録れば」の終わりで 00:30
const STICK = Math.max(REC_B + 0.3, P4b.start + 0.06); // 「あなたの」
// 「この棚に」。声が短くなっても、着地（+0.8 秒）が行の終わりより前に来るようにする
const FLY4_A = Math.min(Math.max(STICK + 0.6, P4c.start - 0.06), Math.max(STICK + 0.3, L4.end - 0.95));
const LAND4 = FLY4_A + 0.8; // 「1本」

const TM = {
  headIn: UNC - 0.05,
  board: UNC + 0.05,
  spines: UNC + 0.18,
  widen: P1b.start - 0.04,
  settleA: L2.start - 0.45,
  settleB: L2.start + 0.15,
  shelfOut: L2.start - 0.3,
  rowAIn: ROW_A_IN,
  counterIn: ROW_A_IN + 0.18,
  gridIn: ROW_A_IN + 0.05,
  flyA: LAND_A - FLY_SPREAD - FLY_DUR,
  land: LAND_A,
  burstA: BURST_A,
  burstB: BURST_B,
  plus2: Math.max(BURST_B, mix(P2c.start, P2c.end, 0.62)), // 「超えへ」
  waveIn: 0,
  pushA: L3.start - 0.3,
  pushB: L3.start + 0.25,
  rowBIn: L3.start,
  dialect: P3b.start + 0.08,
  sweepA: SWEEP_A,
  sweepB: SWEEP_B,
  plus3: PLUS3,
  lock: LOCK,
  swapA: SWAP_A,
  recIn: REC_IN,
  recA: REC_A,
  recB: REC_B,
  stick: STICK,
  fly4: FLY4_A,
  land4: LAND4,
};
TM.waveIn = TM.plus2 + 0.5;

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80 };
const HEAD_BIG = 1.4;
const ROW_H = 262;
const ROW_A_Y = 312;
const ROW_A_SOLO_Y = 452; // t4-2 の間は画面の中ほど
const ROW_B_Y = 602;
const PANEL_X = 776;
const PANEL_W = 1920 - PAD_X - PANEL_X;
const WALL_X = (PANEL_W - WALL_W) / 2;
const WALL_Y = 60;
const COUNTER_SIZE = 112;

// 棚（t4-1）
const SH = { x0: PAD_X, y: 458, w: 24, h: 136, gap: 10 };
const SH_PITCH = SH.w + SH.gap;
const SH_W = SEED * SH_PITCH - SH.gap;
const SH_SLOTS = Math.ceil((1920 - SH.x0) / SH_PITCH) + 1; // 右端の外まで
const PLANK_Y = SH.y + SH.h + 2;

// チューナー（数字の目盛り・針・声の記録）
const DIAL = { x0: 44, x1: PANEL_W - 44, numY: 62, scaleY: 126, barY: 196, barMax: 34 };

// テープデッキ（t4-4）: パネル内の座標
const DECK = { r: 78, cy: 138, cxL: 128, cxR: PANEL_W - 128, tapeY: 232, headX: PANEL_W / 2 };
const GUIDE_L = DECK.cxL + 86;
const GUIDE_R = DECK.cxR - 86;
const TAPE_LEN = 900; // 録音中に送られるテープの長さ（px）
const BAR_STEP = 5;
// ヘッドで録られた声（送り量 u の位置の声の大きさ）
const BARS = Array.from({ length: Math.floor(TAPE_LEN / BAR_STEP) + 1 }, (_, k) => {
  const u = k * BAR_STEP;
  const tw = transportInv(u, TM.recA, TM.recB, TAPE_LEN);
  const d = 1 / (FPS * 2);
  const a = (rmsLerp("t4-4", tw - d) + 2 * rmsLerp("t4-4", tw) + rmsLerp("t4-4", tw + d)) / 4;
  return { u, amp: clamp01(a * 1.25) };
});
const tapePos = (t: number) => transport(t, TM.recA, TM.recB, TAPE_LEN);

// 「YOU」の 1 粒が入るセル（巻き取りリールの真上あたり、中ほどの段）
const YOU_CELL = (() => {
  const want = PANEL_X + DECK.cxR - (PANEL_X + WALL_X);
  const col = Math.max(0, Math.min(WALL.cols - 1, Math.round((want - WALL.cellW / 2) / WALL.pitchX)));
  return CELLS.find((c) => c.c === col && c.r === 8) ?? CELLS[0];
})();
const YOU_TAG = { w: 112, h: 44, dx: -96, dy: -46, scale: 0.9 };

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

const Status: React.FC<{ color: string; text: string; filled: boolean }> = ({ color, text, filled }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
    <div
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        background: filled ? color : "transparent",
        border: `1.5px solid ${color}`,
        boxSizing: "border-box",
      }}
    />
    {text}
  </div>
);

const panelHeader: React.CSSProperties = {
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
};

const noteStyle = (p: number): React.CSSProperties => ({
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  gap: 14,
  opacity: p,
  transform: `translateY(${(1 - p) * 10}px)`,
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 30,
  lineHeight: 1.2,
  color: C.text,
  whiteSpace: "nowrap",
});

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
const TITLE = section("t4").title || "声の棚";
const EMPH_AT = Math.max(0, [...TITLE].indexOf("棚") >= 0 ? [...TITLE].indexOf("棚") : [...TITLE].length - 1);

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const chars = [...TITLE];
  const lab = prog(t, TM.headIn + 0.2, TM.headIn + 0.65, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.15, TM.headIn + 0.75, ease.outQuint);
  // t4-1 の間は大きく、PRESETS の段が入るときに等倍へ収まる
  const s = mix(HEAD_BIG, 1, prog(t, TM.settleA, TM.settleB, ease.inOut));
  return (
    <div style={{ position: "absolute", left: HEAD.x, top: HEAD.y, transformOrigin: "0 0", transform: `scale(${s})` }}>
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
          <span style={{ color: C.coral }}>04</span> — VOICE SHELF
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.06, TM.headIn + i * 0.06 + 0.5, ease.outQuint);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: i === EMPH_AT ? C.coral : C.text }}>
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── 棚（t4-1）→ テープの背が LED の 30 粒へ飛ぶ（t4-2） ─────────
// テープ k は LED の k 番目（中心に近い順）へ。遠いものほど早く飛び立つ
const FLY_DELAY: number[] = (() => {
  const d = Array.from({ length: SEED }, (_, k) => {
    const cell = BY_RANK[k];
    const x0 = SH.x0 + k * SH_PITCH + SH.w / 2;
    const y0 = SH.y + SH.h / 2;
    return Math.hypot(PANEL_X + WALL_X + cell.x - x0, ROW_A_SOLO_Y + WALL_Y + cell.y - y0);
  });
  const max = Math.max(...d);
  const min = Math.min(...d);
  return d.map((v) => (1 - (v - min) / Math.max(1, max - min)) * FLY_SPREAD);
})();
const flyP = (t: number, k: number) => prog(t, TM.flyA + FLY_DELAY[k], TM.flyA + FLY_DELAY[k] + FLY_DUR, ease.inOut);
const SPINE_STAGGER = Math.min(0.026, Math.max(0.012, (TM.widen - 0.25 - TM.spines) / (SEED - 1)));

const Shelf: React.FC<{ t: number }> = ({ t }) => {
  const board = prog(t, TM.board, TM.board + 0.7, ease.outQuint);
  const widen = prog(t, TM.widen, TM.widen + 0.6, ease.outQuint);
  const out = prog(t, TM.shelfOut, TM.shelfOut + 0.4, ease.out);
  if (board <= 0) return null;
  const baseW = SH_W + 24;
  const extW = 1920 - (SH.x0 - 12) - baseW + 4;
  const plankW = baseW * board + extW * widen;
  // 空き区画は、伸びていく棚板の先端が通りかかったときに立つ（ease.outQuint の逆算）
  const slotAt = (k: number) => {
    const need = clamp01((SH.x0 + k * SH_PITCH + SH.w - (SH.x0 - 12) - baseW) / extW);
    return TM.widen + 0.6 * (1 - Math.pow(1 - need, 1 / 5));
  };
  const numP = (k: number) => springAt(t, TM.spines + k * SPINE_STAGGER + 0.1, { damping: 18, stiffness: 160 });
  return (
    <>
      {/* 棚板 */}
      <div
        style={{
          position: "absolute",
          left: SH.x0 - 12,
          top: PLANK_Y,
          width: plankW,
          height: 10,
          borderRadius: "3px 0 0 3px",
          background: `linear-gradient(180deg, ${C.borderHi} 0%, ${C.panelHi} 30%, ${C.panel} 100%)`,
          boxShadow: "0 12px 24px rgba(0,0,0,0.45)",
          opacity: 1 - out,
        }}
      />
      {/* 棚板が伸びる先の光（伸びきると消える） */}
      {widen > 0 && widen < 1 && (
        <div
          style={{
            position: "absolute",
            left: SH.x0 - 12 + plankW - 90,
            top: PLANK_Y - 1,
            width: 90,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${C.coral})`,
            boxShadow: `0 0 12px ${C.coral}`,
            opacity: (1 - widen) * (1 - out),
          }}
        />
      )}
      {/* 区画の番号 */}
      {[0, SEED - 1].map((k) => (
        <div
          key={`n${k}`}
          style={{
            position: "absolute",
            left: SH.x0 + k * SH_PITCH + SH.w / 2,
            top: PLANK_Y + 22,
            transform: `translate(-50%, ${(1 - numP(k)) * -6}px)`,
            opacity: clamp01(numP(k)) * (1 - out),
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "0.1em",
            color: C.sub,
          }}
        >
          {String(k + 1).padStart(2, "0")}
        </div>
      ))}
      {/* 広がった先の空き区画 */}
      {Array.from({ length: SH_SLOTS - SEED }, (_, j) => {
        const k = SEED + j;
        const pin = springAt(t, slotAt(k) - 0.02, { damping: 16, stiffness: 180 });
        if (pin <= 0 || out >= 1) return null;
        const fade = mix(1, 0.35, j / Math.max(1, SH_SLOTS - SEED - 1));
        return (
          <div
            key={`g${k}`}
            style={{
              position: "absolute",
              left: SH.x0 + k * SH_PITCH,
              top: SH.y + (1 - pin) * 22,
              opacity: clamp01(pin * 1.4) * fade * (1 - out),
            }}
          >
            <EmptySlot w={SH.w} h={SH.h} />
          </div>
        );
      })}
      {/* テープの背 30 本 */}
      {Array.from({ length: SEED }, (_, k) => {
        const pin = springAt(t, TM.spines + k * SPINE_STAGGER, { damping: 15, stiffness: 170 });
        if (pin <= 0) return null;
        const f = flyP(t, k);
        if (f >= 1) return null;
        const x0 = SH.x0 + k * SH_PITCH;
        const y0 = SH.y + (1 - pin) * 30;
        // まず棚の上でその場に縮んで白い粒になり（棚板が退くのと一緒に）、粒のままウォールへ飛ぶ
        const colA = TM.shelfOut + k * 0.006;
        const col = prog(t, colA, Math.min(colA + 0.28, TM.flyA + FLY_DELAY[k]), ease.inOut);
        const cx0 = x0 + SH.w / 2;
        const cy0 = y0 + SH.h / 2;
        if (f <= 0) {
          const spineOp = 1 - prog(col, 0.35, 0.8);
          const dotOp = prog(col, 0.3, 0.75);
          return (
            <React.Fragment key={k}>
              {spineOp > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: x0,
                    top: y0,
                    opacity: clamp01(pin * 1.6) * spineOp,
                    transformOrigin: "50% 50%",
                    transform: `scale(${mix(1, WALL.cellW / SH.w, col)}, ${mix(1, WALL.cellH / SH.h, col)})`,
                  }}
                >
                  <Spine w={SH.w} h={SH.h} seed={k + 1} />
                </div>
              )}
              {dotOp > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: cx0 - WALL.cellW / 2,
                    top: cy0 - WALL.cellH / 2,
                    width: WALL.cellW,
                    height: WALL.cellH,
                    borderRadius: 1.6,
                    background: C.text,
                    opacity: dotOp,
                    boxShadow: `0 0 ${10 * dotOp}px rgba(243,239,231,0.6)`,
                  }}
                />
              )}
            </React.Fragment>
          );
        }
        // 飛行中: 白い粒のまま、ウォールの左端中央へ
        const cell = BY_RANK[k];
        const x1 = PANEL_X + WALL_X + cell.x;
        const y1 = ROW_A_SOLO_Y + WALL_Y + cell.y;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: mix(cx0, x1 + WALL.cellW / 2, f) - WALL.cellW / 2,
              top: mix(cy0, y1 + WALL.cellH / 2, f) - WALL.cellH / 2 - Math.sin(f * Math.PI) * 18,
              width: WALL.cellW,
              height: WALL.cellH,
              borderRadius: 1.6,
              background: C.text,
              boxShadow: `0 0 ${6 + 10 * Math.sin(f * Math.PI)}px rgba(243,239,231,0.7)`,
            }}
          />
        );
      })}
    </>
  );
};

// ───────── PRESETS の段（カウンター + LED ウォール） ─────────
const RowVoices: React.FC<{
  t: number;
  y: number;
  wave: number[] | null;
  dim: number;
  wallDim: number;
  ripple: { x: number; y: number; r: number; amt: number } | null;
}> = ({ t, y, wave, dim, wallDim, ripple }) => {
  const inP = prog(t, TM.rowAIn, TM.rowAIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const seedOn = Array.from({ length: SEED }, (_, k) => flyP(t, k) >= 1);
  const seeded = seedOn.filter(Boolean).length;
  const burst = prog(t, TM.burstA, TM.burstB, (x) => 1 - (1 - x) ** 4);
  const count = t < TM.burstA ? seeded : SEED + (TOTAL_VOICES - SEED) * burst;
  const plus = prog(t, TM.plus2, TM.plus2 + 0.25, ease.out);
  const numColor = lerpColor(C.text, C.coral, prog(t, TM.burstA, TM.burstA + 0.12));
  const glow = prog(t, TM.burstA, TM.burstB) * (1 - dim * 0.7);
  const cIn = prog(t, TM.counterIn, TM.counterIn + 0.5, ease.outQuint);
  // 「超えへ」で数字全体がひと押し
  const thump = t >= TM.plus2 ? 0.035 * Math.sin(Math.PI * prog(t, TM.plus2, TM.plus2 + 0.32)) : 0;
  const sweepP = prog(t, TM.plus2, TM.plus2 + 0.55, ease.inOut);
  const sweep = t >= TM.plus2 && sweepP < 1 ? mix(-0.1, 1.1, sweepP) : -1;
  const lab = prog(t, TM.rowAIn + 0.15, TM.rowAIn + 0.6, ease.outQuint);
  const foot = prog(t, TM.land, TM.land + 0.4, ease.outQuint);
  const status = prog(t, TM.plus2, TM.plus2 + 0.3);
  const gridIn = prog(t, TM.gridIn, TM.gridIn + 0.55, ease.out);
  // 白い 30 粒に付く札「以前の30」: 着地で出て、点灯の波が広がりきったら退く
  const callout = prog(t, TM.land, TM.land + 0.35, ease.outQuint) * (1 - prog(t, TM.plus2, TM.plus2 + 0.3, ease.out));
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1920, height: ROW_H }}>
      {/* 左: ラベル + カウンター + 注記 */}
      <div style={{ position: "absolute", left: PAD_X, top: 10, opacity: 1 - dim * 0.14 }}>
        <MonoLabel color={C.coral} text="PRESETS" p={lab} />
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
        <div style={noteStyle(foot)}>
          <SeedIcon />
          <span>
            以前は
            <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 34, color: "#FFFFFF", margin: "0 0.06em" }}>30</span>
            種類
          </span>
        </div>
      </div>

      {/* 右: PRESET WALL */}
      <div style={{ position: "absolute", left: PANEL_X, top: 0, opacity: inP, transform: `translateY(${(1 - inP) * 40}px)` }}>
        <Panel w={PANEL_W} h={ROW_H} accent={C.coral} glow={0.35 * status * (1 - dim)}>
          <div style={panelHeader}>
            <div>
              PRESET WALL <span style={{ opacity: 0.7 }}>· 1 DOT = 1 VOICE</span>
            </div>
            <Status color={status > 0 ? C.coral : C.dim} text={status > 0 ? "ONLINE" : "STANDBY"} filled={status > 0} />
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
              dim={wallDim}
              ripple={ripple}
            />
            <SeedCallout p={callout} />
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ───────── LANGUAGES & DIALECTS の段（カウンター + チューナー） ─────────
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
  const outP = prog(t, TM.swapA, TM.swapA + 0.26, ease.in);
  if (inP <= 0 || outP >= 1) return null;
  const lab = prog(t, TM.rowBIn + 0.12, TM.rowBIn + 0.55, ease.outQuint);
  const draw = prog(t, TM.rowBIn + 0.1, TM.rowBIn + 0.75, ease.outQuint);
  const drawX = mix(DIAL.x0, DIAL.x1, draw);
  const sweepP = prog(t, TM.sweepA, TM.sweepB, ease.out);
  const needleX = mix(DIAL.x0, DIAL.x1, sweepP);
  const needleOn = prog(t, TM.sweepA - 0.15, TM.sweepA + 0.05) * (1 - prog(t, TM.lock - 0.05, TM.lock + 0.35));
  const count = 100 * clamp01(sweepP / 0.9);
  const plus = prog(t, TM.plus3, TM.plus3 + 0.25, ease.out);
  const plusZone = prog(t, TM.plus3, TM.plus3 + 0.35, ease.outQuint);
  const thump = t >= TM.plus3 ? 0.035 * Math.sin(Math.PI * prog(t, TM.plus3, TM.plus3 + 0.32)) : 0;
  const lockPulse = t >= TM.lock ? Math.sin(Math.PI * prog(t, TM.lock, TM.lock + 0.6)) : 0;
  const locked = t >= TM.lock;
  const live = locked ? rms : 0;
  const decay = 1 - prog(t, TM.sweepB, TM.sweepB + 0.35);
  const note = prog(t, TM.dialect, TM.dialect + 0.4, ease.outQuint);
  const passed = (x: number) => sweepP > 0 && needleX >= x;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        // 上の段に押し上げられるように、上の段の下端より上には来ない
        top: Math.max(ROW_B_Y + (1 - inP) * 36, rowAY + ROW_H + (ROW_B_Y - ROW_A_Y - ROW_H)) + outP * 30,
        width: 1920,
        height: ROW_H,
        opacity: inP * (1 - outP),
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
        <div style={noteStyle(note)}>
          <span>
            <span style={{ color: C.mint }}>方言</span>もふくめて
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", left: PANEL_X, top: 0 }}>
        <Panel w={PANEL_W} h={ROW_H} accent={C.mint} glow={0.4 * (locked ? 1 : 0) + 0.3 * lockPulse}>
          <div style={panelHeader}>
            <div>
              LANGUAGE TUNER <span style={{ opacity: 0.7 }}>· COUNT</span>
            </div>
            <Status
              color={locked ? C.mint : sweepP > 0 ? C.sub : C.dim}
              text={locked ? "TUNED" : sweepP > 0 ? "SCANNING" : "STANDBY"}
              filled={locked}
            />
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
                  textShadow: on
                    ? `0 0 ${Math.round(4 + 14 * Math.max(flash, lockPulse))}px rgba(59,227,180,${0.25 + 0.5 * Math.max(flash, lockPulse)})`
                    : undefined,
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

// ───────── VOICE SAMPLE の段（分:秒カウンター + オープンリールのテープデッキ） ─────────
const recRowTop = (t: number) => ROW_B_Y + (1 - prog(t, TM.recIn, TM.recIn + 0.6, ease.outQuint)) * 44;
const supplyPack = (pos: number) => mix(0.9, 0.55, pos / TAPE_LEN);
const takePack = (pos: number) => mix(0.18, 0.6, pos / TAPE_LEN);
const reelAngle = (pos: number) => pos * 0.8;

const RowRecorder: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.recIn, TM.recIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
  const top = recRowTop(t);
  const pos = tapePos(t);
  const rolling = t >= TM.recA && t < TM.recB;
  const done = t >= TM.recB;
  const lab = prog(t, TM.recIn + 0.12, TM.recIn + 0.55, ease.outQuint);
  const doneP = prog(t, TM.recB, TM.recB + 0.2);
  const thump = done ? 0.035 * Math.sin(Math.PI * prog(t, TM.recB, TM.recB + 0.32)) : 0;
  const note = prog(t, TM.stick + 0.1, TM.stick + 0.5, ease.outQuint);
  const lift = prog(t, TM.fly4 - 0.2, TM.fly4 + 0.1, ease.out); // 巻き取りリールが持ち上がる
  const recLamp = prog(t, TM.recA - 0.05, TM.recA + 0.08) * (1 - prog(t, TM.recB, TM.recB + 0.25));
  // テープの道筋（供給リール → ガイド → ヘッド → ガイド → 巻き取りリール）
  const rpL = mix(DECK.r * 0.25 + 3, DECK.r - 6, supplyPack(pos));
  const rpR = mix(DECK.r * 0.25 + 3, DECK.r - 6, takePack(pos));
  const tL = tangentPoint(DECK.cxL, DECK.cy, rpL, GUIDE_L, DECK.tapeY, -1);
  const tR = tangentPoint(DECK.cxR, DECK.cy, rpR, GUIDE_R, DECK.tapeY, 1);
  const barsFade = 1 - 0.7 * lift;
  return (
    <div style={{ position: "absolute", left: 0, top, width: 1920, height: ROW_H, opacity: inP }}>
      {/* 左: ラベル + カウンター + 注記 */}
      <div style={{ position: "absolute", left: PAD_X, top: 10 }}>
        <MonoLabel color={C.coral} text="VOICE SAMPLE" p={lab} />
        <div style={{ marginTop: 22, marginLeft: -8, transformOrigin: "0% 60%", transform: `scale(${1 + thump})` }}>
          <TimeCounter
            seconds={(30 * pos) / TAPE_LEN}
            size={COUNTER_SIZE}
            color={lerpColor(C.text, C.coral, doneP)}
            glow={doneP}
          />
        </div>
        <div style={noteStyle(note)}>
          <svg width={30} height={18} style={{ flex: "none" }}>
            <rect x={1} y={2} width={28} height={14} rx={2} fill={C.coral} transform="rotate(-4 15 9)" />
          </svg>
          <span>
            <span style={{ color: C.coral }}>あなた</span>の声
          </span>
        </div>
      </div>

      {/* 右: TAPE DECK */}
      <div style={{ position: "absolute", left: PANEL_X, top: 0 }}>
        <Panel w={PANEL_W} h={ROW_H} accent={C.coral} glow={0.3 * recLamp}>
          <div style={panelHeader}>
            <div>
              TAPE DECK <span style={{ opacity: 0.7 }}>· 1 REEL = 1 VOICE</span>
            </div>
            <Status
              color={done ? C.mint : rolling ? C.coral : C.dim}
              text={done ? "TAKE OK" : rolling ? "REC" : "STANDBY"}
              filled={done || rolling}
            />
          </div>

          <svg width={PANEL_W} height={ROW_H} style={{ position: "absolute", left: 0, top: 0 }}>
            {/* 巻き取り側の軸（リールが飛んだあとに見える） */}
            <circle cx={DECK.cxR} cy={DECK.cy} r={DECK.r * 0.2} fill="#090B0E" stroke={C.border} strokeWidth={1.5} />
            <circle cx={DECK.cxR} cy={DECK.cy} r={4} fill={C.dim} />
            {/* テープ */}
            <g stroke="#59606E" strokeWidth={2.5} fill="none" strokeLinecap="round">
              <line x1={tL.x} y1={tL.y} x2={GUIDE_L} y2={DECK.tapeY} />
              <line x1={GUIDE_L} y1={DECK.tapeY} x2={GUIDE_R} y2={DECK.tapeY} />
              <line x1={GUIDE_R} y1={DECK.tapeY} x2={tR.x} y2={tR.y} opacity={1 - lift} />
            </g>
            {/* 録られた声（ヘッドから右へ送られていく） */}
            {BARS.map((b) => {
              if (b.u > pos) return null;
              const x = DECK.headX + 30 + (pos - b.u);
              if (x > GUIDE_R - 10) return null;
              const hh = 2 + 19 * b.amp;
              return (
                <rect
                  key={b.u}
                  x={x - 1.5}
                  y={DECK.tapeY - hh}
                  width={3}
                  height={hh * 2}
                  rx={1.5}
                  fill={C.coral}
                  opacity={(0.55 + 0.45 * clamp01(1 - (x - DECK.headX - 30) / 260)) * barsFade}
                />
              );
            })}
            {/* ガイドローラー */}
            {[GUIDE_L, GUIDE_R].map((x) => (
              <g key={x}>
                <circle cx={x} cy={DECK.tapeY} r={9} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
                <circle cx={x} cy={DECK.tapeY} r={3} fill={C.dim} />
              </g>
            ))}
            {/* 録音ヘッド */}
            <rect
              x={DECK.headX - 30}
              y={DECK.tapeY - 22}
              width={60}
              height={44}
              rx={8}
              fill="#0B0D11"
              stroke={recLamp > 0.05 ? C.coral : C.borderHi}
              strokeOpacity={recLamp > 0.05 ? 0.5 + 0.5 * recLamp : 1}
              strokeWidth={1.5}
              style={recLamp > 0.05 ? { filter: `drop-shadow(0 0 ${10 * recLamp}px ${C.coral})` } : undefined}
            />
            <rect x={DECK.headX - 3} y={DECK.tapeY - 14} width={6} height={28} rx={2} fill={recLamp > 0.05 ? C.coral : C.borderHi} />
          </svg>

          {/* 中央上: 入力メーターと REC ランプ */}
          <div
            style={{
              position: "absolute",
              left: DECK.headX - 170,
              top: 74,
              width: 340,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontWeight: 700, fontSize: 18, letterSpacing: "0.16em" }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: recLamp > 0.05 ? C.red : "#2A1614",
                  boxShadow: recLamp > 0.05 ? `0 0 ${14 * recLamp}px ${C.red}` : undefined,
                  opacity: 0.4 + 0.6 * recLamp,
                }}
              />
              <span style={{ color: recLamp > 0.05 ? C.text : C.dim }}>REC</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, letterSpacing: "0.16em", color: C.sub }}>IN</span>
              <VUMeter width={260} height={12} segments={22} orientation="h" lines={["t4-4"]} gain={rolling ? 1.2 : 0} />
            </div>
          </div>
        </Panel>
      </div>

      {/* 供給リール（パネルの外に描くとはみ出しても切れない） */}
      <div style={{ position: "absolute", left: PANEL_X + DECK.cxL - DECK.r, top: DECK.cy - DECK.r }}>
        <Reel r={DECK.r} pack={supplyPack(pos)} angle={reelAngle(pos)} glow={rolling ? 0.35 : 0} />
      </div>
    </div>
  );
};

// ───────── 巻き取りリール → 1 粒になってウォールへ（YOU） ─────────
const bez = (a: number, c: number, b: number, f: number) => (1 - f) * (1 - f) * a + 2 * (1 - f) * f * c + f * f * b;
const DOT = { w: 11, h: 10 };
const HALO_R = 15;
// 引き出し線: 輪の縁（左上 45°）から札の右下の角へ
const LEAD = (() => {
  const tx = PANEL_X + WALL_X + YOU_CELL.x + WALL.cellW / 2;
  const ty = ROW_A_Y + WALL_Y + YOU_CELL.y + WALL.cellH / 2;
  const ex = tx + YOU_TAG.dx + (YOU_TAG.w * YOU_TAG.scale) / 2 - 12;
  const ey = ty + YOU_TAG.dy + (YOU_TAG.h * YOU_TAG.scale) / 2 - 6;
  const a = Math.atan2(ey - ty, ex - tx);
  return { x0: tx + Math.cos(a) * (HALO_R + 1), y0: ty + Math.sin(a) * (HALO_R + 1), x1: ex, y1: ey };
})();

const YouReel: React.FC<{ t: number; rms: number }> = ({ t, rms }) => {
  const inP = prog(t, TM.recIn, TM.recIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
  const top = recRowTop(t);
  const pos = tapePos(t);
  const S = { x: PANEL_X + DECK.cxR, y: top + DECK.cy };
  const T = { x: PANEL_X + WALL_X + YOU_CELL.x + WALL.cellW / 2, y: ROW_A_Y + WALL_Y + YOU_CELL.y + WALL.cellH / 2 };
  const Ctl = { x: mix(S.x, T.x, 0.5) - 150, y: mix(S.y, T.y, 0.5) + 10 };
  const f = prog(t, TM.fly4, TM.land4, ease.inOut);
  const pre = prog(t, TM.fly4 - 0.2, TM.fly4 + 0.05, ease.out) * (1 - prog(t, TM.fly4 + 0.05, TM.fly4 + 0.3));
  const x = bez(S.x, Ctl.x, T.x, f);
  const y = bez(S.y, Ctl.y, T.y, f) - pre * 8;
  const shrink = clamp01((f - 0.04) / 0.86) ** 1.8;
  const scale = mix(1 + 0.06 * pre, 12 / (DECK.r * 2), shrink);
  const reelOp = 1 - prog(f, 0.8, 0.95);
  const dotOp = prog(f, 0.78, 0.95);
  const landed = t >= TM.land4;
  const ring = prog(t, TM.land4, TM.land4 + 0.7, ease.out);
  // 札: 貼られてから、飛ぶときは同じ大きさのまま付いていき、粒の左上に落ち着く
  const stick = springAt(t, TM.stick, { damping: 13, stiffness: 190 });
  const tagF = prog(f, 0.25, 1, ease.inOut);
  const tagX = x + YOU_TAG.dx * tagF;
  const tagY = y + YOU_TAG.dy * tagF;
  const leader = prog(t, TM.land4 + 0.02, TM.land4 + 0.3, ease.outQuint);
  const halo = springAt(t, TM.land4 - 0.04, { damping: 12, stiffness: 170 });
  const haloR = mix(34, HALO_R, clamp01(halo)) + (halo - clamp01(halo)) * -10;
  const breathe = landed ? clamp01(rms * 1.3) : 0;
  return (
    <>
      {/* リール（録音中は回り、持ち上がって縮みながら飛ぶ） */}
      {reelOp > 0 && (
        <div
          style={{
            position: "absolute",
            left: x - DECK.r,
            top: y - DECK.r,
            opacity: inP * reelOp,
            transform: `scale(${scale})`,
            transformOrigin: "50% 50%",
            filter: pre > 0 || f > 0 ? `drop-shadow(0 ${14 * (pre + (f > 0 ? 1 - f : 0))}px 18px rgba(0,0,0,0.6))` : undefined,
          }}
        >
          <Reel r={DECK.r} pack={takePack(pos)} angle={reelAngle(pos) + f * 140} glow={t >= TM.recA && t < TM.recB ? 0.35 : pre + (f > 0 ? 1 : 0)} />
        </div>
      )}
      {/* 小さな粒（ウォールのセルより一回り大きく、白く光る） */}
      {dotOp > 0 && (
        <div
          style={{
            position: "absolute",
            left: x - DOT.w / 2,
            top: y - DOT.h / 2,
            width: DOT.w,
            height: DOT.h,
            borderRadius: 2.5,
            background: "#FFF3EC",
            opacity: dotOp,
            boxShadow: `0 0 ${12 + 14 * breathe}px ${C.coral}, 0 0 ${5 + 5 * breathe}px #FFFFFF`,
          }}
        />
      )}
      {/* 粒を囲む輪（着地で締まり、そのまま残る） */}
      {halo > 0 && (
        <div
          style={{
            position: "absolute",
            left: T.x - haloR,
            top: T.y - haloR,
            width: haloR * 2,
            height: haloR * 2,
            borderRadius: "50%",
            border: `2px solid ${C.coral}`,
            boxSizing: "border-box",
            opacity: clamp01(halo * 1.5),
            boxShadow: `0 0 ${10 + 10 * breathe}px ${C.coral}88, inset 0 0 8px ${C.coral}55`,
          }}
        />
      )}
      {/* 着地の輪 */}
      {landed && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: T.x - mix(HALO_R, 110, ring),
            top: T.y - mix(HALO_R, 110, ring),
            width: mix(HALO_R, 110, ring) * 2,
            height: mix(HALO_R, 110, ring) * 2,
            borderRadius: "50%",
            border: `2px solid ${C.coral}`,
            opacity: 1 - ring,
            boxSizing: "border-box",
          }}
        />
      )}
      {/* 引き出し線 */}
      {leader > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <line
            x1={LEAD.x0}
            y1={LEAD.y0}
            x2={mix(LEAD.x0, LEAD.x1, leader)}
            y2={mix(LEAD.y0, LEAD.y1, leader)}
            stroke={C.coral}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      )}
      {/* 札「YOU」 */}
      <TapeLabel
        cx={tagX}
        cy={tagY - (1 - tagF) * 0}
        w={YOU_TAG.w}
        h={YOU_TAG.h}
        text="YOU"
        color={C.coral}
        stick={stick}
        seed={41}
        rot={mix(-6, -3, tagF)}
        scale={mix(1, YOU_TAG.scale, tagF)}
      />
    </>
  );
};

// ───────── シーン本体 ─────────
export const T4Library: React.FC = () => {
  const t = useTime();
  const lv = useVoiceLevel(["t4-2", "t4-3", "t4-4"]);
  const push = prog(t, TM.pushA, TM.pushB, ease.inOut);
  const rowY = mix(ROW_A_SOLO_Y, ROW_A_Y, push);
  // YOU が来るあいだはウォールをもう一段暗くして、1 粒を目立たせる
  const focus = prog(t, TM.fly4 + 0.2, TM.land4, ease.inOut);
  const rip = prog(t, TM.land4, TM.land4 + 0.9, ease.out);
  const ripple =
    t >= TM.land4 && rip < 1
      ? { x: YOU_CELL.x + WALL.cellW / 2, y: YOU_CELL.y + WALL.cellH / 2, r: mix(0, 320, rip), amt: 0.8 * (1 - rip) }
      : null;
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
      <RowVoices t={t} y={rowY} wave={wave} dim={push} wallDim={push * 0.42 + focus * 0.3} ripple={ripple} />
      <RowLanguages t={t} rms={lv ? lv.rms : 0} rowAY={rowY} />
      <RowRecorder t={t} />
      <Shelf t={t} />
      <YouReel t={t} rms={lv ? lv.rms : 0} />
      <Headline t={t} />

      <Sfx at={TM.board} name="tick" volume={0.14} />
      <Sfx at={TM.widen} name="whoosh" volume={0.12} />
      <Sfx at={TM.land} name="type" volume={0.12} />
      <Sfx at={TM.burstA} name="swell" volume={0.18} />
      <Sfx at={TM.plus2} name="pop" volume={0.22} />
      <Sfx at={TM.pushA} name="whoosh" volume={0.12} />
      <Sfx at={TM.plus3} name="pop" volume={0.16} />
      <Sfx at={TM.lock} name="tick" volume={0.14} />
      <Sfx at={TM.recA} name="click" volume={0.2} />
      <Sfx at={TM.recB} name="tick" volume={0.16} />
      <Sfx at={TM.stick} name="pop" volume={0.14} />
      <Sfx at={TM.fly4} name="whoosh" volume={0.12} />
      <Sfx at={TM.land4} name="chime" volume={0.18} />
    </SceneShell>
  );
};
