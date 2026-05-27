# 待办事项

## 必须完成

- [ ] **Vercel 登录与部署** — 需要手动执行 `vercel login` 完成认证，然后 `vercel --prod` 首次部署
- [ ] **Obsidian 插件启用** — 手动在 Obsidian 中启用 Frontmatter Helper 插件

## 内容扩充

- [ ] **更多文章** — 在 `config.yaml` 中添加更多 Vault 目录，为文章添加 frontmatter
- [ ] **课程内容** — 目前 `courses/` 为空，可从 `02-课程学习` 导出
- [ ] **作品集** — 目前 `gallery/` 为空，可从 `06-创作` 导出
- [ ] **社交渠道** — 微信/小红书渠道草稿功能已实现但未使用

## 功能完善

- [ ] **Giscus 评论** — 组件已创建，需在 GitHub Discussions 中配置 Giscus 并更新 repo ID
- [ ] **搜索功能** — 当前无全文搜索
- [ ] **深色模式** — 当前只有浅色主题
- [ ] **封面图** — 多数文章缺少 `cover` 字段
- [ ] **日期字段** — metadata 中 `created`/`updated` 大多为 null
- [ ] **RSS 订阅** — 脚本已就绪，需在 build 流程中验证

## 工具优化

- [ ] **publisher 增量导出** — 当前每次全量清除重导出，可改为增量
- [ ] **publisher 标签过滤** — 支持按 tags 过滤导出范围
- [ ] **Obsidian 插件热重载** — 开发时自动重构建

## CI/CD

- [ ] **GitHub Actions** — 配置自动测试和部署流水线
- [ ] **Vercel Git 集成** — 推送 main 自动部署
