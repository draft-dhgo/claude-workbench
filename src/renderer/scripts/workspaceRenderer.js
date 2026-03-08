window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const wsList          = document.getElementById('ws-list')
  const wsEmptyMsg      = document.getElementById('ws-empty-msg')
  const wsSelectedSection = document.getElementById('ws-selected-section')
  const wsSelectedPath  = document.getElementById('ws-selected-path')
  const wsActionSection = document.getElementById('ws-action-section')
  const wsTerminalBtn   = document.getElementById('ws-terminal-btn')
  const wsClaudeBtn     = document.getElementById('ws-claude-btn')
  const wsResultBar     = document.getElementById('ws-result-bar')
  const t = window.i18n.t

  let selectedWorkspacePath = null
  let isWorking = false

  function setResult(message, isError) {
    wsResultBar.textContent = message
    wsResultBar.className = 'status-bar' + (isError ? ' status-error' : '')
  }

  function selectWorkspace(workspacePath) {
    selectedWorkspacePath = workspacePath

    wsList.querySelectorAll('.ws-item').forEach(item => {
      item.classList.remove('selected')
    })

    const selectedItem = wsList.querySelector('[data-path="' + CSS.escape(workspacePath) + '"]')
    if (selectedItem) selectedItem.classList.add('selected')

    wsSelectedSection.style.display = 'block'
    wsSelectedPath.textContent = workspacePath

    wsActionSection.style.display = 'flex'
    wsTerminalBtn.disabled = false
    wsClaudeBtn.disabled = false

    setResult('')
  }

  async function fetchAndRenderList() {
    wsList.innerHTML = ''
    wsEmptyMsg.style.display = 'none'
    wsSelectedSection.style.display = 'none'
    wsActionSection.style.display = 'none'
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    selectedWorkspacePath = null

    let result
    try {
      result = await window.electronAPI.invoke('workspace:list', {})
    } catch (e) {
      setResult(t('workspace.error.list_error'), true)
      return
    }

    if (!result.success) {
      setResult(t('workspace.error.list_fail', { error: result.error || '' }), true)
      return
    }

    const workspaces = result.workspaces || []

    if (workspaces.length === 0) {
      wsEmptyMsg.style.display = 'block'
      return
    }

    workspaces.forEach(ws => {
      const item = document.createElement('div')
      item.className = 'ws-item'
      item.dataset.path = ws.path

      const nameSpan = document.createElement('span')
      nameSpan.className = 'ws-item-name'
      nameSpan.textContent = ws.name

      const pathSpan = document.createElement('span')
      pathSpan.className = 'ws-item-path'
      pathSpan.textContent = ws.path

      item.appendChild(nameSpan)
      item.appendChild(pathSpan)

      item.addEventListener('click', () => selectWorkspace(ws.path))
      wsList.appendChild(item)
    })
  }

  async function onOpenTerminal() {
    if (isWorking || !selectedWorkspacePath) return
    isWorking = true
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    setResult('')

    try {
      const result = await window.electronAPI.invoke('terminal:open', { path: selectedWorkspacePath })
      if (result.success) {
        setResult(t('workspace.terminal.success'))
      } else {
        setResult(t('workspace.error.terminal_fail', { error: result.error || '' }), true)
      }
    } catch (e) {
      setResult(t('workspace.error.terminal_error'), true)
    } finally {
      isWorking = false
      wsTerminalBtn.disabled = false
      wsClaudeBtn.disabled = false
    }
  }

  async function onRegenerateClaude() {
    if (isWorking || !selectedWorkspacePath) return

    const confirmMessage = t('workspace.reset.confirm', { path: selectedWorkspacePath })

    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    isWorking = true
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    setResult('')

    try {
      const result = await window.electronAPI.invoke('claude-config:reset', {
        workspacePath: selectedWorkspacePath,
        lang: window.i18n.currentLang
      })
      if (result.success) {
        setResult(t('workspace.reset.success'))
      } else {
        setResult(t('workspace.error.reset_fail', { error: result.error || '' }), true)
      }
    } catch (e) {
      setResult(t('workspace.error.reset_error'), true)
    } finally {
      isWorking = false
      wsTerminalBtn.disabled = false
      wsClaudeBtn.disabled = false
    }
  }

  async function loadWorkspaceTab() {
    isWorking = false
    setResult('')
    await fetchAndRenderList()
  }

  wsTerminalBtn.addEventListener('click', onOpenTerminal)
  wsClaudeBtn.addEventListener('click', onRegenerateClaude)

  window.loadWorkspaceTab = loadWorkspaceTab
})
