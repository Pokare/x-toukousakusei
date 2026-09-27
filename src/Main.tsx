import React from "react";
import { Open } from "./scenes/Open";
import { T1VoiceDesign } from "./scenes/T1VoiceDesign";
import { T2Acting } from "./scenes/T2Acting";
import { T3Dialogue } from "./scenes/T3Dialogue";
import { T4Library } from "./scenes/T4Library";
import { T5Trust } from "./scenes/T5Trust";
import { Outro } from "./scenes/Outro";
import { getInputProps } from "remotion";
import { Stage } from "./Stage";
import { VOICE_PROVIDER } from "./timeline";

export const SCENES: Record<string, React.FC> = {
  open: Open,
  t1: T1VoiceDesign,
  t2: T2Acting,
  t3: T3Dialogue,
  t4: T4Library,
  t5: T5Trust,
  outro: Outro,
};

export type MainProps = { sfx: boolean };

export const Main: React.FC<MainProps> = ({ sfx }) => {
  // 公開用の書き出し（npm run render:final）では、仮音声のままなら最初のフレームで止める
  if ((getInputProps() as { final?: boolean }).final && VOICE_PROVIDER !== "gemini") {
    throw new Error(
      `公開用の書き出しですが、ナレーションが仮音声（${VOICE_PROVIDER}）です。先に npm run tts で Gemini の声を生成してください。`,
    );
  }
  return <Stage sfx={sfx} scenes={SCENES} />;
};
