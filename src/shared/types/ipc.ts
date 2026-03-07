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
  | 'claude-config:detect'
  | 'claude-config:copy-all'
  | 'claude-config:reset'
  | 'terminal:open'
  | 'workspace:list';

/** Send (단방향) IPC 채널 — 현재 없음 */
export type SendChannel = never;

/** Receive (메인→렌더러) IPC 채널 */
export type ReceiveChannel =
  | 'worktree:progress'
  | 'claude-config:progress';
