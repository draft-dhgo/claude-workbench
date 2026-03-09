/**
 * TDD-0024 Red Phase: worktreeHandlers 신규 핸들러 테스트
 * TC-0024-01 ~ TC-0024-30
 *
 * 5개 신규 핸들러:
 * - handleCreateSingle
 * - handleListBranchesSingle
 * - handleFetchSingle
 * - handleListUnpushed
 * - handleDetachWorktree
 */
const os = require('os')
const fs = require('fs')
const path = require('path')

const mockExecFile = jest.fn()
const mockShowOpenDialog = jest.fn()
const mockSend = jest.fn()

let tmpUserData: string
let handlers: any

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-0024-'))
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
  // Restore permissions before cleanup (for TC-0024-30)
  try {
    const entries = fs.readdirSync(tmpUserData)
    for (const entry of entries) {
      const fullPath = path.join(tmpUserData, entry)
      try { fs.chmodSync(fullPath, 0o755) } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  fs.rmSync(tmpUserData, { recursive: true, force: true })
})

function seedRepos(repos: any[]) {
  const data = { version: 1, repositories: repos }
  fs.writeFileSync(
    path.join(tmpUserData, 'repositories.json'),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

function createFakeWorktree(repoPath: string, worktreePath: string, worktreeName: string) {
  const worktreeGitDir = path.join(repoPath, '.git', 'worktrees', worktreeName)
  fs.mkdirSync(worktreeGitDir, { recursive: true })
  fs.mkdirSync(worktreePath, { recursive: true })
  fs.writeFileSync(
    path.join(worktreePath, '.git'),
    `gitdir: ${worktreeGitDir}\n`,
    'utf-8'
  )
}

const REPO_R1 = {
  id: 'r1',
  name: 'my-repo',
  path: '/repos/my-repo',
  addedAt: '2026-03-09T00:00:00.000Z'
}

// 샘플 git worktree list --porcelain 출력
const WORKTREE_PORCELAIN_3 = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
  'worktree /path/to/worktree/feature-a',
  'HEAD def5678',
  'branch refs/heads/feature/a',
  '',
  'worktree /path/to/worktree/feature-b',
  'HEAD ghi9012',
  'branch refs/heads/feature/b',
  '',
].join('\n')

const WORKTREE_PORCELAIN_MAIN_ONLY = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
].join('\n')

const WORKTREE_PORCELAIN_DETACHED = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
  'worktree /path/to/detached',
  'HEAD abc1234',
  'detached',
  '',
].join('\n')

const WORKTREE_PORCELAIN_GONE = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
  'worktree /path/to/worktree/old-gone-br',
  'HEAD jkl3456',
  'branch refs/heads/old/gone-br',
  '',
].join('\n')

// 샘플 git branch -vv 출력
const BRANCH_VV_ALL_PUSHED = '* main           abc1234 [origin/main] commit message\n  feature/a      def5678 [origin/feature/a] pushed\n  feature/b      ghi9012 [origin/feature/b] pushed\n'

const BRANCH_VV_MIXED = [
  '* main           abc1234 [origin/main] commit message',
  '  feature/a      def5678 local commit',
  '  feature/b      ghi9012 [origin/feature/b] pushed commit',
  '',
].join('\n')

const BRANCH_VV_MAIN_PUSHED = '* main           abc1234 [origin/main] commit message\n'

const BRANCH_VV_GONE = [
  '* main           abc1234 [origin/main] commit message',
  '  old/gone-br    jkl3456 [origin/old/gone-br: gone] removed',
  '',
].join('\n')

// ─── handleCreateSingle ─────────────────────────────────────────────────────

describe('handleCreateSingle', () => {
  test('TC-0024-01: 정상 워크트리 생성 성공', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })
    const result = await handlers.handleCreateSingle(null, {
      repoId: 'r1',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/wt'
    })
    expect(result.success).toBe(true)
    expect(result.worktreePath).toBe(path.join('/tmp/wt', 'my-repo', 'feature/new'))

    // execGit 호출 인수 검증
    const call = mockExecFile.mock.calls[0]
    expect(call[1]).toEqual([
      'worktree', 'add', '-b', 'feature/new',
      path.join('/tmp/wt', 'my-repo', 'feature/new'),
      'main'
    ])
    expect(call[2].cwd).toBe('/repos/my-repo')
  })

  test('TC-0024-02: progress 이벤트 순서 검증', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })
    await handlers.handleCreateSingle(null, {
      repoId: 'r1',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/wt'
    })
    expect(mockSend).toHaveBeenCalledTimes(2)
    const calls = mockSend.mock.calls
    expect(calls[0][0]).toBe('worktree:progress')
    expect(calls[0][1].repoId).toBe('r1')
    expect(calls[0][1].status).toBe('running')
    expect(calls[1][0]).toBe('worktree:progress')
    expect(calls[1][1].repoId).toBe('r1')
    expect(calls[1][1].status).toBe('success')
  })

  test('TC-0024-03: repoId 미존재 시 NOT_FOUND 반환', async () => {
    // repositories.json 없음
    const result = await handlers.handleCreateSingle(null, {
      repoId: 'non-existent',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/wt'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  test('TC-0024-04: 브랜치 이미 존재 시 에러 메시지 변환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err = new Error('git error')
      cb(err, '', 'fatal: A branch named feature/new already exists.')
    })
    const result = await handlers.handleCreateSingle(null, {
      repoId: 'r1',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/wt'
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('브랜치 이미 존재')

    // progress error 이벤트
    const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1]
    expect(lastCall[1].status).toBe('error')
    expect(lastCall[1].message).toContain('브랜치 이미 존재')
  })

  test('TC-0024-05: execGit 일반 에러 시 에러 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err = new Error('git error')
      cb(err, '', 'fatal: some other error')
    })
    const result = await handlers.handleCreateSingle(null, {
      repoId: 'r1',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/wt'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()

    const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1]
    expect(lastCall[1].status).toBe('error')
  })

  test('TC-0024-29: targetPath 경로에 특수문자 포함', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })
    const result = await handlers.handleCreateSingle(null, {
      repoId: 'r1',
      baseBranch: 'main',
      newBranch: 'feature/new',
      targetPath: '/tmp/워크 트리/path'
    })
    expect(result.success).toBe(true)
    expect(result.worktreePath).toBe(path.join('/tmp/워크 트리/path', 'my-repo', 'feature/new'))

    const call = mockExecFile.mock.calls[0]
    expect(call[1]).toContain(path.join('/tmp/워크 트리/path', 'my-repo', 'feature/new'))
  })
})

// ─── handleListBranchesSingle ───────────────────────────────────────────────

describe('handleListBranchesSingle', () => {
  test('TC-0024-06: 브랜치 목록 정상 조회', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, 'main\norigin/main\ndevelop\nfeature/x\n', '')
    })
    const result = await handlers.handleListBranchesSingle(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.branches).toEqual(['main', 'origin/main', 'develop', 'feature/x'])

    const call = mockExecFile.mock.calls[0]
    expect(call[1]).toEqual(['branch', '-a', '--format=%(refname:short)'])
    expect(call[2].cwd).toBe('/repos/my-repo')
  })

  test('TC-0024-07: 빈 출력 시 빈 배열 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })
    const result = await handlers.handleListBranchesSingle(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.branches).toEqual([])
  })

  test('TC-0024-08: repoId 미존재 시 NOT_FOUND 반환', async () => {
    const result = await handlers.handleListBranchesSingle(null, { repoId: 'no-repo' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-0024-09: execGit 실패 시 에러 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(new Error('git error'), '', 'fatal: not a git repository')
    })
    const result = await handlers.handleListBranchesSingle(null, { repoId: 'r1' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── handleFetchSingle ──────────────────────────────────────────────────────

describe('handleFetchSingle', () => {
  test('TC-0024-10: fetch 성공', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })
    const result = await handlers.handleFetchSingle(null, { repoId: 'r1' })
    expect(result.success).toBe(true)

    const call = mockExecFile.mock.calls[0]
    expect(call[1]).toEqual(['fetch', '--all'])
    expect(call[2].cwd).toBe('/repos/my-repo')
  })

  test('TC-0024-11: repoId 미존재 시 NOT_FOUND 반환', async () => {
    const result = await handlers.handleFetchSingle(null, { repoId: 'ghost' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-0024-12: fetch 실패 시 에러 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(new Error('git error'), '', 'fatal: unable to access remote')
    })
    const result = await handlers.handleFetchSingle(null, { repoId: 'r1' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── handleListUnpushed ─────────────────────────────────────────────────────

describe('handleListUnpushed', () => {
  test('TC-0024-13: unpushed 워크트리만 필터링하여 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_3, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MIXED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListUnpushed(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toBeDefined()
    // feature/a is unpushed (no upstream), feature/b is pushed
    const branches = result.worktrees.map((w: any) => w.branch)
    expect(branches).toContain('feature/a')
    expect(branches).not.toContain('feature/b')
    expect(branches).not.toContain('main')
  })

  test('TC-0024-14: 모든 워크트리가 pushed인 경우 빈 배열 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_MAIN_ONLY, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MAIN_PUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListUnpushed(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toEqual([])
  })

  test('TC-0024-15: repoId 미존재 시 NOT_FOUND 반환', async () => {
    const result = await handlers.handleListUnpushed(null, { repoId: 'missing' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-0024-16: detached HEAD 워크트리는 unpushed 목록에서 제외', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_DETACHED, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MAIN_PUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListUnpushed(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toEqual([])
  })

  test('TC-0024-17: [gone] upstream 브랜치 워크트리는 unpushed에 포함', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_GONE, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_GONE, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListUnpushed(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    const branches = result.worktrees.map((w: any) => w.branch)
    expect(branches).toContain('old/gone-br')
  })

  test('TC-0024-18: execGit 실패 시 에러 반환', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(new Error('git error'), '', 'fatal: not a git repository')
    })
    const result = await handlers.handleListUnpushed(null, { repoId: 'r1' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── handleDetachWorktree ───────────────────────────────────────────────────

describe('handleDetachWorktree', () => {
  test('TC-0024-19: 정상 연결 해제 성공 (전체 흐름)', async () => {
    // tmpdir 내에 fake repo와 worktree 구조 생성
    const repoPath = path.join(tmpUserData, 'fake-repo')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree')
    createFakeWorktree(repoPath, worktreePath, 'feature-x')

    seedRepos([{ ...REPO_R1, path: repoPath }])

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'feature/x'
    })

    expect(result.success).toBe(true)

    // .git 파일 삭제됨
    expect(fs.existsSync(path.join(worktreePath, '.git'))).toBe(false)

    // .git/worktrees/feature-x 디렉토리 삭제됨
    expect(fs.existsSync(path.join(repoPath, '.git', 'worktrees', 'feature-x'))).toBe(false)

    // git branch -D 호출됨
    const branchCall = mockExecFile.mock.calls.find((c: any) => c[1] && c[1][0] === 'branch')
    expect(branchCall).toBeDefined()
    expect(branchCall[1]).toEqual(['branch', '-D', 'feature/x'])
  })

  test('TC-0024-20: repoId 미존재 시 NOT_FOUND 반환', async () => {
    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'no-repo',
      worktreePath: '/any',
      branch: 'x'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-0024-21: .git 파일 미존재 시 DOTGIT_NOT_FOUND 에러', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-21')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-21')
    fs.mkdirSync(worktreePath, { recursive: true })
    // .git 파일 없음

    seedRepos([{ ...REPO_R1, path: repoPath }])

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'x'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('DOTGIT_NOT_FOUND')
  })

  test('TC-0024-22: .git이 디렉토리인 경우 NOT_WORKTREE 에러', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-22')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-22')
    fs.mkdirSync(worktreePath, { recursive: true })
    // .git을 디렉토리로 생성 (메인 레포처럼)
    fs.mkdirSync(path.join(worktreePath, '.git'), { recursive: true })

    seedRepos([{ ...REPO_R1, path: repoPath }])

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'x'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_WORKTREE')
  })

  test('TC-0024-23: git branch -D 실패 시에도 success: true 반환', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-23')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-23')
    createFakeWorktree(repoPath, worktreePath, 'feature-x')

    seedRepos([{ ...REPO_R1, path: repoPath }])

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(new Error('error: branch not found'), '', 'error: branch not found')
    })

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'feature/x'
    })
    expect(result.success).toBe(true)

    // .git 파일 삭제됨
    expect(fs.existsSync(path.join(worktreePath, '.git'))).toBe(false)
    // .git/worktrees/ 삭제됨
    expect(fs.existsSync(path.join(repoPath, '.git', 'worktrees', 'feature-x'))).toBe(false)
  })

  test('TC-0024-24: .git/worktrees/ 디렉토리 미존재 시에도 성공', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-24')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-24')
    fs.mkdirSync(worktreePath, { recursive: true })

    // .git 파일은 존재하나 gitdir 경로의 디렉토리는 없음
    const nonExistentGitDir = path.join(repoPath, '.git', 'worktrees', 'feature-x')
    fs.writeFileSync(
      path.join(worktreePath, '.git'),
      `gitdir: ${nonExistentGitDir}\n`,
      'utf-8'
    )

    seedRepos([{ ...REPO_R1, path: repoPath }])

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'feature/x'
    })
    expect(result.success).toBe(true)
    // .git 파일 삭제됨
    expect(fs.existsSync(path.join(worktreePath, '.git'))).toBe(false)
  })

  test('TC-0024-25: progress 이벤트 검증', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-25')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-25')
    createFakeWorktree(repoPath, worktreePath, 'feature-x')

    seedRepos([{ ...REPO_R1, path: repoPath }])

    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '')
    })

    await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'feature/x'
    })

    const progressCalls = mockSend.mock.calls.filter((c: any) => c[0] === 'worktree:progress')
    const statuses = progressCalls.map((c: any) => c[1].status)
    expect(statuses).toContain('running')
    expect(statuses).toContain('success')
  })

  test('TC-0024-30: .git 파일 삭제 권한 없음 시 에러', async () => {
    const repoPath = path.join(tmpUserData, 'fake-repo-30')
    fs.mkdirSync(repoPath, { recursive: true })
    const worktreePath = path.join(tmpUserData, 'fake-worktree-30')
    createFakeWorktree(repoPath, worktreePath, 'feature-x')

    seedRepos([{ ...REPO_R1, path: repoPath }])

    // Make .git file read-only (simulate permission error)
    const dotGitPath = path.join(worktreePath, '.git')
    fs.chmodSync(dotGitPath, 0o444)
    // Also make parent directory read-only to prevent unlinkSync
    fs.chmodSync(worktreePath, 0o555)

    const result = await handlers.handleDetachWorktree(null, {
      repoId: 'r1',
      worktreePath,
      branch: 'feature/x'
    })

    // Restore permissions for cleanup
    fs.chmodSync(worktreePath, 0o755)
    fs.chmodSync(dotGitPath, 0o644)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── Regression: 기존 핸들러 export 보존 ────────────────────────────────────

describe('Regression: export 보존 확인', () => {
  test('TC-0024-26: handleListByRepo 리팩토링 후 동작 보존', async () => {
    seedRepos([REPO_R1])
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_3, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MIXED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toBeDefined()
    expect(result.worktrees).toHaveLength(3)

    const mainWt = result.worktrees.find((w: any) => w.branch === 'main')
    expect(mainWt.isPushed).toBe(true)

    const featureAWt = result.worktrees.find((w: any) => w.branch === 'feature/a')
    expect(featureAWt.isPushed).toBe(false)

    const featureBWt = result.worktrees.find((w: any) => w.branch === 'feature/b')
    expect(featureBWt.isPushed).toBe(true)
  })

  test('TC-0024-27: 기존 6개 핸들러 export 보존 확인', async () => {
    expect(typeof handlers.handleListBranches).toBe('function')
    expect(typeof handlers.handleFetch).toBe('function')
    expect(typeof handlers.handleCreateAll).toBe('function')
    expect(typeof handlers.handleSelectPath).toBe('function')
    expect(typeof handlers.handleListByRepo).toBe('function')
    expect(typeof handlers.handleDeleteWorktree).toBe('function')
    expect(typeof handlers._resetStores).toBe('function')
  })

  test('TC-0024-28: 신규 5개 핸들러 export 존재 확인', async () => {
    expect(typeof handlers.handleCreateSingle).toBe('function')
    expect(typeof handlers.handleListBranchesSingle).toBe('function')
    expect(typeof handlers.handleFetchSingle).toBe('function')
    expect(typeof handlers.handleListUnpushed).toBe('function')
    expect(typeof handlers.handleDetachWorktree).toBe('function')
  })
})
