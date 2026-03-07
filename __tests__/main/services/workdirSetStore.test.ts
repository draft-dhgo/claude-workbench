const os = require('os')
const fs = require('fs')
const path = require('path')

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

let tmpUserData
let WorkdirSetStore

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-'))
  WorkdirSetStore = require('../../../src/main/services/workdirSetStore')
})

afterEach(() => {
  cleanup(tmpUserData)
  jest.resetModules()
})

describe('TC-01: 빈 상태에서 getAll', () => {
  test('workdir-sets.json 없으면 빈 배열 반환', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-02: 세트 생성 (create)', () => {
  test('정상 생성 시 세트 정보 반환 및 저장', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const result = store.create('프로젝트 A', [{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-2', baseBranch: 'develop' }])

    expect(result).toHaveProperty('id')
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.name).toBe('프로젝트 A')
    expect(result.repositories).toEqual([{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-2', baseBranch: 'develop' }])
    expect(result.repositoryIds).toBeUndefined()
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('updatedAt')

    const all = store.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('프로젝트 A')

    const filePath = path.join(tmpUserData, 'workdir-sets.json')
    expect(fs.existsSync(filePath)).toBe(true)
  })
})

describe('TC-03: 빈 이름으로 세트 생성 시 에러 (EMPTY_NAME)', () => {
  test('빈 문자열', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(() => store.create('', [{ id: 'repo-1', baseBranch: '' }])).toThrow('EMPTY_NAME')
  })

  test('공백만', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(() => store.create('  ', [{ id: 'repo-1', baseBranch: '' }])).toThrow('EMPTY_NAME')
  })
})

describe('TC-04: 중복 이름으로 세트 생성 시 에러 (DUPLICATE_NAME)', () => {
  test('같은 이름 두 번 생성 시 에러', () => {
    const store = new WorkdirSetStore(tmpUserData)
    store.create('프로젝트 A', [{ id: 'repo-1', baseBranch: '' }])
    expect(() => store.create('프로젝트 A', [{ id: 'repo-2', baseBranch: '' }])).toThrow('DUPLICATE_NAME')
  })
})

describe('TC-05: 빈 저장소 배열로 세트 생성', () => {
  test('빈 배열 허용', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const result = store.create('빈 세트', [])
    expect(result.repositories).toEqual([])
  })
})

describe('TC-06: getById', () => {
  test('존재하는 ID로 조회', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const created = store.create('세트 A', [{ id: 'r1', baseBranch: '' }])
    const found = store.getById(created.id)
    expect(found).not.toBeNull()
    expect(found.name).toBe('세트 A')
  })

  test('존재하지 않는 ID로 조회 시 null', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(store.getById('non-existent')).toBeNull()
  })
})

describe('TC-07: 세트 수정 — 이름 변경', () => {
  test('이름 변경 후 반영 확인', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const created = store.create('프로젝트 A', [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: '' }])
    const updated = store.update(created.id, { name: '프로젝트 B' })

    expect(updated.name).toBe('프로젝트 B')
    expect(updated.repositories).toEqual([{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: '' }])
    expect(new Date(updated.updatedAt).getTime())
      .toBeGreaterThanOrEqual(new Date(created.updatedAt).getTime())
  })
})

describe('TC-08: 세트 수정 — 저장소 목록 변경', () => {
  test('저장소 목록 변경 후 반영 확인', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const created = store.create('세트', [{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-2', baseBranch: '' }])
    const updated = store.update(created.id, { repositories: [{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-3', baseBranch: 'feature/x' }] })

    expect(updated.repositories).toEqual([{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-3', baseBranch: 'feature/x' }])
  })
})

describe('TC-09: 세트 수정 — 존재하지 않는 ID (NOT_FOUND)', () => {
  test('NOT_FOUND 에러', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(() => store.update('non-existent', { name: 'new' })).toThrow('NOT_FOUND')
  })
})

describe('TC-10: 세트 수정 — 중복 이름으로 변경 (DUPLICATE_NAME)', () => {
  test('다른 세트 이름과 중복 시 에러', () => {
    const store = new WorkdirSetStore(tmpUserData)
    store.create('세트 A', [])
    const setB = store.create('세트 B', [])
    expect(() => store.update(setB.id, { name: '세트 A' })).toThrow('DUPLICATE_NAME')
  })
})

describe('TC-11: 세트 수정 — 자기 자신과 동일한 이름 허용', () => {
  test('같은 이름으로 수정 시 에러 없음', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const created = store.create('세트 A', [{ id: 'r1', baseBranch: '' }])
    const updated = store.update(created.id, { name: '세트 A', repositories: [{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: 'main' }] })
    expect(updated.name).toBe('세트 A')
    expect(updated.repositories).toEqual([{ id: 'r1', baseBranch: '' }, { id: 'r2', baseBranch: 'main' }])
  })
})

describe('TC-12: 세트 삭제 (remove)', () => {
  test('삭제 성공', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const created = store.create('삭제 대상', [])
    expect(store.remove(created.id)).toBe(true)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-13: 존재하지 않는 ID 삭제', () => {
  test('false 반환, 에러 없음', () => {
    const store = new WorkdirSetStore(tmpUserData)
    expect(store.remove('non-existent')).toBe(false)
  })
})

describe('TC-14: removeRepoFromAllSets', () => {
  test('특정 저장소 ID를 모든 세트에서 제거', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const setA = store.create('세트 A', [{ id: 'repo-1', baseBranch: 'main' }, { id: 'repo-2', baseBranch: '' }])
    const setB = store.create('세트 B', [{ id: 'repo-2', baseBranch: 'develop' }, { id: 'repo-3', baseBranch: '' }])

    store.removeRepoFromAllSets('repo-2')

    const a = store.getById(setA.id)
    const b = store.getById(setB.id)
    expect(a.repositories).toEqual([{ id: 'repo-1', baseBranch: 'main' }])
    expect(b.repositories).toEqual([{ id: 'repo-3', baseBranch: '' }])
    expect(a.repositoryIds).toBeUndefined()
  })
})

describe('TC-15: JSON 파일 손상 시 복구', () => {
  test('깨진 JSON에서 빈 배열 반환', () => {
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), '{broken')
    const store = new WorkdirSetStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-16: 여러 세트 추가 후 순서 유지', () => {
  test('생성 순서대로 반환', () => {
    const store = new WorkdirSetStore(tmpUserData)
    store.create('alpha', [])
    store.create('beta', [])
    store.create('gamma', [])

    const all = store.getAll()
    expect(all).toHaveLength(3)
    expect(all[0].name).toBe('alpha')
    expect(all[1].name).toBe('beta')
    expect(all[2].name).toBe('gamma')
  })
})

// ─── Migration Tests ───────────────────────────────────────────────────────────

describe('TC-M01: v1 파일 로드 시 자동 마이그레이션', () => {
  test('repositories 필드로 변환되고 baseBranch가 빈 문자열', () => {
    const v1Data = {
      version: 1,
      sets: [{
        id: 'set-1', name: '세트', repositoryIds: ['r1', 'r2'],
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
      }]
    }
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), JSON.stringify(v1Data))
    const store = new WorkdirSetStore(tmpUserData)
    const all = store.getAll()
    expect(all[0].repositories).toEqual([
      { id: 'r1', baseBranch: '' },
      { id: 'r2', baseBranch: '' }
    ])
    expect(all[0].repositoryIds).toBeUndefined()
  })
})

describe('TC-M02: 마이그레이션 후 파일 version 2', () => {
  test('workdir-sets.json version 필드가 2', () => {
    const v1Data = { version: 1, sets: [] }
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), JSON.stringify(v1Data))
    new WorkdirSetStore(tmpUserData).getAll()
    const saved = JSON.parse(fs.readFileSync(path.join(tmpUserData, 'workdir-sets.json'), 'utf-8'))
    expect(saved.version).toBe(2)
  })
})

describe('TC-M03: 마이그레이션 후 기존 레포 ID 보존', () => {
  test('repositoryIds의 각 ID가 repositories[].id로 보존됨', () => {
    const v1Data = {
      version: 1,
      sets: [{
        id: 'set-1', name: '세트', repositoryIds: ['alpha', 'beta', 'gamma'],
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
      }]
    }
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), JSON.stringify(v1Data))
    const store = new WorkdirSetStore(tmpUserData)
    const all = store.getAll()
    expect(all[0].repositories.map(r => r.id)).toEqual(['alpha', 'beta', 'gamma'])
  })
})

describe('TC-M04: 마이그레이션 실패 시 .bak 백업 및 빈 세트 초기화', () => {
  test('원본 파일이 .bak으로 백업되고 빈 세트로 초기화됨', () => {
    // sets: null → _migrateV1 내부에서 null.map 호출 시 예외 발생
    const v1Data = { version: 1, sets: null }
    const jsonPath = path.join(tmpUserData, 'workdir-sets.json')
    fs.writeFileSync(jsonPath, JSON.stringify(v1Data))

    const store = new WorkdirSetStore(tmpUserData)
    const all = store.getAll()

    expect(all).toEqual([])
    expect(fs.existsSync(jsonPath + '.bak')).toBe(true)
    const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    expect(saved.version).toBe(2)
    expect(saved.sets).toEqual([])
  })
})

describe('TC-M05: version 2 파일 로드 시 마이그레이션 미실행', () => {
  test('repositories 필드가 그대로 반환됨 (덮어쓰기 없음)', () => {
    const v2Data = {
      version: 2,
      sets: [{
        id: 'set-1', name: '세트',
        repositories: [{ id: 'r1', baseBranch: 'main' }],
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
      }]
    }
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), JSON.stringify(v2Data))
    const store = new WorkdirSetStore(tmpUserData)
    const all = store.getAll()
    expect(all[0].repositories[0].baseBranch).toBe('main')
  })
})

describe('TC-M06: create()에 baseBranch 포함 repositories 배열 전달 시 올바르게 저장됨', () => {
  test('baseBranch 값이 파일에 저장되고 version 2로 기록됨', () => {
    const store = new WorkdirSetStore(tmpUserData)
    const result = store.create('세트', [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: '' }])

    expect(result.repositories[0].baseBranch).toBe('main')
    expect(result.repositories[1].baseBranch).toBe('')

    const saved = JSON.parse(fs.readFileSync(path.join(tmpUserData, 'workdir-sets.json'), 'utf-8'))
    expect(saved.version).toBe(2)
  })
})

describe('TC-M07: removeRepoFromAllSets() — v2 구조에서 나머지 baseBranch 값 보존', () => {
  test('제거 후 남은 repositories의 baseBranch 값이 유지됨', () => {
    const store = new WorkdirSetStore(tmpUserData)
    store.create('세트', [{ id: 'r1', baseBranch: 'main' }, { id: 'r2', baseBranch: 'develop' }])

    store.removeRepoFromAllSets('r1')

    const all = store.getAll()
    expect(all[0].repositories).toEqual([{ id: 'r2', baseBranch: 'develop' }])
  })
})

// ─── Compat Tests ──────────────────────────────────────────────────────────────

describe('TC-COMPAT-02: version 없는 파일 로드 시 마이그레이션 미실행', () => {
  test('repositories 필드 그대로 반환됨', () => {
    const data = {
      sets: [{
        id: 's1', name: '세트',
        repositories: [{ id: 'r1', baseBranch: 'main' }],
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
      }]
    }
    fs.writeFileSync(path.join(tmpUserData, 'workdir-sets.json'), JSON.stringify(data))
    const store = new WorkdirSetStore(tmpUserData)
    const all = store.getAll()
    expect(all).toBeDefined()
    expect(all).toHaveLength(1)
    expect(all[0].repositories).toBeDefined()
  })
})
