import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SOURCE_DIR = path.join(REPO_ROOT, "content", "public", "assets");
const TARGET_DIR = path.join(__dirname, "..", "public", "assets");

function syncAssets() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`Source directory not found: ${SOURCE_DIR}`);
    console.log("Skipping asset sync.");
    return;
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR);
  let syncedCount = 0;

  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);

    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      syncedCount++;
    }
  }

  console.log(`Synced ${syncedCount} assets from ${SOURCE_DIR} to ${TARGET_DIR}`);
}

syncAssets();
