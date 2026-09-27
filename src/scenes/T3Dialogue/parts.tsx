// TRACK 03 専用の小物: 声の包絡線、録音クリップの棒、マスキングテープの札、1 つの REC キー
import React from "react";
import { C, FONT, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { clamp01, mix, rand } from "../../time";

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

/** 行 id の rms を前後 1 フレームでならしたもの（録音クリップの棒の高さに使う） */
export const smoothRms = (id: string): number[] => {
  const r = LEVELS.lines[id]?.rms ?? [];
  return r.map((v, i) => 0.25 * (r[i - 1] ?? v) + 0.5 * v + 0.25 * (r[i + 1] ?? v));
};

// ───────── マスキングテープ（ちぎった左右の端） ─────────
export const tornEdge = (w: number, h: number, n: number, seed: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i % 2 ? 5 : 1) + rand(seed + i) * 2.5}px ${(i / n) * h}px`);
  for (let i = n; i >= 0; i--) pts.push(`${w - ((i % 2 ? 1 : 5) + rand(seed + 40 + i) * 2.5)}px ${(i / n) * h}px`);
  return `polygon(${pts.join(",")})`;
};
const tapeBg = (color: string) =>
  `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.08) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 6px), ${color}`;

/**
 * チャンネルに貼る役名のテープ。
 * stick: 0→1（ばね。上から落ちて押さえられる）/ lit: 0〜1 話している間の明るさ
 */
export const TapeLabel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  stick: number;
  seed: number;
  rot?: number;
  dim?: number;
}> = ({ x, y, w, h, text, color, stick, seed, rot = -2, dim = 0 }) => {
  if (stick <= 0.001) return null;
  const lift = 1 - clamp01(stick);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: clamp01(stick * 3) * mix(1, 0.55, dim),
        transformOrigin: "50% 50%",
        transform: `translateY(${-lift * 14}px) rotate(${rot - lift * 5}deg) scale(${mix(1.14, 1, clamp01(stick))})`,
        filter: `drop-shadow(0 ${3 + lift * 10}px ${5 + lift * 10}px rgba(0,0,0,0.55))`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: tornEdge(w, h, 9, seed),
          background: tapeBg(color),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: h * 0.58,
          letterSpacing: "0.04em",
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ───────── 1 つの REC キー（押すと 2 本のトラックが同時に録音待ちになる） ─────────
export const RecKey: React.FC<{
  size: number;
  /** 0→1 押し込み（押した瞬間だけ 1 に近づき、戻る） */
  push: number;
  /** 0〜1 点灯（押したあと 1） */
  on: number;
  /** 0〜1 押す直前の「待ち」の輪 */
  ready: number;
}> = ({ size, push, on, ready }) => {
  const s = size;
  return (
    <div style={{ position: "relative", width: s, height: s }}>
      {/* 押す直前: キーのまわりに輪が 1 本広がる */}
      {ready > 0 && ready < 1 && (
        <div
          style={{
            position: "absolute",
            left: -12 * ready,
            top: -12 * ready,
            width: s + 24 * ready,
            height: s + 24 * ready,
            borderRadius: 26 + 12 * ready,
            border: `2px solid ${C.coral}`,
            opacity: Math.sin(ready * Math.PI) * 0.8,
            boxSizing: "border-box",
          }}
        />
      )}
      {/* 台座 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          background: "#07090C",
          boxShadow: `inset 0 0 0 1.5px ${C.border}`,
        }}
      />
      {/* キー */}
      <div
        style={{
          position: "absolute",
          left: 7,
          top: 7 + push * 4,
          width: s - 14,
          height: s - 18,
          borderRadius: 18,
          boxSizing: "border-box",
          background:
            on > 0.02
              ? `linear-gradient(180deg, rgba(255,140,100,${on}) 0%, rgba(255,106,61,${on}) 60%, rgba(214,80,40,${on}) 100%), #2A303B`
              : "linear-gradient(180deg, #343B48 0%, #1D222B 60%, #252B36 100%)",
          border: `1.5px solid ${on > 0.5 ? C.coral : C.borderHi}`,
          boxShadow:
            (push > 0.5 ? "0 1px 0 rgba(0,0,0,0.6)" : "0 5px 0 #0A0C10, 0 10px 18px rgba(0,0,0,0.5)") +
            (on > 0.02 ? `, 0 0 ${36 * on}px ${C.coral}88` : ""),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: s * 0.2,
            height: s * 0.2,
            borderRadius: "50%",
            background: on > 0.5 ? C.ink : C.red,
            opacity: on > 0.5 ? 0.9 : 0.55,
            boxShadow: on > 0.5 ? undefined : `0 0 8px ${C.red}55`,
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: s * 0.17,
            letterSpacing: "0.14em",
            marginRight: "-0.14em",
            color: on > 0.5 ? C.ink : C.text,
            lineHeight: 1,
          }}
        >
          REC
        </div>
      </div>
    </div>
  );
};
