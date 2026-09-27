// OUTRO 専用の小物: 色の補助、マスキングテープのラベル、横型の LED レベルメーター、
// パッチベイ（ラックの帯・ネジ・ジャックとプラグ）、打ち込み表示。
import React from "react";
import { C, FONT, MONO } from "../../theme";
import { clamp01, mix, rand } from "../../time";

/* ---------------- 色の補助 ---------------- */
const parse = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const mixColor = (a: string, b: string, p: number) => {
  const q = clamp01(p);
  const A = parse(a);
  const B = parse(b);
  const ch = (i: number) => Math.round(A[i] + (B[i] - A[i]) * q);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
};

export const withAlpha = (c: string, a: number) => {
  const [r, g, b] = parse(c);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`;
};

export const mono = (size: number, color: string = C.sub, weight = 700, ls = "0.16em"): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: ls,
  color,
  whiteSpace: "nowrap",
});

/* ---------------- マスキングテープ（冒頭の TapeLabel と同じ作り） ---------------- */
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
 * チャンネルに貼る、手でちぎったコーラルのマスキングテープ。
 * unroll: 左から貼られていく割合（0〜1）。sheen: 光が表面をなでる位置（0〜1、範囲外で非表示）。
 */
export const TapeLabel: React.FC<{ w: number; h: number; unroll: number; sheen?: number; seed?: number; children: React.ReactNode }> = ({
  w,
  h,
  unroll,
  sheen = -1,
  seed = 11,
  children,
}) => {
  const u = clamp01(unroll);
  return (
    <div style={{ position: "relative", width: w, height: h, filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.5))" }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(-2px ${(1 - u) * 100}% -2px -2px)` }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: tornPolygon(w, h, seed),
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
      {u > 0 && u < 1 && (
        <div
          style={{
            position: "absolute",
            left: u * w - 14,
            top: -9,
            width: 28,
            height: h + 18,
            borderRadius: 9,
            background: `linear-gradient(90deg, #C9492A 0%, ${C.coral} 35%, #FF9B7A 55%, #D9532F 100%)`,
            boxShadow: "6px 0 18px rgba(0,0,0,0.45)",
          }}
        />
      )}
    </div>
  );
};

/* ---------------- 横型の LED レベルメーター（放送の PGM メーター） ---------------- */
/** value / peak は 0〜1。peak の位置に 1 灯だけ残る（ピークホールド）。 */
export const LedMeter: React.FC<{ width: number; height: number; segments: number; value: number; peak: number }> = ({
  width,
  height,
  segments,
  value,
  peak,
}) => {
  const gap = 4;
  const seg = (width - gap * (segments - 1)) / segments;
  const pk = Math.min(segments - 1, Math.floor(clamp01(peak) * segments - 0.001));
  return (
    <div style={{ position: "relative", width, height }}>
      {Array.from({ length: segments }, (_, i) => {
        const p = (i + 1) / segments;
        const col = p > 0.9 ? C.red : p > 0.72 ? C.amber : C.mint;
        const on = value >= p - 0.5 / segments || (i === pk && peak > 0.05);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * (seg + gap),
              top: 0,
              width: seg,
              height,
              borderRadius: 2,
              background: on ? col : "rgba(255,255,255,0.06)",
              boxShadow: on ? `0 0 10px ${withAlpha(col, 0.55)}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

/* ---------------- パッチベイ ---------------- */
/** ラックの取り付けネジ */
export const RackScrew: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle at 40% 35%, #4A5262 0%, #2A303B 70%)`,
      border: `1px solid #0A0C10`,
      boxSizing: "border-box",
    }}
  >
    <div style={{ position: "absolute", left: 3, right: 3, top: size / 2 - 1.5, height: 3, borderRadius: 2, background: "#12151B", transform: "rotate(-30deg)" }} />
  </div>
);

/**
 * パッチベイの差し込み口とプラグ（正面から見た図）。
 * plug: プラグが差さる（0〜1、ばね）、on: 横の LED がミントに点く（0〜1）、ripple: 差さった瞬間の輪（0〜1）。
 * 差さったプラグからは短いケーブルが下へ垂れる。
 */
export const Jack: React.FC<{ size?: number; plug: number; on: number; ripple: number }> = ({ size = 80, plug, on, ripple }) => {
  const S = size;
  const pin = Math.max(0, plug);
  const hole = S * 0.42;
  const boot = S * 0.7;
  return (
    <div style={{ position: "relative", width: S, height: S, flexShrink: 0 }}>
      {/* ぎざぎざのナット */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `repeating-conic-gradient(#2E3440 0deg 5deg, #1A1E26 5deg 10deg)`,
          boxShadow: `0 0 0 1.5px ${mixColor(C.borderHi, C.mint, on * 0.6)}, 0 0 ${22 * on}px ${withAlpha(C.mint, 0.28 * on)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: S * 0.12,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${C.panelHi} 0%, #101318 100%)`,
          border: `1.5px solid ${C.borderHi}`,
          boxSizing: "border-box",
        }}
      />
      {/* 差し込み口 */}
      <div
        style={{
          position: "absolute",
          left: (S - hole) / 2,
          top: (S - hole) / 2,
          width: hole,
          height: hole,
          borderRadius: "50%",
          background: "#050607",
          boxShadow: "inset 0 3px 6px rgba(0,0,0,0.9)",
          border: `2px solid ${C.dim}`,
          boxSizing: "border-box",
        }}
      />
      {/* 差さった瞬間の輪 */}
      {ripple > 0 && ripple < 1 && (
        <div
          style={{
            position: "absolute",
            left: S / 2 - (S / 2) * mix(1, 1.9, ripple),
            top: S / 2 - (S / 2) * mix(1, 1.9, ripple),
            width: S * mix(1, 1.9, ripple),
            height: S * mix(1, 1.9, ripple),
            borderRadius: "50%",
            border: `2px solid ${withAlpha(C.coral, 0.7 * (1 - ripple))}`,
            boxSizing: "border-box",
          }}
        />
      )}
      {/* ケーブル（プラグと一緒に入ってきて、帯の下へ垂れる） */}
      {pin > 0 && (
        <svg
          width={S}
          height={S}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            overflow: "visible",
            opacity: clamp01(pin * 2.5),
            transform: `translateY(${(1 - pin) * -22}px)`,
          }}
        >
          <defs>
            <linearGradient id={`oj-cable-${S}`} x1="0" y1={S / 2} x2="0" y2={S * 2.05} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#C24A26" stopOpacity={1} />
              <stop offset="0.7" stopColor="#8E3517" stopOpacity={0.85} />
              <stop offset="1" stopColor="#8E3517" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`M${S / 2} ${S / 2} C ${S / 2} ${S * 1.15}, ${S * 0.66} ${S * 1.45}, ${S * 0.7} ${S * 2.05}`}
            fill="none"
            stroke={`url(#oj-cable-${S})`}
            strokeWidth={S * 0.26}
            strokeLinecap="round"
          />
        </svg>
      )}
      {/* プラグの根元（正面から見たブーツ。手前から押し込まれる） */}
      {pin > 0 && (
        <div
          style={{
            position: "absolute",
            left: (S - boot) / 2,
            top: (S - boot) / 2,
            width: boot,
            height: boot,
            borderRadius: "50%",
            background: `radial-gradient(circle at 36% 30%, #FFA383 0%, ${C.coral} 46%, #B9441F 100%)`,
            boxShadow: `0 ${4 + 12 * (1 - pin)}px ${10 + 16 * (1 - pin)}px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.25)`,
            opacity: clamp01(pin * 2.5),
            transform: `translateY(${(1 - pin) * -22}px) scale(${1.35 - 0.35 * pin})`,
          }}
        >
          <div style={{ position: "absolute", inset: boot * 0.2, borderRadius: "50%", border: `2px solid ${withAlpha("#5A1F0B", 0.45)}` }} />
          <div style={{ position: "absolute", inset: boot * 0.38, borderRadius: "50%", background: "#9A3A18", boxShadow: "inset 0 2px 3px rgba(0,0,0,0.5)" }} />
        </div>
      )}
      {/* LED */}
      <div
        style={{
          position: "absolute",
          right: -2,
          top: -2,
          width: 14,
          height: 14,
          borderRadius: 7,
          background: mixColor("#2A2F38", C.mint, on),
          border: `2px solid ${C.panel}`,
          boxShadow: on > 0.05 ? `0 0 ${14 * on}px ${C.mint}` : "none",
        }}
      />
    </div>
  );
};

/** パッチベイの 1 チャンネル: ジャック + 番号 + 名前 */
export const PatchChannel: React.FC<{
  ch: string;
  name: string;
  show: number;
  plug: number;
  on: number;
  ripple: number;
}> = ({ ch, name, show, plug, on, ripple }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 22,
      opacity: clamp01(show * 1.6),
      transform: `translateY(${(1 - show) * 14}px)`,
    }}
  >
    <Jack plug={plug} on={on} ripple={ripple} />
    <div>
      <div style={mono(15, mixColor(C.dim, C.mint, on), 700, "0.18em")}>{ch}</div>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 34,
          lineHeight: "44px",
          color: mixColor(C.sub, C.text, 0.4 + 0.6 * clamp01(plug)),
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
    </div>
  </div>
);

/* ---------------- 打ち込み表示 ---------------- */
/** text を p(0〜1) の割合だけ表示。打っている間は右にカーソル（左揃えで使う） */
export const Typed: React.FC<{ text: string; p: number; caret?: string; style?: React.CSSProperties }> = ({ text, p, caret = C.coral, style }) => {
  const n = Math.round(clamp01(p) * text.length);
  const typing = p > 0 && p < 1;
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {typing && (
        <span
          style={{
            display: "inline-block",
            width: "0.55em",
            height: "0.95em",
            marginLeft: "0.06em",
            transform: "translateY(0.14em)",
            background: caret,
          }}
        />
      )}
    </span>
  );
};

/**
 * 再生ヘッドの通過で左から現れる文字（クレジットの名前用）。
 * p: 0〜1。ヘッドは通過後 fade で消える。
 */
export const WipeText: React.FC<{ p: number; headOut: number; style: React.CSSProperties; children: React.ReactNode }> = ({
  p,
  headOut,
  style,
  children,
}) => (
  <div style={{ position: "relative" }}>
    <div style={{ ...style, whiteSpace: "nowrap", clipPath: `inset(-20px ${(1 - clamp01(p)) * 100}% -20px -20px)` }}>{children}</div>
    {p > 0 && headOut < 1 && (
      <div
        style={{
          position: "absolute",
          left: `${clamp01(p) * 100}%`,
          top: -6,
          bottom: -6,
          width: 4,
          marginLeft: 4,
          borderRadius: 2,
          background: C.coral,
          boxShadow: `0 0 16px ${C.coral}`,
          opacity: 1 - headOut,
        }}
      />
    )}
  </div>
);
