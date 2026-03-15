import { app, dialog, BrowserWindow } from 'electron';
import ProjectStore = require('../services/projectStore');
import IssueService = require('../services/issueService');
import GitService = require('../services/gitService');
import ProjectManagerService = require('../services/projectManagerService');

let _projectStore: ProjectStore | null = null;
let _issueService: IssueService | null = null;
let _git: GitService | null = null;
let _manager: ProjectManagerService | null = null;

function getGit(): GitService {
  if (!_git) _git = new GitService();
  return _git;
}

function getProjectStore(): ProjectStore {
  if (!_projectStore) _projectStore = new ProjectStore(app.getPath('userData'));
  return _projectStore;
}

function getIssueService(): IssueService {
  if (!_issueService) _issueService = new IssueService(getGit());
  return _issueService;
}

function getManager(): ProjectManagerService {
  if (!_manager) {
    _manager = new ProjectManagerService(getProjectStore(), getIssueService(), getGit());
  }
  return _manager;
}

// --- Project CRUD ---

async function handleProjectList(): Promise<{ success: boolean; projects?: any[]; error?: string }> {
  try {
    return { success: true, projects: getProjectStore().getAll() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectGet(_event: any, data: { projectId: string }): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const project = getProjectStore().getById(data.projectId);
    if (!project) return { success: false, error: 'PROJECT_NOT_FOUND' };
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectCreate(_event: any, data: { name: string; localBasePath: string; lang?: string }): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const project = await getManager().createProject({
      name: data.name,
      localBasePath: data.localBasePath,
      lang: (data.lang as 'en' | 'ko') || 'ko',
    });
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectImport(_event: any, data: { issueRepoPath: string }): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const project = await getManager().importProject({ issueRepoPath: data.issueRepoPath });
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectUpdate(_event: any, data: { projectId: string; name?: string; settings?: any }): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const project = getProjectStore().update(data.projectId, {
      name: data.name,
      settings: data.settings,
    });
    // .cwb/project-settings.json 동기화
    await getManager().saveProjectSettings(data.projectId).catch(() => {});
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectDelete(_event: any, data: { projectId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    getProjectStore().remove(data.projectId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectSetActive(_event: any, data: { projectId: string }): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const project = getManager().setActiveProject(data.projectId);
    // Notify renderer
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('project:active-changed', { projectId: project.id, projectName: project.name });
    }
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectGetActive(): Promise<{ success: boolean; project?: any }> {
  const project = getManager().getActiveProject();
  return { success: true, project: project || null };
}

async function handleProjectGetDashboard(_event: any, data: { projectId: string }): Promise<{ success: boolean; dashboard?: any; error?: string }> {
  try {
    const dashboard = await getManager().getProjectDashboard(data.projectId);
    return { success: true, dashboard };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleProjectGetConfigStatus(_event: any, data: { projectId: string }): Promise<{ success: boolean; configStatus?: any; error?: string }> {
  try {
    const configStatus = await getManager().getProjectConfigStatus(data.projectId);
    return { success: true, configStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Dev Repo (Submodule) ---

async function handleRepoAdd(_event: any, data: { projectId: string; repoUrl: string; name: string }): Promise<{ success: boolean; repo?: any; error?: string }> {
  try {
    const repo = await getManager().addDevRepo(data.projectId, data.repoUrl, data.name);
    return { success: true, repo };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleRepoRemove(_event: any, data: { projectId: string; repoId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await getManager().removeDevRepo(data.projectId, data.repoId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleRepoList(_event: any, data: { projectId: string }): Promise<{ success: boolean; repos?: any[]; error?: string }> {
  try {
    const project = getProjectStore().getById(data.projectId);
    if (!project) return { success: false, error: 'PROJECT_NOT_FOUND' };
    return { success: true, repos: project.devRepos };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleSyncSubmodules(_event: any, data: { projectId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getProjectStore().getById(data.projectId);
    if (!project) return { success: false, error: 'PROJECT_NOT_FOUND' };
    await getGit().updateSubmodules(project.issueRepoPath, true);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Dialog ---

async function handleSelectDirectory(): Promise<{ success: boolean; path?: string }> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!win) return { success: false };
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { success: false };
  return { success: true, path: result.filePaths[0] };
}

// --- Exports ---

function _resetServices(): void {
  _projectStore = null;
  _issueService = null;
  _git = null;
  _manager = null;
}

export {
  handleProjectList,
  handleProjectGet,
  handleProjectCreate,
  handleProjectImport,
  handleProjectUpdate,
  handleProjectDelete,
  handleProjectSetActive,
  handleProjectGetActive,
  handleProjectGetDashboard,
  handleProjectGetConfigStatus,
  handleRepoAdd,
  handleRepoRemove,
  handleRepoList,
  handleSyncSubmodules,
  handleSelectDirectory,
  getManager,
  _resetServices,
};
