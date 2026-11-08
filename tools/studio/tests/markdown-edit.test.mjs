import assert from "node:assert/strict";
import { test } from "node:test";
import { wrapSelection, prefixLines, numberLines, codeBlock, linkSelection, insertSnippet, TABLE_SNIPPET } from "../public/markdown-edit.js";

test("wrapSelection toggles markers and keeps the selection inside", () => {
  const wrapped = wrapSelection("正文加粗", 2, 4, "**");
  assert.equal(wrapped.value, "正文**加粗**");
  assert.deepEqual([wrapped.start, wrapped.end], [4, 6]);

  const unwrapped = wrapSelection(wrapped.value, 2, 8, "**");
  assert.equal(unwrapped.value, "正文加粗");
  assert.deepEqual([unwrapped.start, unwrapped.end], [2, 4]);

  const empty = wrapSelection("ab", 1, 1, "`");
  assert.equal(empty.value, "a``b");
  assert.deepEqual([empty.start, empty.end], [2, 2]);
});

test("prefixLines toggles headings, lists, and quotes across multi-line blocks", () => {
  const text = "第一段\n\n甲\n乙\n\n尾";
  const start = text.indexOf("甲");
  const end = text.indexOf("乙") + 1;
  const headed = prefixLines(text, start, end, "## ");
  assert.equal(headed.value, "第一段\n\n## 甲\n## 乙\n\n尾");

  const reverted = prefixLines(headed.value, headed.start, headed.end, "## ");
  assert.equal(reverted.value, text);

  const quoted = prefixLines(text, start, end, "> ");
  assert.equal(quoted.value, "第一段\n\n> 甲\n> 乙\n\n尾");

  const single = prefixLines("顶部\n要点", 3, 6, "- ");
  assert.equal(single.value, "顶部\n- 要点");
});

test("numberLines numbers sequentially and strips existing numbers", () => {
  const text = "甲\n乙";
  const numbered = numberLines(text, 0, text.length);
  assert.equal(numbered.value, "1. 甲\n2. 乙");
  const stripped = numberLines(numbered.value, 0, numbered.value.length);
  assert.equal(stripped.value, text);
});

test("codeBlock fences the selection and skips leading break after a blank line", () => {
  const afterBlank = codeBlock("上段\n\n", 4, 4);
  assert.equal(afterBlank.value, "上段\n\n```js\n代码\n```\n");
  assert.deepEqual([afterBlank.start, afterBlank.end], [10, 12]);

  const midLine = codeBlock("abc", 1, 1);
  assert.equal(midLine.value, "a\n\n```js\n代码\n```\nbc");
});

test("linkSelection treats URL selections as the destination and preselects it", () => {
  const urlText = "看 https://example.com/a";
  const start = urlText.indexOf("https://");
  const linked = linkSelection(urlText, start, urlText.length);
  assert.equal(linked.value, `看 [链接文字](https://example.com/a)`);
  assert.deepEqual([linked.start, linked.end], [
    linked.value.indexOf("https://"),
    linked.value.indexOf(")"),
  ]);

  const label = linkSelection("名词", 0, 2);
  assert.equal(label.value, "[名词](https://)");
  assert.deepEqual([label.start, label.end], [5, 13]);
});

test("insertSnippet places the cursor after the snippet", () => {
  const result = insertSnippet("ab", 1, 1, TABLE_SNIPPET);
  assert.equal(result.value, `a${TABLE_SNIPPET}b`);
  assert.deepEqual([result.start, result.end], [1 + TABLE_SNIPPET.length, 1 + TABLE_SNIPPET.length]);
});
