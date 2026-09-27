/*
 * TRACK 01 — ボイスデザイン「声を、文章でつくる」
 *
 * 絵コンテ（すべてナレーションの行に同期。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に、見出し「声を、文章でつくる」が 1 文字ずつせり上がる（画面中央・120px）。
 *                 上に MONO ラベル「01 — VOICE DESIGN」。「文章」だけコーラル。
 *  B1  t1-1       「トラック1は、ボイスデザイン」: 見出しの下に小さな図「[文書] TEXT - - -● → [人] VOICE」が描かれ、
 *                 ミントの信号がひと粒渡ると VOICE がコーラルに灯る（この後の 2 枚のパネルの予告）。
 *  B2  t1-2       見出しが左上へ収まり、左に「VOICE DESIGN PROMPT」コンソール（● READY / 点滅キャレット）、
 *                 右に中身が空の「VOICE PRESET」スロット（スケルトン）が立ち上がり、間を「TTS」の矢印がつなぐ。右上に消灯した ON AIR 表示灯。
 *                 「文章で書くだけで」で入力欄にフォーカス、「新しい声が作れます」で信号が矢印を渡り、スロットの円がミントに起きて走査光（STANDBY）。
 *  B3  t1-3       「深夜ラジオの、落ち着いた低めの女性DJ」が打鍵音とともに入力される → キーワードにコーラルの下線 →
 *                 「生成 / GENERATE」ボタンが点灯 → 押下（クリック音・光の輪）。キーワードから信号の粒が右のスロットへ流れ込み、
 *                 スロットの円に進捗リングが一周する。
 *  B4  t1-4       デザインされた声が話す: スロットが上から走査されてプリセットカードに実体化。ON AIR 点灯。
 *                 アバターの波紋・大きなオシロスコープ・VU は t1-4 の声だけに反応。キーワード由来のチップが並び、
 *                 3 つのノブ（PITCH 低 / PACE ゆっくり / WARMTH 高）が中立から値まで回る。左のコンソールは一歩下がる。
 *  B5  tail       声が終わってもカードと ON AIR は点いたまま、次のテープで切り替わる。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Oscilloscope, VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { IconDoc, IconPersonVoice, IconSparkle } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, rand, springAt, useTime } from "../time";
import { Knob, OnAirSign, envAt } from "./T1VoiceDesign/parts";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t1");
const L1 = line("t1-1");
const L2 = line("t1-2");
const L3 = line("t1-3");
const L4 = line("t1-4");
const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);

const TYPE_A = at(L3, 0.16); // 「深夜ラジオの…」の読み上げに合わせて打鍵
const TYPE_B = at(L3, 0.8);
const TM = {
  headIn: E + 0.08,
  hint: at(L1, 0.3), // 「ボイスデザイン」で TEXT → VOICE の図
  settleA: L2.start - 0.3,
  settleB: L2.start + 0.3,
  consoleIn: L2.start + 0.18,
  presetIn: L2.start + 0.38,
  signIn: L2.start + 0.5,
  linkIn: L2.start + 0.7,
  focus: at(L2, 0.3), // 「文章で書くだけで」
  newVoice: at(L2, 0.6), // 「新しい声が作れます」
  typeA: TYPE_A,
  typeB: TYPE_B,
  underline: TYPE_B + 0.08,
  armed: TYPE_B + 0.18,
  press: Math.max(TYPE_B + 0.42, at(L3, 0.9)),
  mat: L4.start - 0.1, // カードが実体化
  onAir: L4.start - 0.04,
};

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80, w: 684 }; // w: 実測した見出しの幅
const BIG = 1.5;
const PANEL_Y = 318;
const PANEL_H = 548;
const CON = { x: PAD_X, y: PANEL_Y, w: 744, h: PANEL_H };
const PRE = { x: 952, y: PANEL_Y, w: 1920 - PAD_X - 952, h: PANEL_H };
const INPUT = { x: 32, y: 112, w: 680, h: 250, padX: 30, padY: 26, fs: 50, lh: 72 };
const LINK_Y = CON.y + INPUT.y + INPUT.h / 2;
const AVA = { cx: 132, cy: 170, r: 64 };
const AVA_ABS = { x: PRE.x + AVA.cx, y: PRE.y + AVA.cy };

// ───────── プロンプト（打鍵される文章） ─────────
type Seg = { text: string; kw?: number };
const PROMPT: Seg[][] = [
  [{ text: "深夜ラジオ", kw: 0 }, { text: "の、" }],
  [{ text: "落ち着いた", kw: 1 }, { text: "低め", kw: 2 }, { text: "の" }, { text: "女性DJ", kw: 3 }],
];
const CHIPS = ["深夜ラジオ", "落ち着き", "低め", "女性DJ"];

// 1 文字ずつの出現時刻（「、」のあとは少し間をあける）
const CHAR_TIMES: number[] = (() => {
  const weights: number[] = [];
  PROMPT.flat().forEach((s) => [...s.text].forEach((ch) => weights.push(ch === "、" ? 3.2 : 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return weights.map((w) => {
    const time = mix(TM.typeA, TM.typeB, acc / total);
    acc += w;
    return time;
  });
})();
const N_CHARS = CHAR_TIMES.length;

// キーワードのだいたいの中心（粒の出発点）: 1 行目 / 2 行目の文字位置から
const KW_POS = (() => {
  const x0 = CON.x + INPUT.x + INPUT.padX;
  const y0 = CON.y + INPUT.y + INPUT.padY;
  const fs = INPUT.fs;
  const res: { x: number; y: number; w: number }[] = [];
  PROMPT.forEach((segs, li) => {
    let cx = 0;
    segs.forEach((s) => {
      const w = [...s.text].reduce((a, ch) => a + (/[A-Za-z]/.test(ch) ? fs * 0.62 : fs), 0);
      if (s.kw !== undefined) res[s.kw] = { x: x0 + cx + w / 2, y: y0 + li * INPUT.lh + 66, w }; // y: 下線の位置
      cx += w;
    });
  });
  return res;
})();

const KNOBS = [
  { label: "PITCH", value: "LOW", v: 0.2 },
  { label: "PACE", value: "SLOW", v: 0.28 },
  { label: "WARMTH", value: "HIGH", v: 0.86 },
];

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

// ───────── 左: プロンプト・コンソール ─────────
const Console: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.consoleIn, TM.consoleIn + 0.55, ease.outQuint);
  const back = prog(t, L4.start, L4.start + 0.6, ease.out);
  const shown = CHAR_TIMES.filter((c) => t >= c).length;
  const typing = t >= TM.typeA && t < TM.typeB + 0.1;
  const generating = t >= TM.press && t < TM.mat + 0.3;
  const done = t >= TM.mat + 0.3;
  const status = done ? "● SENT" : generating ? "● GENERATING" : typing ? "● TYPING" : "● READY";
  const accent = generating || typing ? C.coral : C.mint;
  const focus = Math.max(prog(t, TM.focus, TM.focus + 0.4), 0) * (1 - prog(t, TM.mat, TM.mat + 0.5));
  // キャレット: 打鍵中は常時点灯、待機中は 1 秒周期で点滅
  const blink = typing ? 1 : Math.cos(t * Math.PI * 2 * 1.1) > -0.1 ? 1 : 0;
  const caretOn = t < TM.press ? blink : 0;

  let idx = 0;
  const caret = (
    <span
      key="caret"
      style={{
        display: "inline-block",
        width: 5,
        height: 54,
        marginLeft: 4,
        verticalAlign: -8,
        borderRadius: 2,
        background: C.coral,
        opacity: caretOn,
        boxShadow: `0 0 10px ${C.coral}`,
      }}
    />
  );
  const lastLine = shown === 0 ? 0 : shown <= [...PROMPT[0].map((s) => s.text).join("")].length ? 0 : 1;

  const lines = PROMPT.map((segs, li) => {
    const parts = segs.map((sg, si) => {
      const chars = [...sg.text];
      const vis = chars.filter(() => idx++ < shown).join("");
      if (!vis) return null;
      if (sg.kw === undefined) return <span key={si}>{vis}</span>;
      const u = prog(t, TM.underline + sg.kw * 0.09, TM.underline + sg.kw * 0.09 + 0.32, ease.outQuint);
      return (
        <span key={si} style={{ position: "relative", display: "inline-block" }}>
          {vis}
          <span
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              bottom: 2,
              height: 6,
              borderRadius: 3,
              background: C.coral,
              transformOrigin: "0 50%",
              transform: `scaleX(${u})`,
              boxShadow: u > 0 ? `0 0 10px ${C.coral}88` : undefined,
            }}
          />
        </span>
      );
    });
    return (
      <div key={li} style={{ height: INPUT.lh, whiteSpace: "nowrap" }}>
        {parts}
        {li === lastLine && caret}
      </div>
    );
  });

  // 生成ボタン
  const armed = springAt(t, TM.armed, { damping: 12, stiffness: 180 });
  const dip = prog(t, TM.press - 0.02, TM.press + 0.06, ease.out) * (1 - prog(t, TM.press + 0.06, TM.press + 0.34, ease.outQuint));
  const ring = prog(t, TM.press, TM.press + 0.6, ease.out);
  const btnGlow = t >= TM.press ? 1 - prog(t, TM.press + 0.1, TM.press + 1.2) * 0.6 : armed * 0.5;
  const fill = clamp01(armed * 2.2); // 点灯はばねの立ち上がりに合わせて素早くフェード
  const on = fill > 0.45;

  return (
    <div
      style={{
        position: "absolute",
        left: CON.x,
        top: CON.y,
        opacity: inP * mix(1, 0.5, back),
        transform: `translateY(${(1 - inP) * 40}px) scale(${mix(1, 0.985, back)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <Panel w={CON.w} h={CON.h} header="VOICE DESIGN PROMPT" status={status} accent={accent}>
        {/* 見出し行 */}
        <div
          style={{
            position: "absolute",
            left: INPUT.x,
            top: 72,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 22,
            color: C.sub,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.16em", color: C.coral }}>TEXT</span>
          ほしい声を、ことばで
        </div>
        {/* 入力欄 */}
        <div
          style={{
            position: "absolute",
            left: INPUT.x,
            top: INPUT.y,
            width: INPUT.w,
            height: INPUT.h,
            boxSizing: "border-box",
            padding: `${INPUT.padY}px ${INPUT.padX}px`,
            borderRadius: 12,
            background: "rgba(0,0,0,0.28)",
            border: `1.5px solid ${focus > 0.5 ? C.coral + "99" : C.border}`,
            boxShadow: focus > 0 ? `0 0 0 ${4 * focus}px ${C.coral}22` : undefined,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: INPUT.fs,
            lineHeight: `${INPUT.lh}px`,
            color: C.text,
          }}
        >
          {shown === 0 ? (
            <div style={{ height: INPUT.lh, whiteSpace: "nowrap" }}>
              {caret}
              <span style={{ fontWeight: 700, fontSize: 40, color: C.dim, marginLeft: 12 }}>どんな声がほしい？</span>
            </div>
          ) : (
            lines
          )}
        </div>
        {/* フッター: 文字数 + 生成ボタン */}
        <div style={{ position: "absolute", left: INPUT.x + 2, top: 404 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: C.sub }}>LENGTH</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 44,
                color: shown > 0 ? C.text : C.dim,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(shown).padStart(2, "0")}
            </span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.sub }}>文字</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: CON.w - 32 - 280,
            top: 404,
            width: 280,
            height: 96,
            transform: `scale(${(t >= TM.armed ? mix(0.9, 1, armed) : 1) * (1 - 0.06 * dip)})`,
          }}
        >
          {/* 押したときの光の輪 */}
          {ring > 0 && ring < 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 16,
                border: `2px solid ${C.coral}`,
                opacity: 1 - ring,
                transform: `scale(${1 + ring * 0.28}, ${1 + ring * 0.6})`,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              boxSizing: "border-box",
              border: `1.5px solid ${fill > 0.1 ? C.coral : C.borderHi}`,
              background: `rgba(255, 106, 61, ${fill})`,
              boxShadow: fill > 0 ? `0 0 ${36 * btnGlow * fill}px ${C.coral}99` : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <IconSparkle size={34} color={on ? C.ink : C.dim} sw={2.2} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 36, color: on ? C.ink : C.dim }}>生成</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.2em",
                  color: on ? C.ink : C.dim,
                  opacity: 0.75,
                  marginTop: 6,
                }}
              >
                GENERATE
              </span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ───────── 右: ボイスプリセット（スケルトン → 実体化） ─────────
const Bar: React.FC<{ x: number; y: number; w: number; h: number; r?: number }> = ({ x, y, w, h, r = 6 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.055)" }} />
);

const Preset: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.presetIn, TM.presetIn + 0.55, ease.outQuint);
  const gen = prog(t, TM.press + 0.15, TM.mat, ease.inOut); // 進捗
  const scan = prog(t, TM.mat, TM.mat + 0.5, ease.inOut); // 実体化の走査
  const flash = t >= TM.mat ? 1 - prog(t, TM.mat, TM.mat + 1.1) : 0;
  const env = envAt("t1-4", t);
  const live = t >= L4.start && t < L4.end;
  // 「新しい声」: スケルトンを一度だけミントの光が横切る
  const sweep = prog(t, TM.newVoice + 0.02, TM.newVoice + 0.9, ease.inOut);
  const ping = prog(t, TM.newVoice + 0.02, TM.newVoice + 0.8, ease.out); // 円から一度だけ広がる輪
  const wake = prog(t, TM.newVoice, TM.newVoice + 0.25) * (1 - prog(t, TM.newVoice + 1.4, TM.newVoice + 2.2));
  const generating = t >= TM.press && t < TM.mat;

  const status =
    t >= TM.mat ? (
      <span style={{ color: C.mint }}>● NEW VOICE</span>
    ) : generating ? (
      <span style={{ color: C.coral, fontVariantNumeric: "tabular-nums" }}>
        GENERATING {String(Math.round(gen * 100)).padStart(3, " ")}%
      </span>
    ) : (
      <span style={{ color: t >= TM.newVoice ? C.sub : C.dim }}>{t >= TM.newVoice ? "○ STANDBY" : "○ EMPTY"}</span>
    );

  const skelOp = 1 - scan;
  const K0 = TM.mat + 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: PRE.x,
        top: PRE.y,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 40}px)`,
      }}
    >
      <Panel
        w={PRE.w}
        h={PRE.h}
        header="VOICE PRESET"
        status={status}
        accent={C.coral}
        glow={Math.max(flash * 0.9, t >= TM.mat ? 0.18 + 0.4 * env : 0)}
      >
        {/* スケルトン（まだ声がない状態） */}
        {skelOp > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: skelOp }}>
            <svg width={PRE.w} height={PRE.h} style={{ position: "absolute", left: 0, top: 0 }}>
              <circle
                cx={AVA.cx}
                cy={AVA.cy}
                r={AVA.r}
                fill={wake > 0 ? `rgba(59,227,180,${0.08 * wake})` : "rgba(255,255,255,0.03)"}
                stroke={wake > 0.5 ? C.mint : C.borderHi}
                strokeOpacity={wake > 0.5 ? 0.4 + 0.6 * wake : 1}
                strokeWidth={2}
                strokeDasharray="6 8"
              />
              {ping > 0 && ping < 1 && (
                <circle cx={AVA.cx} cy={AVA.cy} r={AVA.r + ping * 46} fill="none" stroke={C.mint} strokeWidth={2} opacity={(1 - ping) * 0.8} />
              )}
              {gen > 0 && (
                <circle
                  cx={AVA.cx}
                  cy={AVA.cy}
                  r={AVA.r + 10}
                  fill="none"
                  stroke={C.mint}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * (AVA.r + 10) * gen} 9999`}
                  transform={`rotate(-90 ${AVA.cx} ${AVA.cy})`}
                  style={{ filter: `drop-shadow(0 0 6px ${C.mint})` }}
                />
              )}
            </svg>
            <div style={{ position: "absolute", left: AVA.cx - 28, top: AVA.cy - 28, opacity: 0.8 }}>
              <IconPersonVoice size={56} color={wake > 0.5 ? C.mint : C.dim} sw={1.6} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 268,
                top: 88,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.16em",
                color: generating ? C.coral : wake > 0.5 ? C.mint : C.dim,
              }}
            >
              {generating ? "SYNTHESIZING…" : "NEW VOICE"}
            </div>
            <Bar x={268} y={120} w={420} h={48} r={8} />
            <Bar x={268} y={196} w={124} h={42} r={21} />
            <Bar x={402} y={196} w={110} h={42} r={21} />
            <Bar x={522} y={196} w={80} h={42} r={21} />
            <Bar x={612} y={196} w={104} h={42} r={21} />
            {KNOBS.map((k, i) => (
              <React.Fragment key={k.label}>
                <div
                  style={{
                    position: "absolute",
                    left: 32 + i * 272 + 8,
                    top: 288,
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    border: `2px dashed ${C.border}`,
                    boxSizing: "border-box",
                  }}
                />
                <Bar x={32 + i * 272 + 104} y={300} w={90} h={14} />
                <Bar x={32 + i * 272 + 104} y={326} w={60} h={24} />
              </React.Fragment>
            ))}
            <div
              style={{
                position: "absolute",
                left: 32,
                top: 392,
                width: PRE.w - 64,
                height: 132,
                borderRadius: 12,
                border: `1.5px dashed ${C.border}`,
                boxSizing: "border-box",
              }}
            />
            <div style={{ position: "absolute", left: 60, top: 457, width: PRE.w - 120, height: 2, background: C.border }} />
            {/* 走査光 */}
            {sweep > 0 && sweep < 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 56,
                  bottom: 0,
                  left: mix(-200, PRE.w + 40, sweep),
                  width: 160,
                  background: `linear-gradient(90deg, transparent, ${C.mint}30, transparent)`,
                }}
              />
            )}
          </div>
        )}

        {/* 実体化したプリセット */}
        {scan > 0 && (
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${(1 - scan) * 100}% 0)` }}>
            {/* アバターと波紋 */}
            <svg width={PRE.w} height={PRE.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <defs>
                <radialGradient id="t1Ava" cx="50%" cy="38%" r="70%">
                  <stop offset="0%" stopColor="#3A2A26" />
                  <stop offset="100%" stopColor="#171A21" />
                </radialGradient>
              </defs>
              {[0, 1, 2].map((k) => {
                const ph = (((t - L4.start) * 0.85 + k / 3) % 1 + 1) % 1;
                const gate = live ? clamp01(env * 1.5) : 0;
                return (
                  <circle
                    key={k}
                    cx={AVA.cx}
                    cy={AVA.cy}
                    r={AVA.r + 6 + ph * 44}
                    fill="none"
                    stroke={C.coral}
                    strokeWidth={2}
                    opacity={(1 - ph) * 0.7 * gate}
                  />
                );
              })}
              <circle
                cx={AVA.cx}
                cy={AVA.cy}
                r={AVA.r + 3 + env * 6}
                fill="none"
                stroke={C.coral}
                strokeOpacity={0.35 + 0.65 * env}
                strokeWidth={2.5}
                style={{ filter: `drop-shadow(0 0 ${6 + 14 * env}px ${C.coral})` }}
              />
              <circle cx={AVA.cx} cy={AVA.cy} r={AVA.r} fill="url(#t1Ava)" stroke={C.coral} strokeWidth={2} />
            </svg>
            <div style={{ position: "absolute", left: AVA.cx - 32, top: AVA.cy - 32 }}>
              <IconPersonVoice size={64} color={C.coral} sw={1.7} />
            </div>

            {/* 名前 */}
            <div
              style={{
                position: "absolute",
                left: 268,
                top: 88,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.16em",
                color: C.sub,
              }}
            >
              NEW VOICE <span style={{ color: C.dim }}>/</span> <span style={{ color: C.mint }}>CUSTOM</span>
            </div>
            <div
              style={{
                position: "absolute",
                left: 266,
                top: 112,
                fontFamily: DISPLAY,
                fontSize: 54,
                lineHeight: 1.1,
                color: C.text,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              LATE NIGHT DJ
            </div>
            {/* 特徴チップ（プロンプトの下線キーワードから） */}
            <div style={{ position: "absolute", left: 268, top: 196, display: "flex", gap: 10 }}>
              {CHIPS.map((c, i) => {
                const p = springAt(t, TM.mat + 0.22 + i * 0.08, { damping: 13, stiffness: 190 });
                return (
                  <div
                    key={c}
                    style={{
                      height: 42,
                      padding: "0 16px",
                      borderRadius: 21,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      background: C.coralSoft,
                      border: `1.5px solid ${C.coral}88`,
                      fontFamily: FONT,
                      fontWeight: 700,
                      fontSize: 22,
                      color: C.text,
                      opacity: Math.min(1, p * 1.5),
                      transform: `scale(${mix(0.6, 1, p)})`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </div>
                );
              })}
            </div>

            {/* 区切り */}
            <div style={{ position: "absolute", left: 32, right: 32, top: 266, height: 1, background: C.border }} />

            {/* ノブ */}
            {KNOBS.map((k, i) => {
              const sp = springAt(t, K0 + i * 0.12, { damping: 11, stiffness: 120 });
              const v = mix(0.5, k.v, sp);
              const lab = prog(t, K0 + i * 0.12, K0 + i * 0.12 + 0.35, ease.outQuint);
              return (
                <div key={k.label} style={{ position: "absolute", left: 32 + i * 272, top: 280 }}>
                  <Knob v={v} size={84} on={clamp01(sp * 1.5)} />
                  <div style={{ position: "absolute", left: 104, top: 12, whiteSpace: "nowrap" }}>
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: C.sub }}>
                      {k.label}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontWeight: 700,
                        fontSize: 30,
                        letterSpacing: "0.06em",
                        color: C.coral,
                        marginTop: 4,
                        opacity: lab,
                        transform: `translateY(${(1 - lab) * 8}px)`,
                      }}
                    >
                      {k.value}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* オシロスコープ（t1-4 の声だけに反応） */}
            <div
              style={{
                position: "absolute",
                left: 32,
                top: 392,
                width: PRE.w - 64,
                height: 132,
                borderRadius: 12,
                background: "rgba(0,0,0,0.34)",
                border: `1.5px solid ${C.border}`,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {/* 目盛り */}
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  style={{ position: "absolute", left: 20 + i * 50, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.04)" }}
                />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, top: 65, height: 1, background: "rgba(255,255,255,0.07)" }} />
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: 10,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.16em",
                  color: C.dim,
                }}
              >
                OUT · LATE NIGHT DJ
              </div>
              <div style={{ position: "absolute", left: 20, top: 9 }}>
                <Oscilloscope
                  width={700}
                  height={114}
                  lines={["t1-4"]}
                  color={C.mint}
                  gain={1.5}
                  thickness={3}
                  amount={prog(t, TM.mat + 0.1, TM.mat + 0.5)}
                />
              </div>
              <div style={{ position: "absolute", right: 16, top: 14 }}>
                <VUMeter width={18} height={104} segments={14} lines={["t1-4"]} gain={1.25} />
              </div>
            </div>
          </div>
        )}
        {/* 実体化の瞬間、アバターから一度だけ広がる輪 */}
        {t >= TM.mat && t < TM.mat + 0.8 && (
          <svg width={PRE.w} height={PRE.h} style={{ position: "absolute", left: 0, top: 0 }}>
            {[0, 1].map((k) => {
              const b = prog(t, TM.mat + k * 0.1, TM.mat + 0.7 + k * 0.1, ease.out);
              return b > 0 && b < 1 ? (
                <circle key={k} cx={AVA.cx} cy={AVA.cy} r={AVA.r + b * 90} fill="none" stroke={k ? C.mint : C.coral} strokeWidth={3 - k} opacity={(1 - b) * 0.9} />
              ) : null;
            })}
          </svg>
        )}
        {/* 走査線 */}
        {scan > 0 && scan < 1 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: scan * PRE.h - 2,
              height: 3,
              background: C.mint,
              boxShadow: `0 0 18px ${C.mint}, 0 0 4px ${C.mint}`,
            }}
          />
        )}
      </Panel>
    </div>
  );
};

// ───────── 間をつなぐ矢印と、文字 → 声 の信号の粒 ─────────
const Link: React.FC<{ t: number }> = ({ t }) => {
  const draw = prog(t, TM.linkIn, TM.linkIn + 0.5, ease.outQuint);
  const hot = t >= TM.press && t < TM.mat + 0.4 ? 1 : 0;
  const x0 = CON.x + CON.w + 14;
  const x1 = PRE.x - 14;
  const col = hot ? C.mint : C.borderHi;
  // 「新しい声が作れます」: 信号がひと粒、左から右へ渡る
  const pulse = prog(t, TM.newVoice - 0.35, TM.newVoice + 0.05, ease.inOut);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <line x1={x0} y1={LINK_Y} x2={mix(x0, x1, draw)} y2={LINK_Y} stroke={col} strokeWidth={2} strokeDasharray="4 7" />
      <path
        d={`M${x1 - 10} ${LINK_Y - 9} L${x1} ${LINK_Y} L${x1 - 10} ${LINK_Y + 9}`}
        stroke={col}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={draw > 0.9 ? 1 : 0}
      />
      <text
        x={(x0 + x1) / 2}
        y={LINK_Y - 18}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={15}
        letterSpacing="0.16em"
        fill={hot ? C.mint : C.dim}
        opacity={draw}
      >
        TTS
      </text>
      {pulse > 0 && pulse < 1 && (
        <circle
          cx={mix(x0, x1, pulse)}
          cy={LINK_Y}
          r={5}
          fill={C.mint}
          opacity={Math.min(1, pulse * 6, (1 - pulse) * 6)}
          style={{ filter: `drop-shadow(0 0 6px ${C.mint})` }}
        />
      )}
    </svg>
  );
};

// 点列を Catmull-Rom でなめらかにつなぎ、長さで等間隔に位置を取れるようにする
type Pt = { x: number; y: number };
const makePath = (pts: Pt[]) => {
  const dense: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 16; k++) {
      const u = k / 16;
      const u2 = u * u;
      const u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      dense.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  dense.push(pts[pts.length - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const total = acc[acc.length - 1];
  return (f: number): Pt => {
    const d = Math.min(1, Math.max(0, f)) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const k = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
    return { x: mix(dense[i - 1].x, dense[i].x, k), y: mix(dense[i - 1].y, dense[i].y, k) };
  };
};

// キーワードの下線から粒が離陸し、文字にかぶらない通り道（1 行目は上、2 行目は下）を通って右の声へ
const PARTICLES = KW_POS.flatMap((kp, kw) =>
  Array.from({ length: 11 }, (_, j) => {
    const seed = kw * 17 + j * 3.7;
    const upper = kw === 0;
    const lane = (upper ? CON.y + INPUT.y + 16 : CON.y + INPUT.y + INPUT.h - 34) + (rand(seed + 2) - 0.5) * 14;
    const sx = kp.x + (rand(seed + 1) - 0.5) * kp.w * 0.85;
    const path = makePath([
      { x: sx, y: kp.y },
      { x: sx + 46, y: lane },
      { x: CON.x + INPUT.x + INPUT.w - 30, y: lane },
      { x: (CON.x + CON.w + PRE.x) / 2, y: LINK_Y + (rand(seed + 3) - 0.5) * 16 },
      { x: AVA_ABS.x - 20, y: AVA_ABS.y + (rand(seed + 5) - 0.5) * 30 },
      AVA_ABS,
    ]);
    return { kw, j, seed, path, delay: 0.03 + kw * 0.05 + j * 0.03, r: 3 + rand(seed + 4) * 2.2 };
  }),
);

const Particles: React.FC<{ t: number }> = ({ t }) => {
  if (t < TM.press || t > TM.mat + 0.2) return null;
  const items = PARTICLES.map((pp) => {
    const t0 = TM.press + pp.delay;
    const dur = Math.max(0.35, (TM.mat - 0.02 - t0) * (0.82 + 0.18 * rand(pp.seed)));
    const p = (t - t0) / dur;
    if (p <= 0 || p >= 1) return null;
    const e = ease.inOut(p);
    const trail = [0.09, 0.06, 0.03, 0].map((d) => pp.path(Math.max(0, e - d)));
    const a = trail[trail.length - 1];
    const op = Math.min(1, p * 6) * (1 - prog(p, 0.88, 1));
    return (
      <g key={`${pp.kw}-${pp.j}`} opacity={op}>
        <polyline
          points={trail.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")}
          stroke={C.mint}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.5}
        />
        <circle cx={a.x} cy={a.y} r={pp.r} fill={C.mint} />
      </g>
    );
  });
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", filter: `drop-shadow(0 0 6px ${C.mint})` }}
    >
      {items}
    </svg>
  );
};

// ───────── シーン本体 ─────────
export const T1VoiceDesign: React.FC = () => {
  const t = useTime();
  const signIn = prog(t, TM.signIn, TM.signIn + 0.5, ease.outQuint);
  // 点灯: ほんの一瞬だけ瞬いてから安定
  const d = t - TM.onAir;
  const lit = d < 0 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.2 : 1;
  const env = envAt("t1-4", t);
  return (
    <SceneShell id="t1">
      <Headline t={t} />
      <Hint t={t} />
      <OnAirSign
        lit={lit > 0.5 ? 0.75 + 0.25 * env : 0}
        x={1920 - PAD_X - 232}
        y={208}
        w={232}
        h={66}
        opacity={signIn}
      />
      <Link t={t} />
      <Console t={t} />
      <Preset t={t} />
      <Particles t={t} />

      {/* 効果音 */}
      <Sfx at={TM.consoleIn + 0.05} name="tick" volume={0.18} />
      <Sfx at={TM.presetIn + 0.05} name="tick" volume={0.14} />
      {CHAR_TIMES.map((c, i) => (
        <Sfx key={i} at={c} name="type" volume={0.13} />
      ))}
      <Sfx at={TM.armed} name="pop" volume={0.14} />
      <Sfx at={TM.press} name="click" volume={0.3} />
      <Sfx at={TM.press + 0.02} name="swell" volume={0.16} />
      <Sfx at={TM.mat} name="pop" volume={0.18} />
    </SceneShell>
  );
};
