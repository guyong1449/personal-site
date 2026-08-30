# Personal Site 文档

个人网站项目文档。当前架构：**Studio → content/site → site-builder →
content/public → Next.js → Vercel**。

> 旧架构（Obsidian → Publisher → Astro/Next）相关章节标注为 Legacy，
> 描述以根目录 [README](../README.md) 与 [agent.md](../agent.md) 为准。

## 文档目录

| 文档 | 说明 |
|------|------|
| [发布工作流](workflow.md) | Studio 写作、发布、下线、删除的完整流程（当前主文档） |
| [快速开始](getting-started.md) | 环境准备、安装、首次运行 |
| [部署指南](deployment.md) | Vercel 部署配置与自定义域名 |
| [后续开发计划](development-plan.md) | 当前基线、分阶段目标与验收标准 |
| [待办事项](remaining-tasks.md) | 面向内容与外部配置的短清单 |
| [工具详解](tools.md) | Studio / site-builder；publisher 相关内容为 Legacy |
| [月度维护清单](maintenance.md) | 备份恢复、scheduler、health、桌面入口、CI 与 Vercel 复核 |
| [Obsidian 插件](obsidian-plugin.md) | Legacy：Frontmatter Helper 插件（已被 Studio 取代） |

## 架构概览

```
.local-content（本机草稿，gitignore）
  │
  ├─ Studio 发布流程
  │    校验 → 写入 content/site → site-builder 重建 content/public
  │    → 测试与构建检查 → 定向暂存 → content: publish <slug> → 推送
  │                          │
  │                          ▼
  │                 content/public（生成快照）
  │                          │
  └─ apps/web（Next.js）─────┘
           │
           ▼
        Vercel 部署
```

`content/site` 是正式内容唯一维护源（进 Git）；`content/public` 为自动生成；
`.local-content` 为本机草稿（gitignore）。CI（`.github/workflows/ci.yml`）
在推送与 PR 上执行仓库统一验证命令 `pnpm verify`，并执行高危级别依赖审计。
