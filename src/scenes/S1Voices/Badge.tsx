// 左上の「凄さ 1/5」ピル＋進捗ドット（共有の StepBadge と同じ見た目）。
// 元動画の入り方（ピルが左から伸びながらフェードイン → ドットが1つずつポップ）を付けるため、
// このシーン用にコピーしてアニメーションを足したもの。
import React from "react";
import { C, FONT } from "../../theme";
import { ease, prog } from "../../time";

export const IntroBadge: React.FC<{ t: number; start: number; n?: number; total?: number }> = ({
  t,
  start,
  n = 1,
  total = 5,
}) => {
  const pill = prog(t, start, start + 0.2, ease.linear);
  const fade = prog(t, start, start + 0.26, ease.linear);
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 84,
        display: "flex",
        alignItems: "center",
        gap: 27,
      }}
    >
      <div
        style={{
          height: 60,
          padding: "0 30px",
          borderRadius: 30,
          background: C.blue,
          color: C.white,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 28,
          display: "flex",
          alignItems: "center",
          letterSpacing: "0.02em",
          opacity: fade,
          clipPath: `inset(0 ${(1 - pill) * 62}% 0 0 round 30px)`,
        }}
      >
        凄さ {n}/{total}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {Array.from({ length: total }, (_, i) => {
          const s = start + 0.17 + i * 0.05;
          const p = prog(t, s, s + 0.2, ease.outBack);
          const o = prog(t, s, s + 0.08, ease.linear);
          return (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                background: i < n ? C.blue : C.blueSoft,
                opacity: o,
                transform: `scale(${Math.max(0, p)})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
