// TRACK 05 のタイミング。
// 秒は直書きしない: すべてナレーションの行（と、その行の実際の声の区切り）とシーン境界から計算する。
// 声を差し替えて長さや間が変わっても、ここで求めた時刻に演出が合い直す。
import { FPS } from "../../theme";
import { LEVELS, line, sceneEnter, sceneExit } from "../../timeline";
import { mix } from "../../time";

export const E = sceneEnter("t5");
export const X = sceneExit("t5");
export const L1 = line("t5-1");
export const L2 = line("t5-2");
export const L3 = line("t5-3");

const THR = 0.06;

/** 行の中で実際に声が出ている範囲（絶対秒） */
export const voiced = (id: string) => {
  const l = line(id);
  const r = LEVELS.lines[id]?.rms ?? [];
  const first = r.findIndex((v) => v >= THR);
  if (first < 0) return { a: l.start, b: l.end };
  let last = r.length - 1;
  while (last > first && r[last] < THR) last--;
  return { a: l.start + first / FPS, b: l.start + (last + 1) / FPS };
};

export type Span = { start: number; end: number };

/**
 * 行 id を fracs.length + 1 個のフレーズに分ける（T2 の phrases と同じ考え方）。
 * fracs[i] は i 番目の切れ目が「行のだいたいどのあたりか」（0〜1）。
 * その ±20% の範囲にある 4 フレーム以上の無音のうち、いちばん長いものを切れ目にする。見つからなければ割合で切る。
 */
export const phrases = (id: string, fracs: number[]): Span[] => {
  const l = line(id);
  const rms = LEVELS.lines[id]?.rms ?? [];
  const n = rms.length;
  const runs: { a: number; b: number }[] = [];
  const first = rms.findIndex((v) => v >= THR);
  let last = n - 1;
  while (last >= 0 && rms[last] < THR) last--;
  if (first >= 0) {
    let i = first;
    while (i <= last) {
      if (rms[i] < THR) {
        let j = i;
        while (j + 1 <= last && rms[j + 1] < THR) j++;
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
  cuts.forEach((c, i) => out.push({ start: l.start + (i === 0 ? 0 : cuts[i - 1].b), end: l.start + c.a }));
  out.push({ start: l.start + (cuts.length ? cuts[cuts.length - 1].b : 0), end: l.end });
  return out;
};

// t5-1「最後は、|放送に出す前のチェック。」
const V1 = voiced("t5-1");
const P1 = phrases("t5-1", [0.3]);
// t5-2「出てくる音声には、|耳では聞こえない電子透かし|「SynthID」が必ず入ります。」
export const V2 = voiced("t5-2");
const P2 = phrases("t5-2", [0.24, 0.62]);
// t5-3「声をまねるときは、|持ち主本人の|“声での同意”がいります。」
export const V3 = voiced("t5-3");
const P3 = phrases("t5-3", [0.3, 0.65]);

const HEAD_IN = E + 0.08;
const SHEET_IN = E + 0.3; // テープが抜けていくのに合わせて
const LAMP_IN = Math.max(SHEET_IN + 0.5, P1[1].start); // 「放送に」
// 「チェック」: 後半の句「ほうそうにだすまえの|チェック」の文字数の割合
const CUE = Math.max(LAMP_IN + 0.35, mix(P1[1].start, V1.b, 14 / 20));

const OPEN1 = L2.start - 0.38; // 行 01 が開く（声の少し前から）
const PRINT_A = Math.max(OPEN1 + 0.25, V2.a); // 「出てくる音声には」: 出力の波形が刷られていく
const SCAN_A = Math.max(PRINT_A + 0.6, P2[1].start); // 「耳では聞こえない」: スキャン開始
const FOUND = Math.max(SCAN_A + 0.9, P2[2].start); // 「SynthID」: 隠れていた模様の正体が出る
const PRINT_B = Math.min(SCAN_A - 0.05, PRINT_A + 1.1);
// 「必ず入ります」: 後半の句「シンスアイディーが|かならずはいります」の真ん中あたり
const STAMP1 = Math.min(V2.b - 0.1, Math.max(FOUND + 0.45, mix(P2[2].start, V2.b, 0.5)));

const SWAP = Math.max(STAMP1 + 0.5, L3.start - 0.38); // 行 01 が閉じて行 02 が開く
const USE_A = Math.max(SWAP + 0.3, V3.a + 0.1); // 「声をまねるときは」: 用途欄に VOICE CLONE
const REC_A = Math.max(USE_A + 0.6, P3[1].start); // 「持ち主本人の」: 署名欄で録音が始まる
// 「声での同意」を言い終えるところ（後半の句「こえでのどうい|がいります」の 7/12）で判子
// 声の終わりより少し前に締め、テープが来る前に READY FOR AIR が見えている時間を残す
const STAMP2 = Math.min(V3.b - 0.35, Math.max(REC_A + 1.0, mix(P3[2].start, V3.b, 7 / 12)));
const LAMP_ON = STAMP2 + 0.16; // READY FOR AIR が点く

export const TM = {
  headIn: HEAD_IN,
  sheetIn: SHEET_IN,
  rowsIn: SHEET_IN + 0.22,
  lampIn: LAMP_IN,
  cue: CUE,
  open1: OPEN1,
  printA: PRINT_A,
  printB: PRINT_B,
  scanA: SCAN_A,
  found: FOUND,
  stamp1: STAMP1,
  swap: SWAP,
  useA: USE_A,
  recA: REC_A,
  recB: STAMP2 - 0.06,
  stamp2: STAMP2,
  lampOn: LAMP_ON,
};
