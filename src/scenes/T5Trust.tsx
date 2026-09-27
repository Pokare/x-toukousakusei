/*
 * TRACK 05 — 安心と、実力（PRE-BROADCAST CHECK）
 *
 * コンセプト: 深夜スタジオの「放送前チェック」。ラックに積んだ 2 台の点検ユニット（U1 透かし / U2 出演同意書）で
 * 安心を確かめ、最後にパタパタ表示（スプリットフラップ）の結果ボードで実力を見せる。
 * 安心 = ミント（信号・OK）、実力 = コーラル（強調・1位）で色を分ける。
 *
 * 絵コンテ（すべてナレーションの行・フレーズ・シーン境界から計算。秒の直書きなし）
 *  B0  enter      テープが抜けると同時に、見出し（台本のトラック名）が 1 文字ずつせり上がる（中央・大）。
 *                 キーワード（安心 = ミント / 実力 = コーラル）は最初から色つき。上に MONO「05 — PRE-BROADCAST CHECK」。
 *                 下に消灯した卓のボタン 2 つ［SAFETY］&［QUALITY］が並ぶ。
 *  B1  t5-1       「安心」の語で SAFETY ボタンがミントに点灯、「実力」の語で QUALITY ボタンがコーラルに点灯（クリック音）。
 *  B2  t5-2       見出しが左上へ収まり、ボタンは消える。見出しのすぐ下（最終位置）に U1「GENERATED AUDIO」がせり上がる。
 *                 中身は t5-2 の実際の音声から作った波形クリップ。ミントの書き込みヘッドが声に合わせて走り、
 *                 通過した棒の中にミントの点の透かし模様と下段の署名ビットが埋め込まれていく。
 *                 右の表示は「SynthID WATERMARK 000→100%」。100% でミントに光ってから消え、
 *                 「透かし入り」で「SynthID · WATERMARKED」の判子が押される（ポン）。
 *  B3  t5-3       U1 が一歩下がり、その下に U2「出演同意書 / TALENT RELEASE」が立ち上がる。
 *                 「声の再現には」で用途欄に VOICE REPLICA が打ち込まれ、署名欄の × が点滅。
 *                 「本人の同意確認」でペン先（声に反応して光る）がサインを書き、書き終わりで「SIGNED」の判子（ポン）。
 *                 状態表示は CONSENT · 確認中 → CONSENT · VERIFIED。
 *  B4  t5-4       2 台のユニットは下へ抜けて退場（札にして残さない）。同じ場所に結果ボード
 *                 「Hume AI · VOICE DESIGN BENCHMARK」がせり上がる。比較の棒や他モデルは描かない。
 *                 パタパタ表示が左から順にめくれて「Gemini 3.8 Flash TTS」になり、SCORE の桁が回って 71.4 で止まる。
 *                 「総合」で OVERALL 表示灯が点灯、「1位」で RANK の大きな札が 3 回空めくりしてから「1」を出す（チャイム）。
 *  B5  tail       1 位の行にコーラルの下線が引かれ、名前の札を光がひと筋走る。そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { IconShield, IconTrophy } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, section, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, rand, springAt, useTime } from "../time";
import {
  CheckDraw,
  FlapTile,
  IconShieldCheck,
  RackFrame,
  Screw,
  UnitHeader,
  clipShape,
  envAt,
  mixHex,
  phraseStarts,
  pointsToPath,
  signaturePoints,
  voicedRange,
  type Rect,
} from "./T5Trust/parts";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t5");
const L1 = line("t5-1");
const L2 = line("t5-2");
const L3 = line("t5-3");
const L4 = line("t5-4");

// 「トラック5は、|安心と実力。」
const P1 = phraseStarts("t5-1", 2, [0, 0.5]);
// 「声の再現には、|本人の同意確認が必要です。」
const P3 = phraseStarts("t5-3", 2, [0, 0.4]);
// 「Hume AIの音声デザイン評価では、|総合1位を獲得しました。」
const P4 = phraseStarts("t5-4", 2, [0, 0.55]);
const V2 = voicedRange("t5-2");

const STAMP = Math.min(L2.end - 0.05, Math.max(mix(L2.start, L2.end, 0.62), V2.last - 0.32)); // 「透かし入り」
const SIGN_A = P3[1] + 0.04; // 「本人の」
const SIGN_B = Math.max(SIGN_A + 0.7, mix(P3[1], L3.end, 0.5)); // 「同意確認」を言い終えるころ
const EXIT = Math.max(L3.end + 0.06, L4.start - 0.4);
const BOARD_IN = EXIT + 0.26; // ユニットが抜けきってから
const NAME_A = BOARD_IN + 0.22;
const FILL_B = P4[1] - 0.04; // 「総合」の直前で数え終わる
const FILL_A = Math.min(FILL_B - 0.9, Math.max(NAME_A + 0.6, mix(L4.start, P4[1], 0.4)));
const TM = {
  headIn: E + 0.08,
  lampsIn: E + 0.62,
  safety: P1[1], // 「安心」
  quality: mix(P1[1], L1.end, 0.42), // 「実力」
  settleA: L2.start - 0.45, // 見出しが先に上がりはじめ、U1 はその下から追いかける
  settleB: L2.start + 0.2,
  u1In: L2.start - 0.12,
  embedA: L2.start,
  embedB: STAMP - 0.3, // 100% に達してミントに光り、判子の前に表示が消える
  stamp: STAMP,
  u2In: L3.start - 0.24,
  purpose: L3.start + 0.12, // 「声の再現には」
  signA: SIGN_A,
  signB: SIGN_B,
  signed: SIGN_B + 0.1,
  exit: EXIT,
  boardIn: BOARD_IN,
  nameA: NAME_A,
  fillA: FILL_A,
  fillB: FILL_B,
  overall: P4[1], // 「総合」
  rank: mix(P4[1], L4.end, 0.2), // 「1位」
};

// ───────── レイアウト ─────────
const TITLE = section("t5").title || "安心と、実力";
const HEAD = { x: PAD_X, y: 156, size: 80 };
const BIG = 1.5;
const BIG_CY = 408;
const LAMP = { y: 596, w: 330, h: 104, gap: 110 };
// 見出しのすぐ下から並べる（T1〜T3 と同じ位置）
const U1: Rect = { x: PAD_X, y: 318, w: 1920 - PAD_X * 2, h: 300 };
const U2R: Rect = { x: PAD_X, y: 646, w: 1920 - PAD_X * 2, h: 208 };
const BOARD: Rect = { x: PAD_X, y: 318, w: 1920 - PAD_X * 2, h: 536 };

// 見出しの文字色（台本のトラック名が変わっても、キーワードがあれば色をつける）
const KEYWORDS: [string, string][] = [
  ["安心", C.mint],
  ["実力", C.coral],
];
const TITLE_CHARS = [...TITLE];
const TITLE_COLORS: string[] = (() => {
  const cols = TITLE_CHARS.map(() => C.text as string);
  let hit = false;
  for (const [kw, col] of KEYWORDS) {
    for (let i = TITLE.indexOf(kw); i >= 0; i = TITLE.indexOf(kw, i + 1)) {
      const ci = [...TITLE.slice(0, i)].length;
      for (let j = 0; j < [...kw].length; j++) cols[ci + j] = col;
      hit = true;
    }
  }
  if (!hit) {
    const cut = TITLE_CHARS.lastIndexOf("、");
    if (cut >= 0) TITLE_CHARS.forEach((_, i) => i > cut && (cols[i] = C.coral));
  }
  return cols;
})();
// 見出しの幅（Dela Gothic One: 全角 ≒ 1.02em、句読点 ≒ 0.4em。「安心と、実力」で実測 440px）
const HEAD_W = TITLE_CHARS.reduce((a, ch) => a + ("、。・".includes(ch) ? 0.4 : 1.02) * HEAD.size, 0);

// U1 の中身
const WF = { x: 60, y: 84, w: 1120, h: 136 };
const N_BARS = 70;
const SHAPE = clipShape("t5-2", N_BARS);
const RZ = { x: 1236, w: U1.w - 1236 };

// U2 の中身
const ROW_Y = 54 + (U2R.h - 54) / 2;
const SIG = { x: 912, y: 160, w: 360, h: 62 };
const SIG_PTS = signaturePoints(SIG.w, SIG.h);
const SIGN_LINE = { a: 860, b: 1322, y: 170 };

// 結果ボード
const NAME = "Gemini 3.8 Flash TTS";
const FB = {
  x0: 48,
  nameLabelY: 112,
  nameY: 142,
  tileW: 50,
  tileH: 82,
  tileGap: 6,
  scoreLabelY: 274,
  scoreY: 304,
  digitW: 120,
  dotW: 60,
  digitH: 176,
  digitGap: 10,
  divX: 1226,
  rank: { x: 1321, y: 142, w: 300, h: 338 },
};
const NAME_W = NAME.length * (FB.tileW + FB.tileGap) - FB.tileGap;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const mono = (size: number, color: string = C.sub, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.16em",
  color,
  whiteSpace: "nowrap",
  ...extra,
});

// ───────── 見出し ─────────
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const s = mix(BIG, 1, settle);
  const bigW = HEAD_W * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(BIG_CY - bigH / 2 - HEAD.y, 0, settle);
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
        <div style={{ ...mono(20, C.sub), letterSpacing: "0.2em", opacity: lab, transform: `translateX(${(1 - lab) * -12}px)` }}>
          <span style={{ color: C.coral }}>05</span> — PRE-BROADCAST CHECK
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {TITLE_CHARS.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.045, TM.headIn + i * 0.045 + 0.5, ease.outQuint);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: TITLE_COLORS[i] }}>{ch}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── t5-1: 卓のボタン［SAFETY］&［QUALITY］ ─────────
const Lamp: React.FC<{
  x: number;
  lit: number;
  appear: number;
  color: string;
  soft: string;
  label: string;
  jp: string;
  icon: (c: string) => React.ReactNode;
}> = ({ x, lit, appear, color, soft, label, jp, icon }) => {
  const iconColor = mixHex(C.dim, color, lit);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: LAMP.y,
        width: LAMP.w,
        height: LAMP.h,
        borderRadius: 16,
        boxSizing: "border-box",
        border: `1.5px solid ${lit > 0.5 ? color : C.border}`,
        background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.45)${lit > 0 ? `, 0 0 ${36 * lit}px ${color}55` : ""}`,
        opacity: appear,
        transform: `translateY(${(1 - appear) * 18}px)`,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 28px",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: soft, opacity: lit }} />
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          width: 10,
          height: 10,
          borderRadius: 5,
          background: lit > 0.5 ? color : "#2A303B",
          boxShadow: lit > 0.5 ? `0 0 10px ${color}` : undefined,
        }}
      />
      <div style={{ position: "relative", display: "flex" }}>{icon(iconColor)}</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={mono(24, mixHex(C.sub, C.text, lit), { letterSpacing: "0.2em" })}>{label}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: mixHex(C.dim, color, lit), letterSpacing: "0.1em" }}>{jp}</div>
      </div>
    </div>
  );
};

const Lamps: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, TM.settleA - 0.05, TM.settleA + 0.25);
  if (t < TM.lampsIn || out >= 1) return null;
  const a1 = prog(t, TM.lampsIn, TM.lampsIn + 0.45, ease.outQuint);
  const a2 = prog(t, TM.lampsIn + 0.1, TM.lampsIn + 0.55, ease.outQuint);
  const l1 = prog(t, TM.safety, TM.safety + 0.12);
  const l2 = prog(t, TM.quality, TM.quality + 0.12);
  const total = LAMP.w * 2 + LAMP.gap;
  const x1 = 960 - total / 2;
  const x2 = x1 + LAMP.w + LAMP.gap;
  const amp = prog(t, TM.lampsIn + 0.2, TM.lampsIn + 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${out * 14}px)` }}>
      <Lamp x={x1} lit={l1} appear={a1} color={C.mint} soft={C.mintSoft} label="SAFETY" jp="安心" icon={(c) => <IconShield size={44} color={c} sw={1.8} />} />
      <div
        style={{
          position: "absolute",
          left: x1 + LAMP.w,
          width: LAMP.gap,
          top: LAMP.y,
          height: LAMP.h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontSize: 40,
          color: C.dim,
          opacity: amp,
        }}
      >
        &amp;
      </div>
      <Lamp x={x2} lit={l2} appear={a2} color={C.coral} soft={C.coralSoft} label="QUALITY" jp="実力" icon={(c) => <IconTrophy size={44} color={c} sw={1.8} />} />
    </div>
  );
};

// ───────── U1: 透かしの埋め込み ─────────
const embedP = (t: number) => clamp01((t - TM.embedA) / (TM.embedB - TM.embedA));

const WaveEmbed: React.FC<{ t: number }> = ({ t }) => {
  const rev = prog(t, TM.u1In + 0.12, TM.u1In + 0.75, ease.out);
  const s = embedP(t);
  const sx = s * WF.w;
  const head = prog(t, TM.embedA - 0.2, TM.embedA + 0.1) * (1 - prog(t, TM.embedB + 0.02, TM.embedB + 0.24));
  const step = WF.w / N_BARS;
  const bw = step * 0.7;
  const cy = WF.h / 2;
  const env = envAt("t5-2", t);
  const bitsY = WF.h + 24;
  return (
    <svg width={WF.w} height={WF.h + 40} style={{ position: "absolute", left: WF.x, top: WF.y, overflow: "visible" }}>
      <defs>
        <pattern id="t5-wm" width={5} height={5} patternUnits="userSpaceOnUse">
          <rect width={5} height={5} fill="rgba(59,227,180,0.2)" />
          <circle cx={2.5} cy={2.5} r={1.15} fill={C.mint} />
        </pattern>
        <linearGradient id="t5-trail" x1={0} x2={1} y1={0} y2={0}>
          <stop offset={0} stopColor={C.mint} stopOpacity={0} />
          <stop offset={1} stopColor={C.mint} stopOpacity={0.22} />
        </linearGradient>
      </defs>
      <line x1={0} y1={cy} x2={WF.w * rev} y2={cy} stroke={C.border} strokeWidth={1.5} />
      {SHAPE.map((v, i) => {
        const cx = (i + 0.5) * step;
        const g = clamp01((rev - i / N_BARS) * 7);
        if (g <= 0) return null;
        const h = Math.max(5, v * WF.h * 0.94) * mix(0.2, 1, g);
        const done = s > 0 && cx < sx;
        const atHead = head > 0.5 && Math.abs(cx - sx) < step * 0.9;
        return (
          <g key={i} opacity={g}>
            <rect
              x={cx - bw / 2}
              y={cy - h / 2}
              width={bw}
              height={h}
              rx={bw / 2.4}
              fill={atHead ? C.text : done ? "url(#t5-wm)" : C.sub}
              fillOpacity={atHead || done ? 1 : 0.4}
              stroke={done && !atHead ? C.mint : "none"}
              strokeWidth={1.3}
            />
            {/* 下段: 埋め込まれた署名ビット（埋め込み前は見えない） */}
            <rect
              x={cx - bw / 2}
              y={bitsY}
              width={bw}
              height={6}
              rx={1.5}
              fill={done ? (rand(i * 5.31 + 2) > 0.45 ? C.mint : "rgba(59,227,180,0.22)") : "rgba(255,255,255,0.05)"}
            />
          </g>
        );
      })}
      {head > 0 && (
        <g opacity={head}>
          <rect x={Math.max(0, sx - 140)} y={-12} width={Math.min(140, sx)} height={WF.h + 24} fill="url(#t5-trail)" />
          <line
            x1={sx}
            y1={-18}
            x2={sx}
            y2={bitsY + 14}
            stroke={C.mint}
            strokeWidth={2.5}
            style={{ filter: `drop-shadow(0 0 ${6 + 10 * env}px ${C.mint})` }}
          />
          <path d={`M${sx - 8} -28 L${sx + 8} -28 L${sx} -17 Z`} fill={C.mint} />
        </g>
      )}
    </svg>
  );
};

const Unit1Body: React.FC<{ t: number }> = ({ t }) => {
  const s = embedP(t);
  const full = t >= TM.embedB;
  const readIn = prog(t, TM.u1In + 0.2, TM.u1In + 0.6);
  // 100% でミントに光り（数フレーム）、判子が落ちる前に消えきる
  const flash = prog(t, TM.embedB - 0.01, TM.embedB + 0.03) * (1 - prog(t, TM.embedB + 0.1, TM.embedB + 0.2));
  const readOut = prog(t, TM.embedB + 0.1, TM.stamp - 0.02, ease.in);
  const st = springAt(t, TM.stamp, { damping: 12, stiffness: 210, mass: 0.7 });
  const stO = prog(t, TM.stamp, TM.stamp + 0.07);
  const stScale = 1 + (1 - st) * 0.55;
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.6);
  const done = t >= TM.stamp + 0.1;
  const w = U1.w;
  return (
    <>
      <UnitHeader
        w={w}
        tag="U1"
        seed={11}
        label={<span>GENERATED AUDIO</span>}
        right={done ? <span style={{ color: C.mint }}>✓ WATERMARKED</span> : <span style={{ color: C.sub }}>voice_output.wav</span>}
      />
      <Screw x={22} y={U1.h - 22} seed={13} />
      <Screw x={w - 22} y={U1.h - 22} seed={14} />
      <WaveEmbed t={t} />
      {/* 区切り */}
      <div style={{ position: "absolute", left: RZ.x, top: 78, width: 1.5, height: U1.h - 108, background: C.border }} />
      {/* 右: 埋め込みの進み具合 → 判子 */}
      {readOut < 1 && (
        <div
          style={{
            position: "absolute",
            left: RZ.x,
            top: 54,
            width: RZ.w,
            height: U1.h - 54,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: readIn * (1 - readOut),
          }}
        >
          <div style={{ ...mono(16, C.sub), display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: C.mint, opacity: full ? 1 : s > 0 ? blink : 0.3 }} />
            SynthID WATERMARK
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 72,
              color: full ? C.mint : C.text,
              lineHeight: 1,
              letterSpacing: "0.02em",
              textShadow: flash > 0 ? `0 0 ${26 * flash}px ${C.mint}` : undefined,
            }}
          >
            {String(Math.round(s * 100)).padStart(3, "0")}
            <span style={{ fontSize: 30, color: full ? C.mint : C.sub, marginLeft: 6 }}>%</span>
          </div>
          <div style={{ width: 280, height: 6, borderRadius: 3, background: C.border, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: `${s * 100}%`, height: "100%", background: C.mint }} />
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: full ? C.mint : C.sub, letterSpacing: "0.12em", marginTop: 2 }}>
            {full ? "埋め込み完了" : "透かしを埋め込み中"}
          </div>
        </div>
      )}
      {stO > 0 && (
        <div
          style={{
            position: "absolute",
            left: RZ.x + RZ.w / 2 - 190,
            top: 54 + (U1.h - 54) / 2 - 68,
            width: 380,
            height: 136,
            opacity: stO,
            transform: `rotate(${-5 - (1 - st) * 6}deg) scale(${stScale})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              border: `3.5px solid ${C.mint}`,
              background: "rgba(59,227,180,0.07)",
              boxShadow: `0 0 30px ${C.mint}33`,
            }}
          />
          <div style={{ position: "absolute", inset: 7, borderRadius: 9, border: `1.5px solid ${C.mint}`, opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <IconShieldCheck size={58} color={C.mint} sw={1.9} check={prog(t, TM.stamp + 0.1, TM.stamp + 0.4, ease.out)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: C.mint, lineHeight: 1, letterSpacing: "0.02em" }}>SynthID</div>
              <div style={mono(17, C.mint, { letterSpacing: "0.22em" })}>· WATERMARKED ·</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ───────── U2: 出演同意書（TALENT RELEASE） ─────────
const FormSheet: React.FC<{ signed: number; appear: number }> = ({ signed, appear }) => {
  const col = mixHex(C.sub, C.mint, signed);
  return (
    <svg width={74} height={96} viewBox="0 0 74 96" style={{ position: "absolute", left: 48, top: ROW_Y - 48, overflow: "visible", opacity: appear }}>
      <path d="M4 2 H54 L72 20 V92 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V4 a2 2 0 0 1 2 -2 Z" fill={C.panelHi} stroke={col} strokeWidth={1.8} />
      <path d="M54 2 V20 H72" fill="none" stroke={col} strokeWidth={1.8} strokeLinejoin="round" />
      <g stroke={C.borderHi} strokeWidth={2.4} strokeLinecap="round">
        <line x1={12} y1={18} x2={38} y2={18} />
        <line x1={12} y1={32} x2={60} y2={32} />
        <line x1={12} y1={43} x2={60} y2={43} />
        <line x1={12} y1={54} x2={48} y2={54} />
      </g>
      <line x1={12} y1={80} x2={62} y2={80} stroke={C.borderHi} strokeWidth={1.5} />
      <path
        d="M14 76 c4 -10 7 -10 6 -2 s4 4 7 -3 s3 -6 5 0 s5 2 8 -2 l14 0"
        fill="none"
        stroke={C.mint}
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - signed}
      />
    </svg>
  );
};

const Unit2Body: React.FC<{ t: number }> = ({ t }) => {
  const w = U2R.w;
  const env = envAt("t5-3", t);
  const appear = (d: number) => prog(t, TM.u2In + 0.15 + d, TM.u2In + 0.6 + d, ease.outQuint);
  const TYPED = "VOICE REPLICA";
  const nType = Math.floor(prog(t, TM.purpose, TM.purpose + 0.55, ease.linear) * TYPED.length);
  const typing = t >= TM.purpose && t < TM.purpose + 0.8;
  const sp = prog(t, TM.signA, TM.signB, ease.inOutSine);
  const nPts = Math.max(0, Math.floor(sp * SIG_PTS.length));
  const tip = nPts > 0 ? SIG_PTS[nPts - 1] : SIG_PTS[0];
  const pen = prog(t, TM.signA - 0.12, TM.signA) * (1 - prog(t, TM.signB, TM.signB + 0.15));
  const signed = t >= TM.signed;
  const sheetSigned = prog(t, TM.signed, TM.signed + 0.35, ease.out);
  const st = springAt(t, TM.signed, { damping: 12, stiffness: 220, mass: 0.7 });
  const stO = prog(t, TM.signed, TM.signed + 0.07);
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.4);
  const xMark = 1 - prog(t, TM.signA - 0.1, TM.signA + 0.2);
  const cursorOn = Math.floor(t * 3.2) % 2 === 0;
  return (
    <>
      <UnitHeader
        w={w}
        tag="U2"
        seed={21}
        label={<span>CONSENT FORM</span>}
        right={
          signed ? (
            <span style={{ color: C.mint }}>✓ SIGNED</span>
          ) : (
            <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, background: C.coral, opacity: blink }} />
              SIGNATURE REQUIRED
            </span>
          )
        }
      />
      <Screw x={22} y={U2R.h - 22} seed={23} />
      <Screw x={w - 22} y={U2R.h - 22} seed={24} />
      {/* 書類のアイコンと題名 */}
      <FormSheet signed={sheetSigned} appear={appear(0)} />
      <div style={{ position: "absolute", left: 150, top: ROW_Y - 40, opacity: appear(0.04), transform: `translateX(${(1 - appear(0.04)) * -12}px)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.text, lineHeight: 1.1, letterSpacing: "0.04em" }}>出演同意書</div>
        <div style={mono(15, C.sub, { marginTop: 8, letterSpacing: "0.2em" })}>TALENT RELEASE</div>
      </div>
      <div style={{ position: "absolute", left: 472, top: 78, width: 1.5, height: U2R.h - 104, background: C.border, opacity: appear(0.06) }} />
      {/* 用途 → 同意の状態 */}
      <div style={{ position: "absolute", left: 512, top: ROW_Y - 46, opacity: appear(0.08) }}>
        <div style={mono(14, C.dim)}>PURPOSE</div>
        <div style={{ ...mono(26, C.text, { letterSpacing: "0.06em" }), marginTop: 8, height: 30, display: "flex", alignItems: "center" }}>
          {TYPED.slice(0, nType)}
          {typing && <span style={{ width: 13, height: 26, marginLeft: 3, background: C.mint, opacity: cursorOn ? 0.9 : 0 }} />}
        </div>
        <div style={{ ...mono(14, signed ? C.mint : C.sub), marginTop: 14, display: "flex", alignItems: "center", gap: 9 }}>
          {signed ? (
            <CheckDraw size={16} color={C.mint} sw={3.4} p={prog(t, TM.signed, TM.signed + 0.25)} />
          ) : (
            <span style={{ width: 8, height: 8, borderRadius: 4, background: C.coral, opacity: blink }} />
          )}
          {signed ? "CONSENT · VERIFIED" : "CONSENT · 確認中"}
        </div>
      </div>
      {/* 署名欄 */}
      <div style={{ position: "absolute", left: SIGN_LINE.a, top: 76, ...mono(14, C.dim), opacity: appear(0.12) }}>SIGNATURE · VOICE OWNER</div>
      <svg width={w} height={U2R.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: appear(0.12) }}>
        <line x1={SIGN_LINE.a} y1={SIGN_LINE.y} x2={SIGN_LINE.a + (SIGN_LINE.b - SIGN_LINE.a) * appear(0.14)} y2={SIGN_LINE.y} stroke={C.borderHi} strokeWidth={2} />
        {xMark > 0 && (
          <g opacity={xMark * (0.45 + 0.55 * blink)} stroke={C.coral} strokeWidth={3} strokeLinecap="round">
            <line x1={SIGN_LINE.a + 4} y1={SIGN_LINE.y - 30} x2={SIGN_LINE.a + 22} y2={SIGN_LINE.y - 12} />
            <line x1={SIGN_LINE.a + 22} y1={SIGN_LINE.y - 30} x2={SIGN_LINE.a + 4} y2={SIGN_LINE.y - 12} />
          </g>
        )}
        {nPts > 1 && (
          <path
            d={pointsToPath(SIG_PTS.slice(0, nPts))}
            transform={`translate(${SIG.x} ${SIG.y})`}
            fill="none"
            stroke={signed ? C.mint : C.text}
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {pen > 0 && (
          <g opacity={pen} transform={`translate(${SIG.x + tip[0]} ${SIG.y + tip[1]})`}>
            <circle r={9 + 9 * env} fill={C.mint} opacity={0.18 + 0.2 * env} />
            <circle r={4.5} fill={C.mint} style={{ filter: `drop-shadow(0 0 ${5 + 8 * env}px ${C.mint})` }} />
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: 1380, top: 78, width: 1.5, height: U2R.h - 104, background: C.border, opacity: appear(0.16) }} />
      {/* 判子の場所（押される前は点線の枠） */}
      <div
        style={{
          position: "absolute",
          left: 1554 - 140,
          top: ROW_Y - 48,
          width: 280,
          height: 96,
          borderRadius: 12,
          border: `1.5px dashed ${C.borderHi}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...mono(15, C.dim, { letterSpacing: "0.22em" }),
          opacity: appear(0.18) * (1 - stO),
        }}
      >
        UNSIGNED
      </div>
      {stO > 0 && (
        <div
          style={{
            position: "absolute",
            left: 1554 - 140,
            top: ROW_Y - 54,
            width: 280,
            height: 108,
            opacity: stO,
            transform: `rotate(${-5 - (1 - st) * 6}deg) scale(${1 + (1 - st) * 0.35})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              border: `3.5px solid ${C.mint}`,
              background: "rgba(59,227,180,0.07)",
              boxShadow: `0 0 30px ${C.mint}33`,
            }}
          />
          <div style={{ position: "absolute", inset: 7, borderRadius: 9, border: `1.5px solid ${C.mint}`, opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <CheckDraw size={40} color={C.mint} sw={3.2} p={prog(t, TM.signed + 0.08, TM.signed + 0.35)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: C.mint, lineHeight: 1, letterSpacing: "0.08em" }}>SIGNED</div>
              <div style={mono(13, C.mint, { letterSpacing: "0.22em" })}>TALENT RELEASE</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ───────── 結果ボード（パタパタ表示） ─────────
// 名前の札: 左から順に、ランダムな文字を 3 回めくってから正しい文字で止まる
const nameSeq = (ch: string, i: number) => {
  if (ch === " ") return { seq: [" "], at: [0] };
  const a = TM.nameA + i * 0.035;
  const seq = [" "];
  const at = [0];
  for (let j = 0; j < 3; j++) {
    seq.push(GLYPHS[Math.floor(rand(i * 13.7 + j * 3.1 + 1) * GLYPHS.length)]);
    at.push(a + j * 0.07);
  }
  seq.push(ch);
  at.push(a + 3 * 0.07);
  return { seq, at };
};
// スコアの札: 0 から数えて目標の数字で止まる（終わりに向かってゆっくり）
const countSeq = (target: number, laps: number) => {
  const seq: string[] = [];
  for (let v = 0; v <= laps * 10 + target; v++) seq.push(String(v % 10));
  const n = seq.length - 1;
  const at = seq.map((_, j) => (j === 0 ? 0 : mix(TM.fillA, TM.fillB - 0.07, Math.pow((j - 1) / Math.max(1, n - 1), 1.35))));
  return { seq, at };
};
const SCORE_TILES = [
  { ...countSeq(7, 0), w: FB.digitW },
  { ...countSeq(1, 1), w: FB.digitW },
  { seq: ["."], at: [0], w: FB.dotW },
  { ...countSeq(4, 1), w: FB.digitW },
];
const RANK_SEQ = { seq: [" ", " ", " ", "1"], at: [0, TM.rank - 0.3, TM.rank - 0.2, TM.rank - 0.1] };

const BoardBody: React.FC<{ t: number }> = ({ t }) => {
  const w = BOARD.w;
  const hdr = prog(t, TM.boardIn, TM.boardIn + 0.3);
  const labels = prog(t, TM.boardIn + 0.08, TM.boardIn + 0.4);
  const overall = prog(t, TM.overall, TM.overall + 0.18);
  const won = prog(t, TM.rank, TM.rank + 0.3);
  const ring = prog(t, TM.rank, TM.rank + 0.6, ease.out);
  const under = prog(t, TM.rank + 0.05, TM.rank + 0.5, ease.outQuint);
  const shimmer = prog(t, TM.rank + 0.35, TM.rank + 1.1, ease.inOut);
  const scoreLit = prog(t, TM.fillB, TM.fillB + 0.2);
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.2);
  const R = FB.rank;
  return (
    <>
      {/* 見出し行 */}
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 56, borderBottom: `1px solid ${C.border}`, opacity: hdr }}>
        <Screw x={22} y={28} seed={31} />
        <Screw x={w - 22} y={28} seed={32} />
        <div style={{ position: "absolute", left: 48, top: 0, height: 56, display: "flex", alignItems: "center", gap: 14, ...mono(18, C.sub) }}>
          <span style={{ color: C.text, letterSpacing: "0.06em" }}>Hume AI</span>
          <span style={{ color: C.dim }}>·</span>
          VOICE DESIGN BENCHMARK
        </div>
        <div style={{ position: "absolute", right: 48, top: 0, height: 56, display: "flex", alignItems: "center", gap: 10, ...mono(17, mixHex(C.dim, C.coral, won)) }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: won > 0.5 ? C.coral : "#2A303B",
              opacity: won > 0.5 ? blink : 1,
              boxShadow: won > 0.5 ? `0 0 8px ${C.coral}` : undefined,
            }}
          />
          RESULT
        </div>
      </div>

      {/* MODEL */}
      <div style={{ position: "absolute", left: FB.x0, top: FB.nameLabelY, ...mono(16, C.dim), opacity: labels }}>MODEL</div>
      <div style={{ position: "absolute", left: FB.x0, top: FB.nameY, width: NAME_W, height: FB.tileH, opacity: labels }}>
        {[...NAME].map((ch, i) => {
          const { seq, at } = nameSeq(ch, i);
          return (
            <div key={i} style={{ position: "absolute", left: i * (FB.tileW + FB.tileGap), top: 0 }}>
              <FlapTile t={t} seq={seq} at={at} w={FB.tileW} h={FB.tileH} dur={0.07} font={MONO} weight={700} size={54} color={C.text} dy={1} radius={6} />
            </div>
          );
        })}
        {/* 光がひと筋走る */}
        {shimmer > 0 && shimmer < 1 && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 6, pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: mix(-200, NAME_W + 60, shimmer),
                width: 140,
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,236,226,0.22) 50%, rgba(255,255,255,0) 100%)",
                transform: "skewX(-18deg)",
              }}
            />
          </div>
        )}
      </div>
      {/* 1 位の行の下線 */}
      <div
        style={{
          position: "absolute",
          left: FB.x0,
          top: FB.nameY + FB.tileH + 14,
          width: NAME_W * under,
          height: 4,
          borderRadius: 2,
          background: C.coral,
          boxShadow: `0 0 14px ${C.coral}88`,
        }}
      />

      {/* SCORE */}
      <div style={{ position: "absolute", left: FB.x0, top: FB.scoreLabelY, ...mono(16, C.dim), opacity: labels }}>SCORE</div>
      <div style={{ position: "absolute", left: FB.x0, top: FB.scoreY, display: "flex", gap: FB.digitGap, opacity: labels }}>
        {SCORE_TILES.map((d, i) => (
          <FlapTile
            key={i}
            t={t}
            seq={d.seq}
            at={d.at}
            w={d.w}
            h={FB.digitH}
            dur={0.06}
            font={DISPLAY}
            size={140}
            color={mixHex(C.sub, C.coral, clamp01(prog(t, TM.fillA - 0.1, TM.fillA + 0.1) * 0.6 + scoreLit * 0.4))}
            dy={-11}
            radius={10}
            glow={scoreLit * 0.5}
          />
        ))}
      </div>

      {/* OVERALL 表示灯（「総合」で点灯） */}
      <div
        style={{
          position: "absolute",
          left: 596,
          top: FB.scoreY + FB.digitH / 2 - 62,
          width: 400,
          height: 124,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `1.5px solid ${mixHex(C.border, C.coral, overall)}`,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          boxShadow: overall > 0 ? `0 0 ${34 * overall}px ${C.coral}44` : undefined,
          opacity: labels,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 30px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: C.coralSoft, opacity: overall }} />
        <div
          style={{
            position: "relative",
            width: 16,
            height: 16,
            borderRadius: 8,
            background: overall > 0.5 ? C.coral : "#2A303B",
            boxShadow: overall > 0.5 ? `0 0 12px ${C.coral}` : undefined,
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 50, lineHeight: 1.05, color: mixHex(C.dim, C.text, overall), letterSpacing: "0.08em" }}>総合</div>
          <div style={mono(16, mixHex(C.dim, C.coral, overall), { letterSpacing: "0.22em" })}>OVERALL</div>
        </div>
      </div>

      {/* 区切り */}
      <div style={{ position: "absolute", left: FB.divX, top: 88, width: 1.5, height: BOARD.h - 120, background: C.border, opacity: labels }} />

      {/* RANK（「1位」で 1 が出る） */}
      <div style={{ position: "absolute", left: R.x, top: FB.nameLabelY, ...mono(16, mixHex(C.dim, C.coral, won)), opacity: labels }}>RANK · No.</div>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: R.x - 40 * ring,
            top: R.y - 40 * ring,
            width: R.w + 80 * ring,
            height: R.h + 80 * ring,
            borderRadius: 14 + 20 * ring,
            border: `${3 * (1 - ring)}px solid ${C.coral}`,
            opacity: 0.8 * (1 - ring),
          }}
        />
      )}
      <div style={{ position: "absolute", left: R.x, top: R.y, opacity: labels }}>
        <FlapTile
          t={t}
          seq={RANK_SEQ.seq}
          at={RANK_SEQ.at}
          w={R.w}
          h={R.h}
          dur={0.1}
          font={DISPLAY}
          size={290}
          color={C.coral}
          dy={-21}
          radius={14}
          glow={won}
        />
      </div>
    </>
  );
};

// ───────── 本体 ─────────
export const T5Trust: React.FC = () => {
  const t = useTime();

  // U1: 見出しの下（最終位置）にせり上がる → t5-3 で一歩下がる → t5-4 の前に下へ抜ける
  const u1In = prog(t, TM.u1In, TM.u1In + 0.5, ease.outQuint);
  const u2In = prog(t, TM.u2In, TM.u2In + 0.5, ease.outQuint);
  const out1 = prog(t, TM.exit, TM.exit + 0.28, ease.in);
  const out2 = prog(t, TM.exit + 0.05, TM.exit + 0.33, ease.in);
  const dim1 = mix(1, 0.5, prog(t, TM.u2In, TM.u2In + 0.4));
  const boardIn = prog(t, TM.boardIn, TM.boardIn + 0.5, ease.outQuint);

  return (
    <SceneShell id="t5">
      <Headline t={t} />
      <Lamps t={t} />

      {u1In > 0 && out1 < 1 && (
        <RackFrame r={{ ...U1, y: U1.y + (1 - u1In) * 50 + out1 * 40 }} opacity={u1In * (1 - out1)}>
          <div style={{ position: "absolute", inset: 0, opacity: dim1 }}>
            <Unit1Body t={t} />
          </div>
        </RackFrame>
      )}

      {u2In > 0 && out2 < 1 && (
        <RackFrame r={{ ...U2R, y: U2R.y + (1 - u2In) * 50 + out2 * 40 }} opacity={u2In * (1 - out2)}>
          <Unit2Body t={t} />
        </RackFrame>
      )}

      {/* 結果ボード（ユニットが抜けたあと、同じ場所にせり上がる） */}
      {boardIn > 0 && (
        <div style={{ opacity: boardIn, transform: `translateY(${(1 - boardIn) * 50}px)` }}>
          <RackFrame r={BOARD}>
            <BoardBody t={t} />
          </RackFrame>
        </div>
      )}

      {/* 効果音 */}
      <Sfx at={TM.safety} name="click" volume={0.2} />
      <Sfx at={TM.quality} name="click" volume={0.2} />
      <Sfx at={TM.stamp} name="pop" volume={0.24} />
      <Sfx at={TM.purpose} name="type" volume={0.14} />
      <Sfx at={TM.signed} name="pop" volume={0.22} />
      <Sfx at={TM.exit} name="whoosh" volume={0.12} />
      <Sfx at={TM.nameA} name="type" volume={0.16} />
      <Sfx at={TM.fillB} name="tick" volume={0.14} />
      <Sfx at={TM.overall} name="click" volume={0.18} />
      <Sfx at={TM.rank} name="chime" volume={0.26} />
    </SceneShell>
  );
};
