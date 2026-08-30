import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_IDS, parseFrontmatter, serializeFrontmatter } from "./lib.js";
import { publishDraft } from "./publish.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "..", "..");
const STATUS_FILE = "scheduler-status.json";
const MAX_RECORDED_TASKS = 100;

function getPaths() {
  const repoRoot = process.env.STUDIO_REPO_ROOT
    ? path.resolve(process.env.STUDIO_REPO_ROOT)
    : defaultRepoRoot;
  return {
    repoRoot,
    localRoot: path.join(repoRoot, ".local-content"),
    siteRoot: path.join(repoRoot, "content", "site"),
  };
}

function statusFile() {
  return path.join(getPaths().localRoot, STATUS_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

function emptyState() {
  return {
    version: 1,
    updatedAt: null,
    lastSweepAt: null,
    tasks: [],
  };
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statusFile(), "utf8"));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
      return emptyState();
    }
    return {
      ...emptyState(),
      ...parsed,
      tasks: parsed.tasks.filter(
        (task) => task && typeof task.kind === "string" && typeof task.slug === "string",
      ),
    };
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  const file = statusFile();
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(temp, file);
    return true;
  } catch {
    try {
      fs.rmSync(temp, { force: true });
    } catch {}
    return false;
  }
}

function taskKey(kind, slug) {
  return `${kind}/${slug}`;
}

function taskFor(state, kind, slug) {
  return state.tasks.find((task) => taskKey(task.kind, task.slug) === taskKey(kind, slug));
}

function upsertTask(state, kind, slug, patch) {
  const existing = taskFor(state, kind, slug);
  const next = {
    ...(existing ?? { kind, slug, attempts: 0, lastAttemptAt: null, lastError: null }),
    ...patch,
    kind,
    slug,
  };
  state.tasks = state.tasks.filter((task) => taskKey(task.kind, task.slug) !== taskKey(kind, slug));
  state.tasks.push(next);
  return next;
}

function trimTasks(state) {
  if (state.tasks.length <= MAX_RECORDED_TASKS) {
    return;
  }
  state.tasks.sort((a, b) => {
    const aTime = Date.parse(a.lastAttemptAt ?? a.updatedAt ?? a.publishAt ?? "") || 0;
    const bTime = Date.parse(b.lastAttemptAt ?? b.updatedAt ?? b.publishAt ?? "") || 0;
    return bTime - aTime;
  });
  state.tasks = state.tasks.slice(0, MAX_RECORDED_TASKS);
}

function listEntries() {
  const { localRoot } = getPaths();
  const entries = [];
  for (const kind of KIND_IDS) {
    const dir = path.join(localRoot, kind);
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".md"))) {
      const slug = file.slice(0, -3);
      try {
        const parsed = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
        const rawPublishAt = parsed.frontmatter.publish_at;
        if (rawPublishAt !== undefined && rawPublishAt !== null && rawPublishAt !== "") {
          entries.push({
            kind,
            slug,
            publishAt: typeof rawPublishAt === "string" ? rawPublishAt : String(rawPublishAt),
            invalidReason:
              typeof rawPublishAt === "string" ? null : "publish_at 必须是日期时间字符串",
          });
        }
      } catch (error) {
        entries.push({
          kind,
          slug,
          publishAt: null,
          invalidReason: `读取定时任务失败：${error.message ?? "未知错误"}`,
        });
      }
    }
  }
  return entries;
}

function entryTaskPatch(entry, now, currentTime) {
  if (entry.invalidReason) {
    return {
      publishAt: entry.publishAt,
      status: "invalid",
      updatedAt: now,
      lastError: entry.invalidReason,
    };
  }
  const due = Date.parse(entry.publishAt);
  return {
    publishAt: entry.publishAt,
    status: Number.isNaN(due) ? "invalid" : due <= currentTime ? "overdue" : "pending",
    updatedAt: now,
    ...(Number.isNaN(due) ? { lastError: "publish_at 不是有效日期时间" } : {}),
  };
}

function synchronizeState(state, entries, currentTime = Date.now()) {
  const current = new Set(entries.map((entry) => taskKey(entry.kind, entry.slug)));
  const now = new Date(currentTime).toISOString();
  for (const entry of entries) {
    const previous = taskFor(state, entry.kind, entry.slug);
    const patch = entryTaskPatch(entry, now, currentTime);
    if (previous?.status === "failed" && previous.publishAt === entry.publishAt && !entry.invalidReason) {
      patch.status = "failed";
      patch.lastError = previous.lastError;
    } else if (previous?.status === "published" && previous.publishAt === entry.publishAt) {
      patch.status = "published";
      patch.lastError = previous.lastError;
    }
    upsertTask(state, entry.kind, entry.slug, {
      ...patch,
      attempts: previous?.attempts ?? 0,
      lastAttemptAt: previous?.lastAttemptAt ?? null,
      lastSuccessAt: previous?.lastSuccessAt ?? null,
    });
  }
  state.tasks = state.tasks.filter(
    (task) => current.has(taskKey(task.kind, task.slug)) || task.status === "published",
  );
  return state;
}

function summaryFor(state, now = Date.now()) {
  const tasks = state.tasks.map((task) => {
    if (task.status === "pending" && task.publishAt && Date.parse(task.publishAt) <= now) {
      return { ...task, status: "overdue" };
    }
    return task;
  });
  const counts = { pending: 0, overdue: 0, failed: 0, invalid: 0, published: 0 };
  for (const task of tasks) {
    if (Object.hasOwn(counts, task.status)) {
      counts[task.status] += 1;
    }
  }
  return { tasks, counts };
}

export function readSchedulerStatus(now = Date.now()) {
  const state = synchronizeState(readState(), listEntries(), now);
  const { tasks, counts } = summaryFor(state, now);
  state.updatedAt ??= nowIso();
  writeState(state);
  return {
    ...state,
    tasks,
    summary: counts,
  };
}

export function getSchedulerHealth(now = Date.now()) {
  const status = readSchedulerStatus(now);
  const degraded =
    status.summary.overdue > 0 ||
    status.summary.failed > 0 ||
    status.summary.invalid > 0 ||
    status.tasks.some((task) => task.status === "published" && task.lastError);
  return {
    ok: true,
    degraded,
    lastSweepAt: status.lastSweepAt,
    updatedAt: status.updatedAt,
    summary: status.summary,
  };
}

export function collectScheduled() {
  return listEntries().filter((entry) => !entry.invalidReason && !Number.isNaN(Date.parse(entry.publishAt)));
}

export function clearPublishAt(kind, slug) {
  if (process.env.STUDIO_FAIL_CLEAR_PUBLISH_AT === "1") {
    throw new Error("清理 publish_at 失败（测试注入）");
  }
  const { localRoot } = getPaths();
  const file = path.join(localRoot, kind, `${slug}.md`);
  if (!fs.existsSync(file)) {
    return;
  }
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  const { publish_at: _dropped, ...rest } = parsed.frontmatter;
  fs.writeFileSync(file, serializeFrontmatter(rest, parsed.body), "utf8");
}

function attemptPublish(entry, state, now = nowIso()) {
  const previous = taskFor(state, entry.kind, entry.slug);
  const attempts = (previous?.attempts ?? 0) + 1;
  let result;
  try {
    result = publishDraft(entry.kind, entry.slug);
  } catch (error) {
    result = { ok: false, message: error.message ?? "定时发布异常" };
  }
  const ok = result?.ok === true;
  let cleanupError = null;
  if (ok) {
    try {
      clearPublishAt(entry.kind, entry.slug);
    } catch (error) {
      cleanupError = `内容已发布，但清理定时标记失败：${error.message ?? error}`;
    }
  }
  upsertTask(state, entry.kind, entry.slug, {
    publishAt: entry.publishAt,
    status: ok ? "published" : "failed",
    attempts,
    lastAttemptAt: now,
    lastSuccessAt: ok ? now : previous?.lastSuccessAt ?? null,
    lastError: ok ? cleanupError : result?.message ?? "定时发布失败",
    updatedAt: now,
  });
  return {
    ...entry,
    ...result,
    status: ok ? "published" : "failed",
    ...(cleanupError ? { warning: cleanupError } : {}),
  };
}

export function runScheduledPublishes(now = Date.now()) {
  const state = synchronizeState(readState(), listEntries(), now);
  const results = [];
  state.lastSweepAt = new Date(now).toISOString();
  for (const entry of listEntries()) {
    if (entry.invalidReason || Number.isNaN(Date.parse(entry.publishAt))) {
      upsertTask(state, entry.kind, entry.slug, {
        ...entryTaskPatch(entry, new Date(now).toISOString(), now),
        attempts: taskFor(state, entry.kind, entry.slug)?.attempts ?? 0,
      });
      continue;
    }
    if (Date.parse(entry.publishAt) > now) {
      continue;
    }
    const previous = taskFor(state, entry.kind, entry.slug);
    if (previous?.status === "published" && previous.publishAt === entry.publishAt) {
      try {
        clearPublishAt(entry.kind, entry.slug);
        upsertTask(state, entry.kind, entry.slug, {
          lastError: null,
          updatedAt: new Date(now).toISOString(),
        });
      } catch (error) {
        upsertTask(state, entry.kind, entry.slug, {
          lastError: `内容已发布，但清理定时标记失败：${error.message ?? error}`,
          updatedAt: new Date(now).toISOString(),
        });
      }
      continue;
    }
    results.push(attemptPublish(entry, state, new Date(now).toISOString()));
  }
  state.updatedAt = nowIso();
  trimTasks(state);
  writeState(state);
  return results;
}

export function retryScheduledPublish(kind, slug) {
  const entries = listEntries();
  const entry = entries.find((candidate) => candidate.kind === kind && candidate.slug === slug);
  const state = synchronizeState(readState(), entries);
  if (!entry) {
    return { ok: false, status: "not-found", message: "定时任务不存在或已完成" };
  }
  if (entry.invalidReason || Number.isNaN(Date.parse(entry.publishAt))) {
    const task = upsertTask(state, kind, slug, {
      ...entryTaskPatch(entry, nowIso(), Date.now()),
      lastAttemptAt: taskFor(state, kind, slug)?.lastAttemptAt ?? null,
    });
    state.updatedAt = nowIso();
    writeState(state);
    return { ok: false, status: "invalid", task, message: task.lastError };
  }
  state.lastSweepAt = nowIso();
  const result = attemptPublish(entry, state);
  state.updatedAt = nowIso();
  trimTasks(state);
  writeState(state);
  return { ...result, task: taskFor(state, kind, slug) };
}
