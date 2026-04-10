#!/usr/bin/env node
/**
 * 手动验证：GitcodeClient.getIssue（对应 MCP gitcode_get_issue）
 */

import { GitcodeClient } from '../src/client.js';

const token = process.env.GITCODE_TOKEN;
if (!token) {
  console.error('Error: GITCODE_TOKEN environment variable is required');
  process.exit(1);
}

const client = new GitcodeClient(token);

async function main() {
  console.log('Testing getIssue (gitcode_get_issue)...\n');

  try {
    const issue = await client.getIssue({
      owner: 'openFuyao',
      repo: 'sig-container-platform',
      issue_number: '20',
    });

    console.log('Issue retrieved successfully!');
    console.log('----------------------------------------');
    console.log(`ID: ${issue.id}`);
    console.log(`Number: ${issue.number}`);
    console.log(`Title: ${issue.title}`);
    console.log(`State: ${issue.state}`);
    console.log(`Issue State: ${issue.issue_state}`);
    console.log(`Issue Type: ${issue.issue_type}`);
    console.log(`User: ${issue.user.login} (${issue.user.name})`);
    console.log(`Labels: ${issue.labels?.map(l => l.name).join(', ')}`);
    console.log(`Comments: ${issue.comments}`);
    console.log(`Priority: ${issue.priority}`);
    console.log(`Created: ${issue.created_at}`);
    console.log(`Updated: ${issue.updated_at}`);
    console.log(`URL: ${issue.html_url}`);
    console.log(`Repository: ${issue.repository?.full_name}`);
    console.log('----------------------------------------');
    console.log('\nBody preview:');
    console.log(issue.body?.substring(0, 200) + '...');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
