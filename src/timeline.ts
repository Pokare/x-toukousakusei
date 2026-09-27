// 台本（narration/script.json）と生成済み音声の長さ（public/voice/manifest.json）から
// すべての行・セクションの開始/終了時刻（秒）を計算する。
// 声を差し替えて長さが変わっても、映像の演出はここを基準に自動で合い直す。
import script from "../narration/script.json";
import manifest from "../public/voice/manifest.json";
import levelsJson from "../public/voice/levels.json";
import { FPS } from "./theme";

export type Line = {
  id: string;
  section: string;
  text: string;
  voice: string;
  file: string;
  start: number; // 話し始め（秒）
  end: number; // 話し終わり（秒）
  dur: number;
  next: number; // 次の行の開始（セクション最後の行ならセクションの終わり）
};

export type Section = {
  id: string;
  index: number;
  label: string; // "TRACK 01" など
  title: string; // トラック名
  start: number; // 最初の行の話し始め
  lastEnd: number; // 最後の行の話し終わり
  end: number; // 次のセクションの開始（最後はエンド）
  lines: Line[];
};

type Manifest = { provider: string; model: string; lines: Record<string, { file: string; duration: number }> };
type Levels = { fps: number; lines: Record<string, { rms: number[]; bands: number[][] }> };

const m = manifest as Manifest;
export const LEVELS = levelsJson as Levels;
export const VOICE_PROVIDER = m.provider;

const timing = script.timing;

const build = () => {
  const sections: Section[] = [];
  const lines: Line[] = [];
  let t = timing.leadIn;
  script.sections.forEach((s, si) => {
    if (si > 0) t += timing.sectionGap - timing.lineGap;
    const secLines: Line[] = [];
    s.lines.forEach((l) => {
      const info = m.lines[l.id];
      if (!info) throw new Error(`音声がありません: ${l.id}（npm run tts を実行してください）`);
      const line: Line = {
        id: l.id,
        section: s.id,
        text: l.text,
        voice: l.voice,
        file: info.file,
        start: t,
        end: t + info.duration,
        dur: info.duration,
        next: 0,
      };
      t = line.end + ((l as { pauseAfter?: number }).pauseAfter ?? timing.lineGap);
      secLines.push(line);
      lines.push(line);
    });
    sections.push({
      id: s.id,
      index: si,
      label: (s as { label?: string }).label ?? s.id,
      title: (s as { title?: string }).title ?? "",
      start: secLines[0].start,
      lastEnd: secLines[secLines.length - 1].end,
      end: 0,
      lines: secLines,
    });
  });
  const total = sections[sections.length - 1].lastEnd + timing.tail;
  sections.forEach((s, i) => {
    s.end = i + 1 < sections.length ? sections[i + 1].start : total;
    s.lines.forEach((l, k) => {
      l.next = k + 1 < s.lines.length ? s.lines[k + 1].start : s.end;
    });
  });
  return { sections, lines, total };
};

export const TL = build();
export const TOTAL_SEC = TL.total;
export const TOTAL_FRAMES = Math.ceil(TOTAL_SEC * FPS);

const byId = new Map(TL.lines.map((l) => [l.id, l]));
const secById = new Map(TL.sections.map((s) => [s.id, s]));

export const line = (id: string): Line => {
  const l = byId.get(id);
  if (!l) throw new Error(`台本に行 "${id}" がありません`);
  return l;
};

export const section = (id: string): Section => {
  const s = secById.get(id);
  if (!s) throw new Error(`台本にセクション "${id}" がありません`);
  return s;
};

// 時刻 t に話している行（行間の無音では null）
export const speakingAt = (t: number): Line | null =>
  TL.lines.find((l) => t >= l.start && t < l.end) ?? null;

// トラック切り替えのテープワイプの時間。a〜b でテープが横切り、mid で画面が完全に覆われる。
export const wipeInto = (id: string) => {
  const s = section(id);
  if (s.index === 0) return null;
  const prev = TL.sections[s.index - 1];
  const a = prev.lastEnd + 0.12;
  const b = s.start - 0.06;
  return { a, b, mid: (a + b) / 2, uncover: a + (b - a) * 0.72 };
};

/** シーンが見え始める時刻（テープが抜け始めるころ）。最初のシーンは 0 */
export const sceneEnter = (id: string) => wipeInto(id)?.mid ?? 0;

/** シーンが消える時刻（次のテープで画面が覆われた瞬間）。最後のシーンは動画の最後 */
export const sceneExit = (id: string) => {
  const s = section(id);
  const next = TL.sections[s.index + 1];
  return next ? wipeInto(next.id)!.mid : TL.total + 1;
};
