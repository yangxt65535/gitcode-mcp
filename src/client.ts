/**
 * Gitcode API Client
 * Based on Gitcode API documentation: https://api.gitcode.com/api/v5
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  GitcodeIssue,
  GitcodePullRequest,
  GitcodePRBranch,
  GitcodeUser,
  GetIssueParams,
  GetPullRequestParams,
} from './types.js';

export class GitcodeClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.GITCODE_API_URL || 'https://api.gitcode.com/api/v5';
    this.token = token;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add error handling interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const message = `Gitcode API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
          throw new Error(message);
        }
        throw error;
      }
    );
  }

  /**
   * Add access_token to request params
   * Gitcode requires access_token as query parameter
   */
  private withToken(params: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...params, access_token: this.token };
  }

  /**
   * POST /pulls returns GitLab-style fields (source_branch, target_branch, description, author).
   * GET /pulls/:id returns head/base objects. Normalize so callers can always use head.ref / base.ref.
   */
  private normalizePullRequestResponse(raw: unknown): GitcodePullRequest {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid pull request response');
    }
    const d = raw as Record<string, unknown>;
    const diffRefs =
      d.diff_refs && typeof d.diff_refs === 'object' ? (d.diff_refs as Record<string, unknown>) : undefined;

    const existingHead = d.head;
    const head: GitcodePRBranch =
      existingHead &&
      typeof existingHead === 'object' &&
      'ref' in existingHead &&
      (existingHead as GitcodePRBranch).ref != null &&
      String((existingHead as GitcodePRBranch).ref) !== ''
        ? (existingHead as GitcodePRBranch)
        : {
            ref: String(d.source_branch ?? ''),
            sha: String(diffRefs?.head_sha ?? d.sha ?? ''),
            label: String(d.source_branch ?? ''),
          };

    const existingBase = d.base;
    const base: GitcodePRBranch =
      existingBase &&
      typeof existingBase === 'object' &&
      'ref' in existingBase &&
      (existingBase as GitcodePRBranch).ref != null &&
      String((existingBase as GitcodePRBranch).ref) !== ''
        ? (existingBase as GitcodePRBranch)
        : {
            ref: String(d.target_branch ?? ''),
            sha: String(diffRefs?.base_sha ?? ''),
            label: String(d.target_branch ?? ''),
          };

    const existingUser = d.user;
    const user: GitcodeUser =
      existingUser &&
      typeof existingUser === 'object' &&
      'login' in existingUser &&
      String((existingUser as GitcodeUser).login) !== ''
        ? (existingUser as GitcodeUser)
        : (() => {
            const author = d.author as Record<string, unknown> | undefined;
            return {
              id: String(author?.iam_id ?? author?.id ?? ''),
              login: String(author?.username ?? ''),
              name: author?.name != null ? String(author.name) : undefined,
              avatar_url: author?.avatar_url != null ? String(author.avatar_url) : undefined,
            };
          })();

    const partial = d as Partial<GitcodePullRequest>;
    return {
      ...partial,
      html_url: String(d.html_url ?? d.web_url ?? partial.html_url ?? ''),
      body: String(d.body ?? d.description ?? partial.body ?? ''),
      draft: Boolean(d.draft ?? d.work_in_progress ?? partial.draft),
      mergeable: Boolean(d.mergeable ?? partial.mergeable ?? false),
      user,
      head,
      base,
    } as GitcodePullRequest;
  }

  // ==================== Issue Methods ====================

  /**
   * Get a single issue
   * API: GET /repos/:owner/:repo/issues/:number
   */
  async getIssue(params: GetIssueParams): Promise<GitcodeIssue> {
    const response = await this.client.get(
      `/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`,
      { params: this.withToken() }
    );
    return response.data;
  }

  /**
   * List repository issues
   * Placeholder - API endpoint to be confirmed
   */
  async listIssues(params: { owner: string; repo: string; state?: string; page?: number; per_page?: number }): Promise<GitcodeIssue[]> {
    const response = await this.client.get(
      `/repos/${params.owner}/${params.repo}/issues`,
      { params: this.withToken({ state: params.state, page: params.page, per_page: params.per_page }) }
    );
    return response.data;
  }

  /**
   * Create a new issue
   * Placeholder - API endpoint to be confirmed
   */
  async createIssue(params: { owner: string; repo: string; title: string; body?: string }): Promise<GitcodeIssue> {
    const response = await this.client.post(
      `/repos/${params.owner}/${params.repo}/issues`,
      { title: params.title, body: params.body },
      { params: this.withToken() }
    );
    return response.data;
  }

  // ==================== Pull Request Methods ====================

  /**
   * Get a single pull request
   * API: GET /repos/:owner/:repo/pulls/:number
   */
  async getPullRequest(params: GetPullRequestParams): Promise<GitcodePullRequest> {
    const response = await this.client.get(
      `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`,
      { params: this.withToken() }
    );
    return response.data;
  }

  /**
   * List repository pull requests
   * Placeholder - API endpoint to be confirmed
   */
  async listPullRequests(params: { owner: string; repo: string; state?: string; page?: number; per_page?: number }): Promise<GitcodePullRequest[]> {
    const response = await this.client.get(
      `/repos/${params.owner}/${params.repo}/pulls`,
      { params: this.withToken({ state: params.state, page: params.page, per_page: params.per_page }) }
    );
    return response.data;
  }

  /**
   * Create a new pull request
   * API: POST /repos/:owner/:repo/pulls
   */
  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
    milestone_number?: number;
    labels?: string;
    issue?: string;
    assignees?: string;
    testers?: string;
    prune_source_branch?: boolean;
    draft?: boolean;
    squash?: boolean;
    squash_commit_message?: string;
    fork_path?: string;
    close_related_issue?: boolean;
  }): Promise<GitcodePullRequest> {
    const body: Record<string, unknown> = {
      title: params.title,
      head: params.head,
      base: params.base,
    };

    // Add optional parameters
    if (params.body) body.body = params.body;
    if (params.milestone_number) body.milestone_number = params.milestone_number;
    if (params.labels) body.labels = params.labels;
    if (params.issue) body.issue = params.issue;
    if (params.assignees) body.assignees = params.assignees;
    if (params.testers) body.testers = params.testers;
    if (params.prune_source_branch) body.prune_source_branch = params.prune_source_branch;
    if (params.draft) body.draft = params.draft;
    if (params.squash) body.squash = params.squash;
    if (params.squash_commit_message) body.squash_commit_message = params.squash_commit_message;
    if (params.fork_path) body.fork_path = params.fork_path;
    if (params.close_related_issue) body.close_related_issue = params.close_related_issue;

    const response = await this.client.post(
      `/repos/${params.owner}/${params.repo}/pulls`,
      body,
      { params: this.withToken() }
    );
    return this.normalizePullRequestResponse(response.data);
  }
}