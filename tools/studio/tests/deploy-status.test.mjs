import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDeploymentStatus } from "../deploy-status.js";

test("reads current Vercel JSON envelope and selects production rather than preview", () => {
  const production = { target: "production", state: "READY", createdAt: 123, url: "site.vercel.app", meta: { githubCommitSha: "abc123" } };
  assert.deepEqual(parseDeploymentStatus(JSON.stringify({ deployments: [{ target: "preview" }, production] })), {
    state: "READY", created: 123, url: "https://site.vercel.app", commit: "abc123",
  });
});
test("does not misreport a preview or invalid output as production", () => {
  assert.throws(() => parseDeploymentStatus(JSON.stringify({ deployments: [{ target: "preview" }] })), /没有查询到/);
  assert.throws(() => parseDeploymentStatus("invalid JSON"));
});
