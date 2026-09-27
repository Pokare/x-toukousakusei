import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, MONO, VOICE_TAG } from "../theme";
import { TL } from "../timeline";
import { ease, prog, useTime } from "../time";

/**
 * 画面下の字幕（スタジオのモニター字幕風）。
 * - 白い文字の下に、話している進み具合に合わせてコーラルの線が伸びる
 * - ナレーター以外の声（ささやき・話者A など）は左に札がつく
 * - 話し終わると文字が少し沈む。トラックの切れ目では消える
 */
export const Caption: React.FC = () => {
  const t = useTime();
  const sec = TL.sections.find((s) => t >= s.start - 0.02 && t < s.end);
  if (!sec) return null;
  const last = sec.index === TL.sections.length - 1;
  const hideAt = sec.lastEnd + 0.4;
  if (t >= hideAt && !last) return null;
  const cur = [...sec.lines].reverse().find((l) => t >= l.start - 0.02);
  if (!cur) return null;

  const talk = prog(t, cur.start, cur.end, ease.linear);
  const done = prog(t, cur.end, cur.end + 0.25);
  const pop = prog(t, cur.start - 0.02, cur.start + 0.22, ease.outQuint);
  const exit = last ? 1 : 1 - prog(t, hideAt - 0.15, hideAt);
  const tag = VOICE_TAG[cur.voice];

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 58,
          display: "flex",
          alignItems: "center",
          gap: 22,
          opacity: Math.min(pop, exit),
          transform: `translateY(${(1 - pop) * 14}px)`,
        }}
      >
        {tag && (
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "0.08em",
              color: C.ink,
              background: tag.color,
              padding: "6px 14px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            {tag.label}
          </div>
        )}
        <div style={{ position: "relative", paddingBottom: 14 }}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 48,
              lineHeight: "60px",
              letterSpacing: "0.02em",
              color: done > 0.5 ? C.sub : C.text,
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              whiteSpace: "nowrap",
            }}
          >
            {cur.text}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 4,
              borderRadius: 2,
              width: `${talk * 100}%`,
              background: tag?.color ?? C.coral,
              opacity: 1 - 0.55 * done,
              boxShadow: `0 0 10px ${tag?.color ?? C.coral}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
