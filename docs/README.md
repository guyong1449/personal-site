# Personal Site 文档

个人网站项目文档，基于 Obsidian → Publisher → Next.js → Vercel 的发布流水线。

## 文档目录

| 文档 | 说明 |
|------|------|
| [快速开始](getting-started.md) | 环境准备、安装、首次运行 |
| [发布工作流](workflow.md) | 从 Obsidian 写作到网站上线的完整流程 |
| [工具详解](tools.md) | publisher、publish-server、add-frontmatter 的使用 |
| [Obsidian 插件](obsidian-plugin.md) | Frontmatter Helper 插件安装与使用 |
| [部署指南](deployment.md) | Vercel 部署配置与自定义域名 |
| [待办事项](remaining-tasks.md) | 当前需要完成的工作 |

## 架构概览

```
Obsidian Vault (外部)
  │
  ├─ tools/publisher ──────────────┐
  │   解析 frontmatter              │
  │   重写链接和资源                │
  │   生成 metadata JSON            │
  │                                 ▼
  │                       content/public/
  │                         ├─ notes/*.md
  │                         ├─ courses/*.md
  │                         ├─ gallery/*.md
  │                         ├─ assets/*
  │                         └─ metadata/*.json
  │                                 │
  │                       apps/web ─┘
  │                         Next.js 15 读取 content/public
  │                         渲染为静态页面
  │                                 │
  └─ Vercel ◄───────────────────────┘
      部署 apps/web
```

## 技术栈

- **内容管理**: Obsidian + 自定义插件
- **导出工具**: Node.js (ESM)
- **前端框架**: Next.js 15 (App Router)
- **样式**: Tailwind CSS 4
- **Markdown**: unified + remark + rehype (GFM, Math, KaTeX, Highlight)
- **部署**: Vercel
- **包管理**: pnpm 10 (workspace monorepo)

## 项目结构

```
personal-site/
├── apps/web/                    # Next.js 前端
│   ├── src/app/                 # App Router 页面
│   ├── src/components/          # React 组件
│   ├── src/lib/content/         # 内容适配器
│   └── scripts/                 # 构建脚本 (RSS, assets sync)
├── tools/
│   ├── publisher/               # 内容导出工具
│   ├── obsidian-frontmatter-plugin/  # Obsidian 插件
│   ├── publish-server.js        # HTTP API 服务器
│   └── add-frontmatter.js       # 批量 frontmatter 工具
├── content/public/              # 生成内容 (gitignore)
├── docs/                        # 本文档
├── vercel.json                  # Vercel 部署配置
└── package.json                 # 根 workspace 配置
```
