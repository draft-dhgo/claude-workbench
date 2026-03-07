import { dialog, app } from 'electron';
import { exec } from 'child_process';
import fs = require('fs');
import path = require('path');
import RepoStore = require('../services/repoStore');

let _store: InstanceType<typeof RepoStore> | null;
function getStore() {
  if (!_store) {
    _store = new RepoStore(app.getPath('userData'))
  }
  return _store
}

async function handleRepoAdd(event: any) {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'CANCELLED' }
  }

  const repoPath = result.filePaths[0]
  const gitDir = path.join(repoPath, '.git')

  if (!fs.existsSync(gitDir)) {
    return { success: false, error: 'NOT_GIT_REPO' }
  }

  try {
    const repo = getStore().add(repoPath)
    return { success: true, repo }
  } catch (err: any) {
    if (err.message === 'DUPLICATE_PATH') {
      return { success: false, error: 'DUPLICATE_PATH' }
    }
    return { success: false, error: err.message }
  }
}

function getBranch(repoPath: string): Promise<string> {
  return new Promise((resolve) => {
    exec('git branch --show-current', { cwd: repoPath }, (err, stdout) => {
      if (err) return resolve('unknown')
      resolve(stdout.trim() || 'unknown')
    })
  })
}

async function handleRepoList() {
  const repos = getStore().getAll()
  const reposWithBranch = await Promise.all(
    repos.map(async (repo) => {
      const branch = await getBranch(repo.path)
      return { ...repo, branch }
    })
  )
  return { success: true, repos: reposWithBranch }
}

async function handleRepoRemove(event: any, id: string) {
  const removed = getStore().remove(id)
  return { success: removed }
}

async function handleRepoValidate(event: any, id: string) {
  const repos = getStore().getAll()
  const repo = repos.find(r => r.id === id)
  if (!repo) return { valid: false, error: 'NOT_FOUND' }

  if (!fs.existsSync(repo.path)) {
    return { valid: false, error: 'PATH_NOT_FOUND' }
  }
  if (!fs.existsSync(path.join(repo.path, '.git'))) {
    return { valid: false, error: 'NOT_GIT_REPO' }
  }
  return { valid: true }
}

// Reset store (for testing)
function _resetStore() { _store = null }

export { handleRepoAdd, handleRepoList, handleRepoRemove, handleRepoValidate, _resetStore };
