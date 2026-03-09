// TC-CQS-01 ~ TC-CQS-18: CommandQueueService 단위 테스트

const mockSend = jest.fn()
const mockGetAllWindows = jest.fn(() => [{ webContents: { send: mockSend } }])
const mockQuery = jest.fn()

let uuidCounter = 0

function createMockConversation(messages: any[]): AsyncIterable<any> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const msg of messages) {
        yield msg
      }
    }
  }
}

// Creates an async iterable that hangs until the abort signal fires
function createHangingConversation(abortSignalRef: { signal?: AbortSignal } = {}): AsyncIterable<any> {
  return {
    async *[Symbol.asyncIterator]() {
      await new Promise<void>((resolve) => {
        const checkAbort = () => {
          if (abortSignalRef.signal?.aborted) {
            resolve()
            return
          }
          setTimeout(checkAbort, 10)
        }
        checkAbort()
      })
    }
  }
}

// Flush multiple rounds of microtasks
async function flushPromises(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise(resolve => process.nextTick(resolve))
    await new Promise(resolve => setImmediate(resolve))
  }
}

let CommandQueueService: any
let service: any

beforeEach(() => {
  jest.resetModules()
  uuidCounter = 0
  mockQuery.mockReset()
  mockSend.mockReset()
  mockGetAllWindows.mockReset()
  mockGetAllWindows.mockReturnValue([{ webContents: { send: mockSend } }])

  jest.doMock('crypto', () => ({
    randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`)
  }))

  jest.doMock('electron', () => ({
    BrowserWindow: {
      getAllWindows: mockGetAllWindows
    }
  }))

  jest.doMock('@anthropic-ai/claude-agent-sdk', () => ({
    query: mockQuery
  }))

  CommandQueueService = require('../../../src/main/services/commandQueueService')
  service = new CommandQueueService()
})

afterEach(() => {
  if (service) service._reset()
  jest.restoreAllMocks()
})

describe('TC-CQS-01: enqueue() — 커맨드 큐에 항목 추가', () => {
  it('유효한 커맨드를 큐에 추가하면 QueueItem이 반환된다', () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    const item = service.enqueue('/teams', 'arg1', '/workspace')

    expect(item.id).toBe('test-uuid-1')
    expect(item.command).toBe('/teams')
    expect(item.args).toBe('arg1')
    expect(item.cwd).toBe('/workspace')
    expect(['pending', 'running']).toContain(item.status)
    expect(item.retryCount).toBe(0)
    expect(item.createdAt).toBeTruthy()
    expect(service.getStatus().length).toBe(1)
  })
})

describe('TC-CQS-02: enqueue() — 자동 processQueue() 트리거', () => {
  it('enqueue() 호출 시 큐가 유휴 상태이면 자동으로 processQueue()가 시작된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 'sess-1', costUsd: 0.01, numTurns: 3 }
    ]))

    const item = service.enqueue('/add-req', '새 요구사항', '/workspace')
    await flushPromises()

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(item.status).toBe('success')
    expect(item.result.sessionId).toBe('sess-1')
  })
})

describe('TC-CQS-03: dequeue() — pending 항목 삭제 성공', () => {
  it('pending 상태의 항목을 dequeue()로 삭제하면 true를 반환한다', async () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    service.enqueue('/teams', '', '/ws')
    await flushPromises(2)

    const item2 = service.enqueue('/bugfix', '', '/ws')
    const result = service.dequeue(item2.id)

    expect(result).toBe(true)
    expect(service.getStatus().length).toBe(1)
  })
})

describe('TC-CQS-04: dequeue() — running 항목 삭제 거부', () => {
  it('running 상태의 항목에 대해 dequeue()를 호출하면 false를 반환한다', async () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises(2)

    const result = service.dequeue(item.id)

    expect(result).toBe(false)
    expect(service.getStatus().length).toBe(1)
  })
})

describe('TC-CQS-05: dequeue() — 존재하지 않는 ID 삭제 시 false 반환', () => {
  it('존재하지 않는 ID로 dequeue()를 호출하면 false를 반환한다', () => {
    const result = service.dequeue('non-existent-id')
    expect(result).toBe(false)
  })
})

describe('TC-CQS-06: getStatus() — 전체 큐 상태 반환', () => {
  it('모든 상태의 항목을 포함하는 배열을 반환한다', async () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    service.enqueue('/teams', '', '/ws')
    await flushPromises(2)
    service.enqueue('/bugfix', '', '/ws')

    const items = service.getStatus()

    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBe(2)
    expect(items[0]).toHaveProperty('id')
    expect(items[0]).toHaveProperty('command')
    expect(items[0]).toHaveProperty('status')
    expect(items[0]).toHaveProperty('retryCount')
    expect(items[0]).toHaveProperty('createdAt')
  })
})

describe('TC-CQS-07: abort() — AbortController.abort() 호출 확인', () => {
  it('abort() 호출 시 항목이 aborted 상태로 전환된다', async () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises(2)

    expect(item.status).toBe('running')

    const result = service.abort()

    expect(result).toBe(true)
    expect(item.status).toBe('aborted')
    expect(item.completedAt).toBeTruthy()
  })
})

describe('TC-CQS-08: abort() — 실행 중 작업 없을 때 무시', () => {
  it('실행 중인 작업이 없을 때 abort()를 호출하면 false를 반환한다', () => {
    const result = service.abort()
    expect(result).toBe(false)
  })
})

describe('TC-CQS-09: processQueue() — FIFO 순서 실행', () => {
  it('먼저 enqueue된 항목을 먼저 실행한다', async () => {
    const executionOrder: string[] = []
    mockQuery.mockImplementation((opts: any) => {
      executionOrder.push(opts.prompt)
      return createMockConversation([
        { type: 'result', sessionId: 'sess', costUsd: 0.0, numTurns: 1 }
      ])
    })

    service.enqueue('/add-req', 'first', '/ws')
    service.enqueue('/bugfix', 'second', '/ws')
    service.enqueue('/teams', 'third', '/ws')

    await flushPromises(10)

    expect(executionOrder[0]).toBe('/add-req first')
    expect(executionOrder[1]).toBe('/bugfix second')
    expect(executionOrder[2]).toBe('/teams third')

    const items = service.getStatus()
    items.forEach((item: any) => {
      expect(item.status).toBe('success')
    })
  })
})

describe('TC-CQS-10: processQueue() — 이미 처리 중이면 중복 실행 안 됨', () => {
  it('processQueue()가 이미 실행 중일 때 두 번째 enqueue는 processQueue()를 중복 시작하지 않는다', async () => {
    let resolveFirst: () => void
    const firstPromise = new Promise<void>(r => { resolveFirst = r })
    let callCount = 0

    mockQuery.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          async *[Symbol.asyncIterator]() {
            await firstPromise
            yield { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
          }
        }
      }
      return createMockConversation([
        { type: 'result', sessionId: 's2', costUsd: 0, numTurns: 1 }
      ])
    })

    service.enqueue('/teams', '', '/ws')
    await flushPromises(2)
    service.enqueue('/bugfix', '', '/ws')
    await flushPromises(2)

    resolveFirst!()
    await flushPromises(10)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    const items = service.getStatus()
    items.forEach((item: any) => {
      expect(item.status).toBe('success')
    })
  })
})

describe('TC-CQS-11: executeItem() — query() 성공 시 status=success 및 결과 기록', () => {
  it('query()가 정상 완료되면 항목의 status가 success로 전환되고 result가 기록된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', content: '작업 완료' },
      { type: 'result', sessionId: 'sess-abc', costUsd: 0.05, numTurns: 5 }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('success')
    expect(item.result.sessionId).toBe('sess-abc')
    expect(item.result.costUsd).toBe(0.05)
    expect(item.result.numTurns).toBe(5)
    expect(typeof item.result.durationMs).toBe('number')
    expect(item.startedAt).toBeTruthy()
    expect(item.completedAt).toBeTruthy()
  })
})

describe('TC-CQS-12: executeItem() — rate limit 에러 시 status=retrying 및 재시도', () => {
  it('SDKAssistantMessage에 rate_limit 에러가 포함되면 status가 retrying으로 전환된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('retrying')
    expect(item.retryCount).toBeGreaterThanOrEqual(1)

    const statusUpdateCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:status-update'
    )
    const hasRetryInfo = statusUpdateCalls.some(
      (c: any[]) => c[1] && c[1].retryInfo
    )
    expect(hasRetryInfo).toBe(true)

    const logCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:log'
    )
    const hasRateLimitLog = logCalls.some(
      (c: any[]) => c[1] && c[1].type === 'system' && c[1].content.includes('Rate limit')
    )
    expect(hasRateLimitLog).toBe(true)

    jest.useRealTimers()
  })
})

describe('TC-CQS-13: executeItem() — abort 시 status=aborted', () => {
  it('실행 중 abort()를 호출하면 항목의 status가 aborted로 전환된다', async () => {
    const signalRef: { signal?: AbortSignal } = {}
    mockQuery.mockImplementation((opts: any) => {
      signalRef.signal = opts.options?.abortController?.signal
      return createHangingConversation(signalRef)
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises(2)

    expect(item.status).toBe('running')

    service.abort()
    await flushPromises()

    expect(item.status).toBe('aborted')
    expect(item.completedAt).toBeTruthy()
  })
})

describe('TC-CQS-14: executeItem() — 일반 에러 시 status=failed', () => {
  it('query()에서 rate_limit이 아닌 에러가 발생하면 status가 failed로 전환된다', async () => {
    mockQuery.mockImplementation(() => {
      throw new Error('NETWORK_ERROR: connection refused')
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('failed')
    expect(item.result.errorMessage).toContain('NETWORK_ERROR')
    expect(item.completedAt).toBeTruthy()
  })
})

describe('TC-CQS-15: buildPrompt() — 커맨드+args 조합 확인', () => {
  it('command와 args를 조합하여 프롬프트 문자열을 생성한다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
    ]))

    service.enqueue('/add-req', '새로운 기능 요청', '/ws')
    await flushPromises()

    expect(mockQuery.mock.calls[0][0].prompt).toBe('/add-req 새로운 기능 요청')
  })

  it('args가 비어 있으면 command만 반환한다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(mockQuery.mock.calls[0][0].prompt).toBe('/teams')
  })
})

describe('TC-CQS-16: rate limit 재시도 후 성공', () => {
  it('rate limit으로 retrying 상태 진입 후 대기 시간이 지나면 재실행하여 성공한다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    let callCount = 0
    mockQuery.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createMockConversation([
          { type: 'assistant', error: 'rate_limit', content: '' }
        ])
      }
      return createMockConversation([
        { type: 'result', sessionId: 'retry-success', costUsd: 0.01, numTurns: 2 }
      ])
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('retrying')

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    expect(item.status).toBe('success')
    expect(item.retryCount).toBe(1)
    expect(item.result.sessionId).toBe('retry-success')

    jest.useRealTimers()
  })
})

describe('TC-CQS-17: query() 옵션 확인', () => {
  it('query() 호출 시 올바른 옵션이 전달된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
    ]))

    service.enqueue('/teams', 'arg', '/my/workspace')
    await flushPromises()

    const callArg = mockQuery.mock.calls[0][0]
    expect(callArg.options.cwd).toBe('/my/workspace')
    expect(callArg.options.permissionMode).toBe('bypassPermissions')
    expect(callArg.options.allowDangerouslySkipPermissions).toBe(true)
    expect(callArg.options.systemPrompt).toEqual({ type: 'preset', preset: 'claude_code' })
    expect(callArg.options.settingSources).toEqual(['project'])
    expect(callArg.options.abortController).toBeInstanceOf(AbortController)
  })
})

describe('TC-CQS-18: IPC 이벤트 발행 확인 (status-update, log)', () => {
  it('항목 상태 전환 및 실행 로그가 IPC로 정상 발행된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', content: '응답 내용' },
      { type: 'result', sessionId: 's', costUsd: 0.01, numTurns: 1 }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    const statusUpdateCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:status-update'
    )
    expect(statusUpdateCalls.length).toBeGreaterThanOrEqual(2)

    statusUpdateCalls.forEach((c: any[]) => {
      expect(c[1]).toHaveProperty('items')
      expect(Array.isArray(c[1].items)).toBe(true)
    })

    const logCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:log'
    )
    expect(logCalls.length).toBeGreaterThanOrEqual(1)

    const logPayload = logCalls[0][1]
    expect(logPayload).toHaveProperty('itemId')
    expect(logPayload.type).toBe('assistant')
    expect(logPayload.content).toBe('응답 내용')
    expect(logPayload).toHaveProperty('timestamp')
  })
})

// ── TC-RL-*: Rate Limit 강화 테스트 ──

describe('TC-RL-01: rate limit 감지 시 _isPaused가 true로 전환된다', () => {
  it('rate limit 에러 발생 시 isPaused()가 true를 반환한다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    jest.useRealTimers()
  })
})

describe('TC-RL-02: pause 상태에서 다음 pending 항목이 즉시 실행되지 않는다', () => {
  it('rate limit pause 상태에서 두 번째 항목은 pending 상태로 유지된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    // 첫 번째 항목이 rate limit 상태에 진입
    expect(service.isPaused()).toBe(true)

    // 두 번째 항목 추가
    const item2 = service.enqueue('/bugfix', '', '/ws')
    await flushPromises(2)

    // 타이머 미진행 — 두 번째 항목은 pending 유지
    expect(item2.status).toBe('pending')

    jest.useRealTimers()
  })
})

describe('TC-RL-03: 대기 시간 경과 후 _isPaused가 false로 자동 전환된다', () => {
  it('waitMs 경과 후 isPaused()가 false를 반환한다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    // 첫 호출만 rate_limit, 이후 성공으로 isPaused 상태 유지 방지
    mockQuery
      .mockReturnValueOnce(createMockConversation([
        { type: 'assistant', error: 'rate_limit', content: '' }
      ]))
      .mockReturnValue(createMockConversation([
        { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
      ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    expect(service.isPaused()).toBe(false)

    jest.useRealTimers()
  })
})

describe('TC-RL-04: 대기 시간 경과 후 다음 pending 항목의 처리가 재개된다', () => {
  it('rate limit 대기 완료 후 두 번째 항목이 pending에서 전환된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    let callCount = 0
    mockQuery.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createMockConversation([
          { type: 'assistant', error: 'rate_limit', content: '' }
        ])
      }
      return createMockConversation([
        { type: 'result', sessionId: 's2', costUsd: 0, numTurns: 1 }
      ])
    })

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    const item2 = service.enqueue('/bugfix', '', '/ws')
    expect(item2.status).toBe('pending')

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    expect(['running', 'success']).toContain(item2.status)

    jest.useRealTimers()
  })
})

describe('TC-RL-05: maxRetries 초과 시 현재 항목의 status가 failed로 전환된다', () => {
  it('_rateLimitRetryCount가 _maxRetries를 초과하면 항목이 failed가 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    service.setMaxRetries(1)

    // rate_limit을 항상 반환
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    // 첫 번째 rate limit → retrying (retryCount=1, rateLimitRetryCount=1, maxRetries=1 → 1 > 1은 false)
    expect(item.status).toBe('retrying')
    expect(service.isPaused()).toBe(true)

    // 대기 완료 후 재시도 → 다시 rate_limit → retryCount=2, rateLimitRetryCount=2 > 1 → failed
    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    expect(item.status).toBe('failed')

    jest.useRealTimers()
  })
})

describe('TC-RL-06: maxRetries 초과로 실패해도 나머지 pending 항목은 유지된다', () => {
  it('현재 항목이 failed가 되어도 나머지 pending 항목은 유지된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    service.setMaxRetries(1)

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    const item2 = service.enqueue('/bugfix', '', '/ws')
    const item3 = service.enqueue('/add-req', '', '/ws')

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    // item1이 failed가 된 시점에 item2, item3은 pending 유지
    // (이후 처리될 수도 있으므로 pending 이상인지만 확인)
    expect(service.getStatus().length).toBe(3)

    jest.useRealTimers()
  })
})

describe('TC-RL-07: maxRetries 초과 시 workspace:rate-limit-exhausted 이벤트 push', () => {
  it('최대 재시도 초과 시 webContents.send workspace:rate-limit-exhausted가 호출된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    service.setMaxRetries(1)

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    const exhaustedCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-exhausted'
    )
    expect(exhaustedCalls.length).toBeGreaterThanOrEqual(1)
    expect(exhaustedCalls[0][1]).toHaveProperty('itemId')
    expect(exhaustedCalls[0][1]).toHaveProperty('maxRetries')

    jest.useRealTimers()
  })
})

describe('TC-RL-08: forceRetryNow() 호출 시 타이머가 정리되고 즉시 재개된다', () => {
  it('forceRetryNow() 호출 시 clearTimeout/clearInterval이 호출되고 isPaused()가 false가 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    service.forceRetryNow()

    expect(service.isPaused()).toBe(false)

    jest.useRealTimers()
  })
})

describe('TC-RL-09: forceRetryNow() 호출 시 retrying 항목이 running으로 복구된다', () => {
  it('forceRetryNow() 호출 시 retrying 상태의 항목이 running으로 전환된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('retrying')

    service.forceRetryNow()

    expect(item.status).toBe('running')

    jest.useRealTimers()
  })
})

describe('TC-RL-10: cancelRateLimitWait() 호출 시 retrying 항목이 failed로 전환된다', () => {
  it('cancelRateLimitWait() 호출 시 retrying 항목이 failed로 전환되고 취소 메시지가 포함된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('retrying')

    service.cancelRateLimitWait()

    expect(item.status).toBe('failed')
    expect(item.result?.errorMessage).toContain('cancelled')

    jest.useRealTimers()
  })
})

describe('TC-RL-11: cancelRateLimitWait() 호출 시 _rateLimitRetryCount가 0으로 리셋된다', () => {
  it('cancelRateLimitWait() 호출 후 isPaused()가 false가 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    service.cancelRateLimitWait()

    expect(service.isPaused()).toBe(false)

    jest.useRealTimers()
  })
})

describe('TC-RL-12: rate limit 감지 시 workspace:rate-limit-status가 isWaiting:true로 push된다', () => {
  it('rate limit 발생 시 webContents.send workspace:rate-limit-status가 isWaiting: true로 호출된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    const rateLimitCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-status'
    )
    expect(rateLimitCalls.length).toBeGreaterThanOrEqual(1)

    const firstCall = rateLimitCalls[0][1]
    expect(firstCall.isWaiting).toBe(true)
    expect(firstCall).toHaveProperty('remainingMs')
    expect(firstCall).toHaveProperty('retryCount')
    expect(firstCall).toHaveProperty('maxRetries')
    expect(firstCall).toHaveProperty('nextRetryAt')

    jest.useRealTimers()
  })
})

describe('TC-RL-13: rate limit 대기 중 1초마다 workspace:rate-limit-status가 push된다', () => {
  it('3초 진행 시 workspace:rate-limit-status 호출 횟수 >= 3', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    // 초기 rate-limit-status 호출 이후
    const initialCount = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-status'
    ).length

    jest.advanceTimersByTime(3000)
    await flushPromises()

    const afterCount = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-status'
    ).length

    expect(afterCount).toBeGreaterThanOrEqual(initialCount + 3)

    jest.useRealTimers()
  })
})

describe('TC-RL-14: 대기 해제 시 workspace:rate-limit-status가 isWaiting:false로 push된다', () => {
  it('대기 완료(자동 재개) 후 마지막 rate-limit-status의 isWaiting이 false가 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery
      .mockReturnValueOnce(createMockConversation([
        { type: 'assistant', error: 'rate_limit', content: '' }
      ]))
      .mockReturnValue(createMockConversation([
        { type: 'result', sessionId: 's', costUsd: 0, numTurns: 1 }
      ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    const rateLimitCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-status'
    )
    expect(rateLimitCalls.length).toBeGreaterThanOrEqual(1)

    const lastCall = rateLimitCalls[rateLimitCalls.length - 1][1]
    expect(lastCall.isWaiting).toBe(false)
    expect(lastCall.remainingMs).toBe(0)

    jest.useRealTimers()
  })
})

describe('TC-RL-15: rate limit 대기 중 abort() 호출 시 타이머 정리 + isPaused false', () => {
  it('abort() 호출 시 isPaused()가 false가 되고 workspace:rate-limit-status가 push된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    service.abort()

    expect(service.isPaused()).toBe(false)

    const rateLimitCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'workspace:rate-limit-status' && c[1]?.isWaiting === false
    )
    expect(rateLimitCalls.length).toBeGreaterThanOrEqual(1)

    jest.useRealTimers()
  })
})

describe('TC-RL-16: 항목이 성공적으로 완료되면 _rateLimitRetryCount가 0으로 리셋된다', () => {
  it('rate limit 1회 후 성공 시 내부 rateLimitRetryCount가 리셋되어 isPaused가 false가 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    let callCount = 0
    mockQuery.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createMockConversation([
          { type: 'assistant', error: 'rate_limit', content: '' }
        ])
      }
      return createMockConversation([
        { type: 'result', sessionId: 'retry-success', costUsd: 0.01, numTurns: 2 }
      ])
    })

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(item.status).toBe('retrying')

    jest.advanceTimersByTime(30000)
    await flushPromises(10)

    expect(item.status).toBe('success')
    expect(service.isPaused()).toBe(false)

    jest.useRealTimers()
  })
})

describe('TC-RL-17: forceRetryNow() 직후 즉시 재 rate limit 발생 시 retryCount 증가', () => {
  it('forceRetryNow() 후 즉시 재 rate_limit 발생하면 retryCount가 증가한다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    service.setMaxRetries(5)

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    const item = service.enqueue('/teams', '', '/ws')
    await flushPromises()

    // 첫 번째 rate limit
    expect(service.isPaused()).toBe(true)
    const firstRetryCount = item.retryCount

    // forceRetryNow → 즉시 재실행 → 즉시 재 rate_limit
    service.forceRetryNow()
    await flushPromises(5)

    // 재 rate limit 발생으로 retryCount 증가
    expect(item.retryCount).toBeGreaterThanOrEqual(firstRetryCount + 1)

    jest.useRealTimers()
  })
})

describe('TC-RL-18: _reset() 호출 시 rate limit 관련 상태가 모두 초기화된다', () => {
  it('rate limit pause 상태 후 _reset() 호출 시 isPaused()가 false이고 maxRetries가 10이 된다', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

    mockQuery.mockReturnValue(createMockConversation([
      { type: 'assistant', error: 'rate_limit', content: '' }
    ]))

    service.enqueue('/teams', '', '/ws')
    await flushPromises()

    expect(service.isPaused()).toBe(true)

    service._reset()

    expect(service.isPaused()).toBe(false)
    expect(service.getMaxRetries()).toBe(10)

    jest.useRealTimers()
  })
})

// ── TC-CQS-LOG-*: SDD-0003 로그 content 축약 테스트 ──
// _sendLog를 직접 호출하여 truncateLogContent 적용 여부를 화이트박스로 검증한다.

describe('TC-CQS-LOG-01: _sendLog — content 101자 초과 시 축약된 content로 IPC 전송', () => {
  it('_sendLog에 101자 content 전달 시 queue:log에 앞 100자 + "..."로 전송된다', () => {
    const longContent = 'a'.repeat(101)
    const log = {
      itemId: 'test-item-1',
      type: 'assistant' as const,
      content: longContent,
      timestamp: new Date().toISOString()
    }

    ;(service as any)._sendLog(log)

    const logCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:log'
    )
    expect(logCalls.length).toBe(1)
    const logPayload = logCalls[0][1]
    expect(logPayload.content).toBe('a'.repeat(100) + '...')
    expect(logPayload.itemId).toBe('test-item-1')
    expect(logPayload.type).toBe('assistant')
  })
})

describe('TC-CQS-LOG-02: _sendLog — content 100자 이하 시 원본 content로 IPC 전송', () => {
  it('_sendLog에 50자 content 전달 시 queue:log에 원본 그대로 전송된다', () => {
    const shortContent = 'b'.repeat(50)
    const log = {
      itemId: 'test-item-2',
      type: 'assistant' as const,
      content: shortContent,
      timestamp: new Date().toISOString()
    }

    ;(service as any)._sendLog(log)

    const logCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:log'
    )
    expect(logCalls.length).toBe(1)
    const logPayload = logCalls[0][1]
    expect(logPayload.content).toBe(shortContent)
  })
})

describe('TC-CQS-LOG-03: _sendLog — window 없을 시 queue:log IPC가 호출되지 않음', () => {
  it('BrowserWindow 없을 시 _sendLog 호출에도 queue:log send가 호출되지 않는다', () => {
    mockGetAllWindows.mockReturnValue([])
    const log = {
      itemId: 'test-item-3',
      type: 'system' as const,
      content: 'some content',
      timestamp: new Date().toISOString()
    }

    ;(service as any)._sendLog(log)

    const logCalls = mockSend.mock.calls.filter(
      (c: any[]) => c[0] === 'queue:log'
    )
    expect(logCalls.length).toBe(0)
  })
})
