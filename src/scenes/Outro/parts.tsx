// OUTRO 専用の小物: ON AIR 表示灯、読み上げ→演技に変わるスコープ、チップ、ログの行、フローのノード
import React from "react";
import { C, DISPLAY, FONT, MONO } from "../../theme";
import { clamp01, rand, useTime } from "../../time";
import { useVoiceLevel } from "../../components/VoiceBars";

/* ---------------- 色の補助 ---------------- */
const parse = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = c.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

export const mixColor = (a: string, b: string, p: number) => {
  const q = clamp01(p);
  const A = parse(a);
  const B = parse(b);
  const ch = (i: number) => Math.round(A[i] + (B[i] - A[i]) * q);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
};

export const withAlpha = (c: string, a: number) => {
  const [r, g, b] = parse(c);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`;
};

export const mono = (
  size: number,
  color: string = C.sub,
  weight = 700,
  ls = "0.16em",
): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: ls,
  color,
  whiteSpace: "nowrap",
});

/* ---------------- 点灯のちらつき ---------------- */
// 蛍光管のように「つく → 一瞬消える → つく → 少し暗い → 安定」。t0 からの経過で 0〜1
const FLICK: [number, number][] = [
  [0.0, 0],
  [0.02, 0.95],
  [0.06, 0.12],
  [0.1, 0.85],
  [0.15, 0.25],
  [0.2, 1],
  [0.27, 0.6],
  [0.32, 1],
];
export const flicker = (t: number, t0: number) => {
  const s = t - t0;
  if (s <= 0) return 0;
  if (s >= FLICK[FLICK.length - 1][0]) return 1;
  for (let i = 1; i < FLICK.length; i++) {
    const [ta, va] = FLICK[i - 1];
    const [tb, vb] = FLICK[i];
    if (s <= tb)
      return va + (vb - va) * clamp01((s - ta) / Math.max(1e-6, tb - ta));
  }
  return 1;
};

/* ---------------- ON AIR 表示灯 ---------------- */
// 暗いハウジングに赤いガラス。lit=0 で消灯（ガラスの奥にうっすら文字）、1 で点灯
const GLASS_OFF = "#2A1716";
const TEXT_OFF = "#4E2A27";
const TEXT_ON = "#FFF3EE";

export const OnAirLamp: React.FC<{
  lit: number;
  w: number;
  h: number;
  style?: React.CSSProperties;
}> = ({ lit, w, h, style }) => {
  const inset = 9;
  const screw = (x: number, y: number) => (
    <div
      style={{
        position: "absolute",
        left: x - 3,
        top: y - 3,
        width: 6,
        height: 6,
        borderRadius: 3,
        background: C.borderHi,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    />
  );
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 16,
        boxSizing: "border-box",
        background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
        border: `1.5px solid ${C.borderHi}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px rgba(0,0,0,0.5), 0 0 ${70 * lit}px ${withAlpha(
          C.red,
          0.45 * lit,
        )}, 0 0 ${160 * lit}px ${withAlpha(C.red, 0.18 * lit)}`,
        ...style,
      }}
    >
      {screw(inset / 2 + 1, h / 2 - 0.75)}
      {screw(w - inset / 2 - 2.5, h / 2 - 0.75)}
      {/* ガラス（消灯） */}
      <div
        style={{
          position: "absolute",
          left: inset + 4,
          right: inset + 4,
          top: inset,
          bottom: inset,
          borderRadius: 9,
          background: `linear-gradient(180deg, ${GLASS_OFF} 0%, #1C1212 100%)`,
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* ガラス（点灯） */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: lit,
            background: `radial-gradient(ellipse 80% 110% at 50% 50%, #FF6A55 0%, ${C.red} 55%, #C9221A 100%)`,
          }}
        />
        {/* 拡散板の縦じま */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 7px)",
          }}
        />
        {/* 上側のつや */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "45%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontSize: h * 0.44,
            letterSpacing: "0.14em",
            paddingLeft: "0.14em",
            color: mixColor(TEXT_OFF, TEXT_ON, lit),
            textShadow:
              lit > 0.05
                ? `0 0 ${14 * lit}px rgba(255,255,255,${0.55 * lit}), 0 0 ${30 * lit}px rgba(255,200,180,${0.4 * lit})`
                : "none",
          }}
        >
          ON AIR
        </div>
      </div>
    </div>
  );
};

/* ---------------- 読み上げ → 演技 のスコープ ---------------- */
/**
 * expr=0: 抑揚のない一定の波（棒読み）。expr=1: 実際の声の帯域から合成した表情のある波。
 * amount でふり幅、0 で完全に平ら。
 */
export const MorphScope: React.FC<{
  width: number;
  height: number;
  expr: number;
  amount?: number;
  lines?: string[];
  colorA?: string;
  colorB?: string;
  thickness?: number;
  glow?: number;
  /** 表情のある波だけにかける倍率 */
  exGain?: number;
}> = ({
  width,
  height,
  expr,
  amount = 1,
  lines,
  colorA = C.dim,
  colorB = C.mint,
  thickness = 3,
  glow = 1,
  exGain = 1,
}) => {
  const t = useTime();
  const lv = useVoiceLevel(lines);
  const N = 180;
  const gate = lv ? clamp01((lv.rms - 0.03) * 6) : 0;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const edge = Math.sin(Math.PI * u) ** 0.8;
    // 棒読み: 一定周期・一定振幅の角ばった波（声が出ている間だけ）
    const s = Math.sin(2 * Math.PI * 11 * u - t * 9);
    const mech =
      Math.sign(s) * Math.abs(s) ** 0.45 * 0.3 * (0.18 + 0.82 * gate);
    // 演技: 帯域ごとに周波数と位相の違う正弦波を重ねる
    let ex = 0;
    if (lv) {
      lv.bands.forEach((b, k) => {
        const f = 1.5 + k * 1.35;
        const ph = t * (4 + k * 2.3) + rand(k * 3.1) * 6.28;
        ex += (b * Math.sin(2 * Math.PI * f * u + ph)) / (1 + k * 0.18);
      });
      ex *= (0.45 + lv.rms) * 0.48 * exGain;
    }
    ex += 0.01 * Math.sin(u * 80 + t * 14) * (1 - gate);
    let y = mech * (1 - expr) + ex * expr;
    y = Math.max(-1, Math.min(1, y * amount)) * edge;
    pts.push(
      `${(u * width).toFixed(1)},${(height / 2 - y * (height / 2)).toFixed(1)}`,
    );
  }
  const color = mixColor(colorA, colorB, expr);
  return (
    <svg
      width={width}
      height={height}
      style={{ overflow: "visible", display: "block" }}
    >
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={
          glow > 0
            ? {
                filter: `drop-shadow(0 0 ${6 * glow}px ${withAlpha(colorB, 0.9 * expr)})`,
              }
            : undefined
        }
      />
    </svg>
  );
};

/* ---------------- 提供先のチップ ---------------- */
export const Chip: React.FC<{
  label: string;
  ready: number;
  style?: React.CSSProperties;
}> = ({ label, ready, style }) => (
  <div
    style={{
      height: 70,
      padding: "0 34px 0 28px",
      display: "flex",
      alignItems: "center",
      gap: 18,
      borderRadius: 16,
      boxSizing: "border-box",
      background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
      border: `1.5px solid ${mixColor(C.borderHi, "#2F8F76", ready)}`,
      boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, 0 14px 34px rgba(0,0,0,0.45), 0 0 ${28 * ready}px ${withAlpha(
        C.mint,
        0.22 * ready,
      )}`,
      ...style,
    }}
  >
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        background: mixColor(C.dim, C.mint, ready),
        boxShadow: ready > 0.05 ? `0 0 ${12 * ready}px ${C.mint}` : "none",
      }}
    />
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 34,
        color: C.text,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </div>
  </div>
);

/* ---------------- 打ち込み表示 ---------------- */
/** text を p(0〜1) の割合だけ表示。打っている間は右にカーソル（左揃えで使う） */
export const Typed: React.FC<{
  text: string;
  p: number;
  caret?: string;
  style?: React.CSSProperties;
}> = ({ text, p, caret = C.coral, style }) => {
  const n = Math.round(clamp01(p) * text.length);
  const typing = p > 0 && p < 1;
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {typing && (
        <span
          style={{
            display: "inline-block",
            width: "0.55em",
            height: "0.95em",
            marginLeft: "0.06em",
            transform: "translateY(0.14em)",
            background: caret,
          }}
        />
      )}
    </span>
  );
};

/* ---------------- フローのノード ---------------- */
export const FlowNode: React.FC<{
  label: string;
  on: number;
  final?: boolean;
}> = ({ label, on, final }) => {
  const fill = final ? on : 0;
  return (
    <div
      style={{
        height: 40,
        padding: "0 16px 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 10,
        boxSizing: "border-box",
        border: `1.5px solid ${final ? mixColor(C.border, C.coral, on) : mixColor(C.border, C.borderHi, on)}`,
        background: final
          ? withAlpha(C.coral, fill)
          : withAlpha("#1C212B", 0.6 + 0.4 * on),
        boxShadow:
          final && on > 0
            ? `0 0 ${24 * on}px ${withAlpha(C.coral, 0.45 * on)}`
            : "none",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          background: final
            ? mixColor(C.dim, C.ink, on)
            : mixColor(C.dim, C.mint, on),
          boxShadow:
            !final && on > 0.05 ? `0 0 ${10 * on}px ${C.mint}` : "none",
        }}
      />
      <div
        style={mono(
          17,
          final ? mixColor(C.dim, C.ink, on) : mixColor(C.dim, C.text, on),
          700,
          "0.16em",
        )}
      >
        {label}
      </div>
    </div>
  );
};

/** ノードの間の線。p で左から伸び、先頭に小さな矢じり */
export const FlowWire: React.FC<{ p: number; width: number }> = ({
  p,
  width,
}) => (
  <svg
    width={width}
    height={14}
    style={{ overflow: "visible", display: "block", flexShrink: 0 }}
  >
    <line
      x1={6}
      y1={7}
      x2={width - 6}
      y2={7}
      stroke={C.border}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <line
      x1={6}
      y1={7}
      x2={6 + (width - 12) * clamp01(p)}
      y2={7}
      stroke={C.mint}
      strokeWidth={2}
      strokeLinecap="round"
      style={{ filter: p > 0 ? `drop-shadow(0 0 4px ${C.mint})` : undefined }}
    />
    <path
      d={`M${width - 12} 2 L${width - 5} 7 L${width - 12} 12`}
      fill="none"
      stroke={mixColor(C.border, C.mint, p >= 1 ? 1 : 0)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
