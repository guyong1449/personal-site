import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-backup-"));
const source = path.join(root, "repo", ".local-content");
const backups = path.join(root, "backups");
const restoreTarget = path.join(root, "restored", ".local-content");

function write(relativePath, content) {
  const file = path.join(source, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

before(() => {
  write("notes/example.md", "草稿正文");
  write("assets/example.txt", "资产内容");
  write("runtime/studio.pid", "12345");
});

after(() => fs.rmSync(root, { recursive: true, force: true }));

describe("local-content backup and restore", () => {
  it("copies a draft tree to a timestamped backup without changing the source", async () => {
    const { createBackup } = await import("../backup.mjs");
    const result = createBackup({ source, destination: backups, keep: 2 });
    assert.ok(fs.existsSync(result.path));
    assert.equal(result.files, 2);
    assert.equal(fs.readFileSync(path.join(result.path, "notes", "example.md"), "utf8"), "草稿正文");
    assert.equal(fs.existsSync(path.join(source, "notes", "example.md")), true);
    assert.equal(fs.existsSync(path.join(source, "assets", "example.txt")), true);
    assert.equal(fs.existsSync(path.join(result.path, "runtime", "studio.pid")), false);
  });

  it("restores into a temporary target and protects an existing target by default", async () => {
    const { createBackup, restoreBackup } = await import("../backup.mjs");
    const backup = createBackup({ source, destination: backups, keep: 2 });
    const restored = restoreBackup({ source: backup.path, target: restoreTarget });
    assert.equal(fs.readFileSync(path.join(restored.target, "notes", "example.md"), "utf8"), "草稿正文");
    assert.equal(fs.existsSync(path.join(restored.target, "backup-manifest.json")), false);
    assert.throws(
      () => restoreBackup({ source: backup.path, target: restoreTarget }),
      /恢复目标已存在/,
    );
    const replaced = restoreBackup({ source: backup.path, target: restoreTarget, replace: true });
    assert.ok(replaced.previous);
    assert.equal(fs.existsSync(replaced.previous), true);
  });

  it("puts the original target back when the final restore swap fails", async () => {
    const { createBackup, restoreBackup } = await import("../backup.mjs");
    const backup = createBackup({ source, destination: backups, keep: 2 });
    fs.mkdirSync(restoreTarget, { recursive: true });
    fs.writeFileSync(path.join(restoreTarget, "keep.txt"), "original", "utf8");
    const previousDirectories = fs
      .readdirSync(path.dirname(restoreTarget))
      .filter((name) => name.includes("before-restore"))
      .sort();
    process.env.STUDIO_FAIL_RESTORE_SWAP = "1";
    try {
      assert.throws(
        () => restoreBackup({ source: backup.path, target: restoreTarget, replace: true }),
        /恢复目录切换失败/,
      );
    } finally {
      delete process.env.STUDIO_FAIL_RESTORE_SWAP;
    }
    assert.equal(fs.readFileSync(path.join(restoreTarget, "keep.txt"), "utf8"), "original");
    assert.deepEqual(
      fs.readdirSync(path.dirname(restoreTarget)).filter((name) => name.includes("before-restore")).sort(),
      previousDirectories,
    );
  });
});
