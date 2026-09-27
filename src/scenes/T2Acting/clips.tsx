// TRACK 02 専用: テイクの音声レベル（LEVELS）から「録音されたクリップ」の波形を描く。
// 3 テイクは同じセリフなので、描き方そのものをト書きに合わせて変える（どれも実際の声のレベルから描く）。
//  - sleepy  （眠そうに）         : ならした低く柔らかい雲。後ろへいくほど沈んで小さくなる（うとうと）
//  - excited （はしゃいで）       : 太く背の高いスパイク。強いところは上下に粒が跳ねる
//  - holding （泣くのをこらえて） : 点線の「ふた」で頭を押さえた、細かく震える包絡線（縦のハッチ）
import React from "react";
import { C, FPS } from "../../theme";
import { LEVELS } from "../../timeline";
import type { TakeStyle } from "./timing";

const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

/** rms を秒 sec で線形補間 */
const sampler = (r: number[]) => (sec: number) => {
  const x = sec * FPS;
  const i = Math.floor(x);
  if (i < 0 || i >= r.length) return 0;
  const a = r[i];
  const b = r[Math.min(r.length - 1, i + 1)];
  return a + (b - a) * (x - i);
};

/** 前後 w フレームの三角窓でならした rms */
const smooth = (r: number[], w: number) =>
  r.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = i - w; j <= i + w; j++) {
      if (j < 0 || j >= r.length) continue;
      const k = 1 - Math.abs(j - i) / (w + 1);
      s += r[j] * k;
      c += k;
    }
    return c ? s / c : 0;
  });

const pts = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * 録音されたクリップの中身。elapsed 秒ぶんだけ描く（録音中は右端がプレイヘッド）。
 * width はクリップ全体（= 行の長さ × pps）。
 */
export const TakeWave: React.FC<{
  id: string;
  kind: TakeStyle;
  width: number;
  height: number;
  elapsed: number;
  pps: number;
  color?: string;
  /** 0〜1: 残さなかったテイクを沈める */
  dim?: number;
}> = ({ id, kind, width, height, elapsed, pps, color = C.mint, dim = 0 }) => {
  const r = rmsOf(id);
  const cy = height / 2;
  const half = height / 2 - 2;
  const shown = Math.min(width, elapsed * pps);
  const els: React.ReactNode[] = [];

  if (kind === "sleepy") {
    // 低くならした雲。時間とともに中心が少し沈み、振れ幅もしぼむ（うとうと）
    const sm = sampler(smooth(r, 5));
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    for (let x = 0; x <= shown; x += 3) {
      const u = x / Math.max(1, width);
      const sag = 6 * u;
      const v = Math.pow(sm(x / pps), 0.75) * 0.82 * half * (1 - 0.3 * u) + 2;
      top.push([x, cy + sag - v]);
      bot.unshift([x, cy + sag + v]);
    }
    if (top.length > 1) {
      els.push(<polygon key="cloud" points={pts([...top, ...bot])} fill={color} opacity={0.26} />);
      els.push(
        <polyline key="edge" points={pts(top)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />,
      );
      els.push(
        <polyline key="edgeB" points={pts(bot)} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" opacity={0.45} />,
      );
    }
  } else if (kind === "excited") {
    // 弾ける: 太く背の高いスパイク。強いところには上下に粒
    const raw = sampler(r);
    for (let j = 0, x = 4; x <= shown; j++, x += 10) {
      let v = 0;
      for (let d = -4; d <= 4; d += 2) v = Math.max(v, raw((x + d) / pps)); // 短い破裂を取りこぼさない
      v = Math.pow(v, 0.9);
      const hh = Math.max(2.5, v * half);
      els.push(<rect key={j} x={x - 2.75} y={cy - hh} width={5.5} height={hh * 2} rx={2.75} fill={color} />);
      if (v > 0.62) {
        const g = 5 + 3 * (v - 0.62) * 10;
        els.push(<circle key={`a${j}`} cx={x} cy={cy - hh - g} r={2.6} fill={color} />);
        els.push(<circle key={`b${j}`} cx={x} cy={cy + hh + g} r={2.6} fill={color} />);
      }
    }
  } else {
    // こらえる: 点線の「ふた」で頭を押さえ（ソフトクリップ）、細かく震える（決まった周期の揺れ。乱数は使わない）
    const env = sampler(smooth(r, 1));
    const lid = half * 0.5;
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    for (let x = 0; x <= shown; x += 2) {
      const sec = x / pps;
      const y = Math.pow(env(sec), 0.7) * half;
      const held = lid * Math.tanh(y / lid);
      const tremble = 0.8 + 0.2 * Math.sin(2 * Math.PI * 7 * sec);
      const v = Math.max(1, held * tremble);
      top.push([x, cy - v]);
      bot.unshift([x, cy + v]);
      if (x % 4 === 0 && v > 1.5) {
        els.push(<line key={`h${x}`} x1={x} x2={x} y1={cy - v} y2={cy + v} stroke={color} strokeWidth={1.2} opacity={0.5} />);
      }
    }
    if (top.length > 1) {
      els.push(
        <polyline key="t" points={pts(top)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />,
        <polyline key="b" points={pts(bot)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />,
      );
    }
    // ふた（押さえている上限）
    [-1, 1].forEach((s) =>
      els.push(
        <line
          key={`lid${s}`}
          x1={0}
          x2={Math.max(0, shown)}
          y1={cy + s * (lid + 3)}
          y2={cy + s * (lid + 3)}
          stroke={C.text}
          strokeWidth={1.2}
          strokeDasharray="3 5"
          opacity={0.45}
        />,
      ),
    );
  }

  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: 1 - 0.55 * dim }}>
      {els}
    </svg>
  );
};
