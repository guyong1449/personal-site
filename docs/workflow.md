# 发布工作流

## 完整流程

```
1. Obsidian 写作
   └─ 使用插件添加 frontmatter

2. 导出内容
   └─ node tools/publisher 或插件命令

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

### Step 2: 添加 Frontmatter

**方式 A：使用 Obsidian 插件（推荐）**

1. 打开命令面板 `Ctrl+P`
2. 输入 "添加 Frontmatter"
3. 插件自动推断标题、标签、摘要

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

### Step 3: 导出内容

```bash
cd tools/publisher
npm run export -- --config config.yaml
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
# 访问 http://localhost:3000
```

### Step 5: 部署

```bash
vercel --prod
```

## Obsidian 插件一键流程

启动发布服务器后，可在 Obsidian 中完成全部操作：

```bash
# 终端中启动服务器
node tools/publish-server.js
```

然后在 Obsidian 命令面板中：
1. **导出内容到网站** — 触发 publisher
2. **启动本地预览** — 启动 dev server
3. **部署到 Vercel** — 一键部署

## 添加新文章到发布范围

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
