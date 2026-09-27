import React from "react";
import { C } from "../theme";

/** ベージュのカード。variant="blue" で青塗り */
export const Card: React.FC<{
  x?: number;
  y?: number;
  w: number;
  h: number;
  variant?: "plain" | "blue";
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, variant = "plain", radius = 14, style, children }) => (
  <div
    style={{
      position: x !== undefined || y !== undefined ? "absolute" : "relative",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: radius,
      background: variant === "blue" ? C.blue : C.card,
      border: variant === "blue" ? `1.5px solid ${C.blue}` : `1.5px solid ${C.cardBorder}`,
      boxShadow: variant === "blue" ? "0 12px 30px rgba(31, 28, 239, 0.18)" : C.cardShadow,
      boxSizing: "border-box",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);
