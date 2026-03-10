// TC-PL-01 ~ TC-PL-09: /pull 커맨드 등록 검증 (REQ-028)

import { CMD_PULL } from '../../../../src/main/constants/commands/pull'
import { CMD_PULL_EN } from '../../../../src/main/constants/commands/pullEn'

describe('/pull command definition', () => {
  test('TC-PL-01: CMD_PULL이 비어있지 않은 문자열로 export된다', () => {
    expect(typeof CMD_PULL).toBe('string')
    expect(CMD_PULL.length).toBeGreaterThan(0)
  })

  test('TC-PL-02: CMD_PULL_EN이 비어있지 않은 문자열로 export된다', () => {
    expect(typeof CMD_PULL_EN).toBe('string')
    expect(CMD_PULL_EN.length).toBeGreaterThan(0)
  })

  test('TC-PL-03: KO/EN 커맨드 문자열이 서로 다르다', () => {
    expect(CMD_PULL).not.toBe(CMD_PULL_EN)
  })

  test('TC-PL-08: CMD_PULL에 $ARGUMENTS 플레이스홀더가 포함된다', () => {
    expect(CMD_PULL).toContain('$ARGUMENTS')
    expect(CMD_PULL_EN).toContain('$ARGUMENTS')
  })
})

describe('/pull barrel export', () => {
  test('TC-PL-04: commands/index.ts에서 CMD_PULL, CMD_PULL_EN이 re-export된다', () => {
    const barrel = require('../../../../src/main/constants/commands/index')
    expect(barrel.CMD_PULL).toBe(CMD_PULL)
    expect(barrel.CMD_PULL_EN).toBe(CMD_PULL_EN)
  })
})

describe('/pull VALID_COMMANDS integration', () => {
  const mockEnqueue = jest.fn()
  const mockGetActiveWorkspacePath = jest.fn()

  let handlers: any

  beforeEach(() => {
    jest.resetModules()
    mockEnqueue.mockReset()
    mockGetActiveWorkspacePath.mockReset()

    const MockCommandQueueService = jest.fn().mockImplementation(() => ({
      enqueue: mockEnqueue,
      dequeue: jest.fn(),
      abort: jest.fn(),
      getStatus: jest.fn(),
      isSecurityWarningShown: jest.fn(),
      setSecurityWarningShown: jest.fn()
    }))
    jest.doMock('../../../../src/main/services/commandQueueService', () => MockCommandQueueService)
    jest.doMock('../../../../src/main/services/commandHistoryStore', () => jest.fn().mockImplementation(() => ({})))
    jest.doMock('../../../../src/main/handlers/workspaceManagerHandlers', () => ({
      getManagerService: jest.fn(() => ({
        getActiveWorkspacePath: mockGetActiveWorkspacePath,
      })),
    }))

    handlers = require('../../../../src/main/handlers/commandQueueHandlers')
  })

  afterEach(() => {
    handlers._resetService()
  })

  test('TC-PL-05: VALID_COMMANDS에 /pull이 포함된다', async () => {
    const mockItem = {
      id: 'item-1', command: '/pull', args: '', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-10T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/pull', args: '', cwd: '/ws' })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('TC-PL-09: handleEnqueue에 /pull을 전달하면 enqueue가 호출된다', async () => {
    const mockItem = {
      id: 'item-2', command: '/pull', args: 'repo-a', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-10T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/pull', args: 'repo-a', cwd: '/ws' })

    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/pull', 'repo-a', '/ws')
  })
})

describe('/pull buildDefaultCommands integration', () => {
  let buildDefaultCommands: (lang?: 'en' | 'ko') => Record<string, string>

  beforeEach(() => {
    jest.resetModules()
    const mod = require('../../../../src/main/constants/claudeConfigDefaults')
    buildDefaultCommands = mod.buildDefaultCommands
  })

  test('TC-PL-06: buildDefaultCommands("ko")에 pull 키가 존재한다', () => {
    const commands = buildDefaultCommands('ko')
    expect(commands).toHaveProperty('pull')
    expect(typeof commands['pull']).toBe('string')
    expect(commands['pull'].length).toBeGreaterThan(0)
  })

  test('TC-PL-07: buildDefaultCommands("en")에 pull 키가 존재한다', () => {
    const commands = buildDefaultCommands('en')
    expect(commands).toHaveProperty('pull')
    expect(typeof commands['pull']).toBe('string')
    expect(commands['pull'].length).toBeGreaterThan(0)
  })
})
