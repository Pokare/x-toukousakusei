// TRACK 05 専用の小物: 音声レベルのヘルパー、色の補間、判子、クリップボードの金具、READY FOR AIR ランプ
import React from "react";
import { C, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { clamp01, mix, rand, springAt } from "../../time";

// ───────── 音声レベル ─────────
export const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

/** 行 id の音量を n 本の棒に畳む（各区間の最大値、最大 1 に正規化） */
export const clipShape = (id: string, n: number): number[] => {
  const r = rmsOf(id);
  if (!r.length) return Array.from({ length: n }, (_, i) => 0.25 + 0.5 * rand(i * 3.3));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * r.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * r.length) / n));
    let m = 0;
    for (let k = a; k < b && k < r.length; k++) m = Math.max(m, r[k]);
    out.push(m);
  }
  const mx = Math.max(1e-6, ...out);
  return out.map((v, i) => clamp01((v / mx) * (0.86 + 0.14 * rand(i * 7.7 + 0.4))));
};

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

/** 行 id の、絶対時刻 t における音量（フレーム間は線形補間）0〜1 */
export const rmsAt = (id: string, t: number) => {
  const l = line(id);
  const r = rmsOf(id);
  if (!r.length) return 0;
  const f = (t - l.start) * FPS;
  const i = Math.floor(f);
  if (i < 0 || i >= r.length) return 0;
  const a = r[i];
  const b = i + 1 < r.length ? r[i + 1] : 0;
  return Math.min(1, mix(a, b, f - i));
};

/** #RRGGBB 同士の色を混ぜる */
export const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = clamp01(p);
  return `rgb(${pa.map((v, i) => Math.round(mix(v, pb[i], q))).join(",")})`;
};

export const mono = (size: number, color: string = C.sub, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.16em",
  color,
  whiteSpace: "nowrap",
  ...extra,
});

/** 描き込まれるチェック（viewBox 24） */
export const CheckDraw: React.FC<{ size: number; color: string; sw?: number; p: number }> = ({ size, color, sw = 3, p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
    <path d="M5 12.5 10 17.5 19.5 7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
  </svg>
);

// ───────── 判子（ゴム印） ─────────
export const STAMP_W = 284;
export const STAMP_H = 112;

/** 判子のインクのかすれ（決定的な点） */
const SPECKS = Array.from({ length: 34 }, (_, i) => ({
  x: rand(i * 3.17 + 0.5) * STAMP_W,
  y: rand(i * 5.71 + 1.3) * STAMP_H,
  r: 0.8 + rand(i * 2.13 + 7) * 1.9,
}));

/**
 * 四角いゴム印: [✓] 1 行目（大）/ 2 行目（小）。at 秒に押される（大きめから落ちて、少し傾いて止まる）。
 * 中心 (cx, cy) に置く。scale で行の開閉に合わせて縮められる。
 */
export const Stamp: React.FC<{
  t: number;
  at: number;
  cx: number;
  cy: number;
  scale?: number;
  title: string;
  sub: string;
  color?: string;
  titleSize?: number;
  tilt?: number;
}> = ({ t, at, cx, cy, scale = 1, title, sub, color = C.mint, titleSize = 30, tilt = -5 }) => {
  if (t < at) return null;
  const st = springAt(t, at, { damping: 13, stiffness: 260, mass: 0.6 });
  const o = clamp01((t - at) / 0.06);
  const s = scale * (1 + (1 - st) * 0.55);
  const rot = tilt - (1 - st) * 7;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - STAMP_W / 2,
        top: cy - STAMP_H / 2,
        width: STAMP_W,
        height: STAMP_H,
        opacity: o,
        transform: `rotate(${rot}deg) scale(${s})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          border: `4px solid ${color}`,
          background: "rgba(59,227,180,0.06)",
          boxShadow: `0 0 26px ${color}2E`,
        }}
      />
      <div style={{ position: "absolute", inset: 8, borderRadius: 7, border: `1.5px solid ${color}`, opacity: 0.75 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <CheckDraw size={44} color={color} sw={3.6} p={clamp01((t - at - 0.05) / 0.22)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: titleSize, color, lineHeight: 1, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
            {title}
          </div>
          <div style={mono(15, color, { letterSpacing: "0.24em" })}>{sub}</div>
        </div>
      </div>
      {/* インクのかすれ */}
      <svg width={STAMP_W} height={STAMP_H} style={{ position: "absolute", left: 0, top: 0 }}>
        {SPECKS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={C.panelHi} opacity={0.85} />
        ))}
      </svg>
    </div>
  );
};

/** 判子を押す場所（点線の枠）。押されたら消える */
export const StampSlot: React.FC<{ cx: number; cy: number; scale?: number; opacity: number }> = ({ cx, cy, scale = 1, opacity }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: cx - STAMP_W / 2,
        top: cy - STAMP_H / 2,
        width: STAMP_W,
        height: STAMP_H,
        borderRadius: 12,
        border: `2px dashed ${C.borderHi}`,
        boxSizing: "border-box",
        transform: `scale(${scale})`,
        opacity,
      }}
    />
  );

// ───────── クリップボードの金具 ─────────
export const ClipboardClip: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 1 }) => (
  <svg width={240} height={64} viewBox="0 0 240 64" style={{ position: "absolute", left: x - 120, top: y, overflow: "visible", opacity }}>
    <defs>
      <linearGradient id="t5-clip" x1={0} x2={0} y1={0} y2={1}>
        <stop offset={0} stopColor="#5A6273" />
        <stop offset={0.45} stopColor="#3A4150" />
        <stop offset={1} stopColor="#232833" />
      </linearGradient>
    </defs>
    {/* 板に当たる影 */}
    <rect x={14} y={30} width={212} height={34} rx={10} fill="rgba(0,0,0,0.45)" />
    {/* 金具の本体 */}
    <path d="M58 4 H182 a10 10 0 0 1 10 10 V22 H222 a10 10 0 0 1 10 10 V48 a10 10 0 0 1 -10 10 H18 a10 10 0 0 1 -10 -10 V32 a10 10 0 0 1 10 -10 H48 V14 a10 10 0 0 1 10 -10 Z" fill="url(#t5-clip)" stroke="#4C5361" strokeWidth={1.2} />
    {/* つまみの穴 */}
    <rect x={92} y={10} width={56} height={10} rx={5} fill="#0B0D11" stroke="#4C5361" strokeWidth={1} />
    {/* リベット */}
    <circle cx={34} cy={40} r={4.5} fill="#1A1E26" stroke="#5A6273" strokeWidth={1} />
    <circle cx={206} cy={40} r={4.5} fill="#1A1E26" stroke="#5A6273" strokeWidth={1} />
    <line x1={20} y1={24} x2={220} y2={24} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
  </svg>
);

// ───────── READY FOR AIR ランプ ─────────
/**
 * 壁付けの表示灯。左に 2 つのインターロック LED（01 / 02。チェック済みでミント）、右に表示面。
 * lit: 0〜1 で表示面がコーラルに点灯する。
 */
export const READY_W = 500;
export const READY_H = 96;
export const ReadyLamp: React.FC<{ x: number; y: number; appear: number; lit: number; leds: [number, number] }> = ({ x, y, appear, lit, leds }) => {
  const faceX = 132;
  const faceW = READY_W - faceX - 12;
  const face = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    left: faceX,
    top: 12,
    width: faceW,
    height: READY_H - 24,
    borderRadius: 10,
    boxSizing: "border-box",
    border: `2px solid ${on ? C.coral : C.borderHi}`,
    background: on ? C.coral : "#12151B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  });
  const label = (on: boolean) => (
    <>
      <div style={{ width: 13, height: 13, borderRadius: 7, background: on ? C.ink : C.dim, opacity: on ? 0.85 : 0.6 }} />
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.18em", color: on ? C.ink : C.dim, marginRight: -5 }}>READY FOR AIR</div>
    </>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: READY_W,
        height: READY_H,
        opacity: appear,
        transform: `translateY(${(1 - appear) * -14}px)`,
      }}
    >
      {/* 筐体 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 14px 36px rgba(0,0,0,0.45)",
          boxSizing: "border-box",
        }}
      />
      {/* インターロック LED */}
      {[0, 1].map((i) => {
        const on = leds[i];
        return (
          <div key={i} style={{ position: "absolute", left: 22 + i * 52, top: 20, width: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                background: on > 0.5 ? C.mint : "#262B35",
                border: `1.5px solid ${on > 0.5 ? C.mint : C.borderHi}`,
                boxShadow: on > 0 ? `0 0 ${12 * on}px ${C.mint}` : undefined,
                boxSizing: "border-box",
              }}
            />
            <div style={mono(14, on > 0.5 ? C.mint : C.dim, { letterSpacing: "0.08em" })}>{`0${i + 1}`}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: faceX - 14, top: 18, width: 1.5, height: READY_H - 36, background: C.border }} />
      <div style={face(false)}>{label(false)}</div>
      {lit > 0 && (
        <div style={{ ...face(true), opacity: lit, boxShadow: `0 0 ${46 * lit}px ${C.coral}99, 0 0 0 6px ${C.coral}1F` }}>{label(true)}</div>
      )}
    </div>
  );
};
