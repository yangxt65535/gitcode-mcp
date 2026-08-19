/**
 * Regression tests for gitcode_list_kanbans / gitcode_add_to_kanban:
 * 1. GET /org/:owner/kanban/list returns { content: [...] }, not a raw array
 * 2. kanban id is a snowflake string (unsafe as JS number)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { GitcodeClient } from '../src/client.js';
import { registerIssueAttributeTools } from '../src/tools/issueAttributes.js';

const SNOWFLAKE_ID = '2085547833222725633';

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function testClientUnwrapsContent() {
  const client = new GitcodeClient('dummy');
  (client as unknown as { client: { get: () => Promise<unknown> } }).client = {
    get: async () => ({
      data: {
        close_count: 0,
        open_count: 1,
        all_count: 1,
        content: [{ id: SNOWFLAKE_ID, name: 'openFuyao - v26.09问题单' }],
      },
    }),
  };

  const kanbans = await client.listKanbans({ owner: 'openFuyao' });
  assert(Array.isArray(kanbans) && kanbans.length === 1, `expected unwrapped array, got ${JSON.stringify(kanbans)}`);
  assert(kanbans[0].id === SNOWFLAKE_ID, `id must stay a string snowflake, got ${JSON.stringify(kanbans[0].id)}`);
  assert(kanbans[0].name === 'openFuyao - v26.09问题单', 'name mismatch');
}

async function testMcpToolAndSchema() {
  let capturedKanbanId: unknown;
  const mockClient = {
    listKanbans: async () => [
      { id: SNOWFLAKE_ID, name: 'openFuyao - v26.09问题单' },
    ],
    addKanbanItem: async (params: { kanban_id: unknown }) => {
      capturedKanbanId = params.kanban_id;
      return { success: true };
    },
  } as unknown as GitcodeClient;

  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerIssueAttributeTools(server, mockClient);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([mcp.connect(clientTransport), server.connect(serverTransport)]);

  const { tools } = await mcp.listTools();
  const listTool = tools.find((t) => t.name === 'gitcode_list_kanbans');
  const addTool = tools.find((t) => t.name === 'gitcode_add_to_kanban');
  assert(listTool && addTool, 'kanban tools missing');

  const addProps = (addTool.inputSchema as { properties?: Record<string, { type?: string }> }).properties ?? {};
  assert(
    addProps.kanban_id?.type === 'string',
    `kanban_id schema must be string, got ${JSON.stringify(addProps.kanban_id)}`
  );

  const listed = await mcp.callTool({
    name: 'gitcode_list_kanbans',
    arguments: { owner: 'openFuyao' },
  });
  assert(!listed.isError, `list failed: ${JSON.stringify(listed)}`);
  const text = (listed.content as { type: string; text: string }[])[0].text;
  const parsed = JSON.parse(text) as Array<{ id: string; name: string }>;
  assert(parsed.length === 1, `expected 1 kanban, got ${text}`);
  assert(parsed[0].id === SNOWFLAKE_ID, `tool must return string id, got ${JSON.stringify(parsed[0].id)}`);

  const added = await mcp.callTool({
    name: 'gitcode_add_to_kanban',
    arguments: {
      owner: 'openFuyao',
      kanban_id: SNOWFLAKE_ID,
      repo: 'openfuyao-powers',
      issue_iids: [20],
    },
  });
  assert(!added.isError, `add failed: ${JSON.stringify(added)}`);
  assert(capturedKanbanId === SNOWFLAKE_ID, `add must forward string id, got ${JSON.stringify(capturedKanbanId)}`);

  await mcp.close();
  await server.close();
}

async function main() {
  await testClientUnwrapsContent();
  await testMcpToolAndSchema();
  console.log('ALL TESTS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
