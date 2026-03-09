// TC-CQH-HIST-01 ~ TC-CQH-HIST-05: commandQueueHandlers 히스토리 IPC 핸들러 테스트
// SDD-0004: 커맨드 히스토리 및 재실행

const mockEnqueue = jest.fn();
const mockDequeue = jest.fn();
const mockAbort = jest.fn();
const mockGetStatus = jest.fn();
const mockIsSecurityWarningShown = jest.fn();
const mockSetSecurityWarningShown = jest.fn();
const mockGetActiveWorkspacePathCQ = jest.fn();
const mockResumeOnStartup = jest.fn();
const mockSetCompletionCallback = jest.fn();

// CommandHistoryStore mock methods
const mockHistoryAdd = jest.fn();
const mockHistoryList = jest.fn();
const mockHistoryDelete = jest.fn();
const mockHistoryClear = jest.fn();

let handlers: any;

beforeEach(() => {
  jest.resetModules();
  mockEnqueue.mockReset();
  mockDequeue.mockReset();
  mockAbort.mockReset();
  mockGetStatus.mockReset();
  mockIsSecurityWarningShown.mockReset();
  mockSetSecurityWarningShown.mockReset();
  mockGetActiveWorkspacePathCQ.mockReset();
  mockResumeOnStartup.mockReset();
  mockSetCompletionCallback.mockReset();
  mockHistoryAdd.mockReset();
  mockHistoryList.mockReset();
  mockHistoryDelete.mockReset();
  mockHistoryClear.mockReset();

  const MockCommandQueueService = jest.fn().mockImplementation(() => ({
    enqueue: mockEnqueue,
    dequeue: mockDequeue,
    abort: mockAbort,
    getStatus: mockGetStatus,
    isSecurityWarningShown: mockIsSecurityWarningShown,
    setSecurityWarningShown: mockSetSecurityWarningShown,
    resumePendingOnStartup: mockResumeOnStartup,
    setCompletionCallback: mockSetCompletionCallback,
  }));
  jest.doMock('../../../src/main/services/commandQueueService', () => MockCommandQueueService);

  const MockCommandHistoryStore = jest.fn().mockImplementation(() => ({
    add: mockHistoryAdd,
    list: mockHistoryList,
    delete: mockHistoryDelete,
    clear: mockHistoryClear,
  }));
  jest.doMock('../../../src/main/services/commandHistoryStore', () => MockCommandHistoryStore);

  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => '/mock/userData') },
  }));

  jest.doMock('../../../src/main/handlers/workspaceManagerHandlers', () => ({
    getManagerService: jest.fn(() => ({
      getActiveWorkspacePath: mockGetActiveWorkspacePathCQ,
    })),
  }));

  handlers = require('../../../src/main/handlers/commandQueueHandlers');
});

afterEach(() => {
  handlers._resetService();
});

describe('TC-CQH-HIST-01: queue:history-list — 히스토리 목록 반환', () => {
  it('handleHistoryList 호출 시 히스토리 엔트리 배열을 반환한다', async () => {
    const mockEntries = [
      {
        id: 'uuid-1',
        command: '/teams',
        args: 'Input: wiki/prd/0001.md',
        cwd: '/workspace',
        status: 'success',
        executedAt: '2026-03-10T10:00:00.000Z',
        costUsd: 0.01,
        durationMs: 5000,
        numTurns: 3,
      },
    ];
    mockHistoryList.mockReturnValue(mockEntries);

    const result = await handlers.handleHistoryList(null);

    expect(result.success).toBe(true);
    expect(result.entries).toEqual(mockEntries);
    expect(mockHistoryList).toHaveBeenCalledTimes(1);
  });

  it('히스토리가 비어 있을 때 빈 배열을 반환한다', async () => {
    mockHistoryList.mockReturnValue([]);

    const result = await handlers.handleHistoryList(null);

    expect(result.success).toBe(true);
    expect(result.entries).toEqual([]);
  });
});

describe('TC-CQH-HIST-02: queue:history-delete — 히스토리 항목 삭제', () => {
  it('유효한 id로 handleHistoryDelete 호출 시 성공을 반환한다', async () => {
    mockHistoryDelete.mockReturnValue(true);

    const result = await handlers.handleHistoryDelete(null, { id: 'uuid-1' });

    expect(result.success).toBe(true);
    expect(mockHistoryDelete).toHaveBeenCalledWith('uuid-1');
  });

  it('존재하지 않는 id로 삭제 시 NOT_FOUND 에러를 반환한다', async () => {
    mockHistoryDelete.mockReturnValue(false);

    const result = await handlers.handleHistoryDelete(null, { id: 'non-existent' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_FOUND');
  });

  it('id 미전달 시 ID_REQUIRED 에러를 반환한다', async () => {
    const result = await handlers.handleHistoryDelete(null, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('ID_REQUIRED');
  });
});

describe('TC-CQH-HIST-03: queue:history-clear — 전체 히스토리 삭제', () => {
  it('handleHistoryClear 호출 시 clear()를 호출하고 성공을 반환한다', async () => {
    const result = await handlers.handleHistoryClear(null);

    expect(result.success).toBe(true);
    expect(mockHistoryClear).toHaveBeenCalledTimes(1);
  });
});

describe('TC-CQH-HIST-04: initService() — 히스토리 콜백이 등록된다', () => {
  it('initService() 호출 시 setCompletionCallback이 호출된다', () => {
    handlers.initService();
    expect(mockSetCompletionCallback).toHaveBeenCalledTimes(1);
    expect(typeof mockSetCompletionCallback.mock.calls[0][0]).toBe('function');
  });

  it('initService()에서 등록된 콜백이 호출되면 historyStore.add()가 호출된다', () => {
    handlers.initService();
    const callback = mockSetCompletionCallback.mock.calls[0][0];

    const completedItem = {
      id: 'item-1',
      command: '/teams',
      args: 'test args',
      cwd: '/workspace',
      status: 'success',
      completedAt: '2026-03-10T12:00:00.000Z',
      result: {
        costUsd: 0.05,
        durationMs: 30000,
        numTurns: 10,
      },
    };

    callback(completedItem);

    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    const addArg = mockHistoryAdd.mock.calls[0][0];
    expect(addArg.command).toBe('/teams');
    expect(addArg.args).toBe('test args');
    expect(addArg.cwd).toBe('/workspace');
    expect(addArg.status).toBe('success');
    expect(addArg.costUsd).toBe(0.05);
    expect(addArg.durationMs).toBe(30000);
    expect(addArg.numTurns).toBe(10);
    expect(addArg.id).toBeTruthy();
  });
});

describe('TC-CQH-HIST-05: 히스토리 콜백 — failed/aborted 항목도 저장된다', () => {
  it('failed 상태의 항목도 historyStore.add()가 호출된다', () => {
    handlers.initService();
    const callback = mockSetCompletionCallback.mock.calls[0][0];

    const failedItem = {
      id: 'item-fail',
      command: '/bugfix',
      args: '',
      cwd: '/workspace',
      status: 'failed',
      completedAt: '2026-03-10T12:00:00.000Z',
      result: {
        errorMessage: 'Some error',
      },
    };

    callback(failedItem);

    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    const addArg = mockHistoryAdd.mock.calls[0][0];
    expect(addArg.status).toBe('failed');
    expect(addArg.errorMessage).toBe('Some error');
  });
});
