import { app, BrowserWindow, ipcMain } from 'electron';
import path = require('path');
import { getWindowOptions, handleWindowAllClosed, handlePing, handleVersion } from './window';
import { handleReset } from './handlers/claudeConfigHandlers';
import { handleOpenTerminal } from './handlers/terminalHandlers';
import { handleWikiHostStart, handleWikiHostStop, handleWikiHostStatus, handleWikiHostOpenBrowser, cleanupWikiHost } from './handlers/wikiHostHandlers';
import { handleListMergeBranches } from './handlers/mergeHandlers';
import {
  handleProjectList, handleProjectGet, handleProjectCreate, handleProjectImport, handleProjectSync,
  handleProjectUpdate, handleProjectDelete, handleProjectSetActive, handleProjectGetActive,
  handleProjectGetDashboard, handleProjectGetConfigStatus,
  handleRepoAdd, handleRepoRemove, handleRepoList, handleSyncSubmodules,
  handleSelectDirectory,
} from './handlers/projectHandlers';
import {
  handleIssueList, handleIssueGet, handleIssueCreate, handleIssueUpdate,
  handleIssueDelete, handleIssueTransition, handleIssueGetDetail, handleIssueSetDetail,
  handleIssueStart, handleIssueAbort, handleIssueRetry, handleIssueMerge, handleIssueReject,
} from './handlers/issueHandlers';
import { handleSettingsGet, handleSettingsUpdate, handleDockerCheck } from './handlers/settingsHandlers';
import {
  handlePoolStatus, handleContainerGet, handleContainerGetLogs,
  handleContainerDestroy, handleContainerDestroyAll, handleContainerSetMax,
} from './handlers/containerHandlers';
import { handlePipelineStatus, handlePipelineAbort } from './handlers/pipelineHandlers';
import {
  handleGitHubSetToken, handleGitHubRemoveToken, handleGitHubCheckConnection,
  handleGitHubListRepos, handleGitHubSearchRepos,
} from './handlers/githubHandlers';

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
ipcMain.handle('project:import', handleProjectImport)
ipcMain.handle('project:update', handleProjectUpdate)
ipcMain.handle('project:delete', handleProjectDelete)
ipcMain.handle('project:set-active', handleProjectSetActive)
ipcMain.handle('project:get-active', handleProjectGetActive)
ipcMain.handle('project:get-dashboard', handleProjectGetDashboard)
ipcMain.handle('project:get-config-status', handleProjectGetConfigStatus)
ipcMain.handle('project:sync', handleProjectSync)

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
ipcMain.handle('issue:merge', handleIssueMerge)
ipcMain.handle('issue:reject', handleIssueReject)

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

// === Container Pool ===
ipcMain.handle('container:pool-status', handlePoolStatus)
ipcMain.handle('container:get', handleContainerGet)
ipcMain.handle('container:get-logs', handleContainerGetLogs)
ipcMain.handle('container:destroy', handleContainerDestroy)
ipcMain.handle('container:destroy-all', handleContainerDestroyAll)
ipcMain.handle('container:set-max', handleContainerSetMax)

// === GitHub ===
ipcMain.handle('github:set-token', handleGitHubSetToken)
ipcMain.handle('github:remove-token', handleGitHubRemoveToken)
ipcMain.handle('github:check-connection', handleGitHubCheckConnection)
ipcMain.handle('github:list-repos', handleGitHubListRepos)
ipcMain.handle('github:search-repos', handleGitHubSearchRepos)

// === Pipeline ===
ipcMain.handle('pipeline:status', handlePipelineStatus)
ipcMain.handle('pipeline:abort', handlePipelineAbort)

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
