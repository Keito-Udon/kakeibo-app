// 見た目の1文字を1文字として数える（004 research.md #2）。
// String.length は UTF-16 の単位で数えるため、絵文字や濁点を後から付けた文字を2文字以上に数えてしまう。
// 入力チェック（サーバー）と入力欄の文字数表示で同じ関数を使い、両者の数え方をそろえる。
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export function countChars(text: string): number {
  return Array.from(segmenter.segment(text)).length;
}
