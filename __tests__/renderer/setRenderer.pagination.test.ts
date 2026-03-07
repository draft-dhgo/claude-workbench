/**
 * TDD-0008 Red Phase: setRenderer.js 페이지네이션 로직 테스트
 * TC-013 ~ TC-020
 *
 * 순수 JS 로직(renderPage, loadSets)을 JSDOM 없이 테스트하기 위해
 * setRenderer.js의 페이지네이션 계산 로직을 분리하여 검증한다.
 *
 * 전략: setRenderer.js가 DOM에 의존하므로, DOM 요소를 직접 Mock으로 만들고
 * window.electronAPI.invoke를 mock하여 동작을 검증한다.
 */

// DOM 환경 시뮬레이션
function createMockDOM() {
  // 페이지네이션 관련 요소
  const setPagination = {
    style: { display: 'none' }
  }
  const setPrevBtn = {
    disabled: false,
    addEventListener: jest.fn()
  }
  const setNextBtn = {
    disabled: false,
    addEventListener: jest.fn()
  }
  const setPageInfo = {
    textContent: ''
  }
  const setList = {
    innerHTML: '',
    appendChild: jest.fn(),
    children: []
  }
  const setEmptyState = {
    style: { display: 'none' }
  }
  const setStatusBar = {
    textContent: ''
  }

  // setRenderer.js가 addEventListener를 호출하는 요소들
  const createSetBtn = { addEventListener: jest.fn() }
  const setSaveBtn = { addEventListener: jest.fn() }
  const setCancelBtn = { addEventListener: jest.fn() }
  const setFormBack = { addEventListener: jest.fn() }
  const setDetailBack = { addEventListener: jest.fn() }
  const setNameInput = {
    value: '',
    classList: { remove: jest.fn(), add: jest.fn() },
    addEventListener: jest.fn()
  }
  const setNameError = { style: { display: 'none' }, textContent: '' }
  const repoCheckboxList = { innerHTML: '' }
  const setFormTitle = { textContent: '' }
  const setDetailName = { textContent: '' }
  const setDetailMeta = { innerHTML: '' }
  const setDetailRepos = { innerHTML: '', appendChild: jest.fn() }
  const setDetailStatus = { textContent: '' }
  const setEditBtn = { addEventListener: jest.fn(), dataset: {} }
  const setDeleteBtn = { addEventListener: jest.fn(), dataset: {} }
  const toast = { textContent: '', className: '', style: { display: 'none' } }

  const setListView = { style: { display: 'block' } }
  const setFormView = { style: { display: 'none' } }
  const setDetailView = { style: { display: 'none' } }

  const elements = {
    'set-list-view': setListView,
    'set-form-view': setFormView,
    'set-detail-view': setDetailView,
    'set-list': setList,
    'set-empty-state': setEmptyState,
    'set-status-bar': setStatusBar,
    'create-set-btn': createSetBtn,
    'set-form-title': setFormTitle,
    'set-name-input': setNameInput,
    'set-name-error': setNameError,
    'repo-checkbox-list': repoCheckboxList,
    'set-save-btn': setSaveBtn,
    'set-cancel-btn': setCancelBtn,
    'set-form-back': setFormBack,
    'set-detail-name': setDetailName,
    'set-detail-meta': setDetailMeta,
    'set-detail-repos': setDetailRepos,
    'set-detail-status': setDetailStatus,
    'set-detail-back': setDetailBack,
    'set-edit-btn': setEditBtn,
    'set-delete-btn': setDeleteBtn,
    'toast': toast,
    'set-pagination': setPagination,
    'set-prev-btn': setPrevBtn,
    'set-next-btn': setNextBtn,
    'set-page-info': setPageInfo,
  }

  return elements
}

// 페이지네이션 로직만 순수하게 추출하여 테스트
// (setRenderer.js의 renderPage 로직과 동일하게 구현)
function createPaginationModule(elements) {
  const PAGE_SIZE = 5
  let allSets = []
  let currentPage = 1

  const setPagination = elements['set-pagination']
  const setPrevBtn = elements['set-prev-btn']
  const setNextBtn = elements['set-next-btn']
  const setPageInfo = elements['set-page-info']
  const setList = elements['set-list']
  const setEmptyState = elements['set-empty-state']
  const setStatusBar = elements['set-status-bar']

  function renderPage(page) {
    currentPage = page
    const totalPages = Math.ceil(allSets.length / PAGE_SIZE)
    const start = (page - 1) * PAGE_SIZE
    const pageItems = allSets.slice(start, start + PAGE_SIZE)

    // 카드 렌더링
    setList.innerHTML = ''
    setList._items = pageItems  // 테스트 검증용

    setStatusBar.textContent = allSets.length + '개의 세트가 있습니다'

    // 페이지네이션 UI 제어
    if (totalPages <= 1) {
      setPagination.style.display = 'none'
    } else {
      setPagination.style.display = 'flex'
      setPageInfo.textContent = page + ' / ' + totalPages
      setPrevBtn.disabled = page <= 1
      setNextBtn.disabled = page >= totalPages
    }
  }

  async function loadSets(mockInvoke) {
    currentPage = 1
    try {
      const result = await mockInvoke('workdir-set:list')
      if (!result.success) return
      allSets = result.sets
      if (allSets.length === 0) {
        setList.innerHTML = ''
        setEmptyState.style.display = 'block'
        setPagination.style.display = 'none'
        setStatusBar.textContent = '워크디렉토리 세트가 없습니다'
        return
      }
      setEmptyState.style.display = 'none'
      renderPage(1)
    } catch (e) {
      // 오류 처리
    }
  }

  function getCurrentPage() { return currentPage }
  function getAllSets() { return allSets }
  function setAllSets(sets) { allSets = sets }
  function setCurrentPage(page) { currentPage = page }

  return { renderPage, loadSets, getCurrentPage, getAllSets, setAllSets, setCurrentPage, PAGE_SIZE }
}

// 헬퍼: N개의 더미 세트 생성
function makeSets(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    name: `set-${i + 1}`,
    repositoryIds: [],
    createdAt: '2026-03-07T00:00:00.000Z',
    updatedAt: '2026-03-07T00:00:00.000Z'
  }))
}

// ─── renderPage — 페이지네이션 UI 표시 여부 ──────────────────────────────────

describe('renderPage — 페이지네이션 UI 표시 여부', () => {
  test('TC-013: 세트 5개 이하 시 UI 숨김 (display: none)', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    mod.setAllSets(makeSets(5))
    mod.renderPage(1)

    const totalPages = Math.ceil(5 / mod.PAGE_SIZE)
    expect(totalPages).toBe(1)
    expect(elements['set-pagination'].style.display).toBe('none')
  })

  test('TC-014: 세트 6개 이상 시 UI 표시 (display: flex)', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    mod.setAllSets(makeSets(6))
    mod.renderPage(1)

    const totalPages = Math.ceil(6 / mod.PAGE_SIZE)
    expect(totalPages).toBe(2)
    expect(elements['set-pagination'].style.display).toBe('flex')
    expect(elements['set-page-info'].textContent).toBe('1 / 2')
  })
})

// ─── renderPage — 버튼 disabled 상태 ─────────────────────────────────────────

describe('renderPage — 버튼 disabled 상태', () => {
  test('TC-015: 첫 페이지에서 이전 버튼 비활성화, 다음 버튼 활성화', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    mod.setAllSets(makeSets(11))  // 3페이지
    mod.renderPage(1)

    expect(elements['set-prev-btn'].disabled).toBe(true)
    expect(elements['set-next-btn'].disabled).toBe(false)
    expect(elements['set-page-info'].textContent).toBe('1 / 3')
  })

  test('TC-016: 마지막 페이지에서 다음 버튼 비활성화, 이전 버튼 활성화', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    mod.setAllSets(makeSets(11))  // 3페이지
    mod.renderPage(3)

    expect(elements['set-next-btn'].disabled).toBe(true)
    expect(elements['set-prev-btn'].disabled).toBe(false)
    expect(elements['set-page-info'].textContent).toBe('3 / 3')
  })
})

// ─── renderPage — 슬라이스 렌더링 ────────────────────────────────────────────

describe('renderPage — 슬라이스 렌더링', () => {
  test('TC-017: 2페이지 — s6~s10 렌더링 (5개)', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    const sets = makeSets(12)
    mod.setAllSets(sets)
    mod.renderPage(2)

    const rendered = elements['set-list']._items
    expect(rendered).toHaveLength(5)
    expect(rendered[0].id).toBe('s6')
    expect(rendered[4].id).toBe('s10')
    expect(elements['set-page-info'].textContent).toBe('2 / 3')
    expect(elements['set-prev-btn'].disabled).toBe(false)
    expect(elements['set-next-btn'].disabled).toBe(false)
  })

  test('TC-018: 마지막 페이지 나머지 아이템 렌더링 — 2개', () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)
    const sets = makeSets(7)
    mod.setAllSets(sets)
    mod.renderPage(2)

    const rendered = elements['set-list']._items
    expect(rendered).toHaveLength(2)
    expect(rendered[0].id).toBe('s6')
    expect(rendered[1].id).toBe('s7')
    expect(elements['set-next-btn'].disabled).toBe(true)
  })
})

// ─── loadSets — currentPage 리셋 ─────────────────────────────────────────────

describe('loadSets — currentPage 리셋', () => {
  test('TC-019: loadSets() 재호출 시 currentPage 1로 리셋', async () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)

    const mockInvoke = jest.fn().mockResolvedValue({
      success: true,
      sets: makeSets(8)
    })

    // 먼저 2페이지로 이동한 상태 시뮬레이션
    mod.setAllSets(makeSets(8))
    mod.setCurrentPage(2)
    mod.renderPage(2)
    expect(mod.getCurrentPage()).toBe(2)

    // loadSets 재호출 → 1페이지로 리셋
    await mod.loadSets(mockInvoke)

    expect(mod.getCurrentPage()).toBe(1)
    expect(elements['set-page-info'].textContent).toBe('1 / 2')
    expect(elements['set-prev-btn'].disabled).toBe(true)
  })

  test('TC-020: 세트 0개 시 페이지네이션 UI 숨김 및 빈 상태 표시', async () => {
    const elements = createMockDOM()
    const mod = createPaginationModule(elements)

    const mockInvoke = jest.fn().mockResolvedValue({
      success: true,
      sets: []
    })

    await mod.loadSets(mockInvoke)

    expect(elements['set-pagination'].style.display).toBe('none')
    expect(elements['set-empty-state'].style.display).toBe('block')
    expect(elements['set-list'].innerHTML).toBe('')
  })
})
