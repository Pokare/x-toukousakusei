// TRACK 02 専用: 行の音声レベル（LEVELS）から「録音されたクリップ」の波形を描く部品と、
// 行の中のフレーズの区切り（無音の切れ目）を音声から見つける関数。
import React from "react";
import { C, FPS } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { rand } from "../../time";

const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

/**
 * 行 id の音声を、長い無音でいくつかのフレーズに分けたときの各フレーズの話し始め（絶対秒）。
 * n 個のフレーズに分けるために、いちばん長い無音 n-1 か所で切る。
 * 声を差し替えても間の位置から自動で合う。見つからなければ fallback（行内の割合）を使う。
 */
export const phraseStarts = (id: string, n: number, fallback: number[]): number[] => {
  const l = line(id);
  const r = rmsOf(id);
  const thr = 0.06;
  const minRun = 4; // 0.13 秒以上の無音だけを区切りとみなす
  const first = r.findIndex((v) => v >= thr);
  const fb = fallback.map((f) => l.start + l.dur * f);
  if (first < 0) return fb;
  const runs: { a: number; b: number }[] = [];
  let s = -1;
  for (let k = first; k <= r.length; k++) {
    const silent = k === r.length || r[k] < thr;
    if (silent && s < 0) s = k;
    if (!silent && s >= 0) {
      if (k - s >= minRun) runs.push({ a: s, b: k });
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

/** rms を秒 sec で線形補間 */
const sampler = (r: number[]) => (sec: number) => {
  const x = sec * FPS;
  const i = Math.floor(x);
  if (i < 0 || i >= r.length) return 0;
  const a = r[i];
  const b = r[Math.min(r.length - 1, i + 1)];
  return a + (b - a) * (x - i);
};

/** 前後 w フレームの平均でならした rms */
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

/** 声が止まってもゆっくり減衰する包絡線（ため息の「尾」） */
const decay = (r: number[], keep: number) => {
  const out: number[] = [];
  let e = 0;
  r.forEach((v) => {
    e = Math.max(v, e * keep);
    out.push(e);
  });
  return out;
};

export type ClipStyle = "whisper" | "laugh" | "sigh";

/**
 * 録音されたクリップの中身。elapsed 秒ぶんだけ描く（録音中は右端がプレイヘッド）。
 * - whisper: ふわっとした低い雲 + 細い息の毛羽（静かで息っぽい）
 * - laugh:   ピークを強調した鋭いスパイク（弾ける）
 * - sigh:    声が止まっても長く尾を引く包絡線（減衰）
 * どれも実際の音声レベルから描く。
 */
export const ClipWave: React.FC<{
  id: string;
  kind: ClipStyle;
  width: number; // クリップ全体の幅（= 行の長さ × pps）
  height: number;
  elapsed: number; // 録音済みの秒数
  pps: number;
  color?: string;
  fresh?: number; // 録音中の先端のにじみ（0〜1）
}> = ({ id, kind, width, height, elapsed, pps, color = C.coral, fresh = 0 }) => {
  const r = rmsOf(id);
  const cy = height / 2;
  const half = height / 2 - 3;
  const shown = Math.min(width, elapsed * pps);
  const els: React.ReactNode[] = [];
  const gid = `t2clip-${id}`;

  if (kind === "whisper") {
    // 静かで息っぽい: 低く柔らかい雲 + ノイズのような細い毛羽
    const sm = sampler(smooth(r, 4));
    const raw = sampler(r);
    const top: string[] = [];
    const bot: string[] = [];
    for (let x = 0; x <= shown; x += 3) {
      const v = Math.pow(sm(x / pps), 0.7) * 0.7 * half + 2;
      top.push(`${x.toFixed(1)},${(cy - v).toFixed(1)}`);
      bot.unshift(`${x.toFixed(1)},${(cy + v).toFixed(1)}`);
    }
    if (top.length > 1) {
      els.push(<polygon key="cloud" points={[...top, ...bot].join(" ")} fill={color} opacity={0.3} />);
    }
    for (let j = 0, x = 1; x <= shown; j++, x += 4) {
      const v = Math.pow(raw(x / pps), 0.7);
      const air = 0.35 + 0.65 * rand(j * 3.7 + 1.3);
      const hh = Math.max(1.2, v * 0.8 * half * air);
      els.push(<rect key={j} x={x - 0.75} y={cy - hh} width={1.5} height={hh * 2} rx={0.75} fill={color} opacity={0.45 + 0.4 * air} />);
    }
  } else if (kind === "laugh") {
    // 弾ける: 太く鋭いスパイク。強いところには上下に粒
    const raw = sampler(r);
    for (let j = 0, x = 4; x <= shown; j++, x += 10) {
      // 棒の幅のあいだの最大値（短い破裂を取りこぼさない）
      let v = 0;
      for (let d = -4; d <= 4; d += 2) v = Math.max(v, raw((x + d) / pps));
      v = Math.pow(v, 1.25);
      const hh = Math.max(2.5, v * half);
      els.push(<rect key={j} x={x - 3} y={cy - hh} width={6} height={hh * 2} rx={3} fill={color} />);
      if (v > 0.5) {
        els.push(<circle key={`c${j}`} cx={x} cy={cy - hh - 6} r={2.8} fill={color} />);
        els.push(<circle key={`d${j}`} cx={x} cy={cy + hh + 6} r={2.8} fill={color} />);
      }
    }
  } else {
    // 長く減衰する: 声が止まってもゆっくり尾を引く包絡線
    const env = sampler(decay(smooth(r, 1), 0.955));
    const raw = sampler(r);
    const top: string[] = [];
    const bot: string[] = [];
    for (let x = 0; x <= shown; x += 3) {
      const v = Math.pow(env(x / pps), 0.75) * 0.94 * half + 1.5;
      top.push(`${x.toFixed(1)},${(cy - v).toFixed(1)}`);
      bot.unshift(`${x.toFixed(1)},${(cy + v).toFixed(1)}`);
    }
    if (top.length > 1) {
      els.push(
        <defs key="defs">
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.62} />
            <stop offset="50%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.62} />
          </linearGradient>
        </defs>,
      );
      els.push(<polygon key="env" points={[...top, ...bot].join(" ")} fill={`url(#${gid})`} />);
      els.push(<polyline key="edgeT" points={top.join(" ")} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />);
      els.push(
        <polyline key="edgeB" points={bot.join(" ")} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />,
      );
    }
    for (let j = 0, x = 2; x <= shown; j++, x += 6) {
      const hh = Math.max(0, Math.pow(raw(x / pps), 0.75) * 0.8 * half);
      if (hh < 1) continue;
      els.push(<rect key={j} x={x - 1} y={cy - hh} width={2} height={hh * 2} rx={1} fill={C.text} opacity={0.4} />);
    }
  }

  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {els}
      {fresh > 0 && shown > 0 && (
        <rect x={Math.max(0, shown - 40)} y={0} width={Math.min(40, shown)} height={height} fill={`url(#${gid}-fresh)`} opacity={fresh} />
      )}
      <defs>
        <linearGradient id={`${gid}-fresh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="100%" stopColor={color} stopOpacity={0.35} />
        </linearGradient>
      </defs>
    </svg>
  );
};
