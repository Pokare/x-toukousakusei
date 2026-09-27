import React from "react";
import { C } from "../theme";
import { rand, useTime } from "../time";
import { useVoiceLevel } from "./VoiceBars";

/**
 * オシロスコープ風の波形ライン。実際の声の帯域エネルギーから線を合成する。
 * 無音のときはほぼ平らな線（わずかにノイズ）。
 */
export const Oscilloscope: React.FC<{
  width: number;
  height: number;
  color?: string;
  lines?: string[];
  gain?: number;
  thickness?: number;
  /** 0 で常に平ら */
  amount?: number;
  glow?: boolean;
  style?: React.CSSProperties;
}> = ({ width, height, color = C.mint, lines, gain = 1, thickness = 3, amount = 1, glow = true, style }) => {
  const t = useTime();
  const lv = useVoiceLevel(lines);
  const N = 160;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * width;
    const u = i / N;
    // 両端はゼロに収束させる
    const edge = Math.sin(Math.PI * u) ** 0.8;
    let y = 0;
    if (lv) {
      lv.bands.forEach((b, k) => {
        const f = 1.5 + k * 1.35;
        const ph = t * (4 + k * 2.3) + rand(k * 3.1) * 6.28;
        y += b * Math.sin(2 * Math.PI * f * u + ph) / (1 + k * 0.18);
      });
      y *= (0.45 + lv.rms) * 0.42 * gain;
    }
    y += 0.012 * Math.sin(u * 90 + t * 20) * (1 - (lv ? lv.rms : 0));
    y = Math.max(-1, Math.min(1, y * amount)) * edge;
    pts.push(`${x.toFixed(1)},${(height / 2 - y * (height / 2)).toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} style={{ overflow: "visible", ...style }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
      />
    </svg>
  );
};

/**
 * 区切りつきのレベルメーター（VU メーター風）。緑→黄→赤。
 * orientation="h" で横向き。peak を出すと直近の最大値に印が残る。
 */
export const VUMeter: React.FC<{
  width: number;
  height: number;
  segments?: number;
  orientation?: "v" | "h";
  lines?: string[];
  gain?: number;
  /** 外から値を与える場合（0〜1）。未指定なら声のレベル */
  value?: number;
  style?: React.CSSProperties;
}> = ({ width, height, segments = 16, orientation = "v", lines, gain = 1.15, value, style }) => {
  const lv = useVoiceLevel(lines);
  const level = Math.min(1, value ?? (lv ? lv.rms * gain : 0));
  const gap = 3;
  const vertical = orientation === "v";
  const len = vertical ? height : width;
  const seg = (len - gap * (segments - 1)) / segments;
  return (
    <div style={{ position: "relative", width, height, ...style }}>
      {Array.from({ length: segments }, (_, i) => {
        const p = (i + 1) / segments;
        const on = level >= p - 0.5 / segments;
        const color = p > 0.86 ? C.red : p > 0.62 ? C.amber : C.mint;
        const pos = i * (seg + gap);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: vertical ? 0 : pos,
              bottom: vertical ? pos : 0,
              width: vertical ? width : seg,
              height: vertical ? seg : height,
              borderRadius: 2,
              background: on ? color : "rgba(255,255,255,0.06)",
              boxShadow: on ? `0 0 8px ${color}88` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
