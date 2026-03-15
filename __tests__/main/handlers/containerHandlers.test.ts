/**
 * containerHandlers unit tests
 * Source: src/main/handlers/containerHandlers.ts
 */

const mockInitPool = jest.fn();
const mockGetPoolState = jest.fn();
const mockGetContainer = jest.fn();
const mockGetContainerLogs = jest.fn();
const mockDestroyContainer = jest.fn();
const mockDestroyAllContainers = jest.fn();
const mockSetMaxContainers = jest.fn();

const mockGetActiveProject = jest.fn();

let handlers: typeof import('../../../src/main/handlers/containerHandlers');

beforeEach(() => {
  jest.resetModules();

  jest.doMock('../../../src/main/services/containerPoolService', () => {
    return jest.fn().mockImplementation(() => ({
      initPool: mockInitPool,
      getPoolState: mockGetPoolState,
      getContainer: mockGetContainer,
      getContainerLogs: mockGetContainerLogs,
      destroyContainer: mockDestroyContainer,
      destroyAllContainers: mockDestroyAllContainers,
      setMaxContainers: mockSetMaxContainers,
    }));
  });

  jest.doMock('../../../src/main/services/dockerService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/gitService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/projectStore', () => {
    return jest.fn().mockImplementation(() => ({
      getAll: jest.fn().mockReturnValue([]),
      getById: jest.fn(),
    }));
  });

  jest.doMock('../../../src/main/services/issueService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/projectManagerService', () => {
    return jest.fn().mockImplementation(() => ({
      getActiveProject: mockGetActiveProject,
      setActiveProject: jest.fn(),
      createProject: jest.fn(),
    }));
  });

  // projectHandlers must be loaded first because containerHandlers imports getManager from it
  require('../../../src/main/handlers/projectHandlers');
  handlers = require('../../../src/main/handlers/containerHandlers');

  mockInitPool.mockReset();
  mockGetPoolState.mockReset();
  mockGetContainer.mockReset();
  mockGetContainerLogs.mockReset();
  mockDestroyContainer.mockReset();
  mockDestroyAllContainers.mockReset();
  mockSetMaxContainers.mockReset();
  mockGetActiveProject.mockReset();
});

const ACTIVE_PROJECT = {
  id: 'proj-1',
  name: 'TestProject',
  issueRepoPath: '/tmp/issues',
  settings: { maxContainers: 3 },
};

describe('handlePoolStatus', () => {
  it('returns pool state for active project', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const poolState = { projectId: 'proj-1', maxContainers: 3, containers: [] };
    mockGetPoolState.mockReturnValue(poolState);

    const result = await handlers.handlePoolStatus(null);

    expect(result).toEqual({ success: true, pool: poolState });
    expect(mockInitPool).toHaveBeenCalledWith(ACTIVE_PROJECT);
    expect(mockGetPoolState).toHaveBeenCalledWith('proj-1');
  });

  it('returns error when no active project', async () => {
    mockGetActiveProject.mockReturnValue(null);

    const result = await handlers.handlePoolStatus(null);

    expect(result).toEqual({ success: false, error: 'NO_ACTIVE_PROJECT' });
  });

  it('returns error when pool init throws', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockInitPool.mockImplementation(() => { throw new Error('DOCKER_UNAVAILABLE'); });

    const result = await handlers.handlePoolStatus(null);

    expect(result).toEqual({ success: false, error: 'DOCKER_UNAVAILABLE' });
  });
});

describe('handleContainerGet', () => {
  it('returns container when found', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const container = { id: 'c-1', status: 'running' };
    mockGetContainer.mockReturnValue(container);

    const result = await handlers.handleContainerGet(null, { containerId: 'c-1' });

    expect(result).toEqual({ success: true, container });
    expect(mockGetContainer).toHaveBeenCalledWith('proj-1', 'c-1');
  });

  it('returns CONTAINER_NOT_FOUND when container does not exist', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockGetContainer.mockReturnValue(null);

    const result = await handlers.handleContainerGet(null, { containerId: 'bad-id' });

    expect(result).toEqual({ success: false, error: 'CONTAINER_NOT_FOUND' });
  });

  it('returns NO_ACTIVE_PROJECT when no project is active', async () => {
    mockGetActiveProject.mockReturnValue(null);

    const result = await handlers.handleContainerGet(null, { containerId: 'c-1' });

    expect(result).toEqual({ success: false, error: 'NO_ACTIVE_PROJECT' });
  });
});

describe('handleContainerDestroy', () => {
  it('destroys container successfully', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockDestroyContainer.mockResolvedValue(undefined);

    const result = await handlers.handleContainerDestroy(null, { containerId: 'c-1' });

    expect(result).toEqual({ success: true });
    expect(mockDestroyContainer).toHaveBeenCalledWith('proj-1', 'c-1');
  });

  it('returns error when destroy fails', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockDestroyContainer.mockRejectedValue(new Error('DESTROY_FAIL'));

    const result = await handlers.handleContainerDestroy(null, { containerId: 'c-1' });

    expect(result).toEqual({ success: false, error: 'DESTROY_FAIL' });
  });

  it('returns NO_ACTIVE_PROJECT when no project is active', async () => {
    mockGetActiveProject.mockReturnValue(null);

    const result = await handlers.handleContainerDestroy(null, { containerId: 'c-1' });

    expect(result).toEqual({ success: false, error: 'NO_ACTIVE_PROJECT' });
  });
});

describe('handleContainerSetMax', () => {
  it('sets max containers for active project', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);

    const result = await handlers.handleContainerSetMax(null, { max: 5 });

    expect(result).toEqual({ success: true });
    expect(mockSetMaxContainers).toHaveBeenCalledWith('proj-1', 5);
  });

  it('returns error when no active project', async () => {
    mockGetActiveProject.mockReturnValue(null);

    const result = await handlers.handleContainerSetMax(null, { max: 5 });

    expect(result).toEqual({ success: false, error: 'NO_ACTIVE_PROJECT' });
  });

  it('returns error when setMax throws', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockSetMaxContainers.mockImplementation(() => { throw new Error('INVALID_MAX'); });

    const result = await handlers.handleContainerSetMax(null, { max: -1 });

    expect(result).toEqual({ success: false, error: 'INVALID_MAX' });
  });
});
