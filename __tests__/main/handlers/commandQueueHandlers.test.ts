// TC-CQH-01 ~ TC-CQH-08: commandQueueHandlers IPC 핸들러 테스트
// TC-MIG-04 ~ TC-MIG-06: queue:enqueue cwd optional 하위 호환성 테스트

const mockEnqueue = jest.fn()
const mockDequeue = jest.fn()
const mockAbort = jest.fn()
const mockGetStatus = jest.fn()
const mockIsSecurityWarningShown = jest.fn()
const mockSetSecurityWarningShown = jest.fn()
const mockGetActiveWorkspacePathCQ = jest.fn()

let handlers: any

beforeEach(() => {
  jest.resetModules()
  mockEnqueue.mockReset()
  mockDequeue.mockReset()
  mockAbort.mockReset()
  mockGetStatus.mockReset()
  mockIsSecurityWarningShown.mockReset()
  mockSetSecurityWarningShown.mockReset()
  mockGetActiveWorkspacePathCQ.mockReset()

  const MockCommandQueueService = jest.fn().mockImplementation(() => ({
    enqueue: mockEnqueue,
    dequeue: mockDequeue,
    abort: mockAbort,
    getStatus: mockGetStatus,
    isSecurityWarningShown: mockIsSecurityWarningShown,
    setSecurityWarningShown: mockSetSecurityWarningShown
  }))
  jest.doMock('../../../src/main/services/commandQueueService', () => MockCommandQueueService)

  // workspaceManagerHandlers mock (for active workspace fallback)
  jest.doMock('../../../src/main/handlers/workspaceManagerHandlers', () => ({
    getManagerService: jest.fn(() => ({
      getActiveWorkspacePath: mockGetActiveWorkspacePathCQ,
    })),
  }))

  handlers = require('../../../src/main/handlers/commandQueueHandlers')
})

afterEach(() => {
  handlers._resetService()
})

describe('TC-CQH-01: queue:enqueue — 유효한 커맨드로 enqueue 성공', () => {
  it('유효한 커맨드 타입과 cwd로 handleEnqueue를 호출하면 성공 응답이 반환된다', async () => {
    const mockItem = {
      id: 'item-1', command: '/teams', args: '', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-08T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/teams', args: '', cwd: '/ws' })

    expect(result.success).toBe(true)
    expect(result.item).toEqual(mockItem)
    expect(mockEnqueue).toHaveBeenCalledWith('/teams', '', '/ws')
  })
})

describe('TC-CQH-02: queue:enqueue — 잘못된 커맨드 타입 거부', () => {
  it('VALID_COMMANDS에 없는 커맨드 타입으로 호출하면 INVALID_COMMAND 에러가 반환된다', async () => {
    const result = await handlers.handleEnqueue(null, { command: '/invalid-cmd', args: '', cwd: '/ws' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_COMMAND')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('command가 빈 문자열인 경우에도 INVALID_COMMAND 에러가 반환된다', async () => {
    const result = await handlers.handleEnqueue(null, { command: '', args: '', cwd: '/ws' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_COMMAND')
  })

  it('command가 누락된 경우에도 INVALID_COMMAND 에러가 반환된다', async () => {
    const result = await handlers.handleEnqueue(null, { args: '', cwd: '/ws' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_COMMAND')
  })
})

describe('TC-CQH-03: queue:dequeue — 유효한 ID로 dequeue 성공', () => {
  it('유효한 itemId로 handleDequeue를 호출하면 성공 응답이 반환된다', async () => {
    mockDequeue.mockReturnValue(true)

    const result = await handlers.handleDequeue(null, { itemId: 'item-1' })

    expect(result.success).toBe(true)
    expect(mockDequeue).toHaveBeenCalledWith('item-1')
  })
})

describe('TC-CQH-04: queue:dequeue — 존재하지 않는 ID 시 NOT_FOUND_OR_NOT_PENDING', () => {
  it('서비스의 dequeue()가 false를 반환하면 NOT_FOUND_OR_NOT_PENDING 에러가 반환된다', async () => {
    mockDequeue.mockReturnValue(false)

    const result = await handlers.handleDequeue(null, { itemId: 'non-existent' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND_OR_NOT_REMOVABLE')
  })

  it('itemId가 누락된 경우 ITEM_ID_REQUIRED 에러가 반환된다', async () => {
    const result = await handlers.handleDequeue(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBe('ITEM_ID_REQUIRED')
  })
})

describe('TC-CQH-05: queue:abort — abort 호출 성공', () => {
  it('실행 중인 작업이 있을 때 handleAbort를 호출하면 성공 응답이 반환된다', async () => {
    mockAbort.mockReturnValue(true)

    const result = await handlers.handleAbort(null)

    expect(result.success).toBe(true)
    expect(mockAbort).toHaveBeenCalledTimes(1)
  })

  it('실행 중인 작업이 없을 때 handleAbort를 호출하면 NO_RUNNING_TASK 에러가 반환된다', async () => {
    mockAbort.mockReturnValue(false)

    const result = await handlers.handleAbort(null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('NO_RUNNING_TASK')
  })
})

describe('TC-CQH-06: queue:status — 큐 상태 반환', () => {
  it('handleStatus를 호출하면 전체 큐 항목 목록이 반환된다', async () => {
    const mockItems = [
      { id: '1', command: '/teams', status: 'running' },
      { id: '2', command: '/bugfix', status: 'pending' }
    ]
    mockGetStatus.mockReturnValue(mockItems)

    const result = await handlers.handleStatus(null)

    expect(result.success).toBe(true)
    expect(result.items).toEqual(mockItems)
    expect(result.items.length).toBe(2)
  })
})

describe('TC-CQH-07: queue:enqueue — 빈 프롬프트 허용', () => {
  it('/teams, /bugfix-teams 같은 커맨드는 args가 빈 문자열이어도 enqueue가 허용된다', async () => {
    mockEnqueue.mockReturnValue({
      id: 'item-1', command: '/teams', args: '', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-08T00:00:00.000Z'
    })

    const result1 = await handlers.handleEnqueue(null, { command: '/teams', args: '', cwd: '/ws' })
    expect(result1.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/teams', '', '/ws')

    const result2 = await handlers.handleEnqueue(null, { command: '/bugfix-teams', args: '', cwd: '/ws' })
    expect(result2.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/bugfix-teams', '', '/ws')
  })

  it('args가 undefined인 경우에도 빈 문자열로 기본값 처리된다', async () => {
    mockEnqueue.mockReturnValue({
      id: 'item-1', command: '/teams', args: '', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-08T00:00:00.000Z'
    })

    const result = await handlers.handleEnqueue(null, { command: '/teams', cwd: '/ws' })
    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/teams', '', '/ws')
  })

  it('cwd가 누락된 경우 CWD_REQUIRED 에러가 반환된다', async () => {
    const result = await handlers.handleEnqueue(null, { command: '/teams', args: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CWD_REQUIRED')
  })
})

describe('TC-CQH-08: queue:security-warning — 보안 경고 정보 반환', () => {
  it('최초 호출 시 shown: false를 반환하고 setSecurityWarningShown()을 호출한다', async () => {
    mockIsSecurityWarningShown.mockReturnValue(false)

    const result = await handlers.handleSecurityWarning(null)

    expect(result.shown).toBe(false)
    expect(mockSetSecurityWarningShown).toHaveBeenCalledTimes(1)
  })

  it('두 번째 호출 시 shown: true를 반환하고 setSecurityWarningShown()을 추가 호출하지 않는다', async () => {
    mockIsSecurityWarningShown.mockReturnValue(true)

    const result = await handlers.handleSecurityWarning(null)

    expect(result.shown).toBe(true)
    expect(mockSetSecurityWarningShown).not.toHaveBeenCalled()
  })
})

// ── TC-MIG-04 ~ TC-MIG-06: queue:enqueue cwd optional 하위 호환성 ──

describe('TC-MIG-04: queue:enqueue — 기존 방식으로 cwd 명시적 전달', () => {
  it('명시적 cwd가 전달되면 해당 경로가 그대로 사용된다', async () => {
    const mockItem = {
      id: 'item-1', command: '/teams', args: '', cwd: '/explicit/cwd',
      status: 'pending', retryCount: 0, createdAt: '2026-03-09T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/teams', args: '', cwd: '/explicit/cwd' })

    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/teams', '', '/explicit/cwd')
  })
})

describe('TC-MIG-05: queue:enqueue — cwd 생략 시 활성 워크스페이스 경로 사용', () => {
  it('cwd 생략 시 활성 워크스페이스 경로를 자동으로 사용한다', async () => {
    mockGetActiveWorkspacePathCQ.mockReturnValue('/active/ws')
    const mockItem = {
      id: 'item-1', command: '/teams', args: '', cwd: '/active/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-09T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/teams', args: '' })

    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/teams', '', '/active/ws')
  })
})

describe('TC-MIG-06: queue:enqueue — cwd 생략 + 활성 경로 미설정 시 CWD_REQUIRED', () => {
  it('cwd 생략 + 활성 경로 없을 때 CWD_REQUIRED 에러를 반환한다', async () => {
    mockGetActiveWorkspacePathCQ.mockReturnValue(null)

    const result = await handlers.handleEnqueue(null, { command: '/teams', args: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CWD_REQUIRED')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })
})
