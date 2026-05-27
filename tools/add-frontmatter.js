#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Default frontmatter template
const DEFAULT_TEMPLATE = {
  publish: true,
  channels: ["site"],
  tags: []
};

// Content type mapping based on directory
const CONTENT_TYPE_MAP = {
  "notes": "note",
  "courses": "course",
  "gallery": "artwork"
};

// Category mapping based on directory structure
const CATEGORY_MAP = {
  "01-研究项目": { area: "research", type: "reference" },
  "02-课程学习": { area: "course", type: "course" },
  "03-知识库": { area: "knowledge", type: "reference" },
  "04-方法论": { area: "method", type: "method" },
  "05-社团活动": { area: "activity", type: "activity" },
  "06-创作": { area: "creative", type: "artwork" },
  "07-归档": { area: "archive", type: "reference" },
  "08-个人": { area: "personal", type: "reference" }
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    vaultRoot: null,
    include: [],
    exclude: [],
    dryRun: false,
    force: false,
    template: {}
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--vault" && args[i + 1]) {
      options.vaultRoot = args[++i];
    } else if (arg === "--include" && args[i + 1]) {
      options.include = args[++i].split(",").map(s => s.trim());
    } else if (arg === "--exclude" && args[i + 1]) {
      options.exclude = args[++i].split(",").map(s => s.trim());
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node add-frontmatter.js [options]

Options:
  --vault <path>      Path to Obsidian vault (required)
  --include <paths>   Comma-separated list of directories to include
  --exclude <paths>   Comma-separated list of directories to exclude
  --dry-run           Show what would be done without making changes
  --force             Overwrite existing frontmatter
  --help, -h          Show this help message

Examples:
  node add-frontmatter.js --vault "E:/Mywork/Obsidian Vault"
  node add-frontmatter.js --vault "E:/Mywork/Obsidian Vault" --include "01-研究项目,04-方法论"
  node add-frontmatter.js --vault "E:/Mywork/Obsidian Vault" --dry-run
`);
      process.exit(0);
    }
  }

  if (!options.vaultRoot) {
    console.error("Error: --vault is required");
    process.exit(1);
  }

  return options;
}

async function listMarkdownFiles(rootPath, include = [], exclude = []) {
  const files = [];

  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if directory should be excluded
        const relativePath = path.relative(rootPath, fullPath).replaceAll("\\", "/");
        if (exclude.some(ex => relativePath.startsWith(ex))) {
          continue;
        }
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Check if file is in included directories
        const relativePath = path.relative(rootPath, fullPath).replaceAll("\\", "/");
        if (include.length > 0 && !include.some(inc => relativePath.startsWith(inc))) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }

  await scan(rootPath);
  return files;
}

function inferTitle(filePath, content) {
  // Try to extract title from first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Use filename without extension
  const basename = path.basename(filePath, ".md");
  return basename;
}

function inferContentType(filePath) {
  const relativePath = filePath.replaceAll("\\", "/");

  for (const [dir, type] of Object.entries(CONTENT_TYPE_MAP)) {
    if (relativePath.includes(`/${dir}/`)) {
      return type;
    }
  }

  return "note";
}

function inferTags(filePath) {
  const relativePath = filePath.replaceAll("\\", "/");
  const tags = [];

  // Add area tag based on top-level directory
  for (const [dir, category] of Object.entries(CATEGORY_MAP)) {
    if (relativePath.includes(`/${dir}/`)) {
      tags.push(`area/${category.area}`);
      tags.push(`type/${category.type}`);
      break;
    }
  }

  // Add focus tag based on subdirectory
  const parts = relativePath.split("/");
  if (parts.length > 2) {
    const focus = parts[2].toLowerCase().replace(/\s+/g, "-");
    if (focus && !focus.startsWith(".")) {
      tags.push(`focus/${focus}`);
    }
  }

  return tags;
}

function inferSummary(content) {
  // Try to extract summary from first paragraph
  const lines = content.split("\n");
  let inFrontmatter = false;
  let summary = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip frontmatter
    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    if (inFrontmatter) continue;

    // Skip headings
    if (trimmed.startsWith("#")) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Use first non-empty paragraph as summary
    summary = trimmed;

    // Limit length
    if (summary.length > 100) {
      summary = summary.substring(0, 97) + "...";
    }

    break;
  }

  return summary;
}

function hasFrontmatter(content) {
  return content.startsWith("---\n") || content.startsWith("---\r\n");
}

function buildFrontmatter(title, contentType, tags, summary) {
  const frontmatter = {
    title,
    publish: true,
    content_type: contentType,
    channels: ["site"],
    summary,
    tags
  };

  const lines = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

async function processFile(filePath, options) {
  const content = await fs.readFile(filePath, "utf8");

  // Check if frontmatter already exists
  if (hasFrontmatter(content) && !options.force) {
    return { status: "skipped", reason: "frontmatter exists" };
  }

  // Infer metadata
  const title = inferTitle(filePath, content);
  const contentType = inferContentType(filePath);
  const tags = inferTags(filePath);
  const summary = inferSummary(content);

  // Build frontmatter
  const frontmatter = buildFrontmatter(title, contentType, tags, summary);

  if (options.dryRun) {
    return {
      status: "would_update",
      title,
      contentType,
      tags,
      summary,
      frontmatter
    };
  }

  // Remove existing frontmatter if force is true
  let newContent = content;
  if (hasFrontmatter(content) && options.force) {
    const endMarker = "\n---\n";
    const endIndex = content.indexOf(endMarker, 4);
    if (endIndex !== -1) {
      newContent = content.slice(endIndex + endMarker.length);
    }
  }

  // Write new content with frontmatter
  await fs.writeFile(filePath, frontmatter + newContent, "utf8");

  return {
    status: "updated",
    title,
    contentType,
    tags,
    summary
  };
}

async function main() {
  const options = parseArgs();

  console.log(`Scanning vault: ${options.vaultRoot}`);
  console.log(`Include: ${options.include.length > 0 ? options.include.join(", ") : "all"}`);
  console.log(`Exclude: ${options.exclude.length > 0 ? options.exclude.join(", ") : "none"}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log(`Force: ${options.force}`);
  console.log("");

  // List markdown files
  const files = await listMarkdownFiles(
    options.vaultRoot,
    options.include,
    options.exclude
  );

  console.log(`Found ${files.length} markdown files`);
  console.log("");

  // Process each file
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of files) {
    const relativePath = path.relative(options.vaultRoot, filePath).replaceAll("\\", "/");

    try {
      const result = await processFile(filePath, options);

      if (result.status === "updated") {
        console.log(`✓ ${relativePath}`);
        console.log(`  Title: ${result.title}`);
        console.log(`  Type: ${result.contentType}`);
        console.log(`  Tags: ${result.tags.join(", ")}`);
        console.log(`  Summary: ${result.summary}`);
        console.log("");
        updated++;
      } else if (result.status === "would_update") {
        console.log(`? ${relativePath}`);
        console.log(`  Title: ${result.title}`);
        console.log(`  Type: ${result.contentType}`);
        console.log(`  Tags: ${result.tags.join(", ")}`);
        console.log(`  Summary: ${result.summary}`);
        console.log("");
        updated++;
      } else if (result.status === "skipped") {
        console.log(`- ${relativePath} (${result.reason})`);
        skipped++;
      }
    } catch (error) {
      console.error(`✗ ${relativePath}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log("");
  console.log("Summary:");
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${files.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
