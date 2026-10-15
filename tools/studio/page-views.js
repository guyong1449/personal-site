import fs from "node:fs/promises";
import path from "node:path";

export function isLocalStatsRequest(req) {
  const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
  try {
    if (!local.has(new URL(`http://${req.headers.host}`).hostname)) return false;
    if (req.headers.origin && !local.has(new URL(req.headers.origin).hostname)) return false;
    return req.headers["sec-fetch-site"] !== "cross-site";
  } catch { return false; }
}

export async function readProductionPageViews(repoRoot) {
  let config = {};
  try {
    config = JSON.parse(await fs.readFile(path.join(repoRoot, ".local-content", "studio-secrets.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error("本机统计配置无法读取");
  }
  const token = process.env.PAGE_VIEWS_ADMIN_TOKEN || config.pageViewsAdminToken;
  const base = process.env.PAGE_VIEWS_API_URL || "https://guyong.site";
  if (!token) throw new Error("访问统计尚未配置后台凭据");
  const url = new URL("/api/admin/page-views", base);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("统计 API 必须使用 HTTPS");
  }
  const response = await fetch(url, {
    headers: { "x-admin-token": token }, cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`线上统计暂时不可用（HTTP ${response.status}）`);
  const data = await response.json();
  // Only allow aggregate fields through to the Studio browser.
  return { total: data.total, uniquePaths: data.uniquePaths, updatedAt: data.updatedAt, topPaths: data.topPaths };
}
