// TRACK 01 の証拠の拍: パタパタ表示（スプリットフラップ）の評価ボード
// FlapTile / Screw は src/scenes/T5Trust/parts.tsx から移植（他シーンのファイルは読むだけにするため、ここに複製）。
import React from "react";
import { C, DISPLAY, FONT, MONO } from "../../theme";
import { clamp01, ease, mix, prog, rand } from "../../time";
import { lerpColor } from "./console";
import { TM } from "./timing";

// ───────── ラックのネジ ─────────
const Screw: React.FC<{ x: number; y: number; seed: number }> = ({ x, y, seed }) => {
  const a = rand(seed) * 180;
  return (
    <svg width={16} height={16} style={{ position: "absolute", left: x - 8, top: y - 8 }}>
      <circle cx={8} cy={8} r={6.5} fill="#0B0D11" stroke={C.borderHi} strokeWidth={1.2} />
      <g transform={`rotate(${a} 8 8)`} stroke={C.dim} strokeWidth={1.4} strokeLinecap="round">
        <line x1={4.6} y1={8} x2={11.4} y2={8} />
        <line x1={8} y1={4.6} x2={8} y2={11.4} />
      </g>
    </svg>
  );
};

// ───────── パタパタ表示の 1 枚 ─────────
/**
 * seq[i] の文字へ at[i] 秒にめくれはじめる（at[0] は使わない）。dur 秒で 1 回めくれ終わる。
 * 上半分の羽根が手前へ倒れ（0→-90°）、続いて新しい文字の下半分が降りてくる（90→0°）。
 */
const FlapTile: React.FC<{
  t: number;
  seq: string[];
  at: number[];
  w: number;
  h: number;
  dur?: number;
  font: string;
  size: number;
  weight?: number;
  color: string;
  dy?: number;
  radius?: number;
  glow?: number;
}> = ({ t, seq, at, w, h, dur = 0.08, font, size, weight = 400, color, dy = 0, radius = 8, glow = 0 }) => {
  let k = 0;
  for (let i = 1; i < seq.length; i++) if (t >= at[i]) k = i;
  const cur = seq[k];
  const prev = k > 0 ? seq[k - 1] : cur;
  const f = k > 0 ? clamp01((t - at[k]) / dur) : 1;
  const hh = h / 2;
  const topBg = "linear-gradient(180deg, #232935 0%, #1A1F28 100%)";
  const botBg = "linear-gradient(180deg, #161A21 0%, #12151B 100%)";
  const glyph = (ch: string, top: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : -hh,
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        color,
        transform: `translateY(${dy}px)`,
        textShadow: glow > 0 ? `0 0 ${24 * glow}px ${C.coral}` : undefined,
      }}
    >
      {ch === " " ? "" : ch}
    </div>
  );
  const half = (ch: string, top: boolean, extra: React.CSSProperties = {}, shade = 0) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : hh,
        width: w,
        height: hh,
        overflow: "hidden",
        background: top ? topBg : botBg,
        borderRadius: top ? `${radius}px ${radius}px 0 0` : `0 0 ${radius}px ${radius}px`,
        ...extra,
      }}
    >
      {glyph(ch, top)}
      {shade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${shade})` }} />}
    </div>
  );
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        perspective: Math.max(700, h * 4),
        borderRadius: radius,
        boxShadow: `0 6px 16px rgba(0,0,0,0.45), 0 0 0 1px ${C.border}${glow > 0 ? `, 0 0 ${36 * glow}px ${C.coral}55` : ""}`,
      }}
    >
      {half(cur, true)}
      {half(f < 1 ? prev : cur, false)}
      {f < 0.5 && half(prev, true, { transformOrigin: "50% 100%", transform: `rotateX(${-180 * f}deg)` }, 0.7 * f)}
      {f >= 0.5 && f < 1 && half(cur, false, { transformOrigin: "50% 0%", transform: `rotateX(${180 * (1 - f)}deg)` }, 0.7 * (1 - f))}
      {/* 真ん中の継ぎ目と左右のヒンジ */}
      <div style={{ position: "absolute", left: 0, right: 0, top: hh - 1, height: 2, background: "#08090C" }} />
      <div style={{ position: "absolute", left: -1, top: hh - 5, width: 3, height: 10, borderRadius: 1.5, background: C.borderHi }} />
      <div style={{ position: "absolute", right: -1, top: hh - 5, width: 3, height: 10, borderRadius: 1.5, background: C.borderHi }} />
    </div>
  );
};

// ───────── レイアウト（ボード内の座標） ─────────
export const BOARD = { x: 96, y: 318, w: 1728, h: 536 };
const NAME = "Gemini 3.8 Flash TTS";
const FB = {
  x0: 52,
  nameLabelY: 80,
  nameY: 106,
  tileW: 44,
  tileH: 62,
  tileGap: 6,
  scoreLabelY: 184,
  scoreY: 228,
  digitW: 178,
  dotW: 72,
  digitH: 262,
  digitGap: 12,
  divX: 1200,
  rank: { x: 1330, y: 106, w: 280, h: 306 },
};
const NAME_W = NAME.length * (FB.tileW + FB.tileGap) - FB.tileGap;
const SCORE_W = FB.digitW * 3 + FB.dotW + FB.digitGap * 3;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const mono = (size: number, color: string = C.sub, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.16em",
  color,
  whiteSpace: "nowrap",
  ...extra,
});

// 名前の札: 左から順に、ランダムな文字を 3 回めくってから正しい文字で止まる
const nameSeq = (ch: string, i: number) => {
  if (ch === " ") return { seq: [" "], at: [0] };
  const a = TM.nameA + i * 0.035;
  const seq = [" "];
  const at = [0];
  for (let j = 0; j < 3; j++) {
    seq.push(GLYPHS[Math.floor(rand(i * 13.7 + j * 3.1 + 1) * GLYPHS.length)]);
    at.push(a + j * 0.07);
  }
  seq.push(ch);
  at.push(a + 3 * 0.07);
  return { seq, at };
};
// 点数の札: 空の札から記号を数回めくって、目標の数字で止まる（途中にそれらしい点数を出さない）
const SCRAMBLE = ["#", "=", "%", "*", "/", "+", "?"];
const countSeq = (target: number, order: number) => {
  const seq: string[] = [" "];
  const at: number[] = [0];
  const start = mix(TM.fillA, TM.fillB - 0.3, order / 3);
  for (let j = 0; j < 4; j++) {
    seq.push(SCRAMBLE[Math.floor(rand(target * 7.3 + order * 3.7 + j * 1.9) * SCRAMBLE.length)]);
    at.push(start + j * 0.07);
  }
  seq.push(String(target));
  at.push(Math.min(TM.fillB - 0.07, start + 4 * 0.07));
  return { seq, at };
};
const SCORE_TILES = [
  { ...countSeq(7, 0), w: FB.digitW },
  { ...countSeq(1, 2), w: FB.digitW },
  { seq: [" ", "."], at: [0, TM.fillA], w: FB.dotW },
  { ...countSeq(4, 1), w: FB.digitW },
];
// 順位の札: 空の羽根を 3 回めくってから「1」
const RANK_SEQ = { seq: [" ", " ", " ", "1"], at: [0, TM.rank - 0.3, TM.rank - 0.2, TM.rank - 0.1] };

export const BoardBody: React.FC<{ t: number }> = ({ t }) => {
  const w = BOARD.w;
  const hdr = prog(t, TM.boardIn, TM.boardIn + 0.3);
  const labels = prog(t, TM.boardIn + 0.08, TM.boardIn + 0.4);
  const counting = prog(t, TM.fillA - 0.1, TM.fillA + 0.1);
  const named = prog(t, TM.ability, TM.ability + 0.3);
  const scoreLit = prog(t, TM.fillB, TM.fillB + 0.2);
  const overall = prog(t, TM.overall, TM.overall + 0.18);
  const won = prog(t, TM.rank, TM.rank + 0.3);
  const ring = prog(t, TM.rank, TM.rank + 0.6, ease.out);
  const shimmer = prog(t, TM.rank + 0.35, TM.rank + 1.1, ease.inOut);
  const under = prog(t, TM.fillB + 0.05, TM.fillB + 0.45, ease.outQuint);
  const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 2 * 1.2);
  const R = FB.rank;
  return (
    <>
      {/* 見出し行 */}
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 56, borderBottom: `1px solid ${C.border}`, opacity: hdr }}>
        <Screw x={22} y={28} seed={31} />
        <Screw x={w - 22} y={28} seed={32} />
        <div style={{ position: "absolute", left: 48, top: 0, height: 56, display: "flex", alignItems: "center", gap: 14, ...mono(18, C.sub) }}>
          <span style={{ color: C.text, letterSpacing: "0.1em" }}>HUME AI</span>
          <span style={{ color: C.dim }}>·</span>
          VOICE DESIGN BENCHMARK
        </div>
        <div style={{ position: "absolute", right: 48, top: 0, height: 56, display: "flex", alignItems: "center", gap: 10, ...mono(17, lerpColor(C.dim, C.coral, won)) }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: won > 0.5 ? C.coral : "#2A303B",
              opacity: won > 0.5 ? blink : 1,
              boxShadow: won > 0.5 ? `0 0 8px ${C.coral}` : undefined,
            }}
          />
          RESULT
        </div>
      </div>

      {/* MODEL */}
      <div style={{ position: "absolute", left: FB.x0, top: FB.nameLabelY, ...mono(16, C.dim), opacity: labels }}>MODEL</div>
      <div style={{ position: "absolute", left: FB.x0, top: FB.nameY, width: NAME_W, height: FB.tileH, opacity: labels }}>
        {[...NAME].map((ch, i) => {
          const { seq, at } = nameSeq(ch, i);
          return (
            <div key={i} style={{ position: "absolute", left: i * (FB.tileW + FB.tileGap), top: 0 }}>
              <FlapTile t={t} seq={seq} at={at} w={FB.tileW} h={FB.tileH} dur={0.07} font={MONO} weight={700} size={44} color={C.text} dy={1} radius={5} />
            </div>
          );
        })}
        {shimmer > 0 && shimmer < 1 && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 6, pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: mix(-200, NAME_W + 60, shimmer),
                width: 140,
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,236,226,0.22) 50%, rgba(255,255,255,0) 100%)",
                transform: "skewX(-18deg)",
              }}
            />
          </div>
        )}
      </div>

      {/* SCORE（「声をつくる力」） */}
      <div style={{ position: "absolute", left: FB.x0, top: FB.scoreLabelY, display: "flex", alignItems: "baseline", gap: 16, opacity: labels }}>
        <span style={mono(16, C.dim)}>SCORE</span>
        {/* 「声をつくる力」と言われたところで、小さな表示灯とともに灯る */}
        <span
          style={{
            alignSelf: "center",
            width: 10,
            height: 10,
            borderRadius: 5,
            background: lerpColor("#2A303B", C.coral, named),
            boxShadow: named > 0.05 ? `0 0 ${10 * named}px ${C.coral}` : undefined,
          }}
        />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, lineHeight: 1, color: lerpColor(C.dim, C.text, named), letterSpacing: "0.06em" }}>
          声をつくる力
        </span>
      </div>
      <div style={{ position: "absolute", left: FB.x0, top: FB.scoreY, display: "flex", gap: FB.digitGap, opacity: labels }}>
        {SCORE_TILES.map((d, i) => (
          <FlapTile
            key={i}
            t={t}
            seq={d.seq}
            at={d.at}
            w={d.w}
            h={FB.digitH}
            dur={0.06}
            font={DISPLAY}
            size={210}
            color={lerpColor(C.sub, C.coral, clamp01(counting * 0.6 + scoreLit * 0.4))}
            dy={-17}
            radius={12}
            glow={scoreLit * 0.5}
          />
        ))}
      </div>
      {/* 単位「点」と、止まったときの下線 */}
      <div
        style={{
          position: "absolute",
          left: FB.x0 + SCORE_W + 26,
          top: FB.scoreY + FB.digitH - 80,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 64,
          lineHeight: 1,
          color: lerpColor(C.dim, C.text, scoreLit),
          opacity: labels,
        }}
      >
        点
      </div>
      <div
        style={{
          position: "absolute",
          left: FB.x0,
          top: FB.scoreY + FB.digitH + 14,
          width: (SCORE_W + 26 + 64) * under,
          height: 4,
          borderRadius: 2,
          background: C.coral,
          boxShadow: `0 0 14px ${C.coral}88`,
        }}
      />

      {/* 区切り */}
      <div style={{ position: "absolute", left: FB.divX, top: 84, width: 1.5, height: BOARD.h - 116, background: C.border, opacity: labels }} />

      {/* RANK（「全体のトップ」で 1） */}
      <div style={{ position: "absolute", left: R.x, top: FB.nameLabelY, ...mono(16, lerpColor(C.dim, C.coral, won)), opacity: labels }}>RANK</div>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: R.x - 40 * ring,
            top: R.y - 40 * ring,
            width: R.w + 80 * ring,
            height: R.h + 80 * ring,
            borderRadius: 14 + 20 * ring,
            border: `${3 * (1 - ring)}px solid ${C.coral}`,
            opacity: 0.8 * (1 - ring),
          }}
        />
      )}
      <div style={{ position: "absolute", left: R.x, top: R.y, opacity: labels }}>
        <FlapTile t={t} seq={RANK_SEQ.seq} at={RANK_SEQ.at} w={R.w} h={R.h} dur={0.1} font={DISPLAY} size={260} color={C.coral} dy={-19} radius={14} glow={won} />
      </div>
      {/* OVERALL 表示灯（「全体の」で点灯） */}
      <div
        style={{
          position: "absolute",
          left: R.x,
          top: R.y + R.h + 22,
          width: R.w,
          height: 58,
          borderRadius: 6,
          boxSizing: "border-box",
          border: `1.5px solid ${lerpColor(C.border, C.coral, overall)}`,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          boxShadow: overall > 0 ? `0 0 ${26 * overall}px ${C.coral}40` : undefined,
          opacity: labels,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: C.coralSoft, opacity: overall }} />
        <div
          style={{
            position: "relative",
            width: 12,
            height: 12,
            borderRadius: 6,
            background: lerpColor("#2A303B", C.coral, overall),
            boxShadow: overall > 0.5 ? `0 0 10px ${C.coral}` : undefined,
          }}
        />
        <span style={{ position: "relative", ...mono(20, lerpColor(C.dim, C.coral, overall), { letterSpacing: "0.24em" }) }}>OVERALL</span>
        <span style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 24, color: lerpColor(C.dim, C.text, overall) }}>全体</span>
      </div>
    </>
  );
};
