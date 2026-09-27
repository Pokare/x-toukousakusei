import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./components/Background";
import { Caption } from "./components/Caption";
import { SfxEnabled } from "./components/Sfx";
import { Intro } from "./scenes/Intro";
import { S1Voices } from "./scenes/S1Voices";
import { S2Acting } from "./scenes/S2Acting";
import { S3VoiceDesign } from "./scenes/S3VoiceDesign";
import { S4Dialogue } from "./scenes/S4Dialogue";
import { S5Trust } from "./scenes/S5Trust";
import { Outro } from "./scenes/Outro";
import { FPS } from "./theme";
import { TL, section } from "./timeline";
import { TimeOffset, ease, prog } from "./time";

const SCENES: Record<string, React.FC> = {
  intro: Intro,
  s1: S1Voices,
  s2: S2Acting,
  s3: S3VoiceDesign,
  s4: S4Dialogue,
  s5: S5Trust,
  outro: Outro,
};

// シーンは自分のセクションの少し前から描画を始める（入りのアニメ用）
const PRE = 0.9;
const POST = 0.15;

export type MainProps = { sfx: boolean };

export const Main: React.FC<MainProps> = ({ sfx }) => {
  const t = useCurrentFrame() / FPS;
  const s1 = section("s1");
  const outro = section("outro");
  // 方眼はイントロとアウトロでは消える
  const grid = prog(t, s1.start - 0.6, s1.start + 0.2, ease.inOut) * (1 - prog(t, outro.start - 0.6, outro.start + 0.1, ease.inOut));

  return (
    <SfxEnabled.Provider value={sfx}>
      <AbsoluteFill>
        <Background grid={grid} />
        {TL.sections.map((s) => {
          const Scene = SCENES[s.id];
          if (!Scene) return null;
          const from = Math.max(0, Math.round((s.start - PRE) * FPS));
          const to = Math.round((s.end + POST) * FPS);
          return (
            <Sequence key={s.id} from={from} durationInFrames={Math.max(1, to - from)} name={`scene:${s.id}`}>
              <TimeOffset from={from}>
                <Scene />
              </TimeOffset>
            </Sequence>
          );
        })}
        {TL.lines.map((l) => (
          <Sequence
            key={l.id}
            from={Math.round(l.start * FPS)}
            durationInFrames={Math.ceil(l.dur * FPS) + 3}
            layout="none"
            name={`voice:${l.id}`}
          >
            <Audio src={staticFile(l.file)} />
          </Sequence>
        ))}
        <Caption />
      </AbsoluteFill>
    </SfxEnabled.Provider>
  );
};
