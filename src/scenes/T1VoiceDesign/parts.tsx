// TRACK 01 専用の小物: ノブ、ON AIR 表示、声の包絡線
import React from "react";
import { C, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};

const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 >= a0 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/**
 * スタジオ機材のロータリーノブ（-135°〜+135°）。
 * v: 0〜1 の現在値 / on: 0〜1 の点灯度（値の弧と目盛りが色づく）
 */
export const Knob: React.FC<{ v: number; size?: number; on?: number; color?: string }> = ({
  v,
  size = 84,
  on = 1,
  color = C.coral,
}) => {
  const c = size / 2;
  const rTrack = c - 5;
  const rBody = c - 15;
  const ang = -135 + 270 * v;
  const [px, py] = polar(c, c, rBody - 7, ang);
  const [qx, qy] = polar(c, c, rBody * 0.25, ang);
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* 弧のトラック */}
      <path d={arc(c, c, rTrack, -135, 135)} stroke={C.border} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* 中立点の目印 */}
      <circle cx={c} cy={c - rTrack - 7} r={2} fill={C.dim} />
      {/* 値の弧（中立 0.5 から現在値まで） */}
      {Math.abs(v - 0.5) > 0.004 && (
        <path
          d={v >= 0.5 ? arc(c, c, rTrack, 0, ang) : arc(c, c, rTrack, ang, 0)}
          stroke={color}
          strokeOpacity={on}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          style={{ filter: on > 0.5 ? `drop-shadow(0 0 4px ${color})` : undefined }}
        />
      )}
      {/* つまみ本体 */}
      <circle cx={c} cy={c} r={rBody} fill="url(#t1KnobBody)" stroke={C.borderHi} strokeWidth={1.5} />
      <defs>
        <radialGradient id="t1KnobBody" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2B313D" />
          <stop offset="100%" stopColor="#14181F" />
        </radialGradient>
      </defs>
      {/* 指示線 */}
      <line x1={qx} y1={qy} x2={px} y2={py} stroke={C.text} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
};

/** 行 id の声の「なめらかな包絡線」（直近 0.3 秒の最大値を減衰させながら保持） */
export const envAt = (id: string, t: number) => {
  const l = line(id);
  const lv = LEVELS.lines[id];
  if (!lv) return 0;
  const k = Math.floor((t - l.start) * FPS);
  let m = 0;
  for (let j = k - 9; j <= k; j++) {
    if (j < 0 || j >= lv.rms.length) continue;
    m = Math.max(m, lv.rms[j] * Math.exp(-(k - j) / 4));
  }
  return Math.min(1, m);
};

/** スタジオの「ON AIR」表示灯。lit: 0〜1 */
export const OnAirSign: React.FC<{ lit: number; x: number; y: number; w: number; h: number; opacity?: number }> = ({
  lit,
  x,
  y,
  w,
  h,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      opacity,
      borderRadius: 12,
      boxSizing: "border-box",
      border: `2px solid ${lit > 0.5 ? C.coral : C.borderHi}`,
      background: lit > 0.5 ? C.coral : C.panel,
      boxShadow: lit > 0.5 ? `0 0 ${44 * lit}px ${C.coral}88, 0 0 0 6px ${C.coral}1F` : "0 10px 30px rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    }}
  >
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        background: lit > 0.5 ? C.ink : C.dim,
        opacity: lit > 0.5 ? 0.85 : 0.6,
      }}
    />
    <div
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.2em",
        color: lit > 0.5 ? C.ink : C.dim,
        marginRight: -6,
      }}
    >
      ON AIR
    </div>
  </div>
);
