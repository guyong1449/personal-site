# GUYONG Personal Site

个人网站：技术笔记、课程学习记录与少量画作。站点名 `GUYONG`，线上地址 `https://guyong.site`。

视觉风格：铅雪青配色（主色 70% 淡青白 / 辅色 20% 青灰蓝 / 重点色 10% 亮青），Quicksand 圆润字体，紧凑无圆角排版。旧版"明日方舟式"平面风保留在 `backup/style-v1-flat` 分支。

## 结构

```
personal-site/
├── apps/web              # Next.js 15 前端（唯一部署产物）
├── tools/site-builder    # content/site → content/public 生成器
├── tools/studio          # 本机 Studio（127.0.0.1:4319，仅本机）
├── tools/publisher       # 旧 Obsidian 导出管线（已被 Studio 取代，保留备查）
├── content/site          # 正式内容唯一维护源（进 Git）
├── content/public        # 自动生成快照（web 只读这里）
└── .local-content        # 本机草稿（gitignore，不进 Git）
```

## 内容模型

- 所有文字内容统一为 `content_type: note`，课程信息用标签表达（`course/CS308`、`topic/algorithm`）。
- Gallery 独立于 Note，`content_type: gallery`。
- frontmatter 字段：`title`、`slug`、`content_type`、`summary`、`tags`、`cover`、`created`、`updated`。

## 本机开发

```bash
pnpm install
pnpm studio        # 启动本机 Studio：http://127.0.0.1:4319/studio（仅监听 127.0.0.1）
pnpm dev:web       # 开发服务器 http://127.0.0.1:4317，开发模式下 /studio 转发到 Studio
pnpm build:web     # 生产构建（自动先 build:content 重建 content/public）
pnpm build:content # 仅重建 content/public 与 metadata
pnpm test:web      # vitest；pnpm test:content 为 site-builder 测试
```

注意：Windows 上若全局 `pnpm` 垫片损坏，用 `corepack pnpm` 代替。

## Studio 与发布

Studio 提供内容列表、Note/Gallery 筛选、Markdown 导入（同 slug 再导入需确认覆盖）、新建/编辑/实时预览、自动标题与摘要、稳定 slug、标签、封面上传与预览、保存草稿、发布、下线、永久删除（需输入标题确认）。

发布按钮执行：校验 → 写入 `content/site` → 重建 `content/public` → site-builder 测试 / lint / vitest / next build → 仅暂存内容相关路径 → `content: publish <slug>` 提交 → 推送当前分支 → Vercel 自动部署。任一阶段失败会保留草稿并提示失败阶段。`STUDIO_PUBLISH_DRY_RUN=1` 可演练（跳过 Git 步骤）。

生产环境不含 Studio：生产构建的 rewrite 列表为空，`https://guyong.site/studio` 返回 404。

## 部署

Vercel 项目 `personal-site`，生产域名 `guyong.site` / `www.guyong.site`。推送 main 触发部署（若 Git 集成已连接）；手动部署用 Vercel CLI `vercel --prod`。

评论（Giscus）为可选功能，在 `apps/web/.env.local` 配置 `NEXT_PUBLIC_GISCUS_REPO` / `NEXT_PUBLIC_GISCUS_REPO_ID` / `NEXT_PUBLIC_GISCUS_CATEGORY` / `NEXT_PUBLIC_GISCUS_CATEGORY_ID` 后自动挂载，未配置时文章不显示评论区。

## 文档

更多细节见 `docs/`（workflow、deployment、tools）与 `agent.md`（架构契约）。
