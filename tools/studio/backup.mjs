import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "..", "..");
const DEFAULT_KEEP = 7;
const DATA_DIRECTORIES = ["notes", "gallery", "assets", "history"];

function repoRoot() {
  return process.env.STUDIO_REPO_ROOT
    ? path.resolve(process.env.STUDIO_REPO_ROOT)
    : defaultRepoRoot;
}

function backupRoot() {
  const configured = process.env.STUDIO_BACKUP_ROOT;
  if (configured) {
    return path.resolve(configured);
  }
  const appData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(appData, "GUYONG", "backups");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    count += entry.isDirectory() ? countFiles(child) : 1;
  }
  return count;
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function createBackup({ source = path.join(repoRoot(), ".local-content"), destination = backupRoot(), keep } = {}) {
  const sourcePath = path.resolve(source);
  const destinationPath = path.resolve(destination);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    throw new Error(`本机草稿目录不存在：${sourcePath}`);
  }
  if (inside(sourcePath, destinationPath)) {
    throw new Error("备份目录不能放在 .local-content 内部");
  }

  fs.mkdirSync(destinationPath, { recursive: true });
  let target = path.join(destinationPath, `local-content-${stamp()}`);
  let index = 2;
  while (fs.existsSync(target) || fs.existsSync(`${target}.tmp`)) {
    target = path.join(destinationPath, `local-content-${stamp()}-${index}`);
    index += 1;
  }
  const temporary = `${target}.tmp`;
  fs.mkdirSync(temporary, { recursive: true });
  for (const directory of DATA_DIRECTORIES) {
    const sourceDirectory = path.join(sourcePath, directory);
    if (fs.existsSync(sourceDirectory)) {
      fs.cpSync(sourceDirectory, path.join(temporary, directory), {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    }
  }
  const fileCount = countFiles(temporary);
  fs.writeFileSync(
    path.join(temporary, "backup-manifest.json"),
    `${JSON.stringify({ version: 1, createdAt: new Date().toISOString(), fileCount }, null, 2)}\n`,
    "utf8",
  );
  fs.renameSync(temporary, target);

  const keepCount = Number.parseInt(keep ?? process.env.STUDIO_BACKUP_KEEP ?? `${DEFAULT_KEEP}`, 10);
  if (Number.isFinite(keepCount) && keepCount > 0) {
    const backups = fs
      .readdirSync(destinationPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("local-content-"))
      .map((entry) => path.join(destinationPath, entry.name))
      .sort();
    for (const oldBackup of backups.slice(0, Math.max(0, backups.length - keepCount))) {
      fs.rmSync(oldBackup, { recursive: true, force: true });
    }
  }
  return { path: target, files: fileCount };
}

export function restoreBackup({ source, target = path.join(repoRoot(), ".local-content"), replace = false } = {}) {
  if (!source) {
    throw new Error("缺少备份目录路径");
  }
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(target);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    throw new Error(`备份目录不存在：${sourcePath}`);
  }
  const manifestFile = path.join(sourcePath, "backup-manifest.json");
  if (!fs.existsSync(manifestFile)) {
    throw new Error("备份目录缺少 backup-manifest.json，拒绝恢复");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest?.version !== 1) {
    throw new Error("备份版本不受支持，拒绝恢复");
  }
  if (inside(sourcePath, targetPath)) {
    throw new Error("恢复目标不能位于备份目录内部");
  }
  if (path.basename(targetPath).toLowerCase() !== ".local-content") {
    throw new Error("恢复目标必须是明确命名的 .local-content 目录");
  }
  if (fs.existsSync(targetPath) && !replace) {
    throw new Error(`恢复目标已存在，若确认覆盖请使用 replace：${targetPath}`);
  }

  const parent = path.dirname(targetPath);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = `${targetPath}.restore-${process.pid}`;
  fs.rmSync(temporary, { recursive: true, force: true });
  fs.mkdirSync(temporary, { recursive: true });
  for (const directory of DATA_DIRECTORIES) {
    const sourceDirectory = path.join(sourcePath, directory);
    if (fs.existsSync(sourceDirectory)) {
      fs.cpSync(sourceDirectory, path.join(temporary, directory), {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    }
  }
  let previous = null;
  try {
    if (fs.existsSync(targetPath)) {
      const previousBase = `${targetPath}.before-restore-${stamp()}`;
      previous = previousBase;
      let previousIndex = 2;
      while (fs.existsSync(previous)) {
        previous = `${previousBase}-${previousIndex}`;
        previousIndex += 1;
      }
      fs.renameSync(targetPath, previous);
    }
    if (process.env.STUDIO_FAIL_RESTORE_SWAP === "1") {
      throw new Error("恢复目录切换失败（测试注入）");
    }
    fs.renameSync(temporary, targetPath);
  } catch (error) {
    let rollbackError = null;
    if (previous && fs.existsSync(previous) && !fs.existsSync(targetPath)) {
      try {
        fs.renameSync(previous, targetPath);
      } catch (restoreError) {
        rollbackError = restoreError;
      }
    }
    try {
      fs.rmSync(temporary, { recursive: true, force: true });
    } catch {}
    if (rollbackError) {
      throw new Error(
        `恢复失败，原目录也未能自动放回：${error.message ?? error}；${rollbackError.message ?? rollbackError}`,
      );
    }
    throw error;
  }
  return { target: targetPath, previous };
}

function usage() {
  console.log("用法：node tools/studio/backup.mjs create");
  console.log("      node tools/studio/backup.mjs restore <备份目录> [--replace]");
  console.log("配置：STUDIO_REPO_ROOT、STUDIO_BACKUP_ROOT、STUDIO_BACKUP_KEEP");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, source, ...flags] = process.argv.slice(2);
  try {
    if (command === "create") {
      console.log(JSON.stringify(createBackup()));
    } else if (command === "restore") {
      console.log(JSON.stringify(restoreBackup({ source, replace: flags.includes("--replace") })));
    } else {
      usage();
      process.exitCode = command ? 2 : 0;
    }
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}
