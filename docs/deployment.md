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
# 生产部署
vercel --prod

# 预览部署
vercel
```

### Vercel 配置

`vercel.json`：

```json
{
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### 环境变量

当前无需额外环境变量。如需添加：

```bash
vercel env add VARIABLE_NAME
```

## 自定义域名

1. 在 Vercel Dashboard 中进入项目设置
2. 进入 Domains 页面
3. 添加自定义域名
4. 按提示配置 DNS 记录

## GitHub Actions 自动部署

推送到 `main` 分支时自动部署（需在 Vercel Dashboard 中配置 Git 集成）。

手动 CI 配置见 `.github/workflows/`（当前为占位文件）。

## 本地构建验证

部署前建议本地验证：

```bash
# 导出内容
pnpm export:content

# 构建
pnpm build:web

# 本地预览构建结果
cd apps/web && npx serve .next
```
