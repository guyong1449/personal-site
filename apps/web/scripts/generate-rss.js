const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const PUBLIC_ROOT = path.join(REPO_ROOT, "content", "public");
const OUTPUT_PATH = path.join(__dirname, "..", "public", "feed.xml");

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://guyong.site";
const SITE_NAME = "GUYONG";
const SITE_DESCRIPTION = "Guyong 的个人网站：技术笔记、课程学习记录与少量画作。";

function loadMetadata(kind) {
  const filePath = path.join(PUBLIC_ROOT, "metadata", `${kind}.json`);
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Deterministic output: dates come from content frontmatter only. Items
// without any date omit pubDate instead of stamping build time.
function itemDate(item) {
  const source = item.updated || item.created;
  if (!source) {
    return null;
  }
  const time = new Date(source).getTime();
  return Number.isNaN(time) ? null : time;
}

function generateItem(item, kind) {
  const time = itemDate(item);
  const pubDate = time ? `      <pubDate>${new Date(time).toUTCString()}</pubDate>\n` : "";

  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${SITE_URL}/${kind}/${item.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/${kind}/${item.slug}</guid>
      <description>${escapeXml(item.summary || "")}</description>
${pubDate}      <category>${kind}</category>
    </item>`;
}

function generateFeed() {
  const notes = loadMetadata("notes");
  const gallery = loadMetadata("gallery");

  const allItems = [
    ...notes.map((item) => ({ ...item, kind: "notes" })),
    ...gallery.map((item) => ({ ...item, kind: "gallery" })),
  ].sort((a, b) => {
    const dateA = itemDate(a) ?? 0;
    const dateB = itemDate(b) ?? 0;
    return dateB - dateA;
  });

  const itemsXml = allItems
    .map((item) => generateItem(item, item.kind))
    .join("\n");

  const latest = allItems.reduce((max, item) => {
    const time = itemDate(item);
    return time && time > max ? time : max;
  }, 0);
  const lastBuildDate = latest
    ? `  <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>\n`
    : "";

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>zh-CN</language>
${lastBuildDate}    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, feed, "utf8");
  console.log(`Feed generated at ${OUTPUT_PATH}`);
  console.log(`Total items: ${allItems.length}`);
}

generateFeed();
