// TRACK 05 専用の小物: 音声解析ヘルパー、ラックユニットの枠、ネジ、スイッチ、鍵、表彰ロゼット
import React from "react";
import { C, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { clamp01, mix, rand } from "../../time";

// ───────── 音声レベルから拍を取る ─────────
export const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

/**
 * 行 id を無音の区切りで n 個のフレーズに分け、各フレーズの話し始め（絶対秒）を返す。
 * 区切りは「長い無音」上位 n-1 個。見つからなければ fallback（行内の割合）を使う。
 */
export const phraseStarts = (id: string, n: number, fallback: number[]): number[] => {
  const l = line(id);
  const r = rmsOf(id);
  const thr = 0.06;
  const minRun = 4;
  const first = r.findIndex((v) => v >= thr);
  const fb = fallback.map((f) => l.start + l.dur * f);
  if (first < 0) return fb;
  const runs: { a: number; b: number }[] = [];
  let s = -1;
  for (let k = first; k <= r.length; k++) {
    const silent = k === r.length || r[k] < thr;
    if (silent && s < 0) s = k;
    if (!silent && s >= 0) {
      if (k - s >= minRun && k < r.length) runs.push({ a: s, b: k });
      s = -1;
    }
  }
  if (runs.length < n - 1) return fb;
  const cuts = [...runs]
    .sort((p, q) => q.b - q.a - (p.b - p.a))
    .slice(0, n - 1)
    .sort((p, q) => p.a - q.a);
  return [first, ...cuts.map((c) => c.b)].map((k) => l.start + k / FPS);
};

/** 行 id の中で実際に声が出ている範囲（絶対秒） */
export const voicedRange = (id: string, thr = 0.06) => {
  const l = line(id);
  const r = rmsOf(id);
  const first = r.findIndex((v) => v >= thr);
  if (first < 0) return { first: l.start, last: l.end };
  let last = first;
  for (let k = r.length - 1; k >= 0; k--) {
    if (r[k] >= thr) {
      last = k;
      break;
    }
  }
  return { first: l.start + first / FPS, last: l.start + (last + 1) / FPS };
};

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

/** #RRGGBB 同士の色を混ぜる */
export const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = clamp01(p);
  return `rgb(${pa.map((v, i) => Math.round(mix(v, pb[i], q))).join(",")})`;
};

export type Rect = { x: number; y: number; w: number; h: number };
export const mixRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

// ───────── ラックユニット ─────────
/** ラックに積んだ機材の枠（中身は children。枠だけを動かして縮められる） */
export const RackFrame: React.FC<{
  r: Rect;
  radius?: number;
  border?: string;
  glow?: string;
  opacity?: number;
  children?: React.ReactNode;
}> = ({ r, radius = 18, border = C.border, glow, opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      borderRadius: radius,
      background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
      border: `1.5px solid ${border}`,
      boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 50px rgba(0,0,0,0.45)${glow ? `, ${glow}` : ""}`,
      boxSizing: "border-box",
      overflow: "hidden",
      opacity,
    }}
  >
    {children}
  </div>
);

/** ラックのネジ（プラス頭）。角度は seed で固定 */
export const Screw: React.FC<{ x: number; y: number; seed: number }> = ({ x, y, seed }) => {
  const a = rand(seed) * 180;
  return (
    <svg width={16} height={16} style={{ position: "absolute", left: x - 8, top: y - 8 }}>
      <circle cx={8} cy={8} r={6.5} fill="#0B0D11" stroke={C.borderHi} strokeWidth={1.2} />
      <g transform={`rotate(${a} 8 8)`} stroke={C.dim} strokeWidth={1.4} strokeLinecap="round">
        <line x1={4.6} y1={8} x2={11.4} y2={8} />
        <line x1={8} y1={4.6} x2={8} y2={11.4} />
      </g>
    </svg>
  );
};

/** ユニットの見出し行: [ネジ] [U1] LABEL ……… right [ネジ] */
export const UnitHeader: React.FC<{ w: number; tag: string; label: React.ReactNode; right?: React.ReactNode; seed: number }> = ({
  w,
  tag,
  label,
  right,
  seed,
}) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 54, borderBottom: `1px solid ${C.border}` }}>
    <Screw x={22} y={27} seed={seed} />
    <Screw x={w - 22} y={27} seed={seed + 1} />
    <div
      style={{
        position: "absolute",
        left: 44,
        top: 0,
        height: 54,
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: "0.16em",
        color: C.sub,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: 15,
          letterSpacing: "0.08em",
          color: C.dim,
          border: `1.5px solid ${C.borderHi}`,
          borderRadius: 5,
          padding: "2px 7px",
        }}
      >
        {tag}
      </span>
      {label}
    </div>
    <div
      style={{
        position: "absolute",
        right: 44,
        top: 0,
        height: 54,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "0.16em",
        whiteSpace: "nowrap",
      }}
    >
      {right}
    </div>
  </div>
);

// ───────── アイコン（24 基準の線画） ─────────
type IP = { size?: number; color?: string; sw?: number };

export const IconShieldCheck: React.FC<IP & { check?: number }> = ({ size = 32, color = C.mint, sw = 1.8, check = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5 20 5.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z" />
    <path d="m8.3 12 2.6 2.6 4.8-5.2" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check} />
  </svg>
);

/** 南京錠。open=0 で閉、1 で開 */
export const IconLock: React.FC<IP & { open?: number }> = ({ size = 32, color = C.sub, sw = 1.8, open = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d={`M8 10.5V7.5a4 4 0 0 1 8 0v${(3 * (1 - open)).toFixed(2)}`} transform={`translate(0 ${(-2.4 * open).toFixed(2)})`} />
    <path d="M12 14.5v2.5" />
  </svg>
);

/** 描き込まれるチェック（viewBox 24） */
export const CheckDraw: React.FC<{ size: number; color: string; sw?: number; p: number }> = ({ size, color, sw = 3, p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
    <path d="M5 12.5 10 17.5 19.5 7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
  </svg>
);

// ───────── スライドスイッチ ─────────
/** on: 0→1 でつまみが右へ・台がミントに。check: つまみの中のチェックの描画量 */
export const Toggle: React.FC<{ on: number; check: number; w?: number; h?: number }> = ({ on, check, w = 140, h = 66 }) => {
  const pad = 7;
  const k = h - pad * 2;
  const kx = mix(pad, w - pad - k, on);
  const onC = clamp01(on);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {/* 台（OFF: 暗い溝 / ON: ミント） */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: h / 2,
          background: "#0A0C10",
          border: `1.5px solid ${C.borderHi}`,
          boxSizing: "border-box",
          boxShadow: "inset 0 3px 8px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: h / 2,
          background: C.mint,
          opacity: onC,
          boxShadow: `0 0 ${28 * onC}px ${C.mint}88`,
        }}
      />
      {/* 台の文字 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          height: h,
          left: w - pad - k - 2,
          width: k,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.1em",
          color: C.dim,
          opacity: 1 - onC,
        }}
      >
        OFF
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          height: h,
          left: pad + 2,
          width: k,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.1em",
          color: C.ink,
          opacity: onC,
        }}
      >
        ON
      </div>
      {/* つまみ */}
      <div
        style={{
          position: "absolute",
          left: kx,
          top: pad,
          width: k,
          height: k,
          borderRadius: k / 2,
          background: onC > 0.5 ? C.ink : "#5A6272",
          boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckDraw size={k * 0.62} color={C.mint} sw={3.2} p={check} />
      </div>
    </div>
  );
};

// ───────── 表彰ロゼット（#1 総合） ─────────
export const Rosette: React.FC<{ r: number; ring?: number }> = ({ r, ring = 0 }) => {
  const n = 32;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.9;
    pts.push(`${(r + rr * Math.cos(a)).toFixed(2)},${(r + rr * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg width={r * 2} height={r * 2} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {ring > 0 && ring < 1 && (
        <circle cx={r} cy={r} r={r * (1 + 0.75 * ring)} fill="none" stroke={C.coral} strokeWidth={3 * (1 - ring)} opacity={0.8 * (1 - ring)} />
      )}
      <polygon points={pts.join(" ")} fill={C.coral} style={{ filter: `drop-shadow(0 0 22px ${C.coral}88)` }} />
      <circle cx={r} cy={r} r={r * 0.76} fill="none" stroke={C.ink} strokeWidth={2.2} opacity={0.85} />
      <circle cx={r} cy={r} r={r * 0.7} fill="none" stroke={C.ink} strokeWidth={1} strokeDasharray="2 5" opacity={0.6} />
    </svg>
  );
};
