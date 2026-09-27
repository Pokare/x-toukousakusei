/*
 * COLD OPEN — 絵コンテ（すべての時刻は台本の行・フレーズ基準。秒の直書きなし）
 *
 * 0. 暗転（0 → open-1）
 *    ほぼ真っ暗。画面の真ん中に小さなミントの点 → 横一線のオシロスコープの線に伸びる。
 *    左端に「CH-1 MONITOR」、右端に実際の声から計算した dB 表示。
 * 1. open-1「この声、録音じゃありません。」
 *    「この声、」… 線が声で揺れ始め、上に録音ランプ「● RECORDING」が点灯。
 *    「録音じゃありません」… コーラルの線がランプを斜めに打ち消し、ランプが消える。
 *    同時に「録音じゃない。」が DISPLAY で叩きつけられ、オシロの線が下へ押し出される。
 * 2. open-2「台本を渡しただけで、AIが演じています。」
 *    ランプと見出しは上へ抜け、オシロの線は右の「VOICE OUT」パネルに吸い込まれる。
 *    左から: 台本カード（行が書き込まれる）→ 信号線（ミントのパルス）→ AI チップ（ピンが点灯）
 *    →「演じています」で出力パネルが LIVE に。下に「台本 / 演じる / 声」。
 * 3. open-3「作ったのは、Googleの新しい音声モデル「Gemini 3.8 Flash TTS」。」
 *    「作ったのは」… 台本と出力がチップに吸い込まれて一つになる。
 *    「Googleの新しい音声モデル」… 上にラベルが打ち込まれ、ピンがコーラルに充電されていく。
 *    「Gemini 3.8 Flash TTS」… チップが縦一本のコーラルの線に潰れ、左右に開いて製品名を露出。
 *    下に声で揺れるミントのライン、「TEXT-TO-SPEECH MODEL · 2026.09.23」。
 * 4. open-4「何ができるのか、5つのトラックで聴いてみましょう。」
 *    製品名が左上のセッション名へ縮み、DAW のトラック一覧（5 レーン）が右から滑り込む。
 *    クリップは実際の各トラックの音声波形・実際の長さで階段状に並ぶ。
 *    「5つのトラック」で右上に「5 TRACKS」、レーンが上から順に点灯（SESSION の横の小さな波形は声に反応）。
 *    「聴いてみましょう」でコーラルの再生ヘッドが先頭に降り、話し終わると再生が始まる → TRACK 01 のテープへ。
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { Oscilloscope } from "../components/Meters";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { VoiceBars, useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, MONO, PAD_X, W } from "../theme";
import { line, sceneEnter, section } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { Chip, ScriptCard, TrackLane, mixColor, sectionWave, typed } from "./Open/parts";
import { phrases } from "./Open/timing";

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("open-1");
const L2 = line("open-2");
const L3 = line("open-3");
const L4 = line("open-4");
const [p1a, p1b] = phrases("open-1", [0.45]); // この声、 / 録音じゃありません。
const [p2a, p2b] = phrases("open-2", [0.55]); // 台本を渡しただけで、 / AIが演じています。
const [p3a, p3b, p3c] = phrases("open-3", [0.2, 0.6]); // 作ったのは、 / Googleの新しい音声モデル / Gemini 3.8 Flash TTS
const [, p4b] = phrases("open-4", [0.35]); // 何ができるのか、 / 5つのトラックで聴いてみましょう。

const T_IN = sceneEnter("open"); // 最初のシーンなので 0
const T_SIGN = p1a.start - 0.05;
const T_STRIKE = p1b.start - 0.04;
const T_SLAM = p1b.start + 0.03;
const T_A = L2.start - 0.06;
const T_WIRE_AB = mix(p2a.start, p2a.end, 0.62);
const T_B = p2b.start - 0.06;
const T_WIRE_BC = p2b.start + 0.26;
const T_C = p2b.start + 0.5;
const T_COLLAPSE = L3.start - 0.12;
const T_MORPH = p3c.start - 0.2;
const T_REVEAL = p3c.start + 0.02;
const T_HEADER = L3.end;
const LIT_STEP = Math.min(0.2, (p4b.dur * 0.5) / 5);
const T_LIT = (i: number) => p4b.start + 0.04 + i * LIT_STEP;
const T_PLAYHEAD = mix(p4b.start, p4b.end, 0.6);
const T_PLAY = L4.end + 0.05;

/* ---------------- レイアウト ---------------- */
const CX = W / 2;
const NODE_Y = 470;
const GAP = 280;
const B_SIZE = 200;
const B_PIN = 14;
const CHIP_END = 1.08 * 1.05; // 収束と充電を終えたときのチップの拡大率
const A = { w: 260, h: 310 };
const Cn = { w: 280, h: 230 };
const A_CX = CX - B_SIZE / 2 - B_PIN - GAP - A.w / 2;
const C_CX = CX + B_SIZE / 2 + B_PIN + GAP + Cn.w / 2;
const LABEL_Y = 668;

const SIGN_Y = 292;
const HEAD_Y = 452;
const SCOPE_W = W - PAD_X * 2;

const NAME_FS = 124;
const NAME_W = (1289 * NAME_FS) / 100; // Dela Gothic One で実測した幅
const NAME_Y = 470;
const HEADER_FS = 46;
const HEADER_Y = 204;

const HEADER_W = 440;
const BODY_X = PAD_X + HEADER_W + 16;
const BODY_W = W - PAD_X - BODY_X;
const RULER_Y = 262;
const LANE_Y0 = 304;
const LANE_H = 90;
const LANE_GAP = 12;
const LANES_BOTTOM = LANE_Y0 + 5 * LANE_H + 4 * LANE_GAP;
const TRACKS = ["t1", "t2", "t3", "t4", "t5"].map((id) => section(id));
const T0 = TRACKS[0].start;
const T1 = TRACKS[4].lastEnd;
const CLIP_PAD = 12;
const timeToX = (s: number) => BODY_X + CLIP_PAD + ((s - T0) / (T1 - T0)) * (BODY_W - CLIP_PAD * 2);
const CLIPS = TRACKS.map((s) => {
  const x = timeToX(s.start);
  const w = timeToX(s.lastEnd) - x;
  return { x, w, wave: sectionWave(s.id, Math.max(8, Math.floor(w / 7))) };
});
const TICK_SEC = 5;
const TICKS = Array.from({ length: Math.floor((T1 - T0) / TICK_SEC) + 1 }, (_, i) => i * TICK_SEC);
const PH_X0 = timeToX(T0);

type Rect = { x: number; y: number; w: number; h: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

const mono = (size: number, color: string = C.sub, weight = 700): React.CSSProperties => ({
  fontFamily: MONO,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: "0.16em",
  color,
  whiteSpace: "nowrap",
});

/* ================================================================== */
export const Open: React.FC = () => {
  const t = useTime();
  const lv = useVoiceLevel();

  /* ---- 0. 暗転と線の点灯 ---- */
  const dark = 1 - prog(t, L1.start - 0.35, L1.start + 0.9, ease.inOut);
  const lineOn = prog(t, T_IN + 0.08, T_IN + 0.75, ease.outQuint);

  /* ---- 1. 録音ランプ / 打ち消し / 見出し ---- */
  const signIn = prog(t, T_SIGN - 0.08, T_SIGN + 0.22, ease.outQuint);
  const lampOn = prog(t, T_SIGN, T_SIGN + 0.12, ease.out);
  const lampOff = prog(t, T_STRIKE + 0.06, T_STRIKE + 0.22, ease.out);
  const lamp = lampOn * (1 - lampOff);
  const strike = prog(t, T_STRIKE, T_STRIKE + 0.2, ease.outQuint);
  const slam = springAt(t, T_SLAM, { damping: 11, stiffness: 260, mass: 0.7 });
  const slamIn = prog(t, T_SLAM, T_SLAM + 0.06, ease.linear);
  const impact = t >= T_SLAM ? 1 - prog(t, T_SLAM + 0.02, T_SLAM + 0.7, ease.out) : 0;
  const b1Out = prog(t, L1.end + 0.02, L1.end + 0.3, ease.inOut);

  /* ---- 2. パイプライン ---- */
  const aIn = springAt(t, T_A, { damping: 15, stiffness: 170 });
  const typeP = prog(t, p2a.start + 0.05, p2a.end, ease.linear);
  const wAB = prog(t, T_WIRE_AB, T_WIRE_AB + 0.32, ease.outQuint);
  const bIn = springAt(t, T_B, { damping: 13, stiffness: 190 });
  const bGlow = prog(t, T_B + 0.05, T_B + 0.35);
  const wBC = prog(t, T_WIRE_BC, T_WIRE_BC + 0.3, ease.outQuint);
  const cOn = prog(t, T_C, T_C + 0.25);
  const toC = prog(t, L1.end, L2.start + 0.25, ease.inOut);
  const cPanelIn = prog(t, L2.start - 0.1, L2.start + 0.35, ease.out);
  const col = prog(t, T_COLLAPSE, p3a.end + 0.1, ease.inOut);
  const labelsOut = prog(t, T_COLLAPSE, T_COLLAPSE + 0.25, ease.out);

  // 収束: 台本と出力はチップの中心へ
  const aCx = mix(A_CX, CX, col);
  const cCx = mix(C_CX, CX, col);
  const sideScale = mix(1, 0.12, col);
  const sideAlpha = 1 - prog(col, 0.45, 1);

  /* ---- 3. 製品名 ---- */
  const labelType = prog(t, p3b.start, p3b.start + 0.75, ease.linear);
  const labelIn = prog(t, p3b.start - 0.1, p3b.start + 0.2, ease.out);
  const charge = prog(t, p3b.start + 0.15, p3b.end - 0.1, ease.inOut);
  const toCoral = prog(t, p3b.end - 0.45, p3b.end - 0.05, ease.inOut);
  const morph = prog(t, T_MORPH, T_REVEAL, ease.in);
  const reveal = prog(t, T_REVEAL, T_REVEAL + 0.75, ease.outQuint);
  const edgeOut = prog(t, T_REVEAL + 0.62, T_REVEAL + 0.95, ease.out);
  const underline = prog(t, p3c.start + 0.45, p3c.start + 1.0, ease.outQuint);
  const subIn = prog(t, p3c.start + 0.7, p3c.start + 1.05, ease.out);
  const labelUp = prog(t, T_REVEAL + 0.1, T_REVEAL + 0.6, ease.inOut);
  const extrasOut = prog(t, T_HEADER, T_HEADER + 0.25, ease.out);

  /* ---- 4. トラック一覧 ---- */
  const hm = prog(t, T_HEADER, L4.start + 0.18, ease.inOut);
  const five = springAt(t, p4b.start - 0.02, { damping: 12, stiffness: 200 });
  const rulerIn = prog(t, L4.start, L4.start + 0.5, ease.outQuint);
  const phDrop = prog(t, T_PLAYHEAD, T_PLAYHEAD + 0.35, ease.outQuint);
  const playing = prog(t, T_PLAY, T_PLAY + 0.2, ease.out);
  const phX = PH_X0 + Math.max(0, t - T_PLAY) * 60 * prog(t, T_PLAY, T_PLAY + 0.4, ease.in);

  /* ---- オシロスコープの位置（中央 → 下へ押し出し → 出力パネル → チップへ） ---- */
  const R0: Rect = { x: PAD_X, y: 540, w: SCOPE_W, h: 230 };
  const R1: Rect = { ...R0, y: 690 };
  const cTop = NODE_Y - Cn.h / 2;
  const R2: Rect = { x: C_CX - 120, y: cTop + 56 + (Cn.h - 56) / 2, w: 240, h: 120 };
  let sr = lerpRect(R0, R1, prog(t, T_SLAM, T_SLAM + 0.45, ease.outQuint));
  sr = lerpRect(sr, R2, toC);
  // 収束で出力パネルと一緒にチップへ
  sr = { x: mix(sr.x + sr.w / 2, CX, col) - (sr.w * sideScale) / 2, y: mix(sr.y, NODE_Y, col), w: sr.w * sideScale, h: sr.h * sideScale };
  const scopeAlpha = (t < L3.start ? 1 : sideAlpha) * mix(1, 0.4 + 0.6 * cOn, toC);

  const db = lv && lv.rms > 0.004 ? 20 * Math.log10(lv.rms) : null;

  const pinsB = prog(t, T_B + 0.05, T_B + 0.45, ease.out) * 20;
  const chipAccent = mixColor(C.mint, C.coral, toCoral);
  const chipScale = bIn * mix(1, 1.08, col) * (1 + 0.05 * charge) * (1 - 0.15 * morph);
  const chipAlpha = 1 - morph;

  const wireY = NODE_Y;
  const aRight = aCx + (A.w / 2) * sideScale;
  const bLeft = CX - (B_SIZE / 2 + B_PIN) * chipScale;
  const bRight = CX + (B_SIZE / 2 + B_PIN) * chipScale;
  const cLeft = cCx - (Cn.w / 2) * sideScale;
  const wireAlpha = 1 - prog(col, 0.3, 0.8);

  const nameVisible = t >= T_REVEAL;
  const half = NAME_W / 2 + 22;
  const edgeX = half * reveal;

  const nameLeft = CX - NAME_W / 2;
  const nameScale = mix(1, HEADER_FS / NAME_FS, hm);
  const nameDx = (PAD_X - nameLeft) * hm;
  const nameDy = (HEADER_Y - NAME_Y) * hm;

  return (
    <SceneShell id="open">
      {/* 暗転 */}
      <AbsoluteFill style={{ background: "#050608", opacity: 0.86 * dark }} />

      {/* 冒頭の中心の点 */}
      {lineOn < 1 && (
        <div
          style={{
            position: "absolute",
            left: CX - 5,
            top: 540 - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            background: C.mint,
            boxShadow: `0 0 18px ${C.mint}`,
            opacity: prog(t, T_IN, T_IN + 0.1) * (1 - lineOn),
          }}
        />
      )}
      {/* 線の両端のラベル */}
      {toC < 1 && (
        <>
          <div style={{ position: "absolute", left: sr.x, top: sr.y - 44, ...mono(16), opacity: lineOn * (1 - prog(toC, 0, 0.3)) }}>
            <span style={{ color: C.mint }}>●</span> CH-1 MONITOR
          </div>
          <div
            style={{
              position: "absolute",
              left: sr.x + sr.w - 200,
              width: 200,
              textAlign: "right",
              top: sr.y - 44,
              ...mono(16, db !== null ? C.text : C.sub),
              opacity: lineOn * (1 - prog(toC, 0, 0.3)),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {db !== null ? `${db.toFixed(1)} dB` : "-∞ dB"}
          </div>
        </>
      )}

      {/* ================= 1: 録音ランプ ================= */}
      {t < L2.start + 0.2 && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: W,
              top: SIGN_Y - 52,
              display: "flex",
              justifyContent: "center",
              opacity: signIn * (1 - b1Out),
              transform: `translateY(${(1 - signIn) * 16 - b1Out * 50}px)`,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 24,
                height: 104,
                padding: "0 42px",
                borderRadius: 16,
                boxSizing: "border-box",
                border: `2px solid ${mixColor(C.borderHi, C.coral, lamp)}`,
                background: `linear-gradient(180deg, rgba(255,106,61,${0.06 + 0.12 * lamp}) 0%, rgba(255,106,61,${0.02 + 0.06 * lamp}) 100%), ${C.panel}`,
                boxShadow: `0 0 ${60 * lamp}px rgba(255,106,61,${0.35 * lamp}), inset 0 0 ${34 * lamp}px rgba(255,106,61,${0.2 * lamp})`,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: mixColor("#3A2522", C.red, lamp),
                  boxShadow: lamp > 0.05 ? `0 0 ${20 * lamp}px ${C.red}` : undefined,
                }}
              />
              <div
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 54,
                  letterSpacing: "0.2em",
                  marginRight: "-0.2em",
                  color: mixColor(C.dim, C.coral, lamp),
                  textShadow: lamp > 0.05 ? `0 0 ${26 * lamp}px rgba(255,106,61,${0.75 * lamp})` : "none",
                }}
              >
                RECORDING
              </div>
              {/* 打ち消し線（中心で傾け、左から引く） */}
              <div
                style={{
                  position: "absolute",
                  left: -30,
                  right: -30,
                  top: "50%",
                  height: 12,
                  marginTop: -6,
                  transform: "rotate(-4deg)",
                  opacity: strike > 0 ? 1 : 0,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 6,
                    background: C.coral,
                    boxShadow: `0 0 18px ${C.coral}`,
                    transform: `scaleX(${strike})`,
                    transformOrigin: "left center",
                  }}
                />
              </div>
            </div>
          </div>

          {/* 見出し「録音じゃない。」 */}
          {t >= T_SLAM && (
            <div
              style={{
                position: "absolute",
                left: 0,
                width: W,
                top: HEAD_Y - 70,
                height: 140,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                opacity: slamIn * (1 - b1Out),
                transform: `translateY(${-b1Out * 50}px)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 900,
                  height: 260,
                  background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,106,61,${0.28 * impact}) 0%, rgba(255,106,61,0) 70%)`,
                }}
              />
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 120,
                  lineHeight: 1,
                  color: C.text,
                  whiteSpace: "nowrap",
                  transform: `scale(${mix(1.75, 1, slam)})`,
                  textShadow: "0 6px 30px rgba(0,0,0,0.5)",
                }}
              >
                録音<span style={{ color: C.coral }}>じゃない。</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= 2: パイプライン ================= */}
      {t >= T_A - 0.05 && t < p3a.end + 0.3 && (
        <>
          {/* 信号線 */}
          <svg width={W} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: wireAlpha }}>
            {[
              { x1: aRight, x2: bLeft, p: wAB, t0: T_WIRE_AB },
              { x1: bRight, x2: cLeft, p: wBC, t0: T_WIRE_BC },
            ].map((w, i) => {
              if (w.p <= 0) return null;
              const x2 = mix(w.x1, w.x2 - 4, w.p);
              const pulse = Math.max(0, t - w.t0 - 0.15);
              return (
                <g key={i}>
                  <line x1={w.x1} x2={x2} y1={wireY} y2={wireY} stroke={C.borderHi} strokeWidth={2.5} strokeLinecap="round" />
                  <line
                    x1={w.x1}
                    x2={x2}
                    y1={wireY}
                    y2={wireY}
                    stroke={C.mint}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray="16 44"
                    strokeDashoffset={-pulse * 240}
                    opacity={prog(t, w.t0 + 0.1, w.t0 + 0.35)}
                    style={{ filter: `drop-shadow(0 0 6px ${C.mint})` }}
                  />
                  {w.p > 0.9 && (
                    <path
                      d={`M${x2 - 10} ${wireY - 9} L${x2 + 2} ${wireY} L${x2 - 10} ${wireY + 9}`}
                      fill="none"
                      stroke={C.mint}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={prog(w.p, 0.9, 1)}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* 台本カード */}
          <div
            style={{
              position: "absolute",
              left: aCx - A.w / 2,
              top: NODE_Y - A.h / 2,
              width: A.w,
              height: A.h,
              opacity: clamp01(aIn * 1.4) * sideAlpha,
              transform: `scale(${mix(0.86, 1, aIn) * sideScale}) rotate(${mix(-4, 0, aIn)}deg)`,
              filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))",
            }}
          >
            <ScriptCard w={A.w} h={A.h} type={typeP} lit={1 - col} />
          </div>

          {/* 出力パネル（オシロスコープはこの上に重なる） */}
          <div
            style={{
              position: "absolute",
              left: cCx - Cn.w / 2,
              top: NODE_Y - Cn.h / 2,
              width: Cn.w,
              height: Cn.h,
              opacity: cPanelIn * sideAlpha,
              transform: `scale(${mix(0.94, 1, cPanelIn) * sideScale})`,
            }}
          >
            <Panel
              w={Cn.w}
              h={Cn.h}
              accent={C.mint}
              glow={cOn * (1 - col)}
              header="VOICE OUT"
              status={
                cOn > 0 ? (
                  <span style={{ opacity: cOn }}>● LIVE</span>
                ) : (
                  <span style={{ color: C.dim }}>IDLE</span>
                )
              }
            />
          </div>

          {/* ノードの名前 */}
          {[
            { cx: A_CX, en: "INPUT", ja: "台本", at: T_A },
            { cx: CX, en: "ENGINE", ja: "演じる", at: T_B },
            { cx: C_CX, en: "OUTPUT", ja: "声", at: T_C - 0.1 },
          ].map((n) => {
            const p = prog(t, n.at + 0.05, n.at + 0.4, ease.outQuint);
            return (
              <div
                key={n.en}
                style={{
                  position: "absolute",
                  left: n.cx - 200,
                  width: 400,
                  top: LABEL_Y,
                  textAlign: "center",
                  opacity: p * (1 - labelsOut),
                  transform: `translateY(${(1 - p) * 14 + labelsOut * 10}px)`,
                }}
              >
                <div style={{ ...mono(16), letterSpacing: "0.2em" }}>{n.en}</div>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 44, lineHeight: "60px", color: C.text, marginTop: 6 }}>{n.ja}</div>
              </div>
            );
          })}
        </>
      )}

      {/* ================= 0-2: オシロスコープ（出力パネルの上に重ねる） ================= */}
      {t < p3a.end + 0.2 && (
        <div
          style={{
            position: "absolute",
            left: sr.x,
            top: sr.y - sr.h / 2,
            width: sr.w,
            height: sr.h,
            opacity: scopeAlpha,
            clipPath: lineOn < 1 ? `inset(0 ${(1 - lineOn) * 50}% 0 ${(1 - lineOn) * 50}%)` : undefined,
          }}
        >
          {/* 基準線と目盛り（冒頭だけ） */}
          <div style={{ position: "absolute", left: 0, right: 0, top: sr.h / 2, height: 1, background: C.border, opacity: 1 - toC }} />
          <Oscilloscope width={sr.w} height={sr.h} color={C.mint} gain={1.05} thickness={mix(3, 2.5, toC)} lines={["open-1", "open-2", "open-3"]} />
        </div>
      )}
      {/* ================= 2-3: AI チップ ================= */}
      {t >= T_B - 0.05 && morph < 1 && (
        <div
          style={{
            position: "absolute",
            left: CX - B_SIZE / 2,
            top: NODE_Y - B_SIZE / 2,
            opacity: clamp01(bIn * 1.5) * chipAlpha,
            transform: `scale(${chipScale})`,
          }}
        >
          <Chip size={B_SIZE} pins={pinsB} accent={chipAccent} glow={bGlow} charge={charge * 20} chargeColor={C.coral} />
        </div>
      )}

      {/* チップ → 縦一本の線 → 左右に開く */}
      {t >= T_MORPH && edgeOut < 1 && (
        <>
          {reveal <= 0 ? (
            <div
              style={{
                position: "absolute",
                left: CX - mix(B_SIZE * CHIP_END, 6, morph) / 2,
                top: NAME_Y - mix(B_SIZE * CHIP_END, 150, morph) / 2,
                width: mix(B_SIZE * CHIP_END, 6, morph),
                height: mix(B_SIZE * CHIP_END, 150, morph),
                borderRadius: mix(22, 3, morph),
                border: `2px solid ${C.coral}`,
                background: `rgba(255,106,61,${morph})`,
                boxSizing: "border-box",
                boxShadow: `0 0 ${24 * morph}px ${C.coral}`,
                opacity: prog(morph, 0, 0.3),
              }}
            />
          ) : (
            [-1, 1].map((d) => (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: CX + d * edgeX - 3,
                  top: NAME_Y - 75,
                  width: 6,
                  height: 150,
                  borderRadius: 3,
                  background: C.coral,
                  boxShadow: `0 0 24px ${C.coral}`,
                  opacity: 1 - edgeOut,
                }}
              />
            ))
          )}
        </>
      )}

      {/* ================= 3: 製品名 ================= */}
      {t >= p3b.start - 0.1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: mix(NODE_Y - B_SIZE / 2 - B_PIN - 42, NAME_Y - 108, labelUp) - 14,
            textAlign: "center",
            opacity: labelIn * (1 - extrasOut),
            ...mono(22),
            letterSpacing: "0.22em",
          }}
        >
          <span style={{ color: C.text }}>{typed("GOOGLE", labelType * 3.5)}</span>
          {typed("  ·  NEW SPEECH MODEL", (labelType * 3.5 - 1) / 2.5)}
          {labelType < 1 && <span style={{ color: C.coral }}>▌</span>}
        </div>
      )}

      {nameVisible && (
        <AbsoluteFill style={{ clipPath: reveal < 1 ? `inset(0 ${CX - edgeX}px 0 ${CX - edgeX}px)` : undefined }}>
          <div
            style={{
              position: "absolute",
              left: nameLeft,
              top: NAME_Y - NAME_FS / 2,
              height: NAME_FS,
              width: NAME_W + 40,
              fontFamily: DISPLAY,
              fontSize: NAME_FS,
              lineHeight: `${NAME_FS}px`,
              color: C.text,
              whiteSpace: "nowrap",
              transformOrigin: "0% 50%",
              transform: `translate(${nameDx}px, ${nameDy}px) scale(${nameScale})`,
            }}
          >
            Gemini{" "}
            <span style={{ color: C.coral, textShadow: `0 0 ${30 * (1 - hm)}px rgba(255,106,61,0.45)` }}>3.8</span> Flash TTS
          </div>
        </AbsoluteFill>
      )}

      {/* 製品名の下: 声で揺れるライン + 補足 */}
      {t >= p3c.start + 0.4 && extrasOut < 1 && (
        <>
          <div
            style={{
              position: "absolute",
              left: CX - NAME_W / 2,
              top: 586 - 40,
              width: NAME_W,
              height: 80,
              opacity: 1 - extrasOut,
              clipPath: `inset(0 ${(1 - underline) * 50}% 0 ${(1 - underline) * 50}%)`,
            }}
          >
            <Oscilloscope width={NAME_W} height={80} color={C.mint} gain={1.7} thickness={2.5} lines={["open-3"]} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: W,
              top: 648,
              textAlign: "center",
              ...mono(20, C.sub, 500),
              letterSpacing: "0.24em",
              opacity: subIn * (1 - extrasOut),
              transform: `translateY(${(1 - subIn) * 10}px)`,
            }}
          >
            TEXT-TO-SPEECH MODEL <span style={{ color: C.coral }}>·</span> 2026.09.23
          </div>
        </>
      )}

      {/* ================= 4: トラック一覧 ================= */}
      {t >= L4.start - 0.15 && (
        <>
          {/* 右上: 5 TRACKS */}
          <div
            style={{
              position: "absolute",
              right: PAD_X,
              top: HEADER_Y - 40,
              height: 80,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: clamp01(five * 2),
              transform: `scale(${mix(0.6, 1, five)})`,
              transformOrigin: "100% 50%",
            }}
          >
            <div style={{ fontFamily: DISPLAY, fontSize: 64, lineHeight: 1, color: C.coral }}>5</div>
            <div style={{ ...mono(20, C.text), lineHeight: "24px" }}>
              TRACKS
              <div style={{ ...mono(14, C.sub, 500) }}>IN THIS SESSION</div>
            </div>
          </div>
          {/* セッション名の上の小ラベル */}
          <div
            style={{
              position: "absolute",
              left: PAD_X,
              top: HEADER_Y - 56,
              display: "flex",
              alignItems: "center",
              gap: 14,
              ...mono(15),
              opacity: prog(hm, 0.6, 1),
            }}
          >
            SESSION
            <VoiceBars n={9} width={58} height={16} barWidth={3} color={C.mint} lines={["open-4"]} shape="flat" gain={1.2} />
          </div>

          {/* ルーラー */}
          <div style={{ position: "absolute", left: BODY_X, top: RULER_Y, width: BODY_W, height: 30, opacity: rulerIn }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.5, background: C.border }} />
            {TICKS.map((s, i) => {
              const x = timeToX(T0 + s) - BODY_X;
              const major = s % 20 === 0;
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: "absolute",
                      left: x,
                      bottom: 0,
                      width: 1.5,
                      height: major ? 12 : 6,
                      background: major ? C.borderHi : C.border,
                      transform: `scaleY(${rulerIn})`,
                      transformOrigin: "bottom",
                    }}
                  />
                  {major && s > 0 && (
                    <div style={{ position: "absolute", left: x + 6, top: 0, ...mono(13, C.dim, 500), letterSpacing: "0.08em" }}>
                      {`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* レーン */}
          {TRACKS.map((s, i) => {
            const inP = prog(t, L4.start + i * 0.07, L4.start + 0.55 + i * 0.07, ease.outQuint);
            const lit = prog(t, T_LIT(i), T_LIT(i) + 0.22, ease.out);
            const flash = lit * (1 - prog(t, T_LIT(i) + 0.08, T_LIT(i) + 0.7, ease.out));
            return (
              <TrackLane
                key={s.id}
                x={PAD_X}
                y={LANE_Y0 + i * (LANE_H + LANE_GAP)}
                headerW={HEADER_W}
                bodyX={BODY_X}
                bodyW={BODY_W}
                h={LANE_H}
                label={s.label}
                title={s.title}
                lit={lit}
                flash={flash}
                playing={i === 0 ? playing : 0}
                clipX={CLIPS[i].x}
                clipW={CLIPS[i].w}
                wave={CLIPS[i].wave}
                ticks={TICKS.filter((x) => x % 20 === 0).map((x) => timeToX(T0 + x))}
                style={{ opacity: inP, transform: `translateX(${(1 - inP) * 120}px)` }}
              />
            );
          })}

          {/* 再生ヘッド */}
          {phDrop > 0 && (
            <div style={{ position: "absolute", left: phX, top: RULER_Y - 6 }}>
              <div
                style={{
                  position: "absolute",
                  left: -1.5,
                  top: 10,
                  width: 3,
                  height: (LANES_BOTTOM + 8 - RULER_Y) * phDrop,
                  background: C.coral,
                  boxShadow: `0 0 12px ${C.coral}`,
                }}
              />
              <svg width={22} height={18} style={{ position: "absolute", left: -11, top: 0, opacity: clamp01(phDrop * 3) }}>
                <path d="M2 1.5 H20 V8 L11 16.5 L2 8 Z" fill={C.coral} />
              </svg>
              {/* マーカーの旗 */}
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 0,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 9px 0 8px",
                  borderRadius: "0 4px 4px 0",
                  background: C.coral,
                  ...mono(13, C.ink),
                  letterSpacing: "0.14em",
                  opacity: prog(phDrop, 0.4, 1),
                  transform: `translateX(${(1 - prog(phDrop, 0.4, 1)) * -8}px)`,
                }}
              >
                {playing > 0.5 && (
                  <svg width={9} height={10} viewBox="0 0 9 10">
                    <path d="M0 0 L9 5 L0 10 Z" fill={C.ink} />
                  </svg>
                )}
                {playing > 0.5 ? "PLAY" : "READY"}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= 効果音 ================= */}
      <Sfx at={T_IN + 0.1} name="tick" volume={0.14} />
      <Sfx at={T_SIGN} name="click" volume={0.2} />
      <Sfx at={T_SLAM} name="pop" volume={0.28} />
      <Sfx at={T_A} name="tick" volume={0.14} />
      <Sfx at={T_B} name="pop" volume={0.18} />
      <Sfx at={T_C} name="tick" volume={0.14} />
      <Sfx at={T_REVEAL - 0.75} name="swell" volume={0.18} />
      <Sfx at={T_REVEAL} name="chime" volume={0.2} />
      {TRACKS.map((s, i) => (
        <Sfx key={s.id} at={T_LIT(i)} name="tick" volume={0.1} />
      ))}
      <Sfx at={T_PLAYHEAD} name="click" volume={0.2} />
    </SceneShell>
  );
};
