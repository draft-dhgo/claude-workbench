/**
 * TDD-0008 Red Phase: worktreeHandlers 신규 핸들러 테스트
 * TC-001 ~ TC-012
 */
const os = require('os')
const fs = require('fs')
const path = require('path')

const mockExecFile = jest.fn()
const mockShowOpenDialog = jest.fn()
const mockSend = jest.fn()

let tmpUserData
let handlers

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-new-'))
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

// 샘플 git worktree list --porcelain 출력
const WORKTREE_PORCELAIN_SIMPLE = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
].join('\n')

const WORKTREE_PORCELAIN_MULTI = [
  'worktree /path/to/repo',
  'HEAD abc1234567890',
  'branch refs/heads/main',
  '',
  'worktree /path/to/worktree/feature-task-a',
  'HEAD def5678',
  'branch refs/heads/feature/task-a',
  '',
  'worktree /path/to/worktree/feature-task-b',
  'HEAD ghi9012',
  'branch refs/heads/feature/task-b',
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

// 샘플 git branch -vv 출력
const BRANCH_VV_PUSHED = '* main           abc1234 [origin/main] commit message\n'

const BRANCH_VV_UNPUSHED = '* main           abc1234 [origin/main] commit message\n  feature/task-a  def5678 local commit\n'

const BRANCH_VV_GONE = '* main           abc1234 [origin/main] commit message\n  old/gone-br    jkl3456 [origin/old/gone-br: gone] removed\n'

const BRANCH_VV_MIXED = [
  '* main           abc1234 [origin/main] commit message',
  '  feature/task-a def5678 local commit',
  '  feature/task-b ghi9012 [origin/feature/task-b] pushed commit',
  '  old/gone-br    jkl3456 [origin/old/gone-br: gone] removed',
  '',
].join('\n')

// ─── handleListByRepo ─────────────────────────────────────────────────────────

describe('handleListByRepo', () => {
  test('TC-001: repoId 미존재 시 NOT_FOUND 반환', async () => {
    // repositories.json 없음 → 빈 목록
    const result = await handlers.handleListByRepo(null, { repoId: 'non-existent-id' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-002: upstream 있는 브랜치는 isPushed: true', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_SIMPLE, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_PUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toBeDefined()
    const mainWorktree = result.worktrees.find(w => w.branch === 'main')
    expect(mainWorktree).toBeDefined()
    expect(mainWorktree.isPushed).toBe(true)
  })

  test('TC-003: upstream 없는 브랜치는 isPushed: false', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const worktreePorcelain = [
      'worktree /path/to/repo',
      'HEAD abc1234567890',
      'branch refs/heads/main',
      '',
      'worktree /path/to/worktree/feature-task-a',
      'HEAD def5678',
      'branch refs/heads/feature/task-a',
      '',
    ].join('\n')

    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, worktreePorcelain, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_UNPUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    const featureWorktree = result.worktrees.find(w => w.branch === 'feature/task-a')
    expect(featureWorktree).toBeDefined()
    expect(featureWorktree.isPushed).toBe(false)
  })

  test('TC-004: [gone] upstream 브랜치는 isPushed: false', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const worktreePorcelain = [
      'worktree /path/to/repo',
      'HEAD abc1234567890',
      'branch refs/heads/main',
      '',
      'worktree /path/to/worktree/old-gone-br',
      'HEAD jkl3456',
      'branch refs/heads/old/gone-br',
      '',
    ].join('\n')

    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, worktreePorcelain, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_GONE, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    const goneWorktree = result.worktrees.find(w => w.branch === 'old/gone-br')
    expect(goneWorktree).toBeDefined()
    expect(goneWorktree.isPushed).toBe(false)
  })

  test('TC-005: detached HEAD 워크트리는 branch: null, isPushed: true', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_DETACHED, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_PUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    const detachedWorktree = result.worktrees.find(w => w.worktreePath === '/path/to/detached')
    expect(detachedWorktree).toBeDefined()
    expect(detachedWorktree.branch).toBeNull()
    expect(detachedWorktree.isPushed).toBe(true)
  })

  test('TC-006: 다중 워크트리 혼합 결합 검증', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, WORKTREE_PORCELAIN_MULTI, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MIXED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toHaveLength(3)

    const mainWt = result.worktrees.find(w => w.branch === 'main')
    expect(mainWt.isPushed).toBe(true)

    const featureAWt = result.worktrees.find(w => w.branch === 'feature/task-a')
    expect(featureAWt.isPushed).toBe(false)

    const featureBWt = result.worktrees.find(w => w.branch === 'feature/task-b')
    expect(featureBWt.isPushed).toBe(true)
  })

  test('TC-011: parsePushedBranches — upstream 있음/없음/gone 혼합 파싱 (간접 검증)', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const worktreePorcelain = [
      'worktree /path/to/repo',
      'HEAD abc1234567890',
      'branch refs/heads/main',
      '',
      'worktree /path/to/feature-task-a',
      'HEAD def5678',
      'branch refs/heads/feature/task-a',
      '',
      'worktree /path/to/feature-task-b',
      'HEAD ghi9012',
      'branch refs/heads/feature/task-b',
      '',
      'worktree /path/to/old-gone-br',
      'HEAD jkl3456',
      'branch refs/heads/old/gone-br',
      '',
    ].join('\n')

    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, worktreePorcelain, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_MIXED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)

    const mainWt = result.worktrees.find(w => w.branch === 'main')
    expect(mainWt.isPushed).toBe(true)

    const featureAWt = result.worktrees.find(w => w.branch === 'feature/task-a')
    expect(featureAWt.isPushed).toBe(false)

    const featureBWt = result.worktrees.find(w => w.branch === 'feature/task-b')
    expect(featureBWt.isPushed).toBe(true)

    const goneWt = result.worktrees.find(w => w.branch === 'old/gone-br')
    expect(goneWt.isPushed).toBe(false)
  })

  test('TC-012: parseWorktreeList — 여러 워크트리 포함 출력 파싱 (간접 검증)', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const worktreePorcelain = [
      'worktree /path/to/repo',
      'HEAD abc1234567890',
      'branch refs/heads/main',
      '',
      'worktree /path/to/worktree/feature-task-a',
      'HEAD def5678',
      'branch refs/heads/feature/task-a',
      '',
    ].join('\n')

    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      if (args[0] === 'worktree') {
        cb(null, worktreePorcelain, '')
      } else if (args[0] === 'branch') {
        cb(null, BRANCH_VV_PUSHED, '')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleListByRepo(null, { repoId: 'r1' })
    expect(result.success).toBe(true)
    expect(result.worktrees).toHaveLength(2)

    const first = result.worktrees[0]
    expect(first.worktreePath).toBe('/path/to/repo')
    expect(first.branch).toBe('main')

    const second = result.worktrees[1]
    expect(second.worktreePath).toBe('/path/to/worktree/feature-task-a')
    expect(second.branch).toBe('feature/task-a')
  })
})

// ─── handleDeleteWorktree ─────────────────────────────────────────────────────

describe('handleDeleteWorktree', () => {
  test('TC-007: repoId 미존재 시 NOT_FOUND 반환', async () => {
    const result = await handlers.handleDeleteWorktree(null, {
      repoId: 'non-existent',
      worktreePath: '/some/path',
      branch: 'feature/x'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  test('TC-008: git worktree remove 및 git branch -D 모두 성공', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      cb(null, '', '')
    })
    const result = await handlers.handleDeleteWorktree(null, {
      repoId: 'r1',
      worktreePath: '/path/to/worktree/feature-task-a',
      branch: 'feature/task-a'
    })
    expect(result.success).toBe(true)

    // 첫 번째 호출: git worktree remove --force <path>
    const firstCall = mockExecFile.mock.calls[0]
    expect(firstCall[1]).toEqual(['worktree', 'remove', '--force', '/path/to/worktree/feature-task-a'])
    expect(firstCall[2].cwd).toBe('/repos/frontend')

    // 두 번째 호출: git branch -D <branch>
    const secondCall = mockExecFile.mock.calls[1]
    expect(secondCall[1]).toEqual(['branch', '-D', 'feature/task-a'])
    expect(secondCall[2].cwd).toBe('/repos/frontend')
  })

  test('TC-009: git worktree remove 실패 시 에러 반환, git branch -D 호출 안 됨', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 1) {
        // worktree remove 실패
        cb(new Error('git error'), '', 'fatal: worktree remove failed')
      } else {
        cb(null, '', '')
      }
    })
    const result = await handlers.handleDeleteWorktree(null, {
      repoId: 'r1',
      worktreePath: '/path/to/worktree/feature-task-a',
      branch: 'feature/task-a'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    // git branch -D 가 호출되지 않아야 함 (총 호출 1회)
    expect(mockExecFile).toHaveBeenCalledTimes(1)
  })

  test('TC-010: git branch -D 실패 시 에러 반환', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/repos/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    let callCount = 0
    mockExecFile.mockImplementation((cmd, args, opts, cb) => {
      callCount++
      if (callCount === 1) {
        // worktree remove 성공
        cb(null, '', '')
      } else {
        // branch -D 실패
        cb(new Error('git error'), '', 'error: branch not found')
      }
    })
    const result = await handlers.handleDeleteWorktree(null, {
      repoId: 'r1',
      worktreePath: '/path/to/worktree/feature-task-a',
      branch: 'feature/task-a'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
