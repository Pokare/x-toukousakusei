/*
 * TRACK 03 — 2 人の掛け合い（MULTI-SPEAKER）＋ 30 秒の声のサンプル（VOICE CLONE）
 *
 * 絵コンテ（すべてナレーションの行・行内のフレーズ・シーン境界に同期。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に、見出し（section("t3").title をそのまま使う）が 1 文字ずつせり上がる（中央・大）。
 *                 上に MONO ラベル「03 — MULTI-SPEAKER」。
 *  B1  t3-1 後半  「2人の会話」（音声の間から検出）: 見出しの下に 2 本のマイク（話者 A コーラル / 話者 B ミント）が
 *                 同時にばねで現れ、点線でつながる。交互に一度ずつ「話す」輪。
 *  B2  t3-2       見出しが左上へ収まる。中央に 1 枚の台本「SCRIPT」がせり上がり、話者名つきの 2 行が打鍵で入る。
 *                 「2人分の声を」: マイクが左右へ飛び、そこを起点にミキサーの CH 1 / CH 2 が台本の後ろから分かれ出る。
 *                 台本の各行からパッチケーブルがそれぞれのチャンネルへ伸びて刺さる。
 *                 「まとめて」: 台本の「▶ 1 PASS」が点灯し、1 回の信号が 2 本のケーブルを同時に走る →
 *                 両チャンネルが READY になり、フェーダーが −∞ から 0 dB まで上がる。
 *  B3  t3-3       話者 B が話す: 台本の B 行がミントでハイライト（読み進みバー）、ケーブルに信号が流れ、
 *                 CH 2 が点灯（オシロ・VU・マイクの輪が t3-3 の声だけに反応）。CH 1 は一歩下がる。「1回で」で 1 PASS がはねる。
 *  B4  t3-4       話者 A が話す: 同じことが CH 1（コーラル）で起き、CH 2 は下がる。B 行には済みのチェック。
 *  B5  t3-4 の後  台本とケーブルが下へ抜け、CH 2 が CH 1 の隣へ寄る。その右に空きスロット「+ CH 3」が点線で現れる。
 *                 見出しは「03+ — VOICE CLONE / 30秒で、自分の声も」へ入れ替わる（文字が上へ抜け、下からせり上がる）。
 *  B6  t3-5 前半  「30秒の音声があれば」: 右にオープンリールのテープデッキがせり上がり、リールが回って
 *                 カウンター 00:00 → 00:30、クリップにコーラルの波形が録られる。TARGET 00:30 にチェック。
 *  B7  t3-5 後半  「自分の声を」: デッキの OUT からパッチケーブルが CH 3 へ伸びて刺さり、信号が渡る。
 *                 「再現することもできます」: 空きスロットが本物のチャンネル「CH 3 / 自分の声」になり、
 *                 画面に同じ形の波形が塗られ、フェーダーが 0 dB へ。READY。試聴の再生ヘッドが一度だけ走り、VU が振れる。
 *                 （同意の話は TRACK 05 の見せ場なのでここでは出さない）そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Oscilloscope, VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { IconChats, IconDoc, IconMic, IconUser } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, section, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { Avatar, CLIP_N, CLIP_SHAPE, ClipWave, Fader, cable, envAt } from "./T3Dialogue/parts";
import { DECK, DECK_CLIP, TapeDeck } from "./T3Dialogue/deck";
import { phrases } from "./T3Dialogue/timing";

// ───────── タイミング（すべて行・行内のフレーズ・シーン境界から計算） ─────────
const E = sceneEnter("t3");
const L1 = line("t3-1");
const L2 = line("t3-2");
const L3 = line("t3-3");
const L4 = line("t3-4");
const L5 = line("t3-5");
const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);
const [, P1b] = phrases("t3-1", [0.5]); // トラック3は、 / 2人の会話。
const [P2a, P2b] = phrases("t3-2", [0.4]); // 1本の台本から、 / 2人分の声をまとめて作れます。
const [P5a, P5b] = phrases("t3-5", [0.4]); // 30秒の音声があれば、 / 自分の声を再現することもできます。

const CAB_START = P2b.start + 0.28;
const PLUG = CAB_START + 0.42;
const PULSE = Math.max(mix(P2b.start, P2b.end, 0.45), PLUG + 0.12); // 「まとめて」
const REGROUP = Math.max(L4.end + 0.1, L5.start - 0.4); // 台本が抜け、CH 2 が寄る
const DECK_IN = Math.max(L5.start - 0.05, REGROUP + 0.45);
const REC_A = Math.max(P5a.start + 0.15, DECK_IN + 0.35); // 「30秒の音声があれば」
const REC_B = Math.max(REC_A + 0.8, P5a.end);
const PATCH = Math.max(P5b.start - 0.05, REC_B + 0.15); // 「自分の声を」
const TM = {
  headIn: E + 0.08,
  duo: P1b.start - 0.05, // 「2人の会話」
  settleA: L2.start - 0.3,
  settleB: L2.start + 0.32,
  sheetIn: L2.start + 0.12,
  typeA: L2.start + 0.34,
  typeB: Math.max(L2.start + 1.0, P2a.end + 0.15),
  strips: P2b.start, // 「2人分の声を」
  cables: CAB_START,
  plug: PLUG,
  pulse: PULSE,
  arrive: PULSE + 0.36,
  bOn: L3.start - 0.12,
  onePass: at(L3, 0.42), // 「1回で」
  aOn: L4.start - 0.12,
  aOff: L4.end + 0.05,
  regroup: REGROUP,
  slide: REGROUP + 0.12, // CH 2 が CH 1 の隣へ（0.7 秒）
  slot: REGROUP + 0.7, // CH 2 が寄り終わるころに空きスロット
  swap: Math.max(REGROUP + 0.1, L5.start - 0.2),
  deckIn: DECK_IN,
  recA: REC_A,
  recB: REC_B,
  patch: PATCH,
  plug3: PATCH + 0.4,
  send: PATCH + 0.4,
  land: PATCH + 0.72,
  fillB: Math.max(PATCH + 1.3, at(P5b, 0.72)), // 「再現することもできます」
  sweepA: Math.max(PATCH + 1.5, at(P5b, 0.8)),
};

// 話している度合い（0〜1）
// 台詞の順番は台本の voice から決める（t3-3 を話すのが A でも B でも絵が合う）
type Side = "A" | "B";
const FIRST: Side = line("t3-3").voice === "speakerA" ? "A" : "B";
const rowOf = (side: Side) => (side === FIRST ? 0 : 1);
const lineOf = (side: Side) => (rowOf(side) === 0 ? "t3-3" : "t3-4");
const act1 = (t: number) => prog(t, TM.bOn, TM.bOn + 0.22) * (1 - prog(t, TM.aOn - 0.02, TM.aOn + 0.22));
const act2 = (t: number) => prog(t, TM.aOn, TM.aOn + 0.22) * (1 - prog(t, TM.aOff, TM.aOff + 0.3));
const actOf = (side: Side, t: number) => (rowOf(side) === 0 ? act1(t) : act2(t));
const actA = (t: number) => actOf("A", t);
const actB = (t: number) => actOf("B", t);
// t3-5: 2 人のチャンネルは一歩下がる
const backOf = (t: number) => prog(t, TM.regroup, TM.regroup + 0.5);

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80 };
const BIG_CY = 432;
const MIX_Y = 318;
const STRIP = { w: 300, h: 540 };
const GUTTER = 24;
const CHA = { x: PAD_X, y: MIX_Y };
const CHB = { x: 1920 - PAD_X - STRIP.w, y: MIX_Y };
// t3-5 の並び: CH 1 | CH 2 | CH 3（新） ‖ テープデッキ
const CHB_T5 = PAD_X + STRIP.w + GUTTER;
const CH3 = { x: PAD_X + (STRIP.w + GUTTER) * 2, y: MIX_Y };
const DECK_POS = { x: 1920 - PAD_X - DECK.w, y: MIX_Y };
const SHEET = { x: 526, y: 416, w: 868, h: 344 };
const ROW = { top: 80, h: 88, nameX: 72, textX: 190, fs: 34 };
const ROW_Y = [0, 1].map((i) => SHEET.y + ROW.top + ROW.h * i + ROW.h / 2);
const AV_R = 34;
const AV_A = { x: CHA.x + 56, y: MIX_Y + 114 };
const AV_B = { x: CHB.x + STRIP.w - 56, y: MIX_Y + 114 }; // CH 2 は左右反転（会話の左右）
// 台本が出ている間、2 本のマイクは自分の行の外側で待つ
const SIDE_A = { x: SHEET.x - 58, y: ROW_Y[rowOf("A")] };
const SIDE_B = { x: SHEET.x + SHEET.w + 58, y: ROW_Y[rowOf("B")] };
// チャンネルは台本の後ろからこの距離だけ左右へ滑り出る（マイクはそれに乗って運ばれる）
const STRIP_SLIDE = SIDE_A.x - AV_A.x;
const DUO = { y: 640, dx: 180, r: 48 };
const CAB_A = cable({ x: SHEET.x, y: ROW_Y[rowOf("A")] }, { x: CHA.x + STRIP.w, y: AV_A.y });
const CAB_B = cable({ x: SHEET.x + SHEET.w, y: ROW_Y[rowOf("B")] }, { x: CHB.x, y: AV_B.y });
// t3-5: デッキの OUT → CH 3 の入力
const CAB_3 = cable({ x: DECK_POS.x, y: DECK_POS.y + DECK_CLIP.y + DECK_CLIP.h / 2 }, { x: CH3.x + STRIP.w, y: AV_A.y });

// ───────── 見出しの文字 ─────────
// 見出しは section("t3").title をそのまま使う（台本側でタイトルを変えても追従する）
const TITLE_A = section("t3").title || "2人の会話も、1本の台本で";
const TITLE_B = "30秒で、自分の声も";
// コーラルで強調する語（最初に見つかったもの）
const EMPH = ["1本", "30秒", "同時", "ワンテイク", "ふたり", "2人"];
const emphMask = (s: string) => {
  const chars = [...s];
  const w = EMPH.find((k) => s.includes(k));
  const i = w ? chars.join("").indexOf(w) : -1;
  return chars.map((_, k) => i >= 0 && k >= i && k < i + [...(w ?? "")].length);
};
// Dela Gothic One の字幅（実測: 数字 ≈ .86em、読点 .41em、句点 .33em、ほか全角 1em）+ 字間 .02em
const dispW = (s: string, size: number) =>
  [...s].reduce(
    (a, ch) => a + size * ((/[0-9]/.test(ch) ? 0.86 : /[A-Za-z]/.test(ch) ? 0.8 : ch === "、" ? 0.42 : ch === "。" ? 0.34 : 1) + 0.02),
    0,
  );
const HEAD_W = dispW(TITLE_A, HEAD.size);
const BIG = Math.min(1.4, (1920 - PAD_X * 2) / HEAD_W);

type RowDef = { name: string; text: string; id: string; color: string; soft: string };
const plain = (id: string) => line(id).text.replace(/[「」]/g, "");
const rowDef = (side: Side): RowDef => ({
  name: `話者 ${side}`,
  text: plain(lineOf(side)),
  id: lineOf(side),
  color: side === "A" ? C.coral : C.mint,
  soft: side === "A" ? C.coralSoft : C.mintSoft,
});
const ROWS: RowDef[] = [rowDef(FIRST), rowDef(FIRST === "A" ? "B" : "A")];
// 行ごとの打鍵の時間帯
const TYPE_MID = mix(TM.typeA, TM.typeB, 0.5);
const ROW_TYPE = [
  { a: TM.typeA, b: TYPE_MID - 0.04 },
  { a: TYPE_MID + 0.04, b: TM.typeB },
];

const mono = (size: number, color: string = C.sub, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.16em",
  color,
  whiteSpace: "nowrap",
  ...extra,
});

const micIcon = (color: string, size: number) => <IconMic size={size} color={color} sw={1.9} />;
const userIcon = (color: string, size: number) => <IconUser size={size} color={color} sw={1.9} />;

// ───────── 見出し（t3-5 で VOICE CLONE の見出しへ入れ替わる） ─────────
const TitleChars: React.FC<{ text: string; t: number; inAt: number; outAt?: number }> = ({ text, t, inAt, outAt }) => {
  const chars = [...text];
  const mask = emphMask(text);
  return (
    <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
      {chars.map((ch, i) => {
        const p = prog(t, inAt + i * 0.035, inAt + i * 0.035 + 0.5, ease.outQuint);
        const o = outAt === undefined ? 0 : prog(t, outAt + i * 0.022, outAt + i * 0.022 + 0.34, ease.inOut);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105 - o * 105}%)`, color: mask[i] ? C.coral : C.text }}>
              {ch}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const s = mix(BIG, 1, settle);
  const bigW = HEAD_W * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(BIG_CY - bigH / 2 - HEAD.y, 0, settle);
  const lab = prog(t, TM.headIn + 0.25, TM.headIn + 0.7, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.2, TM.headIn + 0.8, ease.outQuint);
  // ラベルの入れ替え
  const labOut = prog(t, TM.swap, TM.swap + 0.25);
  const labIn = prog(t, TM.swap + 0.25, TM.swap + 0.6, ease.outQuint);
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
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, height: 24, marginBottom: 10 }}>
        <div style={{ width: 40 * rule, height: 3, background: C.coral, borderRadius: 2 }} />
        <div style={{ position: "relative" }}>
          <div style={{ ...mono(20, C.sub), letterSpacing: "0.2em", opacity: lab * (1 - labOut), transform: `translateX(${(1 - lab) * -12}px)` }}>
            <span style={{ color: C.coral }}>03</span> — MULTI-SPEAKER
          </div>
          {labIn > 0 && (
            <div style={{ position: "absolute", left: 0, top: 0, ...mono(20, C.sub), letterSpacing: "0.2em", opacity: labIn, transform: `translateX(${(1 - labIn) * -12}px)` }}>
              <span style={{ color: C.coral }}>03+</span> — VOICE CLONE
            </div>
          )}
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <TitleChars text={TITLE_A} t={t} inAt={TM.headIn} outAt={TM.swap} />
        {t >= TM.swap + 0.15 && (
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <TitleChars text={TITLE_B} t={t} inAt={TM.swap + 0.15} />
          </div>
        )}
      </div>
    </div>
  );
};

// ───────── t3-1: 2 本のマイクの予告（点線・ラベル。丸は Avatars が描く） ─────────
const Duo: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.duo + 0.1, TM.duo + 0.55, ease.outQuint);
  const out = prog(t, TM.settleA - 0.1, TM.settleA + 0.22);
  if (inP <= 0 || out >= 1) return null;
  const gapIn = DUO.r + 18;
  const half = DUO.dx - gapIn;
  const icon = springAt(t, TM.duo + 0.25, { damping: 13, stiffness: 170 });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: 1 - out }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[-1, 1].map((sgn) => (
          <line
            key={sgn}
            x1={960 + sgn * 36}
            y1={DUO.y}
            x2={960 + sgn * (36 + (half - 36) * inP)}
            y2={DUO.y}
            stroke={C.borderHi}
            strokeWidth={2}
            strokeDasharray="4 8"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 960 - 20, top: DUO.y - 20, transform: `scale(${icon})` }}>
        <IconChats size={40} color={C.sub} sw={1.7} />
      </div>
      {(["A", "B"] as const).map((s, i) => (
        <div
          key={s}
          style={{
            position: "absolute",
            left: 960 + (i === 0 ? -1 : 1) * DUO.dx - 120,
            width: 240,
            top: DUO.y + DUO.r + 26,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 26,
            lineHeight: "32px",
            color: i === 0 ? C.coral : C.mint,
            whiteSpace: "nowrap",
            opacity: inP,
            transform: `translateY(${(1 - inP) * 10}px)`,
          }}
        >
          話者 {s}
        </div>
      ))}
    </div>
  );
};

// ───────── マイク（t3-1 の予告位置 → チャンネルの位置へ飛ぶ） ─────────
const stripStart = (side: "A" | "B") => TM.strips + (side === "A" ? 0 : 0.08);
const stripIn = (t: number, side: "A" | "B") => prog(t, stripStart(side), stripStart(side) + 0.72, ease.outQuint);
// t3-5 で CH 2 が CH 1 の隣へ寄る量
const slideB = (t: number) => mix(0, CHB_T5 - CHB.x, prog(t, TM.slide, TM.slide + 0.7, ease.inOut));

const Avatars: React.FC<{ t: number }> = ({ t }) => {
  const mv = prog(t, TM.settleA, TM.settleB + 0.05, ease.inOut);
  const back = backOf(t);
  return (
    <>
      {(["A", "B"] as const).map((s) => {
        const isA = s === "A";
        const pre = { x: 960 + (isA ? -1 : 1) * DUO.dx, y: DUO.y };
        const side = isA ? SIDE_A : SIDE_B;
        const fin = isA ? AV_A : AV_B;
        const pop = springAt(t, TM.duo + (isA ? 0 : 0.04), { damping: 12, stiffness: 170 });
        const ride = stripIn(t, s); // チャンネルと同じ動き
        const rideY = prog(t, stripStart(s), stripStart(s) + 0.6, ease.outQuint);
        const x = mix(mix(pre.x, side.x, mv), fin.x, ride) + (isA ? 0 : slideB(t));
        const y = mix(mix(pre.y, side.y, mv) - Math.sin(mv * Math.PI) * 36, fin.y, rideY);
        const act = isA ? actA(t) : actB(t);
        const other = isA ? actB(t) : actA(t);
        const env = act * envAt(lineOf(s), t);
        // 予告のときに一度ずつ「話す」輪
        const hint = prog(t, TM.duo + (isA ? 0.45 : 0.8), TM.duo + (isA ? 1.05 : 1.4), ease.out);
        const hintEnv = hint > 0 && hint < 1 ? Math.sin(hint * Math.PI) * 0.7 : 0;
        return (
          <Avatar
            key={s}
            x={x}
            y={y}
            r={mix(DUO.r, AV_R, mv)}
            icon={micIcon}
            color={isA ? C.coral : C.mint}
            env={Math.max(env, hintEnv * (1 - mv))}
            lit={act}
            scale={pop * mix(1, 0.985, other)}
            opacity={clamp01(pop * 3) * mix(1, 0.4, other) * mix(1, 0.42, back)}
          />
        );
      })}
    </>
  );
};

// ───────── 中央: 台本 ─────────
const Sheet: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.sheetIn, TM.sheetIn + 0.6, ease.outQuint);
  const outP = prog(t, TM.regroup, TM.regroup + 0.4, ease.inOut);
  if (inP <= 0 || outP >= 1) return null;
  const passOn = prog(t, TM.pulse - 0.08, TM.pulse + 0.1);
  // 点灯でばね、「1回で」でもう一度だけ小さくはねる
  const passPop = springAt(t, TM.pulse - 0.08, { damping: 10, stiffness: 220 });
  const bump = Math.sin(Math.PI * prog(t, TM.onePass, TM.onePass + 0.4, ease.out));
  const passScale = (t < TM.pulse - 0.08 ? 1 : mix(0.86, 1, passPop)) * (1 + 0.12 * bump);
  const passGlow = passOn * (0.5 + 0.5 * (1 - prog(t, TM.pulse, TM.pulse + 0.8))) + 0.7 * bump;
  const typing = t >= TM.typeA - 0.1 && t < TM.typeB + 0.15;
  const status = typing ? (
    <span style={{ color: C.coral }}>● TYPING</span>
  ) : (
    <span style={{ color: C.sub }}>2 SPEAKERS</span>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: SHEET.x,
        top: SHEET.y,
        opacity: inP * (1 - outP),
        transform: `translateY(${(1 - inP) * 48 + outP * 70}px)`,
      }}
    >
      <Panel
        w={SHEET.w}
        h={SHEET.h}
        header={
          <>
            <IconDoc size={22} color={C.sub} sw={1.8} />
            <span>SCRIPT</span>
            <span style={{ color: C.dim, fontWeight: 500, letterSpacing: "0.06em" }}>dialogue.txt</span>
          </>
        }
        status={status}
      >
        {ROWS.map((r, i) => {
          const ty = ROW_TYPE[i];
          const chars = [...r.text];
          const shown = Math.floor(chars.length * clamp01((t - ty.a) / (ty.b - ty.a)) + 1e-6);
          const tagPop = springAt(t, ty.a - 0.06, { damping: 12, stiffness: 200 });
          const act = i === 0 ? act1(t) : act2(t);
          const L = line(r.id);
          const talk = prog(t, L.start, L.end, ease.linear);
          const done = prog(t, L.end + 0.05, L.end + 0.35, ease.outQuint);
          const caretOn = t >= ty.a - 0.1 && t < ty.b + 0.12;
          const textW = chars.reduce((a, ch) => a + (/[0-9A-Za-z]/.test(ch) ? ROW.fs * 0.6 : ROW.fs), 0);
          const y0 = ROW.top + ROW.h * i;
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: y0, width: SHEET.w, height: ROW.h }}>
              {/* ハイライト */}
              {act > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    top: 6,
                    bottom: 6,
                    borderRadius: 12,
                    background: r.soft,
                    opacity: act,
                    boxShadow: `inset 4px 0 0 ${r.color}`,
                  }}
                />
              )}
              {/* 行番号 */}
              <div style={{ position: "absolute", left: 30, top: ROW.h / 2 - 10, ...mono(16, C.dim, { fontWeight: 500, letterSpacing: "0.04em" }) }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* 話者名（台本の書き分け） */}
              <div
                style={{
                  position: "absolute",
                  left: ROW.nameX,
                  top: ROW.h / 2 - 17,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 24,
                  color: r.color,
                  whiteSpace: "nowrap",
                  opacity: clamp01(tagPop * 2),
                  transform: `translateX(${(1 - tagPop) * -10}px)`,
                  textShadow: act > 0.5 ? `0 0 14px ${r.color}88` : undefined,
                }}
              >
                {r.name}
              </div>
              <div style={{ position: "absolute", left: ROW.textX - 20, top: ROW.h / 2 - 16, width: 2, height: 32, borderRadius: 1, background: r.color, opacity: 0.55 * clamp01(tagPop) }} />
              {/* 台詞 */}
              <div
                style={{
                  position: "absolute",
                  left: ROW.textX,
                  top: ROW.h / 2 - ROW.fs * 0.72,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: ROW.fs,
                  lineHeight: `${ROW.fs * 1.44}px`,
                  color: mix(0, 1, done) > 0.5 && act < 0.5 ? C.sub : C.text,
                  whiteSpace: "nowrap",
                }}
              >
                {chars.slice(0, shown).join("")}
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: ROW.fs * 1.05,
                    marginLeft: 4,
                    verticalAlign: -ROW.fs * 0.18,
                    borderRadius: 2,
                    background: C.coral,
                    opacity: caretOn ? 1 : 0,
                    boxShadow: `0 0 8px ${C.coral}`,
                  }}
                />
              </div>
              {/* 読み進みバー */}
              {act > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: ROW.textX,
                    top: ROW.h - 16,
                    width: textW,
                    height: 3,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    opacity: act,
                  }}
                >
                  <div style={{ width: textW * talk, height: 3, borderRadius: 2, background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                </div>
              )}
              {/* 済み */}
              {done > 0 && (
                <svg
                  width={30}
                  height={30}
                  viewBox="0 0 24 24"
                  style={{ position: "absolute", right: 36, top: ROW.h / 2 - 15, opacity: done, transform: `scale(${mix(0.6, 1, done)})` }}
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke={r.color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
        {/* フッター */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 272, height: 1, background: C.border }} />
        <div style={{ position: "absolute", left: 30, top: 296, ...mono(16, C.sub) }}>
          OUT <span style={{ color: C.dim }}>→</span> CH 1 <span style={{ color: C.dim }}>/</span> CH 2
        </div>
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 290,
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: `1.5px solid ${passOn > 0.5 ? C.coral : C.borderHi}`,
            background: `rgba(255,106,61,${passOn})`,
            boxShadow: passOn > 0 ? `0 0 ${28 * passGlow}px ${C.coral}aa` : undefined,
            transform: `scale(${passScale})`,
            ...mono(16, passOn > 0.5 ? C.ink : C.dim),
          }}
        >
          <svg width={12} height={14} viewBox="0 0 12 14">
            <path d="M1 1l10 6-10 6z" fill={passOn > 0.5 ? C.ink : C.dim} />
          </svg>
          1 PASS
        </div>
      </Panel>
    </div>
  );
};

// ───────── 左右: チャンネルストリップ ─────────
const dbText = (v: number) => {
  if (v < 0.2) return "−∞";
  const pts = [
    [0.2, -40],
    [0.4, -20],
    [0.6, -10],
    [0.8, 0],
  ];
  for (let k = 0; k < pts.length - 1; k++) {
    const [v0, d0] = pts[k];
    const [v1, d1] = pts[k + 1];
    if (v <= v1) return mix(d0, d1, (v - v0) / (v1 - v0)).toFixed(1).replace("-", "−");
  }
  return "0.0";
};

const Strip: React.FC<{ t: number; side: "A" | "B" }> = ({ t, side }) => {
  const isA = side === "A";
  const pos = isA ? CHA : CHB;
  const color = isA ? C.coral : C.mint;
  const lid = lineOf(side);
  const inP = stripIn(t, side);
  if (inP <= 0) return null;
  const act = isA ? actA(t) : actB(t);
  const other = isA ? actB(t) : actA(t);
  const armed = prog(t, TM.arrive, TM.arrive + 0.2);
  const flash = t >= TM.arrive ? 1 - prog(t, TM.arrive, TM.arrive + 0.7) : 0;
  const fv = mix(0.04, 0.8, prog(t, TM.arrive, TM.arrive + 0.7, ease.outQuint));
  const L = line(lid);
  const el = clamp01((t - L.start) / L.dur) * L.dur;
  const status =
    act > 0.5 ? (
      <span style={{ color }}>● LIVE</span>
    ) : armed > 0.5 ? (
      <span style={{ color: C.sub }}>
        <span style={{ color }}>●</span> READY
      </span>
    ) : (
      <span style={{ color: C.dim }}>○ IDLE</span>
    );
  const slide = (1 - inP) * STRIP_SLIDE * (isA ? 1 : -1);
  const back = backOf(t);
  return (
    <div
      style={{
        position: "absolute",
        left: pos.x + (isA ? 0 : slideB(t)),
        top: pos.y,
        opacity: clamp01(inP * 2.2) * mix(1, 0.4, other) * mix(1, 0.42, back),
        transform: `translateX(${slide}px) scale(${mix(1, 0.985, other)})`,
      }}
    >
      <Panel
        w={STRIP.w}
        h={STRIP.h}
        header={<span style={{ color: act > 0.5 ? C.text : C.sub }}>CH {isA ? 1 : 2}</span>}
        status={status}
        accent={color}
        glow={Math.max(act * 0.85, flash * 0.7)}
      >
        {/* 名札（左の丸は Avatars が上から描く） */}
        <div style={{ position: "absolute", top: 82, ...(isA ? { left: 104 } : { right: 104, textAlign: "right" }) }}>
          <div style={mono(14, C.sub, { letterSpacing: "0.18em", marginRight: isA ? 0 : -2 })}>SPEAKER</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, lineHeight: "44px", color: C.text, whiteSpace: "nowrap" }}>
            話者 {side}
          </div>
        </div>
        {/* 吹き出し型のスクリーン */}
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 172,
            width: 256,
            height: 118,
            borderRadius: 14,
            boxSizing: "border-box",
            background: "#0A0C10",
            border: `1.5px solid ${act > 0.5 ? color : C.border}`,
            boxShadow: act > 0 ? `0 0 ${22 * act}px ${color}33 inset` : undefined,
          }}
        >
          <svg
            width={40}
            height={24}
            style={{ position: "absolute", left: isA ? 20 : 256 - 20 - 40 - 3, top: -19, overflow: "visible", transform: isA ? undefined : "scaleX(-1)" }}
          >
            <path d="M2 20 L14 2 L30 20 Z" fill="#0A0C10" />
            <path d="M2 19.5 L14 2 L30 19.5" fill="none" stroke={act > 0.5 ? color : C.border} strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
          <div style={{ position: "absolute", left: 18, top: 16, opacity: mix(0.35, 1, act) }}>
            <Oscilloscope width={220} height={70} color={act > 0.2 ? color : C.dim} lines={[lid]} gain={2.1} thickness={3} glow={act > 0.5} />
          </div>
          <div style={{ position: "absolute", right: 12, bottom: 8, ...mono(13, act > 0.5 ? color : C.dim, { fontWeight: 500, letterSpacing: "0.06em" }) }}>
            {`00:0${Math.floor(el)}.${Math.floor((el % 1) * 10)}`}
          </div>
        </div>
        {/* メーター + フェーダー */}
        <div style={{ position: "absolute", left: 60, top: 318 }}>
          <VUMeter width={22} height={172} segments={18} value={Math.min(1, envAt(lid, t) * 1.3) * act} />
        </div>
        <div style={{ position: "absolute", left: 122, top: 318 }}>
          <Fader h={172} v={fv} color={color} lit={Math.max(armed * 0.4, act)} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 504,
            textAlign: "center",
            ...mono(15, armed > 0.5 ? C.text : C.dim, { fontWeight: 500, letterSpacing: "0.08em" }),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {dbText(fv)} <span style={{ color: C.sub }}>dB</span>
        </div>
      </Panel>
    </div>
  );
};

// ───────── パッチケーブル（台本の行 → チャンネル） ─────────
const Cables: React.FC<{ t: number; layer: "under" | "over" }> = ({ t, layer }) => {
  const draw = prog(t, TM.cables, TM.plug, ease.inOut);
  const gone = prog(t, TM.regroup, TM.regroup + 0.3);
  if (draw <= 0 || gone >= 1) return null;
  const plugged = t >= TM.plug;
  const pulse = prog(t, TM.pulse, TM.arrive, ease.inOut);
  const items = [
    { c: CAB_B, color: C.mint, act: actB(t) },
    { c: CAB_A, color: C.coral, act: actA(t) },
  ];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: 1 - gone }}>
      {items.map(({ c, color, act }, i) => {
        if (layer === "under") {
          return (
            <g key={i}>
              <path
                d={c.d}
                fill="none"
                stroke={plugged ? color : C.borderHi}
                strokeOpacity={plugged ? 0.4 : 1}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${c.len * draw} 9999`}
              />
              {act > 0 && (
                <path
                  d={c.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeDasharray="10 16"
                  strokeDashoffset={-t * 150}
                  opacity={act}
                  style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                />
              )}
            </g>
          );
        }
        // over: 両端のジャックと信号の粒
        const a = c.pt(0);
        const b = c.pt(1);
        const tip = c.pt(draw);
        const p = c.pt(pulse);
        return (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={7} fill={C.panel} stroke={color} strokeWidth={2.5} />
            {draw < 1 && <circle cx={tip.x} cy={tip.y} r={5} fill={color} />}
            <circle cx={b.x} cy={b.y} r={7} fill={plugged ? color : C.panel} stroke={plugged ? color : C.borderHi} strokeWidth={2.5} />
            {pulse > 0 && pulse < 1 && (
              <circle cx={p.x} cy={p.y} r={8} fill={C.text} stroke={color} strokeWidth={3} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ───────── t3-5: 空きスロット → CH 3「自分の声」 ─────────
const Channel3: React.FC<{ t: number }> = ({ t }) => {
  const slot = prog(t, TM.slot, TM.slot + 0.5, ease.outQuint);
  if (slot <= 0) return null;
  const mat = prog(t, TM.land, TM.land + 0.45, ease.outQuint); // スロットが本物のチャンネルになる
  const fillP = prog(t, TM.land + 0.05, TM.fillB, ease.inOut);
  const ready = prog(t, TM.fillB, TM.fillB + 0.2);
  const flash = t >= TM.fillB ? 1 - prog(t, TM.fillB, TM.fillB + 0.9) : 0;
  const sweep = prog(t, TM.sweepA, TM.sweepA + 0.9, ease.linear);
  const playing = sweep > 0 && sweep < 1;
  const k = Math.min(CLIP_N - 1, Math.floor(sweep * CLIP_N));
  const lvl = playing ? CLIP_SHAPE[k] * 0.95 * Math.sin(Math.PI * sweep) ** 0.3 : 0;
  const fv = mix(0.04, 0.8, fillP);
  const incoming = prog(t, TM.send, TM.land); // ケーブルの信号が近づく
  const status =
    ready > 0.5 ? (
      <span style={{ color: C.coral }}>● READY</span>
    ) : (
      <span style={{ color: C.coral }}>● CLONING</span>
    );
  const scrW = 256 - 36;
  return (
    <div style={{ position: "absolute", left: CH3.x, top: CH3.y, width: STRIP.w, height: STRIP.h }}>
      {/* 空きスロット（点線） */}
      {mat < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: slot * (1 - mat), transform: `translateY(${(1 - slot) * 24}px)` }}>
          <svg width={STRIP.w} height={STRIP.h} style={{ position: "absolute", left: 0, top: 0 }}>
            <rect
              x={1}
              y={1}
              width={STRIP.w - 2}
              height={STRIP.h - 2}
              rx={18}
              fill="rgba(255,255,255,0.015)"
              stroke={incoming > 0 ? C.coral : C.borderHi}
              strokeOpacity={incoming > 0 ? 0.5 + 0.5 * incoming : 1}
              strokeWidth={2}
              strokeDasharray="10 10"
            />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: STRIP.h / 2 - 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <svg width={56} height={56} viewBox="0 0 56 56">
              <circle cx={28} cy={28} r={26} fill="none" stroke={C.borderHi} strokeWidth={2} />
              <path d="M28 17v22M17 28h22" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" />
            </svg>
            <div style={mono(20, C.sub, { letterSpacing: "0.2em" })}>CH 3</div>
            <div style={mono(15, C.dim, { fontWeight: 500, letterSpacing: "0.18em" })}>EMPTY</div>
          </div>
        </div>
      )}
      {/* 本物のチャンネル */}
      {mat > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: mat, transform: `scale(${mix(0.96, 1, mat)})` }}>
          <Panel
            w={STRIP.w}
            h={STRIP.h}
            header={<span style={{ color: C.text }}>CH 3</span>}
            status={status}
            accent={C.coral}
            glow={Math.max(0.55 * flash, playing ? 0.35 : 0, (1 - ready) * 0.25 * mat)}
          >
            <div style={{ position: "absolute", top: 82, left: 104 }}>
              <div style={mono(14, C.coral, { letterSpacing: "0.18em" })}>NEW VOICE</div>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, lineHeight: "44px", color: C.text, whiteSpace: "nowrap" }}>自分の声</div>
            </div>
            <div
              style={{
                position: "absolute",
                left: 22,
                top: 172,
                width: 256,
                height: 118,
                borderRadius: 14,
                boxSizing: "border-box",
                background: "#0A0C10",
                border: `1.5px solid ${fillP > 0 && ready < 1 ? C.coral : playing ? C.coral : C.border}`,
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", left: 18, top: 24 }}>
                <ClipWave width={scrW} height={70} color={C.coral} fill={fillP} ghost={mat} />
              </div>
              {fillP > 0 && fillP < 1 && (
                <div style={{ position: "absolute", left: 18 + scrW * fillP, top: 10, bottom: 10, width: 2, background: C.coral, boxShadow: `0 0 10px ${C.coral}` }} />
              )}
              {playing && (
                <div
                  style={{
                    position: "absolute",
                    left: 18 + scrW * sweep,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: C.text,
                    opacity: Math.sin(Math.PI * sweep) ** 0.5,
                    boxShadow: `0 0 12px ${C.text}`,
                  }}
                />
              )}
            </div>
            <div style={{ position: "absolute", left: 60, top: 318 }}>
              <VUMeter width={22} height={172} segments={18} value={lvl} />
            </div>
            <div style={{ position: "absolute", left: 122, top: 318 }}>
              <Fader h={172} v={fv} color={C.coral} lit={Math.max(ready * 0.5, fillP > 0 && fillP < 1 ? 0.8 : 0, playing ? 1 : 0)} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 504,
                textAlign: "center",
                ...mono(15, fillP > 0.2 ? C.text : C.dim, { fontWeight: 500, letterSpacing: "0.08em" }),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {dbText(fv)} <span style={{ color: C.sub }}>dB</span>
            </div>
          </Panel>
          <Avatar
            x={56}
            y={114}
            r={AV_R}
            icon={userIcon}
            color={C.coral}
            env={lvl}
            lit={Math.max(flash, playing ? 0.9 * Math.sin(Math.PI * sweep) ** 0.3 : 0)}
            scale={springAt(t, TM.land, { damping: 12, stiffness: 190 })}
          />
        </div>
      )}
    </div>
  );
};

// ───────── t3-5: テープデッキ ─────────
const Deck: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.deckIn, TM.deckIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
  const cnt = prog(t, TM.recA, TM.recB, ease.linear);
  // リールは録音の間だけ回る（入りと止まりはなめらかに）
  const spin = prog(t, TM.recA - 0.08, TM.recB + 0.3, ease.inOut);
  const recording = t >= TM.recA && t < TM.recB + 0.04;
  const done = prog(t, TM.recB, TM.recB + 0.25);
  const status = recording ? (
    <span style={{ color: C.red }}>● REC</span>
  ) : done > 0.5 ? (
    <span style={{ color: C.coral }}>✓ 30 SEC</span>
  ) : (
    <span style={{ color: C.dim }}>○ STANDBY</span>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: DECK_POS.x,
        top: DECK_POS.y,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 56}px)`,
      }}
    >
      <TapeDeck
        cnt={cnt}
        angle={spin * 360 * 4}
        recording={recording}
        done={done}
        status={status}
        glow={recording ? 0.3 : 0.4 * done * (1 - prog(t, TM.recB, TM.recB + 0.9))}
      />
    </div>
  );
};

// ───────── t3-5: デッキの OUT → CH 3 のパッチケーブル ─────────
const Patch3: React.FC<{ t: number }> = ({ t }) => {
  const jack = prog(t, TM.recB, TM.recB + 0.3);
  if (jack <= 0) return null;
  const draw = prog(t, TM.patch, TM.plug3, ease.inOut);
  const plugged = t >= TM.plug3;
  const pulse = prog(t, TM.send, TM.land, ease.inOut);
  const a = CAB_3.pt(0);
  const b = CAB_3.pt(1);
  const tip = CAB_3.pt(draw);
  const p = CAB_3.pt(pulse);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {draw > 0 && (
        <path
          d={CAB_3.d}
          fill="none"
          stroke={plugged ? C.coral : C.borderHi}
          strokeOpacity={plugged ? 0.55 : 1}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${CAB_3.len * draw} 9999`}
        />
      )}
      <circle cx={a.x} cy={a.y} r={7} fill={C.panel} stroke={C.coral} strokeWidth={2.5} opacity={jack} />
      {draw > 0 && draw < 1 && <circle cx={tip.x} cy={tip.y} r={5} fill={C.coral} />}
      {draw > 0 && <circle cx={b.x} cy={b.y} r={7} fill={plugged ? C.coral : C.panel} stroke={plugged ? C.coral : C.borderHi} strokeWidth={2.5} />}
      {pulse > 0 && pulse < 1 && (
        <circle cx={p.x} cy={p.y} r={8} fill={C.text} stroke={C.coral} strokeWidth={3} style={{ filter: `drop-shadow(0 0 8px ${C.coral})` }} />
      )}
    </svg>
  );
};

// ───────── 本体 ─────────
export const T3Dialogue: React.FC = () => {
  const t = useTime();
  return (
    <SceneShell id="t3">
      <Cables t={t} layer="under" />
      <Strip t={t} side="A" />
      <Strip t={t} side="B" />
      <Sheet t={t} />
      <Cables t={t} layer="over" />
      <Duo t={t} />
      <Avatars t={t} />
      <Channel3 t={t} />
      <Deck t={t} />
      <Patch3 t={t} />
      <Headline t={t} />

      <Sfx at={TM.duo} name="pop" volume={0.18} />
      <Sfx at={TM.typeA} name="type" volume={0.14} />
      <Sfx at={TM.plug} name="click" volume={0.22} />
      <Sfx at={TM.arrive} name="tick" volume={0.2} />
      <Sfx at={TM.recA} name="tick" volume={0.16} />
      <Sfx at={TM.plug3} name="click" volume={0.2} />
      <Sfx at={TM.fillB} name="chime" volume={0.16} />
    </SceneShell>
  );
};
