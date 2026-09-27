import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/** クリーム色の背景＋60px の薄い方眼。grid は方眼の濃さ(0〜1) */
export const Background: React.FC<{ grid: number }> = ({ grid }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <AbsoluteFill
      style={{
        opacity: grid,
        backgroundImage: `linear-gradient(to right, ${C.grid} 1px, transparent 1px), linear-gradient(to bottom, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        backgroundPosition: "0px 0px",
      }}
    />
  </AbsoluteFill>
);

/** イントロ/アウトロの同心円。中心 (cx, cy)、r0 から step 刻みで count 本 */
export const Rings: React.FC<{
  cx: number;
  cy: number;
  r0?: number;
  step?: number;
  count?: number;
  opacity?: number;
  scale?: number;
}> = ({ cx, cy, r0 = 120, step = 90, count = 7, opacity = 1, scale = 1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity }}>
    <defs>
      <radialGradient id="ringFade" cx={cx} cy={cy} r={r0 + step * count} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={C.ring} stopOpacity={1} />
        <stop offset="100%" stopColor={C.ring} stopOpacity={0.2} />
      </radialGradient>
    </defs>
    {Array.from({ length: count }, (_, i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={(r0 + step * i) * scale}
        fill="none"
        stroke="url(#ringFade)"
        strokeWidth={1.5}
      />
    ))}
  </svg>
);
