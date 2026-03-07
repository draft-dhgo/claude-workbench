const os = require('os')
const fs = require('fs')
const path = require('path')

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

const mockShowOpenDialog = jest.fn()
const mockExec = jest.fn()

let tmpUserData
let handlers

beforeEach(() => {
  tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'test-userdata-'))
  mockShowOpenDialog.mockReset()
  mockExec.mockReset()

  jest.resetModules()
  jest.doMock('electron', () => ({
    dialog: { showOpenDialog: mockShowOpenDialog },
    app: { getPath: jest.fn(() => tmpUserData) }
  }))
  jest.doMock('child_process', () => ({
    exec: mockExec
  }))
  handlers = require('../../../src/main/handlers/repoHandlers')
})

afterEach(() => {
  cleanup(tmpUserData)
})

const mockEvent = {}

describe('TC-08: handleRepoAdd 성공', () => {
  test('유효한 Git 저장소 등록 성공', async () => {
    const { tmpDir, repoDir } = createFakeRepo('valid-repo')
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [repoDir] })

      const result = await handlers.handleRepoAdd(mockEvent)
      expect(result.success).toBe(true)
      expect(result.repo).toBeDefined()
      expect(result.repo.name).toBe('valid-repo')
      expect(result.repo.path).toBe(repoDir)
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-09: handleRepoAdd 다이얼로그 취소', () => {
  test('취소 시 CANCELLED 에러 반환', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })

    const result = await handlers.handleRepoAdd(mockEvent)
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANCELLED')
  })
})

describe('TC-10: handleRepoAdd 유효하지 않은 Git 저장소', () => {
  test('.git 없는 폴더 선택 시 NOT_GIT_REPO', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-nogit-'))
    const noGitDir = path.join(tmpDir, 'not-a-repo')
    fs.mkdirSync(noGitDir, { recursive: true })
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [noGitDir] })

      const result = await handlers.handleRepoAdd(mockEvent)
      expect(result.success).toBe(false)
      expect(result.error).toBe('NOT_GIT_REPO')
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-11: handleRepoList 브랜치 정보 포함', () => {
  test('저장소 목록에 브랜치 포함', async () => {
    const { tmpDir: t1, repoDir: r1 } = createFakeRepo('repo-a')
    const { tmpDir: t2, repoDir: r2 } = createFakeRepo('repo-b')
    try {
      mockShowOpenDialog
        .mockResolvedValueOnce({ canceled: false, filePaths: [r1] })
        .mockResolvedValueOnce({ canceled: false, filePaths: [r2] })

      await handlers.handleRepoAdd(mockEvent)
      await handlers.handleRepoAdd(mockEvent)

      mockExec.mockImplementation((cmd, opts, cb) => {
        if (opts.cwd === r1) cb(null, 'main\n', '')
        else cb(null, 'develop\n', '')
      })

      const result = await handlers.handleRepoList()
      expect(result.success).toBe(true)
      expect(result.repos).toHaveLength(2)
      expect(result.repos[0].branch).toBe('main')
      expect(result.repos[1].branch).toBe('develop')
    } finally {
      cleanup(t1)
      cleanup(t2)
    }
  })
})

describe('TC-12: handleRepoList Git 명령 실패 시', () => {
  test('브랜치 unknown으로 표시', async () => {
    const { tmpDir, repoDir } = createFakeRepo('fail-git')
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [repoDir] })
      await handlers.handleRepoAdd(mockEvent)

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb(new Error('git not found'), '', '')
      })

      const result = await handlers.handleRepoList()
      expect(result.success).toBe(true)
      expect(result.repos[0].branch).toBe('unknown')
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-13: handleRepoRemove 성공', () => {
  test('저장소 등록 해제', async () => {
    const { tmpDir, repoDir } = createFakeRepo('remove-me')
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [repoDir] })
      const addResult = await handlers.handleRepoAdd(mockEvent)

      const result = await handlers.handleRepoRemove(mockEvent, addResult.repo.id)
      expect(result.success).toBe(true)

      mockExec.mockImplementation((cmd, opts, cb) => cb(null, '', ''))
      const listResult = await handlers.handleRepoList()
      expect(listResult.repos).toHaveLength(0)
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-14: handleRepoValidate 유효한 저장소', () => {
  test('유효한 경로와 .git 존재 시 valid: true', async () => {
    const { tmpDir, repoDir } = createFakeRepo('valid-check')
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [repoDir] })
      const addResult = await handlers.handleRepoAdd(mockEvent)

      const result = await handlers.handleRepoValidate(mockEvent, addResult.repo.id)
      expect(result.valid).toBe(true)
    } finally {
      cleanup(tmpDir)
    }
  })
})

describe('TC-15: handleRepoValidate 경로 사라짐', () => {
  test('경로 없으면 valid: false', async () => {
    const { tmpDir, repoDir } = createFakeRepo('will-delete')
    try {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [repoDir] })
      const addResult = await handlers.handleRepoAdd(mockEvent)

      fs.rmSync(repoDir, { recursive: true, force: true })

      const result = await handlers.handleRepoValidate(mockEvent, addResult.repo.id)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PATH_NOT_FOUND')
    } finally {
      cleanup(tmpDir)
    }
  })
})
