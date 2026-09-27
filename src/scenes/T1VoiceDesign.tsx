/*
 * TRACK 01 — ボイスデザイン「声を、文章でつくる」
 *
 * 絵コンテ（すべてナレーションの行と、その行の実際の声の区切りに同期。秒は直書きしない）
 *  B0  enter   テープが抜けると同時に、見出し「声を、文章でつくる」が 1 文字ずつせり上がる（画面中央・120px）。
 *  B1  t1-1    「ボイスデザイン」: 見出しの下に小さな図「[文書] TEXT - - -● → [人] VOICE」。
 *  B2  t1-2    見出しが左上へ。1 台のコンソール（ヘッダー「TEXT → VOICE」）が立ち上がり、ことばに合わせて組み上がる:
 *              「文章で」→ 空のコーラルのマスキングテープが左から貼られて押さえられる（キャレット点滅）、
 *              「書くだけで」→ 読みとりモジュール 4 つと針式 VU・出力スコープが 1 つずつ光を走らせて立ち上がる、
 *              「新しい声が作れます」→ チャンネルに電源: LED が順に灯って戻り、VU の針が振り切って戻り、スコープにミントの線。
 *  B3  t1-3    「たとえば」でテープにペン先が立ち、「深夜ラジオの…」の声がある間だけ文字がテープに書かれていく。
 *              ことばを書き終えるたびに下線が引かれ、そこからミントの線が下のモジュールへ降りて、つまみが動く
 *              （深夜ラジオ→MOOD: NIGHT / 落ち着いた→TONE: CALM / 低め→PITCH: LOW / 女性DJ→CAST: F・DJ）。
 *              ※ これはモデルの設定値ではなく「文章から読みとった特徴」の表示（左に READ FROM TEXT / 文章から読みとり）。
 *  B4  gap     書き終わり → 針式 VU の照明が入り、針が小さく跳ねる → ON AIR が数フレームかけて点灯（カチッ）。
 *  B5  t1-4    デザインされた声が話す: VU の針・出力スコープ・ON AIR・線の明るさが t1-4 の声だけに反応。
 *  B6  tail    声が終わっても点いたまま、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Sfx } from "../components/Sfx";
import { IconDoc, IconPersonVoice } from "../components/Icons";
import { C, DISPLAY, MONO, PAD_X } from "../theme";
import { ease, mix, prog, useTime } from "../time";
import { OnAirSign, envAt } from "./T1VoiceDesign/parts";
import { CHAR_TIMES, CONTROLS, L4, TM } from "./T1VoiceDesign/timing";
import { Connectors, Module, Monitor, PANEL, ReadLabel, Scope, Tape } from "./T1VoiceDesign/console";

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80, w: 684 }; // w: 実測した見出しの幅
const BIG = 1.5;

// ───────── 見出し ─────────
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const s = mix(BIG, 1, settle);
  // 大きい状態では画面中央（やや上）に置く
  const bigW = HEAD.w * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(470 - bigH / 2 - HEAD.y, 0, settle);
  const chars = [..."声を、文章でつくる"];
  const lab = prog(t, TM.headIn + 0.25, TM.headIn + 0.7, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.2, TM.headIn + 0.8, ease.outQuint);
  return (
    <div
      style={{
        position: "absolute",
        left: HEAD.x,
        top: HEAD.y,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 24, marginBottom: 10 }}>
        <div style={{ width: 40 * rule, height: 3, background: C.coral, borderRadius: 2 }} />
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "0.2em",
            color: C.sub,
            opacity: lab,
            transform: `translateX(${(1 - lab) * -12}px)`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.coral }}>01</span> — VOICE DESIGN
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.04, TM.headIn + i * 0.04 + 0.5, ease.outQuint);
          const emph = i === 3 || i === 4;
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - p) * 105}%)`,
                  color: emph ? C.coral : C.text,
                }}
              >
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// t1-1 の間だけ見出しの下に出る「TEXT → VOICE」の図（この後の 2 枚のパネルの予告）
const Hint: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.hint, TM.hint + 0.45, ease.outQuint);
  const out = prog(t, TM.settleA - 0.12, TM.settleA + 0.15, ease.out);
  if (inP <= 0 || out >= 1) return null;
  const draw = prog(t, TM.hint + 0.1, TM.hint + 0.55, ease.outQuint);
  const dot = prog(t, TM.hint + 0.35, TM.hint + 0.95, ease.inOut);
  const lit = t >= TM.hint + 0.95;
  const LW = 220;
  const label = (txt: string, col: string) => (
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: col }}>{txt}</span>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 612,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 22,
        opacity: inP * (1 - out),
        transform: `translateY(${(1 - inP) * 16}px)`,
      }}
    >
      <IconDoc size={40} color={C.sub} sw={1.7} />
      {label("TEXT", C.sub)}
      <svg width={LW + 20} height={24} style={{ overflow: "visible", margin: "0 6px" }}>
        <line x1={0} y1={12} x2={LW * draw} y2={12} stroke={C.borderHi} strokeWidth={2} strokeDasharray="5 7" />
        <path d={`M${LW + 2} 4 L${LW + 12} 12 L${LW + 2} 20`} stroke={C.borderHi} strokeWidth={2.5} fill="none" opacity={draw > 0.9 ? 1 : 0} />
        {dot > 0 && dot < 1 && (
          <circle cx={LW * dot} cy={12} r={5} fill={C.mint} style={{ filter: `drop-shadow(0 0 6px ${C.mint})` }} />
        )}
      </svg>
      <IconPersonVoice size={40} color={lit ? C.coral : C.sub} sw={1.7} />
      {label("VOICE", lit ? C.coral : C.sub)}
    </div>
  );
};

// ───────── コンソール（テープ + 読みとりモジュール + VU + スコープ） ─────────
const Console: React.FC<{ t: number; env: number }> = ({ t, env }) => {
  const inP = prog(t, TM.consoleIn, TM.consoleIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const status =
    t >= TM.onAir ? (
      <span style={{ color: C.coral }}>● LIVE</span>
    ) : t >= TM.typeB + 0.15 ? (
      <span style={{ color: C.mint }}>● SET</span>
    ) : t >= TM.write ? (
      <span style={{ color: C.coral }}>● WRITING</span>
    ) : t >= TM.newCh ? (
      <span style={{ color: C.mint }}>○ READY</span>
    ) : (
      <span style={{ color: C.dim }}>○ EMPTY</span>
    );
  return (
    <div
      style={{
        position: "absolute",
        left: PANEL.x,
        top: PANEL.y,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 40}px)`,
      }}
    >
      <Panel
        w={PANEL.w}
        h={PANEL.h}
        header={
          <>
            TEXT <span style={{ color: C.coral }}>→</span> VOICE
          </>
        }
        status={status}
      >
        <ReadLabel t={t} />
        {CONTROLS.map((_, i) => (
          <Module key={i} t={t} i={i} env={env} />
        ))}
        <Monitor t={t} env={env} />
        <Scope t={t} />
        <Connectors t={t} env={env} />
        <Tape t={t} />
      </Panel>
    </div>
  );
};

// ───────── シーン本体 ─────────
export const T1VoiceDesign: React.FC = () => {
  const t = useTime();
  const signIn = prog(t, TM.signIn, TM.signIn + 0.5, ease.outQuint);
  const env = envAt("t1-4", t);
  // ON AIR の点灯: 数フレームずつ「点く → 弱まる → ゆっくり満ちる」（1 フレームだけの点滅にしない）
  const d = t - TM.onAir;
  const strike = d < 0 ? 0 : d < 0.07 ? 0.7 : d < 0.16 ? 0.15 : mix(0.15, 1, prog(t, TM.onAir + 0.16, TM.onAir + 0.28));
  const lit = strike * (t >= L4.start ? 0.8 + 0.2 * env : 0.8);
  return (
    <SceneShell id="t1">
      <Headline t={t} />
      <Hint t={t} />
      <OnAirSign lit={lit} x={1920 - PAD_X - 232} y={208} w={232} h={66} opacity={signIn} />
      <Console t={t} env={env} />

      {/* 効果音 */}
      <Sfx at={TM.consoleIn + 0.05} name="tick" volume={0.16} />
      <Sfx at={TM.tapeIn + 0.42} name="click" volume={0.16} />
      <Sfx at={TM.modIn} name="tick" volume={0.1} />
      <Sfx at={TM.newCh} name="swell" volume={0.14} />
      {CHAR_TIMES.map((c, i) => (
        <Sfx key={i} at={c} name="type" volume={0.13} />
      ))}
      {CONTROLS.map((c, i) => (
        <Sfx key={`k${i}`} at={c.done + 0.18} name="tick" volume={0.15} />
      ))}
      <Sfx at={TM.onAir} name="click" volume={0.26} />
      <Sfx at={TM.onAir + 0.16} name="pop" volume={0.12} />
    </SceneShell>
  );
};
