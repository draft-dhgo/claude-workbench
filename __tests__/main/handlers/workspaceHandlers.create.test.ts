/**
 * workspaceHandlers.create.test.ts
 * TDD-0021: TC-WS-H01 ~ TC-WS-H15
 * 신규 핸들러(create, update, delete) + handleList 통합 단위 테스트
 * jest.resetModules() + jest.doMock() pattern for full isolation
 */

const mockExistsSync    = jest.fn()
const mockMkdirSync     = jest.fn()
const mockWriteFileSync = jest.fn()
const mockExecFile      = jest.fn()
const mockGetAllSets    = jest.fn()
const mockGetRepoById   = jest.fn()

// WorkspaceStore mock
const mockWsGetAll  = jest.fn()
const mockWsGetById = jest.fn()
const mockWsCreate  = jest.fn()
const mockWsUpdate  = jest.fn()
const mockWsRemove  = jest.fn()

// buildDefaultClaudeMd mock
const mockBuildDefaultClaudeMd = jest.fn(() => '# CLAUDE.md content')

let MockWorkdirSetStore: jest.Mock
let MockRepoStore: jest.Mock
let MockWorkspaceStore: jest.Mock
let handlers: any

beforeEach(() => {
  mockExistsSync.mockReset()
  mockMkdirSync.mockReset()
  mockWriteFileSync.mockReset()
  mockExecFile.mockReset()
  mockGetAllSets.mockReset()
  mockGetRepoById.mockReset()
  mockWsGetAll.mockReset()
  mockWsGetById.mockReset()
  mockWsCreate.mockReset()
  mockWsUpdate.mockReset()
  mockWsRemove.mockReset()
  mockBuildDefaultClaudeMd.mockReset()
  mockBuildDefaultClaudeMd.mockReturnValue('# CLAUDE.md content')

  jest.resetModules()

  jest.doMock('fs', () => ({
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
  }))
  jest.doMock('child_process', () => ({
    execFile: mockExecFile,
  }))
  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => '/mock/userData') },
  }))

  MockWorkdirSetStore = jest.fn().mockImplementation(() => ({
    getAll: mockGetAllSets,
  }))
  jest.doMock('../../../src/main/services/workdirSetStore', () => MockWorkdirSetStore)

  MockRepoStore = jest.fn().mockImplementation(() => ({
    getById: mockGetRepoById,
  }))
  jest.doMock('../../../src/main/services/repoStore', () => MockRepoStore)

  MockWorkspaceStore = jest.fn().mockImplementation(() => ({
    getAll: mockWsGetAll,
    getById: mockWsGetById,
    create: mockWsCreate,
    update: mockWsUpdate,
    remove: mockWsRemove,
  }))
  jest.doMock('../../../src/main/services/workspaceStore', () => MockWorkspaceStore)

  jest.doMock('../../../src/main/constants/claudeConfigDefaults', () => ({
    buildDefaultClaudeMd: mockBuildDefaultClaudeMd,
  }))

  handlers = require('../../../src/main/handlers/workspaceHandlers')
})

afterEach(() => {
  handlers._resetStores()
  jest.restoreAllMocks()
})

describe('handleCreate', () => {

  // TC-WS-H01: handleCreate — 정상 빈 워크스페이스 생성
  test('TC-WS-H01: 유효한 name, parentPath로 handleCreate 호출 시 디렉토리, .claude/, CLAUDE.md 생성', async () => {
    mockWsCreate.mockReturnValue({
      id: 'uuid-1', name: 'TestWS', path: '/parent/TestWS',
      createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z'
    })

    const result = await handlers.handleCreate(null, { name: 'TestWS', parentPath: '/parent' })

    expect(result.success).toBe(true)
    expect(result.workspace.id).toBe('uuid-1')
    expect(result.workspace.name).toBe('TestWS')
    expect(result.workspace.path).toBe('/parent/TestWS')
    expect(result.workspace.type).toBe('empty')

    expect(mockMkdirSync).toHaveBeenCalledWith('/parent/TestWS', { recursive: true })
    expect(mockMkdirSync).toHaveBeenCalledWith('/parent/TestWS/.claude', { recursive: true })
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/parent/TestWS/CLAUDE.md',
      expect.any(String),
      'utf-8'
    )
    expect(mockWsCreate).toHaveBeenCalledWith('TestWS', '/parent/TestWS')
  })

  // TC-WS-H02: handleCreate — 빈 이름 시 EMPTY_NAME
  test('TC-WS-H02: 빈 이름으로 handleCreate 호출 시 EMPTY_NAME 에러', async () => {
    const result = await handlers.handleCreate(null, { name: '', parentPath: '/parent' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMPTY_NAME')
    expect(mockMkdirSync).not.toHaveBeenCalled()
    expect(mockWsCreate).not.toHaveBeenCalled()
  })

  // TC-WS-H03: handleCreate — 경로 미지정 시 PATH_REQUIRED
  test('TC-WS-H03: parentPath 누락 시 PATH_REQUIRED 에러', async () => {
    const result = await handlers.handleCreate(null, { name: 'Test' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('PATH_REQUIRED')
    expect(mockMkdirSync).not.toHaveBeenCalled()
  })

  // TC-WS-H04: handleCreate — fs.mkdirSync 실패 시 에러 전파
  test('TC-WS-H04: 디렉토리 생성 실패 시 에러 반환', async () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })

    const result = await handlers.handleCreate(null, { name: 'Test', parentPath: '/readonly' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('permission denied')
    expect(mockWsCreate).not.toHaveBeenCalled()
  })

  // TC-WS-H05: handleCreate — lang='ko' 시 buildDefaultClaudeMd가 'ko'로 호출됨
  test('TC-WS-H05: lang=ko 시 buildDefaultClaudeMd가 ko로 호출된다', async () => {
    mockWsCreate.mockReturnValue({
      id: 'uuid-1', name: 'Test', path: '/parent/Test',
      createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z'
    })

    const result = await handlers.handleCreate(null, { name: 'Test', parentPath: '/parent', lang: 'ko' })

    expect(result.success).toBe(true)
    expect(mockBuildDefaultClaudeMd).toHaveBeenCalledWith('Test', 'ko')
  })
})

describe('handleUpdate', () => {

  // TC-WS-H06: handleUpdate — 정상 이름 변경
  test('TC-WS-H06: 유효한 id, name으로 handleUpdate 호출 시 갱신된 워크스페이스 반환', async () => {
    mockWsUpdate.mockReturnValue({
      id: 'uuid-1', name: 'Renamed', path: '/parent/Test',
      createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T01:00:00.000Z'
    })

    const result = await handlers.handleUpdate(null, { id: 'uuid-1', name: 'Renamed' })

    expect(result.success).toBe(true)
    expect(result.workspace.name).toBe('Renamed')
    expect(result.workspace.type).toBe('empty')
    expect(mockWsUpdate).toHaveBeenCalledWith('uuid-1', { name: 'Renamed' })
  })

  // TC-WS-H07: handleUpdate — id 누락 시 ID_REQUIRED
  test('TC-WS-H07: id 누락 시 ID_REQUIRED 에러', async () => {
    const result = await handlers.handleUpdate(null, { name: 'New Name' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('ID_REQUIRED')
    expect(mockWsUpdate).not.toHaveBeenCalled()
  })

  // TC-WS-H08: handleUpdate — 빈 이름 시 EMPTY_NAME
  test('TC-WS-H08: 빈 이름으로 handleUpdate 호출 시 EMPTY_NAME 에러', async () => {
    const result = await handlers.handleUpdate(null, { id: 'uuid-1', name: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMPTY_NAME')
    expect(mockWsUpdate).not.toHaveBeenCalled()
  })

  // TC-WS-H09: handleUpdate — 미존재 id 시 NOT_FOUND
  test('TC-WS-H09: WorkspaceStore.update가 NOT_FOUND throw 시 에러 반환', async () => {
    mockWsUpdate.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })

    const result = await handlers.handleUpdate(null, { id: 'non-existent', name: 'New' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('NOT_FOUND')
  })
})

describe('handleDelete', () => {

  // TC-WS-H10: handleDelete — 정상 삭제
  test('TC-WS-H10: 유효한 id로 handleDelete 호출 시 성공 반환', async () => {
    mockWsRemove.mockReturnValue(true)

    const result = await handlers.handleDelete(null, { id: 'uuid-1' })

    expect(result.success).toBe(true)
    expect(mockWsRemove).toHaveBeenCalledWith('uuid-1')
  })

  // TC-WS-H11: handleDelete — id 누락 시 ID_REQUIRED
  test('TC-WS-H11: id 누락 시 ID_REQUIRED 에러', async () => {
    const result = await handlers.handleDelete(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBe('ID_REQUIRED')
    expect(mockWsRemove).not.toHaveBeenCalled()
  })

  // TC-WS-H12: handleDelete — 미존재 id 시 NOT_FOUND
  test('TC-WS-H12: WorkspaceStore.remove가 false 반환 시 NOT_FOUND 에러', async () => {
    mockWsRemove.mockReturnValue(false)

    const result = await handlers.handleDelete(null, { id: 'non-existent' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})

describe('handleList — 통합', () => {

  // TC-WS-H13: handleList — SDD-0027: WorkspaceStore 직접 조회, 빈 워크스페이스 목록 반환
  test('TC-WS-H13: SDD-0027 이후 handleList는 WorkspaceStore 직접 조회로 빈 워크스페이스만 반환한다', async () => {
    mockWsGetAll.mockReturnValue([
      { id: 'ws-1', name: 'Empty WS', path: '/empty/ws', createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' }
    ])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(1)
    expect(result.workspaces[0].type).toBe('empty')
    expect(result.workspaces[0].id).toBe('ws-1')
    expect(result.workspaces[0].name).toBe('Empty WS')
    expect(result.workspaces[0].path).toBe('/empty/ws')
    // WorkdirSetStore는 사용되지 않아야 함
    expect(MockWorkdirSetStore).not.toHaveBeenCalled()
  })

  // TC-WS-H14: handleList — SDD-0027: Sets/worktreeHandlers 미사용 확인
  test('TC-WS-H14: SDD-0027 이후 handleList는 Sets나 execFile에 의존하지 않는다', async () => {
    mockWsGetAll.mockReturnValue([
      { id: 'ws-dup', name: 'Dup', path: '/shared/path', createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' }
    ])

    const result = await handlers.handleList(null, {})

    expect(result.workspaces).toHaveLength(1)
    expect(result.workspaces[0].type).toBe('empty')
    expect(result.workspaces[0].path).toBe('/shared/path')
    // Sets, execFile 미사용 확인
    expect(mockExecFile).not.toHaveBeenCalled()
    expect(MockWorkdirSetStore).not.toHaveBeenCalled()
  })

  // TC-WS-H15: handleList — 빈 워크스페이스만 존재
  test('TC-WS-H15: sets가 비어있을 때 빈 워크스페이스만 반환된다', async () => {
    mockGetAllSets.mockReturnValue([])
    mockWsGetAll.mockReturnValue([
      { id: 'ws-1', name: 'WS A', path: '/ws/a', createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' },
      { id: 'ws-2', name: 'WS B', path: '/ws/b', createdAt: '2026-03-08T01:00:00.000Z', updatedAt: '2026-03-08T01:00:00.000Z' }
    ])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(2)
    expect(result.workspaces.every((w: any) => w.type === 'empty')).toBe(true)
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})
