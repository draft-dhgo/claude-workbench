// TC-DEL-01 ~ TC-DEL-12: pull, update-readme 커맨드 삭제 검증 (REQ-033, Output 0035)

import * as fs from 'fs'
import * as path from 'path'

describe('REQ-033: Deleted command files do not exist', () => {
  const deletedFiles = [
    'src/main/constants/commands/pull.ts',
    'src/main/constants/commands/pullEn.ts',
    'src/main/constants/commands/updateReadme.ts',
    'src/main/constants/commands/updateReadmeEn.ts',
  ]

  test.each(deletedFiles)('TC-DEL-01~04: %s does not exist', (filePath) => {
    const full = path.resolve(__dirname, '../../../../', filePath)
    expect(fs.existsSync(full)).toBe(false)
  })
})

describe('REQ-033: Barrel export (commands/index.ts) has no pull/updateReadme references', () => {
  test('TC-DEL-05: commands/index.ts does not export CMD_PULL or CMD_UPDATE_README', () => {
    const barrel = require('../../../../src/main/constants/commands/index')
    expect(barrel).not.toHaveProperty('CMD_PULL')
    expect(barrel).not.toHaveProperty('CMD_PULL_EN')
    expect(barrel).not.toHaveProperty('CMD_UPDATE_README')
    expect(barrel).not.toHaveProperty('CMD_UPDATE_README_EN')
  })

  test('TC-DEL-06: commands/index.ts source has no pull/updateReadme imports', () => {
    const indexPath = path.resolve(__dirname, '../../../../src/main/constants/commands/index.ts')
    const content = fs.readFileSync(indexPath, 'utf-8')
    expect(content).not.toContain('pull')
    expect(content).not.toContain('updateReadme')
    expect(content).not.toContain('CMD_PULL')
    expect(content).not.toContain('CMD_UPDATE_README')
  })
})

describe('REQ-033: QueueCommandType excludes deleted commands', () => {
  test('TC-DEL-07: models.ts QueueCommandType does not include /pull or /update-readme', () => {
    const modelsPath = path.resolve(__dirname, '../../../../src/shared/types/models.ts')
    const content = fs.readFileSync(modelsPath, 'utf-8')
    // Extract the QueueCommandType line
    const typeLine = content.split('\n').find(l => l.includes('QueueCommandType'))
    expect(typeLine).toBeDefined()
    expect(typeLine).not.toContain('/pull')
    expect(typeLine).not.toContain('/update-readme')
  })

  test('TC-DEL-08: QueueCommandType includes only valid commands', () => {
    const modelsPath = path.resolve(__dirname, '../../../../src/shared/types/models.ts')
    const content = fs.readFileSync(modelsPath, 'utf-8')
    const typeLine = content.split('\n').find(l => l.includes('QueueCommandType'))!
    const validCommands = ['/add-req', '/bugfix', '/teams', '/bugfix-teams', '/merge']
    for (const cmd of validCommands) {
      expect(typeLine).toContain(cmd)
    }
  })
})

describe('REQ-033: VALID_COMMANDS in commandQueueHandlers rejects deleted commands', () => {
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

  test('TC-DEL-09: /pull is rejected as INVALID_COMMAND', async () => {
    const result = await handlers.handleEnqueue(null, { command: '/pull', args: '', cwd: '/ws' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_COMMAND')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('TC-DEL-10: /update-readme is rejected as INVALID_COMMAND', async () => {
    const result = await handlers.handleEnqueue(null, { command: '/update-readme', args: '', cwd: '/ws' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_COMMAND')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('TC-DEL-11: Valid commands still work (/teams)', async () => {
    const mockItem = {
      id: 'item-1', command: '/teams', args: 'REQ-001', cwd: '/ws',
      status: 'pending', retryCount: 0, createdAt: '2026-03-10T00:00:00.000Z'
    }
    mockEnqueue.mockReturnValue(mockItem)
    const result = await handlers.handleEnqueue(null, { command: '/teams', args: 'REQ-001', cwd: '/ws' })
    expect(result.success).toBe(true)
  })
})

describe('REQ-033: buildDefaultCommands excludes deleted commands', () => {
  let buildDefaultCommands: (lang?: 'en' | 'ko') => Record<string, string>

  beforeEach(() => {
    jest.resetModules()
    const mod = require('../../../../src/main/constants/claudeConfigDefaults')
    buildDefaultCommands = mod.buildDefaultCommands
  })

  test('TC-DEL-12a: buildDefaultCommands("ko") has no pull or update-readme', () => {
    const commands = buildDefaultCommands('ko')
    expect(commands).not.toHaveProperty('pull')
    expect(commands).not.toHaveProperty('update-readme')
  })

  test('TC-DEL-12b: buildDefaultCommands("en") has no pull or update-readme', () => {
    const commands = buildDefaultCommands('en')
    expect(commands).not.toHaveProperty('pull')
    expect(commands).not.toHaveProperty('update-readme')
  })

  test('TC-DEL-12c: buildDefaultCommands still has valid commands', () => {
    const commands = buildDefaultCommands('ko')
    expect(commands).toHaveProperty('add-req')
    expect(commands).toHaveProperty('add-bug')
    expect(commands).toHaveProperty('teams')
    expect(commands).toHaveProperty('bugfix-teams')
  })
})

describe('REQ-033: Renderer ALL_COMMANDS excludes deleted commands', () => {
  test('TC-DEL-13: commandQueueRenderer.js ALL_COMMANDS has no /pull or /update-readme', () => {
    const rendererPath = path.resolve(__dirname, '../../../../src/renderer/scripts/commandQueueRenderer.js')
    const content = fs.readFileSync(rendererPath, 'utf-8')
    // Find the ALL_COMMANDS array definition
    const match = content.match(/ALL_COMMANDS\s*=\s*\[([\s\S]*?)\]/)
    expect(match).not.toBeNull()
    const arrayContent = match![1]
    expect(arrayContent).not.toContain('/pull')
    expect(arrayContent).not.toContain('/update-readme')
    // Verify valid commands are present
    expect(arrayContent).toContain('/add-req')
    expect(arrayContent).toContain('/teams')
    expect(arrayContent).toContain('/merge')
  })
})
