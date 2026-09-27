import React from "react";
import { AbsoluteFill } from "remotion";
import { sceneEnter, sceneExit } from "../timeline";
import { useTime } from "../time";

/**
 * シーンの共通の入れ物。トラック切り替えのテープが画面を覆っている間に
 * 前のシーンから次のシーンへ切り替わるよう、表示する時間帯をそろえる。
 * 入りのアニメーションは sceneEnter(id) を基準に始めるとテープが抜けるのと同時に動き出す。
 */
export const SceneShell: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const t = useTime();
  if (t < sceneEnter(id) || t >= sceneExit(id)) return null;
  return <AbsoluteFill>{children}</AbsoluteFill>;
};
