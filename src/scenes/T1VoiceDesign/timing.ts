// TRACK 01 のタイミングと、テープに書く文章・読みとりコントロールのデータ。
// 秒は直書きしない: すべてナレーションの行（と、その行の実際の声の区切り）から計算する。
import { FPS } from "../../theme";
import { LEVELS, line, sceneEnter } from "../../timeline";
import { mix } from "../../time";

export const E = sceneEnter("t1");
export const L1 = line("t1-1");
export const L2 = line("t1-2");
export const L3 = line("t1-3");
export const L4 = line("t1-4");
export const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);

// ───────── テープに書く文章（t1-3 の「」の中身をそのまま使う） ─────────
const FALLBACK = "深夜ラジオの、落ち着いた低めの女性DJ";
export const PROMPT = (() => {
  const m = L3.text.match(/「([^」]+)」/);
  return m ? m[1] : FALLBACK;
})();
export const PCHARS = [...PROMPT];
export const N_CHARS = PCHARS.length;

/**
 * 文字が打たれる時刻。声のある区間だけに文字を割り振るので、ナレーターが息つぎで黙っている間は打鍵も止まる。
 * 行頭の短い前置き（「たとえば」）のあとにはっきりした間があれば、その前置きの間は打たない。
 * 声のデータがない / 区切りが取れない場合は行の 15%〜90% に等間隔。
 */
const speechCharTimes = (id: string, n: number): number[] => {
  const l = line(id);
  const fallback = () => Array.from({ length: n }, (_, i) => mix(at(l, 0.15), at(l, 0.9), n > 1 ? i / (n - 1) : 0));
  const lv = LEVELS.lines[id];
  if (!lv || n === 0) return fallback();
  const r = lv.rms;
  const voiced = r.map((x) => x > 0.08);
  // 声のある区間（8 フレーム未満のすき間はつなぐ、3 フレーム未満の区間は捨てる）
  const runs: { a: number; b: number }[] = [];
  voiced.forEach((v, f) => {
    if (!v) return;
    const last = runs[runs.length - 1];
    if (last && f - last.b < 8) last.b = f;
    else runs.push({ a: f, b: f });
  });
  const use = runs.filter((q) => q.b - q.a >= 3);
  if (use.length === 0) return fallback();
  const skipLead = use.length >= 2 && use[0].b < r.length * 0.35;
  const typed = skipLead ? use.slice(1) : use;
  const total = typed.reduce((s, q) => s + (q.b - q.a + 1), 0);
  const LEAD = 0.08; // 声よりほんの少し先に文字が出る
  return Array.from({ length: n }, (_, i) => {
    let want = (i / n) * total;
    for (const q of typed) {
      const len = q.b - q.a + 1;
      if (want < len) return l.start + (q.a + want) / FPS - LEAD;
      want -= len;
    }
    const q = typed[typed.length - 1];
    return l.start + q.b / FPS - LEAD;
  });
};

export const CHAR_TIMES = speechCharTimes("t1-3", N_CHARS);

// ───────── 読みとりコントロール（文章のことばごとに 1 つ） ─────────
// これは「モデルの設定値」ではなく、コンソールが文章を読みとって示す特徴の表示（数値は出さない）。
export type Ctl =
  | { kw: string; label: string; kind: "slider"; lo: string; hi: string; v: number }
  | { kw: string; label: string; kind: "switch"; opts: [string, string]; pick: number; role: string };

const SETS: Ctl[][] = [
  [
    { kw: "深夜ラジオ", label: "MOOD", kind: "slider", lo: "DAY", hi: "NIGHT", v: 0.84 },
    { kw: "落ち着いた", label: "TONE", kind: "slider", lo: "LIVELY", hi: "CALM", v: 0.8 },
    { kw: "低め", label: "PITCH", kind: "slider", lo: "LOW", hi: "HIGH", v: 0.27 },
    { kw: "女性DJ", label: "CAST", kind: "switch", opts: ["M", "F"], pick: 1, role: "DJ" },
  ],
  // 台本の例が差し替わったとき用（例:「ハスキーで少しけだるい、深夜のバーのマスター」）。全部見つかったときだけ使う。
  [
    { kw: "ハスキー", label: "GRIT", kind: "slider", lo: "CLEAN", hi: "HUSKY", v: 0.82 },
    { kw: "けだるい", label: "PACE", kind: "slider", lo: "BRISK", hi: "LAZY", v: 0.8 },
    { kw: "深夜", label: "MOOD", kind: "slider", lo: "DAY", hi: "NIGHT", v: 0.84 },
    { kw: "マスター", label: "CAST", kind: "switch", opts: ["M", "F"], pick: -1, role: "HOST" },
  ],
];

const SET = SETS.find((s) => s.every((c) => PROMPT.includes(c.kw))) ?? SETS[0];

export const TYPE_A = CHAR_TIMES[0];
export const TYPE_B = CHAR_TIMES[N_CHARS - 1];

/** 各コントロール: 文章中の位置（文字 index）と、そのことばが書き終わる時刻 */
export const CONTROLS = SET.map((c, i) => {
  const u = PROMPT.indexOf(c.kw);
  const first = u >= 0 ? [...PROMPT.slice(0, u)].length : -1;
  const last = u >= 0 ? first + [...c.kw].length - 1 : -1;
  const done = last >= 0 ? CHAR_TIMES[last] + 0.06 : mix(TYPE_A, TYPE_B, (i + 1) / SET.length);
  return { ...c, first, last, done };
}).sort((a, b) => a.done - b.done);

// ───────── 拍（ナレーションの行とその区切りから） ─────────
export const TM = {
  headIn: E + 0.08,
  hint: at(L1, 0.3), // 「ボイスデザイン」で TEXT → VOICE の図
  settleA: L2.start - 0.3,
  settleB: L2.start + 0.3,
  consoleIn: L2.start + 0.12, // 「ほしい声を」: コンソールが立ち上がる
  signIn: L2.start + 0.5, // 消灯した ON AIR 表示
  tapeIn: at(L2, 0.14), // 「文章で」: 空のマスキングテープが貼られる
  modIn: at(L2, 0.24), // 「書くだけで」: 読みとりモジュールが 1 つずつ
  newCh: at(L2, 0.6), // 「新しい声が作れます」: チャンネルに電源が入る（メーターの自己診断）
  write: L3.start + 0.04, // 「たとえば」: テープにペン先（キャレット）が立つ
  typeA: TYPE_A,
  typeB: TYPE_B,
  warm: Math.max(TYPE_B + 0.1, L4.start - 0.45), // 書き終わり → メーターの照明が入る
  onAir: L4.start - 0.04,
};
