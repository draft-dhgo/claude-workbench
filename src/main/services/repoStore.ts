import fs = require('fs');
import path = require('path');
import crypto = require('crypto');
import { Repository, RepoFile } from '../../shared/types/models';

class RepoStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'repositories.json')
  }

  _load(): Repository[] {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf-8')
      const data: RepoFile = JSON.parse(raw)
      return Array.isArray(data.repositories) ? data.repositories : []
    } catch {
      return []
    }
  }

  _save(repositories: Repository[]): void {
    const data: RepoFile = { version: 1, repositories }
    fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  getAll(): Repository[] {
    return this._load()
  }

  add(repoPath: string): Repository {
    const normalized = repoPath.replace(/\/+$/, '')
    const repos = this._load()

    if (repos.some(r => r.path === normalized)) {
      throw new Error('DUPLICATE_PATH')
    }

    const repo: Repository = {
      id: crypto.randomUUID(),
      name: path.basename(normalized),
      path: normalized,
      addedAt: new Date().toISOString()
    }

    repos.push(repo)
    this._save(repos)
    return repo
  }

  remove(id: string): boolean {
    const repos = this._load()
    const idx = repos.findIndex(r => r.id === id)
    if (idx === -1) return false
    repos.splice(idx, 1)
    this._save(repos)
    return true
  }

  getById(id: string): Repository | undefined {
    const repos = this._load()
    return repos.find(r => r.id === id)
  }
}

export = RepoStore;
