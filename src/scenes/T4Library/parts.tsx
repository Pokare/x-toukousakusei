// TRACK 04 専用の小物: 色の補間、テープカウンター風の数字、棚のテープの背、LED ウォール、声のレベル
import React from "react";
import { C, DISPLAY, FPS, MONO } from "../../theme";
import { LEVELS, line } from "../../timeline";
import { clamp01, rand } from "../../time";

const rmsOf = (id: string) => LEVELS.lines[id]?.rms ?? [];

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

// ───────── 棚に並ぶテープの背（t4-1。あとで LED の 30 粒に縮む） ─────────
// ケースの背: 白いラベルに縦書きのタイトル（細い線）と、下に小さな番号札。大きさに比例して描く
export const Spine: React.FC<{ w: number; h: number; seed: number }> = ({ w, h, seed }) => {
  const inset = Math.max(3, w * 0.16);
  const labTop = inset + 2;
  const labH = h * 0.7;
  const title = 0.4 + rand(seed * 5.1) * 0.45;
  const paper = 0.6 + rand(seed * 2.7) * 0.26; // ラベルの紙の白さは 1 本ずつ少し違う
  const bar = Math.max(2.4, w * 0.13);
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={3} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
      <rect x={inset} y={labTop} width={w - inset * 2} height={labH} rx={1.5} fill={C.text} opacity={paper} />
      <rect x={w / 2 - bar / 2} y={labTop + 7} width={bar} height={(labH - 14) * title} rx={bar / 2} fill={C.ink} opacity={0.5} />
      <rect x={inset} y={labTop + labH + (h - labTop - labH) * 0.3} width={w - inset * 2} height={3} rx={1} fill={C.sub} opacity={0.55} />
      <circle cx={w / 2} cy={h - Math.max(7, (h - labTop - labH) * 0.32)} r={Math.max(2, w * 0.1)} fill={C.sub} />
    </svg>
  );
};

/** 空いた棚の区画（点線の枠） */
export const EmptySlot: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
    <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={3} fill="rgba(255,255,255,0.025)" stroke={C.sub} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="5 5" />
  </svg>
);

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
  /** ウォール内の座標 (x, y) から広がる輪（半径 r）が通ったセルを一瞬明るくする */
  ripple?: { x: number; y: number; r: number; amt: number } | null;
}> = ({ gridIn, seedOn, count, flashWidth = 160, flashAmt = 1, sweep = -1, wave, waveAmt = 1, dim = 0, ripple = null }) => {
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
        let rip = 0;
        if (ripple && ripple.amt > 0 && cell.rank >= SEED && cell.rank < count) {
          const d = Math.hypot(cell.x + WALL.cellW / 2 - ripple.x, cell.y + WALL.cellH / 2 - ripple.y);
          rip = Math.exp(-((d - ripple.r) ** 2) / 260) * ripple.amt;
          if (rip > 0.02) fill = lerpColor(fill.startsWith("#") ? fill : C.coral, "#FFE4D6", rip * 0.75);
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
            opacity={appear * Math.min(1, op * (1 - dim) + rip * 0.7)}
          />
        );
      })}
    </svg>
  );
};

// ───────── 声のレベル ─────────
/** 行 id の、絶対時刻 sec での音量（フレームの間は直線でつなぐ。行の外は 0） */
export const rmsLerp = (id: string, sec: number) => {
  const l = line(id);
  const r = rmsOf(id);
  const k = (sec - l.start) * FPS;
  if (k < 0 || k > r.length - 1) return 0;
  const i = Math.floor(k);
  const f = k - i;
  return (r[i] ?? 0) * (1 - f) + (r[i + 1] ?? r[i] ?? 0) * f;
};

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
