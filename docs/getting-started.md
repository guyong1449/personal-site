# 快速开始

## 环境要求

- Node.js >= 18
- pnpm >= 10
- Obsidian (用于内容管理)
- Git

## 安装

```bash
# 克隆仓库
git clone <repo-url>
cd personal-site

# 安装依赖
pnpm install
```

## 首次运行

### 1. 发布一个 Markdown 文件

```bash
# 文件可以位于 Vault 的任意目录
pnpm publish:file "E:/Mywork/Obsidian Vault/任意目录/文章.md"
```

也可以在 Obsidian 命令面板中运行“发布当前文件到网站”。首次发布会弹出可视化表单，无需手写 frontmatter。

### 2. 本地预览

```bash
# 启动 Next.js 开发服务器
pnpm dev:web
# 访问 http://localhost:4317
```

### 3. 构建生产版本

```bash
pnpm build:web
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev:web` | 启动 Next.js 开发服务器 |
| `pnpm build:web` | 构建生产版本 |
| `pnpm lint:web` | 运行 ESLint |
| `pnpm test:web` | 运行测试 |
| `pnpm publish:file "<文件>"` | 增量发布一个 Markdown 文件，不依赖目录配置 |
| `pnpm export:content` | 按 `public_scope.include` 全量重建内容（高级用法） |
| `pnpm publish-server` | 启动发布 API 服务器 |

## Obsidian 插件安装

```bash
# 复制插件到 Obsidian
cp -r tools/obsidian-frontmatter-plugin/dist/* \
  "<你的 Obsidian Vault>/.obsidian/plugins/frontmatter-helper/"
```

在 Obsidian 中：设置 → 第三方插件 → 启用 "Frontmatter Helper"。

详见 [Obsidian 插件文档](obsidian-plugin.md)。
