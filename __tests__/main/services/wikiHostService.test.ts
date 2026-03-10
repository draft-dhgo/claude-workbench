// TC-WH-S-01 ~ TC-WH-S-30: WikiHostService 단위 테스트

const mockSend = jest.fn()
const mockGetAllWindows = jest.fn(() => [{ webContents: { send: mockSend } }])

// http mock
const mockListen = jest.fn((_port: number, _host: string, cb?: () => void) => {
  if (cb) cb()
})
const mockClose = jest.fn((cb?: () => void) => {
  if (cb) cb()
})
const mockServerOn = jest.fn()
let capturedRequestHandler: any = null

const mockCreateServer = jest.fn((handler: any) => {
  capturedRequestHandler = handler
  return {
    listen: mockListen,
    close: mockClose,
    on: mockServerOn,
  }
})

// fs mock
const mockExistsSync = jest.fn()
const mockStatSync = jest.fn()
const mockCreateReadStream = jest.fn()

// net mock
const mockNetServerListen = jest.fn()
const mockNetServerClose = jest.fn((cb?: () => void) => {
  if (cb) cb()
})
const mockNetServerOnce = jest.fn()

const mockNetCreateServer = jest.fn(() => ({
  listen: mockNetServerListen,
  close: mockNetServerClose,
  once: mockNetServerOnce,
}))

let WikiHostService: any
let service: any

beforeEach(() => {
  jest.resetModules()
  mockCreateServer.mockClear()
  mockListen.mockClear()
  mockClose.mockClear()
  mockServerOn.mockClear()
  mockExistsSync.mockClear()
  mockStatSync.mockClear()
  mockCreateReadStream.mockClear()
  mockNetCreateServer.mockClear()
  mockNetServerListen.mockClear()
  mockNetServerClose.mockClear()
  mockNetServerOnce.mockClear()
  mockSend.mockClear()
  mockGetAllWindows.mockClear()
  capturedRequestHandler = null

  mockGetAllWindows.mockReturnValue([{ webContents: { send: mockSend } }])

  jest.doMock('http', () => ({
    createServer: mockCreateServer,
  }))

  jest.doMock('fs', () => ({
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    createReadStream: mockCreateReadStream,
  }))

  jest.doMock('net', () => ({
    createServer: mockNetCreateServer,
  }))

  jest.doMock('electron', () => ({
    BrowserWindow: {
      getAllWindows: mockGetAllWindows,
    },
  }))

  WikiHostService = require('../../../src/main/services/wikiHostService')
  service = new WikiHostService()
})

afterEach(() => {
  if (service) service._reset()
  jest.restoreAllMocks()
})

// Helper: 포트 사용 가능 시뮬레이션
function setupPortAvailable() {
  mockNetServerOnce.mockImplementation((event: string, cb: () => void) => {
    if (event === 'listening') cb()
  })
}

// Helper: 유효한 경로 시뮬레이션
function setupValidPath() {
  mockExistsSync.mockReturnValue(true)
}

// Helper: 서버 시작
async function startServer(viewsPath = '/valid/wiki/views') {
  setupValidPath()
  setupPortAvailable()
  return await service.start(viewsPath)
}

// Helper: request handler mock response 생성
function createMockRes() {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
    headersSent: false,
  }
}

// === 4.1 생명주기 (Lifecycle) ===

describe('TC-WH-S-01: start — viewsPath 디렉토리 미존재 시 VIEWS_DIR_NOT_FOUND 에러', () => {
  it('viewsPath가 존재하지 않으면 VIEWS_DIR_NOT_FOUND 에러가 throw된다', async () => {
    mockExistsSync.mockReturnValue(false)

    await expect(service.start('/nonexistent/wiki/views')).rejects.toThrow('VIEWS_DIR_NOT_FOUND')
    expect(mockCreateServer).not.toHaveBeenCalled()
  })
})

describe('TC-WH-S-02: start — index.html 미존재 시 INDEX_NOT_FOUND 에러', () => {
  it('viewsPath는 존재하지만 index.html이 없을 때 INDEX_NOT_FOUND 에러가 throw된다', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('index.html')) return false
      return true
    })

    await expect(service.start('/valid/wiki/views')).rejects.toThrow('INDEX_NOT_FOUND')
    expect(mockCreateServer).not.toHaveBeenCalled()
  })
})

describe('TC-WH-S-03: start — 유효한 경로로 서버 시작 시 url과 port 반환', () => {
  it('viewsPath와 index.html 모두 존재할 때 서버가 정상 시작된다', async () => {
    const result = await startServer()

    expect(result.url).toBe('http://localhost:8080')
    expect(result.port).toBe(8080)
    expect(mockCreateServer).toHaveBeenCalledTimes(1)
    expect(mockListen).toHaveBeenCalledWith(8080, '127.0.0.1', expect.any(Function))
    expect(service.isRunning()).toBe(true)
  })
})

describe('TC-WH-S-04: start — 이미 실행 중이면 기존 정보 반환', () => {
  it('서버가 이미 실행 중일 때 재호출하면 기존 정보를 반환한다', async () => {
    const first = await startServer()
    const second = await service.start('/valid/wiki/views')

    expect(second.url).toBe(first.url)
    expect(second.port).toBe(first.port)
    expect(mockCreateServer).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WH-S-05: stop — 실행 중인 서버 중지 시 상태 초기화', () => {
  it('실행 중인 서버를 stop하면 상태가 초기화된다', async () => {
    await startServer()
    await service.stop()

    expect(mockClose).toHaveBeenCalledTimes(1)
    expect(service.isRunning()).toBe(false)
    expect(service.getStatus().running).toBe(false)
    expect(service.getStatus().url).toBeUndefined()
    expect(service.getStatus().port).toBeUndefined()
  })
})

describe('TC-WH-S-06: stop — 미실행 상태에서 stop 호출 시 no-op', () => {
  it('서버가 미실행 상태에서 stop 호출 시 에러 없이 반환된다', async () => {
    await expect(service.stop()).resolves.toBeUndefined()
    expect(mockClose).not.toHaveBeenCalled()
  })
})

describe('TC-WH-S-07: cleanup — 실행 중인 서버 정리', () => {
  it('cleanup 호출 시 실행 중인 서버가 정리된다', async () => {
    await startServer()
    await service.cleanup()

    expect(service.isRunning()).toBe(false)
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WH-S-08: cleanup — 미실행 상태에서 cleanup 호출 시 no-op', () => {
  it('미실행 상태에서 cleanup 호출 시 에러 없이 반환된다', async () => {
    await expect(service.cleanup()).resolves.toBeUndefined()
    expect(mockClose).not.toHaveBeenCalled()
  })
})

// === 4.2 포트 선택 (Port Selection) ===

describe('TC-WH-S-09: 기본 포트(8080) 사용 가능 시 8080 할당', () => {
  it('8080 포트가 사용 가능하면 8080을 할당한다', async () => {
    const result = await startServer()

    expect(result.port).toBe(8080)
    expect(mockNetCreateServer).toHaveBeenCalledTimes(1)
  })
})

describe('TC-WH-S-10: 기본 포트 사용 불가 시 다음 포트 순차 탐색', () => {
  it('8080이 사용 중이면 다음 가용 포트를 탐색한다', async () => {
    setupValidPath()

    let callCount = 0
    mockNetServerOnce.mockImplementation((event: string, cb: () => void) => {
      callCount++
      // 각 포트 시도마다 once가 'error'와 'listening' 두 번 호출됨
      // 첫 두 번(8080)은 error, 세 번째 이후(8081)은 listening
      if (callCount <= 2) {
        if (event === 'error') cb()
      } else {
        if (event === 'listening') cb()
      }
    })

    const result = await service.start('/valid/wiki/views')

    expect(result.port).toBe(8081)
    expect(mockNetCreateServer).toHaveBeenCalledTimes(2)
  })
})

describe('TC-WH-S-11: 8080~8099 전부 사용 불가 시 NO_AVAILABLE_PORT 에러', () => {
  it('범위 내 모든 포트가 사용 중이면 NO_AVAILABLE_PORT 에러가 throw된다', async () => {
    setupValidPath()

    mockNetServerOnce.mockImplementation((event: string, cb: () => void) => {
      if (event === 'error') cb()
    })

    await expect(service.start('/valid/wiki/views')).rejects.toThrow('NO_AVAILABLE_PORT')
    expect(mockCreateServer).not.toHaveBeenCalled()
  })
})

// === 4.3 요청 핸들링 (Request Handling) ===

describe('TC-WH-S-12: 루트 경로(/) 요청 시 index.html 서빙', () => {
  it('GET / 요청 시 index.html로 변환되어 서빙된다', async () => {
    await startServer()

    // request handler 내부에서의 파일 존재 확인
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
    expect(mockStream.pipe).toHaveBeenCalledWith(res)
  })
})

describe('TC-WH-S-13: 존재하지 않는 파일 요청 시 404', () => {
  it('요청한 파일이 존재하지 않으면 404 응답을 반환한다', async () => {
    await startServer()

    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('nonexistent.js')) return false
      return true
    })

    const req = { url: '/nonexistent.js' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(404)
    expect(res.end).toHaveBeenCalledWith('Not Found')
    expect(mockCreateReadStream).not.toHaveBeenCalled()
  })
})

describe('TC-WH-S-14: 디렉토리 경로 요청 시 404', () => {
  it('요청 경로가 디렉토리를 가리키면 404 응답을 반환한다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const req = { url: '/subdir' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(404)
    expect(res.end).toHaveBeenCalledWith('Not Found')
  })
})

describe('TC-WH-S-15: 정상 정적 파일(CSS) 요청 시 200 + 올바른 Content-Type', () => {
  it('존재하는 CSS 파일 요청 시 200과 올바른 MIME 타입으로 응답한다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/styles.css' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
    expect(mockStream.pipe).toHaveBeenCalledWith(res)
  })
})

describe('TC-WH-S-16: URL 디코딩된 경로 처리', () => {
  it('URL 인코딩된 파일명이 올바르게 디코딩되어 처리된다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/%ED%8C%8C%EC%9D%BC.html' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
  })
})

// === 4.4 Directory Traversal 방지 ===

describe('TC-WH-S-17: ../ 경로를 통한 directory traversal 시도 시 차단', () => {
  it('URL 내 ../는 URL 파서에 의해 정규화되어 서빙 루트 내부로 제한된다', async () => {
    await startServer()

    // URL 파서가 /../../../etc/passwd를 /etc/passwd로 정규화
    // path.join(servingPath, '/etc/passwd') → servingPath 내부 경로
    // 실제 파일이 없으므로 404 (existsSync를 파일 부재로 설정)
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('etc') && p.includes('passwd')) return false
      return true
    })

    const req = { url: '/../../../etc/passwd' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    // URL 파서 정규화 후 서빙 루트 내부에서 파일 없으므로 404
    expect(res.writeHead).toHaveBeenCalledWith(404)
    expect(res.end).toHaveBeenCalledWith('Not Found')
    expect(mockCreateReadStream).not.toHaveBeenCalled()
  })
})

describe('TC-WH-S-18: URL 인코딩된 traversal(..%2F) 시도 시 403', () => {
  it('..%2F를 사용한 traversal 시도도 403으로 차단된다', async () => {
    await startServer()

    const req = { url: '/..%2F..%2Fetc%2Fpasswd' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(403)
    expect(res.end).toHaveBeenCalledWith('Forbidden')
  })
})

describe('TC-WH-S-19: 이중 인코딩된 traversal 시도 시 안전 처리', () => {
  it('이중 인코딩된 traversal 시도가 서빙 루트 내부에서 파일 없음으로 404 처리된다', async () => {
    await startServer()

    // 이중 인코딩: %252E → 1차 디코딩 후 %2E (리터럴 문자로 취급)
    // 서빙 루트 내부에서 파일 존재하지 않으므로 404
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('%2E') || p.includes('%2F')) return false
      return true
    })

    const req = { url: '/%252E%252E%252Fetc%252Fpasswd' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    // 이중 인코딩은 1차 디코딩 후 %2E%2E%2F가 되어 리터럴 파일명으로 취급됨
    // 서빙 루트 내부의 존재하지 않는 파일이므로 404
    expect(res.writeHead).toHaveBeenCalledWith(404)
    expect(res.end).toHaveBeenCalledWith('Not Found')
  })
})

// === 4.5 MIME 타입 ===

describe('TC-WH-S-20: .html 파일 MIME 타입 검증', () => {
  it('.html 확장자 파일의 Content-Type이 text/html; charset=utf-8이다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/page.html' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
  })
})

describe('TC-WH-S-21: .js 파일 MIME 타입 검증', () => {
  it('.js 확장자 파일의 Content-Type이 application/javascript; charset=utf-8이다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/app.js' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
  })
})

describe('TC-WH-S-22: .png 이미지 파일 MIME 타입 검증', () => {
  it('.png 확장자 파일의 Content-Type이 image/png이다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/icon.png' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
  })
})

describe('TC-WH-S-23: 미등록 확장자 시 application/octet-stream 반환', () => {
  it('MIME_MAP에 등록되지 않은 확장자는 application/octet-stream을 반환한다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })
    const mockStream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/data.xyz' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-cache, no-store, must-revalidate' })
  })
})

// === 4.6 상태 관리 및 Push ===

describe('TC-WH-S-24: getStatus — 미실행 시 running: false 반환', () => {
  it('서버 미시작 상태에서 getStatus()는 { running: false }를 반환한다', () => {
    const status = service.getStatus()

    expect(status.running).toBe(false)
    expect(status.url).toBeUndefined()
    expect(status.port).toBeUndefined()
  })
})

describe('TC-WH-S-25: getStatus — 실행 중 시 running: true + url + port 반환', () => {
  it('서버 실행 중 getStatus()는 running: true, url, port를 반환한다', async () => {
    await startServer()

    const status = service.getStatus()

    expect(status.running).toBe(true)
    expect(status.url).toBe('http://localhost:8080')
    expect(status.port).toBe(8080)
  })
})

describe('TC-WH-S-26: start 완료 시 status-update 이벤트 전송', () => {
  it('start 완료 후 wiki-host:status-update 이벤트가 전송된다', async () => {
    await startServer()

    const statusCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'wiki-host:status-update'
    )
    expect(statusCalls.length).toBeGreaterThanOrEqual(1)
    const lastCall = statusCalls[statusCalls.length - 1]
    expect(lastCall[1].running).toBe(true)
    expect(lastCall[1].url).toBe('http://localhost:8080')
    expect(lastCall[1].port).toBe(8080)
  })
})

describe('TC-WH-S-27: stop 완료 시 status-update 이벤트 전송', () => {
  it('stop 완료 후 wiki-host:status-update 이벤트가 전송된다', async () => {
    await startServer()
    mockSend.mockClear()

    await service.stop()

    const statusCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'wiki-host:status-update'
    )
    expect(statusCalls.length).toBeGreaterThanOrEqual(1)
    const lastCall = statusCalls[statusCalls.length - 1]
    expect(lastCall[1].running).toBe(false)
  })
})

describe('TC-WH-S-28: BrowserWindow 없을 때 status-update 전송 시 에러 없음', () => {
  it('BrowserWindow가 없어도 status push가 에러 없이 처리된다', async () => {
    mockGetAllWindows.mockReturnValue([])

    const result = await startServer()

    expect(result.url).toBe('http://localhost:8080')
    expect(mockSend).not.toHaveBeenCalled()
  })
})

// === 4.7 에러 처리 ===

describe('TC-WH-S-29: 스트림 읽기 에러 시 500 응답', () => {
  it('fs.createReadStream에서 에러가 발생하면 500 응답을 반환한다', async () => {
    await startServer()

    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => false })

    let errorCallback: any = null
    const mockStream = {
      on: jest.fn().mockImplementation(function(this: any, event: string, cb: any) {
        if (event === 'error') {
          errorCallback = cb
        }
        return this
      }),
      pipe: jest.fn(),
    }
    mockCreateReadStream.mockReturnValue(mockStream)

    const req = { url: '/file.html' }
    const res = createMockRes()
    capturedRequestHandler(req, res)

    // 스트림 에러 트리거
    if (errorCallback) {
      errorCallback(new Error('read error'))
    }

    expect(res.writeHead).toHaveBeenCalledWith(500)
    expect(res.end).toHaveBeenCalledWith('Internal Server Error')
  })
})

describe('TC-WH-S-30: _reset 호출 시 상태 완전 초기화', () => {
  it('_reset() 호출 시 상태가 완전히 초기화된다', async () => {
    await startServer()

    service._reset()

    expect(service.isRunning()).toBe(false)
    expect(service.getStatus().running).toBe(false)
  })
})
