import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { C, DISPLAY } from "../theme";

// TODO: 実装する（仮置き）
export const T1VoiceDesign: React.FC = () => (
  <SceneShell id="t1">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 96, color: C.text }}>TRACK 01 ボイスデザイン</div>
    </AbsoluteFill>
  </SceneShell>
);
