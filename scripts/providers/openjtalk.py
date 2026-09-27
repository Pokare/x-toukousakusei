"""APIキーなしで動作確認するための仮音声（Open JTalk + HTS voice「mei」）。

使い方: tts.mjs から JSON を標準入力で受け取り、各行を WAV に書き出す。
  [{"id": "...", "text": "よみ", "out": "path.wav", "halfTone": 0, "speed": 1.0}]

必要: pip install pyopenjtalk-plus numpy
音声「mei」: 名古屋工業大学 MMDAgent "Mei" (CC BY 3.0)
"""
import json
import sys
import wave

import numpy as np
import pyopenjtalk


def main() -> None:
    jobs = json.load(sys.stdin)
    for job in jobs:
        x, sr = pyopenjtalk.tts(
            job["text"],
            speed=float(job.get("speed", 1.0)),
            half_tone=float(job.get("halfTone", 0.0)),
        )
        x = np.asarray(x, dtype=np.float64)
        peak = float(np.abs(x).max()) or 1.0
        pcm = (x / peak * 0.9 * 32767).astype("<i2")
        with wave.open(job["out"], "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(int(sr))
            w.writeframes(pcm.tobytes())
        print(f"  ✓ {job['id']} ({len(x) / sr:.2f}s)", flush=True)


if __name__ == "__main__":
    main()
