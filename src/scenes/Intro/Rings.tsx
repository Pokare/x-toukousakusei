import React from "react";
import { clamp01 } from "../../time";

/**
 * イントロ用の同心円。元動画では円の間隔が外側ほど少しずつ広がり、
 * 全体がゆっくり拡大しながら中心が下へ流れていく（14秒で約 12% 拡大・約 53px 下降）。
 * elapsed はイントロ開始からの秒数。
 */
const BASE_R = [141, 244, 357, 480, 612, 753, 903, 1063, 1232];
// 内側ほど濃く、外側ほど薄い（元動画の実測値に合わせた不透明度）
const ALPHA = [0.4, 0.33, 0.27, 0.21, 0.15, 0.11, 0.08, 0.06, 0.05];

export const IntroRings: React.FC<{ elapsed: number; opacity?: number }> = ({ elapsed, opacity = 1 }) => {
  const e = Math.max(0, elapsed);
  const s = 1 + 0.0086 * e;
  const cy = 472.5 + 3.8 * e;
  // 冒頭0.3秒で現れ、その後2秒ほどかけてわずかに濃くなる
  const fadeIn = 0.72 * (1 - (1 - clamp01(e / 0.3)) ** 3) + 0.28 * clamp01(e / 2.5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: opacity * fadeIn }}>
      {BASE_R.map((r, i) => (
        <circle
          key={i}
          cx={960}
          cy={cy}
          r={r * s}
          fill="none"
          stroke="rgb(188, 188, 206)"
          strokeOpacity={ALPHA[i]}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
};
