import fs = require('fs');
import path = require('path');
import crypto = require('crypto');
import { Project, ProjectFile, DevRepoRef, ProjectSettings, DEFAULT_PROJECT_SETTINGS } from '../../shared/types/project';

/**
 * 프로젝트 영속 스토어
 * 파일: {userData}/projects.json
 */
class ProjectStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'projects.json');
  }

  getAll(): Project[] {
    return this._load().projects;
  }

  getById(id: string): Project | null {
    return this._load().projects.find(p => p.id === id) ?? null;
  }

  create(data: {
    name: string;
    issueRepoPath: string;
    localBasePath: string;
    settings?: Partial<ProjectSettings>;
  }): Project {
    const file = this._load();
    const name = data.name.trim();

    if (!name) throw new Error('PROJECT_NAME_REQUIRED');
    if (file.projects.some(p => p.name === name)) throw new Error('PROJECT_NAME_DUPLICATE');

    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      issueRepoPath: data.issueRepoPath,
      devRepos: [],
      localBasePath: data.localBasePath,
      settings: { ...DEFAULT_PROJECT_SETTINGS, ...data.settings },
      createdAt: now,
      updatedAt: now,
    };

    file.projects.push(project);
    this._save(file);
    return project;
  }

  update(id: string, updates: Partial<Pick<Project, 'name' | 'settings'>>): Project {
    const file = this._load();
    const idx = file.projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('PROJECT_NOT_FOUND');

    const project = file.projects[idx];

    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) throw new Error('PROJECT_NAME_REQUIRED');
      if (file.projects.some(p => p.name === name && p.id !== id)) throw new Error('PROJECT_NAME_DUPLICATE');
      project.name = name;
    }

    if (updates.settings) {
      project.settings = { ...project.settings, ...updates.settings };
    }

    project.updatedAt = new Date().toISOString();
    this._save(file);
    return project;
  }

  remove(id: string): boolean {
    const file = this._load();
    const idx = file.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    file.projects.splice(idx, 1);
    this._save(file);
    return true;
  }

  addDevRepo(projectId: string, repo: Omit<DevRepoRef, 'id' | 'addedAt'>): DevRepoRef {
    const file = this._load();
    const project = file.projects.find(p => p.id === projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    if (project.devRepos.some(r => r.name === repo.name)) {
      throw new Error('REPO_NAME_DUPLICATE');
    }

    const devRepo: DevRepoRef = {
      id: crypto.randomUUID(),
      name: repo.name,
      remoteUrl: repo.remoteUrl,
      submodulePath: repo.submodulePath,
      addedAt: new Date().toISOString(),
    };

    project.devRepos.push(devRepo);
    project.updatedAt = new Date().toISOString();
    this._save(file);
    return devRepo;
  }

  removeDevRepo(projectId: string, repoId: string): boolean {
    const file = this._load();
    const project = file.projects.find(p => p.id === projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const idx = project.devRepos.findIndex(r => r.id === repoId);
    if (idx === -1) return false;

    project.devRepos.splice(idx, 1);
    project.updatedAt = new Date().toISOString();
    this._save(file);
    return true;
  }

  private _load(): ProjectFile {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data.version === 1 && Array.isArray(data.projects)) {
        return data as ProjectFile;
      }
    } catch {
      // 파일 없거나 파싱 실패
    }
    return { version: 1, projects: [] };
  }

  private _save(file: ProjectFile): void {
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this._filePath, JSON.stringify(file, null, 2), 'utf-8');
  }
}

export = ProjectStore;
