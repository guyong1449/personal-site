# 待办事项

更新于 2026-08-29。信息架构改版、Note 内容模型统一、内容分层、本机 Studio、
自动发布/下线/删除、全文搜索、深色模式、封面与铅雪青视觉均已完成。

## 内容扩充

- [ ] **更多文章** — 在本机 Studio（http://127.0.0.1:4319/studio）写作并发布
- [ ] **正式画作** — 目前首页与画廊仍为几何占位；Studio 上传封面后即可替换
- [ ] **日期字段** — 新内容请在 Studio 中填写 created/updated

## 功能完善

- [ ] **Giscus 评论** — 组件已就绪，配置 4 个 `NEXT_PUBLIC_GISCUS_*` 环境变量后自动挂载
- [ ] **Vercel Git 集成** — 若未连接，推送 main 不会自动部署；可继续用 `vercel --prod`

## 工具

- [ ] **publisher 归档** — 旧 Obsidian 导出管线已被 Studio 取代，暂保留备查
- [ ] **CI（GitHub Actions）** — 推送时自动跑 lint/test/build
