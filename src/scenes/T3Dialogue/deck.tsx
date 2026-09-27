// TRACK 03 の t3-5: 30 秒のサンプルを録るオープンリールのテープデッキ
import React from "react";
import { Panel } from "../../components/Panel";
import { IconMic } from "../../components/Icons";
import { C, MONO } from "../../theme";
import { mix } from "../../time";
import { ClipWave } from "./parts";

export const DECK = { w: 732, h: 540 };
const REEL = { r: 100, cy: 190, lx: 192, rx: 540 };
const ROLL = { r: 10, y: 318, lx: 92, rx: 640 };
const HEAD = { w: 76, h: 22 };
const TAPE_Y = ROLL.y + ROLL.r;
/** 録った音声のクリップ（パネル内の座標）。OUT ジャックはこの高さで左の縁に付く */
export const DECK_CLIP = { x: 40, y: 448, w: DECK.w - 80, h: 70 };

/** 円の外の点 p から円（中心 c, 半径 r）に引いた接点。side = -1 で左側、+1 で右側を選ぶ */
const tangent = (cx: number, cy: number, r: number, px: number, py: number, side: -1 | 1) => {
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.min(1, r / d));
  const cands = [base + a, base - a].map((th) => ({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) }));
  return cands.sort((p, q) => (p.x - q.x) * side)[1];
};

const Reel: React.FC<{ cx: number; pack: number; angle: number; recorded: boolean; lit: number }> = ({ cx, pack, angle, recorded, lit }) => (
  <g>
    <circle cx={cx} cy={REEL.cy} r={REEL.r} fill="#0B0D11" stroke={C.borderHi} strokeWidth={2} />
    <circle
      cx={cx}
      cy={REEL.cy}
      r={pack}
      fill={recorded ? `rgba(255,106,61,${0.2 + 0.16 * lit})` : "#232833"}
      stroke={recorded ? C.coral : C.border}
      strokeOpacity={recorded ? 0.8 : 1}
      strokeWidth={1.5}
    />
    {/* 巻いたテープの年輪 */}
    {[0.55, 0.78].map((k) => (
      <circle key={k} cx={cx} cy={REEL.cy} r={24 + (pack - 24) * k} fill="none" stroke={recorded ? C.coral : C.borderHi} strokeOpacity={0.22} strokeWidth={1} />
    ))}
    {/* フランジの窓の仕切り（回転が見える） */}
    <g transform={`rotate(${angle} ${cx} ${REEL.cy})`}>
      {[0, 120, 240].map((a) => (
        <line
          key={a}
          x1={cx}
          y1={REEL.cy - 26}
          x2={cx}
          y2={REEL.cy - REEL.r + 5}
          transform={`rotate(${a} ${cx} ${REEL.cy})`}
          stroke="#0B0D11"
          strokeWidth={14}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={REEL.cy} r={22} fill={C.panelHi} stroke={C.borderHi} strokeWidth={2} />
      <rect x={cx - 3} y={REEL.cy - 22} width={6} height={9} rx={2} fill={C.borderHi} />
      <circle cx={cx} cy={REEL.cy} r={6} fill="#0B0D11" />
    </g>
  </g>
);

export const TapeDeck: React.FC<{
  /** 0〜1: 30 秒のうちどこまで録ったか */
  cnt: number;
  /** リールの回転角（度） */
  angle: number;
  recording: boolean;
  /** 0〜1: 30 秒に達した */
  done: number;
  status: React.ReactNode;
  glow: number;
}> = ({ cnt, angle, recording, done, status, glow }) => {
  const sec = Math.floor(cnt * 30 + 1e-6);
  const supply = mix(86, 56, cnt);
  const takeup = mix(32, 72, cnt);
  const tl = tangent(REEL.lx, REEL.cy, supply, ROLL.lx - ROLL.r, ROLL.y, -1);
  const tr = tangent(REEL.rx, REEL.cy, takeup, ROLL.rx + ROLL.r, ROLL.y, 1);
  const waveW = DECK_CLIP.w - 40;
  const waveH = 44;
  return (
    <Panel
      w={DECK.w}
      h={DECK.h}
      header={
        <>
          <IconMic size={22} color={recording ? C.coral : C.sub} sw={1.9} />
          <span style={{ color: C.text }}>TAPE</span>
          <span style={{ color: C.dim, fontWeight: 500, letterSpacing: "0.06em" }}>sample_30s</span>
        </>
      }
      status={status}
      accent={C.coral}
      glow={glow}
    >
      <svg width={DECK.w} height={DECK.h} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* テープの道すじ: 供給リール → ローラー → ヘッド → ローラー → 巻き取りリール */}
        <g fill="none" stroke={C.borderHi} strokeWidth={3}>
          <line x1={tl.x} y1={tl.y} x2={ROLL.lx - ROLL.r} y2={ROLL.y} />
          <line x1={ROLL.lx} y1={TAPE_Y} x2={ROLL.rx} y2={TAPE_Y} />
          <line x1={tr.x} y1={tr.y} x2={ROLL.rx + ROLL.r} y2={ROLL.y} />
        </g>
        {/* ヘッドより右は「録った」テープ */}
        <line x1={DECK.w / 2} y1={TAPE_Y} x2={ROLL.rx} y2={TAPE_Y} stroke={C.coral} strokeOpacity={0.35 + 0.4 * (recording ? 1 : 0)} strokeWidth={3} />
        <line x1={tr.x} y1={tr.y} x2={ROLL.rx + ROLL.r} y2={ROLL.y} stroke={C.coral} strokeOpacity={0.3 + 0.4 * (recording ? 1 : 0)} strokeWidth={3} />
        {[ROLL.lx, ROLL.rx].map((x) => (
          <g key={x}>
            <circle cx={x} cy={ROLL.y} r={ROLL.r} fill={C.panelHi} stroke={C.borderHi} strokeWidth={2} />
            <circle cx={x} cy={ROLL.y} r={3} fill={C.borderHi} />
          </g>
        ))}
        <Reel cx={REEL.lx} pack={supply} angle={angle} recorded={false} lit={0} />
        <Reel cx={REEL.rx} pack={takeup} angle={angle * 0.8} recorded lit={recording ? 1 : 0} />
        {/* 録音ヘッド */}
        <rect x={DECK.w / 2 - HEAD.w / 2} y={TAPE_Y + 1} width={HEAD.w} height={HEAD.h} rx={5} fill={C.panelHi} stroke={recording ? C.coral : C.borderHi} strokeWidth={1.5} />
        <circle
          cx={DECK.w / 2 + HEAD.w / 2 + 20}
          cy={TAPE_Y + 12}
          r={6}
          fill={recording ? C.red : C.dim}
          style={recording ? { filter: `drop-shadow(0 0 6px ${C.red})` } : undefined}
        />
      </svg>
      <div style={{ position: "absolute", left: DECK.w / 2 - 60, width: 120, top: TAPE_Y + 30, textAlign: "center", fontFamily: MONO, fontWeight: 500, fontSize: 13, letterSpacing: "0.16em", color: C.dim }}>
        REC HEAD
      </div>

      {/* カウンター */}
      <div style={{ position: "absolute", left: DECK_CLIP.x, top: 372, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1,
            color: cnt > 0 ? C.coral : C.dim,
            fontVariantNumeric: "tabular-nums",
            textShadow: recording ? `0 0 18px ${C.coral}66` : undefined,
          }}
        >
          00:{String(sec).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          right: DECK.w - DECK_CLIP.x - DECK_CLIP.w,
          top: 392,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "0.16em",
          color: done > 0.5 ? C.text : C.dim,
          whiteSpace: "nowrap",
        }}
      >
        {done > 0 && (
          <svg width={22} height={22} viewBox="0 0 24 24" style={{ opacity: done, transform: `scale(${mix(0.6, 1, done)})` }}>
            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke={C.coral} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        TARGET <span style={{ color: done > 0.5 ? C.coral : C.sub }}>00:30</span>
      </div>

      {/* 録った音声のクリップ */}
      <div
        style={{
          position: "absolute",
          left: DECK_CLIP.x,
          top: DECK_CLIP.y,
          width: DECK_CLIP.w,
          height: DECK_CLIP.h,
          borderRadius: 12,
          boxSizing: "border-box",
          background: "#0A0C10",
          border: `1.5px solid ${recording ? C.coral : C.border}`,
          boxShadow: recording ? `0 0 24px ${C.coral}33, inset 0 0 20px ${C.coral}14` : undefined,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 20, top: (DECK_CLIP.h - waveH) / 2 - 1.5 }}>
          <ClipWave width={waveW} height={waveH} color={C.coral} fill={cnt} />
        </div>
        {recording && cnt > 0 && cnt < 1 && (
          <div style={{ position: "absolute", left: 20 + waveW * cnt, top: 8, bottom: 8, width: 2, background: C.coral, boxShadow: `0 0 10px ${C.coral}` }} />
        )}
      </div>
    </Panel>
  );
};
