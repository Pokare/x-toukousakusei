import React from "react";
import { AbsoluteFill } from "remotion";
import { C, DISPLAY, FONT, MONO } from "../theme";
import { TL, wipeInto } from "../timeline";
import { ease, prog, useTime } from "../time";
import { Sfx } from "./Sfx";

// テープが入る(0〜IN)・止まって見せる(IN〜OUT)・抜ける(OUT〜1) の割合
const IN = 0.25;
const OUT = 0.72;
const TEXT_X = 150; // テープ上の文字の左端（画面座標）
const RIGHT_MARGIN = 120;

/**
 * トラックの切り替え。コーラルのテープが左から画面を横切り、
 * 次のトラック番号と名前を見せてから右へ抜ける。
 * テープが画面を覆っている間に下のシーンが入れ替わる。
 */
export const TapeWipe: React.FC = () => {
  const t = useTime();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {TL.sections.slice(1).map((s) => {
        const { a, b } = wipeInto(s.id)!;
        const d = b - a;
        const cues = (
          <React.Fragment key={`sfx-${s.id}`}>
            <Sfx at={a} name="whoosh" volume={0.75} />
            <Sfx at={a + d * IN} name="tick" volume={0.35} />
          </React.Fragment>
        );
        if (t < a - 0.05 || t > b + 0.05) return cues;
        const inP = prog(t, a, a + d * IN, ease.inOut);
        const outP = prog(t, a + d * OUT, b, ease.inOut);
        // -1 (左の外) → 0 (画面を覆う) → +1 (右の外)
        const x = (inP - 1 + outP) * 2300;
        const textIn = prog(t, a + d * (IN - 0.08), a + d * (IN + 0.12), ease.outQuint);
        const isTrack = s.label.startsWith("TRACK");
        const title = s.title;
        // タイトルが画面からはみ出さないよう、文字数から大きさを決める
        const titleSize = Math.min(76, Math.floor((1920 - TEXT_X - RIGHT_MARGIN) / Math.max(1, title.length)));
        return (
          <React.Fragment key={s.id}>
            {cues}
            <AbsoluteFill
              style={{
                left: -200,
                width: 2320,
                transform: `translateX(${x}px) skewX(-10deg)`,
                background: C.coral,
                overflow: "hidden",
              }}
            >
              {/* テープの質感 */}
              <AbsoluteFill
                style={{
                  backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 22px)",
                }}
              />
              <AbsoluteFill
                style={{
                  transform: "skewX(10deg)",
                  justifyContent: "center",
                  paddingLeft: 200 + TEXT_X,
                  opacity: textIn,
                }}
              >
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: C.ink, letterSpacing: "0.3em", marginBottom: 4 }}>
                  {isTrack ? "NEXT TRACK" : "LAST CALL"}
                </div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 170,
                    lineHeight: 1.02,
                    color: C.ink,
                    transform: `translateX(${(1 - textIn) * -60}px)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </div>
                {title && (
                  <div
                    style={{
                      marginTop: 14,
                      fontFamily: FONT,
                      fontWeight: 900,
                      fontSize: titleSize,
                      color: C.ink,
                      whiteSpace: "nowrap",
                      transform: `translateX(${(1 - textIn) * 60}px)`,
                    }}
                  >
                    {title}
                  </div>
                )}
              </AbsoluteFill>
            </AbsoluteFill>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
