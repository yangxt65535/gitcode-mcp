#!/usr/bin/env node

/**
 * Gitcode MCP Server
 *
 * An MCP (Model Context Protocol) server for Gitcode platform operations.
 * Provides tools for Issue and Pull Request management.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { GitcodeClient } from './client.js';
import { registerIssueTools } from './tools/issues.js';
import { registerPullRequestTools } from './tools/pullRequests.js';

// Load environment variables from .env file if exists
config();

// Validate required environment variables
const GITCODE_TOKEN = process.env.GITCODE_TOKEN;
if (!GITCODE_TOKEN) {
  console.error('Error: GITCODE_TOKEN environment variable is required');
  console.error('Please set GITCODE_TOKEN in your environment or .env file');
  process.exit(1);
}

// Optional configuration
const GITCODE_API_URL = process.env.GITCODE_API_URL;

// Initialize Gitcode API client
const gitcodeClient = new GitcodeClient(GITCODE_TOKEN, GITCODE_API_URL);

// Initialize MCP server
const server = new McpServer({
  name: 'gitcode-mcp',
  version: '1.0.0',
  description: 'MCP server for Gitcode platform - Issue and Pull Request operations',
});

// Register all tools
registerIssueTools(server, gitcodeClient);
registerPullRequestTools(server, gitcodeClient);

// Add server info resource
server.registerResource(
  'gitcode-server-info',
  'gitcode://server/info',
  {
    description: 'Gitcode MCP metadata: tool names and API base URL',
    mimeType: 'application/json',
  },
  async () => ({
    contents: [
      {
        uri: 'gitcode://server/info',
        mimeType: 'application/json',
        text: JSON.stringify({
          name: 'gitcode-mcp',
          version: '1.0.0',
          description: 'MCP server for Gitcode platform operations',
          tools: [
            'gitcode_list_issues',
            'gitcode_get_issue',
            'gitcode_create_issue',
            'gitcode_create_issue_comment',
            'gitcode_list_issue_comments',
            'gitcode_list_pull_requests',
            'gitcode_get_pull_request',
            'gitcode_create_pull_request',
            'gitcode_create_pull_request_comment',
            'gitcode_list_pull_request_comments',
          ],
          resources: [
            { name: 'gitcode-server-info', uri: 'gitcode://server/info' },
          ],
          apiBaseUrl: gitcodeClient['baseUrl'],
        }, null, 2),
      },
    ],
  })
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gitcode MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});