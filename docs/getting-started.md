# 快速开始

## 环境要求

- Node.js 24（与 CI、Vercel 一致）
- pnpm 10
- Git

## 安装

```powershell
git clone <repo-url>
Set-Location personal-site
corepack pnpm install --frozen-lockfile
```

## 本机写作与预览

在两个终端分别运行：

```powershell
corepack pnpm studio
corepack pnpm dev:web
```

- Studio：`http://127.0.0.1:4319/studio`
- 网站：`http://127.0.0.1:4317`
- 开发模式下也可从网站访问 `/studio`；生产环境不提供此路由。

Windows 也可以双击桌面上的 `启动-GUYONG-网站和-Studio.cmd`，或执行
`启动-GUYONG-网站和-Studio.cmd status|restart|stop` 管理两个服务。状态检查会验证端口和
本机健康接口，日志在仓库 `.local-content/runtime/`。

在 Studio 中可以新建 Note/Gallery，或导入标准 Markdown。原始 HTML 不渲染；
图片使用 `![说明](assets/文件名)`，也可以上传资产后点击“插入正文”。

## 发布

在 Studio 中保存草稿后点击“发布”。发布流程会校验内容、重建公开快照、运行测试
和生产构建、定向提交内容文件并推送当前分支。定时发布只在 Studio 持续运行时触发。

定时任务的状态保存在 `.local-content/scheduler-status.json`，可从 Studio 的“定时任务”
面板查看并重试失败任务。`http://127.0.0.1:4319/healthz` 可查看进程、Git、内容生成和
scheduler 分层状态。

需要演练而不提交 Git 时：

```powershell
$env:STUDIO_PUBLISH_DRY_RUN='1'
corepack pnpm studio
```

## 验证命令

| 命令 | 说明 |
|---|---|
| `corepack pnpm verify` | 完整质量门：测试、lint、typecheck、构建、smoke、链接检查与生成文件一致性 |
| `corepack pnpm check` | site-builder、Studio、Legacy publisher、web lint/vitest |
| `corepack pnpm build:web` | 重建公开快照并执行 Next.js 生产构建 |
| `corepack pnpm check:links` | 检查公开内容中的站内链接和资源引用 |
| `corepack pnpm build:content` | 只重建 `content/public` |

Windows 上若全局 `pnpm` 垫片异常，始终使用 `corepack pnpm`。
