// TRACK 02: 台本の 1 ページ（セリフは 1 行だけ）。
// 上の段がト書きのカッコ（3 字下げ）、下の段がセリフ。ペンがト書きを書き換え、最後はセリフの中に短いト書きを書き足す。
import React from "react";
import { C, FONT, FPS, MONO, PAD_X } from "../../theme";
import { LEVELS } from "../../timeline";
import { clamp01, ease, mix, prog } from "../../time";
import { DCHARS, E, INSERTS, T_LINE, T_SLOT, TAKES } from "./timing";

// ───────── レイアウト（ページ内の座標） ─────────
export const PAGE = { x: PAD_X, y: 300, w: 1920 - PAD_X * 2, h: 236 };
const X0 = 176; // セリフの書き出し
const DIR = { y: 54, fs: 44, lh: 60, indent: 128 }; // ト書き（2 字ぶん下げる）
const DLG = { y: 122, fs: 64, lh: 84 };
const INS = { fs: 32, pad: 7 };
const DLG_AVAIL = PAGE.w - X0 - 56; // 書き足しで行が伸びたら、この幅に収まるよう縮める
const DLG_W = DCHARS.length * DLG.fs;
const EMPTY_N = [...TAKES[0].dir].length;

/** 0→1→0 の短い脈動 */
export const bump = (t: number, s: number, up = 0.12, down = 0.6) =>
  prog(t, s, s + up, ease.outQuint) * (1 - prog(t, s + up + 0.05, s + up + 0.05 + down, ease.inOut));

/** その行の t 秒時点の声のレベル（0〜1） */
export const levelAt = (id: string, start: number, t: number) => {
  const r = LEVELS.lines[id]?.rms ?? [];
  const k = Math.floor((t - start) * FPS);
  return k >= 0 && k < r.length ? r[k] : 0;
};

// ───────── ペン（万年筆のペン先。先端が原点） ─────────
const Pen: React.FC<{ x: number; y: number; vis: number }> = ({ x, y, vis }) => {
  if (vis <= 0.001) return null;
  const off = (1 - vis) * 26;
  return (
    <svg
      width={120}
      height={120}
      viewBox="-60 -110 120 120"
      style={{
        position: "absolute",
        left: x - 60 + off,
        top: y - 110 - off,
        opacity: vis,
        overflow: "visible",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.55))",
        pointerEvents: "none",
      }}
    >
      <g transform="rotate(34)">
        <rect x={-9} y={-96} width={18} height={62} rx={5} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
        <rect x={-9} y={-40} width={18} height={7} fill={C.sub} />
        <path d="M0 0 L-8.5 -20 Q-9 -26 -6 -33 L6 -33 Q9 -26 8.5 -20 Z" fill={C.coral} />
        <path d="M0 -3 L0 -17" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={0} cy={-19} r={2} fill={C.ink} />
      </g>
    </svg>
  );
};

// ───────── ト書きの欄 ─────────
const DirectionSlot: React.FC<{ t: number }> = ({ t }) => {
  const open = prog(t, T_SLOT, T_SLOT + 0.5, ease.outQuint);
  const fs = DIR.fs;
  // いまの段階: 0 = 1 本目を書く / j = j-1 本目に線を引いて j 本目を書く
  let j = 0;
  TAKES.forEach((k) => {
    if (k.i > 0 && t >= k.strikeA) j = k.i;
  });
  const cur = TAKES[j];
  const old = j > 0 ? TAKES[j - 1] : null;
  const typed = [...cur.dir].map((_, k) => prog(t, cur.charAt(k) - 0.03, cur.charAt(k) + 0.07, ease.out));
  const wNew = fs * typed.reduce((s, v) => s + v, 0);
  const strike = old ? prog(t, cur.strikeA, cur.strikeB, ease.inOut) : 0;
  const fade = old ? prog(t, cur.strikeB - 0.01, cur.strikeB + 0.12, ease.in) : 0;
  const wOld = old ? fs * old.dir.length * (1 - fade) : 0;
  const slotW = j === 0 ? Math.max(fs * EMPTY_N * open, wNew) : Math.max(wOld, wNew, fs * 0.6);
  // 書き換えの瞬間にカッコがはねる
  const flash = Math.max(bump(t, cur.typeA - 0.05, 0.1, 0.5), bump(t, T_SLOT + 0.1, 0.12, 0.7));
  const armed = open > 0.01;
  // 録音中は、いまのト書きがテイクの声に合わせてほのかに光る（ト書き → 芝居）
  const recK = TAKES.find((k) => t >= k.L.start && t < k.L.end);
  const glow = recK ? levelAt(recK.id, recK.L.start, t) : 0;

  // キャレット: 空欄のあいだは点滅、書いている間は点灯
  const idle = t >= T_SLOT + 0.25 && t < cur.typeA - 0.1 && j === 0;
  const writing = t >= cur.typeA - 0.06 && t < cur.typeB + 0.18;
  const caretOp = idle ? 0.35 + 0.65 * (Math.cos((t - T_SLOT) * Math.PI * 2 * 1.1) > 0 ? 1 : 0.15) : writing ? 1 : 0;

  // ペン: 線を引く → 書き出しへ戻る → 書く
  const winA = old ? cur.strikeA : cur.typeA;
  const penVis = prog(t, winA - 0.16, winA - 0.02, ease.outQuint) * (1 - prog(t, cur.typeB + 0.12, cur.typeB + 0.4, ease.inOut));
  let penX = wNew;
  let penY = DIR.lh * 0.84;
  if (old && t < cur.typeA + 0.05) {
    const sx = fs * old.dir.length * strike;
    const back = prog(t, cur.strikeB, cur.typeA + 0.05, ease.inOut);
    penX = mix(sx, 0, back);
    penY = mix(DIR.lh * 0.52, DIR.lh * 0.84, back);
  }

  const parenStyle: React.CSSProperties = {
    color: armed ? C.coral : C.dim,
    opacity: open,
    textShadow: flash > 0.02 ? `0 0 ${18 * flash}px ${C.coral}` : undefined,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: X0 + DIR.indent,
        top: DIR.y,
        height: DIR.lh,
        display: "flex",
        alignItems: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: fs,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ ...parenStyle, transform: `translateX(${(1 - open) * 12}px)` }}>（</span>
      <div style={{ position: "relative", width: slotW, height: DIR.lh }}>
        {/* 空欄の下線（書く場所） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 8,
            width: slotW,
            height: 0,
            borderBottom: `2px dashed rgba(255,106,61,${0.45 * open * (1 - clamp01(wNew / (fs * EMPTY_N)))})`,
          }}
        />
        {old && fade < 1 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: slotW,
              height: DIR.lh,
              display: "flex",
              alignItems: "center",
              color: C.coral,
              opacity: 1 - fade,
              transform: `translateY(${-fade * 20}px)`,
              overflow: "hidden",
            }}
          >
            {old.dir}
            <div
              style={{
                position: "absolute",
                left: -4,
                top: DIR.lh / 2 - 1.5,
                width: (fs * old.dir.length + 8) * strike,
                height: 3.5,
                borderRadius: 2,
                background: C.text,
                boxShadow: "0 0 6px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, top: 0, height: DIR.lh, display: "flex", alignItems: "center" }}>
          {[...cur.dir].map((ch, k) => (
            <span
              key={`${j}-${k}`}
              style={{
                display: "inline-block",
                width: fs * typed[k],
                color: C.coral,
                textShadow: glow > 0.02 ? `0 0 ${4 + 16 * glow}px rgba(255,106,61,${0.35 + 0.5 * glow})` : undefined,
                opacity: typed[k],
                transform: `translateY(${(1 - typed[k]) * 10}px)`,
                overflow: "visible",
              }}
            >
              {ch}
            </span>
          ))}
        </div>
        {caretOp > 0 && (
          <div
            style={{
              position: "absolute",
              left: wNew + 2,
              top: 8,
              width: 3,
              height: DIR.lh - 16,
              borderRadius: 2,
              background: C.coral,
              opacity: caretOp * open,
              boxShadow: `0 0 8px ${C.coral}`,
            }}
          />
        )}
        <Pen x={penX} y={penY} vis={penVis} />
      </div>
      <span style={{ ...parenStyle, transform: `translateX(${-(1 - open) * 12}px)` }}>）</span>
    </div>
  );
};

// ───────── セリフの段（t2-5 で短いト書きが割り込む） ─────────
const Insert: React.FC<{ t: number; ins: (typeof INSERTS)[number] }> = ({ t, ins }) => {
  const openP = insOpen(t, ins);
  if (openP <= 0) return null;
  const w = insW(ins) * openP;
  const penVis = prog(t, ins.open - 0.12, ins.open + 0.02, ease.outQuint) * (1 - prog(t, ins.typeB + 0.12, ins.typeB + 0.4, ease.inOut));
  const typed = ins.chars.map((_, j) => prog(t, ins.charAt(j) - 0.02, ins.charAt(j) + 0.08, ease.out));
  const nTyped = typed.reduce((s, v) => s + v, 0);
  const hit = bump(t, ins.typeB, 0.1, 0.6);
  return (
    <div style={{ position: "relative", width: w, height: DLG.lh, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          left: INS.pad,
          top: 0,
          height: DLG.lh,
          display: "flex",
          alignItems: "center",
          fontSize: INS.fs,
          color: C.coral,
          whiteSpace: "nowrap",
          textShadow: hit > 0.02 ? `0 0 ${14 * hit}px ${C.coral}` : undefined,
        }}
      >
        {ins.chars.map((ch, j) => (
          <span key={j} style={{ display: "inline-block", width: INS.fs, opacity: typed[j], transform: `translateY(${(1 - typed[j]) * 8}px)` }}>
            {ch}
          </span>
        ))}
      </div>
      {/* 挿入の印（校正の「∧」） */}
      <svg width={24} height={14} style={{ position: "absolute", left: w / 2 - 12, top: DLG.lh - 6, opacity: openP, overflow: "visible" }}>
        <path d="M2 13 L12 2 L22 13" fill="none" stroke={C.coral} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Pen x={INS.pad + INS.fs * nTyped} y={DLG.lh * 0.78} vis={penVis} />
    </div>
  );
};

const insOpen = (t: number, k: (typeof INSERTS)[number]) => prog(t, k.open, k.open + 0.24, ease.outQuint);
const insW = (k: (typeof INSERTS)[number]) => INS.fs * k.chars.length + INS.pad * 2;

const Dialogue: React.FC<{ t: number }> = ({ t }) => {
  const grow = INSERTS.reduce((s, k) => s + insW(k) * insOpen(t, k), 0);
  const scale = Math.min(1, DLG_AVAIL / (DLG_W + grow));
  const nodes: React.ReactNode[] = [];
  DCHARS.forEach((ch, i) => {
    INSERTS.filter((k) => k.after === i).forEach((k) => nodes.push(<Insert key={`i${k.k}`} t={t} ins={k} />));
    const s = T_LINE + i * 0.028;
    const p = prog(t, s, s + 0.4, ease.outQuint);
    nodes.push(
      <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
        {ch}
      </span>,
    );
  });
  INSERTS.filter((k) => k.after >= DCHARS.length).forEach((k) => nodes.push(<Insert key={`i${k.k}`} t={t} ins={k} />));
  return (
    <div
      style={{
        position: "absolute",
        left: X0,
        top: DLG.y,
        height: DLG.lh,
        display: "flex",
        alignItems: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: DLG.fs,
        color: C.text,
        whiteSpace: "nowrap",
        transformOrigin: "0 50%",
        transform: `scale(${scale})`,
      }}
    >
      {nodes}
    </div>
  );
};

/** テイクの録音中、セリフの下をコーラルの線が読み進む（声の強さで光る） */
const ReadProgress: React.FC<{ t: number }> = ({ t }) => (
  <>
    {TAKES.map((k) => {
      const op = prog(t, k.L.start - 0.08, k.L.start + 0.04) * (1 - prog(t, k.L.end + 0.02, k.L.end + 0.3, ease.inOut));
      if (op <= 0) return null;
      const f = clamp01((t - k.L.start) / k.L.dur);
      const lv = levelAt(k.id, k.L.start, t);
      return (
        <div
          key={k.id}
          style={{
            position: "absolute",
            left: X0,
            top: DLG.y + DLG.lh + 4,
            width: DLG_W * f,
            height: 3,
            borderRadius: 2,
            background: C.coral,
            opacity: op,
            boxShadow: `0 0 ${6 + 14 * lv}px rgba(255,106,61,${0.5 + 0.4 * lv})`,
          }}
        />
      );
    })}
  </>
);

// ───────── ページ ─────────
const HOLES = [0.2, 0.5, 0.8];

export const ScriptPage: React.FC<{ t: number }> = ({ t }) => {
  const pIn = prog(t, E + 0.18, E + 0.75, ease.outQuint);
  if (pIn <= 0) return null;
  const slugIn = prog(t, E + 0.4, E + 0.9, ease.outQuint);
  const lineLab = prog(t, T_LINE, T_LINE + 0.4, ease.outQuint);
  const dirLab = prog(t, T_SLOT, T_SLOT + 0.4, ease.outQuint);
  // 版数（REV.）: ト書きを書くたびに 1 つ上がる
  const revAt = [...TAKES.map((k) => k.typeA), ...INSERTS.map((k) => k.typeA)];
  const rev = revAt.filter((s) => t >= s).length;
  const revHit = Math.max(0, ...revAt.map((s) => bump(t, s, 0.08, 0.5)));

  return (
    <div
      style={{
        position: "absolute",
        left: PAGE.x,
        top: PAGE.y,
        width: PAGE.w,
        height: PAGE.h,
        opacity: pIn,
        transform: `translateY(${(1 - pIn) * 28}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          boxSizing: "border-box",
          border: `1.5px solid ${C.border}`,
          background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
          boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 50px rgba(0,0,0,0.45)",
        }}
      />
      {/* 綴じ穴と真鍮の留め具 */}
      {HOLES.map((f, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: 30,
            top: PAGE.h * f - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: C.bg,
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {k !== 1 && <div style={{ width: 10, height: 10, borderRadius: 5, background: `radial-gradient(circle at 35% 35%, ${C.sub}, ${C.dim})` }} />}
        </div>
      ))}

      {/* 柱（場所・時間）と版数 */}
      <div
        style={{
          position: "absolute",
          left: X0,
          top: 16,
          height: 28,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: slugIn,
          transform: `translateX(${(1 - slugIn) * -10}px)`,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 21, color: C.sub, letterSpacing: "0.06em" }}>○ 録音ブース（深夜）</span>
        <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 16, color: C.dim, letterSpacing: "0.16em" }}>SCENE 02</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 32,
          top: 16,
          height: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: MONO,
          fontWeight: 700,
          letterSpacing: "0.16em",
          opacity: slugIn,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 16, color: C.dim }}>REV.</span>
        <span
          style={{
            fontSize: 20,
            color: rev > 0 ? C.coral : C.dim,
            display: "inline-block",
            transform: `translateY(${-6 * revHit}px)`,
            textShadow: revHit > 0.02 ? `0 0 ${12 * revHit}px ${C.coral}` : undefined,
          }}
        >
          {rev}
        </span>
      </div>

      {/* 左の余白の見出し */}
      {(
        [
          { label: "ト書き", y: DIR.y, h: DIR.lh, p: dirLab, color: C.coral },
          { label: "セリフ", y: DLG.y, h: DLG.lh, p: lineLab, color: C.sub },
        ] as const
      ).map((m) => (
        <div
          key={m.label}
          style={{
            position: "absolute",
            right: PAGE.w - X0 + 28,
            top: m.y,
            height: m.h,
            display: "flex",
            alignItems: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: "0.12em",
            color: m.color,
            opacity: m.p,
            whiteSpace: "nowrap",
          }}
        >
          {m.label}
        </div>
      ))}

      <DirectionSlot t={t} />
      <Dialogue t={t} />
      <ReadProgress t={t} />
    </div>
  );
};
