import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SUPPORTED_SOCIAL_CHANNELS = ["wechat", "xiaohongshu"];
const TYPE_TO_DIRECTORY = {
  note: "notes",
  course: "courses",
  artwork: "gallery"
};

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "[]") return [];
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatterDocument(source) {
  if (!source.startsWith("---\n")) {
    return { frontmatter: {}, body: source };
  }

  const endMarker = "\n---\n";
  const endIndex = source.indexOf(endMarker, 4);

  if (endIndex === -1) {
    return { frontmatter: {}, body: source };
  }

  const rawFrontmatter = source.slice(4, endIndex);
  const body = source.slice(endIndex + endMarker.length);
  const frontmatter = {};
  let activeObjectKey = null;
  let activeListKey = null;
  let activeTopLevelListKey = null;

  for (const rawLine of rawFrontmatter.split("\n")) {
    if (!rawLine.trim()) continue;

    const indent = rawLine.match(/^ */)[0].length;
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("- ")) {
      const listItem = parseScalar(trimmed.slice(2));

      if (indent === 2 && activeTopLevelListKey) {
        frontmatter[activeTopLevelListKey].push(listItem);
        continue;
      }

      if (activeObjectKey && activeListKey) {
        frontmatter[activeObjectKey][activeListKey].push(listItem);
      }
      continue;
    }

    if (indent === 0) {
      activeObjectKey = null;
      activeListKey = null;
      activeTopLevelListKey = null;
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();

      if (!rawValue) {
        frontmatter[key] = [];
        activeTopLevelListKey = key;
        continue;
      }

      frontmatter[key] = parseScalar(rawValue);
      continue;
    }

    if (indent === 2 && activeObjectKey) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();

      if (!rawValue) {
        if (Array.isArray(frontmatter[activeObjectKey])) {
          frontmatter[activeObjectKey] = {};
        }
        frontmatter[activeObjectKey][key] = [];
        activeListKey = key;
      } else {
        if (Array.isArray(frontmatter[activeObjectKey])) {
          frontmatter[activeObjectKey] = {};
        }
        frontmatter[activeObjectKey][key] = parseScalar(rawValue);
        activeListKey = null;
      }
    }
  }

  return { frontmatter, body };
}

function stringifyValue(value, indent = 0) {
  const prefix = " ".repeat(indent);

  if (Array.isArray(value)) {
    return value.map((item) => `${prefix}- ${item}`).join("\n");
  }

  if (typeof value === "boolean") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return `"${String(value)}"`;
}

function serializeFrontmatter(frontmatter) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      lines.push(stringifyValue(value, 2));
      continue;
    }

    lines.push(`${key}: ${stringifyValue(value)}`);
  }

  lines.push("---", "");
  return lines.join("\n");
}

function isRelativeAssetPath(value) {
  if (!value || typeof value !== "string") return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  if (value.startsWith("/")) return false;
  return true;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyAssetForExport({ sourceFilePath, outputRoot, slug, label }) {
  const extension = path.extname(sourceFilePath);
  const assetFileName = `${slug}-${label}${extension}`;
  const targetPath = path.join(outputRoot, "assets", assetFileName);
  await fs.copyFile(sourceFilePath, targetPath);
  return `/assets/${assetFileName}`;
}

async function resolveAssetSourcePath({ filePath, originalPath, vaultRoot }) {
  const directPath = path.resolve(path.dirname(filePath), originalPath);
  if (await pathExists(directPath)) {
    return directPath;
  }

  const noteBaseName = path.basename(filePath, path.extname(filePath));
  const fallbackPath = path.join(path.dirname(filePath), `${noteBaseName}_images`, originalPath);
  if (await pathExists(fallbackPath)) {
    return fallbackPath;
  }

  const siblingEntries = await fs.readdir(path.dirname(filePath), {
    withFileTypes: true
  });

  for (const entry of siblingEntries) {
    if (!entry.isDirectory()) continue;
    const candidatePath = path.join(path.dirname(filePath), entry.name, originalPath);
    if (await pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  if (vaultRoot) {
    const sharedPicDirectPath = path.join(vaultRoot, "pic", originalPath);
    if (await pathExists(sharedPicDirectPath)) {
      return sharedPicDirectPath;
    }

    const sharedPicBaseNamePath = path.join(vaultRoot, "pic", path.basename(originalPath));
    if (await pathExists(sharedPicBaseNamePath)) {
      return sharedPicBaseNamePath;
    }
  }

  throw new Error(`Asset not found for "${originalPath}" referenced by "${filePath}".`);
}

function normalizeInternalLinkKey(value) {
  return value.trim().replaceAll("\\", "/").replace(/\.md$/i, "").toLowerCase();
}

function routeForDirectory(directoryName, slug) {
  return `/${directoryName}/${slug}`;
}

function buildLinkLookup(entries, vaultRoot) {
  const linkLookup = new Map();

  for (const entry of entries) {
    const route = routeForDirectory(entry.exportDirectoryName, entry.slug);
    const relativePath = path
      .relative(vaultRoot, entry.filePath)
      .replaceAll("\\", "/")
      .replace(/\.md$/i, "");
    const baseName = path.basename(entry.filePath, path.extname(entry.filePath));
    const keys = new Set([entry.slug, entry.frontmatter.title, relativePath, baseName]);

    for (const key of keys) {
      if (!key) continue;
      linkLookup.set(normalizeInternalLinkKey(key), route);
    }
  }

  return linkLookup;
}

function rewriteInternalLinks(body, linkLookup) {
  return body.replace(/(?<!!)\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, rawTarget, rawAlias) => {
    const normalizedTarget = rawTarget.split("#")[0].trim();
    const route = linkLookup.get(normalizeInternalLinkKey(normalizedTarget));

    if (!route) {
      return rawAlias ? rawAlias.trim() : normalizedTarget;
    }

    const label = rawAlias ? rawAlias.trim() : normalizedTarget;
    return `[${label}](${route})`;
  });
}

function parseEmbedSize(value) {
  if (!value) return {};
  const normalized = value.trim().toLowerCase();

  if (/^\d+$/.test(normalized)) {
    return { width: normalized };
  }

  const dimensions = normalized.match(/^(\d+)x(\d+)$/);
  if (!dimensions) return {};

  return {
    width: dimensions[1],
    height: dimensions[2]
  };
}

async function rewriteAssetsInDocument({
  frontmatter,
  body,
  filePath,
  outputRoot,
  slug,
  vaultRoot,
  linkLookup
}) {
  const nextFrontmatter = { ...frontmatter };
  let nextBody = rewriteInternalLinks(body, linkLookup);

  if (isRelativeAssetPath(frontmatter.cover)) {
    const coverSource = await resolveAssetSourcePath({
      filePath,
      originalPath: frontmatter.cover,
      vaultRoot
    });
    nextFrontmatter.cover = await copyAssetForExport({
      sourceFilePath: coverSource,
      outputRoot,
      slug,
      label: "cover"
    });
  }

  const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...body.matchAll(markdownImagePattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const altText = match[1];
    const originalPath = match[2].trim();
    if (!isRelativeAssetPath(originalPath)) continue;

    const sourceFilePath = await resolveAssetSourcePath({
      filePath,
      originalPath,
      vaultRoot
    });
    const rewrittenPath = await copyAssetForExport({
      sourceFilePath,
      outputRoot,
      slug,
      label: index === 0 ? "inline" : `inline-${index + 1}`
    });

    nextBody = nextBody.replace(match[0], `![${altText}](${rewrittenPath})`);
  }

  const obsidianEmbedPattern = /!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
  const embedMatches = [...nextBody.matchAll(obsidianEmbedPattern)];

  for (let index = 0; index < embedMatches.length; index += 1) {
    const match = embedMatches[index];
    const originalPath = match[1].trim();
    if (!isRelativeAssetPath(originalPath)) continue;

    const sourceFilePath = await resolveAssetSourcePath({
      filePath,
      originalPath,
      vaultRoot
    });
    const rewrittenPath = await copyAssetForExport({
      sourceFilePath,
      outputRoot,
      slug,
      label: `inline-${matches.length + index + 1}`
    });
    const altText = path.basename(originalPath);
    const sizeAttributes = parseEmbedSize(match[2]);
    const widthAttribute = sizeAttributes.width ? ` width="${sizeAttributes.width}"` : "";
    const heightAttribute = sizeAttributes.height ? ` height="${sizeAttributes.height}"` : "";
    const responsiveStyleAttribute = ` style="max-width: 100%; height: auto;"`;
    const replacement =
      widthAttribute || heightAttribute
        ? `<img src="${rewrittenPath}" alt="${altText}"${widthAttribute}${heightAttribute}${responsiveStyleAttribute} />`
        : `![${altText}](${rewrittenPath})`;

    nextBody = nextBody.replace(match[0], replacement);
  }

  return {
    frontmatter: nextFrontmatter,
    body: nextBody
  };
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function removeAndRecreate(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
  await ensureDir(targetPath);
}

async function listMarkdownFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeConfig(config) {
  const publicScope = config.publicScope ?? config.public_scope ?? {};
  return {
    vaultRoot: config.vaultRoot ?? config.vault_root,
    outputRoot: config.outputRoot ?? config.output_root,
    publicScope: {
      include: publicScope.include ?? [],
      exclude: publicScope.exclude ?? []
    }
  };
}

async function loadConfigFromFile(configPath) {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = {};
  let activeObject = null;
  let activeTopLevelListKey = null;

  for (const rawLine of raw.split("\n")) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.match(/^ */)[0].length;
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("- ")) {
      if (indent === 2 && activeTopLevelListKey) {
        parsed[activeTopLevelListKey].push(parseScalar(trimmed.slice(2)));
        continue;
      }
      continue;
    }

    if (indent === 0) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;
      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();

      if (!rawValue) {
        parsed[key] = [];
        activeTopLevelListKey = key;
        activeObject = null;
      } else {
        parsed[key] = parseScalar(rawValue);
        activeObject = null;
        activeTopLevelListKey = null;
      }
      continue;
    }

    if (indent === 2 && activeObject) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;
      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      parsed[activeObject][key] = parseScalar(rawValue);
      continue;
    }

    if (indent === 2 && activeTopLevelListKey) {
      if (Array.isArray(parsed[activeTopLevelListKey])) {
        parsed[activeTopLevelListKey] = {};
      }
      activeObject = activeTopLevelListKey;
      activeTopLevelListKey = null;
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;
      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      if (!rawValue) {
        parsed[activeObject][key] = [];
      } else {
        parsed[activeObject][key] = parseScalar(rawValue);
      }
    }
  }

  return normalizeConfig(parsed);
}

function buildExportFrontmatter(frontmatter, slug) {
  return {
    title: frontmatter.title,
    slug,
    content_type: frontmatter.content_type,
    summary: frontmatter.summary,
    tags: frontmatter.tags ?? [],
    cover: frontmatter.cover,
    created: frontmatter.created,
    updated: frontmatter.updated
  };
}

function buildMetadataItem(frontmatter, slug) {
  return {
    title: frontmatter.title,
    slug,
    summary: frontmatter.summary ?? "",
    tags: frontmatter.tags ?? [],
    cover: frontmatter.cover ?? null,
    updated: frontmatter.updated ?? null,
    course: frontmatter.course ?? null,
    week: frontmatter.week ?? null,
    art_category: frontmatter.art_category ?? null,
    series: frontmatter.series ?? null
  };
}

function shouldExclude(relativePath, excludeList) {
  return excludeList.some((excludedPath) => {
    const normalized = excludedPath.replaceAll("\\", "/");
    return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
  });
}

export async function runPublisher(inputConfig) {
  const config = normalizeConfig(inputConfig);

  if (!config.vaultRoot || !config.outputRoot) {
    throw new Error("runPublisher requires vaultRoot and outputRoot.");
  }

  const metadata = {
    notes: [],
    courses: [],
    gallery: []
  };

  const result = {
    exported: {
      site: 0,
      social: {
        wechat: 0,
        xiaohongshu: 0
      }
    }
  };

  const outputRoot = path.resolve(config.outputRoot);
  const siteDirectories = [
    "assets",
    "notes",
    "courses",
    "gallery",
    path.join("social", "wechat"),
    path.join("social", "xiaohongshu"),
    "metadata"
  ];

  for (const directory of siteDirectories) {
    await removeAndRecreate(path.join(outputRoot, directory));
  }

  const includeScopes = config.publicScope.include;
  const publishedEntries = [];

  for (const includeScope of includeScopes) {
    const sourceDirectory = path.resolve(config.vaultRoot, includeScope);
    let markdownFiles = [];

    try {
      markdownFiles = await listMarkdownFiles(sourceDirectory);
    } catch {
      continue;
    }

    for (const filePath of markdownFiles) {
      const relativePath = path.relative(config.vaultRoot, filePath).replaceAll("\\", "/");
      if (shouldExclude(relativePath, config.publicScope.exclude)) {
        continue;
      }

      const source = await fs.readFile(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatterDocument(source);

      if (frontmatter.publish !== true) continue;
      if (!Array.isArray(frontmatter.channels) || !frontmatter.channels.includes("site")) continue;
      if (!frontmatter.title || !frontmatter.content_type) continue;

      const exportDirectoryName = TYPE_TO_DIRECTORY[frontmatter.content_type];
      if (!exportDirectoryName) continue;

      const slug = frontmatter.slug ? slugify(frontmatter.slug) : slugify(frontmatter.title);
      if (!slug) continue;

      publishedEntries.push({
        filePath,
        frontmatter,
        body,
        exportDirectoryName,
        slug
      });
    }
  }

  const linkLookup = buildLinkLookup(publishedEntries, config.vaultRoot);

  for (const entry of publishedEntries) {
      const { filePath, frontmatter, body, exportDirectoryName, slug } = entry;
      const rewrittenDocument = await rewriteAssetsInDocument({
        frontmatter,
        body,
        filePath,
        outputRoot,
        slug,
        vaultRoot: config.vaultRoot,
        linkLookup
      });
      const exportFrontmatter = buildExportFrontmatter(rewrittenDocument.frontmatter, slug);
      const outputMarkdown = `${serializeFrontmatter(exportFrontmatter)}${rewrittenDocument.body.trim()}\n`;
      const targetFile = path.join(outputRoot, exportDirectoryName, `${slug}.md`);

      await fs.writeFile(targetFile, outputMarkdown, "utf8");
      result.exported.site += 1;

      if (exportDirectoryName === "notes") {
        metadata.notes.push(buildMetadataItem(rewrittenDocument.frontmatter, slug));
      } else if (exportDirectoryName === "courses") {
        metadata.courses.push(buildMetadataItem(rewrittenDocument.frontmatter, slug));
      } else {
        metadata.gallery.push(buildMetadataItem(rewrittenDocument.frontmatter, slug));
      }

      for (const channel of SUPPORTED_SOCIAL_CHANNELS) {
        if (!frontmatter.channels.includes(channel)) continue;
        const socialTarget = path.join(outputRoot, "social", channel, `${slug}.md`);
        await fs.writeFile(socialTarget, outputMarkdown, "utf8");
        result.exported.social[channel] += 1;
      }
  }

  await fs.writeFile(
    path.join(outputRoot, "metadata", "notes.json"),
    JSON.stringify(metadata.notes, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(outputRoot, "metadata", "courses.json"),
    JSON.stringify(metadata.courses, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(outputRoot, "metadata", "gallery.json"),
    JSON.stringify(metadata.gallery, null, 2),
    "utf8"
  );

  return result;
}

async function main() {
  const configArgIndex = process.argv.findIndex((value) => value === "--config");
  const configPath =
    configArgIndex >= 0 && process.argv[configArgIndex + 1]
      ? process.argv[configArgIndex + 1]
      : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "config.example.yaml");

  const config = await loadConfigFromFile(configPath);
  const result = await runPublisher(config);
  console.log(JSON.stringify(result, null, 2));
}

const executedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedDirectly) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
