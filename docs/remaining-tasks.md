# 当前开发清单

更新于 2026-08-30。详细优先级、依赖与验收见 [development-plan.md](development-plan.md)，
该文件是唯一状态源。

## 已完成：P0-A（2026-08-30）

- [x] 修复 Studio 导入接口并增加 API 集成测试。
- [x] 修复已发布内容编辑、自动保存、slug 改名后发布和删除保护。
- [x] 保证下线回草稿的元数据完整。
- [x] 将自动 Git 同步收紧为干净工作区下的快进拉取，不再自动提交/推送。
- [x] `pnpm verify` 已包含 site-builder、Studio、Legacy publisher、Web 测试，以及 typecheck、
  构建后 smoke、链接和生成快照一致性检查。

## 已完成：P0-B / P1-C / P2-B（2026-08-30）

- [x] 发布/下线失败恢复、精确 Git 暂存、资产冲突保护和故障注入测试。
- [x] Web typecheck、构建后 smoke、公共路由/搜索/Metadata/RSS/Sitemap/结构化数据测试。
- [x] scheduler 状态持久化、坏任务隔离、失败重试和 Studio 状态面板。
- [x] Studio `/healthz` 分层健康报告。
- [x] 桌面启动器的 start/stop/restart/status、PID 所有权、端口健康、日志和重复启动保护。
- [x] `.local-content` 备份/恢复工具与临时目录恢复测试。

## 已完成：P1 / P2 内容与体验实现（2026-08-30）

- [x] Gallery 筛选链接、分类/系列导航、相邻作品、分享卡片与结构化数据。
- [x] 公共页面 canonical/OG、搜索 noindex、稳定 Sitemap 日期和正文图片尺寸。
- [x] 键盘焦点、移动菜单 Escape/外点关闭、skip link、44×44 命中区和 reduced motion 支持。
- [x] site-builder 内容/资产契约、图片上传校验和孤立资产告警。
- [x] 孤立资产安全清理预览与回收策略：Studio 选择、二次确认，服务端双层引用复扫后精确删除。

上述项目的本地浏览器与交互复核已完成；真实 Gallery 内容的线上验收仍未执行，不能在本清单中虚构样本。

## 现场复核（2026-08-30 已完成）

- [x] 桌面启动器 restart/status 通过：4317/4319 均 `Listening=True`、`Owned=True`、`Healthy=True`，
  `/healthz`、PID 和日志检查正常。
- [x] 受控外来 4317 监听演练通过：`ForeignPortBlocked=True`、`HelperPreserved=True`，随后服务 ready；
  未结束非项目进程。
- [x] 临时目录备份恢复演练通过：`BackupFiles=13`、`RestoredNotes=6`、`RestoredGallery=2`，
  manifest 未混入恢复内容，临时目录已清理。

## 外部生产验收（保持未完成）

- [ ] 测试 Note/Gallery 发布 → GitHub Actions → Vercel Ready → 线上 200。
- [ ] 下线 → 第二次部署 → 原 URL 404，并确认本机草稿可恢复。

这组步骤会写入 `content/site`、提交/推送生产分支并改变公开页面，必须先取得用户明确的
生产写入授权。当前不创建真实 Gallery 样本、不声称已完成线上验证。
