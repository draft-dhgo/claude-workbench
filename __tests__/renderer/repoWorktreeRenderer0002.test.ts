/**
 * TDD Tests for SDD-0002: Worktree 생성 기능 추가 - 배치(다중) 워크트리 생성
 * Source: SDD-0002, Test Design-0002
 * @jest-environment jsdom
 */

import {
  showBatchCreatePanel,
  hideBatchCreatePanel,
  addWorktreeRow,
  removeWorktreeRow,
  validateBatchInputs,
  onBatchSelectPathClicked,
  onBatchCreateSubmit,
  setCurrentRepoId,
  showCreateForm,
} from '../../src/renderer/scripts/repoWorktreeRenderer'

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockInvoke = jest.fn()
const mockShowToast = jest.fn()
const mockOnRepoSelected = jest.fn().mockResolvedValue(undefined)

// Test data constants
const TEST_REPO_ID = 'repo-1'
const VALID_PATH = '/Users/test/worktrees'
const VALID_BRANCH_1 = 'feature/batch-a'
const VALID_BRANCH_2 = 'feature/batch-b'
const SELECT_PATH_SUCCESS = { success: true, path: '/selected/dir' }
const SELECT_PATH_CANCEL = { success: false }
const CREATE_SUCCESS = { success: true }
const CREATE_FAIL = { success: false, error: 'branch already exists' }

function setupDOM() {
  document.body.innerHTML = `
    <div id="rm-add-btn-wrapper" style="display:block;">
      <button id="rm-add-btn" aria-label="Add a new worktree for the selected repository">+ Add Worktree</button>
    </div>
    <div id="rm-list-section" style="display:block;"></div>
    <div id="rm-batch-create-panel" style="display:none;">
      <div class="rm-batch-form">
        <input type="text" id="rm-batch-path-input" readonly />
        <span id="rm-batch-path-error" style="display:none;"></span>
        <button id="rm-batch-path-btn">Select</button>
        <div id="rm-batch-rows"></div>
        <button id="rm-batch-add-row-btn">+ Add Entry</button>
        <div id="rm-batch-result" style="display:none;"></div>
        <button id="rm-batch-submit-btn">Create</button>
        <button id="rm-batch-cancel-btn">Cancel</button>
      </div>
    </div>
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

describe('TC-U-01: showBatchCreatePanel — 패널 표시 및 목록/Add 버튼 숨김', () => {
  test('showBatchCreatePanel() 호출 시 패널 표시, 목록 및 Add 버튼 숨김, 경로 초기화', () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = '/old/path'

    showBatchCreatePanel()

    expect(document.getElementById('rm-batch-create-panel')!.style.display).toBe('block')
    expect(document.getElementById('rm-list-section')!.style.display).toBe('none')
    expect(document.getElementById('rm-add-btn-wrapper')!.style.display).toBe('none')
    expect(pathInput.value).toBe('')
  })
})

describe('TC-U-02: showBatchCreatePanel — currentRepoId가 null이면 패널 미표시', () => {
  test('currentRepoId가 null이면 showBatchCreatePanel()이 패널을 표시하지 않는다', () => {
    setCurrentRepoId(null)

    expect(() => showBatchCreatePanel()).not.toThrow()
    expect(document.getElementById('rm-batch-create-panel')!.style.display).not.toBe('block')
  })
})

describe('TC-U-03: hideBatchCreatePanel — 패널 숨김 및 목록/Add 버튼 복원', () => {
  test('hideBatchCreatePanel() 호출 시 패널 숨김, 목록 섹션 및 Add 버튼 복원', () => {
    showBatchCreatePanel()
    hideBatchCreatePanel()

    expect(document.getElementById('rm-batch-create-panel')!.style.display).toBe('none')
    expect(document.getElementById('rm-list-section')!.style.display).not.toBe('none')
    expect(document.getElementById('rm-add-btn-wrapper')!.style.display).not.toBe('none')
  })
})

describe('TC-U-04: addWorktreeRow — 새 행 DOM 추가', () => {
  test('addWorktreeRow() 호출 시 #rm-batch-rows에 .rm-batch-row 1개 추가', () => {
    addWorktreeRow()

    const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(rows.length).toBe(1)

    const row = rows[0]
    expect(row.querySelector('.rm-batch-branch-input')).not.toBeNull()
    expect(row.querySelector('.rm-batch-remove-row')).not.toBeNull()
    expect(row.querySelector('.rm-batch-row-status')).not.toBeNull()
  })
})

describe('TC-U-05: addWorktreeRow — defaultBranch 값이 input에 설정됨', () => {
  test('addWorktreeRow("feature/test") 호출 시 input value가 "feature/test"', () => {
    addWorktreeRow('feature/test')

    const input = document.querySelector('#rm-batch-rows .rm-batch-branch-input') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('feature/test')
  })
})

describe('TC-U-06: addWorktreeRow — 여러 번 호출 시 행이 누적됨', () => {
  test('addWorktreeRow() 3회 호출 시 .rm-batch-row 3개 존재', () => {
    addWorktreeRow()
    addWorktreeRow()
    addWorktreeRow()

    const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(rows.length).toBe(3)
  })
})

describe('TC-U-07: removeWorktreeRow — 행이 2개 이상일 때 해당 행 제거', () => {
  test('2행 중 첫 행 removeWorktreeRow 호출 시 1행만 남음', () => {
    addWorktreeRow()
    addWorktreeRow()

    const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(rows.length).toBe(2)

    removeWorktreeRow(rows[0] as HTMLElement)

    const remaining = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(remaining.length).toBe(1)
  })
})

describe('TC-U-08: removeWorktreeRow — 행이 1개뿐이면 제거하지 않음 (최소 1행 유지)', () => {
  test('1행만 있을 때 removeWorktreeRow 호출해도 1행 유지', () => {
    addWorktreeRow()

    const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(rows.length).toBe(1)

    removeWorktreeRow(rows[0] as HTMLElement)

    const remaining = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
    expect(remaining.length).toBe(1)
  })
})

describe('TC-U-09: validateBatchInputs — 경로와 브랜치명 유효 시 true', () => {
  test('경로와 브랜치명 모두 유효하면 true 반환', () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)

    const result = validateBatchInputs()

    expect(result).toBe(true)
  })
})

describe('TC-U-10: validateBatchInputs — 경로 미선택 시 false 반환 및 오류 표시', () => {
  test('경로가 비어있으면 false 반환, #rm-batch-path-error 표시', () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = ''
    addWorktreeRow(VALID_BRANCH_1)

    const result = validateBatchInputs()

    expect(result).toBe(false)
    expect(document.getElementById('rm-batch-path-error')!.style.display).not.toBe('none')
  })
})

describe('TC-U-11: validateBatchInputs — 브랜치명 빈 값 행 존재 시 false 반환', () => {
  test('브랜치명이 빈 행 존재 시 false 반환', () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow('')  // empty branch

    const result = validateBatchInputs()

    expect(result).toBe(false)
  })
})

describe('TC-U-12: validateBatchInputs — 중복 브랜치명 시 false 반환', () => {
  test('동일 브랜치명 2행 존재 시 false 반환', () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow('same-branch')
    addWorktreeRow('same-branch')

    const result = validateBatchInputs()

    expect(result).toBe(false)
  })
})

// ─── INTEGRATION TESTS ────────────────────────────────────────────────────────

describe('TC-I-01: onBatchSelectPathClicked — 경로 선택 성공 시 #rm-batch-path-input 갱신', () => {
  test('worktree:select-path IPC 호출 후 path input 갱신, path error 숨김', async () => {
    mockInvoke.mockResolvedValueOnce(SELECT_PATH_SUCCESS)
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = ''
    document.getElementById('rm-batch-path-error')!.style.display = 'block'

    await onBatchSelectPathClicked()

    expect(mockInvoke).toHaveBeenCalledWith('worktree:select-path')
    expect(pathInput.value).toBe('/selected/dir')
    expect(document.getElementById('rm-batch-path-error')!.style.display).toBe('none')
  })
})

describe('TC-I-02: onBatchSelectPathClicked — 다이얼로그 취소 시 path input 변경 없음', () => {
  test('IPC 취소 응답 시 path input 값 유지', async () => {
    mockInvoke.mockResolvedValueOnce(SELECT_PATH_CANCEL)
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = '/existing/path'

    await onBatchSelectPathClicked()

    expect(pathInput.value).toBe('/existing/path')
  })
})

describe('TC-I-03: onBatchCreateSubmit — 단일 행 성공 시 성공 뱃지 + 목록 갱신 + 토스트', () => {
  test('1행 성공 시 성공 뱃지, onRepoSelected 호출, showToast 호출', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_SUCCESS)

    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)

    await onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).toHaveBeenCalledWith('worktree:create-single', {
      repoId: TEST_REPO_ID,
      baseBranch: 'HEAD',
      newBranch: VALID_BRANCH_1,
      targetPath: VALID_PATH,
    })

    const statusSpan = document.querySelector('#rm-batch-rows .rm-batch-row-status') as HTMLElement
    expect(statusSpan.textContent).not.toBe('')

    expect(mockOnRepoSelected).toHaveBeenCalledWith(TEST_REPO_ID)
    expect(mockShowToast).toHaveBeenCalled()
  })
})

describe('TC-I-04: onBatchCreateSubmit — 단일 행 실패 시 실패 뱃지 + 패널 유지', () => {
  test('1행 실패 시 실패 뱃지 표시, 패널 display=block 유지', async () => {
    mockInvoke.mockResolvedValueOnce(CREATE_FAIL)

    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)
    // Make panel visible (simulate state after showBatchCreatePanel)
    document.getElementById('rm-batch-create-panel')!.style.display = 'block'

    await onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)

    const statusSpan = document.querySelector('#rm-batch-rows .rm-batch-row-status') as HTMLElement
    expect(statusSpan.textContent).not.toBe('')

    expect(document.getElementById('rm-batch-create-panel')!.style.display).toBe('block')
  })
})

describe('TC-I-05: onBatchCreateSubmit — 다중 행 순차 처리 (각 행별 결과)', () => {
  test('2행: 첫 행 성공, 두 번째 행 실패 - invoke 2회 호출, 각 행에 뱃지', async () => {
    mockInvoke
      .mockResolvedValueOnce(CREATE_SUCCESS)
      .mockResolvedValueOnce(CREATE_FAIL)

    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)
    addWorktreeRow(VALID_BRANCH_2)

    await onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).toHaveBeenCalledTimes(2)

    const statusSpans = document.querySelectorAll('#rm-batch-rows .rm-batch-row-status')
    expect(statusSpans.length).toBe(2)
    // Both rows should have some status text
    expect((statusSpans[0] as HTMLElement).textContent).not.toBe('')
    expect((statusSpans[1] as HTMLElement).textContent).not.toBe('')
  })
})

describe('TC-I-06: onBatchCreateSubmit — validateBatchInputs 실패 시 IPC 미호출', () => {
  test('경로 빈 값으로 onBatchCreateSubmit 호출 시 invoke 호출 안 됨', async () => {
    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = ''
    addWorktreeRow(VALID_BRANCH_1)

    await onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)

    expect(mockInvoke).not.toHaveBeenCalled()
  })
})

describe('TC-I-07: onBatchCreateSubmit — IPC 예외(reject) 시 해당 행 실패 뱃지', () => {
  test('invoke가 reject 시 행에 실패 뱃지 표시, 예외 미전파', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('IPC error'))

    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)

    await expect(onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)).resolves.not.toThrow()

    const statusSpan = document.querySelector('#rm-batch-rows .rm-batch-row-status') as HTMLElement
    expect(statusSpan.textContent).not.toBe('')
  })
})

// ─── REGRESSION TESTS ────────────────────────────────────────────────────────

describe('TC-R-01: _isBatchCreating 가드 — onBatchCreateSubmit 중복 제출 차단', () => {
  test('첫 번째 onBatchCreateSubmit pending 중 두 번째 호출 시 invoke 1회만 호출됨', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve }))

    const pathInput = document.getElementById('rm-batch-path-input') as HTMLInputElement
    pathInput.value = VALID_PATH
    addWorktreeRow(VALID_BRANCH_1)

    const first = onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)
    const second = onBatchCreateSubmit(mockOnRepoSelected, mockShowToast)

    resolveInvoke(CREATE_SUCCESS)
    await first
    await second

    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})

describe('TC-R-02: 기존 showCreateForm 미영향 — 신규 함수 추가 후 기존 단일 생성 폼 정상 동작', () => {
  test('showBatchCreatePanel 추가 후에도 showCreateForm() 정상 동작', () => {
    showCreateForm()

    expect(document.getElementById('rm-create-form')!.style.display).toBe('block')
    expect(document.getElementById('rm-list-section')!.style.display).toBe('none')
  })
})
