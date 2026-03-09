/**
 * workspaceHandlers.test.ts
 * SDD-0027: TC-LIST-01 ~ TC-LIST-06, TC-REG-01 ~ TC-REG-05
 * (기존 Sets 기반 TC-0013-* 및 TC-MOD-* 교체)
 */

const mockWsGetAll = jest.fn()
const mockWsCreate = jest.fn()
let MockWorkspaceStore: jest.Mock
let handlers: any

beforeEach(() => {
  mockWsGetAll.mockReset()
  mockWsCreate.mockReset()

  jest.resetModules()

  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => '/mock/userData') },
  }))
  jest.doMock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  }))

  MockWorkspaceStore = jest.fn().mockImplementation(() => ({
    getAll: mockWsGetAll,
    create: mockWsCreate,
    update: jest.fn(),
    remove: jest.fn(),
  }))
  jest.doMock('../../../src/main/services/workspaceStore', () => MockWorkspaceStore)

  jest.doMock('../../../src/main/constants/claudeConfigDefaults', () => ({
    buildDefaultClaudeMd: jest.fn(() => '# CLAUDE.md'),
  }))

  handlers = require('../../../src/main/handlers/workspaceHandlers')
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('handleList — SDD-0027 단순화', () => {

  test('TC-LIST-01: WorkspaceStore 2개 항목 → type: empty로 반환', async () => {
    mockWsGetAll.mockReturnValue([
      { id: 'ws-1', name: 'proj-a', path: '/projects/proj-a', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'ws-2', name: 'proj-b', path: '/projects/proj-b', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(2)
    expect(result.workspaces[0].type).toBe('empty')
    expect(result.workspaces[1].type).toBe('empty')
  })

  test('TC-LIST-02: WorkspaceStore 빈 배열 → workspaces: []', async () => {
    mockWsGetAll.mockReturnValue([])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toEqual([])
  })

  test('TC-LIST-03: getAll() 예외 → { success: false, error }', async () => {
    mockWsGetAll.mockImplementation(() => {
      throw new Error('DB 읽기 오류')
    })

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('DB 읽기 오류')
  })

  test('TC-LIST-04: WorkdirSetStore 생성자 미호출', async () => {
    const MockWorkdirSetStore = jest.fn()
    jest.doMock('../../../src/main/services/workdirSetStore', () => MockWorkdirSetStore)
    handlers = require('../../../src/main/handlers/workspaceHandlers')

    mockWsGetAll.mockReturnValue([])
    await handlers.handleList(null, {})

    expect(MockWorkdirSetStore).not.toHaveBeenCalled()
  })

  test('TC-LIST-05: worktreeHandlers.handleListByRepoPath 미호출', async () => {
    const mockHandleListByRepoPath = jest.fn()
    jest.doMock('../../../src/main/handlers/worktreeHandlers', () => ({
      handleListByRepoPath: mockHandleListByRepoPath,
    }))
    handlers = require('../../../src/main/handlers/workspaceHandlers')

    mockWsGetAll.mockReturnValue([])
    await handlers.handleList(null, {})

    expect(mockHandleListByRepoPath).not.toHaveBeenCalled()
  })

  test('TC-LIST-06: workspace 항목에 필수 필드 존재', async () => {
    mockWsGetAll.mockReturnValue([
      { id: 'ws-1', name: 'my-project', path: '/projects/my-project', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ])

    const result = await handlers.handleList(null, {})
    const ws = result.workspaces[0]

    expect(ws).toHaveProperty('id')
    expect(ws).toHaveProperty('path')
    expect(ws).toHaveProperty('name')
    expect(ws).toHaveProperty('type')
    expect(ws).toHaveProperty('createdAt')
    expect(ws).toHaveProperty('updatedAt')
  })
})

describe('handleRegister — 신규 IPC 채널 workspace:register', () => {

  test('TC-REG-01: 유효한 path + name → WorkspaceStore.create 호출 및 성공 응답', async () => {
    mockWsCreate.mockReturnValue({
      id: 'ws-1', name: 'my-ws', path: '/projects/my-ws',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    })

    const result = await handlers.handleRegister(null, { path: '/projects/my-ws', name: 'my-ws' })

    expect(result.success).toBe(true)
    expect(result.workspace.id).toBe('ws-1')
    expect(result.workspace.type).toBe('empty')
    expect(mockWsCreate).toHaveBeenCalledWith('my-ws', '/projects/my-ws')
  })

  test('TC-REG-02: path 미전달 → { success: false, error: "PATH_REQUIRED" }', async () => {
    const result = await handlers.handleRegister(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBe('PATH_REQUIRED')
    expect(mockWsCreate).not.toHaveBeenCalled()
  })

  test('TC-REG-03: name 생략 시 path.basename을 이름으로 사용', async () => {
    mockWsCreate.mockReturnValue({
      id: 'ws-2', name: 'my-workspace', path: '/projects/my-workspace',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    })

    await handlers.handleRegister(null, { path: '/projects/my-workspace' })

    expect(mockWsCreate).toHaveBeenCalledWith('my-workspace', '/projects/my-workspace')
  })

  test('TC-REG-04: WorkspaceStore.create() 예외 → { success: false, error }', async () => {
    mockWsCreate.mockImplementation(() => {
      throw new Error('DUPLICATE_PATH')
    })

    const result = await handlers.handleRegister(null, { path: '/projects/existing-ws', name: 'existing-ws' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('DUPLICATE_PATH')
  })

  test('TC-REG-05: data가 null/undefined → PATH_REQUIRED', async () => {
    const result1 = await handlers.handleRegister(null, null)
    const result2 = await handlers.handleRegister(null, undefined)

    expect(result1.success).toBe(false)
    expect(result1.error).toBe('PATH_REQUIRED')
    expect(result2.success).toBe(false)
    expect(result2.error).toBe('PATH_REQUIRED')
  })
})
