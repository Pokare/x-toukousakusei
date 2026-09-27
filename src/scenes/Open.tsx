/*
 * COLD OPEN — 絵コンテ（すべての時刻は台本の行・フレーズ基準。秒の直書きなし）
 *
 * 0. 1フレーム目から完成した絵（暗転なし・サムネイルになる）
 *    右: 深夜のボーカルブース。吸音材の壁、点灯した「ON AIR」、ポップガード付きのマイク、
 *        スポットライトの当たった空のスツール。マイクの入力メーターは「MIC 1  -∞ dB」。
 *    左: 「マイクの前には、」＋ 見出し「誰もいない。」（DISPLAY 184px）
 *        ＋「● VOICE BY  Gemini 3.8 Flash TTS」＋ 声で動く PGM OUT の波形。
 * 1. open-1「この声、録音じゃありません。」
 *    「この声、」… ON AIR が全灯になり、PGM OUT の線が実際の声で揺れ始める。全体がゆっくり寄る。
 *    「録音じゃありません」… マイクの入力の横に「NO INPUT」が点く（声は出ているのに、マイクには何も入っていない）。
 *    行の終わりで左は上へ、ブースは右へ抜け、そのまま次の図に重なって切り替わる（暗転しない）。
 * 2. open-2「台本を渡しただけで、AIが演じています。」
 *    左から: 台本カード（行が書き込まれる）→ 信号線（ミントのパルス）→ AI チップ（ピンが点灯）
 *    →「演じています」で出力パネルが LIVE に。IDLE の間は平らな暗い線、LIVE からはっきり動く合成波形。
 * 3. open-3「作ったのは、Googleの新しい音声モデル「Gemini 3.8 Flash TTS」。」
 *    「作ったのは」… 台本と出力がチップに吸い込まれ、チップが 1.7 倍に。ピンは声に合わせて脈打つ。
 *    「Googleの新しい音声モデル」… 上に「GOOGLE · NEW SPEECH MODEL」（28px）が打ち込まれ、
 *    その途中でコーラルのマスキングテープがチップの上に左から貼られ、製品名が書かれたラベルになる。
 *    「Gemini 3.8 Flash TTS」… テープがぎゅっと押さえられて光がなで、下にセッション情報（種類・公開日）。
 * 4. open-4「何ができるのか、5つのトラックで聴いてみましょう。」
 *    テープのラベルが左上のセッション名へ縮み、DAW のトラック一覧（5 レーン）が右から滑り込む。
 *    クリップは実際の各トラックの音声波形・実際の長さで階段状に並ぶ。
 *    「5つのトラック」で右上に「5 TRACKS」、レーンが上から順に点灯（SESSION の横の小さな波形は声に反応）。
 *    「聴いてみましょう」でコーラルの再生ヘッドが先頭に降り、そのまま TRACK 01 の上を走り出す
 *    （TRACK 01 が点灯し、再生済みの部分が塗られる）→ TRACK 01 のテープへ。
 */
import React from "react";
import { Oscilloscope } from "../components/Meters";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { VoiceBars, useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, MONO, PAD_X, W } from "../theme";
import { line, sceneEnter, section } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { BOOTH_W, Booth } from "./Open/booth";
import { Chip, ScriptCard, SynthWave, TapeLabel, TrackLane, sectionWave, typed } from "./Open/parts";
import { phrases } from "./Open/timing";

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("open-1");
const L2 = line("open-2");
const L3 = line("open-3");
const L4 = line("open-4");
const [, p1b] = phrases("open-1", [0.45]); // この声、 / 録音じゃありません。
const [p2a, p2b] = phrases("open-2", [0.55]); // 台本を渡しただけで、 / AIが演じています。
const [p3a, p3b, p3c] = phrases("open-3", [0.2, 0.6]); // 作ったのは、 / Googleの新しい音声モデル / Gemini 3.8 Flash TTS
const [, p4b] = phrases("open-4", [0.35]); // 何ができるのか、 / 5つのトラックで聴いてみましょう。

const T_IN = sceneEnter("open"); // 最初のシーンなので 0
const T_AIR = L1.start - 0.1;
const T_NOINPUT = p1b.start;
const T_OUT1 = L1.end - 0.08;
const T_A = mix(L1.end, L2.start, 0.35);
const T_WIRE_AB = mix(p2a.start, p2a.end, 0.62);
const T_B = p2b.start - 0.06;
const T_WIRE_BC = p2b.start + 0.26;
const T_C = p2b.start + 0.5;
const T_COLLAPSE = L3.start - 0.12;
const T_LABEL = p3b.start;
const T_TAPE = mix(p3b.start, p3b.end, 0.2);
const TAPE_DUR = 0.6;
const T_NAME = p3c.start; // 製品名が読み上げられる瞬間
const T_HEADER = L3.end;
const LIT_STEP = Math.min(0.2, (p4b.dur * 0.5) / 5);
const T_LIT = (i: number) => p4b.start + 0.04 + i * LIT_STEP;
const T_PLAYHEAD = mix(p4b.start, p4b.end, 0.55);
const T_PLAY = T_PLAYHEAD + 0.25;

/* ---------------- レイアウト ---------------- */
const CX = W / 2;

// 1: 冒頭
const HEAD_FS = 206; // 「誰もいない。」が約 1090px 幅になる
const COL_W = 1104; // 左の列（見出し・波形）の幅。ブースの手前で止める
const LEAD_Y = 244;
const HEAD_Y = 314;
const TAG_Y = 574;
const SCOPE_Y = 772;
const SCOPE_H = 140;
const BOOTH_X = W - PAD_X - BOOTH_W;
const BOOTH_Y = 150;

// 2: パイプライン
const NODE_Y = 470;
const GAP = 280;
const B_SIZE = 200;
const B_PIN = 14;
const CHIP_BIG = 1.7;
const A = { w: 260, h: 310 };
const Cn = { w: 280, h: 230 };
const A_CX = CX - B_SIZE / 2 - B_PIN - GAP - A.w / 2;
const C_CX = CX + B_SIZE / 2 + B_PIN + GAP + Cn.w / 2;
const LABEL_Y = 668;

// 3: テープのラベル
const NAME_FS = 112;
const NAME_W = (1289 * NAME_FS) / 100; // Dela Gothic One で実測した幅
const TAPE_W = Math.round(NAME_W + 150);
const TAPE_H = 184;
const TAPE_Y = 462;
const TAPE_ROT = -1.5;

// 4: トラック一覧
const HEADER_Y = 206;
const HEADER_SCALE = 0.36;
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
const PLAY_SPEED = 320; // 再生ヘッドの見かけの速さ（px/秒）

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
  const level = lv ? clamp01(lv.rms * 2.5) : 0;

  /* ---- 1. 無人のブース ---- */
  const push = prog(t, T_IN, L1.end, ease.out);
  const onAir = mix(0.72, 1, prog(t, T_AIR, T_AIR + 0.18, ease.out));
  const noInput = prog(t, T_NOINPUT, T_NOINPUT + 0.2, ease.outQuint);
  const out1 = prog(t, T_OUT1, T_OUT1 + 0.38, ease.inOut);
  const db = lv && lv.rms > 0.004 ? 20 * Math.log10(lv.rms) : null;

  /* ---- 2. パイプライン ---- */
  const aIn = springAt(t, T_A, { damping: 15, stiffness: 170 });
  const typeP = prog(t, p2a.start + 0.05, p2a.end, ease.linear);
  const wAB = prog(t, T_WIRE_AB, T_WIRE_AB + 0.32, ease.outQuint);
  const bIn = springAt(t, T_B, { damping: 13, stiffness: 190 });
  const bGlow = prog(t, T_B + 0.05, T_B + 0.35);
  const wBC = prog(t, T_WIRE_BC, T_WIRE_BC + 0.3, ease.outQuint);
  const live = prog(t, T_C, T_C + 0.25);
  const cPanelIn = prog(t, T_A + 0.1, T_A + 0.5, ease.out);
  const col = prog(t, T_COLLAPSE, p3a.end + 0.1, ease.inOut);
  const labelsOut = prog(t, T_COLLAPSE, T_COLLAPSE + 0.25, ease.out);

  // 収束: 台本と出力はチップの中心へ
  const aCx = mix(A_CX, CX, col);
  const cCx = mix(C_CX, CX, col);
  const sideScale = mix(1, 0.12, col);
  const sideAlpha = 1 - prog(col, 0.45, 1);

  /* ---- 3. テープのラベル ---- */
  const labelType = prog(t, T_LABEL, T_LABEL + 0.7, ease.linear);
  const labelIn = prog(t, T_LABEL - 0.1, T_LABEL + 0.2, ease.out);
  const unroll = prog(t, T_TAPE, T_TAPE + TAPE_DUR, ease.inOut);
  const covered = prog(t, T_TAPE + 0.1, T_TAPE + TAPE_DUR * 0.8, ease.inOut);
  const settle = springAt(t, T_TAPE + TAPE_DUR - 0.05, { damping: 12, stiffness: 220 });
  const press = Math.sin(Math.PI * prog(t, T_NAME, T_NAME + 0.32, ease.linear));
  const sheen = t >= T_NAME ? prog(t, T_NAME, T_NAME + 0.7, ease.inOut) : -1;
  const metaIn = prog(t, T_NAME + 0.12, T_NAME + 0.5, ease.out);
  const extrasOut = prog(t, T_HEADER, T_HEADER + 0.25, ease.out);

  const chipScale = bIn * mix(1, CHIP_BIG, col) * mix(1, 0.92, covered);
  const chipAlpha = 1 - covered;
  const chipTop = NODE_Y - (B_SIZE / 2 + B_PIN) * mix(1, CHIP_BIG, col);
  const labelY = mix(chipTop - 62, TAPE_Y - TAPE_H / 2 - 66, prog(t, T_TAPE, T_TAPE + 0.5, ease.inOut));

  /* ---- 4. トラック一覧 ---- */
  const hm = prog(t, T_HEADER, L4.start + 0.18, ease.inOut);
  const five = springAt(t, p4b.start - 0.02, { damping: 12, stiffness: 200 });
  const rulerIn = prog(t, L4.start, L4.start + 0.5, ease.outQuint);
  const phDrop = prog(t, T_PLAYHEAD, T_PLAYHEAD + 0.3, ease.outQuint);
  const playing = prog(t, T_PLAY, T_PLAY + 0.15, ease.out);
  const dtPlay = Math.max(0, t - T_PLAY);
  const travel = dtPlay < 0.4 ? (PLAY_SPEED * dtPlay * dtPlay) / 0.8 : PLAY_SPEED * (dtPlay - 0.2);
  const phX = PH_X0 + travel;

  // テープ: 画面中央 → 左上のセッション名
  const tapeScale = mix(1, HEADER_SCALE, hm) * mix(1.04, 1, settle) * (1 + 0.025 * press);
  const tapeDx = (PAD_X + (TAPE_W * HEADER_SCALE) / 2 - CX) * hm;
  const tapeDy = (HEADER_Y - TAPE_Y) * hm;

  const wireY = NODE_Y;
  const aRight = aCx + (A.w / 2) * sideScale;
  const bLeft = CX - (B_SIZE / 2 + B_PIN) * chipScale;
  const bRight = CX + (B_SIZE / 2 + B_PIN) * chipScale;
  const cLeft = cCx - (Cn.w / 2) * sideScale;
  const wireAlpha = 1 - prog(col, 0.3, 0.8);

  return (
    <SceneShell id="open">
      {/* ================= 1: 無人のブース ================= */}
      {out1 < 1 && (
        <>
          <div
            style={{
              position: "absolute",
              left: BOOTH_X,
              top: BOOTH_Y,
              opacity: 1 - out1,
              transform: `translateX(${out1 * 70}px) scale(${mix(1.035, 1, push)})`,
              transformOrigin: "40% 60%",
            }}
          >
            <Booth onAir={onAir} spot={1} noInput={noInput} />
          </div>

          <div
            style={{
              position: "absolute",
              left: PAD_X,
              top: 0,
              width: COL_W,
              height: 1080,
              transform: `scale(${mix(1.025, 1, push)})`,
              transformOrigin: `0px ${HEAD_Y + HEAD_FS / 2}px`,
            }}
          >
            {/* 見出し */}
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
                opacity: 1 - prog(out1, 0, 0.7),
                transform: `translateY(${-out1 * 40}px)`,
              }}
            >
              マイクの前には、
            </div>
            <div
              style={{
                position: "absolute",
                left: -6,
                top: HEAD_Y,
                fontFamily: DISPLAY,
                fontSize: HEAD_FS,
                lineHeight: `${HEAD_FS}px`,
                color: C.text,
                whiteSpace: "nowrap",
                textShadow: "0 8px 40px rgba(0,0,0,0.55)",
                opacity: 1 - prog(out1, 0.1, 0.8),
                transform: `translateY(${-out1 * 44}px)`,
              }}
            >
              誰も<span style={{ color: C.coral }}>いない。</span>
            </div>
            {/* 何の動画か */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: TAG_Y,
                height: 44,
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: 1 - prog(out1, 0.2, 0.9),
                transform: `translateY(${-out1 * 48}px)`,
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 8, background: C.coral, boxShadow: `0 0 14px ${C.coral}` }} />
              <div style={{ ...mono(24, C.sub) }}>VOICE BY</div>
              <div style={{ ...mono(34, C.text), letterSpacing: "0.04em" }}>Gemini 3.8 Flash TTS</div>
            </div>

            {/* PGM OUT: 実際の声 */}
            <div style={{ position: "absolute", left: 0, top: SCOPE_Y - SCOPE_H / 2, width: COL_W, height: SCOPE_H, opacity: 1 - prog(out1, 0.3, 1) }}>
              <div style={{ position: "absolute", left: 0, top: SCOPE_H / 2 - 0.5, width: COL_W, height: 1, background: C.border }} />
              <Oscilloscope width={COL_W} height={SCOPE_H} color={C.mint} gain={1.1} thickness={3} lines={["open-1"]} />
              <div style={{ position: "absolute", left: 0, top: -10, ...mono(18) }}>
                <span style={{ color: C.mint }}>●</span> PGM OUT
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: -10,
                  ...mono(18, db !== null ? C.text : C.dim),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {db !== null ? `${db.toFixed(1)} dB` : "-∞ dB"}
              </div>
            </div>
          </div>
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

          {/* 出力パネル: IDLE は平らな暗い線、LIVE からはっきり動く波形 */}
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
              glow={live * (1 - col)}
              header="VOICE OUT"
              status={live > 0 ? <span style={{ opacity: live }}>● LIVE</span> : <span style={{ color: C.dim }}>IDLE</span>}
            >
              <div style={{ position: "absolute", left: 24, top: 56 + (Cn.h - 56) / 2 - 55, width: Cn.w - 48, height: 110 }}>
                <SynthWave w={Cn.w - 48} h={110} t={t} live={live} level={level} />
              </div>
            </Panel>
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

      {/* ================= 2-3: AI チップ ================= */}
      {t >= T_B - 0.05 && chipAlpha > 0 && (
        <div
          style={{
            position: "absolute",
            left: CX - B_SIZE / 2,
            top: NODE_Y - B_SIZE / 2,
            opacity: clamp01(bIn * 1.5) * chipAlpha,
            transform: `scale(${chipScale})`,
          }}
        >
          <Chip
            size={B_SIZE}
            pins={prog(t, T_B + 0.05, T_B + 0.45, ease.out) * 20}
            accent={C.mint}
            glow={bGlow * (0.7 + 0.3 * (t >= L3.start ? level : 1))}
            pulse={t >= L3.start ? level : 1}
          />
        </div>
      )}

      {/* ================= 3: GOOGLE · NEW SPEECH MODEL ================= */}
      {t >= T_LABEL - 0.1 && extrasOut < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: labelY,
            height: 40,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            opacity: labelIn * (1 - extrasOut),
            ...mono(28),
            letterSpacing: "0.2em",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.coral, boxShadow: `0 0 10px ${C.coral}` }} />
          <div>
            <span style={{ color: C.text }}>{typed("GOOGLE", labelType * 3.5)}</span>
            {typed("  ·  NEW SPEECH MODEL", (labelType * 3.5 - 1) / 2.5)}
            {labelType < 1 && <span style={{ color: C.coral }}>▌</span>}
          </div>
        </div>
      )}

      {/* ================= 3-4: 製品名のテープ（→ セッション名） ================= */}
      {t >= T_TAPE && (
        <div
          style={{
            position: "absolute",
            left: CX - TAPE_W / 2,
            top: TAPE_Y - TAPE_H / 2,
            transform: `translate(${tapeDx}px, ${tapeDy}px) scale(${tapeScale}) rotate(${mix(TAPE_ROT, -1, hm)}deg)`,
          }}
        >
          <TapeLabel w={TAPE_W} h={TAPE_H} unroll={unroll} sheen={sheen}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: NAME_FS,
                lineHeight: `${NAME_FS}px`,
                color: C.ink,
                whiteSpace: "nowrap",
                paddingBottom: 6,
              }}
            >
              Gemini 3.8 Flash TTS
            </div>
          </TapeLabel>
        </div>
      )}

      {/* テープの下: セッション情報 */}
      {metaIn > 0 && extrasOut < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: TAPE_Y + TAPE_H / 2 + 44,
            display: "flex",
            justifyContent: "center",
            gap: 40,
            ...mono(26, C.sub, 500),
            opacity: metaIn * (1 - extrasOut),
            transform: `translateY(${(1 - metaIn) * 12}px)`,
          }}
        >
          <span>
            TYPE <span style={{ color: C.text, fontWeight: 700 }}>TEXT-TO-SPEECH</span>
          </span>
          <span style={{ color: C.dim }}>/</span>
          <span>
            RELEASED <span style={{ color: C.text, fontWeight: 700 }}>2026.09.23</span>
          </span>
        </div>
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
              top: HEADER_Y - 64,
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
                flash={i === 0 ? Math.max(flash, 0.35 * playing) : flash}
                playing={i === 0 ? playing : 0}
                clipX={CLIPS[i].x}
                clipW={CLIPS[i].w}
                wave={CLIPS[i].wave}
                ticks={TICKS.filter((x) => x % 20 === 0).map((x) => timeToX(T0 + x))}
                style={{ opacity: inP, transform: `translateX(${(1 - inP) * 120}px)` }}
              />
            );
          })}

          {/* TRACK 01 の再生済みの部分 */}
          {playing > 0 && (
            <div
              style={{
                position: "absolute",
                left: CLIPS[0].x,
                top: LANE_Y0 + 12,
                width: Math.max(0, Math.min(CLIPS[0].w, phX - CLIPS[0].x)),
                height: LANE_H - 24,
                borderRadius: "8px 0 0 8px",
                background: "rgba(255,106,61,0.38)",
                boxShadow: "inset 0 0 0 1.5px rgba(255,106,61,0.9)",
                opacity: playing,
              }}
            />
          )}

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
      <Sfx at={T_AIR} name="click" volume={0.18} />
      <Sfx at={T_NOINPUT} name="tick" volume={0.16} />
      <Sfx at={T_A} name="tick" volume={0.14} />
      <Sfx at={T_B} name="pop" volume={0.18} />
      <Sfx at={T_C} name="tick" volume={0.14} />
      <Sfx at={T_TAPE} name="whoosh" volume={0.14} />
      <Sfx at={T_TAPE + TAPE_DUR - 0.05} name="pop" volume={0.18} />
      <Sfx at={T_NAME} name="chime" volume={0.2} />
      {TRACKS.map((s, i) => (
        <Sfx key={s.id} at={T_LIT(i)} name="tick" volume={0.1} />
      ))}
      <Sfx at={T_PLAYHEAD} name="click" volume={0.2} />
    </SceneShell>
  );
};
