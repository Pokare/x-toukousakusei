import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, FPS, HUD_Y, MONO, PAD_X } from "../theme";
import { TL, TOTAL_SEC } from "../timeline";
import { ease, prog, useTime } from "../time";

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const timecode = (t: number) => {
  const f = Math.floor((t % 1) * FPS);
  return `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad(f)}`;
};

/**
 * 画面上部の計器表示。左に REC ランプとタイムコード、右に今のトラック名、
 * その下に動画全体の進行バー（トラックの切れ目に目盛り）。
 */
export const Hud: React.FC = () => {
  const t = useTime();
  const enter = prog(t, 0.05, 0.6);
  const cur = [...TL.sections].reverse().find((s) => t >= s.start - 0.6) ?? TL.sections[0];
  const since = t - (cur.start - 0.6);
  const labelIn = prog(since, 0, 0.35);
  // 最後の1秒で録音停止（ランプが消える）
  const stopped = t > TOTAL_SEC - 0.9;
  const blink = stopped ? 0.15 : 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 0.8);
  const rail = 1920 - PAD_X * 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: enter }}>
      {/* 左: REC とタイムコード */}
      <div style={{ position: "absolute", left: PAD_X, top: HUD_Y, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: C.red,
            opacity: blink,
            boxShadow: `0 0 ${14 * blink}px ${C.red}`,
          }}
        />
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.text, letterSpacing: "0.12em" }}>
          {stopped ? "STOP" : "REC"}
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 22, color: C.sub, letterSpacing: "0.06em", marginLeft: 10 }}>
          {timecode(t)}
        </div>
      </div>

      {/* 右: トラック表示 */}
      <div
        style={{
          position: "absolute",
          right: PAD_X,
          top: HUD_Y - 2,
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * -10}px)`,
        }}
      >
        {cur.title && (
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.text }}>{cur.title}</div>
        )}
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: stopped ? C.dim : C.coral, letterSpacing: "0.14em" }}>
          {stopped && cur.label === "ON AIR" ? "OFF AIR" : cur.label}
        </div>
      </div>

      {/* 進行バー */}
      <div style={{ position: "absolute", left: PAD_X, top: HUD_Y + 48, width: rail, height: 2, background: C.border }}>
        <div
          style={{
            width: rail * Math.min(1, t / TOTAL_SEC) * prog(t, 0, 0.8, ease.out),
            height: 2,
            background: C.coral,
            boxShadow: `0 0 8px ${C.coral}`,
          }}
        />
        {TL.sections.slice(1).map((s) => (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: (s.start / TOTAL_SEC) * rail - 1,
              top: -5,
              width: 2,
              height: 12,
              background: t >= s.start ? C.coral : C.borderHi,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
