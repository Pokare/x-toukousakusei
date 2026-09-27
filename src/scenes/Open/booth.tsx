// 冒頭の「誰もいないボーカルブース」: 吸音材の壁、ON AIR ランプ、マイク（ポップガード付き）、
// スポットライトの当たった空のスツール、入力のないマイクのメーター。
import React from "react";
import { C, MONO } from "../../theme";
import { mixColor, withAlpha } from "./parts";

export const BOOTH_W = 588;
export const BOOTH_H = 720;

const FLOOR_Y = 648;
const WALL = { x: 40, y: 132, w: 508, h: 470 };
const TILE_C = 5;
const TILE_R = 5;

/** 吸音材の壁（ウェッジ型のタイルを縦横交互に並べる） */
const FoamWall: React.FC = () => {
  const tw = WALL.w / TILE_C;
  const th = WALL.h / TILE_R;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < TILE_R; r++) {
    for (let c = 0; c < TILE_C; c++) {
      const x = WALL.x + c * tw;
      const y = WALL.y + r * th;
      const horiz = (r + c) % 2 === 0;
      const ridges = 4;
      tiles.push(
        <g key={`${r}-${c}`}>
          <rect x={x + 3} y={y + 3} width={tw - 6} height={th - 6} rx={6} fill="url(#bo-tile)" />
          {Array.from({ length: ridges }, (_, k) => {
            const f = (k + 0.5) / ridges;
            return horiz ? (
              <line key={k} x1={x + 10} x2={x + tw - 10} y1={y + 3 + f * (th - 6)} y2={y + 3 + f * (th - 6)} stroke="#000" strokeOpacity={0.35} strokeWidth={3} />
            ) : (
              <line key={k} x1={x + 3 + f * (tw - 6)} x2={x + 3 + f * (tw - 6)} y1={y + 10} y2={y + th - 10} stroke="#000" strokeOpacity={0.35} strokeWidth={3} />
            );
          })}
        </g>,
      );
    }
  }
  return (
    <g>
      <rect x={WALL.x - 6} y={WALL.y - 6} width={WALL.w + 12} height={WALL.h + 12} rx={16} fill={C.panel} stroke={C.border} strokeWidth={1.5} />
      {tiles}
    </g>
  );
};

/**
 * onAir: ON AIR ランプの明るさ（0〜1）。
 * spot: スツールに当たるスポットライトの明るさ（0〜1）。
 * noInput: 「NO INPUT」表示の出現（0〜1）。
 */
export const Booth: React.FC<{ onAir: number; spot: number; noInput: number }> = ({ onAir, spot, noInput }) => {
  const stoolX = 150;
  const micX = 404;
  const lampCol = mixColor("#3A2522", C.red, onAir);
  return (
    <div style={{ position: "relative", width: BOOTH_W, height: BOOTH_H }}>
      <svg width={BOOTH_W} height={BOOTH_H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="bo-tile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B2029" />
            <stop offset="1" stopColor="#12161C" />
          </linearGradient>
          <linearGradient id="bo-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4E0" stopOpacity={0.16 * spot} />
            <stop offset="1" stopColor="#FFF4E0" stopOpacity={0.02 * spot} />
          </linearGradient>
          <radialGradient id="bo-pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF4E0" stopOpacity={0.2 * spot} />
            <stop offset="1" stopColor="#FFF4E0" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="bo-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2A303B" />
            <stop offset="0.45" stopColor="#3A4150" />
            <stop offset="1" stopColor="#1C212B" />
          </linearGradient>
          <linearGradient id="bo-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.035} />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
          <pattern id="bo-mesh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke={C.sub} strokeOpacity={0.35} strokeWidth={1.2} />
          </pattern>
        </defs>

        <FoamWall />

        {/* 床 */}
        <rect x={0} y={FLOOR_Y} width={BOOTH_W} height={52} fill="url(#bo-floor)" />
        <line x1={0} x2={BOOTH_W} y1={FLOOR_Y} y2={FLOOR_Y} stroke={C.borderHi} strokeWidth={1.5} />

        {/* スポットライト（空のスツールに当たる） */}
        <path d={`M${stoolX - 34} ${WALL.y - 20} L${stoolX + 34} ${WALL.y - 20} L${stoolX + 150} ${FLOOR_Y} L${stoolX - 150} ${FLOOR_Y} Z`} fill="url(#bo-cone)" />
        <ellipse cx={stoolX} cy={FLOOR_Y + 2} rx={170} ry={22} fill="url(#bo-pool)" />
        <rect x={stoolX - 40} y={WALL.y - 30} width={80} height={12} rx={6} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />

        {/* スツール（誰も座っていない） */}
        <g stroke={C.borderHi} strokeLinecap="round" fill="none">
          <line x1={stoolX} y1={500} x2={stoolX + 4} y2={FLOOR_Y - 6} strokeWidth={5} strokeOpacity={0.55} />
          <line x1={stoolX - 50} y1={502} x2={stoolX - 78} y2={FLOOR_Y} strokeWidth={6} />
          <line x1={stoolX + 50} y1={502} x2={stoolX + 78} y2={FLOOR_Y} strokeWidth={6} />
          <ellipse cx={stoolX} cy={586} rx={62} ry={11} strokeWidth={4} />
        </g>
        <path d={`M${stoolX - 80} 486 L${stoolX - 80} 502 A80 16 0 0 0 ${stoolX + 80} 502 L${stoolX + 80} 486 Z`} fill="#232833" />
        <ellipse cx={stoolX} cy={486} rx={80} ry={16} fill="#2E3440" stroke={C.borderHi} strokeWidth={1.5} />
        <ellipse cx={stoolX - 10} cy={483} rx={46} ry={7} fill="#FFF4E0" opacity={0.1 * spot} />

        {/* マイクスタンド */}
        <g stroke={C.borderHi} strokeLinecap="round" fill="none">
          <line x1={micX} y1={600} x2={micX + 8} y2={FLOOR_Y - 8} strokeWidth={5} strokeOpacity={0.55} />
          <line x1={micX} y1={600} x2={micX - 64} y2={FLOOR_Y} strokeWidth={6} />
          <line x1={micX} y1={600} x2={micX + 64} y2={FLOOR_Y} strokeWidth={6} />
          <line x1={micX} y1={432} x2={micX} y2={604} strokeWidth={9} />
        </g>
        <rect x={micX - 12} y={590} width={24} height={20} rx={4} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />

        {/* ポップガード（グースネックでスタンドへ） */}
        <path d={`M268 352 C 268 430, 330 482, ${micX - 4} 486`} fill="none" stroke={C.borderHi} strokeWidth={7} strokeLinecap="round" />
        <path d={`M268 352 C 268 430, 330 482, ${micX - 4} 486`} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={7} strokeDasharray="2 4" />
        <ellipse cx={268} cy={262} rx={36} ry={92} fill="rgba(12,14,18,0.55)" />
        <ellipse cx={268} cy={262} rx={36} ry={92} fill="url(#bo-mesh)" />
        <ellipse cx={268} cy={262} rx={36} ry={92} fill="none" stroke={C.borderHi} strokeWidth={5} />

        {/* マイク本体 */}
        <path
          d={`M${micX - 52} 250 A52 52 0 0 1 ${micX + 52} 250 V404 Q${micX + 52} 414 ${micX + 42} 414 H${micX - 42} Q${micX - 52} 414 ${micX - 52} 404 Z`}
          fill="url(#bo-body)"
          stroke={C.borderHi}
          strokeWidth={1.5}
        />
        {/* グリル */}
        <path d={`M${micX - 52} 250 A52 52 0 0 1 ${micX + 52} 250 V322 H${micX - 52} Z`} fill="#161A21" stroke={C.borderHi} strokeWidth={1.5} />
        {Array.from({ length: 12 }, (_, k) => {
          const y = 208 + k * 9.5;
          const dy = Math.max(0, 250 - y);
          const half = dy > 0 ? Math.sqrt(Math.max(0, 52 * 52 - dy * dy)) - 5 : 47;
          if (half <= 4) return null;
          return <line key={k} x1={micX - half} x2={micX + half} y1={y} y2={y} stroke={C.sub} strokeOpacity={0.4} strokeWidth={2} />;
        })}
        <line x1={micX} x2={micX} y1={202} y2={322} stroke={C.borderHi} strokeWidth={1.5} />
        <rect x={micX - 52} y={322} width={104} height={8} fill={C.borderHi} />
        {/* 電源ランプ（入力がないので消えている） */}
        <circle cx={micX} cy={356} r={6} fill="#262B34" stroke={C.borderHi} strokeWidth={1} />
        {/* ショックマウント */}
        <ellipse cx={micX} cy={384} rx={82} ry={17} fill="none" stroke={C.borderHi} strokeWidth={4} />
        {[-1, 1].map((d) => (
          <g key={d} stroke={C.dim} strokeWidth={1.5}>
            <line x1={micX + d * 80} y1={380} x2={micX + d * 52} y2={366} />
            <line x1={micX + d * 80} y1={388} x2={micX + d * 52} y2={402} />
          </g>
        ))}
        <path d={`M${micX - 82} 386 V432 H${micX + 82} V386`} fill="none" stroke={C.borderHi} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        <rect x={micX - 10} y={426} width={20} height={16} rx={3} fill={C.panelHi} stroke={C.borderHi} strokeWidth={1.5} />
      </svg>

      {/* ON AIR ランプ */}
      <div
        style={{
          position: "absolute",
          left: BOOTH_W / 2 - 150,
          top: 18,
          width: 300,
          height: 82,
          borderRadius: 14,
          boxSizing: "border-box",
          border: `2px solid ${mixColor(C.borderHi, C.coral, onAir)}`,
          background: `linear-gradient(180deg, ${withAlpha(C.coral, 0.08 + 0.16 * onAir)} 0%, ${withAlpha(C.coral, 0.03 + 0.07 * onAir)} 100%), ${C.panel}`,
          boxShadow: `0 0 ${64 * onAir}px ${withAlpha(C.coral, 0.4 * onAir)}, inset 0 0 ${30 * onAir}px ${withAlpha(C.coral, 0.22 * onAir)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: lampCol, boxShadow: `0 0 ${18 * onAir}px ${C.red}` }} />
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: "0.2em",
            marginRight: "-0.2em",
            color: mixColor(C.dim, C.coral, onAir),
            textShadow: `0 0 ${24 * onAir}px ${withAlpha(C.coral, 0.8 * onAir)}`,
          }}
        >
          ON AIR
        </div>
      </div>
      {/* ランプの吊り金具 */}
      {[-1, 1].map((d) => (
        <div key={d} style={{ position: "absolute", left: BOOTH_W / 2 + d * 110 - 1, top: 0, width: 2, height: 18, background: C.borderHi }} />
      ))}

      {/* マイクの入力メーター: 入力なし */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: FLOOR_Y + 30,
          height: 34,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.14em",
          color: C.sub,
          whiteSpace: "nowrap",
        }}
      >
        MIC 1
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 10 }, (_, k) => (
            <div key={k} style={{ width: 14, height: 12, borderRadius: 2, background: "rgba(255,255,255,0.07)" }} />
          ))}
        </div>
        <span style={{ color: C.dim }}>-∞ dB</span>
        <div
          style={{
            height: 32,
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            borderRadius: 6,
            border: `1.5px solid ${C.coral}`,
            background: C.coralSoft,
            color: C.coral,
            fontSize: 17,
            opacity: noInput,
            transform: `translateX(${(1 - noInput) * -10}px)`,
          }}
        >
          NO INPUT
        </div>
      </div>
    </div>
  );
};
