import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const publicRoot = path.join(repoRoot, "content", "public");
const require = createRequire(import.meta.url);

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Unable to reserve a smoke-test port");
  return port;
}

async function loadMetadata(kind) {
  const source = await fs.readFile(path.join(publicRoot, "metadata", `${kind}.json`), "utf8");
  return JSON.parse(source);
}

async function waitForReady(baseUrl, child, logs) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited before readiness\n${logs.join("")}`);
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Next server did not become ready in 30 seconds\n${logs.join("")}`);
}

async function assertRoute(baseUrl, route, expectedStatus) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  if (response.status !== expectedStatus) {
    throw new Error(`${route}: expected ${expectedStatus}, received ${response.status}`);
  }
  return `${route} ${response.status}`;
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = require.resolve("next/dist/bin/next");
const logs = [];
const child = spawn(
  process.execPath,
  [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: appRoot, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] },
);
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

try {
  await waitForReady(baseUrl, child, logs);
  const [notes, gallery] = await Promise.all([loadMetadata("notes"), loadMetadata("gallery")]);
  const checks = [
    ["/", 200],
    ["/notes", 200],
    ["/gallery", 200],
    ["/account", 200],
    ["/archive", 200],
    ["/search", 200],
    ["/feed.xml", 200],
    ["/sitemap.xml", 200],
    ["/robots.txt", 200],
    ["/studio", 404],
    ["/notes/no-such-entry", 404],
  ];

  if (notes[0]?.slug) checks.push([`/notes/${notes[0].slug}`, 200]);
  if (gallery[0]?.slug) checks.push([`/gallery/${gallery[0].slug}`, 200]);
  const firstCover = [...notes, ...gallery].find((item) => item.cover)?.cover;
  if (firstCover) {
    const assetPath = firstCover.startsWith("assets/") ? firstCover : `assets/${firstCover}`;
    checks.push([`/${assetPath}`, 200]);
  }

  const results = [];
  for (const [route, status] of checks) {
    results.push(await assertRoute(baseUrl, route, status));
  }
  console.log(`build smoke ok → ${results.length} route(s): ${results.join(", ")}`);
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
}
