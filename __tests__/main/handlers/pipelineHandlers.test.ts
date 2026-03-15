/**
 * pipelineHandlers unit tests
 * Source: src/main/handlers/pipelineHandlers.ts
 */

const mockIsRunning = jest.fn();
const mockAbort = jest.fn();
const mockExecute = jest.fn();

const mockProcessIssue = jest.fn();
const mockAbortIssue = jest.fn();
const mockRetryIssue = jest.fn();

const mockInitPool = jest.fn();
const mockGetPoolState = jest.fn();

let handlers: typeof import('../../../src/main/handlers/pipelineHandlers');

beforeEach(() => {
  jest.resetModules();

  jest.doMock('../../../src/main/services/pipelineExecutorService', () => {
    const instance = {
      get isRunning() { return mockIsRunning(); },
      abort: mockAbort,
      execute: mockExecute,
    };
    return jest.fn().mockImplementation(() => instance);
  });

  jest.doMock('../../../src/main/services/pipelineOrchestratorService', () => {
    return jest.fn().mockImplementation(() => ({
      processIssue: mockProcessIssue,
      abortIssue: mockAbortIssue,
      retryIssue: mockRetryIssue,
    }));
  });

  jest.doMock('../../../src/main/services/containerPoolService', () => {
    return jest.fn().mockImplementation(() => ({
      initPool: mockInitPool,
      getPoolState: mockGetPoolState,
    }));
  });

  jest.doMock('../../../src/main/services/dockerService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/gitService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/issueService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/mergeService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/projectStore', () => {
    return jest.fn().mockImplementation(() => ({
      getAll: jest.fn().mockReturnValue([]),
      getById: jest.fn(),
    }));
  });

  jest.doMock('../../../src/main/services/projectManagerService', () => {
    return jest.fn().mockImplementation(() => ({
      getActiveProject: jest.fn(),
      setActiveProject: jest.fn(),
      createProject: jest.fn(),
    }));
  });

  // projectHandlers and containerHandlers must be loaded before pipelineHandlers
  require('../../../src/main/handlers/projectHandlers');
  require('../../../src/main/handlers/containerHandlers');
  handlers = require('../../../src/main/handlers/pipelineHandlers');

  mockIsRunning.mockReset();
  mockAbort.mockReset();
  mockExecute.mockReset();
  mockProcessIssue.mockReset();
  mockAbortIssue.mockReset();
  mockRetryIssue.mockReset();
});

describe('handlePipelineStatus', () => {
  it('returns running true when pipeline is running', async () => {
    mockIsRunning.mockReturnValue(true);

    const result = await handlers.handlePipelineStatus();

    expect(result).toEqual({ success: true, running: true });
  });

  it('returns running false when pipeline is idle', async () => {
    mockIsRunning.mockReturnValue(false);

    const result = await handlers.handlePipelineStatus();

    expect(result).toEqual({ success: true, running: false });
  });

  it('returns error when isRunning getter throws', async () => {
    mockIsRunning.mockImplementation(() => { throw new Error('SERVICE_ERROR'); });

    const result = await handlers.handlePipelineStatus();

    expect(result).toEqual({ success: false, running: false, error: 'SERVICE_ERROR' });
  });
});

describe('handlePipelineAbort', () => {
  it('aborts pipeline successfully', async () => {
    mockAbort.mockReturnValue(undefined);

    const result = await handlers.handlePipelineAbort();

    expect(result).toEqual({ success: true });
    expect(mockAbort).toHaveBeenCalledTimes(1);
  });

  it('returns error when abort throws', async () => {
    mockAbort.mockImplementation(() => { throw new Error('ABORT_FAIL'); });

    const result = await handlers.handlePipelineAbort();

    expect(result).toEqual({ success: false, error: 'ABORT_FAIL' });
  });
});

describe('startIssueProcessing', () => {
  it('calls orchestrator.processIssue without awaiting', async () => {
    mockProcessIssue.mockResolvedValue(undefined);

    await handlers.startIssueProcessing('proj-1', 'ISSUE-001');

    expect(mockProcessIssue).toHaveBeenCalledWith('proj-1', 'ISSUE-001');
  });

  it('does not throw when processIssue rejects (fire-and-forget)', async () => {
    mockProcessIssue.mockRejectedValue(new Error('PIPELINE_FAIL'));

    // startIssueProcessing calls processIssue().catch() so it should not throw
    await expect(handlers.startIssueProcessing('proj-1', 'ISSUE-001'))
      .resolves.toBeUndefined();
  });
});

describe('abortIssueProcessing', () => {
  it('aborts issue via orchestrator', async () => {
    mockAbortIssue.mockResolvedValue(undefined);

    await handlers.abortIssueProcessing('proj-1', 'ISSUE-001');

    expect(mockAbortIssue).toHaveBeenCalledWith('proj-1', 'ISSUE-001');
  });

  it('propagates error from orchestrator', async () => {
    mockAbortIssue.mockRejectedValue(new Error('ISSUE_NOT_RUNNING'));

    await expect(handlers.abortIssueProcessing('proj-1', 'ISSUE-001'))
      .rejects.toThrow('ISSUE_NOT_RUNNING');
  });
});

describe('retryIssueProcessing', () => {
  it('retries issue via orchestrator', async () => {
    mockRetryIssue.mockResolvedValue(undefined);

    await handlers.retryIssueProcessing('proj-1', 'ISSUE-002');

    expect(mockRetryIssue).toHaveBeenCalledWith('proj-1', 'ISSUE-002');
  });
});
