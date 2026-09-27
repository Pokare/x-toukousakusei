// 読み上げ時間の目安（おおよそのモーラ数）。まとめて生成した音声を行ごとに切り分けるときに使う。
export function estimateMora(text) {
  let w = 0;
  for (const ch of text) {
    if (/[ぁ-んァ-ヶー]/.test(ch)) w += 1;
    else if (/[一-龠々]/.test(ch)) w += 1.9;
    else if (/[0-9０-９]/.test(ch)) w += 1.6;
    else if (/[A-Za-z]/.test(ch)) w += 0.6;
    else if (/[、，,]/.test(ch)) w += 1.5;
    else if (/[。．！？!?…]/.test(ch)) w += 1;
  }
  return Math.max(1, w);
}
