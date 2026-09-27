import React from "react";
import { C, FONT } from "../theme";

/** 左上の「凄さ n/5」ピルと進捗ドット。scale で全体の大きさを変えられる */
export const StepBadge: React.FC<{
  n: number;
  total?: number;
  /** 何個目までのドットを塗るか（アニメ用に小数可） */
  filled?: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  label?: string;
}> = ({ n, total = 5, filled = n, x = 120, y = 84, scale = 1, opacity = 1, label = "凄さ" }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      display: "flex",
      alignItems: "center",
      gap: 26,
      transform: `scale(${scale})`,
      transformOrigin: "left center",
      opacity,
    }}
  >
    <div
      style={{
        height: 60,
        padding: "0 30px",
        borderRadius: 30,
        background: C.blue,
        color: C.white,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 28,
        display: "flex",
        alignItems: "center",
        letterSpacing: "0.02em",
      }}
    >
      {label} {n}/{total}
    </div>
    <div style={{ display: "flex", gap: 18 }}>
      {Array.from({ length: total }, (_, i) => {
        const f = Math.min(1, Math.max(0, filled - i));
        return (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: f > 0 ? C.blue : C.blueSoft,
              opacity: f > 0 ? 0.35 + 0.65 * f : 1,
              transform: `scale(${1 + 0.35 * Math.sin(Math.PI * f) * (f < 1 ? 1 : 0)})`,
            }}
          />
        );
      })}
    </div>
  </div>
);
