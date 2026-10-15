import fs from "node:fs/promises";
import path from "node:path";

const profilePath = (repoRoot) => path.join(repoRoot, "apps/web/src/lib/site-profile.json");

export function validateSiteProfile(profile) {
  if (typeof profile?.intro !== "string" || !profile.intro.trim() || profile.intro.length > 4000) {
    throw new Error("首页介绍不能为空，且最多 4000 字");
  }
  if (typeof profile.linkedin !== "string") throw new Error("LinkedIn 链接格式不正确");
  const linkedin = profile.linkedin.trim();
  if (linkedin) {
    let url;
    try { url = new URL(linkedin); } catch { throw new Error("请输入完整的 LinkedIn 个人主页链接"); }
    if (url.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(url.hostname) ||
        !/^\/in\/[^/]+\/?$/.test(url.pathname) || url.username || url.password || url.search || url.hash) {
      throw new Error("请使用 https://www.linkedin.com/in/用户名/ 格式的个人主页链接");
    }
  }
  return { intro: profile.intro.trim(), linkedin };
}

export async function readSiteProfile(repoRoot) {
  return JSON.parse(await fs.readFile(profilePath(repoRoot), "utf8"));
}

export async function saveSiteProfile(repoRoot, profile) {
  const validated = validateSiteProfile(profile);
  await fs.writeFile(profilePath(repoRoot), `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return validated;
}
