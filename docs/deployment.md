# 部署指南

## Vercel 部署

### 首次配置

1. 安装 Vercel CLI：
   ```bash
   npm i -g vercel
   ```

2. 登录：
   ```bash
   vercel login
   ```

3. 在项目根目录关联项目：
   ```bash
   vercel link
   ```

### 部署

```bash
# 预览部署
vercel

# 确认预览无误后再生产部署
vercel --prod
```

### Vercel 配置

当前项目使用 Vercel 项目设置：

- Root Directory：`apps/web`
- Framework：Next.js
- Build Command：自动检测
- Output Directory：自动检测
- Install Command：`cd ../.. && pnpm install --frozen-lockfile`

`apps/web` 在构建时仍可读取仓库根目录的 `content/public`。

当前生产项目已部署成功。Vercel 回退地址：

`https://personal-site-pearl-eta-55.vercel.app`

## 短期和长期发布方式

### 短期：本机 CLI 发布

在 Obsidian 发布当前文件后，从仓库根目录运行 `vercel` 或插件中的“部署到 Vercel”。Vercel CLI 上传本机已有的公开 Markdown 和图片，不依赖 Git 是否跟踪这些生成文件。

适合目前阶段：配置少、可以立刻发布；缺点是每次上线都依赖这台电脑。

### 长期：Git 自动发布

把 GitHub 仓库连接到 Vercel，推送 `main` 后自动部署。当前 Vercel 账号还需要先关联 GitHub 登录方式，并且需要决定如何把 `content/public` 的公开快照提供给 Git 构建环境。

适合稳定运营：可追踪、可回滚、自动部署；配置工作比本机 CLI 多。

### 环境变量

当前无需额外环境变量。如需添加：

```bash
vercel env add VARIABLE_NAME
```

## 自定义域名

`guyong.site` 和 `www.guyong.site` 已添加到 Vercel 项目。DNS 由 Cloudflare 托管：

- 根域名：DNS-only CNAME 指向 Vercel 提供的项目 CNAME
- `www`：DNS-only CNAME 指向同一个 Vercel CNAME
- 网站 canonical、RSS、Sitemap、robots 均使用 `https://guyong.site`

Cloudflare DNS 生效后，用以下命令检查：

```bash
vercel domains verify guyong.site
vercel domains verify www.guyong.site
```

## GitHub Actions 自动部署

推送到 `main` 分支时自动部署（需在 Vercel Dashboard 中配置 Git 集成）。

手动 CI 配置见 `.github/workflows/`（当前为占位文件）。

## 本地构建验证

部署前建议本地验证：

```bash
# 发布一篇文章
pnpm publish:file "E:/Mywork/Obsidian Vault/任意目录/文章.md"

# 构建
pnpm build:web

# 本地预览
pnpm dev:web
# http://localhost:4317
```
