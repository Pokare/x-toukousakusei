// 開発用: このシーンだけを描画するエントリ（他のシーンの編集中エラーの影響を受けない）
import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame } from "remotion";
import { ensureFonts } from "../fonts";
import { Background } from "../components/Background";
import { Caption } from "../components/Caption";
import { SfxEnabled } from "../components/Sfx";
import { S3VoiceDesign } from "../scenes/S3VoiceDesign";
import { FPS, H, W } from "../theme";
import { TL, TOTAL_FRAMES, section } from "../timeline";
import { TimeOffset, ease, prog } from "../time";

ensureFonts();

const Only: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = section("s3");
  const s1 = section("s1");
  const outro = section("outro");
  const grid = prog(t, s1.start - 0.6, s1.start + 0.2, ease.inOut) * (1 - prog(t, outro.start - 0.6, outro.start + 0.1, ease.inOut));
  const from = Math.max(0, Math.round((s.start - 0.9) * FPS));
  const to = Math.round((s.end + 0.15) * FPS);
  return (
    <SfxEnabled.Provider value>
      <AbsoluteFill>
        <Background grid={grid} />
        <Sequence from={from} durationInFrames={to - from}>
          <TimeOffset from={from}>
            <S3VoiceDesign />
          </TimeOffset>
        </Sequence>
        {TL.lines.filter((l) => l.section === "s3").map((l) => (
          <Sequence key={l.id} from={Math.round(l.start * FPS)} durationInFrames={Math.ceil(l.dur * FPS) + 3} layout="none">
            <Audio src={staticFile(l.file)} />
          </Sequence>
        ))}
        <Caption />
      </AbsoluteFill>
    </SfxEnabled.Provider>
  );
};

registerRoot(() => (
  <Composition id="Scene" component={Only} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
));
