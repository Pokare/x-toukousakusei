// シーン内で「動画全体の何秒目か」を扱うためのフックとイージング。
// 各シーンは <Sequence> の中で描画されるので、そのズレ(from)をコンテキストで渡して絶対時刻に戻す。
import React, { createContext, useContext } from "react";
import { Easing, spring, useCurrentFrame } from "remotion";
import { FPS } from "./theme";

const OffsetCtx = createContext(0);

export const TimeOffset: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => (
  <OffsetCtx.Provider value={from}>{children}</OffsetCtx.Provider>
);

/** このシーンの Sequence が動画全体の何フレーム目から始まっているか */
export const useSceneOffset = () => useContext(OffsetCtx);

/** 動画全体での現在時刻（秒） */
export const useTime = (): number => {
  const frame = useCurrentFrame();
  const from = useContext(OffsetCtx);
  return (frame + from) / FPS;
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const ease = {
  linear: (x: number) => x,
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  outQuint: Easing.out(Easing.poly(5)),
  outBack: Easing.out(Easing.back(1.6)),
  inOutSine: Easing.inOut(Easing.sin),
};

/** t が a→b を進む割合（0〜1、イージング付き） */
export const prog = (t: number, a: number, b: number, fn: (x: number) => number = ease.out) =>
  fn(clamp01((t - a) / Math.max(1e-6, b - a)));

/** 線形補間 */
export const mix = (from: number, to: number, p: number) => from + (to - from) * p;

/** t=start からのばね（0→1、少しオーバーシュート） */
export const springAt = (t: number, start: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  t < start
    ? 0
    : spring({
        frame: (t - start) * FPS,
        fps: FPS,
        config: { damping: 14, stiffness: 140, mass: 0.8, ...config },
      });

/** 決定的な疑似乱数（同じ seed なら毎フレーム同じ値） */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
