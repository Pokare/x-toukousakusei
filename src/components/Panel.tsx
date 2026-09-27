import React from "react";
import { C, MONO } from "../theme";

/**
 * スタジオ機材のような暗いパネル。header に英字の小ラベル（例: "VOICE DESIGN"）、
 * status に右上の小表示（例: "● LIVE"）を入れられる。
 */
export const Panel: React.FC<{
  x?: number;
  y?: number;
  w: number;
  h: number;
  header?: React.ReactNode;
  status?: React.ReactNode;
  accent?: string;
  glow?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, header, status, accent = C.coral, glow = 0, style, children }) => (
  <div
    style={{
      position: x !== undefined || y !== undefined ? "absolute" : "relative",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 18,
      background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
      border: `1.5px solid ${glow > 0 ? accent : C.border}`,
      boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 50px rgba(0,0,0,0.45)${
        glow > 0 ? `, 0 0 ${40 * glow}px ${accent}55` : ""
      }`,
      boxSizing: "border-box",
      overflow: "hidden",
      ...style,
    }}
  >
    {(header || status) && (
      <div
        style={{
          height: 56,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${C.border}`,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.16em",
          color: C.sub,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{header}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent }}>{status}</div>
      </div>
    )}
    {children}
  </div>
);
