import { app, BrowserWindow, ipcMain } from 'electron';
import path = require('path');
import { getWindowOptions, handleWindowAllClosed, handlePing, handleVersion } from './window';
import { handleReset } from './handlers/claudeConfigHandlers';
import { handleOpenTerminal } from './handlers/terminalHandlers';
import { handleWikiHostStart, handleWikiHostStop, handleWikiHostStatus, handleWikiHostOpenBrowser, cleanupWikiHost } from './handlers/wikiHostHandlers';
import { handleListMergeBranches } from './handlers/mergeHandlers';
import {
  handleProjectList, handleProjectGet, handleProjectCreate, handleProjectClone,
  handleProjectUpdate, handleProjectDelete, handleProjectSetActive, handleProjectGetActive,
  handleProjectGetDashboard, handleProjectGetConfigStatus,
  handleRepoAdd, handleRepoRemove, handleRepoList, handleSyncSubmodules,
  handleSelectDirectory,
} from './handlers/projectHandlers';
import {
  handleIssueList, handleIssueGet, handleIssueCreate, handleIssueUpdate,
  handleIssueDelete, handleIssueTransition, handleIssueGetDetail, handleIssueSetDetail,
  handleIssueStart, handleIssueAbort, handleIssueRetry,
} from './handlers/issueHandlers';
import { handleSettingsGet, handleSettingsUpdate, handleDockerCheck } from './handlers/settingsHandlers';

function createWindow() {
  const win = new BrowserWindow(getWindowOptions())
  win.loadFile(path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html'))
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools()
  }
}

// === App ===
ipcMain.handle('app:ping', handlePing)
ipcMain.handle('app:version', handleVersion)
ipcMain.handle('app:settings:get', handleSettingsGet)
ipcMain.handle('app:settings:update', handleSettingsUpdate)
ipcMain.handle('app:docker:check', handleDockerCheck)

// === Project ===
ipcMain.handle('project:list', handleProjectList)
ipcMain.handle('project:get', handleProjectGet)
ipcMain.handle('project:create', handleProjectCreate)
ipcMain.handle('project:clone', handleProjectClone)
ipcMain.handle('project:update', handleProjectUpdate)
ipcMain.handle('project:delete', handleProjectDelete)
ipcMain.handle('project:set-active', handleProjectSetActive)
ipcMain.handle('project:get-active', handleProjectGetActive)
ipcMain.handle('project:get-dashboard', handleProjectGetDashboard)
ipcMain.handle('project:get-config-status', handleProjectGetConfigStatus)

// === Dev Repo (Submodule) ===
ipcMain.handle('project:repo:add', handleRepoAdd)
ipcMain.handle('project:repo:remove', handleRepoRemove)
ipcMain.handle('project:repo:list', handleRepoList)
ipcMain.handle('project:repo:sync-submodules', handleSyncSubmodules)

// === Issue ===
ipcMain.handle('issue:list', handleIssueList)
ipcMain.handle('issue:get', handleIssueGet)
ipcMain.handle('issue:create', handleIssueCreate)
ipcMain.handle('issue:update', handleIssueUpdate)
ipcMain.handle('issue:delete', handleIssueDelete)
ipcMain.handle('issue:transition', handleIssueTransition)
ipcMain.handle('issue:get-detail', handleIssueGetDetail)
ipcMain.handle('issue:set-detail', handleIssueSetDetail)
ipcMain.handle('issue:start', handleIssueStart)
ipcMain.handle('issue:abort', handleIssueAbort)
ipcMain.handle('issue:retry', handleIssueRetry)

// === Dialog ===
ipcMain.handle('dialog:select-directory', handleSelectDirectory)

// === Claude Config (유지) ===
ipcMain.handle('claude-config:reset', handleReset)

// === Terminal (유지) ===
ipcMain.handle('terminal:open', handleOpenTerminal)

// === Wiki (유지) ===
ipcMain.handle('wiki-host:start', handleWikiHostStart)
ipcMain.handle('wiki-host:stop', handleWikiHostStop)
ipcMain.handle('wiki-host:status', handleWikiHostStatus)
ipcMain.handle('wiki-host:open-browser', handleWikiHostOpenBrowser)

// === Merge (유지) ===
ipcMain.handle('merge:list-branches', handleListMergeBranches)

// TODO Phase 2:
// ipcMain.handle('container:*', ...)
// ipcMain.handle('pipeline:*', ...)

app.whenReady().then(() => {
  createWindow();
})

app.on('before-quit', async () => {
  await cleanupWikiHost();
})

app.on('window-all-closed', () => handleWindowAllClosed(app))

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
