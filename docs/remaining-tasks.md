# 待办事项

## 必须完成

- [x] **Vercel 登录与项目绑定** — CLI 已登录，已创建并绑定 `personal-site` 项目
- [x] **Vercel 正式部署** — 生产部署已为 `READY`，回退地址可公开访问
- [ ] **自定义域名** — `guyong.site` 与 `www.guyong.site` 已绑定 Vercel，等待 Cloudflare DNS 最终授权与传播验证
- [x] **Obsidian 插件启用** — Frontmatter Helper 1.1.1 已安装并加入启用列表，发布服务可自动启动

## 内容扩充

- [ ] **更多文章** — 在 Obsidian 打开任意 Markdown，运行“发布当前文件到网站”
- [ ] **课程内容** — 目前 `courses/` 为空，可在发布表单中把内容类型设为“课程”
- [ ] **作品集** — 目前 `gallery/` 为空，可在发布表单中把内容类型设为“作品”
- [ ] **社交渠道** — 微信/小红书渠道草稿功能已实现但未使用

## 功能完善

- [ ] **Giscus 评论** — 组件已创建，需在 GitHub Discussions 中配置 Giscus 并更新 repo ID
- [ ] **搜索功能** — 当前无全文搜索
- [ ] **深色模式** — 当前只有浅色主题
- [ ] **封面图** — 多数文章缺少 `cover` 字段
- [ ] **日期字段** — metadata 中 `created`/`updated` 大多为 null
- [x] **RSS 订阅** — 已在空内容和单文件发布流程中验证

## 工具优化

- [x] **publisher 单文件增量发布** — 可发布任意目录中的当前文件，不会清空其他公开内容
- [ ] **publisher 标签过滤** — 支持按 tags 过滤导出范围
- [ ] **Obsidian 插件热重载** — 开发时自动重构建

## CI/CD

- [ ] **GitHub Actions** — 配置自动测试和部署流水线
- [ ] **Vercel Git 集成** — 推送 main 自动部署
