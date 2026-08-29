# Web App

`apps/web` 是唯一部署产物，使用 Next.js 15 App Router。

## 内容边界

- 只读取 `../../content/public`，不直接读取 Studio 草稿或 `content/site`。
- 列表、搜索、RSS 和 Sitemap 读取生成的 metadata。
- Note/Gallery 详情页在构建时静态生成。
- 内容支持 GFM、数学公式、代码高亮；原始 HTML 不渲染。

## 页面

- `/`、`/notes`、`/notes/[slug]`
- `/gallery`、`/gallery/[slug]`
- `/archive`、`/search`、`/account`
- `/sitemap.xml`、`/robots.txt`、`/feed.xml`

## 命令

从仓库根目录运行 `pnpm dev:web`、`pnpm build:web`、`pnpm test:web` 和
`pnpm lint:web`。完整仓库验证使用 `pnpm verify`。
