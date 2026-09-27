import React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { Sfx } from "../components/Sfx";
import { C, FONT } from "../theme";
import { line, section } from "../timeline";
import { clamp01, ease, mix, prog, springAt, useTime } from "../time";
import { IntroRings } from "./Intro/Rings";
import { IntroWave, type WaveGeom } from "./Intro/Wave";

// ───────────────────────── レイアウト（元動画 1920x1080 の実測値） ─────────────────────────
// 見出し「人の声ではありません。」: 大(121.5px)で登場 → 0.5倍になって上部ヘッダーへ
const HEAD = { font: 121.5, bigX: 294, bigY: 153, smallX: 627, smallY: 76.5, ulTop: 141, ulW: 1332, ulH: 8 };
// 波形: 大（中央）→ 少し下へ → 小さく平たく
const WAVE_A: WaveGeom = { cx: 960, cy: 500, step: 38, bw: 18.5, maxH: 335, envFloor: 0.28 };
const WAVE_B: WaveGeom = { ...WAVE_A, cy: 569.5 };
const WAVE_C: WaveGeom = { cx: 960, cy: 609.5, step: 30.4, bw: 15.5, maxH: 100, envFloor: 0.08 };
// 「Gemini 3.8 Flash TTS」
const TITLE = { font: 136, x: 282, y: 325, gap38: 43, gapFlash: 44 };

const LAV = "rgba(31, 28, 239, 0.5)"; // ピルの枠・丸の枠（青の半透明）

const mixGeom = (a: WaveGeom, b: WaveGeom, p: number): WaveGeom => ({
  cx: mix(a.cx, b.cx, p),
  cy: mix(a.cy, b.cy, p),
  step: mix(a.step, b.step, p),
  bw: mix(a.bw, b.bw, p),
  maxH: mix(a.maxH, b.maxH, p),
  envFloor: mix(a.envFloor, b.envFloor, p),
});

/** ぼかし＋フェード＋少し移動しながら現れる（位置は速く、ぼかしと濃さはゆっくり戻る） */
const blurIn = (t: number, at: number, dur: number, o: { dx?: number; dy?: number; blur?: number } = {}) => {
  const pl = prog(t, at, at + dur, ease.linear);
  const pos = 1 - (1 - pl) ** 2;
  const { dx = 0, dy = 0, blur = 12 } = o;
  return {
    opacity: 1 - (1 - pl) ** 1.6,
    filter: pl < 1 ? `blur(${(1 - pl) ** 2 * blur}px)` : undefined,
    transform: `translate(${(1 - pos) * dx}px, ${(1 - pos) * dy}px)`,
  } as React.CSSProperties;
};

/** 小さく現れて少し行き過ぎてから戻る（ピル・Google 用。元動画は約0.28秒で +9% まで膨らむ） */
const backOut = Easing.out(Easing.back(2.6));
const popScale = (t: number, at: number, from: number) => mix(from, 1, backOut(clamp01((t - at) / 0.54)));

const INTRO_LINES = ["intro-1", "intro-2", "intro-3", "intro-4", "intro-5", "intro-6"];

export const Intro: React.FC = () => {
  const t = useTime();
  const L1 = line("intro-1");
  const L2 = line("intro-2");
  const L3 = line("intro-3");
  const L4 = line("intro-4");
  const L5 = line("intro-5");
  const L6 = line("intro-6");

  // ── 時刻（すべてナレーション行に対する相対位置。元動画での位置を割合/秒で写像）
  const revealAt = L1.start - 0.226; // 波形が左から立ち上がる
  const labelIn = L1.start + 0.05; // 「• いま流れている声」
  const labelOut = L2.start - 0.27;
  const waveDown = L2.start - 0.35; // 波形が少し下へ
  const chunkAt = [-0.13, 0.11, 0.32].map((f) => L2.start + f * L2.dur); // 人の声 / では / ありません。
  const ulAt = L2.start + 0.57 * L2.dur; // 下線が伸びる
  const toHeader = L3.start + 0.02; // 見出しが上部ヘッダーへ
  const pillAt = L3.start + 0.12; // 「2026.09.23 公開」
  const googleAt = L3.start + 0.42 * L3.dur; // 「Google」
  const shrinkAt = L4.start - 0.25; // 波形が小さくなる
  const geminiAt = L4.start - 0.09;
  const v38At = L4.start + 0.15 * L4.dur;
  const flashAt = L4.start + 0.355 * L4.dur;
  const blueAt = L4.start + 0.66 * L4.dur; // 「3.8」が青くなる
  const circleAt = (i: number) => L5.start - 0.02 + 0.09 * i; // 丸が順に現れる
  const fillAt = (i: number) => mix(L5.end, L6.start, 0.2) - 0.1 + 0.2 * i; // 丸が順に塗られる（次の行の直前から）
  const fiveAt = fillAt(4) + 0.15; // 「5つの凄さ」（塗り終わりと同時）

  // ── 波形の形
  const pDown = prog(t, waveDown, waveDown + 0.3, ease.inOut);
  const pShrink = prog(t, shrinkAt, shrinkAt + 0.42, ease.inOut);
  const geom = pShrink > 0 ? mixGeom(WAVE_B, WAVE_C, pShrink) : mixGeom(WAVE_A, WAVE_B, pDown);

  // ── 見出し
  const pHead = prog(t, toHeader, toHeader + 0.5, ease.inOut);
  const headScale = mix(1, 0.5, pHead);
  const headX = mix(HEAD.bigX, HEAD.smallX, pHead);
  const headY = mix(HEAD.bigY, HEAD.smallY, pHead);
  const ul = prog(t, ulAt, ulAt + 0.5, ease.inOut);
  const chunks = ["人の声", "では", "ありません。"];

  // ── ラベル「• いま流れている声」
  const lIn = prog(t, labelIn, labelIn + 0.22, ease.out);
  const lOut = prog(t, labelOut, labelOut + 0.15, ease.linear);
  const dotPop = 1 + 0.35 * Math.sin(Math.PI * prog(t, labelIn + 0.05, labelIn + 0.35, ease.linear));

  // ── ヘッダーの Google（ピルと同じく小さく現れて少し膨らむ）
  const googP = prog(t, googleAt, googleAt + 0.2, ease.out);

  // ── タイトル
  const blueP = prog(t, blueAt, blueAt + 0.18, ease.inOut);
  const pulse = 1 + 0.11 * Math.sin(Math.PI * prog(t, blueAt, blueAt + 0.32, ease.inOutSine));
  const blue38 = `rgb(${Math.round(mix(16, 31, blueP))}, ${Math.round(mix(16, 28, blueP))}, ${Math.round(mix(16, 239, blueP))})`;

  // ── リングはイントロの経過時間でゆっくり広がる
  const ringElapsed = t - (L1.start - 0.25);

  // ── 退場: 元動画は次のセクション直前にぼかし無しで素早くクロスフェードする
  const S = section("intro");
  const exitP = prog(t, S.end - 0.18, S.end + 0.07, ease.inOut);

  return (
    <SceneShell id="intro" exit="none">
      <AbsoluteFill style={{ fontFamily: FONT, opacity: 1 - exitP }}>
        <IntroRings elapsed={ringElapsed} />

        <IntroWave n={30} geom={geom} lines={INTRO_LINES} revealStart={revealAt} />

        {/* 「• いま流れている声」 */}
        {lIn > 0 && lOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: lIn * (1 - lOut),
              filter: lOut > 0 ? `blur(${lOut * 10}px)` : lIn < 1 ? `blur(${(1 - lIn) * 6}px)` : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 794,
                top: 244,
                width: 16,
                height: 16,
                borderRadius: 8,
                background: C.blue,
                transform: `scale(${dotPop})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 827,
                top: 234,
                fontSize: 36,
                lineHeight: 1,
                fontWeight: 400,
                color: "#5B5B57",
                whiteSpace: "nowrap",
                letterSpacing: "0.04em",
              }}
            >
              いま流れている声
            </div>
          </div>
        ) : null}

        {/* 見出し「人の声ではありません。」＋下線 */}
        {t >= chunkAt[0] ? (
          <div
            style={{
              position: "absolute",
              left: headX,
              top: headY,
              transform: `scale(${headScale})`,
              transformOrigin: "0 0",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ display: "flex", fontSize: HEAD.font, lineHeight: 1, fontWeight: 700, color: C.ink }}>
              {chunks.map((c, i) => (
                <span key={i} style={{ display: "inline-block", ...blurIn(t, chunkAt[i], 0.26, { dy: 14, blur: 14 }) }}>
                  {c}
                </span>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: HEAD.ulTop,
                width: HEAD.ulW * ul,
                height: HEAD.ulH,
                borderRadius: HEAD.ulH / 2,
                background: C.blue,
                opacity: ul > 0 ? 1 : 0,
              }}
            />
          </div>
        ) : null}

        {/* ヘッダー: 公開日ピル */}
        {t >= pillAt ? (
          <div
            style={{
              position: "absolute",
              left: 96,
              top: 78,
              width: 314,
              height: 70,
              boxSizing: "border-box",
              borderRadius: 35,
              border: `2px solid ${LAV}`,
              background: "rgba(31, 28, 239, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.blue,
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "0.01em",
              transform: `scale(${popScale(t, pillAt, 0.55)})`,
              transformOrigin: "0% 50%",
              opacity: prog(t, pillAt, pillAt + 0.12, ease.out),
            }}
          >
            2026.09.23 公開
          </div>
        ) : null}

        {/* ヘッダー: Google */}
        {t >= googleAt ? (
          <div
            style={{
              position: "absolute",
              left: 437,
              top: 97,
              fontSize: 35,
              lineHeight: 1,
              fontWeight: 700,
              color: C.ink,
              opacity: 0.35 + 0.65 * googP,
              transform: `scale(${popScale(t, googleAt, 0.6)})`,
              transformOrigin: "0% 50%",
            }}
          >
            Google
          </div>
        ) : null}

        {/* タイトル「Gemini 3.8 Flash TTS」 */}
        {t >= geminiAt ? (
          <div
            style={{
              position: "absolute",
              left: TITLE.x,
              top: TITLE.y,
              display: "flex",
              fontSize: TITLE.font,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: C.ink,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ display: "inline-block", ...blurIn(t, geminiAt, 0.24, { dx: -90, blur: 14 }) }}>Gemini</span>
            {t >= v38At ? (
              <span style={{ display: "inline-block", marginLeft: TITLE.gap38, ...blurIn(t, v38At, 0.27, { dy: 80, blur: 12 }) }}>
                <span style={{ display: "inline-block", color: blue38, transform: `scale(${pulse})` }}>3.8</span>
              </span>
            ) : null}
            {t >= flashAt ? (
              <span style={{ display: "inline-block", marginLeft: TITLE.gapFlash, ...blurIn(t, flashAt, 0.24, { dx: 120, blur: 14 }) }}>
                Flash TTS
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 5つの丸 */}
        {t >= circleAt(0)
          ? Array.from({ length: 5 }, (_, i) => {
              const a = circleAt(i);
              if (t < a) return null;
              const s = springAt(t, a, { damping: 16, stiffness: 300, mass: 0.8 });
              const f = prog(t, fillAt(i), fillAt(i) + 0.2, ease.inOut);
              const bump = 1 + 0.16 * Math.sin(Math.PI * prog(t, fillAt(i), fillAt(i) + 0.26, ease.linear));
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 820 + 70 * i - 22,
                    top: 733.5 - 22,
                    width: 44,
                    height: 44,
                    boxSizing: "border-box",
                    borderRadius: 22,
                    border: `3px solid ${f > 0 ? `rgba(31, 28, 239, ${mix(0.38, 1, clamp01(f * 1.6))})` : "rgba(31, 28, 239, 0.38)"}`,
                    background: `rgba(31, 28, 239, ${f})`,
                    opacity: clamp01((t - a) / 0.1),
                    transform: `scale(${(0.3 + 0.7 * s) * bump})`,
                  }}
                />
              );
            })
          : null}

        {/* 「5つの凄さ」 */}
        {t >= fiveAt ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: 1920,
              top: 785,
              textAlign: "center",
              fontSize: 43,
              lineHeight: 1,
              fontWeight: 700,
              color: C.ink,
              ...blurIn(t, fiveAt, 0.22, { dy: 10, blur: 6 }),
            }}
          >
            <span style={{ color: C.blue }}>5</span>つの凄さ
          </div>
        ) : null}

        {/* 効果音（控えめに） */}
        <Sfx at={toHeader + 0.05} name="whoosh" volume={0.16} />
        <Sfx at={pillAt + 0.02} name="pop" volume={0.2} />
        <Sfx at={geminiAt} name="whoosh" volume={0.16} />
        {Array.from({ length: 5 }, (_, i) => (
          <Sfx key={i} at={fillAt(i) + 0.05} name="tick" volume={0.15} />
        ))}
      </AbsoluteFill>
    </SceneShell>
  );
};

