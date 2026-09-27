/*
 * TRACK 05 —「放送前チェック」（見出しは台本の section("t5").title をそのまま使う）
 *
 * コンセプト: 深夜の録音が終わり、放送に出す前の QC（品質チェック）。クリップボードに挟んだ QC シートの
 * 2 項目（01 電子透かし / 02 声での同意）を 1 行ずつ点検し、判子で締める。両方そろうと壁の「READY FOR AIR」が灯る。
 * 点検中 = コーラル、済み（信号・OK）= ミント。行はアコーディオン式: 点検中の行だけが大きく開く。
 *
 * 絵コンテ（すべてナレーションの行・行内の声の区切り・シーン境界から計算。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に左上の見出しが 1 文字ずつせり上がる（「チェック」がコーラル）。
 *                 QC シート（金具つきのクリップボード。帯「QC · PRE-BROADCAST CHECK」「CLEARED 0 / 2」、
 *                 列見出し No. / ITEM / CHECK / SIGN-OFF）が下からせり上がり、2 行（01 電子透かし・02 声での同意、
 *                 どちらも PENDING、SIGN-OFF 欄は点線の空枠）が順に入る。
 *  B1  t5-1       「放送に」で右上に消灯した READY FOR AIR ランプ（左にインターロック LED 01 / 02）が降りてくる。
 *                 「チェック」で行 01 の左端にコーラルの「点検中」の帯が伸び、No. がコーラルになる。
 *  B2  t5-2       行 01 が開く。「出てくる音声には」で出力音声（t5-2 の実際の声の形）の波形が左から刷られる。
 *                 「耳では聞こえない」でミントのスキャンヘッドが走り、通過した棒の中にミントの点の模様、
 *                 下の INAUDIBLE レーンに隠れていたビットが現れる（ヘッドの光は声に反応）。
 *                 「SynthID」でスキャン完了、レーン名が SynthID に変わって光る。
 *                 「必ず入ります」で SIGN-OFF 欄に判子「✓ SynthID · EMBEDDED ·」（CLEARED 1 / 2、LED 01 がミント）。
 *  B3  t5-3       行 01 は判子ごと畳まれ（波形は小さく残る）、行 02 が開いて出演同意書（TALENT RELEASE）になる。
 *                 「声をまねるときは」で用途欄に VOICE CLONE が打ち込まれる。
 *                 「持ち主本人の」で持ち主欄に「本人 SELF」（コーラルの下線）、同時に署名欄が REC になり、
 *                 ペンの代わりに声で署名する: t5-3 の実際の声の大きさで振れる 1 本の波形が署名線の上に書かれていく。
 *  B4  t5-3 末    「声での同意」を言い終えたところで SIGNED、SIGN-OFF 欄に判子「✓ VOICE CONSENT · VERIFIED ·」
 *                 （CLEARED 2 / 2、LED 02 がミント）。すぐに READY FOR AIR がコーラルに点灯（チャイム）。そのまま次のテープへ。
 *  盾のアイコン・チェックボックスのカード・トグルの列・評価ボードは使わない（評価ボードは T1 へ移動）。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { C, DISPLAY, MONO, PAD_X } from "../theme";
import { section } from "../timeline";
import { ease, prog, useTime } from "../time";
import { READY_W, ReadyLamp } from "./T5Trust/parts";
import { QcSheet } from "./T5Trust/sheet";
import { TM } from "./T5Trust/timing";

// ───────── 見出し（台本のトラック名。「チェック」をコーラルに） ─────────
const TITLE = section("t5").title || "放送前チェック";
const TITLE_CHARS = [...TITLE];
const EMPH = (() => {
  const set = new Set<number>();
  const kw = "チェック";
  const i = TITLE.indexOf(kw);
  if (i >= 0) {
    const ci = [...TITLE.slice(0, i)].length;
    [...kw].forEach((_, d) => set.add(ci + d));
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
          <span style={{ color: C.coral }}>05</span> — FINAL QC
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

// ───────── READY FOR AIR（見出しの右、SIGN-OFF 列の真上） ─────────
const LAMP = { x: 1920 - PAD_X - READY_W, y: 172 };

const Lamp: React.FC<{ t: number }> = ({ t }) => {
  const appear = prog(t, TM.lampIn, TM.lampIn + 0.45, ease.outQuint);
  if (appear <= 0) return null;
  // 点灯: 一度だけ小さくまたたいてから灯りきる
  const on = prog(t, TM.lampOn, TM.lampOn + 0.08);
  const dip = prog(t, TM.lampOn + 0.08, TM.lampOn + 0.12) * (1 - prog(t, TM.lampOn + 0.12, TM.lampOn + 0.2));
  const lit = Math.max(0, on - 0.55 * dip);
  const led1 = prog(t, TM.stamp1 + 0.06, TM.stamp1 + 0.2);
  const led2 = prog(t, TM.stamp2 + 0.06, TM.stamp2 + 0.2);
  return <ReadyLamp x={LAMP.x} y={LAMP.y} appear={appear} lit={lit} leds={[led1, led2]} />;
};

export const T5Trust: React.FC = () => {
  const t = useTime();
  return (
    <SceneShell id="t5">
      <Headline t={t} />
      <Lamp t={t} />
      <QcSheet t={t} />

      {/* 効果音（控えめに） */}
      <Sfx at={TM.rowsIn} name="tick" volume={0.12} />
      <Sfx at={TM.lampIn} name="click" volume={0.14} />
      <Sfx at={TM.cue} name="tick" volume={0.16} />
      <Sfx at={TM.scanA} name="swell" volume={0.12} />
      <Sfx at={TM.found} name="tick" volume={0.16} />
      <Sfx at={TM.stamp1} name="click" volume={0.28} />
      <Sfx at={TM.useA} name="type" volume={0.16} />
      <Sfx at={TM.recA} name="tick" volume={0.14} />
      <Sfx at={TM.stamp2} name="click" volume={0.28} />
      <Sfx at={TM.lampOn} name="chime" volume={0.24} />
    </SceneShell>
  );
};
