# 发布工作流

## 完整流程

```
1. Obsidian 写作
   └─ 使用插件添加 frontmatter

2. 发布当前文件
   └─ Obsidian 命令“发布当前文件到网站”

3. 本地预览
   └─ pnpm dev:web

4. 部署上线
   └─ vercel --prod 或插件命令
```

## 详细步骤

### Step 1: 在 Obsidian 中写作

在 Obsidian Vault 中编写 Markdown 文章。无需手动添加 frontmatter，使用插件一键添加。

**目录结构对应关系：**

| Obsidian 目录 | area 标签 | type 标签 | 内容类型 |
|---------------|----------|----------|---------|
| 01-研究项目 | area/research | type/reference | note |
| 02-课程学习 | area/course | type/course | course |
| 03-知识库 | area/knowledge | type/reference | note |
| 04-方法论 | area/method | type/method | note |
| 05-社团活动 | area/activity | type/activity | note |
| 06-创作 | area/creative | type/artwork | artwork |
| 07-归档 | area/archive | type/reference | note |
| 08-个人 | area/personal | type/reference | note |

### Step 2: 设置并发布当前文件

**方式 A：使用 Obsidian 插件（推荐）**

1. 打开命令面板 `Ctrl+P`
2. 输入“发布当前文件到网站”
3. 如果发布字段不完整，插件会打开表单，选择标题、内容类型、渠道、摘要和标签
4. 点击“保存并发布”

文件可以位于 Vault 的任意目录，不需要加入 `config.yaml` 的 `include` 列表。

**方式 B：批量脚本**

```bash
node tools/add-frontmatter.js \
  --vault "E:/Mywork/Obsidian Vault" \
  --include "04-方法论/科研交流与方法论"
```

**Frontmatter 模板：**

```yaml
---
title: "文章标题"
publish: true
content_type: note
channels:
  - site
summary: "文章摘要"
tags:
  - area/research
  - type/reference
  - focus/topic
---
```

### Step 3: 命令行发布（可选）

```bash
pnpm publish:file "E:/Mywork/Obsidian Vault/任意目录/文章.md"
```

导出结果在 `content/public/`：
- `notes/*.md` — 笔记
- `courses/*.md` — 课程
- `gallery/*.md` — 作品
- `assets/*` — 图片资源
- `metadata/*.json` — 内容索引

### Step 4: 本地预览

```bash
pnpm dev:web
# 访问 http://localhost:4317
```

### Step 5: 部署

```bash
vercel --prod
```

## Obsidian 插件一键流程

插件会在首次使用时自动启动发布服务器。在 Obsidian 命令面板中：
1. **发布当前文件到网站** — 增量发布当前 Markdown 文件
2. **启动本地预览** — 启动 dev server
3. **部署到 Vercel** — 一键部署

## 可选：按目录全量导出

只有需要批量重建整个网站时，才编辑 `tools/publisher/config.yaml` 的 `include` 列表并运行 `pnpm export:content`。全量导出会重建公开快照；`include` 为空时命令会安全退出，不会清空现有内容。

## 添加批量导出范围

编辑 `tools/publisher/config.yaml`，在 `include` 列表中添加目录：

```yaml
public_scope:
  include:
    - "08-个人/DKU相关"
    - "04-方法论/科研交流与方法论"
    - "01-研究项目/git"
    - "01-研究项目/linux"
    - "01-研究项目/gui agent"
    - "03-知识库/新目录"        # 新增
```

然后为该目录下的文章添加 frontmatter（`publish: true`），重新导出即可。
