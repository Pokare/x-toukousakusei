// TRACK 04 専用の小物: フレーズ検出、色の補間、テープカウンター風の数字、棚のテープ、LED ウォール、言語チューナー
import React from "react";
import { C, DISPLAY, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { clamp01, rand } from "../../time";

// ───────── 音声から行内のフレーズの区切りを見つける ─────────
const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

/**
 * 行 id を、いちばん長い無音 n-1 か所で n 個のフレーズに分けたときの各フレーズの話し始め（絶対秒）。
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
      if (k - s >= minRun && k < r.length) runs.push({ a: s, b: k });
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

// ───────── 色 ─────────
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const lerpColor = (a: string, b: string, p: number) => {
  const A = hex(a);
  const B = hex(b);
  const q = clamp01(p);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(",")})`;
};

// ───────── テープカウンター風の数字（桁幅固定・頭のゼロは暗く） ─────────
// Dela Gothic One の数字の送り幅（em）。数えている間は全桁を同じ箱に入れて揺れを防ぎ、
// 止まったら（tighten=1）本来の字幅に詰める。
const ADV: Record<string, number> = {
  "0": 0.917, "1": 0.588, "2": 0.835, "3": 0.881, "4": 0.924,
  "5": 0.884, "6": 0.856, "7": 0.777, "8": 0.876, "9": 0.856,
};
export const DIGIT_EM = 0.95;
export const COMMA_EM = 0.3;

export const TapeCounter: React.FC<{
  value: number;
  digits: number;
  /** 何桁目の前にカンマを入れるか（右から数えた桁数。0 ならなし） */
  commaAt?: number;
  size: number;
  color: string;
  zeroColor?: string;
  /** 「+」の出方 0〜1（ばねの値をそのまま渡してよい） */
  plus?: number;
  /** 0〜1: 固定幅の箱 → 本来の字幅に詰める */
  tighten?: number;
  glow?: number;
}> = ({ value, digits, commaAt = 0, size, color, zeroColor = "#262B35", plus = 0, tighten = 0, glow = 0 }) => {
  const v = Math.max(0, Math.round(value));
  const s = String(v).padStart(digits, "0");
  const firstSig = v === 0 ? digits : digits - String(v).length; // 0 のときは全桁を暗く
  const chars: React.ReactNode[] = [];
  [...s].forEach((ch, i) => {
    const fromRight = digits - i;
    const lit = i >= firstSig;
    // 暗い頭のゼロは詰めるときに幅 0 へ消える
    const tight = lit ? (ADV[ch] ?? DIGIT_EM) + 0.035 : 0;
    const w = DIGIT_EM + (tight - DIGIT_EM) * tighten;
    chars.push(
      <span
        key={`d${i}`}
        style={{
          display: "inline-flex",
          justifyContent: "center",
          width: `${w}em`,
          overflow: "visible",
          color: lit ? color : zeroColor,
          opacity: lit ? 1 : 1 - tighten,
          textShadow: lit && glow > 0 ? `0 0 ${Math.round(46 * glow)}px ${color}66` : undefined,
        }}
      >
        {ch}
      </span>,
    );
    if (commaAt > 0 && fromRight === commaAt + 1) {
      const litC = i + 1 > firstSig;
      const wc = COMMA_EM + ((litC ? 0.3 : 0) - COMMA_EM) * tighten;
      chars.push(
        <span
          key={`c${i}`}
          style={{
            display: "inline-flex",
            justifyContent: "center",
            width: `${wc}em`,
            color: litC ? color : zeroColor,
            opacity: litC ? 1 : 1 - tighten,
            textShadow: litC && glow > 0 ? `0 0 ${Math.round(46 * glow)}px ${color}66` : undefined,
          }}
        >
          ,
        </span>,
      );
    }
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        fontFamily: DISPLAY,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {chars}
      <span
        style={{
          display: "inline-block",
          fontSize: "0.56em",
          marginLeft: "0.12em",
          marginTop: "0.02em",
          color,
          textShadow: glow > 0 ? `0 0 ${Math.round(46 * glow)}px ${color}66` : undefined,
          opacity: clamp01(plus * 2),
          transform: `scale(${plus})`,
          transformOrigin: "30% 60%",
        }}
      >
        +
      </span>
    </div>
  );
};

// ───────── 棚に並ぶテープの背（t4-1 の予告。あとで LED の 30 粒に縮む） ─────────
export const Spine: React.FC<{ w: number; h: number; seed: number }> = ({ w, h, seed }) => {
  // ケースの背: 白いラベルに縦書きのタイトル（細い線）と、下に小さな番号札
  const labTop = 6;
  const labH = h - 26;
  const title = 0.45 + rand(seed * 5.1) * 0.4;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={3} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
      <rect x={3.5} y={labTop} width={w - 7} height={labH} rx={1.5} fill={C.text} opacity={0.86} />
      <rect x={w / 2 - 1.2} y={labTop + 5} width={2.4} height={(labH - 10) * title} rx={1.2} fill={C.ink} opacity={0.55} />
      <rect x={3.5} y={h - 15} width={w - 7} height={3} rx={1} fill={C.sub} opacity={0.55} />
      <circle cx={w / 2} cy={h - 7} r={2} fill={C.sub} />
    </svg>
  );
};

// ───────── 2000 粒の LED ウォール ─────────
export const WALL = { cols: 100, rows: 20, pitchX: 10.04, pitchY: 9, cellW: 7.3, cellH: 6.2 };
export const WALL_W = WALL.cols * WALL.pitchX;
export const WALL_H = WALL.rows * WALL.pitchY;
export const SEED = 30;
export const TOTAL_VOICES = 2000;

type Cell = { c: number; r: number; x: number; y: number; rank: number };

/** 左端の中央から広がる波の順に 1〜2000 の番号をふる（中心に近い 30 粒が「以前の 30 種類」） */
export const CELLS: Cell[] = (() => {
  const ox = -WALL.pitchX * 0.5;
  const oy = WALL_H / 2;
  const raw: { c: number; r: number; x: number; y: number; key: number }[] = [];
  for (let r = 0; r < WALL.rows; r++) {
    for (let c = 0; c < WALL.cols; c++) {
      const x = c * WALL.pitchX;
      const y = r * WALL.pitchY;
      const d = Math.hypot(x + WALL.cellW / 2 - ox, y + WALL.cellH / 2 - oy);
      const jitter = d > 60 ? rand(r * 131.7 + c * 7.3) * 34 : 0;
      raw.push({ c, r, x, y, key: d + jitter });
    }
  }
  const order = raw.map((_, i) => i).sort((a, b) => raw[a].key - raw[b].key);
  const cells: Cell[] = raw.map((p) => ({ c: p.c, r: p.r, x: p.x, y: p.y, rank: 0 }));
  order.forEach((idx, k) => (cells[idx].rank = k));
  return cells;
})();

/** rank 順に並べたセル（シードの位置を引くのに使う） */
export const BY_RANK: Cell[] = [...CELLS].sort((a, b) => a.rank - b.rank);

export const LedWall: React.FC<{
  /** 0〜1: 空の LED が左から並ぶ */
  gridIn: number;
  /** シード（以前の 30）のうち、着地したもの（rank 順） */
  seedOn: boolean[];
  /** 点灯している数（30〜2000、小数可） */
  count: number;
  /** 点灯の波の先端の明るい帯の幅（rank 数） */
  flashWidth?: number;
  /** 先端の明るさ（波が止まったら 0 へ） */
  flashAmt?: number;
  /** 0〜1: 完了の光が左から右へ抜ける位置（範囲外なら無し） */
  sweep?: number;
  /** 列ごとの声の大きさ（右端が今、左へ流れる。0〜1）: 点灯した面にうっすら波形が浮かぶ */
  wave?: number[] | null;
  /** 0〜1: 波形の模様の濃さ（0 なら一様に点灯） */
  waveAmt?: number;
  dim?: number;
}> = ({ gridIn, seedOn, count, flashWidth = 160, flashAmt = 1, sweep = -1, wave, waveAmt = 1, dim = 0 }) => {
  return (
    <svg width={WALL_W} height={WALL_H} style={{ overflow: "visible", display: "block" }}>
      {CELLS.map((cell, i) => {
        const appear = clamp01((gridIn * 1.35 - cell.c / WALL.cols) / 0.35);
        if (appear <= 0) return null;
        let fill: string = C.border;
        let op = 1;
        if (cell.rank < SEED) {
          if (seedOn[cell.rank]) fill = C.text;
        } else if (cell.rank < count) {
          const f = clamp01(1 - (count - cell.rank) / flashWidth) * flashAmt;
          fill = lerpColor(C.coral, "#FFE4D6", f * f);
          // 声の波形（中央の行から上下に、その列の声の大きさぶんだけ明るい）
          op = 0.86;
          if (wave && waveAmt > 0) {
            const amp = wave[cell.c] ?? 0;
            const dist = (Math.abs(cell.r - (WALL.rows - 1) / 2) + 0.5) / (WALL.rows / 2);
            op += (0.62 + 0.38 * clamp01((amp - dist) * 5 + 0.5) - op) * waveAmt;
          }
        }
        if (sweep > -0.5) {
          const dx = cell.c / WALL.cols - sweep;
          const s = Math.exp(-(dx * dx) / 0.004);
          if (cell.rank >= SEED && cell.rank < count) {
            fill = lerpColor(C.coral, "#FFE4D6", s * 0.7);
            op = Math.max(op, 0.86 + 0.14 * s);
          }
        }
        return (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={WALL.cellW}
            height={WALL.cellH}
            rx={1.6}
            fill={fill}
            opacity={appear * op * (1 - dim)}
          />
        );
      })}
    </svg>
  );
};

// ───────── 言語チューナー ─────────
export const CODES = [
  "JA", "EN-US", "EN-GB", "ES-ES", "ES-MX", "FR-FR", "FR-CA", "PT-BR", "DE", "IT",
  "KO", "ZH-CN", "ZH-TW", "HI", "AR", "TR", "VI", "TH", "ID", "NL",
];

/** 時刻 sec に話している t4 の行の音量（0〜1）。行間は 0 */
export const rmsAtTime = (ids: string[], sec: number) => {
  for (const id of ids) {
    const l = line(id);
    if (sec < l.start || sec >= l.end) continue;
    const r = rmsOf(id);
    const k = Math.floor((sec - l.start) * FPS);
    return r[Math.max(0, Math.min(r.length - 1, k))] ?? 0;
  }
  return 0;
};

export const Chip: React.FC<{ code: string; lit: number; flash: number; live: number }> = ({ code, lit, flash, live }) => {
  const border = lit > 0 ? lerpColor(C.borderHi, C.mint, lit) : C.borderHi;
  const [lang, region] = code.split("-");
  return (
    <div
      style={{
        height: 36,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        borderRadius: 9,
        border: `1.5px solid ${border}`,
        background: lit > 0 ? `rgba(59, 227, 180, ${0.1 * lit + 0.22 * flash})` : C.panel,
        boxShadow: lit > 0 ? `0 0 ${Math.round(8 + 18 * flash + 8 * live)}px rgba(59, 227, 180, ${0.18 * lit + 0.35 * flash})` : undefined,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        transform: `scale(${1 + 0.1 * flash})`,
      }}
    >
      <span style={{ color: lit > 0 ? lerpColor(C.dim, C.text, lit) : C.dim }}>{lang}</span>
      {region && (
        <span style={{ color: lit > 0 ? lerpColor(C.dim, C.mint, lit) : C.dim, opacity: 0.95 }}>-{region}</span>
      )}
    </div>
  );
};
