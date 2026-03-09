import { app, BrowserWindow, ipcMain } from 'electron';
import path = require('path');
import { getWindowOptions, handleWindowAllClosed, handlePing, handleVersion } from './window';
import { handleRepoAdd, handleRepoList, handleRepoRemove, handleRepoValidate } from './handlers/repoHandlers';
import { handleSetCreate, handleSetList, handleSetGet, handleSetUpdate, handleSetDelete } from './handlers/workdirSetHandlers';
import { handleListBranches, handleFetch, handleCreateAll, handleSelectPath, handleListByRepo, handleDeleteWorktree, handleCreateSingle, handleListBranchesSingle, handleFetchSingle, handleListUnpushed, handleDetachWorktree } from './handlers/worktreeHandlers';
import { handleDetect, handleCopyAll, handleReset } from './handlers/claudeConfigHandlers';
import { handleOpenTerminal } from './handlers/terminalHandlers';
import { handleList, handleRegister, handleCreate, handleUpdate, handleDelete } from './handlers/workspaceHandlers';
import { handleEnqueue, handleDequeue, handleRequeue, handleAbort, handleStatus, handleSecurityWarning, handleHistoryList, handleHistoryDelete, handleHistoryClear, initService as initQueueService } from './handlers/commandQueueHandlers';
import { handleWikiHostStart, handleWikiHostStop, handleWikiHostStatus, handleWikiHostOpenBrowser, cleanupWikiHost } from './handlers/wikiHostHandlers';
import { handleSetActive, handleGetActive, handleGetCommands, handleGetSkills, handleGetConfigStatus, handleResetConfig, handleGetQueueSummary, handleRateLimitRetryNow, handleRateLimitCancel } from './handlers/workspaceManagerHandlers';

function createWindow() {
  const win = new BrowserWindow(getWindowOptions())
  win.loadFile(path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html'))
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools()
  }
}

// IPC 핸들러 등록
ipcMain.handle('app:ping', handlePing)
ipcMain.handle('app:version', handleVersion)

// Repo 핸들러 등록
ipcMain.handle('repo:add', handleRepoAdd)
ipcMain.handle('repo:list', handleRepoList)
ipcMain.handle('repo:remove', handleRepoRemove)
ipcMain.handle('repo:validate', handleRepoValidate)

// WorkdirSet 핸들러 등록
ipcMain.handle('workdir-set:create', handleSetCreate)
ipcMain.handle('workdir-set:list', handleSetList)
ipcMain.handle('workdir-set:get', handleSetGet)
ipcMain.handle('workdir-set:update', handleSetUpdate)
ipcMain.handle('workdir-set:delete', handleSetDelete)

// Worktree 핸들러 등록
ipcMain.handle('worktree:list-branches', handleListBranches)
ipcMain.handle('worktree:fetch', handleFetch)
ipcMain.handle('worktree:create-all', handleCreateAll)
ipcMain.handle('worktree:select-path', handleSelectPath)
ipcMain.handle('worktree:list-by-repo', handleListByRepo)
ipcMain.handle('worktree:delete-worktree', handleDeleteWorktree)

// 신규 Worktree 핸들러 등록
ipcMain.handle('worktree:create-single', handleCreateSingle)
ipcMain.handle('worktree:list-branches-single', handleListBranchesSingle)
ipcMain.handle('worktree:fetch-single', handleFetchSingle)
ipcMain.handle('worktree:list-unpushed', handleListUnpushed)
ipcMain.handle('worktree:detach', handleDetachWorktree)

// Claude 구성 핸들러 등록
ipcMain.handle('claude-config:detect',   handleDetect)
ipcMain.handle('claude-config:copy-all', handleCopyAll)
ipcMain.handle('claude-config:reset',    handleReset)

// Terminal 핸들러 등록
ipcMain.handle('terminal:open', handleOpenTerminal)

// Workspace 핸들러 등록
ipcMain.handle('workspace:list', handleList)
ipcMain.handle('workspace:register', handleRegister)
ipcMain.handle('workspace:create', handleCreate)
ipcMain.handle('workspace:update', handleUpdate)
ipcMain.handle('workspace:delete', handleDelete)

// Command Queue 핸들러 등록
ipcMain.handle('queue:enqueue', handleEnqueue)
ipcMain.handle('queue:dequeue', handleDequeue)
ipcMain.handle('queue:requeue', handleRequeue)
ipcMain.handle('queue:abort', handleAbort)
ipcMain.handle('queue:status', handleStatus)
ipcMain.handle('queue:security-warning', handleSecurityWarning)
ipcMain.handle('queue:history:list', handleHistoryList)
ipcMain.handle('queue:history:delete', handleHistoryDelete)
ipcMain.handle('queue:history:clear', handleHistoryClear)

// Wiki Host 핸들러 등록
ipcMain.handle('wiki-host:start', handleWikiHostStart)
ipcMain.handle('wiki-host:stop', handleWikiHostStop)
ipcMain.handle('wiki-host:status', handleWikiHostStatus)
ipcMain.handle('wiki-host:open-browser', handleWikiHostOpenBrowser)

// Workspace Manager 핸들러 등록 (신규)
ipcMain.handle('workspace-mgr:set-active', handleSetActive)
ipcMain.handle('workspace-mgr:get-active', handleGetActive)
ipcMain.handle('workspace-mgr:get-commands', handleGetCommands)
ipcMain.handle('workspace-mgr:get-skills', handleGetSkills)
ipcMain.handle('workspace-mgr:get-config-status', handleGetConfigStatus)
ipcMain.handle('workspace-mgr:reset-config', handleResetConfig)
ipcMain.handle('workspace-mgr:get-queue-summary', handleGetQueueSummary)
ipcMain.handle('workspace-mgr:rate-limit-retry-now', handleRateLimitRetryNow)
ipcMain.handle('workspace-mgr:rate-limit-cancel', handleRateLimitCancel)

app.whenReady().then(() => {
  createWindow();
  initQueueService();
})

// 앱 종료 시 Wiki Host 서버 정리
app.on('before-quit', async () => {
  await cleanupWikiHost();
})

app.on('window-all-closed', () => handleWindowAllClosed(app))

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
