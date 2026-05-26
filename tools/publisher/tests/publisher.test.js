import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runPublisher } from "../src/index.js";

async function writeFile(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

async function readJson(targetPath) {
  return JSON.parse(await fs.readFile(targetPath, "utf8"));
}

async function readText(targetPath) {
  return fs.readFile(targetPath, "utf8");
}

async function setupFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publisher-test-"));
  const vaultRoot = path.join(root, "vault");
  const outputRoot = path.join(root, "public");

  await writeFile(
    path.join(vaultRoot, "notes", "public-note.md"),
    `---
title: "Public Note"
publish: true
content_type: note
cover: "images/cover.png"
channels:
  - site
  - wechat
summary: "Visible summary"
tags:
  - exported
---

This note should be exported.

![Inline Image](images/inline.png)
![Vault Pic](vault-pic.png)
![[public-note-diagram.png|400]]
![[public-note-extra.png|667x346]]
See [[Lecture 11]] and [[Spring Study|gallery item]].
`
  );

  await writeFile(path.join(vaultRoot, "notes", "images", "cover.png"), "cover-bytes");
  await writeFile(path.join(vaultRoot, "notes", "images", "inline.png"), "inline-bytes");
  await writeFile(path.join(vaultRoot, "pic", "vault-pic.png"), "vault-pic-bytes");
  await writeFile(
    path.join(vaultRoot, "notes", "public-note_images", "public-note-diagram.png"),
    "obsidian-inline-bytes"
  );
  await writeFile(
    path.join(vaultRoot, "notes", "shared-assets", "public-note-extra.png"),
    "obsidian-shared-bytes"
  );

  await writeFile(
    path.join(vaultRoot, "notes", "draft-note.md"),
    `---
title: "Draft Note"
publish: false
content_type: note
channels:
  - site
---

This note should stay private.
`
  );

  await writeFile(
    path.join(vaultRoot, "courses", "lecture-11.md"),
    `---
title: "Lecture 11"
publish: true
content_type: course
channels:
  - site
  - xiaohongshu
summary: "Course recap"
course: "CS301"
week: "w7"
---

Course content.
`
  );

  await writeFile(
    path.join(vaultRoot, "gallery", "spring-study.md"),
    `---
title: "Spring Study"
publish: true
content_type: artwork
channels:
  - site
summary: "Artwork summary"
art_category: illustration
---

Gallery content.
`
  );

  return { root, vaultRoot, outputRoot };
}

test("exports only publishable content for the site", async () => {
  const { vaultRoot, outputRoot } = await setupFixture();

  const result = await runPublisher({
    vaultRoot,
    outputRoot,
    publicScope: {
      include: ["notes", "courses", "gallery"],
      exclude: []
    }
  });

  assert.equal(result.exported.site, 3);

  const notePath = path.join(outputRoot, "notes", "public-note.md");
  const hiddenNotePath = path.join(outputRoot, "notes", "draft-note.md");
  const coursePath = path.join(outputRoot, "courses", "lecture-11.md");
  const galleryPath = path.join(outputRoot, "gallery", "spring-study.md");

  await assert.doesNotReject(() => fs.access(notePath));
  await assert.rejects(() => fs.access(hiddenNotePath));
  await assert.doesNotReject(() => fs.access(coursePath));
  await assert.doesNotReject(() => fs.access(galleryPath));
});

test("writes metadata index files grouped by content type", async () => {
  const { vaultRoot, outputRoot } = await setupFixture();

  await runPublisher({
    vaultRoot,
    outputRoot,
    publicScope: {
      include: ["notes", "courses", "gallery"],
      exclude: []
    }
  });

  const notes = await readJson(path.join(outputRoot, "metadata", "notes.json"));
  const courses = await readJson(path.join(outputRoot, "metadata", "courses.json"));
  const gallery = await readJson(path.join(outputRoot, "metadata", "gallery.json"));

  assert.equal(notes.length, 1);
  assert.equal(notes[0].slug, "public-note");
  assert.equal(courses.length, 1);
  assert.equal(courses[0].slug, "lecture-11");
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0].slug, "spring-study");
});

test("writes social drafts only for explicitly listed channels", async () => {
  const { vaultRoot, outputRoot } = await setupFixture();

  const result = await runPublisher({
    vaultRoot,
    outputRoot,
    publicScope: {
      include: ["notes", "courses", "gallery"],
      exclude: []
    }
  });

  assert.deepEqual(result.exported.social, {
    wechat: 1,
    xiaohongshu: 1
  });

  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "social", "wechat", "public-note.md"))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "social", "xiaohongshu", "lecture-11.md"))
  );
  await assert.rejects(() =>
    fs.access(path.join(outputRoot, "social", "wechat", "lecture-11.md"))
  );
});

test("copies relative assets and rewrites cover and markdown image paths", async () => {
  const { vaultRoot, outputRoot } = await setupFixture();

  await runPublisher({
    vaultRoot,
    outputRoot,
    publicScope: {
      include: ["notes", "courses", "gallery"],
      exclude: []
    }
  });

  const exportedNote = await readText(path.join(outputRoot, "notes", "public-note.md"));
  const notes = await readJson(path.join(outputRoot, "metadata", "notes.json"));

  assert.match(exportedNote, /cover: "\/assets\/public-note-cover\.png"/);
  assert.match(exportedNote, /!\[Inline Image\]\(\/assets\/public-note-inline\.png\)/);
  assert.match(exportedNote, /!\[Vault Pic\]\(\/assets\/public-note-inline-2\.png\)/);
  assert.match(
    exportedNote,
    /<img src="\/assets\/public-note-inline-3\.png" alt="public-note-diagram\.png" width="400" style="max-width: 100%; height: auto;" \/>/
  );
  assert.match(
    exportedNote,
    /<img src="\/assets\/public-note-inline-4\.png" alt="public-note-extra\.png" width="667" height="346" style="max-width: 100%; height: auto;" \/>/
  );
  assert.equal(notes[0].cover, "/assets/public-note-cover.png");

  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "assets", "public-note-cover.png"))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "assets", "public-note-inline.png"))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "assets", "public-note-inline-2.png"))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "assets", "public-note-inline-3.png"))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(outputRoot, "assets", "public-note-inline-4.png"))
  );
});

test("rewrites obsidian internal links into front-end friendly routes", async () => {
  const { vaultRoot, outputRoot } = await setupFixture();

  await runPublisher({
    vaultRoot,
    outputRoot,
    publicScope: {
      include: ["notes", "courses", "gallery"],
      exclude: []
    }
  });

  const exportedNote = await readText(path.join(outputRoot, "notes", "public-note.md"));

  assert.match(exportedNote, /\[Lecture 11\]\(\/courses\/lecture-11\)/);
  assert.match(exportedNote, /\[gallery item\]\(\/gallery\/spring-study\)/);
});
