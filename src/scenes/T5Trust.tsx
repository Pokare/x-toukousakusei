import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { C, DISPLAY } from "../theme";

// TODO: 実装する（仮置き）
export const T5Trust: React.FC = () => (
  <SceneShell id="t5">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 96, color: C.text }}>TRACK 05 安心と実力</div>
    </AbsoluteFill>
  </SceneShell>
);
