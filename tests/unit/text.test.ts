import { describe, expect, it } from "vitest";

import { countChars } from "@/lib/text";

// 004 research.md #2: 見た目の1文字を1文字として数える
describe("countChars", () => {
  it.each([
    ["スーパー", 4],
    ["🍙", 1],
    ["👨‍👩‍👧", 1], // 複数のコードポイントを結合した絵文字
    ["が", 1], // 濁点を後から付けた「が」
    ["a\nb", 3], // 改行も1文字
    ["", 0],
  ])("%j は %d 文字", (text, expected) => {
    expect(countChars(text)).toBe(expected);
  });
});
