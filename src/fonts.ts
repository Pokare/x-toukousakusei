import { loadFont } from "@remotion/fonts";
import dela from "@expo-google-fonts/dela-gothic-one/400Regular/DelaGothicOne_400Regular.ttf";
import zen400 from "@expo-google-fonts/zen-kaku-gothic-new/400Regular/ZenKakuGothicNew_400Regular.ttf";
import zen500 from "@expo-google-fonts/zen-kaku-gothic-new/500Medium/ZenKakuGothicNew_500Medium.ttf";
import zen700 from "@expo-google-fonts/zen-kaku-gothic-new/700Bold/ZenKakuGothicNew_700Bold.ttf";
import zen900 from "@expo-google-fonts/zen-kaku-gothic-new/900Black/ZenKakuGothicNew_900Black.ttf";
import mono500 from "@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf";
import mono700 from "@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf";

// サブセットではなくフォント全体を読み込む（どの漢字でも表示が崩れないように）
const faces: [string, string, string][] = [
  ["Dela Gothic One", dela, "400"],
  ["Zen Kaku Gothic New", zen400, "400"],
  ["Zen Kaku Gothic New", zen500, "500"],
  ["Zen Kaku Gothic New", zen700, "700"],
  ["Zen Kaku Gothic New", zen900, "900"],
  ["JetBrains Mono", mono500, "500"],
  ["JetBrains Mono", mono700, "700"],
];

let loaded = false;
export const ensureFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const [family, url, weight] of faces) {
    loadFont({ family, url, weight, format: "truetype" });
  }
};
