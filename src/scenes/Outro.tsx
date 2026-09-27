/*
 * OUTRO「ON AIR」— 絵コンテ（時刻はすべて台本の行・フレーズ基準。秒の直書きなし）
 *
 * 冒頭（Open）の「誰もいないボーカルブース」に戻ってきて終わる。カメラ位置も冒頭と同じ:
 * 右にブース、左に見出しと PGM OUT の波形。最後はブースの ON AIR が消えて収録終了。
 *
 * 0. 入り（sceneEnter → outro-1）
 *    テープが抜けると、冒頭と同じブース（ON AIR 点灯・空のスツールにスポットライト）がゆっくり寄る。
 *    左上に「最後まで、」。下に PGM OUT のスコープ（まだ平ら）。
 * 1. outro-1 前半
 *    見出し「誰もいない。」（冒頭と同じ DISPLAY 206px、「いない。」はコーラル）が一文字ずつ着地。
 *    スコープが実際の声で揺れ始める。
 * 2. outro-1 後半
 *    ブースのマイクの入力に「NO INPUT」が点き（マイクには何も入っていない）、
 *    同時に PGM OUT の横に「LIVE」が点いて、波形が一段大きく揺れる（声だけは出ている）。
 * 3. 行間 → outro-2（試せる場所）
 *    見出しは上へ抜け、左に「SESSION SHEET」（収録シート）がせり上がる。行の枠と薄いラベルが先に見え、
 *    話に合わせて埋まっていく。スコープは VOICE 行の右スロットへ吸い込まれる。
 *    MODEL 行に「Gemini 3.8 Flash TTS」がコーラルの再生ヘッドの通過で現れる。
 *    TRY IT 行にパッチベイの差し込み口が 2 つ同時に出る（Gemini API / Google AI Studio）。
 *    名前が読まれるたびにプラグが差さり、「今日から試せます」で LED がミントに点く（＝もう使える）。
 * 4. outro-3「ちなみにこの動画、声は…、映像は…」
 *    「ちなみにこの動画、」… FLOW の SCRIPT が点灯。
 *    「声は…」… VOICE 行に今の音声の出どころ（timeline の VOICE_PROVIDER から。仮音声なら PLACEHOLDER 付き）
 *    が打ち込まれ、FLOW が TTS まで伸びる。
 *    「映像は…」… VISUALS 行に「Claude (code / Remotion)」、右スロットにこのシーン自身のコードが打ち込まれる。
 *    「コードで」で CODE、「描きました」で VIDEO がコーラルに点灯。
 * 5. 余韻（outro-3 の後 → 最後）
 *    すべて静止して保持。HUD の REC → STOP と同時にブースの ON AIR が消え、スポットライトも落ち、
 *    スコープは平らな灰色の線に戻る。
 */
import React from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { Oscilloscope } from "../components/Meters";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, PAD_X, W } from "../theme";
import { TOTAL_SEC, VOICE_PROVIDER, line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { BOOTH_W, Booth } from "./Outro/booth";
import { FlowNode, FlowWire, Jack, Typed, mixColor, mono } from "./Outro/parts";
import { phrases } from "./Outro/timing";

/* ---------------- 音声の出どころ（クレジットは実際の音声に合わせる） ---------------- */
const VOICE_IS_GEMINI = VOICE_PROVIDER === "gemini";
const PROVIDER_NAMES: Record<string, string> = { gemini: "Gemini 3.8 Flash TTS", openjtalk: "Open JTalk" };
const VOICE_NAME = PROVIDER_NAMES[VOICE_PROVIDER] ?? VOICE_PROVIDER;

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("outro-1");
const L2 = line("outro-2");
const L3 = line("outro-3");
const [, p1b] = phrases("outro-1", [0.5]); // 前半 / 後半
const [p2a, p2b] = phrases("outro-2", [0.62]); // 試せる場所 / 今日から試せます。
const [p3a, p3b, p3c] = phrases("outro-3", [0.27, 0.5]); // ちなみにこの動画、 / 声は…、 / 映像は…

const T_IN = sceneEnter("outro");
const T_LEAD = T_IN + 0.12;
const T_HEAD = L1.start - 0.04;
const T_LIVE = p1b.start - 0.04;
const T_OUT1 = L1.end - 0.12;
const T_SHEET = L1.end + 0.08;
const T_MODEL = L2.start - 0.08;
const T_JACKS = L2.start + 0.1;
const T_PLUG1 = mix(p2a.start, p2a.end, 0.06); // 1つ目の名前
const T_PLUG2 = mix(p2a.start, p2a.end, 0.45); // 2つ目の名前
const T_LED = p2b.start - 0.06; // 今日から試せます
const T_FLOW1 = mix(p3a.start, p3a.end, 0.5);
const T_VOICE = p3b.start - 0.04;
const T_FLOW2 = p3b.start + 0.3;
const T_VIS = p3c.start - 0.04;
const T_CODE = mix(p3c.start, p3c.end, 0.3);
const T_FLOW3 = mix(p3c.start, p3c.end, 0.45);
const T_FLOW4 = mix(p3c.start, p3c.end, 0.84);
const T_STOP = TOTAL_SEC - 0.9; // HUD の REC → STOP と同じ瞬間

/* ---------------- レイアウト ---------------- */
// 冒頭と同じカメラ位置
const BOOTH_X = W - PAD_X - BOOTH_W;
const BOOTH_Y = 150;
const COL_W = 1104;
const LEAD_Y = 244;
const HEAD_Y = 314;
const HEAD_FS = 206;
const SCOPE_CY = 712;
const SCOPE_H = 170;
// 収録シート
const SHEET = { x: PAD_X, y: 196, w: 1084, h: 610 };
const HEADER_H = 56;
const ROWS = {
  model: { top: HEADER_H, h: 128 },
  try: { top: HEADER_H + 128, h: 116 },
  voice: { top: HEADER_H + 244, h: 96 },
  visuals: { top: HEADER_H + 340, h: 96 },
  flow: { top: HEADER_H + 436, h: 96 },
};
const LABEL_X = 34;
const VALUE_X = 220;
const SLOT = { w: 320, h: 60, right: 34 };
const MODEL_FS = 62;

type Rect = { cx: number; cy: number; w: number; h: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  cx: mix(a.cx, b.cx, p),
  cy: mix(a.cy, b.cy, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});
const S1: Rect = { cx: PAD_X + COL_W / 2, cy: SCOPE_CY, w: COL_W, h: SCOPE_H };

const CODE_TEXT = '<SceneShell id="outro">';
const HEAD_CHARS: [string, string][] = [
  ["誰", C.text],
  ["も", C.text],
  ["い", C.coral],
  ["な", C.coral],
  ["い", C.coral],
  ["。", C.coral],
];

/* ================================================================== */
export const Outro: React.FC = () => {
  // 仕上げの書き出し（--props='{"final":true}'）では、仮音声のままなら止める
  if ((getInputProps() as { final?: boolean }).final && !VOICE_IS_GEMINI) {
    throw new Error(`最終書き出しの音声が仮音声（${VOICE_PROVIDER}）です。Gemini の音声を生成してから書き出してください。`);
  }
  const t = useTime();
  const lv = useVoiceLevel();
  const db = lv && lv.rms > 0.004 ? 20 * Math.log10(lv.rms) : null;

  /* ---- 0〜2: 誰もいないブース ---- */
  const push = prog(t, T_IN, L1.end, ease.out);
  const leadIn = prog(t, T_LEAD, T_LEAD + 0.45, ease.outQuint);
  const live = prog(t, T_LIVE, T_LIVE + 0.22, ease.outQuint);
  const out1 = prog(t, T_OUT1, T_OUT1 + 0.3, ease.inOut);
  const stop = prog(t, T_STOP, T_STOP + 0.22, ease.out);
  const onAir = 1 - stop;
  const spot = mix(1, 0.28, prog(t, T_STOP, T_STOP + 0.5, ease.inOut));

  /* ---- 3: 収録シート ---- */
  const sheetIn = prog(t, T_SHEET, T_SHEET + 0.55, ease.outQuint);
  const sheetY = SHEET.y + (1 - sheetIn) * 60;
  const modelP = prog(t, T_MODEL, T_MODEL + 0.62, ease.inOut);
  const headOut = prog(t, T_MODEL + 0.55, T_MODEL + 0.8, ease.out);
  const jack1 = prog(t, T_JACKS, T_JACKS + 0.4, ease.outQuint);
  const jack2 = prog(t, T_JACKS + 0.08, T_JACKS + 0.48, ease.outQuint);
  const plug1 = springAt(t, T_PLUG1, { damping: 14, stiffness: 260 });
  const plug2 = springAt(t, T_PLUG2, { damping: 14, stiffness: 260 });
  const led1 = prog(t, T_LED, T_LED + 0.2, ease.out);
  const led2 = prog(t, T_LED + 0.08, T_LED + 0.28, ease.out);

  /* ---- 4: クレジット ---- */
  const voiceP = prog(t, T_VOICE, T_VOICE + Math.min(0.75, p3b.dur * 0.85), ease.linear);
  const tagIn = prog(t, T_VOICE + Math.min(0.75, p3b.dur * 0.85), T_VOICE + Math.min(0.75, p3b.dur * 0.85) + 0.25, ease.outQuint);
  const visP = prog(t, T_VIS, T_VIS + 0.5, ease.linear);
  const visSubP = prog(t, T_VIS + 0.45, T_VIS + 1.0, ease.linear);
  const codeP = prog(t, T_CODE, mix(p3c.start, p3c.end, 0.78), ease.linear);
  const n1 = prog(t, T_FLOW1, T_FLOW1 + 0.25, ease.out);
  const w1 = prog(t, T_FLOW1 + 0.1, T_FLOW2, ease.inOut);
  const n2 = prog(t, T_FLOW2, T_FLOW2 + 0.25, ease.out);
  const w2 = prog(t, T_FLOW2 + 0.1, T_FLOW3, ease.inOut);
  const n3 = prog(t, T_FLOW3, T_FLOW3 + 0.25, ease.out);
  const w3 = prog(t, T_FLOW3 + 0.1, T_FLOW4, ease.inOut);
  const n4 = prog(t, T_FLOW4, T_FLOW4 + 0.3, ease.out);

  // 行ラベル: 埋まる前は dim、埋まり始めたら sub
  const actModel = prog(t, T_MODEL, T_MODEL + 0.3);
  const actTry = prog(t, T_JACKS, T_JACKS + 0.3);
  const actVoice = prog(t, T_VOICE - 0.1, T_VOICE + 0.2);
  const actVis = prog(t, T_VIS - 0.1, T_VIS + 0.2);
  const actFlow = prog(t, T_FLOW1 - 0.1, T_FLOW1 + 0.2);

  /* ---- スコープ（左の大きな PGM OUT → VOICE 行のスロットへ） ---- */
  const S2: Rect = {
    cx: SHEET.x + SHEET.w - SLOT.right - SLOT.w / 2,
    cy: sheetY + ROWS.voice.top + ROWS.voice.h / 2,
    w: SLOT.w - 28,
    h: SLOT.h - 8,
  };
  // 位置はなめらかに、長さは先に縮めて「短い線がスロットへ飛び込む」動きにする
  const dock = prog(t, L1.end - 0.04, L2.start + 0.4, ease.inOut);
  const shrink = prog(t, L1.end - 0.04, L2.start + 0.4, ease.outQuint);
  const sr: Rect = { ...lerpRect(S1, S2, dock), w: mix(S1.w, S2.w, shrink), h: mix(S1.h, S2.h, shrink) };
  const scopeIn = prog(t, T_IN + 0.05, T_IN + 0.5, ease.outQuint);
  const settle = 1 - prog(t, T_STOP - 0.5, T_STOP + 0.3, ease.inOut);
  const gain = mix(1, 1.5, live) * mix(1, 0.95, dock);
  const scopeColor = mixColor(C.dim, C.mint, settle);
  const labelsOut = prog(t, L1.end - 0.12, L1.end + 0.1, ease.out);

  const rowLabel = (text: string, top: number, h: number, act: number) => (
    <div style={{ position: "absolute", left: LABEL_X, top, height: h, display: "flex", alignItems: "center" }}>
      <div style={mono(18, mixColor(C.dim, C.sub, act))}>{text}</div>
    </div>
  );

  return (
    <SceneShell id="outro">
      <AbsoluteFill>
        {/* ===== 冒頭と同じブース ===== */}
        <div
          style={{
            position: "absolute",
            left: BOOTH_X,
            top: BOOTH_Y,
            transform: `scale(${mix(1.035, 1, push)})`,
            transformOrigin: "40% 60%",
          }}
        >
          <Booth onAir={onAir} spot={spot} noInput={live} />
        </div>

        {/* ===== 1〜2: 見出し ===== */}
        {out1 < 1 && (
          <div
            style={{
              position: "absolute",
              left: PAD_X,
              top: 0,
              width: COL_W,
              height: 1080,
              opacity: 1 - out1,
              transform: `translateY(${-40 * out1}px)`,
              filter: out1 > 0 ? `blur(${6 * out1}px)` : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: LEAD_Y,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 56,
                lineHeight: "64px",
                color: C.text,
                whiteSpace: "nowrap",
                opacity: leadIn,
                transform: `translateY(${(1 - leadIn) * 16}px)`,
              }}
            >
              最後まで、
            </div>
            <div
              style={{
                position: "absolute",
                left: -6,
                top: HEAD_Y,
                display: "flex",
                fontFamily: DISPLAY,
                fontSize: HEAD_FS,
                lineHeight: `${HEAD_FS}px`,
                whiteSpace: "nowrap",
                textShadow: "0 8px 40px rgba(0,0,0,0.55)",
              }}
            >
              {HEAD_CHARS.map(([ch, col], i) => {
                const ti = T_HEAD + i * 0.05;
                const s = springAt(t, ti, { damping: 13, stiffness: 240, mass: 0.7 });
                return (
                  <div
                    key={i}
                    style={{
                      color: col,
                      opacity: prog(t, ti, ti + 0.08, ease.linear),
                      transform: `translateY(${(1 - s) * -40}px) scale(${1 + (1 - s) * 0.18})`,
                    }}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 3〜4: 収録シート ===== */}
        {sheetIn > 0 && (
          <Panel
            x={SHEET.x}
            y={sheetY}
            w={SHEET.w}
            h={SHEET.h}
            header={
              <>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: C.coral }} />
                <span>SESSION SHEET</span>
              </>
            }
            status={<span style={{ letterSpacing: "0.16em" }}>WRAP-UP</span>}
            style={{ opacity: sheetIn }}
          >
            {/* 行の区切り */}
            {[ROWS.try.top, ROWS.voice.top, ROWS.visuals.top, ROWS.flow.top].map((y) => (
              <div key={y} style={{ position: "absolute", left: 24, right: 24, top: y, height: 1, background: C.border }} />
            ))}

            {/* MODEL */}
            {rowLabel("MODEL", ROWS.model.top, ROWS.model.h, actModel)}
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROWS.model.top,
                height: ROWS.model.h,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: MODEL_FS,
                    lineHeight: 1.3,
                    color: C.text,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                    clipPath: `inset(-20px ${(1 - modelP) * 100}% -20px -20px)`,
                  }}
                >
                  Gemini 3.8 Flash TTS
                </div>
                {modelP > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${modelP * 100}%`,
                      top: -4,
                      bottom: -4,
                      width: 4,
                      marginLeft: 4,
                      borderRadius: 2,
                      background: C.coral,
                      boxShadow: `0 0 16px ${C.coral}`,
                      opacity: 1 - headOut,
                    }}
                  />
                )}
              </div>
            </div>

            {/* TRY IT: パッチベイ */}
            {rowLabel("TRY IT", ROWS.try.top, ROWS.try.h, actTry)}
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROWS.try.top,
                height: ROWS.try.h,
                display: "flex",
                alignItems: "center",
                gap: 64,
              }}
            >
              <Jack label="Gemini API" show={jack1} plug={plug1} on={led1} />
              <Jack label="Google AI Studio" show={jack2} plug={plug2} on={led2} />
            </div>

            {/* VOICE */}
            {rowLabel("VOICE", ROWS.voice.top, ROWS.voice.h, actVoice)}
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROWS.voice.top,
                height: ROWS.voice.h,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Typed text={VOICE_NAME} p={voiceP} style={mono(30, C.text, 700, "0.02em")} />
              {!VOICE_IS_GEMINI && tagIn > 0 && (
                <div
                  style={{
                    height: 30,
                    padding: "0 10px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                    border: `1.5px solid ${C.borderHi}`,
                    ...mono(15, C.sub, 700, "0.14em"),
                    opacity: tagIn,
                    transform: `translateX(${(1 - tagIn) * -8}px)`,
                  }}
                >
                  PLACEHOLDER
                </div>
              )}
            </div>
            <div
              style={{
                position: "absolute",
                right: SLOT.right,
                top: ROWS.voice.top + (ROWS.voice.h - SLOT.h) / 2,
                width: SLOT.w,
                height: SLOT.h,
                borderRadius: 10,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${C.border}`,
              }}
            />

            {/* VISUALS */}
            {rowLabel("VISUALS", ROWS.visuals.top, ROWS.visuals.h, actVis)}
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROWS.visuals.top,
                height: ROWS.visuals.h,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Typed text="Claude" p={visP} style={mono(30, C.text, 700, "0.02em")} />
              <Typed text="(code / Remotion)" p={visSubP} style={mono(20, C.sub, 500, "0.04em")} />
            </div>
            <div
              style={{
                position: "absolute",
                right: SLOT.right,
                top: ROWS.visuals.top + (ROWS.visuals.h - SLOT.h) / 2,
                width: SLOT.w,
                height: SLOT.h,
                borderRadius: 10,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: 16,
                boxSizing: "border-box",
              }}
            >
              <div style={{ ...mono(17, C.dim, 500, "0"), width: 20 }}>1</div>
              <CodeLine p={codeP} />
            </div>

            {/* FLOW */}
            {rowLabel("FLOW", ROWS.flow.top, ROWS.flow.h, actFlow)}
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                right: SLOT.right,
                top: ROWS.flow.top,
                height: ROWS.flow.h,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <FlowNode label="SCRIPT" on={n1} />
              <FlowWire p={w1} width={104} />
              <FlowNode label="TTS" on={n2} />
              <FlowWire p={w2} width={104} />
              <FlowNode label="CODE" on={n3} />
              <FlowWire p={w3} width={104} />
              <FlowNode label="VIDEO" on={n4} final />
            </div>
          </Panel>
        )}

        {/* ===== PGM OUT（全編を通してつながる一本の線） ===== */}
        <div
          style={{
            position: "absolute",
            left: sr.cx - sr.w / 2,
            top: sr.cy - sr.h / 2,
            width: sr.w,
            height: sr.h,
            opacity: scopeIn,
          }}
        >
          {labelsOut < 1 && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: sr.h / 2 - 0.5,
                  width: sr.w,
                  height: 1,
                  background: C.border,
                  opacity: 1 - labelsOut,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: -12,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: 1 - labelsOut,
                }}
              >
                <div style={mono(18)}>
                  <span style={{ color: C.mint }}>●</span> PGM OUT
                </div>
                <div
                  style={{
                    height: 26,
                    padding: "0 9px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 5,
                    border: `1.5px solid ${C.mint}`,
                    background: C.mintSoft,
                    ...mono(15, C.mint, 700, "0.14em"),
                    opacity: live,
                    transform: `translateX(${(1 - live) * -8}px)`,
                  }}
                >
                  LIVE
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: -12,
                  ...mono(18, db !== null ? C.text : C.dim),
                  fontVariantNumeric: "tabular-nums",
                  opacity: 1 - labelsOut,
                }}
              >
                {db !== null ? `${db.toFixed(1)} dB` : "-∞ dB"}
              </div>
            </>
          )}
          <Oscilloscope
            width={sr.w}
            height={sr.h}
            color={scopeColor}
            gain={gain}
            thickness={mix(3, 2.4, dock)}
            amount={settle}
            glow={settle > 0.5}
          />
        </div>
      </AbsoluteFill>

      {/* 効果音 */}
      <Sfx at={T_HEAD} name="pop" volume={0.18} />
      <Sfx at={T_LIVE} name="tick" volume={0.2} />
      <Sfx at={T_PLUG1} name="click" volume={0.22} />
      <Sfx at={T_PLUG2} name="click" volume={0.22} />
      <Sfx at={T_LED} name="tick" volume={0.16} />
      <Sfx at={T_VOICE} name="type" volume={0.13} />
      <Sfx at={T_VIS} name="type" volume={0.13} />
      <Sfx at={T_FLOW4} name="chime" volume={0.2} />
      <Sfx at={T_STOP} name="click" volume={0.18} />
    </SceneShell>
  );
};

/** このシーン自身のコードの 1 行を、簡単な色分けで打ち込む */
const CodeLine: React.FC<{ p: number }> = ({ p }) => {
  const n = Math.round(clamp01(p) * CODE_TEXT.length);
  const parts: [string, string][] = [
    ["<SceneShell", C.coral],
    [" id=", C.sub],
    ['"outro"', C.text],
    [">", C.coral],
  ];
  let used = 0;
  return (
    <div style={{ ...mono(18, C.text, 500, "0"), display: "flex", alignItems: "center" }}>
      {parts.map(([s, col]) => {
        const k = Math.max(0, Math.min(s.length, n - used));
        used += s.length;
        return (
          <span key={s} style={{ color: col, whiteSpace: "pre" }}>
            {s.slice(0, k)}
          </span>
        );
      })}
      {p < 1 && (
        <span
          style={{
            display: "inline-block",
            width: 9,
            height: 20,
            marginLeft: 2,
            background: C.coral,
            opacity: p > 0 ? 1 : 0.5,
          }}
        />
      )}
    </div>
  );
};
