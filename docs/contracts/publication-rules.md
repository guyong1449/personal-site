# Publication Rules

## 发布前校验

- kind、`content_type`、slug 与目标目录一致；
- 标题和正文非空；
- 标签合法且不重复；
- 引用的本地资产存在；
- Markdown 不依赖原始 HTML。

## 发布事务

1. 从 `.local-content` 读取草稿并复制需要的资产；
2. 写入 `content/site`；
3. 重建 `content/public`；
4. 运行 site-builder 测试、web lint/vitest、链接检查和 Next.js 构建；
5. 只暂存允许的内容路径，提交并推送当前分支。

失败时保留本机草稿和可检查的本地正式稿，不自动扩大 Git 暂存范围。

## 下线与删除

- 下线前先把正式稿复制回本机草稿并回读验证，再移除正式稿。
- 永久删除只允许作用于草稿，必须输入标题确认；仅回收没有被其他内容引用的资产。
