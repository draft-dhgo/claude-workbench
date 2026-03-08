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
