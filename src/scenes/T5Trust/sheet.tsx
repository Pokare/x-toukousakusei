// TRACK 05: 放送前の QC シート（クリップボード）。行 01 = 電子透かし、行 02 = 声での同意。
// 行はアコーディオン式に開閉する: いま点検している行だけが大きく開き、点検が済むと判子を残して畳まれる。
import React from "react";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../../theme";
import { clamp01, ease, mix, prog, rand } from "../../time";
import { CheckDraw, ClipboardClip, Stamp, StampSlot, clipShape, envAt, mixHex, mono, rmsAt } from "./parts";
import { TM } from "./timing";

// ───────── 配置 ─────────
export const SHEET = { x: PAD_X, y: 316, w: 1920 - PAD_X * 2 };
const TOP_H = 60; // シート名の帯
const COLS_H = 34; // 列見出し
const ROWS_Y = TOP_H + COLS_H;
const RI = 170; // 点検前（t5-1）の行
const RC = 128; // 畳んだ行
const RE = 326; // 開いた行（シートの下端 = 316 + 94 + 128 + 326 = 864）
const COL = { no: 0, item: 104, check: 452, sign: 1392 };
const CW = COL.sign - COL.check; // CHECK 列の幅
const SIGN_CX = (COL.sign + SHEET.w) / 2;

// ───────── 行の開き具合 ─────────
const rowState = (t: number) => {
  const open1 = prog(t, TM.open1, TM.open1 + 0.55, ease.inOut);
  const swap = prog(t, TM.swap, TM.swap + 0.55, ease.inOut);
  const ex1 = open1 - swap;
  const ex2 = swap;
  // 点検前は 2 行とも RI。行 01 が開くと 02 は畳まれ、入れ替わりで 01 が畳まれて 02 が開く
  const h1 = swap > 0 ? mix(RE, RC, swap) : mix(RI, RE, open1);
  const h2 = swap > 0 ? mix(RC, RE, swap) : mix(RI, RC, open1);
  return { ex1, ex2, h1, h2, swap };
};

// ───────── 行 01: 出力音声のスキャン ─────────
const N_BARS = 56;
const SHAPE = clipShape("t5-2", N_BARS);
const BITS = SHAPE.map((_, i) => rand(i * 5.31 + 2) > 0.45);
const WF = { x: 170, w: CW - 170 - 40 };

const WaveScan: React.FC<{ t: number; ex: number; h: number }> = ({ t, ex, h }) => {
  const print = prog(t, TM.printA, TM.printB, ease.inOutSine);
  if (print <= 0) return null;
  const scan = prog(t, TM.scanA, TM.found, ease.inOutSine);
  const sx = scan * WF.w;
  const head = prog(t, TM.scanA - 0.15, TM.scanA + 0.05) * (1 - prog(t, TM.found, TM.found + 0.2));
  const found = prog(t, TM.found, TM.found + 0.25);
  const flash = prog(t, TM.found, TM.found + 0.06) * (1 - prog(t, TM.found + 0.12, TM.found + 0.5));
  const env = envAt("t5-2", t);
  const step = WF.w / N_BARS;
  const bw = step * 0.62;
  // 開いた状態 ↔ 畳んだ状態で形を連続的に変える
  const cy = mix(h / 2 - 8, 156, ex);
  const amp = mix(54, 176, ex);
  const bitsY = mix(h / 2 + 28, 268, ex);
  const lanesIn = prog(t, TM.scanA - 0.2, TM.scanA + 0.3);
  const labelY = mix(h / 2 - 12, bitsY - 3, ex);
  const pct = Math.round(scan * 100);
  return (
    <>
      {/* 上段: 何を調べているか / 進み具合 */}
      <div style={{ position: "absolute", left: 40, top: 22, ...mono(15, C.dim), opacity: ex }}>OUTPUT · GENERATED AUDIO</div>
      <div style={{ position: "absolute", right: 40, top: 20, display: "flex", alignItems: "center", gap: 10, opacity: ex * lanesIn, ...mono(16, found > 0.5 ? C.mint : C.sub) }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            background: C.mint,
            opacity: found > 0.5 ? 1 : 0.5 + 0.5 * env,
          }}
        />
        {found > 0.5 ? "SCAN COMPLETE" : `SCAN ${String(pct).padStart(3, "0")}%`}
      </div>
      {/* 列の名前: AUDIBLE（聞こえる層）/ INAUDIBLE → SynthID（聞こえない層） */}
      <div style={{ position: "absolute", left: 40, top: cy - 10, ...mono(15, C.sub), opacity: ex * prog(t, TM.printA, TM.printA + 0.3) }}>AUDIBLE</div>
      <div
        style={{
          position: "absolute",
          left: 40,
          top: labelY,
          ...mono(found > 0.5 ? 20 : 15, found > 0.5 ? C.mint : C.dim, { letterSpacing: found > 0.5 ? "0.02em" : "0.16em" }),
          opacity: Math.max(lanesIn * ex, found),
          textShadow: flash > 0 ? `0 0 ${18 * flash}px ${C.mint}` : undefined,
        }}
      >
        {found > 0.5 ? "SynthID" : "INAUDIBLE"}
      </div>
      <svg width={WF.w} height={h} style={{ position: "absolute", left: WF.x, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="t5-trail" x1={0} x2={1} y1={0} y2={0}>
            <stop offset={0} stopColor={C.mint} stopOpacity={0} />
            <stop offset={1} stopColor={C.mint} stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <line x1={0} y1={cy} x2={WF.w * print} y2={cy} stroke={C.border} strokeWidth={1.5} />
        {/* 聞こえない層のレーン */}
        <line x1={0} y1={bitsY + 3} x2={WF.w * print} y2={bitsY + 3} stroke={C.border} strokeWidth={1} strokeDasharray="3 5" opacity={lanesIn} />
        {SHAPE.map((v, i) => {
          const cx = (i + 0.5) * step;
          const g = clamp01((print - i / N_BARS) * 6);
          if (g <= 0) return null;
          const bh = Math.max(5, v * amp * 0.94) * mix(0.15, 1, g);
          const done = found > 0.5 || (scan > 0 && cx < sx);
          const atHead = head > 0.5 && Math.abs(cx - sx) < step * 0.9;
          return (
            <g key={i} opacity={g}>
              <rect
                x={cx - bw / 2}
                y={cy - bh / 2}
                width={bw}
                height={bh}
                rx={bw / 2.4}
                fill={atHead ? C.text : done ? C.mint : C.sub}
                fillOpacity={atHead ? 1 : done ? 0.85 : 0.42}
                              />
              {/* 聞こえない層: スキャンが通ると埋め込まれていたビットが見える */}
              <rect
                x={cx - bw / 2}
                y={bitsY}
                width={bw}
                height={6}
                rx={1.5}
                fill={done ? (BITS[i] ? C.mint : "rgba(59,227,180,0.22)") : "rgba(255,255,255,0.05)"}
              />
            </g>
          );
        })}
        {head > 0 && (
          <g opacity={head}>
            <rect x={Math.max(0, sx - 150)} y={cy - amp / 2 - 10} width={Math.min(150, sx)} height={bitsY - cy + amp / 2 + 20} fill="url(#t5-trail)" />
            <line
              x1={sx}
              y1={cy - amp / 2 - 12}
              x2={sx}
              y2={bitsY + 16}
              stroke={C.mint}
              strokeWidth={2.5}
              style={{ filter: `drop-shadow(0 0 ${6 + 10 * env}px ${C.mint})` }}
            />
            <path d={`M${sx - 8} ${cy - amp / 2 - 22} L${sx + 8} ${cy - amp / 2 - 22} L${sx} ${cy - amp / 2 - 11} Z`} fill={C.mint} />
          </g>
        )}
      </svg>
    </>
  );
};

// ───────── 行 02: 出演同意書（署名欄は声の波形） ─────────
const USE_TEXT = "VOICE CLONE";
const SIG = { x: 84, x1: CW - 40, y: 244, base: 284, amp: 40 };
const SIG_STEP = 2;

/** 声の大きさ → 署名の振れ幅（無音でもペンの細かい揺れを少し残す） */
const sigAmp = (r: number) => Math.max(0.07, Math.pow(Math.min(1, r * 1.5), 0.8));
const sigWave = (x: number) => 0.72 * Math.sin(x * 0.38) + 0.28 * Math.sin(x * 0.97 + 1.3);

/** 署名（声の波形）の点列: 0..p まで。振幅は録音区間の実際の声の大きさ */
const sigPath = (p: number) => {
  const w = (SIG.x1 - SIG.x) * p;
  const n = Math.max(1, Math.floor(w / SIG_STEP));
  let d = "";
  for (let k = 0; k <= n; k++) {
    const x = Math.min(w, k * SIG_STEP);
    const tau = mix(TM.recA, TM.recB, x / (SIG.x1 - SIG.x));
    const a = sigAmp(rmsAt("t5-3", tau));
    const y = SIG.y - SIG.amp * a * sigWave(x);
    d += `${k === 0 ? "M" : "L"}${(SIG.x + x).toFixed(1)} ${y.toFixed(1)} `;
  }
  return { d, tipX: SIG.x + w };
};

const ReleaseForm: React.FC<{ t: number; ex: number }> = ({ t, ex }) => {
  const show = prog(ex, 0.35, 1);
  if (show <= 0) return null;
  const ap = (d: number) => prog(t, TM.swap + 0.25 + d, TM.swap + 0.7 + d, ease.outQuint);
  const nType = Math.floor(prog(t, TM.useA, TM.useA + 0.5, ease.linear) * USE_TEXT.length);
  const typing = t >= TM.useA - 0.2 && t < TM.useA + 0.7;
  const cursorOn = Math.floor(t * 3.2) % 2 === 0;
  const owner = prog(t, TM.recA - 0.12, TM.recA + 0.25, ease.outQuint);
  const rec = prog(t, TM.recA, TM.recB, ease.linear);
  const recording = t >= TM.recA && t < TM.recB;
  const signed = t >= TM.recB;
  const env = envAt("t5-3", t);
  const blink = 0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 1.5);
  const xMark = 1 - prog(t, TM.recA - 0.05, TM.recA + 0.2);
  const baseDraw = ap(0.14);
  const { d, tipX } = sigPath(rec);
  const tipY = SIG.y - SIG.amp * sigAmp(rmsAt("t5-3", t)) * sigWave(tipX - SIG.x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: show }}>
      {/* 書類の名前 */}
      <div style={{ position: "absolute", left: 40, top: 20, display: "flex", alignItems: "baseline", gap: 16, opacity: ap(0) }}>
        <span style={mono(15, C.dim)}>TALENT RELEASE</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 19, color: C.sub, letterSpacing: "0.12em" }}>出演同意書</span>
      </div>
      {/* 欄: 用途 / 持ち主 */}
      <div style={{ position: "absolute", left: 40, top: 66, width: 380, opacity: ap(0.05) }}>
        <div style={mono(14, C.sub)}>USE · 用途</div>
        <div style={{ ...mono(32, C.text, { letterSpacing: "0.06em" }), marginTop: 10, height: 40, display: "flex", alignItems: "center" }}>
          {USE_TEXT.slice(0, nType)}
          {typing && <span style={{ width: 15, height: 30, marginLeft: 3, background: C.coral, opacity: cursorOn ? 0.9 : 0 }} />}
        </div>
        <div style={{ height: 1.5, background: C.borderHi, marginTop: 6 }} />
      </div>
      <div style={{ position: "absolute", left: 470, top: 66, width: CW - 470 - 40, opacity: ap(0.1) }}>
        <div style={mono(14, owner > 0.5 ? C.coral : C.sub)}>VOICE OWNER · 持ち主</div>
        <div style={{ marginTop: 10, height: 40, display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 34,
              lineHeight: 1,
              color: C.text,
              opacity: owner,
              transform: `translateY(${(1 - owner) * 10}px)`,
              letterSpacing: "0.06em",
            }}
          >
            本人
          </span>
          <span style={{ ...mono(16, C.sub), opacity: owner }}>SELF</span>
        </div>
        <div style={{ position: "relative", height: 1.5, background: C.borderHi, marginTop: 6 }}>
          <div style={{ position: "absolute", left: 0, top: -1, height: 3.5, width: `${owner * 100}%`, background: C.coral, borderRadius: 2 }} />
        </div>
      </div>
      {/* 署名欄: ペンの代わりに声で書く */}
      <div style={{ position: "absolute", left: 40, top: 165, ...mono(15, C.sub), opacity: ap(0.14) }}>
        SIGNATURE · <span style={{ color: mixHex(C.sub, C.mint, prog(t, TM.recA - 0.1, TM.recA + 0.2)) }}>BY VOICE</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 164,
          display: "flex",
          alignItems: "center",
          gap: 9,
          opacity: ap(0.14),
          ...mono(15, signed ? C.mint : recording ? C.coral : C.dim),
        }}
      >
        {signed ? (
          <CheckDraw size={16} color={C.mint} sw={3.4} p={prog(t, TM.recB, TM.recB + 0.25)} />
        ) : (
          <span style={{ width: 10, height: 10, borderRadius: 5, background: recording ? C.coral : C.dim, opacity: recording ? 0.45 + 0.55 * blink : 0.6 }} />
        )}
        {signed ? "SIGNED" : recording ? "REC" : "STANDBY"}
      </div>
      <svg width={CW} height={RE} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={40} y1={SIG.base} x2={40 + (SIG.x1 - 40) * baseDraw} y2={SIG.base} stroke={C.borderHi} strokeWidth={2} />
        {xMark > 0 && (
          <g opacity={xMark * ap(0.2) * (0.5 + 0.5 * blink)} stroke={C.coral} strokeWidth={3} strokeLinecap="round">
            <line x1={46} y1={SIG.base - 34} x2={64} y2={SIG.base - 16} />
            <line x1={64} y1={SIG.base - 34} x2={46} y2={SIG.base - 16} />
          </g>
        )}
        {rec > 0 && (
          <path d={d} fill="none" stroke={C.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${C.mint}55)` }} />
        )}
        {recording && (
          <g transform={`translate(${tipX} ${tipY})`}>
            <circle r={10 + 10 * env} fill={C.mint} opacity={0.16 + 0.22 * env} />
            <circle r={5} fill={C.mint} style={{ filter: `drop-shadow(0 0 ${5 + 8 * env}px ${C.mint})` }} />
          </g>
        )}
      </svg>
    </div>
  );
};

// ───────── 行の共通部分 ─────────
type RowDef = {
  no: string;
  jp: string;
  en: string;
  stampAt: number;
  stampTitle: string;
  stampSub: string;
  stampTitleSize: number;
};
const ROWS: RowDef[] = [
  { no: "01", jp: "電子透かし", en: "WATERMARK", stampAt: TM.stamp1, stampTitle: "SynthID", stampSub: "· EMBEDDED ·", stampTitleSize: 33 },
  { no: "02", jp: "声での同意", en: "VOICE CONSENT", stampAt: TM.stamp2, stampTitle: "VOICE CONSENT", stampSub: "· RECORDED ·", stampTitleSize: 23 },
];

const Row: React.FC<{
  t: number;
  i: number;
  y: number;
  h: number;
  ex: number;
  active: number;
  children?: React.ReactNode;
}> = ({ t, i, y, h, ex, active, children }) => {
  const r = ROWS[i];
  const inP = prog(t, TM.rowsIn + i * 0.1, TM.rowsIn + i * 0.1 + 0.45, ease.outQuint);
  const stamped = t >= r.stampAt;
  const flash = prog(t, r.stampAt, r.stampAt + 0.05) * (1 - prog(t, r.stampAt + 0.12, r.stampAt + 0.7));
  const noColor = stamped ? C.mint : active > 0.5 ? C.coral : C.dim;
  const pending = (1 - prog(ex, 0, 0.3)) * (stamped ? 0 : 1);
  // No. と ITEM の縦位置: 点検前の高さまでは行の真ん中、それより開いたら上に留まる
  const mid = Math.min(h, RI) / 2;
  const checking = active > 0.5 && !stamped;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: SHEET.w, height: h, overflow: "hidden", opacity: inP }}>
      {/* 点検中の行はほんのり明るく */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.028)", opacity: active }} />
      <div style={{ position: "absolute", inset: 0, background: C.mintSoft, opacity: 0.6 * flash }} />
      <div style={{ transform: `translateX(${(1 - inP) * -16}px)` }}>
        {/* No. */}
        <div
          style={{
            position: "absolute",
            left: COL.no,
            width: COL.item,
            top: mid - 26,
            textAlign: "center",
            fontFamily: DISPLAY,
            fontSize: 40,
            lineHeight: 1.2,
            color: noColor,
          }}
        >
          {r.no}
        </div>
        {/* ITEM */}
        <div style={{ position: "absolute", left: COL.item + 28, top: mid - 36 }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, lineHeight: 1.1, color: mixHex(C.sub, C.text, Math.max(active, stamped ? 1 : 0)), letterSpacing: "0.04em" }}>
            {r.jp}
          </div>
          <div style={mono(15, stamped ? C.mint : C.sub, { marginTop: 8, letterSpacing: "0.2em" })}>{r.en}</div>
        </div>
        {/* CHECK: 未点検の表示 */}
        {pending > 0 && (
          <div style={{ position: "absolute", left: COL.check + 40, top: mid - 11, display: "flex", alignItems: "center", gap: 12, opacity: pending, ...mono(16, checking ? C.coral : C.sub) }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                border: `2px solid ${checking ? C.coral : C.sub}`,
                background: checking ? C.coral : "transparent",
                boxSizing: "border-box",
              }}
            />
            {checking ? "CHECKING" : "PENDING"}
          </div>
        )}
        {/* CHECK: 中身 */}
        <div style={{ position: "absolute", left: COL.check, top: 0, width: CW, height: h }}>{children}</div>
      </div>
    </div>
  );
};

/** SIGN-OFF 欄の判子（押した瞬間に行の外へはみ出せるよう、行の切り抜きの外に描く） */
const SignOff: React.FC<{ t: number; i: number; y: number; h: number; ex: number }> = ({ t, i, y, h, ex }) => {
  const r = ROWS[i];
  const scale = mix(0.74, 1, ex);
  const cy = y + h / 2;
  const slot = (t >= r.stampAt ? 0 : 1) * prog(t, TM.rowsIn + i * 0.1 + 0.2, TM.rowsIn + i * 0.1 + 0.6);
  return (
    <>
      <StampSlot cx={SIGN_CX} cy={cy} scale={scale} opacity={slot} />
      <Stamp t={t} at={r.stampAt} cx={SIGN_CX} cy={cy} scale={scale} title={r.stampTitle} sub={r.stampSub} titleSize={r.stampTitleSize} tilt={i === 0 ? -5 : -4} />
    </>
  );
};

// ───────── シート本体 ─────────
export const QcSheet: React.FC<{ t: number }> = ({ t }) => {
  const inP = prog(t, TM.sheetIn, TM.sheetIn + 0.55, ease.outQuint);
  if (inP <= 0) return null;
  const { ex1, ex2, h1, h2, swap } = rowState(t);
  const H = ROWS_Y + h1 + h2;
  const clipIn = prog(t, TM.sheetIn + 0.12, TM.sheetIn + 0.5, ease.outQuint);
  const cleared = (t >= TM.stamp1 ? 1 : 0) + (t >= TM.stamp2 ? 1 : 0);
  const allClear = cleared === 2;
  const lab = prog(t, TM.sheetIn + 0.15, TM.sheetIn + 0.55);

  // 点検中の行の印（左端のコーラルの帯）: 行 01 → 行 02 へ移る
  const cue = prog(t, TM.cue, TM.cue + 0.35, ease.outQuint);
  const y1a = ROWS_Y + 16;
  const y1b = ROWS_Y + h1 - 16;
  const y2a = ROWS_Y + h1 + 16;
  const y2b = ROWS_Y + h1 + h2 - 16;
  const mTop = mix(y1a, y2a, swap);
  const mBot = mix(y1b, y2b, swap);
  const mMid = (mTop + mBot) / 2;
  const mLen = (mBot - mTop) * cue;
  // 済んだ行の印はミント。行 02 へ移る間にコーラルへ戻る
  const ok1 = prog(t, TM.stamp1, TM.stamp1 + 0.2);
  const ok2 = prog(t, TM.stamp2, TM.stamp2 + 0.2);
  const mColor = mixHex(C.coral, C.mint, ok1 * (1 - swap) + ok2 * swap);
  const active1 = cue * (1 - swap);
  const active2 = swap;

  return (
    <div style={{ position: "absolute", left: SHEET.x, top: SHEET.y, opacity: inP, transform: `translateY(${(1 - inP) * 44}px)` }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SHEET.w,
          height: H,
          borderRadius: 18,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px rgba(0,0,0,0.5)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* シート名の帯 */}
        <div style={{ position: "absolute", left: 0, top: 0, width: SHEET.w, height: TOP_H, borderBottom: `1px solid ${C.border}`, opacity: lab }}>
          <div style={{ position: "absolute", left: 32, top: 0, height: TOP_H, display: "flex", alignItems: "center", gap: 14, ...mono(18, C.text) }}>
            <span style={{ ...mono(15, C.coral, { letterSpacing: "0.1em" }), border: `1.5px solid ${C.coral}`, borderRadius: 5, padding: "2px 8px" }}>QC</span>
            PRE-BROADCAST CHECK
          </div>
          <div style={{ position: "absolute", right: 32, top: 0, height: TOP_H, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={mono(15, allClear ? C.mint : C.dim)}>CLEARED</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: allClear ? C.mint : C.text, letterSpacing: "0.08em" }}>
              {cleared}
              <span style={{ color: C.dim }}> / </span>2
            </span>
          </div>
        </div>
        {/* 列見出し */}
        <div style={{ position: "absolute", left: 0, top: TOP_H, width: SHEET.w, height: COLS_H, borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.12)", opacity: lab }}>
          {[
            { x: COL.no, w: COL.item, label: "No.", center: true },
            { x: COL.item + 28, label: "ITEM" },
            { x: COL.check + 40, label: "CHECK" },
            { x: COL.sign + 40, label: "SIGN-OFF" },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                position: "absolute",
                left: c.x,
                width: c.w,
                top: 0,
                height: COLS_H,
                display: "flex",
                alignItems: "center",
                justifyContent: c.center ? "center" : "flex-start",
                ...mono(13, C.dim, { letterSpacing: "0.2em" }),
              }}
            >
              {c.label}
            </div>
          ))}
        </div>
        {/* 罫線 */}
        {[COL.item, COL.check, COL.sign].map((x) => (
          <div key={x} style={{ position: "absolute", left: x, top: TOP_H, width: 1, height: H - TOP_H, background: C.border, opacity: lab }} />
        ))}
        <div style={{ position: "absolute", left: 0, top: ROWS_Y + h1, width: SHEET.w, height: 1, background: C.border, opacity: lab }} />

        {/* 行 */}
        <Row t={t} i={0} y={ROWS_Y} h={h1} ex={ex1} active={active1}>
          <WaveScan t={t} ex={ex1} h={h1} />
        </Row>
        <Row t={t} i={1} y={ROWS_Y + h1} h={h2} ex={ex2} active={active2}>
          <ReleaseForm t={t} ex={ex2} />
        </Row>

        {/* 点検中の印 */}
        {mLen > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: mMid - mLen / 2,
              width: 6,
              height: mLen,
              borderRadius: "0 3px 3px 0",
              background: mColor,
              boxShadow: `0 0 14px ${mColor}`,
            }}
          />
        )}
      </div>
      <SignOff t={t} i={0} y={ROWS_Y} h={h1} ex={ex1} />
      <SignOff t={t} i={1} y={ROWS_Y + h1} h={h2} ex={ex2} />
      <ClipboardClip x={SHEET.w / 2} y={-30 + (1 - clipIn) * -14} opacity={clipIn} />
    </div>
  );
};
