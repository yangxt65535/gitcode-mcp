/**
 * Pull Request-related MCP Tools
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitcodeClient } from '../client.js';

export function registerPullRequestTools(server: McpServer, client: GitcodeClient) {
  // Get Pull Request - Based on actual Gitcode API
  server.registerTool(
    'gitcode_get_pull_request',
    {
      description: '获取 Gitcode 仓库中指定 Pull Request 的详情',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        pull_number: z.number().describe('PR序号'),
      },
    },
    async (params) => {
      try {
        const pr = await client.getPullRequest({
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pull_number,
        });

        const prDetails = {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          draft: pr.draft,
          mergeable: pr.mergeable,
          user: {
            login: pr.user.login,
            name: pr.user.name,
          },
          head: {
            ref: pr.head.ref,
            sha: pr.head.sha,
            label: pr.head.label,
            repo: pr.head.repo?.full_name,
          },
          base: {
            ref: pr.base.ref,
            sha: pr.base.sha,
            label: pr.base.label,
            repo: pr.base.repo?.full_name,
          },
          assignees: pr.assignees?.map(a => ({
            login: a.login,
            name: a.name,
            accept: a.accept,
          })) || [],
          testers: pr.testers?.map(t => ({
            login: t.login,
            name: t.name,
            accept: t.accept,
          })) || [],
          approval_reviewers: pr.approval_reviewers?.map(r => ({
            login: r.login,
            name: r.name,
            accept: r.accept,
          })) || [],
          labels: pr.labels?.map(l => ({ name: l.name, color: l.color })) || [],
          milestone: pr.milestone?.title,
          merged: pr.merged_at ? true : false,
          merged_at: pr.merged_at,
          merged_by: pr.merged_by?.login,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          closed_at: pr.closed_at,
          url: pr.html_url,
          can_merge_check: pr.can_merge_check,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(prDetails, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error getting pull request: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // List Pull Requests
  server.registerTool(
    'gitcode_list_pull_requests',
    {
      description: '列出 Gitcode 仓库中的 Pull Request',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址'),
        repo: z.string().describe('仓库路径'),
        state: z.string().optional().describe('PR状态筛选'),
        page: z.number().optional().describe('页码'),
        per_page: z.number().optional().describe('每页数量'),
      },
    },
    async (params) => {
      try {
        const prs = await client.listPullRequests({
          owner: params.owner,
          repo: params.repo,
          state: params.state,
          page: params.page,
          per_page: params.per_page,
        });

        const prList = prs.map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          mergeable: pr.mergeable,
          user: pr.user.login,
          head: pr.head.ref,
          base: pr.base.ref,
          labels: pr.labels?.map(l => l.name) || [],
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          url: pr.html_url,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(prList, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error listing pull requests: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Create Pull Request
  server.registerTool(
    'gitcode_create_pull_request',
    {
      description: '在 Gitcode 仓库中创建新的 Pull Request',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        title: z.string().describe('Pull Request标题'),
        head: z.string().describe('Pull Request提交的源分支。格式：branch，跨仓PR格式：username:branch'),
        base: z.string().describe('Pull Request提交目标分支的名称'),
        body: z.string().optional().describe('Pull Request内容'),
        milestone_number: z.number().optional().describe('里程碑序号'),
        labels: z.string().optional().describe('用逗号分开的标签名称，如: bug,performance'),
        issue: z.string().optional().describe('根据指定的Issue Id自动填充标题和内容'),
        assignees: z.string().optional().describe('审查人员username，多个用半角逗号分隔，如: username1,username2'),
        testers: z.string().optional().describe('测试人员username，多个用半角逗号分隔，如: username1,username2'),
        prune_source_branch: z.boolean().optional().describe('合并PR后是否删除源分支，默认false'),
        draft: z.boolean().optional().describe('是否设置为草稿，默认false'),
        squash: z.boolean().optional().describe('合并时使用扁平化(Squash)合并，默认false'),
        squash_commit_message: z.string().optional().describe('squash提交信息'),
        fork_path: z.string().optional().describe('fork项目路径【owner/repo】，跨仓PR必填'),
        close_related_issue: z.boolean().optional().describe('合并后是否关闭关联的Issue'),
      },
    },
    async (params) => {
      try {
        const pr = await client.createPullRequest({
          owner: params.owner,
          repo: params.repo,
          title: params.title,
          head: params.head,
          base: params.base,
          body: params.body,
          milestone_number: params.milestone_number,
          labels: params.labels,
          issue: params.issue,
          assignees: params.assignees,
          testers: params.testers,
          prune_source_branch: params.prune_source_branch,
          draft: params.draft,
          squash: params.squash,
          squash_commit_message: params.squash_commit_message,
          fork_path: params.fork_path,
          close_related_issue: params.close_related_issue,
        });

        const createdPR = {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          head: pr.head.ref,
          base: pr.base.ref,
          url: pr.html_url,
          created_at: pr.created_at,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: `Pull Request创建成功:\n${JSON.stringify(createdPR, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error creating pull request: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Update Pull Request
  server.registerTool(
    'gitcode_update_pull_request',
    {
      description: '更新 Gitcode 仓库中指定 Pull Request 的信息',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        pull_number: z.number().describe('PR序号'),
        title: z.string().optional().describe('Pull Request标题'),
        body: z.string().optional().describe('Pull Request内容'),
        state: z.string().optional().describe('Pull Request状态'),
        milestone_number: z.number().optional().describe('里程碑序号(id)'),
        labels: z.string().optional().describe('用逗号分开的标签，如: bug,performance'),
        draft: z.boolean().optional().describe('是否设置为草稿'),
        close_related_issue: z.boolean().optional().describe('合并后是否关闭关联的Issue'),
      },
    },
    async (params) => {
      try {
        const pr = await client.updatePullRequest({
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pull_number,
          title: params.title,
          body: params.body,
          state: params.state,
          milestone_number: params.milestone_number,
          labels: params.labels,
          draft: params.draft,
          close_related_issue: params.close_related_issue,
        });

        const updatedPR = {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          head: pr.head.ref,
          base: pr.base.ref,
          url: pr.html_url,
          updated_at: pr.updated_at,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: `Pull Request更新成功:\n${JSON.stringify(updatedPR, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error updating pull request: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Create Pull Request Comment
  server.registerTool(
    'gitcode_create_pull_request_comment',
    {
      description: '在 Pull Request 中添加评论',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        pull_number: z.number().describe('PR序号'),
        body: z.string().describe('评论内容'),
        path: z.string().optional().describe('文件的相对路径（代码行评论时必填）'),
        position: z.number().optional().describe('代码所在行数（代码行评论时必填）'),
      },
    },
    async (params) => {
      try {
        const comment = await client.createPullRequestComment({
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pull_number,
          body: params.body,
          path: params.path,
          position: params.position,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `评论添加成功:\nID: ${comment.id}\nContent: ${comment.body}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error adding comment: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // List Pull Request Comments
  server.registerTool(
    'gitcode_list_pull_request_comments',
    {
      description: '获取指定 Pull Request 的全部评论',
      inputSchema: {
        owner: z.string().describe('仓库所属空间地址(组织或个人的地址path)'),
        repo: z.string().describe('仓库路径(path)'),
        pull_number: z.number().describe('第几个PR，即本仓库PR的序数'),
        page: z.number().optional().describe('当前的页码，默认 1'),
        per_page: z.number().optional().describe('每页的数量，最大为 100，默认 20'),
        direction: z.string().optional().describe('升序/降序: asc, desc'),
        comment_type: z.string().optional().describe('筛选评论类型。代码行评论: diff_comment, PR普通评论: pr_comment'),
      },
    },
    async (params) => {
      try {
        const comments = await client.listPullRequestComments({
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pull_number,
          page: params.page,
          per_page: params.per_page,
          direction: params.direction,
          comment_type: params.comment_type,
        });

        const commentList = comments.map(c => ({
          id: c.id,
          discussion_id: c.discussion_id,
          body: c.body,
          comment_type: c.comment_type,
          resolved: c.resolved,
          diff_file: c.diff_file,
          diff_position: c.diff_position,
          user: {
            login: c.user.login,
            name: c.user.name,
          },
          reply: c.reply?.map(r => ({
            id: r.id,
            body: r.body,
            user: {
              login: r.user.login,
              name: r.user.name,
            },
            created_at: r.created_at,
            updated_at: r.updated_at,
          })) || [],
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
          content: [{ type: 'text' as const, text: `Error listing PR comments: ${message}` }],
          isError: true,
        };
      }
    }
  );
}