/**
 * workspaceStore.test.ts
 * TDD-0021: TC-WS-S01 ~ TC-WS-S12
 * WorkspaceStore 단위 테스트 — 실제 파일 I/O (tmpdir 격리)
 */

const os = require('os')
const fs = require('fs')
const path = require('path')

let tmpUserData: string
let WorkspaceStore: any

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-ws-'))
  WorkspaceStore = require('../../../src/main/services/workspaceStore')
})

afterEach(() => {
  fs.rmSync(tmpUserData, { recursive: true, force: true })
  jest.resetModules()
})

describe('TC-WS-S01: getAll() — 빈 상태에서 빈 배열 반환', () => {
  test('workspaces.json 파일이 존재하지 않을 때 getAll()은 빈 배열을 반환한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})

describe('TC-WS-S02: create() — 정상 생성', () => {
  test('유효한 name, path로 create()를 호출하면 StoredWorkspace가 반환된다', () => {
    const store = new WorkspaceStore(tmpUserData)
    const result = store.create('My Workspace', '/path/to/workspace')

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.name).toBe('My Workspace')
    expect(result.path).toBe('/path/to/workspace')
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.createdAt).toBe(result.updatedAt)

    expect(store.getAll()).toHaveLength(1)

    const filePath = path.join(tmpUserData, 'workspaces.json')
    expect(fs.existsSync(filePath)).toBe(true)
  })
})

describe('TC-WS-S03: create() — 빈 이름 시 EMPTY_NAME 에러', () => {
  test('빈 문자열로 create()를 호출하면 EMPTY_NAME 에러가 발생한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(() => store.create('', '/path')).toThrow('EMPTY_NAME')
  })

  test('공백만으로 create()를 호출하면 EMPTY_NAME 에러가 발생한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(() => store.create('   ', '/path')).toThrow('EMPTY_NAME')
  })
})

describe('TC-WS-S04: create() — 중복 경로 시 DUPLICATE_PATH 에러', () => {
  test('동일 path로 두 번 create()를 호출하면 DUPLICATE_PATH 에러가 발생한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    store.create('WS A', '/same/path')
    expect(() => store.create('WS B', '/same/path')).toThrow('DUPLICATE_PATH')
    expect(store.getAll()).toHaveLength(1)
  })
})

describe('TC-WS-S05: getById() — 존재하는 id 검색', () => {
  test('존재하는 id로 getById()를 호출하면 해당 워크스페이스가 반환된다', () => {
    const store = new WorkspaceStore(tmpUserData)
    const created = store.create('Test', '/path')
    const found = store.getById(created.id)

    expect(found).not.toBeNull()
    expect(found.name).toBe('Test')
    expect(found.path).toBe('/path')
  })
})

describe('TC-WS-S06: getById() — 미존재 id 검색 시 null 반환', () => {
  test('존재하지 않는 id로 getById()를 호출하면 null을 반환한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(store.getById('non-existent-id')).toBeNull()
  })
})

describe('TC-WS-S07: update() — 정상 이름 변경', () => {
  test('유효한 id와 name으로 update()를 호출하면 이름이 변경되고 updatedAt이 갱신된다', () => {
    const store = new WorkspaceStore(tmpUserData)
    const created = store.create('Original', '/path')
    const updated = store.update(created.id, { name: 'Updated' })

    expect(updated.name).toBe('Updated')
    expect(updated.path).toBe('/path')
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(updated.createdAt).getTime()
    )
    expect(store.getById(created.id).name).toBe('Updated')
  })
})

describe('TC-WS-S08: update() — 빈 이름 시 EMPTY_NAME 에러', () => {
  test('빈 이름으로 update()를 호출하면 EMPTY_NAME 에러가 발생한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    const created = store.create('Test', '/path')
    expect(() => store.update(created.id, { name: '' })).toThrow('EMPTY_NAME')
    expect(store.getById(created.id).name).toBe('Test')
  })
})

describe('TC-WS-S09: update() — 미존재 id 시 NOT_FOUND 에러', () => {
  test('존재하지 않는 id로 update()를 호출하면 NOT_FOUND 에러가 발생한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(() => store.update('non-existent', { name: 'New' })).toThrow('NOT_FOUND')
  })
})

describe('TC-WS-S10: remove() — 정상 삭제', () => {
  test('존재하는 id로 remove()를 호출하면 true를 반환하고 레코드가 제거된다', () => {
    const store = new WorkspaceStore(tmpUserData)
    const created = store.create('Test', '/path')
    const result = store.remove(created.id)

    expect(result).toBe(true)
    expect(store.getAll()).toEqual([])
    expect(store.getById(created.id)).toBeNull()
  })
})

describe('TC-WS-S11: remove() — 미존재 id 시 false 반환', () => {
  test('존재하지 않는 id로 remove()를 호출하면 false를 반환한다', () => {
    const store = new WorkspaceStore(tmpUserData)
    expect(store.remove('non-existent')).toBe(false)
  })
})

describe('TC-WS-S12: _load() — 손상된 JSON 파일 시 빈 배열 반환', () => {
  test('workspaces.json이 손상된 JSON일 때 getAll()은 빈 배열을 반환한다', () => {
    fs.writeFileSync(path.join(tmpUserData, 'workspaces.json'), '{broken')
    const store = new WorkspaceStore(tmpUserData)
    expect(store.getAll()).toEqual([])
  })
})
