/* global marked */
const state = {
  items: [],
  filter: "all",
  current: null, // {kind, slug, status, hasLocalDraft}
};

const $ = (id) => document.getElementById(id);
const listEl = $("item-list");
const editorEl = $("editor");
const emptyEl = $("empty-hint");

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
  $("f-body").value = doc.body ?? "";
  renderPreview(doc.body ?? "");
  setSaveState(
    doc.source === "site"
      ? "已发布内容（只读快照）：保存时会自动建立本机草稿"
      : "草稿已载入",
  );
}

async function openItem(item) {
  state.current = { kind: item.kind, slug: item.slug, ...item };
  emptyEl.hidden = true;
  editorEl.hidden = false;
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

async function saveDraft() {
  if (!state.current) {
    return;
  }
  const { kind, slug } = state.current;
  try {
    const result = await api(`/api/drafts/${kind}/${slug}`, {
      method: "PUT",
      body: JSON.stringify({
        title: $("f-title").value,
        slug: $("f-slug").value,
        summary: $("f-summary").value,
        tags: $("f-tags")
          .value.split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        cover: $("f-cover").value || null,
        body: $("f-body").value,
      }),
    });
    state.current.slug = result.slug;
    setSaveState(`已保存草稿 ${result.slug} · ${new Date().toLocaleTimeString()}`);
    await loadItems();
  } catch (error) {
    setSaveState(error.message, true);
  }
}

async function publishCurrent() {
  if (!state.current) return;
  const { kind, slug } = state.current;
  try {
    const result = await api(`/api/publish/${kind}/${slug}`, { method: "POST", body: "{}" });
    setSaveState(`已发布：${result.slug}（提交 ${result.commit ?? ""}）`);
    await loadItems();
  } catch (error) {
    setSaveState(error.message, true);
  }
}

async function unpublishCurrent() {
  if (!state.current) return;
  const { kind, slug } = state.current;
  try {
    const result = await api(`/api/unpublish/${kind}/${slug}`, { method: "POST", body: "{}" });
    setSaveState(`已下线：${result.slug}`);
    await loadItems();
  } catch (error) {
    setSaveState(error.message, true);
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

async function uploadAsset() {
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
    await loadAssetOptions($("f-cover").value || file.name);
    setSaveState(`资产已上传：${file.name}`);
  };
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
  $("btn-save").addEventListener("click", saveDraft);
  $("btn-publish").addEventListener("click", publishCurrent);
  $("btn-unpublish").addEventListener("click", unpublishCurrent);
  $("btn-delete").addEventListener("click", deleteCurrent);
  $("btn-upload-asset").addEventListener("click", uploadAsset);
  $("f-cover").addEventListener("change", updateCoverPreview);

  let previewTimer = null;
  $("f-body").addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderPreview($("f-body").value), 200);
  });

  wireImportDialog();
}

wire();
loadItems().catch((error) => setSaveState(error.message, true));
