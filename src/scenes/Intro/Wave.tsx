import React from "react";
import { C, FPS } from "../../theme";
import { LEVELS, TL } from "../../timeline";
import { clamp01, mix, rand, useTime } from "../../time";

/**
 * イントロの青い棒グラフ波形。実際のナレーション音量に反応する。
 * - 無音では各棒が小さな四角（点）になる
 * - 冒頭は左から右へ「山」が走りながら棒が立ち上がる（元動画の reveal）
 * - 形状（間隔・太さ・高さ・位置）は geom で毎フレーム補間できる
 */
export type WaveGeom = {
  cx: number;
  cy: number;
  /** 棒の間隔(px) */
  step: number;
  /** 棒の太さ(px)。無音時は bw×bw の四角 */
  bw: number;
  /** 最大の高さ(px) */
  maxH: number;
  /** 端の棒の高さの割合（包絡線の下限。大きい波形は 0.28、小さい波形は 0.08） */
  envFloor: number;
};

// 行ごとの音量の目安（90パーセンタイル）。声を差し替えても同じ見た目の振れ幅になるよう正規化に使う
const normCache = new Map<string, number>();
const lineNorm = (id: string) => {
  const hit = normCache.get(id);
  if (hit !== undefined) return hit;
  const lv = LEVELS.lines[id];
  let v = 0.3;
  if (lv && lv.rms.length) {
    const s = [...lv.rms].sort((a, b) => a - b);
    v = Math.max(0.05, s[Math.floor(s.length * 0.9)]);
  }
  normCache.set(id, v);
  return v;
};

const rawLevel = (t: number, lines: string[]) => {
  const l = TL.lines.find((x) => lines.includes(x.id) && t >= x.start && t < x.end);
  if (!l) return 0;
  const lv = LEVELS.lines[l.id];
  if (!lv) return 0;
  const k = Math.floor((t - l.start) * FPS);
  if (k < 0 || k >= lv.rms.length) return 0;
  const pick = (i: number) => lv.rms[Math.min(lv.rms.length - 1, Math.max(0, i))];
  const r = (pick(k - 1) + 2 * pick(k) + pick(k + 1)) / 4;
  return clamp01(r / lineNorm(l.id)) ** 0.6;
};

/** 立ち上がりは即、減衰は約0.25秒かけて（子音や短い息継ぎで棒がつぶれないように） */
const levelAt = (t: number, lines: string[]) => {
  let v = 0;
  for (let j = 0; j <= 8; j++) v = Math.max(v, rawLevel(t - j / FPS, lines) * 0.82 ** j);
  return Math.min(1, v * 1.45);
};

/** 棒ごとのなめらかなゆらぎ(0..1) */
const noise = (i: number, x: number) => {
  const f = Math.floor(x);
  const fr = x - f;
  const a = rand(i * 17.13 + f * 3.71);
  const b = rand(i * 17.13 + (f + 1) * 3.71);
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
};

export const IntroWave: React.FC<{
  n: number;
  geom: WaveGeom;
  lines: string[];
  /** reveal（左→右の立ち上がり）が始まる時刻と速さ(本/秒) */
  revealStart?: number;
  revealRate?: number;
  color?: string;
}> = ({ n, geom, lines, revealStart = -1e9, revealRate = 46, color = C.blue }) => {
  const t = useTime();
  const { cx, cy, step, bw, maxH, envFloor } = geom;
  const lvl = levelAt(t, lines);
  const e = t - revealStart; // reveal からの経過
  const front = e * revealRate; // この本数までが立ち上がっている
  // 走る「山」の高さと、先端から山頂までの距離
  const peak = 0.75 * Math.sin(clamp01(e / 0.5) * (Math.PI / 2));
  const dp = 3 + 4 * clamp01(e / 0.47);
  const left = cx - (n * step) / 2;
  const ry = Math.max(1.5, bw * 0.17);
  const x = t * FPS / 2.2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {Array.from({ length: n }, (_, i) => {
        const pos = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const env = envFloor + (1 - envFloor) * Math.cos((pos * Math.PI) / 2) ** 1.2;
        const jit = 0.45 + 0.55 * noise(i, x);
        const voice = env * lvl * jit;
        let v: number;
        if (i >= front) {
          v = 0; // まだ届いていない → 点
        } else {
          // 山頂は先端の少し後ろ。中央より先には行かず、先端が右端を越えたら右側はなだらかに下がる
          const c = Math.min(front - dp, (n - 1) / 2);
          const r = Math.min(front, n + 0.5);
          const sweep =
            i >= c
              ? mix(0.1, peak, Math.sin(clamp01((r - i) / Math.max(1, r - c)) * (Math.PI / 2)))
              : mix(peak, 0.2, clamp01((c - i) / Math.max(1, c)));
          const tf = revealStart + i / revealRate; // 先端がこの棒を通過した時刻
          const w = clamp01((t - tf - 0.33) / 0.14);
          v = mix(sweep, voice, w);
        }
        const h = Math.max(bw, bw + (maxH - bw) * v);
        const bx = left + i * step + (step - bw) / 2;
        return (
          <rect key={i} x={bx} y={cy - h / 2} width={bw} height={h} rx={bw / 2} ry={Math.min(ry, h / 2)} fill={color} />
        );
      })}
    </svg>
  );
};
