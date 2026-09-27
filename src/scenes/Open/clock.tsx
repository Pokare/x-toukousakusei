// 放送スタジオの壁掛け時計（秒を表す 60 個の LED の輪 + 中央のデジタル表示）。
// tRoll の瞬間に 23:59 → 00:00 へ日付が変わり、秒の輪がリセットされる。以後は実時間で 1 秒ごとに 1 灯ずつ増える。
import React from "react";
import { C, MONO } from "../../theme";
import { clamp01, ease, prog } from "../../time";
import { mixColor, withAlpha } from "./parts";

const ROLL = 0.32; // 切り替わりの長さ（秒）

export const StudioClock: React.FC<{ size: number; t: number; tRoll: number }> = ({ size, t, tRoll }) => {
  const s = t - tRoll;
  const after = s >= 0;
  // 点灯している秒（0〜59）
  const sec = after ? Math.floor(s) % 60 : 60 + Math.floor(s);
  const roll = prog(t, tRoll, tRoll + ROLL, ease.outQuint);
  const flash = after ? 1 - prog(t, tRoll, tRoll + 0.6, ease.out) : 0;

  const R = size / 2 - 7;
  const Rin = R - 17;
  const cx = size / 2;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const big = i % 5 === 0;
    let on = i <= sec ? 1 : 0;
    // 切り替わり直後: 前の分の 59 灯が時計回りに消えていく
    if (after && i > sec && s < ROLL) on = 1 - clamp01((s / ROLL) * 60 - i + 1);
    const col = mixColor("#262B34", C.coral, on);
    dots.push(
      <circle
        key={i}
        cx={cx + Math.cos(a) * R}
        cy={cx + Math.sin(a) * R}
        r={big ? 3.6 : 2.6}
        fill={col}
        style={on > 0.6 ? { filter: `drop-shadow(0 0 3px ${withAlpha(C.coral, 0.8)})` } : undefined}
      />,
    );
  }
  // 内側: 12 個の時の印（静かに点いている）
  const marks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
    return <circle key={k} cx={cx + Math.cos(a) * Rin} cy={cx + Math.sin(a) * Rin} r={2.4} fill={withAlpha(C.text, k === 0 ? 0.7 : 0.28)} />;
  });

  const fs = Math.round(size * 0.165);
  const digit = (txt: string, dy: number, op: number, color: string) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: size,
        top: dy,
        textAlign: "center",
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: fs,
        lineHeight: `${fs * 1.24}px`,
        letterSpacing: "0.02em",
        color,
        opacity: op,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {txt}
    </div>
  );

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size / 2,
          background: `radial-gradient(circle at 50% 40%, ${C.panelHi} 0%, ${C.panel} 72%)`,
          border: `1.5px solid ${C.borderHi}`,
          boxSizing: "border-box",
          boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 ${40 * flash}px ${withAlpha(C.coral, 0.45 * flash)}`,
        }}
      />
      <svg width={size} height={size} style={{ position: "absolute", left: 0, top: 0 }}>
        {dots}
        {marks}
      </svg>
      <div style={{ position: "absolute", left: 0, top: size / 2 - fs * 0.62, width: size, height: fs * 1.24, overflow: "hidden" }}>
        {!after || roll < 1 ? digit("23:59", after ? -roll * fs * 0.9 : 0, after ? 1 - roll : 1, C.sub) : null}
        {after && digit("00:00", (1 - roll) * fs * 0.9, roll, mixColor(C.coral, C.text, prog(t, tRoll + 0.2, tRoll + 0.9)))}
      </div>
    </div>
  );
};
