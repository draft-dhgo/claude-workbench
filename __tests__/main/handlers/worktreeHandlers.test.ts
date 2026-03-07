const os = require('os')
const fs = require('fs')
const path = require('path')

const mockExecFile = jest.fn()
const mockShowOpenDialog = jest.fn()
const mockSend = jest.fn()

let tmpUserData
let handlers

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-'))
  mockExecFile.mockReset()
  mockShowOpenDialog.mockReset()
  mockSend.mockReset()

  jest.resetModules()
  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => tmpUserData) },
    dialog: { showOpenDialog: mockShowOpenDialog },
    BrowserWindow: {
      getAllWindows: jest.fn(() => [{ webContents: { send: mockSend } }])
    }
  }))
  jest.doMock('child_process', () => ({
    execFile: mockExecFile
  }))

  handlers = require('../../../src/main/handlers/worktreeHandlers')
})

afterEach(() => {
  fs.rmSync(tmpUserData, { recursive: true, force: true })
})

function seedRepos(repos) {
  const data = { version: 1, repositories: repos }
  fs.writeFileSync(
    path.join(tmpUserData, 'repositories.json'),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

function seedSets(sets) {
  const data = { version: 2, sets }
  fs.writeFileSync(
    path.join(tmpUserData, 'workdir-sets.json'),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

// ─── handleListBranches ───────────────────────────────────────────────────────

describe('handleListBranches', () => {
  test('TS-001: setId가 존재하지 않는 경우 NOT_FOUND 반환', async () => {
    const result = await handlers.handleListBranches(null, { setId: 'non-existent-set-id' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TS-002: 저장소가 없는 세트 — 빈 배열 반환', async () => {
    seedSets([
      { id: 's1', name: '빈 세트', repositories: [], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.branches).toEqual([])
    expect(result.commonBranches).toEqual([])
  })

  test('TS-003: 단일 저장소 브랜치 목록 조회 — 전체가 공통 브랜치', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, 'main\norigin/main\ndevelop\n', '')
    })
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.branches).toEqual(expect.arrayContaining(['main', 'origin/main', 'develop']))
    expect(result.branches).toHaveLength(3)
    expect(result.commonBranches).toEqual(expect.arrayContaining(['main', 'origin/main', 'develop']))
    expect(result.commonBranches).toHaveLength(3)
  })

  test('TS-004: 다중 저장소 공통 브랜치 우선 정렬', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'repo-B', path: '/repos/repo-B', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 1) {
        cb(null, 'main\norigin/main\nfeature/a\n', '')
      } else {
        cb(null, 'main\norigin/main\nfeature/b\n', '')
      }
    })
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.commonBranches).toEqual(['main', 'origin/main'])
    // 앞 2개가 공통 브랜치여야 함
    expect(result.branches[0]).toBe('main')
    expect(result.branches[1]).toBe('origin/main')
    // 중복 없음
    const unique = [...new Set(result.branches)]
    expect(unique).toHaveLength(result.branches.length)
    // feature/a, feature/b 모두 포함
    expect(result.branches).toContain('feature/a')
    expect(result.branches).toContain('feature/b')
  })

  test('TS-005: execFile 오류 발생 시 해당 저장소 브랜치 제외', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'repo-B', path: '/repos/repo-B', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 1) {
        cb(null, 'main\n', '')
      } else {
        cb(new Error('git error'), '', 'fatal: not a git repository')
      }
    })
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.branches).toContain('main')
    // repo-B 실패 → main은 1개 저장소에만 있어서 공통 아님 (total 2개 저장소 중 1개만)
    expect(result.commonBranches).toEqual([])
  })

  test('TS-003b: repoBranches 배열이 응답에 포함됨', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, 'main\norigin/main\ndevelop\n', '')
    })
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.success).toBe(true)
    // 기존 필드 하위 호환 확인
    expect(result.branches).toBeDefined()
    expect(result.commonBranches).toBeDefined()
    // 신규 repoBranches 필드 확인
    expect(result.repoBranches).toBeDefined()
    expect(Array.isArray(result.repoBranches)).toBe(true)
    expect(result.repoBranches[0].repoId).toBe('r1')
    expect(result.repoBranches[0].branches).toEqual(expect.arrayContaining(['main', 'origin/main', 'develop']))
  })

  test('TS-004b: 다중 저장소 — repoBranches[].branches가 각자의 목록 포함', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'repo-B', path: '/repos/repo-B', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 1) {
        cb(null, 'main\nfeature/a\n', '')
      } else {
        cb(null, 'main\nfeature/b\n', '')
      }
    })
    const result = await handlers.handleListBranches(null, { setId: 's1' })
    expect(result.repoBranches).toHaveLength(2)
    expect(result.repoBranches[0].repoId).toBe('r1')
    expect(result.repoBranches[0].branches).toContain('feature/a')
    expect(result.repoBranches[0].branches).not.toContain('feature/b')
    expect(result.repoBranches[1].repoId).toBe('r2')
    expect(result.repoBranches[1].branches).toContain('feature/b')
    expect(result.repoBranches[1].branches).not.toContain('feature/a')
  })
})

// ─── handleFetch ──────────────────────────────────────────────────────────────

describe('handleFetch', () => {
  test('TS-006: 모든 저장소 fetch 성공', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'fetch') {
        cb(null, '', '')
      } else if (args[0] === 'branch') {
        cb(null, 'main\n', '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleFetch(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results[0].status).toBe('success')
    expect(result.results[1].status).toBe('success')
    expect(result.results[0].repoName).toBe('frontend')
    expect(result.results[1].repoName).toBe('backend')
    expect(result.branches).not.toHaveLength(0)
  })

  test('TS-007: 일부 저장소 fetch 실패', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let fetchCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'fetch') {
        fetchCount++
        if (fetchCount === 1) {
          cb(null, '', '')
        } else {
          cb(new Error('git error'), '', 'fatal: No remote configured')
        }
      } else if (args[0] === 'branch') {
        cb(null, 'main\n', '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleFetch(null, { setId: 's1' })
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(2)
    const frontendResult = result.results.find(r => r.repoName === 'frontend')
    const backendResult = result.results.find(r => r.repoName === 'backend')
    expect(frontendResult.status).toBe('success')
    expect(backendResult.status).toBe('error')
  })

  test('TS-008: setId가 존재하지 않는 경우 NOT_FOUND 반환', async () => {
    const result = await handlers.handleFetch(null, { setId: 'non-existent' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})

// ─── handleCreateAll ──────────────────────────────────────────────────────────

describe('handleCreateAll', () => {
  test('TS-009: 모든 저장소 worktree 생성 성공', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: 'develop' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    const result = await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [
        { id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' },
        { id: 'r2', path: '/repos/backend', name: 'backend', baseBranch: 'develop' }
      ]
    })
    expect(result.success).toBe(true)
    expect(result.succeeded).toHaveLength(2)
    expect(result.failed).toEqual([])
    expect(result.succeeded).toContain('r1')
    expect(result.succeeded).toContain('r2')
  })

  test('TS-010: worktree:progress 이벤트 순서 및 페이로드 검증', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: 'develop' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [
        { id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' },
        { id: 'r2', path: '/repos/backend', name: 'backend', baseBranch: 'develop' }
      ]
    })
    expect(mockSend).toHaveBeenCalledTimes(4)
    const calls = mockSend.mock.calls
    // frontend: running → success
    expect(calls[0][0]).toBe('worktree:progress')
    expect(calls[0][1].repoId).toBe('r1')
    expect(calls[0][1].repoName).toBe('frontend')
    expect(calls[0][1].status).toBe('running')
    expect(calls[1][0]).toBe('worktree:progress')
    expect(calls[1][1].repoId).toBe('r1')
    expect(calls[1][1].repoName).toBe('frontend')
    expect(calls[1][1].status).toBe('success')
    // backend: running → success
    expect(calls[2][0]).toBe('worktree:progress')
    expect(calls[2][1].repoId).toBe('r2')
    expect(calls[2][1].repoName).toBe('backend')
    expect(calls[2][1].status).toBe('running')
    expect(calls[3][0]).toBe('worktree:progress')
    expect(calls[3][1].repoId).toBe('r2')
    expect(calls[3][1].repoName).toBe('backend')
    expect(calls[3][1].status).toBe('success')
  })

  test('TS-011: 브랜치 이미 존재 오류 메시지 변환 (FR-09)', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      const err = new Error('git error')
      cb(err, '', 'fatal: A branch named feature/task-1 already exists.')
    })
    const result = await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [{ id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' }]
    })
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].error).toBe('브랜치 이미 존재')
    expect(result.failed[0].repoName).toBe('frontend')
    // 마지막 progress 이벤트가 error이고 메시지에 '브랜치 이미 존재' 포함
    const calls = mockSend.mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1].status).toBe('error')
    expect(lastCall[1].message).toContain('브랜치 이미 존재')
  })

  test('TS-012: 일부 실패 후 나머지 저장소 계속 처리', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r3', name: 'shared-lib', path: '/repos/shared-lib', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: 'main' }, { id: 'r3', baseBranch: 'main' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 2) {
        // backend (second repo) fails
        const err = new Error('git error')
        cb(err, '', 'fatal: A branch named feature/task-1 already exists.')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [
        { id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' },
        { id: 'r2', path: '/repos/backend', name: 'backend', baseBranch: 'main' },
        { id: 'r3', path: '/repos/shared-lib', name: 'shared-lib', baseBranch: 'main' }
      ]
    })
    expect(result.success).toBe(true)
    expect(result.succeeded).toHaveLength(2)
    expect(result.failed).toHaveLength(1)
    expect(result.succeeded).toContain('r1')
    expect(result.succeeded).toContain('r3')
    expect(result.failed[0].repoId).toBe('r2')
    expect(result.failed[0].repoName).toBe('backend')
    expect(result.failed[0].error).toBe('브랜치 이미 존재')
    // 총 6번 호출 (각 저장소당 2번: running + success/error)
    expect(mockSend).toHaveBeenCalledTimes(6)
  })

  test('TS-013: setId가 존재하지 않는 경우 NOT_FOUND 반환', async () => {
    const result = await handlers.handleCreateAll(null, {
      setId: 'non-existent',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: []
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TS-014: git worktree 경로 조합 검증', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [{ id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' }]
    })
    const calls = mockExecFile.mock.calls
    const worktreeCall = calls.find(c => c[1] && c[1][0] === 'worktree')
    expect(worktreeCall).toBeDefined()
    const [, args, opts] = worktreeCall
    expect(args).toEqual(['worktree', 'add', '-b', 'feature/task-1', path.join('/tmp/worktrees', 'frontend', 'feature/task-1'), 'main'])
    expect(opts.cwd).toBe('/repos/frontend')
  })

  test('TS-NEW-01: repos 배열의 각 레포별 baseBranch가 개별 git 인자로 전달됨', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/repos/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: 'develop' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [
        { id: 'r1', path: '/repos/frontend', name: 'frontend', baseBranch: 'main' },
        { id: 'r2', path: '/repos/backend', name: 'backend', baseBranch: 'develop' }
      ]
    })
    const calls = mockExecFile.mock.calls
    const worktreeCalls = calls.filter(c => c[1] && c[1][0] === 'worktree')
    expect(worktreeCalls).toHaveLength(2)

    // r1: baseBranch = 'main'
    const r1Call = worktreeCalls.find(c => c[2].cwd === '/repos/frontend')
    expect(r1Call).toBeDefined()
    expect(r1Call[1][r1Call[1].length - 1]).toBe('main')

    // r2: baseBranch = 'develop'
    const r2Call = worktreeCalls.find(c => c[2].cwd === '/repos/backend')
    expect(r2Call).toBeDefined()
    expect(r2Call[1][r2Call[1].length - 1]).toBe('develop')
  })

  test('TS-NEW-02: repos 중 baseBranch 빈 문자열인 경우 처리', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    seedSets([
      { id: 's1', name: '세트', repositories: [{ id: 'r1', baseBranch: '' }], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    const result = await handlers.handleCreateAll(null, {
      setId: 's1',
      newBranch: 'feature/task-1',
      targetPath: '/tmp/worktrees',
      repos: [{ id: 'r1', path: '/repos/repo-A', name: 'repo-A', baseBranch: '' }]
    })
    expect(result.success).toBe(true)
    const calls = mockExecFile.mock.calls
    const worktreeCall = calls.find(c => c[1] && c[1][0] === 'worktree')
    expect(worktreeCall).toBeDefined()
    // 마지막 인수가 빈 문자열
    expect(worktreeCall[1][worktreeCall[1].length - 1]).toBe('')
  })
})

// ─── handleSelectPath ─────────────────────────────────────────────────────────

describe('handleSelectPath', () => {
  test('TS-015: 디렉토리 선택 성공', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/Users/dev/worktrees'] })
    const result = await handlers.handleSelectPath(null)
    expect(result.success).toBe(true)
    expect(result.path).toBe('/Users/dev/worktrees')
  })

  test('TS-016: 다이얼로그 취소', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    const result = await handlers.handleSelectPath(null)
    expect(result.success).toBe(false)
    expect(result.path).toBeUndefined()
  })

  test('TS-017: showOpenDialog 호출 옵션 검증', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    await handlers.handleSelectPath(null)
    expect(mockShowOpenDialog).toHaveBeenCalledTimes(1)
    const callArgs = mockShowOpenDialog.mock.calls[0]
    // 첫 번째 인수 또는 두 번째 인수에 properties가 있어야 함
    const options = callArgs.find(arg => arg && arg.properties)
    expect(options).toBeDefined()
    expect(options.properties).toContain('openDirectory')
  })
})
