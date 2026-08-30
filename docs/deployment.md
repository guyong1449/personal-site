# 部署指南

## 生产拓扑

- Vercel Root Directory：`apps/web`
- Framework：Next.js
- Install Command：`cd ../.. && pnpm install --frozen-lockfile`
- Node.js：24
- 主域名：`https://guyong.site`

Web 包的 `prebuild` 会从仓库根目录重建内容、同步资产并生成 RSS，因此 Git 构建
不依赖开发机的 `content/public/notes` 或 `assets` 缓存。

## Git 自动部署

GitHub 仓库已连接 Vercel，生产分支为 `main`。Studio 发布会提交并推送当前分支，
连接生效后由 Vercel 自动构建。仍需对真实内容完成一次“推送 → GitHub Actions → Vercel Ready
→ 线上页面可访问”的人工验收；本地构建和部署状态回显都不能替代线上证据。

Studio 顶部“部署状态”按钮可查看当前提交与线上响应，但它不是 Vercel 构建成功的
替代证据。

`http://127.0.0.1:4319/healthz` 只检查本机 Studio 进程、Git、内容生成和 scheduler，
不检查 Vercel 部署；桌面入口的 `status` 还会核对 4317/4319 端口、PID 所有权和日志。

## 手动部署

仅在 Git 集成不可用时从仓库根目录运行：

```powershell
npx vercel --prod
```

生产部署属于外部状态变更，执行前需要明确确认。

## 环境变量

网站默认不要求运行时秘密。可选 Giscus 需要：

- `NEXT_PUBLIC_GISCUS_REPO`
- `NEXT_PUBLIC_GISCUS_REPO_ID`
- `NEXT_PUBLIC_GISCUS_CATEGORY`
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`

## 部署前检查

```powershell
corepack pnpm verify
```

该命令覆盖测试、lint、Web typecheck、生产构建、构建后 smoke、死链/资源检查以及生成
文件一致性。CI 在推送和 Pull Request 上运行同一命令，并额外执行
`pnpm audit --prod --audit-level high`。Vercel 仍负责实际部署。

## 失败与回滚

Studio 的本地发布/下线流程会在生成、检查、提交或推送失败时恢复本地正式层；已推送的
生产部署没有自动回滚。线上异常时，先记录 Git SHA、GitHub Actions 和 Vercel 部署 ID，
再根据需要在 Git 中回退并重新部署，或在 Vercel 中选择已知正常部署回滚，最后验证页面、
资产和 404 行为。任何会改变生产内容、Git 历史或 Vercel 状态的操作都需要用户明确授权。

## 生产闭环状态

“Studio 发布 → GitHub → Vercel → 线上 200 → 下线 → 线上 404”目前保持未完成。执行它
需要事先获得明确的生产写入授权；不创建虚构的 Gallery 样本，也不把空 Gallery 或本机
预览当作线上验收证据。
