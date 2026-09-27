// TRACK 01 専用の小物: ON AIR 表示、針式 VU メーター、声の包絡線
import React from "react";
import { C, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";

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

/**
 * スタジオの「ON AIR」表示灯。lit: 0〜1 を連続的に受ける
 * （消灯した面の上に、点灯した面を lit の不透明度で重ねるので、色が 1 フレームで切り替わらない）。
 */
export const OnAirSign: React.FC<{ lit: number; x: number; y: number; w: number; h: number; opacity?: number }> = ({
  lit,
  x,
  y,
  w,
  h,
  opacity = 1,
}) => {
  const face = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    borderRadius: 12,
    boxSizing: "border-box",
    border: `2px solid ${on ? C.coral : C.borderHi}`,
    background: on ? C.coral : C.panel,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  });
  const label = (on: boolean) => (
    <>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: on ? C.ink : C.dim, opacity: on ? 0.85 : 0.6 }} />
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: "0.2em", color: on ? C.ink : C.dim, marginRight: -6 }}>
        ON AIR
      </div>
    </>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity }}>
      <div style={{ ...face(false), boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>{label(false)}</div>
      {lit > 0 && (
        <div
          style={{
            ...face(true),
            opacity: lit,
            boxShadow: `0 0 ${44 * lit}px ${C.coral}88, 0 0 0 6px ${C.coral}1F`,
          }}
        >
          {label(true)}
        </div>
      )}
    </div>
  );
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/**
 * 針式の VU メーター（アナログ）。needle: 0〜1（0 = 左に寝ている）/ light: 0〜1 の照明
 * 目盛りは線だけ（数値は出さない）。右端の赤ゾーンはコーラル。
 */
export const VuNeedle: React.FC<{ w: number; h: number; needle: number; light: number }> = ({ w, h, needle, light }) => {
  const cx = w / 2;
  const cy = h - 22; // 針の軸
  const R = Math.min(w * 0.46, h - 52);
  const A0 = -52;
  const A1 = 52;
  const RED = 0.74; // ここから右が赤ゾーン
  const ticks = Array.from({ length: 13 }, (_, i) => i / 12);
  const ang = A0 + (A1 - A0) * Math.min(1.04, Math.max(-0.02, needle));
  const [nx, ny] = polar(cx, cy, R + 8, ang);
  const [bx, by] = polar(cx, cy, 16, ang + 180);
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 12,
        overflow: "hidden",
        background: "#0B0D11",
        border: `1.5px solid ${C.border}`,
        boxSizing: "border-box",
      }}
    >
      {/* 照明（暖かい白 + ほんのりコーラル）。light で連続的に点く */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: light,
          background: `radial-gradient(120% 90% at 50% 100%, rgba(255,106,61,0.22) 0%, rgba(243,239,231,0.10) 45%, rgba(243,239,231,0.03) 100%)`,
        }}
      />
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* 目盛りの弧 */}
        <path d={arcPath(cx, cy, R, A0, A0 + (A1 - A0) * RED)} stroke={C.sub} strokeOpacity={0.35 + 0.45 * light} strokeWidth={2} fill="none" />
        <path d={arcPath(cx, cy, R, A0 + (A1 - A0) * RED, A1)} stroke={C.coral} strokeOpacity={0.45 + 0.55 * light} strokeWidth={5} fill="none" />
        {ticks.map((p, i) => {
          const a = A0 + (A1 - A0) * p;
          const major = i % 3 === 0;
          const [x0, y0] = polar(cx, cy, R + 4, a);
          const [x1, y1] = polar(cx, cy, R + (major ? 18 : 11), a);
          return (
            <line
              key={i}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={p >= RED ? C.coral : C.sub}
              strokeOpacity={0.45 + 0.5 * light}
              strokeWidth={major ? 2.5 : 1.5}
            />
          );
        })}
        <text
          x={18}
          y={h - 18}
          textAnchor="start"
          fontFamily={MONO}
          fontWeight={700}
          fontSize={22}
          letterSpacing="0.2em"
          fill={C.sub}
          fillOpacity={0.45 + 0.5 * light}
        >
          VU
        </text>
        {/* 針 */}
        <line x1={bx} y1={by} x2={nx} y2={ny} stroke={C.text} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={9} fill="#1C212B" stroke={C.borderHi} strokeWidth={1.5} />
      </svg>
    </div>
  );
};
