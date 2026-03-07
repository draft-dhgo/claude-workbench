const os = require('os')
const fs = require('fs')
const path = require('path')

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

let tmpUserData
let handlers

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-'))

  jest.resetModules()
  jest.doMock('electron', () => ({
    app: { getPath: jest.fn(() => tmpUserData) }
  }))
  handlers = require('../../../src/main/handlers/workdirSetHandlers')
})

afterEach(() => {
  cleanup(tmpUserData)
})

function seedRepos(repos) {
  const data = { version: 1, repositories: repos }
  fs.writeFileSync(
    path.join(tmpUserData, 'repositories.json'),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

describe('TC-17: handleSetCreate — 정상 생성', () => {
  test('세트 생성 성공', async () => {
    const result = await handlers.handleSetCreate(null, {
      name: '세트 A',
      repositories: [{ id: 'r1', baseBranch: 'main' }]
    })
    expect(result.success).toBe(true)
    expect(result.set).toBeDefined()
    expect(result.set.name).toBe('세트 A')
    expect(result.set.repositories).toEqual([{ id: 'r1', baseBranch: 'main' }])
    expect(result.set.repositoryIds).toBeUndefined()
    expect(result.set.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('TC-18: handleSetCreate — EMPTY_NAME 에러', () => {
  test('빈 이름 시 에러 반환', async () => {
    const result = await handlers.handleSetCreate(null, {
      name: '',
      repositories: []
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('EMPTY_NAME')
  })
})

describe('TC-19: handleSetCreate — DUPLICATE_NAME 에러', () => {
  test('중복 이름 시 에러 반환', async () => {
    await handlers.handleSetCreate(null, { name: '세트 A', repositories: [] })
    const result = await handlers.handleSetCreate(null, { name: '세트 A', repositories: [] })
    expect(result.success).toBe(false)
    expect(result.error).toBe('DUPLICATE_NAME')
  })
})

describe('TC-20: handleSetList — 목록 조회', () => {
  test('세트 2건 반환', async () => {
    await handlers.handleSetCreate(null, { name: '세트 A', repositories: [] })
    await handlers.handleSetCreate(null, { name: '세트 B', repositories: [] })

    const result = await handlers.handleSetList()
    expect(result.success).toBe(true)
    expect(result.sets).toHaveLength(2)
    expect(result.sets[0].repositories).toBeDefined()
    expect(result.sets[0].repositories).toBeInstanceOf(Array)
    expect(result.sets[0].repositoryIds).toBeUndefined()
  })
})

describe('TC-21: handleSetGet — 상세 조회 (저장소 resolve)', () => {
  test('저장소 정보가 resolve되고 baseBranch 포함', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/tmp/frontend', addedAt: '2026-03-07T00:00:00.000Z' },
      { id: 'r2', name: 'backend', path: '/tmp/backend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])

    const createResult = await handlers.handleSetCreate(null, {
      name: '세트 A',
      repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: '' }]
    })

    const result = await handlers.handleSetGet(null, createResult.set.id)
    expect(result.success).toBe(true)
    expect(result.set.repositories).toHaveLength(2)
    expect(result.set.repositories[0].name).toBe('frontend')
    expect(result.set.repositories[0].baseBranch).toBe('main')
    expect(result.set.repositories[1].name).toBe('backend')
    expect(result.set.repositories[1].baseBranch).toBe('')
  })
})

describe('TC-22: handleSetGet — 삭제된 저장소 필터링', () => {
  test('존재하지 않는 저장소 ID는 필터링됨', async () => {
    seedRepos([
      { id: 'r1', name: 'frontend', path: '/tmp/frontend', addedAt: '2026-03-07T00:00:00.000Z' }
    ])

    const createResult = await handlers.handleSetCreate(null, {
      name: '세트 A',
      repositories: [{ id: 'r1', baseBranch: 'main' }, { id: 'r-deleted', baseBranch: '' }]
    })

    const result = await handlers.handleSetGet(null, createResult.set.id)
    expect(result.success).toBe(true)
    expect(result.set.repositories).toHaveLength(1)
    expect(result.set.repositories[0].id).toBe('r1')
  })
})

describe('TC-23: handleSetGet — 존재하지 않는 세트', () => {
  test('NOT_FOUND 에러 반환', async () => {
    const result = await handlers.handleSetGet(null, 'non-existent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})

describe('TC-24: handleSetUpdate — 정상 수정', () => {
  test('이름 변경 성공', async () => {
    const createResult = await handlers.handleSetCreate(null, {
      name: '원래 이름',
      repositories: []
    })

    const result = await handlers.handleSetUpdate(null, {
      id: createResult.set.id,
      name: '새 이름'
    })
    expect(result.success).toBe(true)
    expect(result.set.name).toBe('새 이름')
  })

  test('repositories 업데이트 성공', async () => {
    const createResult = await handlers.handleSetCreate(null, {
      name: '원래 이름',
      repositories: []
    })

    const result = await handlers.handleSetUpdate(null, {
      id: createResult.set.id,
      repositories: [{ id: 'r1', baseBranch: 'develop' }]
    })
    expect(result.success).toBe(true)
    expect(result.set.repositories).toEqual([{ id: 'r1', baseBranch: 'develop' }])
  })
})

describe('TC-25: handleSetUpdate — NOT_FOUND 에러', () => {
  test('존재하지 않는 ID 수정 시 에러', async () => {
    const result = await handlers.handleSetUpdate(null, {
      id: 'non-existent',
      name: '새 이름'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})

describe('TC-26: handleSetDelete — 정상 삭제', () => {
  test('삭제 성공 후 목록 비어있음', async () => {
    const createResult = await handlers.handleSetCreate(null, {
      name: '삭제 대상',
      repositories: []
    })

    const deleteResult = await handlers.handleSetDelete(null, createResult.set.id)
    expect(deleteResult.success).toBe(true)

    const listResult = await handlers.handleSetList()
    expect(listResult.sets).toHaveLength(0)
  })
})

describe('TC-27: handleSetDelete — 존재하지 않는 세트', () => {
  test('false 반환', async () => {
    const result = await handlers.handleSetDelete(null, 'non-existent')
    expect(result.success).toBe(false)
  })
})

// ─── 신규 TC: handleSetGet baseBranch 병합 ────────────────────────────────────

describe('TC-HSG-01: handleSetGet — baseBranch가 저장된 세트 조회 시 repositories에 baseBranch 포함 반환', () => {
  test('release/1.0 baseBranch가 포함됨', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const createResult = await handlers.handleSetCreate(null, {
      name: '세트',
      repositories: [{ id: 'r1', baseBranch: 'release/1.0' }]
    })

    const result = await handlers.handleSetGet(null, createResult.set.id)
    expect(result.success).toBe(true)
    expect(result.set.repositories[0].baseBranch).toBe('release/1.0')
    expect(result.set.repositories[0].name).toBe('repo-A')
  })
})

describe('TC-HSG-02: handleSetGet — baseBranch 빈 문자열인 경우 정상 반환', () => {
  test('빈 문자열 baseBranch가 null/undefined로 변환되지 않음', async () => {
    seedRepos([
      { id: 'r1', name: 'repo-A', path: '/repos/repo-A', addedAt: '2026-03-07T00:00:00.000Z' }
    ])
    const createResult = await handlers.handleSetCreate(null, {
      name: '세트',
      repositories: [{ id: 'r1', baseBranch: '' }]
    })

    const result = await handlers.handleSetGet(null, createResult.set.id)
    expect(result.success).toBe(true)
    expect(result.set.repositories[0].baseBranch).toBe('')
  })
})
