/**
 * User-related MCP Tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitcodeClient } from '../client.js';

export function registerUserTools(server: McpServer, client: GitcodeClient) {
  // Get Current User
  server.registerTool(
    'gitcode_get_current_user',
    {
      description: '获取当前 token 对应的用户信息（用户名、邮箱、头像等）',
      inputSchema: {},
    },
    async () => {
      try {
        const user = await client.getUser();

        const userInfo = {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          html_url: user.html_url,
          type: user.type,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(userInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text' as const, text: `Error getting current user: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
