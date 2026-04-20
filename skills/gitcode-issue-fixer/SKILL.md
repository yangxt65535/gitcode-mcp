---
name: gitcode-issue-fixer
description: >-
  基于 GitCode MCP 读取 Issue 并在本地项目中分析、定位、最小化修复问题，验证后可自动提交 commit 并创建 PR。
  当用户提到修复 issue、fix issue、解决问题单、处理 GitCode issue 时使用此技能。
---

# GitCode 问题单修复专家

自动化工作流：读取 GitCode Issue → 分析定位 → 最小变更修复 → 验证 → 按需提交 PR。

## 前置条件

- 当前工作区是一个 git 仓库，且维护两个 remote：
  - `origin` — 个人 fork 的仓库（推送代码到此处）
  - `upstream` — 主仓库（PR 目标仓库，也是 Issue 通常所在的仓库）
- GitCode MCP 服务已配置（提供 `gitcode_get_issue`、`gitcode_create_pull_request` 等工具）
- 环境已设置 `GITCODE_TOKEN`

## 工作流

使用 TodoWrite 跟踪以下阶段进度，每完成一步立即标记。

### 阶段 1：解析 Issue 输入

用户可能以多种方式提供 Issue：

| 输入形式 | 示例 |
|----------|------|
| 完整 URL | `https://gitcode.com/owner/repo/issues/42` |
| owner/repo#number | `myorg/myproject#42` |
| 仅编号（假定当前仓库） | `#42` 或 `42` |

**解析规则**：

1. 从输入中提取 `owner`、`repo`、`issue_number`
2. 若用户只给了编号，从 `git remote get-url upstream` 推断 owner/repo（Issue 通常属于主仓）
3. 注意：Issue 所属仓库可能与 upstream 不同，但 PR 始终提交到 upstream

### 阶段 2：读取 Issue 详情

调用 MCP 工具获取完整 Issue 信息：

```
CallMcpTool: gitcode-mcp / gitcode_get_issue
  { owner, repo, issue_number }
```

从返回中提取关键信息：
- **`id`**：平台 Issue Id，后续若在同仓创建 PR 需传入 `issue` 字段以关联本 Issue
- **标题与描述**：理解问题本质
- **标签/优先级**：判断严重程度
- **评论**：可能包含复现步骤、补充信息或已有分析

将问题归纳为一句话摘要，明确：**什么坏了** 和 **期望行为是什么**。

### 阶段 3：分析定位

**开始前：处在主分支且与 upstream 同步**

在本地搜索、阅读代码做根因分析之前，先对齐主仓最新代码，避免在过期分支或孤立提交上看代码：

```bash
git fetch upstream
# 确定主分支名（与阶段 6 一致）：main 或 master
git ls-remote --heads upstream | grep -E 'refs/heads/(main|master)$'
# 检出本地主分支；若本地没有该分支则基于 upstream 创建
git checkout <base_branch> || git checkout -b <base_branch> upstream/<base_branch>
# 与 upstream 同步：禁止对主分支使用 git merge（会产生 merge commit）
git rebase upstream/<base_branch>
```

- **rebase 成功**：同步完成。
- **rebase 失败**（冲突无法解决，或决定不保留本分支相对 upstream 的独有提交）：先 `git rebase --abort`（若正处于 rebase 过程中），再执行 `git reset --hard upstream/<base_branch>`，使本地主分支与 upstream 指针完全一致。需要先与用户确认。
- **不要用** `git merge upstream/<base_branch>` 做主线同步。

若有未提交改动，先 `git stash` 或请用户处理，再执行上述步骤；否则 rebase 可能直接失败。同步完成后再进行下列分析步骤。

基于 Issue 描述在当前项目中定位问题：

1. **关键词提取**：从 Issue 中提取错误信息、函数名、文件路径、堆栈等线索
2. **代码搜索**：用 Grep/SemanticSearch 在代码库中定位相关代码
3. **上下文理解**：读取相关文件，理解模块职责和调用链
4. **根因分析**：确定导致问题的根本原因，而非表象

输出定位结论：
- 问题根因
- 涉及的文件和代码位置
- 影响范围评估

### 阶段 4：最小化修复

**核心原则：改动越少越好。**

1. 只修改直接导致问题的代码
2. 不做无关重构、不改代码风格、不添加无关功能
3. 修复应与项目现有代码风格保持一致
4. 如果修复涉及多个方案，选择侵入性最小的

修改前向用户说明修复方案，得到确认后再动手。

### 阶段 5：验证

修复后执行验证：

1. **静态检查**：用 ReadLints 检查修改文件是否引入 lint 错误
2. **构建验证**：运行项目构建命令（如 `npm run build`、`cargo build` 等），确保编译通过
3. **测试验证**：运行项目测试命令（如 `npm test`、`pytest` 等），确保已有测试不被破坏
4. **问题复查**：回顾 Issue 描述，确认修复逻辑覆盖了问题场景

如果验证失败，分析原因并修正，重复此阶段直到通过。

### 阶段 6：提交与创建 PR

验证通过后，**不得**直接创建 commit 和 PR，应当先拟定 commit 消息，再**询问用户**是否需要创建 commit 和 PR。

commit 消息规范：
- 符合 Conventional Commits 格式，<type>(<scope>): <short description>。示例：
  - fix(auth): resolve login issue with new users
  - feat(user-profile): add profile picture upload functionality
  - refactor(api): optimize data fetching logic
- commit 应当精简，最多3句话，禁止换行、分段等
- 使用英语编写 commit 消息

如果用户确认：

#### 6a. 同步 upstream 并准备分支

在创建修复分支前，先确保本地基于最新的 upstream 主分支：

```bash
# 解析两个 remote 的 owner/repo
git remote get-url upstream   # → upstream_owner / upstream_repo（PR 目标）
git remote get-url origin     # → fork_owner / fork_repo（个人 fork）

# 确定主分支名（main 或 master）
git ls-remote --heads upstream | grep -E 'refs/heads/(main|master)$'
# → 确定 base_branch

# 拉取 upstream 最新代码
git fetch upstream

# 基于 upstream 最新主分支创建修复分支
git checkout upstream/{base_branch}
git checkout -b fix/issue-{issue_number}
```

#### 6b. 提交并推送到 origin（个人 fork）

```bash
# 提交变更
git add <changed_files>
git commit -m "fix: <简洁描述问题修复>

Fixes upstream_owner/upstream_repo#{issue_number}"

# 推送到个人 fork
git push -u origin fix/issue-{issue_number}
```

#### 6c. 统计 commit 数（决定是否 Squash）

在创建 PR 前，在修复分支上统计相对 upstream 的提交数：

```bash
git fetch upstream
git rev-list --count upstream/{base_branch}..HEAD
```

- 若结果为 **1**：`squash` 可不传（或显式 `false`），与默认扁平化策略一致即可。
- 若结果为 **大于 1**：创建 PR 时必须传入 **`squash: true`**，并可配合 **`squash_commit_message`** 写一条清晰的合入说明（建议与 PR 标题或首段说明一致）。

#### 6d. 创建 PR（目标：upstream 主仓）

PR 提交到 **upstream**（主仓），源分支来自 **origin**（个人 fork）。

**关联原始 Issue（必填工作项）**

- 在 **Issue 与 PR 目标仓库一致** 时（`issue_owner/issue_repo` === `upstream_owner/upstream_repo`）：创建 PR 时必须传入 **`issue`**，值为阶段 2 `gitcode_get_issue` 返回 JSON 中的 **`id`**（转为字符串，与 GitCode API「Issue Id」一致），用于在平台上建立 PR 与 Issue 的关联，并可按平台规则自动带出标题/描述。
- 仍应提供明确的 **`title`** 与 **`body`**（修复说明、验证情况等）；若与平台自动填充冲突，以可读、可审阅的修复说明为准，并保留 `issue` 以维持关联。
- **Issue 与 upstream 不同仓**（跨仓）：通常无法通过 `issue` 关联到外部仓库的问题单，**不传** `issue`；在 **`body`** 与 **commit message** 中写清原始 Issue 的完整链接以及 `owner/repo#issue_number`，便于人工追溯。

**创建 PR 时的默认约定**：

| 选项 | 默认 |
|------|------|
| 关联原始 Issue | **同仓必传** `issue`（取值来自 `gitcode_get_issue.id`）；跨仓用正文/链接说明 |
| 合并后关闭已关联的 Issue | **否**：不传 `close_related_issue`，或显式 `false`。仅当用户明确要求「合并后关闭 Issue」时再设为 `true`。 |
| 合入后删除源分支 | **是**：`prune_source_branch: true`。仅当用户明确要求合并后保留源分支再设为 `false`。 |
| Squash 合并 | **多 commit 必开**：见 6c；单 commit 时不开启 |

```
CallMcpTool: gitcode-mcp / gitcode_create_pull_request
  {
    owner: <upstream_owner>,
    repo: <upstream_repo>,
    title: "fix: <问题简述>",
    head: "fix/issue-{issue_number}",
    base: <base_branch>,
    body: <PR 描述（含 Issue 链接或引用）>,
    issue: "<gitcode_get_issue 返回的 id>",   // 仅当 Issue 与 upstream 同仓时必填
    fork_path: "<fork_owner>/<fork_repo>",
    close_related_issue: false,
    prune_source_branch: true,
    squash: <true 当 commit 数 > 1，否则 false 或不传>,
    squash_commit_message: "<commit 数 > 1 时建议填写>"
  }
```

> `fork_path` 是跨仓 PR 的关键参数，值为个人 fork 的 `owner/repo` 路径。跨仓 Issue 时省略 `issue` 字段。

PR body 模板，使用中文编写：

```markdown
## 问题

修复 {issue_owner}/{issue_repo}#{issue_number}：{issue_title}

## 原因分析

{根因简述}

## 修复方案

{修改内容简述}

## 验证

- [x] lint 检查通过
- [x] 构建通过
- [x] 测试通过
```

## 关键决策点

### Issue 仓库 = upstream（常见情况）

- PR 提交到 upstream，`fork_path` 填 origin 的 owner/repo
- 创建 PR 时传入 **`issue`**（`gitcode_get_issue` 的 `id`），与原始 Issue 建立平台关联
- PR body 中可直接用 `#number` 或完整 URL 作为补充说明
- **合并后关闭 Issue**：默认关闭该行为；只有用户明确要求时才传 `close_related_issue: true`

### Issue 仓库 ≠ upstream

当 Issue 所在仓库与 upstream 不同时：
- Issue 信息按用户提供的 owner/repo 读取
- PR 仍创建到 upstream；**不传** `issue`（无法指向异仓 Issue Id）
- PR body / commit 中写明原始 Issue 的完整链接或 `issue_owner/issue_repo#number`
- **不要**默认开启 `close_related_issue`；跨仓场景下通常也无法正确关联关闭

### 无法定位问题

如果经过充分搜索仍无法定位问题：
1. 向用户报告已搜索的范围和排除的可能性
2. 列出需要的额外信息（日志、配置、复现步骤等）
3. 不要猜测性地修改代码

### 修复风险较大

如果修复可能引入副作用：
1. 向用户说明风险点
2. 建议额外的测试覆盖
3. 等待用户确认后再修改

## git remote 解析

本工作流需要解析两个 remote：

| Remote | 角色 | 用途 |
|--------|------|------|
| `upstream` | 主仓库 | PR 目标、Issue 来源、同步基线 |
| `origin` | 个人 fork | 推送修复分支、`fork_path` 值 |

从 remote URL 中提取 owner 和 repo：

| URL 格式 | 示例 | 解析 |
|-----------|------|------|
| HTTPS | `https://gitcode.com/owner/repo.git` | 取路径倒数两段，去 `.git` |
| SSH | `git@gitcode.com:owner/repo.git` | 取 `:` 后部分，去 `.git` |

### remote 缺失处理

如果 `upstream` remote 不存在：
1. 提示用户添加：`git remote add upstream <主仓URL>`
2. 不要自动猜测主仓地址
