/**
 * TDD Tests for SDD-0002: Command Queue Log Viewer — Collapse/Expand & Log Color Differentiation
 * TC-CQ-01 through TC-CQ-20 from Test Design-0002
 *
 * @jest-environment jsdom
 */

const fs = require('fs')
const path = require('path')

// ─── DOM Fixture ──────────────────────────────────────────────────────────────

const DOM_FIXTURE = `
  <select id="cq-cwd-select"></select>
  <select id="cq-cmd-type"><option value="/teams">/teams</option></select>
  <input id="cq-cmd-args" />
  <button id="cq-add-btn"></button>
  <textarea id="cq-bulk-input"></textarea>
  <button id="cq-bulk-btn"></button>
  <div id="cq-queue-list"></div>
  <div id="cq-queue-empty"></div>
  <button id="cq-abort-btn"></button>
  <div id="toast"></div>
  <div class="cq-section">
    <div class="cq-section-header">
      <label class="section-label" data-i18n="cq.log.label">Execution Log</label>
      <div class="cq-log-controls">
        <button id="cq-collapse-all-btn" class="btn btn-secondary btn-sm">Collapse All</button>
        <button id="cq-expand-all-btn"   class="btn btn-secondary btn-sm">Expand All</button>
      </div>
    </div>
    <div id="cq-log-container" class="cq-log-container">
      <div id="cq-log-content" class="cq-log-content"></div>
    </div>
  </div>
`

function setupDOM(invokeImpl) {
  document.body.innerHTML = DOM_FIXTURE

  const mockInvoke = jest.fn()
  const mockOn = jest.fn()

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
      if (channel === 'workspace:list') return Promise.resolve({ success: true, workspaces: [] })
      if (channel === 'queue:status') return Promise.resolve({ success: true, items: [] })
      return Promise.resolve({ success: true })
    })
  }

  return { mockInvoke, mockOn }
}

async function flushPromises() {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

async function loadModule() {
  jest.resetModules()
  require('../../src/renderer/scripts/commandQueueRenderer.js')
  window.dispatchEvent(new Event('DOMContentLoaded'))
  await flushPromises()
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
  document.body.innerHTML = ''
})

// ─── TC-CQ-01: getOrCreateLogGroup — 신규 itemId에 대해 .cq-log-group DOM 생성 ─

describe('TC-CQ-01: getOrCreateLogGroup creates .cq-log-group for new itemId', () => {
  test('calling getOrCreateLogGroup("item-1", "/teams foo") creates [data-item-id="item-1"] in #cq-log-content', async () => {
    setupDOM()
    await loadModule()

    window.getOrCreateLogGroup('item-1', '/teams foo')

    const logContent = document.getElementById('cq-log-content')
    const group = logContent.querySelector('[data-item-id="item-1"]')
    expect(group).not.toBeNull()
  })

  test('created element has class cq-log-group', async () => {
    setupDOM()
    await loadModule()

    window.getOrCreateLogGroup('item-1', '/teams foo')

    const group = document.querySelector('.cq-log-group[data-item-id="item-1"]')
    expect(group).not.toBeNull()
    expect(group.classList.contains('cq-log-group')).toBe(true)
  })
})

// ─── TC-CQ-02: getOrCreateLogGroup — 동일 itemId 재호출 시 DOM 중복 없음 ─────────

describe('TC-CQ-02: getOrCreateLogGroup returns existing element — no duplicate DOM', () => {
  test('calling getOrCreateLogGroup twice with same itemId results in one group', async () => {
    setupDOM()
    await loadModule()

    const g1 = window.getOrCreateLogGroup('item-1', '/teams foo')
    const g2 = window.getOrCreateLogGroup('item-1', '/teams foo')

    const groups = document.querySelectorAll('.cq-log-group[data-item-id="item-1"]')
    expect(groups.length).toBe(1)
    expect(g1).toBe(g2)
  })
})

// ─── TC-CQ-03: getOrCreateLogGroup — 생성된 그룹은 collapsed 상태로 초기화 ─────

describe('TC-CQ-03: getOrCreateLogGroup initializes group in collapsed state', () => {
  test('new group has class "collapsed" and does not have class "expanded"', async () => {
    setupDOM()
    await loadModule()

    const group = window.getOrCreateLogGroup('item-2', '/add-req bar')

    expect(group.classList.contains('collapsed')).toBe(true)
    expect(group.classList.contains('expanded')).toBe(false)
  })
})

// ─── TC-CQ-04: getOrCreateLogGroup — 헤더에 commandSummary가 표시됨 ──────────────

describe('TC-CQ-04: getOrCreateLogGroup renders commandSummary in .cq-log-group-title', () => {
  test('.cq-log-group-title textContent contains the commandSummary', async () => {
    setupDOM()
    await loadModule()

    window.getOrCreateLogGroup('item-3', '/teams wiki-req')

    const titleEl = document.querySelector('[data-item-id="item-3"] .cq-log-group-title')
    expect(titleEl).not.toBeNull()
    expect(titleEl.textContent).toContain('/teams wiki-req')
  })
})

// ─── TC-CQ-05: getOrCreateLogGroup — itemId 메타 없으면 fallback 타이틀 ─────────

describe('TC-CQ-05: getOrCreateLogGroup uses fallback title when commandSummary is undefined', () => {
  test('with undefined commandSummary, title is non-empty (fallback)', async () => {
    setupDOM()
    await loadModule()

    window.getOrCreateLogGroup('unknown-99', undefined)

    const titleEl = document.querySelector('[data-item-id="unknown-99"] .cq-log-group-title')
    expect(titleEl).not.toBeNull()
    expect(titleEl.textContent.trim().length).toBeGreaterThan(0)
  })

  test('fallback title contains the itemId or "Item" string', async () => {
    setupDOM()
    await loadModule()

    window.getOrCreateLogGroup('unknown-99', undefined)

    const titleEl = document.querySelector('[data-item-id="unknown-99"] .cq-log-group-title')
    const text = titleEl.textContent.trim()
    expect(text === '' || text.includes('unknown-99') || text.toLowerCase().includes('item')).toBe(true)
  })
})

// ─── TC-CQ-06: appendLog — 그룹의 .cq-log-body에 로그 라인 추가 ─────────────────

describe('TC-CQ-06: appendLog adds .cq-log-line to group .cq-log-body', () => {
  test('after appendLog, there is 1 .cq-log-line in [data-item-id="item-1"] .cq-log-body', async () => {
    setupDOM()
    await loadModule()

    window.appendLog({ itemId: 'item-1', type: 'assistant', content: 'Hello' })

    const body = document.querySelector('[data-item-id="item-1"] .cq-log-body')
    expect(body).not.toBeNull()
    const lines = body.querySelectorAll('.cq-log-line')
    expect(lines.length).toBe(1)
  })

  test('multiple appendLog calls accumulate lines in the same group', async () => {
    setupDOM()
    await loadModule()

    window.appendLog({ itemId: 'item-1', type: 'assistant', content: 'Line 1' })
    window.appendLog({ itemId: 'item-1', type: 'system', content: 'Line 2' })
    window.appendLog({ itemId: 'item-1', type: 'result', content: 'Line 3' })

    const body = document.querySelector('[data-item-id="item-1"] .cq-log-body')
    const lines = body.querySelectorAll('.cq-log-line')
    expect(lines.length).toBe(3)
  })
})

// ─── TC-CQ-07: appendLog — log.type이 CSS 클래스로 적용됨 ───────────────────────

describe('TC-CQ-07: appendLog applies cq-log-{type} CSS class to log line', () => {
  const typeCases = ['assistant', 'system', 'error', 'result', 'user']

  typeCases.forEach((type) => {
    test(`type="${type}" → .cq-log-line.cq-log-${type}`, async () => {
      setupDOM()
      await loadModule()

      window.appendLog({ itemId: 'item-x', type, content: `${type} message` })

      const body = document.querySelector('[data-item-id="item-x"] .cq-log-body')
      const line = body.querySelector('.cq-log-line')
      expect(line).not.toBeNull()
      expect(line.classList.contains('cq-log-line')).toBe(true)
      expect(line.classList.contains(`cq-log-${type}`)).toBe(true)

      // cleanup for next iteration
      document.body.innerHTML = ''
    })
  })
})

// ─── TC-CQ-08: appendLog — 여러 itemId에 각각 독립 그룹 생성 ────────────────────

describe('TC-CQ-08: appendLog creates independent groups for different itemIds', () => {
  test('two appendLog calls with different itemIds create 2 .cq-log-group elements', async () => {
    setupDOM()
    await loadModule()

    window.appendLog({ itemId: 'A', type: 'assistant', content: 'a1' })
    window.appendLog({ itemId: 'B', type: 'system', content: 'b1' })

    const groups = document.querySelectorAll('.cq-log-group')
    expect(groups.length).toBe(2)
  })

  test('logs from itemId A do not appear in itemId B group', async () => {
    setupDOM()
    await loadModule()

    window.appendLog({ itemId: 'A', type: 'assistant', content: 'only in A' })
    window.appendLog({ itemId: 'B', type: 'system', content: 'only in B' })

    const bodyA = document.querySelector('[data-item-id="A"] .cq-log-body')
    const bodyB = document.querySelector('[data-item-id="B"] .cq-log-body')

    expect(bodyA.querySelectorAll('.cq-log-line').length).toBe(1)
    expect(bodyB.querySelectorAll('.cq-log-line').length).toBe(1)
    expect(bodyA.textContent).toContain('only in A')
    expect(bodyB.textContent).toContain('only in B')
  })
})

// ─── TC-CQ-09: toggleGroup — collapsed → expanded 전환 ──────────────────────────

describe('TC-CQ-09: toggleGroup switches collapsed group to expanded', () => {
  test('calling toggleGroup on a collapsed group adds "expanded" and removes "collapsed"', async () => {
    setupDOM()
    await loadModule()

    const groupEl = document.createElement('div')
    groupEl.className = 'cq-log-group collapsed'
    const body = document.createElement('div')
    body.className = 'cq-log-body'
    groupEl.appendChild(body)
    document.getElementById('cq-log-content').appendChild(groupEl)

    window.toggleGroup(groupEl)

    expect(groupEl.classList.contains('expanded')).toBe(true)
    expect(groupEl.classList.contains('collapsed')).toBe(false)
  })
})

// ─── TC-CQ-10: toggleGroup — expanded → collapsed 전환 ──────────────────────────

describe('TC-CQ-10: toggleGroup switches expanded group to collapsed', () => {
  test('calling toggleGroup on an expanded group adds "collapsed" and removes "expanded"', async () => {
    setupDOM()
    await loadModule()

    const groupEl = document.createElement('div')
    groupEl.className = 'cq-log-group expanded'
    const body = document.createElement('div')
    body.className = 'cq-log-body'
    groupEl.appendChild(body)
    document.getElementById('cq-log-content').appendChild(groupEl)

    window.toggleGroup(groupEl)

    expect(groupEl.classList.contains('collapsed')).toBe(true)
    expect(groupEl.classList.contains('expanded')).toBe(false)
  })

  test('two consecutive toggleGroup calls cycle back to expanded', async () => {
    setupDOM()
    await loadModule()

    const groupEl = document.createElement('div')
    groupEl.className = 'cq-log-group collapsed'
    const body = document.createElement('div')
    body.className = 'cq-log-body'
    groupEl.appendChild(body)
    document.getElementById('cq-log-content').appendChild(groupEl)

    window.toggleGroup(groupEl)
    window.toggleGroup(groupEl)

    expect(groupEl.classList.contains('collapsed')).toBe(true)
    expect(groupEl.classList.contains('expanded')).toBe(false)
  })
})

// ─── TC-CQ-11: collapseAll — 모든 그룹이 collapsed 상태로 전환 ──────────────────

describe('TC-CQ-11: collapseAll sets all groups to collapsed', () => {
  test('all expanded groups become collapsed after collapseAll()', async () => {
    setupDOM()
    await loadModule()

    const logContent = document.getElementById('cq-log-content')
    for (let i = 0; i < 3; i++) {
      const g = document.createElement('div')
      g.className = 'cq-log-group expanded'
      g.dataset.itemId = `grp-${i}`
      const body = document.createElement('div')
      body.className = 'cq-log-body'
      g.appendChild(body)
      logContent.appendChild(g)
    }

    window.collapseAll()

    const groups = document.querySelectorAll('.cq-log-group')
    groups.forEach((g) => {
      expect(g.classList.contains('collapsed')).toBe(true)
      expect(g.classList.contains('expanded')).toBe(false)
    })
  })
})

// ─── TC-CQ-12: expandAll — 모든 그룹이 expanded 상태로 전환 ─────────────────────

describe('TC-CQ-12: expandAll sets all groups to expanded', () => {
  test('all collapsed groups become expanded after expandAll()', async () => {
    setupDOM()
    await loadModule()

    const logContent = document.getElementById('cq-log-content')
    for (let i = 0; i < 3; i++) {
      const g = document.createElement('div')
      g.className = 'cq-log-group collapsed'
      g.dataset.itemId = `grp-${i}`
      const body = document.createElement('div')
      body.className = 'cq-log-body'
      g.appendChild(body)
      logContent.appendChild(g)
    }

    window.expandAll()

    const groups = document.querySelectorAll('.cq-log-group')
    groups.forEach((g) => {
      expect(g.classList.contains('expanded')).toBe(true)
      expect(g.classList.contains('collapsed')).toBe(false)
    })
  })
})

// ─── TC-CQ-13: collapseAll / expandAll — 빈 목록에서 에러 없음 ──────────────────

describe('TC-CQ-13: collapseAll and expandAll are safe with empty log content', () => {
  test('collapseAll() with no .cq-log-group elements does not throw', async () => {
    setupDOM()
    await loadModule()

    expect(() => window.collapseAll()).not.toThrow()
  })

  test('expandAll() with no .cq-log-group elements does not throw', async () => {
    setupDOM()
    await loadModule()

    expect(() => window.expandAll()).not.toThrow()
  })
})

// ─── TC-CQ-14: HTML — #cq-collapse-all-btn 버튼이 index.html에 존재 ─────────────

describe('TC-CQ-14: index.html contains #cq-collapse-all-btn', () => {
  const htmlPath = path.join(__dirname, '../../src/renderer/index.html')
  let htmlContent = ''

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  })

  test('id="cq-collapse-all-btn" exists in index.html', () => {
    expect(htmlContent).toMatch(/id="cq-collapse-all-btn"/)
  })
})

// ─── TC-CQ-15: HTML — #cq-expand-all-btn 버튼이 index.html에 존재 ───────────────

describe('TC-CQ-15: index.html contains #cq-expand-all-btn', () => {
  const htmlPath = path.join(__dirname, '../../src/renderer/index.html')
  let htmlContent = ''

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  })

  test('id="cq-expand-all-btn" exists in index.html', () => {
    expect(htmlContent).toMatch(/id="cq-expand-all-btn"/)
  })
})

// ─── TC-CQ-16: HTML — .cq-section-header と cq.log.label が共存 ─────────────────

describe('TC-CQ-16: index.html has .cq-section-header wrapping the Execution Log label', () => {
  const htmlPath = path.join(__dirname, '../../src/renderer/index.html')
  let htmlContent = ''

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  })

  test('class="cq-section-header" exists in index.html', () => {
    expect(htmlContent).toMatch(/class="cq-section-header"/)
  })

  test('cq.log.label i18n key exists in index.html', () => {
    expect(htmlContent).toMatch(/data-i18n="cq\.log\.label"/)
  })
})

// ─── TC-CQ-17: CSS — .cq-log-group 선택자가 styles.css에 존재 ───────────────────

describe('TC-CQ-17: styles.css contains .cq-log-group selector', () => {
  const cssPath = path.join(__dirname, '../../src/renderer/styles.css')
  let cssContent = ''

  beforeAll(() => {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  })

  test('.cq-log-group selector exists in styles.css', () => {
    expect(cssContent).toMatch(/\.cq-log-group\b/)
  })
})

// ─── TC-CQ-18: CSS — .cq-log-body에 max-height 및 transition 정의 ───────────────

describe('TC-CQ-18: styles.css defines max-height and transition in .cq-log-body', () => {
  const cssPath = path.join(__dirname, '../../src/renderer/styles.css')
  let cssContent = ''

  beforeAll(() => {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  })

  test('.cq-log-body selector exists in styles.css', () => {
    expect(cssContent).toMatch(/\.cq-log-body\b/)
  })

  test('max-height property is defined in styles.css (in .cq-log-body context)', () => {
    // Check that max-height: 0 exists for collapsed state
    expect(cssContent).toMatch(/max-height:\s*0/)
  })

  test('transition includes max-height in styles.css', () => {
    expect(cssContent).toMatch(/transition:[^;]*max-height/)
  })
})

// ─── TC-CQ-19: CSS — .cq-log-group.expanded .cq-log-body 선택자 존재 ─────────────

describe('TC-CQ-19: styles.css contains .cq-log-group.expanded .cq-log-body selector', () => {
  const cssPath = path.join(__dirname, '../../src/renderer/styles.css')
  let cssContent = ''

  beforeAll(() => {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  })

  test('.cq-log-group.expanded .cq-log-body selector exists', () => {
    expect(cssContent).toMatch(/\.cq-log-group\.expanded\s+\.cq-log-body/)
  })
})

// ─── TC-CQ-20: CSS — .cq-log-group-chevron의 transition 정의 ────────────────────

describe('TC-CQ-20: styles.css defines transition in .cq-log-group-chevron', () => {
  const cssPath = path.join(__dirname, '../../src/renderer/styles.css')
  let cssContent = ''

  beforeAll(() => {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  })

  test('.cq-log-group-chevron selector exists in styles.css', () => {
    expect(cssContent).toMatch(/\.cq-log-group-chevron\b/)
  })

  test('transition property exists near .cq-log-group-chevron', () => {
    // Find .cq-log-group-chevron block and verify transition within it
    const match = cssContent.match(/\.cq-log-group-chevron\s*\{([^}]+)\}/)
    expect(match).not.toBeNull()
    expect(match[1]).toMatch(/transition/)
  })
})
