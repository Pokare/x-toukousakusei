// TRACK 03 専用の小物: 話者アバター、フェーダー、パッチケーブル、鍵アイコン、クリップの波形
import React from "react";
import { C, DISPLAY, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { rand } from "../../time";

/** 行 id の声の「なめらかな包絡線」（直近 0.3 秒の最大値を減衰させながら保持）0〜1 */
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

// ───────── パッチケーブル（3 次ベジェの S 字） ─────────
export type Pt = { x: number; y: number };
export const cable = (a: Pt, b: Pt) => {
  const mx = (a.x + b.x) / 2;
  const c1 = { x: mx, y: a.y };
  const c2 = { x: mx, y: b.y };
  const d = `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
  const pt = (u: number): Pt => {
    const v = 1 - u;
    return {
      x: v * v * v * a.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * b.x,
      y: v * v * v * a.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * b.y,
    };
  };
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 48; i++) {
    const p = pt(i / 48);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return { d, pt, len };
};

// ───────── 話者アバター（丸に A / B） ─────────
export const Avatar: React.FC<{
  x: number;
  y: number;
  r: number;
  letter: string;
  color: string;
  /** 声の包絡線 0〜1（外側の輪が広がる） */
  env?: number;
  /** 0〜1: 塗りの強さ（話している間 1） */
  lit?: number;
  scale?: number;
  opacity?: number;
}> = ({ x, y, r, letter, color, env = 0, lit = 0, scale = 1, opacity = 1 }) => {
  if (opacity <= 0.001 || scale <= 0.001) return null;
  const R = r + 30;
  const soft = color === C.coral ? "255,106,61" : "59,227,180";
  return (
    <div
      style={{
        position: "absolute",
        left: x - R,
        top: y - R,
        width: R * 2,
        height: R * 2,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <svg width={R * 2} height={R * 2} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {env > 0.02 && (
          <>
            <circle cx={R} cy={R} r={r + 5 + 13 * env} fill="none" stroke={color} strokeWidth={2} opacity={0.55 * env} />
            <circle cx={R} cy={R} r={r + 4 + 9 * env} fill={`rgba(${soft},${0.14 * env})`} />
          </>
        )}
        <circle
          cx={R}
          cy={R}
          r={r}
          fill={`rgba(${soft},${0.14 + 0.86 * lit})`}
          stroke={color}
          strokeWidth={2.5}
          style={lit > 0.3 ? { filter: `drop-shadow(0 0 ${10 * lit}px ${color})` } : undefined}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontSize: r * 1.05,
          lineHeight: 1,
          paddingBottom: r * 0.06,
          color: lit > 0.5 ? C.ink : color,
        }}
      >
        {letter}
      </div>
    </div>
  );
};

// ───────── 縦フェーダー（目盛り・つまみ・値の読み） ─────────
// v: 0〜1（0.8 が 0 dB）
export const FADER_MARKS: { v: number; label: string }[] = [
  { v: 0.8, label: "0" },
  { v: 0.6, label: "−10" },
  { v: 0.4, label: "−20" },
  { v: 0.2, label: "−40" },
  { v: 0.02, label: "−∞" },
];

export const Fader: React.FC<{ h: number; v: number; color: string; lit: number }> = ({ h, v, color, lit }) => {
  const W = 120;
  const cx = 78;
  const capW = 60;
  const capH = 28;
  const y = (vv: number) => h - vv * h;
  return (
    <div style={{ position: "relative", width: W, height: h }}>
      {/* 目盛り（左に数字） */}
      {FADER_MARKS.map((m) => (
        <React.Fragment key={m.label}>
          {[-1, 1].map((sg) => (
            <div
              key={sg}
              style={{
                position: "absolute",
                left: sg < 0 ? cx - 24 : cx + 9,
                top: y(m.v) - 1,
                width: 15,
                height: 2,
                background: m.v === 0.8 ? C.borderHi : C.border,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              right: W - cx + 38,
              top: y(m.v) - 9,
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 14,
              lineHeight: "18px",
              color: m.v === 0.8 ? C.sub : C.dim,
              whiteSpace: "nowrap",
            }}
          >
            {m.label}
          </div>
        </React.Fragment>
      ))}
      {/* 溝 */}
      <div
        style={{
          position: "absolute",
          left: cx - 4,
          top: 0,
          width: 8,
          height: h,
          borderRadius: 4,
          background: "#07090C",
          boxShadow: `inset 0 0 0 1px ${C.border}`,
        }}
      />
      {/* 溝の中の点灯（つまみの下） */}
      <div
        style={{
          position: "absolute",
          left: cx - 2,
          top: y(v),
          width: 4,
          height: Math.max(0, h - y(v)),
          borderRadius: 2,
          background: color,
          opacity: 0.25 + 0.55 * lit,
        }}
      />
      {/* つまみ */}
      <div
        style={{
          position: "absolute",
          left: cx - capW / 2,
          top: y(v) - capH / 2,
          width: capW,
          height: capH,
          borderRadius: 6,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #343B48 0%, #1B2029 55%, #242A35 100%)",
          border: `1.5px solid ${C.borderHi}`,
          boxShadow: "0 6px 14px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            top: capH / 2 - 2.5,
            height: 3,
            borderRadius: 2,
            background: lit > 0.05 ? color : C.sub,
            boxShadow: lit > 0.05 ? `0 0 ${8 * lit}px ${color}` : undefined,
          }}
        />
      </div>
    </div>
  );
};

// ───────── 鍵アイコン（Icons.tsx にないので自前） ─────────
export const IconLock: React.FC<{ size?: number; color?: string; sw?: number }> = ({ size = 28, color = C.coral, sw = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.6v2.4" />
  </svg>
);

// ───────── クリップの波形（30 秒サンプルの形。決定的な擬似データ） ─────────
export const CLIP_N = 58;
export const CLIP_SHAPE: number[] = Array.from({ length: CLIP_N }, (_, i) => {
  // 語のかたまり × 細かいゆらぎ。ところどころ息継ぎの小さな谷
  const word = 0.42 + 0.58 * Math.abs(Math.sin(i * 0.33 + 0.7)) ** 0.8;
  const grain = 0.38 + 0.62 * rand(i * 7.31 + 2.2);
  const breath = i % 14 === 13 || i % 23 === 22 ? 0.18 : 1;
  return Math.max(0.1, Math.min(1, word * grain * breath * 1.08));
});

/**
 * クリップの中の棒波形。
 * fill: 左から塗られている割合 / ghost: 塗られていない棒を点線の輪郭で見せる強さ / glow: 塗った棒の光
 */
export const ClipWave: React.FC<{
  width: number;
  height: number;
  color: string;
  fill: number;
  ghost?: number;
}> = ({ width, height, color, fill, ghost = 0 }) => {
  const step = width / CLIP_N;
  const bw = Math.max(3, step * 0.52);
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {CLIP_SHAPE.map((v, i) => {
        const x = i * step + (step - bw) / 2;
        const h = Math.max(bw, v * height);
        const on = (i + 0.5) / CLIP_N <= fill;
        if (on) {
          return <rect key={i} x={x} y={(height - h) / 2} width={bw} height={h} rx={bw / 2} fill={color} />;
        }
        if (ghost > 0) {
          return (
            <rect
              key={i}
              x={x + 0.75}
              y={(height - h) / 2 + 0.75}
              width={bw - 1.5}
              height={h - 1.5}
              rx={bw / 2}
              fill="none"
              stroke={C.sub}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={ghost * 0.7}
            />
          );
        }
        return <rect key={i} x={x} y={height / 2 - bw / 2} width={bw} height={bw} rx={bw / 2} fill={C.dim} />;
      })}
    </svg>
  );
};
