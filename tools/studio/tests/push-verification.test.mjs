import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyRemotePush } from "../push-verification.js";

function fakeRun(remote) {
  return (command, args) => {
    if (args[0] === "ls-remote") {
      return typeof remote === "string"
        ? { ok: true, stdout: `${remote}\trefs/heads/main`, stderr: "" }
        : { ok: false, stdout: "", stderr: "network unavailable" };
    }
    return { ok: false, stdout: "", stderr: "unexpected command" };
  };
}

describe("remote push verification", () => {
  it("recognizes an already-received commit", () => {
    assert.equal(verifyRemotePush(fakeRun("new-hash"), "main", "new-hash", "parent-hash").state, "current");
  });

  it("allows rollback only when the remote is still the parent", () => {
    assert.equal(verifyRemotePush(fakeRun("parent-hash"), "main", "new-hash", "parent-hash").state, "parent");
  });

  it("reports a different or unreachable remote as unknown", () => {
    assert.equal(verifyRemotePush(fakeRun("other-hash"), "main", "new-hash", "parent-hash").state, "unknown");
    assert.equal(verifyRemotePush(fakeRun(null), "main", "new-hash", "parent-hash").state, "unknown");
  });
});
