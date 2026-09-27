import React from "react";
import { Composition } from "remotion";
import { ensureFonts } from "./fonts";
import { Main, type MainProps } from "./Main";
import { FPS, H, W } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

ensureFonts();

export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ sfx: true } satisfies MainProps}
  />
);
