import { app } from 'electron';
import WorkdirSetStore = require('../services/workdirSetStore');
import RepoStore = require('../services/repoStore');

let _setStore: InstanceType<typeof WorkdirSetStore> | null;
let _repoStore: InstanceType<typeof RepoStore> | null;

function getSetStore() {
  if (!_setStore) {
    _setStore = new WorkdirSetStore(app.getPath('userData'))
  }
  return _setStore
}

function getRepoStore() {
  if (!_repoStore) {
    _repoStore = new RepoStore(app.getPath('userData'))
  }
  return _repoStore
}

async function handleSetCreate(event: any, data: { name: string; repositories: any[] }) {
  try {
    const set = getSetStore().create(data.name, data.repositories)
    return { success: true, set }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function handleSetList() {
  const sets = getSetStore().getAll()
  return { success: true, sets }
}

async function handleSetGet(event: any, id: string) {
  const set = getSetStore().getById(id)
  if (!set) return { success: false, error: 'NOT_FOUND' }

  const allRepos = getRepoStore().getAll()
  const repositories = set.repositories
    .map(r => {
      const repoInfo = allRepos.find(repo => repo.id === r.id)
      if (!repoInfo) return null
      return { ...repoInfo, baseBranch: r.baseBranch }
    })
    .filter(Boolean)

  return {
    success: true,
    set: {
      id: set.id,
      name: set.name,
      repositories,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt
    }
  }
}

async function handleSetUpdate(event: any, data: { id: string; name?: string; repositories?: any[] }) {
  try {
    const updates: { name?: string; repositories?: any[] } = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.repositories !== undefined) updates.repositories = data.repositories
    const set = getSetStore().update(data.id, updates)
    return { success: true, set }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function handleSetDelete(event: any, id: string) {
  const removed = getSetStore().remove(id)
  return { success: removed }
}

function _resetStores() {
  _setStore = null
  _repoStore = null
}

export {
  handleSetCreate, handleSetList, handleSetGet,
  handleSetUpdate, handleSetDelete, _resetStores
};
