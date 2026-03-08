import { contextBridge, ipcRenderer } from 'electron';

// 허용된 IPC 채널 목록 (allowlist)
const ALLOWED_SEND_CHANNELS: string[] = []
const ALLOWED_RECEIVE_CHANNELS: string[] = [
  'worktree:progress',
  'claude-config:progress',
  'queue:status-update',
  'queue:log'
]
const ALLOWED_INVOKE_CHANNELS: string[] = [
  'app:ping', 'app:version',
  'repo:add', 'repo:list', 'repo:remove', 'repo:validate',
  'workdir-set:create', 'workdir-set:list', 'workdir-set:get',
  'workdir-set:update', 'workdir-set:delete',
  'worktree:list-branches', 'worktree:fetch', 'worktree:create-all', 'worktree:select-path',
  'worktree:list-by-repo', 'worktree:delete-worktree',
  'claude-config:detect',
  'claude-config:copy-all',
  'claude-config:reset',
  'terminal:open',
  'workspace:list',
  'workspace:create', 'workspace:update', 'workspace:delete',
  'queue:enqueue',
  'queue:dequeue',
  'queue:abort',
  'queue:status',
  'queue:security-warning'
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
