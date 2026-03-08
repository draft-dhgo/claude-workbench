import fs = require('fs');
import path = require('path');
import crypto = require('crypto');
import { StoredWorkspace, WorkspaceFile } from '../../shared/types/models';

class WorkspaceStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'workspaces.json');
  }

  _load(): StoredWorkspace[] {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf-8');
      const data: WorkspaceFile = JSON.parse(raw);
      return Array.isArray(data.workspaces) ? data.workspaces : [];
    } catch {
      return [];
    }
  }

  _save(workspaces: StoredWorkspace[]): void {
    const data: WorkspaceFile = { version: 1, workspaces };
    fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getAll(): StoredWorkspace[] {
    return this._load();
  }

  getById(id: string): StoredWorkspace | null {
    const workspaces = this._load();
    return workspaces.find(w => w.id === id) || null;
  }

  create(name: string, wsPath: string): StoredWorkspace {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('EMPTY_NAME');

    const workspaces = this._load();
    if (workspaces.some(w => w.path === wsPath)) {
      throw new Error('DUPLICATE_PATH');
    }

    const now = new Date().toISOString();
    const workspace: StoredWorkspace = {
      id: crypto.randomUUID(),
      name: trimmed,
      path: wsPath,
      createdAt: now,
      updatedAt: now
    };

    workspaces.push(workspace);
    this._save(workspaces);
    return workspace;
  }

  update(id: string, updates: { name?: string }): StoredWorkspace {
    const workspaces = this._load();
    const idx = workspaces.findIndex(w => w.id === id);
    if (idx === -1) throw new Error('NOT_FOUND');

    if (updates.name !== undefined) {
      const trimmed = (updates.name || '').trim();
      if (!trimmed) throw new Error('EMPTY_NAME');
      workspaces[idx].name = trimmed;
    }

    workspaces[idx].updatedAt = new Date().toISOString();
    this._save(workspaces);
    return workspaces[idx];
  }

  remove(id: string): boolean {
    const workspaces = this._load();
    const idx = workspaces.findIndex(w => w.id === id);
    if (idx === -1) return false;
    workspaces.splice(idx, 1);
    this._save(workspaces);
    return true;
  }
}

export = WorkspaceStore;
