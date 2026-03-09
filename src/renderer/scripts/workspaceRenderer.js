window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const wsList          = document.getElementById('ws-list')
  const wsEmptyMsg      = document.getElementById('ws-empty-msg')
  const wsResultBar     = document.getElementById('ws-result-bar')
  const t = window.i18n.t

  // === 워크스페이스 추가 (기존 경로 등록) ===
  const wsAddToggleBtn  = document.getElementById('ws-add-toggle-btn')
  const wsAddForm       = document.getElementById('ws-add-form')
  const wsAddPathInput  = document.getElementById('ws-add-path-input')
  const wsAddPathBtn    = document.getElementById('ws-add-path-btn')
  const wsAddNameInput  = document.getElementById('ws-add-name-input')
  const wsAddSubmitBtn  = document.getElementById('ws-add-submit-btn')
  const wsAddCancelBtn  = document.getElementById('ws-add-cancel-btn')

  // === 워크스페이스 생성 (스킬/커맨드/CLAUDE.md) ===
  const wsCreateToggleBtn = document.getElementById('ws-create-toggle-btn')
  const wsCreateForm    = document.getElementById('ws-create-form')
  const wsCreatePathInput = document.getElementById('ws-create-path-input')
  const wsCreatePathBtn = document.getElementById('ws-create-path-btn')
  const wsCreateSubmitBtn = document.getElementById('ws-create-submit-btn')
  const wsCreateCancelBtn = document.getElementById('ws-create-cancel-btn')
  const wsCreateResult  = document.getElementById('ws-create-result')

  // === Wiki Viewer 호스팅 (전역, 항상 표시) ===
  const whGlobalIndicator = document.getElementById('wh-global-indicator')
  const whGlobalUrl     = document.getElementById('wh-global-url')
  const whGlobalStopBtn = document.getElementById('wh-global-stop-btn')

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
    if (!wsResultBar) return
    wsResultBar.textContent = message
    wsResultBar.className = 'status-bar' + (isError ? ' status-error' : '')
  }

  // === 워크스페이스 목록 렌더링 ===

  async function fetchAndRenderList() {
    if (!wsList) return
    wsList.innerHTML = ''
    if (wsEmptyMsg) wsEmptyMsg.style.display = 'none'

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
      if (wsEmptyMsg) wsEmptyMsg.style.display = 'block'
      return
    }

    workspaces.forEach(ws => {
      const item = document.createElement('div')
      item.className = 'ws-item'
      item.dataset.path = ws.path
      if (ws.id) item.dataset.id = ws.id

      const nameSpan = document.createElement('span')
      nameSpan.className = 'ws-item-name'
      nameSpan.textContent = ws.name

      const pathSpan = document.createElement('span')
      pathSpan.className = 'ws-item-path'
      pathSpan.textContent = ws.path

      const btnGroup = document.createElement('div')
      btnGroup.className = 'ws-item-actions'

      const resetBtn = document.createElement('button')
      resetBtn.className = 'btn btn-secondary btn-sm'
      resetBtn.textContent = t('workspace.rebuild.btn') || 'Rebuild'
      resetBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const confirmed = window.confirm(
          t('workspace.rebuild.confirm', { name: ws.name, path: ws.path })
        )
        if (!confirmed) return
        resetBtn.disabled = true
        resetBtn.textContent = t('workspace.rebuild.running') || 'Rebuilding...'
        try {
          const res = await window.electronAPI.invoke('claude-config:reset', {
            workspacePath: ws.path,
            lang: window.i18n.currentLang
          })
          if (res.success) {
            showToast(t('workspace.rebuild.success'), 'success')
          } else {
            showToast(t('workspace.error.rebuild_fail', { error: res.error || '' }), 'error')
          }
        } catch (err) {
          showToast(t('workspace.error.rebuild_fail', { error: err.message || '' }), 'error')
        } finally {
          resetBtn.disabled = false
          resetBtn.textContent = t('workspace.rebuild.btn') || 'Rebuild'
        }
      })

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'btn btn-danger btn-sm'
      deleteBtn.textContent = t('workspace.delete.btn') || 'Delete'
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!ws.id) return
        const confirmed = window.confirm(
          t('workspace.delete.confirm', { name: ws.name, path: ws.path })
        )
        if (!confirmed) return
        const res = await window.electronAPI.invoke('workspace:delete', { id: ws.id })
        if (res.success) {
          showToast(t('workspace.delete.success'), 'success')
          await fetchAndRenderList()
        } else {
          showToast(t('workspace.error.delete_fail', { error: res.error || '' }), 'error')
        }
      })

      btnGroup.appendChild(resetBtn)
      btnGroup.appendChild(deleteBtn)

      item.appendChild(nameSpan)
      item.appendChild(pathSpan)
      item.appendChild(btnGroup)
      wsList.appendChild(item)
    })
  }

  // === 워크스페이스 추가 (등록) ===

  if (wsAddToggleBtn && wsAddForm) {
    wsAddToggleBtn.addEventListener('click', () => {
      wsAddForm.style.display = wsAddForm.style.display === 'none' ? 'block' : 'none'
    })
  }

  if (wsAddPathBtn && wsAddPathInput) {
    wsAddPathBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.invoke('worktree:select-path')
      if (result && result.path) {
        wsAddPathInput.value = result.path
      }
    })
  }

  if (wsAddSubmitBtn) {
    wsAddSubmitBtn.addEventListener('click', async () => {
      const dirPath = wsAddPathInput ? wsAddPathInput.value.trim() : ''
      if (!dirPath) {
        showToast(t('workspace.error.path_empty'), 'warning')
        return
      }
      const name = wsAddNameInput ? wsAddNameInput.value.trim() : ''
      const result = await window.electronAPI.invoke('workspace:register', { path: dirPath, name: name || undefined })
      if (result.success) {
        if (wsAddPathInput) wsAddPathInput.value = ''
        if (wsAddNameInput) wsAddNameInput.value = ''
        if (wsAddForm) wsAddForm.style.display = 'none'
        showToast(t('workspace.add.success') || 'Workspace added', 'success')
        await fetchAndRenderList()
      } else {
        showToast(t('workspace.error.create_fail', { error: result.error || '' }), 'error')
      }
    })
  }

  if (wsAddCancelBtn && wsAddForm) {
    wsAddCancelBtn.addEventListener('click', () => {
      wsAddForm.style.display = 'none'
      if (wsAddPathInput) wsAddPathInput.value = ''
      if (wsAddNameInput) wsAddNameInput.value = ''
    })
  }

  // === 워크스페이스 생성 ===

  if (wsCreateToggleBtn && wsCreateForm) {
    wsCreateToggleBtn.addEventListener('click', () => {
      wsCreateForm.style.display = wsCreateForm.style.display === 'none' ? 'block' : 'none'
    })
  }

  if (wsCreatePathBtn && wsCreatePathInput) {
    wsCreatePathBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.invoke('worktree:select-path')
      if (result && result.path) {
        wsCreatePathInput.value = result.path
      }
    })
  }

  function showCreateResult(steps) {
    if (!wsCreateResult || !steps) return
    wsCreateResult.innerHTML = ''
    steps.forEach(step => {
      const div = document.createElement('div')
      div.className = 'ws-create-result-item'
      div.textContent = step
      wsCreateResult.appendChild(div)
    })
    wsCreateResult.style.display = 'block'
  }

  if (wsCreateSubmitBtn) {
    wsCreateSubmitBtn.addEventListener('click', async () => {
      const targetPath = wsCreatePathInput ? wsCreatePathInput.value.trim() : ''
      if (!targetPath) {
        showToast(t('workspace.error.path_empty'), 'warning')
        return
      }

      const resetResult = await window.electronAPI.invoke('claude-config:reset', {
        workspacePath: targetPath,
        lang: window.i18n.currentLang
      })
      if (!resetResult.success) {
        showToast(t('workspace.error.create_fail', { error: resetResult.error || '' }), 'error')
        return
      }

      const name = targetPath.split('/').pop() || targetPath
      const registerResult = await window.electronAPI.invoke('workspace:register', { path: targetPath, name })
      if (!registerResult.success) {
        showToast(t('workspace.error.create_fail', { error: registerResult.error || '' }), 'error')
        return
      }

      if (resetResult.steps) showCreateResult(resetResult.steps)
      showToast(t('workspace.create.success'), 'success')
      await fetchAndRenderList()
    })
  }

  if (wsCreateCancelBtn && wsCreateForm) {
    wsCreateCancelBtn.addEventListener('click', () => {
      wsCreateForm.style.display = 'none'
      if (wsCreatePathInput) wsCreatePathInput.value = ''
      if (wsCreateResult) wsCreateResult.style.display = 'none'
    })
  }

  // === Wiki Viewer 호스팅 (전역) ===

  function updateWikiHostGlobalUI() {
    if (!whGlobalIndicator) return
    if (wikiHostRunning) {
      whGlobalIndicator.className = 'wh-indicator wh-running'
      whGlobalIndicator.textContent = t('wikiHost.status.running')
      if (whGlobalUrl) {
        whGlobalUrl.textContent = wikiHostUrl || ''
        whGlobalUrl.style.display = 'inline'
      }
      if (whGlobalStopBtn) whGlobalStopBtn.disabled = false
    } else {
      whGlobalIndicator.className = 'wh-indicator wh-stopped'
      whGlobalIndicator.textContent = t('wikiHost.status.stopped')
      if (whGlobalUrl) whGlobalUrl.style.display = 'none'
      if (whGlobalStopBtn) whGlobalStopBtn.disabled = true
    }
  }

  async function fetchWikiHostGlobalStatus() {
    try {
      const status = await window.electronAPI.invoke('wiki-host:status')
      wikiHostRunning = status.running
      wikiHostUrl = status.url || null
      updateWikiHostGlobalUI()
    } catch (e) { /* ignore */ }
  }

  window.electronAPI.on('wiki-host:status-update', (status) => {
    wikiHostRunning = status.running
    wikiHostUrl = status.url || null
    updateWikiHostGlobalUI()
  })

  if (whGlobalStopBtn) {
    whGlobalStopBtn.addEventListener('click', async () => {
      await window.electronAPI.invoke('wiki-host:stop')
    })
  }

  async function loadWorkspaceTab() {
    setResult('')
    await fetchAndRenderList()
    await fetchWikiHostGlobalStatus()
  }

  window.loadWorkspaceTab = loadWorkspaceTab

  window.i18n.registerReRender(fetchAndRenderList)
  window.i18n.registerReRender(updateWikiHostGlobalUI)
})
