// TRACK 01 のコンソール: 文章を書くマスキングテープ、ことばごとの読みとりモジュール、針式 VU、出力スコープ
import React from "react";
import { Oscilloscope } from "../../components/Meters";
import { C, FONT, MONO } from "../../theme";
import { clamp01, ease, mix, prog, rand, springAt } from "../../time";
import { VuNeedle } from "./parts";
import { CHAR_TIMES, CONTROLS, L4, PCHARS, TM } from "./timing";

// ───────── レイアウト（パネル内の座標） ─────────
export const PANEL = { x: 96, y: 318, w: 1728, h: 548 };
const TAPE = { x: 32, y: 78, w: 1264, h: 92, padX: 44, rot: -0.3 };
const MOD = { x0: 200, y: 232, w: 259, h: 152, gap: 20 };
const MON = { x: 1328, y: 78, w: 368, h: 306 };
const SCOPE = { x: 32, y: 404, w: 1664, h: 120 };
const CON_Y = { a: TAPE.y + TAPE.h + 6, mid: 204, b: MOD.y - 2 };

const modX = (i: number) => MOD.x0 + i * (MOD.w + MOD.gap);
const modIn = (i: number) => TM.modIn + i * 0.13;

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

// ───────── マスキングテープ（コーラルのテープに、ほしい声を書く） ─────────
const TORN = (() => {
  const pts: string[] = [];
  const n = 13;
  for (let i = 0; i <= n; i++) pts.push(`${(i % 2 ? 7 : 1) + rand(i + 3) * 3}px ${(i / n) * TAPE.h}px`);
  for (let i = n; i >= 0; i--) pts.push(`${TAPE.w - ((i % 2 ? 1 : 7) + rand(i + 31) * 3)}px ${(i / n) * TAPE.h}px`);
  return `polygon(${pts.join(",")})`;
})();

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
  const placeholder = 0.42 * (1 - prog(t, TM.write, TM.write + 0.3));
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: TORN,
            background: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 32%, rgba(0,0,0,0.07) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 6px), ${C.coral}`,
          }}
        >
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
            {shown === 0 ? (
              <>
                {caret}
                <span style={{ fontWeight: 700, fontSize: 40, opacity: placeholder, marginLeft: 14, verticalAlign: "top", lineHeight: `${FS}px` }}>
                  どんな声がほしい？
                </span>
              </>
            ) : (
              <>
                <span>{PCHARS.slice(0, shown).join("")}</span>
                {caret}
              </>
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

// ───────── 左の見出し列「READ FROM TEXT / 文章から読みとり」 ─────────
export const ReadLabel: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, modIn(0) - 0.08, modIn(0) + 0.4, ease.outQuint);
  return (
    <div style={{ position: "absolute", left: 32, top: MOD.y + 4, width: 150, opacity: p, transform: `translateX(${(1 - p) * -12}px)` }}>
      <div style={{ width: 28, height: 3, borderRadius: 2, background: C.coral, marginBottom: 14 }} />
      <div style={{ ...micro, fontSize: 15, color: C.sub, lineHeight: 1.45 }}>
        READ
        <br />
        FROM TEXT
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, lineHeight: 1.35, color: C.text, marginTop: 10 }}>
        文章から
        <br />
        読みとり
      </div>
    </div>
  );
};

// ───────── 読みとりモジュール（スライダー / 切り替え） ─────────
const Led: React.FC<{ on: number }> = ({ on }) => (
  <div
    style={{
      width: 12,
      height: 12,
      borderRadius: 6,
      background: lerpColor("#2A303B", C.mint, on),
      boxShadow: on > 0.02 ? `0 0 ${10 * on}px ${C.mint}` : undefined,
    }}
  />
);

export const Module: React.FC<{ t: number; i: number; env: number }> = ({ t, i, env }) => {
  const c = CONTROLS[i];
  const t0 = modIn(i);
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const shimmer = prog(t, t0 + 0.08, t0 + 0.7, ease.inOut);
  const setT = c.done + 0.18; // 線が届いたら動く
  const set = springAt(t, setT, { damping: 12, stiffness: 150 });
  const on = prog(t, setT, setT + 0.25);
  // 「新しい声」: LED が左から順に一度だけ灯って戻る（電源投入の自己診断）
  const blip = prog(t, TM.newCh + i * 0.07, TM.newCh + i * 0.07 + 0.12) * (1 - prog(t, TM.newCh + 0.3 + i * 0.07, TM.newCh + 0.6 + i * 0.07));
  const live = t >= L4.start && t < L4.end + 0.3;
  const led = Math.max(on * (live ? 0.6 + 0.4 * env : 1), blip * 0.85);
  const x = modX(i);
  const TRK = { x: 22, w: MOD.w - 44, y: 84 };
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
        border: `1.5px solid ${lerpColor(C.border, C.borderHi, on)}`,
        overflow: "hidden",
        opacity: inP,
        transform: `translateY(${(1 - inP) * 22}px)`,
      }}
    >
      <div style={{ position: "absolute", left: 20, top: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...micro, color: C.sub }}>{c.label}</span>
      </div>
      <div style={{ position: "absolute", right: 20, top: 20 }}>
        <Led on={led} />
      </div>

      {c.kind === "slider" ? (
        (() => {
          const v = mix(0.5, c.v, set);
          const cx = TRK.x + TRK.w * v;
          const mid = TRK.x + TRK.w * 0.5;
          const hiSide = c.v > 0.5;
          return (
            <>
              {/* 目盛り */}
              {[0, 0.25, 0.5, 0.75, 1].map((q) => (
                <div
                  key={q}
                  style={{
                    position: "absolute",
                    left: TRK.x + TRK.w * q - 1,
                    top: TRK.y - (q === 0.5 ? 14 : 9),
                    width: 2,
                    height: q === 0.5 ? 34 : 24,
                    background: q === 0.5 ? C.borderHi : C.border,
                  }}
                />
              ))}
              <div style={{ position: "absolute", left: TRK.x, top: TRK.y, width: TRK.w, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
              <div
                style={{
                  position: "absolute",
                  left: Math.min(mid, cx),
                  top: TRK.y,
                  width: Math.abs(cx - mid),
                  height: 6,
                  borderRadius: 3,
                  background: C.coral,
                  opacity: on,
                  boxShadow: `0 0 10px ${C.coral}88`,
                }}
              />
              {/* つまみ */}
              <div
                style={{
                  position: "absolute",
                  left: cx - 11,
                  top: TRK.y - 17,
                  width: 22,
                  height: 40,
                  borderRadius: 5,
                  boxSizing: "border-box",
                  background: "linear-gradient(180deg, #313846 0%, #181C24 100%)",
                  border: `1.5px solid ${C.borderHi}`,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ position: "absolute", left: 3, right: 3, top: 17, height: 3, borderRadius: 2, background: lerpColor("#F3EFE7", C.coral, on) }} />
              </div>
              {/* 両端のことば（読みとった側がコーラルに灯る） */}
              <div style={{ position: "absolute", left: TRK.x, right: TRK.x, top: 116, display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, hiSide ? 0 : on) }}>{c.lo}</span>
                <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, hiSide ? on : 0) }}>{c.hi}</span>
              </div>
            </>
          );
        })()
      ) : (
        <>
          <div style={{ position: "absolute", left: TRK.x, top: 56, display: "flex", gap: 15 }}>
            {c.opts.map((o, k) => {
              const pick = k === c.pick ? clamp01(set) : 0;
              return (
                <div
                  key={o}
                  style={{
                    width: (TRK.w - 15) / 2,
                    height: 46,
                    borderRadius: 8,
                    boxSizing: "border-box",
                    border: `1.5px solid ${lerpColor(C.borderHi, C.coral, pick)}`,
                    background: `rgba(255,106,61,${pick})`,
                    boxShadow: pick > 0.02 ? `0 0 ${16 * pick}px ${C.coral}66` : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...micro,
                    fontSize: 24,
                    letterSpacing: "0.04em",
                    color: lerpColor(C.dim, C.ink, pick),
                    transform: `scale(${1 - 0.05 * Math.sin(Math.PI * clamp01(set))})`,
                  }}
                >
                  {o}
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: TRK.x, right: TRK.x, top: 116, display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: C.dim }}>ROLE</span>
            <span style={{ ...micro, fontSize: 18, letterSpacing: "0.1em", color: lerpColor(C.dim, C.coral, on) }}>{c.role}</span>
          </div>
        </>
      )}

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

// ───────── 右: 針式 VU（書き終わると照明が入り、t1-4 の声で振れる） ─────────
export const Monitor: React.FC<{ t: number; env: number }> = ({ t, env }) => {
  const t0 = modIn(4);
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const test = Math.sin(Math.PI * prog(t, TM.newCh, TM.newCh + 0.9, ease.inOut)); // 自己診断で一度だけ振り切って戻る
  const warm = prog(t, TM.warm, TM.warm + 0.35, ease.out);
  const kick = Math.sin(Math.PI * prog(t, TM.warm, TM.warm + 0.4)) * 0.1;
  const liveP = prog(t, TM.onAir, TM.onAir + 0.2);
  const needle = Math.max(test * 0.98, kick, t >= L4.start ? 0.04 + 0.86 * env : 0);
  const light = Math.max(test * 0.5, warm);
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
      <div style={{ position: "absolute", left: 20, top: 18, ...micro, fontSize: 15, color: C.sub }}>DESIGNED VOICE</div>
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
        <VuNeedle w={MON.w - 36} h={MON.h - 72} needle={needle} light={light} />
      </div>
    </div>
  );
};

// ───────── 下: 出力スコープ（t1-4 の声だけに反応） ─────────
export const Scope: React.FC<{ t: number }> = ({ t }) => {
  const t0 = modIn(5);
  const inP = prog(t, t0, t0 + 0.5, ease.outQuint);
  if (inP <= 0) return null;
  const sweep = prog(t, TM.newCh + 0.05, TM.newCh + 0.7, ease.inOut); // 電源投入: ミントの線が左から右へ
  const sweepOut = 1 - prog(t, TM.newCh + 0.7, TM.newCh + 1.3);
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
      {sweep > 0 && sweepOut > 0 && (
        <div
          style={{
            position: "absolute",
            left: 20,
            top: SCOPE.h / 2 - 1.5,
            width: IW * sweep,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${C.mint}00, ${C.mint})`,
            boxShadow: `0 0 10px ${C.mint}`,
            opacity: sweepOut,
          }}
        />
      )}
      <div style={{ position: "absolute", left: 18, top: 12, ...micro, fontSize: 14, color: lerpColor(C.dim, C.mint, amount) }}>OUT</div>
      {amount > 0 && (
        <div style={{ position: "absolute", left: 20, top: 10, opacity: amount }}>
          <Oscilloscope width={IW} height={SCOPE.h - 20} lines={["t1-4"]} color={C.mint} gain={1.5} thickness={3} amount={amount} />
        </div>
      )}
    </div>
  );
};
