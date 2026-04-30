/**
 * Issue-related MCP Tools
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitcodeClient } from '../client.js';

export function registerIssueTools(server: McpServer, client: GitcodeClient) {
  // Get Issue - Based on actual Gitcode API
  server.registerTool(
    'gitcode_get_issue',
    {
      description: '获取 Gitcode 仓库中指定 Issue 的详情',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        issue_number: z.string().describe('Issue编号(区分大小写，无需添加 # 号)'),
      },
    },
    async (params) => {
      try {
        const issue = await client.getIssue({
          owner: params.owner,
          repo: params.repo,
          issue_number: params.issue_number,
        });

        const issueDetails = {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          issue_state: issue.issue_state,
          user: {
            login: issue.user.login,
            name: issue.user.name,
          },
          labels: issue.labels?.map(l => ({ name: l.name, color: l.color })) || [],
          priority: issue.priority,
          issue_type: issue.issue_type,
          comments: issue.comments,
          milestone: issue.milestone?.title,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          finished_at: issue.finished_at,
          url: issue.html_url,
          repository: issue.repository?.full_name,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(issueDetails, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error getting issue: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // List Issues
  server.registerTool(
    'gitcode_list_issues',
    {
      description: '列出 Gitcode 仓库中的 Issue',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址'),
        repo: z.string().describe('仓库路径'),
        state: z.string().optional().describe('Issue状态筛选'),
        page: z.number().optional().describe('页码'),
        per_page: z.number().optional().describe('每页数量'),
      },
    },
    async (params) => {
      try {
        const issues = await client.listIssues({
          owner: params.owner,
          repo: params.repo,
          state: params.state,
          page: params.page,
          per_page: params.per_page,
        });

        const issueList = issues.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          issue_state: issue.issue_state,
          user: issue.user.login,
          labels: issue.labels?.map(l => l.name) || [],
          priority: issue.priority,
          issue_type: issue.issue_type,
          comments: issue.comments,
          created_at: issue.created_at,
          url: issue.html_url,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(issueList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing issues: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Create Issue
  server.registerTool(
    'gitcode_create_issue',
    {
      description: '在 Gitcode 仓库中创建新的 Issue',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址'),
        repo: z.string().describe('仓库路径'),
        title: z.string().describe('Issue标题'),
        body: z.string().optional().describe('Issue内容描述'),
      },
    },
    async (params) => {
      try {
        const issue = await client.createIssue({
          owner: params.owner,
          repo: params.repo,
          title: params.title,
          body: params.body,
        });

        const createdIssue = {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          created_at: issue.created_at,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: `Issue创建成功:\n${JSON.stringify(createdIssue, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error creating issue: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Create Issue Comment
  server.registerTool(
    'gitcode_create_issue_comment',
    {
      description: '在 Issue 中添加评论',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        issue_number: z.string().describe('Issue编号(区分大小写，无需添加 # 号)'),
        body: z.string().describe('评论内容'),
      },
    },
    async (params) => {
      try {
        const comment = await client.createIssueComment({
          owner: params.owner,
          repo: params.repo,
          issue_number: params.issue_number,
          body: params.body,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `评论添加成功:\n${JSON.stringify(comment, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error creating issue comment: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // List Issue Comments
  server.registerTool(
    'gitcode_list_issue_comments',
    {
      description: '获取仓库中指定 Issue 的全部评论',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(企业、组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        issue_number: z.string().describe('Issue 编号(区分大小写，无需添加 # 号)'),
        page: z.number().optional().describe('当前的页码'),
        per_page: z.number().optional().describe('每页的数量，最大为 100，默认 20'),
        order: z.string().optional().describe('排序顺序: asc, desc (默认 asc)'),
        since: z.string().optional().describe('起始的更新时间，格式: 2024-11-10T08:10:30.000+08:00'),
      },
    },
    async (params) => {
      try {
        const comments = await client.listIssueComments({
          owner: params.owner,
          repo: params.repo,
          issue_number: params.issue_number,
          page: params.page,
          per_page: params.per_page,
          order: params.order,
          since: params.since,
        });

        const commentList = comments.map(c => ({
          id: c.id,
          body: c.body,
          user: {
            login: c.user.login,
            name: c.user.name,
          },
          target: c.target,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(commentList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing issue comments: ${message}` }],
          isError: true,
        };
      }
    }
  );
}