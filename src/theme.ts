// デザインシステム「深夜の録音スタジオ」
// 暗いスタジオ × コーラルオレンジ（録音・強調）× ミント（信号・OK）

export const C = {
  bg: "#0E1014", // いちばん奥
  bgGlow: "#1A1F28", // 中央のほのかな明かり
  panel: "#151920", // パネル
  panelHi: "#1C212B", // パネルの明るい面
  border: "#272D38",
  borderHi: "#3A4150",
  text: "#F3EFE7", // 暖かい白
  sub: "#8B93A1", // 補足
  dim: "#4C5361", // さらに控えめ
  coral: "#FF6A3D", // 主アクセント（録音・強調）
  coralSoft: "rgba(255, 106, 61, 0.16)",
  mint: "#3BE3B4", // 副アクセント（信号・OK）
  mintSoft: "rgba(59, 227, 180, 0.14)",
  amber: "#FFB938", // メーター中域
  red: "#FF3B30", // REC ランプ・ピーク
  ink: "#0E1014", // コーラル地の上の文字
};

// 見出し: 極太の Dela Gothic One / 本文: Zen Kaku Gothic New / 計器表示: JetBrains Mono
export const DISPLAY = '"Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
export const FONT = '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
export const MONO = '"JetBrains Mono", "Zen Kaku Gothic New", monospace';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 余白・配置
export const PAD_X = 96;
export const HUD_Y = 44; // 上部の計器表示
export const STAGE_TOP = 150; // シーンの内容はここから
export const STAGE_BOTTOM = 880; // ここより下は字幕エリア

// 声の種類 → 字幕につく札
export const VOICE_TAG: Record<string, { label: string; color: string } | undefined> = {
  whisper: { label: "ささやき", color: C.mint },
  laugh: { label: "笑い", color: C.mint },
  sigh: { label: "ため息", color: C.mint },
  designed: { label: "デザインした声", color: C.coral },
  speakerA: { label: "話者 A", color: C.coral },
  speakerB: { label: "話者 B", color: C.mint },
};
