#!/usr/bin/env node
/**
 * 手动验证：GitcodeClient.getPullRequest（对应 MCP gitcode_get_pull_request）
 */

import { GitcodeClient } from '../src/client.js';

const token = process.env.GITCODE_TOKEN;
if (!token) {
  console.error('Error: GITCODE_TOKEN environment variable is required');
  process.exit(1);
}

const client = new GitcodeClient(token);

async function main() {
  console.log('Testing getPullRequest (gitcode_get_pull_request)...\n');

  try {
    const pr = await client.getPullRequest({
      owner: 'openFuyao',
      repo: 'installer-website',
      pull_number: 144,
    });

    console.log('Pull Request retrieved successfully!');
    console.log('----------------------------------------');
    console.log(`ID: ${pr.id}`);
    console.log(`Number: ${pr.number}`);
    console.log(`Title: ${pr.title}`);
    console.log(`State: ${pr.state}`);
    console.log(`Draft: ${pr.draft}`);
    console.log(`Mergeable: ${pr.mergeable}`);
    console.log(`Merged: ${pr.merged_at ? 'Yes' : 'No'}`);
    console.log(`Merged At: ${pr.merged_at}`);
    console.log(`Merged By: ${pr.merged_by?.login}`);
    console.log(`User: ${pr.user.login} (${pr.user.name})`);
    console.log(`Head: ${pr.head.ref} (${pr.head.repo?.full_name})`);
    console.log(`Base: ${pr.base.ref} (${pr.base.repo?.full_name})`);
    console.log(`Labels: ${pr.labels?.map(l => l.name).join(', ')}`);
    console.log(`Assignees: ${pr.assignees?.map(a => a.login).join(', ') || 'None'}`);
    console.log(`Testers: ${pr.testers?.map(t => t.login).join(', ') || 'None'}`);
    console.log(`Created: ${pr.created_at}`);
    console.log(`Updated: ${pr.updated_at}`);
    console.log(`Closed At: ${pr.closed_at}`);
    console.log(`URL: ${pr.html_url}`);
    console.log(`Can Merge Check: ${pr.can_merge_check}`);
    console.log('----------------------------------------');
    console.log('\nBody:');
    console.log(pr.body);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
