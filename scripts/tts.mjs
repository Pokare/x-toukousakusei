#!/usr/bin/env node
// ナレーション音声を作る。
//   npm run tts                 … Gemini 3.8 Flash TTS（GEMINI_API_KEY が必要）
//   npm run tts:placeholder     … APIキーなしの仮音声（Open JTalk / mei）
// オプション:
//   --per-line       1行ずつ生成（有料枠向け。無料枠だとリクエスト数が足りない）
//   --max-lines N    まとめて生成するときの1回あたりの最大行数（既定 10）
//   --interval S     Gemini 呼び出しの間隔（秒, 既定 21 = 無料枠の 3回/分 に収まる）
//   --only a,b       指定した行だけ作り直す
//   --force          キャッシュを使わず全部作り直す
//   --dry-run        呼び出し計画だけ表示
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeLevels,
  normalizeLoudness,
  readWav,
  resample,
  splitByWeights,
  trimSilence,
  writeWav,
} from "./lib/wav.mjs";
import { estimateMora } from "./lib/text.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_RATE = 48000;

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const has = (name) => args.includes(`--${name}`);

// .env / .env.local があれば読む（キーをコードに書かないため）
for (const f of [".env", ".env.local"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const provider = opt("provider", hasKey ? "gemini" : "");
if (!provider) {
  console.error(
    [
      "GEMINI_API_KEY が見つかりません。",
      "  ・Google AI Studio (https://aistudio.google.com/apikey) で無料のAPIキーを発行",
      "  ・環境変数 GEMINI_API_KEY に設定するか、.env.local に GEMINI_API_KEY=... と書く",
      "  ・キーなしで流れだけ確認したいときは: npm run tts:placeholder",
    ].join("\n"),
  );
  process.exit(1);
}

// プロキシ環境では Node の fetch に環境変数のプロキシを使わせる（Node 22.21+）
if (
  provider === "gemini" &&
  (process.env.HTTPS_PROXY || process.env.https_proxy) &&
  !process.env.NODE_USE_ENV_PROXY
) {
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
  });
  process.exit(r.status ?? 1);
}

const script = JSON.parse(readFileSync(join(ROOT, "narration/script.json"), "utf8"));
const voices = JSON.parse(readFileSync(join(ROOT, "narration/voices.json"), "utf8"));
const lines = script.sections.flatMap((s) => s.lines.map((l) => ({ ...l, section: s.id })));
const only = typeof opt("only") === "string" ? new Set(opt("only").split(",")) : null;
const force = has("force");
const dryRun = has("dry-run");

const speakText = (l) => l.speak ?? l.text;
const readWeight = (l) => estimateMora(l.yomi ?? speakText(l));
const sha = (o) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 16);
const voiceOf = (l) => {
  const v = voices.voices[l.voice];
  if (!v) throw new Error(`voices.json に "${l.voice}" がありません（行 ${l.id}）`);
  return v;
};

const cacheDir = join(ROOT, ".cache/tts", provider);
mkdirSync(cacheDir, { recursive: true });

function cacheKey(l) {
  const v = voiceOf(l);
  if (provider === "gemini") {
    return sha({
      p: "gemini",
      model: voices.gemini.model,
      voice: v.gemini.voice,
      style: v.gemini.style ?? "",
      text: speakText(l),
    });
  }
  return sha({ p: "openjtalk", ...v.openjtalk, text: l.yomi ?? speakText(l) });
}

const rawPath = (l) => join(cacheDir, `${cacheKey(l)}.wav`);
const todo = lines.filter((l) => force || (only ? only.has(l.id) : false) || !existsSync(rawPath(l)));

console.log(`▶ プロバイダ: ${provider}${provider === "gemini" ? ` (${voices.gemini.model})` : "（仮音声）"}`);
console.log(`  全 ${lines.length} 行 / 生成が必要 ${todo.length} 行`);

if (provider === "gemini") await runGemini(todo);
else if (provider === "openjtalk") runOpenJTalk(todo);
else throw new Error(`未知のプロバイダ: ${provider}`);

if (!dryRun) finalize();

// ---------------------------------------------------------------------------

function planBatches(items) {
  if (has("per-line")) return items.map((l) => [l]);
  const maxLines = Number(opt("max-lines", 10));
  // 同じ声・同じ演技指示の行を台本順にまとめる
  const groups = new Map();
  for (const l of items) {
    const v = voiceOf(l).gemini;
    const k = `${v.voice}|${v.style ?? ""}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const batches = [];
  for (const g of groups.values()) {
    const n = Math.ceil(g.length / maxLines);
    const size = Math.ceil(g.length / n);
    for (let i = 0; i < g.length; i += size) batches.push(g.slice(i, i + size));
  }
  return batches;
}

async function runGemini(items) {
  if (!items.length) return;
  const { synthesizeGemini } = await import("./providers/gemini.mjs");
  const batches = planBatches(items);
  const interval = Number(opt("interval", 21));
  console.log(`  Gemini 呼び出し回数: ${batches.length} 回（無料枠は1日あたりの回数に上限があります）`);
  for (const [i, b] of batches.entries()) {
    console.log(`  [${i + 1}/${batches.length}] ${b.map((l) => l.id).join(", ")}`);
  }
  if (dryRun) return;
  for (const [i, batch] of batches.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, interval * 1000));
    const v = voiceOf(batch[0]).gemini;
    const text = batch.map(speakText).join("\n");
    // まとめて読ませるときは、行の境目で必ず間を取らせる（あとで無音で切り分けるため）
    const style =
      batch.length > 1
        ? `${v.style ?? ""}\n改行ごとに文を区切り、行と行のあいだでは必ず0.6秒ほどしっかり間を空ける。`
        : v.style;
    process.stdout.write(`  ● [${i + 1}/${batches.length}] ${v.voice} ${batch.length}行 … `);
    const wav = await synthesizeGemini({
      text,
      voice: v.voice,
      style,
      model: voices.gemini.model,
      languageCode: voices.gemini.languageCode,
    });
    const { samples, sampleRate } = readWav(wav);
    const segs =
      batch.length === 1
        ? [trimSilence(samples, sampleRate)]
        : splitByWeights(samples, sampleRate, batch.map(readWeight));
    batch.forEach((l, k) => writeWav(rawPath(l), segs[k], sampleRate));
    console.log(`${(samples.length / sampleRate).toFixed(1)}s ✓`);
  }
}

function runOpenJTalk(items) {
  if (!items.length || dryRun) return;
  const jobs = items.map((l) => ({
    id: l.id,
    text: l.yomi ?? speakText(l).replace(/[「」]/g, ""),
    out: rawPath(l),
    ...voiceOf(l).openjtalk,
  }));
  const r = spawnSync(process.env.PYTHON || "python3", [join(ROOT, "scripts/providers/openjtalk.py")], {
    input: JSON.stringify(jobs),
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (r.status !== 0) {
    console.error("仮音声の生成に失敗しました。`pip install pyopenjtalk-plus numpy` を実行してください。");
    process.exit(1);
  }
}

function finalize() {
  const outDir = join(ROOT, "public/voice");
  mkdirSync(outDir, { recursive: true });
  const manifest = {
    provider,
    model: provider === "gemini" ? voices.gemini.model : "open_jtalk/mei",
    lines: {},
  };
  const levels = { fps: 30, lines: {} };
  for (const l of lines) {
    const p = rawPath(l);
    if (!existsSync(p)) throw new Error(`音声がありません: ${l.id}`);
    const { samples, sampleRate } = readWav(p);
    let x = resample(trimSilence(samples, sampleRate, 0.04), sampleRate, OUT_RATE);
    x = normalizeLoudness(x, OUT_RATE, -19 + (voiceOf(l).gainDb ?? 0));
    const file = `voice/${l.id}.wav`;
    writeWav(join(ROOT, "public", file), x, OUT_RATE);
    const duration = +(x.length / OUT_RATE).toFixed(3);
    manifest.lines[l.id] = { file, duration, voice: l.voice };
    levels.lines[l.id] = analyzeLevels(x, OUT_RATE, 30, 12);
  }
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(outDir, "levels.json"), JSON.stringify(levels));
  const total = Object.values(manifest.lines).reduce((a, b) => a + b.duration, 0);
  console.log(`✔ public/voice に ${lines.length} 行を書き出しました（発話合計 ${total.toFixed(1)} 秒）`);

  // まとめ生成の切り分けミスを見つけるため、読みの長さに対して極端に短い/長い行を警告
  const speed = lines.map((l) => manifest.lines[l.id].duration / readWeight(l));
  const median = [...speed].sort((a, b) => a - b)[Math.floor(speed.length / 2)];
  const odd = lines.filter((l, i) => speed[i] / median < 0.55 || speed[i] / median > 1.8);
  for (const l of odd) {
    console.warn(`⚠ ${l.id}「${l.text}」の長さが不自然です（${manifest.lines[l.id].duration}s）。`);
  }
  if (odd.length) {
    console.warn(
      `  聞いて確認し、必要なら: npm run tts -- --only ${odd.map((l) => l.id).join(",")} --per-line`,
    );
  }
}
