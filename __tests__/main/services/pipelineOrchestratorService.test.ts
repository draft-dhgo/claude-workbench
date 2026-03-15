// PipelineOrchestratorService unit tests - retry limit

jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

const mockContainerPool = {
  acquireContainer: jest.fn(),
  releaseContainer: jest.fn().mockResolvedValue(undefined),
  setupBranches: jest.fn().mockResolvedValue(undefined),
  updateContainerStatus: jest.fn(),
  getContainerByIssue: jest.fn().mockReturnValue(null),
  getPoolState: jest.fn().mockReturnValue({ queuedIssues: [] }),
  getIdleContainers: jest.fn().mockReturnValue([]),
  _log: jest.fn(),
};

const mockIssueService = {
  getIssue: jest.fn(),
  updateIssue: jest.fn().mockResolvedValue({}),
  transitionStatus: jest.fn().mockResolvedValue({}),
};

const mockExecutor = {
  execute: jest.fn().mockResolvedValue({ success: true }),
  abort: jest.fn(),
};

const mockGit = {};
const mockMerge = { merge: jest.fn() };

const mockProjectStore = {
  getById: jest.fn(),
};

import PipelineOrchestratorService = require('../../../src/main/services/pipelineOrchestratorService');

let orchestrator: InstanceType<typeof PipelineOrchestratorService>;

beforeEach(() => {
  jest.clearAllMocks();
  orchestrator = new PipelineOrchestratorService(
    mockContainerPool as any,
    mockIssueService as any,
    mockExecutor as any,
    mockGit as any,
    mockMerge as any,
    mockProjectStore as any,
  );
});

describe('PipelineOrchestratorService.retryIssue', () => {
  const mockProject = {
    id: 'proj-001',
    name: 'test',
    issueRepoPath: '/repo',
    devRepos: [],
    localBasePath: '/base',
    settings: { maxContainers: 3, lang: 'ko' as const, maxPipelineRetries: 3 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const makeIssue = (retryCount?: number) => ({
    id: 'ISSUE-001',
    title: 'Test',
    description: 'desc',
    type: 'feature' as const,
    status: 'failed' as const,
    baseBranch: 'main',
    issueBranch: 'issue/ISSUE-001',
    priority: 'medium' as const,
    pipelineCommand: '/teams' as const,
    labels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: retryCount !== undefined ? { retryCount } : undefined,
  });

  it('increments retryCount on each retry', async () => {
    mockProjectStore.getById.mockReturnValue(mockProject);
    mockIssueService.getIssue.mockResolvedValue(makeIssue(0));
    // Mock acquireContainer to throw CONTAINER_POOL_FULL so processIssue doesn't run fully
    mockContainerPool.acquireContainer.mockRejectedValue(new Error('CONTAINER_POOL_FULL'));

    await orchestrator.retryIssue('proj-001', 'ISSUE-001');

    expect(mockIssueService.updateIssue).toHaveBeenCalledWith(
      '/repo', 'ISSUE-001',
      expect.objectContaining({ result: expect.objectContaining({ retryCount: 1 }) })
    );
  });

  it('throws MAX_RETRIES_EXCEEDED when retryCount reaches limit', async () => {
    mockProjectStore.getById.mockReturnValue(mockProject);
    mockIssueService.getIssue.mockResolvedValue(makeIssue(3)); // already at max

    await expect(orchestrator.retryIssue('proj-001', 'ISSUE-001'))
      .rejects.toThrow('MAX_RETRIES_EXCEEDED');
  });

  it('allows retry when retryCount is below limit', async () => {
    mockProjectStore.getById.mockReturnValue(mockProject);
    mockIssueService.getIssue.mockResolvedValue(makeIssue(2)); // one below max
    mockContainerPool.acquireContainer.mockRejectedValue(new Error('CONTAINER_POOL_FULL'));

    await expect(orchestrator.retryIssue('proj-001', 'ISSUE-001'))
      .resolves.not.toThrow();
  });

  it('uses default maxPipelineRetries of 3 when not set', async () => {
    const projectNoSetting = { ...mockProject, settings: { maxContainers: 3, lang: 'ko' as const } };
    mockProjectStore.getById.mockReturnValue(projectNoSetting);
    mockIssueService.getIssue.mockResolvedValue(makeIssue(3));

    await expect(orchestrator.retryIssue('proj-001', 'ISSUE-001'))
      .rejects.toThrow('MAX_RETRIES_EXCEEDED');
  });

  it('treats undefined retryCount as 0', async () => {
    mockProjectStore.getById.mockReturnValue(mockProject);
    mockIssueService.getIssue.mockResolvedValue(makeIssue()); // no retryCount
    mockContainerPool.acquireContainer.mockRejectedValue(new Error('CONTAINER_POOL_FULL'));

    await orchestrator.retryIssue('proj-001', 'ISSUE-001');

    expect(mockIssueService.updateIssue).toHaveBeenCalledWith(
      '/repo', 'ISSUE-001',
      expect.objectContaining({ result: expect.objectContaining({ retryCount: 1 }) })
    );
  });

  it('throws PROJECT_NOT_FOUND for invalid project', async () => {
    mockProjectStore.getById.mockReturnValue(null);

    await expect(orchestrator.retryIssue('bad', 'ISSUE-001'))
      .rejects.toThrow('PROJECT_NOT_FOUND');
  });

  it('throws ISSUE_NOT_FOUND for invalid issue', async () => {
    mockProjectStore.getById.mockReturnValue(mockProject);
    mockIssueService.getIssue.mockResolvedValue(null);

    await expect(orchestrator.retryIssue('proj-001', 'bad'))
      .rejects.toThrow('ISSUE_NOT_FOUND');
  });
});
