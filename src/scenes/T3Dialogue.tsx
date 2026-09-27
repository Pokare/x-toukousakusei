/*
 * TRACK 03 — 2人の会話も、1本の台本で（MULTI-SPEAKER）
 *
 * 絵コンテ（すべてナレーションの行・シーン境界に同期。秒は直書きしない）
 *  B0  enter      テープが抜けると同時に、見出し「2人の会話も、1本の台本で」が 1 文字ずつせり上がる（中央・大）。
 *                 上に MONO ラベル「03 — MULTI-SPEAKER」。「1本」だけコーラル。
 *  B1  t3-1       「2人の会話」: 見出しの下に話者 A（コーラル）と話者 B（ミント）の丸がばねで現れ、
 *                 間を点線と会話アイコンがつなぐ（この後のチャンネルの予告）。
 *  B2  t3-2       見出しが左上へ収まる。中央に 1 枚の台本「SCRIPT」がせり上がり、B / A の 2 行が打鍵で入る（「1本の台本から」）。
 *                 「2人分の声を」で A・B の丸が左右へ飛び、そこを起点にミキサーのチャンネル CH A / CH B が
 *                 台本の後ろから左右に分かれ出る。台本の各行からパッチケーブルがそれぞれのチャンネルへ伸びて刺さる。
 *                 「まとめて作れます」で台本の「▶ 1 PASS」が点灯し、1 回の信号が 2 本のケーブルを同時に走る →
 *                 両チャンネルが READY になり、フェーダーが −∞ から 0 dB まで上がる。
 *  B3  t3-3       話者 B が話す: 台本の B 行がミントでハイライト（読み進みバー）、B ケーブルに信号が流れ、
 *                 CH B が点灯（吹き出し型スクリーンのオシロ・VU・アバターの輪が t3-3 の声だけに反応）。CH A は一歩下がる。
 *                 「1回で」で「1 PASS」がもう一度はねる。
 *  B4  t3-4       話者 A が話す: 同じことが CH A（コーラル）で起き、CH B は下がる。B 行には済みのチェック。
 *  B5  t3-5       ミキサー全体が右上へ縮んで退き、下に「VOICE CLONE」パネルが立ち上がる。
 *                 「30秒の音声があれば」: SAMPLE クリップにコーラルの波形が録られていき、タイマーが 00:00 → 00:30。
 *                 「自分の声を再現」: 矢印を信号が渡り CLONE ノードの輪が一周 → YOUR VOICE クリップに同じ形の点線の輪郭が現れ、
 *                 ミントで塗られていく。最後に鍵アイコンつきの注記「本人の同意が必要」。そのまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { Oscilloscope, VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { IconChats, IconCopy, IconDoc, IconMic, IconUser } from "../components/Icons";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../theme";
import { line, sceneEnter } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { Avatar, ClipWave, Fader, IconLock, cable, envAt } from "./T3Dialogue/parts";

// ───────── タイミング（すべて行・シーン境界から計算） ─────────
const E = sceneEnter("t3");
const L1 = line("t3-1");
const L2 = line("t3-2");
const L3 = line("t3-3");
const L4 = line("t3-4");
const L5 = line("t3-5");
const at = (l: { start: number; end: number }, f: number) => mix(l.start, l.end, f);

const PULSE = at(L2, 0.64); // 「まとめて」
const SHRINK_A = Math.max(L4.end + 0.1, L5.start - 0.3);
const TM = {
  headIn: E + 0.08,
  duo: at(L1, 0.42), // 「2人の会話」
  settleA: L2.start - 0.3,
  settleB: L2.start + 0.32,
  sheetIn: L2.start + 0.12,
  typeA: L2.start + 0.34,
  typeB: at(L2, 0.42),
  strips: at(L2, 0.36), // 「2人分の声を」
  cables: at(L2, 0.46),
  plug: at(L2, 0.46) + 0.42,
  pulse: PULSE,
  arrive: PULSE + 0.36,
  bOn: L3.start - 0.12,
  onePass: at(L3, 0.42), // 「1回で」
  aOn: L4.start - 0.12,
  aOff: L4.end + 0.05,
  shrinkA: SHRINK_A, // ミキサーはまず右へ縮み、見出しを避けてから右上へ上がる
  cloneIn: SHRINK_A + 0.42,
  countA: Math.max(at(L5, 0.1), SHRINK_A + 0.72), // 「30秒の音声があれば」
  countB: at(L5, 0.38),
  send: at(L5, 0.38),
  node: at(L5, 0.47),
  drawA: at(L5, 0.5), // 「自分の声を再現」
  drawB: at(L5, 0.72),
  consent: at(L5, 0.8),
};

// 話している度合い（0〜1）
const actB = (t: number) => prog(t, TM.bOn, TM.bOn + 0.22) * (1 - prog(t, TM.aOn - 0.02, TM.aOn + 0.22));
const actA = (t: number) => prog(t, TM.aOn, TM.aOn + 0.22) * (1 - prog(t, TM.aOff, TM.aOff + 0.3));

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 80, w: 962 }; // w: 実測した見出しの幅
const BIG = 1.4;
const BIG_CY = 432;
const MIX_Y = 318;
const STRIP = { w: 300, h: 540 };
const CHA = { x: PAD_X, y: MIX_Y };
const CHB = { x: 1920 - PAD_X - STRIP.w, y: MIX_Y };
const SHEET = { x: 526, y: 416, w: 868, h: 344 };
const ROW = { top: 80, h: 88, textX: 136, fs: 34 };
const ROW_Y = [0, 1].map((i) => SHEET.y + ROW.top + ROW.h * i + ROW.h / 2);
const AV_R = 34;
const AV_A = { x: CHA.x + 56, y: MIX_Y + 114 };
const AV_B = { x: CHB.x + STRIP.w - 56, y: MIX_Y + 114 }; // CH B は左右反転（会話の左右）
// 台本が出ている間、A / B の丸は自分の行の外側で待つ
const SIDE_A = { x: SHEET.x - 58, y: SHEET.y + ROW.top + ROW.h * 1.5 };
const SIDE_B = { x: SHEET.x + SHEET.w + 58, y: SHEET.y + ROW.top + ROW.h * 0.5 };
// チャンネルは台本の後ろからこの距離だけ左右へ滑り出る（丸はそれに乗って運ばれる）
const STRIP_SLIDE = SIDE_A.x - AV_A.x;
const DUO = { y: 626, dx: 196, r: 44 };
const CAB_A = cable({ x: SHEET.x, y: ROW_Y[1] }, { x: CHA.x + STRIP.w, y: AV_A.y });
const CAB_B = cable({ x: SHEET.x + SHEET.w, y: ROW_Y[0] }, { x: CHB.x, y: AV_B.y });
// t3-5: ミキサーは右上へ縮む
const SHRINK = { s: 0.4, top: 170 };
const CLONE = { x: PAD_X, y: 420, w: 1920 - PAD_X * 2, h: 420 };

type RowDef = { tag: string; text: string; id: string; color: string; soft: string };
const ROWS: RowDef[] = [
  { tag: "B", text: "これ、ほんとに1回で作ってるの？", id: "t3-3", color: C.mint, soft: C.mintSoft },
  { tag: "A", text: "うん。話者を書き分けておくだけ。", id: "t3-4", color: C.coral, soft: C.coralSoft },
];
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

// ───────── 見出し ─────────
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const settle = prog(t, TM.settleA, TM.settleB, ease.inOut);
  const s = mix(BIG, 1, settle);
  const bigW = HEAD.w * BIG;
  const bigH = (34 + HEAD.size * 1.1) * BIG;
  const tx = mix(960 - bigW / 2 - HEAD.x, 0, settle);
  const ty = mix(BIG_CY - bigH / 2 - HEAD.y, 0, settle);
  const chars = [..."2人の会話も、1本の台本で"];
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
        <div style={{ ...mono(20, C.sub), letterSpacing: "0.2em", opacity: lab, transform: `translateX(${(1 - lab) * -12}px)` }}>
          <span style={{ color: C.coral }}>03</span> — MULTI-SPEAKER
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.035, TM.headIn + i * 0.035 + 0.5, ease.outQuint);
          const emph = i === 7 || i === 8;
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: emph ? C.coral : C.text }}>
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── t3-1: 2 人の予告（点線・ラベル。丸は Avatars が描く） ─────────
const Duo: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.duo + 0.12, TM.duo + 0.62, ease.outQuint);
  const out = prog(t, TM.settleA - 0.1, TM.settleA + 0.22);
  if (inP <= 0 || out >= 1) return null;
  const gapIn = DUO.r + 18;
  const half = DUO.dx - gapIn;
  const icon = springAt(t, TM.duo + 0.3, { damping: 13, stiffness: 170 });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: 1 - out }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[-1, 1].map((sgn) => (
          <line
            key={sgn}
            x1={960 + sgn * 44}
            y1={DUO.y}
            x2={960 + sgn * (44 + (half - 44) * inP)}
            y2={DUO.y}
            stroke={C.borderHi}
            strokeWidth={2}
            strokeDasharray="4 8"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 960 - 22, top: DUO.y - 22, transform: `scale(${icon})` }}>
        <IconChats size={44} color={C.sub} sw={1.7} />
      </div>
      {(["A", "B"] as const).map((s, i) => (
        <div
          key={s}
          style={{
            position: "absolute",
            left: 960 + (i === 0 ? -1 : 1) * DUO.dx - 120,
            width: 240,
            top: DUO.y + DUO.r + 22,
            textAlign: "center",
            ...mono(18, i === 0 ? C.coral : C.mint),
            opacity: inP,
            transform: `translateY(${(1 - inP) * 10}px)`,
          }}
        >
          SPEAKER {s}
        </div>
      ))}
    </div>
  );
};

// ───────── アバター（t3-1 の予告位置 → チャンネルの位置へ飛ぶ） ─────────
const stripStart = (side: "A" | "B") => TM.strips + (side === "A" ? 0 : 0.08);
const stripIn = (t: number, side: "A" | "B") => prog(t, stripStart(side), stripStart(side) + 0.72, ease.outQuint);

const Avatars: React.FC<{ t: number }> = ({ t }) => {
  const mv = prog(t, TM.settleA, TM.settleB + 0.05, ease.inOut);
  return (
    <>
      {(["A", "B"] as const).map((s) => {
        const isA = s === "A";
        const pre = { x: 960 + (isA ? -1 : 1) * DUO.dx, y: DUO.y };
        const side = isA ? SIDE_A : SIDE_B;
        const fin = isA ? AV_A : AV_B;
        const pop = springAt(t, TM.duo + (isA ? 0 : 0.12), { damping: 12, stiffness: 170 });
        const ride = stripIn(t, s); // チャンネルと同じ動き
        const rideY = prog(t, stripStart(s), stripStart(s) + 0.6, ease.outQuint);
        const x = mix(mix(pre.x, side.x, mv), fin.x, ride);
        const y = mix(mix(pre.y, side.y, mv) - Math.sin(mv * Math.PI) * 36, fin.y, rideY);
        const act = isA ? actA(t) : actB(t);
        const other = isA ? actB(t) : actA(t);
        const env = act * envAt(isA ? "t3-4" : "t3-3", t);
        // 予告のときに一度ずつ「話す」輪
        const hint = prog(t, TM.duo + (isA ? 0.5 : 0.85), TM.duo + (isA ? 1.1 : 1.45), ease.out);
        const hintEnv = hint > 0 && hint < 1 ? Math.sin(hint * Math.PI) * 0.7 : 0;
        return (
          <Avatar
            key={s}
            x={x}
            y={y}
            r={mix(DUO.r, AV_R, mv)}
            letter={s}
            color={isA ? C.coral : C.mint}
            env={Math.max(env, hintEnv * (1 - mv))}
            lit={act}
            scale={pop * mix(1, 0.985, other)}
            opacity={clamp01(pop * 3) * mix(1, 0.4, other)}
          />
        );
      })}
    </>
  );
};

// ───────── 中央: 台本 ─────────
const Sheet: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.sheetIn, TM.sheetIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
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
        opacity: inP,
        transform: `translateY(${(1 - inP) * 48}px)`,
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
          const act = i === 0 ? actB(t) : actA(t);
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
              {/* 話者の札 */}
              <div
                style={{
                  position: "absolute",
                  left: 72,
                  top: ROW.h / 2 - 23,
                  width: 46,
                  height: 46,
                  borderRadius: 10,
                  background: r.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY,
                  fontSize: 26,
                  color: C.ink,
                  transform: `scale(${tagPop})`,
                  boxShadow: act > 0.5 ? `0 0 16px ${r.color}88` : undefined,
                }}
              >
                {r.tag}
              </div>
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
          1 SCRIPT <span style={{ color: C.dim }}>→</span> 2 VOICES
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
  const lid = isA ? "t3-4" : "t3-3";
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
  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        opacity: clamp01(inP * 2.2) * mix(1, 0.4, other),
        transform: `translateX(${slide}px) scale(${mix(1, 0.985, other)})`,
      }}
    >
      <Panel
        w={STRIP.w}
        h={STRIP.h}
        header={<span style={{ color: act > 0.5 ? C.text : C.sub }}>CH {side}</span>}
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
  if (draw <= 0) return null;
  const plugged = t >= TM.plug;
  const pulse = prog(t, TM.pulse, TM.arrive, ease.inOut);
  const items = [
    { c: CAB_B, color: C.mint, act: actB(t) },
    { c: CAB_A, color: C.coral, act: actA(t) },
  ];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
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

// ───────── t3-5: VOICE CLONE パネル ─────────
const CL = {
  left: { x: 56, w: 600 },
  right: { x: 1072, w: 600 },
  titleY: 74,
  clipY: 160,
  clipH: 150,
  nodeX: 864,
  nodeR: 46,
};

const Clip: React.FC<{ x: number; w: number; color: string; lit: number; children: React.ReactNode }> = ({ x, w, color, lit, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: CL.clipY,
      width: w,
      height: CL.clipH,
      borderRadius: 14,
      boxSizing: "border-box",
      background: "#0A0C10",
      border: `1.5px solid ${lit > 0.5 ? color : C.border}`,
      boxShadow: lit > 0 ? `0 0 ${30 * lit}px ${color}33, inset 0 0 ${30 * lit}px ${color}14` : undefined,
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

const Clone: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.cloneIn, TM.cloneIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
  const cnt = prog(t, TM.countA, TM.countB, ease.inOut);
  const sec = Math.floor(cnt * 30 + 1e-6);
  const recording = t >= TM.countA && t < TM.countB + 0.1;
  const recLit = prog(t, TM.countA - 0.1, TM.countA + 0.1) * (1 - prog(t, TM.countB + 0.1, TM.countB + 0.6) * 0.6);
  const arrowDraw = prog(t, TM.send - 0.06, TM.send + 0.3, ease.outQuint);
  const dot = prog(t, TM.send, TM.drawA, ease.inOut);
  const ring = prog(t, TM.send + 0.05, TM.node + 0.18, ease.inOut);
  const ghost = prog(t, TM.node, TM.node + 0.25);
  const fill = prog(t, TM.drawA, TM.drawB, ease.inOut);
  const ready = prog(t, TM.drawB, TM.drawB + 0.2);
  const sweep = prog(t, TM.drawB + 0.1, TM.drawB + 0.9, ease.inOut);
  const consent = springAt(t, TM.consent, { damping: 14, stiffness: 170 });
  const status =
    ready > 0.5 ? (
      <span style={{ color: C.mint }}>● READY</span>
    ) : dot > 0 ? (
      <span style={{ color: C.coral }}>● CLONING</span>
    ) : recording ? (
      <span style={{ color: C.coral }}>● REC</span>
    ) : (
      <span style={{ color: C.dim }}>○ STANDBY</span>
    );
  const waveW = CL.left.w - 48;
  const waveH = 104;
  const arrowY = CL.clipY + CL.clipH / 2;
  const segL = { a: CL.left.x + CL.left.w + 20, b: CL.nodeX - CL.nodeR - 14 };
  const segR = { a: CL.nodeX + CL.nodeR + 14, b: CL.right.x - 20 };
  // 点の位置（左の線 → ノード → 右の線）
  const dotX = dot < 0.45 ? mix(segL.a, segL.b, dot / 0.45) : dot < 0.55 ? CL.nodeX : mix(segR.a, segR.b, (dot - 0.55) / 0.45);
  const dotColor = dot < 0.5 ? C.coral : C.mint;
  return (
    <div
      style={{
        position: "absolute",
        left: CLONE.x,
        top: CLONE.y,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 56}px)`,
      }}
    >
      <Panel
        w={CLONE.w}
        h={CLONE.h}
        header={
          <>
            <span style={{ color: C.text }}>VOICE CLONE</span>
            <span style={{ color: C.dim, fontWeight: 500, letterSpacing: "0.06em" }}>— 30 SEC SAMPLE</span>
          </>
        }
        status={status}
        accent={ready > 0.5 ? C.mint : C.coral}
        glow={ready > 0 ? 0.35 * (1 - prog(t, TM.drawB + 0.2, TM.drawB + 1.2)) : 0}
      >
        {/* 左: SAMPLE */}
        <div style={{ position: "absolute", left: CL.left.x, top: CL.titleY, width: CL.left.w, height: 72, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: recording ? C.red : C.dim,
                boxShadow: recording ? `0 0 10px ${C.red}` : undefined,
              }}
            />
            <IconMic size={30} color={C.coral} sw={1.8} />
            <span style={mono(20, C.text, { letterSpacing: "0.18em" })}>SAMPLE</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 64,
                lineHeight: 1,
                color: cnt > 0 ? C.coral : C.dim,
                fontVariantNumeric: "tabular-nums",
                textShadow: recording ? `0 0 18px ${C.coral}66` : undefined,
              }}
            >
              00:{String(sec).padStart(2, "0")}
            </span>
          </div>
        </div>
        <Clip x={CL.left.x} w={CL.left.w} color={C.coral} lit={recLit}>
          <div style={{ position: "absolute", left: 24, top: (CL.clipH - waveH) / 2 }}>
            <ClipWave width={waveW} height={waveH} color={C.coral} fill={cnt} />
          </div>
          {recording && cnt > 0 && cnt < 1 && (
            <div
              style={{
                position: "absolute",
                left: 24 + waveW * cnt,
                top: 12,
                bottom: 12,
                width: 2,
                background: C.coral,
                boxShadow: `0 0 10px ${C.coral}`,
              }}
            />
          )}
        </Clip>
        {/* 目盛り 0〜30s */}
        <div style={{ position: "absolute", left: CL.left.x + 24, top: CL.clipY + CL.clipH + 12, width: waveW, height: 30 }}>
          {[0, 10, 20, 30].map((s) => (
            <div key={s} style={{ position: "absolute", left: (waveW * s) / 30, top: 0 }}>
              <div style={{ width: 2, height: 8, background: cnt * 30 >= s - 0.01 ? C.coral : C.border, marginLeft: -1 }} />
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: s === 30 ? -40 : s === 0 ? 0 : -12,
                  ...mono(14, C.dim, { fontWeight: 500, letterSpacing: "0.04em" }),
                }}
              >
                {s === 30 ? "30s" : s === 0 ? "0" : s}
              </div>
            </div>
          ))}
        </div>

        {/* 中央: 矢印と CLONE ノード */}
        <svg width={CLONE.w} height={CLONE.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {arrowDraw > 0.01 && (
            <>
              <line x1={segL.a} y1={arrowY} x2={mix(segL.a, segL.b, arrowDraw)} y2={arrowY} stroke={C.borderHi} strokeWidth={2.5} strokeDasharray="6 8" strokeLinecap="round" />
              <line x1={segR.a} y1={arrowY} x2={mix(segR.a, segR.b, arrowDraw)} y2={arrowY} stroke={C.borderHi} strokeWidth={2.5} strokeDasharray="6 8" strokeLinecap="round" />
            </>
          )}
          {arrowDraw > 0.95 && (
            <path d={`M${segR.b - 12} ${arrowY - 10} L${segR.b} ${arrowY} L${segR.b - 12} ${arrowY + 10}`} fill="none" stroke={fill > 0 ? C.mint : C.borderHi} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
          <circle cx={CL.nodeX} cy={arrowY} r={CL.nodeR} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} opacity={arrowDraw} />
          {ring > 0 && (
            <circle
              cx={CL.nodeX}
              cy={arrowY}
              r={CL.nodeR + 8}
              fill="none"
              stroke={C.mint}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * (CL.nodeR + 8) * ring} 9999`}
              transform={`rotate(-90 ${CL.nodeX} ${arrowY})`}
              style={{ filter: `drop-shadow(0 0 5px ${C.mint})` }}
            />
          )}
          {dot > 0 && dot < 1 && (dot < 0.45 || dot > 0.55) && (
            <circle cx={dotX} cy={arrowY} r={7} fill={dotColor} style={{ filter: `drop-shadow(0 0 7px ${dotColor})` }} />
          )}
        </svg>
        <div style={{ position: "absolute", left: CL.nodeX - 20, top: arrowY - 20, opacity: arrowDraw }}>
          <IconCopy size={40} color={ring >= 1 ? C.mint : C.sub} sw={1.7} />
        </div>
        <div style={{ position: "absolute", left: CL.nodeX - 100, width: 200, top: arrowY + CL.nodeR + 16, textAlign: "center", opacity: arrowDraw, ...mono(15, ring >= 1 ? C.mint : C.sub) }}>
          CLONE
        </div>

        {/* 右: YOUR VOICE */}
        <div
          style={{
            position: "absolute",
            left: CL.right.x,
            top: CL.titleY,
            width: CL.right.w,
            height: 72,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            opacity: mix(0.45, 1, ghost),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8 }}>
            <IconUser size={28} color={C.mint} sw={1.9} />
            <span style={mono(20, C.text, { letterSpacing: "0.18em" })}>YOUR VOICE</span>
          </div>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 46, lineHeight: 1, color: fill > 0.98 ? C.text : C.sub, paddingBottom: 4 }}>
            自分の声
          </span>
        </div>
        <Clip x={CL.right.x} w={CL.right.w} color={C.mint} lit={ready * (1 - 0.5 * prog(t, TM.drawB + 0.3, TM.drawB + 1.2))}>
          <div style={{ position: "absolute", left: 24, top: (CL.clipH - waveH) / 2 }}>
            <ClipWave width={waveW} height={waveH} color={C.mint} fill={fill} ghost={ghost} />
          </div>
          {fill > 0 && fill < 1 && (
            <div style={{ position: "absolute", left: 24 + waveW * fill, top: 12, bottom: 12, width: 2, background: C.mint, boxShadow: `0 0 10px ${C.mint}` }} />
          )}
          {/* できた声を一度だけ試聴する再生ヘッド */}
          {sweep > 0 && sweep < 1 && (
            <div
              style={{
                position: "absolute",
                left: 24 + waveW * sweep,
                top: 8,
                bottom: 8,
                width: 2,
                background: C.text,
                opacity: Math.sin(Math.PI * sweep) ** 0.5,
                boxShadow: `0 0 12px ${C.text}`,
              }}
            />
          )}
        </Clip>
        {/* 注記: 本人の同意が必要 */}
        <div
          style={{
            position: "absolute",
            left: CL.right.x,
            top: CL.clipY + CL.clipH + 18,
            height: 48,
            padding: "0 20px 0 14px",
            borderRadius: 12,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: `1.5px solid ${C.coral}77`,
            background: C.coralSoft,
            opacity: clamp01(consent * 2),
            transform: `translateY(${(1 - consent) * 14}px)`,
            transformOrigin: "0 50%",
          }}
        >
          <IconLock size={26} color={C.coral} sw={2} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.text, whiteSpace: "nowrap" }}>本人の同意が必要</span>
          <span style={mono(13, C.sub, { letterSpacing: "0.14em", marginLeft: 4 })}>CONSENT REQUIRED</span>
        </div>
      </Panel>
    </div>
  );
};

// ───────── 本体 ─────────
export const T3Dialogue: React.FC = () => {
  const t = useTime();
  // 縮む（右上を支点）→ 見出しの右に抜けてから上がる、の 2 段
  const sp = prog(t, TM.shrinkA, TM.shrinkA + 0.5, ease.inOut);
  const lift = prog(t, TM.shrinkA + 0.3, TM.shrinkA + 0.68, ease.inOut);
  const s = mix(1, SHRINK.s, sp);
  const ty = mix(0, SHRINK.top - MIX_Y, lift);
  return (
    <SceneShell id="t3">
      {/* ミキサー一式（t3-5 で右上へ縮む） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: `${1920 - PAD_X}px ${MIX_Y}px`,
          transform: `translateY(${ty}px) scale(${s})`,
          opacity: mix(1, 0.55, sp),
        }}
      >
        <Cables t={t} layer="under" />
        <Strip t={t} side="A" />
        <Strip t={t} side="B" />
        <Sheet t={t} />
        <Cables t={t} layer="over" />
        <Duo t={t} />
        <Avatars t={t} />
      </div>
      <Headline t={t} />
      <Clone t={t} />

      <Sfx at={TM.duo} name="pop" volume={0.16} />
      <Sfx at={TM.duo + 0.12} name="pop" volume={0.13} />
      <Sfx at={TM.typeA} name="type" volume={0.14} />
      <Sfx at={TM.plug} name="click" volume={0.22} />
      <Sfx at={TM.arrive} name="tick" volume={0.2} />
      <Sfx at={TM.countA} name="tick" volume={0.16} />
      <Sfx at={TM.drawB} name="chime" volume={0.16} />
      <Sfx at={TM.consent} name="click" volume={0.15} />
    </SceneShell>
  );
};
