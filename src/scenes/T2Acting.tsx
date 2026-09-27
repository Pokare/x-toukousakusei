/*
 * TRACK 02 —「ト書きで、演じ分け」（見出しは台本の section("t2").title をそのまま使う）
 *
 * コンセプト: 同じセリフ 1 行を、ト書きだけ書き換えて 3 テイク録る。
 * 上に台本の 1 ページ（綴じ穴 + 柱 + 3 字下げのト書きのカッコ + セリフ 1 行）、
 * 下にセッションのタイムライン（TAKE 1〜3 のレーン。レーンの頭はカチンコ）。
 * ト書き（書く・書き換える）= コーラル、録れた声 = ミント。
 *
 * 絵コンテ（すべてナレーションの行・行内の声の区切り・シーン境界から計算。秒は直書きしない）
 *  B0  enter        テープが抜けると同時に左上の見出しが 1 文字ずつせり上がる（「ト書き」がコーラル）。
 *                   台本のページ（柱「○ 録音ブース（深夜）」、REV. 0）と、空のセッションパネルが下からせり上がる。
 *  B1  t2-1         「同じセリフでも」: ページにセリフ「おつかれさま。今日も、よくがんばったね。」が 1 文字ずつ入る。
 *                   「ト書きひとつで」: セリフの上のカッコ（ト書きの欄）が左右に開き、点線の空欄でキャレットが点滅。
 *                   「芝居が変わります」: TAKE 1/2/3 のカチンコが 1 本ずつ降りてきて、空のレーンが灯る。
 *                   言い終わり際、ペンが空欄に「眠そうに」と書く（REV. 1）→ TAKE 1 のカチンコの札に書き写される。
 *  B2  t2-2 TAKE 1  声の直前にカチンコが閉じる（カチン）。プレイヘッドが TAKE 1 のレーンを走り、t2-2 の実際の声のレベルから
 *                   「低くならした雲が後ろへ沈んでいく」クリップが録られて残る。ページのセリフの下をコーラルの線が読み進む。
 *  B3  t2-3 TAKE 2  言い終わりでペンが「眠そうに」に線を引き、消して「はしゃいで」と書き直す（REV. 2）→ カチン →
 *                   「太いスパイク + 跳ねる粒」のクリップ（t2-3 の声から）。
 *  B4  t2-4 TAKE 3  同じく「泣くのをこらえて」に書き直す（REV. 3）→ カチン →「点線のふたで押さえた、細かく震える」クリップ。
 *                   録り終えるとパネルが「✓ 3 TAKES」。
 *  B5  t2-5         「息をのむ音や」: セリフの「おつかれさま。」のあとが割れて、ペンが（息をのむ）を書き足す（校正の ∧ 印）。
 *                   「笑い声まで」: 行末に（ふふっ）を書き足す。「ト書きに書けば入ります」: TAKE 3 の番号をペンで丸く囲み、
 *                   レーンの右端に KEEP の判子（残りの 2 本は少し沈む）。書き足しごとに REV. が 4、5 と上がり、
 *                   パネルは「KEEP · TAKE 3」。そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { C, DISPLAY, MONO, PAD_X } from "../theme";
import { section } from "../timeline";
import { ease, prog, useTime } from "../time";
import { ScriptPage } from "./T2Acting/script";
import { Session } from "./T2Acting/session";
import { CIRCLE, E, INSERTS, STAMP, T_LANES, T_LINE, T_SLOT, TAKES } from "./T2Acting/timing";

// ───────── 見出し（台本のトラック名。「ト書き」をコーラルに） ─────────
const TITLE = section("t2").title || "ト書きで、演じ分け";
const TITLE_CHARS = [...TITLE];
const EMPH = (() => {
  const set = new Set<number>();
  const i = TITLE.indexOf("ト書き");
  if (i >= 0) {
    const ci = [...TITLE.slice(0, i)].length;
    [0, 1, 2].forEach((d) => set.add(ci + d));
  }
  return set;
})();
const HEAD = { x: PAD_X, y: 156, size: 80 };
const HEAD_IN = E + 0.1;

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const lab = prog(t, HEAD_IN + 0.25, HEAD_IN + 0.7, ease.outQuint);
  const rule = prog(t, HEAD_IN + 0.2, HEAD_IN + 0.8, ease.outQuint);
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
          <span style={{ color: C.coral }}>02</span> — STAGE DIRECTIONS
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {TITLE_CHARS.map((ch, i) => {
          const p = prog(t, HEAD_IN + i * 0.045, HEAD_IN + i * 0.045 + 0.5, ease.outQuint);
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

export const T2Acting: React.FC = () => {
  const t = useTime();
  return (
    <SceneShell id="t2">
      <Headline t={t} />
      <Session t={t} />
      <ScriptPage t={t} />

      {/* 効果音（控えめに） */}
      <Sfx at={T_LINE} name="tick" volume={0.12} />
      <Sfx at={T_SLOT} name="pop" volume={0.14} />
      <Sfx at={T_LANES} name="tick" volume={0.14} />
      {TAKES.map((k) => (
        <React.Fragment key={k.id}>
          <Sfx at={k.typeA} name="type" volume={0.18} />
          <Sfx at={k.clap - 0.02} name="click" volume={0.24} />
        </React.Fragment>
      ))}
      {INSERTS.map((k) => (
        <Sfx key={k.k} at={k.typeA} name="type" volume={0.16} />
      ))}
      <Sfx at={CIRCLE.a} name="whoosh" volume={0.08} />
      <Sfx at={STAMP + 0.03} name="click" volume={0.26} />
    </SceneShell>
  );
};
