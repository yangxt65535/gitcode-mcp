# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP Server that wraps Gitcode REST API as standardized MCP Tools, enabling AI assistants to interact with Gitcode Issues and Pull Requests. Published as `@yangxt65535/gitcode-mcp` on npm.

## Commands

```bash
npm run build          # Clean dist/ then compile TypeScript
npm run start          # Start the MCP server (stdio transport)
npm run dev            # Watch mode for development
npm test               # No test suite configured — test manually via MCP client
```

## Architecture

```
src/index.ts           Entry point: loads env, creates GitcodeClient + McpServer, registers all tools, starts stdio transport
src/client.ts          GitcodeClient: axios wrapper with token-as-query-param auth, error interceptor, PR response normalization
src/types.d.ts         TypeScript interfaces for Gitcode API entities (Issue, PR, Comment, params)
src/tools/issues.ts    Registers 5 Issue tools (list, get, create, create_comment, list_comments)
src/tools/pullRequests.ts   Registers 5 PR tools (list, get, create, create_comment, list_comments)
```

## Key Design Details

- **Auth**: Gitcode requires `access_token` as a URL query parameter, not an HTTP header. `GitcodeClient.withToken()` injects it into every request's `params`.
- **PR normalization**: `POST /pulls` returns GitLab-style fields (`source_branch`, `target_branch`, `author`); `GET /pulls/:id` returns `head`/`base` objects. `normalizePullRequestResponse()` unifies both to `head.ref` / `base.ref`.
- **Error handling**: Three layers — axios interceptor (wrap HTTP errors) → tool handler try/catch (return `isError: true`) → startup check (exit on missing `GITCODE_TOKEN`). The server never crashes on individual tool failures.
- **Tool pattern**: Each tool uses `server.registerTool()` with Zod `inputSchema`, calls a client method, and returns a slimmed JSON response optimized for LLM context windows.
- **Extension path**: New API domains → add file in `src/tools/` → implement `register*Tools()` → call it in `index.ts`. Add API methods to `client.ts` reusing existing `withToken()` and error interceptor.

## Environment

- `GITCODE_TOKEN` (required) — Gitcode API access token
- `GITCODE_API_URL` (optional) — defaults to `https://api.gitcode.com/api/v5`

## Distribution

Published to npm. Users run via `npx @yangxt65535/gitcode-mcp` — no local clone or build needed. `prepublishOnly` hook runs `npm run build` automatically.
