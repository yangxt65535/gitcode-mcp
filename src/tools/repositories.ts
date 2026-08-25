/**
 * Repository-related MCP Tools
 *
 * 用于识别远端仓库身份（组织仓 vs fork）及列出已有 Fork。
 * 相关 Issue: yangxt65535/gitcode-mcp#2
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitcodeClient } from '../client.js';
import type {
  GitcodeRepoNamespace,
  GitcodeRepoParent,
  GitcodeRepoPermission,
  GitcodeRepositoryDetail,
} from '../types.js';

function slimNamespace(ns?: GitcodeRepoNamespace) {
  if (!ns) return undefined;
  return {
    path: ns.path,
    type: ns.type,
  };
}

function slimParent(parent?: GitcodeRepoParent | null) {
  if (!parent) return null;
  return {
    full_name: parent.full_name,
    path: parent.namespace?.path,
  };
}

function slimPermission(permission?: GitcodeRepoPermission) {
  if (!permission) return undefined;
  return {
    pull: permission.pull,
    push: permission.push,
    admin: permission.admin,
  };
}

function slimRepo(repo: GitcodeRepositoryDetail) {
  return {
    full_name: repo.full_name,
    path: repo.path,
    name: repo.name,
    web_url: repo.web_url,
    ssh_url_to_repo: repo.ssh_url_to_repo,
    http_url_to_repo: repo.http_url_to_repo,
    default_branch: repo.default_branch,
    fork: Boolean(repo.fork),
    private: repo.private,
    public: repo.public,
    owner: repo.owner?.login,
    namespace: slimNamespace(repo.namespace),
    parent: slimParent(repo.parent),
    permission: slimPermission(repo.permission),
  };
}

function slimFork(repo: GitcodeRepositoryDetail) {
  return {
    full_name: repo.full_name,
    owner: repo.owner?.login,
    namespace: slimNamespace(repo.namespace),
    parent: slimParent(repo.parent),
    ssh_url_to_repo: repo.ssh_url_to_repo,
    http_url_to_repo: repo.http_url_to_repo,
    private: repo.private,
    public: repo.public,
  };
}

export function registerRepositoryTools(server: McpServer, client: GitcodeClient) {
  server.registerTool(
    'gitcode_get_repo',
    {
      description: '获取 Gitcode 仓库详情（精简输出：full_name、fork/parent、clone URL、namespace、permission）。用于判断远端是组织仓还是个人 fork',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
      },
    },
    async (params) => {
      try {
        const repo = await client.getRepo({
          owner: params.owner,
          repo: params.repo,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(slimRepo(repo), null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error getting repository: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'gitcode_list_forks',
    {
      description: '列出 Gitcode 仓库已有的 Fork（精简输出：full_name、owner、parent、clone URL）。可用于查找当前用户是否已 fork 某组织仓',
      inputSchema: {
        owner: z.string().describe('源仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('源仓库路径(path)'),
        sort: z.string().optional().describe('排序：newest/oldest（fork 时间）或 stargazers'),
        page: z.number().optional().describe('页码'),
        per_page: z.number().optional().describe('每页数量，最大 100'),
      },
    },
    async (params) => {
      try {
        const forks = await client.listForks({
          owner: params.owner,
          repo: params.repo,
          sort: params.sort,
          page: params.page,
          per_page: params.per_page,
        });

        const forkList = (Array.isArray(forks) ? forks : []).map(slimFork);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(forkList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing forks: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
