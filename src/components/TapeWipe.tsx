import React from "react";
import { AbsoluteFill } from "remotion";
import { C, DISPLAY, FONT, MONO } from "../theme";
import { TL, wipeInto } from "../timeline";
import { ease, prog, useTime } from "../time";
import { Sfx } from "./Sfx";

/**
 * トラックの切り替え。コーラルのテープが左から画面を横切り、
 * 次のトラック番号と名前を一瞬見せてから右へ抜ける。
 * テープが画面を覆っている間に下のシーンが入れ替わる。
 */
export const TapeWipe: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {TL.sections.slice(1).map((s) => {
        const { a, b } = wipeInto(s.id)!;
        const cues = <Sfx key={`sfx-${s.id}`} at={a} name="whoosh" volume={0.3} />;
        if (t < a - 0.05 || t > b + 0.05) return cues;
        const d = b - a;
        const inP = prog(t, a, a + d * 0.36, ease.inOut);
        const outP = prog(t, a + d * 0.66, b, ease.inOut);
        // -1 (左の外) → 0 (画面を覆う) → +1 (右の外)
        const x = (inP - 1 + outP) * 2300;
        const textIn = prog(t, a + d * 0.2, a + d * 0.45, ease.outQuint);
        const isTrack = s.label.startsWith("TRACK");
        return (
          <React.Fragment key={s.id}>
            {cues}
            <AbsoluteFill
              style={{
                left: -200,
                width: 2320,
                transform: `translateX(${x}px) skewX(-10deg)`,
                background: isTrack ? C.coral : C.text,
                overflow: "hidden",
              }}
            >
              {/* テープの質感 */}
              <AbsoluteFill
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 22px)",
                }}
              />
              <AbsoluteFill
                style={{
                  transform: "skewX(10deg)",
                  justifyContent: "center",
                  paddingLeft: 200 + 150,
                  opacity: textIn,
                }}
              >
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: C.ink, letterSpacing: "0.3em", marginBottom: 6 }}>
                  {isTrack ? "NEXT TRACK" : "FINAL"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 48 }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 170, lineHeight: 1.05, color: C.ink, transform: `translateX(${(1 - textIn) * -60}px)` }}>
                    {s.label}
                  </div>
                  {s.title && (
                    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink, transform: `translateX(${(1 - textIn) * 60}px)` }}>
                      {s.title}
                    </div>
                  )}
                </div>
              </AbsoluteFill>
            </AbsoluteFill>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
