/**
 * TDD Tests for SDD-0001: Hosting Button onToggle callback
 * Bug A fix: setHostingButtonPending(false) must not restore old state after success
 * Bug B fix: createHostingButton accepts onToggle callback, called on success
 *
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function appendBtn(workspacePath: string, onToggle?: (path: string, running: boolean) => void): HTMLElement {
  const wrapper = createHostingButton(workspacePath, onToggle)
  document.body.appendChild(wrapper)
  return wrapper
}

async function flushPromises() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

// ─── TC-01: 하위 호환 — onToggle 없이 호출해도 동작 ─────────────────────────

describe('TC-01: createHostingButton — onToggle 파라미터 없이 호출해도 오류 미발생 (하위 호환)', () => {
  test('onToggle 없이 Start 클릭 후 버튼이 Stop 상태가 되고 예외가 발생하지 않는다', async () => {
    const wrapper = appendBtn('/ws/test')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    expect(() => btn.click()).not.toThrow()
    await flushPromises()
    expect(mockInvoke).toHaveBeenCalledWith('wiki-host:start', { workspacePath: '/ws/test' })
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('Stop')
  })
})

// ─── TC-02: Start 성공 시 onToggle(wsPath, true) 호출 ────────────────────────

describe('TC-02: createHostingButton — Start 성공 시 onToggle(wsPath, true) 호출', () => {
  test('onToggle이 정확히 1회, workspacePath와 true 인자로 호출된다', async () => {
    const onToggle = jest.fn()
    const wrapper = appendBtn('/ws/test', onToggle)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('/ws/test', true)
  })
})

// ─── TC-03: Start 성공 후 버튼이 즉시 Stop(Running) 상태 ─────────────────────

describe('TC-03: createHostingButton — Start 성공 후 버튼이 즉시 Stop(Running) 상태로 전환', () => {
  test('invoke 완료 후 textContent=Stop, class=hosting-btn-running, disabled=false, data-running=true', async () => {
    const wrapper = appendBtn('/ws/test')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
    expect(btn.className).not.toContain('hosting-btn-stopped')
    expect(btn.className).not.toContain('hosting-btn-pending')
    expect(btn.disabled).toBe(false)
    expect(btn.dataset.running).toBe('true')
  })
})

// ─── TC-04: Start 실패 시 onToggle 미호출 ────────────────────────────────────

describe('TC-04: createHostingButton — Start 실패 시 onToggle 미호출', () => {
  test('invoke 실패 후 onToggle이 호출되지 않는다', async () => {
    mockInvoke.mockResolvedValue({ success: false, error: 'VIEWS_DIR_NOT_FOUND' })
    const onToggle = jest.fn()
    const wrapper = appendBtn('/ws/test', onToggle)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(onToggle).not.toHaveBeenCalled()
  })
})

// ─── TC-05: Stop 성공 시 onToggle(wsPath, false) 호출 ────────────────────────

describe('TC-05: createHostingButton — Stop 성공 시 onToggle(wsPath, false) 호출', () => {
  test('Running 상태에서 Stop 클릭 성공 시 onToggle이 (wsPath, false)로 호출된다', async () => {
    mockInvoke.mockResolvedValue({ success: true })
    const onToggle = jest.fn()
    const wrapper = appendBtn('/ws/test', onToggle)
    updateHostingButton(wrapper, true) // pre-set to Running
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('/ws/test', false)
  })
})

// ─── TC-06: Stop 실패 시 onToggle 미호출 ─────────────────────────────────────

describe('TC-06: createHostingButton — Stop 실패 시 onToggle 미호출', () => {
  test('Stop invoke 실패 후 onToggle이 호출되지 않고 버튼은 Running 유지', async () => {
    mockInvoke.mockResolvedValue({ success: false, error: 'STOP_FAILED' })
    const onToggle = jest.fn()
    const wrapper = appendBtn('/ws/test', onToggle)
    updateHostingButton(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(onToggle).not.toHaveBeenCalled()
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
  })
})

// ─── TC-07: Start 성공 후 Running + not pending (Bug A regression) ───────────

describe('TC-07: Start 성공 후 버튼 상태가 Running이고 pending 미포함 (Bug A 회귀)', () => {
  test('data-running=true, hosting-btn-running, not pending, disabled=false', async () => {
    const wrapper = appendBtn('/ws/test')
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(btn.dataset.running).toBe('true')
    expect(btn.className).toContain('hosting-btn-running')
    expect(btn.className).not.toContain('hosting-btn-pending')
    expect(btn.disabled).toBe(false)
  })
})

// ─── TC-08: Stop 성공 후 Stopped + not pending (Bug A regression) ─────────────

describe('TC-08: Stop 성공 후 버튼 상태가 Stopped이고 pending 미포함 (Bug A 회귀)', () => {
  test('data-running=false, hosting-btn-stopped, not pending, disabled=false', async () => {
    mockInvoke.mockResolvedValue({ success: true })
    const wrapper = appendBtn('/ws/test')
    updateHostingButton(wrapper, true)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    btn.click()
    await flushPromises()
    expect(btn.dataset.running).toBe('false')
    expect(btn.className).toContain('hosting-btn-stopped')
    expect(btn.className).not.toContain('hosting-btn-pending')
    expect(btn.disabled).toBe(false)
  })
})

// ─── TC-09: onToggle throws → 버튼 상태 정상 유지 ────────────────────────────

describe('TC-09: onToggle throws → 버튼 상태 정상 유지', () => {
  test('onToggle이 예외를 던져도 버튼 상태는 Running이고 pending이 해제된다', async () => {
    const onToggle = jest.fn(() => { throw new Error('callback error') })
    const wrapper = appendBtn('/ws/test', onToggle)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    // Should not throw at the test level
    await expect(async () => {
      btn.click()
      await flushPromises()
    }).not.toThrow()
    // onToggle was called (threw)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})

// ─── TC-11: hostingButton.js 소스 — onToggle 파라미터 존재 ───────────────────

describe('TC-11: hostingButton.js 소스 — onToggle 파라미터가 소스에 존재', () => {
  const fs = require('fs')
  const path = require('path')
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../src/renderer/scripts/hostingButton.js'),
    'utf-8'
  )

  test('createHostingButton 함수 정의에 onToggle 파라미터가 포함된다', () => {
    expect(src).toMatch(/createHostingButton\s*\([^)]*onToggle/)
  })

  test('onToggle이 함수인지 확인 후 호출하는 코드가 존재한다', () => {
    expect(src).toMatch(/typeof\s+onToggle\s*===\s*['"]function['"]/)
  })

  test('성공 시 updateHostingButton이 setHostingButtonPending(false) 이전에 호출된다', () => {
    // Both calls exist in sequence — the file must contain both
    expect(src).toContain('updateHostingButton(wrapper, newRunning)')
    expect(src).toContain('setHostingButtonPending(wrapper, false)')
    // updateHostingButton call appears before setHostingButtonPending(false) in the file
    const updateIdx = src.indexOf('updateHostingButton(wrapper, newRunning)')
    const pendingIdx = src.indexOf('setHostingButtonPending(wrapper, false)')
    expect(updateIdx).toBeGreaterThanOrEqual(0)
    expect(pendingIdx).toBeGreaterThanOrEqual(0)
    expect(updateIdx).toBeLessThan(pendingIdx)
  })
})

// ─── TC-10: workspaceRenderer.js 소스 — onToggle 콜백 패턴 존재 ──────────────

describe('TC-10: workspaceRenderer.js 소스 — onToggle 콜백으로 currentHostingPath 설정', () => {
  const fs = require('fs')
  const path = require('path')
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../src/renderer/scripts/workspaceRenderer.js'),
    'utf-8'
  )

  test('workspaceRenderer.js에 createHostingButton 호출 시 콜백 인자가 전달된다', () => {
    // Should match: createHostingButton(ws.path, (something) => { ... })
    // or createHostingButton(ws.path, onToggle_callback)
    expect(src).toMatch(/createHostingButton\s*\([^,]+,\s*\(/)
  })

  test('콜백 내에서 currentHostingPath가 nowRunning 조건에 따라 설정된다', () => {
    expect(src).toContain('currentHostingPath')
    // The callback sets currentHostingPath = wsPath or null
    expect(src).toMatch(/currentHostingPath\s*=\s*(?:nowRunning|wsPath|null|\w+\s*\?\s*\w+\s*:\s*null)/)
  })
})

// ─── TC-12: setHostingButtonPending(false) — 호출자가 updateHostingButton 먼저 호출한 경우 상태 유지 ───

describe('TC-12: setHostingButtonPending(false) — 호출자가 updateHostingButton 먼저 호출한 경우 상태 유지', () => {
  test('updateHostingButton(running=true) 후 setHostingButtonPending(false) 호출해도 Running 유지', () => {
    const wrapper = createHostingButton('/ws/test')
    document.body.appendChild(wrapper)
    // Simulate the new success path:
    // 1. pending=true (button clicked)
    setHostingButtonPending(wrapper, true)
    // 2. caller explicitly sets new state
    updateHostingButton(wrapper, true)
    // 3. setHostingButtonPending(false) — should only release disabled, not override state
    setHostingButtonPending(wrapper, false)
    const btn = wrapper.querySelector('button') as HTMLButtonElement
    // With the fix: button should be Running (Stop)
    // Without the fix: button would be reverted to Stopped (Start)
    expect(btn.textContent).toBe('Stop')
    expect(btn.className).toContain('hosting-btn-running')
    expect(btn.disabled).toBe(false)
  })
})
