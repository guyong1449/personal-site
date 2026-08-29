# Obsidian 插件 — Frontmatter Helper

> Legacy 文档：插件保留作旧内容迁移参考，当前写作与发布入口是本机 Studio。

## 安装

```bash
# 构建插件
cd tools/obsidian-frontmatter-plugin
npm install
npm run build

# 复制到 Obsidian
cp dist/main.js dist/manifest.json \
  "<Vault 路径>/.obsidian/plugins/frontmatter-helper/"
```

在 Obsidian 中：设置 → 第三方插件 → 启用 "Frontmatter Helper"。

## 命令

| 命令 | 快捷键建议 | 说明 |
|------|-----------|------|
| 添加 Frontmatter | `Ctrl+Shift+F` | 自动推断并添加 |
| 添加 Frontmatter (自定义) | — | 打开自定义对话框 |
| 切换发布状态 | `Ctrl+Shift+P` | 切换 publish true/false |
| 发布当前文件到网站 | `Ctrl+Shift+S` | 从任意目录增量发布当前 Markdown；字段缺失时打开表单 |
| 编辑发布设置并发布当前文件 | — | 始终打开表单，保存后发布 |
| 导出内容到网站 | — | 按配置目录全量重建（高级用法） |
| 启动本地预览 | — | 启动 Next.js dev server |
| 部署到 Vercel | — | 一键部署 |

## 自动推断规则

### 标题

1. 从第一个 `# 标题` 提取
2. 若无标题，使用文件名（去掉 `.md`）

### 标签

根据目录结构自动推断：

```
01-研究项目/git/Git教程.md
→ tags: [area/research, type/reference, focus/git]
```

### 摘要

取正文第一段非空、非标题文本，截断到 100 字符。

### 内容类型

| 目录关键词 | content_type |
|-----------|-------------|
| notes | note |
| courses | course |
| gallery | artwork |

## 设置

在 设置 → Frontmatter Helper 中配置：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 默认发布状态 | 新文章的 publish 值 | true |
| 默认内容类型 | 新文章的 content_type | note |
| 默认发布渠道 | 新文章的 channels | ["site"] |
| 自动推断标签 | 根据路径推断 tags | true |
| 自动推断摘要 | 根据内容推断 summary | true |
| 摘要最大长度 | 自动摘要字符上限 | 100 |
| 网站项目目录 | 本网站仓库位置 | E:/Mywork/algorithm/personal-site |
| Node 程序位置 | 自动启动服务使用的 node.exe | C:/Program Files/nodejs/node.exe |
| 服务器地址 | Publish Server URL | http://127.0.0.1:4318 |

## 发布命令说明

首次运行发布、预览或部署命令时，插件会自动启动 **Publish Server**。如果仓库或 Node 的位置发生变化，在插件设置中更新对应路径即可。

## 自定义 Frontmatter 对话框

使用 "添加 Frontmatter (自定义)" 命令时，弹出对话框可编辑：

- 标题
- 网址标识 slug（可选；中文标题留空时会自动生成稳定网址）
- 发布状态（开关）
- 内容类型（下拉）
- 发布渠道（复选框）
- 摘要
- 标签（逗号分隔）
