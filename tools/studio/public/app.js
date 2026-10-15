const state = {
  items: [],
  filter: "all",
  current: null, // {kind, slug, status, hasLocalDraft}
  lastSaved: null, // snapshot of form values at last load/save
  publishing: false,
  previewPath: "/",
  draftPreview: false,
  siteProfileSaved: null,
};

const $ = (id) => document.getElementById(id);
const listEl = $("item-list");
const editorEl = $("editor");
const emptyEl = $("empty-hint");
const PUBLISH_STAGES = ["校验内容…", "写入正式目录…", "重建公开快照…", "运行测试与构建…", "提交并推送…"];
const THEME_KEY = "guyong-theme-v2";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("btn-theme").textContent = theme === "dark" ? "LIGHT" : "DARK";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  sendToPreview({ type: "studio:theme", theme });
}

function api(path, options) {
  const apiPath = location.port === "4319" ? path : `/studio-api${path.slice(4)}`;
  return fetch(apiPath, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.error ?? response.statusText), {
        status: response.status,
        payload,
      });
    }
    return payload;
  });
}

function setSaveState(message, isError = false) {
  const el = $("save-state");
  el.textContent = message;
  el.classList.toggle("is-error", isError);
}

function previewUrl(name, source = "draft") {
  const prefix = location.port === "4319" ? "/asset" : "/studio-asset";
  return `${prefix}/${source}/${encodeURIComponent(name)}`;
}

const previewOrigin = location.port === "4319" ? "http://127.0.0.1:4317" : location.origin;
const frame = $("site-preview");

function sendToPreview(message) {
  frame.contentWindow?.postMessage(message, previewOrigin);
}

function setPanel(open) {
  $("studio-panel").hidden = !open;
  document.body.classList.toggle("is-editing", open);
  $("btn-content").setAttribute("aria-expanded", String(open));
  if (open) $("btn-close-panel").focus();
}

function navigatePreview(path) {
  state.draftPreview = path === "/preview/draft";
  state.previewPath = path;
  frame.src = `${previewOrigin}${path}`;
  $("preview-mode").textContent = state.draftPreview ? "草稿实时预览 · 尚未发布" : "网站预览";
}

function sendDraft() {
  if (!state.current || !state.draftPreview) return;
  const values = buildSavePayload();
  sendToPreview({ type: "studio:draft", draft: {
    ...values, kind: state.current.kind,
    coverSource: $("f-cover").selectedOptions[0]?.dataset.source ?? "draft",
    assets: Array.from($("f-cover").options).filter((option) => option.value).map((option) => ({ name: option.value, source: option.dataset.source ?? "draft" })),
  } });
}

function renderPreview() {
  if (!state.current) return;
  if (!state.draftPreview) navigatePreview("/preview/draft");
  sendDraft();
}

function formState() {
  return {
    title: $("f-title").value,
    slug: $("f-slug").value,
    summary: $("f-summary").value,
    tags: $("f-tags").value,
    cover: $("f-cover").value,
    created: $("f-created").value,
    updated: $("f-updated").value,
    pinned: $("f-pinned").checked,
    publishEnabled: $("f-publish-enabled").checked,
    publishAt: $("f-publish-enabled").checked ? $("f-publish-at").value : "",
    artCategory: $("f-art-category").value,
    series: $("f-series").value,
    body: $("f-body").value,
  };
}

function isDirty() {
  return (
    state.current &&
    state.lastSaved !== null &&
    JSON.stringify(formState()) !== JSON.stringify(state.lastSaved)
  );
}

function isProfileDirty() {
  return state.siteProfileSaved !== null && JSON.stringify({
    intro: $("profile-intro").value, linkedin: $("profile-linkedin").value,
  }) !== state.siteProfileSaved;
}

async function openSiteProfile() {
  if (isDirty()) await saveDraft({ silent: true });
  if (!isProfileDirty()) {
    const { profile } = await api("/api/site-profile");
    $("profile-intro").value = profile.intro;
    $("profile-linkedin").value = profile.linkedin;
    state.siteProfileSaved = JSON.stringify(profile);
  }
  state.current = null;
  editorEl.hidden = true;
  emptyEl.hidden = true;
  $("site-profile-editor").hidden = false;
  setPanel(true);
}

function markSaved(message) {
  state.lastSaved = formState();
  setSaveState(message);
}

function renderList() {
  const items = state.items.filter(
    (item) => state.filter === "all" || item.kind === state.filter,
  );
  listEl.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.dataset.kind = item.kind;
      li.className =
        state.current &&
        state.current.kind === item.kind &&
        state.current.slug === item.slug
          ? "is-active"
          : "";
      const kind = document.createElement("div");
      kind.className = `item-kind item-kind--${item.kind}`;
      kind.textContent = `${item.kind.toUpperCase()} · ${
        item.status === "published" ? "PUBLISHED" : "DRAFT"
      }${item.hasLocalDraft && item.status === "published" ? " · 有本机草稿" : ""}${
        item.publishAt ? ` · ⏰ ${item.publishAt.replace("T", " ")}` : ""
      }`;
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = item.title || item.slug;
      const summary = document.createElement("div");
      summary.className = "item-summary";
      summary.textContent = item.summary || "（无摘要）";
      li.append(kind, title, summary);
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.addEventListener("click", () => openItem(item).catch((error) => setSaveState(error.message, true)));
      li.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); li.click(); }
      });
      return li;
    }),
  );
}

async function loadItems() {
  const data = await api("/api/items");
  state.items = data.items;
  renderList();
}

async function loadPageViews(showDialog = false) {
  if (showDialog) $("page-views-dialog").showModal();
  $("page-views-summary").textContent = "读取线上统计…";
  try {
    const stats = await api("/api/page-views");
    const updated = stats.updatedAt ? new Date(stats.updatedAt).toLocaleString("zh-CN") : "暂无访问";
    $("page-view-total").textContent = `总访问量 ${stats.total} · ${stats.uniquePaths} 个页面`;
    $("page-views-summary").textContent = `总访问量 ${stats.total} · ${stats.uniquePaths} 个页面 · 更新：${updated}`;
    $("page-views-list").replaceChildren(...stats.topPaths.map((item) => {
      const row = document.createElement("li");
      row.textContent = `${item.path}：${item.count}`;
      return row;
    }));
  } catch (error) {
    $("page-view-total").textContent = "访问统计暂不可用";
    $("page-views-summary").textContent = error.message;
    $("page-views-list").replaceChildren();
  }
}

const SCHEDULER_LABELS = {
  pending: "待发布",
  overdue: "已逾期",
  failed: "发布失败",
  invalid: "时间无效",
  published: "已发布",
};

function renderSchedulerStatus(data) {
  const counts = data.summary ?? {};
  $("scheduler-summary").textContent = `待发布 ${counts.pending ?? 0} · 逾期 ${counts.overdue ?? 0} · 失败 ${counts.failed ?? 0} · 无效 ${counts.invalid ?? 0}`;
  const list = $("scheduler-list");
  const tasks = data.tasks ?? [];
  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "暂无定时任务";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...tasks.map((task) => {
      const item = document.createElement("li");
      const copy = document.createElement("div");
      copy.className = "scheduler-task";
      const detail = document.createElement("span");
      const attempted = task.lastAttemptAt ? ` · 最近尝试 ${task.lastAttemptAt.replace("T", " ").replace(".000Z", "")}` : "";
      detail.textContent = `${task.kind}/${task.slug} · ${SCHEDULER_LABELS[task.status] ?? task.status}${task.publishAt ? ` · ${task.publishAt}` : ""}${attempted}`;
      copy.append(detail);
      if (task.lastError) {
        const error = document.createElement("small");
        error.className = "scheduler-error";
        error.textContent = task.lastError;
        copy.append(error);
      }
      item.append(copy);
      if (["overdue", "failed"].includes(task.status)) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "scheduler-retry";
        retry.dataset.kind = task.kind;
        retry.dataset.slug = task.slug;
        retry.textContent = "重试";
        item.append(retry);
      }
      return item;
    }),
  );
}

async function loadSchedulerStatus(showError = false) {
  try {
    const data = await api("/api/scheduler/status");
    renderSchedulerStatus(data);
  } catch (error) {
    if (showError) {
      setSaveState(`读取定时任务失败：${error.message}`, true);
    }
  }
}

async function retrySchedulerTask(kind, slug) {
  const buttons = document.querySelectorAll(`.scheduler-retry[data-kind="${kind}"][data-slug="${slug}"]`);
  for (const button of buttons) button.disabled = true;
  try {
    const result = await api(`/api/scheduler/retry/${kind}/${slug}`, { method: "POST", body: "{}" });
    setSaveState(result.ok ? `已重试：${kind}/${slug}` : `重试失败：${result.message}`, !result.ok);
    await loadSchedulerStatus(true);
  } catch (error) {
    setSaveState(`重试失败：${error.message}`, true);
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}

function formatAssetSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAssetCleanup(data) {
  const assets = data.assets ?? [];
  const summary = $("asset-cleanup-summary");
  const list = $("asset-cleanup-list");
  const confirm = $("asset-cleanup-confirm");
  confirm.disabled = assets.length === 0;
  if (assets.length === 0) {
    summary.textContent = "没有可清理的未引用图片。正式稿和本机草稿引用中的资产不会出现在这里。";
    const empty = document.createElement("li");
    empty.className = "asset-cleanup-empty";
    empty.textContent = "暂无未引用图片";
    list.replaceChildren(empty);
    return;
  }
  summary.textContent = `找到 ${assets.length} 个未被正式稿或本机草稿引用的图片。删除前会再次检查引用。`;
  list.replaceChildren(
    ...assets.map((asset) => {
      const item = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.name = asset.name;
      checkbox.dataset.source = asset.source;
      checkbox.setAttribute("aria-label", `选择 ${asset.name}`);
      const copy = document.createElement("span");
      copy.className = "asset-cleanup-item";
      const name = document.createElement("span");
      name.className = "asset-cleanup-name";
      name.textContent = asset.name;
      const meta = document.createElement("span");
      meta.className = "asset-cleanup-meta";
      meta.textContent = `${asset.source === "draft" ? "本机草稿" : "正式资产"} · ${formatAssetSize(asset.size)}`;
      copy.append(name, meta);
      item.append(checkbox, copy);
      return item;
    }),
  );
  confirm.disabled = true;
}

async function loadAssetCleanup(showDialog = false) {
  try {
    const data = await api("/api/assets/cleanup");
    renderAssetCleanup(data);
    if (showDialog) $("asset-cleanup-dialog").showModal();
  } catch (error) {
    setSaveState(`读取未引用图片失败：${error.message}`, true);
  }
}

async function deleteSelectedAssets() {
  const selected = [...document.querySelectorAll("#asset-cleanup-list input[type=checkbox]:checked")].map((checkbox) => ({
    name: checkbox.dataset.name,
    source: checkbox.dataset.source,
  }));
  if (selected.length === 0) return;
  const names = selected.map((asset) => asset.name).join("、");
  if (!window.confirm(`确认删除以下图片？\n${names}\n\n删除时会再次核对引用。`)) return;

  const button = $("asset-cleanup-confirm");
  button.disabled = true;
  try {
    for (const asset of selected) {
      await api("/api/assets/cleanup", {
        method: "POST",
        body: JSON.stringify({ ...asset, confirmName: asset.name }),
      });
    }
    setSaveState(`已删除 ${selected.length} 个未引用图片`);
    await loadAssetCleanup(false);
  } catch (error) {
    setSaveState(`清理未引用图片失败：${error.message}`, true);
    await loadAssetCleanup(false);
  }
}

async function loadAssetOptions(selected) {
  const data = await api("/api/assets");
  const select = $("f-cover");
  select.replaceChildren(
    Object.assign(document.createElement("option"), { value: "", textContent: "（无）" }),
    ...data.assets.map((asset) => {
      const option = document.createElement("option");
      option.value = asset.name;
      option.dataset.source = asset.source;
      option.textContent = `${asset.name}（${asset.source === "site" ? "已发布" : "本机"}）`;
      return option;
    }),
  );
  if (selected) {
    select.value = selected;
  }
  updateCoverPreview();
}

function updateCoverPreview() {
  const name = $("f-cover").value;
  const img = $("cover-preview");
  if (!name) {
    img.hidden = true;
    img.removeAttribute("src");
    return;
  }
  const source = $("f-cover").selectedOptions[0]?.dataset.source ?? "draft";
  img.src = previewUrl(name, source);
  img.hidden = false;
}

function applyDoc(doc) {
  $("f-title").value = doc.title ?? "";
  $("f-slug").value = doc.slug ?? "";
  $("f-summary").value = doc.summary ?? "";
  $("f-tags").value = (doc.tags ?? []).join(", ");
  $("f-created").value = doc.created ?? "";
  $("f-updated").value = doc.updated ?? "";
  $("f-pinned").checked = doc.pinned === true;
  $("f-publish-enabled").checked = Boolean(doc.publishAt);
  $("f-publish-at").value = doc.publishAt ?? "";
  $("publish-at-field").hidden = !doc.publishAt;
  $("f-art-category").value = doc.artCategory ?? "";
  $("f-series").value = doc.series ?? "";
  $("f-body").value = doc.body ?? "";
  markSaved(
    doc.source === "site"
      ? "已发布内容（只读快照）：保存时会自动建立本机草稿"
      : "草稿已载入",
  );
}

async function openItem(item, { navigate = true } = {}) {
  if (state.publishing) return;
  if (isDirty()) await saveDraft({ silent: true });
  $("site-profile-editor").hidden = true;
  state.current = { kind: item.kind, slug: item.slug, ...item };
  emptyEl.hidden = true;
  editorEl.hidden = false;
  $("gallery-fields").hidden = item.kind !== "gallery";
  renderList();

  try {
    const doc = await api(`/api/drafts/${item.kind}/${item.slug}`);
    await loadAssetOptions(doc.cover);
    applyDoc(doc);
    setPanel(true);
    if (navigate) {
      if (item.status === "published" && !item.hasLocalDraft) navigatePreview(`/${item.kind}/${item.slug}`);
      else navigatePreview("/preview/draft");
    }
    sendDraft();
    $("btn-unpublish").hidden = item.status !== "published";
  } catch (error) {
    setSaveState(error.message, true);
  }
}

async function createDraft(kind) {
  const created = await api("/api/drafts", {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
  await loadItems();
  await openItem({ kind: created.kind, slug: created.slug, status: "draft" });
}

function buildSavePayload() {
  return {
    title: $("f-title").value,
    slug: $("f-slug").value,
    summary: $("f-summary").value,
    tags: $("f-tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    cover: $("f-cover").value || null,
    created: $("f-created").value,
    updated: $("f-updated").value,
    pinned: $("f-pinned").checked,
    publishAt: $("f-publish-enabled").checked ? $("f-publish-at").value : "",
    artCategory: $("f-art-category").value,
    series: $("f-series").value,
    body: $("f-body").value,
  };
}

async function saveDraft({ silent = false } = {}) {
  if (!state.current || state.publishing) {
    return;
  }
  if (state.current.source === "site" && state.current.hasLocalDraft === false && !isDirty()) {
    return;
  }
  const { kind, slug } = state.current;
  try {
    const result = await api(`/api/drafts/${kind}/${slug}`, {
      method: "PUT",
      body: JSON.stringify({ ...buildSavePayload(), snapshot: !silent }),
    });
    state.current.slug = result.slug;
    state.current.source = "draft";
    state.current.hasLocalDraft = true;
    if (!silent) {
      markSaved(`已保存草稿 ${result.slug} · ${new Date().toLocaleTimeString()}`);
    } else {
      markSaved(`已自动保存 · ${new Date().toLocaleTimeString()}`);
    }
    await loadItems();
    if (state.draftPreview) sendDraft();
  } catch (error) {
    setSaveState(error.message, true);
    throw error;
  }
}

async function publishCurrent() {
  if (!state.current || state.publishing) return;
  const { kind } = state.current;
  if (isDirty()) {
    try {
      await saveDraft({ silent: true });
    } catch {
      return;
    }
  }
  const slug = state.current.slug;
  state.publishing = true;
  const button = $("btn-publish");
  button.disabled = true;
  let stageIndex = 0;
  const stageTimer = setInterval(() => {
    setSaveState(`发布中：${PUBLISH_STAGES[stageIndex % PUBLISH_STAGES.length]}`);
    stageIndex += 1;
  }, 1500);
  setSaveState("发布中：校验内容…");

  try {
    const result = await api(`/api/publish/${kind}/${slug}`, { method: "POST", body: "{}" });
    clearInterval(stageTimer);
    button.disabled = false;
    state.publishing = false;
    state.current.slug = result.slug ?? state.current.slug;
    state.current.status = "published";
    state.current.hasLocalDraft = true;
    state.current.source = "draft";
    $("btn-unpublish").hidden = false;
    setSaveState(
      result.dryRun
        ? "DRY-RUN 通过：Git 步骤已跳过"
        : `已发布：${result.slug}（提交 ${result.commit ?? ""}）`,
    );
    await loadItems();
  } catch (error) {
    clearInterval(stageTimer);
    button.disabled = false;
    state.publishing = false;
    setSaveState(`发布失败（${error.message}）：稿件已保留，可直接点击发布重试`, true);
    await loadItems();
  }
}

async function unpublishCurrent() {
  if (!state.current || state.publishing) return;
  const { kind, slug } = state.current;
  state.publishing = true;
  const timer = setInterval(() => setSaveState("下线中：回填草稿并重建快照…"), 1500);
  try {
    const result = await api(`/api/unpublish/${kind}/${slug}`, { method: "POST", body: "{}" });
    clearInterval(timer);
    setSaveState(`已下线：${result.slug}（提交 ${result.commit ?? ""}），内容已复制回本机草稿`);
    await loadItems();
  } catch (error) {
    clearInterval(timer);
    setSaveState(error.message, true);
  } finally {
    state.publishing = false;
  }
}

function confirmDialog({ title, text, requireInput, expected }) {
  return new Promise((resolve) => {
    const dialog = $("confirm-dialog");
    $("confirm-title").textContent = title;
    $("confirm-text").textContent = text;
    $("confirm-input-label").hidden = !requireInput;
    $("confirm-input").value = "";
    const form = dialog.querySelector("form");

    function onSubmit(event) {
      event.preventDefault();
      const value = form.getAttribute("data-result") ?? "cancel";
      form.removeEventListener("submit", onSubmit);
      dialog.close();
      if (value !== "ok") {
        resolve(null);
        return;
      }
      if (requireInput) {
        const typed = $("confirm-input").value.trim();
        if (typed !== expected) {
          resolve({ mismatch: true });
          return;
        }
      }
      resolve({});
    }

    for (const button of form.querySelectorAll('button[type="submit"]')) {
      button.addEventListener("click", () => {
        form.setAttribute("data-result", button.value);
      });
    }
    form.addEventListener("submit", onSubmit);
    dialog.showModal();
  });
}

async function deleteCurrent() {
  if (!state.current) return;
  const { kind, slug } = state.current;
  const doc = await api(`/api/drafts/${kind}/${slug}`).catch(() => null);
  const title = doc?.title ?? "";

  const result = await confirmDialog({
    title: "永久删除草稿",
    text: `将删除草稿「${title || slug}」及其独占资产。已发布版本需先下线；此操作不可撤销。`,
    requireInput: true,
    expected: title,
  });
  if (!result) return;
  if (result.mismatch) {
    setSaveState("标题不匹配，未删除", true);
    return;
  }

  try {
    await api(`/api/drafts/${kind}/${slug}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmTitle: title }),
    });
    setSaveState("草稿已永久删除");
    state.current = null;
    editorEl.hidden = true;
    emptyEl.hidden = false;
    await loadItems();
  } catch (error) {
    setSaveState(error.message, true);
  }
}

function uploadAsset() {
  const input = $("asset-file");
  input.value = "";
  input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)) {
      setSaveState("请选择 JPG、PNG、WebP、GIF 或 AVIF 图片", true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setSaveState("图片超过 8MB，请压缩后再上传", true);
      return;
    }
    try {
      const response = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: await file.arrayBuffer(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setSaveState(error.error ?? "图片上传失败", true);
        return;
      }
      const result = await response.json();
      await loadAssetOptions(result.name);
      setSaveState(
        result.renamed
          ? `图片与已有文件重名，已自动命名为 ${result.name}`
          : result.converted
            ? `图片已压缩为 WebP 并设为封面：${result.name}`
            : `图片已上传并设为封面：${result.name}`,
      );
    } catch (error) {
      setSaveState(`图片上传失败：${error.message}`, true);
    }
  };
}

function insertImageAtCursor(markdown) {
  const body = $("f-body");
  const start = body.selectionStart ?? body.value.length;
  const end = body.selectionEnd ?? body.value.length;
  const needsBreaks = start > 0 && body.value[start - 1] !== "\n";
  const snippet = `${needsBreaks ? "\n\n" : ""}${markdown}\n`;
  body.value = body.value.slice(0, start) + snippet + body.value.slice(end);
  body.dispatchEvent(new Event("input"));
  renderPreview(body.value);
}

function insertImage() {
  const name = $("f-cover").value;
  if (!name) {
    setSaveState("请先在 Cover 中选择或上传一张图片", true);
    return;
  }
  const alt = name.replace(/\.[^.]+$/, "");
  insertImageAtCursor(`![${alt}](assets/${name})`);
  setSaveState(`已插入图片：${name}`);
}

function wireImportDialog() {
  const dialog = $("import-dialog");
  const form = dialog.querySelector("form");
  const fileInput = $("import-file");
  const textInput = $("import-text");
  let pendingOverwrite = false;

  $("btn-import").addEventListener("click", () => {
    pendingOverwrite = false;
    $("import-conflict").hidden = true;
    const overwriteCheckbox = $("import-overwrite-confirm");
    if (overwriteCheckbox) {
      overwriteCheckbox.checked = false;
    }
    dialog.showModal();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (file) {
      textInput.value = await file.text();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = event.submitter?.value ?? "cancel";
    if (value !== "ok") {
      dialog.close();
      return;
    }

    const kind = $("import-kind").value;
    const filename = fileInput.files?.[0]?.name ?? "import.md";
    const content = textInput.value;

    try {
      const result = await api("/api/import", {
        method: "POST",
        body: JSON.stringify({ kind, filename, content, confirmOverwrite: pendingOverwrite }),
      });
      dialog.close();
      textInput.value = "";
      fileInput.value = "";
      const importedMessage = result.hasPublishedCopy
        ? "导入完成：已建立本机草稿；再次发布后才会更新网站版本"
        : "导入完成：已建立本机草稿";
      const unresolvedMessage = Array.isArray(result.unresolvedAssets) && result.unresolvedAssets.length > 0
        ? `；需上传并改为 assets/...：${result.unresolvedAssets.join("、")}`
        : "";
      await loadItems();
      await openItem({ kind: result.kind, slug: result.slug, status: "draft" });
      setSaveState(`${importedMessage}${unresolvedMessage}`, Boolean(unresolvedMessage));
    } catch (error) {
      if (error.status === 409) {
        pendingOverwrite = false;
        const conflict = $("import-conflict");
        const siteNote = error.payload.existsOnSite
          ? "注意：网站上已有该 slug 的已发布版本。"
          : "";
        conflict.textContent = `${error.message}。${siteNote}勾选确认后再次导入将覆盖本机草稿；网站版本只会在发布后更新。`;
        conflict.hidden = false;

        const confirmCheckbox = $("import-overwrite-confirm");
        if (!confirmCheckbox) {
          const label = document.createElement("label");
          label.style.flexDirection = "row";
          label.style.alignItems = "center";
          label.style.gap = "8px";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = "import-overwrite-confirm";
          checkbox.addEventListener("change", () => {
            pendingOverwrite = checkbox.checked;
          });
          label.append(checkbox, document.createTextNode("我确认覆盖已有本机草稿"));
          conflict.after(label);
        }
        return;
      }
      $("import-conflict").textContent = error.message;
      $("import-conflict").hidden = false;
    }
  });
}

async function openVersions() {
  if (!state.current) return;
  const { kind, slug } = state.current;
  try {
    const data = await api(`/api/versions/${kind}/${slug}`);
    const list = $("versions-list");
    list.replaceChildren(
      ...(data.versions.length === 0
        ? [Object.assign(document.createElement("li"), { textContent: "还没有快照。点击「保存草稿」后会生成。" })]
        : data.versions.map((version) => {
            const li = document.createElement("li");
            const time = document.createElement("span");
            time.className = "version-time";
            time.textContent = new Date(version.savedAt).toLocaleString();
            const right = document.createElement("span");
            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.gap = "10px";
            const size = document.createElement("span");
            size.className = "version-size";
            size.textContent = `${(version.bytes / 1024).toFixed(1)} KB`;
            const restore = document.createElement("button");
            restore.type = "button";
            restore.textContent = "恢复";
            restore.addEventListener("click", async () => {
              const confirmed = await confirmDialog({
                title: "恢复历史版本",
                text: `将把草稿恢复到 ${new Date(version.savedAt).toLocaleString()} 的快照。当前内容会先存为新快照。`,
                requireInput: false,
              });
              if (!confirmed) return;
              const result = await api(`/api/versions/${kind}/${slug}/${version.id}/restore`, {
                method: "POST",
                body: "{}",
              });
              $("versions-dialog").close();
              const doc = await api(`/api/drafts/${kind}/${slug}`);
              applyDoc(doc);
              setSaveState(`已恢复到 ${new Date(version.savedAt).toLocaleTimeString()} 的版本`);
            });
            right.append(size, restore);
            li.append(time, right);
            return li;
          })),
    );
    $("versions-dialog").showModal();
  } catch (error) {
    setSaveState(error.message, true);
  }
}

function wire() {
  frame.src = `${previewOrigin}/`;
  $("open-site").href = `${previewOrigin}/`;
  $("btn-content").addEventListener("click", () => setPanel($("studio-panel").hidden));
  $("btn-close-panel").addEventListener("click", () => setPanel(false));
  $("btn-edit-page").addEventListener("click", () => {
    if (["/", "/account"].includes(state.previewPath)) {
      openSiteProfile().catch((error) => setSaveState(error.message, true));
      return;
    }
    const match = state.previewPath.match(/^\/(notes|gallery)\/([^/]+)$/);
    const item = match && state.items.find((item) => item.kind === match[1] && item.slug === match[2]);
    if (item) openItem(item, { navigate: false }).catch((error) => setSaveState(error.message, true));
  });
  $("btn-refresh").addEventListener("click", () => {
    $("preview-error").hidden = true;
    frame.src = `${previewOrigin}${state.previewPath}`;
  });
  for (const mode of ["desktop", "mobile"]) {
    $(`btn-${mode}`).addEventListener("click", () => {
      document.body.classList.toggle("preview-mobile", mode === "mobile");
      $("btn-desktop").setAttribute("aria-pressed", String(mode === "desktop"));
      $("btn-mobile").setAttribute("aria-pressed", String(mode === "mobile"));
    });
  }
  const readyTimer = setTimeout(() => { $("preview-error").hidden = false; }, 45000);
  frame.addEventListener("load", () => {
    sendToPreview({ type: "studio:theme", theme: document.documentElement.dataset.theme });
    sendDraft();
  });
  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.origin !== previewOrigin) return;
    if (event.data?.type === "studio:route") {
      clearTimeout(readyTimer);
      $("preview-error").hidden = true;
      const path = event.data.pathname;
      if (typeof path !== "string" || !path.startsWith("/")) return;
      state.previewPath = path;
      state.draftPreview = path === "/preview/draft";
      $("current-path").textContent = state.draftPreview && state.current ? `/${state.current.kind}/${$("f-slug").value}` : path;
      $("preview-mode").textContent = state.draftPreview ? "草稿实时预览 · 尚未发布" : "网站预览";
      $("open-site").href = `${previewOrigin}${state.draftPreview ? "/" : path}`;
      const match = path.match(/^\/(notes|gallery)\/([^/]+)$/);
      $("btn-edit-page").disabled = !match && !["/", "/account"].includes(path);
      $("btn-edit-page").textContent = match ? "编辑当前文章" : "编辑当前页面";
      const item = match && state.items.find((item) => item.kind === match[1] && item.slug === match[2]);
      if (item && !$("studio-panel").hidden && (!state.current || item.slug !== state.current.slug || item.kind !== state.current.kind)) {
        openItem(item, { navigate: false }).catch((error) => setSaveState(error.message, true));
      }
    } else if (event.data?.type === "studio:draft-ready") {
      sendDraft();
    } else if (event.data?.type === "studio:theme" && ["light", "dark"].includes(event.data.theme)) {
      if (document.documentElement.dataset.theme !== event.data.theme) applyTheme(event.data.theme);
    }
  });
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  $("btn-site-profile").addEventListener("click", () => openSiteProfile().catch((error) => setSaveState(error.message, true)));
  $("btn-save-profile").addEventListener("click", async () => {
    const button = $("btn-save-profile");
    button.disabled = true;
    try {
      const { profile } = await api("/api/site-profile", { method: "PUT", body: JSON.stringify({ intro: $("profile-intro").value, linkedin: $("profile-linkedin").value }) });
      $("profile-intro").value = profile.intro;
      $("profile-linkedin").value = profile.linkedin;
      state.siteProfileSaved = JSON.stringify(profile);
      setSaveState("网站信息已保存 · 本机预览已更新");
      navigatePreview(state.previewPath === "/account" ? "/account" : "/");
    } catch (error) { setSaveState(error.message, true); }
    finally { button.disabled = false; }
  });
  $("btn-theme").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  $("btn-deploy-status").addEventListener("click", async () => {
    setSaveState("查询最新生产部署…");
    try {
      const status = await api("/api/deploy-status");
      setSaveState(`最新生产部署：${status.state} · ${status.url ?? ""}`);
    } catch (error) {
      setSaveState(error.message, true);
    }
  });

  $("btn-page-views").addEventListener("click", () => loadPageViews(true));
  $("page-views-refresh").addEventListener("click", () => loadPageViews());
  $("page-views-close").addEventListener("click", () => $("page-views-dialog").close());

  $("btn-scheduler-status").addEventListener("click", async () => {
    await loadSchedulerStatus(true);
    $("scheduler-dialog").showModal();
  });
  $("scheduler-close").addEventListener("click", () => $("scheduler-dialog").close());
  $("scheduler-list").addEventListener("click", (event) => {
    const button = event.target.closest(".scheduler-retry");
    if (button) retrySchedulerTask(button.dataset.kind, button.dataset.slug);
  });
  $("btn-cleanup-assets").addEventListener("click", () => loadAssetCleanup(true));
  $("asset-cleanup-close").addEventListener("click", () => $("asset-cleanup-dialog").close());
  $("asset-cleanup-confirm").addEventListener("click", deleteSelectedAssets);
  $("asset-cleanup-list").addEventListener("change", () => {
    $("asset-cleanup-confirm").disabled =
      document.querySelectorAll("#asset-cleanup-list input[type=checkbox]:checked").length === 0;
  });

  for (const button of document.querySelectorAll(".filter")) {
    button.addEventListener("click", () => {
      for (const other of document.querySelectorAll(".filter")) {
        other.classList.remove("is-active");
      }
      button.classList.add("is-active");
      state.filter = button.dataset.kind;
      renderList();
    });
  }

  $("btn-new-note").addEventListener("click", () => createDraft("notes").catch((e) => setSaveState(e.message, true)));
  $("btn-new-gallery").addEventListener("click", () => createDraft("gallery").catch((e) => setSaveState(e.message, true)));
  $("btn-save").addEventListener("click", () => saveDraft().catch(() => {}));
  $("btn-versions").addEventListener("click", openVersions);
  $("versions-close").addEventListener("click", () => $("versions-dialog").close());
  $("btn-publish").addEventListener("click", publishCurrent);
  $("btn-unpublish").addEventListener("click", unpublishCurrent);
  $("btn-delete").addEventListener("click", deleteCurrent);
  $("btn-upload-asset").addEventListener("click", uploadAsset);
  $("btn-insert-image").addEventListener("click", insertImage);
  $("f-cover").addEventListener("change", updateCoverPreview);
  $("f-publish-enabled").addEventListener("change", () => {
    const enabled = $("f-publish-enabled").checked;
    $("publish-at-field").hidden = !enabled;
    if (!enabled) {
      $("f-publish-at").value = "";
    } else {
      $("f-publish-at").focus();
    }
  });

  let previewTimer = null;
  editorEl.addEventListener("input", () => {
    clearTimeout(previewTimer);
    setSaveState("有未保存的更改 · 预览已更新");
    previewTimer = setTimeout(renderPreview, 250);
  });

  window.addEventListener("beforeunload", (event) => {
    if (isDirty() || isProfileDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  setInterval(() => {
    if (isDirty() && !state.publishing) {
      saveDraft({ silent: true }).catch(() => {});
    }
  }, 30000);
  setInterval(() => loadSchedulerStatus(), 30000);
  setInterval(() => loadPageViews(), 60000);

  wireImportDialog();
}

wire();
loadItems().catch((error) => setSaveState(error.message, true));
loadSchedulerStatus();
loadPageViews();
