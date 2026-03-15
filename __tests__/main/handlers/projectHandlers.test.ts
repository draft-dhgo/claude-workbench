/**
 * projectHandlers unit tests
 * Source: src/main/handlers/projectHandlers.ts
 */

const mockGetAll = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

const mockCreateProject = jest.fn();
const mockCloneProject = jest.fn();
const mockSetActiveProject = jest.fn();
const mockGetActiveProject = jest.fn();
const mockGetProjectDashboard = jest.fn();
const mockGetProjectConfigStatus = jest.fn();
const mockAddDevRepo = jest.fn();
const mockRemoveDevRepo = jest.fn();

const mockInit = jest.fn();
const mockUpdateSubmodules = jest.fn();

let handlers: typeof import('../../../src/main/handlers/projectHandlers');

beforeEach(() => {
  jest.resetModules();

  jest.doMock('../../../src/main/services/projectStore', () => {
    return jest.fn().mockImplementation(() => ({
      getAll: mockGetAll,
      getById: mockGetById,
      create: mockCreate,
      update: mockUpdate,
      remove: mockRemove,
    }));
  });

  jest.doMock('../../../src/main/services/issueService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/gitService', () => {
    return jest.fn().mockImplementation(() => ({
      init: mockInit,
      updateSubmodules: mockUpdateSubmodules,
    }));
  });

  jest.doMock('../../../src/main/services/projectManagerService', () => {
    return jest.fn().mockImplementation(() => ({
      createProject: mockCreateProject,
      cloneProject: mockCloneProject,
      setActiveProject: mockSetActiveProject,
      getActiveProject: mockGetActiveProject,
      getProjectDashboard: mockGetProjectDashboard,
      getProjectConfigStatus: mockGetProjectConfigStatus,
      addDevRepo: mockAddDevRepo,
      removeDevRepo: mockRemoveDevRepo,
    }));
  });

  handlers = require('../../../src/main/handlers/projectHandlers');

  mockGetAll.mockReset();
  mockGetById.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockRemove.mockReset();
  mockCreateProject.mockReset();
  mockCloneProject.mockReset();
  mockSetActiveProject.mockReset();
  mockGetActiveProject.mockReset();
  mockGetProjectDashboard.mockReset();
  mockGetProjectConfigStatus.mockReset();
  mockAddDevRepo.mockReset();
  mockRemoveDevRepo.mockReset();
  mockInit.mockReset();
  mockUpdateSubmodules.mockReset();
});

describe('handleProjectList', () => {
  it('returns all projects on success', async () => {
    const projects = [{ id: 'p1', name: 'Proj1' }, { id: 'p2', name: 'Proj2' }];
    mockGetAll.mockReturnValue(projects);

    const result = await handlers.handleProjectList();

    expect(result).toEqual({ success: true, projects });
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('returns error when store throws', async () => {
    mockGetAll.mockImplementation(() => { throw new Error('STORE_CORRUPT'); });

    const result = await handlers.handleProjectList();

    expect(result).toEqual({ success: false, error: 'STORE_CORRUPT' });
  });
});

describe('handleProjectGet', () => {
  it('returns project when found', async () => {
    const project = { id: 'p1', name: 'Proj1' };
    mockGetById.mockReturnValue(project);

    const result = await handlers.handleProjectGet(null, { projectId: 'p1' });

    expect(result).toEqual({ success: true, project });
    expect(mockGetById).toHaveBeenCalledWith('p1');
  });

  it('returns PROJECT_NOT_FOUND when project does not exist', async () => {
    mockGetById.mockReturnValue(null);

    const result = await handlers.handleProjectGet(null, { projectId: 'no-such' });

    expect(result).toEqual({ success: false, error: 'PROJECT_NOT_FOUND' });
  });

  it('returns error when store throws', async () => {
    mockGetById.mockImplementation(() => { throw new Error('READ_FAIL'); });

    const result = await handlers.handleProjectGet(null, { projectId: 'p1' });

    expect(result).toEqual({ success: false, error: 'READ_FAIL' });
  });
});

describe('handleProjectCreate', () => {
  it('creates project with default lang ko', async () => {
    const project = { id: 'p-new', name: 'NewProj' };
    mockCreateProject.mockResolvedValue(project);

    const result = await handlers.handleProjectCreate(null, {
      name: 'NewProj',
      localBasePath: '/tmp/base',
    });

    expect(result).toEqual({ success: true, project });
    expect(mockCreateProject).toHaveBeenCalledWith({
      name: 'NewProj',
      localBasePath: '/tmp/base',
      lang: 'ko',
    });
  });

  it('passes explicit lang when provided', async () => {
    mockCreateProject.mockResolvedValue({ id: 'p-en', name: 'EnProj' });

    await handlers.handleProjectCreate(null, {
      name: 'EnProj',
      localBasePath: '/tmp/base',
      lang: 'en',
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'en' })
    );
  });

  it('returns error when creation fails', async () => {
    mockCreateProject.mockRejectedValue(new Error('PROJECT_NAME_DUPLICATE'));

    const result = await handlers.handleProjectCreate(null, {
      name: 'Dup',
      localBasePath: '/tmp/base',
    });

    expect(result).toEqual({ success: false, error: 'PROJECT_NAME_DUPLICATE' });
  });
});

describe('handleProjectUpdate', () => {
  it('updates project name', async () => {
    const updated = { id: 'p1', name: 'Renamed' };
    mockUpdate.mockReturnValue(updated);

    const result = await handlers.handleProjectUpdate(null, {
      projectId: 'p1',
      name: 'Renamed',
    });

    expect(result).toEqual({ success: true, project: updated });
    expect(mockUpdate).toHaveBeenCalledWith('p1', { name: 'Renamed', settings: undefined });
  });

  it('returns error on failure', async () => {
    mockUpdate.mockImplementation(() => { throw new Error('UPDATE_FAIL'); });

    const result = await handlers.handleProjectUpdate(null, {
      projectId: 'p1',
      name: 'Bad',
    });

    expect(result).toEqual({ success: false, error: 'UPDATE_FAIL' });
  });
});

describe('handleProjectDelete', () => {
  it('deletes project successfully', async () => {
    mockRemove.mockReturnValue(undefined);

    const result = await handlers.handleProjectDelete(null, { projectId: 'p1' });

    expect(result).toEqual({ success: true });
    expect(mockRemove).toHaveBeenCalledWith('p1');
  });

  it('returns error when removal fails', async () => {
    mockRemove.mockImplementation(() => { throw new Error('NOT_FOUND'); });

    const result = await handlers.handleProjectDelete(null, { projectId: 'missing' });

    expect(result).toEqual({ success: false, error: 'NOT_FOUND' });
  });
});

describe('handleSelectDirectory', () => {
  it('returns selected directory path', async () => {
    const { dialog, BrowserWindow } = require('electron');
    BrowserWindow.getFocusedWindow.mockReturnValue({
      webContents: { send: jest.fn() },
    });
    dialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/chosen/dir'],
    });

    const result = await handlers.handleSelectDirectory();

    expect(result).toEqual({ success: true, path: '/chosen/dir' });
  });

  it('returns success false when dialog is canceled', async () => {
    const { dialog, BrowserWindow } = require('electron');
    BrowserWindow.getFocusedWindow.mockReturnValue({
      webContents: { send: jest.fn() },
    });
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await handlers.handleSelectDirectory();

    expect(result).toEqual({ success: false });
  });

  it('returns success false when no window exists', async () => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getFocusedWindow.mockReturnValue(null);
    BrowserWindow.getAllWindows.mockReturnValue([]);

    const result = await handlers.handleSelectDirectory();

    expect(result).toEqual({ success: false });
  });
});
