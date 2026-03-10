// TC-UR-01 ~ TC-UR-09: /update-readme 커맨드 등록 검증 (REQ-027)

import { CMD_UPDATE_README } from '../../../../src/main/constants/commands/updateReadme'
import { CMD_UPDATE_README_EN } from '../../../../src/main/constants/commands/updateReadmeEn'

describe('/update-readme command definition', () => {
  test('TC-UR-01: CMD_UPDATE_README가 비어있지 않은 문자열로 export된다', () => {
    expect(typeof CMD_UPDATE_README).toBe('string')
    expect(CMD_UPDATE_README.length).toBeGreaterThan(0)
  })

  test('TC-UR-02: CMD_UPDATE_README_EN이 비어있지 않은 문자열로 export된다', () => {
    expect(typeof CMD_UPDATE_README_EN).toBe('string')
    expect(CMD_UPDATE_README_EN.length).toBeGreaterThan(0)
  })

  test('TC-UR-03: KO/EN 커맨드 문자열이 서로 다르다', () => {
    expect(CMD_UPDATE_README).not.toBe(CMD_UPDATE_README_EN)
  })

  test('TC-UR-08: CMD_UPDATE_README에 $ARGUMENTS 플레이스홀더가 포함된다', () => {
    expect(CMD_UPDATE_README).toContain('$ARGUMENTS')
    expect(CMD_UPDATE_README_EN).toContain('$ARGUMENTS')
  })
})

describe('/update-readme barrel export', () => {
  test('TC-UR-04: commands/index.ts에서 CMD_UPDATE_README, CMD_UPDATE_README_EN이 re-export된다', () => {
    const barrel = require('../../../../src/main/constants/commands/index')
    expect(barrel.CMD_UPDATE_README).toBe(CMD_UPDATE_README)
    expect(barrel.CMD_UPDATE_README_EN).toBe(CMD_UPDATE_README_EN)
  })
})

describe('/update-readme VALID_COMMANDS integration', () => {
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

  test('TC-UR-05: VALID_COMMANDS에 /update-readme가 포함된다', async () => {
    // /update-readme가 유효하지 않으면 INVALID_COMMAND가 반환됨
    const mockItem = {
      id: 'item-1', command: '/update-readme', args: 'Features', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-10T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/update-readme', args: 'Features', cwd: '/ws' })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('TC-UR-09: handleEnqueue에 /update-readme를 전달하면 enqueue가 호출된다', async () => {
    const mockItem = {
      id: 'item-2', command: '/update-readme', args: '', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-10T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)

    const result = await handlers.handleEnqueue(null, { command: '/update-readme', args: '', cwd: '/ws' })

    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith('/update-readme', '', '/ws')
  })
})

describe('/update-readme buildDefaultCommands integration', () => {
  let buildDefaultCommands: (lang?: 'en' | 'ko') => Record<string, string>

  beforeEach(() => {
    jest.resetModules()
    const mod = require('../../../../src/main/constants/claudeConfigDefaults')
    buildDefaultCommands = mod.buildDefaultCommands
  })

  test('TC-UR-06: buildDefaultCommands("ko")에 update-readme 키가 존재한다', () => {
    const commands = buildDefaultCommands('ko')
    expect(commands).toHaveProperty('update-readme')
    expect(typeof commands['update-readme']).toBe('string')
    expect(commands['update-readme'].length).toBeGreaterThan(0)
  })

  test('TC-UR-07: buildDefaultCommands("en")에 update-readme 키가 존재한다', () => {
    const commands = buildDefaultCommands('en')
    expect(commands).toHaveProperty('update-readme')
    expect(typeof commands['update-readme']).toBe('string')
    expect(commands['update-readme'].length).toBeGreaterThan(0)
  })
})
