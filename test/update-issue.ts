/**
 * Regression tests for gitcode_update_issue:
 * 1. MCP JSON schema must expose fields (not properties: {})
 * 2. handler must forward issue_type to GitcodeClient
 * 3. issue_type cannot be set together with any other updatable field
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { GitcodeClient } from '../src/client.js';
import { registerIssueTools } from '../src/tools/issues.js';

const capture: { params?: Record<string, unknown> } = {};

const mockClient = {
  updateIssue: async (params: Record<string, unknown>) => {
    capture.params = params;
    return {
      id: 1,
      number: '20',
      title: 't',
      state: 'open',
      html_url: 'https://gitcode.com/openFuyao/openfuyao-powers/issues/20',
      updated_at: '2026-01-01T00:00:00Z',
    };
  },
} as unknown as GitcodeClient;

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerIssueTools(server, mockClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([mcpClient.connect(clientTransport), server.connect(serverTransport)]);

  const { tools } = await mcpClient.listTools();
  const update = tools.find((t) => t.name === 'gitcode_update_issue');
  assert(update, 'gitcode_update_issue is not registered');

  const properties = (update.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
  for (const key of ['owner', 'repo', 'issue_number', 'issue_type', 'issue_severity', 'status']) {
    assert(key in properties, `schema missing property "${key}"; got ${JSON.stringify(Object.keys(properties))}`);
  }

  const result = await mcpClient.callTool({
    name: 'gitcode_update_issue',
    arguments: {
      owner: 'openFuyao',
      repo: 'openfuyao-powers',
      issue_number: '20',
      issue_type: '需求/Requirement',
    },
  });
  assert(!result.isError, `unexpected error: ${JSON.stringify(result)}`);
  const forwarded = capture.params;
  assert(
    forwarded !== undefined && forwarded.issue_type === '需求/Requirement',
    `issue_type not forwarded to client: ${JSON.stringify(capture.params)}`
  );

  const mutexSeverity = await mcpClient.callTool({
    name: 'gitcode_update_issue',
    arguments: {
      owner: 'openFuyao',
      repo: 'openfuyao-powers',
      issue_number: '20',
      issue_type: '需求/Requirement',
      issue_severity: '主要',
    },
  });
  assert(mutexSeverity.isError, 'expected error when issue_type is combined with issue_severity');

  const mutexTitle = await mcpClient.callTool({
    name: 'gitcode_update_issue',
    arguments: {
      owner: 'openFuyao',
      repo: 'openfuyao-powers',
      issue_number: '20',
      issue_type: '需求/Requirement',
      title: 'should not be allowed',
    },
  });
  assert(mutexTitle.isError, 'expected error when issue_type is combined with title');

  console.log('ALL TESTS PASSED');
  await mcpClient.close();
  await server.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
