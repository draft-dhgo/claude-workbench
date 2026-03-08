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
  const wsCreateToggleBtn = document.getElementById('ws-create-toggle-btn')
  const wsCreateForm    = document.getElementById('ws-create-form')
  const wsCreateName    = document.getElementById('ws-create-name')
  const wsCreatePathDisplay = document.getElementById('ws-create-path-display')
  const wsCreatePathBtn = document.getElementById('ws-create-path-btn')
  const wsCreateSubmitBtn = document.getElementById('ws-create-submit-btn')
  const wsCreateCancelBtn = document.getElementById('ws-create-cancel-btn')
  const wsRenameSection = document.getElementById('ws-rename-section')
  const wsRenameInput   = document.getElementById('ws-rename-input')
  const wsRenameBtn     = document.getElementById('ws-rename-btn')
  const wsDeleteBtn     = document.getElementById('ws-delete-btn')
  const t = window.i18n.t

  const whSection        = document.getElementById('wh-section')
  const whIndicator      = document.getElementById('wh-indicator')
  const whUrl            = document.getElementById('wh-url')
  const whStartBtn       = document.getElementById('wh-start-btn')
  const whStopBtn        = document.getElementById('wh-stop-btn')
  const whOpenBtn        = document.getElementById('wh-open-btn')

  let selectedWorkspacePath = null
  let selectedWorkspace = null
  let selectedCreatePath = null
  let isWorking = false
  let wikiHostRunning = false
  let wikiHostUrl = null

  function showToast(message, type) {
    const toast = document.getElementById('toast')
    if (!toast) return
    toast.textContent = message
    toast.className = 'toast toast-' + (type || 'info')
    toast.style.display = 'block'
    setTimeout(() => { toast.style.display = 'none' }, 3000)
  }

  function setResult(message, isError) {
    wsResultBar.textContent = message
    wsResultBar.className = 'status-bar' + (isError ? ' status-error' : '')
  }

  function selectWorkspace(ws) {
    selectedWorkspace = ws
    selectedWorkspacePath = ws.path

    wsList.querySelectorAll('.ws-item').forEach(item => {
      item.classList.remove('selected')
    })

    const selectedItem = wsList.querySelector('[data-path="' + CSS.escape(ws.path) + '"]')
    if (selectedItem) selectedItem.classList.add('selected')

    wsSelectedSection.style.display = 'block'
    wsSelectedPath.textContent = ws.path

    wsActionSection.style.display = 'flex'
    wsTerminalBtn.disabled = false
    wsClaudeBtn.disabled = false

    // 빈 워크스페이스만 이름 변경/삭제 가능
    if (ws.type === 'empty' && ws.id) {
      wsRenameSection.style.display = 'block'
      wsRenameInput.value = ws.name
      wsDeleteBtn.style.display = 'inline-block'
    } else {
      wsRenameSection.style.display = 'none'
      wsDeleteBtn.style.display = 'none'
    }

    // 호스팅 섹션 표시
    whSection.style.display = 'block'
    fetchWikiHostStatus()

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
    selectedWorkspace = null
    wsRenameSection.style.display = 'none'
    wsDeleteBtn.style.display = 'none'
    whSection.style.display = 'none'

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
      if (ws.id) item.dataset.id = ws.id

      // 타입 배지
      const badgeSpan = document.createElement('span')
      badgeSpan.className = 'ws-badge ws-badge-' + ws.type
      badgeSpan.textContent = ws.type === 'worktree'
        ? t('workspace.badge.worktree')
        : t('workspace.badge.empty')

      const nameSpan = document.createElement('span')
      nameSpan.className = 'ws-item-name'
      nameSpan.textContent = ws.name

      const pathSpan = document.createElement('span')
      pathSpan.className = 'ws-item-path'
      pathSpan.textContent = ws.path

      item.appendChild(badgeSpan)
      item.appendChild(nameSpan)
      item.appendChild(pathSpan)

      item.addEventListener('click', () => selectWorkspace(ws))
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

  // 생성 폼 토글
  wsCreateToggleBtn.addEventListener('click', () => {
    wsCreateForm.style.display = wsCreateForm.style.display === 'none' ? 'block' : 'none'
  })

  // 경로 선택
  wsCreatePathBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.invoke('worktree:select-path')
    if (result && result.path) {
      selectedCreatePath = result.path
      wsCreatePathDisplay.textContent = result.path
    }
  })

  // 생성 제출
  wsCreateSubmitBtn.addEventListener('click', async () => {
    const name = wsCreateName.value.trim()
    if (!name) {
      showToast(t('workspace.error.name_empty'), 'warning')
      return
    }
    if (!selectedCreatePath) {
      showToast(t('workspace.error.path_empty'), 'warning')
      return
    }

    const result = await window.electronAPI.invoke('workspace:create', {
      name,
      parentPath: selectedCreatePath,
      lang: window.i18n.currentLang
    })

    if (result.success) {
      wsCreateName.value = ''
      selectedCreatePath = null
      wsCreatePathDisplay.textContent = t('workspace.create.path.placeholder')
      wsCreateForm.style.display = 'none'
      showToast(t('workspace.create.success'), 'success')
      await fetchAndRenderList()
    } else {
      showToast(t('workspace.error.create_fail', { error: result.error || '' }), 'error')
    }
  })

  // 취소
  wsCreateCancelBtn.addEventListener('click', () => {
    wsCreateForm.style.display = 'none'
    wsCreateName.value = ''
    selectedCreatePath = null
    wsCreatePathDisplay.textContent = t('workspace.create.path.placeholder')
  })

  // 이름 변경
  wsRenameBtn.addEventListener('click', async () => {
    if (!selectedWorkspace || !selectedWorkspace.id) return

    const newName = wsRenameInput.value.trim()
    if (!newName) {
      showToast(t('workspace.error.name_empty'), 'warning')
      return
    }

    const result = await window.electronAPI.invoke('workspace:update', {
      id: selectedWorkspace.id,
      name: newName
    })

    if (result.success) {
      showToast(t('workspace.rename.success'), 'success')
      await fetchAndRenderList()
    } else {
      showToast(t('workspace.error.rename_fail', { error: result.error || '' }), 'error')
    }
  })

  // 삭제
  wsDeleteBtn.addEventListener('click', async () => {
    if (!selectedWorkspace || !selectedWorkspace.id) return

    const confirmed = window.confirm(
      t('workspace.delete.confirm', { name: selectedWorkspace.name, path: selectedWorkspace.path })
    )
    if (!confirmed) return

    const result = await window.electronAPI.invoke('workspace:delete', {
      id: selectedWorkspace.id
    })

    if (result.success) {
      selectedWorkspace = null
      selectedWorkspacePath = null
      wsSelectedSection.style.display = 'none'
      wsActionSection.style.display = 'none'
      wsRenameSection.style.display = 'none'
      wsDeleteBtn.style.display = 'none'
      showToast(t('workspace.delete.success'), 'success')
      await fetchAndRenderList()
    } else {
      showToast(t('workspace.error.delete_fail', { error: result.error || '' }), 'error')
    }
  })

  // === Wiki Host UI ===

  function updateWikiHostUI() {
    if (wikiHostRunning) {
      whIndicator.className = 'wh-indicator wh-running'
      whIndicator.textContent = t('wikiHost.status.running')
      whUrl.textContent = wikiHostUrl
      whUrl.style.display = 'inline'
      whStartBtn.disabled = true
      whStopBtn.disabled = false
      whOpenBtn.disabled = false
    } else {
      whIndicator.className = 'wh-indicator wh-stopped'
      whIndicator.textContent = t('wikiHost.status.stopped')
      whUrl.style.display = 'none'
      whStartBtn.disabled = false
      whStopBtn.disabled = true
      whOpenBtn.disabled = true
    }
  }

  async function fetchWikiHostStatus() {
    try {
      const status = await window.electronAPI.invoke('wiki-host:status')
      wikiHostRunning = status.running
      wikiHostUrl = status.url || null
      updateWikiHostUI()
    } catch (e) { /* ignore */ }
  }

  window.electronAPI.on('wiki-host:status-update', (status) => {
    wikiHostRunning = status.running
    wikiHostUrl = status.url || null
    updateWikiHostUI()
  })

  whStartBtn.addEventListener('click', async () => {
    if (!selectedWorkspacePath) return
    const res = await window.electronAPI.invoke('wiki-host:start', {
      workspacePath: selectedWorkspacePath
    })
    if (!res.success) {
      const errKey = res.error === 'VIEWS_DIR_NOT_FOUND'
        ? 'wikiHost.error.noViewsDir'
        : res.error === 'INDEX_NOT_FOUND'
          ? 'wikiHost.error.noIndex'
          : 'wikiHost.error.startFail'
      showToast(t(errKey), 'error')
    }
  })

  whStopBtn.addEventListener('click', async () => {
    await window.electronAPI.invoke('wiki-host:stop')
  })

  whOpenBtn.addEventListener('click', async () => {
    await window.electronAPI.invoke('wiki-host:open-browser')
  })

  async function loadWorkspaceTab() {
    isWorking = false
    setResult('')
    await fetchAndRenderList()
  }

  wsTerminalBtn.addEventListener('click', onOpenTerminal)
  wsClaudeBtn.addEventListener('click', onRegenerateClaude)

  window.loadWorkspaceTab = loadWorkspaceTab

  window.i18n.registerReRender(fetchAndRenderList)
  window.i18n.registerReRender(updateWikiHostUI)
})
