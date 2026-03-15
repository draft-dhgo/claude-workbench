// ProjectManagerService unit tests

import os = require('os');
import fs = require('fs');
import path = require('path');
import ProjectStore = require('../../../src/main/services/projectStore');
import ProjectManagerService = require('../../../src/main/services/projectManagerService');

// Mock GitService
const mockGit = {
  init: jest.fn().mockResolvedValue(undefined),
  addAll: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue('abc1234'),
  clone: jest.fn().mockResolvedValue(undefined),
  initSubmodules: jest.fn().mockResolvedValue(undefined),
  updateSubmodules: jest.fn().mockResolvedValue(undefined),
  addSubmodule: jest.fn().mockResolvedValue(undefined),
  removeSubmodule: jest.fn().mockResolvedValue(undefined),
};

// Mock IssueService
const mockIssueService = {
  listIssues: jest.fn().mockResolvedValue([]),
  createIssue: jest.fn(),
};

let tmpDir: string;
let projectStore: InstanceType<typeof ProjectStore>;
let service: InstanceType<typeof ProjectManagerService>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-test-pm-'));
  projectStore = new ProjectStore(tmpDir);
  jest.clearAllMocks();
  mockIssueService.listIssues.mockResolvedValue([]);
  service = new ProjectManagerService(projectStore, mockIssueService as any, mockGit as any);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ProjectManagerService.createProject', () => {
  it('creates a project with scaffolded directory structure', async () => {
    const project = await service.createProject({
      name: 'my-project',
      localBasePath: tmpDir,
    });

    expect(project).toBeDefined();
    expect(project.name).toBe('my-project');
    expect(project.issueRepoPath).toBe(path.join(tmpDir, 'my-project-issues'));

    // Verify git init was called
    expect(mockGit.init).toHaveBeenCalledWith(project.issueRepoPath);
    expect(mockGit.addAll).toHaveBeenCalledWith(project.issueRepoPath);
    expect(mockGit.commit).toHaveBeenCalledWith(project.issueRepoPath, 'init: project scaffolding');

    // Verify directory structure
    const issueDir = path.join(tmpDir, 'my-project-issues');
    expect(fs.existsSync(path.join(issueDir, 'issues', 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(issueDir, 'repos', '.gitkeep'))).toBe(true);
    expect(fs.existsSync(path.join(issueDir, 'wiki', 'requirements'))).toBe(true);
    expect(fs.existsSync(path.join(issueDir, 'wiki', 'bugs'))).toBe(true);
  });

  it('creates a valid manifest.json', async () => {
    await service.createProject({ name: 'proj', localBasePath: tmpDir });
    const manifestPath = path.join(tmpDir, 'proj-issues', 'issues', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.version).toBe(1);
    expect(manifest.nextId).toBe(1);
    expect(manifest.issues).toEqual([]);
  });

  it('saves the project to the store', async () => {
    const project = await service.createProject({ name: 'stored', localBasePath: tmpDir });
    const found = projectStore.getById(project.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('stored');
  });

  it('uses ko as default language', async () => {
    const project = await service.createProject({ name: 'default-lang', localBasePath: tmpDir });
    expect(project.settings.lang).toBe('ko');
  });

  it('respects custom language setting', async () => {
    const project = await service.createProject({ name: 'en-proj', localBasePath: tmpDir, lang: 'en' });
    expect(project.settings.lang).toBe('en');
  });
});

describe('ProjectManagerService.setActiveProject', () => {
  it('sets the active project and returns it', async () => {
    const project = await service.createProject({ name: 'active', localBasePath: tmpDir });
    const result = service.setActiveProject(project.id);
    expect(result.id).toBe(project.id);
    expect(service.getActiveProjectId()).toBe(project.id);
  });

  it('throws PROJECT_NOT_FOUND for invalid id', () => {
    expect(() => service.setActiveProject('bad-id')).toThrow('PROJECT_NOT_FOUND');
  });
});

describe('ProjectManagerService.getActiveProject', () => {
  it('returns null when no project is active', () => {
    expect(service.getActiveProject()).toBeNull();
  });

  it('returns the active project', async () => {
    const project = await service.createProject({ name: 'active', localBasePath: tmpDir });
    service.setActiveProject(project.id);
    const active = service.getActiveProject();
    expect(active).not.toBeNull();
    expect(active!.id).toBe(project.id);
  });
});

describe('ProjectManagerService.getActiveProjectId', () => {
  it('returns null when no project is active', () => {
    expect(service.getActiveProjectId()).toBeNull();
  });
});

describe('ProjectManagerService.getProjectDashboard', () => {
  it('returns dashboard with issue stats', async () => {
    const project = await service.createProject({ name: 'dash', localBasePath: tmpDir });
    mockIssueService.listIssues.mockResolvedValue([
      { id: 'ISSUE-001', status: 'created' },
      { id: 'ISSUE-002', status: 'created' },
      { id: 'ISSUE-003', status: 'in-progress' },
    ]);

    const dashboard = await service.getProjectDashboard(project.id);
    expect(dashboard.project.id).toBe(project.id);
    expect(dashboard.issueStats.total).toBe(3);
    expect(dashboard.issueStats.byStatus['created']).toBe(2);
    expect(dashboard.issueStats.byStatus['in-progress']).toBe(1);
    expect(dashboard.containerStats.max).toBe(3);
    expect(dashboard.recentActivity).toEqual([]);
  });

  it('returns empty stats when no issues exist', async () => {
    const project = await service.createProject({ name: 'empty', localBasePath: tmpDir });
    mockIssueService.listIssues.mockResolvedValue([]);
    const dashboard = await service.getProjectDashboard(project.id);
    expect(dashboard.issueStats.total).toBe(0);
    expect(dashboard.issueStats.byStatus).toEqual({});
  });

  it('throws PROJECT_NOT_FOUND for invalid id', async () => {
    await expect(service.getProjectDashboard('bad-id')).rejects.toThrow('PROJECT_NOT_FOUND');
  });
});

describe('ProjectManagerService.addDevRepo', () => {
  it('adds a dev repo via git submodule and stores it', async () => {
    const project = await service.createProject({ name: 'with-repo', localBasePath: tmpDir });
    const repo = await service.addDevRepo(project.id, 'https://github.com/test/frontend.git', 'frontend');

    expect(repo.name).toBe('frontend');
    expect(repo.remoteUrl).toBe('https://github.com/test/frontend.git');
    expect(repo.submodulePath).toBe('repos/frontend');

    // Verify git calls
    expect(mockGit.addSubmodule).toHaveBeenCalledWith(
      project.issueRepoPath,
      'https://github.com/test/frontend.git',
      'repos/frontend'
    );
    expect(mockGit.addAll).toHaveBeenCalled();

    // Verify store
    const updated = projectStore.getById(project.id)!;
    expect(updated.devRepos).toHaveLength(1);
    expect(updated.devRepos[0].name).toBe('frontend');
  });

  it('throws PROJECT_NOT_FOUND for invalid project id', async () => {
    await expect(service.addDevRepo('bad-id', 'url', 'name')).rejects.toThrow('PROJECT_NOT_FOUND');
  });
});

describe('ProjectManagerService.removeDevRepo', () => {
  it('removes a dev repo via git submodule and store', async () => {
    const project = await service.createProject({ name: 'rm-repo', localBasePath: tmpDir });
    const repo = await service.addDevRepo(project.id, 'https://github.com/test/api.git', 'api');

    await service.removeDevRepo(project.id, repo.id);

    expect(mockGit.removeSubmodule).toHaveBeenCalledWith(project.issueRepoPath, 'repos/api');

    const updated = projectStore.getById(project.id)!;
    expect(updated.devRepos).toHaveLength(0);
  });

  it('throws PROJECT_NOT_FOUND for invalid project id', async () => {
    await expect(service.removeDevRepo('bad-id', 'repo-id')).rejects.toThrow('PROJECT_NOT_FOUND');
  });

  it('throws REPO_NOT_FOUND for invalid repo id', async () => {
    const project = await service.createProject({ name: 'no-repo', localBasePath: tmpDir });
    await expect(service.removeDevRepo(project.id, 'bad-repo-id')).rejects.toThrow('REPO_NOT_FOUND');
  });

  it('still removes from store even if git submodule removal fails', async () => {
    const project = await service.createProject({ name: 'fail-rm', localBasePath: tmpDir });
    const repo = await service.addDevRepo(project.id, 'https://github.com/test/lib.git', 'lib');

    mockGit.removeSubmodule.mockRejectedValueOnce(new Error('git error'));

    await service.removeDevRepo(project.id, repo.id);

    const updated = projectStore.getById(project.id)!;
    expect(updated.devRepos).toHaveLength(0);
  });
});

describe('ProjectManagerService.importProject', () => {
  it('imports from local path with .cwb/project-settings.json', async () => {
    const created = await service.createProject({ name: 'importable', localBasePath: tmpDir });
    const repoPath = created.issueRepoPath;

    // Mock git init doesn't create .git, so create it manually
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });

    // Remove from store (simulate fresh import)
    projectStore.remove(created.id);

    const imported = await service.importProject({ source: repoPath });
    expect(imported.name).toBe('importable');
    expect(imported.issueRepoPath).toBe(repoPath);
  });

  it('imports from git URL by cloning', async () => {
    // Setup: create a project first, then import via URL
    const created = await service.createProject({ name: 'url-import', localBasePath: tmpDir });
    const repoPath = created.issueRepoPath;
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
    projectStore.remove(created.id);

    // Mock clone to just verify it was called
    const cloneDest = path.join(tmpDir, 'cloned', 'url-import-issues');
    mockGit.clone.mockImplementation(async (url: string, dest: string) => {
      // Copy the source to dest to simulate clone
      fs.cpSync(repoPath, dest, { recursive: true });
    });

    const imported = await service.importProject({
      source: 'https://github.com/org/url-import-issues.git',
      localBasePath: path.join(tmpDir, 'cloned'),
    });

    expect(mockGit.clone).toHaveBeenCalledWith(
      'https://github.com/org/url-import-issues.git',
      expect.stringContaining('url-import-issues')
    );
    expect(imported.name).toBe('url-import');
  });

  it('throws DIRECTORY_NOT_FOUND for non-existent local path', async () => {
    await expect(service.importProject({ source: '/nonexistent' }))
      .rejects.toThrow('DIRECTORY_NOT_FOUND');
  });

  it('throws CWB_SETTINGS_NOT_FOUND when .cwb/project-settings.json is missing', async () => {
    const emptyDir = path.join(tmpDir, 'empty-repo');
    fs.mkdirSync(path.join(emptyDir, '.git'), { recursive: true });
    await expect(service.importProject({ source: emptyDir }))
      .rejects.toThrow('CWB_SETTINGS_NOT_FOUND');
  });

  it('throws LOCAL_BASE_PATH_REQUIRED when importing URL without localBasePath', async () => {
    await expect(service.importProject({ source: 'https://github.com/org/repo.git' }))
      .rejects.toThrow('LOCAL_BASE_PATH_REQUIRED');
  });
});

describe('ProjectManagerService.getProjectConfigStatus', () => {
  it('returns config status for a project', async () => {
    const project = await service.createProject({ name: 'config-check', localBasePath: tmpDir });
    const status = await service.getProjectConfigStatus(project.id);

    expect(status.issueRepoValid).toBeDefined();
    expect(status.hasClaudeDir).toBeDefined();
    expect(status.hasClaudeMd).toBeDefined();
    expect(status.commandCount).toBeDefined();
    expect(status.skillCount).toBeDefined();
    expect(status.wikiAvailable).toBeDefined();
    expect(status.submodulesInitialized).toBe(true); // no devRepos, so all initialized
  });

  it('throws PROJECT_NOT_FOUND for invalid id', async () => {
    await expect(service.getProjectConfigStatus('bad-id')).rejects.toThrow('PROJECT_NOT_FOUND');
  });
});
