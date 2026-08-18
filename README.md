

> ### ⚠️ AI 生成内容提示
>
> **本项目由 AI 辅助生成**，实际行为可能因实际代码、接口或平台行为存在偏差。请以仓库源码、[GitCode 开放 API 文档](https://docs.gitcode.com/docs/apis/) 及你所在环境的真实行为为准；涉及鉴权、密钥与生产操作时务必自行核实。


# Gitcode MCP Server

基于 Node.js 的 MCP (Model Context Protocol) 服务器，用于 Gitcode 平台的 Issue 和 Pull Request 操作。

仓库：[https://github.com/yangxt65535/gitcode-mcp](https://github.com/yangxt65535/gitcode-mcp)

## 工具列表
- `gitcode_list_issues` - 列出仓库的 Issues
- `gitcode_get_issue` - 获取单个 Issue 详情
- `gitcode_create_issue` - 创建新 Issue
- `gitcode_update_issue` - 更新 Issue 信息
- `gitcode_create_issue_comment` - 在 Issue 中添加评论
- `gitcode_list_issue_comments` - 获取 Issue 的所有评论
- `gitcode_list_pull_requests` - 列出仓库的 Pull Requests
- `gitcode_get_pull_request` - 获取单个 Pull Request 详情
- `gitcode_create_pull_request` - 创建新 Pull Request
- `gitcode_update_pull_request` - 更新 Pull Request 信息
- `gitcode_create_pull_request_comment` - 在 Pull Request 中添加评论
- `gitcode_list_pull_request_comments` - 获取 Pull Request 的所有评论
- `gitcode_get_current_user` - 获取当前 token 对应的用户信息

### Issue 属性增强（e2e 提单工作流）
- `gitcode_list_milestones` - 获取仓库所有里程碑（返回 `number` + `title`，number 用于更新 Issue 的 `milestone` 字段）
- `gitcode_list_kanbans` - 获取企业/组织看板列表（返回 `id` + `name`，id 用于 `gitcode_add_to_kanban` 的 `kanban_id`）
- `gitcode_add_to_kanban` - 添加 Issue/PR 到看板（更新 Issue 关联看板）。参数：`owner`、`kanban_id`、`repo`（仓库 path 名称）、`issue_iids`（Issue iid 数组）或 `pr_iids`（PR iid 数组）

### `gitcode_update_issue` 支持的企业版属性（本地白名单校验）

| 参数 | 可选值 | 说明 |
|---|---|---|
| `issue_severity` | `无优先级` / `不重要` / `次要` / `主要` / `严重` | Issue 优先级（企业版） |
| `issue_type` | `缺陷/Bug` / `任务/Task` / `需求/Requirement` / `测试用例/Test Cases` / `CVE和安全问题/CVE` | Issue 类型（企业版），传入名称字符串，非 id |

> **约束**：`issue_type` 不能与 `issue_severity`（优先级）或 `status`（状态）**同时设置**，否则本地校验会直接报错，需分多次请求。
>
> **注意**：单独修改 `issue_type` 会**清空 issue 的 milestone**，改完类型后需重新设置 milestone。

### 输出精简
Issue / PR 的 list、get、评论列举接口均做了**输出精简**，仅返回核心字段（如 number、title、state、type、priority、milestone、url 等），去除冗余/低频字段（user.name、labels 颜色、时间戳、reviewer 等），以降低 LLM 上下文占用。

## 安装

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `GITCODE_TOKEN` | 是 | Gitcode API access_token |
| `GITCODE_API_URL` | 否 | API 基础 URL，默认为 `https://api.gitcode.com/api/v5` |


Gitcode API 使用 `access_token` 作为 Query 参数进行认证：
```
GET /repos/:owner/:repo/issues/:number?access_token=YOUR_TOKEN
```

前往 **个人设置** - **访问令牌** 中创建，确保 token 有必备的权限

### 添加 MCP

项目已发布到 npm，可直接 npx 使用，无需 clone 和本地构建。具体添加方式参阅各 AI 工具文档。


```bash
# claude code
claude mcp add gitcode-mcp --env GITCODE_TOKEN=your_token -- npx @yangxt65535/gitcode-mcp
```

```json
"gitcode-mcp": {
    "type": "stdio",
    "command": "npx",
    "args": [
        "@yangxt65535/gitcode-mcp"
    ],
    "env": {
        "GITCODE_TOKEN": "your_token"
    }
}

```

## 配置

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `GITCODE_TOKEN` | 是 | Gitcode API access_token |
| `GITCODE_API_URL` | 否 | API 基础 URL，默认为 `https://api.gitcode.com/api/v5` |

### API 认证

Gitcode API 使用 `access_token` 作为 Query 参数进行认证：
```
GET /repos/:owner/:repo/issues/:number?access_token=YOUR_TOKEN
```

前往 **个人设置** - **访问令牌** 中创建，确保 token 有必备的权限

## 发布

本包默认公开发布到 npm（`@yangxt65535/gitcode-mcp`）。推送符合 `v*` 的 git tag 后，GitHub Actions 会通过 npm Trusted Publishing（OIDC）自动执行 `npm publish`。

本地发版示例：

```bash
npm version patch   # 或 minor / major
git push origin master --follow-tags
```

首次启用前，请在 [npmjs](https://www.npmjs.com/) 包设置中添加 Trusted Publisher：

- Publisher: GitHub Actions
- Repository: `yangxt65535/gitcode-mcp`
- Workflow: `publish.yml`

## 注意事项

API 端点和认证方式可能需要根据 Gitcode 实际 API 文档进行调整。请参考：[https://docs.gitcode.com/docs/apis/](https://docs.gitcode.com/docs/apis/)
