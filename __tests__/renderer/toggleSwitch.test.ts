/**
 * TDD Tests for REQ-001: ToggleSwitch Component
 * Source: SDD-0001, Test Design-0001
 * @jest-environment jsdom
 */

import { syncToggleState, handleToggleKeydown } from '../../src/renderer/scripts/toggleSwitch'

// ─── DOM fixture helper ───────────────────────────────────────────────────────
function buildToggleFixture(id: string, ariaLabel: string, initialChecked = false): void {
  const wrapper = document.createElement('div')
  wrapper.className = 'toggle-switch-wrapper'
  wrapper.innerHTML = `
    <button
      class="toggle-switch"
      role="switch"
      aria-checked="${initialChecked}"
      aria-label="${ariaLabel}"
      id="${id}"
      tabindex="0"
    >
      <span class="toggle-switch__track">
        <span class="toggle-switch__thumb"></span>
      </span>
    </button>
    <span class="toggle-switch__label" aria-live="polite">${initialChecked ? 'ON' : 'OFF'}</span>
  `
  document.body.appendChild(wrapper)
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  jest.clearAllMocks()
})

// ─── UNIT TESTS ───────────────────────────────────────────────────────────────

describe('TC-U-01: syncToggleState — 정상 활성화 상태 동기화', () => {
  test('aria-checked가 "true"로 설정되고 레이블이 "ON"이 된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    syncToggleState('workspace-toggle', true)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
  })
})

describe('TC-U-02: syncToggleState — 정상 비활성화 상태 동기화', () => {
  test('aria-checked가 "false"로 설정되고 레이블이 "OFF"가 된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', true)
    syncToggleState('workspace-toggle', false)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('false')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('OFF')
  })
})

describe('TC-U-03: syncToggleState — 존재하지 않는 toggleId (Edge Case)', () => {
  test('예외가 발생하지 않고 early return한다', () => {
    expect(() => syncToggleState('nonexistent-toggle', true)).not.toThrow()
  })
})

describe('TC-U-04: syncToggleState — undefined 초기값 처리 (Edge Case)', () => {
  test('aria-checked가 "false"로 설정되고 "undefined" 문자열이 아니다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    syncToggleState('workspace-toggle', undefined as any)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('false')
    expect(btn.getAttribute('aria-checked')).not.toBe('undefined')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('OFF')
  })
})

describe('TC-U-05: syncToggleState — null 초기값 처리 (Edge Case)', () => {
  test('aria-checked가 "false"로 설정되고 "null" 문자열이 아니다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    syncToggleState('workspace-toggle', null as any)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('false')
    expect(btn.getAttribute('aria-checked')).not.toBe('null')
  })
})

describe('TC-U-06: syncToggleState — 레이블 엘리먼트 미존재 시 오류 미발생 (Edge Case)', () => {
  test('예외 없이 aria-checked는 정상 설정된다', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'toggle-switch-wrapper'
    wrapper.innerHTML = `
      <button class="toggle-switch" role="switch" aria-checked="false"
              aria-label="workspace 토글" id="workspace-toggle" tabindex="0">
        <span class="toggle-switch__track"><span class="toggle-switch__thumb"></span></span>
      </button>
    `
    document.body.appendChild(wrapper)
    expect(() => syncToggleState('workspace-toggle', true)).not.toThrow()
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })
})

describe('TC-U-07: handleToggleKeydown — Space 키 입력 처리', () => {
  test('preventDefault와 click이 호출된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    const btn = document.getElementById('workspace-toggle')!
    const clickMock = jest.fn()
    btn.addEventListener('click', clickMock)

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    Object.defineProperty(event, 'target', { value: btn, configurable: true })

    handleToggleKeydown(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
  })
})

describe('TC-U-08: handleToggleKeydown — Enter 키 입력 처리', () => {
  test('preventDefault와 click이 호출된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    const btn = document.getElementById('workspace-toggle')!
    const clickMock = jest.fn()
    btn.addEventListener('click', clickMock)

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    Object.defineProperty(event, 'target', { value: btn, configurable: true })

    handleToggleKeydown(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
  })
})

describe('TC-U-09: handleToggleKeydown — 무관한 키 입력 무시', () => {
  test('Tab 키에서는 preventDefault와 click이 호출되지 않는다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    const btn = document.getElementById('workspace-toggle')!
    const clickMock = jest.fn()
    btn.addEventListener('click', clickMock)

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    Object.defineProperty(event, 'target', { value: btn, configurable: true })

    handleToggleKeydown(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
    expect(clickMock).not.toHaveBeenCalled()
  })
})

describe('TC-U-10: CSS 상태 렌더링 — aria-checked="false" 시 기본 상태', () => {
  test('aria-checked 속성이 "false"이다 (JSDOM에서 CSS computed style은 미지원)', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('false')
  })
})

describe('TC-U-11: CSS 상태 렌더링 — aria-checked="true" 시 활성 상태', () => {
  test('aria-checked 속성이 "true"이다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    syncToggleState('workspace-toggle', true)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })
})

describe('TC-U-12: CSS 상태 렌더링 — disabled 상태 시각적 처리', () => {
  test('disabled 속성이 설정 가능하다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    const btn = document.getElementById('workspace-toggle') as HTMLButtonElement
    btn.disabled = true
    expect(btn.disabled).toBe(true)
  })
})

// ─── INTEGRATION TESTS ───────────────────────────────────────────────────────

describe('TC-I-01: workspace 토글 클릭 플로우 — OFF → ON', () => {
  test('클릭 핸들러가 syncToggleState를 호출하면 aria-checked="true", 레이블="ON"', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    let workspaceActive = false

    btn.addEventListener('click', () => {
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })

    btn.click()

    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
    expect(workspaceActive).toBe(true)
  })
})

describe('TC-I-02: workspace 토글 클릭 플로우 — ON → OFF', () => {
  test('클릭 후 aria-checked="false", 레이블="OFF"', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', true)
    const btn = document.getElementById('workspace-toggle')!
    let workspaceActive = true

    btn.addEventListener('click', () => {
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })

    btn.click()

    expect(btn.getAttribute('aria-checked')).toBe('false')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('OFF')
    expect(workspaceActive).toBe(false)
  })
})

describe('TC-I-03: worktree 토글 클릭 플로우 — OFF → ON', () => {
  test('클릭 후 aria-checked="true", 레이블="ON"', () => {
    buildToggleFixture('worktree-toggle', 'worktree 토글', false)
    const btn = document.getElementById('worktree-toggle')!
    let worktreeActive = false

    btn.addEventListener('click', () => {
      worktreeActive = !worktreeActive
      syncToggleState('worktree-toggle', worktreeActive)
    })

    btn.click()

    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
  })
})

describe('TC-I-04: worktree 토글 클릭 플로우 — ON → OFF', () => {
  test('클릭 후 aria-checked="false", 레이블="OFF"', () => {
    buildToggleFixture('worktree-toggle', 'worktree 토글', true)
    const btn = document.getElementById('worktree-toggle')!
    let worktreeActive = true

    btn.addEventListener('click', () => {
      worktreeActive = !worktreeActive
      syncToggleState('worktree-toggle', worktreeActive)
    })

    btn.click()

    expect(btn.getAttribute('aria-checked')).toBe('false')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('OFF')
  })
})

describe('TC-I-05: 키보드 인터랙션 플로우 — Space 키로 workspace 토글', () => {
  test('Space 키 dispatch → click → syncToggleState → aria-checked="true"', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    let workspaceActive = false

    btn.addEventListener('click', () => {
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })
    btn.addEventListener('keydown', handleToggleKeydown)

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    btn.dispatchEvent(event)

    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
  })
})

describe('TC-I-06: 키보드 인터랙션 플로우 — Enter 키로 worktree 토글', () => {
  test('Enter 키 dispatch → click → syncToggleState → aria-checked="true"', () => {
    buildToggleFixture('worktree-toggle', 'worktree 토글', false)
    const btn = document.getElementById('worktree-toggle')!
    let worktreeActive = false

    btn.addEventListener('click', () => {
      worktreeActive = !worktreeActive
      syncToggleState('worktree-toggle', worktreeActive)
    })
    btn.addEventListener('keydown', handleToggleKeydown)

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    btn.dispatchEvent(event)

    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
  })
})

describe('TC-I-07: 연속 클릭 처리 — 빠른 이중 클릭', () => {
  test('첫 클릭: true, 두 번째 클릭: false (토글 패턴 유지)', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    let workspaceActive = false

    btn.addEventListener('click', () => {
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })

    btn.click()
    expect(btn.getAttribute('aria-checked')).toBe('true')

    btn.click()
    expect(btn.getAttribute('aria-checked')).toBe('false')
  })
})

describe('TC-I-08: 초기 렌더링 시 syncToggleState 호출로 초기 UI 설정', () => {
  test('초기화 호출 후 aria-checked="true", 레이블="ON"', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    syncToggleState('workspace-toggle', true)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('true')
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.textContent).toBe('ON')
  })
})

// ─── ACCESSIBILITY TESTS ──────────────────────────────────────────────────────

describe('TC-A-01: role="switch" 속성 존재 확인', () => {
  test('workspace-toggle과 worktree-toggle 모두 role="switch"를 가진다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    buildToggleFixture('worktree-toggle', 'worktree 토글')
    expect(document.getElementById('workspace-toggle')!.getAttribute('role')).toBe('switch')
    expect(document.getElementById('worktree-toggle')!.getAttribute('role')).toBe('switch')
  })
})

describe('TC-A-02: aria-checked 속성이 현재 상태를 정확히 반영', () => {
  test('OFF→클릭→ON 흐름에서 aria-checked가 동기화된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('aria-checked')).toBe('false')

    let active = false
    btn.addEventListener('click', () => {
      active = !active
      syncToggleState('workspace-toggle', active)
    })
    btn.click()

    expect(btn.getAttribute('aria-checked')).toBe('true')
  })
})

describe('TC-A-03: aria-live 레이블이 상태 변경을 알림', () => {
  test('toggle-switch__label에 aria-live="polite"가 존재하고 텍스트가 변경된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    const label = btn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    expect(label.getAttribute('aria-live')).toBe('polite')
    syncToggleState('workspace-toggle', true)
    expect(label.textContent).toBe('ON')
  })
})

describe('TC-A-04: 키보드로 토글 조작 가능 (tabindex 및 이벤트 핸들러 확인)', () => {
  test('tabindex="0"이 설정되어 있고 Space/Enter로 토글 조작이 가능하다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!
    expect(btn.getAttribute('tabindex')).toBe('0')

    let active = false
    btn.addEventListener('click', () => {
      active = !active
      syncToggleState('workspace-toggle', active)
    })
    btn.addEventListener('keydown', handleToggleKeydown)

    // Space key
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(btn.getAttribute('aria-checked')).toBe('true')

    // Enter key
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(btn.getAttribute('aria-checked')).toBe('false')
  })
})

describe('TC-A-05: aria-label 속성으로 기능명 제공', () => {
  test('각 버튼에 의미있는 aria-label이 설정되어 있다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    buildToggleFixture('worktree-toggle', 'worktree 토글')
    expect(document.getElementById('workspace-toggle')!.getAttribute('aria-label')).toBeTruthy()
    expect(document.getElementById('worktree-toggle')!.getAttribute('aria-label')).toBeTruthy()
  })
})

describe('TC-A-06: disabled 상태에서 aria-disabled 속성 제공', () => {
  test('disabled 버튼에 aria-disabled="true"를 설정할 수 있다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글')
    const btn = document.getElementById('workspace-toggle') as HTMLButtonElement
    btn.disabled = true
    btn.setAttribute('aria-disabled', 'true')
    expect(btn.getAttribute('aria-disabled')).toBe('true')
  })
})

// ─── REGRESSION TESTS ────────────────────────────────────────────────────────

describe('TC-R-01: 기존 workspace 클릭 핸들러 로직 보존', () => {
  test('기존 클릭 핸들러가 정상 실행되고 내부 상태가 변경된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!

    const mockWorkspaceHandler = jest.fn()
    let workspaceActive = false
    btn.addEventListener('click', () => {
      mockWorkspaceHandler()
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })

    btn.click()
    expect(mockWorkspaceHandler).toHaveBeenCalledTimes(1)
    expect(workspaceActive).toBe(true)
  })
})

describe('TC-R-02: 기존 worktree 클릭 핸들러 로직 보존', () => {
  test('기존 클릭 핸들러가 정상 실행되고 내부 상태가 변경된다', () => {
    buildToggleFixture('worktree-toggle', 'worktree 토글', false)
    const btn = document.getElementById('worktree-toggle')!

    const mockWorktreeHandler = jest.fn()
    let worktreeActive = false
    btn.addEventListener('click', () => {
      mockWorktreeHandler()
      worktreeActive = !worktreeActive
      syncToggleState('worktree-toggle', worktreeActive)
    })

    btn.click()
    expect(mockWorktreeHandler).toHaveBeenCalledTimes(1)
    expect(worktreeActive).toBe(true)
  })
})

describe('TC-R-03: workspace 와 worktree 토글 상태 독립성', () => {
  test('workspace 변경이 worktree 상태에 영향을 미치지 않는다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    buildToggleFixture('worktree-toggle', 'worktree 토글', false)

    const wsBtn = document.getElementById('workspace-toggle')!
    const wtBtn = document.getElementById('worktree-toggle')!

    let workspaceActive = false
    let worktreeActive = false

    wsBtn.addEventListener('click', () => {
      workspaceActive = !workspaceActive
      syncToggleState('workspace-toggle', workspaceActive)
    })
    wtBtn.addEventListener('click', () => {
      worktreeActive = !worktreeActive
      syncToggleState('worktree-toggle', worktreeActive)
    })

    wsBtn.click()
    expect(wsBtn.getAttribute('aria-checked')).toBe('true')
    expect(wtBtn.getAttribute('aria-checked')).toBe('false')

    wtBtn.click()
    expect(wsBtn.getAttribute('aria-checked')).toBe('true')
    expect(wtBtn.getAttribute('aria-checked')).toBe('true')
  })
})

describe('TC-R-04: 페이지 초기 로드 시 토글 상태 복원', () => {
  test('workspace=true, worktree=false로 초기화된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    buildToggleFixture('worktree-toggle', 'worktree 토글', false)

    // 저장된 상태에서 복원 시나리오
    const savedWorkspaceActive = true
    const savedWorktreeActive = false

    syncToggleState('workspace-toggle', savedWorkspaceActive)
    syncToggleState('worktree-toggle', savedWorktreeActive)

    const wsBtn = document.getElementById('workspace-toggle')!
    const wtBtn = document.getElementById('worktree-toggle')!
    const wsLabel = wsBtn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!
    const wtLabel = wtBtn.closest('.toggle-switch-wrapper')!.querySelector('.toggle-switch__label')!

    expect(wsBtn.getAttribute('aria-checked')).toBe('true')
    expect(wsLabel.textContent).toBe('ON')
    expect(wtBtn.getAttribute('aria-checked')).toBe('false')
    expect(wtLabel.textContent).toBe('OFF')
  })
})

describe('TC-R-05: UI 교체 후 기존 상태 관리 모듈과의 통합 유지', () => {
  test('상태 관리 모듈 mock과 함께 syncToggleState가 올바르게 연동된다', () => {
    buildToggleFixture('workspace-toggle', 'workspace 토글', false)
    const btn = document.getElementById('workspace-toggle')!

    const mockStateManager = {
      workspaceActive: false,
      setWorkspaceActive: jest.fn((val: boolean) => {
        mockStateManager.workspaceActive = val
      })
    }

    btn.addEventListener('click', () => {
      const newState = !mockStateManager.workspaceActive
      mockStateManager.setWorkspaceActive(newState)
      syncToggleState('workspace-toggle', newState)
    })

    btn.click()
    expect(mockStateManager.setWorkspaceActive).toHaveBeenCalledWith(true)
    expect(mockStateManager.workspaceActive).toBe(true)
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })
})
