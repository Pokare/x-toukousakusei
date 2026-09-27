/*
 * TRACK 01 — 「声を、注文する」（VOICE DESIGN）
 *
 * コンセプト: 深夜の空っぽのブースに、声を「注文」する。卓のチャンネル 1 本に注文票（マスキングテープ）を貼り、
 * 書かれたことばが卓のつまみを動かし、空いていた CAST の席に新しい声優が入る。最後に評価ボードで実力を見せる。
 *
 * 絵コンテ（すべてナレーションの行と、その行の実際の声の区切りに同期。秒は直書きしない）
 *  B0  enter   テープが抜けると同時に、左上の見出し（台本のトラック名「声を、注文する」、「注文」がコーラル）が
 *              1 文字ずつせり上がる。右上に消灯した ON AIR 表示。
 *  B1  t1-1    「声そのものを」で空のチャンネル（CH 01 · VOICE ORDER）が立ち上がり、
 *              「注文」でコーラルのマスキングテープ（注文票）が左から貼られて押さえられる（ペン先が点滅して待つ）。
 *  B2  t1-2    「文章で書けば」→ READ FROM ORDER の列と、読みとりモジュール GRIT（つまみ）/ PACE（縦フェーダー）/
 *              ROOM（部屋の表示）が 1 つずつ立ち上がる。
 *              「スタジオに」→ 右の針式 VU と下の出力スコープが消灯のまま並ぶ。
 *              「声優が」→ 空いた CAST の席（点線のプレート「OPEN / 空席」）、「ひとり増えます」→ CAST の横に +1、LED がゆっくり点滅して待つ。
 *  B3  t1-3    「たとえば」でペン先が立ち、「ハスキーで少しけだるい、深夜のバーのマスター」が声のある間だけテープに書かれる。
 *              ことばを書き終えるたびに下線 → ミントの線がモジュールへ降りて、その場で値が動く:
 *              ハスキー → GRIT が右へ回る / けだるい → PACE が下がる（LAZY）/ 深夜のバー → ROOM が狭く・暗く（SMALL · DIM）/
 *              マスター → CAST の席に「BAR MASTER」のテープが貼られる。
 *  B4  t1-4    注文した声がしゃべる（……いらっしゃい。今夜は、何にします？）。ここで初めてチャンネルが生きる:
 *              直前に VU の照明が入り、ON AIR が点灯、VU の針・出力スコープ・CAST の LED と枠・線の明るさが t1-4 の声だけに反応。
 *  B5  t1-5    声が終わると ON AIR が消え、チャンネルは下へ抜ける。同じ場所に評価ボード「HUME AI · VOICE DESIGN BENCHMARK」。
 *              「この」で MODEL の札が左から順にめくれ、「声をつくる力」で SCORE 見出しの表示灯が灯る。
 *              「Hume AIの評価で」で空だった SCORE の札が回りはじめ、「71.4点」で 71.4 に止まる（下線）。
 *              「全体の」で RANK の下の OVERALL 表示灯、「トップ」で RANK の札が「1」を出す（輪が一度広がる）。
 *              比較の棒・他モデル・トロフィー・ピル型バッジは描かない。そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Sfx } from "../components/Sfx";
import { C, DISPLAY, MONO, PAD_X } from "../theme";
import { section } from "../timeline";
import { ease, mix, prog, useTime } from "../time";
import { OnAirSign, envAt } from "./T1VoiceDesign/parts";
import { CHAR_TIMES, CONTROLS, L4, TM } from "./T1VoiceDesign/timing";
import { CastPulse, Connectors, Module, Monitor, PANEL, ReadLabel, Scope, Tape } from "./T1VoiceDesign/console";
import { BOARD, BoardBody } from "./T1VoiceDesign/board";

// ───────── 見出し（台本のトラック名。キーワード「注文」をコーラルに） ─────────
const TITLE = section("t1").title || "声を、注文する";
const TITLE_CHARS = [...TITLE];
const EMPH = (() => {
  const set = new Set<number>();
  const i = TITLE.indexOf("注文");
  if (i >= 0) {
    const ci = [...TITLE.slice(0, i)].length;
    set.add(ci).add(ci + 1);
  }
  return set;
})();
const HEAD = { x: PAD_X, y: 156, size: 80 };

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const lab = prog(t, TM.headIn + 0.25, TM.headIn + 0.7, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.2, TM.headIn + 0.8, ease.outQuint);
  return (
    <div style={{ position: "absolute", left: HEAD.x, top: HEAD.y }}>
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
        {TITLE_CHARS.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.045, TM.headIn + i * 0.045 + 0.5, ease.outQuint);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: EMPH.has(i) ? C.coral : C.text }}>
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── チャンネル（注文票テープ + 読みとりモジュール + VU + スコープ） ─────────
const Console: React.FC<{ t: number; env: number }> = ({ t, env }) => {
  const inP = prog(t, TM.consoleIn, TM.consoleIn + 0.55, ease.outQuint);
  const out = prog(t, TM.consoleOut, TM.consoleOut + 0.32, ease.in);
  if (inP <= 0 || out >= 1) return null;
  const status =
    t >= TM.onAir ? (
      <span style={{ color: C.coral }}>● LIVE</span>
    ) : t >= TM.typeB + 0.15 ? (
      <span style={{ color: C.mint }}>● SET</span>
    ) : t >= TM.write ? (
      <span style={{ color: C.coral }}>● WRITING</span>
    ) : t >= TM.castIn ? (
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
        opacity: inP * (1 - out),
        transform: `translateY(${(1 - inP) * 40 + out * 60}px)`,
      }}
    >
      <Panel
        w={PANEL.w}
        h={mix(PANEL.h0, PANEL.h, prog(t, TM.grow, TM.grow + 0.5, ease.inOut))}
        header={
          <>
            <span style={{ color: C.coral }}>CH 01</span> · VOICE ORDER
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
        <CastPulse t={t} />
        <Connectors t={t} env={env} />
        <Tape t={t} />
      </Panel>
    </div>
  );
};

// ───────── 評価ボード（t1-5） ─────────
const Board: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.boardIn, TM.boardIn + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: BOARD.x,
        top: BOARD.y,
        width: BOARD.w,
        height: BOARD.h,
        borderRadius: 18,
        background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
        border: `1.5px solid ${C.border}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 50px rgba(0,0,0,0.45)",
        boxSizing: "border-box",
        overflow: "hidden",
        opacity: inP,
        transform: `translateY(${(1 - inP) * 50}px)`,
      }}
    >
      <BoardBody t={t} />
    </div>
  );
};

// ───────── シーン本体 ─────────
export const T1VoiceDesign: React.FC = () => {
  const t = useTime();
  const signIn = prog(t, TM.signIn, TM.signIn + 0.5, ease.outQuint);
  const env = envAt("t1-4", t);
  // ON AIR の点灯: 数フレームずつ「点く → 弱まる → ゆっくり満ちる」（1 フレームだけの点滅にしない）。声が終わると消える
  const d = t - TM.onAir;
  const strike = d < 0 ? 0 : d < 0.07 ? 0.7 : d < 0.16 ? 0.15 : mix(0.15, 1, prog(t, TM.onAir + 0.16, TM.onAir + 0.28));
  const off = 1 - prog(t, TM.offAir, TM.offAir + 0.35, ease.inOut);
  const lit = strike * off * (t >= L4.start ? 0.8 + 0.2 * env : 0.8);
  return (
    <SceneShell id="t1">
      <Headline t={t} />
      <OnAirSign lit={lit} x={1920 - PAD_X - 232} y={208} w={232} h={66} opacity={signIn} />
      <Console t={t} env={env} />
      <Board t={t} />

      {/* 効果音 */}
      <Sfx at={TM.consoleIn + 0.05} name="tick" volume={0.14} />
      <Sfx at={TM.tapeIn + 0.42} name="click" volume={0.16} />
      <Sfx at={TM.modIn} name="tick" volume={0.1} />
      <Sfx at={TM.castIn} name="tick" volume={0.12} />
      {CHAR_TIMES.map((c, i) => (
        <Sfx key={i} at={c} name="type" volume={0.12} />
      ))}
      {CONTROLS.map((c, i) => (
        <Sfx key={`k${i}`} at={c.kind === "cast" ? TM.castLand : c.done + 0.18} name={c.kind === "cast" ? "pop" : "tick"} volume={0.15} />
      ))}
      <Sfx at={TM.onAir} name="click" volume={0.24} />
      <Sfx at={TM.consoleOut} name="whoosh" volume={0.12} />
      <Sfx at={TM.nameA} name="type" volume={0.14} />
      <Sfx at={TM.fillB} name="tick" volume={0.16} />
      <Sfx at={TM.overall} name="click" volume={0.18} />
      <Sfx at={TM.rank} name="chime" volume={0.24} />
    </SceneShell>
  );
};
