/*
 * OUTRO「ON AIR」— 絵コンテ（時刻はすべて台本の行・フレーズ基準。秒の直書きなし）
 *
 * 0. 入り（sceneEnter → outro-1）
 *    白いテープが抜けると、画面下寄りに横一本のスコープ。まだ灰色で、一定周期・一定振幅の
 *    角ばった波（＝棒読み）。左にマイク、右に小さな VU。
 * 1. outro-1 前半「読み上げソフトから、」
 *    上段に「読み上げソフト」（sub 色, FONT 900）が浮かぶ。スコープは声に合わせて単調に刻むだけ。
 *    「から、」でコーラルの取り消し線が左→右に引かれ、文字は dim に沈む（台本の赤入れ）。
 *    同時にスコープの波が棒読み → 表情のある波へ変わり、色が灰 → ミントに。下向き矢印。
 * 2. outro-1 後半「演じる声優へ。」
 *    「演じる声優」が DISPLAY 156px で一文字ずつ落ちてきて着地（白＋コーラルの光）。
 *    下にコーラルの下線が中央から伸びる（取り消し線と対：消す → 強調する）。
 *    スコープは実際の声で大きく揺れ、マイクのリングも声に合わせて広がる。
 * 3. 行間 → outro-2「Gemini APIとGoogle AI Studioで、今日から試せます。」
 *    上段と見出しは上へ抜け、マイク・VU も消える。画面上部に ON AIR 表示灯のハウジングが降り、
 *    赤いガラスが蛍光管のようにちらついてから点灯・安定（赤いにじみが上部に広がる）。
 *    「Gemini 3.8 Flash TTS」がコーラルの再生ヘッドの通過で左から現れる。
 *    「Gemini API」「Google AI Studio」の言葉に合わせてチップが順にポップ。
 *    「今日から試せます」で ─ AVAILABLE NOW ─ が点き、チップの LED がミントに点灯（＝使える）。
 *    スコープは少し細くなってチップの下で声に反応し続ける。
 * 4. outro-3「ちなみにこの動画、声はGemini、映像はClaudeがコードで描きました。」
 *    「ちなみにこの動画、」… 上の塊が少し上へ詰まり、下から CREDITS パネルがせり上がる。
 *    スコープはパネルの VOICE 行の右スロットへ吸い込まれる。FLOW の SCRIPT が点灯。
 *    「声はGemini、」… VOICE 行に「Gemini 3.8 Flash TTS」が打ち込まれ、FLOW が TTS まで伸びる。
 *    「映像はClaudeが…」… VISUALS 行に「Claude (code / Remotion)」、右スロットにこのシーン自身の
 *    コード <SceneShell id="outro"> が打ち込まれる。「コードで」で CODE、「描きました」で VIDEO がコーラルに点灯。
 * 5. 余韻（outro-3 の後 → 最後）
 *    すべて静止して保持。スコープは平らに収まり、HUD の REC → STOP と同時に ON AIR 灯が消える。
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { IconArrowDown, IconMic } from "../components/Icons";
import { VUMeter } from "../components/Meters";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, W } from "../theme";
import { TOTAL_SEC, line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import {
  Chip,
  FlowNode,
  FlowWire,
  MorphScope,
  OnAirLamp,
  Typed,
  flicker,
  mixColor,
  mono,
  withAlpha,
} from "./Outro/parts";
import { phrases } from "./Outro/timing";

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("outro-1");
const L2 = line("outro-2");
const L3 = line("outro-3");
const [p1a, p1b] = phrases("outro-1", [0.55]); // 読み上げソフトから、 / 演じる声優へ。
const [p2a, p2b] = phrases("outro-2", [0.62]); // Gemini APIとGoogle AI Studioで、 / 今日から試せます。
const [p3a, p3b, p3c] = phrases("outro-3", [0.27, 0.5]); // ちなみにこの動画、 / 声はGemini、 / 映像はClaudeが…

const T_IN = sceneEnter("outro");
const T_A = L1.start - 0.14;
const T_STRIKE = mix(p1a.start, p1a.end, 0.78);
const T_SLAM = p1b.start - 0.05;
const T_UNDER = T_SLAM + 0.3;
const T_OUT_A = L1.end - 0.16; // 上段（読み上げソフト）は先に抜けて表示灯の場所をあける
const T_OUT1 = L1.end + 0.02;
const T_LAMP_IN = L1.end + 0.04;
const T_LAMP_ON = L1.end + 0.2;
const T_TITLE = L2.start - 0.02;
const T_CHIP1 = p2a.start + 0.28;
const T_CHIP2 = mix(p2a.start, p2a.end, 0.42);
const T_AVAIL = p2b.start - 0.06;
const T_SHIFT = L3.start - 0.12;
const T_PANEL = L3.start - 0.08;
const T_FLOW1 = mix(p3a.start, p3a.end, 0.5);
const T_VOICE = p3b.start - 0.04;
const T_FLOW2 = p3b.start + 0.3;
const T_VIS = p3c.start - 0.04;
const T_CODE = mix(p3c.start, p3c.end, 0.3);
const T_FLOW3 = mix(p3c.start, p3c.end, 0.45);
const T_FLOW4 = mix(p3c.start, p3c.end, 0.84);
const T_STOP = TOTAL_SEC - 0.9; // HUD の REC → STOP と同じ瞬間

/* ---------------- レイアウト ---------------- */
const CX = W / 2;
// outro-1
const A_Y = 268;
const A_BIG_Y = 470; // 取り消されるまでは画面の中央で大きく
const A_BIG_SCALE = 1.5;
const ARROW_Y = 362;
const B_Y = 488;
const B_FS = 156;
const B_TEXT = "演じる声優";
// エンドカード（outro-3 での最終位置。outro-2 の間は SHIFT だけ下）
const LAMP = { w: 372, h: 88, y: 156 };
const TITLE_Y = 322;
const TITLE_FS = 92;
const AVAIL_Y = 406;
const CHIPS_Y = 434;
const SHIFT = 58;
const PANEL = { x: 380, y: 556, w: 1160, h: 292 };
const ROW_H = 78;
const ROW1 = 56; // パネル上端からの行の上端
const ROW2 = ROW1 + ROW_H;
const ROW3 = ROW2 + ROW_H;
const LABEL_X = 34;
const VALUE_X = 200;
const SLOT = { w: 330, h: 56, right: 34 };

type Rect = { cx: number; cy: number; w: number; h: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  cx: mix(a.cx, b.cx, p),
  cy: mix(a.cy, b.cy, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});
const S1: Rect = { cx: CX, cy: 716, w: 1000, h: 150 };
const S2: Rect = { cx: CX, cy: 720, w: 860, h: 108 };

const CODE_TEXT = '<SceneShell id="outro">';

/* ================================================================== */
export const Outro: React.FC = () => {
  const t = useTime();
  const lv = useVoiceLevel();
  const rms = lv ? lv.rms : 0;

  /* ---- 0〜2: 読み上げソフト → 演じる声優 ---- */
  const scopeIn = prog(t, T_IN + 0.05, T_IN + 0.6, ease.outQuint);
  const aIn = prog(t, T_A, T_A + 0.45, ease.outQuint);
  const strike = prog(t, T_STRIKE, T_STRIKE + 0.28, ease.outQuint);
  const sink = prog(t, T_STRIKE + 0.1, T_STRIKE + 0.4, ease.out);
  const rise = prog(t, T_STRIKE + 0.22, T_SLAM + 0.08, ease.inOut);
  const aY = mix(A_BIG_Y, A_Y, rise);
  const aScale = mix(A_BIG_SCALE, 1, rise);
  const arrowIn = prog(t, T_SLAM - 0.12, T_SLAM + 0.2, ease.outQuint);
  const expr = prog(t, T_STRIKE + 0.05, T_SLAM + 0.15, ease.inOut);
  const under = prog(t, T_UNDER, T_UNDER + 0.45, ease.outQuint);
  const outA = prog(t, T_OUT_A, T_OUT_A + 0.26, ease.inOut);
  const out1 = prog(t, T_OUT1, T_OUT1 + 0.32, ease.inOut);
  const micOut = prog(t, T_OUT1, T_OUT1 + 0.3, ease.out);

  /* ---- 3: ON AIR とエンドカード ---- */
  const lampIn = prog(t, T_LAMP_IN, T_LAMP_IN + 0.32, ease.outQuint);
  const lampOff = prog(t, T_STOP, T_STOP + 0.22, ease.out);
  const lit = flicker(t, T_LAMP_ON) * (1 - lampOff);
  const titleP = prog(t, T_TITLE, T_TITLE + 0.62, ease.inOut);
  const headOut = prog(t, T_TITLE + 0.55, T_TITLE + 0.8, ease.out);
  const chip1 = springAt(t, T_CHIP1, { damping: 12, stiffness: 210 });
  const chip2 = springAt(t, T_CHIP2, { damping: 12, stiffness: 210 });
  const avail = prog(t, T_AVAIL, T_AVAIL + 0.4, ease.outQuint);
  const ready1 = prog(t, T_AVAIL + 0.05, T_AVAIL + 0.3, ease.out);
  const ready2 = prog(t, T_AVAIL + 0.15, T_AVAIL + 0.4, ease.out);
  const gy = SHIFT * (1 - prog(t, T_SHIFT, T_SHIFT + 0.6, ease.inOut));

  /* ---- 4: クレジット ---- */
  const panelIn = prog(t, T_PANEL, T_PANEL + 0.6, ease.outQuint);
  const panelY = PANEL.y + (1 - panelIn) * 70;
  const voiceP = prog(
    t,
    T_VOICE,
    T_VOICE + Math.min(0.75, p3b.dur * 0.85),
    ease.linear,
  );
  const visP = prog(t, T_VIS, T_VIS + 0.7, ease.linear);
  const visSubP = prog(t, T_VIS + 0.55, T_VIS + 1.1, ease.linear);
  const codeP = prog(t, T_CODE, mix(p3c.start, p3c.end, 0.78), ease.linear);
  const row1In = prog(t, T_PANEL + 0.2, T_PANEL + 0.5, ease.out);
  const n1 = prog(t, T_FLOW1, T_FLOW1 + 0.25, ease.out);
  const w1 = prog(t, T_FLOW1 + 0.1, T_FLOW2, ease.inOut);
  const n2 = prog(t, T_FLOW2, T_FLOW2 + 0.25, ease.out);
  const w2 = prog(t, T_FLOW2 + 0.1, T_FLOW3, ease.inOut);
  const n3 = prog(t, T_FLOW3, T_FLOW3 + 0.25, ease.out);
  const w3 = prog(t, T_FLOW3 + 0.1, T_FLOW4, ease.inOut);
  const n4 = prog(t, T_FLOW4, T_FLOW4 + 0.3, ease.out);

  /* ---- スコープの位置（大きく → チップの下 → VOICE 行のスロットへ） ---- */
  const S3: Rect = {
    cx: PANEL.x + PANEL.w - SLOT.right - SLOT.w / 2,
    cy: panelY + ROW1 + ROW_H / 2,
    w: SLOT.w - 24,
    h: SLOT.h - 6,
  };
  let sr = lerpRect(S1, S2, prog(t, L1.end, L2.start + 0.35, ease.inOut));
  const dock = prog(t, T_PANEL + 0.02, T_PANEL + 0.62, ease.outQuint);
  sr = lerpRect(sr, S3, dock);
  const settle = 1 - prog(t, T_STOP - 0.6, T_STOP + 0.2, ease.inOut);
  const scopeAmt = scopeIn * settle;
  const exGain = mix(1.6, 1.0, prog(t, L1.end, L2.start + 0.35)) * mix(1, 1.25, dock);
  const scopeColor = mixColor(C.dim, C.mint, settle);
  const thick = mix(3.5, 2.5, dock);

  /* ---- マイクのリング ---- */
  const ring = rms * expr;

  return (
    <SceneShell id="outro">
      <AbsoluteFill>
        {/* ON AIR の赤いにじみ */}
        <div
          style={{
            position: "absolute",
            left: CX - 700,
            top: LAMP.y + LAMP.h / 2 - 360,
            width: 1400,
            height: 720,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${withAlpha(C.red, 0.13 * lit)} 0%, rgba(255,59,48,0) 70%)`,
          }}
        />

        {/* ===== 1〜2: 読み上げソフト → 演じる声優 ===== */}
        {out1 < 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1 - out1,
              transform: `scale(${1 - 0.04 * out1})`,
              filter: out1 > 0 ? `blur(${6 * out1}px)` : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 1 - outA,
                transform: `translateY(${-14 * outA}px)`,
                filter: outA > 0 ? `blur(${5 * outA}px)` : undefined,
              }}
            >
              {/* 上段: 読み上げソフト（取り消し線） */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: W,
                  top: aY - 40,
                  height: 80,
                  display: "flex",
                  justifyContent: "center",
                  opacity: aIn,
                  transform: `translateY(${(1 - aIn) * 18}px) scale(${aScale})`,
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontWeight: 900,
                      fontSize: 64,
                      lineHeight: "80px",
                      letterSpacing: "0.04em",
                      color: mixColor(C.sub, C.dim, sink),
                      whiteSpace: "nowrap",
                    }}
                  >
                    読み上げソフト
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: -14,
                      top: 38,
                      height: 7,
                      borderRadius: 4,
                      width: `calc(${strike * 100}% + ${28 * strike}px)`,
                      background: C.coral,
                      boxShadow: `0 0 14px ${withAlpha(C.coral, 0.7)}`,
                      transform: "rotate(-1.2deg)",
                      transformOrigin: "left center",
                    }}
                  />
                </div>
              </div>

              {/* 矢印 */}
              <div
                style={{
                  position: "absolute",
                  left: CX - 22,
                  top: ARROW_Y - 22,
                  opacity: arrowIn,
                  transform: `translateY(${(arrowIn - 1) * 14}px)`,
                }}
              >
                <IconArrowDown size={44} color={C.coral} sw={2.2} />
              </div>
            </div>

            {/* 下段: 演じる声優 */}
            <div
              style={{
                position: "absolute",
                left: 0,
                width: W,
                top: B_Y - B_FS * 0.62,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ position: "relative", display: "flex" }}>
                {Array.from(B_TEXT).map((ch, i) => {
                  const ti = T_SLAM + i * 0.05;
                  const s = springAt(t, ti, {
                    damping: 12,
                    stiffness: 240,
                    mass: 0.7,
                  });
                  const o = prog(t, ti, ti + 0.08, ease.linear);
                  return (
                    <div
                      key={i}
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: B_FS,
                        lineHeight: 1.24,
                        color: C.text,
                        opacity: o,
                        transform: `translateY(${(1 - s) * -46}px) scale(${1 + (1 - s) * 0.22})`,
                        textShadow: `0 0 28px ${withAlpha(C.coral, 0.45)}, 0 0 4px ${withAlpha(C.coral, 0.35)}`,
                      }}
                    >
                      {ch}
                    </div>
                  );
                })}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 4,
                    width: `${under * 86}%`,
                    transform: "translateX(-50%)",
                    height: 7,
                    borderRadius: 4,
                    background: C.coral,
                    boxShadow: `0 0 16px ${withAlpha(C.coral, 0.7)}`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* マイクと VU（outro-1 だけ） */}
        {micOut < 1 && (
          <>
            <div
              style={{
                position: "absolute",
                left: S1.cx - S1.w / 2 - 110,
                top: S1.cy - 44,
                width: 88,
                height: 88,
                opacity: scopeIn * (1 - micOut),
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -14 - 22 * ring,
                  borderRadius: "50%",
                  border: `2px solid ${withAlpha(C.coral, 0.15 + 0.6 * ring)}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`,
                  border: `1.5px solid ${mixColor(C.borderHi, C.coral, expr * 0.8)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconMic
                  size={44}
                  color={mixColor(C.sub, C.coral, expr)}
                  sw={1.9}
                />
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: S1.cx + S1.w / 2 + 44,
                top: S1.cy - 60,
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                opacity: scopeIn * (1 - micOut),
              }}
            >
              <VUMeter width={16} height={120} segments={12} />
              <div style={mono(16, C.dim, 700, "0.14em")}>CH A</div>
            </div>
          </>
        )}

        {/* ===== 3: ON AIR 表示灯 ===== */}
        {lampIn > 0 && (
          <div
            style={{
              position: "absolute",
              left: CX - LAMP.w / 2,
              top: LAMP.y,
              opacity: lampIn,
              transform: `translateY(${(1 - lampIn) * -18}px)`,
            }}
          >
            <OnAirLamp lit={lit} w={LAMP.w} h={LAMP.h} />
          </div>
        )}

        {/* 製品名（再生ヘッドの通過で現れる） */}
        {titleP > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: W,
              top: TITLE_Y + gy - TITLE_FS * 0.66,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: TITLE_FS,
                  lineHeight: 1.32,
                  color: C.text,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                  clipPath: `inset(-20px ${(1 - titleP) * 100}% -20px -20px)`,
                }}
              >
                Gemini 3.8 Flash TTS
              </div>
              <div
                style={{
                  position: "absolute",
                  left: `${titleP * 100}%`,
                  top: -6,
                  bottom: -6,
                  width: 4,
                  marginLeft: 4,
                  borderRadius: 2,
                  background: C.coral,
                  boxShadow: `0 0 16px ${C.coral}`,
                  opacity: 1 - headOut,
                }}
              />
            </div>
          </div>
        )}

        {/* AVAILABLE NOW */}
        {avail > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: W,
              top: AVAIL_Y + gy - 12,
              height: 24,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 18,
              opacity: avail,
            }}
          >
            <div
              style={{
                width: 90 * avail,
                height: 1.5,
                background: withAlpha(C.mint, 0.45),
              }}
            />
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: C.mint,
                boxShadow: `0 0 10px ${C.mint}`,
              }}
            />
            <div
              style={{
                ...mono(18, C.mint, 700, "0.22em"),
                marginRight: "-0.22em",
              }}
            >
              AVAILABLE NOW
            </div>
            <div style={{ width: 9, height: 9 }} />
            <div
              style={{
                width: 90 * avail,
                height: 1.5,
                background: withAlpha(C.mint, 0.45),
              }}
            />
          </div>
        )}

        {/* チップ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: CHIPS_Y + gy,
            display: "flex",
            justifyContent: "center",
            gap: 26,
          }}
        >
          {[
            { label: "Gemini API", s: chip1, ready: ready1, at: T_CHIP1 },
            { label: "Google AI Studio", s: chip2, ready: ready2, at: T_CHIP2 },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                opacity: prog(t, c.at, c.at + 0.1, ease.linear),
                transform: `translateY(${(1 - c.s) * 22}px) scale(${0.86 + 0.14 * c.s})`,
              }}
            >
              <Chip label={c.label} ready={c.ready} />
            </div>
          ))}
        </div>

        {/* ===== 4: クレジット ===== */}
        {panelIn > 0 && (
          <Panel
            x={PANEL.x}
            y={panelY}
            w={PANEL.w}
            h={PANEL.h}
            header={
              <>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: C.coral,
                  }}
                />
                <span>END CREDITS</span>
              </>
            }
            status={<span style={{ letterSpacing: "0.16em" }}>THIS VIDEO</span>}
            style={{ opacity: panelIn }}
          >
            {/* 行の区切り */}
            {[ROW2, ROW3].map((y) => (
              <div
                key={y}
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  top: y,
                  height: 1,
                  background: C.border,
                }}
              />
            ))}

            {/* VOICE */}
            <div
              style={{
                position: "absolute",
                left: LABEL_X,
                top: ROW1,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                opacity: row1In,
              }}
            >
              <div style={mono(18, C.sub)}>VOICE</div>
            </div>
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROW1,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typed
                text="Gemini 3.8 Flash TTS"
                p={voiceP}
                style={mono(32, C.text, 700, "0.02em")}
              />
            </div>
            <div
              style={{
                position: "absolute",
                right: SLOT.right,
                top: ROW1 + (ROW_H - SLOT.h) / 2,
                width: SLOT.w,
                height: SLOT.h,
                borderRadius: 10,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${C.border}`,
                opacity: row1In,
              }}
            />

            {/* VISUALS */}
            <div
              style={{
                position: "absolute",
                left: LABEL_X,
                top: ROW2,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                opacity: row1In,
              }}
            >
              <div style={mono(18, C.sub)}>VISUALS</div>
            </div>
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                top: ROW2,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Typed
                text="Claude"
                p={visP}
                style={mono(32, C.text, 700, "0.02em")}
              />
              <Typed
                text="(code / Remotion)"
                p={visSubP}
                style={mono(22, C.sub, 500, "0.04em")}
              />
            </div>
            <div
              style={{
                position: "absolute",
                right: SLOT.right,
                top: ROW2 + (ROW_H - SLOT.h) / 2,
                width: SLOT.w,
                height: SLOT.h,
                borderRadius: 10,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: 18,
                boxSizing: "border-box",
                opacity: row1In,
              }}
            >
              <div
                style={{
                  ...mono(19, C.sub, 500, "0"),
                  width: 20,
                  color: C.dim,
                }}
              >
                1
              </div>
              <CodeLine p={codeP} />
            </div>

            {/* FLOW */}
            <div
              style={{
                position: "absolute",
                left: LABEL_X,
                top: ROW3,
                height: PANEL.h - ROW3,
                display: "flex",
                alignItems: "center",
                opacity: row1In,
              }}
            >
              <div style={mono(18, C.sub)}>FLOW</div>
            </div>
            <div
              style={{
                position: "absolute",
                left: VALUE_X,
                right: SLOT.right,
                top: ROW3,
                height: PANEL.h - ROW3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: row1In,
              }}
            >
              <FlowNode label="SCRIPT" on={n1} />
              <FlowWire p={w1} width={124} />
              <FlowNode label="TTS" on={n2} />
              <FlowWire p={w2} width={124} />
              <FlowNode label="CODE" on={n3} />
              <FlowWire p={w3} width={124} />
              <FlowNode label="VIDEO" on={n4} final />
            </div>
          </Panel>
        )}

        {/* スコープ（全編を通してつながる一本の線） */}
        <div
          style={{
            position: "absolute",
            left: sr.cx - sr.w / 2,
            top: sr.cy - sr.h / 2,
            opacity: clamp01(scopeIn * 1.4),
          }}
        >
          <MorphScope
            width={sr.w}
            height={sr.h}
            expr={expr}
            amount={scopeAmt}
            exGain={exGain}
            colorA={C.dim}
            colorB={scopeColor}
            thickness={thick}
            glow={settle}
          />
        </div>
      </AbsoluteFill>

      {/* 効果音 */}
      <Sfx at={T_STRIKE} name="tick" volume={0.22} />
      <Sfx at={T_SLAM} name="pop" volume={0.2} />
      <Sfx at={T_LAMP_ON} name="click" volume={0.26} />
      <Sfx at={T_CHIP1} name="pop" volume={0.14} />
      <Sfx at={T_CHIP2} name="pop" volume={0.14} />
      <Sfx at={T_AVAIL} name="tick" volume={0.14} />
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
    <div
      style={{
        ...mono(20, C.text, 500, "0"),
        display: "flex",
        alignItems: "center",
      }}
    >
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
            width: 10,
            height: 22,
            marginLeft: 2,
            background: C.coral,
            opacity: p > 0 ? 1 : 0.5,
          }}
        />
      )}
    </div>
  );
};
