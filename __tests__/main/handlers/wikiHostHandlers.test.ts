// TC-WH-H-01 ~ TC-WH-H-12: wikiHostHandlers IPC 핸들러 테스트
// TC-MIG-01 ~ TC-MIG-03: wiki-host:start workspacePath optional 하위 호환성 테스트

const mockStart = jest.fn()
const mockStop = jest.fn()
const mockGetStatus = jest.fn()
const mockIsRunning = jest.fn()
const mockCleanup = jest.fn()
const mockServiceReset = jest.fn()
const mockOpenExternal = jest.fn().mockResolvedValue(undefined)
const mockGetActiveWorkspacePath = jest.fn()

// WikiPanelService mock (SDD-0003: handleWikiHostOpenBrowser now uses panel)
const mockPanelOpen = jest.fn()
const mockPanelHide = jest.fn()
const mockPanelDestroy = jest.fn()

const mockWinForOldTests = {
  addBrowserView: jest.fn(),
  removeBrowserView: jest.fn(),
  on: jest.fn(),
  getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
}
const mockGetFocusedWindow = jest.fn().mockReturnValue(mockWinForOldTests)
const mockGetAllWindows = jest.fn().mockReturnValue([mockWinForOldTests])

let handlers: any

beforeEach(() => {
  jest.resetModules()
  mockStart.mockReset()
  mockStop.mockReset()
  mockGetStatus.mockReset()
  mockIsRunning.mockReset()
  mockCleanup.mockReset()
  mockServiceReset.mockReset()
  mockOpenExternal.mockReset()
  mockOpenExternal.mockResolvedValue(undefined)
  mockGetActiveWorkspacePath.mockReset()
  mockPanelOpen.mockReset()
  mockPanelHide.mockReset()
  mockPanelDestroy.mockReset()
  mockGetFocusedWindow.mockReset()
  mockGetFocusedWindow.mockReturnValue(mockWinForOldTests)
  mockGetAllWindows.mockReset()
  mockGetAllWindows.mockReturnValue([mockWinForOldTests])

  const MockWikiHostService = jest.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    getStatus: mockGetStatus,
    isRunning: mockIsRunning,
    cleanup: mockCleanup,
    _reset: mockServiceReset,
  }))
  jest.doMock('../../../src/main/services/wikiHostService', () => MockWikiHostService)

  const MockWikiPanelService = jest.fn().mockImplementation(() => ({
    open: mockPanelOpen,
    hide: mockPanelHide,
    destroy: mockPanelDestroy,
    isVisible: jest.fn().mockReturnValue(false),
    updateBounds: jest.fn(),
    panelWidth: 400,
  }))
  jest.doMock('../../../src/main/services/wikiPanelService', () => MockWikiPanelService)

  const MockBrowserWindow = jest.fn()
  MockBrowserWindow.getFocusedWindow = mockGetFocusedWindow
  MockBrowserWindow.getAllWindows = mockGetAllWindows

  jest.doMock('electron', () => ({
    shell: { openExternal: mockOpenExternal },
    BrowserWindow: MockBrowserWindow,
  }))

  // workspaceManagerHandlers mock (for active workspace fallback)
  jest.doMock('../../../src/main/handlers/workspaceManagerHandlers', () => ({
    getManagerService: jest.fn(() => ({
      getActiveWorkspacePath: mockGetActiveWorkspacePath,
    })),
  }))

  handlers = require('../../../src/main/handlers/wikiHostHandlers')
})

afterEach(() => {
  handlers._resetService()
})

describe('TC-WH-H-01: handleWikiHostStart — workspacePath 미전달 시 WORKSPACE_PATH_REQUIRED', () => {
  it('data에 workspacePath가 없으면 WORKSPACE_PATH_REQUIRED 에러를 반환한다', async () => {
    const result = await handlers.handleWikiHostStart(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBe('WORKSPACE_PATH_REQUIRED')
    expect(mockStart).not.toHaveBeenCalled()
  })
})

describe('TC-WH-H-02: handleWikiHostStart — data가 null일 때 WORKSPACE_PATH_REQUIRED', () => {
  it('data가 null일 때 안전하게 에러를 반환한다', async () => {
    const result = await handlers.handleWikiHostStart(null, null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('WORKSPACE_PATH_REQUIRED')
  })

  it('data가 undefined일 때도 안전하게 에러를 반환한다', async () => {
    const result = await handlers.handleWikiHostStart(null, undefined)

    expect(result.success).toBe(false)
    expect(result.error).toBe('WORKSPACE_PATH_REQUIRED')
  })
})

describe('TC-WH-H-03: handleWikiHostStart — 유효한 경로로 시작 시 success', () => {
  it('유효한 workspacePath로 시작하면 성공 응답을 반환한다', async () => {
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })

    const result = await handlers.handleWikiHostStart(null, { workspacePath: '/my/workspace' })

    expect(result.success).toBe(true)
    expect(result.url).toBe('http://localhost:8080')
    expect(result.port).toBe(8080)
    // path.join으로 wiki/views 가 붙은 경로로 호출 확인
    expect(mockStart).toHaveBeenCalledTimes(1)
    const callArg = mockStart.mock.calls[0][0]
    expect(callArg).toContain('wiki')
    expect(callArg).toContain('views')
  })
})

describe('TC-WH-H-04: handleWikiHostStart — Service 에러 시 success: false', () => {
  it('Service.start가 에러를 throw하면 에러가 전달된다', async () => {
    mockStart.mockRejectedValue(new Error('VIEWS_DIR_NOT_FOUND'))

    const result = await handlers.handleWikiHostStart(null, { workspacePath: '/invalid' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('VIEWS_DIR_NOT_FOUND')
  })
})

describe('TC-WH-H-05: handleWikiHostStop — 정상 중지 시 success: true', () => {
  it('stop 호출 시 Service.stop을 위임하고 성공 응답을 반환한다', async () => {
    mockStop.mockResolvedValue(undefined)

    // 서비스 인스턴스를 먼저 생성시키기 위해 start 호출
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiHostStop(null)

    expect(result.success).toBe(true)
    expect(mockStop).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WH-H-06: handleWikiHostStop — Service 에러 시 success: false', () => {
  it('Service.stop이 에러를 throw하면 에러가 반환된다', async () => {
    mockStop.mockRejectedValue(new Error('close error'))

    // 서비스 인스턴스 생성
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiHostStop(null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('close error')
  })
})

describe('TC-WH-H-07: handleWikiHostStatus — 상태 조회 시 WikiHostStatus 반환', () => {
  it('status 호출 시 Service.getStatus의 반환값을 전달한다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080', port: 8080 })

    const result = await handlers.handleWikiHostStatus(null)

    expect(result.running).toBe(true)
    expect(result.url).toBe('http://localhost:8080')
    expect(result.port).toBe(8080)
  })
})

describe('TC-WH-H-08: handleWikiHostOpenBrowser — 서버 실행 중 인앱 패널 열기 성공 (SDD-0003)', () => {
  it('서버가 실행 중일 때 panelService.open이 호출된다 (shell.openExternal 대신)', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080', port: 8080 })

    const result = await handlers.handleWikiHostOpenBrowser(null)

    expect(result.success).toBe(true)
    expect(mockPanelOpen).toHaveBeenCalledWith(mockWinForOldTests, 'http://localhost:8080')
    expect(mockOpenExternal).not.toHaveBeenCalled()
  })
})

describe('TC-WH-H-09: handleWikiHostOpenBrowser — 서버 미실행 시 SERVER_NOT_RUNNING', () => {
  it('서버가 미실행 상태에서 브라우저 열기를 시도하면 에러를 반환한다', async () => {
    mockGetStatus.mockReturnValue({ running: false })

    const result = await handlers.handleWikiHostOpenBrowser(null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('SERVER_NOT_RUNNING')
    expect(mockOpenExternal).not.toHaveBeenCalled()
  })
})

describe('TC-WH-H-10: handleWikiHostOpenBrowser — 창 없을 때 NO_WINDOW 반환 (SDD-0003)', () => {
  it('포커스 창이 없고 열린 창도 없으면 NO_WINDOW를 반환한다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080', port: 8080 })
    mockGetFocusedWindow.mockReturnValue(null)
    mockGetAllWindows.mockReturnValue([])

    const result = await handlers.handleWikiHostOpenBrowser(null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('NO_WINDOW')
    expect(mockPanelOpen).not.toHaveBeenCalled()
  })
})

describe('TC-WH-H-11: cleanupWikiHost — 서비스 인스턴스 존재 시 cleanup 위임', () => {
  it('cleanupWikiHost 호출 시 서비스 인스턴스의 cleanup이 호출된다', async () => {
    mockCleanup.mockResolvedValue(undefined)

    // 서비스 인스턴스 생성 (start를 한번 호출)
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    await handlers.cleanupWikiHost()

    expect(mockCleanup).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WH-H-12: _resetService — 서비스 인스턴스 초기화', () => {
  it('_resetService() 호출 후 새로운 서비스 인스턴스가 생성된다', async () => {
    // 서비스 인스턴스 생성
    mockGetStatus.mockReturnValue({ running: false })
    await handlers.handleWikiHostStatus(null)

    // 리셋
    handlers._resetService()

    // 다시 호출하면 새 인스턴스
    mockGetStatus.mockReturnValue({ running: false })
    await handlers.handleWikiHostStatus(null)

    // _reset이 호출된 것 확인 (기존 인스턴스의)
    expect(mockServiceReset).toHaveBeenCalled()
  })
})

// ── TC-MIG-01 ~ TC-MIG-03: wiki-host:start workspacePath optional 하위 호환성 ──

describe('TC-MIG-01: wiki-host:start — 기존 방식으로 workspacePath 명시적 전달', () => {
  it('명시적 workspacePath가 전달되면 해당 경로가 그대로 사용된다', async () => {
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })

    const result = await handlers.handleWikiHostStart(null, { workspacePath: '/explicit/path' })

    expect(result.success).toBe(true)
    const callArg = mockStart.mock.calls[0][0]
    expect(callArg).toContain('/explicit/path')
    expect(callArg).toContain('wiki')
    expect(callArg).toContain('views')
  })
})

describe('TC-MIG-02: wiki-host:start — workspacePath 생략 시 활성 워크스페이스 경로 사용', () => {
  it('workspacePath 생략 시 활성 워크스페이스 경로를 자동으로 사용한다', async () => {
    mockGetActiveWorkspacePath.mockReturnValue('/active/ws')
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })

    const result = await handlers.handleWikiHostStart(null, {})

    expect(result.success).toBe(true)
    const callArg = mockStart.mock.calls[0][0]
    expect(callArg).toContain('/active/ws')
    expect(callArg).toContain('wiki')
    expect(callArg).toContain('views')
  })
})

describe('TC-MIG-03: wiki-host:start — workspacePath 생략 + 활성 경로 미설정 시 에러', () => {
  it('workspacePath 생략 + 활성 경로 없을 때 WORKSPACE_PATH_REQUIRED 에러를 반환한다', async () => {
    mockGetActiveWorkspacePath.mockReturnValue(null)

    const result = await handlers.handleWikiHostStart(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBe('WORKSPACE_PATH_REQUIRED')
    expect(mockStart).not.toHaveBeenCalled()
  })
})
