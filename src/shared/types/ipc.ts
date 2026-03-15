/** Supported UI languages */
export type Lang = 'en' | 'ko';

/** claude-config:reset request payload */
export interface ClaudeConfigResetPayload {
  workspacePath: string;
  lang?: Lang;
}

/** Invoke (양방향) IPC 채널 */
export type InvokeChannel =
  | 'app:ping'
  | 'app:version'
  | 'repo:add'
  | 'repo:list'
  | 'repo:remove'
  | 'repo:validate'
  | 'workdir-set:create'
  | 'workdir-set:list'
  | 'workdir-set:get'
  | 'workdir-set:update'
  | 'workdir-set:delete'
  | 'worktree:list-branches'
  | 'worktree:fetch'
  | 'worktree:create-all'
  | 'worktree:select-path'
  | 'worktree:list-by-repo'
  | 'worktree:delete-worktree'
  | 'worktree:create-single'
  | 'worktree:list-branches-single'
  | 'worktree:fetch-single'
  | 'worktree:list-unpushed'
  | 'worktree:detach'
  | 'claude-config:detect'
  | 'claude-config:copy-all'
  | 'claude-config:reset'
  | 'terminal:open'
  | 'workspace:list'
  | 'workspace:create'
  | 'workspace:update'
  | 'workspace:delete'
  | 'queue:enqueue'
  | 'queue:dequeue'
  | 'queue:abort'
  | 'queue:status'
  | 'queue:security-warning'
  | 'wiki-host:start'
  | 'wiki-host:stop'
  | 'wiki-host:status'
  | 'wiki-host:open-browser'
  | 'workspace-mgr:set-active'
  | 'workspace-mgr:get-active'
  | 'workspace-mgr:get-commands'
  | 'workspace-mgr:get-skills'
  | 'workspace-mgr:get-config-status'
  | 'workspace-mgr:reset-config'
  | 'workspace-mgr:get-queue-summary'
  | 'workspace-mgr:rate-limit-retry-now'
  | 'workspace-mgr:rate-limit-cancel'
  | 'merge:resolve-conflict'
  | 'merge:manual-resolve-complete'
  | 'merge:abort'
  | 'merge:list-branches'
  | 'wiki-panel:open'
  | 'wiki-panel:close';

/** Send (단방향) IPC 채널 — 현재 없음 */
export type SendChannel = never;

/** Receive (메인→렌더러) IPC 채널 */
export type ReceiveChannel =
  | 'worktree:progress'
  | 'claude-config:progress'
  | 'queue:status-update'
  | 'queue:log'
  | 'wiki-host:status-update'
  | 'workspace:active-changed'
  | 'workspace:rate-limit-status'
  | 'workspace:rate-limit-exhausted'
  | 'merge:conflict-detected';
