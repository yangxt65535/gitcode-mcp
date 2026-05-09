# Gitcode MCP Server — 设计与实现计划

## 1. 项目背景

### 1.1 问题陈述

Gitcode 缺少 AI 原生的访问方式。当前主流代码托管平台中，GitHub 已通过官方 MCP Server（`@modelcontextprotocol/server-github`）为 AI 编码助手提供了开箱即用的工具接口，使 AI 助手可以直接创建 Issue、提交 PR、搜索代码等。而 Gitcode 平台虽然在 REST API 层面支持同类操作，但缺乏面向 AI 场景的封装——开发者无法像使用 GitHub MCP 那样，让 AI 助手通过标准化协议直接与 Gitcode 仓库交互。

**GitHub MCP 对比：**

| 维度 | GitHub MCP | Gitcode（当前状态） |
|---|---|---|
| MCP 服务 | 官方维护 `@modelcontextprotocol/server-github` | 无 |
| AI 交互方式 | 自然语言 → MCP Tool → GitHub API | 人工手动操作 Web UI 或手动调用 REST API |
| 典型 AI 场景 | "帮我创建一个 Issue" / "Review 这个 PR" | 不支持，需人工中转 |
| 工具覆盖 | Issue、PR、仓库、搜索、文件内容、分支等 | 仅原始 REST API |
| 部署方式 | npx / Docker 一键启动 | — |

因此需要构建一个面向 Gitcode 平台的 MCP Server，将 Gitcode REST API 封装为 AI 可调用的标准化工具，填补 Gitcode 生态在 AI 原生访问能力上的空白。

### 1.2 目标

构建一个遵循 MCP（Model Context Protocol）规范的服务端程序，将 Gitcode 开放 API 封装为标准化的 MCP Tool，使 AI 助手可以直接：

- 查询、创建 Issue 并发表评论
- 查询、创建 Pull Request 并发表评论

提供可扩展性预留，可在后续版本中按需添加其他 Gitcode 平台的功能。

---

## 2. 整体架构

### 2.1 架构概览

```
┌──────────────┐     stdio/JSON-RPC      ┌──────────────────┐     HTTPS/REST      ┌─────────────────┐
│  AI 助手      │ ◄──────────────────────► │  Gitcode MCP      │ ◄─────────────────► │  Gitcode API     │
│ (Claude etc.) │                          │  Server (Node.js) │                    │  (api.gitcode.com)│
└──────────────┘                          └──────────────────┘                    └─────────────────┘
```

### 2.2 分层架构

```
src/
├── index.ts              ← 入口：初始化 MCP Server，注册 Tools
├── client.ts             ← API 客户端层：封装 Gitcode REST API 调用
├── types.d.ts            ← 类型定义层：接口、参数、响应类型
└── tools/
    ├── issues.ts         ← Issue 相关 Tool 注册
    └── pullRequests.ts   ← Pull Request 相关 Tool 注册
```

**分层职责：**

| 层 | 文件 | 职责 |
|---|---|---|
| 入口/编排 | `index.ts` | 加载环境变量、初始化 client、创建 MCP Server、注册所有 Tool、启动 stdio transport |
| API 客户端 | `client.ts` | 封装 axios 实例、Token 鉴权注入、错误拦截、API 响应归一化 |
| 类型定义 | `types.d.ts` | 定义 API 响应实体（Issue/PR/Comment 等）和请求参数的类型 |
| Tool 注册 | `tools/*.ts` | 为每个 MCP Tool 定义 Zod schema、实现 handler 逻辑、格式化输出 |

---

## 3. 技术选型

| 层面 | 选择 | 理由 |
|---|---|---|
| 运行时 | Node.js (≥18) | MCP SDK 原生支持，生态成熟 |
| 语言 | TypeScript (≥5.4) | 类型安全，与 Zod schema 配合形成端到端的类型约束 |
| 模块系统 | ESM (`"type": "module"`) | MCP SDK 以 ESM 优先交付 |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.0 | 官方 SDK，提供 McpServer、StdioServerTransport 等基础组件 |
| HTTP 客户端 | `axios` ^1.7 | 拦截器机制天然适合 Token 注入和统一错误处理 |
| 参数校验 | `zod` ^3.23 | 与 MCP SDK 的 `inputSchema` 无缝集成，自动生成 Tool 参数描述 |
| 环境变量 | `dotenv` | 开发阶段从 `.env` 加载 `GITCODE_TOKEN` |
| 构建 | `tsc`（TypeScript Compiler） | 零配置，满足 Node.js 后端项目的构建需求 |

---

## 4. 核心模块设计

### 4.1 API 客户端（`GitcodeClient`）

**鉴权方式：** Gitcode API 要求 `access_token` 作为 URL Query 参数传递，而非 Header。客户端通过私有方法 `withToken()` 将 token 注入到每次请求的 `params` 中。

**错误处理：** 通过 axios 响应拦截器统一捕获 HTTP 错误，将状态码和响应体打包为 `Error` 抛出，上游 Tool handler 统一 catch。

**PR 响应归一化：** Gitcode 的 `POST /pulls`（创建）和 `GET /pulls/:id`（查询）返回的字段结构存在差异——创建接口返回 GitLab 风格字段（`source_branch`、`target_branch`、`author`），查询接口返回 `head`/`base` 对象。客户端通过 `normalizePullRequestResponse()` 将两种格式统一为 `head.ref` / `base.ref` 的标准结构，确保上层调用方无需感知差异。

**配置：**
- `GITCODE_TOKEN`（必需）：API 访问令牌
- `GITCODE_API_URL`（可选）：默认为 `https://api.gitcode.com/api/v5`，支持私有化部署覆盖

### 4.2 MCP Server 入口（`index.ts`）

1. 加载 `.env` 文件
2. 校验 `GITCODE_TOKEN` 是否存在，缺失则报错退出
3. 创建 `GitcodeClient` 实例
4. 创建 `McpServer` 实例（含 name、version、description 元信息）
5. 调用各 Tool 注册函数
6. 注册 `gitcode://server/info` 资源，对外暴露工具列表和 API 地址
7. 通过 `StdioServerTransport` 启动服务

### 4.3 Tool 注册模块

每个 Tool 遵循统一模式：
1. 使用 `server.registerTool(name, config, handler)` 注册
2. `config.inputSchema` 使用 Zod 定义参数类型、必填/可选、描述文本
3. `handler` 调用 client 方法，将结果裁剪为对 LLM 友好的精简 JSON 输出
4. 异常统一捕获，返回 `isError: true` 的结构化错误信息

---

## 5. 工具规划（v1）

### 5.1 Issue 工具

| 工具名 | 功能 | API 端点 |
|---|---|---|
| `gitcode_list_issues` | 列出仓库 Issue，支持 state/page/per_page 筛选 | `GET /repos/:owner/:repo/issues` |
| `gitcode_get_issue` | 获取单个 Issue 详情 | `GET /repos/:owner/:repo/issues/:number` |
| `gitcode_create_issue` | 创建新 Issue | `POST /repos/:owner/:repo/issues` |
| `gitcode_create_issue_comment` | 在 Issue 下添加评论 | `POST /repos/:owner/:repo/issues/:number/comments` |
| `gitcode_list_issue_comments` | 获取 Issue 的全部评论（预留 v1.1） | `GET /repos/:owner/:repo/issues/:number/comments` |

> **可扩展性预留：** `list_issue_comments` 在 v1 阶段实现为可选工具；后续可按相同模式添加 Issue 更新、关闭、标签管理等操作。

### 5.2 Pull Request 工具

| 工具名 | 功能 | API 端点 |
|---|---|---|
| `gitcode_list_pull_requests` | 列出仓库 PR，支持 state/sort/page 筛选 | `GET /repos/:owner/:repo/pulls` |
| `gitcode_get_pull_request` | 获取单个 PR 详情（含 head/base、审查人、测试人、合并状态） | `GET /repos/:owner/:repo/pulls/:number` |
| `gitcode_create_pull_request` | 创建新 PR，支持跨仓、草稿、Squash、审查人/测试人分配 | `POST /repos/:owner/:repo/pulls` |
| `gitcode_create_pull_request_comment` | 在 PR 上添加评论（支持普通评论和代码行评论） | `POST /repos/:owner/:repo/pulls/:number/comments` |
| `gitcode_list_pull_request_comments` | 获取 PR 全部评论（预留 v1.1） | `GET /repos/:owner/:repo/pulls/:number/comments` |

> **可扩展性预留：** PR 合并、关闭、审查操作（approve/request changes）作为 v1.1+ 候选。评论列表工具与 Issue 评论列表共享相同的设计模式，可快速实现。

### 5.3 预留扩展方向

以下功能模块在设计上已预留空间，可在后续版本中按需启用：

| 模块 | 描述 | 优先级 |
|---|---|---|
| Repository 管理 | 查询仓库信息、搜索仓库、列出组织仓库 | P2 |
| Branch 操作 | 列出分支、获取分支详情、创建/删除分支 | P2 |
| Webhook 管理 | CRUD Webhook 配置 | P3 |
| 文件内容 | 读取文件内容、获取目录树 | P3 |
| CI/CD 集成 | 触发流水线、查询构建状态 | P3 |
| 用户/组织 | 查询用户信息、组织成员 | P3 |

新增模块的集成路径：在 `src/tools/` 下新增对应文件 → 实现 `register*Tools()` 函数 → 在 `index.ts` 中调用注册。`client.ts` 中按需新增 API 方法，复用现有的 `withToken()` 鉴权和错误拦截机制。

---

## 6. 类型体系设计

### 6.1 设计原则

- **忠实映射 API 响应：** 类型定义与 Gitcode API 文档的实际字段对齐，不臆造字段
- **参数与实体分离：** 请求参数（`*Params`）与响应实体（`Gitcode*`）独立定义
- **可选字段标注：** 根据 API 实际返回情况标注 `?`，避免必填假设导致运行时错误

### 6.2 核心实体

```
GitcodeIssue        — Issue 实体（含 user, labels, milestone, custom_fields 等嵌套）
GitcodePullRequest  — PR 实体（含 head/base branch, assignees, testers, mergeable_state 等）
GitcodeUser         — 用户实体（id, login, name, avatar_url）
GitcodeIssueComment — Issue 评论
GitcodePullRequestComment — PR 评论（含 diff 位置和 reply 线程）
```

---

## 7. 错误处理策略

三层递进：

| 层 | 策略 |
|---|---|
| Client 拦截器 | 捕获 4xx/5xx → 包装为 `Error`（含状态码和响应体） |
| Tool handler | try/catch → 返回 `{ content, isError: true }` 结构，错误信息对 LLM 可读 |
| Server 启动 | `GITCODE_TOKEN` 缺失 → `process.exit(1)` 并输出提示信息 |

原则：永远不因单个 Tool 调用失败而崩溃整个 MCP Server。

---

## 8. 构建与发布

### 8.1 构建流程

```
npm run clean   (rimraf dist)
npm run build   (tsc 编译 src/ → dist/)
```

TypeScript 编译配置：
- Target: ES2022
- Module: NodeNext
- rootDir: `src/`，outDir: `dist/`
- 不生成 declaration（declaration: false）

### 8.2 npm 发布

- 包名：`@yangxt65535/gitcode-mcp`
- `bin` 入口：`dist/index.js`
- `files` 仅包含 `dist/` 和 `README.md`
- `prepublishOnly` 钩子自动执行 `npm run build`

### 8.3 使用方式

```bash
# Claude Code
claude mcp add gitcode-mcp --env GITCODE_TOKEN=<token> -- npx @yangxt65535/gitcode-mcp
```

```json
// 通用 MCP 配置
{
  "gitcode-mcp": {
    "type": "stdio",
    "command": "npx",
    "args": ["@yangxt65535/gitcode-mcp"],
    "env": {
      "GITCODE_TOKEN": "<your_token>"
    }
  }
}
```

## 9. 设计决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| MCP Transport | stdio | MCP 客户端（Claude Code 等）通过 stdin/stdout 启动和通信，比 HTTP/SSE 模式部署更简单 |
| 鉴权注入位置 | URL Query (`access_token`) | Gitcode API 设计如此，非 Header Bearer 模式 |
| 输出格式 | 精简 JSON（仅关键字段） | LLM 上下文窗口有限，全量 API 响应会浪费 token |
| 工具粒度 | 细粒度单功能 Tool | 符合 MCP 设计哲学，LLM 可按需选择和组合调用 |
| 模块组织 | 按领域拆分 (`tools/issues.ts`, `tools/pullRequests.ts`) | 便于后续添加新领域（repositories、branches 等）时保持结构清晰 |
| 无单元测试（v1） | 依赖集成验证 | v1 阶段工具数量少，优先快速迭代；测试可在工具集稳定后补充 |

---

## 10. 安全与运维

- **Token 安全：** `GITCODE_TOKEN` 仅通过环境变量注入，不写入配置文件、不进入 git 版本控制。`.env` 已加入 `.gitignore`，仅保留 `.env.example` 模板文件。
- **错误信息脱敏：** Tool 返回的错误信息仅包含 HTTP 状态码和 API 错误描述，不泄露 Token 或请求完整路径。
- **最小权限原则：** 建议用户创建 Token 时仅授予该 MCP Server 所需的最小权限范围（Issue/PR 读写）。
- **版本策略：** 遵循语义化版本，MCP Tool 名称和参数 schema 的变更视为 breaking change，需升级主版本号。
