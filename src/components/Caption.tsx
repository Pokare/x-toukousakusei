import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { C, FONT, MONO, VOICE_TAG } from "../theme";
import { TL, type Line } from "../timeline";
import { ease, prog, useTime } from "../time";

// 「……」はフォントによってベースラインに並ぶので、行の中央まで持ち上げる
const withRaisedEllipsis = (text: string) =>
  text.split(/(…+)/).map((part, i) =>
    part.startsWith("…") ? (
      <span key={i} style={{ display: "inline-block", transform: "translateY(-0.28em)" }}>
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );

const CaptionLine: React.FC<{ line: Line; t: number; opacity: number; lift: number }> = ({ line, t, opacity, lift }) => {
  const talk = prog(t, line.start, line.end, ease.linear);
  const done = prog(t, line.end, line.end + 0.3, ease.inOut);
  const tag = VOICE_TAG[line.voice];
  const accent = tag?.color ?? C.coral;
  return (
    <div
      style={{
        gridArea: "1 / 1",
        justifySelf: "center",
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity,
        transform: `translateY(${lift}px)`,
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
            fontFeatureSettings: '"palt"',
            color: interpolateColors(done, [0, 1], [C.text, C.sub]),
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            whiteSpace: "nowrap",
          }}
        >
          {withRaisedEllipsis(line.text)}
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
            background: accent,
            opacity: 1 - 0.55 * done,
            boxShadow: `0 0 10px ${accent}`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * 画面下の字幕（スタジオのモニター字幕風）。
 * - 白い文字の下に、話している進み具合に合わせて線が伸びる
 * - ナレーター以外の声（テイク・DJ など）は左に札がつく
 * - 話し終わると文字がゆっくり沈む。次の行とはクロスフェードで入れ替わる
 * - トラックの切れ目では消える
 */
export const Caption: React.FC = () => {
  const t = useTime();
  const sec = TL.sections.find((s) => t >= s.start - 0.02 && t < s.end);
  if (!sec) return null;
  const last = sec.index === TL.sections.length - 1;
  const hideAt = sec.lastEnd + 0.4;
  if (t >= hideAt && !last) return null;
  let idx = -1;
  sec.lines.forEach((l, i) => {
    if (t >= l.start - 0.02) idx = i;
  });
  if (idx < 0) return null;
  const cur = sec.lines[idx];
  const prev = idx > 0 ? sec.lines[idx - 1] : null;

  const pop = prog(t, cur.start - 0.02, cur.start + 0.22, ease.outQuint);
  const exit = last ? 1 : 1 - prog(t, hideAt - 0.15, hideAt);
  // 前の行は 0.14 秒かけて上へ抜ける
  const prevOut = prev ? prog(t, cur.start - 0.02, cur.start + 0.14, ease.out) : 1;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ marginBottom: 58, display: "grid", opacity: exit }}>
        {prev && prevOut < 1 && <CaptionLine line={prev} t={t} opacity={1 - prevOut} lift={-10 * prevOut} />}
        <CaptionLine line={cur} t={t} opacity={pop} lift={(1 - pop) * 14} />
      </div>
    </AbsoluteFill>
  );
};
