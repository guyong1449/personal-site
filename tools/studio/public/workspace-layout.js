const STORAGE_KEY = "guyong-studio-layout-v1";
const LIMITS = { dockWidth: [240, 2000], editorHeight: [80, 2000], previewWidth: [240, 2560], previewHeight: [180, 2160] };

export function normalizeWorkspaceLayout(value) {
  const result = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (Number.isFinite(value?.[key])) result[key] = Math.round(Math.max(min, Math.min(max, value[key])));
  }
  return result;
}

export function initWorkspaceLayout() {
  const $ = (id) => document.getElementById(id);
  const layout = document.querySelector(".studio-layout");
  const panel = $("studio-panel");
  const viewport = $("preview-viewport");
  const statistics = document.querySelector(".studio-statistics");
  const root = document.documentElement;
  let settings = {};
  try { settings = normalizeWorkspaceLayout(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch {}
  const clamp = (value, min, max) => Math.min(Math.max(value, Math.min(min, max)), max);
  const mobile = () => window.innerWidth <= 900;
  const editing = () => !panel.hidden;
  const dockBounds = () => [Math.min(240, window.innerWidth - 16), mobile() ? window.innerWidth - 16 : Math.max(240, layout.clientWidth - 290)];
  const heightBounds = () => [80, Math.max(80, mobile()
    ? document.querySelector(".studio-status").getBoundingClientRect().top - Math.max(statistics.getBoundingClientRect().bottom,
      document.querySelector(".preview-toolbar").getBoundingClientRect().bottom)
    : layout.clientHeight - 90)];
  const inputMap = { previewWidth: "workspace-preview-width", previewHeight: "workspace-preview-height", dockWidth: "workspace-editor-width", editorHeight: "workspace-editor-height" };

  function syncInputs() {
    const sizes = { previewWidth: viewport.clientWidth, previewHeight: viewport.clientHeight,
      dockWidth: panel.hidden ? document.querySelector(".studio-dock").clientWidth : panel.clientWidth, editorHeight: panel.clientHeight };
    for (const [key, id] of Object.entries(inputMap)) {
      if (document.activeElement !== $(id)) $(id).value = Math.round(sizes[key]);
      if (key === "dockWidth" || key === "editorHeight") $(id).disabled = !editing();
    }
    $("workspace-editor-width").max = Math.round(dockBounds()[1]);
    $("workspace-editor-height").max = Math.round(heightBounds()[1]);
    $("workspace-editor-height").min = heightBounds()[0];
    $("workspace-width-handle").setAttribute("aria-valuenow", String(Math.round(sizes.dockWidth)));
    $("workspace-width-handle").setAttribute("aria-valuemin", String(dockBounds()[0]));
    $("workspace-width-handle").setAttribute("aria-valuemax", String(dockBounds()[1]));
    $("editor-height-handle").setAttribute("aria-valuenow", String(Math.round(sizes.editorHeight)));
    $("editor-height-handle").setAttribute("aria-valuemin", String(heightBounds()[0]));
    $("editor-height-handle").setAttribute("aria-valuemax", String(heightBounds()[1]));
    if (sizeMenu.open) positionSizeMenu();
  }

  function positionSizeMenu() {
    const menu = sizeMenu.querySelector(".workspace-size-menu");
    const anchor = sizeMenu.querySelector("summary").getBoundingClientRect();
    const minTop = document.querySelector(".studio-header").getBoundingClientRect().bottom + 4;
    const bottom = document.querySelector(".studio-status").getBoundingClientRect().top - 4;
    const width = Math.min(280, window.innerWidth - 16);
    menu.style.width = `${width}px`;
    menu.style.left = `${clamp(anchor.right - width, 8, window.innerWidth - width - 8)}px`;
    const top = anchor.bottom + menu.scrollHeight + 4 <= bottom ? anchor.bottom + 4
      : Math.max(minTop, bottom - Math.min(menu.scrollHeight, bottom - minTop));
    menu.style.top = `${top}px`;
    menu.style.maxHeight = `${Math.max(80, bottom - top)}px`;
  }

  function refresh() {
    root.style.setProperty("--workspace-footer-height", `${document.querySelector(".studio-status").getBoundingClientRect().height}px`);
    const width = settings.dockWidth;
    root.style.setProperty("--workspace-dock-width", `${clamp(width ?? (editing() ? 390 : 280), ...dockBounds())}px`);
    document.body.classList.toggle("workspace-custom-height", Boolean(settings.editorHeight));
    if (settings.editorHeight) root.style.setProperty("--workspace-editor-height", `${clamp(settings.editorHeight, ...heightBounds())}px`);
    for (const key of ["previewWidth", "previewHeight"]) {
      const property = key === "previewWidth" ? "--workspace-preview-width" : "--workspace-preview-height";
      if (settings[key]) root.style.setProperty(property, `${settings[key]}px`);
      else root.style.removeProperty(property);
    }
    syncInputs();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }

  function update(values, persist = true) {
    settings = normalizeWorkspaceLayout({ ...settings, ...values });
    if (values.dockWidth != null) settings.dockWidth = clamp(settings.dockWidth, ...dockBounds());
    if (values.editorHeight != null) settings.editorHeight = clamp(settings.editorHeight, ...heightBounds());
    if (values.previewWidth != null) {
      document.body.classList.remove("preview-mobile");
      $("btn-mobile").setAttribute("aria-pressed", "false"); $("btn-desktop").setAttribute("aria-pressed", "false");
    }
    refresh();
    if (persist) save();
  }

  function wireHandle(id, changes) {
    const handle = $(id);
    let drag = null;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      drag = { x: event.clientX, y: event.clientY, dockWidth: panel.hidden ? document.querySelector(".studio-dock").clientWidth : panel.clientWidth,
        editorHeight: panel.clientHeight, previewWidth: viewport.clientWidth, previewHeight: viewport.clientHeight, pointerId: event.pointerId };
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add("workspace-resizing");
    });
    handle.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      update(changes(drag, event.clientX - drag.x, event.clientY - drag.y), false);
    });
    const finish = () => {
      if (!drag) return;
      drag = null;
      document.body.classList.remove("workspace-resizing");
      save();
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
    handle.addEventListener("lostpointercapture", finish);
    handle.addEventListener("keydown", (event) => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!directions[event.key]) return;
      event.preventDefault();
      const [dx, dy] = directions[event.key].map((value) => value * (event.shiftKey ? 40 : 10));
      update(changes({ dockWidth: panel.hidden ? document.querySelector(".studio-dock").clientWidth : panel.clientWidth,
        editorHeight: panel.clientHeight, previewWidth: viewport.clientWidth, previewHeight: viewport.clientHeight }, dx, dy));
    });
  }

  wireHandle("workspace-width-handle", (start, dx) => ({ dockWidth: start.dockWidth - dx }));
  wireHandle("editor-height-handle", (start, _dx, dy) => ({ editorHeight: start.editorHeight - dy }));
  wireHandle("editor-resize-corner", (start, dx, dy) => ({ dockWidth: start.dockWidth - dx, editorHeight: start.editorHeight - dy }));
  wireHandle("preview-resize-corner", (start, dx, dy) => ({ previewWidth: start.previewWidth + dx, previewHeight: start.previewHeight + dy }));
  $("workspace-size-apply").addEventListener("click", () => {
    const values = {};
    for (const [key, id] of Object.entries(inputMap)) {
      if ($(id).disabled) continue;
      if (!$(id).checkValidity()) { $(id).reportValidity(); return; }
      values[key] = Number($(id).value);
    }
    update(values);
    $("workspace-size-status").textContent = "尺寸已应用并记住";
  });
  $("workspace-fit").addEventListener("click", () => {
    delete settings.previewWidth; delete settings.previewHeight;
    document.body.classList.remove("preview-mobile");
    $("btn-mobile").setAttribute("aria-pressed", "false"); $("btn-desktop").setAttribute("aria-pressed", "true");
    refresh(); save();
    $("workspace-size-status").textContent = "预览已适应可用空间";
  });
  $("workspace-reset").addEventListener("click", () => {
    settings = {};
    document.body.classList.remove("preview-mobile");
    $("btn-mobile").setAttribute("aria-pressed", "false"); $("btn-desktop").setAttribute("aria-pressed", "true");
    refresh(); save();
    $("workspace-size-status").textContent = "已恢复默认布局";
  });
  const sizeMenu = document.querySelector(".workspace-size-options");
  const closeMenu = () => {
    sizeMenu.open = false;
    sizeMenu.querySelector("summary").focus({ preventScroll: true });
  };
  $("workspace-size-close").addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sizeMenu.open) { event.preventDefault(); closeMenu(); }
  });
  document.addEventListener("pointerdown", (event) => { if (!sizeMenu.contains(event.target)) sizeMenu.open = false; });
  sizeMenu.addEventListener("toggle", syncInputs);
  const observer = new ResizeObserver(() => {
    if (mobile() && settings.editorHeight) refresh();
    else syncInputs();
  });
  for (const element of [layout, panel, viewport, statistics]) observer.observe(element);
  window.addEventListener("resize", refresh);
  if (settings.previewWidth) $("btn-desktop").setAttribute("aria-pressed", "false");
  refresh();
  return { refresh, setPreviewPreset(mode) {
    if (mode === "mobile") settings.previewWidth = Math.min(390, document.querySelector(".preview-scroll").clientWidth);
    else delete settings.previewWidth;
    refresh(); save();
  } };
}
