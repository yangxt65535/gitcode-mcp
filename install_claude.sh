#!/usr/bin/env bash
# 一键：安装依赖、构建 dist，并向 Claude Code 全局注册 MCP（gitcode，user 作用域）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

info() { printf '%s\n' "$*"; }
err() { printf '错误: %s\n' "$*" >&2; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "未找到命令「$1」，请先安装。"
    exit 1
  fi
}

need_cmd node
need_cmd npm
need_cmd claude

info "==> 安装 npm 依赖…"
npm install

info "==> 构建 TypeScript（dist/）…"
npm run build

if [[ ! -f "$ROOT/dist/index.js" ]]; then
  err "构建后未找到 dist/index.js"
  exit 1
fi

info ""
info "请输入 GitCode API access_token（输入不回显）："
read -rsp "GITCODE_TOKEN: " GITCODE_TOKEN
info ""

if [[ -z "${GITCODE_TOKEN:-}" ]]; then
  err "GITCODE_TOKEN 不能为空"
  exit 1
fi

info "==> 向 Claude Code 全局注册 MCP 服务器「gitcode」（scope: user）…"
# 与 README 中 stdio 配置等价：node + 本仓库 dist/index.js，并注入 GITCODE_TOKEN
if ! claude mcp add -s user \
  -e "GITCODE_TOKEN=${GITCODE_TOKEN}" \
  gitcode -- node "${ROOT}/dist/index.js"; then
  err "claude mcp add 失败。若已存在同名服务，可先执行："
  err "  claude mcp remove -s user gitcode"
  err "然后重新运行本脚本。"
  exit 1
fi

SKILL_SRC="${ROOT}/skills/gitcode-issue-fixer/SKILL.md"
CLAUDE_SKILL_DIR="${HOME}/.claude/skills/gitcode-issue-fixer"
if [[ -f "$SKILL_SRC" ]]; then
  info "==> 安装 Claude Code Agent Skill（全局 ~/.claude/skills）…"
  mkdir -p "$CLAUDE_SKILL_DIR"
  cp -f "$SKILL_SRC" "${CLAUDE_SKILL_DIR}/SKILL.md"
  info "已复制：${CLAUDE_SKILL_DIR}/SKILL.md"
else
  info "提示: 未找到 ${SKILL_SRC}，已跳过复制到 ~/.claude/skills（请将该 Skill 置于仓库 skills/gitcode-issue-fixer/SKILL.md）。"
fi

info ""
info "完成。可执行「claude mcp list」确认「gitcode」MCP；Agent 可通过 Skill「gitcode-issue-fixer」或 MCP 资源 URI「gitcode://skill/gitcode-issue-fixer」加载工作流说明。"
