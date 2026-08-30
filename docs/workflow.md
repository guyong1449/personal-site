# 发布工作流

当前唯一发布路径：**本机 Studio → content/site → site-builder → content/public → Git 推送 → Vercel**。

> 旧流程（Obsidian → publisher 插件 → content/public）已归档为 Legacy，
> 见 [tools.md](tools.md#legacy-obsidian-publisher) 与 `tools/publisher/`。

## 日常流程

```
1. 启动两个本机服务
   └─ 桌面 `启动-GUYONG-网站和-Studio.cmd`（默认 start）
   └─ 或分别运行 `pnpm studio` 与 `pnpm dev:web`

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

定时发布只在 Studio 持续运行时执行。Studio 的“定时任务”面板和
`GET http://127.0.0.1:4319/api/scheduler/status` 显示待发布、逾期、失败、无效、尝试次数
和上次尝试；失败任务可通过面板或 `POST /api/scheduler/retry/{kind}/{slug}` 重试。
状态持久化在 `.local-content/scheduler-status.json`。

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

## 封面与图片存放

封面与正文图片统一从 Studio 的“上传封面 / 图片”进入，不要手工修改生成目录。
推荐封面使用 16:9、1600 × 900，单张不超过 8MB；JPG/PNG 会在上传时缩放到
最大 1600px 宽并以质量 82 转为 WebP。WebP、GIF、AVIF 保持原文件。

图片的完整流转如下：

```
.local-content/assets/文件名      # 本机草稿，已 gitignore
        ↓ 点击发布
content/site/assets/文件名        # 正式源文件，进入 Git
        ↓ site-builder / sync
apps/web/public/assets/文件名     # 构建副本，不手工编辑
        ↓ Vercel 部署
https://guyong.site/assets/文件名
```

Studio 只在 frontmatter 的 `cover` 中保存文件名，并自动显示封面预览；正文插图使用
`![说明](assets/文件名)`。当前图片随网站一同部署，已相当于同域静态图床，不需要
额外账号、密钥或上传服务。

当 Git 仓库因大量原图明显膨胀，或图片更新频率远高于文章时，再迁移到对象存储。
候选方案为 Cloudflare R2 + `assets.guyong.site`；迁移时应保留现有 `/assets/...`
兼容路径，并把上传凭据仅放在服务器环境变量中，不能放进 Studio 前端或仓库。

## 构建与验证

```bash
pnpm verify       # 测试 + lint + build + 链接 + 生成文件一致性
pnpm build:web    # 仅需单独验证生产构建时使用
```

`apps/web/scripts/generate-rss.js` 的日期全部取自内容 frontmatter，
连续构建产出字节级一致的 feed.xml。GitHub Actions（`.github/workflows/ci.yml`）
在每次推送与 PR 上执行 `pnpm verify`，其中包含 Web typecheck、构建后本地 smoke、链接和
生成快照一致性检查，并额外执行高危级别依赖审计。

## 日常运维

- `/healthz` 是本机 Studio 的分层检查，包含进程、Git、内容生成和 scheduler；`ready` 不等于
  Vercel 已部署。
- 桌面入口的 `status` 会检查 4317/4319 监听、PID 所有权和 HTTP 健康；日志位于
  `.local-content/runtime/`。发现端口被非 GUYONG 进程占用时不会强制结束它。
- 草稿、历史和资产优先用 `corepack pnpm backup:studio` 备份；恢复使用
  `corepack pnpm restore:studio -- <备份目录> --replace`，恢复前先用临时目录演练，详见
  [月度维护清单](maintenance.md)。
- Studio 的“清理未引用图片”先预览 draft/site 两层未被引用的资产；选择并二次确认后，
  服务端会重新扫描正式稿与本机草稿，仍被引用的资产拒绝删除。
