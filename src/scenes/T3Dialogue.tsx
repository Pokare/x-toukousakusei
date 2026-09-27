import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { C, DISPLAY } from "../theme";

// TODO: 実装する（仮置き）
export const T3Dialogue: React.FC = () => (
  <SceneShell id="t3">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 96, color: C.text }}>TRACK 03 会話</div>
    </AbsoluteFill>
  </SceneShell>
);
