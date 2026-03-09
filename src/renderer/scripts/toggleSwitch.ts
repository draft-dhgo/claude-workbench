/**
 * ToggleSwitch Component — REQ-001
 * Converts workspace/worktree toggle UI from checkbox/button to slide bar toggle switch.
 *
 * Source: SDD-0001
 * Date: 2026-03-10
 */

/**
 * Synchronizes ToggleSwitch DOM state (aria-checked, label text) with the given boolean value.
 *
 * @param toggleId  - The id attribute of the toggle button element
 * @param isActive  - Whether the toggle should be in the active (ON) state
 */
export function syncToggleState(toggleId: string, isActive: boolean): void {
  const btn = document.getElementById(toggleId)
  if (!btn) return

  const active = Boolean(isActive)
  btn.setAttribute('aria-checked', String(active))

  const label = btn
    .closest('.toggle-switch-wrapper')
    ?.querySelector('.toggle-switch__label')
  if (label) {
    label.textContent = active ? 'ON' : 'OFF'
  }
}

/**
 * Keyboard event handler for ToggleSwitch elements.
 * Intercepts Space and Enter keys and delegates to the existing click handler.
 *
 * @param event - The KeyboardEvent from the keydown listener
 */
export function handleToggleKeydown(event: KeyboardEvent): void {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    ;(event.target as HTMLElement).click()
  }
}
