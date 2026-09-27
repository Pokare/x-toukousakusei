// 共有の Oscilloscope（components/Meters.tsx）を OUTRO 用に拡張したコピー。
// 違いは振れ幅の「やわらかい頭打ち」(tanh): gain を大きくしても枠で平らに切れず、
// 小さな声でもしっかり揺れ、大きな声は枠いっぱいで丸く収まる。PGM OUT を大きく見せる場面用。
import React from "react";
import { C, FPS } from "../../theme";
import { LEVELS, TL } from "../../timeline";
import { rand, useTime } from "../../time";

/**
 * 今の声のレベル。hold > 0 なら直近 hold フレームの大きな音を少しずつ減衰させながら保つ
 * （メーターの「リリース」。言葉の間の短い切れ目で線がぺたんと平らにならない）。
 */
const heldLevel = (t: number, hold: number): { rms: number; bands: number[] } | null => {
  const l = [...TL.lines].reverse().find((x) => t >= x.start && t < x.end + hold / FPS);
  const lv = l && LEVELS.lines[l.id];
  if (!l || !lv) return null;
  const k = Math.floor((t - l.start) * FPS);
  let best: { rms: number; bands: number[] } | null = null;
  let score = -1;
  for (let j = 0; j <= hold; j++) {
    const i = k - j;
    if (i < 0 || i >= lv.rms.length) continue;
    const w = hold > 0 ? (1 - j / (hold + 1)) ** 1.5 : 1;
    // 共有の useVoiceLevel と同じく前後フレームで軽くならす
    const r = (lv.rms[Math.max(0, i - 1)] + 2 * lv.rms[i] + lv.rms[Math.min(lv.rms.length - 1, i + 1)]) / 4;
    const sc = r * w;
    if (sc > score) {
      score = sc;
      best = { rms: r * w, bands: lv.bands[i].map((b) => b * w) };
    }
  }
  return best;
};

export const SoftScope: React.FC<{
  width: number;
  height: number;
  color?: string;
  gain?: number;
  thickness?: number;
  /** 0 で常に平ら */
  amount?: number;
  glow?: number;
  /** 声の切れ目で振れ幅を保つフレーム数（0 で保たない） */
  hold?: number;
}> = ({ width, height, color = C.mint, gain = 1, thickness = 3, amount = 1, glow = 1, hold = 0 }) => {
  const t = useTime();
  const lv = heldLevel(t, Math.round(hold));
  const N = 180;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = u * width;
    const edge = Math.sin(Math.PI * u) ** 0.8;
    let y = 0;
    if (lv) {
      lv.bands.forEach((b, k) => {
        const f = 1.5 + k * 1.35;
        const ph = t * (4 + k * 2.3) + rand(k * 3.1) * 6.28;
        y += (b * Math.sin(2 * Math.PI * f * u + ph)) / (1 + k * 0.18);
      });
      y *= (0.45 + lv.rms) * 0.42 * gain;
    }
    y += 0.012 * Math.sin(u * 90 + t * 20) * (1 - (lv ? lv.rms : 0));
    y = Math.tanh(y * amount) * edge;
    pts.push(`${x.toFixed(1)},${(height / 2 - y * (height / 2)).toFixed(1)}`);
  }
  const g = glow * (lv ? 0.6 + lv.rms : 0.6);
  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={g > 0.05 ? { filter: `drop-shadow(0 0 ${(4 + 8 * g).toFixed(1)}px ${color})` } : undefined}
      />
    </svg>
  );
};
