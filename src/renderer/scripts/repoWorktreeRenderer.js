// ─── Multi-repo Worktree Creation Renderer ────────────────────────────────

let _allRepos = []
let _selectedRepos = {} // { repoId: { id, name, path, baseBranch: null, branches: [] } }
let _isMultiCreating = false

window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const rmRepoSelect     = document.getElementById('rm-repo-select')
  const rmRefreshBtn     = document.getElementById('rm-refresh-btn')
  const rmNoReposMsg     = document.getElementById('rm-no-repos-msg')
  const rmLoading        = document.getElementById('rm-loading')
  const rmListSection    = document.getElementById('rm-list-section')
  const rmWorktreeList   = document.getElementById('rm-worktree-list')
  const rmEmptyMsg       = document.getElementById('rm-empty-msg')
  const rmConfirmOverlay = document.getElementById('rm-confirm-overlay')
  const rmConfirmBranch  = document.getElementById('rm-confirm-branch')
  const rmConfirmWarn    = document.getElementById('rm-confirm-warn')
  const rmConfirmSafe    = document.getElementById('rm-confirm-safe')
  const rmCancelBtn      = document.getElementById('rm-cancel-btn')
  const rmConfirmBtn     = document.getElementById('rm-confirm-btn')
  const rmStatusBar      = document.getElementById('rm-status-bar')
  const t = window.i18n.t

  // Multi-create elements
  const rmOpenCreateBtn   = document.getElementById('rm-open-create-btn')
  const rmMultiCreate     = document.getElementById('rm-multi-create')
  const rmMultiCloseBtn   = document.getElementById('rm-multi-close-btn')
  const rmMultiRepoList   = document.getElementById('rm-multi-repo-list')
  const rmMultiBranchStep = document.getElementById('rm-multi-branch-step')
  const rmMultiBranchList = document.getElementById('rm-multi-branch-list')
  const rmMultiConfigStep = document.getElementById('rm-multi-config-step')
  const rmMultiNewBranch  = document.getElementById('rm-multi-new-branch')
  const rmMultiTargetPath = document.getElementById('rm-multi-target-path')
  const rmMultiPathBtn    = document.getElementById('rm-multi-path-btn')
  const rmMultiError      = document.getElementById('rm-multi-error')
  const rmMultiAction     = document.getElementById('rm-multi-action')
  const rmMultiCreateBtn  = document.getElementById('rm-multi-create-btn')
  const rmMultiResult     = document.getElementById('rm-multi-result')

  let currentRepoId = null
  let pendingDelete  = null
  let isLoading     = false
  let lastWorktrees = []

  function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function setLoading(loading) {
    isLoading = loading
    if (loading) {
      rmLoading.style.display = 'flex'
      rmListSection.style.display = 'none'
      rmRepoSelect.disabled = true
      if (rmRefreshBtn) rmRefreshBtn.disabled = true
    } else {
      rmLoading.style.display = 'none'
      rmRepoSelect.disabled = false
      if (rmRefreshBtn) rmRefreshBtn.disabled = false
    }
  }

  function showToast(message, type) {
    const toast = document.getElementById('toast')
    if (!toast) return
    toast.textContent = message
    toast.className = 'toast toast-' + type
    toast.style.display = 'block'
    setTimeout(() => { toast.style.display = 'none' }, 3000)
  }

  function showDeleteConfirm(worktreePath, branch, isPushed) {
    pendingDelete = { worktreePath, branch }
    rmConfirmBranch.textContent = branch || '(detached HEAD)'
    if (!isPushed) {
      rmConfirmWarn.textContent = t('repo-worktree.delete.warn_unpushed')
      rmConfirmWarn.style.display = 'block'
      rmConfirmSafe.style.display = 'none'
    } else {
      rmConfirmSafe.textContent = t('repo-worktree.delete.safe')
      rmConfirmSafe.style.display = 'block'
      rmConfirmWarn.style.display = 'none'
    }
    rmConfirmOverlay.style.display = 'flex'
  }

  function hideDeleteConfirm() {
    pendingDelete = null
    rmConfirmOverlay.style.display = 'none'
  }

  function renderWorktreeList(worktrees) {
    lastWorktrees = worktrees
    rmWorktreeList.innerHTML = ''
    rmListSection.style.display = 'block'
    if (worktrees.length === 0) {
      rmEmptyMsg.style.display = 'block'
      return
    }
    rmEmptyMsg.style.display = 'none'
    worktrees.forEach(wt => {
      const branchText = wt.branch || '(detached HEAD)'
      const badgeClass = wt.isPushed ? 'wt-badge-pushed' : 'wt-badge-unpushed'
      const badgeLabel = wt.isPushed ? t('repo-worktree.badge.pushed') : t('repo-worktree.badge.unpushed')
      const disabledAttr = wt.isPushed ? ' disabled' : ''
      const card = document.createElement('div')
      card.className = 'wt-card'
      card.innerHTML =
        '<div class="wt-card-header">' +
          '<span class="wt-card-branch">&#x2387; ' + escapeHtml(branchText) + '</span>' +
          '<span class="wt-card-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
        '</div>' +
        '<div class="wt-card-path">' + escapeHtml(wt.worktreePath) + '</div>' +
        '<div class="wt-card-actions">' +
          '<button class="btn btn-danger rm-delete-btn"' +
            ' data-path="' + escapeHtml(wt.worktreePath) + '"' +
            ' data-branch="' + escapeHtml(wt.branch || '') + '"' +
            ' data-is-pushed="' + (wt.isPushed ? 'true' : 'false') + '"' +
            disabledAttr + '>' + t('btn.delete') + '</button>' +
        '</div>'
      rmWorktreeList.appendChild(card)
    })
  }

  async function onRepoSelected(repoId) {
    if (!repoId) {
      currentRepoId = null
      rmListSection.style.display = 'none'
      if (rmRefreshBtn) rmRefreshBtn.style.display = 'none'
      return
    }
    currentRepoId = repoId
    setLoading(true)
    try {
      const result = await window.electronAPI.invoke('worktree:list-by-repo', { repoId })
      setLoading(false)
      if (!result.success) {
        showToast(t('repo-worktree.error.list_fail', { error: result.error || '' }), 'error')
        return
      }
      renderWorktreeList(result.worktrees || [])
      if (rmRefreshBtn) rmRefreshBtn.style.display = 'inline-block'
    } catch (e) {
      setLoading(false)
      showToast(t('repo-worktree.error.list_error'), 'error')
    }
  }

  async function onDeleteConfirmed() {
    if (!pendingDelete || !currentRepoId) return
    const { worktreePath, branch } = pendingDelete
    hideDeleteConfirm()
    rmRepoSelect.disabled = true
    if (rmRefreshBtn) rmRefreshBtn.disabled = true
    try {
      const result = await window.electronAPI.invoke('worktree:delete-worktree', {
        repoId: currentRepoId, worktreePath, branch
      })
      if (result.success) {
        showToast(t('repo-worktree.delete.success'), 'success')
        await onRepoSelected(currentRepoId)
      } else {
        showToast(t('repo-worktree.error.delete_fail', { error: result.error || '' }), 'error')
        rmRepoSelect.disabled = false
        if (rmRefreshBtn) rmRefreshBtn.disabled = false
      }
    } catch (e) {
      showToast(t('repo-worktree.error.delete_error'), 'error')
      rmRepoSelect.disabled = false
      if (rmRefreshBtn) rmRefreshBtn.disabled = false
    }
  }

  async function onRefresh() {
    if (!currentRepoId || isLoading) return
    await onRepoSelected(currentRepoId)
  }

  // ─── Multi-repo creation logic ────────────────────────────────

  function openMultiCreate() {
    rmMultiCreate.style.display = 'block'
    if (rmOpenCreateBtn) rmOpenCreateBtn.style.display = 'none'
    rmMultiBranchStep.style.display = 'none'
    rmMultiConfigStep.style.display = 'none'
    rmMultiAction.style.display = 'none'
    rmMultiResult.style.display = 'none'
    rmMultiResult.innerHTML = ''
    if (rmMultiNewBranch) rmMultiNewBranch.value = ''
    if (rmMultiTargetPath) rmMultiTargetPath.value = ''
    if (rmMultiError) rmMultiError.style.display = 'none'
    _selectedRepos = {}
    renderRepoCheckboxes()
  }

  function closeMultiCreate() {
    rmMultiCreate.style.display = 'none'
    if (rmOpenCreateBtn) rmOpenCreateBtn.style.display = 'block'
  }

  function renderRepoCheckboxes() {
    rmMultiRepoList.innerHTML = ''
    _allRepos.forEach(repo => {
      const item = document.createElement('label')
      item.className = 'rm-multi-repo-item'
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.value = repo.id
      cb.addEventListener('change', () => onRepoCheckChange(repo, cb.checked))
      const nameSpan = document.createElement('span')
      nameSpan.className = 'repo-name'
      nameSpan.textContent = repo.name
      const pathSpan = document.createElement('span')
      pathSpan.className = 'repo-path'
      pathSpan.textContent = repo.path
      item.appendChild(cb)
      item.appendChild(nameSpan)
      item.appendChild(pathSpan)
      rmMultiRepoList.appendChild(item)
    })
  }

  async function onRepoCheckChange(repo, checked) {
    if (checked) {
      _selectedRepos[repo.id] = { id: repo.id, name: repo.name, path: repo.path, baseBranch: null, branches: [] }
      // Fetch branches
      try {
        const result = await window.electronAPI.invoke('worktree:list-branches-single', { repoId: repo.id })
        if (result.success && _selectedRepos[repo.id]) {
          _selectedRepos[repo.id].branches = result.branches || []
        }
      } catch (e) { /* ignore */ }
    } else {
      delete _selectedRepos[repo.id]
    }
    updateSteps()
  }

  function updateSteps() {
    const selectedIds = Object.keys(_selectedRepos)
    if (selectedIds.length > 0) {
      rmMultiBranchStep.style.display = 'block'
      rmMultiConfigStep.style.display = 'block'
      rmMultiAction.style.display = 'flex'
      renderBranchSelectors()
    } else {
      rmMultiBranchStep.style.display = 'none'
      rmMultiConfigStep.style.display = 'none'
      rmMultiAction.style.display = 'none'
    }
  }

  function renderBranchSelectors() {
    rmMultiBranchList.innerHTML = ''
    Object.values(_selectedRepos).forEach(repo => {
      const row = document.createElement('div')
      row.className = 'rm-multi-branch-row'

      const nameSpan = document.createElement('span')
      nameSpan.className = 'branch-repo-name'
      nameSpan.textContent = repo.name

      const wrapper = document.createElement('div')
      wrapper.className = 'branch-search-wrapper'

      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'form-input branch-search-input'
      input.placeholder = 'Search branch...'
      input.value = repo.baseBranch || ''
      input.dataset.repoId = repo.id

      const dropdown = document.createElement('div')
      dropdown.className = 'rm-branch-dropdown'
      dropdown.style.display = 'none'

      function renderDropdown(filter) {
        dropdown.innerHTML = ''
        const branches = repo.branches || []
        const filtered = filter
          ? branches.filter(b => b.toLowerCase().includes(filter.toLowerCase()))
          : branches
        if (filtered.length === 0) {
          dropdown.style.display = 'none'
          return
        }
        filtered.slice(0, 50).forEach(b => {
          const item = document.createElement('div')
          item.className = 'rm-branch-dropdown-item'
          item.textContent = b
          item.addEventListener('mousedown', (e) => {
            e.preventDefault()
            input.value = b
            _selectedRepos[repo.id].baseBranch = b
            dropdown.style.display = 'none'
          })
          dropdown.appendChild(item)
        })
        dropdown.style.display = 'block'
      }

      input.addEventListener('focus', () => renderDropdown(input.value))
      input.addEventListener('input', () => {
        _selectedRepos[repo.id].baseBranch = input.value
        renderDropdown(input.value)
      })
      input.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none' }, 150)
      })

      wrapper.appendChild(input)
      wrapper.appendChild(dropdown)
      row.appendChild(nameSpan)
      row.appendChild(wrapper)
      rmMultiBranchList.appendChild(row)
    })
  }

  async function onMultiPathClicked() {
    const result = await window.electronAPI.invoke('worktree:select-path')
    if (result && result.success && result.path) {
      rmMultiTargetPath.value = result.path
      if (rmMultiError) rmMultiError.style.display = 'none'
    }
  }

  async function onMultiCreate() {
    if (_isMultiCreating) return
    const selectedIds = Object.keys(_selectedRepos)
    if (selectedIds.length === 0) return

    // Validate
    const newBranch = rmMultiNewBranch.value.trim()
    const targetPath = rmMultiTargetPath.value.trim()
    if (!newBranch || !targetPath) {
      if (rmMultiError) {
        rmMultiError.textContent = 'Branch name and target path are required'
        rmMultiError.style.display = 'block'
      }
      return
    }

    // Check all repos have base branch selected
    for (const repo of Object.values(_selectedRepos)) {
      if (!repo.baseBranch) {
        if (rmMultiError) {
          rmMultiError.textContent = 'Please select base branch for: ' + repo.name
          rmMultiError.style.display = 'block'
        }
        return
      }
    }

    if (rmMultiError) rmMultiError.style.display = 'none'
    _isMultiCreating = true
    rmMultiCreateBtn.disabled = true
    rmMultiCreateBtn.textContent = 'Creating...'
    rmMultiResult.innerHTML = ''
    rmMultiResult.style.display = 'block'

    let successCount = 0
    for (const repo of Object.values(_selectedRepos)) {
      const itemDiv = document.createElement('div')
      itemDiv.className = 'rm-multi-result-item'
      itemDiv.textContent = repo.name + ': creating...'
      rmMultiResult.appendChild(itemDiv)

      try {
        const result = await window.electronAPI.invoke('worktree:create-single', {
          repoId: repo.id,
          baseBranch: repo.baseBranch,
          newBranch,
          targetPath,
        })
        if (result && result.success) {
          itemDiv.textContent = repo.name + ': Created (' + (result.worktreePath || '') + ')'
          itemDiv.className = 'rm-multi-result-item success'
          successCount++
        } else {
          itemDiv.textContent = repo.name + ': Failed - ' + (result?.error || 'unknown')
          itemDiv.className = 'rm-multi-result-item error'
        }
      } catch (e) {
        itemDiv.textContent = repo.name + ': Error - ' + (e.message || 'unknown')
        itemDiv.className = 'rm-multi-result-item error'
      }
    }

    _isMultiCreating = false
    rmMultiCreateBtn.disabled = false
    rmMultiCreateBtn.textContent = 'Create Worktrees'

    if (successCount > 0) {
      showToast(successCount + ' worktree(s) created', 'success')
      // Refresh current repo list if one is selected
      if (currentRepoId) await onRepoSelected(currentRepoId)
    }
  }

  // ─── Tab load ────────────────────────────────

  async function loadRepoWorktreeTab() {
    currentRepoId = null
    pendingDelete = null
    isLoading = false
    lastWorktrees = []
    rmListSection.style.display = 'none'
    rmLoading.style.display = 'none'
    rmConfirmOverlay.style.display = 'none'
    if (rmRefreshBtn) rmRefreshBtn.style.display = 'none'
    if (rmStatusBar) rmStatusBar.textContent = ''
    if (rmMultiCreate) rmMultiCreate.style.display = 'none'

    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (!result.success) return
      const repos = result.repos || []
      _allRepos = repos

      rmRepoSelect.innerHTML = '<option value="">' + t('repo-worktree.select.placeholder') + '</option>'

      if (repos.length === 0) {
        rmNoReposMsg.style.display = 'block'
        rmRepoSelect.style.display = 'none'
        if (rmOpenCreateBtn) rmOpenCreateBtn.style.display = 'none'
        return
      }

      rmNoReposMsg.style.display = 'none'
      rmRepoSelect.style.display = 'block'
      if (rmOpenCreateBtn) rmOpenCreateBtn.style.display = 'block'

      repos.forEach(repo => {
        const option = document.createElement('option')
        option.value = repo.id
        option.textContent = repo.name + ' (' + repo.path + ')'
        rmRepoSelect.appendChild(option)
      })
    } catch (e) {
      showToast(t('repo-worktree.error.repos_load'), 'error')
    }
  }

  // ─── Event bindings ────────────────────────────────

  rmRepoSelect.addEventListener('change', () => onRepoSelected(rmRepoSelect.value))
  if (rmRefreshBtn) rmRefreshBtn.addEventListener('click', onRefresh)
  rmCancelBtn.addEventListener('click', hideDeleteConfirm)
  rmConfirmBtn.addEventListener('click', onDeleteConfirmed)

  rmWorktreeList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.rm-delete-btn')
    if (!deleteBtn || deleteBtn.disabled) return
    const worktreePath = deleteBtn.dataset.path
    const branch = deleteBtn.dataset.branch
    const isPushed = deleteBtn.dataset.isPushed === 'true'
    showDeleteConfirm(worktreePath, branch, isPushed)
  })

  // Multi-create buttons
  if (rmOpenCreateBtn) rmOpenCreateBtn.addEventListener('click', openMultiCreate)
  if (rmMultiCloseBtn) rmMultiCloseBtn.addEventListener('click', closeMultiCreate)
  if (rmMultiPathBtn) rmMultiPathBtn.addEventListener('click', onMultiPathClicked)
  if (rmMultiCreateBtn) rmMultiCreateBtn.addEventListener('click', onMultiCreate)

  window.loadRepoWorktreeTab = loadRepoWorktreeTab

  window.i18n.registerReRender(() => {
    if (lastWorktrees.length > 0) {
      renderWorktreeList(lastWorktrees)
    }
  })
})
