import assert from "node:assert/strict";
import { test } from "node:test";
import { listMarkdownImages, resizeMarkdownImage } from "../public/image-sizing.js";

test("sizes only the chosen image while preserving prose, image titles, code, and other images", () => {
  const original = '# 原文\n\n`![例子](assets/code.png)`\n\n```md\n![代码](assets/example.png)\n```\n\n![截图](assets/one.png "原始说明")\n\n公式 $x^2$\n\n![另一张](assets/two.png)\n';
  assert.equal(listMarkdownImages(original).length, 2);
  const sized = resizeMarkdownImage(original, 0, 65, "%");
  assert.equal(sized, original.replace('"原始说明"', '"原始说明 | width=65%"'));
  const pixels = resizeMarkdownImage(sized, 0, 480, "px");
  assert.match(pixels, /原始说明 \| width=480px/);
  assert.equal(resizeMarkdownImage(pixels, 0, null, "%"), original);
});

test("handles escaped alt text and parenthesized destinations without changing the image reference", () => {
  const original = '![屏幕\\]截图](assets/capture(1).png)';
  assert.equal(listMarkdownImages(original).length, 1);
  assert.equal(resizeMarkdownImage(original, 0, 320, "px"), '![屏幕\\]截图](assets/capture(1).png "width=320px")');
});

test("rejects invalid sizes and missing images", () => {
  const original = '![图片](assets/one.png)';
  for (const [width, unit] of [[0, "%"], [101, "%"], [15, "px"], [2401, "px"], [50.5, "%"], [100, "vh"]]) {
    assert.throws(() => resizeMarkdownImage(original, 0, width, unit), /宽度请输入/);
  }
  assert.throws(() => resizeMarkdownImage("", 0, 100, "%"), /请先选择正文图片/);
});

test("parses and rewrites align settings alongside width", () => {
  const combined = '![图](assets/a.png "说明 | width=60% | align=center")';
  const [image] = listMarkdownImages(combined);
  assert.equal(image.width, 60);
  assert.equal(image.unit, "%");
  assert.equal(image.align, "center");
  assert.equal(listMarkdownImages('![图](assets/a.png "align=right")')[0].align, "right");
  assert.equal(listMarkdownImages('![图](assets/a.png)')[0].align, "");

  assert.equal(
    resizeMarkdownImage(combined, 0, undefined, "%", "left"),
    '![图](assets/a.png "说明 | width=60% | align=left")',
  );
  assert.equal(
    resizeMarkdownImage(combined, 0, null, "%", null),
    '![图](assets/a.png "说明")',
  );
  assert.equal(
    resizeMarkdownImage('![图](assets/a.png)', 0, 80, "%", "center"),
    '![图](assets/a.png "width=80% | align=center")',
  );
  assert.equal(
    resizeMarkdownImage('![图](assets/a.png "align=center")', 0, undefined, "%", undefined),
    '![图](assets/a.png "align=center")',
  );
});
