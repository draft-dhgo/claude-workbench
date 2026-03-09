/**
 * HostingButton Component — REQ-002
 * Provides Start/Stop hosting control buttons for each workspace row in the
 * Workspace Management screen.
 *
 * Source: SDD-0002
 * Date: 2026-03-10
 */

// ─── Internal state tracking ─────────────────────────────────────────────────

/**
 * Tracks the "pre-pending" state of each button wrapper so we can restore it
 * after pending is cleared.  Key: wrapper element identity (stored on dataset).
 */
const pendingPrevState = new WeakMap<HTMLElement, boolean>()

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a hosting control button wrapper for a workspace row.
 *
 * @param workspacePath - The workspace path this button controls.
 * @returns div.hosting-btn-wrapper containing button.hosting-btn in Stopped state.
 */
export function createHostingButton(workspacePath: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'hosting-btn-wrapper'
  wrapper.dataset.workspacePath = workspacePath

  const button = document.createElement('button')
  button.className = 'hosting-btn hosting-btn-stopped'
  button.setAttribute('aria-label', `Start viewer hosting for ${workspacePath}`)
  button.setAttribute('tabindex', '0')
  button.textContent = 'Start'
  // Track running state on the button element itself
  button.dataset.running = 'false'

  button.addEventListener('click', async (e: MouseEvent) => {
    e.stopPropagation()
    const isRunning = button.dataset.running === 'true'
    setHostingButtonPending(wrapper, true)
    try {
      if (isRunning) {
        const res = await (window as any).electronAPI.invoke('wiki-host:stop')
        if (!res.success) {
          // On failure, restore Running state
          updateHostingButton(wrapper, true)
        }
      } else {
        const res = await (window as any).electronAPI.invoke('wiki-host:start', { workspacePath })
        if (!res.success) {
          // On failure, restore Stopped state
          updateHostingButton(wrapper, false)
        }
      }
    } finally {
      setHostingButtonPending(wrapper, false)
    }
  })

  wrapper.appendChild(button)
  return wrapper
}

/**
 * Updates the button display state to match the actual hosting running status.
 *
 * @param wrapper - The wrapper element returned by createHostingButton().
 * @param running - true if hosting is currently running, false if stopped.
 */
export function updateHostingButton(wrapper: HTMLElement, running: boolean): void {
  const button = wrapper.querySelector('button') as HTMLButtonElement | null
  if (!button) return

  const workspacePath = wrapper.dataset.workspacePath ?? ''

  if (running) {
    button.dataset.running = 'true'
    button.textContent = 'Stop'
    button.className = 'hosting-btn hosting-btn-running'
    button.setAttribute('aria-label', `Stop viewer hosting for ${workspacePath}`)
  } else {
    button.dataset.running = 'false'
    button.textContent = 'Start'
    button.className = 'hosting-btn hosting-btn-stopped'
    button.setAttribute('aria-label', `Start viewer hosting for ${workspacePath}`)
  }
}

/**
 * Sets or clears the pending (in-flight) state of the button.
 * While pending, the button is disabled to prevent duplicate clicks.
 *
 * @param wrapper  - The wrapper element returned by createHostingButton().
 * @param isPending - true to enter pending state, false to restore previous state.
 */
export function setHostingButtonPending(wrapper: HTMLElement, isPending: boolean): void {
  const button = wrapper.querySelector('button') as HTMLButtonElement | null
  if (!button) return

  if (isPending) {
    // Save the current running state before entering pending
    const wasRunning = button.dataset.running === 'true'
    pendingPrevState.set(wrapper, wasRunning)

    button.disabled = true
    button.setAttribute('aria-disabled', 'true')
    button.textContent = '...'
    button.className = 'hosting-btn hosting-btn-pending'
  } else {
    // Restore the previous state
    const wasRunning = pendingPrevState.get(wrapper) ?? false
    button.disabled = false
    button.setAttribute('aria-disabled', 'false')
    // Restore full state (text, class, aria-label) based on previous running state
    updateHostingButton(wrapper, wasRunning)
  }
}
