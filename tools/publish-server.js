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
 *   node tools/publish-server.js [--port 3001]
 */

import http from "node:http";
import { exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "3001", 10);

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

  return {
    ok: result.ok,
    exported,
    stderr: result.stderr || undefined
  };
}

async function handlePreview(action) {
  if (action === "start") {
    if (previewProcess) {
      return { ok: true, message: "Preview already running", port: 3000 };
    }
    const { spawn } = await import("node:child_process");
    previewProcess = spawn("pnpm", ["dev"], {
      cwd: path.join(PROJECT_ROOT, "apps", "web"),
      shell: "powershell.exe",
      stdio: "pipe"
    });
    previewProcess.on("exit", () => { previewProcess = null; });
    return { ok: true, message: "Preview starting on http://localhost:3000", port: 3000 };
  }

  if (action === "stop") {
    if (previewProcess) {
      previewProcess.kill();
      previewProcess = null;
      return { ok: true, message: "Preview stopped" };
    }
    return { ok: true, message: "Preview was not running" };
  }

  return { ok: true, running: !!previewProcess, port: 3000 };
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

server.listen(PORT, () => {
  console.log(`Publish Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/export   - Export notes`);
  console.log(`  POST /api/preview  - Manage dev server`);
  console.log(`  POST /api/deploy   - Deploy to Vercel`);
  console.log(`  GET  /api/status   - Check status`);
});
