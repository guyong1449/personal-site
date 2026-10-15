import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);

export function parseDeploymentStatus(stdout) {
  const payload = JSON.parse(stdout);
  const deployments = Array.isArray(payload) ? payload : payload.deployments;
  const production = deployments?.find((entry) => entry.target === "production");
  if (!production) throw new Error("没有查询到生产部署记录");
  return {
    state: production.state ?? production.readyState ?? "UNKNOWN",
    url: production.url ? `https://${production.url}` : null,
    created: production.createdAt ?? production.created ?? null,
    commit: production.meta?.githubCommitSha ?? null,
  };
}

async function findVercelCli() {
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const relative of ["node_modules/vercel/dist/vc.js", "../lib/node_modules/vercel/dist/vc.js"]) {
      const candidate = path.resolve(dir, relative);
      try { await fs.access(candidate); return candidate; } catch {}
    }
  }
  throw new Error("找不到本机 Vercel CLI，请先安装并登录 vercel");
}

export async function readDeploymentStatus(repoRoot) {
  const project = JSON.parse(await fs.readFile(path.join(repoRoot, ".vercel/project.json"), "utf8"));
  const cli = await findVercelCli();
  let result;
  try {
    result = await execute(process.execPath, [cli, "ls", project.projectName, "--json",
      "--environment", "production", "--limit", "1", "--scope", project.orgId,
      "--non-interactive", "--no-color"], {
      cwd: repoRoot, timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true,
    });
  } catch (error) {
    throw new Error(error.killed ? "查询超时，请稍后重试" : "无法查询 Vercel，请检查网络及本机 vercel 登录状态");
  }
  return parseDeploymentStatus(result.stdout);
}
