# 深夜0時、無人のブースで。— Gemini 3.8 Flash TTS セッション

Google の音声合成モデル **Gemini 3.8 Flash TTS**（2026-09-23 公開）を紹介する、約2分・1920×1080 の解説動画です。
**声は Gemini 3.8 Flash TTS、映像は Claude Code（Opus 5.5）が Remotion のコードで描いています。**

「Gemini 3.8 Flash TTS × Opus 5.5 で動画を作る」という作り方は、KEITO さん（[@keitowebai](https://x.com/keitowebai)）の投稿に刺激を受けました。
台本・構成・デザインは独自に作り、参考にした動画と似すぎていないかを第三者チェックで確認しています（「新機能を紹介する」という題材は共通です）。

```
台本(JSON) ──▶ Gemini 3.8 Flash TTS ──▶ 行ごとのWAV ＋ 長さ ＋ 音量データ
                                              │
Claude Code(Opus 5.5) が書いた Remotion シーン ◀┘ ──▶ MP4（1920×1080 / 30fps）
```

## 構成

深夜0時、誰もいない録音ブースで AI の声だけがセッションを進める、という設定です。5つの機能を「トラック」として順に再生します。

| パート | 内容 | 映像 |
|---|---|---|
| COLD OPEN | 無人のブース → 声の正体 → 今夜の5トラック | 空の録音ブースと ON AIR ランプ、台本→エンジン→音声の流れ、チャンネルのマスキングテープ |
| TRACK 01 声を、注文する | 文章で声を注文（ボイスデザイン）→ Hume AI の評価で 71.4 点・全体トップ | テープに書いた注文でつまみが動き、注文した声が話す。パタパタ表示のボード |
| TRACK 02 ト書きで、演じ分け | 同じセリフを3テイク（眠そうに／はしゃいで／泣くのをこらえて） | 台本のト書きが書き換わり、テイクが録音されていく |
| TRACK 03 ふたり同時収録 | 役を書き分けた台本から、DJとゲストの声を一度に | 1本のタイムラインに2トラックが同時に録れる |
| TRACK 04 声の棚 | プリセット30→2000超、100以上の言語と方言、30秒で自分の声も棚へ | 声の棚、ダイヤル、テープリール |
| TRACK 05 放送前チェック | SynthID の電子透かし、持ち主本人の声による同意 | QCシート、波形のサインが入った同意書 |
| ON AIR | 誰もいなかったブース、試す方法、この動画の作り方 | 無人のブースに戻り、パッチベイとエンドクレジット |

### デザイン

- 暗いスタジオ（#0E1014）× コーラルオレンジ（#FF6A3D：録音・強調）× ミント（#3BE3B4：信号・OK）
- 見出し Dela Gothic One ／ 本文 Zen Kaku Gothic New ／ 計器表示 JetBrains Mono
- 画面上部に REC ランプ・タイムコード・トラック表示・進行バー
- 字幕は下に白文字。話している進み具合に合わせて下線が伸び、ナレーター以外の声には「ささやき」「話者A」などの札がつく
- トラックの切り替えは、コーラルのテープが画面を横切るスレート

## 工夫した点

1. **音声と映像の自動同期**：すべての演出を「台本のどの行の何秒目か」で指定しています。声・台本を変えても `npm run tts` だけで全体のタイミングが合い直します。
2. **波形・メーターが本物の声に反応**：生成した音声の音量と帯域をフレームごとに解析し（`public/voice/levels.json`）、オシロスコープ・VUメーター・録音クリップに使っています。
3. **無料枠で回る TTS パイプライン**：29行を「同じ声・同じ演技指示」ごとにまとめ、**Gemini の呼び出し9回**で全ナレーションを生成します。生成結果は行ごとにキャッシュされ、直した行だけ作り直せます。
4. **控えめな効果音**：スクリプトで合成しているので権利の心配がありません（`--props='{"sfx":false}'` で無効化）。
5. **APIキーなしでも全体を確認できる仮音声**（Open JTalk）。

## 必要なもの・費用

| もの | 用途 | 費用 |
|---|---|---|
| Claude Pro / Max | Claude Code（Opus 5.5）で映像のコードを書く・直す | サブスク内 |
| Gemini API キー | Gemini 3.8 Flash TTS でナレーション生成 | [Google AI Studio](https://aistudio.google.com/apikey) で無料発行。無料枠内で生成可（有料枠でも100秒で数円程度） |
| Node.js 20 以上 | Remotion で描画・書き出し | 無料 |
| Python 3 ＋ `pyopenjtalk-plus`（任意） | APIキーなしで試す仮音声 | 無料 |

※ 無料枠の上限（1日あたりのリクエスト数など）は変わることがあります。上限に当たったら翌日に同じコマンドを実行すれば、生成済みの行はスキップされます。

## 使い方

```bash
npm install

# 1) APIキーを設定（どちらか）
#    ・環境変数 GEMINI_API_KEY に設定（Claude Code on the web なら環境設定の環境変数に追加して新しいセッションを開始）
#    ・プロジェクト直下に .env.local を作って  GEMINI_API_KEY=xxxx  と書く（.gitignore 済み）
#    キーはチャットやコードに貼らないでください。

# 2) ナレーションを生成（Gemini 3.8 Flash TTS / 9回の呼び出し）
npm run tts
#    まず計画だけ見る:        npm run tts -- --dry-run
#    特定の行だけ作り直す:    npm run tts -- --only t2-2,t2-3 --per-line
#    キーなしで仮音声:        npm run tts:placeholder   （要: pip install pyopenjtalk-plus numpy）

# 3) プレビュー（ブラウザで確認・微調整）
npm run dev

# 4) 書き出し
npm run render        # → out/video.mp4（H.264 / AAC 192kbps / 1920×1080 / 30fps）
npm run render:final  # 公開用。声が Gemini になっていないと止まる（エンドクレジットの「声はGemini」を守るため）
npm run still         # → out/thumbnail.png（冒頭の「誰もいない。」の画面。投稿のサムネイル候補）
```

## 台本・声を変えるには

- **台本**: `narration/script.json` の `text`（字幕兼読み上げ）を編集します。読み方を変えたいときは `speak`（Gemini 用）や `yomi`（仮音声用）を追加します。
- **声と演技指示**: `narration/voices.json`
  - `gemini.voice` … 既成ボイス名（Charon, Leda, Algenib, Sulafat, Puck など）、または AI Studio の Voice Design / クローンで作ったカスタムボイスID（`voice_...`）
  - `gemini.style` … 演技指示（例:「眠そうに。まぶたが重く、あくびをこらえながら…」）。読み上げられません。
  - `gainDb` … 仕上がりの音量（ささやきを小さく等）
- 変更後は `npm run tts` → `npm run render`。映像のタイミングは自動で追従します。
- 行の間とトラック間の間合いは `script.json` の `timing`（`lineGap` / `sectionGap`）で調整します。

## Claude Code に頼むときのコツ（この動画の作り方）

1. 最初にデザインシステム（色・フォント・部品）を決めて、全シーンで共有する。
2. 台本を JSON にし、**演出は必ず「行の開始/終了」基準で書かせる**（秒数を直書きさせない）。
3. シーンごとに「指定した瞬間を静止画で書き出す → 見て直す」を何周も繰り返させる。
4. 最後に全体を書き出して通しで確認する。

## 事実関係（2026-09-23 の Google 発表との照合）

| 動画内の主張 | 確認 |
|---|---|
| 文章で声を注文できる（ボイスデザイン） | ✅ 自然言語で声をゼロから設計 |
| Hume AI の評価で 71.4 点・全体トップ | ✅ Voice Design Benchmark 71.4 で総合1位 |
| ト書きで演技を変えられる、息をのむ音や笑い声も | ✅ 行ごとの演技指示、`<laughs>` `<gasp>` などの非言語表現 |
| 役を書き分けた台本から2人の声を一度に | ✅ 1本の台本で2話者 |
| プリセットは30種類から2000超へ | ✅ 既成ボイスのライブラリが2,000以上（従来は30） |
| 方言まで入れて100以上の言語 | ✅ 100以上の言語・方言 |
| 30秒ぶんの声で自分の声も使える | ✅ 30秒のサンプルで声のクローン（一部地域は利用不可） |
| 声をまねるには持ち主本人の声による同意が必要 | ✅ 本人の同意音声を録って照合 |
| すべての音声に SynthID の電子透かし | ✅ |
| Google AI Studio と Gemini API で試せる | ✅（Gemini Notebook でも利用可） |

## ファイル構成

```
narration/script.json     台本（29行・7パート）と間合い
narration/voices.json     声・演技指示の設定
scripts/tts.mjs           ナレーション生成（Gemini / 仮音声）→ public/voice/
scripts/providers/        Gemini 3.8 Flash TTS 呼び出し・仮音声
scripts/lib/wav.mjs       WAV処理（行の切り分け、音量正規化、波形用の解析）
scripts/make-sfx.mjs      効果音の合成
src/theme.ts              デザインシステム（色・フォント・配置）
src/timeline.ts           音声の長さから全行・全パートの時刻を計算
src/Stage.tsx             背景・シーン・声・計器表示・字幕・テープワイプの重ね合わせ
src/scenes/*.tsx          各パートの映像
src/components/           字幕、計器表示、テープワイプ、メーター、パネル、アイコンなど
src/dev/*.tsx             シーン単体のプレビュー用エントリ
public/voice/             生成済みナレーション（現在は仮音声）
```

## クレジット・ライセンス

- 作り方のヒント: KEITO さん（@keitowebai）の投稿
- 仮音声: HTS voice "Mei"（名古屋工業大学 MMDAgent, CC BY 3.0）。Gemini の声に差し替えれば不要です。
- フォント: Dela Gothic One / Zen Kaku Gothic New / JetBrains Mono（SIL Open Font License）
- Remotion: 個人・従業員3人以下の企業は無料（[ライセンス](https://www.remotion.dev/license)）
