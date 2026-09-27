/*
 * COLD OPEN — 絵コンテ（時刻はすべて台本の行・フレーズ基準。秒の直書きなし）
 *
 * 0. 1フレーム目から完成した絵（暗転なし・サムネイルになる）
 *    右: 深夜のボーカルブース。吸音材の壁、ON AIR ランプ、ポップガード付きのマイク、
 *        スポットライトの当たった空のスツール。
 *    左: スタジオの壁掛け時計（秒の LED の輪、表示は 23:59）＋「深夜0時。」
 *        見出し「誰もいない。」（DISPLAY 206px）
 *        その下に 2 本の信号: PGM OUT（声で動くミントの線）と MIC 1（平らな暗い線）。
 *
 * 1. open-1「深夜0時。ブースのマイクの前には、誰もいません。」
 *    「深夜0時。」… ON AIR が全灯。「0時」で時計が 23:59 → 00:00 に切り替わり、秒の輪が
 *                   時計回りに消えてリセット（以後 1 秒ごとに 1 灯）。PGM OUT が実際の声で揺れ始める。
 *    「ブースのマイク」… マイクにフォーカス枠がはまる（MIC 1）。ブースへゆっくり寄る。
 *    「誰もいません。」… 枠がマイクの前の空いた場所（スツール）へ移り、コーラルの「EMPTY」に。
 *                     MIC 1 の線の横に「NO INPUT」。声は出ているのに、マイクには何も入っていない。
 *    行の終わりで左は上へ、ブースは右へ抜ける（暗転しない）。
 *
 * 2. open-2「しゃべっているのは、台本を受け取ったAIです。」
 *    「しゃべっているのは、」… 右に VOICE OUT パネル。いま聞こえている声で波形が動く（OUTPUT / 声）。
 *                             台本とエンジンの場所は「?」の点線スロットで空いている（誰が？）。
 *    「台本を受け取っ」… 左のスロットに台本カードが落ちて行が書き込まれ、信号線が中央の空きスロットへ伸びる。
 *    「たAIです。」… 中央に AI チップが弾んで出て、ピンが時計回りに点灯。チップから出力へ線がつながり、
 *                    出力パネルがミントに光る（ENGINE / しゃべり手）。
 *
 * 3. open-3「名前は「Gemini 3.8 Flash TTS」。Googleの新しい音声モデルです。」
 *    「名前は、」… 台本と出力がチップに吸い込まれ、チップが 1.7 倍に。ピンは声に合わせて脈打つ。
 *    「Gemini 3.8 Flash TTS」… コーラルのマスキングテープが、名前を読み上げる速さで左からチップの上に
 *                             貼られていく（読まれた語から見えてくる）。製品名は全体を同じ墨色
 *                             （数字だけの色分けはしない）のチャンネルラベル。貼り終わりでぎゅっと押さえられ、光がなでる。
 *    「Googleの新しい音声モデルです。」… テープの下にセッション情報が語に合わせて 1 項目ずつ打ち込まれる:
 *                             BY GOOGLE ｜ TYPE NEW SPEECH MODEL ｜ RELEASED 2026.09.23
 *
 * 4. open-4「今夜のセッション、1トラックずつ再生していきます。」
 *    「今夜のセッションは」… テープが左上のセッション名（TONIGHT'S SESSION）へ縮み、
 *                           DAW のトラック一覧（5 レーン、題は section(id).title）が右から滑り込む。
 *                           クリップは各トラックの実際の音声波形・実際の長さで階段状に並ぶ。
 *    「今夜のセッション、」の終わり… 右上に「5 TRACKS」。
 *    「1トラックずつ」… レーンが上から順に点灯。
 *    「再生していきます。」… コーラルの再生ヘッドが先頭に降り、TRACK 01 の上を走り出す → TRACK 01 のテープへ。
 */
import React from "react";
import { Oscilloscope } from "../components/Meters";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { VoiceBars, useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, MONO, PAD_X, W } from "../theme";
import { line, section } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { BOOTH_W, Booth, type Focus } from "./Open/booth";
import { StudioClock } from "./Open/clock";
import { Chip, ScriptCard, TapeLabel, TrackLane, mixColor, sectionWave, typed, withAlpha } from "./Open/parts";
import { phrases } from "./Open/timing";

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("open-1");
const L2 = line("open-2");
const L3 = line("open-3");
const L4 = line("open-4");
const [p1a, p1b, p1c] = phrases("open-1", [0.26, 0.73]); // 深夜0時。 / ブースのマイクの前には、 / 誰もいません。
const [p2a, p2b, p2c] = phrases("open-2", [0.4, 0.75]); // しゃべっているのは、 / 台本を受け取っ / たAIです。
const [p3a, p3b, p3c] = phrases("open-3", [0.13, 0.58]); // 名前は、 / Gemini 3.8 Flash TTS。 / Googleの新しい音声モデルです。
const [p4a, p4b] = phrases("open-4", [0.36]); // 今夜のセッション、 / 1トラックずつ再生していきます。

// 1
const T_AIR = L1.start - 0.1;
const T_ROLL = mix(p1a.start, p1a.end, 0.42); // 「0時」
const T_FOCUS = mix(p1b.start, p1b.end, 0.26); // 「マイク」
const T_EMPTY = p1c.start - 0.08; // 「誰もいません」
const T_NOINPUT = p1c.start + 0.22;
const T_OUT1 = L1.end - 0.08;
// 2
const T_C = L2.start - 0.16; // 出力パネル（しゃべっているのは）
const T_SLOT_B = T_C + 0.22; // 空きスロット（チップの場所）
const T_SLOT_A = T_C + 0.34; // 空きスロット（台本の場所）
const T_A = p2b.start - 0.12; // 台本カード
const T_WIRE_AB = mix(p2b.start, p2b.end, 0.45);
const T_B = p2c.start - 0.04; // AI チップ
const T_WIRE_BC = T_B + 0.22;
const T_LINKED = T_WIRE_BC + 0.3;
// 3
const T_COLLAPSE = L3.start - 0.12;
const T_TAPE = p3b.start - 0.22; // 名前を読み上げる速さでテープを貼っていく
const T_TAPE_END = Math.max(T_TAPE + 0.6, p3b.end - 0.2);
const T_PRESS = T_TAPE_END - 0.02;
const META = [p3c.start - 0.05, mix(p3c.start, p3c.end, 0.24), mix(p3c.start, p3c.end, 0.5)]; // Google / 新しい音声モデル / 公開日
// 4
const T_HEADER = L3.end;
const T_FIVE = mix(p4a.start, p4a.end, 0.7); // 「セッション」
const LIT_STEP = Math.min(0.14, (p4b.dur * 0.4) / 5);
const T_LIT = (i: number) => p4b.start + 0.02 + i * LIT_STEP; // 「1トラックずつ」
const T_PLAYHEAD = Math.max(T_LIT(4) + 0.15, mix(p4b.start, p4b.end, 0.4)); // 「再生して」
const T_PLAY = T_PLAYHEAD + 0.25;

/* ---------------- レイアウト ---------------- */
const CX = W / 2;

// 1: 冒頭
const COL_W = 1104; // 左の列（見出し・信号）の幅。ブースの手前で止める
const CLOCK = 132;
const CLOCK_Y = 182;
const HEAD_FS = 206; // 「誰もいない。」が約 1090px 幅になる
const HEAD_Y = 338;
const PGM_Y = 612; // PGM OUT の見出し行
const SCOPE_H = 104;
const MIC_Y = 776; // MIC 1 の見出し行
const BOOTH_X = W - PAD_X - BOOTH_W;
const BOOTH_Y = 150;
// フォーカス枠（ブースの座標）
const F_MIC = { x: 300, y: 182, w: 208, h: 272 };
const F_EMPTY = { x: 50, y: 172, w: 262, h: 490 };

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
const TAPE_Y = 452;
const TAPE_ROT = -1.5;
const META_Y = TAPE_Y + TAPE_H / 2 + 52;
const META_ITEMS = [
  { k: "BY", v: "GOOGLE" },
  { k: "TYPE", v: "NEW SPEECH MODEL" },
  { k: "RELEASED", v: "2026.09.23" },
];

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

const lerpRect = (a: typeof F_MIC, b: typeof F_MIC, p: number) => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

/* ================================================================== */
export const Open: React.FC = () => {
  const t = useTime();
  const lv = useVoiceLevel();
  const level = lv ? clamp01(lv.rms * 2.5) : 0;

  /* ---- 1. 無人のブース ---- */
  const push = prog(t, L1.start, L1.end, ease.inOut);
  const onAir = mix(0.72, 1, prog(t, T_AIR, T_AIR + 0.18, ease.out));
  const kickerLit = prog(t, T_ROLL, T_ROLL + 0.3, ease.out);
  const fIn = prog(t, T_FOCUS, T_FOCUS + 0.32, ease.outQuint);
  const fMove = prog(t, T_EMPTY, T_EMPTY + 0.42, ease.inOut);
  const hot = prog(t, T_EMPTY + 0.12, T_EMPTY + 0.36, ease.out);
  const fRect = lerpRect(F_MIC, F_EMPTY, fMove);
  const grow = (1 - fIn) * 26; // はまる瞬間は少し大きい枠から締まる
  const focus: Focus = {
    x: fRect.x - grow,
    y: fRect.y - grow,
    w: fRect.w + grow * 2,
    h: fRect.h + grow * 2,
    label: fMove < 0.5 ? "MIC 1" : "EMPTY",
    op: fIn,
    hot,
  };
  const noInput = prog(t, T_NOINPUT, T_NOINPUT + 0.22, ease.outQuint);
  const stamp = springAt(t, T_NOINPUT, { damping: 11, stiffness: 240 });
  const accentGlow = prog(t, p1c.start, p1c.start + 0.25) * (1 - 0.6 * prog(t, p1c.start + 0.3, p1c.end + 0.2));
  const out1 = prog(t, T_OUT1, T_OUT1 + 0.38, ease.inOut);
  const db = lv && lv.rms > 0.004 ? 20 * Math.log10(lv.rms) : null;

  /* ---- 2. パイプライン ---- */
  const cIn = prog(t, T_C, T_C + 0.42, ease.outQuint);
  const live = prog(t, L2.start - 0.05, L2.start + 0.15);
  const aIn = springAt(t, T_A, { damping: 15, stiffness: 170 });
  const typeP = prog(t, p2b.start + 0.02, p2b.end, ease.linear);
  const wAB = prog(t, T_WIRE_AB, T_WIRE_AB + 0.34, ease.outQuint);
  const bIn = springAt(t, T_B, { damping: 13, stiffness: 190 });
  const bGlow = prog(t, T_B + 0.05, T_B + 0.35);
  const wBC = prog(t, T_WIRE_BC, T_WIRE_BC + 0.3, ease.outQuint);
  const linked = prog(t, T_LINKED, T_LINKED + 0.25);
  const col = prog(t, T_COLLAPSE, p3a.end + 0.1, ease.inOut);
  const labelsOut = prog(t, T_COLLAPSE, T_COLLAPSE + 0.25, ease.out);

  // 収束: 台本と出力はチップの中心へ
  const aCx = mix(A_CX, CX, col);
  const cCx = mix(C_CX, CX, col);
  const sideScale = mix(1, 0.12, col);
  const sideAlpha = 1 - prog(col, 0.45, 1);

  /* ---- 3. テープのラベル ---- */
  const unrollLin = prog(t, T_TAPE, T_TAPE_END, ease.linear);
  const unroll = mix(unrollLin, ease.out(unrollLin), 0.2);
  const covered = prog(unroll, 0.28, 0.62, ease.inOut);
  const settle = springAt(t, T_PRESS, { damping: 12, stiffness: 220 });
  const press = Math.sin(Math.PI * prog(t, T_PRESS, T_PRESS + 0.32, ease.linear));
  const sheen = t >= T_PRESS ? prog(t, T_PRESS, T_PRESS + 0.7, ease.inOut) : -1;
  const extrasOut = prog(t, T_HEADER, T_HEADER + 0.25, ease.out);

  const chipScale = bIn * mix(1, CHIP_BIG, col) * mix(1, 0.92, covered);
  const chipAlpha = 1 - covered;

  /* ---- 4. トラック一覧 ---- */
  const hm = prog(t, T_HEADER, L4.start + 0.18, ease.inOut);
  const five = springAt(t, T_FIVE, { damping: 12, stiffness: 200 });
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
  const bLeft = CX - (B_SIZE / 2 + B_PIN) * Math.max(1, chipScale);
  const bRight = CX + (B_SIZE / 2 + B_PIN) * Math.max(1, chipScale);
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
              transform: `translateX(${out1 * 70}px) scale(${mix(1, 1.03, push)})`,
              transformOrigin: "55% 45%",
            }}
          >
            <Booth onAir={onAir} spot={1} focus={focus} />
          </div>

          <div
            style={{
              position: "absolute",
              left: PAD_X,
              top: 0,
              width: COL_W,
              height: 1080,
              transform: `scale(${mix(1, 1.015, push)})`,
              transformOrigin: `0px ${HEAD_Y + HEAD_FS / 2}px`,
            }}
          >
            {/* 時計 + 深夜0時。 */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: CLOCK_Y,
                height: CLOCK,
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: 1 - prog(out1, 0, 0.7),
                transform: `translateY(${-out1 * 40}px)`,
              }}
            >
              <StudioClock size={CLOCK} t={t} tRoll={T_ROLL} />
              <div>
                <div style={{ ...mono(18, mixColor(C.dim, C.coral, kickerLit)), letterSpacing: "0.2em" }}>
                  {kickerLit > 0.5 ? "BOOTH A · ROLLING" : "BOOTH A · STANDBY"}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: 60,
                    lineHeight: "72px",
                    color: mixColor(C.sub, C.text, kickerLit),
                    whiteSpace: "nowrap",
                  }}
                >
                  深夜0時。
                </div>
              </div>
            </div>

            {/* 見出し */}
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
              誰も
              <span style={{ color: C.coral, textShadow: `0 0 ${50 * accentGlow}px ${withAlpha(C.coral, 0.55 * accentGlow)}` }}>いない。</span>
            </div>

            {/* 信号: PGM OUT（声がある） */}
            <div style={{ position: "absolute", left: 0, top: PGM_Y, width: COL_W, opacity: 1 - prog(out1, 0.2, 0.9), transform: `translateY(${-out1 * 48}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 26, ...mono(19) }}>
                <div style={{ width: 11, height: 11, borderRadius: 6, background: C.mint, boxShadow: `0 0 10px ${C.mint}` }} />
                <span style={{ color: C.text }}>PGM OUT</span>
                <span style={{ color: C.dim }}>· 声</span>
                <div style={{ flex: 1 }} />
                <span style={{ color: db !== null ? C.text : C.dim, fontVariantNumeric: "tabular-nums" }}>
                  {db !== null ? `${db.toFixed(1)} dB` : "-∞ dB"}
                </span>
              </div>
              <div style={{ position: "relative", marginTop: 10, width: COL_W, height: SCOPE_H }}>
                <div style={{ position: "absolute", left: 0, top: SCOPE_H / 2 - 0.5, width: COL_W, height: 1, background: C.border }} />
                <Oscilloscope width={COL_W} height={SCOPE_H} color={C.mint} gain={2.4} thickness={3} lines={["open-1"]} />
              </div>
            </div>

            {/* 信号: MIC 1（マイクには何も入っていない） */}
            <div style={{ position: "absolute", left: 0, top: MIC_Y, width: COL_W, opacity: 1 - prog(out1, 0.3, 1), transform: `translateY(${-out1 * 52}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 32, ...mono(19) }}>
                <div style={{ width: 11, height: 11, borderRadius: 6, boxSizing: "border-box", border: `2px solid ${C.dim}` }} />
                <span style={{ color: C.sub }}>MIC 1</span>
                <span style={{ color: C.dim }}>· マイク</span>
                <div
                  style={{
                    marginLeft: 8,
                    height: 34,
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                    border: `1.5px solid ${C.coral}`,
                    background: C.coralSoft,
                    color: C.coral,
                    fontSize: 19,
                    opacity: noInput,
                    transform: `scale(${mix(1.25, 1, clamp01(stamp))})`,
                    transformOrigin: "0% 50%",
                  }}
                >
                  NO INPUT
                </div>
                <div style={{ flex: 1 }} />
                <span style={{ color: C.dim }}>-∞ dB</span>
              </div>
              <div style={{ position: "relative", marginTop: 16, width: COL_W, height: 2, background: mixColor(C.border, C.dim, 0.6), borderRadius: 1 }} />
            </div>
          </div>
        </>
      )}

      {/* ================= 2: パイプライン ================= */}
      {t >= T_C - 0.05 && t < p3a.end + 0.3 && (
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

          {/* 「しゃべっているのは？」: 台本とチップの場所は点線の空きスロットで待つ */}
          {[
            { cx: A_CX, w: A.w, h: A.h, r: 16, at: T_SLOT_A, fill: aIn },
            { cx: CX, w: B_SIZE, h: B_SIZE, r: 22, at: T_SLOT_B, fill: bIn },
          ].map((sl, i) => {
            const p = prog(t, sl.at, sl.at + 0.35, ease.outQuint);
            const op = p * (1 - clamp01(sl.fill * 2.5));
            if (op <= 0) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: sl.cx - sl.w / 2,
                  top: NODE_Y - sl.h / 2,
                  width: sl.w,
                  height: sl.h,
                  borderRadius: sl.r,
                  border: `2px dashed ${C.borderHi}`,
                  boxSizing: "border-box",
                  opacity: op,
                  transform: `scale(${mix(0.92, 1, p)})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY,
                  fontSize: 64,
                  color: C.dim,
                }}
              >
                ?
              </div>
            );
          })}

          {/* 台本カード */}
          {t >= T_A && (
            <div
              style={{
                position: "absolute",
                left: aCx - A.w / 2,
                top: NODE_Y - A.h / 2,
                width: A.w,
                height: A.h,
                opacity: clamp01(aIn * 1.4) * sideAlpha,
                transform: `translateY(${(1 - aIn) * -40}px) scale(${mix(0.86, 1, aIn) * sideScale}) rotate(${mix(-4, 0, aIn)}deg)`,
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))",
              }}
            >
              <ScriptCard w={A.w} h={A.h} type={typeP} lit={1 - col} />
            </div>
          )}

          {/* 出力パネル: いま聞こえている声で動く */}
          <div
            style={{
              position: "absolute",
              left: cCx - Cn.w / 2,
              top: NODE_Y - Cn.h / 2,
              width: Cn.w,
              height: Cn.h,
              opacity: cIn * sideAlpha,
              transform: `translateX(${(1 - cIn) * 60}px) scale(${sideScale})`,
            }}
          >
            <Panel
              w={Cn.w}
              h={Cn.h}
              accent={C.mint}
              glow={linked * (1 - col)}
              header="VOICE OUT"
              status={live > 0 ? <span style={{ color: C.mint, opacity: live }}>● LIVE</span> : <span style={{ color: C.dim }}>IDLE</span>}
            >
              <div style={{ position: "absolute", left: 24, top: 56 + (Cn.h - 56) / 2 - 55, width: Cn.w - 48, height: 110 }}>
                <div style={{ position: "absolute", left: 0, top: 54.5, width: Cn.w - 48, height: 1, background: C.border }} />
                <Oscilloscope width={Cn.w - 48} height={110} color={C.mint} gain={2.8} thickness={2.5} lines={["open-2"]} amount={live} glow={linked > 0.5} />
              </div>
            </Panel>
          </div>

          {/* ノードの名前 */}
          {[
            { cx: A_CX, en: "INPUT", ja: "台本", at: T_A },
            { cx: CX, en: "ENGINE", ja: "しゃべり手", at: T_B },
            { cx: C_CX, en: "OUTPUT", ja: "声", at: T_C },
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

      {/* テープの下: セッション情報（Googleの新しい音声モデル） */}
      {t >= META[0] - 0.05 && extrasOut < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: META_Y,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            opacity: 1 - extrasOut,
          }}
        >
          {META_ITEMS.map((m, i) => {
            const p = prog(t, META[i], META[i] + 0.3, ease.outQuint);
            const ty = prog(t, META[i] + 0.04, META[i] + 0.04 + 0.03 * m.v.length, ease.linear);
            return (
              <React.Fragment key={m.k}>
                {i > 0 && (
                  <div
                    style={{
                      width: 1.5,
                      height: 62,
                      margin: "0 36px",
                      background: C.borderHi,
                      opacity: p,
                    }}
                  />
                )}
                <div style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                  <div style={{ ...mono(16, C.sub, 500), letterSpacing: "0.2em" }}>{m.k}</div>
                  <div style={{ ...mono(32, C.text), letterSpacing: "0.1em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                    {typed(m.v, ty)}
                    <span style={{ opacity: 0 }}>{m.v.slice(typed(m.v, ty).length)}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
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
              ...mono(16),
              opacity: prog(hm, 0.6, 1),
            }}
          >
            TONIGHT&apos;S SESSION
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
      <Sfx at={T_ROLL} name="tick" volume={0.2} />
      <Sfx at={T_FOCUS} name="tick" volume={0.14} />
      <Sfx at={T_NOINPUT} name="click" volume={0.16} />
      <Sfx at={T_C} name="tick" volume={0.14} />
      <Sfx at={T_A} name="tick" volume={0.14} />
      <Sfx at={T_B} name="pop" volume={0.18} />
      <Sfx at={T_TAPE} name="whoosh" volume={0.14} />
      <Sfx at={T_PRESS} name="pop" volume={0.18} />
      <Sfx at={META[0]} name="type" volume={0.12} />
      <Sfx at={T_FIVE} name="tick" volume={0.14} />
      {TRACKS.map((s, i) => (
        <Sfx key={s.id} at={T_LIT(i)} name="tick" volume={0.1} />
      ))}
      <Sfx at={T_PLAYHEAD} name="click" volume={0.2} />
    </SceneShell>
  );
};

