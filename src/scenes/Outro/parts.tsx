// OUTRO 専用の小物: 色の補助、パッチベイのジャック、打ち込み表示、フローのノード
import React from "react";
import { C, FONT, MONO } from "../../theme";
import { clamp01 } from "../../time";

/* ---------------- 色の補助 ---------------- */
const parse = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = c.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
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

export const mono = (
  size: number,
  color: string = C.sub,
  weight = 700,
  ls = "0.16em",
): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: ls,
  color,
  whiteSpace: "nowrap",
});

/* ---------------- パッチベイのジャック ---------------- */
/**
 * 試せる場所を「パッチベイの差し込み口」として見せる。
 * show: 出現（0〜1）、plug: プラグが差さる（0〜1）、on: LED がミントに点く（0〜1）。
 */
export const Jack: React.FC<{
  label: string;
  show: number;
  plug: number;
  on: number;
}> = ({ label, show, plug, on }) => {
  const S = 56;
  const pin = clamp01(plug);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: clamp01(show * 1.6),
        transform: `translateY(${(1 - show) * 16}px)`,
      }}
    >
      <div style={{ position: "relative", width: S, height: S, flexShrink: 0 }}>
        {/* ナット */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxSizing: "border-box",
            background: `linear-gradient(180deg, ${C.panelHi} 0%, #12151B 100%)`,
            border: `1.5px solid ${mixColor(C.borderHi, "#2F8F76", on)}`,
            boxShadow: `0 0 ${22 * on}px ${withAlpha(C.mint, 0.3 * on)}`,
          }}
        />
        {/* 差し込み口 */}
        <div
          style={{
            position: "absolute",
            left: S / 2 - 15,
            top: S / 2 - 15,
            width: 30,
            height: 30,
            borderRadius: "50%",
            boxSizing: "border-box",
            border: `3px solid ${C.dim}`,
            background: "#07080A",
          }}
        />
        {/* プラグ（上から差さる） */}
        {pin > 0 && (
          <div
            style={{
              position: "absolute",
              left: S / 2 - 17,
              top: S / 2 - 17,
              width: 34,
              height: 34,
              borderRadius: "50%",
              boxSizing: "border-box",
              background: `radial-gradient(circle at 40% 35%, #FF8A63 0%, ${C.coral} 55%, #D9532C 100%)`,
              border: `2px solid ${withAlpha(C.ink, 0.5)}`,
              boxShadow: `0 ${6 * (1 - pin)}px ${10 + 10 * (1 - pin)}px rgba(0,0,0,0.5)`,
              opacity: clamp01(pin * 2.5),
              transform: `translateY(${(1 - pin) * -18}px) scale(${1.35 - 0.35 * pin})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 9,
                borderRadius: "50%",
                border: `2px solid ${withAlpha(C.ink, 0.55)}`,
              }}
            />
          </div>
        )}
        {/* LED */}
        <div
          style={{
            position: "absolute",
            right: -3,
            top: -3,
            width: 12,
            height: 12,
            borderRadius: 6,
            background: mixColor(C.dim, C.mint, on),
            border: `1.5px solid ${C.panel}`,
            boxShadow: on > 0.05 ? `0 0 ${12 * on}px ${C.mint}` : "none",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 36,
          lineHeight: "44px",
          color: mixColor(C.sub, C.text, 0.55 + 0.45 * on),
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ---------------- 打ち込み表示 ---------------- */
/** text を p(0〜1) の割合だけ表示。打っている間は右にカーソル（左揃えで使う） */
export const Typed: React.FC<{
  text: string;
  p: number;
  caret?: string;
  style?: React.CSSProperties;
}> = ({ text, p, caret = C.coral, style }) => {
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

/* ---------------- フローのノード ---------------- */
export const FlowNode: React.FC<{
  label: string;
  on: number;
  final?: boolean;
}> = ({ label, on, final }) => {
  const fill = final ? on : 0;
  return (
    <div
      style={{
        height: 40,
        padding: "0 16px 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 10,
        boxSizing: "border-box",
        border: `1.5px solid ${final ? mixColor(C.border, C.coral, on) : mixColor(C.border, C.borderHi, on)}`,
        background: final
          ? withAlpha(C.coral, fill)
          : withAlpha("#1C212B", 0.6 + 0.4 * on),
        boxShadow:
          final && on > 0
            ? `0 0 ${24 * on}px ${withAlpha(C.coral, 0.45 * on)}`
            : "none",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          background: final
            ? mixColor(C.dim, C.ink, on)
            : mixColor(C.dim, C.mint, on),
          boxShadow:
            !final && on > 0.05 ? `0 0 ${10 * on}px ${C.mint}` : "none",
        }}
      />
      <div
        style={mono(
          17,
          final ? mixColor(C.dim, C.ink, on) : mixColor(C.dim, C.text, on),
          700,
          "0.16em",
        )}
      >
        {label}
      </div>
    </div>
  );
};

/** ノードの間の線。p で左から伸び、先頭に小さな矢じり */
export const FlowWire: React.FC<{ p: number; width: number }> = ({
  p,
  width,
}) => (
  <svg
    width={width}
    height={14}
    style={{ overflow: "visible", display: "block", flexShrink: 0 }}
  >
    <line
      x1={6}
      y1={7}
      x2={width - 6}
      y2={7}
      stroke={C.border}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <line
      x1={6}
      y1={7}
      x2={6 + (width - 12) * clamp01(p)}
      y2={7}
      stroke={C.mint}
      strokeWidth={2}
      strokeLinecap="round"
      style={{ filter: p > 0 ? `drop-shadow(0 0 4px ${C.mint})` : undefined }}
    />
    <path
      d={`M${width - 12} 2 L${width - 5} 7 L${width - 12} 12`}
      fill="none"
      stroke={mixColor(C.border, C.mint, p >= 1 ? 1 : 0)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
