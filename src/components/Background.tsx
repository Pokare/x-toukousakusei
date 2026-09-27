import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/**
 * 深夜のスタジオの背景。
 * - 中央にほのかな明かり（glowColor で色味を少し変えられる）
 * - 40px 間隔のごく薄いドット（吸音パネルのイメージ）
 * - 四隅を落とすビネット
 */
export const Background: React.FC<{ dots?: number; glowColor?: string; glow?: number }> = ({
  dots = 1,
  glowColor = C.bgGlow,
  glow = 1,
}) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <AbsoluteFill
      style={{
        opacity: glow,
        background: `radial-gradient(ellipse 70% 60% at 50% 42%, ${glowColor} 0%, rgba(14,16,20,0) 70%)`,
      }}
    />
    <AbsoluteFill
      style={{
        opacity: 0.55 * dots,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.075) 1.2px, transparent 1.3px)",
        backgroundSize: "40px 40px",
        backgroundPosition: "20px 20px",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse 120% 100% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  </AbsoluteFill>
);
