// WAV の読み書きと、無音検出・行分割・波形レベル解析。
// 依存パッケージなし（Node 標準のみ）で動くようにしている。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function readWav(input) {
  const buf = Buffer.isBuffer(input) ? input : readFileSync(input);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("WAV ではありません");
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    let size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    // ストリーミング出力で data サイズが 0 / 0xFFFFFFFF のことがある
    if (id === "data" && (size === 0 || size === 0xffffffff || body + size > buf.length)) {
      size = buf.length - body;
    }
    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, body + size);
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV の fmt/data チャンクが見つかりません");
  const { channels, bits, format } = fmt;
  const bytes = bits / 8;
  const frames = Math.floor(data.length / (bytes * channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      const o = (i * channels + c) * bytes;
      let v;
      if (format === 3 && bits === 32) v = data.readFloatLE(o);
      else if (bits === 16) v = data.readInt16LE(o) / 32768;
      else if (bits === 24) v = data.readIntLE(o, 3) / 8388608;
      else if (bits === 32) v = data.readInt32LE(o) / 2147483648;
      else if (bits === 8) v = (data.readUInt8(o) - 128) / 128;
      else throw new Error(`未対応のビット深度: ${bits}`);
      acc += v;
    }
    out[i] = acc / channels;
  }
  return { sampleRate: fmt.sampleRate, samples: out };
}

export function writeWav(path, samples, sampleRate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([h, data]));
}

// 10ms 単位の音量(dBFS)
export function frameDb(samples, sampleRate, frameMs = 10) {
  const n = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const out = [];
  for (let i = 0; i < samples.length; i += n) {
    let s = 0;
    const end = Math.min(samples.length, i + n);
    for (let j = i; j < end; j++) s += samples[j] * samples[j];
    out.push(10 * Math.log10(s / Math.max(1, end - i) + 1e-12));
  }
  return out;
}

function speechThreshold(db) {
  const sorted = [...db].sort((a, b) => a - b);
  const peak = sorted[Math.floor(sorted.length * 0.98)] ?? -20;
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -80;
  // ピークから 32dB 下、ただしノイズフロアより 8dB 以上は上
  return Math.max(peak - 32, floor + 8);
}

// 無音区間 [{start,end}] (秒)
export function findSilences(samples, sampleRate, { minMs = 120 } = {}) {
  const db = frameDb(samples, sampleRate, 10);
  const th = speechThreshold(db);
  const res = [];
  let s = -1;
  for (let i = 0; i <= db.length; i++) {
    const silent = i < db.length && db[i] < th;
    if (silent && s < 0) s = i;
    if (!silent && s >= 0) {
      if ((i - s) * 10 >= minMs) res.push({ start: s / 100, end: i / 100 });
      s = -1;
    }
  }
  return res;
}

// 前後の無音を削る（pad 秒だけ残す）
export function trimSilence(samples, sampleRate, pad = 0.06) {
  const db = frameDb(samples, sampleRate, 10);
  const th = speechThreshold(db);
  let a = 0;
  while (a < db.length && db[a] < th) a++;
  let b = db.length - 1;
  while (b > a && db[b] < th) b--;
  const start = Math.max(0, Math.floor((a / 100 - pad) * sampleRate));
  const end = Math.min(samples.length, Math.ceil(((b + 1) / 100 + pad) * sampleRate));
  return samples.slice(start, Math.max(start + 1, end));
}

// 1回の生成でまとめて読ませた音声を、行ごとに切り分ける。
// weights は各行の読みの長さの目安。無音区間の中から「区切った各行の長さが
// 読みの長さに比例する」「区切りの無音が長い」の両方を満たす組み合わせを
// 動的計画法で選ぶ（位置の誤差が累積しないよう、行ごとの長さで評価する）。
export function splitByWeights(samples, sampleRate, weights) {
  const n = weights.length;
  if (n === 1) return [trimSilence(samples, sampleRate)];
  const total = samples.length / sampleRate;
  const sil = findSilences(samples, sampleRate, { minMs: 90 }).filter(
    (s) => s.start > 0.15 && s.end < total - 0.15,
  );
  if (sil.length < n - 1) {
    throw new Error(
      `行の区切り（無音）が足りません: 必要 ${n - 1} / 検出 ${sil.length}。--per-line で1行ずつ生成してください。`,
    );
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  const rate = total / sum;
  const m = sil.length;
  const mid = sil.map((x) => (x.start + x.end) / 2);
  const bonus = sil.map((x) => Math.min(x.end - x.start, 0.7) / 0.7);
  // 行 i を時刻 a〜b に割り当てたときのずれ
  const segCost = (i, a, b) => Math.abs(Math.log(Math.max(0.05, b - a) / (weights[i] * rate)));
  const INF = 1e18;
  const dp = Array.from({ length: n - 1 }, () => new Array(m).fill(INF));
  const from = Array.from({ length: n - 1 }, () => new Array(m).fill(-1));
  for (let j = 0; j < m; j++) dp[0][j] = 2 * segCost(0, 0, mid[j]) - bonus[j];
  for (let i = 1; i < n - 1; i++) {
    for (let j = i; j < m; j++) {
      for (let k = i - 1; k < j; k++) {
        if (dp[i - 1][k] >= INF) continue;
        const c = dp[i - 1][k] + 2 * segCost(i, mid[k], mid[j]) - bonus[j];
        if (c < dp[i][j]) {
          dp[i][j] = c;
          from[i][j] = k;
        }
      }
    }
  }
  let j = -1;
  let best = INF;
  for (let k = n - 2; k < m; k++) {
    const c = dp[n - 2][k] + 2 * segCost(n - 1, mid[k], total);
    if (c < best) {
      best = c;
      j = k;
    }
  }
  const picks = new Array(n - 1);
  for (let i = n - 2; i >= 0; i--) {
    picks[i] = j;
    j = from[i][j];
  }
  const cuts = picks.map((p) => (sil[p].start + sil[p].end) / 2);
  const bounds = [0, ...cuts, total];
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor(bounds[i] * sampleRate);
    const b = Math.floor(bounds[i + 1] * sampleRate);
    segs.push(trimSilence(samples.slice(a, b), sampleRate));
  }
  // 文字数比と実際の長さが極端にずれていたら分割失敗とみなす
  const segDur = segs.map((s) => s.length / sampleRate);
  const durSum = segDur.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    const ratio = segDur[i] / durSum / (weights[i] / sum);
    if (ratio < 0.3 || ratio > 3.2) {
      throw new Error(
        `行 ${i + 1} の切り出しが不自然です（比率 ${ratio.toFixed(2)}）。--per-line で1行ずつ生成してください。`,
      );
    }
  }
  return segs;
}

// 動画のフレームごとの音量と帯域エネルギー（波形アニメ用）
export function analyzeLevels(samples, sampleRate, fps = 30, bands = 12) {
  const N = 1024;
  const hop = sampleRate / fps;
  const frames = Math.ceil(samples.length / hop);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  // 80Hz〜8kHz を対数で bands 分割
  const edges = [];
  for (let b = 0; b <= bands; b++) edges.push(80 * Math.pow(8000 / 80, b / bands));
  const rms = [];
  const spec = [];
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    const center = Math.floor(f * hop + hop / 2);
    let e = 0;
    for (let i = 0; i < N; i++) {
      const idx = center - N / 2 + i;
      const v = idx >= 0 && idx < samples.length ? samples[idx] : 0;
      re[i] = v * win[i];
      im[i] = 0;
      e += v * v;
    }
    rms.push(Math.sqrt(e / N));
    fft(re, im);
    const row = [];
    for (let b = 0; b < bands; b++) {
      const lo = Math.max(1, Math.floor((edges[b] / sampleRate) * N));
      const hi = Math.max(lo + 1, Math.floor((edges[b + 1] / sampleRate) * N));
      let s = 0;
      for (let k = lo; k < hi && k < N / 2; k++) s += Math.hypot(re[k], im[k]);
      row.push(s / (hi - lo));
    }
    spec.push(row);
  }
  const peakRms = Math.max(1e-6, ...rms);
  const bandPeak = Math.max(1e-6, ...spec.flat());
  return {
    fps,
    rms: rms.map((v) => +(v / peakRms).toFixed(3)),
    bands: spec.map((row) => row.map((v) => +Math.pow(v / bandPeak, 0.6).toFixed(3))),
  };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j];
        const ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br;
        im[i + j] = ai + bi;
        re[i + j + len / 2] = ar - br;
        im[i + j + len / 2] = ai - bi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

// 簡易リサンプル（線形補間）。出力のサンプルレートをそろえるために使う。
export function resample(samples, from, to) {
  if (from === to) return samples;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const a = Math.floor(x);
    const t = x - a;
    out[i] = (samples[a] ?? 0) * (1 - t) + (samples[a + 1] ?? samples[a] ?? 0) * t;
  }
  return out;
}

// 発話部分の平均音量を targetDb(dBFS) にそろえる。
// 一瞬のピークはリミッターで抑えるので、音割れさせずに目標の大きさまで上げられる。
// ささやき等は voices.json の gainDb で意図的に小さくできる。
export function normalizeLoudness(samples, sampleRate, targetDb = -15) {
  const db = frameDb(samples, sampleRate, 10);
  const th = speechThreshold(db);
  const active = db.filter((d) => d >= th);
  if (!active.length) return samples;
  const meanPow = active.reduce((a, d) => a + Math.pow(10, d / 10), 0) / active.length;
  const cur = 10 * Math.log10(meanPow);
  const g = Math.pow(10, (targetDb - cur) / 20);
  return limit(samples.map((v) => v * g), sampleRate);
}

// 先読み付きのピークリミッター（上限 -1 dBFS）。
// 5ms 先までの最大値から必要な減衰量を求め、戻りは 60ms かけてなめらかに。
export function limit(samples, sampleRate, ceilingDb = -1) {
  const ceil = Math.pow(10, ceilingDb / 20);
  const n = samples.length;
  const look = Math.max(1, Math.round(sampleRate * 0.005));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.abs(samples[i]);
    need[i] = a > ceil ? ceil / a : 1;
  }
  // 先読み区間の最小値（= 最も強く抑える必要のある値）
  const minAhead = new Float32Array(n);
  const dq = [];
  for (let i = n - 1; i >= 0; i--) {
    while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[0] > i + look) dq.shift();
    minAhead[i] = need[dq[0]];
  }
  const rel = 1 - Math.exp(-1 / (sampleRate * 0.06));
  const out = new Float32Array(n);
  let gain = 1;
  for (let i = 0; i < n; i++) {
    const target = minAhead[i];
    gain = target < gain ? target : gain + (target - gain) * rel;
    out[i] = Math.max(-ceil, Math.min(ceil, samples[i] * gain));
  }
  return out;
}
