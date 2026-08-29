# Runtime Overview

## 数据流

```text
.local-content（本机草稿，gitignore）
  -> tools/studio
content/site（正式内容，git-tracked）
  -> tools/site-builder
content/public（生成快照）
  -> apps/web（Next.js 15）
  -> Vercel
```

## 层级职责

### Studio

只监听 `127.0.0.1:4319`，负责新建、导入、自动保存、历史版本、定时发布、
资产处理、发布、下线和草稿删除。外部 Markdown 只会被复制，不修改原文件。

### `content/site`

正式内容唯一维护源，包含 `notes/`、`gallery/` 和 `assets/`。发布操作只定向
暂存内容相关路径，不使用 `git add .`。

### site-builder 与 `content/public`

site-builder 校验 frontmatter、slug 和内容类型，生成排序后的 metadata、搜索索引、
规范化 Markdown 与资产快照。`content/public` 不手工编辑。

### Web

Next.js App Router 只读取生成快照。列表和索引在构建期生成，Note/Gallery 详情页
通过 `generateStaticParams` 静态生成。Markdown 支持 GFM、数学和代码高亮，原始
HTML 不渲染。

### 部署

推送 Git 分支后由 Vercel Git 集成构建 `apps/web`。GitHub Actions 是质量门，
不直接部署生产环境。

## Legacy

`tools/publisher`、`tools/publish-server.js` 与 Obsidian 插件是旧导出管线，保留作
迁移参考，不是正式内容维护源。
