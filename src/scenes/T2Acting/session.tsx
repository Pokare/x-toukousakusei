// TRACK 02: セッションのタイムライン。同じ 1 行を録る TAKE 1〜3 のレーン。
// レーンの頭はカチンコ（テイク番号とト書きを書いた札）。カチンコが閉じるとプレイヘッドが走り、
// その行の実際の声のレベルからクリップが録られて残る。最後は 1 本に丸をつけて KEEP の判子。
import React from "react";
import { Panel } from "../../components/Panel";
import { C, DISPLAY, FONT, MONO, PAD_X } from "../../theme";
import { clamp01, ease, mix, prog, springAt } from "../../time";
import { TakeWave } from "./clips";
import { bump, levelAt } from "./script";
import { CIRCLE, E, KEEP_TAKE, LAST_TAKE, STAMP, T_LANES, TAKES, type Take } from "./timing";

// ───────── レイアウト ─────────
export const SESS = { x: PAD_X, y: 562, w: 1920 - PAD_X * 2, h: 306 };
const HDR = 56;
const LANE_H = 80;
const laneTop = (i: number) => SESS.y + HDR + 4 + i * LANE_H;
const TW = 364; // レーンの頭（カチンコ + テープ）の列
const SLATE = { x: SESS.x + 24, w: 128, stick: 10, body: 42 };
const TAPE = { w: 184, h: 34 };
const LX = SESS.x + TW + 16;
const LW = SESS.x + SESS.w - 20 - LX;
const BOX = { dy: 9, h: 62 };
const CLIP_X = 12;
const READ_W = 190; // 右端の読み出し（秒数・判子）
const MAX_DUR = Math.max(...TAKES.map((k) => k.L.dur));
const PPS = (LW - CLIP_X - READ_W) / MAX_DUR;

const fmt = (s: number) => `${s.toFixed(2)}s`;

// ───────── カチンコ（小さめ）+ ト書きを書き写したマスキングテープ ─────────
const STRIPES = (op: number) =>
  `repeating-linear-gradient(-58deg, rgba(243,239,231,${op}) 0 10px, rgba(14,16,20,0.92) 10px 20px)`;

const Slate: React.FC<{ t: number; k: Take; keepDim: number }> = ({ t, k, keepDim }) => {
  const top = laneTop(k.i) + 8;
  const s0 = T_LANES + k.i * 0.13;
  const appear = prog(t, s0, s0 + 0.5, ease.outQuint);
  if (appear <= 0) return null;
  const armed = t >= k.typeA - 0.05;
  const rec = t >= k.clap && t < k.L.end;
  const done = t >= k.L.end;
  // 上の拍子木: 少し開いて待つ → ト書きを書きはじめたら大きく開く → 声の直前にカチン（少しはね返る）
  const idleOpen = -5 * prog(t, s0 + 0.15, s0 + 0.5, ease.outQuint);
  const armOpen = mix(idleOpen, -13, prog(t, k.typeA - 0.05, k.typeA + 0.2, ease.outQuint));
  const close = prog(t, k.clap - 0.09, k.clap, ease.in);
  const rebound = t >= k.clap ? 3.2 * Math.exp(-(t - k.clap) * 13) * Math.abs(Math.sin((t - k.clap) * 26)) : 0;
  const ang = mix(armOpen, 0, close) - rebound;
  const hit = bump(t, k.clap, 0.04, 0.45);
  const lit = rec ? 1 : done ? 0.5 : armed ? 0.4 : 0.15;
  const stripeOp = mix(0.28, 0.9, Math.max(lit, hit));
  const numColor = rec ? C.coral : done || armed ? C.text : C.sub;
  // ト書きの札: ページで書き終えたら、テープに書き写される
  const tape = prog(t, k.typeB - 0.08, k.typeB + 0.22, ease.outQuint);
  const ink = prog(t, k.typeB + 0.05, k.typeB + 0.35, ease.outQuint);
  const H = SLATE.stick * 2 + 1 + SLATE.body;

  return (
    <div style={{ position: "absolute", left: SLATE.x, top, width: TW - 40, height: H, opacity: appear * (k.i === KEEP_TAKE ? 1 : 1 - 0.45 * keepDim), transform: `translateY(${(1 - appear) * -12}px)` }}>
      {/* 下の拍子木（固定） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: SLATE.stick + 1,
          width: SLATE.w,
          height: SLATE.stick,
          borderRadius: "2px 2px 0 0",
          background: STRIPES(stripeOp),
        }}
      />
      {/* 上の拍子木（左端のちょうつがいで開閉） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SLATE.w,
          height: SLATE.stick,
          borderRadius: 2,
          background: STRIPES(stripeOp),
          transformOrigin: `4px ${SLATE.stick}px`,
          transform: `rotate(${ang}deg)`,
          boxShadow: hit > 0.02 ? `0 0 ${16 * hit}px ${C.coral}` : undefined,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -3,
          top: SLATE.stick - 4,
          width: 9,
          height: 9,
          borderRadius: 5,
          background: C.borderHi,
          border: `1.5px solid ${C.sub}`,
          boxSizing: "border-box",
        }}
      />
      {/* 本体: TAKE 番号 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: SLATE.stick * 2 + 1,
          width: SLATE.w,
          height: SLATE.body,
          boxSizing: "border-box",
          borderRadius: "0 0 7px 7px",
          border: `1.5px solid ${rec ? C.coral : C.borderHi}`,
          background: rec ? "rgba(255,106,61,0.12)" : "rgba(0,0,0,0.32)",
          boxShadow: hit > 0.02 ? `0 0 ${26 * hit}px rgba(255,106,61,${0.7 * hit})` : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", color: rec ? C.coral : C.sub }}>TAKE</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1, color: numColor, marginTop: -2 }}>{k.n}</span>
      </div>
      {/* ト書きのテープ */}
      <div
        style={{
          position: "absolute",
          left: SLATE.w + 14,
          top: SLATE.stick * 2 + 1 + (SLATE.body - TAPE.h) / 2,
          width: TAPE.w,
          height: TAPE.h,
          boxSizing: "border-box",
          border: `1.5px dashed ${C.borderHi}`,
          borderRadius: 4,
          opacity: 1 - tape,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SLATE.w + 14,
          top: SLATE.stick * 2 + 1 + (SLATE.body - TAPE.h) / 2,
          height: TAPE.h,
          width: TAPE.w,
          transformOrigin: "0 50%",
          transform: `rotate(-1.2deg) scaleX(${tape})`,
          opacity: tape > 0 ? 1 : 0,
          background: "linear-gradient(180deg, rgba(238,230,214,0.94) 0%, rgba(216,207,190,0.94) 100%)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          clipPath: "polygon(0 6%, 3% 0, 97% 8%, 100% 0, 99% 50%, 100% 100%, 96% 92%, 3% 100%, 0 94%, 1% 50%)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.ink, whiteSpace: "nowrap", opacity: ink }}>{k.dir}</span>
      </div>
    </div>
  );
};

// ───────── レーン ─────────
const Lane: React.FC<{ t: number; k: Take; keepDim: number }> = ({ t, k, keepDim }) => {
  const top = laneTop(k.i) + BOX.dy;
  const appear = prog(t, T_LANES + k.i * 0.13 + 0.05, T_LANES + k.i * 0.13 + 0.6, ease.outQuint);
  const L = k.L;
  const rec = t >= L.start && t < L.end;
  const done = t >= L.end;
  const elapsed = clamp01((t - L.start) / L.dur) * L.dur;
  const act = prog(t, L.start - 0.12, L.start + 0.05) * (1 - prog(t, L.end, L.end + 0.35, ease.inOut));
  const lv = rec ? levelAt(k.id, L.start, t) : 0;
  const clipW = Math.max(2, elapsed * PPS);
  const isKeep = k.i === KEEP_TAKE;
  const dim = isKeep ? 0 : keepDim;

  return (
    <>
      {/* 録音中の行のハイライト */}
      <div style={{ position: "absolute", left: SESS.x + 1.5, top: laneTop(k.i), width: SESS.w - 3, height: LANE_H, background: `rgba(255,106,61,${0.05 * act})` }} />
      <div
        style={{
          position: "absolute",
          left: LX,
          top,
          width: LW,
          height: BOX.h,
          borderRadius: 10,
          boxSizing: "border-box",
          background: "rgba(0,0,0,0.26)",
          border: `1px solid ${act > 0.5 ? `${C.coral}88` : C.border}`,
          overflow: "hidden",
          opacity: mix(0.35, 1, appear),
        }}
      >
        <svg width={LW} height={BOX.h} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={0} x2={LW} y1={BOX.h / 2} y2={BOX.h / 2} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          {Array.from({ length: Math.floor((LW - CLIP_X - READ_W) / (PPS * 0.5)) + 1 }, (_, j) => {
            const x = CLIP_X + j * PPS * 0.5;
            const major = j % 2 === 0;
            return (
              <line
                key={j}
                x1={x}
                x2={x}
                y1={major ? 0 : BOX.h * 0.32}
                y2={major ? BOX.h : BOX.h * 0.68}
                stroke={`rgba(255,255,255,${major ? 0.06 : 0.035})`}
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>
      {/* 録られたクリップ（声のレベルから。ト書きごとに描き方が違う） */}
      {t >= L.start && (
        <div
          style={{
            position: "absolute",
            left: LX + CLIP_X,
            top: top + 5,
            width: clipW,
            height: BOX.h - 10,
            borderRadius: 7,
            boxSizing: "border-box",
            background: `rgba(59,227,180,${0.06 * (1 - dim)})`,
            border: `1.5px solid rgba(59,227,180,${(rec ? 0.7 : 0.4) * (1 - 0.6 * dim)})`,
          }}
        >
          <TakeWave id={k.id} kind={k.style} width={L.dur * PPS} height={BOX.h - 13} elapsed={elapsed} pps={PPS} dim={dim} />
        </div>
      )}
      {/* 録音中の先端のにじみ（声の強さで明るく） */}
      {rec && (
        <div
          style={{
            position: "absolute",
            left: LX + CLIP_X + clipW - 48,
            top: top + 5,
            width: 48,
            height: BOX.h - 10,
            background: `linear-gradient(90deg, rgba(59,227,180,0) 0%, rgba(59,227,180,${0.12 + 0.3 * lv}) 100%)`,
            borderRadius: 7,
          }}
        />
      )}
      {/* 右端の読み出し */}
      <div
        style={{
          position: "absolute",
          left: LX + LW - READ_W,
          top,
          width: READ_W - 20,
          height: BOX.h,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          fontFamily: MONO,
          fontWeight: 700,
          whiteSpace: "nowrap",
          opacity: appear * (1 - 0.5 * dim) * (isKeep ? 1 - prog(t, STAMP - 0.02, STAMP + 0.1) : 1),
        }}
      >
        {rec ? (
          <>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: C.red,
                boxShadow: `0 0 ${6 + 10 * lv}px ${C.red}`,
                opacity: 0.7 + 0.3 * lv,
              }}
            />
            <span style={{ fontSize: 14, letterSpacing: "0.16em", color: C.coral }}>REC</span>
          </>
        ) : done ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        ) : null}
        <span style={{ fontSize: 21, letterSpacing: "0.04em", color: rec ? C.coral : done ? C.text : C.dim, minWidth: 78, textAlign: "right" }}>
          {t >= L.start ? fmt(elapsed) : "-.--s"}
        </span>
      </div>
    </>
  );
};

// ───────── プレイヘッド ─────────
const Playhead: React.FC<{ t: number }> = ({ t }) => (
  <>
    {TAKES.map((k) => {
      const vis = prog(t, k.clap - 0.3, k.clap - 0.05, ease.outQuint) * (1 - prog(t, k.L.end + 0.05, k.L.end + 0.3, ease.inOut));
      if (vis <= 0.001) return null;
      const x = LX + CLIP_X + clamp01((t - k.L.start) / k.L.dur) * k.L.dur * PPS;
      const y = laneTop(k.i) + BOX.dy;
      const lv = t >= k.L.start && t < k.L.end ? levelAt(k.id, k.L.start, t) : 0;
      return (
        <svg
          key={k.id}
          width={18}
          height={BOX.h + 20}
          style={{ position: "absolute", left: x - 9, top: y - 12, opacity: vis, overflow: "visible", filter: `drop-shadow(0 0 ${5 + 8 * lv}px ${C.coral})` }}
        >
          <path d="M2 0 H16 V5 L9 12 L2 5 Z" fill={C.coral} />
          <rect x={7.75} y={8} width={2.5} height={BOX.h + 8} rx={1.25} fill={C.coral} />
        </svg>
      );
    })}
  </>
);

// ───────── 丸（サークルテイク）と KEEP の判子 ─────────
const CircleTake: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, CIRCLE.a, CIRCLE.b, ease.inOut);
  if (p <= 0) return null;
  // カチンコの番号のまわりを手で丸くなぞる（少しはみ出して重なる）
  const cx = SLATE.x + SLATE.w / 2;
  const cy = laneTop(KEEP_TAKE) + 8 + SLATE.stick * 2 + 1 + SLATE.body / 2;
  const rx = 72;
  const ry = 28;
  const N = 48;
  const path = Array.from({ length: N + 1 }, (_, j) => {
    const a = -Math.PI * 0.62 + (j / N) * Math.PI * 2.22;
    const wob = 1 + 0.06 * Math.sin(j * 0.9);
    const x = cx + Math.cos(a) * rx * wob * (1 + 0.04 * (j / N));
    const y = cy + Math.sin(a) * ry * wob;
    return `${j === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const len = 560;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}>
      <path
        d={path}
        fill="none"
        stroke={C.coral}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
        style={{ filter: `drop-shadow(0 0 6px ${C.coral})` }}
      />
    </svg>
  );
};

const KeepStamp: React.FC<{ t: number }> = ({ t }) => {
  const op = prog(t, STAMP, STAMP + 0.06, ease.linear);
  if (op <= 0) return null;
  const s = springAt(t, STAMP, { damping: 12, stiffness: 240, mass: 0.7 });
  const hit = bump(t, STAMP + 0.05, 0.05, 0.5);
  const w = 156;
  const h = 52;
  const top = laneTop(KEEP_TAKE) + BOX.dy + (BOX.h - h) / 2;
  return (
    <>
      {/* 押した衝撃の輪 */}
      {hit > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: LX + LW - READ_W / 2 - 4 - (w / 2) * (1 + 0.5 * (1 - hit)),
            top: top + h / 2 - (h / 2) * (1 + 0.9 * (1 - hit)),
            width: w * (1 + 0.5 * (1 - hit)),
            height: h * (1 + 0.9 * (1 - hit)),
            borderRadius: 14,
            border: `2px solid ${C.coral}`,
            opacity: hit * 0.6,
            boxSizing: "border-box",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: LX + LW - READ_W / 2 - 4 - w / 2,
          top,
          width: w,
          height: h,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `3px solid ${C.coral}`,
          background: "rgba(14,16,20,0.86)",
          padding: 3,
          opacity: op,
          transform: `rotate(-7deg) scale(${mix(1.8, 1, s)})`,
          boxShadow: `0 0 ${8 + 22 * hit}px rgba(255,106,61,${0.25 + 0.4 * hit})`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: `1.5px solid ${C.coral}`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "0.22em",
            color: C.coral,
            paddingLeft: 4,
          }}
        >
          KEEP
        </div>
      </div>
    </>
  );
};

// ───────── パネルの状態表示 ─────────
const Status: React.FC<{ t: number }> = ({ t }) => {
  const recK = TAKES.find((k) => t >= k.clap && t < k.L.end);
  const armK = TAKES.find((k) => t >= k.typeA - 0.05 && t < k.clap);
  if (t >= STAMP + 0.05) {
    return (
      <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, boxSizing: "border-box", border: `2px solid ${C.coral}` }} />
        KEEP · TAKE {KEEP_TAKE + 1}
      </span>
    );
  }
  if (t >= LAST_TAKE.L.end) {
    return (
      <span style={{ color: C.mint, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        {TAKES.length} TAKES
      </span>
    );
  }
  if (recK) {
    return (
      <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: C.coral,
            opacity: 0.6 + 0.4 * Math.cos((t - recK.clap) * Math.PI * 2 * 1.2),
            boxShadow: `0 0 10px ${C.coral}`,
          }}
        />
        REC · TAKE {recK.n}/{TAKES.length}
      </span>
    );
  }
  if (armK) {
    return (
      <span style={{ color: C.coral, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, boxSizing: "border-box", border: `2px solid ${C.coral}` }} />
        SLATE · TAKE {armK.n}
      </span>
    );
  }
  const between = TAKES.find((k) => k.i > 0 && t >= TAKES[k.i - 1].L.end && t < k.typeA);
  return (
    <span style={{ color: between ? C.mint : C.sub, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, boxSizing: "border-box", border: `2px solid ${between ? C.mint : C.sub}` }} />
      {between ? `TAKE ${between.n - 1} OK` : "STANDBY"}
    </span>
  );
};

export const Session: React.FC<{ t: number }> = ({ t }) => {
  const pIn = prog(t, E + 0.42, E + 1.0, ease.outQuint);
  if (pIn <= 0) return null;
  const keepDim = prog(t, STAMP + 0.02, STAMP + 0.4, ease.inOut);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: pIn, transform: `translateY(${(1 - pIn) * 36}px)` }}>
      <Panel
        x={SESS.x}
        y={SESS.y}
        w={SESS.w}
        h={SESS.h}
        header={
          <span>
            SESSION <span style={{ color: C.dim }}>·</span> 1 LINE <span style={{ color: C.dim }}>×</span> {TAKES.length} TAKES
          </span>
        }
        status={<Status t={t} />}
      >
        <div style={{ position: "absolute", left: 0, top: HDR, width: TW, bottom: 0, background: "rgba(0,0,0,0.16)", borderRight: `1px solid ${C.border}` }} />
        {TAKES.slice(1).map((k) => (
          <div key={k.id} style={{ position: "absolute", left: 0, right: 0, top: HDR + 4 + k.i * LANE_H, height: 1, background: C.border }} />
        ))}
      </Panel>
      {TAKES.map((k) => (
        <Lane key={k.id} t={t} k={k} keepDim={keepDim} />
      ))}
      {TAKES.map((k) => (
        <Slate key={k.id} t={t} k={k} keepDim={keepDim} />
      ))}
      <Playhead t={t} />
      <CircleTake t={t} />
      <KeepStamp t={t} />
    </div>
  );
};
