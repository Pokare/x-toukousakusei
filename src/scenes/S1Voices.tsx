import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { FONT, C } from "../theme";

// TODO: 元動画に合わせて実装する（仮置き）
export const S1Voices: React.FC = () => (
  <SceneShell id="s1">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: C.ink }}>凄さ1 声の多さ</div>
    </AbsoluteFill>
  </SceneShell>
);
