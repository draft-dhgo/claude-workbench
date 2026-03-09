// TC-WMH-01 ~ TC-WMH-16: workspaceManagerHandlers IPC 핸들러 테스트

const mockSetActiveWorkspace = jest.fn();
const mockGetActiveWorkspacePath = jest.fn();
const mockGetCommands = jest.fn();
const mockGetSkills = jest.fn();
const mockGetConfigStatus = jest.fn();
const mockGetQueueSummary = jest.fn();
const mockResolveWorkspacePath = jest.fn();
const mockReset = jest.fn();

const mockQueueGetStatus = jest.fn();
const mockIsPaused = jest.fn();
const mockForceRetryNow = jest.fn();
const mockCancelRateLimitWait = jest.fn();

const mockHandleReset = jest.fn();

const mockFsExistsSync = jest.fn();

let handlers: any;

beforeEach(() => {
  jest.resetModules();
  mockSetActiveWorkspace.mockReset();
  mockGetActiveWorkspacePath.mockReset();
  mockGetCommands.mockReset();
  mockGetSkills.mockReset();
  mockGetConfigStatus.mockReset();
  mockGetQueueSummary.mockReset();
  mockResolveWorkspacePath.mockReset();
  mockReset.mockReset();
  mockQueueGetStatus.mockReset();
  mockIsPaused.mockReset();
  mockForceRetryNow.mockReset();
  mockCancelRateLimitWait.mockReset();
  mockHandleReset.mockReset();
  mockFsExistsSync.mockReset();

  const MockWorkspaceManagerService = jest.fn().mockImplementation(() => ({
    setActiveWorkspace: mockSetActiveWorkspace,
    getActiveWorkspacePath: mockGetActiveWorkspacePath,
    getCommands: mockGetCommands,
    getSkills: mockGetSkills,
    getConfigStatus: mockGetConfigStatus,
    getQueueSummary: mockGetQueueSummary,
    resolveWorkspacePath: mockResolveWorkspacePath,
    _reset: mockReset,
  }));
  jest.doMock('../../../src/main/services/workspaceManagerService', () => MockWorkspaceManagerService);

  const MockCommandQueueService = jest.fn().mockImplementation(() => ({
    getStatus: mockQueueGetStatus,
    isPaused: mockIsPaused,
    forceRetryNow: mockForceRetryNow,
    cancelRateLimitWait: mockCancelRateLimitWait,
  }));
  jest.doMock('../../../src/main/services/commandQueueService', () => MockCommandQueueService);

  jest.doMock('../../../src/main/handlers/claudeConfigHandlers', () => ({
    handleReset: mockHandleReset,
  }));

  jest.doMock('../../../src/main/handlers/commandQueueHandlers', () => ({
    getQueueServiceInstance: jest.fn(() => ({
      getStatus: mockQueueGetStatus,
      isPaused: mockIsPaused,
      forceRetryNow: mockForceRetryNow,
      cancelRateLimitWait: mockCancelRateLimitWait,
    })),
  }));

  jest.doMock('fs', () => ({
    existsSync: mockFsExistsSync,
  }));

  handlers = require('../../../src/main/handlers/workspaceManagerHandlers');
});

afterEach(() => {
  if (handlers && handlers._resetService) handlers._resetService();
  jest.restoreAllMocks();
});

// ── handleSetActive ──

describe('TC-WMH-01: handleSetActive — 유효한 경로로 성공', () => {
  it('유효한 경로로 handleSetActive를 호출하면 success: true 응답을 반환한다', async () => {
    mockSetActiveWorkspace.mockReturnValue({ wikiAvailable: true });

    const result = await handlers.handleSetActive(null, { workspacePath: '/valid/path' });

    expect(result.success).toBe(true);
    expect(result.activeWorkspacePath).toBe('/valid/path');
    expect(result.wikiAvailable).toBe(true);
  });
});

describe('TC-WMH-02: handleSetActive — workspacePath 미전달', () => {
  it('workspacePath를 전달하지 않으면 PATH_REQUIRED 에러를 반환한다', async () => {
    const result = await handlers.handleSetActive(null, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('PATH_REQUIRED');
  });
});

describe('TC-WMH-03: handleSetActive — 서비스 에러 전달', () => {
  it('서비스에서 에러가 발생하면 success: false와 error 메시지를 반환한다', async () => {
    mockSetActiveWorkspace.mockImplementation(() => {
      throw new Error('PATH_NOT_FOUND');
    });

    const result = await handlers.handleSetActive(null, { workspacePath: '/bad' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('PATH_NOT_FOUND');
  });
});

// ── handleGetActive ──

describe('TC-WMH-04: handleGetActive — 현재 활성 경로 반환', () => {
  it('handleGetActive는 현재 활성 워크스페이스 경로를 반환한다', async () => {
    mockGetActiveWorkspacePath.mockReturnValue('/active/path');

    const result = await handlers.handleGetActive(null);

    expect(result.activeWorkspacePath).toBe('/active/path');
  });
});

// ── handleGetCommands ──

describe('TC-WMH-05: handleGetCommands — 정상 반환', () => {
  it('handleGetCommands는 활성 워크스페이스의 커맨드 목록을 반환한다', async () => {
    mockResolveWorkspacePath.mockReturnValue('/ws');
    mockFsExistsSync.mockReturnValue(true);
    mockGetCommands.mockReturnValue([{ name: 'teams', exists: true }]);

    const result = await handlers.handleGetCommands(null, {});

    expect(result.success).toBe(true);
    expect(result.commands).toBeDefined();
  });
});

describe('TC-WMH-06: handleGetCommands — NO_ACTIVE_WORKSPACE', () => {
  it('활성 워크스페이스 미설정 + workspacePath 생략 시 NO_ACTIVE_WORKSPACE 에러', async () => {
    mockResolveWorkspacePath.mockReturnValue(null);

    const result = await handlers.handleGetCommands(null, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_ACTIVE_WORKSPACE');
  });
});

// ── handleGetSkills ──

describe('TC-WMH-07: handleGetSkills — 정상 반환', () => {
  it('handleGetSkills는 활성 워크스페이스의 스킬 목록을 반환한다', async () => {
    mockResolveWorkspacePath.mockReturnValue('/ws');
    mockFsExistsSync.mockReturnValue(true);
    mockGetSkills.mockReturnValue([{ name: 'req-manage', exists: true }]);

    const result = await handlers.handleGetSkills(null, {});

    expect(result.success).toBe(true);
    expect(result.skills).toBeDefined();
  });
});

// ── handleGetConfigStatus ──

describe('TC-WMH-08: handleGetConfigStatus — 정상 반환', () => {
  it('handleGetConfigStatus는 활성 워크스페이스의 구성 상태를 반환한다', async () => {
    mockResolveWorkspacePath.mockReturnValue('/ws');
    mockGetConfigStatus.mockReturnValue({
      hasClaudeDir: true,
      hasClaudeMd: true,
      commandCount: 4,
      skillCount: 10,
      wikiAvailable: false,
    });

    const result = await handlers.handleGetConfigStatus(null, {});

    expect(result.success).toBe(true);
    expect(result.configStatus).toBeDefined();
    expect(result.configStatus.hasClaudeDir).toBe(true);
  });
});

// ── handleResetConfig ──

describe('TC-WMH-09: handleResetConfig — 활성 경로 자동 주입', () => {
  it('handleResetConfig는 활성 워크스페이스 경로를 자동 주입하여 handleReset에 위임한다', async () => {
    mockResolveWorkspacePath.mockReturnValue('/ws');
    mockHandleReset.mockResolvedValue({ success: true, steps: [] });

    const result = await handlers.handleResetConfig(null, {});

    expect(mockHandleReset).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ workspacePath: '/ws' })
    );
  });
});

describe('TC-WMH-10: handleResetConfig — NO_ACTIVE_WORKSPACE', () => {
  it('활성 워크스페이스 미설정 시 NO_ACTIVE_WORKSPACE 에러를 반환한다', async () => {
    mockResolveWorkspacePath.mockReturnValue(null);

    const result = await handlers.handleResetConfig(null, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_ACTIVE_WORKSPACE');
  });
});

// ── handleGetQueueSummary ──

describe('TC-WMH-11: handleGetQueueSummary — 큐 요약 반환', () => {
  it('handleGetQueueSummary는 활성 워크스페이스의 큐 요약을 반환한다', async () => {
    mockResolveWorkspacePath.mockReturnValue('/ws');
    mockQueueGetStatus.mockReturnValue([{ cwd: '/ws', status: 'pending' }]);
    mockGetQueueSummary.mockReturnValue({
      pending: 1, running: 0, success: 0, failed: 0, aborted: 0, total: 1
    });

    const result = await handlers.handleGetQueueSummary(null, {});

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.pending).toBe(1);
  });
});

// ── handleRateLimitRetryNow ──

describe('TC-WMH-12: handleRateLimitRetryNow — 일시 정지 상태에서 즉시 재시도', () => {
  it('큐가 일시 정지 상태일 때 handleRateLimitRetryNow는 forceRetryNow()를 호출하고 success: true를 반환한다', async () => {
    mockIsPaused.mockReturnValue(true);

    const result = await handlers.handleRateLimitRetryNow(null);

    expect(mockForceRetryNow).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});

describe('TC-WMH-13: handleRateLimitRetryNow — 정지 상태 아닐 때 NOT_PAUSED', () => {
  it('큐가 정지 상태가 아닐 때 handleRateLimitRetryNow는 NOT_PAUSED 에러를 반환한다', async () => {
    mockIsPaused.mockReturnValue(false);

    const result = await handlers.handleRateLimitRetryNow(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_PAUSED');
  });
});

// ── handleRateLimitCancel ──

describe('TC-WMH-14: handleRateLimitCancel — 일시 정지 상태에서 취소', () => {
  it('큐가 일시 정지 상태일 때 handleRateLimitCancel은 cancelRateLimitWait()를 호출하고 success: true를 반환한다', async () => {
    mockIsPaused.mockReturnValue(true);

    const result = await handlers.handleRateLimitCancel(null);

    expect(mockCancelRateLimitWait).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});

describe('TC-WMH-15: handleRateLimitCancel — 정지 상태 아닐 때 NOT_PAUSED', () => {
  it('큐가 정지 상태가 아닐 때 handleRateLimitCancel은 NOT_PAUSED 에러를 반환한다', async () => {
    mockIsPaused.mockReturnValue(false);

    const result = await handlers.handleRateLimitCancel(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_PAUSED');
  });
});

// ── _resetService ──

describe('TC-WMH-16: _resetService() — 서비스 인스턴스 초기화', () => {
  it('_resetService() 호출 시 내부 서비스 인스턴스가 null로 초기화된다', async () => {
    // getManagerService를 한 번 호출하여 인스턴스 생성
    await handlers.handleGetActive(null);
    const svc1 = handlers.getManagerService();

    handlers._resetService();

    const svc2 = handlers.getManagerService();

    // 리셋 후 새 인스턴스가 생성됨
    expect(svc1).not.toBe(svc2);
  });
});
