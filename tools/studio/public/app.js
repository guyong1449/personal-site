/* global marked */
const state = {
  items: [],
  filter: "all",
  current: null, // {kind, slug, status, hasLocalDraft}
  lastSaved: null, // snapshot of form values at last load/save
  publishing: false,
};

const $ = (id) => document.getElementById(id);
const listEl = $("item-list");
const editorEl = $("editor");
const emptyEl = $("empty-hint");
const PUBLISH_STAGES = ["校验内容…", "写入正式目录…", "重建公开快照…", "运行测试与构建…", "提交并推送…"];

function api(path, options) {
  return fetch(path, {
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

function previewUrl(name) {
  return `/asset/draft/${encodeURIComponent(name)}`;
}

// Same contract as the production pipeline: raw HTML in Markdown is shown
// as plain text, never interpreted.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

marked.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text ?? token.raw ?? "");
    },
  },
});

function renderPreview(body) {
  const html = marked.parse(body ?? "");
  const holder = document.createElement("div");
  holder.innerHTML = html;
  for (const img of holder.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("assets/") || (!src.startsWith("http") && !src.startsWith("/"))) {
      img.src = previewUrl(src.replace(/^assets\//, ""));
    }
  }
  $("preview").replaceChildren(...holder.childNodes);
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
    artCategory: $("f-art-category").value,
    series: $("f-series").value,
    body: $("f-body").value,
  };
}

function isDirty() {
  return (
    state.current &&
    state.current.status !== "published" &&
    state.lastSaved !== null &&
    JSON.stringify(formState()) !== JSON.stringify(state.lastSaved)
  );
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
      li.className =
        state.current &&
        state.current.kind === item.kind &&
        state.current.slug === item.slug
          ? "is-active"
          : "";
      const kind = document.createElement("div");
      kind.className = "item-kind";
      kind.textContent = `${item.kind.toUpperCase()} · ${
        item.status === "published" ? "PUBLISHED" : "DRAFT"
      }${item.hasLocalDraft && item.status === "published" ? " · 有本机草稿" : ""}`;
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = item.title || item.slug;
      const summary = document.createElement("div");
      summary.className = "item-summary";
      summary.textContent = item.summary || "（无摘要）";
      li.append(kind, title, summary);
      li.addEventListener("click", () => openItem(item));
      return li;
    }),
  );
}

async function loadItems() {
  const data = await api("/api/items");
  state.items = data.items;
  renderList();
}

async function loadAssetOptions(selected) {
  const data = await api("/api/assets");
  const select = $("f-cover");
  select.replaceChildren(
    Object.assign(document.createElement("option"), { value: "", textContent: "（无）" }),
    ...data.assets.map((asset) => {
      const option = document.createElement("option");
      option.value = asset.name;
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
  img.src = previewUrl(name);
  img.hidden = false;
}

function applyDoc(doc) {
  $("f-title").value = doc.title ?? "";
  $("f-slug").value = doc.slug ?? "";
  $("f-summary").value = doc.summary ?? "";
  $("f-tags").value = (doc.tags ?? []).join(", ");
  $("f-created").value = doc.created ?? "";
  $("f-updated").value = doc.updated ?? "";
  $("f-art-category").value = doc.artCategory ?? "";
  $("f-series").value = doc.series ?? "";
  $("f-body").value = doc.body ?? "";
  renderPreview(doc.body ?? "");
  markSaved(
    doc.source === "site"
      ? "已发布内容（只读快照）：保存时会自动建立本机草稿"
      : "草稿已载入",
  );
}

async function openItem(item) {
  state.current = { kind: item.kind, slug: item.slug, ...item };
  emptyEl.hidden = true;
  editorEl.hidden = false;
  $("gallery-fields").hidden = item.kind !== "gallery";
  renderList();

  try {
    const doc = await api(`/api/drafts/${item.kind}/${item.slug}`);
    await loadAssetOptions(doc.cover);
    applyDoc(doc);
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
      body: JSON.stringify(buildSavePayload()),
    });
    state.current.slug = result.slug;
    if (!silent) {
      markSaved(`已保存草稿 ${result.slug} · ${new Date().toLocaleTimeString()}`);
    } else {
      markSaved(`已自动保存 · ${new Date().toLocaleTimeString()}`);
    }
    await loadItems();
  } catch (error) {
    setSaveState(error.message, true);
    throw error;
  }
}

async function publishCurrent() {
  if (!state.current || state.publishing) return;
  const { kind, slug } = state.current;
  if (isDirty()) {
    await saveDraft({ silent: true }).catch(() => {});
  }
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
    const response = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: await file.arrayBuffer(),
    });
    if (!response.ok) {
      setSaveState("资产上传失败", true);
      return;
    }
    const result = await response.json();
    await loadAssetOptions(result.name);
    setSaveState(
      result.renamed
        ? `资产与已有文件重名，已自动命名为 ${result.name}`
        : `资产已上传：${result.name}`,
    );
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
    form.setAttribute("data-result", "cancel");
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
    const value = form.getAttribute("data-result");
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
      setSaveState(
        result.replacedSiteCopy
          ? "导入完成：已覆盖草稿与已发布版本（Obsidian 原文件未改动）"
          : "导入完成：已建立本机草稿",
      );
      await loadItems();
      await openItem({ kind: result.kind, slug: result.slug, status: "draft" });
    } catch (error) {
      if (error.status === 409) {
        pendingOverwrite = false;
        const conflict = $("import-conflict");
        const siteNote = error.payload.existsOnSite
          ? "注意：网站上已有该 slug 的已发布版本。"
          : "";
        conflict.textContent = `${error.message}。${siteNote}勾选确认后再次导入将覆盖网站版本。`;
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
          label.append(checkbox, document.createTextNode("我确认覆盖已有草稿/网站版本"));
          conflict.after(label);
        }
        return;
      }
      $("import-conflict").textContent = error.message;
      $("import-conflict").hidden = false;
    }
  });
}

function wire() {
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
  $("btn-publish").addEventListener("click", publishCurrent);
  $("btn-unpublish").addEventListener("click", unpublishCurrent);
  $("btn-delete").addEventListener("click", deleteCurrent);
  $("btn-upload-asset").addEventListener("click", uploadAsset);
  $("btn-insert-image").addEventListener("click", insertImage);
  $("f-cover").addEventListener("change", updateCoverPreview);

  let previewTimer = null;
  $("f-body").addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderPreview($("f-body").value), 200);
  });

  window.addEventListener("beforeunload", (event) => {
    if (isDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  setInterval(() => {
    if (isDirty() && !state.publishing) {
      saveDraft({ silent: true }).catch(() => {});
    }
  }, 30000);

  wireImportDialog();
}

wire();
loadItems().catch((error) => setSaveState(error.message, true));
