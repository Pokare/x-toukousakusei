// 冒頭（Open/clock.tsx）の壁掛け時計をエンディング用に複製したもの。
// 冒頭で 00:00 に切り替わった瞬間（tRoll）からの経過時間をそのまま表示する:
// 秒の LED の輪は冒頭から途切れずに 1 秒 1 灯ずつ進み、中央は「00:01」のように経過した分を示す。
import React from "react";
import { C, MONO } from "../../theme";
import { mixColor, withAlpha } from "./parts";

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

export const SessionClock: React.FC<{ size: number; t: number; tRoll: number; lit?: number }> = ({ size, t, tRoll, lit = 1 }) => {
  const s = Math.max(0, t - tRoll);
  const sec = Math.floor(s) % 60;
  const hhmm = `${pad2(s / 3600)}:${pad2((s / 60) % 60)}`;

  const R = size / 2 - 7;
  const Rin = R - 17;
  const cx = size / 2;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const big = i % 5 === 0;
    const on = (i <= sec ? 1 : 0) * lit;
    dots.push(
      <circle
        key={i}
        cx={cx + Math.cos(a) * R}
        cy={cx + Math.sin(a) * R}
        r={big ? 3.6 : 2.6}
        fill={mixColor("#262B34", C.coral, on)}
        style={on > 0.6 ? { filter: `drop-shadow(0 0 3px ${withAlpha(C.coral, 0.8)})` } : undefined}
      />,
    );
  }
  const marks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
    return <circle key={k} cx={cx + Math.cos(a) * Rin} cy={cx + Math.sin(a) * Rin} r={2.4} fill={withAlpha(C.text, k === 0 ? 0.7 : 0.28)} />;
  });
  const fs = Math.round(size * 0.165);

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
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      />
      <svg width={size} height={size} style={{ position: "absolute", left: 0, top: 0 }}>
        {dots}
        {marks}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: size,
          top: size / 2 - fs * 0.62,
          textAlign: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: fs,
          lineHeight: `${fs * 1.24}px`,
          letterSpacing: "0.02em",
          color: mixColor(C.sub, C.text, lit),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {hhmm}
      </div>
    </div>
  );
};
