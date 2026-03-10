// TC-MRG-HDL-01 ~ TC-MRG-HDL-13: mergeHandlers IPC 핸들러 테스트

const mockResolveConflicts = jest.fn()
const mockCompleteManualResolve = jest.fn()
const mockAbortMerge = jest.fn()
const mockListBranches = jest.fn()
const mockGetStatus = jest.fn()
const mockUpdateMergeItemStatus = jest.fn()

let handlers: any

beforeEach(() => {
  jest.resetModules()
  mockResolveConflicts.mockReset()
  mockCompleteManualResolve.mockReset()
  mockAbortMerge.mockReset()
  mockListBranches.mockReset()
  mockGetStatus.mockReset()
  mockUpdateMergeItemStatus.mockReset()

  const MockMergeService = jest.fn().mockImplementation(() => ({
    resolveConflicts: mockResolveConflicts,
    completeManualResolve: mockCompleteManualResolve,
    abortMerge: mockAbortMerge,
    listBranches: mockListBranches,
  }))
  jest.doMock('../../../src/main/services/mergeService', () => MockMergeService)

  jest.doMock('../../../src/main/handlers/commandQueueHandlers', () => ({
    getQueueServiceInstance: jest.fn(() => ({
      getStatus: mockGetStatus,
      updateMergeItemStatus: mockUpdateMergeItemStatus,
    })),
  }))

  handlers = require('../../../src/main/handlers/mergeHandlers')
})

afterEach(() => {
  handlers._resetMergeService()
})

describe('TC-MRG-HDL-01: 핸들러 export 확인', () => {
  it('모든 핸들러 함수가 export된다', () => {
    expect(typeof handlers.handleResolveConflict).toBe('function')
    expect(typeof handlers.handleManualResolveComplete).toBe('function')
    expect(typeof handlers.handleAbortMerge).toBe('function')
    expect(typeof handlers.handleListMergeBranches).toBe('function')
    expect(typeof handlers.getMergeService).toBe('function')
    expect(typeof handlers._resetMergeService).toBe('function')
  })
})

describe('TC-MRG-HDL-02: merge:list-branches — 성공', () => {
  it('유효한 cwd로 호출하면 브랜치 목록을 반환한다', async () => {
    const mockBranches = [
      { name: 'main', isRemote: false, lastCommitMessage: 'init' },
      { name: 'origin/main', isRemote: true, lastCommitMessage: 'init' }
    ]
    mockListBranches.mockResolvedValue(mockBranches)

    const result = await handlers.handleListMergeBranches(null, { cwd: '/repo' })
    expect(result.success).toBe(true)
    expect(result.branches).toEqual(mockBranches)
    expect(mockListBranches).toHaveBeenCalledWith('/repo')
  })
})

describe('TC-MRG-HDL-03: merge:list-branches — cwd 누락', () => {
  it('cwd가 누락되면 CWD_REQUIRED 에러를 반환한다', async () => {
    const result = await handlers.handleListMergeBranches(null, {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('CWD_REQUIRED')
    expect(mockListBranches).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-HDL-04: merge:resolve-conflict — ours 전략 성공', () => {
  it('ours 전략으로 충돌 해결 시 success 응답을 반환한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockResolveConflicts.mockResolvedValue({
      success: true, commitHash: 'abc1234', changedFiles: 3
    })

    const result = await handlers.handleResolveConflict(null, {
      itemId: 'item-1', strategy: 'ours'
    })

    expect(result.success).toBe(true)
    expect(result.mergeCommitHash).toBe('abc1234')
    expect(mockResolveConflicts).toHaveBeenCalledWith('/repo', 'ours', undefined)
    expect(mockUpdateMergeItemStatus).toHaveBeenCalledWith('item-1', 'success', expect.any(Object))
  })
})

describe('TC-MRG-HDL-05: merge:resolve-conflict — theirs + 파일 지정', () => {
  it('theirs 전략 + 파일 지정으로 호출하면 해당 파일만 해결한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockResolveConflicts.mockResolvedValue({
      success: true, commitHash: 'def5678', changedFiles: 1
    })

    const result = await handlers.handleResolveConflict(null, {
      itemId: 'item-1', strategy: 'theirs', files: ['src/a.ts']
    })

    expect(result.success).toBe(true)
    expect(mockResolveConflicts).toHaveBeenCalledWith('/repo', 'theirs', ['src/a.ts'])
  })
})

describe('TC-MRG-HDL-06: merge:resolve-conflict — 파라미터 누락', () => {
  it('strategy가 누락되면 INVALID_PARAMS 에러를 반환한다', async () => {
    const result = await handlers.handleResolveConflict(null, { itemId: 'item-1' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_PARAMS')
    expect(mockResolveConflicts).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-HDL-07: merge:resolve-conflict — conflict 상태가 아닌 항목', () => {
  it('conflict 상태가 아닌 항목에 대해 ITEM_NOT_FOUND_OR_NOT_CONFLICT를 반환한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'running', cwd: '/repo' }
    ])

    const result = await handlers.handleResolveConflict(null, {
      itemId: 'item-1', strategy: 'ours'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('ITEM_NOT_FOUND_OR_NOT_CONFLICT')
  })
})

describe('TC-MRG-HDL-08: merge:manual-resolve-complete — 성공', () => {
  it('manual resolve 완료 시 success와 commitHash를 반환한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockCompleteManualResolve.mockResolvedValue({
      success: true, commitHash: 'man1234', changedFiles: 2
    })

    const result = await handlers.handleManualResolveComplete(null, { itemId: 'item-1' })

    expect(result.success).toBe(true)
    expect(result.mergeCommitHash).toBe('man1234')
    expect(mockUpdateMergeItemStatus).toHaveBeenCalledWith('item-1', 'success', expect.any(Object))
  })
})

describe('TC-MRG-HDL-09: merge:manual-resolve-complete — 미해결 충돌 잔존', () => {
  it('미해결 충돌이 있으면 UNRESOLVED_CONFLICTS와 파일 목록을 반환한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockCompleteManualResolve.mockResolvedValue({
      success: false, conflictFiles: [{ filePath: 'src/a.ts' }]
    })

    const result = await handlers.handleManualResolveComplete(null, { itemId: 'item-1' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('UNRESOLVED_CONFLICTS')
    expect(result.unresolvedFiles).toEqual(['src/a.ts'])
    expect(mockUpdateMergeItemStatus).not.toHaveBeenCalled()
  })
})

describe('TC-MRG-HDL-10: merge:manual-resolve-complete — itemId 누락', () => {
  it('itemId 누락 시 ITEM_ID_REQUIRED를 반환한다', async () => {
    const result = await handlers.handleManualResolveComplete(null, {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('ITEM_ID_REQUIRED')
  })
})

describe('TC-MRG-HDL-11: merge:abort — 성공', () => {
  it('abort 성공 시 항목 상태를 aborted로 전환한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockAbortMerge.mockResolvedValue({ success: true })

    const result = await handlers.handleAbortMerge(null, { itemId: 'item-1' })

    expect(result.success).toBe(true)
    expect(mockAbortMerge).toHaveBeenCalledWith('/repo')
    expect(mockUpdateMergeItemStatus).toHaveBeenCalledWith('item-1', 'aborted', expect.any(Object))
  })
})

describe('TC-MRG-HDL-12: merge:abort — itemId 누락', () => {
  it('itemId 누락 시 ITEM_ID_REQUIRED를 반환한다', async () => {
    const result = await handlers.handleAbortMerge(null, {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('ITEM_ID_REQUIRED')
  })
})

describe('TC-MRG-HDL-13: 에러 응답 포맷 — 서비스 예외', () => {
  it('서비스 예외 발생 시 에러 메시지를 응답에 포함한다', async () => {
    mockGetStatus.mockReturnValue([
      { id: 'item-1', status: 'conflict', cwd: '/repo', startedAt: '2026-03-10T00:00:00.000Z' }
    ])
    mockResolveConflicts.mockRejectedValue(new Error('Unexpected git failure'))

    const result = await handlers.handleResolveConflict(null, {
      itemId: 'item-1', strategy: 'ours'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unexpected git failure')
  })
})
