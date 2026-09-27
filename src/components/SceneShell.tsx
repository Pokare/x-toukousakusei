import React from "react";
import { AbsoluteFill } from "remotion";
import { section } from "../timeline";
import { ease, prog, useTime } from "../time";

/**
 * シーンの共通の入れ物。次のセクションに切り替わる直前に、
 * ぼかしながらフェードアウトする（元動画のトランジション）。
 */
export const SceneShell: React.FC<{
  id: string;
  exit?: "blur" | "none";
  /** フェードアウトにかける秒数 */
  exitDur?: number;
  children: React.ReactNode;
}> = ({ id, exit = "blur", exitDur = 0.55, children }) => {
  const t = useTime();
  const s = section(id);
  const p = exit === "none" ? 0 : prog(t, s.end - exitDur, s.end + 0.05, ease.inOut);
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - p,
        filter: p > 0 ? `blur(${p * 14}px)` : undefined,
        transform: p > 0 ? `scale(${1 - 0.02 * p})` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
