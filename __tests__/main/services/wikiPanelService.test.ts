// TC-WPS-01 ~ TC-WPS-10: WikiPanelService unit tests

const mockLoadURL = jest.fn()
const mockSetBounds = jest.fn()
const mockSetAutoResize = jest.fn()
const mockWebContents = { loadURL: mockLoadURL }

const mockViewInstance = {
  setBounds: mockSetBounds,
  setAutoResize: mockSetAutoResize,
  webContents: mockWebContents,
}

const MockBrowserView = jest.fn().mockImplementation(() => mockViewInstance)

const mockAddBrowserView = jest.fn()
const mockRemoveBrowserView = jest.fn()
const mockOn = jest.fn()
const mockGetBounds = jest.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 })

const mockWin = {
  addBrowserView: mockAddBrowserView,
  removeBrowserView: mockRemoveBrowserView,
  on: mockOn,
  getBounds: mockGetBounds,
}

const MockBrowserWindow = jest.fn().mockImplementation(() => mockWin)
MockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([])
MockBrowserWindow.getFocusedWindow = jest.fn().mockReturnValue(null)

jest.doMock('electron', () => ({
  BrowserView: MockBrowserView,
  BrowserWindow: MockBrowserWindow,
}))

let WikiPanelService: any

beforeEach(() => {
  jest.resetModules()
  MockBrowserView.mockClear()
  mockLoadURL.mockClear()
  mockSetBounds.mockClear()
  mockSetAutoResize.mockClear()
  mockAddBrowserView.mockClear()
  mockRemoveBrowserView.mockClear()
  mockOn.mockClear()
  mockGetBounds.mockClear()
  mockGetBounds.mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 })

  jest.doMock('electron', () => ({
    BrowserView: MockBrowserView,
    BrowserWindow: MockBrowserWindow,
  }))

  WikiPanelService = require('../../../src/main/services/wikiPanelService').default
    ?? require('../../../src/main/services/wikiPanelService')
})

describe('TC-WPS-09: panelWidth 기본값 400', () => {
  it('panelWidth가 400이다', () => {
    const service = new WikiPanelService()
    expect(service.panelWidth).toBe(400)
  })
})

describe('TC-WPS-03: isVisible() 초기 false, open 후 true', () => {
  it('생성 직후 isVisible()은 false이다', () => {
    const service = new WikiPanelService()
    expect(service.isVisible()).toBe(false)
  })

  it('open() 후 isVisible()은 true이다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    expect(service.isVisible()).toBe(true)
  })
})

describe('TC-WPS-01: open() 최초 호출 시 BrowserView 생성 및 마운트', () => {
  it('BrowserView 생성자가 1회 호출된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    expect(MockBrowserView).toHaveBeenCalledTimes(1)
  })

  it('win.addBrowserView가 1회 호출된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    expect(mockAddBrowserView).toHaveBeenCalledTimes(1)
  })

  it('view.webContents.loadURL이 해당 url로 호출된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    expect(mockLoadURL).toHaveBeenCalledWith('http://localhost:8080')
  })
})

describe('TC-WPS-02: open() 재호출 시 addBrowserView 중복 없음', () => {
  it('open()을 두 번 호출해도 addBrowserView는 1회만 호출된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    service.open(mockWin as any, 'http://localhost:8080')
    expect(mockAddBrowserView).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WPS-08: updateBounds() bounds 계산 규칙', () => {
  it('setBounds({ x: width-panelWidth, y:0, width:panelWidth, height })가 호출된다', () => {
    const service = new WikiPanelService()
    mockGetBounds.mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 })
    service.open(mockWin as any, 'http://localhost:8080')
    const expectedX = 1200 - 400
    expect(mockSetBounds).toHaveBeenCalledWith(
      expect.objectContaining({ x: expectedX, y: 0, width: 400, height: 800 })
    )
  })
})

describe('TC-WPS-10: resize 이벤트 리스너 중복 등록 방지', () => {
  it("open()을 두 번 호출해도 'resize' 이벤트 리스너는 1회만 등록된다", () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    service.open(mockWin as any, 'http://localhost:8080')
    const resizeCalls = mockOn.mock.calls.filter((c: any[]) => c[0] === 'resize')
    expect(resizeCalls.length).toBe(1)
  })
})

describe('TC-WPS-04: hide() 호출 시 removeBrowserView 및 _visible false', () => {
  it('hide() 호출 시 removeBrowserView가 호출된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    service.hide(mockWin as any)
    expect(mockRemoveBrowserView).toHaveBeenCalledTimes(1)
  })

  it('hide() 호출 후 isVisible()은 false이다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    service.hide(mockWin as any)
    expect(service.isVisible()).toBe(false)
  })
})

describe('TC-WPS-05: hide() 이미 닫힌 상태에서 no-op', () => {
  it('open 없이 hide() 호출 시 removeBrowserView가 호출되지 않는다', () => {
    const service = new WikiPanelService()
    expect(() => service.hide(mockWin as any)).not.toThrow()
    expect(mockRemoveBrowserView).not.toHaveBeenCalled()
  })
})

describe('TC-WPS-06: destroy() 호출 시 BrowserView 해제', () => {
  it('open 후 destroy() 호출 시 isVisible()이 false가 된다', () => {
    const service = new WikiPanelService()
    service.open(mockWin as any, 'http://localhost:8080')
    service.destroy()
    expect(service.isVisible()).toBe(false)
  })
})

describe('TC-WPS-07: destroy() BrowserView 없을 때 no-op', () => {
  it('open 없이 destroy() 호출 시 예외가 발생하지 않는다', () => {
    const service = new WikiPanelService()
    expect(() => service.destroy()).not.toThrow()
  })
})
