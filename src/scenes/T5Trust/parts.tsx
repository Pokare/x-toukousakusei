// TRACK 05 専用の小物: 音声解析ヘルパー、ラックユニットの枠、ネジ、署名の線、パタパタ表示（スプリットフラップ）
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

/** 描き込まれるチェック（viewBox 24） */
export const CheckDraw: React.FC<{ size: number; color: string; sw?: number; p: number }> = ({ size, color, sw = 3, p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
    <path d="M5 12.5 10 17.5 19.5 7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
  </svg>
);


// ───────── 署名（手書き風の 1 本線） ─────────
/**
 * 筆記体のサインのような点列を返す（原点 = 書き出しのベースライン、y は上向きが負）。
 * ループの高さを変えて「大文字 → 小文字」の抑揚をつけ、最後に下へ払う。
 * 途中まで描くときは点列の先頭 k 個だけを使えば、ペン先の位置もそのまま分かる。
 */
const SIG_H = [1.0, 0.42, 0.5, 0.95, 0.4, 0.36, 0.8, 0.42];
export const signaturePoints = (w: number, h: number, n = 260): [number, number][] => {
  const N = SIG_H.length;
  const hAt = (u: number) => {
    const f = u * N - 0.5;
    const i = Math.max(0, Math.min(N - 2, Math.floor(f)));
    let k = clamp01(f - i);
    k = k * k * (3 - 2 * k);
    return mix(SIG_H[i], SIG_H[i + 1], k);
  };
  const pts: [number, number][] = [];
  const R = w * 0.034;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const ph = Math.PI * 2 * N * u;
    const y = -h * (0.5 - 0.5 * Math.cos(ph)) * hAt(u);
    pts.push([w * u + R * Math.sin(ph) - y * 0.32, y]);
  }
  const [x1, y1] = pts[pts.length - 1];
  const m = Math.round(n * 0.27);
  for (let j = 1; j <= m; j++) {
    const v = j / m;
    pts.push([x1 + w * 0.07 * Math.sin(Math.PI * v * 0.6) - (w + 10) * Math.pow(v, 1.5), y1 + h * 0.24 * Math.sin(Math.PI * v) + h * 0.15 * v]);
  }
  return pts;
};

export const pointsToPath = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

// ───────── パタパタ表示（スプリットフラップ）の 1 枚 ─────────
/**
 * seq[i] の文字へ at[i] 秒にめくれはじめる（at[0] は使わない）。dur 秒で 1 回めくれ終わる。
 * 上半分の羽根が手前へ倒れ（0→-90°）、続いて新しい文字の下半分が降りてくる（90→0°）。
 */
export const FlapTile: React.FC<{
  t: number;
  seq: string[];
  at: number[];
  w: number;
  h: number;
  dur?: number;
  font: string;
  size: number;
  weight?: number;
  color: string;
  dy?: number; // 字面の上下の微調整（px）
  radius?: number;
  glow?: number; // 0〜1: 着地後の光
  glowColor?: string;
}> = ({ t, seq, at, w, h, dur = 0.08, font, size, weight = 400, color, dy = 0, radius = 8, glow = 0, glowColor = C.coral }) => {
  let k = 0;
  for (let i = 1; i < seq.length; i++) if (t >= at[i]) k = i;
  const cur = seq[k];
  const prev = k > 0 ? seq[k - 1] : cur;
  const f = k > 0 ? clamp01((t - at[k]) / dur) : 1;
  const hh = h / 2;
  const topBg = "linear-gradient(180deg, #232935 0%, #1A1F28 100%)";
  const botBg = "linear-gradient(180deg, #161A21 0%, #12151B 100%)";
  const glyph = (ch: string, top: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : -hh,
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        color,
        transform: `translateY(${dy}px)`,
        textShadow: glow > 0 ? `0 0 ${24 * glow}px ${glowColor}` : undefined,
      }}
    >
      {ch === " " ? "" : ch}
    </div>
  );
  const half = (ch: string, top: boolean, extra: React.CSSProperties = {}, shade = 0) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : hh,
        width: w,
        height: hh,
        overflow: "hidden",
        background: top ? topBg : botBg,
        borderRadius: top ? `${radius}px ${radius}px 0 0` : `0 0 ${radius}px ${radius}px`,
        ...extra,
      }}
    >
      {glyph(ch, top)}
      {shade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${shade})` }} />}
    </div>
  );
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        perspective: Math.max(700, h * 4),
        borderRadius: radius,
        boxShadow: `0 6px 16px rgba(0,0,0,0.45), 0 0 0 1px ${C.border}${glow > 0 ? `, 0 0 ${36 * glow}px ${glowColor}55` : ""}`,
      }}
    >
      {half(cur, true)}
      {half(f < 1 ? prev : cur, false)}
      {f < 0.5 && half(prev, true, { transformOrigin: "50% 100%", transform: `rotateX(${-180 * f}deg)` }, 0.7 * f)}
      {f >= 0.5 && f < 1 && half(cur, false, { transformOrigin: "50% 0%", transform: `rotateX(${180 * (1 - f)}deg)` }, 0.7 * (1 - f))}
      {/* 真ん中の継ぎ目と左右のヒンジ */}
      <div style={{ position: "absolute", left: 0, right: 0, top: hh - 1, height: 2, background: "#08090C" }} />
      <div style={{ position: "absolute", left: -1, top: hh - 5, width: 3, height: 10, borderRadius: 1.5, background: C.borderHi }} />
      <div style={{ position: "absolute", right: -1, top: hh - 5, width: 3, height: 10, borderRadius: 1.5, background: C.borderHi }} />
    </div>
  );
};
