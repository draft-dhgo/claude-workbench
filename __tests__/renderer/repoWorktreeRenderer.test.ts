/**
 * TDD Tests for REQ-003: Worktree Management Tab — Single Repo Worktree Creation
 * Source: SDD-0003, Test Design-0003
 * @jest-environment jsdom
 */

import {
  showCreateForm,
  hideCreateForm,
  setCreatePending,
  validateCreateInputs,
  onSelectPathClicked,
  onCreateSubmit,
  setCurrentRepoId,
} from '../../src/renderer/scripts/repoWorktreeRenderer'

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockInvoke = jest.fn()
const mockShowToast = jest.fn()
const mockOnRepoSelected = jest.fn().mockResolvedValue(undefined)

// Test data constants
const TEST_REPO_ID = 'repo-1'
const VALID_BRANCH = 'feature/my-task'
const VALID_PATH = '/Users/test/worktree'
const SELECT_PATH_SUCCESS = { success: true, path: '/selected/path' }
const SELECT_PATH_CANCEL = { success: false }
const CREATE_SUCCESS = { success: true }
const CREATE_FAIL_PATH_NOT_EXISTS = { success: false, error: 'PATH_NOT_EXISTS' }
const CREATE_FAIL_DUPLICATE = { success: false, error: 'DUPLICATE_PATH' }
const CREATE_FAIL_NOT_FOUND = { success: false, error: 'NOT_FOUND' }
const CREATE_FAIL_GIT = { success: false, error: 'branch already exists' }

function setupDOM() {
  document.body.innerHTML = `
    <button id="rm-add-btn" aria-label="Add a new worktree for the selected repository" style="display:none;"></button>
    <div id="rm-list-section" style="display:block;"></div>
    <div id="rm-create-form" style="display:none;">
      <input type="text" id="rm-branch-input" aria-label="New branch name for the worktree" />
      <div id="rm-branch-error" style="display:none;"></div>
      <input type="text" id="rm-path-input" aria-label="Target directory path for the new worktree" />
      <div id="rm-path-error" style="display:none;"></div>
      <button id="rm-select-path-btn" aria-label="Open directory picker to select worktree path">Browse...</button>
      <button id="rm-create-btn" aria-label="Create the new worktree">Create</button>
      <button id="rm-create-cancel-btn" aria-label="Cancel worktree creation and return to list">Cancel</button>
    </div>
  `
}

beforeEach(() => {
  setupDOM()

  Object.defineProperty(window, 'electronAPI', {
    value: { invoke: mockInvoke },
    writable: true,
    configurable: true,
  })

  mockInvoke.mockResolvedValue(CREATE_SUCCESS)
  setCurrentRepoId(TEST_REPO_ID)
})

afterEach(() => {
  jest.clearAllMocks()
  document.body.innerHTML = ''
  setCurrentRepoId(null)
})

// ─── UNIT TESTS ───────────────────────────────────────────────────────────────

describe('TC-U-01: showCreateForm — 생성 폼 표시 및 목록 섹션 숨김', () => {
  test('showCreateForm() 호출 시 폼 표시, 목록 숨김, 입력 필드 초기화', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = 'some-branch'
    pathInput.value = '/some/path'

    showCreateForm()

    expect(document.getElementById('rm-create-form')!.style.display).toBe('block')
    expect(document.getElementById('rm-list-section')!.style.display).toBe('none')
    expect(document.getElementById('rm-add-btn')!.style.display).toBe('none')
    expect(branchInput.value).toBe('')
    expect(pathInput.value).toBe('')
    expect(document.getElementById('rm-branch-error')!.style.display).toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-U-02: showCreateForm — currentRepoId가 없을 때 폼 미표시', () => {
  test('currentRepoId가 null이면 showCreateForm()이 폼을 표시하지 않는다', () => {
    setCurrentRepoId(null)

    expect(() => showCreateForm()).not.toThrow()
    expect(document.getElementById('rm-create-form')!.style.display).not.toBe('block')
  })
})

describe('TC-U-03: hideCreateForm — 생성 폼 숨김 및 목록 섹션 복귀', () => {
  test('hideCreateForm() 호출 시 폼 숨김, 목록 섹션 및 Add 버튼 복귀', () => {
    showCreateForm()
    hideCreateForm()

    expect(document.getElementById('rm-create-form')!.style.display).toBe('none')
    expect(document.getElementById('rm-list-section')!.style.display).not.toBe('none')
    expect(document.getElementById('rm-add-btn')!.style.display).not.toBe('none')
  })
})

describe('TC-U-04: setCreatePending(true) — Create 버튼 disabled 및 텍스트 변경', () => {
  test('setCreatePending(true) 호출 시 Create 버튼 disabled + "Creating...", Cancel 버튼 disabled', () => {
    setCreatePending(true)

    const createBtn = document.getElementById('rm-create-btn') as HTMLButtonElement
    const cancelBtn = document.getElementById('rm-create-cancel-btn') as HTMLButtonElement
    expect(createBtn.disabled).toBe(true)
    expect(createBtn.textContent).toBe('Creating...')
    expect(cancelBtn.disabled).toBe(true)
  })
})

describe('TC-U-05: setCreatePending(false) — Create 버튼 정상 상태 복귀', () => {
  test('setCreatePending(false) 호출 시 Create 버튼 enabled, textContent가 Creating...이 아님', () => {
    setCreatePending(true)
    setCreatePending(false)

    const createBtn = document.getElementById('rm-create-btn') as HTMLButtonElement
    const cancelBtn = document.getElementById('rm-create-cancel-btn') as HTMLButtonElement
    expect(createBtn.disabled).toBe(false)
    expect(createBtn.textContent).not.toBe('Creating...')
    expect(cancelBtn.disabled).toBe(false)
  })
})

describe('TC-U-06: validateCreateInputs — 브랜치명과 경로 모두 입력 시 true 반환', () => {
  test('유효한 브랜치명과 경로 입력 시 true 반환, 오류 메시지 없음', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    const result = validateCreateInputs()

    expect(result).toBe(true)
    expect(document.getElementById('rm-branch-error')!.style.display).toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-U-07: validateCreateInputs — 브랜치명 미입력 시 false 반환 및 오류 표시', () => {
  test('브랜치명 빈 값, 경로 유효 시 false 반환, branch-error 표시, path-error 숨김', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = ''
    pathInput.value = VALID_PATH

    const result = validateCreateInputs()

    expect(result).toBe(false)
    expect(document.getElementById('rm-branch-error')!.style.display).not.toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-U-08: validateCreateInputs — 경로 미입력 시 false 반환 및 오류 표시', () => {
  test('브랜치명 유효, 경로 빈 값 시 false 반환, branch-error 숨김, path-error 표시', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = ''

    const result = validateCreateInputs()

    expect(result).toBe(false)
    expect(document.getElementById('rm-branch-error')!.style.display).toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).not.toBe('none')
  })
})

describe('TC-U-09: validateCreateInputs — 브랜치명과 경로 모두 미입력 시 false 반환 및 양쪽 오류 표시', () => {
  test('양쪽 빈 값 시 false 반환, 두 오류 메시지 모두 표시', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = ''
    pathInput.value = ''

    const result = validateCreateInputs()

    expect(result).toBe(false)
    expect(document.getElementById('rm-branch-error')!.style.display).not.toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).not.toBe('none')
  })
})

describe('TC-U-10: validateCreateInputs — 공백만 입력된 브랜치명은 빈 값으로 처리', () => {
  test('공백만 입력된 브랜치명 시 false 반환, branch-error 표시', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = '   '
    pathInput.value = VALID_PATH

    const result = validateCreateInputs()

    expect(result).toBe(false)
    expect(document.getElementById('rm-branch-error')!.style.display).not.toBe('none')
  })
})

// ─── INTEGRATION TESTS ────────────────────────────────────────────────────────

describe('TC-I-01: onSelectPathClicked — 경로 선택 성공 시 #rm-path-input 갱신', () => {
  test('worktree:select-path IPC 호출 후 경로 입력 필드 갱신 및 오류 메시지 숨김', async () => {
    mockInvoke.mockResolvedValueOnce(SELECT_PATH_SUCCESS)
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    pathInput.value = ''
    document.getElementById('rm-path-error')!.style.display = 'block'

    await onSelectPathClicked()

    expect(mockInvoke).toHaveBeenCalledWith('worktree:select-path')
    expect(pathInput.value).toBe('/selected/path')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-I-02: onSelectPathClicked — 다이얼로그 취소 시 경로 입력 필드 변경 없음', () => {
  test('IPC 취소 응답 시 경로 입력 필드 유지, 오류 메시지 없음', async () => {
    mockInvoke.mockResolvedValueOnce(SELECT_PATH_CANCEL)
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    pathInput.value = '/existing/path'

    await onSelectPathClicked()

    expect(pathInput.value).toBe('/existing/path')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-I-03: onCreateSubmit — 성공 시 폼 닫힘 + 목록 갱신 + 성공 토스트', () => {
  test('worktree:create-single 성공 응답 시 폼 닫힘, onRepoSelected 호출, 성공 토스트', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_SUCCESS)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).toHaveBeenCalledWith('worktree:create-single', {
      repoId: TEST_REPO_ID,
      branch: VALID_BRANCH,
      targetPath: VALID_PATH,
      baseBranch: 'HEAD',
    })
    expect(document.getElementById('rm-create-form')!.style.display).toBe('none')
    expect(mockOnRepoSelected).toHaveBeenCalledWith(TEST_REPO_ID)
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success')
  })
})

describe('TC-I-04: onCreateSubmit — PATH_NOT_EXISTS 오류 시 폼 유지 + 오류 토스트', () => {
  test('PATH_NOT_EXISTS 오류 응답 시 폼 열린 상태 유지, 오류 토스트 표시', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_FAIL_PATH_NOT_EXISTS)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(document.getElementById('rm-create-form')!.style.display).not.toBe('none')
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('path_not_exists'), 'error')
  })
})

describe('TC-I-05: onCreateSubmit — DUPLICATE_PATH 오류 시 폼 유지 + 오류 토스트', () => {
  test('DUPLICATE_PATH 오류 응답 시 폼 열린 상태 유지, 오류 토스트 표시', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_FAIL_DUPLICATE)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(document.getElementById('rm-create-form')!.style.display).not.toBe('none')
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('duplicate_path'), 'error')
  })
})

describe('TC-I-06: onCreateSubmit — git 명령 오류(기타) 시 폼 유지 + 오류 토스트', () => {
  test('기타 git 오류 응답 시 폼 열린 상태 유지, create_fail 오류 토스트 표시', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_FAIL_GIT)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(document.getElementById('rm-create-form')!.style.display).not.toBe('none')
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('create_fail'), 'error')
  })
})

describe('TC-I-07: onCreateSubmit — IPC reject(예외) 시 catch 블록에서 오류 토스트', () => {
  test('IPC invoke가 reject 시 create_error 오류 토스트, Create 버튼 enabled 복귀', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('IPC error'))
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('create_error'), 'error')
    expect((document.getElementById('rm-create-btn') as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('TC-I-08: onCreateSubmit — validateCreateInputs 실패 시 IPC 미호출', () => {
  test('빈 입력값으로 onCreateSubmit 호출 시 IPC invoke 호출 안 됨', async () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = ''
    pathInput.value = ''

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).not.toHaveBeenCalled()
  })
})

describe('TC-I-09: onCreateSubmit — 성공 후 isCreating 플래그가 false로 초기화', () => {
  test('첫 번째 onCreateSubmit 완료 후 Create 버튼 enabled, 두 번째 호출 시 invoke 정상 호출', async () => {
    mockInvoke.mockResolvedValue(CREATE_SUCCESS)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect((document.getElementById('rm-create-btn') as HTMLButtonElement).disabled).toBe(false)

    // Second call — need to re-setup form state since hideCreateForm was called
    setupDOM()
    setCurrentRepoId(TEST_REPO_ID)
    showCreateForm()
    const branchInput2 = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput2 = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput2.value = VALID_BRANCH
    pathInput2.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })
})

// ─── ACCESSIBILITY TESTS ──────────────────────────────────────────────────────

describe('TC-A-01: #rm-branch-input — aria-label 존재 및 의미 있는 값', () => {
  test('rm-branch-input의 aria-label이 존재하고 브랜치명 입력임을 명시한다', () => {
    const el = document.getElementById('rm-branch-input')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/branch/)
  })
})

describe('TC-A-02: #rm-path-input — aria-label 존재 및 의미 있는 값', () => {
  test('rm-path-input의 aria-label이 존재하고 대상 경로 입력임을 명시한다', () => {
    const el = document.getElementById('rm-path-input')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/path|directory/)
  })
})

describe('TC-A-03: #rm-select-path-btn — aria-label 존재', () => {
  test('rm-select-path-btn의 aria-label이 존재하고 디렉토리 선택 동작임을 명시한다', () => {
    const el = document.getElementById('rm-select-path-btn')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/directory|path|select|picker/)
  })
})

describe('TC-A-04: #rm-create-btn — aria-label 존재', () => {
  test('rm-create-btn의 aria-label이 존재하고 생성 동작임을 명시한다', () => {
    const el = document.getElementById('rm-create-btn')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/create|worktree/)
  })
})

describe('TC-A-05: #rm-create-cancel-btn — aria-label 존재', () => {
  test('rm-create-cancel-btn의 aria-label이 존재하고 취소 동작임을 명시한다', () => {
    const el = document.getElementById('rm-create-cancel-btn')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/cancel/)
  })
})

describe('TC-A-06: setCreatePending(true) — Create 버튼 aria-disabled="true" 설정', () => {
  test('setCreatePending(true) 호출 후 rm-create-btn의 aria-disabled가 true', () => {
    setCreatePending(true)
    const createBtn = document.getElementById('rm-create-btn')!
    expect(createBtn.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('TC-A-07: setCreatePending(false) — Create 버튼 aria-disabled 복귀', () => {
  test('setCreatePending(false) 호출 후 rm-create-btn의 aria-disabled가 true가 아님', () => {
    setCreatePending(true)
    setCreatePending(false)
    const createBtn = document.getElementById('rm-create-btn')!
    expect(createBtn.getAttribute('aria-disabled')).not.toBe('true')
  })
})

describe('TC-A-08: #rm-add-btn — aria-label 존재', () => {
  test('rm-add-btn의 aria-label이 존재하고 worktree 추가 동작임을 명시한다', () => {
    const el = document.getElementById('rm-add-btn')!
    const ariaLabel = el.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel.toLowerCase()).toMatch(/worktree|add/)
  })
})

// ─── REGRESSION TESTS ────────────────────────────────────────────────────────

describe('TC-R-01: isCreating 가드 — onCreateSubmit 중복 호출 차단', () => {
  test('첫 번째 onCreateSubmit이 pending인 동안 두 번째 호출은 isCreating 가드로 차단', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve }))

    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    const first = onCreateSubmit(mockOnRepoSelected, mockShowToast)
    const second = onCreateSubmit(mockOnRepoSelected, mockShowToast)

    resolveInvoke(CREATE_SUCCESS)
    await first
    await second

    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})

describe('TC-R-02: Cancel 버튼 — pending 상태에서 클릭 불가 (disabled)', () => {
  test('setCreatePending(true) 후 Cancel 버튼이 disabled이고 hideCreateForm이 호출되지 않음', () => {
    showCreateForm()
    setCreatePending(true)

    const cancelBtn = document.getElementById('rm-create-cancel-btn') as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(true)

    // Simulate click — since button is disabled, no effect expected
    // We verify the form remains shown (not closed)
    cancelBtn.click()
    expect(document.getElementById('rm-create-form')!.style.display).toBe('block')
  })
})

describe('TC-R-03: onCreateSubmit — 빠른 연속 클릭 시 단 1회 invoke 호출', () => {
  test('onCreateSubmit을 세 번 연속 호출해도 invoke가 1회만 호출됨', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve }))

    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    const first = onCreateSubmit(mockOnRepoSelected, mockShowToast)
    onCreateSubmit(mockOnRepoSelected, mockShowToast)
    onCreateSubmit(mockOnRepoSelected, mockShowToast)

    resolveInvoke(CREATE_SUCCESS)
    await first

    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})

describe('TC-R-04: showCreateForm — 이전 오류 메시지가 초기화됨', () => {
  test('이전 validateCreateInputs 호출로 오류 표시된 상태에서 showCreateForm 호출 시 오류 메시지 초기화', () => {
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = ''
    pathInput.value = ''
    validateCreateInputs()

    expect(document.getElementById('rm-branch-error')!.style.display).not.toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).not.toBe('none')

    showCreateForm()

    expect(document.getElementById('rm-branch-error')!.style.display).toBe('none')
    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})

describe('TC-R-05: onCreateSubmit — NOT_FOUND 오류 시 폼 유지 + 오류 토스트', () => {
  test('NOT_FOUND 오류 응답 시 폼 열린 상태 유지, error 타입 토스트 호출', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_FAIL_NOT_FOUND)
    showCreateForm()
    const branchInput = document.getElementById('rm-branch-input') as HTMLInputElement
    const pathInput = document.getElementById('rm-path-input') as HTMLInputElement
    branchInput.value = VALID_BRANCH
    pathInput.value = VALID_PATH

    await onCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error')
    expect(document.getElementById('rm-create-form')!.style.display).not.toBe('none')
  })
})

describe('TC-R-06: onSelectPathClicked — 경로 선택 후 #rm-path-error 숨김', () => {
  test('경로 선택 성공 후 rm-path-error가 숨김 처리됨', async () => {
    mockInvoke.mockResolvedValueOnce({ success: true, path: '/new/path' })
    document.getElementById('rm-path-error')!.style.display = 'block'

    await onSelectPathClicked()

    expect(document.getElementById('rm-path-error')!.style.display).toBe('none')
  })
})
