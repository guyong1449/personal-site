import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { isLocalStatsRequest, readProductionPageViews } from "../page-views.js";

test("statistics proxy rejects foreign Host/Origin and cross-site reads", () => {
  assert.equal(isLocalStatsRequest({ headers: { host: "127.0.0.1:4319" } }), true);
  assert.equal(isLocalStatsRequest({ headers: { host: "evil.example" } }), false);
  assert.equal(isLocalStatsRequest({ headers: { host: "localhost:4319", origin: "https://evil.example" } }), false);
  assert.equal(isLocalStatsRequest({ headers: { host: "localhost:4319", "sec-fetch-site": "cross-site" } }), false);
});

test("Studio keeps the secret server-side and forwards only aggregate fields", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-stats-"));
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.PAGE_VIEWS_ADMIN_TOKEN;
  delete process.env.PAGE_VIEWS_ADMIN_TOKEN;
  try {
    await assert.rejects(readProductionPageViews(dir), /尚未配置/);
    await fs.mkdir(path.join(dir, ".local-content"));
    await fs.writeFile(path.join(dir, ".local-content", "studio-secrets.json"), JSON.stringify({ pageViewsAdminToken: "test-secret" }));
    globalThis.fetch = async (url, options) => {
      assert.equal(url.pathname, "/api/admin/page-views");
      assert.equal(url.search, "");
      assert.equal(options.headers["x-admin-token"], "test-secret");
      assert.equal(options.redirect, "error");
      return Response.json({ total: 3, uniquePaths: 1, updatedAt: "now", topPaths: [{ path: "/", count: 3 }], token: "should-not-pass" });
    };
    const result = await readProductionPageViews(dir);
    assert.equal(result.total, 3);
    assert.equal("token" in result, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.PAGE_VIEWS_ADMIN_TOKEN;
    else process.env.PAGE_VIEWS_ADMIN_TOKEN = originalToken;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
