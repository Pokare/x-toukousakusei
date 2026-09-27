/*
 * TRACK 05 — 安心と、実力（SAFETY & QUALITY）
 *
 * コンセプト: 深夜スタジオの「出荷前チェック」。ラックに積んだ 2 台の点検ユニット（U1 透かし / U2 同意）で
 * 安心を確かめ、最後に評価ボードで実力を見せる。安心 = ミント（信号・OK）、実力 = コーラル（強調・1位）で色を分ける。
 *
 * 絵コンテ（すべてナレーションの行・フレーズ・シーン境界から計算。秒の直書きなし）
 *  B0  enter      テープが抜けると同時に、見出し「安心と、実力」が 1 文字ずつせり上がる（中央・大）。
 *                 上に MONO「05 — SAFETY & QUALITY」。下に消灯した卓のボタン 2 つ［SAFETY］&［QUALITY］が並ぶ。
 *  B1  t5-1       「安心」の語で SAFETY ボタンがミントに点灯し、見出しの「安心」もミントに。
 *                 「実力」の語で QUALITY ボタンがコーラルに点灯し、「実力」もコーラルに（クリック音）。
 *  B2  t5-2       見出しが左上へ収まり、ボタンは消える。中央にラックユニット U1「GENERATED AUDIO」がせり上がる。
 *                 中身は t5-2 の実際の音声から作った波形クリップ。ミントの走査線がこの行の再生位置どおりに走り
 *                 （= いま聞こえている声そのものを調べている）、通過した棒の中にミントの点の透かし模様と
 *                 下段の署名ビットが浮かび上がる。右の表示は SCAN 000→100%。
 *                 「透かし入り」で右側に「SynthID · WATERMARKED」の判子が押される（ポン）。
 *  B3  t5-3       U1 が上へ詰めて一歩下がり、下に U2「CONSENT CHECK」（● REQUIRED）が立ち上がる。
 *                 本人（声に反応する輪）→ 点線 → スイッチ［本人の同意を確認］→ 点線 → 鍵［声の再現］。
 *                 「本人の」で信号が本人からスイッチへ渡り、「同意」でスイッチが ON（ミント）に滑ってつまみにチェックが描かれる。
 *                 続いて信号が鍵へ渡り、鍵が開いて「声の再現 · UNLOCKED」。見出しの状態は ✓ VERIFIED に。
 *  B4  t5-4       2 台のユニットが見出しの右に 2 枚の小さな札（✓ SynthID 透かし / ✓ 本人の同意確認）へ縮んで収まる。
 *                 下から評価ボード「HUME AI · VOICE DESIGN BENCHMARK」がせり上がる。
 *                 灰色の「他モデル」3 本（名前・数値なし）が先に伸びて止まり、その後 Gemini 3.8 Flash TTS の
 *                 コーラルの LED バーが追い越して伸び、先端に乗った数値が 0 → 71.4 まで数える。
 *                 「総合」で OVERALL が点灯、「1位」で「#1 総合」のロゼットが判子のように押される（チャイム）。
 *  B5  tail       1 位の行が淡く光り、バーを光がひと筋走る。そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { IconShield, IconTrophy, IconUser } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, rand, springAt, useTime } from "../time";
import {
  CheckDraw,
  IconLock,
  IconShieldCheck,
  RackFrame,
  Rosette,
  Screw,
  Toggle,
  UnitHeader,
  clipShape,
  envAt,
  mixHex,
  mixRect,
  phraseStarts,
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
const FLIP = mix(P3[1], L3.end, 0.3); // 「同意」
const COMP_A = Math.max(L3.end + 0.06, L4.start - 0.4);
const FILL_B = P4[1] - 0.04; // 「総合」の直前で数え終わる
const FILL_A = Math.min(FILL_B - 0.8, Math.max(COMP_A + 0.95, mix(L4.start, P4[1], 0.38)));
const TM = {
  headIn: E + 0.08,
  lampsIn: E + 0.62,
  safety: P1[1], // 「安心」
  quality: mix(P1[1], L1.end, 0.42), // 「実力」
  settleA: L2.start - 0.45, // 見出しが先に上がりはじめ、U1 はその下から追いかける
  settleB: L2.start + 0.2,
  u1In: L2.start - 0.12,
  scanA: L2.start,
  scanB: L2.end,
  stamp: STAMP,
  u2In: L3.start - 0.24,
  sig1: mix(P3[1], L3.end, 0.02), // 「本人の」
  flip: FLIP,
  sig2: FLIP + 0.3,
  unlock: FLIP + 0.62,
  compA: COMP_A,
  compB: COMP_A + 0.62,
  benchIn: COMP_A + 0.3,
  ghostA: COMP_A + 0.7,
  fillA: FILL_A,
  fillB: FILL_B,
  overall: P4[1], // 「総合」
  badge: mix(P4[1], L4.end, 0.2), // 「1位」
};

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80, w: 440 }; // w: 実測した見出しの幅
const BIG = 1.5;
const BIG_CY = 408;
const LAMP = { y: 596, w: 330, h: 104, gap: 110 };
const U1_MID: Rect = { x: PAD_X, y: 440, w: 1920 - PAD_X * 2, h: 300 }; // t5-2: 中央
const U1_TOP: Rect = { ...U1_MID, y: 318 }; // t5-3: 上に詰める
const U2R: Rect = { x: PAD_X, y: 646, w: 1920 - PAD_X * 2, h: 208 };
const CHIP_W = 500;
const CHIP_H = 80;
const CHIP_Y = 186;
const CH1: Rect = { x: 1920 - PAD_X - CHIP_W * 2 - 20, y: CHIP_Y, w: CHIP_W, h: CHIP_H };
const CH2: Rect = { x: 1920 - PAD_X - CHIP_W, y: CHIP_Y, w: CHIP_W, h: CHIP_H };
const BENCH: Rect = { x: PAD_X, y: 318, w: 1920 - PAD_X * 2, h: 516 };

// U1 の中身
const WF = { x: 60, y: 84, w: 1120, h: 136 };
const N_BARS = 70;
const SHAPE = clipShape("t5-2", N_BARS);
const RZ = { x: 1236, w: U1_MID.w - 1236 };
// U2 の中身（本文の中心 y）
const ROW_Y = 54 + (U2R.h - 54) / 2;
// 評価ボード
const BB = {
  x0: 430,
  len: 700,
  heroY: 172,
  barH: 76,
  seg: 12,
  gap: 4,
  ghostY: [338, 398, 458],
  ghostH: 34,
  ghost: [0.83, 0.74, 0.64],
  badge: { cx: 1592, r: 92 },
};

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
  const bigW = HEAD.w * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(BIG_CY - bigH / 2 - HEAD.y, 0, settle);
  const chars = [..."安心と、実力"];
  const lab = prog(t, TM.headIn + 0.25, TM.headIn + 0.7, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.2, TM.headIn + 0.8, ease.outQuint);
  const safe = prog(t, TM.safety, TM.safety + 0.3);
  const qual = prog(t, TM.quality, TM.quality + 0.3);
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
          <span style={{ color: C.coral }}>05</span> — <span style={{ color: mixHex(C.sub, C.mint, safe) }}>SAFETY</span> &amp;{" "}
          <span style={{ color: mixHex(C.sub, C.coral, qual) }}>QUALITY</span>
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.045, TM.headIn + i * 0.045 + 0.5, ease.outQuint);
          const color = i <= 1 ? mixHex(C.text, C.mint, safe) : i >= 4 ? mixHex(C.text, C.coral, qual) : C.text;
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color }}>{ch}</span>
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

// ───────── U1: 透かしの走査 ─────────
const WaveScan: React.FC<{ t: number }> = ({ t }) => {
  const rev = prog(t, TM.u1In + 0.12, TM.u1In + 0.75, ease.out);
  const s = clamp01((t - TM.scanA) / (TM.scanB - TM.scanA));
  const sx = s * WF.w;
  const head = prog(t, TM.scanA - 0.2, TM.scanA + 0.1) * (1 - prog(t, TM.scanB + 0.02, TM.scanB + 0.3));
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
        const scanned = s > 0 && cx < sx;
        const atHead = head > 0.5 && Math.abs(cx - sx) < step * 0.9;
        return (
          <g key={i} opacity={g}>
            <rect
              x={cx - bw / 2}
              y={cy - h / 2}
              width={bw}
              height={h}
              rx={bw / 2.4}
              fill={atHead ? C.text : scanned ? "url(#t5-wm)" : C.sub}
              fillOpacity={atHead || scanned ? 1 : 0.4}
              stroke={scanned && !atHead ? C.mint : "none"}
              strokeWidth={1.3}
            />
            {/* 下段: 署名ビット（走査前は見えない） */}
            <rect
              x={cx - bw / 2}
              y={bitsY}
              width={bw}
              height={6}
              rx={1.5}
              fill={scanned ? (rand(i * 5.31 + 2) > 0.45 ? C.mint : "rgba(59,227,180,0.22)") : "rgba(255,255,255,0.05)"}
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
  const s = clamp01((t - TM.scanA) / (TM.scanB - TM.scanA));
  const readIn = prog(t, TM.u1In + 0.2, TM.u1In + 0.6);
  const readOut = prog(t, TM.stamp - 0.06, TM.stamp + 0.08);
  const st = springAt(t, TM.stamp, { damping: 12, stiffness: 210, mass: 0.7 });
  const stO = prog(t, TM.stamp, TM.stamp + 0.07);
  const stScale = 1 + (1 - st) * 0.55;
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.6);
  const done = t >= TM.stamp + 0.1;
  const w = U1_MID.w;
  return (
    <>
      <UnitHeader
        w={w}
        tag="U1"
        seed={11}
        label={<span>GENERATED AUDIO</span>}
        right={
          done ? (
            <span style={{ color: C.mint }}>✓ WATERMARKED</span>
          ) : (
            <span style={{ color: C.sub }}>voice_output.wav</span>
          )
        }
      />
      <Screw x={22} y={U1_MID.h - 22} seed={13} />
      <Screw x={w - 22} y={U1_MID.h - 22} seed={14} />
      <WaveScan t={t} />
      {/* 区切り */}
      <div style={{ position: "absolute", left: RZ.x, top: 78, width: 1.5, height: U1_MID.h - 108, background: C.border }} />
      {/* 右: 走査の進み具合 → 判子 */}
      <div
        style={{
          position: "absolute",
          left: RZ.x,
          top: 54,
          width: RZ.w,
          height: U1_MID.h - 54,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: readIn * (1 - readOut),
        }}
      >
        <div style={{ ...mono(16, C.sub), display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: C.mint, opacity: s > 0 ? blink : 0.3 }} />
          SynthID SCAN
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 72, color: C.text, lineHeight: 1, letterSpacing: "0.02em" }}>
          {String(Math.round(s * 100)).padStart(3, "0")}
          <span style={{ fontSize: 30, color: C.sub, marginLeft: 6 }}>%</span>
        </div>
        <div style={{ width: 280, height: 6, borderRadius: 3, background: C.border, marginTop: 6, overflow: "hidden" }}>
          <div style={{ width: `${s * 100}%`, height: "100%", background: C.mint }} />
        </div>
      </div>
      {stO > 0 && (
        <div
          style={{
            position: "absolute",
            left: RZ.x + RZ.w / 2 - 190,
            top: 54 + (U1_MID.h - 54) / 2 - 68,
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

// ───────── U2: 本人の同意確認 ─────────
const Unit2Body: React.FC<{ t: number }> = ({ t }) => {
  const w = U2R.w;
  const env = envAt("t5-3", t);
  const onP = prog(t, TM.flip, TM.flip + 0.28, ease.outQuint);
  const chk = prog(t, TM.flip + 0.16, TM.flip + 0.5, ease.out);
  const sig1 = prog(t, TM.sig1, TM.sig1 + 0.38, ease.inOut);
  const sig2 = prog(t, TM.sig2, TM.sig2 + 0.34, ease.inOut);
  const open = prog(t, TM.unlock, TM.unlock + 0.3, ease.outQuint);
  const verified = t >= TM.flip + 0.4;
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.4);
  const AV = { cx: 112, r: 42 };
  const C1 = { a: 290, b: 540 };
  const TG = { x: 560, w: 140, h: 66 };
  const LB = 732;
  const C2 = { a: 1086, b: 1270 };
  const LK = { cx: 1332, r: 42 };
  const conn = (a: number, b: number, p: number) => (
    <svg width={w} height={U2R.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <line x1={a} y1={ROW_Y} x2={b} y2={ROW_Y} stroke={C.borderHi} strokeWidth={2} strokeDasharray="3 9" strokeLinecap="round" />
      {p > 0 && (
        <>
          <line x1={a} y1={ROW_Y} x2={mix(a, b, p)} y2={ROW_Y} stroke={C.mint} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
          {p < 1 && <circle cx={mix(a, b, p)} cy={ROW_Y} r={6} fill={C.mint} style={{ filter: `drop-shadow(0 0 8px ${C.mint})` }} />}
        </>
      )}
    </svg>
  );
  return (
    <>
      <UnitHeader
        w={w}
        tag="U2"
        seed={21}
        label={<span>CONSENT CHECK</span>}
        right={
          verified ? (
            <span style={{ color: C.mint }}>✓ VERIFIED</span>
          ) : (
            <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, background: C.coral, opacity: blink }} />
              REQUIRED
            </span>
          )
        }
      />
      <Screw x={22} y={U2R.h - 22} seed={23} />
      <Screw x={w - 22} y={U2R.h - 22} seed={24} />
      {conn(C1.a, C1.b, sig1)}
      {conn(C2.a, C2.b, sig2)}
      {/* 本人 */}
      <svg width={w} height={U2R.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {env > 0.02 && (
          <>
            <circle cx={AV.cx} cy={ROW_Y} r={AV.r + 5 + 14 * env} fill="none" stroke={C.mint} strokeWidth={2} opacity={0.6 * env} />
            <circle cx={AV.cx} cy={ROW_Y} r={AV.r + 4 + 8 * env} fill={`rgba(59,227,180,${0.14 * env})`} />
          </>
        )}
        <circle cx={AV.cx} cy={ROW_Y} r={AV.r} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", left: AV.cx - 22, top: ROW_Y - 22 }}>
        <IconUser size={44} color={C.text} sw={1.7} />
      </div>
      <div style={{ position: "absolute", left: AV.cx + AV.r + 22, top: ROW_Y - 34 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: C.text, lineHeight: 1.1 }}>本人</div>
        <div style={mono(16, C.dim, { marginTop: 6 })}>SPEAKER</div>
      </div>
      {/* スイッチ */}
      <div style={{ position: "absolute", left: TG.x, top: ROW_Y - TG.h / 2 }}>
        <Toggle on={onP} check={chk} w={TG.w} h={TG.h} />
      </div>
      <div style={{ position: "absolute", left: LB, top: ROW_Y - 38 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.text, lineHeight: 1.1, letterSpacing: "0.02em" }}>
          本人の<span style={{ color: mixHex(C.text, C.mint, onP) }}>同意</span>を確認
        </div>
        <div style={mono(16, onP > 0.5 ? C.mint : C.dim, { marginTop: 6 })}>{onP > 0.5 ? "CONSENT · ON" : "CONSENT · OFF"}</div>
      </div>
      {/* 声の再現（鍵） */}
      <svg width={w} height={U2R.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <circle
          cx={LK.cx}
          cy={ROW_Y}
          r={LK.r}
          fill={open > 0 ? `rgba(59,227,180,${0.14 * open})` : C.panelHi}
          stroke={mixHex(C.borderHi, C.mint, open)}
          strokeWidth={1.5}
        />
      </svg>
      <div style={{ position: "absolute", left: LK.cx - 21, top: ROW_Y - 23 }}>
        <IconLock size={42} color={mixHex(C.sub, C.mint, open)} sw={1.8} open={open} />
      </div>
      <div style={{ position: "absolute", left: LK.cx + LK.r + 22, top: ROW_Y - 34 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: mixHex(C.sub, C.text, open), lineHeight: 1.1 }}>声の再現</div>
        <div style={mono(16, open > 0.5 ? C.mint : C.dim, { marginTop: 6 })}>{open > 0.5 ? "VOICE CLONE · UNLOCKED" : "VOICE CLONE · LOCKED"}</div>
      </div>
    </>
  );
};

// ───────── 縮んだあとの札 ─────────
const ChipBody: React.FC<{ icon: React.ReactNode; title: string; sub: string; check: number }> = ({ icon, title, sub, check }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 26px 0 18px", gap: 16 }}>
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        background: C.mintSoft,
        border: `1.5px solid ${C.mint}66`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: C.text, lineHeight: 1.15, whiteSpace: "nowrap" }}>{title}</div>
      <div style={mono(15, C.mint, { letterSpacing: "0.16em" })}>{sub}</div>
    </div>
    <div style={{ flex: 1 }} />
    <CheckDraw size={30} color={C.mint} sw={3} p={check} />
  </div>
);

// ───────── 評価ボード ─────────
const SegBar: React.FC<{ len: number; p: number; h: number; color: string; hot?: boolean }> = ({ len, p, h, color, hot }) => {
  const step = BB.seg + BB.gap;
  const n = Math.floor((len + BB.gap) / step);
  const shown = len * clamp01(p);
  const els: React.ReactNode[] = [];
  let lastLit = -1;
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const wv = clamp01((shown - x) / BB.seg) * BB.seg;
    if (wv <= 0.2) break;
    lastLit = i;
    els.push(<rect key={i} x={x} y={0} width={wv} height={h} rx={2.5} fill={color} />);
  }
  const filling = p > 0 && p < 1;
  return (
    <svg width={len} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {els}
      {hot && filling && lastLit >= 0 && (
        <rect x={lastLit * step} y={0} width={BB.seg} height={h} rx={2.5} fill="#FFD7C8" />
      )}
    </svg>
  );
};

const BenchBody: React.FC<{ t: number }> = ({ t }) => {
  const w = BENCH.w;
  const hdr = prog(t, TM.benchIn + 0.15, TM.benchIn + 0.5);
  const nameIn = prog(t, TM.benchIn + 0.25, TM.benchIn + 0.65, ease.outQuint);
  const ghostIn = prog(t, TM.benchIn + 0.35, TM.benchIn + 0.75, ease.outQuint);
  const gp = BB.ghost.map((_, i) => prog(t, TM.ghostA + i * 0.1, TM.ghostA + i * 0.1 + 0.85, ease.outQuint));
  const fp = prog(t, TM.fillA, TM.fillB, ease.out);
  const value = 71.4 * fp;
  const tipX = BB.x0 + BB.len * fp;
  const overall = prog(t, TM.overall, TM.overall + 0.2);
  const st = springAt(t, TM.badge, { damping: 11, stiffness: 220, mass: 0.7 });
  const stO = prog(t, TM.badge, TM.badge + 0.06);
  const ring = prog(t, TM.badge + 0.04, TM.badge + 0.65, ease.out);
  const win = prog(t, TM.badge, TM.badge + 0.4);
  const shimmer = prog(t, TM.badge + 0.3, TM.badge + 1.0, ease.inOut);
  const barTop = BB.heroY - BB.barH / 2;
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.2);
  return (
    <>
      {/* 見出し行 */}
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 56, borderBottom: `1px solid ${C.border}`, opacity: hdr }}>
        <div style={{ position: "absolute", left: 32, top: 0, height: 56, display: "flex", alignItems: "center", gap: 14, ...mono(18, C.sub) }}>
          <IconTrophy size={24} color={C.coral} sw={1.9} />
          <span style={{ color: C.text }}>HUME AI</span>
          <span style={{ color: C.dim }}>·</span>
          VOICE DESIGN BENCHMARK
        </div>
        <div style={{ position: "absolute", right: 32, top: 0, height: 56, display: "flex", alignItems: "center", gap: 10, ...mono(17, mixHex(C.dim, C.coral, overall)) }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: overall > 0.5 ? C.coral : "#2A303B",
              opacity: overall > 0.5 ? blink : 1,
              boxShadow: overall > 0.5 ? `0 0 8px ${C.coral}` : undefined,
            }}
          />
          OVERALL · 総合
        </div>
      </div>
      {/* 1 位の行のハイライト */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: BB.heroY - 82,
          width: w - 32,
          height: 164,
          borderRadius: 14,
          background: C.coralSoft,
          opacity: 0.7 * win,
        }}
      />
      {/* 主役の行 */}
      <div style={{ position: "absolute", left: 30, top: BB.heroY - 52, width: 5, height: 104, borderRadius: 3, background: C.coral, opacity: nameIn }} />
      <div style={{ position: "absolute", left: 60, top: BB.heroY - 56, opacity: nameIn, transform: `translateX(${(1 - nameIn) * -16}px)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 52, color: C.text, lineHeight: 1.05, whiteSpace: "nowrap" }}>Gemini 3.8</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: C.sub, lineHeight: 1.2, whiteSpace: "nowrap", marginTop: 4 }}>Flash TTS</div>
      </div>
      <div style={{ position: "absolute", left: BB.x0, top: barTop, width: BB.len, height: BB.barH, filter: `drop-shadow(0 0 ${10 + 14 * win}px ${C.coral}66)` }}>
        <SegBar len={BB.len} p={fp} h={BB.barH} color={C.coral} hot />
        {/* 光がひと筋走る */}
        {shimmer > 0 && shimmer < 1 && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 3 }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: mix(-160, BB.len + 40, shimmer),
                width: 120,
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,240,230,0.55) 50%, rgba(255,255,255,0) 100%)",
                transform: "skewX(-18deg)",
              }}
            />
          </div>
        )}
      </div>
      {fp > 0 && (
        <div
          style={{
            position: "absolute",
            left: tipX + 30,
            top: BB.heroY - 56,
            height: 112,
            display: "flex",
            alignItems: "center",
            fontFamily: DISPLAY,
            fontSize: 100,
            lineHeight: 1,
            color: mixHex(C.text, C.coral, prog(t, TM.fillB - 0.08, TM.fillB + 0.12)),
            whiteSpace: "nowrap",
            opacity: prog(t, TM.fillA, TM.fillA + 0.15),
          }}
        >
          {value.toFixed(1)}
          <div style={{ position: "absolute", left: 4, top: -12, ...mono(16, C.dim, { letterSpacing: "0.22em" }) }}>SCORE</div>
        </div>
      )}
      {/* 区切り */}
      <svg width={w} height={4} style={{ position: "absolute", left: 0, top: 284, opacity: ghostIn }}>
        <line x1={32} y1={2} x2={w - 32} y2={2} stroke={C.border} strokeWidth={1.5} strokeDasharray="4 8" />
      </svg>
      {/* 他モデル（名前・数値なし） */}
      <div style={{ position: "absolute", left: 60, top: BB.ghostY[1] - 36, opacity: ghostIn }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: C.sub, lineHeight: 1.1 }}>他モデル</div>
        <div style={mono(16, C.dim, { marginTop: 8 })}>OTHER MODELS</div>
      </div>
      <svg width={w} height={BENCH.h} style={{ position: "absolute", left: 0, top: 0, opacity: ghostIn }}>
        <line x1={BB.x0 - 44} y1={BB.ghostY[0]} x2={BB.x0 - 44} y2={BB.ghostY[2]} stroke={C.border} strokeWidth={1.5} />
        {BB.ghostY.map((y) => (
          <line key={y} x1={BB.x0 - 44} y1={y} x2={BB.x0 - 22} y2={y} stroke={C.border} strokeWidth={1.5} />
        ))}
      </svg>
      {BB.ghostY.map((y, i) => (
        <div key={i} style={{ position: "absolute", left: BB.x0, top: y - BB.ghostH / 2, width: BB.len, height: BB.ghostH, opacity: ghostIn }}>
          <SegBar len={BB.len * BB.ghost[i]} p={gp[i]} h={BB.ghostH} color="rgba(139,147,161,0.22)" />
        </div>
      ))}
      {/* #1 総合 */}
      {stO > 0 && (
        <div
          style={{
            position: "absolute",
            left: BB.badge.cx - BB.badge.r,
            top: BB.heroY - BB.badge.r,
            width: BB.badge.r * 2,
            height: BB.badge.r * 2,
            opacity: stO,
            transform: `rotate(${-8 - (1 - st) * 12}deg) scale(${1 + (1 - st) * 0.8})`,
          }}
        >
          <Rosette r={BB.badge.r} ring={ring} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: C.ink,
            }}
          >
            <div style={{ fontFamily: DISPLAY, fontSize: 66, lineHeight: 1, letterSpacing: "-0.02em" }}>#1</div>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, lineHeight: 1.1, marginTop: 4, letterSpacing: "0.12em" }}>総合</div>
          </div>
        </div>
      )}
    </>
  );
};

// ───────── 本体 ─────────
export const T5Trust: React.FC = () => {
  const t = useTime();

  // U1: せり上がり → t5-3 で上へ詰める → t5-4 で札へ縮む
  const u1In = prog(t, TM.u1In, TM.u1In + 0.5, ease.outQuint);
  const lift = prog(t, TM.u2In - 0.08, TM.u2In + 0.42, ease.inOut);
  const comp1 = prog(t, TM.compA, TM.compB, ease.inOut);
  const comp2 = prog(t, TM.compA + 0.12, TM.compB + 0.12, ease.inOut);
  const u1Base = mixRect(U1_MID, U1_TOP, lift);
  const u1Rect = mixRect({ ...u1Base, y: u1Base.y + (1 - u1In) * 50 }, CH1, comp1);
  const u2In = prog(t, TM.u2In, TM.u2In + 0.5, ease.outQuint);
  const u2Rect = mixRect({ ...U2R, y: U2R.y + (1 - u2In) * 50 }, CH2, comp2);
  // t5-3 の間は一歩下がり、縮みはじめで明るさを戻す（空の箱に見えないように）
  const dim1 = mix(mix(1, 0.5, prog(t, TM.u2In, TM.u2In + 0.4)), 1, prog(t, TM.compA - 0.12, TM.compA + 0.12));
  const c1Out = prog(comp1, 0.25, 0.6);
  const c2Out = prog(comp2, 0.25, 0.6);
  const chipIn1 = prog(comp1, 0.58, 0.95);
  const chipIn2 = prog(comp2, 0.58, 0.95);
  const benchIn = prog(t, TM.benchIn, TM.benchIn + 0.55, ease.outQuint);

  const content = (r: Rect, base: Rect, out: number, opacity: number, children: React.ReactNode) =>
    out < 1 && (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: base.w,
          height: base.h,
          transformOrigin: "0 0",
          transform: `scale(${r.w / base.w})`,
          opacity: (1 - out) * opacity,
        }}
      >
        {children}
      </div>
    );

  return (
    <SceneShell id="t5">
      <Headline t={t} />
      <Lamps t={t} />

      {/* 評価ボード（U1/U2 が札へ縮むのと入れ替わりにせり上がる） */}
      {benchIn > 0 && (
        <div style={{ opacity: benchIn, transform: `translateY(${(1 - benchIn) * 60}px)` }}>
          <RackFrame r={BENCH} border={C.border}>
            <BenchBody t={t} />
          </RackFrame>
        </div>
      )}

      {u1In > 0 && (
        <RackFrame
          r={u1Rect}
          radius={mix(18, 16, comp1)}
          border={comp1 > 0.5 ? "rgba(59,227,180,0.4)" : C.border}
          opacity={u1In}
        >
          {content(u1Rect, U1_MID, c1Out, dim1, <Unit1Body t={t} />)}
          {chipIn1 > 0 && (
            <div style={{ opacity: chipIn1 }}>
              <ChipBody
                icon={<IconShieldCheck size={28} color={C.mint} sw={1.9} />}
                title="SynthID 透かし"
                sub="WATERMARKED"
                check={prog(t, TM.compB, TM.compB + 0.35)}
              />
            </div>
          )}
        </RackFrame>
      )}

      {u2In > 0 && (
        <RackFrame r={u2Rect} radius={mix(18, 16, comp2)} border={comp2 > 0.5 ? "rgba(59,227,180,0.4)" : C.border} opacity={u2In}>
          {content(u2Rect, U2R, c2Out, 1, <Unit2Body t={t} />)}
          {chipIn2 > 0 && (
            <div style={{ opacity: chipIn2 }}>
              <ChipBody
                icon={<IconUser size={26} color={C.mint} sw={1.9} />}
                title="本人の同意確認"
                sub="CONSENT VERIFIED"
                check={prog(t, TM.compB + 0.14, TM.compB + 0.49)}
              />
            </div>
          )}
        </RackFrame>
      )}

      {/* 効果音 */}
      <Sfx at={TM.safety} name="click" volume={0.2} />
      <Sfx at={TM.quality} name="click" volume={0.2} />
      <Sfx at={TM.stamp} name="pop" volume={0.24} />
      <Sfx at={TM.flip} name="click" volume={0.22} />
      <Sfx at={TM.unlock} name="tick" volume={0.18} />
      <Sfx at={TM.compA} name="whoosh" volume={0.12} />
      <Sfx at={TM.fillB} name="tick" volume={0.14} />
      <Sfx at={TM.badge} name="chime" volume={0.26} />
    </SceneShell>
  );
};
