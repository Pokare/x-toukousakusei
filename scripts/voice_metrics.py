#!/usr/bin/env python3
"""ナレーションの声を数値で比べるためのレポート。

生成した public/voice/*.wav について、役（narrator / designed など）ごとに
  - 声の高さ（F0 の中央値と幅）
  - 話す速さ（1秒あたりのモーラ数の目安）
  - 音量（発話部分の平均 dBFS）
を計測し、docs/reference-voice.json（参考動画のナレーションを同じ方法で測った値）と並べて表示する。

使い方:  python3 scripts/voice_metrics.py
必要:    numpy のみ（pip install numpy）
"""
from __future__ import annotations

import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        width = w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if width != 2:
        raise ValueError(f"16bit PCM のみ対応: {path}")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr


def frames(x: np.ndarray, n: int, hop: int) -> np.ndarray:
    if len(x) < n:
        x = np.pad(x, (0, n - len(x)))
    count = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(count)[:, None]
    return x[idx]


def analyze(x: np.ndarray, sr: int) -> dict:
    """発話部分の F0・音量・発話時間を返す（自己相関による簡易ピッチ推定）。"""
    n = int(sr * 0.04)
    hop = int(sr * 0.01)
    fr = frames(x, n, hop)
    rms = np.sqrt((fr**2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    peak = np.percentile(db, 98)
    floor = np.percentile(db, 10)
    active = db > max(peak - 32, floor + 8)
    win = np.hanning(n)
    lo, hi = int(sr / 500), int(sr / 70)  # 70〜500 Hz
    f0 = []
    for f, a in zip(fr, active):
        if not a:
            continue
        f = (f - f.mean()) * win
        spec = np.fft.rfft(f, 2 * n)
        ac = np.fft.irfft(np.abs(spec) ** 2)[: n]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.5:  # はっきり周期がある（有声）フレームだけ
            # 放物線補間で細かく
            if 1 <= lag < len(ac) - 1:
                a1, a2, a3 = ac[lag - 1], ac[lag], ac[lag + 1]
                d = 0.5 * (a1 - a3) / (a1 - 2 * a2 + a3 + 1e-12)
            else:
                d = 0.0
            f0.append(sr / (lag + d))
    f0 = np.array(f0)
    act_db = db[active]
    return {
        "speech_sec": round(float(active.sum() * hop / sr), 3),
        "f0_median_hz": round(float(np.median(f0)), 1) if len(f0) else None,
        "f0_p10_hz": round(float(np.percentile(f0, 10)), 1) if len(f0) else None,
        "f0_p90_hz": round(float(np.percentile(f0, 90)), 1) if len(f0) else None,
        "f0_range_semitones": round(float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10))), 1) if len(f0) > 10 else None,
        "voiced_ratio": round(float(len(f0) / max(1, active.sum())), 2),
        "loudness_dbfs": round(float(10 * np.log10(np.mean(10 ** (act_db / 10)))), 1) if len(act_db) else None,
    }


def mora(text: str) -> float:
    """scripts/lib/text.mjs の estimateMora と同じ規則。"""
    w = 0.0
    for ch in text:
        if re.match(r"[ぁ-んァ-ヶー]", ch):
            w += 1
        elif re.match(r"[一-龠々]", ch):
            w += 1.9
        elif re.match(r"[0-9０-９]", ch):
            w += 1.6
        elif re.match(r"[A-Za-z]", ch):
            w += 0.6
        elif re.match(r"[、，,]", ch):
            w += 1.5
        elif re.match(r"[。．！？!?…]", ch):
            w += 1
    return max(1.0, w)


def summarize(items: list[dict]) -> dict:
    def med(key):
        v = [i[key] for i in items if i.get(key) is not None]
        return round(float(np.median(v)), 1) if v else None

    total_mora = sum(i["mora"] for i in items)
    total_sec = sum(i["duration_sec"] for i in items)
    return {
        "lines": len(items),
        "f0_median_hz": med("f0_median_hz"),
        "f0_range_semitones": med("f0_range_semitones"),
        "loudness_dbfs": med("loudness_dbfs"),
        "mora_per_sec": round(total_mora / total_sec, 2) if total_sec else None,
    }


def ours() -> dict:
    script = json.loads((ROOT / "narration/script.json").read_text())
    manifest = json.loads((ROOT / "public/voice/manifest.json").read_text())
    by_role: dict[str, list[dict]] = {}
    for s in script["sections"]:
        for l in s["lines"]:
            info = manifest["lines"][l["id"]]
            x, sr = read_wav(ROOT / "public" / info["file"])
            m = analyze(x, sr)
            m.update({"id": l["id"], "duration_sec": info["duration"], "mora": mora(l.get("yomi") or l.get("speak") or l["text"])})
            by_role.setdefault(l["voice"], []).append(m)
    return {"provider": manifest.get("provider"), "roles": {k: summarize(v) for k, v in by_role.items()}}


def main() -> None:
    ref_path = ROOT / "docs/reference-voice.json"
    ref = json.loads(ref_path.read_text()) if ref_path.exists() else None
    cur = ours()
    print(f"■ いまの音声: provider = {cur['provider']}")
    cols = ["lines", "f0_median_hz", "f0_range_semitones", "mora_per_sec", "loudness_dbfs"]
    head = f"{'役':<12}" + "".join(f"{c:>20}" for c in cols)
    print(head)
    for role, v in cur["roles"].items():
        print(f"{role:<12}" + "".join(f"{str(v.get(c)):>20}" for c in cols))
    if ref:
        print(f"\n■ 参考動画のナレーション（{ref['note']}）")
        print(head)
        for role, v in ref["roles"].items():
            print(f"{role:<12}" + "".join(f"{str(v.get(c)):>20}" for c in cols))
        print(f"\n  参考動画の行間（無音）: 中央値 {ref['pauses']['line_gap_median_sec']} 秒 / パートの切れ目: 中央値 {ref['pauses']['section_gap_median_sec']} 秒")
        n, r = cur["roles"].get("narrator"), ref["roles"].get("narrator")
        if n and r and n.get("mora_per_sec") and r.get("mora_per_sec"):
            print(f"  ナレーターの速さ: 参考比 {n['mora_per_sec'] / r['mora_per_sec']:.2f} 倍")
    if "--json" in sys.argv:
        print(json.dumps(cur, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
