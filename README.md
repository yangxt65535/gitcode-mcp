

> ### ⚠️ AI 生成内容提示
>
> **本项目由 AI 辅助生成**，实际行为可能因实际代码、接口或平台行为存在偏差。请以仓库源码、[GitCode 开放 API 文档](https://docs.gitcode.com/docs/apis/) 及你所在环境的真实行为为准；涉及鉴权、密钥与生产操作时务必自行核实。


# Gitcode MCP Server

基于 Node.js 的 MCP (Model Context Protocol) 服务器，用于 Gitcode 平台的 Issue 和 Pull Request 操作。

## 功能

### gitcode-issue-fixer SKILL

`gitcode-issue-fixer` 是一个 Claude Code Agent Skill，基于本项目的 MCP 能力，支持自动化处理 Gitcode 平台的 Issue 和 Pull Request 相关任务。适用于通过 Claude Code、Cursor 等 AI 工具一键修复和管理项目问题，提高研发协作效率。

### Issue 工具
- `gitcode_list_issues` - 列出仓库的 Issues
- `gitcode_get_issue` - 获取单个 Issue 详情
- `gitcode_create_issue` - 创建新 Issue

### Pull Request 工具
- `gitcode_list_pull_requests` - 列出仓库的 Pull Requests
- `gitcode_get_pull_request` - 获取单个 Pull Request 详情
- `gitcode_create_pull_request` - 创建新 Pull Request

## 安装

### 通过 npm（推荐）

npm 发布后可直接使用，无需 clone 和本地构建：

```bash
claude mcp add gitcode -- npx @yangxt65535/gitcode-mcp -e GITCODE_TOKEN=your_token
```

若 MCP 名称冲突，可先移除再添加：

```bash
claude mcp remove -s user gitcode
claude mcp add gitcode -- npx @yangxt65535/gitcode-mcp -e GITCODE_TOKEN=your_token
```

### 本地开发安装

若已安装 **Node.js**、**Claude Code**，可在仓库根目录执行：

```bash
chmod +x install_claude.sh
./install_claude.sh
```

脚本会依次：
- npm 依赖安装与构建
- 提示输入 `GITCODE_TOKEN`
- 执行 **`claude mcp add -s user …`** 注册为 MCP 服务 `gitcode`
- 复制 `skills/gitcode-issue-fixer/SKILL.md` 到 Claude Code Skill 文件夹，

若 MCP 名称冲突，可先移除再重跑脚本：

```bash
claude mcp remove -s user gitcode
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

前往 **个人设置** - **访问令牌** 中创建，需要保证必备的权限

## 注意事项

API 端点和认证方式可能需要根据 Gitcode 实际 API 文档进行调整。请参考：[https://docs.gitcode.com/docs/apis/](https://docs.gitcode.com/docs/apis/)
