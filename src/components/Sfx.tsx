import React, { createContext, useContext } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { FPS } from "../theme";
import { useSceneOffset } from "../time";

export type SfxName = "pop" | "tick" | "click" | "whoosh" | "type" | "chime" | "swell";

export const SfxEnabled = createContext(true);

/**
 * 効果音を動画全体の at 秒に鳴らす（シーンの中から呼んでよい）。
 * public/sfx/*.wav は scripts/make-sfx.mjs で合成した著作権フリーの音。
 */
export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({ at, name, volume = 0.35 }) => {
  const enabled = useContext(SfxEnabled);
  const offset = useSceneOffset();
  if (!enabled) return null;
  const from = Math.round(at * FPS) - offset;
  return (
    <Sequence from={from} durationInFrames={FPS * 2} layout="none" name={`sfx:${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
