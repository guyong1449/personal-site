# 月度维护清单

本清单作为 2026-09 起使用的本机 Studio 和公开站月度复核模板。它记录“应检查什么”和“留下什么证据”，
不自动执行生产写入；真实内容发布/下线仍需单独的明确授权。2026-08-30 的首次现场验收已记录在
[development-plan.md](development-plan.md) 与 [remaining-tasks.md](remaining-tasks.md)，本模板保持未勾选。

## 1. 质量门与依赖

- [ ] 在仓库根目录运行 `corepack pnpm verify`：测试、lint、Web typecheck、生产构建、
  构建后 smoke、链接检查和生成快照一致性都通过。
- [ ] 查看 GitHub Actions 的 push/PR 结果；确认运行的 SHA 与本地计划验证的 SHA 一致。
- [ ] 运行或查看 CI 的 `pnpm audit --prod --audit-level high`。它是高危依赖门禁；新增
  高危漏洞要记录包名、影响范围、升级/缓解决定和复测结果。
- [ ] 检查工作区是否有未预期的改动；不要用宽范围 `git add .` 或 `git add -A` 发布内容。

## 2. 草稿备份与恢复

- [ ] 运行 `corepack pnpm backup:studio`，记录备份路径、时间和文件数。
- [ ] 确认备份根目录位于 `%LOCALAPPDATA%\GUYONG\backups` 或已配置的
  `STUDIO_BACKUP_ROOT`，且不在 `.local-content` 内部；按 `STUDIO_BACKUP_KEEP` 清理旧备份。
- [ ] 在临时目录完成一次恢复演练，例如设置 `STUDIO_REPO_ROOT` 到临时仓库，再运行：

  ```powershell
  corepack pnpm restore:studio -- <临时备份目录> --replace
  ```

  底层等价命令为 `node tools/studio/backup.mjs restore <备份目录> [--replace]`。

- [ ] 检查草稿 Markdown、`history` 和 `assets` 均能恢复；不要把真实 `.local-content` 当作
  演练目标。覆盖已有目标只有在确认后使用 `--replace`，并保留恢复前备份。

## 3. Studio、scheduler 与健康状态

- [ ] 用桌面入口执行 `启动-GUYONG-网站和-Studio.cmd status`，确认 4317/4319 端口、PID
  所有权和 HTTP 健康均正常；日志位于 `.local-content\runtime\`。
- [ ] 打开 `http://127.0.0.1:4319/healthz`，记录 `process`、`git`、`content`、`scheduler`
  的状态；`ready` 只代表本机 Studio，不代表 Vercel。
- [ ] 查看 Studio“定时任务”面板或 `GET /api/scheduler/status`，记录待发布、逾期、失败、
  无效数量、尝试次数和上次尝试。
- [ ] 为失败任务确认 `POST /api/scheduler/retry/{kind}/{slug}` 可手动重试；坏
  `publish_at` 先修正草稿再重试。确认单条失败不会阻断其他任务。
- [ ] 执行一次 `start`/`restart` 后再检查状态；若端口被非本项目进程占用，先记录并处理，
  不强制结束陌生进程。
- [ ] 打开 Studio“清理未引用图片”，检查预览是否同时覆盖 draft/site；仅对确认无引用的
  资产执行删除，并确认服务端二次扫描不会删除仍被引用的文件。

## 4. 公开站与 Vercel

- [ ] 仅在已有生产授权时核对 Vercel 部署状态、生产域名、静态资产、RSS、Sitemap 和主要
  404 行为，并记录部署 ID、Git SHA 与检查时间。
- [ ] 生产异常时先保存 GitHub Actions/Vercel 证据，再选择 Git 回退重部署或 Vercel 已知
  正常部署回滚；当前没有 Studio 自动回滚生产部署。
- [ ] 不用空 Gallery、临时内容或本机 4317 预览冒充真实 Gallery 线上样本验证。

## 5. 记录模板

```text
日期：YYYY-MM-DD
Git SHA：
pnpm verify：通过 / 失败（链接日志或失败阶段）
CI run：
备份路径与文件数：
恢复演练目录：
桌面入口 status：
/healthz：ready / degraded（记录具体层）
scheduler：pending / overdue / failed / invalid / published
Vercel 部署 ID 与线上证据：未执行 / 已授权后记录
后续行动：
```

## 生产闭环边界

“Studio 发布 → GitHub → Vercel → 线上 200 → 下线 → 线上 404”目前保持未完成。该演练会
写入正式内容、提交/推送生产分支并改变公开页面，必须获得用户明确的生产写入授权；本清单
不创建真实 Gallery 样本，也不执行生产发布或下线。
