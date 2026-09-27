// 行の中の「フレーズ（読点で区切られたまとまり）」の時刻を、実際の音声の無音区間から求める。
// 声を差し替えても、ここで求めた時刻に演出が合い直す。無音が見つからなければ割合で切る。
// （Open/timing.ts と同じ考え方。シーン間の依存を避けるため TRACK 03 用に持つ）
import { FPS } from "../../theme";
import { LEVELS, line } from "../../timeline";

export type Span = { start: number; end: number; dur: number };

const span = (start: number, end: number): Span => ({ start, end, dur: Math.max(0.05, end - start) });

/**
 * 行 id を fracs.length + 1 個のフレーズに分ける。
 * fracs[i] は i 番目の切れ目が「行のだいたいどのあたりか」（0〜1）。
 * その ±20% の範囲にある 4 フレーム以上の無音のうち、一番長いものを切れ目にする。
 */
export const phrases = (id: string, fracs: number[]): Span[] => {
  const l = line(id);
  const rms = LEVELS.lines[id]?.rms ?? [];
  const n = rms.length;
  const thr = 0.06;
  const runs: { a: number; b: number }[] = [];
  const first = rms.findIndex((v) => v >= thr);
  let last = n - 1;
  while (last >= 0 && rms[last] < thr) last--;
  if (first >= 0) {
    let i = first;
    while (i <= last) {
      if (rms[i] < thr) {
        let j = i;
        while (j + 1 <= last && rms[j + 1] < thr) j++;
        runs.push({ a: i, b: j });
        i = j + 1;
      } else i++;
    }
  }
  const cuts: { a: number; b: number }[] = [];
  let prev = 0;
  fracs.forEach((f) => {
    const best = runs
      .filter((r) => r.b - r.a + 1 >= 4 && r.a / FPS > prev && Math.abs((r.a + r.b + 1) / 2 / Math.max(1, n) - f) <= 0.2)
      .sort((x, y) => y.b - y.a - (x.b - x.a))[0];
    if (best) {
      cuts.push({ a: best.a / FPS, b: (best.b + 1) / FPS });
      prev = (best.b + 1) / FPS;
    } else {
      const s = Math.max(prev + 0.1, f * l.dur);
      cuts.push({ a: s - 0.05, b: s + 0.05 });
      prev = s + 0.05;
    }
  });
  const out: Span[] = [];
  cuts.forEach((c, i) => out.push(span(l.start + (i === 0 ? 0 : cuts[i - 1].b), l.start + c.a)));
  out.push(span(l.start + (cuts.length ? cuts[cuts.length - 1].b : 0), l.end));
  return out;
};
