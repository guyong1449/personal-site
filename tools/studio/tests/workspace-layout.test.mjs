import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeWorkspaceLayout } from "../public/workspace-layout.js";

test("invalid saved layouts cannot hide the workspace or inject CSS", () => {
  assert.deepEqual(normalizeWorkspaceLayout(null), {});
  assert.deepEqual(normalizeWorkspaceLayout({ dockWidth: "9000px", editorHeight: NaN, previewWidth: Infinity, previewHeight: null, other: 4 }), {});
  assert.deepEqual(normalizeWorkspaceLayout({ dockWidth: -5, editorHeight: 99999, previewWidth: 99999, previewHeight: -1 }), {
    dockWidth: 240, editorHeight: 2000, previewWidth: 2560, previewHeight: 180,
  });
});

test("restores independently chosen editor and preview dimensions", () => {
  assert.deepEqual(normalizeWorkspaceLayout({ dockWidth: 580.2, editorHeight: 460, previewWidth: 1024, previewHeight: 700 }), {
    dockWidth: 580, editorHeight: 460, previewWidth: 1024, previewHeight: 700,
  });
});
