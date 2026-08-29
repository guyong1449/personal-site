# 发布工作流

当前唯一发布路径：**本机 Studio → content/site → site-builder → content/public → Git 推送 → Vercel**。

> 旧流程（Obsidian → publisher 插件 → content/public）已归档为 Legacy，
> 见 [tools.md](tools.md#legacy-obsidian-publisher) 与 `tools/publisher/`。

## 日常流程

```
1. 启动 Studio
   └─ pnpm studio（仅监听 127.0.0.1:4319）

2. 写作 / 导入 / 编辑
   └─ http://127.0.0.1:4319/studio
   └─ 自动保存（30 秒）+ 关页未保存提醒
   └─ 导入 Markdown 时同 slug 需确认覆盖

3. 发布
   └─ Studio「发布」按钮
   └─ 校验 → 写入 content/site → 重建 content/public
      → site-builder 测试 / web lint / vitest / next build
      → 仅暂存内容路径 → content: publish <slug> → 推送 main

4. 上线
   └─ Vercel Git 集成自动部署（已连接后）
   └─ 未连接时手动：npx vercel --prod --yes --scope guyongs-projects-f59a7a4c
```

## 下线与删除

- **下线**：内容复制回 `.local-content`（可验证、可再编辑）→ 移除正式与公开
  版本 → `content: unpublish <slug>` 提交推送。
- **永久删除**：只针对本机草稿，需输入标题二次确认，独占资产一并回收。

## 内容规则

- 正文统一 `content_type: note`；课程上下文用标签（`course/CS308`）。
- Gallery 独立：`content_type: gallery`，可填 `art_category` 与 `series`。
- 图片一律标准 Markdown：`![说明](assets/文件名)`；**原始 HTML 不渲染**
  （Studio 预览与线上行为一致），导入含 HTML 的文件会被拒绝并提示。
- 资产重名上传自动改名（`name-2.png`），不会覆盖已有文件。

## 构建与验证

```bash
pnpm verify       # 测试 + lint + build + 链接 + 生成文件一致性
pnpm build:web    # 仅需单独验证生产构建时使用
```

`apps/web/scripts/generate-rss.js` 的日期全部取自内容 frontmatter，
连续构建产出字节级一致的 feed.xml。GitHub Actions（`.github/workflows/ci.yml`）
在每次推送与 PR 上执行 `pnpm verify`。
