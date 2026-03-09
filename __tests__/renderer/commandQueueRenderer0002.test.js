/**
 * TDD Tests for SDD-0002: Command Queue Workspace Selection State Persistence
 * Tests for commandQueueRenderer.js changes — _persistedCwd module-level variable
 * TC-01 through TC-11 from Test Design-0002
 *
 * @jest-environment jsdom
 */

// ─── Mock setup ───────────────────────────────────────────────────────────────

const DOM_FIXTURE = `
  <select id="cq-cwd-select"></select>
  <select id="cq-cmd-type"><option value="/teams">/teams</option></select>
  <input id="cq-cmd-args" />
  <button id="cq-add-btn"></button>
  <textarea id="cq-bulk-input"></textarea>
  <button id="cq-bulk-btn"></button>
  <div id="cq-queue-list"></div>
  <div id="cq-queue-empty"></div>
  <div id="cq-log-content"></div>
  <button id="cq-abort-btn"></button>
  <div id="toast"></div>
`

const ONE_WORKSPACE = {
  success: true,
  workspaces: [{ path: '/ws/alpha', name: 'Alpha' }]
}

const TWO_WORKSPACES = {
  success: true,
  workspaces: [
    { path: '/ws/alpha', name: 'Alpha' },
    { path: '/ws/beta', name: 'Beta' }
  ]
}

const EMPTY_WORKSPACES = { success: true, workspaces: [] }

const BETA_ONLY = {
  success: true,
  workspaces: [{ path: '/ws/beta', name: 'Beta' }]
}

let mockInvoke
let mockOn

function setupDOM(invokeImpl) {
  document.body.innerHTML = DOM_FIXTURE

  mockInvoke = jest.fn()
  mockOn = jest.fn()

  Object.defineProperty(window, 'electronAPI', {
    value: { invoke: mockInvoke, on: mockOn },
    writable: true,
    configurable: true,
  })

  Object.defineProperty(window, '_i18nReady', {
    value: Promise.resolve(),
    writable: true,
    configurable: true,
  })

  if (invokeImpl) {
    mockInvoke.mockImplementation(invokeImpl)
  } else {
    mockInvoke.mockImplementation((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(ONE_WORKSPACE)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
  }
}

async function loadModule() {
  jest.resetModules()
  require('../../src/renderer/scripts/commandQueueRenderer.js')
  // The source uses window.addEventListener('DOMContentLoaded', ...) so dispatch on window
  window.dispatchEvent(new Event('DOMContentLoaded'))
  // Flush promises for _i18nReady and loadWorkspaces
  await flushPromises()
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
  document.body.innerHTML = ''
})

// ─── TC-01: Initial State — _persistedCwd is null on First Tab Load ───────────

describe('TC-01: Initial State — no workspace selected after first load', () => {
  test('select.value is empty string (placeholder) on first loadCommandQueueTab()', async () => {
    setupDOM()
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    expect(select.value).toBe('')
  })

  test('workspace option for /ws/alpha exists in list', async () => {
    setupDOM()
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toContain('/ws/alpha')
  })

  test('workspace:list was invoked at least once', async () => {
    setupDOM()
    await loadModule()

    mockInvoke.mockClear()
    await window.loadCommandQueueTab()
    await flushPromises()

    const workspaceListCalls = mockInvoke.mock.calls.filter(c => c[0] === 'workspace:list')
    expect(workspaceListCalls.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── TC-02: Change Event — _persistedCwd Updated on Workspace Selection ───────

describe('TC-02: Change Event — _persistedCwd persists after tab reload', () => {
  test('after selecting /ws/alpha and firing change, next loadCommandQueueTab restores it', async () => {
    setupDOM()
    await loadModule()

    // First load
    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    // Select /ws/alpha
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Simulate tab switch (second load)
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('/ws/alpha')
  })
})

// ─── TC-03: Change Event — Selecting Placeholder Resets _persistedCwd to null ─

describe('TC-03: Change Event — selecting placeholder resets _persistedCwd', () => {
  test('select /ws/alpha then select placeholder — after reload, select.value is empty', async () => {
    setupDOM()
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')

    // Select workspace
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Select placeholder (empty value)
    select.value = ''
    select.dispatchEvent(new Event('change'))

    // Reload tab
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })

  test('empty string must not be stored as a valid persisted path', async () => {
    setupDOM()
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))
    select.value = ''
    select.dispatchEvent(new Event('change'))

    // After another reload, select should still be empty (null _persistedCwd)
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })
})

// ─── TC-04: Scenario — Select → Switch → Return → Selection Restored ──────────

describe('TC-04: Scenario — tab switch preserves workspace selection', () => {
  test('select /ws/beta, simulate tab switch, verify /ws/beta is restored', async () => {
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(TWO_WORKSPACES)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    // First tab entry
    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')

    // Select /ws/beta
    select.value = '/ws/beta'
    select.dispatchEvent(new Event('change'))

    // Simulate tab switch + return (second loadCommandQueueTab call)
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('/ws/beta')
  })

  test('workspace:list is called twice (once per loadCommandQueueTab)', async () => {
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(TWO_WORKSPACES)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    mockInvoke.mockClear()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/beta'
    select.dispatchEvent(new Event('change'))

    await window.loadCommandQueueTab()
    await flushPromises()

    const calls = mockInvoke.mock.calls.filter(c => c[0] === 'workspace:list')
    expect(calls.length).toBe(2)
  })
})

// ─── TC-05: Scenario — Select Workspace → Workspace Deleted → Return → Reset ──

describe('TC-05: Scenario — selected workspace deleted, placeholder shown on return', () => {
  test('select /ws/alpha, then workspace deleted, reload shows placeholder', async () => {
    let callCount = 0
    setupDOM((channel) => {
      if (channel === 'workspace:list') {
        callCount++
        if (callCount <= 1) return Promise.resolve(ONE_WORKSPACE)
        return Promise.resolve(EMPTY_WORKSPACES)
      }
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    // First load: workspace exists
    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Workspace deleted — second loadCommandQueueTab returns empty list
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })

  test('deleted workspace path must not appear in DOM after reload', async () => {
    let callCount = 0
    setupDOM((channel) => {
      if (channel === 'workspace:list') {
        callCount++
        if (callCount <= 1) return Promise.resolve(ONE_WORKSPACE)
        return Promise.resolve(EMPTY_WORKSPACES)
      }
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    await window.loadCommandQueueTab()
    await flushPromises()

    const optionValues = Array.from(select.options).map(o => o.value)
    expect(optionValues).not.toContain('/ws/alpha')
  })
})

// ─── TC-06: Scenario — No Prior Selection → Tab Switch → Return → Placeholder ─

describe('TC-06: Scenario — no prior selection, placeholder shown throughout', () => {
  test('no workspace selected, tab switch and return shows placeholder both times', async () => {
    setupDOM()
    await loadModule()

    // First tab entry — no selection
    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    expect(select.value).toBe('')

    // Second tab entry — no selection was made
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })

  test('workspace:list is called twice total across two loadCommandQueueTab calls', async () => {
    setupDOM()
    await loadModule()

    mockInvoke.mockClear()

    await window.loadCommandQueueTab()
    await flushPromises()
    await window.loadCommandQueueTab()
    await flushPromises()

    const calls = mockInvoke.mock.calls.filter(c => c[0] === 'workspace:list')
    expect(calls.length).toBe(2)
  })
})

// ─── TC-07: Edge Case — Empty Workspace List with Prior _persistedCwd Set ─────

describe('TC-07: Edge Case — empty workspace list clears _persistedCwd', () => {
  test('after empty list, select.value is placeholder', async () => {
    let listResponse = ONE_WORKSPACE
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(listResponse)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Workspace list goes empty
    listResponse = EMPTY_WORKSPACES
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })

  test('after workspace re-added, _persistedCwd already null, no auto-restore', async () => {
    let listResponse = ONE_WORKSPACE
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(listResponse)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Workspace goes missing — clears _persistedCwd to null
    listResponse = EMPTY_WORKSPACES
    await window.loadCommandQueueTab()
    await flushPromises()

    // Workspace re-added
    listResponse = ONE_WORKSPACE
    await window.loadCommandQueueTab()
    await flushPromises()

    // _persistedCwd was cleared, no auto-restore expected
    expect(select.value).toBe('')
  })
})

// ─── TC-08: Edge Case — Workspace Re-added After Deletion ─────────────────────

describe('TC-08: Edge Case — manual re-selection after deletion persists correctly', () => {
  test('after null-reset cycle, user manually re-selects and it persists on next load', async () => {
    let listResponse = ONE_WORKSPACE
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(listResponse)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    // TC-07 steps: load, select, delete, verify cleared
    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    listResponse = EMPTY_WORKSPACES
    await window.loadCommandQueueTab()
    await flushPromises()

    // Re-add workspace
    listResponse = ONE_WORKSPACE
    await window.loadCommandQueueTab()
    await flushPromises()

    // User manually re-selects
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // Tab switch
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('/ws/alpha')
  })
})

// ─── TC-09: Edge Case — Rapid Consecutive Tab Switches ────────────────────────

describe('TC-09: Edge Case — rapid consecutive tab switches maintain selection', () => {
  test('5 rapid loadCommandQueueTab calls all restore /ws/beta', async () => {
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(TWO_WORKSPACES)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/beta'
    select.dispatchEvent(new Event('change'))

    for (let i = 0; i < 5; i++) {
      await window.loadCommandQueueTab()
      await flushPromises()
      expect(select.value).toBe('/ws/beta')
    }
  })

  test('workspace:list called exactly 5 times across 5 rapid tab switches', async () => {
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(TWO_WORKSPACES)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/beta'
    select.dispatchEvent(new Event('change'))

    mockInvoke.mockClear()

    for (let i = 0; i < 5; i++) {
      await window.loadCommandQueueTab()
      await flushPromises()
    }

    const calls = mockInvoke.mock.calls.filter(c => c[0] === 'workspace:list')
    expect(calls.length).toBe(5)
  })
})

// ─── TC-10: Edge Case — IPC workspace:list Failure During Tab Re-entry ────────

describe('TC-10: Edge Case — IPC failure does not clear _persistedCwd', () => {
  test('no uncaught exception on IPC failure during reload', async () => {
    let shouldFail = false
    setupDOM((channel) => {
      if (channel === 'workspace:list') {
        if (shouldFail) return Promise.reject(new Error('IPC_ERROR'))
        return Promise.resolve(ONE_WORKSPACE)
      }
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // IPC fails during tab re-entry
    shouldFail = true
    await expect(window.loadCommandQueueTab()).resolves.not.toThrow()
    await flushPromises()
  })

  test('_persistedCwd not cleared during IPC failure; restored on next success', async () => {
    let shouldFail = false
    setupDOM((channel) => {
      if (channel === 'workspace:list') {
        if (shouldFail) return Promise.reject(new Error('IPC_ERROR'))
        return Promise.resolve(ONE_WORKSPACE)
      }
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // IPC fails
    shouldFail = true
    await window.loadCommandQueueTab()
    await flushPromises()

    // IPC succeeds again
    shouldFail = false
    await window.loadCommandQueueTab()
    await flushPromises()

    // _persistedCwd was not cleared, so /ws/alpha is restored
    expect(select.value).toBe('/ws/alpha')
  })
})

// ─── TC-11: Unit — loadWorkspaces() Checks Option Existence Before Restoring ──

describe('TC-11: Unit — loadWorkspaces checks option existence before restoring', () => {
  test('persisted /ws/alpha not in new list (beta only); placeholder shown, beta not auto-selected', async () => {
    let listResponse = TWO_WORKSPACES
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(listResponse)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    // New list only has /ws/beta
    listResponse = BETA_ONLY
    await window.loadCommandQueueTab()
    await flushPromises()

    expect(select.value).toBe('')
  })

  test('/ws/beta present in list but not auto-selected when persisted path differs', async () => {
    let listResponse = TWO_WORKSPACES
    setupDOM((channel) => {
      if (channel === 'workspace:list') return Promise.resolve(listResponse)
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
    await loadModule()

    await window.loadCommandQueueTab()
    await flushPromises()

    const select = document.getElementById('cq-cwd-select')
    select.value = '/ws/alpha'
    select.dispatchEvent(new Event('change'))

    listResponse = BETA_ONLY
    await window.loadCommandQueueTab()
    await flushPromises()

    const optionValues = Array.from(select.options).map(o => o.value)
    expect(optionValues).toContain('/ws/beta')
    expect(select.value).not.toBe('/ws/beta')
  })
})
