import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "./components/Background";
import { Caption } from "./components/Caption";
import { Hud } from "./components/Hud";
import { SfxEnabled } from "./components/Sfx";
import { TapeWipe } from "./components/TapeWipe";
import { FPS } from "./theme";
import { TL, sceneEnter, sceneExit } from "./timeline";
import { TimeOffset } from "./time";

/** 背景・シーン・声・計器表示・字幕・トラック切り替えを重ねた本体 */
export const Stage: React.FC<{ sfx: boolean; scenes: Record<string, React.FC>; onlySection?: string }> = ({
  sfx,
  scenes,
  onlySection,
}) => (
  <SfxEnabled.Provider value={sfx}>
    <AbsoluteFill>
      <Background />
      {TL.sections.map((s) => {
        const Scene = scenes[s.id];
        if (!Scene) return null;
        const from = Math.max(0, Math.floor((sceneEnter(s.id) - 0.2) * FPS));
        const to = Math.min(Math.ceil(TL.total * FPS), Math.ceil((sceneExit(s.id) + 0.1) * FPS));
        return (
          <Sequence key={s.id} from={from} durationInFrames={Math.max(1, to - from)} name={`scene:${s.id}`}>
            <TimeOffset from={from}>
              <Scene />
            </TimeOffset>
          </Sequence>
        );
      })}
      {TL.lines
        .filter((l) => !onlySection || l.section === onlySection)
        .map((l) => (
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
      <Hud />
      <Caption />
      <TapeWipe />
    </AbsoluteFill>
  </SfxEnabled.Provider>
);
