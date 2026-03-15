/** 지원 UI 언어 */
export type Lang = 'en' | 'ko';

/** Invoke (요청-응답) IPC 채널 */
export type InvokeChannel =
  // App
  | 'app:ping'
  | 'app:version'
  | 'app:settings:get'
  | 'app:settings:update'
  | 'app:docker:check'
  // Project CRUD
  | 'project:list'
  | 'project:get'
  | 'project:create'
  | 'project:import'
  | 'project:update'
  | 'project:delete'
  | 'project:set-active'
  | 'project:get-active'
  | 'project:get-dashboard'
  | 'project:get-config-status'
  | 'project:sync'
  // Dev Repo (submodule) 관리
  | 'project:repo:add'
  | 'project:repo:remove'
  | 'project:repo:list'
  | 'project:repo:sync-submodules'
  // Issue 관리
  | 'issue:list'
  | 'issue:get'
  | 'issue:create'
  | 'issue:update'
  | 'issue:delete'
  | 'issue:transition'
  | 'issue:get-detail'
  | 'issue:set-detail'
  | 'issue:start'
  | 'issue:abort'
  | 'issue:retry'
  // Container pool
  | 'container:pool-status'
  | 'container:get'
  | 'container:get-logs'
  | 'container:destroy'
  | 'container:destroy-all'
  | 'container:set-max'
  // Pipeline
  | 'pipeline:status'
  | 'pipeline:abort'
  // Merge (유지)
  | 'merge:resolve-conflict'
  | 'merge:manual-resolve-complete'
  | 'merge:abort'
  | 'merge:list-branches'
  // Wiki (유지)
  | 'wiki-host:start'
  | 'wiki-host:stop'
  | 'wiki-host:status'
  | 'wiki-host:open-browser'
  | 'wiki-panel:open'
  | 'wiki-panel:close'
  // Terminal (유지)
  | 'terminal:open'
  // Claude config (유지)
  | 'claude-config:reset'
  // History
  | 'history:list'
  | 'history:delete'
  | 'history:clear'
  // Dialog
  | 'dialog:select-directory';

/** Send (단방향) IPC 채널 — 현재 없음 */
export type SendChannel = never;

/** Receive (메인→렌더러) IPC 채널 */
export type ReceiveChannel =
  // Project
  | 'project:active-changed'
  // Issue
  | 'issue:status-changed'
  | 'issue:list-updated'
  // Container pool
  | 'container:pool-updated'
  | 'container:log'
  | 'container:status-changed'
  // Pipeline
  | 'pipeline:log'
  | 'pipeline:status-update'
  | 'pipeline:rate-limit-status'
  | 'pipeline:rate-limit-exhausted'
  // Merge (유지)
  | 'merge:conflict-detected'
  // Wiki (유지)
  | 'wiki-host:status-update';
