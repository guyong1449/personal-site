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

Studio 发布会提交并推送当前分支。生产环境应在 Vercel Dashboard 中把 GitHub
仓库的 `main` 设为 Production Branch。仓库本身无法证明 Dashboard 连接状态，
首次上线必须完成一次“推送 → Vercel Ready → 线上页面可访问”的人工验收。

Studio 顶部“部署状态”按钮可查看当前提交与线上响应，但它不是 Vercel 构建成功的
替代证据。

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

该命令覆盖测试、lint、生产构建、死链/资源检查以及生成文件一致性。CI 在推送和
Pull Request 上运行同一命令；Vercel 仍负责实际部署。
