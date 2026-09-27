import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { FONT, C } from "../theme";

// TODO: 元動画に合わせて実装する（仮置き）
export const S2Acting: React.FC = () => (
  <SceneShell id="s2">
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: C.ink }}>凄さ2 1行ずつ演技</div>
    </AbsoluteFill>
  </SceneShell>
);
