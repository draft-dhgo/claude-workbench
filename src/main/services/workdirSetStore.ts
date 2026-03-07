import fs = require('fs');
import path = require('path');
import crypto = require('crypto');
import { RepoRef, WorkdirSet, WorkdirSetFileV2 } from '../../shared/types/models';

class WorkdirSetStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'workdir-sets.json')
  }

  _load(): WorkdirSet[] {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf-8')
      const data = JSON.parse(raw)
      if (data.version === 1) {
        return this._migrateV1(data)
      }
      return Array.isArray(data.sets) ? data.sets : []
    } catch {
      return []
    }
  }

  _migrateV1(data: { version: number; sets: any[] }): WorkdirSet[] {
    try {
      const migratedSets = data.sets.map((set: any) => ({
        ...set,
        repositories: (set.repositoryIds || []).map((id: string) => ({ id, baseBranch: '' }))
      }))
      migratedSets.forEach((set: any) => delete set.repositoryIds)
      this._save(migratedSets)
      return migratedSets
    } catch (err) {
      try {
        fs.renameSync(this._filePath, this._filePath + '.bak')
      } catch { /* 백업 실패 무시 */ }
      this._save([])
      return []
    }
  }

  _save(sets: WorkdirSet[]): void {
    const data: WorkdirSetFileV2 = { version: 2, sets }
    fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  getAll(): WorkdirSet[] {
    return this._load()
  }

  getById(id: string): WorkdirSet | null {
    const sets = this._load()
    return sets.find(s => s.id === id) || null
  }

  create(name: string, repositories: RepoRef[]): WorkdirSet {
    const trimmed = (name || '').trim()
    if (!trimmed) throw new Error('EMPTY_NAME')

    const sets = this._load()
    if (sets.some(s => s.name === trimmed)) {
      throw new Error('DUPLICATE_NAME')
    }

    const now = new Date().toISOString()
    const set: WorkdirSet = {
      id: crypto.randomUUID(),
      name: trimmed,
      repositories: repositories || [],
      createdAt: now,
      updatedAt: now
    }

    sets.push(set)
    this._save(sets)
    return set
  }

  update(id: string, updates: { name?: string; repositories?: RepoRef[] }): WorkdirSet {
    const sets = this._load()
    const idx = sets.findIndex(s => s.id === id)
    if (idx === -1) throw new Error('NOT_FOUND')

    if (updates.name !== undefined) {
      const trimmed = (updates.name || '').trim()
      if (!trimmed) throw new Error('EMPTY_NAME')
      if (sets.some(s => s.name === trimmed && s.id !== id)) {
        throw new Error('DUPLICATE_NAME')
      }
      sets[idx].name = trimmed
    }

    if (updates.repositories !== undefined) {
      sets[idx].repositories = updates.repositories
    }

    sets[idx].updatedAt = new Date().toISOString()
    this._save(sets)
    return sets[idx]
  }

  remove(id: string): boolean {
    const sets = this._load()
    const idx = sets.findIndex(s => s.id === id)
    if (idx === -1) return false
    sets.splice(idx, 1)
    this._save(sets)
    return true
  }

  removeRepoFromAllSets(repoId: string): void {
    const sets = this._load()
    let changed = false
    for (const set of sets) {
      const before = set.repositories.length
      set.repositories = set.repositories.filter(r => r.id !== repoId)
      if (set.repositories.length !== before) changed = true
    }
    if (changed) this._save(sets)
  }
}

export = WorkdirSetStore;
