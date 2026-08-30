# Web Runtime

## 内容边界

`apps/web` 只读取 `content/public`：

- `metadata/notes.json`、`gallery.json`：列表、归档、Sitemap 和 RSS；
- `metadata/search.json`：客户端全文检索；
- `notes/*.md`、`gallery/*.md`：静态详情页；
- `assets/*`：构建前同步到 `apps/web/public/assets`。

## 公共页面

- 首页、Note、Gallery、Archive、Search、Account；
- Note/Gallery 静态详情；
- Sitemap、robots、RSS；
- Note/Gallery 动态 Open Graph 图片和详情元数据。

## Markdown 契约

支持标准 Markdown、GFM、KaTeX 与代码高亮。原始 HTML 节点被丢弃，Studio
预览使用同一规则。图片必须使用标准 Markdown 语法并引用 `assets/`。

## 构建

`apps/web` 的 `prebuild` 是唯一生产预构建入口：重建 `content/public`、同步资产、
生成确定性的 RSS，然后执行 Next.js 生产构建。开发服务器使用 `.next-dev`，生产构建
使用 `.next`；本机 4317 预览保持运行时执行质量门不会再互相覆盖 Next.js 清单。
