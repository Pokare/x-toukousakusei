// 開発用: このシーンだけを描画するエントリ（他のシーンの編集中エラーの影響を受けない）
import React from "react";
import { Composition, registerRoot } from "remotion";
import { ensureFonts } from "../fonts";
import { Stage } from "../Stage";
import { T1VoiceDesign } from "../scenes/T1VoiceDesign";
import { FPS, H, W } from "../theme";
import { TOTAL_FRAMES } from "../timeline";

ensureFonts();

const Only: React.FC = () => <Stage sfx scenes={{ t1: T1VoiceDesign }} onlySection="t1" />;

registerRoot(() => (
  <Composition id="Scene" component={Only} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
));
