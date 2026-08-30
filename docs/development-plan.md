# 全量开发推进计划

更新于 2026-08-30。本文件只记录尚未完成、需要外部验证或需要上线验收的事项；
已经落地的功能写入对应架构/工作流文档，不继续堆在待办列表里。

## 当前基线

- Studio 是唯一主写作入口，支持自动保存、历史版本、定时发布、图片压缩、
  正文插图、置顶、Gallery 分类/系列、发布、下线和删除。
- `content/site` 是正式内容唯一维护源；`site-builder` 生成
  `content/public`，Next.js 构建只消费生成快照。
- 前台已有文章、画廊、归档、搜索、标签过滤、相关文章、相邻文章、RSS、
  Sitemap、结构化数据、动态 Open Graph 图和可选 Giscus。
- 原始 HTML 不属于内容契约；Studio 预览和正式站点都只渲染标准 Markdown。
- GitHub Actions 负责质量检查，Vercel 负责部署。

## 当前外部状态

- GitHub CLI 已登录 `guyong1449`，仓库远端为
  `https://github.com/guyong1449/personal-site.git`。
- Vercel CLI 已登录 `amy244808-5607`，本机已关联
  `guyongs-projects-f59a7a4c/personal-site`，Root Directory 为 `apps/web`。
- `guyong.site`、`/notes`、`/gallery`、`/account` 当前可访问；生产环境
  `/studio` 返回 404，符合本机 Studio 的安全边界。
- Vercel 项目的 Git 连接仍为空，现有生产部署是手动部署；需要在 Dashboard
  连接 GitHub 仓库并指定 `main` 为 Production Branch。
- GitHub Actions 最近的失败发生在依赖安装前：工作流和 `packageManager`
  同时声明 pnpm 版本。本计划第一批先修复并重新验证。
- 2026-08-30 已将前台 / Studio 视觉改动和 CI 修复分批推送；提交
  `2f9196e` 的 GitHub Actions 全量检查通过。

## P0：恢复质量门与上线闭环

- [x] 确认 GitHub 与 Vercel 账号登录、本机项目关联和生产域名可访问。
- [x] 修复 GitHub Actions 的 pnpm 重复版本配置，本机运行 `pnpm verify`。
- [x] 将现有改动按“CI / 前台视觉 / Studio 视觉与交互”拆分检查并提交。
- [x] 推送后确认 GitHub Actions 全绿，通过的提交为 `2f9196e`。
- [ ] 在 Vercel Dashboard 连接 GitHub 仓库，确认 `main` 自动部署真实可用。
- [ ] 用一篇测试 Note 完成“发布 → Git 推送 → Vercel Ready → 线上访问 →
  下线 → 再次部署 → 线上 404”验收。
- [ ] 决定是否启用 Giscus；若启用，配置四个 `NEXT_PUBLIC_GISCUS_*` 变量。
- [ ] 发布至少一篇正式 Note 和一件正式 Gallery，替换空状态/占位内容。

验收：本机全量检查通过；GitHub Actions 对同一提交通过；Vercel 部署来源能显示
GitHub 提交；Studio 能显示最新部署状态；下线后线上内容不可访问；任一阶段失败时
本机草稿仍可恢复。

## P1：Gallery 与分享体验

- [ ] 为 Gallery 补齐 Open Graph 图片和结构化数据。
- [ ] Gallery 标签改为可筛选链接，并增加同系列/同分类导航。
- [ ] 验证移动端画廊大图、长图和无封面条目的展示。

验收：分享 Gallery 链接有正确卡片；分类、系列和标签均可完成站内导航。

## P2：运营与可靠性

- [ ] 为定时发布增加“Studio 未运行时不会触发”的醒目标识和逾期任务检查。
- [ ] 增加线上冒烟检查：主页、RSS、Sitemap、最新文章和静态资源。
- [ ] 根据实际内容量决定是否增加隐私友好的访问统计；没有明确用途前不接入。
- [ ] 定期验证依赖安全、死链、图片引用和构建可复现性。

验收：部署异常、坏链和逾期定时任务都能被明确发现，不依赖人工猜测。

## P3：内容运营与长期维护

- [ ] 建立正式 Note / Gallery 的发布检查清单：标题、摘要、slug、标签、封面、
  正文图片、移动端和分享卡片。
- [ ] 建立每月维护清单：依赖更新、安全审计、死链、图片引用、域名与证书、
  GitHub Actions、Vercel 构建和内容备份恢复演练。
- [ ] 内容量达到需要统计的程度后，再选择隐私友好的访问统计方案。
- [ ] 只有在明确需要远程写作或多人协作后，才评估远程 CMS、账号与权限系统。

验收：新内容不依赖开发者记忆即可发布；维护检查有明确频率、结果和失败处理方式。

## 推荐执行顺序

1. 本机修复 CI 配置并完成 `pnpm verify`。
2. 审查当前 8 个本地提交和未提交改动，按批次提交，不执行宽范围暂存。
3. 推送 `main`，等待 GitHub Actions 通过；失败则只修复失败层。
4. 在 Vercel Dashboard 连接 GitHub，并用一次受控推送验证自动部署。
5. 完成测试 Note 的发布/下线闭环，再进入 Gallery 分享体验开发。
6. 补充线上冒烟检查和定时发布逾期提示，最后发布正式内容。

## 外部操作边界

- 登录状态检查和公开页面检查可直接执行。
- 连接 GitHub、推送、生产部署、配置环境变量以及发布/下线测试内容会改变外部状态，
  执行前需明确本批目标；永久删除仍需单独确认。
- 所有 Git 提交只暂存本批相关路径，禁止 `git add .` 和 `git add -A`。

## 暂不开发

- 数据库、远程 CMS、多人账号和权限系统。
- 单独恢复 Course 内容类型；课程内容继续使用 `course/*` 标签归入 Note。
- MDX 或原始 HTML 支持。
- 在没有内容规模证据前引入外部搜索服务。
