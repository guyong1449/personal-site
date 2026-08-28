import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateForPublish } from "../publish.js";

const baseDoc = {
  title: "测试标题",
  slug: "test-slug",
  contentType: "note",
  tags: ["topic/algorithm"],
  cover: null,
  body: "正文内容",
};

describe("validateForPublish", () => {
  it("accepts a well-formed note", () => {
    assert.deepEqual(validateForPublish("notes", "test-slug", baseDoc), []);
  });

  it("rejects empty title or body and bad slugs", () => {
    assert.match(
      validateForPublish("notes", "test-slug", { ...baseDoc, title: " " }).join("\n"),
      /标题不能为空/,
    );
    assert.match(
      validateForPublish("notes", "test-slug", { ...baseDoc, body: "" }).join("\n"),
      /正文不能为空/,
    );
    assert.match(
      validateForPublish("notes", "Bad Slug", baseDoc).join("\n"),
      /slug/,
    );
  });

  it("rejects duplicated or spaced tags", () => {
    const errors = validateForPublish("notes", "test-slug", {
      ...baseDoc,
      tags: ["a/b", "a/b", "c d"],
    });
    assert.match(errors.join("\n"), /标签重复/);
    assert.match(errors.join("\n"), /标签不能包含空格/);
  });

  it("rejects references to missing assets", () => {
    const errors = validateForPublish("notes", "test-slug", {
      ...baseDoc,
      body: "![图片](assets/missing-picture.png)",
    });
    assert.match(errors.join("\n"), /missing-picture\.png/);
  });

  it("rejects a gallery document published as a note", () => {
    assert.match(
      validateForPublish("notes", "test-slug", { ...baseDoc, contentType: "gallery" }).join("\n"),
      /不一致/,
    );
  });
});
