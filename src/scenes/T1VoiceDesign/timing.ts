// TRACK 01 のタイミングと、テープに書く注文文・読みとりコントロールのデータ。
// 秒は直書きしない: すべてナレーションの行（と、その行の実際の声の区切り）から計算する。
import { FPS } from "../../theme";
import { LEVELS, line, sceneEnter, sceneExit } from "../../timeline";
import { mix } from "../../time";

export const E = sceneEnter("t1");
export const X = sceneExit("t1");
export const L1 = line("t1-1");
export const L2 = line("t1-2");
export const L3 = line("t1-3");
export const L4 = line("t1-4");
export const L5 = line("t1-5");
export const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);

// ───────── 声の区切り ─────────
const THR = 0.06;
type Run = { a: number; b: number }; // フレーム [a, b)

/** 行の中の無音区間（minRun フレーム以上、声が始まってから終わるまでの間だけ） */
const silences = (id: string, minRun = 4): Run[] => {
  const r = LEVELS.lines[id]?.rms ?? [];
  const first = r.findIndex((v) => v >= THR);
  if (first < 0) return [];
  let last = first;
  for (let k = r.length - 1; k >= 0; k--)
    if (r[k] >= THR) {
      last = k;
      break;
    }
  const out: Run[] = [];
  let s = -1;
  for (let k = first; k <= last + 1; k++) {
    const quiet = k > last || r[k] < THR;
    if (quiet && s < 0) s = k;
    if (!quiet && s >= 0) {
      if (k - s >= minRun) out.push({ a: s, b: k });
      s = -1;
    }
  }
  return out;
};

/** 行の中で実際に声が出ている範囲（絶対秒） */
export const voiced = (id: string) => {
  const l = line(id);
  const r = LEVELS.lines[id]?.rms ?? [];
  const first = r.findIndex((v) => v >= THR);
  if (first < 0) return { a: l.start, b: l.end };
  let last = first;
  for (let k = r.length - 1; k >= 0; k--)
    if (r[k] >= THR) {
      last = k;
      break;
    }
  return { a: l.start + first / FPS, b: l.start + (last + 1) / FPS };
};

/**
 * 行の中の「いちばん長い息つぎ」を、行の [lo, hi] の割合の範囲から探す。
 * 返り値: { pause: 息つぎの始まり（前の句の言い終わり）, resume: 次の句の話し始め }（絶対秒）
 * 見つからなければ fb（行の割合）の位置に幅 0 の区切りを置く。
 */
const cutIn = (id: string, lo: number, hi: number, fb: number) => {
  const l = line(id);
  const n = LEVELS.lines[id]?.rms.length ?? 0;
  const cands = silences(id).filter((s) => n > 0 && s.a / n >= lo && s.a / n <= hi);
  if (!cands.length) {
    const x = at(l, fb);
    return { pause: x, resume: x };
  }
  const best = cands.reduce((p, q) => (q.b - q.a > p.b - p.a ? q : p));
  return { pause: l.start + best.a / FPS, resume: l.start + best.b / FPS };
};

// t1-1「まずは、|声そのものを注文してみます。」
const C1 = cutIn("t1-1", 0.05, 0.6, 0.3);
const V1 = voiced("t1-1");
// t1-2「注文を文章で書けば、|スタジオに声優がひとり増えます。」
const C2 = cutIn("t1-2", 0.2, 0.7, 0.45);
const V2 = voiced("t1-2");
// t1-5「この“声をつくる力”は、|Hume AIの評価で71.4点。|全体のトップです。」
const C5b = cutIn("t1-5", 0.55, 0.95, 0.78); // 「。」の息つぎ → 全体のトップ
const C5a = cutIn("t1-5", 0.15, Math.max(0.2, (C5b.pause - L5.start) / L5.dur - 0.12), 0.34); // 「、」→ Hume AI
const C5o = cutIn("t1-5", 0, 0.22, 0.1); // 「この“|声をつくる力”は」
const V5 = voiced("t1-5");

// ───────── テープに書く注文文（t1-3 の「」の中身をそのまま使う） ─────────
const FALLBACK = "ハスキーで少しけだるい、深夜のバーのマスター";
export const PROMPT = (() => {
  const m = L3.text.match(/「([^」]+)」/);
  return m ? m[1] : FALLBACK;
})();
export const PCHARS = [...PROMPT];
export const N_CHARS = PCHARS.length;

/**
 * 文字が書かれる時刻。声のある区間だけに文字を割り振るので、ナレーターが息つぎで黙っている間は筆も止まる。
 * 行頭の短い前置き（「たとえば」）のあとにはっきりした間があれば、その前置きの間は書かない。
 * 声のデータがない / 区切りが取れない場合は行の 15%〜90% に等間隔。
 */
const speechCharTimes = (id: string, n: number): number[] => {
  const l = line(id);
  const fallback = () => Array.from({ length: n }, (_, i) => mix(at(l, 0.15), at(l, 0.9), n > 1 ? i / (n - 1) : 0));
  const lv = LEVELS.lines[id];
  if (!lv || n === 0) return fallback();
  const r = lv.rms;
  const runs: Run[] = [];
  r.forEach((x, f) => {
    if (x <= 0.08) return;
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
export const TYPE_A = CHAR_TIMES[0];
export const TYPE_B = CHAR_TIMES[N_CHARS - 1];

// ───────── 読みとりコントロール（注文のことばごとに 1 つ） ─────────
// これは「モデルの設定値」ではなく、コンソールが注文文を読みとって示す特徴の表示（数値は出さない）。
export type CtlKind = "knob" | "fader" | "room" | "cast";
export type Ctl = { kw: string; label: string; kind: CtlKind; lo: string; hi: string; v: number };

const SET: Ctl[] = [
  { kw: "ハスキー", label: "GRIT", kind: "knob", lo: "CLEAN", hi: "HUSKY", v: 0.84 }, // 上がる
  { kw: "けだるい", label: "PACE", kind: "fader", lo: "LAZY", hi: "BRISK", v: 0.2 }, // 下がる
  { kw: "深夜のバー", label: "ROOM", kind: "room", lo: "SMALL", hi: "DIM", v: 1 }, // 狭く・暗く
  { kw: "マスター", label: "CAST", kind: "cast", lo: "OPEN", hi: "BAR MASTER", v: 1 }, // 空席に入る
];

/** 各コントロール: 注文文中の位置（文字 index）と、そのことばが書き終わる時刻。並びは画面の左→右 */
export const CONTROLS = SET.map((c, i) => {
  const u = PROMPT.indexOf(c.kw);
  const first = u >= 0 ? [...PROMPT.slice(0, u)].length : -1;
  const last = u >= 0 ? first + [...c.kw].length - 1 : -1;
  const done = last >= 0 ? CHAR_TIMES[last] + 0.06 : mix(TYPE_A, TYPE_B, (i + 1) / SET.length);
  return { ...c, first, last, done };
});

// ───────── 拍（ナレーションの行とその区切りから） ─────────
const p2Len = Math.max(0.6, V2.b - C2.resume);
// 点数の札: 「Hume AIの評価で」で回りはじめ、「71.4点」の言い終わりで止まる（「全体の」より前に必ず止める）
const FILL_B = Math.min(Math.max(C5a.resume + 0.9, C5b.pause - 0.22), C5b.resume - 0.05);
const FILL_A = Math.min(C5a.resume, FILL_B - 0.6);
const castLand = CONTROLS[3].done + 0.18;
export const TM = {
  headIn: E + 0.08,
  signIn: E + 0.45,
  consoleIn: C1.resume - 0.12, // 「声そのものを」: 空のチャンネルが立ち上がる
  tapeIn: mix(C1.resume, V1.b, 0.42) - 0.12, // 「注文」: 注文票のテープが貼られる
  grow: mix(L2.start, C2.pause, 0.3) - 0.15, // チャンネルが下へ伸びる
  modIn: mix(L2.start, C2.pause, 0.3), // 「文章で書けば」: 読みとりモジュールが 1 つずつ
  hwIn: C2.resume - 0.05, // 「スタジオに」: モニター（VU・スコープ）が、まだ消灯のまま並ぶ
  castIn: C2.resume + p2Len * 0.24, // 「声優が」: 空いた CAST の席
  castPlus: C2.resume + p2Len * 0.5, // 「ひとり増えます」: +1
  write: L3.start + 0.04, // 「たとえば」: テープにペン先（キャレット）が立つ
  typeA: TYPE_A,
  typeB: TYPE_B,
  castLand,
  warm: Math.max(TYPE_B + 0.1, L4.start - 0.45), // 書き終わり → メーターの照明が入る
  onAir: L4.start - 0.04,
  offAir: L4.end + 0.2,
  consoleOut: L4.end + 0.08, // チャンネルは下へ抜ける
  boardIn: Math.max(L4.end + 0.3, L5.start - 0.12), // 評価ボード
  nameA: Math.max(L4.end + 0.5, L5.start + 0.08), // 「この」: 名前の札がめくれる
  ability: Math.max(L5.start + 0.3, C5o.resume), // 「声をつくる力」: SCORE の見出しが灯る
  fillA: FILL_A, // 「Hume AIの評価で」: 点数の札が回りはじめる
  fillB: FILL_B, // 「71.4点」: 止まる
  overall: C5b.resume, // 「全体の」: OVERALL 点灯
  rank: C5b.resume + Math.max(0.3, (V5.b - C5b.resume) * 0.4), // 「トップ」: 1
  exit: X,
};
