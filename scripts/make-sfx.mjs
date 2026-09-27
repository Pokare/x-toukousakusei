#!/usr/bin/env node
// UI 効果音をその場で合成して public/sfx/*.wav に書き出す（素材の権利を気にしなくてよい）。
//   node scripts/make-sfx.mjs
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeWav } from "./lib/wav.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000;

let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};

const render = (dur, fn) => {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i);
  return out;
};

// 1次のローパス/ハイパス
const lowpass = (x, fc) => {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  return x.map((v) => (y += a * (v - y)));
};
const highpass = (x, fc) => {
  const lp = lowpass(x, fc);
  return x.map((v, i) => v - lp[i]);
};
const gain = (x, g) => x.map((v) => v * g);

const sfx = {
  // 軽いポップ（カードやチップが出るとき）
  pop: () => {
    let ph = 0;
    return render(0.12, (t) => {
      const f = 520 + 700 * Math.exp(-t * 60);
      ph += (2 * Math.PI * f) / SR;
      return Math.sin(ph) * Math.exp(-t * 38) * 0.55;
    });
  },
  // 小さなティック（数字の確定、ドット）
  tick: () => highpass(render(0.04, (t) => noise() * Math.exp(-t * 260) * 0.5), 2500),
  // ボタンのクリック
  click: () => {
    const a = render(0.06, (t) => (noise() * Math.exp(-t * 400) + Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 160) * 0.6) * 0.45);
    return highpass(a, 600);
  },
  // タイピング 1打
  type: () => gain(highpass(lowpass(render(0.035, (t) => noise() * Math.exp(-t * 320)), 5200), 1400), 0.5),
  // ふわっと流れる風切り音（場面転換）
  whoosh: () => {
    const d = 0.5;
    const raw = render(d, () => noise());
    let y = 0;
    return raw.map((v, i) => {
      const t = i / SR;
      const fc = 300 + 2600 * Math.sin((Math.PI * t) / d) ** 2;
      const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
      y += a * (v - y);
      return y * Math.sin((Math.PI * t) / d) ** 1.6 * 0.5;
    });
  },
  // 正解・達成のチャイム（1位など）
  chime: () =>
    render(0.9, (t) => {
      const env = (s) => (t < s ? 0 : Math.exp(-(t - s) * 5.5) * Math.min(1, (t - s) * 400));
      return (
        (Math.sin(2 * Math.PI * 1318.5 * t) * env(0) + Math.sin(2 * Math.PI * 1975.5 * t) * env(0.09) * 0.8 +
          Math.sin(2 * Math.PI * 2637 * t) * env(0.09) * 0.15) *
        0.28
      );
    }),
  // 盛り上がりのスウェル（ボイスデザインの「作成」など）
  swell: () => {
    const d = 0.8;
    let ph = 0;
    const tone = render(d, (t) => {
      const f = 220 + 440 * (t / d) ** 2;
      ph += (2 * Math.PI * f) / SR;
      return Math.sin(ph) * 0.2 + Math.sin(ph * 2.01) * 0.08;
    });
    const air = lowpass(render(d, () => noise() * 0.25), 3000);
    return tone.map((v, i) => {
      const t = i / SR;
      const env = Math.pow(t / d, 1.8) * Math.min(1, (d - t) * 20);
      return (v + air[i]) * env * 0.8;
    });
  },
};

for (const [name, make] of Object.entries(sfx)) {
  writeWav(join(ROOT, "public/sfx", `${name}.wav`), make(), SR);
  console.log(`✓ public/sfx/${name}.wav`);
}
