/**
 * workspaceHandlers.imports.test.ts
 * SDD-0027: TC-DEP-01 ~ TC-DEP-04 (종속성 제거 검증)
 */

import * as fs from 'fs'
import * as path from 'path'

const HANDLER_PATH = path.resolve(
  __dirname,
  '../../../src/main/handlers/workspaceHandlers.ts'
)

describe('SDD-0027: workspaceHandlers.ts 종속성 제거 검증', () => {
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(HANDLER_PATH, 'utf-8')
  })

  test('TC-DEP-01: workdirSetStore import 없음', () => {
    expect(/import.*workdirSetStore/.test(source)).toBe(false)
    expect(/require.*workdirSetStore/.test(source)).toBe(false)
  })

  test('TC-DEP-02: repoStore import 없음', () => {
    expect(/import.*[Rr]epoStore/.test(source)).toBe(false)
    expect(/require.*[Rr]epoStore/.test(source)).toBe(false)
  })

  test('TC-DEP-03: worktreeHandlers import 없음', () => {
    expect(/import.*worktreeHandlers/.test(source)).toBe(false)
    expect(/require.*worktreeHandlers/.test(source)).toBe(false)
  })

  test('TC-DEP-04: workspaceStore import 존재 (WorkspaceStore 직접 조회)', () => {
    expect(/workspaceStore/.test(source)).toBe(true)
  })
})
