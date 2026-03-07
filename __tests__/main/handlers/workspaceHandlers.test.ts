/**
 * workspaceHandlers.test.ts
 * TDD Log-0013: TC-0013-01 ~ TC-0013-09
 * BUG-001 fix: class constructor mock pattern (lazy-singleton)
 * jest.resetModules() + jest.doMock() pattern for full isolation
 */

const mockExistsSync  = jest.fn()
const mockExecFile    = jest.fn()
const mockGetAllSets  = jest.fn()
const mockGetRepoById = jest.fn()

let MockWorkdirSetStore: jest.Mock
let MockRepoStore: jest.Mock

let handlers: any

beforeEach(() => {
  mockExistsSync.mockReset()
  mockExecFile.mockReset()
  mockGetAllSets.mockReset()
  mockGetRepoById.mockReset()

  jest.resetModules()

  jest.doMock('fs', () => ({
    existsSync: mockExistsSync,
  }))
  jest.doMock('child_process', () => ({
    execFile: mockExecFile,
  }))
  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => '/mock/userData') },
  }))

  // Class constructor mock (BUG-001 fix pattern)
  MockWorkdirSetStore = jest.fn().mockImplementation(() => ({
    getAll: mockGetAllSets,
  }))
  jest.doMock('../../../src/main/services/workdirSetStore', () => MockWorkdirSetStore)

  MockRepoStore = jest.fn().mockImplementation(() => ({
    getById: mockGetRepoById,
  }))
  jest.doMock('../../../src/main/services/repoStore', () => MockRepoStore)

  handlers = require('../../../src/main/handlers/workspaceHandlers')
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('handleList', () => {

  // --- TC-0013-01: normal workspace list ---

  test('TC-0013-01: set with repos returns workspace list (main repo excluded)', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [{ id: 'r1' }] }
    ])
    mockGetRepoById.mockImplementation((id: string) => {
      if (id === 'r1') return { id: 'r1', name: 'repo-a', path: '/src/repo-a', addedAt: '2026-03-01T00:00:00.000Z' }
      return null
    })

    const porcelainOutput =
      'worktree /src/repo-a\nHEAD abc123\nbranch refs/heads/main\n\n' +
      'worktree /base/repo-a/feature-xyz\nHEAD def456\nbranch refs/heads/feature-xyz\n'

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, porcelainOutput, '')
    })

    mockExistsSync.mockImplementation((p: string) => p === '/base/repo-a/feature-xyz')

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(1)
    expect(result.workspaces[0].path).toBe('/base/repo-a/feature-xyz')
    expect(result.workspaces[0].name).toBe('feature-xyz')
    // main repo path must be excluded
    const paths = result.workspaces.map((w: any) => w.path)
    expect(paths).not.toContain('/src/repo-a')
  })

  // --- TC-0013-02: empty sets returns empty list (original bug trigger) ---

  test('TC-0013-02: no sets -> workspaces: [] (regression: original bug trigger)', async () => {
    mockGetAllSets.mockReturnValue([])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toEqual([])
    expect(mockExecFile).not.toHaveBeenCalled()
    expect(mockExistsSync).not.toHaveBeenCalled()
  })

  // --- TC-0013-03: store method exception -> graceful error ---

  test('TC-0013-03: getAll() throws -> { success: false, error }', async () => {
    mockGetAllSets.mockImplementation(() => {
      throw new Error('DB 읽기 오류')
    })

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('DB 읽기 오류')
    expect(result.workspaces).toBeUndefined()
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  // --- TC-0013-04: regression - getAll/getById called as instance methods ---

  test('TC-0013-04: stores are instantiated with new and app.getPath (regression)', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [{ id: 'r1' }] }
    ])
    mockGetRepoById.mockImplementation((id: string) => {
      if (id === 'r1') return { id: 'r1', name: 'repo-a', path: '/src/repo-a', addedAt: '2026-03-01T00:00:00.000Z' }
      return null
    })

    const porcelainOutput =
      'worktree /src/repo-a\nHEAD abc123\nbranch refs/heads/main\n\n' +
      'worktree /base/repo-a/feature-xyz\nHEAD def456\nbranch refs/heads/feature-xyz\n'

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, porcelainOutput, '')
    })

    mockExistsSync.mockImplementation((p: string) => p === '/base/repo-a/feature-xyz')

    await handlers.handleList(null, {})

    // WorkdirSetStore was instantiated with new
    expect(MockWorkdirSetStore).toHaveBeenCalled()
    expect(MockWorkdirSetStore.mock.calls[0][0]).toBe('/mock/userData')
    // getAll was called as instance method
    expect(mockGetAllSets).toHaveBeenCalled()

    // RepoStore was instantiated with new
    expect(MockRepoStore).toHaveBeenCalled()
    expect(MockRepoStore.mock.calls[0][0]).toBe('/mock/userData')
    // getById was called as instance method
    expect(mockGetRepoById).toHaveBeenCalledWith('r1')
  })

  // --- TC-0013-05: set with empty repositories ---

  test('TC-0013-05: set with empty repositories -> workspaces: []', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [] }
    ])

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toEqual([])
    expect(mockGetRepoById).not.toHaveBeenCalled()
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  // --- TC-0013-06: _resetStores() clears singleton cache ---

  test('TC-0013-06: _resetStores() clears cached store instances', async () => {
    mockGetAllSets.mockReturnValue([])

    // First call - stores get created
    await handlers.handleList(null, {})
    const firstCallCount = MockWorkdirSetStore.mock.calls.length

    // Reset stores
    handlers._resetStores()

    // Second call - stores should be re-created
    await handlers.handleList(null, {})
    const secondCallCount = MockWorkdirSetStore.mock.calls.length

    expect(firstCallCount).toBe(1)
    expect(secondCallCount).toBe(2)
  })

  // --- TC-0013-07: git command error skips repo ---

  test('TC-0013-07: git command error skips that repo, includes others', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [{ id: 'r1' }, { id: 'r2' }] }
    ])
    mockGetRepoById.mockImplementation((id: string) => {
      if (id === 'r1') return { id: 'r1', path: '/src/repo-a' }
      if (id === 'r2') return { id: 'r2', path: '/src/repo-b' }
      return null
    })

    const porcelainOutputR2 =
      'worktree /src/repo-b\nHEAD abc123\nbranch refs/heads/main\n\n' +
      'worktree /base/repo-b/feature-abc\nHEAD def456\nbranch refs/heads/feature-abc\n'

    mockExecFile
      .mockImplementationOnce((_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(new Error('fatal: not a git repository'), '', '')
      })
      .mockImplementationOnce((_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(null, porcelainOutputR2, '')
      })

    mockExistsSync.mockImplementation((p: string) => p === '/base/repo-b/feature-abc')

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(1)
    expect(result.workspaces[0].path).toBe('/base/repo-b/feature-abc')
    expect(result.workspaces[0].name).toBe('feature-abc')

    const paths = result.workspaces.map((w: any) => w.path)
    expect(paths).not.toContain('/src/repo-a')
  })

  // --- TC-0013-08: existsSync false excludes path ---

  test('TC-0013-08: existsSync false excludes worktree path', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [{ id: 'r1' }] }
    ])
    mockGetRepoById.mockImplementation((id: string) => {
      if (id === 'r1') return { id: 'r1', path: '/src/repo-a' }
      return null
    })

    const porcelainOutput =
      'worktree /src/repo-a\nHEAD abc123\nbranch refs/heads/main\n\n' +
      'worktree /base/repo-a/feature-xyz\nHEAD def456\nbranch refs/heads/feature-xyz\n'

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, porcelainOutput, '')
    })

    mockExistsSync.mockReturnValue(false)

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toEqual([])
    expect(mockExistsSync).toHaveBeenCalledWith('/base/repo-a/feature-xyz')
  })

  // --- TC-0013-09: duplicate path dedup ---

  test('TC-0013-09: duplicate paths are deduplicated', async () => {
    mockGetAllSets.mockReturnValue([
      { id: 's1', targetPath: '/base', repositories: [{ id: 'r1' }] },
      { id: 's2', targetPath: '/base', repositories: [{ id: 'r1' }] },
    ])
    mockGetRepoById.mockImplementation((id: string) => {
      if (id === 'r1') return { id: 'r1', path: '/src/repo-a' }
      return null
    })

    const porcelainOutput =
      'worktree /src/repo-a\nHEAD abc123\nbranch refs/heads/main\n\n' +
      'worktree /base/repo-a/feature-xyz\nHEAD def456\nbranch refs/heads/feature-xyz\n'

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, porcelainOutput, '')
    })

    mockExistsSync.mockImplementation((p: string) => p === '/base/repo-a/feature-xyz')

    const result = await handlers.handleList(null, {})

    expect(result.success).toBe(true)
    expect(result.workspaces).toHaveLength(1)
    expect(result.workspaces[0].path).toBe('/base/repo-a/feature-xyz')
  })
})
