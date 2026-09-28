// Gemini 3.8 Flash TTS 呼び出し。
// 1) Gemini API の Interactions エンドポイント（3.8 TTS の標準の呼び方）
// 2) だめなら generateContent（speechMetadata 付き）にフォールバック
// APIキーは GEMINI_API_KEY（または GOOGLE_API_KEY）から読む。ログには絶対に出さない。

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function redact(msg, key) {
  return key ? String(msg).split(key).join("[redacted]") : String(msg);
}

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function toWav(b64, mime = "") {
  const bytes = Buffer.from(b64, "base64");
  if (bytes.toString("ascii", 0, 4) === "RIFF") return bytes;
  const m = /rate=(\d+)/i.exec(mime);
  if (/l16|pcm/i.test(mime) || !mime) return pcmToWav(bytes, m ? Number(m[1]) : 24000);
  throw new Error(`想定外の音声形式が返りました: ${mime}`);
}

const isCustomVoice = (v) => /^(voice_|voicekey_)/.test(v);

async function viaInteractions({ key, model, text, voice, style }) {
  const content = { type: "text", text };
  if (style) content.annotations = [{ type: "speech_metadata", style }];
  const res = await fetch(`${BASE}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model,
      input: [{ type: "user_input", content: [content] }],
      response_format: { type: "audio", mime_type: "audio/wav" },
      generation_config: { speech_config: [{ voice }] },
      store: false,
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, status: res.status, error: body };
  const payload = JSON.parse(body);
  if (payload.status && payload.status !== "completed") {
    return { ok: false, status: 500, error: `status=${payload.status}` };
  }
  const audio = (payload.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((p) => p.type === "audio" && p.data);
  if (!audio.length) return { ok: false, status: 500, error: "音声が返りませんでした" };
  return { ok: true, wav: toWav(audio[0].data, audio[0].mime_type) };
}

async function viaGenerateContent({ key, model, text, voice, style, languageCode }) {
  const part = { text };
  if (style) part.speechMetadata = { style };
  const voiceConfig = isCustomVoice(voice) ? { voice } : { prebuiltVoiceConfig: { voiceName: voice } };
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [part] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { languageCode, voiceConfig },
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, status: res.status, error: body };
  const payload = JSON.parse(body);
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
  if (!inline) return { ok: false, status: 500, error: "音声が返りませんでした" };
  return { ok: true, route: "generateContent", wav: toWav(inline.data, inline.mimeType || inline.mime_type) };
}

function retryDelaySec(errorBody) {
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(errorBody ?? "");
  return m ? Math.ceil(Number(m[1])) + 1 : 30;
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

// 1回ぶんの音声合成。429 は待って再試行（最大3回）。
export async function synthesizeGemini({ text, voice, style, model, languageCode = "ja" }) {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。Google AI Studio で無料のAPIキーを発行し、環境変数に設定してください。",
    );
  }
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    let r = await viaInteractions({ key, model, text, voice, style }).catch((e) => ({
      ok: false,
      status: 0,
      error: e.message,
    }));
    if (!r.ok && [400, 404, 405, 501].includes(r.status)) {
      const first = r.error;
      r = await viaGenerateContent({ key, model, text, voice, style, languageCode }).catch((e) => ({
        ok: false,
        status: 0,
        error: e.message,
      }));
      if (!r.ok) r.error = `interactions: ${first}\ngenerateContent: ${r.error}`;
    }
    if (r.ok) {
      if (process.env.TTS_DEBUG) console.log(`\n    (route: ${r.route ?? "interactions"})`);
      return r.wav;
    }
    lastErr = `HTTP ${r.status}: ${r.error}`;
    if (r.status === 429 || r.status >= 500 || r.status === 0) {
      const wait = r.status === 429 ? retryDelaySec(r.error) : 10 * (attempt + 1);
      if (/per.?day|PerDay|daily/i.test(r.error ?? "") && r.status === 429) break;
      console.warn(`  ⏳ ${redact(lastErr, key).slice(0, 160)} … ${wait}秒待って再試行`);
      await sleep(wait);
      continue;
    }
    break;
  }
  throw new Error(redact(lastErr, key).slice(0, 2000));
}
