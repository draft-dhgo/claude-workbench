const os = require('os')
const fs = require('fs')
const path = require('path')

// Test helper: create fake git repo
function createFakeRepo(name) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-repo-'))
  const repoDir = path.join(tmpDir, name)
  fs.mkdirSync(repoDir, { recursive: true })
  fs.mkdirSync(path.join(repoDir, '.git'))
  return { tmpDir, repoDir }
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

let tmpUserData
let RepoStore

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-'))
  RepoStore = require('../../../src/main/services/repoStore')
})

afterEach(() => {
  cleanup(tmpUserData)
  jest.resetModules()
})

describe('TC-01: RepoStore — 빈 상태에서 getAll', () => {
  test('repositories.json 없으면 빈 배열 반환', () => {
    const store = new RepoStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-02: RepoStore — 저장소 추가', () => {
  test('유효한 경로 추가 시 저장소 정보 반환', () => {
    const { tmpDir, repoDir } = createFakeRepo('my-repo')
    try {
      const store = new RepoStore(tmpUserData)
      const result = store.add(repoDir)

      expect(result).toHaveProperty('id')
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(result.name).toBe('my-repo')
      expect(result.path).toBe(repoDir)
      expect(result).toHaveProperty('addedAt')

      const all = store.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].path).toBe(repoDir)

      // JSON 파일이 디스크에 존재
      const filePath = path.join(tmpUserData, 'repositories.json')
      expect(fs.existsSync(filePath)).toBe(true)
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-03: RepoStore — 중복 경로 추가 방지', () => {
  test('같은 경로 두 번 추가 시 에러', () => {
    const { tmpDir, repoDir } = createFakeRepo('dup-repo')
    try {
      const store = new RepoStore(tmpUserData)
      store.add(repoDir)
      expect(() => store.add(repoDir)).toThrow('DUPLICATE_PATH')
    } finally {
      cleanup(tmpDir)
    }
  })

  test('끝 슬래시 유무 관계없이 동일 경로', () => {
    const { tmpDir, repoDir } = createFakeRepo('slash-repo')
    try {
      const store = new RepoStore(tmpUserData)
      store.add(repoDir)
      expect(() => store.add(repoDir + '/')).toThrow('DUPLICATE_PATH')
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-04: RepoStore — 저장소 삭제', () => {
  test('등록된 저장소 삭제 성공', () => {
    const { tmpDir, repoDir } = createFakeRepo('del-repo')
    try {
      const store = new RepoStore(tmpUserData)
      const repo = store.add(repoDir)
      const result = store.remove(repo.id)
      expect(result).toBe(true)
      expect(store.getAll()).toEqual([])
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-05: RepoStore — 존재하지 않는 ID 삭제', () => {
  test('false 반환, 에러 없음', () => {
    const store = new RepoStore(tmpUserData)
    expect(store.remove('non-existent-id')).toBe(false)
  })
})

describe('TC-06: RepoStore — JSON 파일 손상 시 복구', () => {
  test('손상된 JSON에서 빈 배열 반환', () => {
    fs.writeFileSync(path.join(tmpUserData, 'repositories.json'), '{broken')
    const store = new RepoStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-07: RepoStore — 여러 저장소 추가 후 순서 유지', () => {
  test('추가 순서대로 반환', () => {
    const repos = []
    const tmpDirs = []
    try {
      for (const name of ['alpha', 'beta', 'gamma']) {
        const { tmpDir, repoDir } = createFakeRepo(name)
        tmpDirs.push(tmpDir)
        repos.push(repoDir)
      }
      const store = new RepoStore(tmpUserData)
      store.add(repos[0])
      store.add(repos[1])
      store.add(repos[2])

      const all = store.getAll()
      expect(all).toHaveLength(3)
      expect(all[0].name).toBe('alpha')
      expect(all[1].name).toBe('beta')
      expect(all[2].name).toBe('gamma')
    } finally {
      tmpDirs.forEach(cleanup)
    }
  })
})
