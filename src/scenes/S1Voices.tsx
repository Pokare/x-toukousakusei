// 凄さ1「声の多さ」
// 元動画 15.0〜30.2s を再現:
//   s1-1 バッジ・タイトル・下線・空のカード枠（点線）
//   s1-2 カード1（マイク / 2000+ / すぐ使える声）
//   s1-3 カード2（吹き出し / 100+ / 言語・方言）
//   s1-4 カード3（青塗り / 波形 / 115 / 日本語の声）
//   s1-5 カードが縮んで上へ → 日本地図を線で描画 → 東京・大阪・福岡のピン＋ラベル
// タイミングはすべて台本の行（line）基準。
import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, FONT } from "../theme";
import { line, section } from "../timeline";
import { clamp01, ease, mix, prog, useTime } from "../time";
import { IntroBadge } from "./S1Voices/Badge";
import { ChatsGlyph, MicGlyph, WaveGlyph } from "./S1Voices/icons";
import { CITY, ISLANDS } from "./S1Voices/japanPath";

const outQuad = (x: number) => 1 - (1 - x) * (1 - x);
const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);

// カード（元動画の実測値）
const CARD_X = [121, 695, 1269];
const CARD_Y = 312;
const CARD_W = 530;
const CARD_H = 460;
const BORDER = 1.5;
// s1-5 でカード3枚がまとまって縮む: 中心 (960, 542) を基準に 0.66 倍して 112.5px 上へ
const GROUP_ORIGIN = "960px 542px";
const GROUP_SCALE = 0.66;
const GROUP_DY = -112.5;

type IconKind = "mic" | "chats" | "wave";
type CardSpec = {
  value: number;
  plus: boolean;
  label: string;
  blue: boolean;
  icon: IconKind;
  /** カードが入ってくる時刻 */
  t0: number;
  /** カウントアップにかける秒数 */
  countDur: number;
};

/** 点線の空き枠 */
const Slot: React.FC<{ x: number; p: number }> = ({ x, p }) => (
  <svg
    width={CARD_W}
    height={CARD_H}
    style={{
      position: "absolute",
      left: x,
      top: CARD_Y,
      overflow: "visible",
      opacity: p,
      transform: `translateY(${(1 - p) * 14}px)`,
    }}
  >
    <rect
      x={0.5}
      y={0.5}
      width={CARD_W - 1}
      height={CARD_H - 1}
      rx={14}
      fill="none"
      stroke="#CFCDC8"
      strokeWidth={1}
      strokeDasharray="3 2"
    />
  </svg>
);

const CardIcon: React.FC<{ kind: IconKind; draw: number; blue: boolean; level?: number[] }> = ({
  kind,
  draw,
  blue,
  level,
}) => (
  <div
    style={{
      position: "absolute",
      left: 41 - BORDER,
      top: 41 - BORDER,
      width: 96,
      height: 96,
      borderRadius: 48,
      background: blue ? "rgba(255,255,255,0.14)" : C.iconBg,
    }}
  >
    {kind === "mic" && <MicGlyph draw={draw} />}
    {kind === "chats" && <ChatsGlyph draw={draw} />}
    {kind === "wave" && <WaveGlyph draw={draw} color={C.white} level={level} />}
  </div>
);

/** 中身の入ったカード（下からスッと上がりながらフェードイン → 数字がカウントアップ） */
const FilledCard: React.FC<{ spec: CardSpec; x: number; t: number; level?: number[] }> = ({ spec, x, t, level }) => {
  const { t0, countDur, blue } = spec;
  if (t < t0) return null;
  const a = prog(t, t0, t0 + 0.45, outQuad);
  const cs = t0 + 0.13;
  const cp = prog(t, cs, cs + countDur, outQuart);
  const value = Math.round(spec.value * cp);
  // 数字はカウントの進みに合わせて 0.5 → 1 倍に育つ（元動画どおり、下端基準）
  const numScale = 0.5 + 0.5 * cp;
  const plusP = prog(t, cs + countDur - 0.02, cs + countDur + 0.18, ease.out);
  const labelP = prog(t, t0 + 0.4, t0 + 0.62, ease.out);
  const iconDraw = prog(t, t0 + 0.18, t0 + (spec.icon === "chats" ? 0.95 : 0.66), ease.inOut);
  const ink = blue ? C.white : C.blue;
  // 「+」付きは、+ の分だけ数字の中心を左に寄せる（最終形 "2000+" がカードの中央に来る）
  const cx = CARD_W / 2 + (spec.plus ? -32 : 0) - BORDER;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 14,
        boxSizing: "border-box",
        background: blue ? C.blue : C.card,
        border: `${BORDER}px solid ${blue ? C.blue : "#D0CAD2"}`,
        opacity: a,
        transform: `translateY(${(1 - a) * 70}px)`,
      }}
    >
      <CardIcon kind={spec.icon} draw={iconDraw} blue={blue} level={level} />
      <div
        style={{
          position: "absolute",
          left: cx,
          top: 170 - BORDER,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 149,
          lineHeight: 1,
          letterSpacing: "-0.012em",
          color: ink,
          whiteSpace: "nowrap",
          transform: `translateX(-50%) scale(${numScale})`,
          transformOrigin: "50% 93.6%",
        }}
      >
        {value}
        {spec.plus && (
          <span
            style={{
              position: "absolute",
              left: "100%",
              top: 17,
              marginLeft: 8,
              fontSize: 108,
              lineHeight: "149px",
              opacity: plusP,
              transform: `scale(${0.6 + 0.4 * plusP})`,
              transformOrigin: "50% 70%",
            }}
          >
            +
          </span>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 363 - BORDER,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1,
          color: blue ? C.white : C.ink,
          opacity: labelP,
          transform: `translateY(${(1 - labelP) * 8}px)`,
        }}
      >
        {spec.label}
      </div>
    </div>
  );
};

/** 地図上のピン（点＋広がる輪） */
const Pin: React.FC<{ x: number; y: number; t: number; at: number }> = ({ x, y, t, at }) => {
  if (t < at) return null;
  const p = prog(t, at, at + 0.16, ease.outBack);
  const rp = prog(t, at + 0.03, at + 0.6, ease.out);
  const ro = 0.55 * (1 - prog(t, at + 0.3, at + 0.85, ease.inOut)) * prog(t, at, at + 0.06, ease.linear);
  return (
    <g>
      <circle cx={x} cy={y} r={9 + 14 * rp} fill="none" stroke={C.blue} strokeWidth={3.5} opacity={ro} />
      <circle cx={x} cy={y} r={Math.max(0, 8.5 * p)} fill={C.blue} />
    </g>
  );
};

/** 「東京 標準語」のようなピルのラベル */
const PlaceLabel: React.FC<{
  left: number;
  top: number;
  city: string;
  dialect: string;
  t: number;
  at: number;
}> = ({ left, top, city, dialect, t, at }) => {
  const p = prog(t, at, at + 0.2, ease.out);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 200,
        height: 45,
        borderRadius: 23,
        boxSizing: "border-box",
        background: "#ECEAEF",
        border: "1.5px solid #CCC8DE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 500, color: "#6A6A72", lineHeight: 1 }}>{city}</span>
      <span style={{ fontSize: 28, fontWeight: 900, color: C.blue, lineHeight: 1 }}>{dialect}</span>
    </div>
  );
};

export const S1Voices: React.FC = () => {
  const t = useTime();
  const L1 = line("s1-1");
  const L2 = line("s1-2");
  const L3 = line("s1-3");
  const L4 = line("s1-4");
  const L5 = line("s1-5");

  // ---- s1-1: バッジ・タイトル・下線・空の枠
  const badgeAt = L1.start - 0.2;
  const titleP = prog(t, L1.start - 0.08, L1.start + 0.36, ease.out);
  const underline = prog(t, L1.start + 0.27, L1.start + 0.62, ease.out);
  const slotAt = (i: number) => L1.start + 0.72 + i * 0.13;

  // ---- s1-2〜s1-4: カードが1枚ずつ埋まる（元動画はテロップの切替とほぼ同時）
  const countDur = (L: { dur: number }) => Math.min(1.8, Math.max(1.0, L.dur * 0.75));
  const cards: CardSpec[] = [
    { value: 2000, plus: true, label: "すぐ使える声", blue: false, icon: "mic", t0: L2.start - 0.05, countDur: countDur(L2) },
    {
      value: 100,
      plus: true,
      label: "言語・方言",
      blue: false,
      icon: "chats",
      // 元動画では「対応する言語と…」の話し始めより少し早く出る
      t0: Math.max(L2.end + 0.1, L3.start - 0.3),
      countDur: countDur(L3),
    },
    { value: 115, plus: false, label: "日本語の声", blue: true, icon: "wave", t0: L4.start - 0.05, countDur: countDur(L4) },
  ];

  // カード3の波形アイコンを実際の声に合わせて少し揺らす
  const lv = useVoiceLevel(["s1-4", "s1-5"]);
  const waveLevel = lv
    ? [3, 4, 0, 5, 6].map((b, i) => {
        const e = i === 2 ? lv.rms : (lv.bands[b] ?? 0);
        return 0.42 * clamp01(0.7 * e + 0.35 * lv.rms);
      })
    : undefined;

  // ---- s1-5: カードが縮んで上へ、地図を描く、ピン
  const shrinkAt = L5.start - 0.1;
  const shrink = prog(t, shrinkAt, shrinkAt + 0.7, ease.inOut);
  const draw = (a: number, d: number) => prog(t, L5.start + a, L5.start + a + d, ease.inOut);
  const islandDraw: Record<string, number> = {
    kyushu: draw(-0.12, 0.38),
    shikoku: draw(0.1, 0.22),
    honshu: draw(0.06, 0.68),
    hokkaido: draw(0.62, 0.3),
  };
  const fill = prog(t, L5.start + 1.0, L5.start + 1.4, ease.inOut);
  const pinAt = {
    tokyo: L5.start + L5.dur * 0.165,
    osaka: L5.start + L5.dur * 0.285,
    fukuoka: L5.start + L5.dur * 0.405,
  };

  // 退場: 元動画の s1 はぼかさずにスッと消える（次の行の頭の約0.2秒前〜直後）。
  // 共通の SceneShell のぼかし退場は使わず、ここでフェードだけ行う（アンマウント前に完了する）。
  const sEnd = section("s1").end;
  const exitFade = 1 - prog(t, sEnd - 0.2, sEnd + 0.08, ease.inOut);

  return (
    <SceneShell id="s1" exit="none">
      <AbsoluteFill style={{ opacity: exitFade }}>
        <IntroBadge t={t} start={badgeAt} />

        {/* タイトル＋青い下線 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 154,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1,
            color: C.ink,
            opacity: titleP,
            transform: `translateY(${(1 - titleP) * 26}px)`,
            filter: titleP < 1 ? `blur(${(1 - titleP) * 5}px)` : undefined,
          }}
        >
          声の多さ
        </div>
        <div
          style={{
            position: "absolute",
            left: 930,
            top: 268,
            width: 60,
            height: 4,
            borderRadius: 2,
            background: C.blue,
            transform: `scaleX(${underline})`,
            opacity: underline > 0 ? 1 : 0,
          }}
        />

        {/* カード3枚（s1-5 でまとめて縮む） */}
        <AbsoluteFill
          style={{
            transformOrigin: GROUP_ORIGIN,
            transform: `translateY(${GROUP_DY * shrink}px) scale(${mix(1, GROUP_SCALE, shrink)})`,
          }}
        >
          {CARD_X.map((x, i) => (
            <Slot key={i} x={x} p={prog(t, slotAt(i), slotAt(i) + 0.38, ease.out)} />
          ))}
          {cards.map((c, i) => (
            <FilledCard key={i} spec={c} x={CARD_X[i]} t={t} level={c.icon === "wave" ? waveLevel : undefined} />
          ))}
        </AbsoluteFill>

        {/* 日本地図 */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {ISLANDS.map((isl) => {
            const p = islandDraw[isl.id];
            if (p <= 0) return null;
            return (
              <path
                key={isl.id}
                d={isl.d}
                pathLength={1}
                fill="#E8E8E8"
                fillOpacity={fill}
                stroke={C.blue}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - p}
              />
            );
          })}
          <Pin x={CITY.tokyo[0]} y={CITY.tokyo[1]} t={t} at={pinAt.tokyo} />
          <Pin x={CITY.osaka[0]} y={CITY.osaka[1]} t={t} at={pinAt.osaka} />
          <Pin x={CITY.fukuoka[0]} y={CITY.fukuoka[1]} t={t} at={pinAt.fukuoka} />
        </svg>
        <PlaceLabel
          left={CITY.tokyo[0] + 51.5}
          top={CITY.tokyo[1] + 6.5}
          city="東京"
          dialect="標準語"
          t={t}
          at={pinAt.tokyo + 0.15}
        />
        <PlaceLabel
          left={CITY.osaka[0] - 100}
          top={CITY.osaka[1] + 52}
          city="大阪"
          dialect="大阪弁"
          t={t}
          at={pinAt.osaka + 0.15}
        />
        <PlaceLabel
          left={CITY.fukuoka[0] - 37.5 - 200}
          top={CITY.fukuoka[1] - 22.5}
          city="福岡"
          dialect="博多弁"
          t={t}
          at={pinAt.fukuoka + 0.15}
        />
      </AbsoluteFill>

      {/* 効果音（控えめに） */}
      {cards.map((c, i) => (
        <Sfx key={`pop${i}`} at={c.t0 + 0.02} name="pop" volume={0.22} />
      ))}
      <Sfx at={shrinkAt} name="whoosh" volume={0.16} />
      <Sfx at={pinAt.tokyo} name="tick" volume={0.18} />
      <Sfx at={pinAt.osaka} name="tick" volume={0.18} />
      <Sfx at={pinAt.fukuoka} name="tick" volume={0.18} />
    </SceneShell>
  );
};
