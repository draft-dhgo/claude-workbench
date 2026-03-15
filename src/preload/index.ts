import { contextBridge, ipcRenderer } from 'electron';

// 허용된 IPC 채널 목록 (allowlist)
const ALLOWED_SEND_CHANNELS: string[] = []

const ALLOWED_RECEIVE_CHANNELS: string[] = [
  // Wiki
  'wiki-host:status-update',
  // Merge
  'merge:conflict-detected',
  // Project (신규 — Phase 1.8에서 활성화)
  'project:active-changed',
  // Issue (신규)
  'issue:status-changed',
  'issue:list-updated',
  // Container (신규 — Phase 2)
  'container:pool-updated',
  'container:log',
  'container:status-changed',
  // Pipeline (신규 — Phase 2)
  'pipeline:log',
  'pipeline:status-update',
  'pipeline:rate-limit-status',
  'pipeline:rate-limit-exhausted'
]

const ALLOWED_INVOKE_CHANNELS: string[] = [
  // App
  'app:ping', 'app:version',
  'app:settings:get', 'app:settings:update',
  'app:docker:check',
  // Claude config (유지)
  'claude-config:reset',
  // Terminal (유지)
  'terminal:open',
  // Wiki (유지)
  'wiki-host:start', 'wiki-host:stop', 'wiki-host:status', 'wiki-host:open-browser',
  'wiki-panel:open', 'wiki-panel:close',
  // Merge (유지)
  'merge:resolve-conflict', 'merge:manual-resolve-complete', 'merge:abort', 'merge:list-branches',
  // Dialog
  'dialog:select-directory',
  // Project (신규)
  'project:list', 'project:get', 'project:create', 'project:import', 'project:sync',
  'project:update', 'project:delete', 'project:set-active', 'project:get-active',
  'project:get-dashboard', 'project:get-config-status',
  'project:repo:add', 'project:repo:remove', 'project:repo:list', 'project:repo:sync-submodules',
  // Issue (신규)
  'issue:list', 'issue:get', 'issue:create', 'issue:update', 'issue:delete',
  'issue:transition', 'issue:get-detail', 'issue:set-detail',
  'issue:start', 'issue:abort', 'issue:retry', 'issue:merge', 'issue:reject',
  // Container (신규 — Phase 2)
  'container:pool-status', 'container:get', 'container:get-logs',
  'container:destroy', 'container:destroy-all', 'container:set-max',
  // Pipeline (신규 — Phase 2)
  'pipeline:status', 'pipeline:abort',
  // GitHub
  'github:set-token', 'github:remove-token', 'github:check-connection',
  'github:list-repos', 'github:search-repos',
  // History (유지)
  'history:list', 'history:delete', 'history:clear'
]

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data?: unknown) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (event: any, ...args: unknown[]) => callback(...args))
    }
  },
  invoke: (channel: string, data?: unknown) => {
    if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    return Promise.reject(new Error(`Channel not allowed: ${channel}`))
  }
})
