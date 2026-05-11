/**
 * Gitcode MCP Server - Type Definitions
 * Based on Gitcode API documentation
 */

// Issue types (based on GET /repos/:owner/:repo/issues/:number)
export interface GitcodeIssue {
  id: number;
  html_url: string;
  number: string;  // Gitcode uses string for issue number
  state: string;
  title: string;
  body: string;
  user: GitcodeUser;
  repository: GitcodeRepository;
  created_at: string;
  updated_at: string;
  finished_at?: string;
  labels: GitcodeLabel[];
  issue_state: string;
  comments: number;
  priority: number;
  issue_type: string;
  issue_state_detail?: GitcodeIssueStateDetail;
  issue_type_detail?: GitcodeIssueTypeDetail;
  issue_priority_detail?: GitcodeIssuePriorityDetail;
  milestone?: GitcodeMilestone;
  custom_fields?: GitcodeCustomField[];
  visibility_reason?: string;
}

export interface GitcodeLabel {
  id: number;
  name: string;
  color: string;
}

export interface GitcodeUser {
  id: string;  // Gitcode uses string for user id
  login: string;
  name?: string;
  avatar_url?: string;
  html_url?: string;
  assignee?: boolean;
  code_owner?: boolean;
  accept?: boolean;
}

export interface GitcodeMilestone {
  created_at?: string;
  description?: string;
  due_on?: string;
  number: number;
  repository_id?: number;
  state: string;
  title: string;
  updated_at?: string;
  url?: string;
}

export interface GitcodeRepository {
  id: number;
  full_name: string;
  path: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  assigner?: Record<string, unknown>;
  paas?: string;
}

export interface GitcodeIssueStateDetail {
  title: string;
  serial: number;
  id: number;
}

export interface GitcodeIssueTypeDetail {
  title: string;
  id: number;
  is_system?: boolean;
}

export interface GitcodeIssuePriorityDetail {
  id: string;
  title: string;
}

export interface GitcodeCustomField {
  field_name: string;
  field_type: string;
  field_visibility: string;
  field_values: string[];
}

// Pull Request types (based on GET /repos/:owner/:repo/pulls/:number)
export interface GitcodePullRequest {
  id: number;
  html_url: string;
  number: number;
  state: string;
  title: string;
  url: string;
  issue_url?: string;
  body: string;
  assignees_number?: number;
  assignees?: GitcodeUser[];
  testers?: GitcodeUser[];
  approval_reviewers?: GitcodeApprovalReviewer[];
  labels?: GitcodeLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  draft: boolean;
  can_merge_check?: boolean;
  prune_branch?: boolean;
  mergeable: boolean;
  user: GitcodeUser;
  head: GitcodePRBranch;
  base: GitcodePRBranch;
  mergeable_state?: GitcodeMergeableState;
  milestone?: GitcodeMilestone;
  visibility_reason?: string;
  merged_by?: GitcodeUser;
  close_related_issue?: boolean;
}

export interface GitcodeApprovalReviewer extends GitcodeUser {
  avatar_url?: string;
}

export interface GitcodePRBranch {
  ref: string;
  sha: string;
  label: string;
  repo?: {
    path: string;
    name: string;
    namespace: {
      path: string;
    };
    full_name: string;
    html_url: string;
  };
  user?: GitcodeUser;
}

export interface GitcodeMergeableState {
  merge_request_id?: number;
  state?: boolean;
  status_without_user_auth?: boolean;
  conflict_passed?: boolean;
  branch_missing_passed?: boolean;
  non_ff_passed?: boolean;
  mr_state_passed?: boolean;
  merged_by_user_passed?: boolean;
  work_in_progress_passed?: boolean;
  resolve_discussion_passed?: boolean;
  ci_state_passed?: boolean;
  merge_by_self_passed?: boolean;
  can_force_merge?: boolean;
  approval_reviewers_required_passed?: boolean;
  approval_approvers_required_passed?: boolean;
  approval_testers_required_passed?: boolean;
  merge_request_switch?: GitcodeMergeRequestSwitch;
  reason?: Record<string, unknown>;
  check_tasks_num?: number;
  all_depend_merge_request_merged_passed?: boolean;
  approval_approvers_result?: number;
  approval_testers_result?: number;
}

export interface GitcodeMergeRequestSwitch {
  review_mode?: string;
  merge_method?: string;
  only_allow_merge_if_all_discussions_are_resolved?: boolean;
  disable_merge_by_self?: boolean;
  only_allow_merge_if_pipeline_succeeds?: boolean;
  disable_squash_merge?: boolean;
  squash_merge_with_no_merge_commit?: boolean;
  approval_required_reviewers_count?: number;
  approval_required_reviewers_branch?: string;
  add_notes_after_merged?: boolean;
  mark_auto_merged_mr_as_closed?: boolean;
  can_force_merge?: boolean;
  can_reopen?: boolean;
}

// Tool parameter types
export interface GetIssueParams {
  owner: string;
  repo: string;
  issue_number: string;  // Gitcode uses string
}

export interface GetPullRequestParams {
  owner: string;
  repo: string;
  pull_number: number;
}

// Placeholder for list/create - will be updated when docs are provided
export interface ListIssuesParams {
  owner: string;
  repo: string;
  state?: string;
  labels?: string;
  sort?: string;
  direction?: string;
  page?: number;
  per_page?: number;
}

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface ListPullRequestsParams {
  owner: string;
  repo: string;
  state?: string;
  head?: string;
  base?: string;
  sort?: string;
  direction?: string;
  page?: number;
  per_page?: number;
}

export interface CreatePullRequestParams {
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
}

// Issue 评论
export interface CreateIssueCommentParams {
  owner: string;
  repo: string;
  issue_number: string;
  body: string;
}

export interface CreateIssueCommentResult {
  id: number;
  body: string;
}

export interface ListIssueCommentsParams {
  owner: string;
  repo: string;
  issue_number: string;
  page?: number;
  per_page?: number;
  order?: string;
  since?: string;
}

export interface GitcodeIssueCommentTarget {
  issue: {
    id: number;
    title: string;
    number: number;
  };
}

export interface GitcodeIssueComment {
  id: number;
  body: string;
  user: GitcodeUser;
  created_at: string;
  updated_at: string;
  target?: GitcodeIssueCommentTarget;
}

// Pull Request 评论
export interface CreatePullRequestCommentParams {
  owner: string;
  repo: string;
  pull_number: number;
  body: string;
  path?: string;
  position?: number;
}

export interface CreatePullRequestCommentResult {
  id: string;
  body: string;
}

export interface ListPullRequestCommentsParams {
  owner: string;
  repo: string;
  pull_number: number;
  page?: number;
  per_page?: number;
  direction?: string;
  comment_type?: string;
}

export interface GitcodeDiffPosition {
  start_new_line: number;
  end_new_line: number;
  start_old_line: number;
  end_old_line: number;
}

export interface GitcodePullRequestCommentReply {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: GitcodeUser;
}

export interface GitcodePullRequestComment {
  id: number;
  discussion_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user: GitcodeUser;
  comment_type: string;
  resolved: boolean;
  diff_file: string;
  diff_position: GitcodeDiffPosition;
  reply: GitcodePullRequestCommentReply[];
}

// Update Issue
export interface UpdateIssueParams {
  owner: string;
  repo: string;
  issue_number: string;
  title?: string;
  body?: string;
  state?: string;
  assignee?: string;
  milestone?: number;
  labels?: string;
  security_hole?: string;
  status?: string;
  issue_severity?: string;
  custom_fields?: Record<string, unknown>[];
}

// Update Pull Request
export interface UpdatePullRequestParams {
  owner: string;
  repo: string;
  pull_number: number;
  title?: string;
  body?: string;
  state?: string;
  milestone_number?: number;
  labels?: string;
  draft?: boolean;
  close_related_issue?: boolean;
}
