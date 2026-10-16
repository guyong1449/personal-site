export function initTagManager({ api, beforeOpen, onChanged }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("tag-manager-dialog");
  let data = { tags: [], documents: [] };
  const names = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" }));
  const selectedTags = () => $("f-tags").value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  const status = (message, error = false) => { $("tag-manager-status").textContent = message; $("tag-manager-status").classList.toggle("is-error", error); };
  function checkbox(name, checked, onChange) {
    const label = document.createElement("label");
    label.className = "tag-choice";
    const input = document.createElement("input");
    input.type = "checkbox"; input.checked = checked; input.addEventListener("change", onChange);
    label.append(input, document.createTextNode(name));
    return label;
  }
  function setEditorTags(values) {
    $("f-tags").value = names(values).join(", ");
    $("f-tags").dispatchEvent(new Event("input", { bubbles: true }));
    renderPicker();
  }
  function renderPicker() {
    const selected = selectedTags();
    $("f-tag-picker").replaceChildren(...names([...data.tags, ...selected]).map((name) => checkbox(name, selected.includes(name), (event) => {
      const values = selectedTags();
      setEditorTags(event.target.checked ? [...values, name] : values.filter((tag) => tag !== name));
    })));
  }
  async function refreshPicker() { data = await api("/api/tags"); renderPicker(); }
  function currentDocument() {
    return data.documents.find((doc) => `${doc.kind}/${doc.slug}` === $("tag-document").value);
  }
  function renderDocument() {
    const doc = currentDocument();
    $("tag-document-options").replaceChildren(...data.tags.map((name) => checkbox(name, doc?.tags.includes(name) ?? false, () => {})));
    $("tag-document-save").disabled = !doc;
  }
  function renderLibrary() {
    const query = $("tag-library-search").value.trim().toLowerCase();
    $("tag-library").replaceChildren(...data.tags.filter((name) => name.toLowerCase().includes(query)).map((name) => {
      const row = document.createElement("div"); row.className = "tag-library-row";
      const input = document.createElement("input"); input.value = name; input.setAttribute("aria-label", `重命名标签 ${name}`);
      const button = document.createElement("button"); button.type = "button"; button.textContent = "重命名"; button.setAttribute("aria-label", `重命名 ${name}`);
      button.addEventListener("click", () => perform({ action: "rename", oldName: name, name: input.value }, "标签已重命名，正式文章与草稿已同步").catch(showError));
      row.append(input, button); return row;
    }));
  }
  function renderManager() {
    const previous = $("tag-document").value;
    $("tag-document").replaceChildren(...data.documents.map((doc) => {
      const option = document.createElement("option"); option.value = `${doc.kind}/${doc.slug}`;
      option.textContent = `${doc.title} · ${doc.published ? "已发布" : "草稿"}`; return option;
    }));
    if (data.documents.some((doc) => `${doc.kind}/${doc.slug}` === previous)) $("tag-document").value = previous;
    renderLibrary(); renderDocument(); renderPicker();
  }
  const showError = (error) => status(error.message, true);
  async function perform(change, message) {
    const controls = [...dialog.querySelectorAll("button, input, select")];
    const disabled = controls.map((control) => control.disabled);
    controls.forEach((control) => { control.disabled = true; });
    status("正在保存标签…");
    try {
      data = await api("/api/tags", { method: "POST", body: JSON.stringify({ ...change, revision: data.revision }) });
      if (change.action !== "create") await onChanged();
      renderManager(); status(message + " · 尚未发布");
    } finally { controls.forEach((control, index) => { control.disabled = disabled[index]; }); }
  }
  $("btn-tags").addEventListener("click", async () => {
    try {
      await beforeOpen();
      await refreshPicker(); renderManager(); status(""); dialog.showModal();
    } catch (error) { showError(error); }
  });
  $("tag-manager-close").addEventListener("click", () => dialog.close());
  $("tag-library-search").addEventListener("input", renderLibrary);
  $("tag-document").addEventListener("change", renderDocument);
  $("tag-create").addEventListener("click", async () => {
    try { await perform({ action: "create", name: $("tag-new-name").value }, "标签已创建"); $("tag-new-name").value = ""; }
    catch (error) { showError(error); }
  });
  $("tag-document-save").addEventListener("click", () => {
    const doc = currentDocument(); if (!doc) return;
    const tags = [...$("tag-document-options").querySelectorAll("label")].filter((label) => label.querySelector("input").checked).map((label) => label.textContent);
    perform({ action: "assign", kind: doc.kind, slug: doc.slug, tags }, "文章标签已保存，正文保持不变").catch(showError);
  });
  $("tag-manager-publish").addEventListener("click", async () => {
    const button = $("tag-manager-publish"); button.disabled = true;
    status("正在校验、构建并发布标签更改…");
    try {
      const result = await api("/api/tags/publish", { method: "POST", body: JSON.stringify({ revision: data.revision }) });
      await onChanged(); await refreshPicker(); renderManager(); status(`标签已推送 · ${result.commit}，等待网站部署`);
    } catch (error) { showError(error); }
    finally { button.disabled = false; }
  });
  $("f-tag-add").addEventListener("click", async () => {
    const button = $("f-tag-add"); button.disabled = true;
    const name = $("f-tag-new").value.trim();
    try {
      data = await api("/api/tags");
      if (!data.tags.includes(name)) data = await api("/api/tags", { method: "POST", body: JSON.stringify({ action: "create", name, revision: data.revision }) });
      setEditorTags([...selectedTags(), name]); $("f-tag-new").value = "";
    } catch (error) { $("tag-picker-status").textContent = error.message; }
    finally { button.disabled = false; }
  });
  return { refreshPicker };
}
