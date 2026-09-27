// TRACK 01 のチャンネル: 注文を書くマスキングテープ、ことばごとの読みとりモジュール（GRIT つまみ / PACE フェーダー /
// ROOM 表示 / CAST の席）、針式 VU、出力スコープ
import React from "react";
import { Oscilloscope } from "../../components/Meters";
import { C, FONT, MONO } from "../../theme";
import { clamp01, ease, mix, prog, rand, springAt } from "../../time";
import { VuNeedle } from "./parts";
import { CHAR_TIMES, CONTROLS, L4, PCHARS, TM } from "./timing";

// ───────── レイアウト（パネル内の座標） ─────────
export const PANEL = { x: 96, y: 318, w: 1728, h: 548, h0: 196 }; // h0: テープだけのときの高さ
const TAPE = { x: 32, y: 78, w: 1264, h: 92, padX: 44, rot: -0.3 };
const MOD = { x0: 200, y: 232, w: 259, h: 152, gap: 20 };
const MON = { x: 1328, y: 78, w: 368, h: 306 };
const SCOPE = { x: 32, y: 404, w: 1664, h: 120 };
const CON_Y = { a: TAPE.y + TAPE.h + 6, mid: 204, b: MOD.y - 2 };

const modX = (i: number) => MOD.x0 + i * (MOD.w + MOD.gap);
/** モジュール i が立ち上がる時刻（CAST の席だけは「声優が」で遅れて出る） */
const modIn = (i: number) => (CONTROLS[i].kind === "cast" ? TM.castIn : TM.modIn + i * 0.13);

// 文字幅の見積もり（全角 = 1em、半角英数 = 0.62em）
const cw = (ch: string) => (/[\x20-\x7E]/.test(ch) ? 0.62 : 1);
const UNITS = PCHARS.reduce((s, ch) => s + cw(ch), 0);
const FS = Math.min(60, Math.floor((TAPE.w - TAPE.padX * 2 - 30) / UNITS));
const TEXT_TOP = Math.round((TAPE.h - FS) / 2) - 5; // 下線のぶん少し上に
const unitsBefore = (idx: number) => PCHARS.slice(0, idx).reduce((s, ch) => s + cw(ch), 0);
/** ことば（コントロール i）の、テープ上での位置（テキスト左端からの px） */
const KW = CONTROLS.map((c) =>
  c.first < 0 ? null : { left: unitsBefore(c.first) * FS, width: (unitsBefore(c.last + 1) - unitsBefore(c.first)) * FS },
);

/** #RRGGBB どうしの補間（状態の色を 1 フレームで切り替えないため） */
export const lerpColor = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  const q = clamp01(p);
  return `rgb(${pa.map((v, k) => Math.round(mix(v, pb[k], q))).join(",")})`;
};

const micro: React.CSSProperties = { fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: "0.16em" };

/** マスキングテープのちぎれた両端（w×h の多角形） */
const tornEdge = (w: number, h: number, n: number, seed: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i % 2 ? 6 : 1) + rand(seed + i) * 3}px ${(i / n) * h}px`);
  for (let i = n; i >= 0; i--) pts.push(`${w - ((i % 2 ? 1 : 6) + rand(seed + 40 + i) * 3)}px ${(i / n) * h}px`);
  return `polygon(${pts.join(",")})`;
};
const TAPE_BG = `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 32%, rgba(0,0,0,0.07) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 6px), ${C.coral}`;

// ───────── マスキングテープ（注文票。ナレーションに合わせて注文が書かれる） ─────────
const TORN = tornEdge(TAPE.w, TAPE.h, 13, 3);

export const Tape: React.FC<{ t: number }> = ({ t }) => {
  const u = prog(t, TM.tapeIn, TM.tapeIn + 0.5, ease.out); // 左から右へ貼られていく
  if (u <= 0) return null;
  const stick = springAt(t, TM.tapeIn + 0.4, { damping: 14, stiffness: 240 }); // 最後に押さえて貼りつく
  const lift = 1 - clamp01(stick);
  const shown = CHAR_TIMES.filter((c) => t >= c).length;
  const writing = t >= TM.write && t < TM.typeB + 0.35;
  const blink = Math.cos(t * Math.PI * 2 * 1.1) > -0.1 ? 1 : 0;
  const caretOp =
    t < TM.write
      ? blink * prog(t, TM.tapeIn + 0.5, TM.tapeIn + 0.65)
      : writing
        ? 1
        : 1 - prog(t, TM.typeB + 0.35, TM.typeB + 0.6);
  // 貼られた直後、左端に小さく印字された「ORDER」（テープの品番のような控えめな表示）
  const stamp = prog(t, TM.tapeIn + 0.45, TM.tapeIn + 0.8) * (1 - prog(t, TM.write, TM.write + 0.25));
  const caret = (
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: FS * 0.95,
        marginLeft: 4,
        verticalAlign: "top",
        marginTop: FS * 0.03,
        borderRadius: 2,
        background: C.ink,
        opacity: caretOp,
      }}
    />
  );
  return (
    <div
      style={{
        position: "absolute",
        left: TAPE.x,
        top: TAPE.y,
        width: TAPE.w,
        height: TAPE.h,
        transformOrigin: "0 50%",
        transform: `rotate(${TAPE.rot}deg) translateY(${-lift * 8}px)`,
        filter: `drop-shadow(0 ${4 + lift * 10}px ${6 + lift * 12}px rgba(0,0,0,0.55))`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(-4px ${(1 - u) * TAPE.w}px -4px -4px)` }}>
        <div style={{ position: "absolute", inset: 0, clipPath: TORN, background: TAPE_BG }}>
          {/* 書かれた文字 */}
          <div
            style={{
              position: "absolute",
              left: TAPE.padX,
              top: TEXT_TOP,
              height: FS,
              lineHeight: `${FS}px`,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: FS,
              color: C.ink,
              whiteSpace: "nowrap",
            }}
          >
            <span>{PCHARS.slice(0, shown).join("")}</span>
            {caret}
            {shown === 0 && stamp > 0 && (
              <span
                style={{
                  ...micro,
                  fontSize: 18,
                  letterSpacing: "0.3em",
                  color: C.ink,
                  opacity: 0.42 * stamp,
                  marginLeft: 18,
                  verticalAlign: "top",
                  lineHeight: `${FS}px`,
                }}
              >
                ORDER —
              </span>
            )}
            {/* ことばの下線（書き終わった順に引かれる） */}
            {KW.map((k, i) => {
              if (!k) return null;
              const p = prog(t, CONTROLS[i].done, CONTROLS[i].done + 0.28, ease.outQuint);
              if (p <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: k.left + 3,
                    width: k.width - 6,
                    top: FS + 5,
                    height: 6,
                    borderRadius: 3,
                    background: C.ink,
                    transformOrigin: "0 50%",
                    transform: `scaleX(${p})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      {/* 貼っている途中のテープの端（めくれた部分の影と光） */}
      {u > 0 && u < 1 && (
        <div
          style={{
            position: "absolute",
            top: -3,
            bottom: -3,
            left: u * TAPE.w - 22,
            width: 22,
            borderRadius: 4,
            background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.35) 55%, rgba(0,0,0,0.3) 100%)`,
          }}
        />
      )}
    </div>
  );
};

// ───────── テープのことば → 読みとりモジュール をつなぐ線 ─────────
export const Connectors: React.FC<{ t: number; env: number }> = ({ t, env }) => (
  <svg width={PANEL.w} height={PANEL.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
    {CONTROLS.map((c, i) => {
      const k = KW[i];
      if (!k) return null;
      const p = prog(t, c.done, c.done + 0.3, ease.outQuint);
      if (p <= 0) return null;
      const kx = TAPE.x + TAPE.padX + k.left + k.width / 2;
      const ya = CON_Y.a + Math.tan((TAPE.rot * Math.PI) / 180) * (kx - TAPE.x);
      const mx = modX(i) + MOD.w / 2;
      const dx = mx - kx;
      const r = Math.min(10, Math.abs(dx) / 2);
      const sx = Math.sign(dx);
      const d =
        Math.abs(dx) < 1
          ? `M${kx} ${ya} V${CON_Y.b}`
          : `M${kx} ${ya} V${CON_Y.mid - r} Q${kx} ${CON_Y.mid} ${kx + sx * r} ${CON_Y.mid} H${mx - sx * r} Q${mx} ${CON_Y.mid} ${mx} ${CON_Y.mid + r} V${CON_Y.b}`;
      const glow = t >= L4.start ? 0.55 + 0.45 * env : 0.8;
      return (
        <g key={i} opacity={glow}>
          <path d={d} pathLength={1} strokeDasharray={`${p} 2`} stroke={C.mint} strokeWidth={2} fill="none" strokeLinecap="round" />
          <circle cx={kx} cy={ya} r={4 * clamp01(p * 4)} fill={C.mint} />
          <circle cx={mx} cy={CON_Y.b} r={4 * prog(p, 0.9, 1)} fill={C.mint} style={{ filter: `drop-shadow(0 0 5px ${C.mint})` }} />
        </g>
      );
    })}
  </svg>
);

// ───────── 左の見出し列「READ FROM ORDER / 注文を読みとり」 ─────────
export const ReadLabel: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, modIn(0) - 0.08, modIn(0) + 0.4, ease.outQuint);
  return (
    <div style={{ position: "absolute", left: 32, top: MOD.y + 4, width: 150, opacity: p, transform: `translateX(${(1 - p) * -12}px)` }}>
      <div style={{ width: 28, height: 3, borderRadius: 2, background: C.coral, marginBottom: 14 }} />
      <div style={{ ...micro, fontSize: 15, color: C.sub, lineHeight: 1.45 }}>
        READ FROM
        <br />
        ORDER
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, lineHeight: 1.35, color: C.text, marginTop: 10 }}>
        注文を
        <br />
        読みとり
      </div>
    </div>
  );
};

// ───────── 読みとりモジュール ─────────
const Led: React.FC<{ on: number; color?: string }> = ({ on, color = C.mint }) => (
  <div
    style={{
      width: 12,
      height: 12,
      borderRadius: 6,
      background: lerpColor("#2A303B", color, on),
      boxShadow: on > 0.02 ? `0 0 ${10 * on}px ${color}` : undefined,
    }}
  />
);

/** 下の段の両端のことば（読みとった側がコーラルに灯る） */
const EndLabels: React.FC<{ lo: React.ReactNode; hi: React.ReactNode; loOn: number; hiOn: number }> = ({ lo, hi, loOn, hiOn }) => (
  <div style={{ position: "absolute", left: 22, right: 22, top: 116, display: "flex", justifyContent: "space-between" }}>
    <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, loOn) }}>{lo}</span>
    <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, hiOn) }}>{hi}</span>
  </div>
);

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const [x0, y0] = polar(cx, cy, r, lo);
  const [x1, y1] = polar(cx, cy, r, hi);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${hi - lo > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

type Ctl = (typeof CONTROLS)[number];

// GRIT: 回転つまみ（ハスキー → 右へ回る）
const KnobBody: React.FC<{ c: Ctl; set: number; on: number }> = ({ c, set, on }) => {
  const v = mix(0.5, c.v, set);
  const A0 = -135;
  const A1 = 135;
  const ang = A0 + (A1 - A0) * v;
  const cx = MOD.w / 2;
  const cy = 76;
  const R = 26;
  const RA = 37;
  const [px, py] = polar(cx, cy, R - 5, ang);
  const [qx, qy] = polar(cx, cy, 7, ang);
  return (
    <>
      <svg width={MOD.w} height={MOD.h} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <radialGradient id="t1knob" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#3A4150" />
            <stop offset="100%" stopColor="#151920" />
          </radialGradient>
        </defs>
        {Array.from({ length: 11 }, (_, i) => {
          const a = A0 + ((A1 - A0) * i) / 10;
          const [x0, y0] = polar(cx, cy, RA + 5, a);
          const [x1, y1] = polar(cx, cy, RA + (i % 5 === 0 ? 12 : 9), a);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={i % 5 === 0 ? C.borderHi : C.border} strokeWidth={2} />;
        })}
        <path d={arc(cx, cy, RA, A0, A1)} stroke="rgba(255,255,255,0.08)" strokeWidth={5} fill="none" strokeLinecap="round" />
        {Math.abs(ang) > 0.5 && (
          <path
            d={arc(cx, cy, RA, 0, ang)}
            stroke={C.coral}
            strokeOpacity={on}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            style={{ filter: on > 0.05 ? `drop-shadow(0 0 5px ${C.coral}99)` : undefined }}
          />
        )}
        <circle cx={cx} cy={cy + 3} r={R} fill="rgba(0,0,0,0.45)" />
        <circle cx={cx} cy={cy} r={R} fill="url(#t1knob)" stroke={C.borderHi} strokeWidth={1.5} />
        <line x1={qx} y1={qy} x2={px} y2={py} stroke={lerpColor("#F3EFE7", C.coral, on)} strokeWidth={4} strokeLinecap="round" />
      </svg>
      <EndLabels lo={c.lo} hi={c.hi} loOn={c.v < 0.5 ? on : 0} hiOn={c.v > 0.5 ? on : 0} />
    </>
  );
};

// PACE: 縦フェーダー（けだるい → 下へ）
const FaderBody: React.FC<{ c: Ctl; set: number; on: number }> = ({ c, set, on }) => {
  const v = mix(0.5, c.v, set); // 0 = 下（lo）、1 = 上（hi）
  const TX = 70;
  const top = 50;
  const bot = 132;
  const y = bot - (bot - top) * v;
  const mid = (top + bot) / 2;
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const yy = top + ((bot - top) * i) / 8;
        const major = i % 4 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: TX - (major ? 34 : 28),
              top: yy - 1,
              width: major ? 16 : 10,
              height: 2,
              background: major ? C.borderHi : C.border,
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: TX - 3, top, width: 6, height: bot - top, borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
      <div
        style={{
          position: "absolute",
          left: TX - 3,
          top: Math.min(mid, y),
          width: 6,
          height: Math.abs(y - mid),
          borderRadius: 3,
          background: C.coral,
          opacity: on,
          boxShadow: `0 0 10px ${C.coral}88`,
        }}
      />
      {/* フェーダーのつまみ */}
      <div
        style={{
          position: "absolute",
          left: TX - 24,
          top: y - 11,
          width: 48,
          height: 22,
          borderRadius: 5,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #313846 0%, #181C24 100%)",
          border: `1.5px solid ${C.borderHi}`,
          boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ position: "absolute", left: 5, right: 5, top: 8, height: 3, borderRadius: 2, background: lerpColor("#F3EFE7", C.coral, on) }} />
      </div>
      {/* 右: 上 = hi、下 = lo */}
      <div style={{ position: "absolute", left: 128, top: top - 9, ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, c.v > 0.5 ? on : 0) }}>
        {c.hi}
      </div>
      <div style={{ position: "absolute", left: 128, top: bot - 13, ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, c.v < 0.5 ? on : 0) }}>
        {c.lo}
      </div>
      <svg width={30} height={40} style={{ position: "absolute", left: 136, top: mid - 20, opacity: on }}>
        <path d="M15 4 V32 M7 25 L15 33 L23 25" stroke={lerpColor(C.dim, C.coral, on)} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
};

// ROOM: 部屋の広さと明るさの小さな表示（深夜のバー → 狭く・暗く）
const RoomBody: React.FC<{ c: Ctl; set: number; on: number }> = ({ c, set, on }) => {
  const s = clamp01(set);
  const SW = MOD.w - 44;
  const SH = 60;
  const rw = mix(SW - 26, 86, s);
  const rh = mix(SH - 16, 32, s);
  const bright = mix(1, 0.22, s);
  const cross = (a: string, b: string) => (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ opacity: 1 - on }}>{a}</span>
      <span style={{ position: "absolute", left: 0, top: 0, opacity: on, whiteSpace: "nowrap" }}>{b}</span>
    </span>
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 48,
          width: SW,
          height: SH,
          borderRadius: 8,
          background: "#0B0D11",
          border: `1.5px solid ${C.border}`,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* 床の目地 */}
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 12 + i * 24, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.035)" }} />
        ))}
        <div
          style={{
            position: "absolute",
            left: (SW - 3 - rw) / 2,
            top: (SH - 3 - rh) / 2,
            width: rw,
            height: rh,
            borderRadius: 4,
            boxSizing: "border-box",
            border: `2px solid ${lerpColor(C.sub, C.coral, on)}`,
            background: `radial-gradient(90% 120% at 50% 0%, rgba(243,239,231,${0.2 * bright}) 0%, rgba(243,239,231,${0.04 * bright}) 70%)`,
          }}
        >
          {/* ペンダントライト */}
          <div
            style={{
              position: "absolute",
              left: rw / 2 - 5,
              top: 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              background: lerpColor("#6B4A3E", "#FFE9D6", bright),
              boxShadow: `0 0 ${4 + 14 * bright}px rgba(255,214,190,${0.25 + 0.6 * bright})`,
            }}
          />
        </div>
      </div>
      <EndLabels lo={cross("SIZE", c.lo)} hi={cross("LIGHT", c.hi)} loOn={on} hiOn={on} />
    </>
  );
};

// CAST: 空いた席（ネームプレート）。「マスター」で小さなテープが貼られて埋まる
const CAST_TAPE = { w: 206, h: 54 };
const CAST_TORN = tornEdge(CAST_TAPE.w, CAST_TAPE.h, 7, 71);
const CastBody: React.FC<{ t: number; c: Ctl; on: number }> = ({ t, c, on }) => {
  const land = TM.castLand;
  const slap = springAt(t, land, { damping: 11, stiffness: 220 });
  const tapeIn = prog(t, land - 0.02, land + 0.08);
  const empty = 1 - prog(t, land, land + 0.15);
  return (
    <div style={{ position: "absolute", left: 22, top: 48, width: MOD.w - 44, height: 84 }}>
      {/* 空席のプレート（点線） */}
      <svg width={MOD.w - 44} height={84} style={{ position: "absolute", left: 0, top: 0 }}>
        <rect
          x={1}
          y={1}
          width={MOD.w - 46}
          height={82}
          rx={8}
          fill="rgba(255,255,255,0.02)"
          stroke={lerpColor(C.borderHi, C.coral, on * 0.6)}
          strokeWidth={1.5}
          strokeDasharray={on > 0.5 ? undefined : "6 6"}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          opacity: empty,
        }}
      >
        <div style={{ ...micro, fontSize: 22, letterSpacing: "0.34em", color: C.dim, marginRight: "-0.34em" }}>{c.lo}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: C.dim, letterSpacing: "0.2em" }}>空席</div>
      </div>
      {tapeIn > 0 && (
        <div
          style={{
            position: "absolute",
            left: (MOD.w - 44 - CAST_TAPE.w) / 2,
            top: (84 - CAST_TAPE.h) / 2,
            width: CAST_TAPE.w,
            height: CAST_TAPE.h,
            opacity: tapeIn,
            transform: `rotate(-2deg) scale(${mix(1.3, 1, clamp01(slap))})`,
            filter: `drop-shadow(0 ${3 + (1 - clamp01(slap)) * 10}px ${5 + (1 - clamp01(slap)) * 10}px rgba(0,0,0,0.55))`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: CAST_TORN,
              background: TAPE_BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 25,
              letterSpacing: "0.06em",
              color: C.ink,
              whiteSpace: "nowrap",
            }}
          >
            {c.hi}
          </div>
        </div>
      )}
    </div>
  );
};

export const Module: React.FC<{ t: number; i: number; env: number }> = ({ t, i, env }) => {
  const c = CONTROLS[i];
  const t0 = modIn(i);
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const shimmer = prog(t, t0 + 0.08, t0 + 0.7, ease.inOut);
  const setT = c.kind === "cast" ? TM.castLand : c.done + 0.18; // 線が届いたら動く
  const set = springAt(t, setT, { damping: 12, stiffness: 150 });
  const on = prog(t, setT, setT + 0.25);
  const live = t >= L4.start && t < L4.end + 0.3;
  const isCast = c.kind === "cast";
  // CAST の席: 「ひとり増えます」から、埋まるまでゆっくり点滅して待つ
  const waitBlink = isCast && t >= TM.castPlus && on < 1 ? (0.5 + 0.5 * Math.cos((t - TM.castPlus) * Math.PI * 2 * 0.9)) * 0.7 : 0;
  const led = Math.max(on * (live ? 0.6 + 0.4 * env : 1), waitBlink * (1 - on));
  const plus = isCast ? prog(t, TM.castPlus, TM.castPlus + 0.35, ease.outQuint) : 0;
  const x = modX(i);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: MOD.y,
        width: MOD.w,
        height: MOD.h,
        borderRadius: 12,
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.22)",
        border: `1.5px solid ${lerpColor(C.border, isCast ? C.coral : C.borderHi, isCast ? on * (live ? 0.5 + 0.5 * env : 0.7) : on)}`,
        boxShadow: isCast && on > 0 ? `0 0 ${(live ? 10 + 18 * env : 10) * on}px ${C.coral}33` : undefined,
        overflow: "hidden",
        opacity: inP,
        transform: `translateY(${(1 - inP) * 22}px)`,
      }}
    >
      <div style={{ position: "absolute", left: 20, top: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...micro, color: C.sub }}>{c.label}</span>
        {plus > 0 && (
          <span style={{ ...micro, color: C.coral, opacity: plus, transform: `translateY(${(1 - plus) * 8}px)`, display: "inline-block" }}>+1</span>
        )}
      </div>
      <div style={{ position: "absolute", right: 20, top: 20 }}>
        <Led on={led} color={isCast ? C.coral : C.mint} />
      </div>

      {c.kind === "knob" && <KnobBody c={c} set={set} on={on} />}
      {c.kind === "fader" && <FaderBody c={c} set={set} on={on} />}
      {c.kind === "room" && <RoomBody c={c} set={set} on={on} />}
      {c.kind === "cast" && <CastBody t={t} c={c} on={on} />}

      {/* 立ち上がりのときに一度だけ横切る光 */}
      {shimmer > 0 && shimmer < 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: mix(-120, MOD.w + 20, shimmer),
            width: 100,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
          }}
        />
      )}
    </div>
  );
};

// ───────── CAST の席: 「ひとり増えます」で一度だけ広がる輪 ─────────
export const CastPulse: React.FC<{ t: number }> = ({ t }) => {
  const i = CONTROLS.findIndex((c) => c.kind === "cast");
  if (i < 0) return null;
  const p = prog(t, TM.castPlus, TM.castPlus + 0.7, ease.out);
  if (p <= 0 || p >= 1) return null;
  const g = 26 * p;
  return (
    <div
      style={{
        position: "absolute",
        left: modX(i) - g,
        top: MOD.y - g,
        width: MOD.w + g * 2,
        height: MOD.h + g * 2,
        borderRadius: 12 + g,
        boxSizing: "border-box",
        border: `${2.5 * (1 - p) + 0.5}px solid ${C.coral}`,
        opacity: 0.85 * (1 - p),
        pointerEvents: "none",
      }}
    />
  );
};

// ───────── 右: 針式 VU（書き終わると照明が入り、t1-4 の声で振れる） ─────────
export const Monitor: React.FC<{ t: number; env: number }> = ({ t, env }) => {
  const t0 = TM.hwIn;
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const warm = prog(t, TM.warm, TM.warm + 0.35, ease.out);
  const kick = Math.sin(Math.PI * prog(t, TM.warm, TM.warm + 0.4)) * 0.1;
  const liveP = prog(t, TM.onAir, TM.onAir + 0.2) * (1 - prog(t, TM.offAir, TM.offAir + 0.3));
  const needle = Math.max(kick, t >= L4.start ? 0.04 + 0.86 * env : 0);
  return (
    <div
      style={{
        position: "absolute",
        left: MON.x,
        top: MON.y,
        width: MON.w,
        height: MON.h,
        borderRadius: 12,
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.22)",
        border: `1.5px solid ${lerpColor(C.border, C.coral, liveP * (0.45 + 0.55 * env))}`,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 22}px)`,
      }}
    >
      <div style={{ position: "absolute", left: 20, top: 18, ...micro, fontSize: 15, color: C.sub }}>CH 01 · MONITOR</div>
      <div style={{ position: "absolute", right: 20, top: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: lerpColor("#2A303B", C.coral, liveP),
            boxShadow: liveP > 0.02 ? `0 0 ${12 * liveP}px ${C.coral}` : undefined,
          }}
        />
        <span style={{ ...micro, fontSize: 15, color: lerpColor(C.dim, C.coral, liveP) }}>LIVE</span>
      </div>
      <div style={{ position: "absolute", left: 18, top: 54 }}>
        <VuNeedle w={MON.w - 36} h={MON.h - 72} needle={needle} light={warm} />
      </div>
    </div>
  );
};

// ───────── 下: 出力スコープ（t1-4 の声だけに反応） ─────────
export const Scope: React.FC<{ t: number }> = ({ t }) => {
  const t0 = TM.hwIn + 0.1;
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const amount = prog(t, L4.start - 0.05, L4.start + 0.3);
  const IW = SCOPE.w - 40;
  return (
    <div
      style={{
        position: "absolute",
        left: SCOPE.x,
        top: SCOPE.y,
        width: SCOPE.w,
        height: SCOPE.h,
        borderRadius: 12,
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.34)",
        border: `1.5px solid ${C.border}`,
        overflow: "hidden",
        opacity: inP,
        transform: `translateY(${(1 - inP) * 22}px)`,
      }}
    >
      {Array.from({ length: 33 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 20 + i * 51, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.04)" }} />
      ))}
      <div style={{ position: "absolute", left: 20, right: 20, top: SCOPE.h / 2 - 1, height: 2, background: C.border }} />
      <div style={{ position: "absolute", left: 18, top: 12, ...micro, fontSize: 14, color: lerpColor(C.dim, C.mint, amount) }}>OUT</div>
      {amount > 0 && (
        <div style={{ position: "absolute", left: 20, top: 10, opacity: amount }}>
          <Oscilloscope width={IW} height={SCOPE.h - 20} lines={["t1-4"]} color={C.mint} gain={1.5} thickness={3} amount={amount} />
        </div>
      )}
    </div>
  );
};
