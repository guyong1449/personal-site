import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { describe, it } from "node:test";

const scriptPath = fileURLToPath(new URL("./check-links.mjs", import.meta.url));

async function fixture(source, { asset = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-site-links-"));
  await mkdir(path.join(root, "content", "public", "metadata"), { recursive: true });
  await mkdir(path.join(root, "content", "public", "notes"), { recursive: true });
  await mkdir(path.join(root, "content", "public", "gallery"), { recursive: true });
  await mkdir(path.join(root, "content", "public", "assets"), { recursive: true });
  await writeFile(
    path.join(root, "content", "public", "metadata", "notes.json"),
    JSON.stringify([{ slug: "note-one", title: "Note one" }]),
  );
  await writeFile(
    path.join(root, "content", "public", "metadata", "gallery.json"),
    JSON.stringify([{ slug: "art-one", title: "Art one" }]),
  );
  await writeFile(path.join(root, "content", "public", "notes", "note-one.md"), source);
  if (asset) {
    await writeFile(path.join(root, "content", "public", "assets", "image.webp"), "fixture");
  }
  return root;
}

function runCheck(root) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, STUDIO_REPO_ROOT: root },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("check-links", () => {
  it("accepts local/root assets with titles and query fragments, safe external URLs, and internal routes", async () => {
    const root = await fixture([
      "![relative](assets/image.webp?width=1#hero \"title\")",
      "![root](/assets/image.webp#detail)",
      "![external](https://cdn.example.com/image.webp?size=2 \"remote\")",
      "[relative route](notes/note-one?view=full#section)",
      "[root route](/gallery/art-one#detail \"title\")",
      "[collection](/gallery)",
    ].join("\n\n"));

    try {
      const result = await runCheck(root);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /check-links ok/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports unsafe protocols, missing assets, and missing internal slugs", async () => {
    const root = await fixture([
      "![missing](assets/missing.webp?width=1#hero \"title\")",
      "[missing route](/notes/no-such?view=full#section)",
      "[unsafe](javascript:alert(1))",
    ].join("\n\n"), { asset: false });

    try {
      const result = await runCheck(root);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /引用的资产不存在/);
      assert.match(result.stderr, /内部链接指向不存在的内容/);
      assert.match(result.stderr, /不安全的链接协议/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
