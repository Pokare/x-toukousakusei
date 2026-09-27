// S1 のカード左上アイコン（96px の丸の中に描く）。draw=0→1 で線が描かれていく。
// 元動画のアイコン（マイク / 3つの吹き出し / 5本の波形）を実測して描き直したもの。
import React from "react";
import { C } from "../../theme";
import { clamp01 } from "../../time";

type DrawProps = { draw: number; color?: string };

const Stroke: React.FC<{ d: string; p: number; color: string; sw?: number; fill?: string; fillOpacity?: number }> = ({
  d,
  p,
  color,
  sw = 2.5,
  fill = "none",
  fillOpacity = 1,
}) => (
  <path
    d={d}
    pathLength={1}
    fill={fill}
    fillOpacity={fillOpacity}
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray="1 1"
    strokeDashoffset={1 - p}
    opacity={p > 0.001 ? 1 : 0}
  />
);

/** マイク（中心 48,48） */
export const MicGlyph: React.FC<DrawProps> = ({ draw, color = C.blue }) => {
  const a = clamp01(draw / 0.55);
  const b = clamp01((draw - 0.35) / 0.4);
  const c = clamp01((draw - 0.7) / 0.3);
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" style={{ position: "absolute", inset: 0 }}>
      <Stroke d="M48 24.5a8 8 0 0 1 8 8v12.5a8 8 0 0 1-16 0v-12.5a8 8 0 0 1 8-8z" p={a} color={color} sw={2.4} />
      <Stroke d="M32 43.5a16 16 0 0 0 32 0" p={b} color={color} sw={2.4} />
      <Stroke d="M48 60v10.5M38.5 70.5h19" p={c} color={color} sw={2.4} />
    </svg>
  );
};

// 吹き出し: 角丸四角＋下辺の小さなしっぽ。tail = しっぽの x、dir = しっぽの向き(-1 左 / 1 右)
const bubble = (x0: number, y0: number, x1: number, y1: number, tail: number, dir: -1 | 1) => {
  const r = 4;
  const tw = 3.2;
  return [
    `M${x0 + r} ${y0}`,
    `H${x1 - r}`,
    `a${r} ${r} 0 0 1 ${r} ${r}`,
    `V${y1 - r}`,
    `a${r} ${r} 0 0 1 ${-r} ${r}`,
    dir === 1 ? `H${tail + tw}L${tail + 1.5} ${y1 + 6}L${tail - tw} ${y1}` : `H${tail + tw}L${tail - 1.5} ${y1 + 6}L${tail - tw} ${y1}`,
    `H${x0 + r}`,
    `a${r} ${r} 0 0 1 ${-r} ${-r}`,
    `V${y0 + r}`,
    `a${r} ${r} 0 0 1 ${r} ${-r}`,
    "Z",
  ].join("");
};

/** 3つの重なった吹き出し（中心 48,48） */
export const ChatsGlyph: React.FC<DrawProps> = ({ draw, color = C.blue }) => {
  const parts = [
    { d: bubble(23, 25.5, 53, 45.5, 29.5, -1), s: 0 },
    { d: bubble(42.5, 37, 73, 57, 66.5, 1), s: 0.22 },
    { d: bubble(28, 50, 58, 69, 35, -1), s: 0.44 },
  ];
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" style={{ position: "absolute", inset: 0 }}>
      {parts.map((pt, i) => {
        const p = clamp01((draw - pt.s) / 0.56);
        return <Stroke key={i} d={pt.d} p={p} color={color} sw={2.8} fill="#F1EFE6" fillOpacity={clamp01(p * 3)} />;
      })}
    </svg>
  );
};

/** 5本の縦線の波形（中心 48,48）。level(0〜1) で少し伸び縮みする */
export const WaveGlyph: React.FC<DrawProps & { level?: number[] }> = ({ draw, color = C.white, level }) => {
  const xs = [-18.75, -9.5, 0, 9.5, 18.75];
  const hs = [6.9, 14.4, 21.8, 14.4, 6.9];
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {xs.map((x, i) => {
        const p = clamp01((draw - i * 0.1) / 0.5);
        const lv = level ? level[i] ?? 0 : 0;
        const h = hs[i] * p * (1 + lv);
        if (p <= 0.001) return null;
        return (
          <line
            key={i}
            x1={48 + x}
            x2={48 + x}
            y1={48.5 - h}
            y2={48.5 + h}
            stroke={color}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};
