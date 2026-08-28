# 工具详解

## 1. Publisher (`tools/publisher/`)

从 Obsidian Vault 导出文章到 `content/public/`。

### 功能

- 扫描配置的 Vault 目录
- 解析 frontmatter（支持 CRLF/LF）
- 过滤 `publish: true` 且 `channels` 包含 `site` 的文章
- 重写 Obsidian 内部链接 `[[链接]]` 为网站路由
- 复制并重写图片资源路径
- 生成 metadata JSON 索引
- 为微信/小红书生成社交渠道草稿

### 配置

`tools/publisher/config.yaml`：

```yaml
vault_root: "E:/Mywork/Obsidian Vault"
public_scope:
  include:
    - "08-个人/DKU相关"
    - "04-方法论/科研交流与方法论"
  exclude:
    - "08-个人/私密笔记"
output_root: "../../content/public"
default_channel: "site"
```

### 使用

```bash
# 推荐：发布单个文件，不依赖目录配置
pnpm publish:file "E:/Mywork/Obsidian Vault/任意目录/文章.md"

# 可选：按 include 目录全量重建
pnpm export:content
```

### 运行测试

```bash
cd tools/publisher
npm test
```

---

## 2. Publish Server (`tools/publish-server.js`)

轻量 HTTP API 服务器，供 Obsidian 插件调用。

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/export` | 按配置目录全量导出 |
| POST | `/api/publish-file` | 增量发布一个 Vault Markdown 文件 |
| POST | `/api/preview` | 管理 dev server（body: `{action: "start"/"stop"/"status"}`）|
| POST | `/api/deploy` | 运行 `vercel --prod` |
| GET  | `/api/status` | 查询服务器状态 |

### 启动

```bash
node tools/publish-server.js
# 或
pnpm publish-server
```

默认端口 4318，可通过 `--port` 修改。网站预览端口为 4317。

### 测试

```bash
# 检查状态
curl http://localhost:4318/api/status

# 触发导出
curl -X POST http://localhost:4318/api/export

# 启动预览
curl -X POST http://localhost:4318/api/preview \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'
```

---

## 3. Add Frontmatter (`tools/add-frontmatter.js`)

批量为 Obsidian 笔记添加 frontmatter 的 CLI 工具。

### 功能

- 自动从文件名/标题推断 `title`
- 根据目录结构推断 `content_type` 和 `tags`
- 从正文第一段推断 `summary`
- 支持 `--dry-run` 预览模式
- 支持 `--force` 覆盖已有 frontmatter

### 使用

```bash
# 扫描整个 Vault
node tools/add-frontmatter.js --vault "E:/Mywork/Obsidian Vault"

# 只处理特定目录
node tools/add-frontmatter.js \
  --vault "E:/Mywork/Obsidian Vault" \
  --include "04-方法论/科研交流与方法论"

# 预览模式（不写入文件）
node tools/add-frontmatter.js \
  --vault "E:/Mywork/Obsidian Vault" \
  --include "01-研究项目/git" \
  --dry-run

# 覆盖已有 frontmatter
node tools/add-frontmatter.js \
  --vault "E:/Mywork/Obsidian Vault" \
  --include "08-个人/DKU相关" \
  --force
```

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--vault` | Obsidian Vault 路径 | 必填 |
| `--include` | 只处理指定目录（相对于 vault） | 全部 |
| `--exclude` | 排除指定目录 | 无 |
| `--dry-run` | 只打印不写入 | false |
| `--force` | 覆盖已有 frontmatter | false |
