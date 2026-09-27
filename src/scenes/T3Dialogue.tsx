/*
 * TRACK 03 — 「ふたり同時収録」（見出しは section("t3").title をそのまま使う）
 *
 * コンセプト: 深夜ラジオの台本 1 枚と、2 トラックのセッション。役名を書き分けた台本を渡し、
 * REC キーを 1 回押すだけで CH 1（DJ・コーラル）と CH 2（GUEST・ミント）が同じテイクで同時に回る。
 * 「1 テイク・2 つの声」= プレイヘッド 1 本・REC ランプ 1 つ・「TAKE 1 · 2 VOICES」の表示。
 * 話者の丸・A/B の文字・台本が分岐するカード・声のコピーの話はここでは出さない。
 *
 * 絵コンテ（すべてナレーションの行・行内のフレーズ・シーン境界から計算。秒は直書きしない）
 *  B0  enter    テープが抜けはじめると、左上の見出し（「同時」だけコーラル。t3-1 の間は 1.3 倍）が 1 文字ずつせり上がり、
 *               画面の中ほどに 2 トラックのセッション卓の枠（SESSION · STANDBY）がせり上がる。
 *  B1  t3-1     「ふたりの」（音声の間から検出）… CH 1 / CH 2 のレーンと目盛りが上から順に引かれる（役名の札は「ROLE ?」の空き）。
 *               「同時収録」… 左に 1 つだけの REC キーがばねで現れ、そこから括弧の点線が「横棒 → 母線 → 2 本の枝」の順に
 *               2 つの ARM ランプへ伸びる。プレイヘッドは 1 本、先頭で待機（グレー）。
 *  B2  t3-2 前半 t3-1 と t3-2 の間で卓が下へ収まり、見出しも等倍へ。空いた中段に深夜ラジオの台本（late_night_radio.txt）と
 *               TAKE 表示（消灯した REC ランプ・STANDBY）がせり上がる。
 *               「役を」で 1 行目の役名「DJ:」が打たれて蛍光ペンが引かれ、同時に CH 1 に「DJ」のテープが落ちて貼られる。
 *               「書き分け」で 2 行目の「GUEST:」→ CH 2 に「GUEST」のテープ。台詞が打ち込まれ、行末に「→ CH 1 / → CH 2」。
 *  B3  t3-2 後半 「ふたりの声が」… REC キーのまわりに輪が 2 本続けて広がる（押す合図）。
 *               「一度に」… REC キーを 1 回押す（カチッ）。括弧が実線のコーラルになって信号が 2 本の枝へ同時に走り、
 *               2 つの ARM ランプが同じフレームで点灯。REC ランプが点き、卓は ROLLING · CH 1 + CH 2、プレイヘッドが走り出す。
 *               両方のレーンに同じ頭・同じ長さの TAKE 1 のクリップが同時に伸びていく（無音の間は平らな線）。
 *               「録れます」… TAKE 表示の「2 VOICES」が灯る。
 *  B4  t3-3     DJ が話す: 台本の DJ 行が点灯（読み進みバー）、CH 1 のクリップに t3-3 の実際の声（LEVELS）の棒が録られ、
 *               CH 1 のメーターが振れる。CH 2 は同じテイクで平らな線のまま回り続ける（一歩下がる）。TAKE 表示の DJ の点が灯る。
 *  B5  t3-4     GUEST が話す: 同じテイクの続きで CH 2 に声が録られ、CH 2 のメーターが振れる。GUEST の点も灯る。
 *               「……え、」… 2 本のクリップをまとめてコーラルの枠が囲み、「TAKE 1 · 2 VOICES」の札が立つ
 *               （次のテープは t3-4 の直後に入るので、締めは行の中で見せる）。
 *               「お邪魔します。」… REC ランプが一度大きく脈打つ（ずっと回っていた）。回ったまま次のテープへ。
 */
import React from "react";
import { SceneShell } from "../components/SceneShell";
import { Panel } from "../components/Panel";
import { VUMeter } from "../components/Meters";
import { Sfx } from "../components/Sfx";
import { C, DISPLAY, FONT, FPS, MONO, PAD_X, VOICE_TAG } from "../theme";
import { line, section, sceneEnter, sceneExit } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { RecKey, TapeLabel, envAt, smoothRms } from "./T3Dialogue/parts";
import { phrases } from "./T3Dialogue/timing";

// ───────── タイミング（すべて行・行内のフレーズ・シーン境界から計算） ─────────
const E = sceneEnter("t3");
const X = sceneExit("t3");
const L1 = line("t3-1");
const L2 = line("t3-2");
const L3 = line("t3-3");
const L4 = line("t3-4");
const [, P1b] = phrases("t3-1", [0.3]); // つぎは、 / ふたりの同時収録。
const [P2a, P2b] = phrases("t3-2", [0.45]); // 台本に役を書き分けておけば、 / ふたりの声が一度に録れます。
const [, P4b, P4c] = phrases("t3-4", [0.24, 0.62]); // どうも。 / こんな時間に、 / お邪魔します。

const ROLE1 = Math.max(L2.start + 0.3, E + 1.2); // 「役を」
const ROLE2 = Math.max(ROLE1 + 0.5, mix(P2a.start, P2a.end, 0.5)); // 「書き分け」
const PRESS = mix(P2b.start, P2b.end, 0.44); // 「一度に」
const TM = {
  headIn: E + 0.3, // テープが抜けはじめるころ
  recIn: E + 0.3,
  lane1: Math.max(E + 0.45, P1b.start - 0.08), // 「ふたりの」
  lane2: Math.max(E + 0.57, P1b.start + 0.06),
  key: Math.max(E + 0.8, mix(P1b.start, P1b.end, 0.38)), // 「同時収録」
  settle: Math.max(L1.end - 0.15, L2.start - 0.5), // t3-1 と t3-2 の間で卓が下へ収まる
  sheetIn: L2.start - 0.1,
  boxIn: L2.start + 0.04,
  role: [ROLE1, ROLE2],
  ready: Math.max(P2b.start, PRESS - 0.72), // 「ふたりの声が」
  press: PRESS,
  voices: Math.max(PRESS + 0.35, mix(P2b.start, P2b.end, 0.78)), // 「録れます」
  wrap: Math.max(L4.start + 0.5, P4b.start), // 「こんな時間に、」（次のテープは t3-4 の直後に来るので、行の中で締める）
  honban: P4c.start + 0.2, // 「お邪魔します。」
};
const T0 = TM.press + 0.08; // テイクの頭（プレイヘッドが走り出す）

// ───────── レイアウト ─────────
const HEAD = { x: PAD_X, y: 156, size: 88 };
const HEAD_BIG = 1.3;
// 中段: 台本（左）と TAKE 表示（右）
const SHEET = { x: PAD_X, y: 320, w: 1076, h: 222 };
const BOX = { x: PAD_X + 1076 + 32, y: 320, w: 1920 - PAD_X * 2 - 1076 - 32, h: 222 };
// 下段: 2 トラックのセッション卓。t3-1 の間は RAISE だけ上（画面の中ほど）にいて、t3-2 の頭で収まる
const REC = { x: PAD_X, y: 574, w: 1920 - PAD_X * 2, h: 290 };
const RAISE = 138;
// 卓の中の座標（卓の左上が原点）
const RULER = { y: 64, h: 24 };
const LANE_H = 84;
const LANE_Y = [98, 192];
const LANE_CY = LANE_Y.map((y) => y + LANE_H / 2);
const KEY = { x: 24, size: 132 };
const KEY_Y = (LANE_Y[0] + LANE_Y[1] + LANE_H) / 2 - KEY.size / 2;
const BUS_X = KEY.x + KEY.size + 24;
const LED_X = BUS_X + 26;
const HDR_X = LED_X + 26; // 「CH 1」と役名のテープ
const METER_X = 408;
const LANE_X = 446;
const LANE_W = REC.w - LANE_X - 24;
// 時間 → レーンの x（テイクの頭 T0 が左端。シーンの終わりでちょうど 95% まで進む）
const PXS = (LANE_W * 0.95) / Math.max(1, X - T0);
const TAG_W = 214; // 「TAKE 1 · 2 VOICES」の札のおおよその幅
const xAt = (time: number) => LANE_X + (time - T0) * PXS;

// ───────── 役（台本の voice から。字幕の札と同じ名前・色） ─────────
type Role = { id: string; name: string; color: string; soft: string; ch: number; tapeW: number };
const role = (id: string, ch: number): Role => {
  const v = line(id).voice;
  const tag = VOICE_TAG[v];
  const name = tag?.label ?? v.toUpperCase();
  const color = tag?.color ?? (ch === 1 ? C.coral : C.mint);
  return { id, name, color, soft: color === C.coral ? C.coralSoft : C.mintSoft, ch, tapeW: 40 + name.length * 22 };
};
const ROLES: Role[] = [role("t3-3", 1), role("t3-4", 2)];

// 話している度合い（0〜1）
const actOf = (i: number, t: number) => {
  const L = line(ROLES[i].id);
  return prog(t, L.start - 0.14, L.start + 0.1) * (1 - prog(t, L.end + 0.06, L.end + 0.36));
};
// もう一方が話しているあいだ、こちらは一歩下がる
const dimOf = (i: number, t: number) => actOf(1 - i, t);

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
const TITLE = section("t3").title || "ふたり同時収録";
const EMPH = ["同時", "ふたり"];
const emphMask = (s: string) => {
  const chars = [...s];
  const w = EMPH.find((k) => s.includes(k));
  const i = w ? s.indexOf(w) : -1;
  return chars.map((_, k) => i >= 0 && k >= i && k < i + (w ?? "").length);
};

const Headline: React.FC<{ t: number }> = ({ t }) => {
  const chars = [...TITLE];
  const mask = emphMask(TITLE);
  const lab = prog(t, TM.headIn + 0.2, TM.headIn + 0.65, ease.outQuint);
  const rule = prog(t, TM.headIn + 0.15, TM.headIn + 0.75, ease.outQuint);
  // t3-1 の間は少し大きく、台本が入るときに卓と一緒に収まる
  const s = mix(HEAD_BIG, 1, prog(t, TM.settle, TM.settle + 0.65, ease.inOut));
  return (
    <div style={{ position: "absolute", left: HEAD.x, top: HEAD.y, transformOrigin: "0 0", transform: `scale(${s})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 24, marginBottom: 10 }}>
        <div style={{ width: 40 * rule, height: 3, background: C.coral, borderRadius: 2 }} />
        <div style={{ ...mono(20, C.sub), letterSpacing: "0.2em", opacity: lab, transform: `translateX(${(1 - lab) * -12}px)` }}>
          <span style={{ color: C.coral }}>03</span> — MULTI-SPEAKER SESSION
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: HEAD.size, lineHeight: 1.1, letterSpacing: "0.02em" }}>
        {chars.map((ch, i) => {
          const p = prog(t, TM.headIn + i * 0.035, TM.headIn + i * 0.035 + 0.5, ease.outQuint);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 4 }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: mask[i] ? C.coral : C.text }}>
                {ch}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ───────── 中段左: 深夜ラジオの台本 ─────────
const ROW = { top: 74, h: 64, gap: 8, numX: 26, roleX: 66, textX: 232, fs: 32 };
const typeSpan = (i: number) => ({ roleA: TM.role[i], roleB: TM.role[i] + 0.12, textA: TM.role[i] + 0.2, textB: TM.role[i] + 0.72 });

const Sheet: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.sheetIn, TM.sheetIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const writing = t >= TM.role[0] - 0.1 && t < typeSpan(1).textB + 0.1;
  const status = writing ? <span style={{ color: C.coral }}>● WRITING</span> : <span style={{ color: C.sub }}>2 ROLES</span>;
  return (
    <div style={{ position: "absolute", left: SHEET.x, top: SHEET.y, opacity: inP, transform: `translateY(${(1 - inP) * 24}px)` }}>
      <Panel
        w={SHEET.w}
        h={SHEET.h}
        header={
          <>
            <span style={{ color: C.text }}>SCRIPT</span>
            <span style={{ color: C.dim, fontWeight: 500, letterSpacing: "0.06em" }}>late_night_radio.txt</span>
          </>
        }
        status={status}
      >
        {ROLES.map((r, i) => {
          const sp = typeSpan(i);
          const L = line(r.id);
          const roleChars = [...(r.name + ":")];
          const roleShown = Math.floor(roleChars.length * clamp01((t - sp.roleA) / (sp.roleB - sp.roleA)) + 1e-6);
          const text = [...L.text];
          const shown = Math.floor(text.length * clamp01((t - sp.textA) / (sp.textB - sp.textA)) + 1e-6);
          const mark = prog(t, sp.roleA + 0.06, sp.roleA + 0.36, ease.outQuint); // 蛍光ペン
          const act = actOf(i, t);
          const dim = dimOf(i, t);
          const talk = prog(t, L.start, L.end, ease.linear);
          const done = prog(t, L.end + 0.05, L.end + 0.35);
          const route = prog(t, sp.roleA + 0.3, sp.roleA + 0.6, ease.outQuint);
          const caretOn = t >= sp.roleA - 0.05 && t < sp.textB + 0.1;
          const y0 = ROW.top + (ROW.h + ROW.gap) * i;
          const textW = text.reduce((a, ch) => a + (/[、。！？]/.test(ch) ? ROW.fs * 0.9 : ROW.fs), 0);
          const nameW = roleChars.length * 16 + 8;
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: y0, width: SHEET.w, height: ROW.h, opacity: mix(1, 0.5, dim) }}>
              {act > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    top: 0,
                    bottom: 0,
                    borderRadius: 12,
                    background: r.soft,
                    opacity: act,
                    boxShadow: `inset 4px 0 0 ${r.color}`,
                  }}
                />
              )}
              <div style={{ position: "absolute", left: ROW.numX, top: ROW.h / 2 - 10, ...mono(15, C.dim, { fontWeight: 500, letterSpacing: "0.04em" }) }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* 役名（書いた瞬間に蛍光ペン） */}
              <div
                style={{
                  position: "absolute",
                  left: ROW.roleX - 6,
                  top: ROW.h / 2 - 17,
                  width: nameW * mark,
                  height: 34,
                  borderRadius: 6,
                  background: r.color,
                  opacity: 0.22 + 0.1 * act,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: ROW.roleX,
                  top: ROW.h / 2 - 13,
                  ...mono(22, r.color, { letterSpacing: "0.08em", lineHeight: "26px" }),
                }}
              >
                {roleChars.slice(0, roleShown).join("")}
              </div>
              {/* 台詞 */}
              <div
                style={{
                  position: "absolute",
                  left: ROW.textX,
                  top: ROW.h / 2 - ROW.fs * 0.7,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: ROW.fs,
                  lineHeight: `${ROW.fs * 1.4}px`,
                  color: done > 0.5 && act < 0.5 ? C.sub : C.text,
                  whiteSpace: "nowrap",
                }}
              >
                {text.slice(0, shown).join("")}
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: ROW.fs * 1.02,
                    marginLeft: 4,
                    verticalAlign: -ROW.fs * 0.16,
                    borderRadius: 2,
                    background: C.coral,
                    opacity: caretOn ? 1 : 0,
                  }}
                />
              </div>
              {/* 読み進みバー */}
              {act > 0 && (
                <div style={{ position: "absolute", left: ROW.textX, top: ROW.h - 9, width: textW, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", opacity: act }}>
                  <div style={{ width: textW * talk, height: 3, borderRadius: 2, background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                </div>
              )}
              {/* 行き先のチャンネル */}
              <div
                style={{
                  position: "absolute",
                  right: 26,
                  top: ROW.h / 2 - 10,
                  ...mono(16, act > 0.5 ? r.color : C.sub, { lineHeight: "20px" }),
                  opacity: route,
                  transform: `translateX(${(1 - route) * -10}px)`,
                }}
              >
                <span style={{ color: act > 0.5 ? r.color : C.dim }}>→</span> CH {r.ch}
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

// ───────── 中段右: TAKE 表示（REC ランプは 1 つだけ） ─────────
const tc = (sec: number) => {
  const s = Math.max(0, sec);
  const f = Math.floor((s % 1) * FPS);
  return `00:${String(Math.floor(s)).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

const TakeBox: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.boxIn, TM.boxIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const on = prog(t, TM.press, TM.press + 0.12);
  const flash = t >= TM.press ? 1 - prog(t, TM.press, TM.press + 0.8) : 0;
  const hb = prog(t, TM.honban, TM.honban + 0.9, ease.out); // 「お邪魔します。」
  const hbBump = Math.sin(Math.PI * prog(t, TM.honban, TM.honban + 0.45, ease.out));
  const lab = prog(t, TM.voices, TM.voices + 0.45, ease.outQuint);
  const LAMP = { cx: 94, cy: 56 + 83, r: 50 };
  const status =
    on > 0.5 ? (
      <span style={{ color: C.coral, fontVariantNumeric: "tabular-nums" }}>{tc(t - T0)}</span>
    ) : (
      <span style={{ color: C.dim }}>STANDBY</span>
    );
  return (
    <div style={{ position: "absolute", left: BOX.x, top: BOX.y, opacity: inP, transform: `translateY(${(1 - inP) * 24}px)` }}>
      <Panel w={BOX.w} h={BOX.h} header={<span style={{ color: on > 0.5 ? C.text : C.sub }}>TAKE</span>} status={status} glow={flash * 0.6}>
        {/* REC ランプ */}
        <svg width={BOX.w} height={BOX.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {hb > 0 && hb < 1 && (
            <>
              <circle cx={LAMP.cx} cy={LAMP.cy} r={LAMP.r + 6 + 34 * hb} fill="none" stroke={C.red} strokeWidth={2.5} opacity={0.8 * (1 - hb)} />
              <circle cx={LAMP.cx} cy={LAMP.cy} r={LAMP.r + 4 + 18 * hb} fill="none" stroke={C.red} strokeWidth={1.5} opacity={0.5 * (1 - hb)} />
            </>
          )}
          <circle cx={LAMP.cx} cy={LAMP.cy} r={LAMP.r + 8} fill="#0A0C10" stroke={C.border} strokeWidth={1.5} />
          <circle
            cx={LAMP.cx}
            cy={LAMP.cy}
            r={LAMP.r * (1 + 0.06 * hbBump)}
            fill={on > 0.02 ? `rgba(255,59,48,${0.18 + 0.82 * on})` : "#241416"}
            stroke={on > 0.5 ? "#FF7A70" : "#4A2226"}
            strokeWidth={2}
            style={on > 0.3 ? { filter: `drop-shadow(0 0 ${14 + 16 * flash + 18 * hbBump}px ${C.red})` } : undefined}
          />
          {on > 0.3 && <ellipse cx={LAMP.cx - 14} cy={LAMP.cy - 18} rx={16} ry={9} fill="rgba(255,255,255,0.28)" />}
        </svg>
        <div
          style={{
            position: "absolute",
            left: LAMP.cx - 60,
            width: 120,
            top: LAMP.cy - 11,
            textAlign: "center",
            ...mono(20, on > 0.5 ? C.text : "#5A3035", { letterSpacing: "0.14em", marginRight: "-0.14em", lineHeight: "22px" }),
          }}
        >
          REC
        </div>
        {/* TAKE 1 · 2 VOICES */}
        <div style={{ position: "absolute", left: 186, top: 76 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, fontFamily: DISPLAY, fontSize: 64, lineHeight: "72px", color: on > 0.5 ? C.text : C.dim, whiteSpace: "nowrap" }}>
            <span>TAKE</span>
            <span style={{ color: on > 0.5 ? C.coral : C.dim }}>1</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, opacity: mix(0.35, 1, lab) }}>
            {ROLES.map((r, i) => {
              const L = line(r.id);
              const got = prog(t, L.start + 0.2, L.start + 0.5);
              return (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    boxSizing: "border-box",
                    border: `2px solid ${r.color}`,
                    background: `rgba(${r.color === C.coral ? "255,106,61" : "59,227,180"},${got})`,
                    boxShadow: got > 0.5 ? `0 0 10px ${r.color}` : undefined,
                  }}
                />
              );
            })}
            <span style={{ ...mono(24, lab > 0.5 ? C.text : C.dim, { letterSpacing: "0.14em" }), marginLeft: 6, transform: `translateX(${(1 - lab) * -8}px)` }}>
              <span style={{ color: lab > 0.5 ? C.coral : C.dim }}>2</span> VOICES
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ───────── 下段: 2 トラックのセッション卓 ─────────
const BARS = ROLES.map((r) => smoothRms(r.id));

const Recorder: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.recIn, TM.recIn + 0.6, ease.outQuint);
  if (inP <= 0) return null;
  const settle = prog(t, TM.settle, TM.settle + 0.65, ease.inOut);
  const dy = mix(-RAISE, 0, settle) + (1 - inP) * 50;
  const keyPop = springAt(t, TM.key, { damping: 12, stiffness: 190 });
  const bracketDraw = prog(t, TM.key + 0.12, TM.key + 0.55, ease.inOut);
  const pressed = t >= TM.press;
  const push = pressed ? Math.sin(Math.PI * prog(t, TM.press - 0.04, TM.press + 0.2)) : 0;
  const on = prog(t, TM.press, TM.press + 0.1);
  // 押す合図: キーのまわりに輪が 2 本、続けて広がる
  const ring1 = prog(t, TM.ready, TM.ready + 0.42);
  const ready = ring1 < 1 ? ring1 : prog(t, TM.ready + 0.3, TM.ready + 0.72);
  const sig = prog(t, TM.press, TM.press + 0.28, ease.out); // 括弧を走る信号
  const rolling = t >= T0;
  const phX = xAt(Math.min(Math.max(t, T0), X));
  const wrap = prog(t, TM.wrap, TM.wrap + 0.5, ease.inOut);
  const wrapTag = springAt(t, TM.wrap + 0.3, { damping: 13, stiffness: 200 });

  const status = rolling ? (
    <span style={{ color: C.coral }}>ROLLING · CH 1 + CH 2</span>
  ) : (
    <span style={{ color: C.dim }}>STANDBY</span>
  );

  // 括弧（キー → 母線 → 2 つの ARM ランプ）。p: 0→1 で キーの横棒 → 母線が上下へ → 2 本の枝 の順に伸びる
  const midY = (LANE_CY[0] + LANE_CY[1]) / 2;
  const bracket = (p: number) => {
    const a = clamp01(p / 0.3);
    const b = clamp01((p - 0.3) / 0.4);
    const c = clamp01((p - 0.7) / 0.3);
    const x0 = KEY.x + KEY.size;
    const segs: [number, number, number, number][] = [];
    if (a > 0) segs.push([x0, midY, mix(x0, BUS_X, a), midY]);
    if (b > 0) segs.push([BUS_X, mix(midY, LANE_CY[0], b), BUS_X, mix(midY, LANE_CY[1], b)]);
    if (c > 0) LANE_CY.forEach((y) => segs.push([BUS_X, y, mix(BUS_X, LED_X - 13, c), y]));
    return segs;
  };

  // 目盛り（テイクの頭から 0.5 秒ごと）
  const ticks: number[] = [];
  for (let s = 0; T0 + s <= T0 + LANE_W / PXS; s += 0.5) ticks.push(s);

  const laneIn = (i: number) => prog(t, i === 0 ? TM.lane1 : TM.lane2, (i === 0 ? TM.lane1 : TM.lane2) + 0.55, ease.outQuint);

  return (
    <div style={{ position: "absolute", left: REC.x, top: REC.y, opacity: inP, transform: `translateY(${dy}px)` }}>
      <Panel
        w={REC.w}
        h={REC.h}
        header={
          <>
            <span style={{ color: C.text }}>SESSION</span>
            <span style={{ color: C.dim, fontWeight: 500, letterSpacing: "0.06em" }}>2 TRACKS</span>
          </>
        }
        status={status}
      >
        {/* 目盛り */}
        <div style={{ position: "absolute", left: LANE_X, top: RULER.y, width: LANE_W, height: RULER.h, opacity: laneIn(0) }}>
          {ticks.map((s) => {
            const x = s * PXS;
            const major = Math.abs(s - Math.round(s)) < 1e-6;
            return (
              <React.Fragment key={s}>
                <div style={{ position: "absolute", left: x, top: major ? 6 : 14, width: 1.5, height: major ? RULER.h - 6 : RULER.h - 14, background: major ? C.borderHi : C.border }} />
                {major && (
                  <div
                    style={{
                      position: "absolute",
                      left: x + 6,
                      top: 2,
                      ...mono(13, C.dim, { fontWeight: 500, letterSpacing: "0.06em", lineHeight: "14px" }),
                      // 「TAKE 1 · 2 VOICES」の札の下に隠れる目盛りの数字は消す
                      opacity: LANE_X + x < xAt(T0) + TAG_W ? 1 - clamp01(wrapTag * 2) : 1,
                    }}
                  >
                    0:{String(Math.round(s)).padStart(2, "0")}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* REC キーの上の小さな注記 */}
        <div
          style={{
            position: "absolute",
            left: KEY.x,
            width: KEY.size,
            top: RULER.y + 2,
            textAlign: "center",
            ...mono(13, on > 0.5 ? C.coral : C.dim, { letterSpacing: "0.12em", lineHeight: "16px" }),
            opacity: clamp01(keyPop * 2),
          }}
        >
          CH 1 + 2
        </div>

        {/* レーン */}
        {ROLES.map((r, i) => {
          const ly = LANE_Y[i];
          const lIn = laneIn(i);
          if (lIn <= 0) return null;
          const tapeStick = springAt(t, TM.role[i] + 0.12, { damping: 12, stiffness: 210 });
          const act = actOf(i, t);
          const dim = dimOf(i, t);
          const armed = prog(t, TM.press + 0.22, TM.press + 0.3);
          const L = line(r.id);
          const env = envAt(r.id, t) * act;
          const clipR = Math.max(xAt(T0), phX);
          const bars = BARS[i];
          const bw = Math.max(2, Math.min(4, PXS / FPS - 2));
          const clipTop = ly + 4;
          const clipH = LANE_H - 8;
          const barTop = clipTop + 20;
          const barH = clipH - 24;
          return (
            <React.Fragment key={i}>
              {/* ARM ランプ */}
              <div
                style={{
                  position: "absolute",
                  left: LED_X - 13,
                  top: LANE_CY[i] - 13,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  boxSizing: "border-box",
                  border: `2px solid ${armed > 0.5 ? C.red : C.borderHi}`,
                  background: armed > 0.5 ? C.red : "#0A0C10",
                  boxShadow: armed > 0.5 ? `0 0 ${12 + 10 * (1 - prog(t, TM.press + 0.3, TM.press + 1))}px ${C.red}` : undefined,
                  opacity: lIn,
                }}
              />
              {/* CH 番号と役名のテープ */}
              <div style={{ position: "absolute", left: HDR_X, top: ly + 6, opacity: lIn * mix(1, 0.5, dim), transform: `translateX(${(1 - lIn) * -16}px)` }}>
                <div style={mono(14, act > 0.5 ? C.text : C.sub, { lineHeight: "18px" })}>CH {r.ch}</div>
              </div>
              {tapeStick <= 0.01 && (
                <div
                  style={{
                    position: "absolute",
                    left: HDR_X,
                    top: ly + 32,
                    width: r.tapeW,
                    height: 38,
                    borderRadius: 6,
                    boxSizing: "border-box",
                    border: `1.5px dashed ${C.borderHi}`,
                    opacity: lIn * 0.8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...mono(12, C.dim, { letterSpacing: "0.12em" }),
                  }}
                >
                  ROLE ?
                </div>
              )}
              <TapeLabel x={HDR_X} y={ly + 32} w={r.tapeW} h={38} text={r.name} color={r.color} stick={tapeStick} seed={7 + i * 31} rot={i === 0 ? -2 : 1.5} dim={dim} />
              {/* メーター */}
              <div style={{ position: "absolute", left: METER_X, top: ly + 6, opacity: lIn * mix(1, 0.45, dim) }}>
                <VUMeter width={18} height={LANE_H - 12} segments={12} value={Math.min(1, env * 1.35)} />
              </div>

              {/* レーンの地 */}
              <div
                style={{
                  position: "absolute",
                  left: LANE_X,
                  top: ly,
                  width: LANE_W * lIn,
                  height: LANE_H,
                  borderRadius: 10,
                  background: "#0A0C10",
                  boxShadow: `inset 0 0 0 1px ${C.border}`,
                }}
              />
              <svg width={REC.w} height={REC.h} style={{ position: "absolute", left: 0, top: 0 }}>
                {ticks
                  .filter((s) => s > 0 && s * PXS < LANE_W * lIn - 4)
                  .map((s) => (
                    <line
                      key={s}
                      x1={LANE_X + s * PXS}
                      x2={LANE_X + s * PXS}
                      y1={ly + 1}
                      y2={ly + LANE_H - 1}
                      stroke="#FFFFFF"
                      strokeOpacity={Math.abs(s - Math.round(s)) < 1e-6 ? 0.05 : 0.025}
                      strokeWidth={1}
                    />
                  ))}
              </svg>
              {/* 録音中のクリップ（2 本とも同じテイク・同じ長さ） */}
              {rolling && (
                <div
                  style={{
                    position: "absolute",
                    left: xAt(T0),
                    top: clipTop,
                    width: Math.max(2, clipR - xAt(T0)),
                    height: clipH,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: r.soft,
                    boxShadow: `inset 0 0 0 1.5px ${r.color}${act > 0.5 ? "" : "99"}`,
                    opacity: mix(1, 0.55, dim),
                  }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 18, background: r.color, opacity: 0.9 }} />
                  <div style={{ position: "absolute", left: 10, top: 1, ...mono(12, C.ink, { letterSpacing: "0.12em", lineHeight: "16px" }) }}>
                    TAKE 1 · {r.name}
                  </div>
                </div>
              )}
              {rolling && (
                <svg width={REC.w} height={REC.h} style={{ position: "absolute", left: 0, top: 0, opacity: mix(1, 0.55, dim) }}>
                  {/* 無音の間も回っている平らな線 */}
                  <line x1={xAt(T0) + 4} y1={barTop + barH / 2} x2={clipR} y2={barTop + barH / 2} stroke={r.color} strokeWidth={2} opacity={0.55} />
                  {/* 実際の声の棒 */}
                  {bars.map((v, k) => {
                    const tk = L.start + k / FPS;
                    if (tk > t) return null;
                    const h = Math.max(2, Math.min(1, v * 1.7) * barH);
                    return <rect key={k} x={xAt(tk) - bw / 2} y={barTop + (barH - h) / 2} width={bw} height={h} rx={bw / 2} fill={r.color} />;
                  })}
                </svg>
              )}
            </React.Fragment>
          );
        })}

        {/* REC キーと括弧 */}
        <svg width={REC.w} height={REC.h} style={{ position: "absolute", left: 0, top: 0 }}>
          {bracket(bracketDraw).map(([x1, y1, x2, y2], k) => (
            <line key={`d${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.borderHi} strokeWidth={2.5} strokeDasharray="5 5" opacity={1 - on} />
          ))}
          {on > 0 && (
            <g style={{ filter: `drop-shadow(0 0 6px ${C.coral})` }}>
              {bracket(sig).map(([x1, y1, x2, y2], k) => (
                <line key={`s${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.coral} strokeWidth={3} strokeLinecap="square" />
              ))}
            </g>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            left: KEY.x,
            top: KEY_Y,
            opacity: clamp01(keyPop * 2),
            transform: `scale(${mix(0.6, 1, keyPop)})`,
          }}
        >
          <RecKey size={KEY.size} push={push} on={on} ready={t < TM.press ? ready : 0} />
        </div>

        {/* 2 本をまとめる枠（1 テイク = 2 つの声） */}
        {wrap > 0 && (
          <svg width={REC.w} height={REC.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {(() => {
              const x0 = xAt(T0) - 8;
              const x1 = phX + 8;
              const y0 = LANE_Y[0] - 6;
              const y1 = LANE_Y[1] + LANE_H + 6;
              const per = 2 * (x1 - x0 + y1 - y0);
              return (
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  rx={14}
                  fill="none"
                  stroke={C.coral}
                  strokeWidth={2.5}
                  strokeDasharray={`${per * wrap} ${per}`}
                />
              );
            })()}
          </svg>
        )}
        {wrapTag > 0 && (
          <div
            style={{
              position: "absolute",
              left: xAt(T0) - 8,
              top: RULER.y - 2,
              height: 26,
              padding: "0 12px",
              borderRadius: 6,
              background: C.coral,
              display: "flex",
              alignItems: "center",
              ...mono(14, C.ink, { lineHeight: "26px" }),
              opacity: clamp01(wrapTag * 2),
              transform: `scale(${mix(0.7, 1, wrapTag)})`,
              transformOrigin: "0 100%",
            }}
          >
            TAKE 1 · 2 VOICES
          </div>
        )}

        {/* プレイヘッド（1 本だけ。2 本のレーンをまたぐ） */}
        {laneIn(1) > 0 && (
          <div style={{ position: "absolute", left: phX - 1, top: RULER.y - 2, opacity: laneIn(1) }}>
            <svg width={18} height={12} style={{ position: "absolute", left: -8, top: 0, overflow: "visible" }}>
              <path d="M0 0 H18 L9 11 Z" fill={rolling ? C.coral : C.sub} />
            </svg>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 8,
                width: 2.5,
                height: LANE_Y[1] + LANE_H - RULER.y + 2,
                background: rolling ? C.coral : C.sub,
                opacity: rolling ? 1 : 0.6,
                boxShadow: rolling ? `0 0 10px ${C.coral}` : undefined,
              }}
            />
          </div>
        )}
      </Panel>
    </div>
  );
};

export const T3Dialogue: React.FC = () => {
  const t = useTime();
  return (
    <SceneShell id="t3">
      <Recorder t={t} />
      <Sheet t={t} />
      <TakeBox t={t} />
      <Headline t={t} />
      <Sfx at={TM.key} name="tick" volume={0.16} />
      <Sfx at={TM.role[0]} name="type" volume={0.12} />
      <Sfx at={TM.role[0] + 0.14} name="pop" volume={0.16} />
      <Sfx at={TM.role[1] + 0.14} name="pop" volume={0.16} />
      <Sfx at={TM.press} name="click" volume={0.3} />
    </SceneShell>
  );
};
