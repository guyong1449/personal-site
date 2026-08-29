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
- `slug` 只允许小写字母、数字和连字符。
- `content_type` 只允许 `note` 或 `gallery`。
- `tags` 不得重复或包含空格。
- `created`、`updated` 使用 `YYYY-MM-DD`。
- 课程内容仍为 Note，使用 `course/*` 标签表达。
- 原始 HTML、MDX 和独立 Course 类型不属于当前契约。
