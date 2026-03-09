/**
 * TDD Tests for REQ-002: Hosting Control Button
 * Source: SDD-0002, Test Design-0002
 * @jest-environment jsdom
 */

import { createHostingButton, updateHostingButton, setHostingButtonPending } from '../../src/renderer/scripts/hostingButton'

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockInvoke = jest.fn()
const mockOn = jest.fn()

beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: { invoke: mockInvoke, on: mockOn },
    writable: true,
    configurable: true,
  })
  mockInvoke.mockResolvedValue({ success: true, url: 'http://localhost:3000', port: 3000 })
})

afterEach(() => {
  jest.clearAllMocks()
  document.body.innerHTML = ''
})

// ─── DOM fixture helper ───────────────────────────────────────────────────────

function appendHostingButton(workspacePath: string): HTMLElement {
  const wrapper = createHostingButton(workspacePath)
  document.body.appendChild(wrapper)
  return wrapper
}

// ─── UNIT TESTS ───────────────────────────────────────────────────────────────

describe('TC-U-01: createHostingButton — 올바른 DOM 구조 생성', () => {
  test('반환값이 HTMLElement(div)이고 hosting-btn-wrapper 클래스를 포함하며 내부에 button.hosting-btn이 존재한다', () => {
    const wrapper = createHostingButton('/Users/test/my-workspace')
    expect(wrapper).toBeInstanceOf(HTMLElement)
    expect(wrapper.className).toContain('hosting-btn-wrapper')
    expect(wrapper.dataset.workspacePath).toBe('/Users/test/my-workspace')
    const btn = wrapper.querySelector('button.hosting-btn')
    expect(btn).not.toBeNull()
  })
})

describe('TC-U-02: createHostingButton — 초기 상태가 Stopped (Start 버튼)', () => {
  test('초기 textContent가 Start이고 hosting-btn-stopped 클래스를 포함하며 disabled가 false이다', () => {
    const wrapper = createHostingButton('/Users/test/my-workspace')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toBe('Start')
    expect(btn.className).toContain('hosting-btn-stopped')
    expect(btn.disabled).toBe(false)
  })
})

describe('TC-U-03: createHostingButton — aria-label에 workspacePath 포함', () => {
  test('aria-label이 workspacePath를 포함하고 Start 동작을 설명한다', () => {
    const wrapper = createHostingButton('/Users/test/my-workspace')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    const ariaLabel = btn.getAttribute('aria-label') ?? ''
    expect(ariaLabel).toContain('/Users/test/my-workspace')
    expect(ariaLabel.toLowerCase()).toContain('start')
  })
})

describe('TC-U-04: updateHostingButton — running=true 시 Stop 상태로 전환', () => {
  test('textContent가 Stop이고 hosting-btn-running 포함, hosting-btn-stopped 미포함, aria-label에 Stop 포함', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    updateHostingButton(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
    expect(btn.className).not.toContain('hosting-btn-stopped')
    const ariaLabel = btn.getAttribute('aria-label') ?? ''
    expect(ariaLabel.toLowerCase()).toContain('stop')
  })
})

describe('TC-U-05: updateHostingButton — running=false 시 Start 상태로 전환', () => {
  test('textContent가 Start이고 hosting-btn-stopped 포함, hosting-btn-running 미포함, aria-label에 Start 포함', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    updateHostingButton(wrapper, true)
    updateHostingButton(wrapper, false)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toBe('Start')
    expect(btn.className).toContain('hosting-btn-stopped')
    expect(btn.className).not.toContain('hosting-btn-running')
    const ariaLabel = btn.getAttribute('aria-label') ?? ''
    expect(ariaLabel.toLowerCase()).toContain('start')
  })
})

describe('TC-U-06: setHostingButtonPending — isPending=true 시 disabled + "..." 표시', () => {
  test('disabled가 true이고 textContent가 ...이며 hosting-btn-pending 클래스가 포함된다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    setHostingButtonPending(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toBe('...')
    expect(btn.className).toContain('hosting-btn-pending')
  })
})

describe('TC-U-07: setHostingButtonPending — isPending=false 시 disabled만 해제 (SDD-0001)', () => {
  test('disabled가 false이고 hosting-btn-pending 클래스가 미포함된다 (상태 복원은 호출자 책임)', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    setHostingButtonPending(wrapper, true)
    // Caller (click handler) sets state before calling setHostingButtonPending(false)
    updateHostingButton(wrapper, false) // simulate: click handler sets final state
    setHostingButtonPending(wrapper, false)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).not.toBe('...')
    expect(btn.className).not.toContain('hosting-btn-pending')
  })
})

describe('TC-U-08: setHostingButtonPending — Running 상태에서 pending 해제 시 Stop 상태 유지 (SDD-0001)', () => {
  test('호출자가 updateHostingButton(true) 후 setHostingButtonPending(false) 시 Stop 상태 유지', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    updateHostingButton(wrapper, true)
    setHostingButtonPending(wrapper, true)
    // Caller explicitly sets state (new contract per SDD-0001)
    updateHostingButton(wrapper, true)
    setHostingButtonPending(wrapper, false)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
  })
})

// ─── INTEGRATION TESTS ───────────────────────────────────────────────────────

describe('TC-I-01: Start 버튼 클릭 → wiki-host:start IPC invoke 호출', () => {
  test('invoke가 wiki-host:start 채널과 workspacePath 인자로 호출된다', async () => {
    const wrapper = appendHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(mockInvoke).toHaveBeenCalledWith('wiki-host:start', { workspacePath: '/Users/test/ws' })
  })
})

describe('TC-I-02: Stop 버튼 클릭 → wiki-host:stop IPC invoke 호출', () => {
  test('invoke가 wiki-host:stop 채널로 호출된다', async () => {
    mockInvoke.mockResolvedValue({ success: true })
    const wrapper = appendHostingButton('/Users/test/ws')
    updateHostingButton(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(mockInvoke).toHaveBeenCalledWith('wiki-host:stop')
  })
})

describe('TC-I-03: 버튼 클릭 중 pending 상태에서 중복 클릭 무시', () => {
  test('invoke가 정확히 1회만 호출된다', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve }))
    const wrapper = appendHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    // At this point, button should be disabled (pending)
    btn.click()
    btn.click()
    resolveInvoke({ success: true })
    await Promise.resolve()
    await Promise.resolve()
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})

describe('TC-I-04: Start invoke 성공 후 버튼 상태 업데이트', () => {
  test('invoke 완료 후 disabled가 false이고 pending 상태가 해제된다', async () => {
    mockInvoke.mockResolvedValue({ success: true, url: 'http://localhost:3000', port: 3000 })
    const wrapper = appendHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).not.toBe('...')
  })
})

describe('TC-I-05: Start invoke 실패 시 오류 처리 후 Stopped 상태 유지', () => {
  test('invoke 실패 후 disabled가 false이고 Start 상태를 유지한다', async () => {
    mockInvoke.mockResolvedValue({ success: false, error: 'VIEWS_DIR_NOT_FOUND' })
    const wrapper = appendHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('Start')
    expect(btn.className).toContain('hosting-btn-stopped')
  })
})

describe('TC-I-06: Stop invoke 실패 시 오류 처리 후 Running 상태 유지', () => {
  test('invoke 실패 후 disabled가 false이고 Stop 상태를 유지한다', async () => {
    mockInvoke.mockResolvedValue({ success: false, error: 'STOP_FAILED' })
    const wrapper = appendHostingButton('/Users/test/ws')
    updateHostingButton(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
  })
})

// ─── ACCESSIBILITY TESTS ──────────────────────────────────────────────────────

describe('TC-A-01: aria-label이 workspacePath를 포함한 의미있는 문자열', () => {
  test('aria-label이 비어있지 않고 workspacePath와 동작을 포함한다', () => {
    const wrapper = createHostingButton('/Users/test/my-workspace')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    const ariaLabel = btn.getAttribute('aria-label') ?? ''
    expect(ariaLabel).not.toBe('')
    expect(ariaLabel).toContain('/Users/test/my-workspace')
    expect(ariaLabel.toLowerCase()).toMatch(/start|stop/)
  })
})

describe('TC-A-02: tabindex="0" 설정으로 키보드 포커스 가능', () => {
  test('button의 tabindex가 0이다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.getAttribute('tabindex')).toBe('0')
  })
})

describe('TC-A-03: pending 상태에서 aria-disabled="true" 설정', () => {
  test('setHostingButtonPending(true) 후 aria-disabled가 true이다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    setHostingButtonPending(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('TC-A-04: 버튼 상태 전환 시 aria-label이 동작을 반영하여 갱신', () => {
  test('Running 전환 후 aria-label에 Stop, Stopped 전환 후 Start가 포함된다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    updateHostingButton(wrapper, true)
    expect((btn.getAttribute('aria-label') ?? '').toLowerCase()).toContain('stop')
    updateHostingButton(wrapper, false)
    expect((btn.getAttribute('aria-label') ?? '').toLowerCase()).toContain('start')
  })
})

describe('TC-A-05: pending 해제 시 aria-disabled 속성 제거 또는 false로 설정', () => {
  test('setHostingButtonPending(false) 후 aria-disabled가 true가 아니다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    setHostingButtonPending(wrapper, true)
    setHostingButtonPending(wrapper, false)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.getAttribute('aria-disabled')).not.toBe('true')
  })
})

// ─── REGRESSION TESTS ────────────────────────────────────────────────────────

describe('TC-R-01: 버튼 클릭 시 e.stopPropagation()으로 ws-item 선택 이벤트 차단', () => {
  test('부모 div의 클릭 핸들러가 호출되지 않는다', async () => {
    const parentDiv = document.createElement('div')
    parentDiv.className = 'ws-item'
    const parentClickMock = jest.fn()
    parentDiv.addEventListener('click', parentClickMock)
    const wrapper = createHostingButton('/Users/test/ws')
    parentDiv.appendChild(wrapper)
    document.body.appendChild(parentDiv)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    expect(parentClickMock).not.toHaveBeenCalled()
    expect(mockInvoke).toHaveBeenCalled()
  })
})

describe('TC-R-02: 빠른 연속 클릭 시 중복 invoke 발생 안 함', () => {
  test('세 번 빠르게 클릭해도 invoke가 1회만 호출된다', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve }))
    const wrapper = appendHostingButton('/Users/test/ws')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    btn.click()
    btn.click()
    resolveInvoke({ success: true })
    await Promise.resolve()
    await Promise.resolve()
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})

describe('TC-R-03: 여러 버튼 인스턴스를 독립적으로 updateHostingButton 적용해도 상호 영향 없음', () => {
  test('wrapperA를 Running으로 전환해도 wrapperB는 Stopped 유지, 그 반대도 성립', () => {
    const wrapperA = createHostingButton('/Users/ws-a')
    const wrapperB = createHostingButton('/Users/ws-b')
    updateHostingButton(wrapperA, true)
    const btnB = wrapperB.querySelector('button') as HTMLButtonElement
    expect(btnB.textContent).toBe('Start')
    expect(btnB.className).toContain('hosting-btn-stopped')
    updateHostingButton(wrapperB, false)
    const btnA = wrapperA.querySelector('button') as HTMLButtonElement
    expect(btnA.textContent).toBe('Stop')
    expect(btnA.className).toContain('hosting-btn-running')
  })
})

describe('TC-R-04: workspacePath가 빈 문자열일 때 버튼 생성 오류 미발생', () => {
  test('예외가 발생하지 않고 dataset.workspacePath가 빈 문자열이다', () => {
    expect(() => {
      const wrapper = createHostingButton('')
      expect(wrapper).toBeInstanceOf(HTMLElement)
      expect(wrapper.dataset.workspacePath).toBe('')
    }).not.toThrow()
  })
})

describe('TC-R-05: setHostingButtonPending을 연속으로 true → true 호출해도 안정적 동작', () => {
  test('두 번 연속 true 호출 후 disabled가 true이고 textContent가 ...이다', () => {
    const wrapper = createHostingButton('/Users/test/ws')
    setHostingButtonPending(wrapper, true)
    setHostingButtonPending(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toBe('...')
  })
})
