// ─── Exportable functions for Single & Batch Worktree Creation ──────────────

let _currentRepoId = null
let _isCreating = false
let _isBatchCreating = false

function setCurrentRepoId(id) {
  _currentRepoId = id
}

function showCreateForm() {
  if (!_currentRepoId) return
  const form = document.getElementById('rm-create-form')
  const listSection = document.getElementById('rm-list-section')
  const addBtn = document.getElementById('rm-add-btn')
  const branchInput = document.getElementById('rm-branch-input')
  const pathInput = document.getElementById('rm-path-input')
  const branchError = document.getElementById('rm-branch-error')
  const pathError = document.getElementById('rm-path-error')
  if (form) form.style.display = 'block'
  if (listSection) listSection.style.display = 'none'
  if (addBtn) addBtn.style.display = 'none'
  if (branchInput) branchInput.value = ''
  if (pathInput) pathInput.value = ''
  if (branchError) branchError.style.display = 'none'
  if (pathError) pathError.style.display = 'none'
}

function hideCreateForm() {
  const form = document.getElementById('rm-create-form')
  const listSection = document.getElementById('rm-list-section')
  const addBtn = document.getElementById('rm-add-btn')
  if (form) form.style.display = 'none'
  if (listSection) listSection.style.display = 'block'
  if (addBtn) addBtn.style.display = 'inline-block'
}

function setCreatePending(pending) {
  const createBtn = document.getElementById('rm-create-btn')
  const cancelBtn = document.getElementById('rm-create-cancel-btn')
  if (createBtn) {
    createBtn.disabled = pending
    createBtn.textContent = pending ? 'Creating...' : 'Create'
    createBtn.setAttribute('aria-disabled', pending ? 'true' : 'false')
  }
  if (cancelBtn) {
    cancelBtn.disabled = pending
  }
}

function validateCreateInputs() {
  const branchInput = document.getElementById('rm-branch-input')
  const pathInput = document.getElementById('rm-path-input')
  const branchError = document.getElementById('rm-branch-error')
  const pathError = document.getElementById('rm-path-error')
  let valid = true
  if (!branchInput || !branchInput.value.trim()) {
    if (branchError) branchError.style.display = 'block'
    valid = false
  } else {
    if (branchError) branchError.style.display = 'none'
  }
  if (!pathInput || !pathInput.value.trim()) {
    if (pathError) pathError.style.display = 'block'
    valid = false
  } else {
    if (pathError) pathError.style.display = 'none'
  }
  return valid
}

async function onSelectPathClicked() {
  const pathInput = document.getElementById('rm-path-input')
  const pathError = document.getElementById('rm-path-error')
  try {
    const result = await window.electronAPI.invoke('worktree:select-path')
    if (result.success && result.path) {
      if (pathInput) pathInput.value = result.path
    }
    if (pathError) pathError.style.display = 'none'
  } catch (e) {
    // ignore
  }
}

async function onCreateSubmit(onRepoSelectedCb, showToastCb) {
  if (_isCreating) return
  if (!validateCreateInputs()) return
  const branchInput = document.getElementById('rm-branch-input')
  const pathInput = document.getElementById('rm-path-input')
  if (!branchInput || !pathInput) return
  _isCreating = true
  setCreatePending(true)
  try {
    const result = await window.electronAPI.invoke('worktree:create-single', {
      repoId: _currentRepoId,
      branch: branchInput.value.trim(),
      targetPath: pathInput.value.trim(),
      baseBranch: 'HEAD',
    })
    if (result.success) {
      hideCreateForm()
      if (onRepoSelectedCb) await onRepoSelectedCb(_currentRepoId)
      if (showToastCb) showToastCb('create_success', 'success')
    } else {
      const errorKey = result.error === 'PATH_NOT_EXISTS' ? 'path_not_exists'
        : result.error === 'DUPLICATE_PATH' ? 'duplicate_path'
        : result.error === 'NOT_FOUND' ? 'not_found'
        : 'create_fail'
      if (showToastCb) showToastCb(errorKey, 'error')
    }
  } catch (e) {
    if (showToastCb) showToastCb('create_error', 'error')
  } finally {
    _isCreating = false
    setCreatePending(false)
  }
}

// ─── Batch Worktree Creation ────────────────────────────────────────────────

function showBatchCreatePanel() {
  if (!_currentRepoId) return
  const panel = document.getElementById('rm-batch-create-panel')
  const listSection = document.getElementById('rm-list-section')
  const addBtnWrapper = document.getElementById('rm-add-btn-wrapper')
  const pathInput = document.getElementById('rm-batch-path-input')
  const rows = document.getElementById('rm-batch-rows')
  const result = document.getElementById('rm-batch-result')
  if (panel) panel.style.display = 'block'
  if (listSection) listSection.style.display = 'none'
  if (addBtnWrapper) addBtnWrapper.style.display = 'none'
  if (pathInput) pathInput.value = ''
  if (rows) rows.innerHTML = ''
  if (result) result.style.display = 'none'
}

function hideBatchCreatePanel() {
  const panel = document.getElementById('rm-batch-create-panel')
  const listSection = document.getElementById('rm-list-section')
  const addBtnWrapper = document.getElementById('rm-add-btn-wrapper')
  if (panel) panel.style.display = 'none'
  if (listSection) listSection.style.display = 'block'
  if (addBtnWrapper) addBtnWrapper.style.display = 'block'
}

function addWorktreeRow(defaultBranch) {
  const rows = document.getElementById('rm-batch-rows')
  if (!rows) return
  const row = document.createElement('div')
  row.className = 'rm-batch-row'
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'rm-batch-branch-input'
  input.value = defaultBranch || ''
  const removeBtn = document.createElement('button')
  removeBtn.className = 'rm-batch-remove-row'
  removeBtn.textContent = 'X'
  removeBtn.addEventListener('click', () => removeWorktreeRow(row))
  const status = document.createElement('span')
  status.className = 'rm-batch-row-status'
  row.appendChild(input)
  row.appendChild(removeBtn)
  row.appendChild(status)
  rows.appendChild(row)
}

function removeWorktreeRow(rowElement) {
  const rows = document.getElementById('rm-batch-rows')
  if (!rows) return
  const allRows = rows.querySelectorAll('.rm-batch-row')
  if (allRows.length <= 1) return
  rowElement.remove()
}

function validateBatchInputs() {
  const pathInput = document.getElementById('rm-batch-path-input')
  const pathError = document.getElementById('rm-batch-path-error')
  let valid = true
  if (!pathInput || !pathInput.value.trim()) {
    if (pathError) pathError.style.display = 'block'
    valid = false
  } else {
    if (pathError) pathError.style.display = 'none'
  }
  const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
  const branches = []
  rows.forEach(row => {
    const input = row.querySelector('.rm-batch-branch-input')
    if (!input || !input.value.trim()) {
      valid = false
    } else {
      branches.push(input.value.trim())
    }
  })
  // check duplicates
  if (new Set(branches).size !== branches.length) {
    valid = false
  }
  return valid
}

async function onBatchSelectPathClicked() {
  const pathInput = document.getElementById('rm-batch-path-input')
  const pathError = document.getElementById('rm-batch-path-error')
  try {
    const result = await window.electronAPI.invoke('worktree:select-path')
    if (result.success && result.path) {
      if (pathInput) pathInput.value = result.path
    }
    if (pathError) pathError.style.display = 'none'
  } catch (e) {
    // ignore
  }
}

async function onBatchCreateSubmit(onRepoSelectedCb, showToastCb) {
  if (_isBatchCreating) return
  if (!validateBatchInputs()) return
  _isBatchCreating = true
  const pathInput = document.getElementById('rm-batch-path-input')
  const targetPath = pathInput ? pathInput.value.trim() : ''
  const rows = document.querySelectorAll('#rm-batch-rows .rm-batch-row')
  let allSuccess = true
  for (const row of rows) {
    const input = row.querySelector('.rm-batch-branch-input')
    const status = row.querySelector('.rm-batch-row-status')
    const branch = input ? input.value.trim() : ''
    try {
      const result = await window.electronAPI.invoke('worktree:create-single', {
        repoId: _currentRepoId,
        baseBranch: 'HEAD',
        newBranch: branch,
        targetPath: targetPath,
      })
      if (result.success) {
        if (status) status.textContent = 'OK'
      } else {
        if (status) status.textContent = 'FAIL'
        allSuccess = false
      }
    } catch (e) {
      if (status) status.textContent = 'ERROR'
      allSuccess = false
    }
  }
  if (allSuccess) {
    hideBatchCreatePanel()
    if (onRepoSelectedCb) await onRepoSelectedCb(_currentRepoId)
  }
  if (showToastCb) showToastCb(allSuccess ? 'batch_success' : 'batch_partial', allSuccess ? 'success' : 'warning')
  _isBatchCreating = false
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setCurrentRepoId,
    showCreateForm,
    hideCreateForm,
    setCreatePending,
    validateCreateInputs,
    onSelectPathClicked,
    onCreateSubmit,
    showBatchCreatePanel,
    hideBatchCreatePanel,
    addWorktreeRow,
    removeWorktreeRow,
    validateBatchInputs,
    onBatchSelectPathClicked,
    onBatchCreateSubmit,
  }
}

// ─── Worktree Management Renderer (list + delete) ──────────────────────────

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

    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (!result.success) return
      const repos = result.repos || []

      rmRepoSelect.innerHTML = '<option value="">' + t('repo-worktree.select.placeholder') + '</option>'

      if (repos.length === 0) {
        rmNoReposMsg.style.display = 'block'
        rmRepoSelect.style.display = 'none'
        return
      }

      rmNoReposMsg.style.display = 'none'
      rmRepoSelect.style.display = 'block'

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

  window.loadRepoWorktreeTab = loadRepoWorktreeTab

  window.i18n.registerReRender(() => {
    if (lastWorktrees.length > 0) {
      renderWorktreeList(lastWorktrees)
    }
  })
})
