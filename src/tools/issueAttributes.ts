/**
 * Issue 属性增强相关 MCP Tools
 *
 * 支持 Issue 更新工作流中需要的里程碑、看板、企业 Issue 类型扩展等能力。
 * 相关 Issue: yangxt65535/gitcode-mcp#1
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitcodeClient } from '../client.js';

export function registerIssueAttributeTools(server: McpServer, client: GitcodeClient) {
  // List Milestones
  server.registerTool(
    'gitcode_list_milestones',
    {
      description: '获取 Gitcode 仓库的所有里程碑',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        state: z.string().optional().describe('里程碑状态筛选（如 open/closed）'),
        page: z.number().optional().describe('页码'),
        per_page: z.number().optional().describe('每页数量，最大 100'),
      },
    },
    async (params) => {
      try {
        const milestones = await client.listMilestones({
          owner: params.owner,
          repo: params.repo,
          state: params.state,
          page: params.page,
          per_page: params.per_page,
        });

        const milestoneList = (Array.isArray(milestones) ? milestones : []).map((m) => ({
          number: m.number,
          title: m.title,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(milestoneList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing milestones: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // List Kanbans
  server.registerTool(
    'gitcode_list_kanbans',
    {
      description: '获取企业/组织(owner)的看板列表（看板用于管理 Issue/PR 关联）',
      inputSchema: {
        owner: z.string().describe('组织/企业空间地址(path)'),
        page: z.number().optional().describe('页码'),
        per_page: z.number().optional().describe('每页数量'),
      },
    },
    async (params) => {
      try {
        const kanbans = await client.listKanbans({
          owner: params.owner,
          page: params.page,
          per_page: params.per_page,
        });

        const kanbanList = (Array.isArray(kanbans) ? kanbans : []).map((k) => ({
          id: k.id,
          name: k.name,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(kanbanList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing kanbans: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Add Kanban Item
  server.registerTool(
    'gitcode_add_to_kanban',
    {
      description: '将 Issue 或 Pull Request 添加到组织看板（更新 Issue 关联看板）。repo 为仓库 path 名称，issue_iids/pr_iids 为仓库内 issue/PR 的 iid 数组',
      inputSchema: {
        owner: z.string().describe('组织/企业空间地址(path)'),
        kanban_id: z.number().describe('看板 ID（来自 gitcode_list_kanbans 的 id）'),
        repo: z.string().describe('仓库的 path 名称（不含 owner 前缀，如 openfuyao-powers）'),
        issue_iids: z.array(z.number()).optional().describe('要添加的 Issue iid（issue number）数组，与 pr_iids 至少提供一个'),
        pr_iids: z.array(z.number()).optional().describe('要添加的 Pull Request iid 数组，与 issue_iids 至少提供一个'),
      },
    },
    async (params) => {
      try {
        const hasIssue = Array.isArray(params.issue_iids) && params.issue_iids.length > 0;
        const hasPr = Array.isArray(params.pr_iids) && params.pr_iids.length > 0;
        if (!hasIssue && !hasPr) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: 请提供 issue_iids 或 pr_iids 中的至少一个非空数组',
              },
            ],
            isError: true,
          };
        }

        const result = await client.addKanbanItem({
          owner: params.owner,
          kanban_id: params.kanban_id,
          repo: params.repo,
          issue_iids: hasIssue ? params.issue_iids : undefined,
          pr_iids: hasPr ? params.pr_iids : undefined,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `添加到看板成功:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error adding item to kanban: ${message}` }],
          isError: true,
        };
      }
    }
  );
}