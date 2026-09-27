/*
 * TRACK 02 — 演技指示「演技は、1行ずつ」
 *
 * コンセプト: 台本エディタと DAW のトラックを 1 枚にまとめた「台本 × テイク」の卓。
 * 3 本のトラック（WHISPER / LAUGH / SIGH）が、そのまま台本の 3 行になっている。
 * 行頭に〔演技タグ〕を書き添える → その行を 1 テイク録る、を 1 行ずつ繰り返す。
 *
 * 絵コンテ（すべてナレーションの行・シーン境界から計算。秒は直書きしない）
 *  B0  enter        テープが抜けると同時に、左上の見出し「演技は、1行ずつ」がコーラルのキャレットで打ち込まれる。
 *                   上に MONO「02 — PERFORMANCE DIRECTION」。下から「SCRIPT × TAKES」卓がせり上がり、
 *                   3 本のトラック（ヘッダー + 薄い台詞 + 空のレーン）が上から順に並ぶ。右上に「DIRECTION TAGS」の札。
 *  B1  t2-1         「1行ずつの」で行番号 01→02→03 が順に灯る（音声の間から「1行ずつ」の位置を検出）。
 *                   言い終わりで 1 行目の行頭にミントのキャレット → 〔ささやき〕が打鍵で書き添えられ、台詞が右へ押し出される。
 *                   右上の札の「ささやき」が同時に点灯。トラックが ARMED に。
 *  B2  t2-2         ささやき: コーラルのプレイヘッドが 1 行目のレーンを走り、実際の音声レベルから
 *                   「息っぽい低い雲＋細い毛羽」のクリップが録音されていく。VU とテイク秒数が声に反応。
 *  B3  t2-3         行間でプレイヘッドが改行（左へ戻って 1 段下へ）→ 〔笑い〕が書き添えられ、鋭いスパイクのクリップ。
 *  B4  t2-4         同じく 〔ため息〕→ 声が止まっても長く尾を引く包絡線のクリップ。録り終えると「✓ 3/3 TAKES」。
 *  B5  t2-5         「ささやきも / 笑いも / ため息も」の各フレーズ（音声の間から検出）で、その行のタグとクリップが順に脈打つ。
 *                   「台本に書き添えるだけです」で右上の札に〔間〕〔感情〕が加わり、3 行のタグの下にミントのペン線が引かれる。
 *  B6  tail         すべて点いたまま、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { IconBubble, IconLaugh, IconSigh } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { ClipWave, phraseStarts, type ClipStyle } from "./T2Acting/clips";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t2");
const L1 = line("t2-1");
const L5 = line("t2-5");
const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);

// 「トラック2は、|1行ずつの演技指示」— いちばん長い間のあとが「1行ずつ」
const ONE_BY_ONE = phraseStarts("t2-1", 2, [0, 0.44])[1];
// 「ささやきも、|笑いも、|ため息も。|台本に書き添えるだけです。」
const P5 = phraseStarts("t2-5", 4, [0.02, 0.26, 0.44, 0.66]);

type RowDef = { id: string; name: string; tag: string; kind: ClipStyle; Icon: React.FC<{ size?: number; color?: string; sw?: number }> };
const ROW_DEFS: RowDef[] = [
  { id: "t2-2", name: "WHISPER", tag: "ささやき", kind: "whisper", Icon: IconBubble },
  { id: "t2-3", name: "LAUGH", tag: "笑い", kind: "laugh", Icon: IconLaugh },
  { id: "t2-4", name: "SIGH", tag: "ため息", kind: "sigh", Icon: IconSigh },
];
const ROWS = ROW_DEFS.map((r, i) => {
  const L = line(r.id);
  const prevEnd = i === 0 ? L1.end : line(ROW_DEFS[i - 1].id).end;
  // タグの打鍵: 1 行目は t2-1 の言い終わり、2・3 行目は前の行の終わり際〜行間
  const typeA = i === 0 ? Math.max(at(L1, 0.62), L1.end - 0.42) : prevEnd - 0.16;
  const typeB = Math.max(typeA + 0.2, L.start - 0.05);
  return { ...r, i, L, text: L.text, typeA, typeB, caretIn: typeA - (i === 0 ? 0.3 : 0.12) };
});
const LAST = ROWS[ROWS.length - 1].L;

const TM = {
  headIn: E + 0.12,
  headStep: 0.075,
  panelIn: E + 0.3,
  rowsIn: E + 0.55,
  chipsIn: E + 1.05,
  allTaken: LAST.end,
  finale: P5[3], // 「台本に書き添えるだけです」
};

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, labelY: 156, y: 190, size: 88 };
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

// 右上の札
const CHIPS = ["ささやき", "笑い", "ため息", "間", "感情"];
const CHIP = { h: 54, fs: 26, padX: 16, gap: 12, top: 204 };
const chipW = (s: string) => CHIP.padX * 2 + (s.length + 2) * CHIP.fs + 3;

// 0→1→0 の短い脈動
const bump = (t: number, s: number, up = 0.14, down = 0.7) =>
  prog(t, s, s + up, ease.outQuint) * (1 - prog(t, s + up + 0.08, s + up + 0.08 + down, ease.inOut));

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

// ───────── 見出し（キャレットで打ち込む） ─────────
const HEAD_CHARS = [..."演技は、1行ずつ"];
const EMPH_FROM = 4; // 「1行ずつ」をコーラルに

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const shownN = HEAD_CHARS.filter((_, i) => t >= TM.headIn + i * TM.headStep).length;
  const typedEnd = TM.headIn + (HEAD_CHARS.length - 1) * TM.headStep;
  const rule = prog(t, E + 0.05, E + 0.6, ease.outQuint);
  const lab = prog(t, E + 0.2, E + 0.65, ease.outQuint);
  // キャレット: 打鍵中は点灯、打ち終わると 2 回点滅して消える
  const since = t - typedEnd;
  const caretOn = t >= TM.headIn - 0.05 && since < 1.5;
  const blink = since <= 0 ? 1 : 0.55 + 0.45 * Math.cos(since * Math.PI * 2.4);
  const caretOp = caretOn ? blink * (1 - prog(t, typedEnd + 1.1, typedEnd + 1.5)) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: HEAD.x, top: HEAD.labelY, display: "flex", alignItems: "center", gap: 14, height: 24 }}>
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
          position: "absolute",
          left: HEAD.x,
          top: HEAD.y,
          display: "flex",
          alignItems: "center",
          fontFamily: DISPLAY,
          fontSize: HEAD.size,
          lineHeight: 1.1,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {HEAD_CHARS.slice(0, shownN).map((ch, i) => {
          const p = prog(t, TM.headIn + i * TM.headStep, TM.headIn + i * TM.headStep + 0.24, ease.outQuint);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 16}px)`,
                color: i >= EMPH_FROM ? C.coral : C.text,
              }}
            >
              {ch}
            </span>
          );
        })}
        <span
          style={{
            display: "inline-block",
            width: 9,
            height: HEAD.size * 0.92,
            marginLeft: 8,
            borderRadius: 2,
            background: C.coral,
            opacity: caretOp,
            boxShadow: `0 0 14px ${C.coral}`,
          }}
        />
      </div>
    </>
  );
};

// ───────── 右上: DIRECTION TAGS の札 ─────────
const chipLevel = (t: number, i: number) => {
  const fin = prog(t, TM.finale + 0.1, TM.finale + 0.5);
  if (i >= 3) return 1;
  const r = ROWS[i];
  const typing = prog(t, r.typeA - 0.38, r.typeA - 0.26) * (1 - prog(t, r.L.end, r.L.end + 0.45, ease.inOut));
  const used = t >= r.L.end ? 0.28 : 0;
  return Math.max(typing, used, bump(t, P5[i], 0.12, 0.6), fin);
};

const Palette: React.FC<{ t: number }> = ({ t }) => {
  const lab = prog(t, TM.chipsIn - 0.15, TM.chipsIn + 0.35, ease.outQuint);
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: PAD_X,
          top: HEAD.labelY,
          height: 24,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: lab,
          transform: `translateX(${(1 - lab) * 12}px)`,
        }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, letterSpacing: "0.18em", color: C.sub, whiteSpace: "nowrap" }}>
          DIRECTION TAGS
        </div>
        <div style={{ width: 40 * lab, height: 3, background: C.mint, borderRadius: 2 }} />
      </div>
      <div style={{ position: "absolute", right: PAD_X, top: CHIP.top, height: CHIP.h, display: "flex", alignItems: "center" }}>
        {CHIPS.map((s, i) => {
          const extra = i >= 3;
          const start = extra ? TM.finale + 0.12 + (i - 3) * 0.14 : TM.chipsIn + i * 0.09;
          const grow = extra ? prog(t, start, start + 0.45, ease.outQuint) : t >= start ? 1 : 0;
          const pop = springAt(t, start, { damping: 12, stiffness: 170 });
          if (grow <= 0) return null;
          const lvl = t >= start ? chipLevel(t, i) : 0;
          const pulse = i < 3 ? bump(t, P5[i], 0.12, 0.6) : bump(t, start + 0.05, 0.12, 0.6);
          const w = chipW(s);
          return (
            <div
              key={s}
              style={{
                width: w * grow,
                marginLeft: (i === 0 ? 0 : CHIP.gap) * grow,
                height: CHIP.h,
                position: "relative",
                overflow: grow < 0.999 ? "hidden" : "visible",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: w,
                  height: CHIP.h,
                  boxSizing: "border-box",
                  borderRadius: 12,
                  border: `1.5px solid ${C.borderHi}`,
                  background: C.panel,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: CHIP.fs,
                  color: C.text,
                  opacity: Math.min(1, pop * 1.4),
                  transform: `scale(${0.7 + 0.3 * pop})`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -1.5,
                    borderRadius: 12,
                    border: `1.5px solid ${C.mint}`,
                    background: C.mintSoft,
                    opacity: lvl,
                    boxShadow: `0 0 ${6 + 22 * pulse}px ${C.mint}${pulse > 0.05 ? "aa" : "55"}`,
                  }}
                />
                <span style={{ position: "relative", color: C.mint }}>〔</span>
                <span style={{ position: "relative", opacity: 0.62 + 0.38 * lvl }}>{s}</span>
                <span style={{ position: "relative", color: C.mint }}>〕</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ───────── 台本の 1 行 = 1 トラック ─────────
const fmtSec = (s: number) => `${s.toFixed(2)}s`;

const TrackRow: React.FC<{ t: number; r: (typeof ROWS)[number] }> = ({ t, r }) => {
  const { i, L } = r;
  const top = rowTop(i);
  const appear = prog(t, TM.rowsIn + i * 0.12, TM.rowsIn + i * 0.12 + 0.55, ease.outQuint);
  const numFlash = bump(t, ONE_BY_ONE + i * 0.17, 0.1, 0.35);

  // タグの打鍵
  const tag = `〔${r.tag}〕`;
  const tagChars = [...tag];
  const typeP = prog(t, r.typeA, r.typeB, ease.linear);
  const nTyped = typeP <= 0 ? 0 : Math.min(tagChars.length, Math.ceil(typeP * tagChars.length));
  const tagFullW = tagChars.length * TEXT.fs + 20;
  const tagW = tagFullW * ease.out(clamp01(typeP * 1.15));
  const caretVis = prog(t, r.caretIn, r.caretIn + 0.12) * (1 - prog(t, r.typeB + 0.05, r.typeB + 0.25));

  // 録音
  const recording = t >= L.start && t < L.end;
  const elapsed = clamp01((t - L.start) / L.dur) * L.dur;
  const act = prog(t, L.start - 0.15, L.start + 0.1) * (1 - prog(t, L.end, L.end + 0.35, ease.inOut));
  const done = t >= L.end;
  const armed = t >= r.typeB - 0.05;

  // t2-5 の脈動と仕上げ
  const pulse = bump(t, P5[i], 0.14, 0.75);
  const fin = prog(t, TM.finale + 0.05, TM.finale + 0.45, ease.out);
  const pen = prog(t, TM.finale + 0.15 + i * 0.12, TM.finale + 0.6 + i * 0.12, ease.outQuint);
  // 仕上げのあとはタグがゆっくり呼吸するように光る（最後の静止を避ける）
  const breathe = fin * (0.5 + 0.12 * Math.sin((t - TM.finale) * Math.PI * 1.6 - Math.PI / 2 - i * 0.9));
  const tagGlow = Math.max(0.35 * act, pulse, breathe);

  const bright = Math.max(act, done ? 0.82 : 0);
  const state = !armed
    ? { label: "STANDBY", color: C.dim }
    : recording
      ? { label: "REC", color: C.coral }
      : done
        ? { label: "TAKE OK", color: C.mint }
        : { label: "ARMED", color: C.coral };
  const iconColor = recording ? C.coral : armed ? C.mint : C.sub;

  return (
    <div style={{ opacity: appear, transform: `translateX(${(1 - appear) * -24}px)` }}>
      {/* 行のハイライト（録音中） */}
      <div
        style={{
          position: "absolute",
          left: PX,
          top,
          width: PW,
          height: RH,
          background: `rgba(255,106,61,${0.06 * act + 0.05 * numFlash})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PX,
          top: top + 14,
          width: 4,
          height: RH - 28,
          borderRadius: 2,
          background: C.coral,
          opacity: Math.max(act, numFlash),
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
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 18,
            color: numFlash > 0.05 ? C.coral : C.dim,
            textShadow: numFlash > 0.05 ? `0 0 ${12 * numFlash}px ${C.coral}` : undefined,
            letterSpacing: "0.06em",
          }}
        >
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
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: state.color }}>
          {state.label}
        </span>
      </div>
      <VUMeter width={10} height={72} segments={12} lines={[r.id]} gain={1.1} style={{ position: "absolute", left: PX + TW - 36, top: top + (RH - 72) / 2 }} />

      {/* 台本の行: 〔タグ〕 + 台詞 */}
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
        {/* タグ（打鍵で書き添えられ、台詞を右へ押し出す） */}
        <div style={{ width: tagW, marginRight: 10 * clamp01(typeP * 3), height: TEXT.lh, position: "relative", flexShrink: 0 }}>
          {nTyped > 0 && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: TEXT.lh,
                padding: "0 10px",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                background: `rgba(59,227,180,${0.1 + 0.16 * tagGlow})`,
                color: C.mint,
                boxShadow: tagGlow > 0.02 ? `0 0 ${26 * tagGlow}px rgba(59,227,180,${0.55 * tagGlow})` : undefined,
                textShadow: tagGlow > 0.02 ? `0 0 ${10 * tagGlow}px ${C.mint}` : undefined,
              }}
            >
              {tagChars.slice(0, nTyped).join("")}
              {/* ペン線（仕上げ） */}
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  bottom: -9,
                  height: 3,
                  borderRadius: 2,
                  width: (tagChars.length * TEXT.fs) * pen,
                  background: C.mint,
                  boxShadow: `0 0 8px ${C.mint}`,
                }}
              />
            </div>
          )}
        </div>
        <span style={{ color: C.text, opacity: mix(0.46, 1, bright) }}>{r.text}</span>
      </div>
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
          <ClipWave
            id={r.id}
            kind={r.kind}
            width={L.dur * PPS}
            height={LANE.h - 15}
            elapsed={elapsed}
            pps={PPS}
            fresh={recording ? 1 : 0}
          />
        </div>
      )}
    </div>
  );
};

// 札からその行の行頭へ、タグが「飛んで」書き添えられる光の粒
const chipCenterX = (i: number) => {
  // 仕上げ前は最初の 3 枚だけが右寄せで並んでいる
  let right = 1920 - PAD_X;
  for (let k = 2; k > i; k--) right -= chipW(CHIPS[k]) + CHIP.gap;
  return right - chipW(CHIPS[i]) / 2;
};

const TagFlights: React.FC<{ t: number }> = ({ t }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
    {ROWS.map((r) => {
      const a = r.typeA - 0.34;
      const b = r.typeA - 0.02;
      const land = prog(t, b, b + 0.4, ease.out);
      if (t < a || land >= 1) return null;
      const sx = chipCenterX(r.i);
      const sy = CHIP.top + CHIP.h + 4;
      const ex = CX + 2;
      const ey = rowTop(r.i) + TEXT.dy + TEXT.lh / 2;
      const cx = mix(sx, ex, 0.55);
      const cy = Math.min(sy, ey) - 40;
      const pt = (u: number) => {
        const v = 1 - u;
        return [v * v * sx + 2 * v * u * cx + u * u * ex, v * v * sy + 2 * v * u * cy + u * u * ey] as const;
      };
      const p = prog(t, a, b, ease.inOut);
      return (
        <g key={r.id}>
          {p < 1 &&
            Array.from({ length: 14 }, (_, k) => {
              const u = Math.max(0, p - k * 0.018);
              const [x, y] = pt(u);
              return <circle key={k} cx={x} cy={y} r={Math.max(0.6, 6 - k * 0.42)} fill={C.mint} opacity={(1 - k / 14) * 0.85} />;
            })}
          {p < 1 && (() => {
            const [x, y] = pt(p);
            return <circle cx={x} cy={y} r={12} fill={C.mint} opacity={0.25} />;
          })()}
          {land > 0 && (
            <circle cx={ex} cy={ey} r={6 + 26 * land} fill="none" stroke={C.mint} strokeWidth={2} opacity={1 - land} />
          )}
        </g>
      );
    })}
  </svg>
);

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
  // 録音中の行があればそれ（REC）。なければ、タグを書き添え始めた次の行（ARMED）
  let recIdx = ROWS.findIndex((r) => t >= r.L.start && t < r.L.end);
  if (recIdx < 0) ROWS.forEach((r, k) => t >= r.typeA - 0.34 && t < r.L.start && (recIdx = k));
  if (t >= TM.allTaken) {
    const p = prog(t, TM.allTaken, TM.allTaken + 0.3, ease.outQuint);
    return (
      <span style={{ color: C.mint, opacity: p, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        3/3 TAKES
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
      <Headline t={t} />
      <Palette t={t} />

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
        <TagFlights t={t} />
      </div>

      {/* 効果音 */}
      <Sfx at={TM.headIn} name="type" volume={0.16} />
      <Sfx at={TM.chipsIn} name="pop" volume={0.14} />
      {ROWS.map((r) => (
        <Sfx key={r.id} at={r.typeA} name="type" volume={0.2} />
      ))}
      <Sfx at={TM.allTaken} name="click" volume={0.16} />
      {P5.slice(0, 3).map((p, k) => (
        <Sfx key={k} at={p} name="tick" volume={0.12} />
      ))}
      <Sfx at={TM.finale + 0.12} name="pop" volume={0.18} />
    </SceneShell>
  );
};
