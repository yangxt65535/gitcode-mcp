/**
 * Expose bundled Agent Skill (SKILL.md) as an MCP resource for clients that fetch resources.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILL_URI = 'gitcode://skill/gitcode-issue-fixer';

function resolveSkillMarkdownPath(): string {
  return join(__dirname, '..', 'skills', 'gitcode-issue-fixer', 'SKILL.md');
}

export function registerGitcodeIssueFixerSkillResource(server: McpServer): void {
  server.resource(
    'gitcode-issue-fixer-skill',
    SKILL_URI,
    async () => {
      const path = resolveSkillMarkdownPath();
      if (!existsSync(path)) {
        return {
          contents: [
            {
              uri: SKILL_URI,
              mimeType: 'text/plain; charset=utf-8',
              text:
                `Skill 文件未找到: ${path}\n` +
                '请确认仓库中存在 skills/gitcode-issue-fixer/SKILL.md（相对安装根目录）。',
            },
          ],
        };
      }
      const text = readFileSync(path, 'utf8');
      return {
        contents: [
          {
            uri: SKILL_URI,
            mimeType: 'text/markdown; charset=utf-8',
            text,
          },
        ],
      };
    }
  );
}

export const GITCODE_ISSUE_FIXER_SKILL_URI = SKILL_URI;
