const os = require('os')
const fs = require('fs')
const path = require('path')

const mockExecFile = jest.fn()

let tmpDir
let handlers

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-terminal-'))
  mockExecFile.mockReset()

  // process.platform을 'darwin'으로 초기화
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

  jest.resetModules()
  jest.doMock('child_process', () => ({
    execFile: mockExecFile
  }))

  handlers = require('../../../src/main/handlers/terminalHandlers')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  // process.platform 원복
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform)
  }
})

describe('handleOpenTerminal — 성공 케이스', () => {
  it('TC-001: 유효한 경로로 macOS 터미널 열기 성공', async () => {
    mockExecFile.mockImplementation((cmd, args, opts, cb) => cb(null, '', ''))

    const result = await handlers.handleOpenTerminal(null, { path: tmpDir })

    expect(result).toEqual({ success: true })
    expect(mockExecFile).toHaveBeenCalledTimes(1)

    const call = mockExecFile.mock.calls[0]
    expect(call[0]).toBe('open')
    expect(call[1]).toEqual(['-a', 'Terminal', tmpDir])
  })

  it('TC-009: execFile 호출 인자 검증 (open -a Terminal)', async () => {
    mockExecFile.mockImplementation((cmd, args, opts, cb) => cb(null, '', ''))

    await handlers.handleOpenTerminal(null, { path: tmpDir })

    expect(mockExecFile.mock.calls[0][0]).toBe('open')
    expect(mockExecFile.mock.calls[0][1]).toEqual(['-a', 'Terminal', tmpDir])
  })
})

describe('handleOpenTerminal — 경로 검증', () => {
  it('TC-002: path가 null인 경우 오류 반환', async () => {
    const result = await handlers.handleOpenTerminal(null, { path: null })

    expect(result.success).toBe(false)
    expect(result.error).toBe('경로가 지정되지 않았습니다.')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('TC-003: path가 빈 문자열인 경우 오류 반환', async () => {
    const result = await handlers.handleOpenTerminal(null, { path: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('경로가 지정되지 않았습니다.')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('TC-004: data 자체가 null인 경우 오류 반환', async () => {
    const result = await handlers.handleOpenTerminal(null, null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('경로가 지정되지 않았습니다.')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('TC-005: 존재하지 않는 경로인 경우 오류 반환', async () => {
    const nonExistentPath = '/nonexistent/path-that-cannot-exist-xyz-9999'
    const result = await handlers.handleOpenTerminal(null, { path: nonExistentPath })

    expect(result.success).toBe(false)
    expect(result.error).toContain('경로를 찾을 수 없습니다: ' + nonExistentPath)
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})

describe('handleOpenTerminal — execFile 실패', () => {
  it('TC-006: execFile 실패 시 오류 반환', async () => {
    mockExecFile.mockImplementation((cmd, args, opts, cb) => cb(new Error('open: command failed'), '', ''))

    const result = await handlers.handleOpenTerminal(null, { path: tmpDir })

    expect(result.success).toBe(false)
    expect(result.error).toBe('open: command failed')
    expect(mockExecFile).toHaveBeenCalledTimes(1)
  })
})

describe('handleOpenTerminal — 플랫폼 분기', () => {
  it('TC-007: 비 macOS 플랫폼(Linux)에서 미지원 오류 반환', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })

    const result = await handlers.handleOpenTerminal(null, { path: tmpDir })

    expect(result.success).toBe(false)
    expect(result.error).toBe('현재 macOS만 지원합니다.')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('TC-008: 비 macOS 플랫폼(Windows)에서 미지원 오류 반환', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

    const result = await handlers.handleOpenTerminal(null, { path: tmpDir })

    expect(result.success).toBe(false)
    expect(result.error).toBe('현재 macOS만 지원합니다.')
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})
