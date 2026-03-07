const path = require('path')

const mockExistsSync = jest.fn()
const mockCpSync = jest.fn()
const mockCopyFileSync = jest.fn()
const mockSend = jest.fn()

let handlers

beforeEach(() => {
  mockExistsSync.mockReset()
  mockCpSync.mockReset()
  mockCopyFileSync.mockReset()
  mockSend.mockReset()

  jest.resetModules()
  jest.doMock('fs', () => ({
    existsSync: mockExistsSync,
    cpSync: mockCpSync,
    copyFileSync: mockCopyFileSync,
  }))
  jest.doMock('electron', () => ({
    BrowserWindow: {
      getAllWindows: jest.fn(() => [{ webContents: { send: mockSend } }])
    }
  }))

  handlers = require('../../../src/main/handlers/claudeConfigHandlers')
})

// ─── handleDetect ─────────────────────────────────────────────────────────────

describe('handleDetect', () => {
  test('TC-CCH-01: .claude/ 와 CLAUDE.md 모두 존재 → 두 플래그 모두 true', async () => {
    mockExistsSync.mockReturnValue(true)
    const result = await handlers.handleDetect(null, { repoPaths: ['/repo'] })
    expect(result).toEqual({ hasClaudeDir: true, hasClaudeMd: true })
  })

  test('TC-CCH-02: .claude/ 만 존재, CLAUDE.md 없음', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // .claude/ 존재
      .mockReturnValueOnce(false)  // CLAUDE.md 없음
    const result = await handlers.handleDetect(null, { repoPaths: ['/repo'] })
    expect(result.hasClaudeDir).toBe(true)
    expect(result.hasClaudeMd).toBe(false)
  })

  test('TC-CCH-03: CLAUDE.md 만 존재, .claude/ 없음', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음
      .mockReturnValueOnce(true)   // CLAUDE.md 존재
    const result = await handlers.handleDetect(null, { repoPaths: ['/repo'] })
    expect(result.hasClaudeDir).toBe(false)
    expect(result.hasClaudeMd).toBe(true)
  })

  test('TC-CCH-04: 둘 다 없음 → 두 플래그 모두 false', async () => {
    mockExistsSync.mockReturnValue(false)
    const result = await handlers.handleDetect(null, { repoPaths: ['/repo'] })
    expect(result).toEqual({ hasClaudeDir: false, hasClaudeMd: false })
  })

  test('TC-CCH-05: repoPaths 복수 시 첫 번째 경로만 사용', async () => {
    mockExistsSync.mockReturnValue(true)
    await handlers.handleDetect(null, { repoPaths: ['/repo-a', '/repo-b', '/repo-c'] })
    const calledPaths = mockExistsSync.mock.calls.map(c => c[0])
    calledPaths.forEach(p => {
      expect(p.startsWith('/repo-a')).toBe(true)
    })
    calledPaths.forEach(p => {
      expect(p.startsWith('/repo-b')).toBe(false)
      expect(p.startsWith('/repo-c')).toBe(false)
    })
  })
})

// ─── handleReset ──────────────────────────────────────────────────────────────

describe('handleReset', () => {
  let mockRmSync
  let mockMkdirSync
  let mockWriteFileSync
  let rstHandlers

  beforeEach(() => {
    mockRmSync = jest.fn()
    mockMkdirSync = jest.fn()
    mockWriteFileSync = jest.fn()

    mockRmSync.mockReset()
    mockMkdirSync.mockReset()
    mockWriteFileSync.mockReset()

    jest.resetModules()
    jest.doMock('fs', () => ({
      existsSync: mockExistsSync,
      rmSync: mockRmSync,
      mkdirSync: mockMkdirSync,
      writeFileSync: mockWriteFileSync,
      cpSync: jest.fn(),
      copyFileSync: jest.fn(),
    }))
    jest.doMock('electron', () => ({
      BrowserWindow: {
        getAllWindows: jest.fn(() => [{ webContents: { send: mockSend } }])
      }
    }))

    rstHandlers = require('../../../src/main/handlers/claudeConfigHandlers')
  })

  test('TC-RST-01: .claude/ 와 CLAUDE.md 모두 존재 → 4단계 모두 success', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // .claude/ 존재
      .mockReturnValueOnce(true)   // CLAUDE.md 존재
    mockRmSync.mockReturnValue(undefined)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)
    expect(result.steps).toHaveLength(4)
    expect(result.steps[0].step).toBe('delete-claude-dir')
    expect(result.steps[1].step).toBe('delete-claude-md')
    expect(result.steps[2].step).toBe('create-claude-dir')
    expect(result.steps[3].step).toBe('create-claude-md')
    result.steps.forEach(s => expect(s.status).toBe('success'))
  })

  test('TC-RST-02: .claude/ 없음, CLAUDE.md 존재 → .claude/ 건너뜀, CLAUDE.md 삭제 후 재생성', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음
      .mockReturnValueOnce(true)   // CLAUDE.md 존재
    mockRmSync.mockReturnValue(undefined)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)
    expect(result.steps[0].status).toBe('skipped')
    expect(result.steps[1].status).toBe('success')
    expect(result.steps[2].status).toBe('success')
    expect(result.steps[3].status).toBe('success')
    // rmSync should not have been called with .claude/ path
    const rmCalls = mockRmSync.mock.calls.map(c => c[0])
    rmCalls.forEach(p => expect(p).not.toContain('.claude'))
  })

  test('TC-RST-03: .claude/ 존재, CLAUDE.md 없음 → .claude/ 삭제 후 재생성, CLAUDE.md 건너뜀 후 생성', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // .claude/ 존재
      .mockReturnValueOnce(false)  // CLAUDE.md 없음
    mockRmSync.mockReturnValue(undefined)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)
    expect(result.steps[0].status).toBe('success')
    expect(result.steps[1].status).toBe('skipped')
    expect(result.steps[2].status).toBe('success')
    expect(result.steps[3].status).toBe('success')
    // rmSync should not have been called with CLAUDE.md
    const rmCalls = mockRmSync.mock.calls.map(c => c[0])
    rmCalls.forEach(p => expect(p).not.toContain('CLAUDE.md'))
  })

  test('TC-RST-04: 둘 다 없음 → 전부 건너뜀, 재생성만 수행', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음
      .mockReturnValueOnce(false)  // CLAUDE.md 없음
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)
    expect(result.steps[0].status).toBe('skipped')
    expect(result.steps[1].status).toBe('skipped')
    expect(result.steps[2].status).toBe('success')
    expect(result.steps[3].status).toBe('success')
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('TC-RST-05: rmSync(.claude/) 실패 → success: false, failedStep: delete-claude-dir', async () => {
    mockExistsSync.mockReturnValueOnce(true)  // .claude/ 존재
    mockRmSync.mockImplementationOnce(() => { throw new Error('EACCES: permission denied, rmdir \'/workspace/.claude\'') })

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('delete-claude-dir')
    expect(result.error).toContain('EACCES')
    expect(mockMkdirSync).not.toHaveBeenCalled()
    expect(mockWriteFileSync).not.toHaveBeenCalled()
    expect(result.steps).toBeUndefined()
  })

  test('TC-RST-06: rmSync(CLAUDE.md) 실패 → success: false, failedStep: delete-claude-md', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // .claude/ 존재
      .mockReturnValueOnce(true)   // CLAUDE.md 존재
    mockRmSync
      .mockReturnValueOnce(undefined)  // .claude/ 삭제 성공
      .mockImplementationOnce(() => { throw new Error('EBUSY: resource busy or locked') })  // CLAUDE.md 삭제 실패

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('delete-claude-md')
    expect(result.error).toContain('EBUSY')
    expect(mockMkdirSync).not.toHaveBeenCalled()
    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })

  test('TC-RST-07: mkdirSync 실패 → success: false, failedStep: create-claude-dir', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음 (skipped)
      .mockReturnValueOnce(false)  // CLAUDE.md 없음 (skipped)
    mockMkdirSync.mockImplementationOnce(() => { throw new Error('ENOSPC: no space left on device') })

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('create-claude-dir')
    expect(result.error).toContain('ENOSPC')
    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })

  test('TC-RST-08: writeFileSync(CLAUDE.md) 실패 → success: false, failedStep: create-claude-md', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음 (skipped)
      .mockReturnValueOnce(false)  // CLAUDE.md 없음 (skipped)
    mockMkdirSync.mockReturnValue(undefined)
    // skills/commands writeFileSync는 성공, CLAUDE.md writeFileSync만 실패
    mockWriteFileSync.mockImplementation((filePath) => {
      if (filePath.endsWith('CLAUDE.md')) {
        throw new Error('EACCES: permission denied, open \'/workspace/CLAUDE.md\'')
      }
    })

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('create-claude-md')
    expect(result.error).toContain('EACCES')
  })

  test('TC-RST-09: workspacePath 미전달 (undefined) → validation 에러', async () => {
    const result = await rstHandlers.handleReset(null, { workspacePath: undefined })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('validation')
    expect(result.error).toBeTruthy()
    expect(mockExistsSync).not.toHaveBeenCalled()
  })

  test('TC-RST-10: workspacePath 빈 문자열 → validation 에러', async () => {
    const result = await rstHandlers.handleReset(null, { workspacePath: '' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('validation')
    expect(mockExistsSync).not.toHaveBeenCalled()
  })

  test('TC-RST-12: 재생성 시 skills 10개, commands 4개 파일 생성', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // .claude/ 없음 (skipped)
      .mockReturnValueOnce(false)  // CLAUDE.md 없음 (skipped)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)

    // writeFileSync 호출 중 SKILL.md 파일 생성 확인
    const writeCalls = mockWriteFileSync.mock.calls.map(c => c[0])
    const skillFiles = writeCalls.filter(p => p.includes('SKILL.md'))
    expect(skillFiles).toHaveLength(10)

    // commands 파일 생성 확인
    const cmdFiles = writeCalls.filter(p => p.includes(path.join('commands', '')))
    expect(cmdFiles).toHaveLength(4)

    // CLAUDE.md 생성 확인
    const claudeMdFiles = writeCalls.filter(p => p.endsWith('CLAUDE.md') && !p.includes('.claude'))
    expect(claudeMdFiles).toHaveLength(1)
  })

  test('TC-RST-13: 재생성된 CLAUDE.md에 스킬 테이블 포함', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })

    const claudeMdCall = mockWriteFileSync.mock.calls.find(c => c[0].endsWith('CLAUDE.md') && !c[0].includes('.claude'))
    expect(claudeMdCall).toBeTruthy()
    const content = claudeMdCall[1]
    expect(content).toContain('## 사용 가능한 스킬')
    expect(content).toContain('req-manage')
    expect(content).toContain('wiki-views')
    expect(content).toContain('bugfix')
  })

  test('TC-RST-14: skills 쓰기 중 실패 → success: false, failedStep: create-claude-dir', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
    mockMkdirSync.mockReturnValue(undefined)
    // skills 첫 파일 쓰기에서 실패
    mockWriteFileSync.mockImplementationOnce(() => { throw new Error('ENOSPC: no space left') })

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('create-claude-dir')
    expect(result.error).toContain('ENOSPC')
  })

  test('TC-RST-11: wiki/ 디렉토리(산출물) 경로에 대한 rmSync 호출 없음 확인', async () => {
    mockExistsSync.mockReturnValue(true)
    mockRmSync.mockReturnValue(undefined)
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)

    const result = await rstHandlers.handleReset(null, { workspacePath: '/workspace/my-project' })
    expect(result.success).toBe(true)
    const wikiDirPrefix = path.join('/workspace/my-project', 'wiki')
    // rmSync 호출 경로에 wiki/ 산출물 디렉토리가 포함되지 않아야 함
    mockRmSync.mock.calls.forEach(call => {
      expect(call[0].startsWith(wikiDirPrefix)).toBe(false)
    })
  })
})

// ─── handleCopyAll ────────────────────────────────────────────────────────────

describe('handleCopyAll', () => {
  test('TC-CCH-06: .claude/ 와 CLAUDE.md 모두 복사 성공', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(true)   // src/CLAUDE.md 존재
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCpSync.mockReturnValue(undefined)
    mockCopyFileSync.mockReturnValue(undefined)

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.succeeded).toEqual(['/wt/a'])
    expect(result.failed).toEqual([])
    expect(result.skipped).toEqual([])
    expect(mockCpSync).toHaveBeenCalledTimes(1)
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1)
  })

  test('TC-CCH-07: .claude/ 만 복사 (CLAUDE.md 소스 없음)', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCpSync.mockReturnValue(undefined)

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.succeeded).toContain('/wt/a')
    expect(mockCpSync).toHaveBeenCalledTimes(1)
    expect(mockCopyFileSync).not.toHaveBeenCalled()
  })

  test('TC-CCH-08: CLAUDE.md 만 복사 (hasClaudeDir=false)', async () => {
    mockExistsSync
      .mockReturnValueOnce(false)  // src/.claude 없음
      .mockReturnValueOnce(true)   // src/CLAUDE.md 존재
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCopyFileSync.mockReturnValue(undefined)

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.succeeded).toContain('/wt/a')
    expect(mockCpSync).not.toHaveBeenCalled()
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1)
  })

  test('TC-CCH-09: overwrite=false이고 대상 .claude/ 이미 존재 → skipped', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(true)   // dst/.claude 이미 존재
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.skipped).toEqual(['/wt/a'])
    expect(result.succeeded).toEqual([])
    expect(result.failed).toEqual([])
    expect(mockCpSync).not.toHaveBeenCalled()
    expect(mockCopyFileSync).not.toHaveBeenCalled()
  })

  test('TC-CCH-10: overwrite=false이고 대상 CLAUDE.md 이미 존재 → skipped', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(true)   // src/CLAUDE.md 존재
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(true)   // dst/CLAUDE.md 이미 존재

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.skipped).toContain('/wt/a')
    expect(mockCpSync).not.toHaveBeenCalled()
    expect(mockCopyFileSync).not.toHaveBeenCalled()
  })

  test('TC-CCH-11: overwrite=true이고 대상 이미 존재 → 덮어쓰기 진행', async () => {
    mockExistsSync.mockReturnValue(true)  // 소스 및 대상 모두 존재
    mockCpSync.mockReturnValue(undefined)
    mockCopyFileSync.mockReturnValue(undefined)

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: true
    })
    expect(result.succeeded).toContain('/wt/a')
    expect(result.skipped).toEqual([])
    expect(mockCpSync).toHaveBeenCalled()
  })

  test('TC-CCH-12: 일부 워크트리 fs 오류, 나머지 계속 처리 (2개)', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-a/.claude 없음
      .mockReturnValueOnce(false)  // dst-a/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-b/.claude 없음
      .mockReturnValueOnce(false)  // dst-b/CLAUDE.md 없음
    mockCpSync
      .mockImplementationOnce(() => { throw new Error('EACCES: permission denied') })
      .mockImplementationOnce(() => {})

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a', '/wt/b'], overwrite: false
    })
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].path).toBe('/wt/a')
    expect(result.failed[0].error).toContain('EACCES')
    expect(result.succeeded).toContain('/wt/b')
  })

  test('TC-CCH-13: 3개 중 가운데 실패, 앞뒤 성공', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-a/.claude 없음
      .mockReturnValueOnce(false)  // dst-a/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-b/.claude 없음
      .mockReturnValueOnce(false)  // dst-b/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-c/.claude 없음
      .mockReturnValueOnce(false)  // dst-c/CLAUDE.md 없음
    mockCpSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => { throw new Error('ENOENT') })
      .mockImplementationOnce(() => {})

    const result = await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a', '/wt/b', '/wt/c'], overwrite: false
    })
    expect(result.succeeded).toHaveLength(2)
    expect(result.failed).toHaveLength(1)
    expect(result.succeeded).toContain('/wt/a')
    expect(result.succeeded).toContain('/wt/c')
    expect(result.failed[0].path).toBe('/wt/b')
  })

  test('TC-CCH-14: progress 이벤트 전송 순서 검증 (running → success)', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-a/.claude 없음
      .mockReturnValueOnce(false)  // dst-a/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst-b/.claude 없음
      .mockReturnValueOnce(false)  // dst-b/CLAUDE.md 없음
    mockCpSync.mockReturnValue(undefined)

    await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a', '/wt/b'], overwrite: false
    })

    expect(mockSend).toHaveBeenCalledTimes(4)
    const calls = mockSend.mock.calls
    expect(calls[0][0]).toBe('claude-config:progress')
    expect(calls[0][1]).toMatchObject({ worktreePath: '/wt/a', status: 'running', message: '복사 중...' })
    expect(calls[1][0]).toBe('claude-config:progress')
    expect(calls[1][1]).toMatchObject({ worktreePath: '/wt/a', status: 'success', message: '완료' })
    expect(calls[2][0]).toBe('claude-config:progress')
    expect(calls[2][1]).toMatchObject({ worktreePath: '/wt/b', status: 'running' })
    expect(calls[3][0]).toBe('claude-config:progress')
    expect(calls[3][1]).toMatchObject({ worktreePath: '/wt/b', status: 'success' })
  })

  test('TC-CCH-15: progress 이벤트 전송 순서 검증 (running → skipped)', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(true)   // dst/.claude 이미 존재

    await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })

    expect(mockSend).toHaveBeenCalledTimes(2)
    const calls = mockSend.mock.calls
    expect(calls[0][1].status).toBe('running')
    expect(calls[1][1].status).toBe('skipped')
    expect(calls[1][1].message).toContain('건너뜀')
  })

  test('TC-CCH-16: progress 이벤트 전송 순서 검증 (running → error)', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCpSync.mockImplementation(() => { throw new Error('EACCES: permission denied') })

    await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })

    expect(mockSend).toHaveBeenCalledTimes(2)
    const calls = mockSend.mock.calls
    expect(calls[0][1].status).toBe('running')
    expect(calls[1][1].status).toBe('error')
    expect(calls[1][1].message).toContain('EACCES: permission denied')
  })

  test('TC-CCH-17: BrowserWindow 없을 때 progress 전송 시 오류 없이 진행', async () => {
    jest.resetModules()
    jest.doMock('fs', () => ({
      existsSync: mockExistsSync,
      cpSync: mockCpSync,
      copyFileSync: mockCopyFileSync,
    }))
    jest.doMock('electron', () => ({
      BrowserWindow: {
        getAllWindows: jest.fn(() => [])  // 빈 배열
      }
    }))
    const emptyWindowHandlers = require('../../../src/main/handlers/claudeConfigHandlers')

    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(false)  // src/CLAUDE.md 없음
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCpSync.mockReturnValue(undefined)

    const result = await emptyWindowHandlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })
    expect(result.succeeded).toContain('/wt/a')
  })

  test('TC-CCH-18: fs.cpSync / fs.copyFileSync 호출 인수 검증', async () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // src/.claude 존재
      .mockReturnValueOnce(true)   // src/CLAUDE.md 존재
      .mockReturnValueOnce(false)  // dst/.claude 없음
      .mockReturnValueOnce(false)  // dst/CLAUDE.md 없음
    mockCpSync.mockReturnValue(undefined)
    mockCopyFileSync.mockReturnValue(undefined)

    await handlers.handleCopyAll(null, {
      sourcePath: '/src', worktreePaths: ['/wt/a'], overwrite: false
    })

    expect(mockCpSync).toHaveBeenCalledWith(
      path.join('/src', '.claude'),
      path.join('/wt/a', '.claude'),
      { recursive: true }
    )
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      path.join('/src', 'CLAUDE.md'),
      path.join('/wt/a', 'CLAUDE.md')
    )
  })
})
