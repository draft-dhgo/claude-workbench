// TC-WP-H-01 ~ TC-WP-H-06: Wiki Panel IPC Handler tests (SDD-0003)

const mockStart = jest.fn()
const mockStop = jest.fn()
const mockGetStatus = jest.fn()
const mockCleanup = jest.fn()
const mockServiceReset = jest.fn()

// WikiPanelService mock
const mockPanelOpen = jest.fn()
const mockPanelHide = jest.fn()
const mockPanelDestroy = jest.fn()
const mockPanelIsVisible = jest.fn().mockReturnValue(false)

const mockWin = {
  addBrowserView: jest.fn(),
  removeBrowserView: jest.fn(),
  on: jest.fn(),
  getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
}

const mockGetFocusedWindow = jest.fn()
const mockGetAllWindows = jest.fn()

let handlers: any

beforeEach(() => {
  jest.resetModules()
  mockStart.mockReset()
  mockStop.mockReset()
  mockGetStatus.mockReset()
  mockCleanup.mockReset()
  mockServiceReset.mockReset()
  mockPanelOpen.mockReset()
  mockPanelHide.mockReset()
  mockPanelDestroy.mockReset()
  mockPanelIsVisible.mockReset()
  mockPanelIsVisible.mockReturnValue(false)
  mockGetFocusedWindow.mockReset()
  mockGetAllWindows.mockReset()

  const MockWikiHostService = jest.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    getStatus: mockGetStatus,
    cleanup: mockCleanup,
    _reset: mockServiceReset,
  }))

  const MockWikiPanelService = jest.fn().mockImplementation(() => ({
    open: mockPanelOpen,
    hide: mockPanelHide,
    destroy: mockPanelDestroy,
    isVisible: mockPanelIsVisible,
    updateBounds: jest.fn(),
    panelWidth: 400,
  }))

  const MockBrowserWindow = jest.fn()
  MockBrowserWindow.getFocusedWindow = mockGetFocusedWindow
  MockBrowserWindow.getAllWindows = mockGetAllWindows

  jest.doMock('../../../src/main/services/wikiHostService', () => MockWikiHostService)
  jest.doMock('../../../src/main/services/wikiPanelService', () => MockWikiPanelService)
  jest.doMock('electron', () => ({
    shell: { openExternal: jest.fn() },
    BrowserWindow: MockBrowserWindow,
  }))
  jest.doMock('../../../src/main/handlers/workspaceManagerHandlers', () => ({
    getManagerService: jest.fn(() => ({
      getActiveWorkspacePath: jest.fn().mockReturnValue(null),
    })),
  }))

  handlers = require('../../../src/main/handlers/wikiHostHandlers')
})

afterEach(() => {
  handlers._resetService()
})

// ── TC-WP-H-01: handleWikiPanelOpen — 서버 미실행 시 SERVER_NOT_RUNNING ──
describe('TC-WP-H-01: handleWikiPanelOpen — 서버 미실행 시 SERVER_NOT_RUNNING', () => {
  it('서버가 미실행 상태이면 SERVER_NOT_RUNNING을 반환한다', async () => {
    mockGetStatus.mockReturnValue({ running: false })
    // 서비스 인스턴스 생성 트리거
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelOpen(null)
    expect(result.success).toBe(false)
    expect(result.error).toBe('SERVER_NOT_RUNNING')
    expect(mockPanelOpen).not.toHaveBeenCalled()
  })
})

// ── TC-WP-H-02: handleWikiPanelOpen — 포커스 창 없을 때 NO_WINDOW ──
describe('TC-WP-H-02: handleWikiPanelOpen — 포커스 창 없을 때 NO_WINDOW', () => {
  it('창이 없으면 NO_WINDOW를 반환한다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080' })
    mockGetFocusedWindow.mockReturnValue(null)
    mockGetAllWindows.mockReturnValue([])
    // 서비스 인스턴스 생성 트리거
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelOpen(null)
    expect(result.success).toBe(false)
    expect(result.error).toBe('NO_WINDOW')
    expect(mockPanelOpen).not.toHaveBeenCalled()
  })
})

// ── TC-WP-H-03: handleWikiPanelOpen — 성공 시 panelService.open 호출 ──
describe('TC-WP-H-03: handleWikiPanelOpen — 성공 시 panelService.open 호출', () => {
  it('서버 실행 중 + 창 있을 때 panelService.open이 호출된다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080' })
    mockGetFocusedWindow.mockReturnValue(mockWin)
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelOpen(null)
    expect(result.success).toBe(true)
    expect(mockPanelOpen).toHaveBeenCalledWith(mockWin, 'http://localhost:8080')
  })

  it('getFocusedWindow가 null일 때 getAllWindows[0]를 폴백으로 사용한다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080' })
    mockGetFocusedWindow.mockReturnValue(null)
    mockGetAllWindows.mockReturnValue([mockWin])
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelOpen(null)
    expect(result.success).toBe(true)
    expect(mockPanelOpen).toHaveBeenCalledWith(mockWin, 'http://localhost:8080')
  })
})

// ── TC-WP-H-04: handleWikiPanelClose — 성공 시 panelService.hide 호출 ──
describe('TC-WP-H-04: handleWikiPanelClose — 성공 시 panelService.hide 호출', () => {
  it('창이 있을 때 panelService.hide가 호출된다', async () => {
    mockGetFocusedWindow.mockReturnValue(mockWin)
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelClose(null)
    expect(result.success).toBe(true)
    expect(mockPanelHide).toHaveBeenCalledWith(mockWin)
  })

  it('창이 없으면 success: true이고 hide는 호출되지 않는다', async () => {
    mockGetFocusedWindow.mockReturnValue(null)
    mockGetAllWindows.mockReturnValue([])
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    const result = await handlers.handleWikiPanelClose(null)
    expect(result.success).toBe(true)
    expect(mockPanelHide).not.toHaveBeenCalled()
  })
})

// ── TC-WP-H-05: handleWikiHostOpenBrowser — shell.openExternal 미사용, panelService.open 호출 ──
describe('TC-WP-H-05: handleWikiHostOpenBrowser — panelService.open으로 변경됨', () => {
  it('shell.openExternal 대신 panelService.open이 호출된다', async () => {
    mockGetStatus.mockReturnValue({ running: true, url: 'http://localhost:8080' })
    mockGetFocusedWindow.mockReturnValue(mockWin)
    mockStart.mockResolvedValue({ url: 'http://localhost:8080', port: 8080 })
    await handlers.handleWikiHostStart(null, { workspacePath: '/ws' })

    // get the shell mock from the electron mock
    const electron = require('electron')
    const mockOpenExternal = electron.shell?.openExternal

    const result = await handlers.handleWikiHostOpenBrowser(null)
    expect(result.success).toBe(true)
    expect(mockPanelOpen).toHaveBeenCalled()
    // shell.openExternal must NOT be called
    if (mockOpenExternal) {
      expect(mockOpenExternal).not.toHaveBeenCalled()
    }
  })
})

// ── TC-WP-H-06: cleanupWikiPanel — destroy 위임 ──
describe('TC-WP-H-06: cleanupWikiPanel — destroy 위임', () => {
  it('cleanupWikiPanel() 호출 시 panelService.destroy()가 호출된다', () => {
    handlers.cleanupWikiPanel()
    expect(mockPanelDestroy).toHaveBeenCalledTimes(1)
  })
})
