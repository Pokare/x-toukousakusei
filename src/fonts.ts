import { loadFont } from "@remotion/fonts";
import w400 from "@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf";
import w500 from "@expo-google-fonts/noto-sans-jp/500Medium/NotoSansJP_500Medium.ttf";
import w700 from "@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf";
import w900 from "@expo-google-fonts/noto-sans-jp/900Black/NotoSansJP_900Black.ttf";

// サブセットではなくフォント全体を読み込む（どの漢字でも表示が崩れないように）
const faces: [string, string][] = [
  [w400, "400"],
  [w500, "500"],
  [w700, "700"],
  [w900, "900"],
];

let loaded = false;
export const ensureFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const [url, weight] of faces) {
    loadFont({ family: "Noto Sans JP", url, weight, format: "truetype" });
  }
};
