import { app, BrowserWindow, ipcMain } from 'electron';
import path = require('path');
import { getWindowOptions, handleWindowAllClosed, handlePing, handleVersion } from './window';
import { handleRepoAdd, handleRepoList, handleRepoRemove, handleRepoValidate } from './handlers/repoHandlers';
import { handleSetCreate, handleSetList, handleSetGet, handleSetUpdate, handleSetDelete } from './handlers/workdirSetHandlers';
import { handleListBranches, handleFetch, handleCreateAll, handleSelectPath, handleListByRepo, handleDeleteWorktree } from './handlers/worktreeHandlers';
import { handleDetect, handleCopyAll, handleReset } from './handlers/claudeConfigHandlers';
import { handleOpenTerminal } from './handlers/terminalHandlers';
import { handleList, handleCreate, handleUpdate, handleDelete } from './handlers/workspaceHandlers';
import { handleEnqueue, handleDequeue, handleAbort, handleStatus, handleSecurityWarning } from './handlers/commandQueueHandlers';

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

// Claude 구성 핸들러 등록
ipcMain.handle('claude-config:detect',   handleDetect)
ipcMain.handle('claude-config:copy-all', handleCopyAll)
ipcMain.handle('claude-config:reset',    handleReset)

// Terminal 핸들러 등록
ipcMain.handle('terminal:open', handleOpenTerminal)

// Workspace 핸들러 등록
ipcMain.handle('workspace:list', handleList)
ipcMain.handle('workspace:create', handleCreate)
ipcMain.handle('workspace:update', handleUpdate)
ipcMain.handle('workspace:delete', handleDelete)

// Command Queue 핸들러 등록
ipcMain.handle('queue:enqueue', handleEnqueue)
ipcMain.handle('queue:dequeue', handleDequeue)
ipcMain.handle('queue:abort', handleAbort)
ipcMain.handle('queue:status', handleStatus)
ipcMain.handle('queue:security-warning', handleSecurityWarning)

app.whenReady().then(createWindow)

app.on('window-all-closed', () => handleWindowAllClosed(app))

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
