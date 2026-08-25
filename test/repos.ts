/**
 * Regression tests for gitcode_get_repo / gitcode_list_forks:
 * 1. Client hits GET /repos/:owner/:repo and GET /repos/:owner/:repo/forks
 * 2. Fork list unwraps { content: [...] } when GitCode wraps the array
 * 3. MCP tools return slimmed fields (no members/creator/etc.)
 *
 * Related Issue: yangxt65535/gitcode-mcp#2
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { GitcodeClient } from '../src/client.js';
import { registerRepositoryTools } from '../src/tools/repositories.js';

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const FORK_FIXTURE = {
  id: 567682,
  full_name: 'alice/openfuyao-powers',
  human_name: 'alice / openfuyao-powers',
  url: 'https://api.gitcode.com/api/v5/repos/alice/openfuyao-powers',
  namespace: { id: 1, type: 'personal', name: 'alice', path: 'alice', html_url: 'https://gitcode.com/alice' },
  path: 'openfuyao-powers',
  name: 'openfuyao-powers',
  description: 'forked copy',
  ssh_url_to_repo: 'git@gitcode.com:alice/openfuyao-powers.git',
  http_url_to_repo: 'https://gitcode.com/alice/openfuyao-powers.git',
  web_url: 'https://gitcode.com/alice/openfuyao-powers',
  members: ['alice'],
  creator: { username: 'alice', email: 'alice@noreply.gitcode.com' },
  default_branch: 'master',
  fork: true,
  owner: { id: '9', login: 'alice', name: 'Alice', type: 'User' },
  parent: {
    id: 100,
    full_name: 'openFuyao/openfuyao-powers',
    human_name: 'openFuyao / openfuyao-powers',
    url: 'https://api.gitcode.com/api/v5/repos/openFuyao/openfuyao-powers',
    namespace: { id: 2, type: 'group', name: 'openFuyao', path: 'openFuyao', html_url: 'https://gitcode.com/openFuyao' },
  },
  permission: { pull: true, push: true, admin: true },
  private: false,
  public: true,
  created_at: '2024-07-29T15:42:45.149+08:00',
};

const ORG_REPO_FIXTURE = {
  id: 100,
  full_name: 'openFuyao/openfuyao-powers',
  human_name: 'openFuyao / openfuyao-powers',
  url: 'https://api.gitcode.com/api/v5/repos/openFuyao/openfuyao-powers',
  namespace: { id: 2, type: 'group', name: 'openFuyao', path: 'openFuyao', html_url: 'https://gitcode.com/openFuyao' },
  path: 'openfuyao-powers',
  name: 'openfuyao-powers',
  description: 'org repo',
  ssh_url_to_repo: 'git@gitcode.com:openFuyao/openfuyao-powers.git',
  http_url_to_repo: 'https://gitcode.com/openFuyao/openfuyao-powers.git',
  web_url: 'https://gitcode.com/openFuyao/openfuyao-powers',
  members: ['admin1', 'admin2'],
  creator: { username: 'admin1' },
  default_branch: 'master',
  fork: false,
  owner: { id: '1', login: 'openFuyao', name: 'openFuyao', type: 'Organization' },
  permission: { pull: true, push: false, admin: false },
  private: false,
  public: true,
};

type CapturedGet = { url?: string; params?: Record<string, unknown> };

async function testClientGetRepoAndListForks() {
  const captured: CapturedGet[] = [];
  const client = new GitcodeClient('dummy-token');
  (client as unknown as { client: { get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<unknown> } }).client = {
    get: async (url, config) => {
      captured.push({ url, params: config?.params });
      if (url.endsWith('/forks')) {
        return { data: [FORK_FIXTURE] };
      }
      return { data: ORG_REPO_FIXTURE };
    },
  };

  const repo = await client.getRepo({ owner: 'openFuyao', repo: 'openfuyao-powers' });
  assert(repo.full_name === 'openFuyao/openfuyao-powers', `getRepo body mismatch: ${JSON.stringify(repo)}`);
  assert(captured[0]?.url === '/repos/openFuyao/openfuyao-powers', `unexpected getRepo url: ${captured[0]?.url}`);
  assert(captured[0]?.params?.access_token === 'dummy-token', 'getRepo must pass access_token');

  const forks = await client.listForks({
    owner: 'openFuyao',
    repo: 'openfuyao-powers',
    sort: 'newest',
    page: 2,
    per_page: 10,
  });
  assert(Array.isArray(forks) && forks.length === 1, `expected forks array, got ${JSON.stringify(forks)}`);
  assert(forks[0].full_name === 'alice/openfuyao-powers', 'fork full_name mismatch');
  assert(captured[1]?.url === '/repos/openFuyao/openfuyao-powers/forks', `unexpected listForks url: ${captured[1]?.url}`);
  assert(captured[1]?.params?.access_token === 'dummy-token', 'listForks must pass access_token');
  assert(captured[1]?.params?.sort === 'newest', 'listForks must forward sort');
  assert(captured[1]?.params?.page === 2, 'listForks must forward page');
  assert(captured[1]?.params?.per_page === 10, 'listForks must forward per_page');
}

async function testClientUnwrapsForkList() {
  const client = new GitcodeClient('dummy-token');
  (client as unknown as { client: { get: () => Promise<unknown> } }).client = {
    get: async () => ({
      data: { content: [FORK_FIXTURE] },
    }),
  };

  const forks = await client.listForks({ owner: 'openFuyao', repo: 'openfuyao-powers' });
  assert(Array.isArray(forks) && forks.length === 1, `expected unwrapped array, got ${JSON.stringify(forks)}`);
  assert(forks[0].full_name === 'alice/openfuyao-powers', 'unwrapped fork full_name mismatch');
}

async function withRepoTools(mockClient: GitcodeClient) {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerRepositoryTools(server, mockClient);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([mcp.connect(clientTransport), server.connect(serverTransport)]);
  return { server, mcp };
}

function parseToolJson(result: { isError?: boolean; content: unknown }) {
  assert(!result.isError, `unexpected tool error: ${JSON.stringify(result)}`);
  const text = (result.content as { type: string; text: string }[])[0].text;
  return JSON.parse(text) as unknown;
}

async function testMcpGetRepoSlimsFields() {
  const mockClient = {
    getRepo: async () => FORK_FIXTURE,
    listForks: async () => [FORK_FIXTURE],
  } as unknown as GitcodeClient;

  const { server, mcp } = await withRepoTools(mockClient);
  try {
    const { tools } = await mcp.listTools();
    const getTool = tools.find((t) => t.name === 'gitcode_get_repo');
    assert(getTool, 'gitcode_get_repo is not registered');
    const props = (getTool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    for (const key of ['owner', 'repo']) {
      assert(key in props, `get_repo schema missing "${key}"; got ${JSON.stringify(Object.keys(props))}`);
    }

    const result = await mcp.callTool({
      name: 'gitcode_get_repo',
      arguments: { owner: 'alice', repo: 'openfuyao-powers' },
    });
    const parsed = parseToolJson(result) as Record<string, unknown>;

    assert(parsed.full_name === 'alice/openfuyao-powers', `full_name mismatch: ${JSON.stringify(parsed)}`);
    assert(parsed.path === 'openfuyao-powers', 'path mismatch');
    assert(parsed.fork === true, 'fork should be true');
    assert(parsed.owner === 'alice', `owner should be login string, got ${JSON.stringify(parsed.owner)}`);
    assert(parsed.ssh_url_to_repo === 'git@gitcode.com:alice/openfuyao-powers.git', 'ssh url missing');
    assert(parsed.http_url_to_repo === 'https://gitcode.com/alice/openfuyao-powers.git', 'http url missing');
    assert(parsed.default_branch === 'master', 'default_branch missing');
    const ns = parsed.namespace as { path?: string; type?: string };
    assert(ns?.path === 'alice' && ns?.type === 'personal', `namespace mismatch: ${JSON.stringify(ns)}`);
    const parent = parsed.parent as { full_name?: string; path?: string };
    assert(parent?.full_name === 'openFuyao/openfuyao-powers', `parent.full_name mismatch: ${JSON.stringify(parent)}`);
    assert(parent?.path === 'openFuyao', `parent.path mismatch: ${JSON.stringify(parent)}`);
    const permission = parsed.permission as { pull?: boolean; push?: boolean; admin?: boolean };
    assert(permission?.pull === true && permission?.push === true, `permission mismatch: ${JSON.stringify(permission)}`);

    for (const leaked of ['members', 'creator', 'human_name', 'id', 'created_at', 'url']) {
      assert(!(leaked in parsed), `slim output leaked "${leaked}": ${JSON.stringify(parsed)}`);
    }
  } finally {
    await mcp.close();
    await server.close();
  }
}

async function testMcpGetRepoWithoutParent() {
  const mockClient = {
    getRepo: async () => ORG_REPO_FIXTURE,
    listForks: async () => [],
  } as unknown as GitcodeClient;

  const { server, mcp } = await withRepoTools(mockClient);
  try {
    const result = await mcp.callTool({
      name: 'gitcode_get_repo',
      arguments: { owner: 'openFuyao', repo: 'openfuyao-powers' },
    });
    const parsed = parseToolJson(result) as Record<string, unknown>;
    assert(parsed.fork === false, 'org repo should not be a fork');
    assert(parsed.parent === null, `parent should be null when absent, got ${JSON.stringify(parsed.parent)}`);
    assert(parsed.owner === 'openFuyao', 'owner login mismatch');
    const permission = parsed.permission as { push?: boolean };
    assert(permission?.push === false, 'org repo permission.push should be forwarded');
  } finally {
    await mcp.close();
    await server.close();
  }
}

async function testMcpListForksSlimsFields() {
  const mockClient = {
    getRepo: async () => ORG_REPO_FIXTURE,
    listForks: async (params: Record<string, unknown>) => {
      assert(params.owner === 'openFuyao', 'owner not forwarded');
      assert(params.page === 1, 'page not forwarded');
      return [FORK_FIXTURE];
    },
  } as unknown as GitcodeClient;

  const { server, mcp } = await withRepoTools(mockClient);
  try {
    const { tools } = await mcp.listTools();
    const listTool = tools.find((t) => t.name === 'gitcode_list_forks');
    assert(listTool, 'gitcode_list_forks is not registered');
    const props = (listTool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    for (const key of ['owner', 'repo', 'page', 'per_page', 'sort']) {
      assert(key in props, `list_forks schema missing "${key}"; got ${JSON.stringify(Object.keys(props))}`);
    }

    const result = await mcp.callTool({
      name: 'gitcode_list_forks',
      arguments: { owner: 'openFuyao', repo: 'openfuyao-powers', page: 1 },
    });
    const parsed = parseToolJson(result) as Array<Record<string, unknown>>;
    assert(Array.isArray(parsed) && parsed.length === 1, `expected 1 fork, got ${JSON.stringify(parsed)}`);
    assert(parsed[0].full_name === 'alice/openfuyao-powers', 'fork full_name mismatch');
    assert(parsed[0].owner === 'alice', 'fork owner should be login');
    const parent = parsed[0].parent as { full_name?: string };
    assert(parent?.full_name === 'openFuyao/openfuyao-powers', 'fork parent.full_name mismatch');
    for (const leaked of ['members', 'creator', 'human_name', 'id', 'created_at']) {
      assert(!(leaked in parsed[0]), `list_forks leaked "${leaked}": ${JSON.stringify(parsed[0])}`);
    }
  } finally {
    await mcp.close();
    await server.close();
  }
}

async function main() {
  await testClientGetRepoAndListForks();
  await testClientUnwrapsForkList();
  await testMcpGetRepoSlimsFields();
  await testMcpGetRepoWithoutParent();
  await testMcpListForksSlimsFields();
  console.log('ALL TESTS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
