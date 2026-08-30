# Content Frontmatter Contract

## Note

```yaml
---
title: "示例文章"
slug: "example-note"
content_type: "note"
summary: "简短摘要"
tags:
  - "topic/example"
created: "2026-08-29"
updated: "2026-08-29"
pinned: true
---
```

## Gallery

Gallery 使用 `content_type: "gallery"`，并可增加：

```yaml
art_category: "illustration"
series: "alpha"
cover: "example.webp"
```

## 规则

- 必填：`title`、`slug`、`content_type` 和非空正文。
- 文件名（不含 `.md`）必须与 frontmatter 的 `slug` 完全一致；`slug` 只允许小写字母、数字和连字符。
- `content_type` 只允许 `note` 或 `gallery`。
- `tags` 必须是非空数组，标签非空、唯一且不含空白字符。
- `created`、`updated` 如存在必须使用 `YYYY-MM-DD`。
- `cover` 和正文标准 Markdown 图片只能引用 `content/site/assets` 下的相对资产，引用的文件必须存在；外部图片 URL 不属于本地资产校验范围。
- site-builder 会报告未被正式内容引用的孤立资产，但不会删除源资产或跳过复制。
- Studio 的清理入口会同时复扫正式稿与本机草稿；只有二次确认且确认无引用的资产才允许删除。
- 课程内容仍为 Note，使用 `course/*` 标签表达。
- 原始 HTML、MDX 和独立 Course 类型不属于当前契约。
