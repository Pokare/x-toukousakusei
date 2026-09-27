// TRACK 02 のタイミングと台本データ。
// 秒は直書きしない: すべてナレーションの行（と、その行の実際の声の区切り）から計算する。
// 声を差し替えて長さや間が変わっても、ここで求めた時刻に演出が合い直す。
import { FPS, VOICE_TAG } from "../../theme";
import { LEVELS, line, sceneEnter, sceneExit } from "../../timeline";
import { mix } from "../../time";

export const E = sceneEnter("t2");
export const X = sceneExit("t2");
export const L1 = line("t2-1");
export const L5 = line("t2-5");

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
 * 行 id を fracs.length + 1 個のフレーズに分ける（T3 の phrases と同じ考え方）。
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

// ───────── t2-1「同じセリフでも、|ト書きひとつで|芝居が変わります。」 ─────────
const V1 = voiced("t2-1");
const S1 = phrases("t2-1", [0.36]);
/** 「同じセリフでも」: 台本のセリフが入る */
export const T_LINE = V1.a;
/** 「ト書きひとつで」: セリフの前のト書き欄（空のカッコ）が開く */
export const T_SLOT = Math.max(T_LINE + 0.6, S1[1].start);
/** 「芝居が変わります」: 3 本のテイクレーンにカチンコが並ぶ（後半の句の文字数の割合で位置を取る） */
export const T_LANES = Math.max(T_SLOT + 0.45, mix(S1[1].start, V1.b, 7 / 16));

// ───────── 台本のセリフ（3 テイクとも同じ。ト書きだけが変わる） ─────────
const FALLBACK_LINE = "おつかれさま。今日も、よくがんばったね。";
export const DIALOGUE = line("t2-2").text || FALLBACK_LINE;
export const DCHARS = [...DIALOGUE];

// ───────── 3 テイク ─────────
export type TakeStyle = "sleepy" | "excited" | "holding";
const FALLBACK_DIR = ["眠そうに", "はしゃいで", "泣くのをこらえて"];
/** 字幕の札（theme の VOICE_TAG「TAKE 1 · 眠そうに」）からト書きを取る。なければ既定 */
const dirOf = (id: string, i: number) => {
  const tag = VOICE_TAG[line(id).voice]?.label ?? "";
  const k = tag.indexOf("·");
  const d = k >= 0 ? tag.slice(k + 1).trim() : "";
  return d || FALLBACK_DIR[i];
};

const TAKE_DEFS: { id: string; style: TakeStyle }[] = [
  { id: "t2-2", style: "sleepy" },
  { id: "t2-3", style: "excited" },
  { id: "t2-4", style: "holding" },
];

export const TAKES = TAKE_DEFS.map((d, i) => {
  const L = line(d.id);
  const prev = i > 0 ? line(TAKE_DEFS[i - 1].id) : null;
  const dir = dirOf(d.id, i);
  const n = [...dir].length;
  // ト書きの書き換え: 前のテイクの言い終わりで古いト書きに線を引き、次のテイクの頭までに新しいト書きを書く。
  // 1 本目は t2-1 の言い終わり際（「芝居が変わります」のあと）に空欄へ書く。
  const strikeA = prev ? prev.end - 0.18 : 0;
  const strikeB = prev ? prev.end - 0.03 : 0;
  const typeA = prev ? prev.end + 0.1 : Math.max(T_LANES + 0.75, L1.end - 0.4);
  const typeB = Math.max(typeA + 0.045 * n, L.start + (prev ? 0.06 : -0.12));
  const charAt = (k: number) => mix(typeA, typeB, n > 1 ? k / (n - 1) : 0);
  // カチンコ: 声の出だしの直前に閉じる
  const clap = L.start - 0.05;
  return { ...d, i, n: i + 1, L, dir, strikeA, strikeB, typeA, typeB, charAt, clap };
});
export type Take = (typeof TAKES)[number];
export const LAST_TAKE = TAKES[TAKES.length - 1];

// ───────── t2-5「息をのむ音や|笑い声まで、|ト書きに書けば入ります。」 ─────────
const V5 = voiced("t2-5");
const S5 = phrases("t2-5", [0.5]);
/** セリフの中に書き足す短いト書き（息をのむ音 → 笑い声の順。ナレーションの言う順番） */
const firstStop = DCHARS.indexOf("。");
const INS_DEFS = [
  { text: "（息をのむ）", after: firstStop >= 0 ? firstStop + 1 : Math.floor(DCHARS.length / 2) },
  { text: "（ふふっ）", after: DCHARS.length },
];
const insT = [V5.a, Math.max(V5.a + 0.55, mix(V5.a, S5[0].end, 0.5))];
export const INSERTS = INS_DEFS.map((d, k) => {
  const chars = [...d.text];
  const open = insT[k] + 0.02; // 行が割れて場所が空く
  const typeA = open + 0.14;
  const typeB = typeA + 0.06 * (chars.length - 1);
  return { ...d, k, chars, open, typeA, typeB, charAt: (j: number) => mix(typeA, typeB, j / Math.max(1, chars.length - 1)) };
});

/** 「ト書きに書けば入ります」: 残すテイクに丸をつけ、KEEP の判子を押す */
const T_KEEP = Math.max(INSERTS[1].typeB + 0.2, S5[1].start);
export const KEEP_TAKE = 2; // 3 本目（泣くのをこらえて）を残す
export const CIRCLE = { a: T_KEEP + 0.08, b: T_KEEP + 0.5 };
export const STAMP = Math.min(L5.end - 0.3, Math.max(CIRCLE.b + 0.05, mix(T_KEEP, V5.b, 0.55)));
