# このリポジトリについて

Gemini 3.8 Flash TTS（ナレーション）× Remotion（映像）の解説動画プロジェクト「深夜0時、無人のブースで。」。詳細は README.md。

## Gemini の声に差し替える手順（GEMINI_API_KEY がある環境で）

事実ベースで進める。推測で「できた」と言わない。各ステップの結果（ログ・数値）をそのまま報告する。

1. `npm install`（仮音声も作るなら `pip install pyopenjtalk-plus numpy`）
2. 接続テスト（1リクエストだけ使う）: `npm run tts -- --only open-1 --per-line`
   - 失敗したらエラー本文（キーは自動で伏せ字）を読んで、リクエスト形式を直してから次へ
3. `npm run tts -- --dry-run` で残りの呼び出し計画を確認してから `npm run tts`
   - 無料枠は1日のリクエスト数が少ない。429 で止まったら翌日に再実行（生成済みの行はキャッシュされる）
   - 最後に「長さが不自然」な行が警告されたら `npm run tts -- --only <id,...> --per-line`
4. `python3 scripts/voice_metrics.py` で、参考動画のナレーション（docs/reference-voice.json）と
   声の高さ・話す速さ・音量を数値で比べる。大きくずれていれば narration/voices.json の voice / style を調整して該当行だけ作り直す
5. `npm run render:final` → `out/video.mp4` を確認（仮音声のままだと最初のフレームでエラーになる）
6. `public/voice/` の変更をコミット（`.env*` と `out/` はコミットしない）

## 実装ルール

- 演出のタイミングは `line(id).start / end` など台本の行を基準に書く（秒の直書きはしない）
- シーン単体の確認は `npx remotion still src/dev/<scene>.tsx Scene out.png --frame=N`
- APIキーはログやファイルに出さない
- デザインは src/theme.ts のトークン（C / DISPLAY / FONT / MONO）だけを使う。参考にした動画の配色・レイアウトは使わない

## 確認できていないこと（2026-09-28 時点）

- Gemini 3.8 Flash TTS の実際の呼び出し（この環境にキーがなかったため未実行）。リクエスト形式は
  HyperFrames（heygen-com/hyperframes）の実装と Google Cloud のサンプルコードに合わせてある
- 参考動画の作者（KEITO さん）が実際に使った手順・ツール・声の設定。YouTube / X はこの環境から接続できず、未確認
