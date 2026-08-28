#!/usr/bin/env node
/**
 * Publish Server - lightweight HTTP API for Obsidian plugin integration
 *
 * Endpoints:
 *   POST /api/export   - Export Obsidian notes to content/public
 *   POST /api/preview  - Start/stop local dev server
 *   POST /api/deploy   - Deploy to Vercel
 *   GET  /api/status   - Check server and service status
 *
 * Usage:
 *   node tools/publish-server.js [--port 4318]
 */

import http from "node:http";
import { exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile, runPublisherFile } from "./publisher/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "4318", 10);
const PREVIEW_PORT = 4317;

let previewProcess = null;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function runCommand(command, cwd) {
  return new Promise((resolve) => {
    exec(command, { cwd, shell: "powershell.exe", timeout: 120_000 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout, stderr, code: error?.code ?? 0 });
    });
  });
}

async function syncWebOutputs() {
  const assets = await runCommand("pnpm sync:assets", PROJECT_ROOT);
  if (!assets.ok) return assets;
  return runCommand("pnpm generate:rss", PROJECT_ROOT);
}

async function handleExport() {
  const configPath = path.join(PROJECT_ROOT, "tools", "publisher", "config.yaml");
  try {
    await fs.access(configPath);
  } catch {
    return { ok: false, error: "config.yaml not found" };
  }

  const result = await runCommand(
    `node src/index.js --config config.yaml`,
    path.join(PROJECT_ROOT, "tools", "publisher")
  );

  let exported = { site: 0 };
  try {
    const parsed = JSON.parse(result.stdout);
    exported = parsed.exported ?? exported;
  } catch {}

  if (result.ok) {
    const syncResult = await syncWebOutputs();
    if (!syncResult.ok) {
      return { ok: false, error: syncResult.stderr || "Failed to package web assets." };
    }
  }

  return {
    ok: result.ok,
    exported,
    stderr: result.stderr || undefined
  };
}

async function handlePublishFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, error: "filePath is required" };
  }

  const configPath = path.join(PROJECT_ROOT, "tools", "publisher", "config.yaml");
  const config = await loadConfigFromFile(configPath);
  const sourceFilePath = path.resolve(config.vaultRoot, filePath);
  const result = await runPublisherFile(config, sourceFilePath);
  const syncResult = await syncWebOutputs();

  if (!syncResult.ok) {
    return { ok: false, error: syncResult.stderr || "Failed to package web assets." };
  }

  return { ok: true, ...result };
}

async function handlePreview(action) {
  if (action === "start") {
    if (previewProcess) {
      return { ok: true, message: "Preview already running", port: PREVIEW_PORT };
    }
    const { spawn } = await import("node:child_process");
    const webRoot = path.join(PROJECT_ROOT, "apps", "web");
    const nextCli = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
    previewProcess = spawn(
      process.execPath,
      [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(PREVIEW_PORT)],
      {
        cwd: webRoot,
        stdio: "ignore",
        windowsHide: true
      }
    );
    previewProcess.on("exit", () => { previewProcess = null; });
    return {
      ok: true,
      message: `Preview starting on http://localhost:${PREVIEW_PORT}`,
      port: PREVIEW_PORT
    };
  }

  if (action === "stop") {
    if (previewProcess) {
      previewProcess.kill();
      previewProcess = null;
      return { ok: true, message: "Preview stopped" };
    }
    return { ok: true, message: "Preview was not running" };
  }

  return { ok: true, running: !!previewProcess, port: PREVIEW_PORT };
}

async function handleDeploy() {
  const result = await runCommand("vercel --prod --yes", PROJECT_ROOT);
  return {
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr || undefined
  };
}

async function handleStatus() {
  return {
    ok: true,
    server: "running",
    preview: previewProcess ? "running" : "stopped",
    projectRoot: PROJECT_ROOT
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let result;
  try {
    if (url.pathname === "/api/export" && method === "POST") {
      result = await handleExport();
    } else if (url.pathname === "/api/publish-file" && method === "POST") {
      const body = await readBody(req);
      result = await handlePublishFile(body.filePath);
    } else if (url.pathname === "/api/preview" && method === "POST") {
      const body = await readBody(req);
      result = await handlePreview(body.action ?? "status");
    } else if (url.pathname === "/api/deploy" && method === "POST") {
      result = await handleDeploy();
    } else if (url.pathname === "/api/status" && method === "GET") {
      result = await handleStatus();
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  res.writeHead(result.ok ? 200 : 500);
  res.end(JSON.stringify(result, null, 2));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Publish Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/export   - Export notes`);
  console.log(`  POST /api/publish-file - Publish one Markdown file`);
  console.log(`  POST /api/preview  - Manage dev server`);
  console.log(`  POST /api/deploy   - Deploy to Vercel`);
  console.log(`  GET  /api/status   - Check status`);
});
