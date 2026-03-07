/**
 * TC-001, TC-002, TC-006: 메인 프로세스 로직 테스트
 */
const { getWindowOptions, handleWindowAllClosed } = require('../../src/main/window')
const path = require('path')

describe('TC-001: BrowserWindow 생성 옵션', () => {
  let options

  beforeEach(() => {
    options = getWindowOptions()
  })

  test('contextIsolation이 true로 설정된다', () => {
    expect(options.webPreferences.contextIsolation).toBe(true)
  })

  test('nodeIntegration이 false로 설정된다', () => {
    expect(options.webPreferences.nodeIntegration).toBe(false)
  })

  test('preload 경로가 preload/index.js를 포함한다', () => {
    expect(options.webPreferences.preload).toContain('preload')
    expect(options.webPreferences.preload).toContain('index.js')
  })

  test('width가 800이다', () => {
    expect(options.width).toBe(800)
  })

  test('height가 600이다', () => {
    expect(options.height).toBe(600)
  })
})

describe('TC-002: window-all-closed 핸들러', () => {
  let mockApp
  let originalPlatform

  beforeEach(() => {
    mockApp = { quit: jest.fn() }
    originalPlatform = process.platform
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  test('darwin이 아닌 경우 app.quit()을 호출한다', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    handleWindowAllClosed(mockApp)
    expect(mockApp.quit).toHaveBeenCalledTimes(1)
  })

  test('darwin인 경우 app.quit()을 호출하지 않는다', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    handleWindowAllClosed(mockApp)
    expect(mockApp.quit).not.toHaveBeenCalled()
  })

  test('linux인 경우 app.quit()을 호출한다', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    handleWindowAllClosed(mockApp)
    expect(mockApp.quit).toHaveBeenCalledTimes(1)
  })
})
