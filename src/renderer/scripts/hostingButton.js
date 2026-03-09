/**
 * HostingButton Component — REQ-002
 * Provides Start/Stop hosting control buttons for each workspace row in the
 * Workspace Management screen.
 */

// ─── Internal state tracking ─────────────────────────────────────────────────

const pendingPrevState = new WeakMap()

// ─── Public API (global) ─────────────────────────────────────────────────────

function createHostingButton(workspacePath) {
  const wrapper = document.createElement('div')
  wrapper.className = 'hosting-btn-wrapper'
  wrapper.dataset.workspacePath = workspacePath

  const button = document.createElement('button')
  button.className = 'hosting-btn hosting-btn-stopped'
  button.setAttribute('aria-label', `Start viewer hosting for ${workspacePath}`)
  button.setAttribute('tabindex', '0')
  button.textContent = 'Start'
  button.dataset.running = 'false'

  button.addEventListener('click', async (e) => {
    e.stopPropagation()
    const isRunning = button.dataset.running === 'true'
    setHostingButtonPending(wrapper, true)
    try {
      if (isRunning) {
        const res = await window.electronAPI.invoke('wiki-host:stop')
        if (!res.success) {
          updateHostingButton(wrapper, true)
        }
      } else {
        const res = await window.electronAPI.invoke('wiki-host:start', { workspacePath })
        if (!res.success) {
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

function updateHostingButton(wrapper, running) {
  const button = wrapper.querySelector('button')
  if (!button) return

  const workspacePath = wrapper.dataset.workspacePath || ''

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

function setHostingButtonPending(wrapper, isPending) {
  const button = wrapper.querySelector('button')
  if (!button) return

  if (isPending) {
    const wasRunning = button.dataset.running === 'true'
    pendingPrevState.set(wrapper, wasRunning)

    button.disabled = true
    button.setAttribute('aria-disabled', 'true')
    button.textContent = '...'
    button.className = 'hosting-btn hosting-btn-pending'
  } else {
    const wasRunning = pendingPrevState.get(wrapper) || false
    button.disabled = false
    button.setAttribute('aria-disabled', 'false')
    updateHostingButton(wrapper, wasRunning)
  }
}
