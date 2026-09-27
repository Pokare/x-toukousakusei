import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { C, DISPLAY } from "../theme";

// TODO: 実装する（仮置き）
export const T4Library: React.FC = () => (
  <SceneShell id="t4">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 96, color: C.text }}>TRACK 04 品ぞろえ</div>
    </AbsoluteFill>
  </SceneShell>
);
