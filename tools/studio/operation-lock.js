import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

function lockTimeoutMs() {
  const value = Number(process.env.STUDIO_LOCK_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function readLock(lockFile) {
  try {
    const source = fs.readFileSync(lockFile, "utf8");
    const value = JSON.parse(source);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function corruptLockIsStale(lockFile) {
  try {
    // A competing process can observe the file between the exclusive create
    // and the complete payload write. Recent corrupt locks must remain busy.
    return Date.now() - fs.statSync(lockFile).mtimeMs > lockTimeoutMs();
  } catch {
    return true;
  }
}

function staleLock(value, lockFile) {
  const validRecord =
    value &&
    Number.isInteger(value.pid) &&
    value.pid > 0 &&
    Number.isFinite(value.createdAt) &&
    typeof value.hostname === "string" &&
    value.hostname.length > 0 &&
    typeof value.token === "string" &&
    value.token.length > 0;
  if (!validRecord) {
    return corruptLockIsStale(lockFile);
  }
  const timestamp = Number(value?.createdAt);
  const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Number.POSITIVE_INFINITY;
  const sameHost = value?.hostname === os.hostname();
  if (!value?.hostname || sameHost) {
    return !isProcessAlive(Number(value?.pid));
  }
  return age > lockTimeoutMs();
}

export function acquireOperationLock(repoRoot, operation) {
  const lockFile = path.join(repoRoot, ".local-content", ".studio-operation.lock");
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  const token = crypto.randomUUID();
  const payload = {
    pid: process.pid,
    createdAt: Date.now(),
    operation,
    hostname: os.hostname(),
    token,
  };

  let staleAttempts = 0;
  for (;;) {
    try {
      const handle = fs.openSync(lockFile, "wx");
      try {
        fs.writeFileSync(handle, `${JSON.stringify(payload)}\n`, "utf8");
      } finally {
        fs.closeSync(handle);
      }
      return {
        ok: true,
        release() {
          const current = readLock(lockFile);
          if (current?.token === token) {
            fs.rmSync(lockFile, { force: true });
          }
        },
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        return { ok: false, stage: "lock", message: `无法创建 Studio 操作锁：${error.message}` };
      }

      const current = readLock(lockFile);
      if (!staleLock(current, lockFile)) {
        const operationName = current?.operation || "未知操作";
        return {
          ok: false,
          stage: "busy",
          message: `已有 Studio 操作正在进行（${operationName}，PID ${current?.pid ?? "未知"}），请稍后重试`,
        };
      }

      const staleFile = `${lockFile}.stale-${process.pid}-${Date.now()}`;
      try {
        fs.renameSync(lockFile, staleFile);
        fs.rmSync(staleFile, { force: true });
        staleAttempts = 0;
      } catch {
        // Another process may have acquired/replaced the lock; retry the
        // exclusive create and report the current owner if it remains busy.
        staleAttempts += 1;
        if (staleAttempts >= 3) {
          return {
            ok: false,
            stage: "busy",
            message: "发现过期 Studio 操作锁，但暂时无法安全清理；请确认没有残留 Studio 进程后重试",
          };
        }
      }
    }
  }
}
