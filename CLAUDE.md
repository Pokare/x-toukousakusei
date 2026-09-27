# このリポジトリについて

Gemini 3.8 Flash TTS（ナレーション）× Remotion（映像）の解説動画プロジェクト「深夜の録音スタジオ」。詳細は README.md。

## Gemini の声に差し替える手順（GEMINI_API_KEY がある環境で）

1. `npm install`
2. `npm run tts -- --dry-run` で呼び出し計画（既定9回）を確認してから `npm run tts`
   - 無料枠は1日のリクエスト数が少ない。429 で止まったら翌日に再実行（生成済みの行はキャッシュされる）
   - 最後に「長さが不自然」な行が警告されたら `npm run tts -- --only <id,...> --per-line`
3. `npm run render` → `out/video.mp4` を確認
4. `public/voice/` の変更をコミット（`.env*` と `out/` はコミットしない）

## 実装ルール

- 演出のタイミングは `line(id).start / end` など台本の行を基準に書く（秒の直書きはしない）
- シーン単体の確認は `npx remotion still src/dev/<scene>.tsx Scene out.png --frame=N`
- APIキーはログやファイルに出さない
- デザインは src/theme.ts のトークン（C / DISPLAY / FONT / MONO）だけを使う。参考にした動画の配色・レイアウトは使わない
