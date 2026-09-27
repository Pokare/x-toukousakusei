// TRACK 04 の t4-4 用の小物: オープンリール、マスキングテープの札、テープカウンター（分:秒）
// TapeLabel / tornEdge は T3Dialogue/parts.tsx からの写し（シーン間の依存を避けるため）。
import React from "react";
import { C, DISPLAY, FONT } from "../../theme";
import { clamp01, mix, rand } from "../../time";

// ───────── オープンリール（正面から。窓が 3 つのフランジ越しに巻いたテープが見える） ─────────
const arcPt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
};
const windowPath = (r1: number, r2: number, a1: number, a2: number) =>
  `M ${arcPt(r1, a1)} L ${arcPt(r2, a1)} A ${r2} ${r2} 0 0 1 ${arcPt(r2, a2)} L ${arcPt(r1, a2)} A ${r1} ${r1} 0 0 0 ${arcPt(r1, a1)} Z`;

export const Reel: React.FC<{
  r: number;
  /** 0〜1: 巻かれているテープの量 */
  pack: number;
  /** 回転（度） */
  angle: number;
  /** 0〜1: 縁のコーラルの光（録音中・持ち上げたとき） */
  glow?: number;
}> = ({ r, pack, angle, glow = 0 }) => {
  const hub = r * 0.25;
  const rp = mix(hub + 3, r - 6, clamp01(pack));
  const s = r * 2;
  const w1 = hub + 7;
  const w2 = r - 9;
  const flange =
    `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z ` +
    [0, 120, 240].map((a) => windowPath(w1, w2, a + 14, a + 106)).join(" ");
  return (
    <svg width={s} height={s} viewBox={`${-r} ${-r} ${s} ${s}`} style={{ display: "block", overflow: "visible" }}>
      {/* 奥 */}
      <circle r={r - 1} fill="#090B0E" />
      {/* 巻かれたテープ */}
      <circle r={rp} fill="#2B303A" />
      {[0.5, 0.72, 0.9].map((f) => (
        <circle key={f} r={mix(hub, rp, f)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      <circle r={rp} fill="none" stroke="#4A5160" strokeWidth={1.5} />
      <g transform={`rotate(${angle})`}>
        {/* フランジ（窓 3 つ） */}
        <path d={flange} fillRule="evenodd" fill={C.panelHi} fillOpacity={0.96} stroke={C.borderHi} strokeWidth={1.5} />
        {/* ハブ */}
        <circle r={hub} fill="#232833" stroke={C.borderHi} strokeWidth={1.5} />
        <circle r={hub * 0.42} fill="#090B0E" />
        {[0, 120, 240].map((a) => (
          <rect key={a} transform={`rotate(${a})`} x={-2.5} y={-hub * 0.42 - 3.5} width={5} height={7} rx={1} fill="#090B0E" />
        ))}
        {/* 回っているのがわかる小さな印 */}
        <circle cx={0} cy={-(w2 + 4.5)} r={2.2} fill={C.sub} />
      </g>
      {/* 外周のリム */}
      <circle
        r={r - 1.5}
        fill="none"
        stroke={glow > 0.01 ? C.coral : C.borderHi}
        strokeOpacity={glow > 0.01 ? 0.35 + 0.65 * glow : 1}
        strokeWidth={3}
        style={glow > 0.01 ? { filter: `drop-shadow(0 0 ${10 * glow}px ${C.coral})` } : undefined}
      />
    </svg>
  );
};

// ───────── マスキングテープの札（T3Dialogue/parts.tsx から） ─────────
export const tornEdge = (w: number, h: number, n: number, seed: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i % 2 ? 5 : 1) + rand(seed + i) * 2.5}px ${(i / n) * h}px`);
  for (let i = n; i >= 0; i--) pts.push(`${w - ((i % 2 ? 1 : 5) + rand(seed + 40 + i) * 2.5)}px ${(i / n) * h}px`);
  return `polygon(${pts.join(",")})`;
};
const tapeBg = (color: string) =>
  `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.08) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 6px), ${color}`;

/** stick: 0→1（ばね。上から落ちて押さえられる）。中心 (cx, cy) に置く */
export const TapeLabel: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  text: string;
  color: string;
  stick: number;
  seed: number;
  rot?: number;
  scale?: number;
}> = ({ cx, cy, w, h, text, color, stick, seed, rot = -4, scale = 1 }) => {
  if (stick <= 0.001) return null;
  const lift = 1 - clamp01(stick);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        opacity: clamp01(stick * 3),
        transformOrigin: "50% 50%",
        transform: `translateY(${-lift * 16}px) rotate(${rot - lift * 6}deg) scale(${mix(1.16, 1, clamp01(stick)) * scale})`,
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
          fontSize: h * 0.6,
          letterSpacing: "0.08em",
          paddingLeft: "0.08em",
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ───────── テープカウンター（分:秒。桁幅固定、分の桁は暗く） ─────────
export const TimeCounter: React.FC<{
  seconds: number;
  size: number;
  color: string;
  minuteColor?: string;
  glow?: number;
}> = ({ seconds, size, color, minuteColor = "#3A4150", glow = 0 }) => {
  const v = Math.max(0, Math.floor(seconds + 1e-6));
  const mm = String(Math.floor(v / 60)).padStart(2, "0");
  const ss = String(v % 60).padStart(2, "0");
  const shadow = glow > 0 ? `0 0 ${Math.round(46 * glow)}px ${color}66` : undefined;
  const cell = (ch: string, key: string, col: string, w = 0.95, sh?: string) => (
    <span key={key} style={{ display: "inline-flex", justifyContent: "center", width: `${w}em`, color: col, textShadow: sh }}>
      {ch}
    </span>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-start", fontFamily: DISPLAY, fontSize: size, lineHeight: 1, whiteSpace: "nowrap" }}>
      {[...mm].map((ch, i) => cell(ch, `m${i}`, minuteColor))}
      {cell(":", "c", minuteColor, 0.42)}
      {[...ss].map((ch, i) => cell(ch, `s${i}`, color, 0.95, shadow))}
    </div>
  );
};

// ───────── テープの送り（台形の速度: すっと走り出して、すっと止まる） ─────────
/** 録音区間 [a, b] でテープが len px 送られるときの、時刻 t までの送り量 */
export const transport = (t: number, a: number, b: number, len: number) => {
  const D = Math.max(0.2, b - a);
  const ramp = Math.min(0.2, D * 0.3);
  const v = len / (D - ramp);
  const x = t - a;
  if (x <= 0) return 0;
  if (x < ramp) return (v * x * x) / (2 * ramp);
  if (x < D - ramp) return v * (ramp / 2 + (x - ramp));
  if (x < D) return len - (v * (D - x) ** 2) / (2 * ramp);
  return len;
};

/** transport の逆（送り量 u に達した時刻）。二分法 */
export const transportInv = (u: number, a: number, b: number, len: number) => {
  let lo = a;
  let hi = b;
  for (let k = 0; k < 24; k++) {
    const m = (lo + hi) / 2;
    if (transport(m, a, b, len) < u) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

/** 円 (ox, oy, r) への点 (px, py) からの接点。side = +1 / -1 で 2 つのうちどちらか */
export const tangentPoint = (ox: number, oy: number, r: number, px: number, py: number, side: 1 | -1) => {
  const dx = px - ox;
  const dy = py - oy;
  const d = Math.max(r + 0.01, Math.hypot(dx, dy));
  const base = Math.atan2(dy, dx);
  const a = Math.acos(r / d);
  const ang = base + side * a;
  return { x: ox + r * Math.cos(ang), y: oy + r * Math.sin(ang) };
};
