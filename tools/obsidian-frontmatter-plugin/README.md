# Frontmatter Helper - Obsidian 插件

一键添加 frontmatter 到 Obsidian 笔记的插件。

## 功能特性

- ✅ 一键添加 frontmatter
- ✅ 自动推断标题、标签、摘要
- ✅ 自定义 frontmatter 内容
- ✅ 切换发布状态
- ✅ 支持多种内容类型（笔记、课程、作品）
- ✅ 支持多渠道发布（网站、微信、小红书）

## 安装方法

### 方法 1：手动安装

1. 下载插件文件：
   - `manifest.json`
   - `main.js`

2. 在 Obsidian 中打开设置：
   - 设置 → 第三方插件 → 已安装插件 → 打开插件文件夹

3. 创建新文件夹：
   ```
   .obsidian/plugins/frontmatter-helper/
   ```

4. 将下载的文件复制到该文件夹

5. 重启 Obsidian

6. 启用插件：
   - 设置 → 第三方插件 → 找到 "Frontmatter Helper" → 启用

### 方法 2：从 Release 安装

1. 下载最新 release 的 `frontmatter-helper.zip`
2. 解压到 `.obsidian/plugins/frontmatter-helper/`
3. 重启 Obsidian 并启用插件

## 使用方法

### 命令面板

按 `Ctrl+P`（Windows/Linux）或 `Cmd+P`（macOS）打开命令面板，输入：

- **添加 Frontmatter**：快速添加默认 frontmatter
- **添加 Frontmatter (自定义)**：打开自定义对话框
- **切换发布状态**：切换 `publish` 字段的 true/false
- **发布当前文件到网站**：从任意目录增量发布当前 Markdown；字段缺失时打开表单
- **编辑发布设置并发布当前文件**：在可视化表单中修改字段后发布
- **导出内容到网站**：按配置目录全量重建（高级用法）
- **启动本地预览**：在 http://localhost:4317 启动 Next.js 开发服务器
- **部署到 Vercel**：一键部署到 Vercel

发布表单包含可选的 `slug` 字段。留空时会自动生成稳定的 ASCII 网址；需要更易读的网址时可填写英文、数字和连字符。

### 发布工作流

1. 打开任意 Markdown 文件
2. 在 Obsidian 命令面板运行 **发布当前文件到网站**
3. 首次发布时在表单中确认标题、类型、摘要和标签；以后可直接一键发布

插件会自动启动本机发布服务，不需要预先运行命令，也不要求文章位于固定目录。

### 快捷键

可以在设置 → 快捷键中为这些命令分配快捷键：

- 推荐：`Ctrl+Shift+F` 为 "添加 Frontmatter"
- 推荐：`Ctrl+Shift+P` 为 "切换发布状态"

### 侧边栏图标

点击侧边栏的文件图标，快速添加 frontmatter。

## Frontmatter 模板

插件会自动推断以下内容：

```yaml
---
title: "文章标题"  # 从第一个标题或文件名推断
publish: true      # 默认设置
content_type: note # 从目录结构推断
channels:
  - site           # 默认设置
summary: "文章摘要" # 从第一段内容推断
tags:
  - area/research  # 从目录结构推断
  - type/reference # 从目录结构推断
  - focus/pace     # 从子目录推断
---
```

### 目录结构映射

| 目录 | area 标签 | type 标签 |
|------|----------|----------|
| 01-研究项目 | area/research | type/reference |
| 02-课程学习 | area/course | type/course |
| 03-知识库 | area/knowledge | type/reference |
| 04-方法论 | area/method | type/method |
| 05-社团活动 | area/activity | type/activity |
| 06-创作 | area/creative | type/artwork |
| 07-归档 | area/archive | type/reference |
| 08-个人 | area/personal | type/reference |

## 设置选项

在设置 → Frontmatter Helper 中可以配置：

- **默认发布状态**：新文章的默认 publish 值
- **默认内容类型**：新文章的默认 content_type
- **默认发布渠道**：新文章的默认 channels
- **自动推断标签**：是否根据路径自动推断 tags
- **自动推断摘要**：是否根据内容自动推断 summary
- **摘要最大长度**：自动推断摘要的最大字符数
- **网站项目目录**：本网站仓库所在位置，默认 `E:/Mywork/algorithm/personal-site`
- **Node 程序位置**：用于自动启动本机发布服务，默认 `C:/Program Files/nodejs/node.exe`
- **服务器地址**：默认 `http://127.0.0.1:4318`

## 发布流程

1. 在 Obsidian 中编写文章
2. 运行 **发布当前文件到网站**，在可视化表单中确认发布信息
3. 运行 **启动本地预览** 查看网站
4. 内容确认后运行 **部署到 Vercel**

## 常见问题

### Q: 如何批量添加 frontmatter？

A: 使用命令行脚本：
```bash
cd tools
node add-frontmatter.js --vault "E:/Mywork/Obsidian Vault" --include "04-方法论"
```

### Q: 如何修改已有的 frontmatter？

A: 手动编辑文件开头的 YAML 块，或使用 "切换发布状态" 命令快速修改 publish 字段。

### Q: 插件会修改我的文件内容吗？

A: 只会在文件开头添加 frontmatter 块，不会修改正文内容。

### Q: 如何自定义标签映射？

A: 目前需要修改插件代码中的 `CATEGORY_MAP` 对象。未来版本会支持配置文件。

## 开发

### 本地开发

1. 克隆仓库
2. 安装依赖：`npm install`
3. 构建：`npm run build`
4. 复制到 Obsidian 插件目录测试

### 构建生产版本

```bash
npm run build
```

生成的文件在 `dist/` 目录。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2026-05-27)

- 初始版本
- 一键添加 frontmatter
- 自动推断标题、标签、摘要
- 自定义 frontmatter 对话框
- 切换发布状态命令
- 侧边栏图标
- 设置页面
