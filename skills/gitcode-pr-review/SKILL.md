---
name: gitcode-pr-review
description: >-
  基于 GitCode MCP 拉取 PR 元数据、在本地用 git 对比 upstream 基线并审阅差异，将结构化评审结论通过 gitcode_create_pull_request_comment 发到 PR。
  当用户要求评审 GitCode PR、Merge Request、代码审阅、PR review，或提供 PR 链接/编号需要发表评审意见时使用。
---

# GitCode PR 评审

在 **不修改 PR 代码** 的前提下：获取 PR 信息 → **先更新 `upstream` 远端跟踪** → 拉取 MR 头指针到本地临时分支并与基线对比 → 分析变更 → 用 MCP 提交评论 → **删除本地临时 PR 分支**。

## 前置条件

- GitCode MCP 已启用；**调用任何 MCP 工具前**先读取该工具在 MCP 描述符中的 schema（参数名、必填项、评论类型等），勿凭猜测传参。
- 当前工作区是一个 git 仓库，且维护两个 remote：
  - origin — 个人 fork 的仓库（推送代码到此处）
  - upstream — 主仓库（PR 目标仓库，也是 Issue 通常所在的仓库）
- 环境已设置 GITCODE_TOKEN

## 解析用户输入的 PR

用户可能提供：

| 形式 | 示例 |
|------|------|
| 完整 URL | `https://gitcode.com/owner/repo/pulls/42` |
| owner/repo + IID | `owner/repo!42` |
| 仅 IID | `!42` / `MR 42`（从 `upstream` URL 推断 owner/repo） |

提取 **标题`title`**、**简介`body`** 关键信息。

## 工作流

### 1. 获取 PR 信息

调用 MCP（名称以实际服务为准，常见为 `gitcode-mcp`）：

```
gitcode_get_pull_request
```

传入 schema 要求的 owner/repo 与 MR 编号等。从返回中读取：**标题、描述、源分支、目标分支、作者、状态、已有讨论要点**等，用于「PR 总览」与风险判断。

### 2. 更新 upstream 跟踪并拉取 MR、对比基线

**硬性要求：在执行 `git diff` / `git log` 等任何「与基线比较」的操作之前，必须先更新 `upstream` 的远端跟踪引用**，保证 **`upstream/master`**（及后续用作基线的 `upstream/<目标分支>`）指向远端最新提交，避免在过期基线上审阅。

1. **更新 upstream（必做，且须在拉取 MR 与对比之前）**

```bash
git fetch upstream
```

若已知 PR 目标分支名（例如 `master`），可再显式拉取该分支以缩小抓取范围（仍须保证对应 **`refs/remotes/upstream/<分支名>`** 已更新）：

```bash
git fetch upstream master
```

当目标分支为 `main` 等其它名字时，将上面命令中的 `master` 换成 PR 返回的 **目标分支名**。若不确定默认分支，可用 `git ls-remote --heads upstream` 核对。

2. **拉取 MR 头指针到本地临时分支**

GitCode 兼容 GitLab 式 refspec（若失败，再查平台文档或改用网页给出的分支名，**不要**编造 ref）。

```bash
git fetch upstream "+refs/merge-requests/<IID>/head:pr_<IID>"
```

3. **对比基线**

**基线分支**：优先使用 PR 返回的 **目标分支**，即 `upstream/<base_branch>`（常见为 `upstream/master` 或 `upstream/main`）。**只有**在完成步骤 1 的 `fetch` 之后，才使用下列命令：

```bash
git diff upstream/<base_branch>...pr_<IID>
git log --oneline upstream/<base_branch>..pr_<IID>
```

必要时 `git show`、`Read` 打开关键文件，理解实现而非只看 diff 行面。

### 3. 评审原则

- **重点**：功能是否满足诉求、边界与错误路径、并发/资源/安全等实质风险、实现方式是否合理（算法、抽象、与现有架构的一致性）。
- **文风**：评论正文 **简短、可执行**；避免复述 diff 已显然可见的内容；不写长篇背景。
- **克制**：不纠结命名微调、无关格式、纯风格偏好；**测试代码** 以「是否覆盖关键路径、是否有误导性」为主，不按生产代码同等标准挑刺。
- **证据**：指出问题时应关联 **文件路径、主要代码变更段落 + 行为或后果**。

### 4. 输出模板（写入评论正文）

使用 **Markdown**，结构如下（中文为主，专有名词可保留英文）：

```markdown
## PR 总览

[1～3 句：目的、影响面、是否建议合入或需先满足的条件]

## 主要变更

| 模块/区域 | 变更要点 |
|-----------|----------|
| … | … |

## 存在的问题与建议

- …
- …

## AI 生成信息

| 项 | 值 |
|----|-----|
| 辅助工具 | 据实填写：如 Cursor、Claude、其他 |
| 模型 | 当前会话实际使用的模型名；系统未暴露则写「未知」 |

```

**末节填写说明**：
- 根据当前对话环境填写「辅助工具」与「模型」（可从产品界面或系统标识获知）；
- 添加一句话，保留markdown格式：
  ```
  使用 [gitcode-pr-review](https://gitcode.com/yangxt65535/gitcode-mcp/blob/master/skills/gitcode-pr-review) skill 生成 
  ```

表格行数 **控制在高信号条目**，勿罗列每个文件的琐碎改动，一处变更为一条。

### 5. 提交评审评论

不要直接调用 mcp 创建 PR，应当先展示评审结果，请求用户输入同意后方可评论

调用 MCP：

```
gitcode_create_pull_request_comment
```

按 schema 传入 PR/MR 标识与 **完整评论正文**（上节模板渲染结果）。若工具支持 **行级评论** 且存在明确单点问题，可对最关键 1～2 处附加行评；否则 **一条总评** 即可，避免刷屏。

**发表评论前自检**：

- [ ] 已先执行 `git fetch upstream`（及必要时对目标分支的显式 fetch），再执行 diff / log
- [ ] 模板含 **PR 总览 / 主要变更 / 问题与建议** 三节，且「主要变更」为表格、「问题与建议」为列表
- [ ] 模板结尾 **AI 生成信息** 表格已据实填写（工具、模型、生成时间）
- [ ] 无与实现无关的格式挑剔
- [ ] 结论与 diff 一致，未臆测未在分支中出现的行为

### 6. 收尾：删除本地 PR 分支

只要执行过 `git fetch upstream "+refs/merge-requests/<IID>/head:pr_<IID>"`，**在本次评审任务全部结束后**（用户已确认发表评论，或明确放弃发表评论、流程终止），**必须**删除本地临时分支 `pr_<IID>`，避免长期残留。

```bash
# 若当前正位于 pr_<IID>，先切换到其它分支（如本地 main/master 或 upstream 跟踪分支的检出分支）
git switch -
# 或：git checkout <其它已有分支>

git branch -D pr_<IID>
```

- 若 `branch -D` 报告分支不存在，说明未创建或已删过，无需报错。
- **不要**删除 `upstream` 上的 MR 源分支，仅删除本地 **`pr_<IID>`**。

**任务完全结束自检**：

- [ ] 已执行 `git branch -D pr_<IID>`（分支不存在则视为已清理）

## 异常处理

| 情况 | 处理 |
|------|------|
| 无 `upstream` | 提示用户添加 remote，并给出主仓 URL 占位说明 |
| `git fetch` ref 失败 | 检查 IID、权限、网络；查阅 GitCode 文档中 MR fetch 方式 |
| MCP 返回与本地 diff 不一致 | 以本地 `pr_<IID>` 与 `upstream/<base>` 为准写评审，并在总览中注明「与网页描述存在差异」若必要 |
| 超大 PR | 总览中说明仅抽样审阅范围；表格列「已重点审阅的目录/主题」 |
| 无法删除 `pr_<IID>` | 当前 HEAD 仍在该分支时先 `git switch` 到其它分支；有未合并工作区改动时先 stash 或请用户处理，再删分支 |

## 与「改代码」类技能的区别

本技能 **默认只读**：不提交修复 commit、不推送分支。若用户同时要求修问题，先完成评审评论，再在单独任务中按修复工作流处理。
