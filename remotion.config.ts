import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);

// クラウド環境などで Playwright の Chromium が入っていればそれを使う（なければ Remotion が自動で取得）
const pw = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(pw)) Config.setBrowserExecutable(pw);
