# Generated Snapshot Contract

`tools/site-builder` 从 `content/site` 生成：

```text
content/public/
  notes/*.md
  gallery/*.md
  assets/*
  metadata/
    notes.json
    gallery.json
    search.json
```

生成的 Markdown 与资产目录被 Git 忽略；三个 metadata JSON 进入 Git，供 Vercel
检出后构建。`apps/web/public/assets` 同样是构建产物，不手工维护。
