/*
 * TRACK 02 — 演技指示（見出しは台本の section("t2").title をそのまま使う）
 *
 * コンセプト: 台本エディタと DAW のトラックを 1 枚にまとめた「台本 × テイク」の卓。
 * 3 本のトラック（WHISPER / LAUGH / SIGH）が、そのまま台本の 3 行になっている。
 * 行頭に演技のメモ（ト書き）を書き添える → その行を 1 テイク録る、を 1 行ずつ繰り返す。
 * メモは「ささやき声で」のような普通の言葉で書く（特定のタグ書式を公式のものとして見せない）。
 *
 * 絵コンテ（すべてナレーションの行・シーン境界から計算。秒は直書きしない）
 *  B0  enter   タイトルカード（中央・大。他トラックと同じ入り方）: MONO「02 — PERFORMANCE DIRECTION」、
 *              見出しがコーラルのキャレットで打ち込まれる。下に小さな台本カード（3 行 = 行番号 + メモ札 + 台詞の棒）。
 *  B1  t2-1    「1行ずつ」（音声の間から検出）で台本カードの 01→02→03 が 1 行ずつ灯り、各行のメモ札がミントに点く。
 *              言い終わり際に見出しが左上へ収まり、カードは消え、下から「SCRIPT × TAKES」卓がせり上がる。
 *              1 行目の行頭にミントのキャレット →「ささやき声で」が打鍵で書き添えられ、台詞が右へ押し出される。
 *  B2  t2-2    ささやき: コーラルのプレイヘッドが 1 行目のレーンを走り、実際の音声レベルから
 *              「息っぽい低い雲＋細い毛羽」のクリップが録音されていく。VU とテイク秒数が声に反応。
 *  B3  t2-3    行間でプレイヘッドが改行（左へ戻って 1 段下へ）→「笑いながら」が書き添えられ、鋭いスパイクのクリップ。
 *  B4  t2-4    同じく「ため息まじりに」→ 声が止まっても長く尾を引く包絡線のクリップ。録り終えると「✓ 3/3 TAKES」。
 *  B5  t2-5    「ささやきも / 笑いも / ため息も」の各フレーズ（音声の間から検出）で、その行のメモとクリップが順に脈打つ。
 *              「台本に書き添えるだけです」で 3 行のメモの下にミントのペン線が引かれ、
 *              言い終わりにかけて 3 本のテイクへ順に「KEEP」の判子が押される（テイクを選び終えた卓で締める）。
 *  B6  tail    すべて点いたまま（メモがゆっくり呼吸）、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { IconBubble, IconLaugh, IconSigh } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, section, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { ClipWave, phraseStarts, type ClipStyle } from "./T2Acting/clips";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t2");
const L1 = line("t2-1");
const L5 = line("t2-5");

// 「トラック2は、|1行ずつの演技指示」— いちばん長い間のあとが「1行ずつ」
const ONE_BY_ONE = phraseStarts("t2-1", 2, [0, 0.44])[1];
// 「ささやきも、|笑いも、|ため息も。|台本に書き添えるだけです。」
const P5 = phraseStarts("t2-5", 4, [0.02, 0.26, 0.44, 0.66]);

// タイトルカードが左上へ収まる: 「1行ずつ」の点灯を見せてから、t2-1 の言い終わり際に。
// 卓は 1 行目（ささやき）が始まる前に立ち上がり、メモが書き添えられる。
const SETTLE_A = Math.min(L1.end - 0.2, Math.max(ONE_BY_ONE + 0.75, L1.end - 0.5));
const SETTLE_B = SETTLE_A + 0.6;

type RowDef = {
  id: string;
  name: string;
  note: string; // 行頭に書き添える演技のメモ（ト書き）
  kind: ClipStyle;
  Icon: React.FC<{ size?: number; color?: string; sw?: number }>;
};
const ROW_DEFS: RowDef[] = [
  { id: "t2-2", name: "WHISPER", note: "ささやき声で", kind: "whisper", Icon: IconBubble },
  { id: "t2-3", name: "LAUGH", note: "笑いながら", kind: "laugh", Icon: IconLaugh },
  { id: "t2-4", name: "SIGH", note: "ため息まじりに", kind: "sigh", Icon: IconSigh },
];
const ROWS = ROW_DEFS.map((r, i) => {
  const L = line(r.id);
  // メモの打鍵: 1 行目は卓が立ち上がった直後〜ささやきの直前、2・3 行目は前の行の終わり際〜行間
  const typeA = i === 0 ? Math.max(SETTLE_A + 0.5, L.start - 0.4) : line(ROW_DEFS[i - 1].id).end - 0.16;
  const typeB = i === 0 ? Math.max(typeA + 0.3, L.start - 0.02) : Math.max(typeA + 0.2, L.start - 0.05);
  return { ...r, i, L, text: L.text, typeA, typeB, caretIn: typeA - (i === 0 ? 0.18 : 0.12) };
});
const LAST = ROWS[ROWS.length - 1].L;

const TM = {
  headIn: E + 0.12,
  headStep: 0.075,
  cardIn: E + 0.5,
  settleA: SETTLE_A,
  settleB: SETTLE_B,
  // 卓は見出しがほぼ収まってから下からせり上がる（途中の見出しと重ならない）
  panelIn: SETTLE_A + 0.33,
  rowsIn: SETTLE_A + 0.42,
  allTaken: LAST.end,
  finale: P5[3], // 「台本に書き添えるだけです」
  // 「…だけです」にかけて KEEP の判子（言い終わりより前に押し終える）
  stamp: Math.min(L5.end - 0.55, Math.max(P5[3] + 0.45, mix(P5[3], L5.end, 0.42))),
  stampStep: 0.16,
};

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 88 }; // y = MONO ラベルの上端（見出しはその 34px 下 = 190）
const BLOCK_H = 34 + HEAD.size * 1.1;
const BIG = 1.4; // タイトルカードのときの倍率
const BIG_TOP = 402 - (BLOCK_H * BIG) / 2;
const CARD = { w: 560, h: 172, hdr: 38, rh: 44 };
const CARD_TOP = BIG_TOP + BLOCK_H * BIG + 58;

const PX = PAD_X;
const PY = 316;
const PW = 1920 - PAD_X * 2;
const PH = 552;
const HDR = 56;
const RH = (PH - HDR) / 3;
const TW = 320; // トラックヘッダーの列
const CX = PX + TW + 32; // 台本とレーンの列
const CW = PX + PW - 32 - CX;
const rowTop = (i: number) => PY + HDR + i * RH;
const TEXT = { dy: 16, fs: 34, lh: 44 };
const LANE = { dy: 70, h: 82 };
const CLIP_X = 14; // レーン内でのクリップ開始位置
const MAX_DUR = Math.max(...ROWS.map((r) => r.L.dur));
const PPS = (CW - CLIP_X - 150) / MAX_DUR; // 3 本のレーンで共通の時間スケール（px/秒）

// 行頭のメモ札
const NOTE = { fs: 27, icon: 20, padX: 12, gap: 7 };
const noteW = (n: number) => NOTE.padX * 2 + NOTE.icon + NOTE.gap + n * NOTE.fs + 2;
// KEEP の判子（レーン右端の空き 136px に収まる）
const STAMP = { w: 112, h: 44 };

// 0→1→0 の短い脈動
const bump = (t: number, s: number, up = 0.14, down = 0.7) =>
  prog(t, s, s + up, ease.outQuint) * (1 - prog(t, s + up + 0.08, s + up + 0.08 + down, ease.inOut));

// #RRGGBB どうしの補間
const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  return `rgb(${pa.map((v, k) => Math.round(mix(v, pb[k], clamp01(p)))).join(",")})`;
};

// 和文の三点リーダー: Zen Kaku Gothic New は「…」をベースラインに置くので、字面の中央まで持ち上げる
const JpText: React.FC<{ s: string }> = ({ s }) => (
  <>
    {s.split(/(…+)/).map((part, k) =>
      part.startsWith("…") ? (
        <span key={k} style={{ display: "inline-block", transform: "translateY(-0.3em)" }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={k}>{part}</React.Fragment>
      ),
    )}
  </>
);

const IconPen: React.FC<{ size?: number; color?: string; sw?: number }> = ({ size = 20, color = C.mint, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20l1.2-4.2L15.8 5.2a2.1 2.1 0 0 1 3 3L8.2 18.8 4 20z" />
    <path d="M13.8 7.2l3 3" />
  </svg>
);

// ───────── プレイヘッド（行の終わりで「改行」して 1 段下へ） ─────────
// 行を録り終えると、プレイヘッドはそのレーンの中を左端へ巻き戻り、次の行のレーンの左端へ「落ちる」。
// （台詞の文字の上を横切らないよう、レーンの外には出ない）
type PH = { row: number; x: number; vis: number; drop: number };
const playheads = (t: number): PH[] => {
  const first = ROWS[0];
  if (t < first.L.start) {
    const v = prog(t, first.typeB - 0.25, first.typeB + 0.05, ease.outQuint);
    return [{ row: 0, x: CLIP_X, vis: v, drop: 1 - v }];
  }
  for (let i = 0; i < ROWS.length; i++) {
    const L = ROWS[i].L;
    const endX = CLIP_X + L.dur * PPS;
    if (t < L.end) return [{ row: i, x: CLIP_X + Math.max(0, t - L.start) * PPS, vis: 1, drop: 0 }];
    const next = ROWS[i + 1];
    if (!next) return [{ row: i, x: endX, vis: 1 - prog(t, L.end + 0.15, L.end + 0.5), drop: 0 }];
    if (t < next.L.start) {
      const a = L.end + 0.02;
      const b = next.L.start - 0.02;
      const back = prog(t, a, mix(a, b, 0.62), ease.inOut);
      const hand = prog(t, mix(a, b, 0.5), b, ease.outQuint);
      return [
        { row: i, x: mix(endX, CLIP_X, back), vis: 1 - hand, drop: 0 },
        { row: i + 1, x: CLIP_X, vis: hand, drop: 1 - hand },
      ];
    }
  }
  return [];
};

// ───────── 見出し（中央のタイトルカードで打ち込み → 左上へ収まる） ─────────
const HEAD_CHARS = [...(section("t2").title || "演技は、1行ずつ")];
const COMMA = HEAD_CHARS.indexOf("、");
const EMPH_FROM = COMMA >= 0 ? COMMA + 1 : HEAD_CHARS.length; // 読点のあとをコーラルに

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const u = 1 - settle;
  const shownN = HEAD_CHARS.filter((_, i) => t >= TM.headIn + i * TM.headStep).length;
  const typedEnd = TM.headIn + (HEAD_CHARS.length - 1) * TM.headStep;
  const rule = prog(t, E + 0.05, E + 0.6, ease.outQuint);
  const lab = prog(t, E + 0.2, E + 0.65, ease.outQuint);
  // キャレット: 打鍵中は点灯、打ち終わると 2 回点滅して消える
  const since = t - typedEnd;
  const caretOn = t >= TM.headIn - 0.05 && since < 1.5;
  const blink = since <= 0 ? 1 : 0.55 + 0.45 * Math.cos(since * Math.PI * 2.4);
  const caretOp = caretOn ? blink * (1 - prog(t, typedEnd + 1.1, typedEnd + 1.5)) : 0;
  const caretAt = Math.max(0, shownN - 1);
  return (
    <div
      style={{
        position: "absolute",
        left: mix(960, HEAD.x, settle),
        top: mix(BIG_TOP, HEAD.y, settle),
        width: "max-content",
        // 中央（自分の幅の半分だけ左へ）→ 左揃え。倍率の基準点も中央 → 左上へ
        transformOrigin: `${50 * u}% 0`,
        transform: `translateX(${-50 * u}%) scale(${mix(BIG, 1, settle)})`,
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
          <span style={{ color: C.coral }}>02</span> — PERFORMANCE DIRECTION
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontFamily: DISPLAY,
          fontSize: HEAD.size,
          lineHeight: 1.1,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {/* 全文字を最初から並べておき（幅が変わらない = 中央がぶれない）、打鍵した文字だけ見せる */}
        {HEAD_CHARS.map((ch, i) => {
          const s = TM.headIn + i * TM.headStep;
          const p = prog(t, s, s + 0.24, ease.outQuint);
          return (
            <span key={i} style={{ position: "relative", display: "inline-block" }}>
              <span
                style={{
                  display: "inline-block",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 16}px)`,
                  color: i >= EMPH_FROM ? C.coral : C.text,
                }}
              >
                {ch}
              </span>
              {i === caretAt && caretOp > 0 && (
                <span
                  style={{
                    position: "absolute",
                    left: shownN === 0 ? -4 : "calc(100% + 6px)",
                    top: "50%",
                    width: 9,
                    height: HEAD.size * 0.92,
                    marginTop: -HEAD.size * 0.46,
                    borderRadius: 2,
                    background: C.coral,
                    opacity: caretOp,
                    boxShadow: `0 0 14px ${C.coral}`,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── タイトルカードのモチーフ: 3 行の小さな台本（「1行ずつ」で 1 行ずつ灯る） ─────────
const CARD_BARS = [300, 214, 262];
const CARD_NOTES = [104, 88, 118];

const ScriptCard: React.FC<{ t: number }> = ({ t }) => {
  const appear = prog(t, TM.cardIn, TM.cardIn + 0.55, ease.outQuint);
  const out = prog(t, TM.settleA - 0.05, TM.settleA + 0.3, ease.inOut);
  if (appear <= 0 || out >= 1) return null;
  const hdr = prog(t, TM.cardIn + 0.1, TM.cardIn + 0.5, ease.outQuint);
  const allLit = prog(t, ONE_BY_ONE + 0.34, ONE_BY_ONE + 0.6, ease.outQuint);
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - CARD.w / 2,
        top: CARD_TOP,
        width: CARD.w,
        height: CARD.h,
        borderRadius: 16,
        boxSizing: "border-box",
        border: `1.5px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
        overflow: "hidden",
        opacity: appear * (1 - out),
        transform: `translateY(${(1 - appear) * 22 + out * 12}px) scale(${1 - 0.04 * out})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: 0,
          height: CARD.hdr,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.18em",
          opacity: hdr,
        }}
      >
        <span style={{ color: C.sub }}>SCRIPT</span>
        <span style={{ color: mixHex(C.dim, C.mint, allLit) }}>1 LINE · 1 NOTE</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CARD.hdr - 1, height: 1, background: C.border }} />
      {CARD_BARS.map((bw, i) => {
        const top = CARD.hdr + i * CARD.rh;
        const rin = prog(t, TM.cardIn + 0.15 + i * 0.08, TM.cardIn + 0.6 + i * 0.08, ease.outQuint);
        const s = ONE_BY_ONE + i * 0.17;
        const lit = prog(t, s, s + 0.22, ease.outQuint);
        const flash = bump(t, s, 0.1, 0.55);
        const nw = CARD_NOTES[i];
        return (
          <div key={i} style={{ position: "absolute", left: 0, top, width: CARD.w, height: CARD.rh, opacity: rin }}>
            <div style={{ position: "absolute", inset: 0, background: `rgba(255,106,61,${0.08 * flash})` }} />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 8,
                width: 3,
                height: CARD.rh - 16,
                borderRadius: 2,
                background: C.coral,
                opacity: flash,
                boxShadow: `0 0 10px ${C.coral}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 22,
                top: 0,
                height: CARD.rh,
                display: "flex",
                alignItems: "center",
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.06em",
                color: flash > 0.05 ? C.coral : mixHex(C.dim, C.sub, lit),
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            {/* メモ札（中身は抽象: ペン + 線） */}
            <div
              style={{
                position: "absolute",
                left: 64,
                top: (CARD.rh - 26) / 2,
                width: nw,
                height: 26,
                borderRadius: 8,
                boxSizing: "border-box",
                border: `1.5px solid ${mixHex(C.borderHi, C.mint, lit)}`,
                background: `rgba(59,227,180,${0.14 * lit})`,
                boxShadow: lit > 0.02 ? `0 0 ${14 * lit + 16 * flash}px rgba(59,227,180,${0.35 * lit})` : undefined,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 8px",
              }}
            >
              <IconPen size={14} color={mixHex(C.dim, C.mint, lit)} sw={2.2} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: mixHex(C.borderHi, C.mint, lit), opacity: 0.8 }} />
            </div>
            {/* 台詞の棒 */}
            <div
              style={{
                position: "absolute",
                left: 64 + nw + 16,
                top: (CARD.rh - 10) / 2,
                width: bw,
                height: 10,
                borderRadius: 5,
                background: `rgba(243,239,231,${mix(0.12, 0.5, lit)})`,
              }}
            />
            {i < 2 && <div style={{ position: "absolute", left: 20, right: 20, bottom: 0, height: 1, background: "rgba(255,255,255,0.04)" }} />}
          </div>
        );
      })}
    </div>
  );
};

// ───────── 台本の 1 行 = 1 トラック ─────────
const fmtSec = (s: number) => `${s.toFixed(2)}s`;

const TrackRow: React.FC<{ t: number; r: (typeof ROWS)[number] }> = ({ t, r }) => {
  const { i, L } = r;
  const top = rowTop(i);
  const appear = prog(t, TM.rowsIn + i * 0.08, TM.rowsIn + i * 0.08 + 0.5, ease.outQuint);

  // メモの打鍵
  const noteChars = [...r.note];
  const typeP = prog(t, r.typeA, r.typeB, ease.linear);
  const nTyped = typeP <= 0 ? 0 : Math.min(noteChars.length, Math.ceil(typeP * noteChars.length));
  const fullW = noteW(noteChars.length);
  const tagW = fullW * ease.out(clamp01(typeP * 1.15));
  const caretVis = prog(t, r.caretIn, r.caretIn + 0.12) * (1 - prog(t, r.typeB + 0.05, r.typeB + 0.25));
  const ring = prog(t, r.typeA, r.typeA + 0.45, ease.out);

  // 録音
  const recording = t >= L.start && t < L.end;
  const elapsed = clamp01((t - L.start) / L.dur) * L.dur;
  const act = prog(t, L.start - 0.15, L.start + 0.1) * (1 - prog(t, L.end, L.end + 0.35, ease.inOut));
  const done = t >= L.end;
  const armed = t >= r.typeB - 0.05;

  // t2-5 の脈動と仕上げ
  const pulse = bump(t, P5[i], 0.14, 0.75);
  const fin = prog(t, TM.finale + 0.05, TM.finale + 0.45, ease.out);
  const pen = prog(t, TM.finale + 0.1 + i * 0.12, TM.finale + 0.55 + i * 0.12, ease.outQuint);
  // 仕上げのあとはメモがゆっくり呼吸するように光る（最後の静止を避ける）
  const breathe = fin * (0.5 + 0.12 * Math.sin((t - TM.finale) * Math.PI * 1.6 - Math.PI / 2 - i * 0.9));
  const tagGlow = Math.max(0.35 * act, pulse, breathe);

  // KEEP の判子
  const stampAt = TM.stamp + i * TM.stampStep;
  const stampS = springAt(t, stampAt, { damping: 11, stiffness: 210, mass: 0.7 });
  const stampOp = prog(t, stampAt, stampAt + 0.07, ease.linear);
  const stampHit = bump(t, stampAt + 0.06, 0.05, 0.5);

  const bright = Math.max(act, done ? 0.82 : 0);
  const state = !armed
    ? { label: "STANDBY", color: C.dim }
    : recording
      ? { label: "REC", color: C.coral }
      : done
        ? { label: "TAKE OK", color: C.mint }
        : { label: "ARMED", color: C.coral };
  const iconColor = recording ? C.coral : armed ? C.mint : C.sub;
  const textCY = top + TEXT.dy + TEXT.lh / 2;

  return (
    <div style={{ opacity: appear, transform: `translateX(${(1 - appear) * -24}px)` }}>
      {/* 行のハイライト（録音中） */}
      <div style={{ position: "absolute", left: PX, top, width: PW, height: RH, background: `rgba(255,106,61,${0.06 * act})` }} />
      <div
        style={{
          position: "absolute",
          left: PX,
          top: top + 14,
          width: 4,
          height: RH - 28,
          borderRadius: 2,
          background: C.coral,
          opacity: act,
          boxShadow: `0 0 12px ${C.coral}`,
        }}
      />

      {/* トラックヘッダー */}
      <div
        style={{
          position: "absolute",
          left: PX + 28,
          top: top + (RH - 64) / 2,
          width: 64,
          height: 64,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `1.5px solid ${recording ? C.coral : armed ? `${C.mint}88` : C.borderHi}`,
          background: recording ? C.coralSoft : armed ? C.mintSoft : "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: recording ? `0 0 22px ${C.coral}55` : undefined,
        }}
      >
        <r.Icon size={34} color={iconColor} sw={1.9} />
      </div>
      <div style={{ position: "absolute", left: PX + 112, top: top + 48, display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: recording ? C.coral : C.dim, letterSpacing: "0.06em" }}>
          {String(i + 1).padStart(2, "0")}
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.14em", color: C.text }}>{r.name}</span>
      </div>
      <div style={{ position: "absolute", left: PX + 112, top: top + 88, display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            boxSizing: "border-box",
            border: `1.5px solid ${state.color}`,
            background: armed ? state.color : "transparent",
            boxShadow: recording ? `0 0 10px ${C.coral}` : undefined,
          }}
        />
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: state.color }}>{state.label}</span>
      </div>
      <VUMeter width={10} height={72} segments={12} lines={[r.id]} gain={1.1} style={{ position: "absolute", left: PX + TW - 36, top: top + (RH - 72) / 2 }} />

      {/* 台本の行: メモ + 台詞 */}
      <div
        style={{
          position: "absolute",
          left: CX,
          top: top + TEXT.dy,
          height: TEXT.lh,
          display: "flex",
          alignItems: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: TEXT.fs,
          whiteSpace: "nowrap",
        }}
      >
        {/* 行頭のキャレット */}
        <div
          style={{
            width: 3,
            height: 38,
            marginRight: 6 * caretVis,
            borderRadius: 2,
            background: C.mint,
            opacity: caretVis,
            boxShadow: `0 0 8px ${C.mint}`,
          }}
        />
        {/* メモ（打鍵で書き添えられ、台詞を右へ押し出す） */}
        <div style={{ width: tagW, marginRight: 14 * clamp01(typeP * 3), height: TEXT.lh, position: "relative", flexShrink: 0 }}>
          {nTyped > 0 && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: tagW,
                height: TEXT.lh,
                boxSizing: "border-box",
                padding: `0 ${NOTE.padX}px`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: NOTE.gap,
                overflow: "hidden",
                background: `rgba(59,227,180,${0.1 + 0.16 * tagGlow})`,
                border: `1.5px solid rgba(59,227,180,${0.3 + 0.5 * tagGlow})`,
                fontSize: NOTE.fs,
                color: C.mint,
                boxShadow: tagGlow > 0.02 ? `0 0 ${26 * tagGlow}px rgba(59,227,180,${0.55 * tagGlow})` : undefined,
                textShadow: tagGlow > 0.02 ? `0 0 ${10 * tagGlow}px ${C.mint}` : undefined,
              }}
            >
              <div style={{ flexShrink: 0, display: "flex" }}>
                <IconPen size={NOTE.icon} color={C.mint} sw={2.1} />
              </div>
              <span style={{ flexShrink: 0 }}>{noteChars.slice(0, nTyped).join("")}</span>
            </div>
          )}
          {/* ペン線（仕上げ） */}
          <div
            style={{
              position: "absolute",
              left: NOTE.padX + NOTE.icon + NOTE.gap,
              bottom: -9,
              height: 3,
              borderRadius: 2,
              width: noteChars.length * NOTE.fs * pen,
              background: C.mint,
              boxShadow: `0 0 8px ${C.mint}`,
            }}
          />
        </div>
        <span style={{ color: C.text, opacity: mix(0.46, 1, bright) }}>
          <JpText s={r.text} />
        </span>
      </div>
      {/* 書き添えた瞬間の波紋 */}
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: CX + 2 - (6 + 26 * ring),
            top: textCY - (6 + 26 * ring),
            width: (6 + 26 * ring) * 2,
            height: (6 + 26 * ring) * 2,
            borderRadius: "50%",
            boxSizing: "border-box",
            border: `2px solid ${C.mint}`,
            opacity: 1 - ring,
          }}
        />
      )}
      {/* テイク番号と秒数 */}
      <div
        style={{
          position: "absolute",
          left: CX + CW - 240,
          width: 240,
          top: top + TEXT.dy,
          height: TEXT.lh,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 14,
          fontFamily: MONO,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 16, letterSpacing: "0.16em", color: C.sub, opacity: 0.75 }}>TAKE {String(i + 1).padStart(2, "0")}</span>
        <span style={{ fontSize: 22, letterSpacing: "0.04em", color: recording ? C.coral : done ? C.sub : C.dim, minWidth: 76, textAlign: "right" }}>
          {t >= L.start ? fmtSec(elapsed) : "-.--s"}
        </span>
      </div>

      {/* レーン */}
      <div
        style={{
          position: "absolute",
          left: CX,
          top: top + LANE.dy,
          width: CW,
          height: LANE.h,
          borderRadius: 10,
          boxSizing: "border-box",
          background: "rgba(0,0,0,0.28)",
          border: `1px solid ${act > 0.5 ? `${C.coral}88` : C.border}`,
          overflow: "hidden",
        }}
      >
        <svg width={CW} height={LANE.h} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={0} x2={CW} y1={LANE.h / 2} y2={LANE.h / 2} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          {Array.from({ length: Math.floor((CW - CLIP_X) / (PPS * 0.5)) + 1 }, (_, k) => {
            const x = CLIP_X + k * PPS * 0.5;
            const major = k % 2 === 0;
            return (
              <line
                key={k}
                x1={x}
                x2={x}
                y1={major ? 0 : LANE.h * 0.3}
                y2={major ? LANE.h : LANE.h * 0.7}
                stroke={`rgba(255,255,255,${major ? 0.07 : 0.04})`}
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>
      {/* 録音されたクリップ */}
      {t >= L.start && (
        <div
          style={{
            position: "absolute",
            left: CX + CLIP_X,
            top: top + LANE.dy + 6,
            width: Math.max(2, elapsed * PPS),
            height: LANE.h - 12,
            borderRadius: 8,
            boxSizing: "border-box",
            background: `rgba(255,106,61,${0.09 + 0.08 * pulse})`,
            border: `1.5px solid rgba(255,106,61,${0.5 + 0.5 * Math.max(pulse, recording ? 0.4 : 0)})`,
            boxShadow: pulse > 0.02 ? `0 0 ${30 * pulse}px rgba(255,106,61,${0.5 * pulse})` : undefined,
            transform: `scaleY(${1 + 0.1 * pulse})`,
            overflow: "visible",
          }}
        >
          <ClipWave id={r.id} kind={r.kind} width={L.dur * PPS} height={LANE.h - 15} elapsed={elapsed} pps={PPS} fresh={recording ? 1 : 0} />
        </div>
      )}
      {/* KEEP の判子（レーン右端の空き） */}
      {stampOp > 0 && (
        <div
          style={{
            position: "absolute",
            left: CX + CW - 16 - STAMP.w,
            top: top + LANE.dy + (LANE.h - STAMP.h) / 2,
            width: STAMP.w,
            height: STAMP.h,
            boxSizing: "border-box",
            borderRadius: 9,
            border: `2px solid ${C.mint}`,
            background: `rgba(14,16,20,0.72)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: "0.18em",
            color: C.mint,
            opacity: stampOp,
            transform: `rotate(-6deg) scale(${mix(1.7, 1, stampS)})`,
            boxShadow: `inset 0 0 0 999px rgba(59,227,180,${0.1 + 0.25 * stampHit}), 0 0 ${10 + 26 * stampHit}px rgba(59,227,180,${0.25 + 0.4 * stampHit})`,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          KEEP
        </div>
      )}
    </div>
  );
};

const Playhead: React.FC<{ t: number }> = ({ t }) => (
  <>
    {playheads(t)
      .filter((ph) => ph.vis > 0.001)
      .map((ph) => {
        const y = rowTop(ph.row) + LANE.dy;
        const x = CX + ph.x;
        return (
          <div key={ph.row} style={{ position: "absolute", left: x - 8, top: y - 9, width: 16, height: LANE.h + 15, opacity: ph.vis }}>
            <svg width={16} height={LANE.h + 15} style={{ overflow: "visible", filter: `drop-shadow(0 0 6px ${C.coral})` }}>
              <path d="M2 0 H14 V4 L8 10 L2 4 Z" fill={C.coral} />
              <rect x={6.75} y={6} width={2.5} height={(LANE.h + 9) * (1 - 0.7 * ph.drop)} rx={1.25} fill={C.coral} />
            </svg>
          </div>
        );
      })}
  </>
);

const PanelStatus: React.FC<{ t: number }> = ({ t }) => {
  // 録音中の行があればそれ（REC）。なければ、メモを書き添え始めた次の行（ARMED）
  let recIdx = ROWS.findIndex((r) => t >= r.L.start && t < r.L.end);
  if (recIdx < 0) ROWS.forEach((r, k) => t >= r.caretIn && t < r.L.start && (recIdx = k));
  if (t >= TM.allTaken) {
    const p = prog(t, TM.allTaken, TM.allTaken + 0.3, ease.outQuint);
    const allKept = t >= TM.stamp + (ROWS.length - 1) * TM.stampStep + 0.06; // 最後の判子が押されたら
    return (
      <span style={{ color: C.mint, opacity: p, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        {allKept ? "3/3 KEEP" : "3/3 TAKES"}
      </span>
    );
  }
  if (recIdx >= 0) {
    const r = ROWS[recIdx];
    const rec = t >= r.L.start && t < r.L.end;
    return (
      <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: C.coral,
            opacity: rec ? 0.6 + 0.4 * Math.cos((t - r.L.start) * Math.PI * 2 * 1.2) : 0.35,
            boxShadow: rec ? `0 0 10px ${C.coral}` : undefined,
          }}
        />
        {rec ? "REC" : "ARMED"} · TAKE {recIdx + 1}/3
      </span>
    );
  }
  return (
    <span style={{ color: C.sub, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, boxSizing: "border-box", border: `1.5px solid ${C.sub}` }} />
      STANDBY
    </span>
  );
};

export const T2Acting: React.FC = () => {
  const t = useTime();
  const panelIn = prog(t, TM.panelIn, TM.panelIn + 0.6, ease.outQuint);

  return (
    <SceneShell id="t2">
      <ScriptCard t={t} />
      <Headline t={t} />

      {panelIn > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: panelIn, transform: `translateY(${(1 - panelIn) * 44}px)` }}>
          <Panel
            x={PX}
            y={PY}
            w={PW}
            h={PH}
            header={
              <span>
                SCRIPT <span style={{ color: C.dim }}>×</span> TAKES
              </span>
            }
            status={<PanelStatus t={t} />}
          >
            {/* トラックヘッダーの列 */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: HDR,
                width: TW,
                bottom: 0,
                background: "rgba(0,0,0,0.16)",
                borderRight: `1px solid ${C.border}`,
              }}
            />
            {[1, 2].map((k) => (
              <div key={k} style={{ position: "absolute", left: 0, right: 0, top: HDR + k * RH, height: 1, background: C.border }} />
            ))}
          </Panel>
          {ROWS.map((r) => (
            <TrackRow key={r.id} t={t} r={r} />
          ))}
          <Playhead t={t} />
        </div>
      )}

      {/* 効果音 */}
      <Sfx at={TM.headIn} name="type" volume={0.16} />
      <Sfx at={ONE_BY_ONE} name="tick" volume={0.12} />
      {ROWS.map((r) => (
        <Sfx key={r.id} at={r.typeA} name="type" volume={0.2} />
      ))}
      <Sfx at={TM.allTaken} name="click" volume={0.16} />
      {P5.slice(0, 3).map((p, k) => (
        <Sfx key={k} at={p} name="tick" volume={0.12} />
      ))}
      {ROWS.map((r) => (
        <Sfx key={`k${r.id}`} at={TM.stamp + r.i * TM.stampStep + 0.05} name="click" volume={0.15} />
      ))}
    </SceneShell>
  );
};
