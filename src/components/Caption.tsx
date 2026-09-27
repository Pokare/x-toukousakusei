import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../theme";
import { TL } from "../timeline";
import { prog, useTime } from "../time";

/**
 * 画面下の字幕。
 * - 話している間: 青いマーカーに白文字
 * - 話し終わったあと（次の行まで）: 灰色の枠に黒文字
 * - セクションの切れ目では消える
 */
export const Caption: React.FC = () => {
  const t = useTime();
  const sec = TL.sections.find((s) => t >= s.start - 0.02 && t < s.end);
  if (!sec) return null;
  const hideAt = sec.lastEnd + 0.45;
  if (t >= hideAt && sec.index < TL.sections.length - 1) return null;
  const cur = [...sec.lines].reverse().find((l) => t >= l.start - 0.02);
  if (!cur) return null;

  const speaking = t < cur.end + 0.05;
  // 行が切り替わった瞬間の小さなポップ
  const pop = prog(t, cur.start - 0.02, cur.start + 0.16);
  // セクション最初の行はふわっと出す
  const first = cur === sec.lines[0];
  const enter = first ? prog(t, sec.start - 0.05, sec.start + 0.22) : 1;
  const exit = sec.index < TL.sections.length - 1 ? 1 - prog(t, hideAt - 0.12, hideAt) : 1;
  const hl = speaking ? 1 : 1 - prog(t, cur.end + 0.05, cur.end + 0.15);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 36,
          padding: "21px 36px",
          borderRadius: 12,
          background: C.capBox,
          border: `1.5px solid ${C.capBorder}`,
          opacity: Math.min(enter, exit),
          transform: `translateY(${(1 - enter) * 16}px) scale(${0.985 + 0.015 * pop})`,
          maxWidth: 1700,
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: "63px",
            letterSpacing: "0.01em",
            padding: "0 9px",
            borderRadius: 10,
            color: hl > 0.5 ? C.white : C.ink,
            background: `rgba(31, 28, 239, ${hl})`,
            whiteSpace: "nowrap",
          }}
        >
          {cur.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
