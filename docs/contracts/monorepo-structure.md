# Monorepo Structure

```text
apps/web              Next.js 前台与构建脚本
tools/studio          本机内容管理与发布
tools/site-builder    正式内容到公开快照的生成器
tools/publisher       Legacy Obsidian 导出器
.local-content        本机草稿、历史版本和资产（gitignore）
content/site          正式内容唯一维护源（git-tracked）
content/public        自动生成的站点快照
docs                  架构、操作与开发计划
.github/workflows     CI 质量门
```

核心约束：Studio 维护草稿，`content/site` 维护正式内容，Web 只能消费
`content/public`；任何一层都不得绕过相邻边界建立第二数据源。
