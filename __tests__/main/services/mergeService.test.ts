// TC-MRG-SVC-01 ~ TC-MRG-SVC-21: MergeService 단위 테스트

const mockExecFile = jest.fn()
const mockReadFileSync = jest.fn()
const mockSend = jest.fn()
const mockGetAllWindows = jest.fn(() => [{ webContents: { send: mockSend } }])

let MergeService: any
let service: any

beforeEach(() => {
  jest.resetModules()
  mockExecFile.mockReset()
  mockReadFileSync.mockReset()
  mockSend.mockReset()
  mockGetAllWindows.mockReset()
  mockGetAllWindows.mockReturnValue([{ webContents: { send: mockSend } }])

  jest.doMock('child_process', () => ({ execFile: mockExecFile }))
  jest.doMock('electron', () => ({
    BrowserWindow: { getAllWindows: mockGetAllWindows }
  }))
  jest.doMock('fs', () => ({ readFileSync: mockReadFileSync }))

  MergeService = require('../../../src/main/services/mergeService')
  service = new MergeService()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('TC-MRG-SVC-01: merge() — fast-forward merge 성공', () => {
  it('clean 상태에서 fast-forward merge 성공 시 MergeResult를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--porcelain')) cb(null, '', '')
      else if (args[0] === 'merge') cb(null, 'Fast-forward\n', '')
      else if (args.includes('--short') && args.includes('HEAD')) cb(null, 'abc1234\n', '')
      else if (args.includes('--stat')) cb(null, ' 3 files changed, 10 insertions(+), 2 deletions(-)\n', '')
      else cb(null, '', '')
    })

    const result = await service.merge('/repo', 'main')
    expect(result.success).toBe(true)
    expect(result.commitHash).toBe('abc1234')
    expect(result.changedFiles).toBe(3)
  })
})

describe('TC-MRG-SVC-02: merge() — merge commit 생성 성공', () => {
  it('merge commit이 생성되는 경우에도 성공 결과를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--porcelain')) cb(null, '', '')
      else if (args[0] === 'merge') cb(null, "Merge made by the 'ort' strategy.\n", '')
      else if (args.includes('--short') && args.includes('HEAD')) cb(null, 'def5678\n', '')
      else if (args.includes('--stat')) cb(null, ' 5 files changed, 20 insertions(+), 8 deletions(-)\n', '')
      else cb(null, '', '')
    })

    const result = await service.merge('/repo', 'feature/xyz')
    expect(result.success).toBe(true)
    expect(result.commitHash).toBe('def5678')
    expect(result.changedFiles).toBe(5)
  })
})

describe('TC-MRG-SVC-03: merge() — 충돌 감지', () => {
  it('merge 충돌 발생 시 isConflict: true와 conflictFiles를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--porcelain')) cb(null, '', '')
      else if (args[0] === 'merge') {
        const err: any = new Error('merge conflict')
        err.code = 1
        cb(err, 'CONFLICT (content): Merge conflict in src/index.ts\n', '')
      }
      else if (args.includes('--diff-filter=U')) cb(null, 'src/index.ts\nsrc/utils.ts\n', '')
      else cb(null, '', '')
    })

    const result = await service.merge('/repo', 'feature/conflict')
    expect(result.success).toBe(false)
    expect(result.isConflict).toBe(true)
    expect(result.conflictFiles).toHaveLength(2)
    expect(result.conflictFiles[0].filePath).toBe('src/index.ts')
  })
})

describe('TC-MRG-SVC-04: detectConflicts() — 충돌 파일 목록 파싱', () => {
  it('git diff --diff-filter=U 출력을 파싱하여 ConflictFile 배열을 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--diff-filter=U')) {
        cb(null, 'src/a.ts\nsrc/b.ts\n', '')
      } else cb(null, '', '')
    })
    mockReadFileSync.mockReturnValue(
      '<<<<<<< HEAD\nours content\n=======\ntheirs content\n>>>>>>> feature\n'
    )

    const files = await service.detectConflicts('/repo')
    expect(files).toHaveLength(2)
    expect(files[0].filePath).toBe('src/a.ts')
    expect(files[1].filePath).toBe('src/b.ts')
  })
})

describe('TC-MRG-SVC-05: resolveConflicts() — ours 전략', () => {
  it('ours 전략으로 모든 충돌을 해결하고 commit한다', async () => {
    let callCount = 0
    const execCalls: string[][] = []
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      execCalls.push(args)
      callCount++
      if (args.includes('--diff-filter=U') && callCount <= 1) {
        cb(null, 'src/a.ts\nsrc/b.ts\n', '')
      } else if (args.includes('--ours')) {
        cb(null, '', '')
      } else if (args[0] === 'add') {
        cb(null, '', '')
      } else if (args.includes('--diff-filter=U')) {
        cb(null, '', '')  // 남은 충돌 없음
      } else if (args.includes('--no-edit')) {
        cb(null, '', '')
      } else if (args.includes('--short')) {
        cb(null, 'res1234\n', '')
      } else if (args.includes('--stat')) {
        cb(null, ' 2 files changed\n', '')
      } else cb(null, '', '')
    })

    const result = await service.resolveConflicts('/repo', 'ours')
    expect(result.success).toBe(true)
    expect(result.commitHash).toBe('res1234')
    const oursCallCount = execCalls.filter((a: string[]) => a.includes('--ours')).length
    expect(oursCallCount).toBe(2)
  })
})

describe('TC-MRG-SVC-06: resolveConflicts() — theirs 전략', () => {
  it('theirs 전략으로 모든 충돌을 해결한다', async () => {
    const execCalls: string[][] = []
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      execCalls.push(args)
      if (args.includes('--diff-filter=U') && execCalls.filter((a: string[]) => a.includes('--diff-filter=U')).length <= 1) {
        cb(null, 'file1.ts\n', '')
      } else if (args.includes('--theirs')) {
        cb(null, '', '')
      } else if (args.includes('--diff-filter=U')) {
        cb(null, '', '')
      } else cb(null, '', '')
    })

    const result = await service.resolveConflicts('/repo', 'theirs')
    expect(result.success).toBe(true)
    const theirsCount = execCalls.filter((a: string[]) => a.includes('--theirs')).length
    expect(theirsCount).toBe(1)
  })
})

describe('TC-MRG-SVC-07: completeManualResolve() — 성공', () => {
  it('충돌 마커가 모두 해결된 상태에서 commit을 수행한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--diff-filter=U')) cb(null, '', '')
      else if (args[0] === 'add') cb(null, '', '')
      else if (args.includes('--no-edit')) cb(null, '', '')
      else if (args.includes('--short')) cb(null, 'man1234\n', '')
      else if (args.includes('--stat')) cb(null, ' 1 file changed\n', '')
      else cb(null, '', '')
    })

    const result = await service.completeManualResolve('/repo')
    expect(result.success).toBe(true)
    expect(result.commitHash).toBe('man1234')
  })
})

describe('TC-MRG-SVC-08: completeManualResolve() — 미해결 충돌 잔존', () => {
  it('충돌 마커가 남아있으면 UNRESOLVED_CONFLICTS 에러를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--diff-filter=U')) cb(null, 'src/unresolved.ts\n', '')
      else cb(null, '', '')
    })

    const result = await service.completeManualResolve('/repo')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('UNRESOLVED_CONFLICTS')
    expect(result.conflictFiles).toHaveLength(1)
  })
})

describe('TC-MRG-SVC-09: abortMerge() — 성공', () => {
  it('git merge --abort를 실행하고 success: true를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args[0] === 'merge' && args[1] === '--abort') cb(null, '', '')
      else cb(null, '', '')
    })

    const result = await service.abortMerge('/repo')
    expect(result.success).toBe(true)
    const abortCall = mockExecFile.mock.calls.find(
      (c: any) => c[1][0] === 'merge' && c[1][1] === '--abort'
    )
    expect(abortCall).toBeDefined()
  })
})

describe('TC-MRG-SVC-10: listBranches() — 브랜치 목록 조회', () => {
  it('로컬/원격 브랜치 목록을 BranchInfo 형식으로 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      cb(null, 'main|abc1234|initial commit\norigin/main|abc1234|initial commit\nfeature/x|def5678|add feature\n', '')
    })

    const branches = await service.listBranches('/repo')
    expect(branches).toHaveLength(3)

    const localMain = branches.find((b: any) => b.name === 'main')
    expect(localMain.isRemote).toBe(false)

    const remoteMain = branches.find((b: any) => b.name === 'origin/main')
    expect(remoteMain.isRemote).toBe(true)

    expect(branches[2].lastCommitMessage).toBe('add feature')
  })
})

describe('TC-MRG-SVC-11: merge() — 빈 브랜치명 검증', () => {
  it('빈 브랜치명을 전달하면 EMPTY_BRANCH_NAME 에러를 반환한다', async () => {
    await expect(service.merge('/repo', '')).rejects.toThrow('EMPTY_BRANCH_NAME')
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-SVC-12: merge() — 쉘 특수문자 포함 브랜치명', () => {
  it('쉘 특수문자가 포함된 브랜치명은 INVALID_BRANCH_NAME 에러를 반환한다', async () => {
    await expect(service.merge('/repo', 'main; rm -rf /')).rejects.toThrow('INVALID_BRANCH_NAME')
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-SVC-13: merge() — 256자 초과 브랜치명', () => {
  it('256자 초과 브랜치명은 BRANCH_NAME_TOO_LONG 에러를 반환한다', async () => {
    await expect(service.merge('/repo', 'a'.repeat(257))).rejects.toThrow('BRANCH_NAME_TOO_LONG')
  })
})

describe('TC-MRG-SVC-14: merge() — 존재하지 않는 브랜치', () => {
  it('존재하지 않는 브랜치 merge 시 에러 메시지를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--porcelain')) cb(null, '', '')
      else if (args[0] === 'merge') {
        const err: any = new Error('git error')
        err.code = 1
        cb(err, '', 'merge: nonexistent-branch - not something we can merge')
      }
      else cb(null, '', '')
    })

    const result = await service.merge('/repo', 'nonexistent-branch')
    expect(result.success).toBe(false)
    expect(result.isConflict).toBeFalsy()
    expect(result.errorMessage).toContain('not something we can merge')
  })
})

describe('TC-MRG-SVC-15: merge() — dirty 작업 디렉토리', () => {
  it('dirty 상태에서는 DIRTY_WORKING_TREE 에러를 반환하고 merge를 시도하지 않는다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--porcelain')) cb(null, ' M src/index.ts\n', '')
      else cb(null, '', '')
    })

    const result = await service.merge('/repo', 'main')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('DIRTY_WORKING_TREE')

    const mergeCalls = mockExecFile.mock.calls.filter((c: any) => c[1][0] === 'merge')
    expect(mergeCalls).toHaveLength(0)
  })
})

describe('TC-MRG-SVC-16: merge() — 원격 브랜치 자동 fetch', () => {
  it('origin/ 접두사 브랜치는 fetch 후 merge를 실행한다', async () => {
    const execCalls: string[][] = []
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      execCalls.push(args)
      cb(null, '', '')
    })

    await service.merge('/repo', 'origin/develop')

    const fetchIdx = execCalls.findIndex((a: string[]) => a[0] === 'fetch')
    const mergeIdx = execCalls.findIndex((a: string[]) => a[0] === 'merge')
    expect(fetchIdx).toBeGreaterThanOrEqual(0)
    expect(fetchIdx).toBeLessThan(mergeIdx)
  })
})

describe('TC-MRG-SVC-17: abortMerge() — 실패', () => {
  it('abort 실패 시 에러 메시지를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args[1] === '--abort') {
        const err: any = new Error('git error')
        cb(err, '', 'fatal: There is no merge to abort (MERGE_HEAD missing)')
      }
      else cb(null, '', '')
    })

    const result = await service.abortMerge('/repo')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no merge to abort')
  })
})

describe('TC-MRG-SVC-18: resolveConflicts() — path traversal 방지', () => {
  it('path traversal 경로가 포함되면 INVALID_FILE_PATH 에러를 throw한다', async () => {
    await expect(
      service.resolveConflicts('/repo', 'ours', ['../../etc/passwd'])
    ).rejects.toThrow('INVALID_FILE_PATH')
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-SVC-19: getCurrentBranch() — 현재 브랜치명 조회', () => {
  it('현재 브랜치명을 trim하여 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      cb(null, 'feature/my-branch\n', '')
    })

    const branch = await service.getCurrentBranch('/repo')
    expect(branch).toBe('feature/my-branch')
  })
})

describe('TC-MRG-SVC-20: getMergeStats() — 병합 통계 파싱', () => {
  it('git diff --stat 출력을 파싱하여 MergeStats를 반환한다', async () => {
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      cb(null, ' src/a.ts | 5 ++---\n src/b.ts | 10 +++\n src/c.ts | 7 ----\n 3 files changed, 15 insertions(+), 7 deletions(-)\n', '')
    })

    const stats = await service.getMergeStats('/repo')
    expect(stats.changedFiles).toBe(3)
    expect(stats.insertions).toBe(15)
    expect(stats.deletions).toBe(7)
  })
})

describe('TC-MRG-SVC-21: resolveConflicts() — 부분 충돌 해결', () => {
  it('일부 파일만 해결하면 남은 충돌 파일 목록을 반환한다', async () => {
    let diffCallCount = 0
    mockExecFile.mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (args.includes('--diff-filter=U')) {
        diffCallCount++
        // files가 지정되었으므로 첫 detectConflicts 호출 없이
        // 바로 남은 충돌 확인 호출이 첫 번째가 됨
        if (diffCallCount <= 1) cb(null, 'src/b.ts\nsrc/c.ts\n', '')
        else cb(null, '', '')
      }
      else cb(null, '', '')
    })

    const result = await service.resolveConflicts('/repo', 'ours', ['src/a.ts'])
    expect(result.success).toBe(false)
    expect(result.isConflict).toBe(true)
    expect(result.conflictFiles).toHaveLength(2)
  })
})
