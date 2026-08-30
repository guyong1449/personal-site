import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { acquireOperationLock } from "../operation-lock.js";

describe("Studio cross-process operation lock", () => {
  it("records an owner and blocks a concurrent operation", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-"));
    const first = acquireOperationLock(root, "publish:notes/one");
    assert.equal(first.ok, true);
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    const record = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    assert.equal(record.pid, process.pid);
    assert.equal(record.operation, "publish:notes/one");
    assert.ok(record.createdAt);
    const second = acquireOperationLock(root, "unpublish:notes/one");
    assert.equal(second.ok, false);
    assert.equal(second.stage, "busy");
    first.release();
    const third = acquireOperationLock(root, "unpublish:notes/one");
    assert.equal(third.ok, true);
    third.release();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("cleans a lock whose recorded process is no longer alive", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-stale-"));
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(
      lockFile,
      JSON.stringify({
        pid: 99999999,
        createdAt: Date.now(),
        operation: "crashed",
        hostname: os.hostname(),
        token: "crashed-owner-token",
      }),
      "utf8",
    );
    const lock = acquireOperationLock(root, "publish:notes/retry");
    assert.equal(lock.ok, true);
    lock.release();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("cleans an owner lock that exceeds the configured timeout", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-timeout-"));
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(
      lockFile,
      JSON.stringify({
        pid: process.pid,
        createdAt: Date.now() - 1000,
        operation: "remote-host-stale",
        hostname: "another-host",
        token: "remote-stale-token",
      }),
      "utf8",
    );
    const previous = process.env.STUDIO_LOCK_TIMEOUT_MS;
    process.env.STUDIO_LOCK_TIMEOUT_MS = "1";
    try {
      const lock = acquireOperationLock(root, "publish:notes/timeout");
      assert.equal(lock.ok, true);
      lock.release();
    } finally {
      if (previous === undefined) delete process.env.STUDIO_LOCK_TIMEOUT_MS;
      else process.env.STUDIO_LOCK_TIMEOUT_MS = previous;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not steal a recent lock whose payload is still being written", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-writing-"));
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, "", "utf8");
    const lock = acquireOperationLock(root, "publish:notes/race");
    assert.equal(lock.ok, false);
    assert.equal(lock.stage, "busy");
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("does not steal a recent JSON lock with incomplete owner fields", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-incomplete-"));
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, "{}", "utf8");
    const lock = acquireOperationLock(root, "publish:notes/incomplete");
    assert.equal(lock.ok, false);
    assert.equal(lock.stage, "busy");
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("recovers an old corrupt lock after the timeout", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-lock-corrupt-"));
    const lockFile = path.join(root, ".local-content", ".studio-operation.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, "incomplete", "utf8");
    const old = new Date(Date.now() - 10_000);
    fs.utimesSync(lockFile, old, old);
    const previous = process.env.STUDIO_LOCK_TIMEOUT_MS;
    process.env.STUDIO_LOCK_TIMEOUT_MS = "1";
    try {
      const lock = acquireOperationLock(root, "publish:notes/recovered");
      assert.equal(lock.ok, true);
      lock.release();
    } finally {
      if (previous === undefined) delete process.env.STUDIO_LOCK_TIMEOUT_MS;
      else process.env.STUDIO_LOCK_TIMEOUT_MS = previous;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
