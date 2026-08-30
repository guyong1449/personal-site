export function verifyRemotePush(run, branchName, fullCommit, parentHash) {
  const remote = run(
    "git",
    ["ls-remote", "--heads", "origin", branchName],
    { timeoutMs: 30000 },
  );
  const remoteHash = remote.ok ? remote.stdout.trim().split(/\s+/)[0] : "";
  if (remoteHash === fullCommit) {
    return { state: "current", remoteHash };
  }

  if (remote.ok && parentHash && remoteHash === parentHash) {
    return { state: "parent", remoteHash, parentHash };
  }

  return {
    state: "unknown",
    remoteHash,
    parentHash,
    reason: remote.ok ? "远端分支指向其他提交或尚未创建" : remote.stderr || remote.stdout,
  };
}
