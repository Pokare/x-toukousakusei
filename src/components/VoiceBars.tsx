import React from "react";
import { C, FPS } from "../theme";
import { LEVELS, TL, type Line } from "../timeline";
import { rand, useTime } from "../time";

/**
 * 実際のナレーション音声に連動して動く棒グラフ型の波形。
 * 音量・帯域エネルギーは npm run tts のときに public/voice/levels.json に書き出してある。
 */
export type VoiceBarsProps = {
  /** 棒の本数 */
  n: number;
  /** 全体の幅・高さ(px) */
  width: number;
  height: number;
  /** 棒の太さ(px)。未指定なら間隔から自動 */
  barWidth?: number;
  color?: string;
  /** どの行の音声に反応するか。未指定なら話しているすべての行 */
  lines?: string[];
  /** 棒の並びの包絡線: bell=中央が高い / flat=均一 / fade=右に向かって減衰 */
  shape?: "bell" | "flat" | "fade";
  /** 無音時の見た目: dot=点になる / rest=低い棒のまま */
  idle?: "dot" | "rest";
  /** 左からの表示割合(0〜1)。これより右の棒は点で表示 */
  reveal?: number;
  /** 反応の強さ */
  gain?: number;
  /** 全体の強制スケール(0 で全部点) */
  amount?: number;
  /** 無音でもゆらぎを見せる量(0〜1) */
  breathe?: number;
  opacity?: number;
  style?: React.CSSProperties;
};

const levelAt = (l: Line, t: number) => {
  const lv = LEVELS.lines[l.id];
  if (!lv) return null;
  const k = Math.floor((t - l.start) * FPS);
  if (k < 0 || k >= lv.rms.length) return null;
  // 前後フレームで軽くならす
  const pick = (i: number) => Math.min(lv.rms.length - 1, Math.max(0, i));
  const rms = (lv.rms[pick(k - 1)] + 2 * lv.rms[k] + lv.rms[pick(k + 1)]) / 4;
  return { rms, bands: lv.bands[k], k };
};

export const useVoiceLevel = (lines?: string[]) => {
  const t = useTime();
  const active = TL.lines.find((l) => t >= l.start && t < l.end && (!lines || lines.includes(l.id)));
  return active ? levelAt(active, t) : null;
};

export const VoiceBars: React.FC<VoiceBarsProps> = ({
  n,
  width,
  height,
  barWidth,
  color = C.coral,
  lines,
  shape = "bell",
  idle = "dot",
  reveal = 1,
  gain = 1,
  amount = 1,
  breathe = 0,
  opacity = 1,
  style,
}) => {
  const t = useTime();
  const lv = useVoiceLevel(lines);
  const step = width / n;
  const bw = barWidth ?? Math.max(3, step * 0.5);
  return (
    <svg width={width} height={height} style={{ overflow: "visible", opacity, ...style }}>
      {Array.from({ length: n }, (_, i) => {
        const pos = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
        const env =
          shape === "bell"
            ? 0.35 + 0.65 * Math.cos((pos * Math.PI) / 2) ** 1.5
            : shape === "fade"
              ? 1 - 0.75 * ((pos + 1) / 2)
              : 1;
        let v = 0;
        if (lv) {
          const bands = lv.bands;
          const bi = Math.min(bands.length - 1, Math.floor(Math.abs(pos) * (bands.length - 1) * 0.8 + rand(i * 7.1) * 2));
          const jitter = 0.65 + 0.35 * rand(i * 13.7 + lv.k * 0.91);
          v = Math.min(1, (0.55 * lv.rms + 0.6 * (bands[bi] ?? 0)) * jitter * gain);
        }
        if (breathe > 0) {
          const b = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.7) * Math.sin(t * 1.7 + i * 0.37);
          v = Math.max(v, breathe * b * 0.45);
        }
        v *= env * amount;
        const revealed = i / Math.max(1, n - 1) <= reveal + 1e-6;
        const minH = idle === "dot" ? bw : height * 0.12 * env * amount;
        const h = revealed ? Math.max(minH, v * height) : bw;
        const x = i * step + (step - bw) / 2;
        return (
          <rect
            key={i}
            x={x}
            y={(height - h) / 2}
            width={bw}
            height={h}
            rx={bw / 2}
            fill={color}
            opacity={revealed ? 1 : 0.9}
          />
        );
      })}
    </svg>
  );
};
