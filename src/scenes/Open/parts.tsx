// Open シーンの部品（台本カード・AI チップ・トラックレーン）と小さな道具。
import React from "react";
import { C, DISPLAY, FONT, FPS, MONO } from "../../theme";
import { LEVELS, section } from "../../timeline";
import { clamp01, rand } from "../../time";

/** "#RRGGBB" または "rgb(r, g, b)" を [r, g, b] に */
const parse = (c: string): [number, number, number] => {
  const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = (i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return [h(0), h(1), h(2)];
};

/** 2色を p(0〜1) で混ぜる */
export const mixColor = (a: string, b: string, p: number) => {
  const q = clamp01(p);
  const A = parse(a);
  const B = parse(b);
  const ch = (i: number) => Math.round(A[i] + (B[i] - A[i]) * q);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
};

/** 色に透明度をつける */
export const withAlpha = (c: string, a: number) => {
  const [r, g, b] = parse(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** 文字列を p(0〜1) の割合だけ表示（タイプ打ち） */
export const typed = (s: string, p: number) => s.slice(0, Math.round(s.length * clamp01(p)));

/** セクションの実際の音声から、クリップのサムネイル波形（n 本の棒、0〜1）を作る */
export const sectionWave = (id: string, n: number): number[] => {
  const s = section(id);
  const span = s.lastEnd - s.start;
  const raw: number[] = [];
  for (let j = 0; j < n; j++) {
    const a = s.start + (j / n) * span;
    const b = s.start + ((j + 1) / n) * span;
    // 窓の中の平均（行間の無音は 0 として数える）
    let sum = 0;
    for (const l of s.lines) {
      const rms = LEVELS.lines[l.id]?.rms;
      if (!rms || l.end < a || l.start > b) continue;
      const fa = Math.max(0, Math.floor((a - l.start) * FPS));
      const fb = Math.min(rms.length - 1, Math.floor((b - l.start) * FPS));
      for (let f = fa; f <= fb; f++) sum += rms[f] ?? 0;
    }
    raw.push(sum / Math.max(1, (b - a) * FPS));
  }
  const max = Math.max(1e-6, ...raw);
  return raw.map((v) => Math.pow(v / max, 1.35));
};

/* ------------------------------------------------------------------ */
/** 台本カード（右上が折れた紙）。type=0〜1 で行が上から順に書き込まれる */
export const ScriptCard: React.FC<{ w: number; h: number; type: number; lit: number }> = ({ w, h, type, lit }) => {
  const fold = 44;
  const rows = [
    { tag: true, len: 0.64 },
    { tag: false, len: 0.9 },
    { tag: false, len: 0.72 },
    { tag: true, len: 0.52 },
    { tag: false, len: 0.94 },
    { tag: false, len: 0.6 },
    { tag: false, len: 0.8 },
  ];
  const x0 = 28;
  const inner = w - x0 * 2;
  const y0 = 96;
  const gap = 29;
  const stroke = mixColor(C.borderHi, C.text, lit * 0.35);
  const cur = Math.min(rows.length - 1, Math.floor(type * rows.length));
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="op-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.panelHi} />
          <stop offset="1" stopColor={C.panel} />
        </linearGradient>
      </defs>
      <path
        d={`M16 0.75 H${w - fold} L${w - 0.75} ${fold} V${h - 16} Q${w - 0.75} ${h - 0.75} ${w - 16} ${h - 0.75} H16 Q0.75 ${
          h - 0.75
        } 0.75 ${h - 16} V16 Q0.75 0.75 16 0.75Z`}
        fill="url(#op-paper)"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d={`M${w - fold} 0.75 V${fold - 12} Q${w - fold} ${fold} ${w - fold + 12} ${fold} H${w - 0.75}`}
        fill={C.panelHi}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <text x={x0} y={48} fontFamily={MONO} fontWeight={700} fontSize={16} letterSpacing="0.16em" fill={C.sub}>
        SCRIPT.TXT
      </text>
      <line x1={x0} x2={w - fold - 14} y1={66} y2={66} stroke={C.border} strokeWidth={1.5} />
      {rows.map((r, k) => {
        const rp = clamp01(type * rows.length - k);
        if (rp <= 0) return null;
        const y = y0 + k * gap;
        const tx = r.tag ? x0 + 50 : x0;
        const len = (inner - (tx - x0)) * r.len * rp;
        const typing = k === cur && rp < 1;
        return (
          <g key={k}>
            {r.tag && <rect x={x0} y={y - 5} width={38} height={10} rx={5} fill={C.coral} opacity={0.9 * Math.min(1, rp * 3)} />}
            <rect x={tx} y={y - 4} width={Math.max(0, len)} height={8} rx={4} fill={typing ? C.text : C.sub} opacity={typing ? 0.95 : 0.55} />
            {typing && <rect x={tx + len + 5} y={y - 11} width={3} height={22} rx={1.5} fill={C.mint} />}
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/**
 * AI チップ（IC のような正方形、四辺にピン）。
 * pins: 点灯しているピンの数（0〜20、時計回り）。accent: 枠と点灯ピンの色。glow: 0〜1。
 */
export const Chip: React.FC<{
  size: number;
  pins: number;
  accent: string;
  glow: number;
  /** 時計回りに「充電」されたピンの数（0〜20）。充電されたピンは chargeColor で光る */
  charge?: number;
  chargeColor?: string;
  label?: string;
  /** 声に合わせたピンの脈動（0〜1、既定 1 = 常に明るい） */
  pulse?: number;
}> = ({ size, pins, accent, glow, charge = 0, chargeColor = C.coral, label = "AI", pulse = 1 }) => {
  const pinLen = 14;
  const pinT = 9;
  const per = 5;
  const pos = (k: number) => size * (0.2 + 0.15 * k); // ピンの中心（0..size）
  const pinEls: React.ReactNode[] = [];
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < per; k++) {
      const idx = side * per + k;
      const ch = clamp01(charge - idx);
      const on = Math.max(clamp01(pins - idx), ch);
      const col = ch > 0 ? mixColor(accent, chargeColor, ch) : accent;
      // 時計回り: 上(左→右) / 右(上→下) / 下(右→左) / 左(下→上)
      const p = side === 0 || side === 1 ? pos(k) : pos(per - 1 - k);
      const st: React.CSSProperties =
        side === 0
          ? { left: p - pinT / 2, top: -pinLen, width: pinT, height: pinLen }
          : side === 1
            ? { left: size, top: p - pinT / 2, width: pinLen, height: pinT }
            : side === 2
              ? { left: p - pinT / 2, top: size, width: pinT, height: pinLen }
              : { left: -pinLen, top: p - pinT / 2, width: pinLen, height: pinT };
      pinEls.push(
        <div
          key={idx}
          style={{
            position: "absolute",
            ...st,
            borderRadius: 2,
            background: on > 0 ? mixColor(C.borderHi, col, on * (0.6 + 0.4 * pulse)) : C.borderHi,
            boxShadow: on > 0.5 ? `0 0 ${(4 + 10 * pulse) * on}px ${col}` : undefined,
          }}
        />,
      );
    }
  }
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {pinEls}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          background: `linear-gradient(160deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          border: `1.5px solid ${glow > 0 ? mixColor(C.borderHi, accent, glow) : C.borderHi}`,
          boxShadow: `0 20px 50px rgba(0,0,0,0.45), 0 0 ${46 * glow}px ${withAlpha(accent, 0.33 * glow)}`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 26,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            width: 9,
            height: 9,
            borderRadius: 5,
            background: glow > 0 ? mixColor(C.dim, accent, glow) : C.dim,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontSize: size * 0.4,
            lineHeight: 1,
            color: C.text,
            paddingBottom: size * 0.03,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/** DAW のトラック1本（左にヘッダー、右にタイムラインとクリップ） */
export const TrackLane: React.FC<{
  x: number;
  y: number;
  headerW: number;
  bodyX: number;
  bodyW: number;
  h: number;
  label: string;
  title: string;
  lit: number;
  flash: number;
  playing: number;
  clipX: number;
  clipW: number;
  wave: number[];
  ticks: number[];
  style?: React.CSSProperties;
}> = ({ x, y, headerW, bodyX, bodyW, h, label, title, lit, flash, playing, clipX, clipW, wave, ticks, style }) => {
  const litBorder = mixColor(C.border, C.borderHi, lit);
  const clipH = h - 24;
  const n = wave.length;
  const step = clipW / Math.max(1, n);
  const barW = Math.max(2, step * 0.5);
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1920, height: h, ...style }}>
      {/* ヘッダー */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: 0,
          width: headerW,
          height: h,
          borderRadius: 12,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          border: `1.5px solid ${playing > 0 ? mixColor(litBorder, C.coral, playing) : litBorder}`,
          boxSizing: "border-box",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ position: "absolute", left: 22, top: 17, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: mixColor("#262B34", C.mint, lit),
              boxShadow: lit > 0.3 ? `0 0 ${12 * lit}px ${C.mint}` : undefined,
            }}
          />
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.16em",
              color: mixColor(C.dim, C.coral, lit),
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 40,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 28,
            lineHeight: "36px",
            color: mixColor(C.dim, C.text, lit),
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ position: "absolute", right: 16, top: 14, display: "flex", gap: 6 }}>
          {["M", "S"].map((m) => (
            <div
              key={m}
              style={{
                width: 26,
                height: 22,
                borderRadius: 5,
                border: `1px solid ${C.border}`,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 12,
                lineHeight: "20px",
                textAlign: "center",
                color: C.dim,
                boxSizing: "border-box",
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* タイムライン */}
      <div
        style={{
          position: "absolute",
          left: bodyX,
          top: 0,
          width: bodyW,
          height: h,
          borderRadius: 12,
          background: "rgba(255,255,255,0.018)",
          border: `1px solid ${C.border}`,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {ticks.map((tx, i) => (
          <div key={i} style={{ position: "absolute", left: tx - bodyX, top: 0, width: 1, height: h, background: "rgba(255,255,255,0.035)" }} />
        ))}
      </div>

      {/* クリップ */}
      <div
        style={{
          position: "absolute",
          left: clipX,
          top: 12,
          width: clipW,
          height: clipH,
          borderRadius: 8,
          background: lit > 0 ? `rgba(255,106,61,${0.05 + 0.13 * lit + 0.2 * flash})` : "rgba(255,255,255,0.03)",
          border: `1.5px solid ${mixColor(C.border, C.coral, lit)}`,
          boxShadow: flash > 0.02 ? `0 0 ${30 * flash}px rgba(255,106,61,${0.6 * flash})` : undefined,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <svg width={clipW} height={clipH} style={{ display: "block" }}>
          {wave.map((v, i) => {
            const bh = Math.max(3, Math.min(1, v * 1.1) * (clipH - 18));
            return (
              <rect
                key={i}
                x={i * step + (step - barW) / 2}
                y={(clipH - bh) / 2}
                width={barW}
                height={bh}
                rx={barW / 2}
                fill={mixColor(C.dim, C.coral, lit)}
                opacity={0.55 + 0.45 * lit}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/**
 * 出力パネル用の合成波形（声の大きさに引っぱられず、常にはっきり動く）。
 * live=0 で平らな暗い線、1 でミントの波。level で少しだけ振幅が増える。
 */
export const SynthWave: React.FC<{ w: number; h: number; t: number; live: number; level: number }> = ({ w, h, t, live, level }) => {
  const N = 72;
  const pts: string[] = [];
  const amp = live * (0.55 + 0.35 * clamp01(level * 2.2));
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const env = Math.sin(Math.PI * u) ** 1.2;
    const y =
      0.55 * Math.sin(2 * Math.PI * (2.2 * u) + t * 7.1) +
      0.3 * Math.sin(2 * Math.PI * (5.3 * u) - t * 11.3 + 1.1) +
      0.18 * Math.sin(2 * Math.PI * (9.1 * u) + t * 17.7 + 2.3);
    pts.push(`${(u * w).toFixed(1)},${(h / 2 - y * env * amp * (h / 2) * 0.95).toFixed(1)}`);
  }
  const col = mixColor(C.dim, C.mint, live);
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke={C.border} strokeWidth={1} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={col}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={live > 0.3 ? { filter: `drop-shadow(0 0 6px ${withAlpha(C.mint, live)})` } : undefined}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/** 左右の端がちぎれたテープの輪郭（clip-path 用 polygon、% 指定） */
const tornPolygon = (w: number, h: number, seed: number) => {
  const teeth = 9;
  const depth = 9;
  const L: string[] = [];
  const R: string[] = [];
  for (let k = 0; k <= teeth; k++) {
    const y = (k / teeth) * h;
    const jl = (k % 2 ? depth : 0) + rand(seed + k) * 4;
    const jr = (k % 2 ? 0 : depth) + rand(seed + 40 + k) * 4;
    L.push(`${jl.toFixed(1)}px ${y.toFixed(1)}px`);
    R.push(`${(w - jr).toFixed(1)}px ${y.toFixed(1)}px`);
  }
  return `polygon(${[...R, ...L.reverse()].join(", ")})`;
};

/**
 * コンソールのチャンネルに貼る、手でちぎったマスキングテープのラベル。
 * unroll: 左から貼られていく割合（0〜1）。sheen: 光が表面をなでる位置（0〜1、範囲外で非表示）。
 */
export const TapeLabel: React.FC<{
  w: number;
  h: number;
  unroll: number;
  sheen?: number;
  children: React.ReactNode;
}> = ({ w, h, unroll, sheen = -1, children }) => {
  const u = clamp01(unroll);
  const rollX = u * w;
  return (
    <div style={{ position: "relative", width: w, height: h, filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.5))" }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(-2px ${(1 - u) * 100}% -2px -2px)` }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: tornPolygon(w, h, 7),
            background: `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.10) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0px, rgba(0,0,0,0.035) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 9px), ${C.coral}`,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
          {sheen > 0 && sheen < 1 && (
            <div
              style={{
                position: "absolute",
                top: -h,
                left: mix(-0.35, 1.1, sheen) * w,
                width: w * 0.22,
                height: h * 3,
                transform: "rotate(18deg)",
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0) 100%)",
              }}
            />
          )}
        </div>
      </div>
      {/* 貼っている途中のロール（テープの芯） */}
      {u > 0 && u < 1 && (
        <div
          style={{
            position: "absolute",
            left: rollX - 16,
            top: -10,
            width: 32,
            height: h + 20,
            borderRadius: 10,
            background: `linear-gradient(90deg, #C9492A 0%, ${C.coral} 35%, #FF9B7A 55%, #D9532F 100%)`,
            boxShadow: "6px 0 18px rgba(0,0,0,0.45)",
          }}
        />
      )}
    </div>
  );
};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
