/*
 * OUTRO「ON AIR」— 絵コンテ（時刻はすべて台本の行 outro-1〜outro-4 と行内の声の区切りが基準。秒の直書きなし）
 *
 * 冒頭（Open）の「誰もいないボーカルブース」に同じカメラ位置で戻ってきて終わる。
 * 右にブース、左に時計・見出し・2 本の信号（PGM OUT = 声が出ている / MIC 1 = マイクには何も入っていない）。
 *
 * A. 入り → outro-1「今夜、ブースには誰もいませんでした。」
 *    テープが抜けると冒頭と同じ絵。壁の時計は冒頭で 00:00 になった瞬間から途切れずに進んでいて「00:01」。
 *    小見出し「最後まで、」→ 見出し「誰もいない。」（冒頭と同じ DISPLAY 206px、「いない。」はコーラル）が一文字ずつ着地。
 *    「誰も」でブースの空のスツールに EMPTY のフォーカス枠がはまり、「いませんでした」で MIC 1 に NO INPUT の判。
 * B. outro-2「それでも、芝居はちゃんとそこにありました。」
 *    「それでも、」… 時計と見出しが上へ抜け、PGM OUT の線がせり上がって大きく広がる（主役が「声」に移る）。
 *                   上に横型の LED レベルメーター（ピークホールド付き）。MIC 1 は下で平らなまま NO INPUT。
 *    「芝居は」… PGM OUT のチャンネルに、コーラルのマスキングテープ「芝居」が貼られる（冒頭の製品名テープと同じ作り）。
 *    「ちゃんとそこに」… 線の振れ幅がもう一段ふくらむ。ON AIR ランプも声に合わせてわずかに明滅。
 * C. outro-3「試すなら、Google AI Studio か Gemini API から。」
 *    PGM OUT の線は縮みながら、下からせり上がる CUE SHEET（エンドクレジット）の VOICE 行の小窓へ飛び込む。
 *    「試すなら、」… TRY IT 行のパッチベイ（ラックの帯、ネジ、空のジャック 2 口）が出る。
 *    「Google AI Studio」「Gemini API」… 名前が読まれるたびにコーラルのプラグが差さり（波紋 + ケーブル）、LED がミントに点く。
 * D. outro-4「声はGemini、映像はClaudeがコードで描きました。」
 *    「声は…」… VOICE 行に音声の出どころが再生ヘッドの通過で現れる
 *               （timeline の VOICE_PROVIDER が gemini なら「Gemini 3.8 Flash TTS」、それ以外は「Open JTalk (placeholder)」）。
 *    「映像はClaudeが」… VISUALS 行に「Claude」、「コードで描きました」で「(code / Remotion)」と、右の小窓に
 *               この映像を動かしているコード useCurrentFrame() が打ち込まれる。各行の見出しの LED が済んだ順にミントへ。
 * E. 余韻（outro-4 の後 → 最後）
 *    すべて静止して保持。HUD の REC → STOP / OFF AIR と同じ瞬間にブースの ON AIR が消え、スポットライトが落ち、
 *    シートの状態表示も OFF AIR に、小窓の線は平らな灰色に戻る。
 *
 * 使わないもの: 中央タイトル＋下線、製品名の「3.8」だけ色替え、提供中ピル、チップの列、盾・トロフィー・人物アイコン。
 */
import React from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { Panel } from "../components/Panel";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { useVoiceLevel } from "../components/VoiceBars";
import { C, DISPLAY, FONT, FPS, PAD_X, W } from "../theme";
import { LEVELS, TL, TOTAL_SEC, VOICE_PROVIDER, line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { BOOTH_W, Booth, type Focus } from "./Outro/booth";
import { SessionClock } from "./Outro/clock";
import { LedMeter, PatchChannel, RackScrew, TapeLabel, Typed, WipeText, mixColor, mono, withAlpha } from "./Outro/parts";
import { SoftScope } from "./Outro/scope";
import { phrases } from "./Outro/timing";

/* ---------------- 音声の出どころ（クレジットは実際の音声に合わせる） ---------------- */
const VOICE_IS_GEMINI = VOICE_PROVIDER === "gemini";
const VOICE_NAME = VOICE_IS_GEMINI ? "Gemini 3.8 Flash TTS" : "Open JTalk";
const VOICE_NOTE = VOICE_IS_GEMINI ? "" : "(placeholder)";

/* ---------------- 時刻（台本の行・フレーズから） ---------------- */
const L1 = line("outro-1");
const L2 = line("outro-2");
const L3 = line("outro-3");
const L4 = line("outro-4");
const [, p1b] = phrases("outro-1", [0.22]); // 今夜、 / ブースには誰もいませんでした。
const [, p2b] = phrases("outro-2", [0.26]); // それでも、 / 芝居はちゃんとそこにありました。
const [, p3b] = phrases("outro-3", [0.24]); // 試すなら、 / Google AI Studio か Gemini API から。
const [p4a, p4b] = phrases("outro-4", [0.27]); // 声はGemini、 / 映像はClaudeがコードで描きました。
// 冒頭の時計が 00:00 になった瞬間（Open と同じ求め方）。ここから経過時間を数えて時計をつなげる
const [o1a] = phrases("open-1", [0.26, 0.73]);
const T_ROLL_OPEN = mix(o1a.start, o1a.end, 0.42);

const T_IN = sceneEnter("outro");
// A
const T_LEAD = T_IN + 0.12;
const T_HEAD = L1.start - 0.04;
const T_EMPTY = mix(p1b.start, p1b.end, 0.3); // 「誰も」
const T_NOINPUT = mix(p1b.start, p1b.end, 0.62); // 「いませんでした」
// B
const T_LIFT = L1.end + 0.02; // 行間から「それでも、」にかけて主役が信号へ移る
const T_LIFT_END = L2.start + 0.45;
const T_TAPE = p2b.start - 0.08; // 「芝居は」
const T_TAPE_END = T_TAPE + Math.min(0.42, p2b.dur * 0.25);
const T_SWELL = mix(p2b.start, p2b.end, 0.3); // 「ちゃんとそこに」
// C
const T_BOUT = L2.end - 0.24; // B の飾りが先に上へ抜ける（言い終わりの直前）
const T_SHEET = L2.end - 0.02; // 抜けきる直前からシートがせり上がる
const T_DOCK = L2.end - 0.06;
const T_DOCK_END = L3.start + 0.42;
const T_BAY = L3.start - 0.02; // 「試すなら、」
const T_PLUG1 = p3b.start - 0.02; // 「Google AI Studio」
const T_PLUG2 = mix(p3b.start, p3b.end, 0.5); // 「Gemini API」
// D
const T_VOICE = p4a.start - 0.04; // 「声は」
const T_VOICE_W0 = mix(p4a.start, p4a.end, 0.3); // 「Gemini」
const T_VOICE_W1 = Math.max(T_VOICE_W0 + 0.45, p4a.end);
const T_VIS = p4b.start - 0.04; // 「映像は」
const T_VIS_W0 = mix(p4b.start, p4b.end, 0.2); // 「Claude」
const T_VIS_W1 = mix(p4b.start, p4b.end, 0.45);
const T_CODE0 = mix(p4b.start, p4b.end, 0.48); // 「コードで描きました」
const T_CODE1 = mix(p4b.start, p4b.end, 0.95);
// E
const T_STOP = TOTAL_SEC - 0.9; // HUD の REC → STOP と同じ瞬間

/* ---------------- レイアウト ---------------- */
// A: 冒頭と同じ配置
const BOOTH_X = W - PAD_X - BOOTH_W;
const BOOTH_Y = 150;
const COL_W = 1104;
const CLOCK = 132;
const CLOCK_Y = 182;
const HEAD_FS = 206;
const HEAD_Y = 338;
const PGM_Y = 612;
const SCOPE_H = 104;
const MIC_Y = 776;
const F_EMPTY = { x: 50, y: 172, w: 262, h: 490 }; // ブースの座標
// B: 信号が主役
const PGM_Y2 = 352;
const SCOPE_H2 = 292;
const MIC_Y2 = 752;
const TAPE = { x: -4, y: 184, w: 300, h: 124, rot: -2 };
const METER = { x: 360, y: 214, w: COL_W - 360, h: 30, seg: 30 };
// C/D: CUE SHEET
const SHEET = { x: PAD_X, y: 196, w: COL_W, h: 612 };
const ROW = {
  try: { top: 56, h: 236 },
  voice: { top: 292, h: 160 },
  visuals: { top: 452, h: 160 },
};
const LABEL_X = 34;
const SLOT = { w: 262, h: 64, right: 30 };
const BAY = { left: 206, right: 30, top: 34, h: 168 };
const VALUE_X = BAY.left; // クレジットの名前はパッチベイの左端にそろえる
const CREDIT_FS = 42;
const CODE_TOKENS: [string, string][] = [
  ["useCurrentFrame", C.coral],
  ["()", C.sub],
  [";", C.dim],
];

type Rect = { cx: number; cy: number; w: number; h: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  cx: mix(a.cx, b.cx, p),
  cy: mix(a.cy, b.cy, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

const HEAD_CHARS: [string, boolean][] = [
  ["誰", false],
  ["も", false],
  ["い", true],
  ["な", true],
  ["い", true],
  ["。", true],
];

/** 今の PGM のレベル（0〜1、ならし済み）と直近 0.6 秒のピーク */
const OUTRO_LINES = TL.lines.filter((l) => l.section === "outro");
const pgmLevel = (t: number) => {
  const l = OUTRO_LINES.find((x) => t >= x.start && t < x.end);
  if (!l) return { v: 0, peak: 0 };
  const rms = LEVELS.lines[l.id]?.rms ?? [];
  const k = Math.floor((t - l.start) * FPS);
  const at = (i: number) => (i >= 0 && i < rms.length ? rms[i] : 0);
  const v = (at(k - 2) + 2 * at(k - 1) + 3 * at(k)) / 6;
  let peak = 0;
  for (let i = k - 18; i <= k; i++) peak = Math.max(peak, at(i));
  // メーターの目盛り（-36〜0 dB）に合わせて dB で並べる
  // いちばん大きな声でも -4 dB あたり（琥珀色）で止まり、赤（クリップ）には入らない
  const toScale = (x: number) => clamp01(1 + (20 * Math.log10(Math.max(1e-4, x * 0.6))) / 36);
  return { v: toScale(v), peak: toScale(peak) };
};

/* ================================================================== */
export const Outro: React.FC = () => {
  // 仕上げの書き出し（--props='{"final":true}'）では、仮音声のままなら止める
  if ((getInputProps() as { final?: boolean }).final && !VOICE_IS_GEMINI) {
    throw new Error(`最終書き出しの音声が仮音声（${VOICE_PROVIDER}）です。Gemini の音声を生成してから書き出してください。`);
  }
  const t = useTime();
  const lv = useVoiceLevel();
  const db = lv && lv.rms > 0.004 ? 20 * Math.log10(lv.rms) : null;
  const pgm = pgmLevel(t);

  /* ---- A: 誰もいないブース ---- */
  const push = prog(t, T_IN, L2.end, ease.inOut);
  const leadIn = prog(t, T_LEAD, T_LEAD + 0.5, ease.outQuint);
  const fIn = prog(t, T_EMPTY, T_EMPTY + 0.32, ease.outQuint);
  const hot = prog(t, T_EMPTY + 0.1, T_EMPTY + 0.34, ease.out);
  const fOut = prog(t, T_LIFT, T_LIFT + 0.35, ease.out);
  const grow = (1 - fIn) * 26;
  const focus: Focus = {
    x: F_EMPTY.x - grow,
    y: F_EMPTY.y - grow,
    w: F_EMPTY.w + grow * 2,
    h: F_EMPTY.h + grow * 2,
    label: "EMPTY",
    op: fIn * (1 - fOut),
    hot,
  };
  const noInput = prog(t, T_NOINPUT, T_NOINPUT + 0.22, ease.outQuint);
  const stamp = springAt(t, T_NOINPUT, { damping: 11, stiffness: 240 });
  const accentGlow = prog(t, T_EMPTY, T_EMPTY + 0.25) * (1 - 0.6 * prog(t, T_EMPTY + 0.3, L1.end));

  /* ---- B: 信号が主役に ---- */
  const lift = prog(t, T_LIFT, T_LIFT_END, ease.inOut);
  const headOut = prog(t, T_LIFT, T_LIFT + 0.4, ease.in);
  const meterIn = prog(t, T_LIFT + 0.25, T_LIFT_END + 0.1, ease.outQuint);
  const tapeUnroll = prog(t, T_TAPE, T_TAPE_END, ease.inOut);
  const tapePress = springAt(t, T_TAPE_END, { damping: 12, stiffness: 220 });
  const tapeSheen = t >= T_TAPE_END ? prog(t, T_TAPE_END, T_TAPE_END + 0.7, ease.inOut) : -1;
  const swell = prog(t, T_SWELL, T_SWELL + 0.5, ease.inOut);

  /* ---- C: CUE SHEET ---- */
  const bOut = prog(t, T_BOUT, T_BOUT + 0.28, ease.inOut); // B の飾り（テープ・メーター・MIC 1）が抜ける
  const sheetIn = prog(t, T_SHEET, T_SHEET + 0.55, ease.outQuint);
  const sheetY = SHEET.y + (1 - sheetIn) * 56;
  const bayIn = prog(t, T_BAY, T_BAY + 0.45, ease.outQuint);
  const plug1 = springAt(t, T_PLUG1, { damping: 13, stiffness: 260 });
  const plug2 = springAt(t, T_PLUG2, { damping: 13, stiffness: 260 });
  const rip1 = prog(t, T_PLUG1 + 0.1, T_PLUG1 + 0.6, ease.out);
  const rip2 = prog(t, T_PLUG2 + 0.1, T_PLUG2 + 0.6, ease.out);
  const led1 = prog(t, T_PLUG1 + 0.12, T_PLUG1 + 0.3, ease.out);
  const led2 = prog(t, T_PLUG2 + 0.12, T_PLUG2 + 0.3, ease.out);

  /* ---- D: クレジット ---- */
  const voiceW = prog(t, T_VOICE_W0, T_VOICE_W1, ease.inOut);
  const voiceHead = prog(t, T_VOICE_W1, T_VOICE_W1 + 0.25, ease.out);
  const noteP = prog(t, T_VOICE_W1 - 0.05, T_VOICE_W1 + 0.35, ease.linear);
  const visW = prog(t, T_VIS_W0, T_VIS_W1, ease.inOut);
  const visHead = prog(t, T_VIS_W1, T_VIS_W1 + 0.25, ease.out);
  const visSub = prog(t, T_CODE0 - 0.05, T_CODE0 + 0.45, ease.linear);
  const codeP = prog(t, T_CODE0, T_CODE1, ease.linear);

  // 行の状態: 0 = 待ち（dim）、書き込み中はコーラル、済んだらミント
  const rowState = (a: number, done: number) => ({ act: prog(t, a - 0.1, a + 0.2), done: prog(t, done, done + 0.25) });
  const stTry = rowState(T_BAY, T_PLUG2 + 0.2);
  const stVoice = rowState(T_VOICE, T_VOICE_W1 + 0.2);
  const stVis = rowState(T_VIS, T_CODE1 + 0.05);

  /* ---- E: 放送終了 ---- */
  const stop = prog(t, T_STOP, T_STOP + 0.22, ease.out);
  const lampPulse = t >= L2.start && t < L2.end + 0.2 ? 0.1 * pgm.v : 0;
  const onAir = clamp01((1 - stop) * (0.9 + lampPulse));
  const spot = mix(1, 0.22, prog(t, T_STOP, T_STOP + 0.5, ease.inOut));
  const settle = 1 - prog(t, T_STOP - 0.4, T_STOP + 0.3, ease.inOut);

  /* ---- PGM OUT の線（A の細い線 → B の大きな線 → C の VOICE 行の小窓） ---- */
  const RA: Rect = { cx: PAD_X + COL_W / 2, cy: PGM_Y + 36 + SCOPE_H / 2, w: COL_W, h: SCOPE_H };
  const RB: Rect = { cx: PAD_X + COL_W / 2, cy: PGM_Y2 + 36 + SCOPE_H2 / 2, w: COL_W, h: SCOPE_H2 };
  const RC: Rect = {
    cx: SHEET.x + SHEET.w - SLOT.right - SLOT.w / 2,
    cy: sheetY + ROW.voice.top + ROW.voice.h / 2,
    w: SLOT.w - 30,
    h: SLOT.h - 12,
  };
  const dock = prog(t, T_DOCK, T_DOCK_END, ease.inOut);
  const shrink = prog(t, T_DOCK, T_DOCK_END, ease.outQuint);
  const ab = lerpRect(RA, RB, lift);
  const sr: Rect = { cx: mix(ab.cx, RC.cx, dock), cy: mix(ab.cy, RC.cy, dock), w: mix(ab.w, RC.w, shrink), h: mix(ab.h, RC.h, shrink) };
  const gain = mix(2.4, 4.4, lift) * mix(1, 1.4, swell) * mix(1, 0.55, dock);
  const scopeColor = mixColor(C.dim, C.mint, settle);
  const pgmHeadY = mix(PGM_Y, PGM_Y2, lift);
  const micY = mix(MIC_Y, MIC_Y2, lift);

  const rowLabel = (en: string, ja: string, top: number, h: number, st: { act: number; done: number }) => {
    const led = st.done > 0 ? mixColor(C.coral, C.mint, st.done) : mixColor("#2A2F38", C.coral, st.act);
    return (
      <div style={{ position: "absolute", left: LABEL_X, top, height: h, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: led,
            boxShadow: st.act > 0.1 ? `0 0 10px ${led}` : "none",
            alignSelf: "flex-start",
            marginTop: h / 2 - 22,
          }}
        />
        <div>
          <div style={mono(17, mixColor(C.dim, C.sub, st.act))}>{en}</div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, lineHeight: "34px", color: mixColor(C.dim, C.text, st.act), whiteSpace: "nowrap" }}>
            {ja}
          </div>
        </div>
      </div>
    );
  };

  const slot = (top: number, h: number, children?: React.ReactNode) => (
    <div
      style={{
        position: "absolute",
        right: SLOT.right,
        top: top + (h - SLOT.h) / 2,
        width: SLOT.w,
        height: SLOT.h,
        borderRadius: 10,
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${C.border}`,
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 16,
        boxSizing: "border-box",
      }}
    >
      {children}
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
            transform: `scale(${mix(1.03, 1, push)})`,
            transformOrigin: "40% 60%",
          }}
        >
          <Booth onAir={onAir} spot={spot} focus={focus} />
        </div>

        {/* ===== A: 時計・見出し ===== */}
        {headOut < 1 && (
          <div
            style={{
              position: "absolute",
              left: PAD_X,
              top: 0,
              width: COL_W,
              height: 1080,
              opacity: 1 - headOut,
              transform: `translateY(${-60 * headOut}px)`,
              filter: headOut > 0 ? `blur(${6 * headOut}px)` : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: CLOCK_Y,
                height: CLOCK,
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: leadIn,
                transform: `translateY(${(1 - leadIn) * 18}px)`,
              }}
            >
              <SessionClock size={CLOCK} t={t} tRoll={T_ROLL_OPEN} />
              <div>
                <div style={{ ...mono(18, C.coral), letterSpacing: "0.2em" }}>BOOTH A · WRAP</div>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 60, lineHeight: "72px", color: C.text, whiteSpace: "nowrap" }}>
                  最後まで、
                </div>
              </div>
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
              {HEAD_CHARS.map(([ch, accent], i) => {
                const ti = T_HEAD + i * 0.05;
                const s = springAt(t, ti, { damping: 13, stiffness: 240, mass: 0.7 });
                return (
                  <div
                    key={i}
                    style={{
                      color: accent ? C.coral : C.text,
                      opacity: prog(t, ti, ti + 0.08, ease.linear),
                      transform: `translateY(${(1 - s) * -40}px) scale(${1 + (1 - s) * 0.18})`,
                      textShadow: accent ? `0 0 ${50 * accentGlow}px ${withAlpha(C.coral, 0.55 * accentGlow)}` : undefined,
                    }}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== B: 「芝居」のテープと PGM メーター ===== */}
        {meterIn > 0 && bOut < 1 && (
          <div
            style={{
              position: "absolute",
              left: PAD_X + TAPE.x + 8,
              top: TAPE.y + 10,
              width: TAPE.w - 16,
              height: TAPE.h - 20,
              borderRadius: 8,
              border: `1.5px dashed ${C.borderHi}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: meterIn * (1 - bOut) * (1 - prog(t, T_TAPE_END - 0.1, T_TAPE_END + 0.1)),
              transform: `rotate(${TAPE.rot}deg)`,
              ...mono(15, C.dim, 700, "0.2em"),
            }}
          >
            CH NAME
          </div>
        )}
        {tapeUnroll > 0 && bOut < 1 && (
          <div
            style={{
              position: "absolute",
              left: PAD_X + TAPE.x,
              top: TAPE.y,
              opacity: 1 - bOut,
              transform: `translateY(${-40 * bOut}px) rotate(${TAPE.rot}deg) scale(${mix(1.05, 1, clamp01(tapePress))})`,
              transformOrigin: "30% 50%",
            }}
          >
            <TapeLabel w={TAPE.w} h={TAPE.h} unroll={tapeUnroll} sheen={tapeSheen} seed={23}>
              <div style={{ fontFamily: DISPLAY, fontSize: 84, lineHeight: 1, color: C.ink, marginTop: 6 }}>芝居</div>
            </TapeLabel>
          </div>
        )}
        {meterIn > 0 && bOut < 1 && (
          <div
            style={{
              position: "absolute",
              left: PAD_X + METER.x,
              top: METER.y,
              width: METER.w,
              opacity: meterIn * (1 - bOut),
              transform: `translateY(${(1 - meterIn) * 16 - 40 * bOut}px)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={mono(16, C.sub)}>PGM LEVEL</div>
              <div style={mono(16, C.dim)}>PEAK HOLD</div>
            </div>
            <LedMeter width={METER.w} height={METER.h} segments={METER.seg} value={pgm.v} peak={pgm.peak} />
            <div style={{ position: "relative", height: 20, marginTop: 8 }}>
              {["-36", "-30", "-24", "-18", "-12", "-6", "0"].map((s, i, a) => (
                <div key={s} style={{ position: "absolute", left: `${(i / (a.length - 1)) * 100}%`, transform: `translateX(${i === 0 ? 0 : i === a.length - 1 ? -100 : -50}%)`, ...mono(14, C.dim, 500, "0.04em") }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== A/B: 2 本の信号の見出し ===== */}
        {bOut < 1 && (
          <div style={{ position: "absolute", left: PAD_X, top: 0, width: COL_W, height: 1080, opacity: 1 - bOut, transform: `translateY(${-40 * bOut}px)` }}>
            {/* PGM OUT */}
            <div style={{ position: "absolute", left: 0, top: pgmHeadY, width: COL_W, display: "flex", alignItems: "center", gap: 12, height: 26, ...mono(19) }}>
              <div style={{ width: 11, height: 11, borderRadius: 6, background: C.mint, boxShadow: `0 0 10px ${C.mint}` }} />
              <span style={{ color: C.text }}>PGM OUT</span>
              <span style={{ color: C.dim }}>· 声</span>
              <div style={{ flex: 1 }} />
              <span style={{ color: db !== null ? C.text : C.dim, fontVariantNumeric: "tabular-nums" }}>{db !== null ? `${db.toFixed(1)} dB` : "-∞ dB"}</span>
            </div>
            <div style={{ position: "absolute", left: 0, top: pgmHeadY + 36 + mix(SCOPE_H, SCOPE_H2, lift) / 2 - 0.5, width: COL_W, height: 1, background: C.border }} />
            {/* MIC 1 */}
            <div style={{ position: "absolute", left: 0, top: micY, width: COL_W }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 34, ...mono(19) }}>
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
              <div style={{ marginTop: 16, width: COL_W, height: 2, background: mixColor(C.border, C.dim, 0.6), borderRadius: 1 }} />
            </div>
          </div>
        )}

        {/* ===== C/D: CUE SHEET（エンドクレジット） ===== */}
        {sheetIn > 0 && (
          <Panel
            x={SHEET.x}
            y={sheetY}
            w={SHEET.w}
            h={SHEET.h}
            header={
              <>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: mixColor(C.coral, C.dim, stop) }} />
                <span style={{ color: C.text }}>CUE SHEET</span>
                <span style={{ color: C.dim }}>· END CREDITS</span>
              </>
            }
            style={{ opacity: sheetIn }}
          >
            {[ROW.voice.top, ROW.visuals.top].map((y) => (
              <div key={y} style={{ position: "absolute", left: 24, right: 24, top: y, height: 1, background: C.border }} />
            ))}

            {/* TRY IT: パッチベイ */}
            {rowLabel("TRY IT", "試すなら", ROW.try.top, ROW.try.h, stTry)}
            <div
              style={{
                position: "absolute",
                left: BAY.left,
                right: BAY.right,
                top: ROW.try.top + BAY.top,
                height: BAY.h,
                borderRadius: 12,
                background: "linear-gradient(180deg, #111419 0%, #0B0D11 100%)",
                border: `1.5px solid ${C.borderHi}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 24px rgba(0,0,0,0.35)",
                boxSizing: "border-box",
                opacity: bayIn,
                transform: `translateY(${(1 - bayIn) * 18}px)`,
              }}
            >
              <div style={{ position: "absolute", left: 16, top: 16 }}>
                <RackScrew />
              </div>
              <div style={{ position: "absolute", left: 16, bottom: 16 }}>
                <RackScrew />
              </div>
              <div style={{ position: "absolute", right: 16, top: 16 }}>
                <RackScrew />
              </div>
              <div style={{ position: "absolute", right: 16, bottom: 16 }}>
                <RackScrew />
              </div>
              <div style={{ position: "absolute", left: 60, top: 14, ...mono(14, C.dim, 700, "0.2em") }}>PATCH BAY</div>
              <div
                style={{
                  position: "absolute",
                  left: 60,
                  right: 60,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 12,
                }}
              >
                <PatchChannel ch="CH 01" name="Google AI Studio" show={bayIn} plug={plug1} on={led1} ripple={rip1} />
                <PatchChannel ch="CH 02" name="Gemini API" show={prog(t, T_BAY + 0.08, T_BAY + 0.53, ease.outQuint)} plug={plug2} on={led2} ripple={rip2} />
              </div>
            </div>

            {/* VOICE */}
            {rowLabel("VOICE", "声", ROW.voice.top, ROW.voice.h, stVoice)}
            <div style={{ position: "absolute", left: VALUE_X, top: ROW.voice.top, height: ROW.voice.h, display: "flex", alignItems: "center", gap: 16 }}>
              <WipeText p={voiceW} headOut={voiceHead} style={{ fontFamily: DISPLAY, fontSize: CREDIT_FS, lineHeight: 1.3, color: C.text }}>
                {VOICE_NAME}
              </WipeText>
              {VOICE_NOTE && <Typed text={VOICE_NOTE} p={noteP} style={mono(22, C.sub, 500, "0.04em")} />}
            </div>
            {slot(ROW.voice.top, ROW.voice.h)}

            {/* VISUALS */}
            {rowLabel("VISUALS", "映像", ROW.visuals.top, ROW.visuals.h, stVis)}
            <div style={{ position: "absolute", left: VALUE_X, top: ROW.visuals.top, height: ROW.visuals.h, display: "flex", alignItems: "center", gap: 16 }}>
              <WipeText p={visW} headOut={visHead} style={{ fontFamily: DISPLAY, fontSize: CREDIT_FS, lineHeight: 1.3, color: C.text }}>
                Claude
              </WipeText>
              <Typed text="(code / Remotion)" p={visSub} style={mono(22, C.sub, 500, "0.04em")} />
            </div>
            {slot(
              ROW.visuals.top,
              ROW.visuals.h,
              <>
                <div style={{ ...mono(16, C.dim, 500, "0"), width: 22 }}>1</div>
                <CodeLine p={codeP} />
              </>,
            )}
          </Panel>
        )}

        {/* ===== PGM OUT の線（全編を通してつながる一本の線） ===== */}
        <div
          style={{
            position: "absolute",
            left: sr.cx - sr.w / 2,
            top: sr.cy - sr.h / 2,
            width: sr.w,
            height: sr.h,
            opacity: prog(t, T_IN, T_IN + 0.3),
          }}
        >
          <SoftScope width={sr.w} height={sr.h} color={scopeColor} gain={gain} thickness={mix(mix(3, 4, lift), 2.4, dock)} amount={settle} glow={settle * mix(1, 1.4, lift * (1 - dock))} hold={10 * lift * (1 - dock)} />
        </div>
      </AbsoluteFill>

      {/* 効果音 */}
      <Sfx at={T_HEAD} name="pop" volume={0.16} />
      <Sfx at={T_NOINPUT} name="tick" volume={0.2} />
      <Sfx at={T_TAPE_END} name="pop" volume={0.14} />
      <Sfx at={T_SWELL} name="swell" volume={0.14} />
      <Sfx at={T_PLUG1} name="click" volume={0.24} />
      <Sfx at={T_PLUG2} name="click" volume={0.24} />
      <Sfx at={T_VOICE_W0} name="type" volume={0.12} />
      <Sfx at={T_CODE0} name="type" volume={0.12} />
      <Sfx at={T_STOP} name="click" volume={0.2} />
    </SceneShell>
  );
};

/** この映像を動かしているコードの 1 行を、簡単な色分けで打ち込む */
const CodeLine: React.FC<{ p: number }> = ({ p }) => {
  const total = CODE_TOKENS.reduce((a, [s]) => a + s.length, 0);
  const n = Math.round(clamp01(p) * total);
  let used = 0;
  return (
    <div style={{ ...mono(19, C.text, 500, "0"), display: "flex", alignItems: "center" }}>
      {CODE_TOKENS.map(([s, col]) => {
        const k = Math.max(0, Math.min(s.length, n - used));
        used += s.length;
        return (
          <span key={s} style={{ color: col, whiteSpace: "pre" }}>
            {s.slice(0, k)}
          </span>
        );
      })}
      {p < 1 && <span style={{ display: "inline-block", width: 10, height: 21, marginLeft: 2, background: C.coral, opacity: p > 0 ? 1 : 0.45 }} />}
    </div>
  );
};
