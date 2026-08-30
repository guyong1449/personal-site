# GUYONG Personal Site

个人网站：技术笔记、课程学习记录与少量画作。站点名 `GUYONG`，线上地址 `https://guyong.site`。

视觉风格：铅雪青配色（主色 70% 淡青白 / 辅色 20% 青灰蓝 / 重点色 10% 亮青），
英文使用 Quicksand，中文使用霞鹜文楷（LXGW WenKai），整体保持紧凑无圆角排版。
旧版"明日方舟式"平面风保留在 `backup/style-v1-flat` 分支。

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

桌面上可直接使用 `C:\Users\27538\Desktop\启动-GUYONG-网站和-Studio.cmd` 管理两个
本机服务：参数可用 `start`、`stop`、`restart`、`status`；默认执行 `start`。运行日志和
PID 位于 `.local-content/runtime/`。它只启动本机监听的服务，不会把 Studio 暴露到公网。

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
pnpm verify        # 全量测试、lint、构建、链接与生成文件一致性
```

注意：Windows 上若全局 `pnpm` 垫片损坏，用 `corepack pnpm` 代替。
开发服务器使用 `apps/web/.next-dev`，生产构建使用 `apps/web/.next`，因此桌面预览运行时也可
安全执行 `pnpm build:web` 或 `pnpm verify`。

## Studio 与发布

Studio 提供内容列表、Note/Gallery 筛选、Markdown 导入（同 slug 再导入需确认覆盖）、新建/编辑/实时预览、自动保存、历史版本、定时发布、自动标题与摘要、稳定 slug、标签、日期、置顶、Gallery 分类/系列、图片压缩与正文插入、发布、下线和永久删除（需输入标题确认）。原始 HTML 不渲染，内容统一使用标准 Markdown。

定时任务状态会持久化到 `.local-content/scheduler-status.json`，可在 Studio 的“定时任务”
面板查看待发布、逾期、失败、无效和上次尝试，并对失败任务手动重试。`/healthz` 提供
进程、Git、内容生成和 scheduler 分层状态；它只代表本机 Studio，不代表 Vercel 已部署。

本机草稿优先使用 `corepack pnpm backup:studio` 备份；备份根目录默认在
`%LOCALAPPDATA%\GUYONG\backups`，可用 `STUDIO_BACKUP_ROOT`、`STUDIO_BACKUP_KEEP` 和
`STUDIO_REPO_ROOT` 配置。恢复使用 `corepack pnpm restore:studio -- <备份目录> --replace`，
底层命令为 `node tools/studio/backup.mjs create|restore`；应先在临时目录演练，避免覆盖
正在编辑的 `.local-content`。

Studio 的“清理未引用图片”入口会预览 draft/site 两层中未被正式稿或本机草稿引用的资产，
删除前要求选择并二次确认；服务端会再次扫描引用，支持 `assets/`、`./assets/` 和
`/assets/` 路径，避免误删仍在使用的图片。

发布按钮执行：校验 → 写入 `content/site` → 重建 `content/public` → site-builder 测试 / lint / vitest / next build → 仅暂存内容相关路径 → `content: publish <slug>` 提交 → 推送当前分支 → Vercel 自动部署。任一阶段失败会保留草稿并提示失败阶段。`STUDIO_PUBLISH_DRY_RUN=1` 可演练（跳过 Git 步骤）。

生产环境不含 Studio：生产构建的 rewrite 列表为空，`https://guyong.site/studio` 返回 404。

## 部署

Vercel 项目 `personal-site`，生产域名 `guyong.site` / `www.guyong.site`。推送 main 触发部署（若 Git 集成已连接）；手动部署用 Vercel CLI `vercel --prod`。

GitHub Actions 在 push/PR 上运行 `pnpm verify`（含 typecheck、构建后 smoke、链接与生成文件
一致性检查），并执行 `pnpm audit --prod --audit-level high` 高危依赖门禁。真实内容的
“Studio 发布 → GitHub → Vercel → 线上 200 → 下线 → 404”仍是待执行验收，需要明确的生产写入授权；
本仓库不以本机构建或空 Gallery 作为线上证据。

评论（Giscus）为可选功能，在 `apps/web/.env.local` 配置 `NEXT_PUBLIC_GISCUS_REPO` / `NEXT_PUBLIC_GISCUS_REPO_ID` / `NEXT_PUBLIC_GISCUS_CATEGORY` / `NEXT_PUBLIC_GISCUS_CATEGORY_ID` 后自动挂载，未配置时文章不显示评论区。

## 文档

更多细节见 `docs/`（workflow、deployment、development-plan、maintenance）与 `agent.md`（架构契约）。
