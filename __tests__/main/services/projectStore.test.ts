// ProjectStore unit tests

import os = require('os');
import fs = require('fs');
import path = require('path');
import ProjectStore = require('../../../src/main/services/projectStore');

let tmpDir: string;
let store: InstanceType<typeof ProjectStore>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-test-projects-'));
  store = new ProjectStore(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createTestProject(name = 'test-project') {
  return store.create({
    name,
    issueRepoPath: `/repos/${name}-issues`,
    localBasePath: `/base/${name}`,
  });
}

describe('ProjectStore.getAll', () => {
  it('returns empty array when no projects file exists', () => {
    expect(store.getAll()).toEqual([]);
  });

  it('returns all created projects', () => {
    createTestProject('alpha');
    createTestProject('beta');
    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('alpha');
    expect(all[1].name).toBe('beta');
  });

  it('returns empty array when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'projects.json'), 'bad json', 'utf-8');
    expect(store.getAll()).toEqual([]);
  });
});

describe('ProjectStore.getById', () => {
  it('returns project by id', () => {
    const created = createTestProject();
    const found = store.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('test-project');
  });

  it('returns null for non-existent id', () => {
    expect(store.getById('non-existent-id')).toBeNull();
  });
});

describe('ProjectStore.create', () => {
  it('creates a project with all required fields', () => {
    const project = createTestProject();
    expect(project.id).toBeDefined();
    expect(project.name).toBe('test-project');
    expect(project.issueRepoPath).toBe('/repos/test-project-issues');
    expect(project.localBasePath).toBe('/base/test-project');
    expect(project.devRepos).toEqual([]);
    expect(project.createdAt).toBeDefined();
    expect(project.updatedAt).toBeDefined();
    expect(project.settings).toBeDefined();
    expect(project.settings.maxContainers).toBe(3);
  });

  it('trims whitespace from name', () => {
    const project = store.create({
      name: '  trimmed-name  ',
      issueRepoPath: '/repo',
      localBasePath: '/base',
    });
    expect(project.name).toBe('trimmed-name');
  });

  it('throws PROJECT_NAME_REQUIRED for empty name', () => {
    expect(() =>
      store.create({ name: '', issueRepoPath: '/repo', localBasePath: '/base' })
    ).toThrow('PROJECT_NAME_REQUIRED');
  });

  it('throws PROJECT_NAME_REQUIRED for whitespace-only name', () => {
    expect(() =>
      store.create({ name: '   ', issueRepoPath: '/repo', localBasePath: '/base' })
    ).toThrow('PROJECT_NAME_REQUIRED');
  });

  it('throws PROJECT_NAME_DUPLICATE for duplicate names', () => {
    createTestProject('unique');
    expect(() =>
      store.create({ name: 'unique', issueRepoPath: '/repo2', localBasePath: '/base2' })
    ).toThrow('PROJECT_NAME_DUPLICATE');
  });

  it('merges custom settings with defaults', () => {
    const project = store.create({
      name: 'custom',
      issueRepoPath: '/repo',
      localBasePath: '/base',
      settings: { maxContainers: 5, lang: 'en' },
    });
    expect(project.settings.maxContainers).toBe(5);
    expect(project.settings.lang).toBe('en');
    expect(project.settings.autoMerge).toBe(true); // default
  });

  it('persists the project to disk', () => {
    const project = createTestProject();
    // Create a new store instance to verify persistence
    const store2 = new ProjectStore(tmpDir);
    const found = store2.getById(project.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('test-project');
  });
});

describe('ProjectStore.update', () => {
  it('updates project name', () => {
    const project = createTestProject();
    const updated = store.update(project.id, { name: 'new-name' });
    expect(updated.name).toBe('new-name');
    // updatedAt is set to new Date().toISOString(), verify it exists
    expect(updated.updatedAt).toBeDefined();
  });

  it('updates project settings partially', () => {
    const project = createTestProject();
    const updated = store.update(project.id, { settings: { maxContainers: 10 } as any });
    expect(updated.settings.maxContainers).toBe(10);
    expect(updated.settings.autoMerge).toBe(true); // preserved
  });

  it('throws PROJECT_NOT_FOUND for invalid id', () => {
    expect(() => store.update('bad-id', { name: 'new' })).toThrow('PROJECT_NOT_FOUND');
  });

  it('throws PROJECT_NAME_DUPLICATE when renaming to existing name', () => {
    createTestProject('first');
    const second = createTestProject('second');
    expect(() => store.update(second.id, { name: 'first' })).toThrow('PROJECT_NAME_DUPLICATE');
  });

  it('throws PROJECT_NAME_REQUIRED for empty rename', () => {
    const project = createTestProject();
    expect(() => store.update(project.id, { name: '' })).toThrow('PROJECT_NAME_REQUIRED');
  });

  it('allows renaming to the same name (no duplicate error)', () => {
    const project = createTestProject('same-name');
    const updated = store.update(project.id, { name: 'same-name' });
    expect(updated.name).toBe('same-name');
  });
});

describe('ProjectStore.remove', () => {
  it('removes a project and returns true', () => {
    const project = createTestProject();
    expect(store.remove(project.id)).toBe(true);
    expect(store.getById(project.id)).toBeNull();
    expect(store.getAll()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(store.remove('non-existent')).toBe(false);
  });
});

describe('ProjectStore.addDevRepo', () => {
  it('adds a dev repo to the project', () => {
    const project = createTestProject();
    const repo = store.addDevRepo(project.id, {
      name: 'frontend',
      remoteUrl: 'https://github.com/test/frontend.git',
      submodulePath: 'repos/frontend',
    });
    expect(repo.id).toBeDefined();
    expect(repo.name).toBe('frontend');
    expect(repo.remoteUrl).toBe('https://github.com/test/frontend.git');
    expect(repo.submodulePath).toBe('repos/frontend');
    expect(repo.addedAt).toBeDefined();

    const updated = store.getById(project.id)!;
    expect(updated.devRepos).toHaveLength(1);
    expect(updated.devRepos[0].name).toBe('frontend');
  });

  it('throws PROJECT_NOT_FOUND for invalid project id', () => {
    expect(() =>
      store.addDevRepo('bad-id', { name: 'repo', remoteUrl: 'url', submodulePath: 'path' })
    ).toThrow('PROJECT_NOT_FOUND');
  });

  it('throws REPO_NAME_DUPLICATE for duplicate repo names', () => {
    const project = createTestProject();
    store.addDevRepo(project.id, { name: 'backend', remoteUrl: 'url1', submodulePath: 'repos/backend' });
    expect(() =>
      store.addDevRepo(project.id, { name: 'backend', remoteUrl: 'url2', submodulePath: 'repos/backend2' })
    ).toThrow('REPO_NAME_DUPLICATE');
  });
});

describe('ProjectStore.removeDevRepo', () => {
  it('removes a dev repo and returns true', () => {
    const project = createTestProject();
    const repo = store.addDevRepo(project.id, { name: 'api', remoteUrl: 'url', submodulePath: 'repos/api' });
    expect(store.removeDevRepo(project.id, repo.id)).toBe(true);
    const updated = store.getById(project.id)!;
    expect(updated.devRepos).toHaveLength(0);
  });

  it('returns false for non-existent repo id', () => {
    const project = createTestProject();
    expect(store.removeDevRepo(project.id, 'bad-repo-id')).toBe(false);
  });

  it('throws PROJECT_NOT_FOUND for invalid project id', () => {
    expect(() => store.removeDevRepo('bad-id', 'repo-id')).toThrow('PROJECT_NOT_FOUND');
  });
});
