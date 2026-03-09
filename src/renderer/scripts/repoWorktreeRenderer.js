// ─── Module-level state for exported functions ──────────────────────────────
// These are used by both the exported API (tests) and the DOMContentLoaded block.

let _currentRepoId = null
let _isCreating = false
let _isBatchCreating = false

/**
 * Sets the current repo ID (used by tests to inject state).
 * @param {string|null} id
 */
function setCurrentRepoId(id) {
  _currentRepoId = id
}

/**
 * Shows the create-worktree form and hides the list section and Add button.
 * Resets input fields and error messages.
 * Guards on _currentRepoId — does nothing if no repo is selected.
 */
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

/**
 * Hides the create-worktree form and restores the list section and Add button.
 */
function hideCreateForm() {
  const form = document.getElementById('rm-create-form')
  const listSection = document.getElementById('rm-list-section')
  const addBtn = document.getElementById('rm-add-btn')
  if (form) form.style.display = 'none'
  if (listSection) listSection.style.display = 'block'
  if (addBtn) addBtn.style.display = 'block'
}

/**
 * Sets or clears the pending state for the Create button.
 * While pending: Create button is disabled with "Creating..." text and aria-disabled="true".
 * Cancel button is also disabled.
 * @param {boolean} isPending
 */
function setCreatePending(isPending) {
  const createBtn = document.getElementById('rm-create-btn')
  const cancelBtn = document.getElementById('rm-create-cancel-btn')
  if (isPending) {
    if (createBtn) {
      createBtn.disabled = true
      createBtn.textContent = 'Creating...'
      createBtn.setAttribute('aria-disabled', 'true')
    }
    if (cancelBtn) {
      cancelBtn.disabled = true
    }
  } else {
    if (createBtn) {
      createBtn.disabled = false
      createBtn.textContent = 'Create'
      createBtn.setAttribute('aria-disabled', 'false')
    }
    if (cancelBtn) {
      cancelBtn.disabled = false
    }
  }
}

/**
 * Validates branch name and path inputs.
 * Shows error messages for empty fields.
 * @returns {boolean} true if all inputs are valid, false otherwise.
 */
function validateCreateInputs() {
  const branchInput = document.getElementById('rm-branch-input')
  const pathInput = document.getElementById('rm-path-input')
  const branchError = document.getElementById('rm-branch-error')
  const pathError = document.getElementById('rm-path-error')

  let valid = true
  const branch = branchInput ? branchInput.value.trim() : ''
  const path = pathInput ? pathInput.value.trim() : ''

  if (!branch) {
    if (branchError) {
      branchError.textContent = 'Branch name is required'
      branchError.style.display = 'block'
    }
    valid = false
  } else {
    if (branchError) branchError.style.display = 'none'
  }

  if (!path) {
    if (pathError) {
      pathError.textContent = 'Target path is required'
      pathError.style.display = 'block'
    }
    valid = false
  } else {
    if (pathError) pathError.style.display = 'none'
  }

  return valid
}

/**
 * Invokes the worktree:select-path IPC and updates the path input field.
 * Hides path error on success.
 */
async function onSelectPathClicked() {
  const result = await window.electronAPI.invoke('worktree:select-path')
  if (result && result.success && result.path) {
    const pathInput = document.getElementById('rm-path-input')
    const pathError = document.getElementById('rm-path-error')
    if (pathInput) pathInput.value = result.path
    if (pathError) pathError.style.display = 'none'
  }
}

/**
 * Handles the Create Worktree form submission.
 * Validates inputs, calls worktree:create-single IPC, handles success/failure.
 *
 * @param {Function} onRepoSelectedFn - Callback to refresh the worktree list (receives repoId).
 * @param {Function} showToastFn - Callback to show a toast message (receives message, type).
 */
async function onCreateSubmit(onRepoSelectedFn, showToastFn) {
  if (_isCreating) return
  if (!validateCreateInputs()) return

  _isCreating = true
  setCreatePending(true)

  const branchInput = document.getElementById('rm-branch-input')
  const pathInput = document.getElementById('rm-path-input')
  const branch = branchInput ? branchInput.value.trim() : ''
  const targetPath = pathInput ? pathInput.value.trim() : ''

  try {
    const result = await window.electronAPI.invoke('worktree:create-single', {
      repoId: _currentRepoId,
      branch,
      targetPath,
      baseBranch: 'HEAD',
    })

    if (result && result.success) {
      hideCreateForm()
      if (onRepoSelectedFn) await onRepoSelectedFn(_currentRepoId)
      if (showToastFn) showToastFn('repo-worktree.create.success', 'success')
    } else {
      const errCode = result && result.error ? result.error : ''
      let errKey
      if (errCode === 'PATH_NOT_EXISTS') {
        errKey = 'repo-worktree.error.path_not_exists'
      } else if (errCode === 'DUPLICATE_PATH') {
        errKey = 'repo-worktree.error.duplicate_path'
      } else {
        errKey = 'repo-worktree.error.create_fail'
      }
      if (showToastFn) showToastFn(errKey, 'error')
    }
  } catch (e) {
    if (showToastFn) showToastFn('repo-worktree.error.create_error', 'error')
  } finally {
    _isCreating = false
    setCreatePending(false)
  }
}

/**
 * 배치 생성 패널을 표시하고 목록/Add 버튼을 숨긴다.
 * 경로 입력 및 행 컨테이너를 초기화한다.
 */
function showBatchCreatePanel() {
  if (!_currentRepoId) return
  const panel = document.getElementById('rm-batch-create-panel')
  const listSection = document.getElementById('rm-list-section')
  const addBtnWrapper = document.getElementById('rm-add-btn-wrapper')
  const pathInput = document.getElementById('rm-batch-path-input')
  const rows = document.getElementById('rm-batch-rows')
  const pathError = document.getElementById('rm-batch-path-error')

  if (panel) panel.style.display = 'block'
  if (listSection) listSection.style.display = 'none'
  if (addBtnWrapper) addBtnWrapper.style.display = 'none'
  if (pathInput) pathInput.value = ''
  if (rows) rows.innerHTML = ''
  if (pathError) pathError.style.display = 'none'
}

/**
 * 배치 생성 패널을 숨기고 목록/Add 버튼을 복원한다.
 */
function hideBatchCreatePanel() {
  const panel = document.getElementById('rm-batch-create-panel')
  const listSection = document.getElementById('rm-list-section')
  const addBtnWrapper = document.getElementById('rm-add-btn-wrapper')

  if (panel) panel.style.display = 'none'
  if (listSection) listSection.style.display = 'block'
  if (addBtnWrapper) addBtnWrapper.style.display = 'block'
}

/**
 * 배치 항목 컨테이너에 새 행(브랜치 입력 + 제거 버튼)을 추가한다.
 * @param {string} [defaultBranch=''] - 행 초기 브랜치값
 */
function addWorktreeRow(defaultBranch = '') {
  const rows = document.getElementById('rm-batch-rows')
  if (!rows) return

  const rowEl = document.createElement('div')
  rowEl.className = 'rm-batch-row'

  const branchInput = document.createElement('input')
  branchInput.type = 'text'
  branchInput.className = 'form-input rm-batch-branch-input'
  branchInput.placeholder = 'feature/my-branch'
  branchInput.value = defaultBranch

  const removeBtn = document.createElement('button')
  removeBtn.className = 'btn rm-batch-remove-row'
  removeBtn.setAttribute('aria-label', 'Remove')
  removeBtn.textContent = '×'
  removeBtn.addEventListener('click', () => removeWorktreeRow(rowEl))

  const statusSpan = document.createElement('span')
  statusSpan.className = 'rm-batch-row-status'

  rowEl.appendChild(branchInput)
  rowEl.appendChild(removeBtn)
  rowEl.appendChild(statusSpan)
  rows.appendChild(rowEl)
}

/**
 * 특정 행 엘리먼트를 제거한다. 최소 1행은 유지한다.
 * @param {HTMLElement} rowEl
 */
function removeWorktreeRow(rowEl) {
  const rows = document.getElementById('rm-batch-rows')
  if (!rows) return
  const allRows = rows.querySelectorAll('.rm-batch-row')
  if (allRows.length <= 1) return
  if (rowEl && rowEl.parentNode === rows) {
    rows.removeChild(rowEl)
  }
}

/**
 * 배치 생성 패널의 경로 선택 버튼 핸들러.
 * worktree:select-path IPC 호출 후 #rm-batch-path-input 값 설정.
 */
async function onBatchSelectPathClicked() {
  const result = await window.electronAPI.invoke('worktree:select-path')
  if (result && result.success && result.path) {
    const pathInput = document.getElementById('rm-batch-path-input')
    const pathError = document.getElementById('rm-batch-path-error')
    if (pathInput) pathInput.value = result.path
    if (pathError) pathError.style.display = 'none'
  }
}

/**
 * 배치 입력 검증: 경로 비어있음, 브랜치명 비어있음, 중복 브랜치명 검사.
 * @returns {boolean} 유효하면 true
 */
function validateBatchInputs() {
  const pathInput = document.getElementById('rm-batch-path-input')
  const pathError = document.getElementById('rm-batch-path-error')
  const rows = document.getElementById('rm-batch-rows')

  const path = pathInput ? pathInput.value.trim() : ''
  if (!path) {
    if (pathError) {
      pathError.textContent = 'Target directory is required'
      pathError.style.display = 'block'
    }
    return false
  }
  if (pathError) pathError.style.display = 'none'

  if (!rows) return true

  const branchInputs = rows.querySelectorAll('.rm-batch-branch-input')
  const branches = []
  for (const input of branchInputs) {
    const val = input.value.trim()
    if (!val) {
      input.classList.add('input-error')
      return false
    }
    if (branches.includes(val)) {
      input.classList.add('input-error')
      return false
    }
    branches.push(val)
  }

  return true
}

/**
 * 배치 생성 제출 핸들러.
 * 각 행의 브랜치에 대해 순차적으로 worktree:create-single IPC 호출.
 * 성공/실패를 행별로 표시한 후 목록 갱신.
 * @param {Function} onRepoSelectedFn - 목록 갱신 콜백
 * @param {Function} showToastFn - 토스트 표시 콜백
 */
async function onBatchCreateSubmit(onRepoSelectedFn, showToastFn) {
  if (_isBatchCreating) return
  if (!validateBatchInputs()) return

  _isBatchCreating = true

  const pathInput = document.getElementById('rm-batch-path-input')
  const targetPath = pathInput ? pathInput.value.trim() : ''
  const rows = document.getElementById('rm-batch-rows')
  const submitBtn = document.getElementById('rm-batch-submit-btn')

  if (submitBtn) submitBtn.disabled = true

  const rowEls = rows ? Array.from(rows.querySelectorAll('.rm-batch-row')) : []

  // Disable all branch inputs
  for (const rowEl of rowEls) {
    const input = rowEl.querySelector('.rm-batch-branch-input')
    if (input) input.disabled = true
  }

  let successCount = 0

  for (const rowEl of rowEls) {
    const input = rowEl.querySelector('.rm-batch-branch-input')
    const statusSpan = rowEl.querySelector('.rm-batch-row-status')
    const newBranch = input ? input.value.trim() : ''

    try {
      const result = await window.electronAPI.invoke('worktree:create-single', {
        repoId: _currentRepoId,
        baseBranch: 'HEAD',
        newBranch,
        targetPath,
      })

      if (result && result.success) {
        if (statusSpan) {
          statusSpan.textContent = 'Created'
          statusSpan.className = 'rm-batch-row-status rm-batch-status-success'
        }
        successCount++
      } else {
        const errMsg = (result && result.error) ? result.error : 'Failed'
        if (statusSpan) {
          statusSpan.textContent = 'Failed: ' + errMsg
          statusSpan.className = 'rm-batch-row-status rm-batch-status-error'
        }
      }
    } catch (e) {
      const errMsg = e && e.message ? e.message : 'Error'
      if (statusSpan) {
        statusSpan.textContent = 'Failed: ' + errMsg
        statusSpan.className = 'rm-batch-row-status rm-batch-status-error'
      }
    }
  }

  if (submitBtn) submitBtn.disabled = false
  _isBatchCreating = false

  // Refresh list after all rows processed
  if (onRepoSelectedFn) await onRepoSelectedFn(_currentRepoId)

  // Show toast if any success
  if (successCount > 0 && showToastFn) {
    showToastFn('repo-worktree.batch.create.success', 'success')
  }

  // Hide panel only if ALL rows succeeded
  if (successCount === rowEls.length && rowEls.length > 0) {
    hideBatchCreatePanel()
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showCreateForm,
    hideCreateForm,
    setCreatePending,
    validateCreateInputs,
    onSelectPathClicked,
    onCreateSubmit,
    setCurrentRepoId,
    showBatchCreatePanel,
    hideBatchCreatePanel,
    addWorktreeRow,
    removeWorktreeRow,
    onBatchSelectPathClicked,
    validateBatchInputs,
    onBatchCreateSubmit,
  }
}

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
    setTimeout(() => {
      toast.style.display = 'none'
    }, 3000)
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

  const rmAddBtn = document.getElementById('rm-add-btn')
  const rmBatchBtn = document.getElementById('rm-batch-btn')
  const rmSelectPathBtn = document.getElementById('rm-select-path-btn')
  const rmCreateBtn = document.getElementById('rm-create-btn')
  const rmCreateCancelBtn = document.getElementById('rm-create-cancel-btn')
  const rmBatchSelectPathBtn = document.getElementById('rm-batch-select-path-btn')
  const rmBatchAddRowBtn = document.getElementById('rm-batch-add-row-btn')
  const rmBatchSubmitBtn = document.getElementById('rm-batch-submit-btn')
  const rmBatchCancelBtn = document.getElementById('rm-batch-cancel-btn')

  async function onRepoSelected(repoId) {
    if (!repoId) {
      currentRepoId = null
      _currentRepoId = null
      rmListSection.style.display = 'none'
      if (rmRefreshBtn) rmRefreshBtn.style.display = 'none'
      if (rmAddBtn) rmAddBtn.style.display = 'none'
      if (rmBatchBtn) rmBatchBtn.style.display = 'none'
      hideCreateForm()
      hideBatchCreatePanel()
      return
    }

    currentRepoId = repoId
    _currentRepoId = repoId
    setCurrentRepoId(repoId)
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
      if (rmAddBtn) rmAddBtn.style.display = 'inline-block'
      if (rmBatchBtn) rmBatchBtn.style.display = 'inline-block'
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
        repoId: currentRepoId,
        worktreePath,
        branch
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

  if (rmRefreshBtn) {
    rmRefreshBtn.addEventListener('click', onRefresh)
  }

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

  // Single create form buttons
  if (rmAddBtn) rmAddBtn.addEventListener('click', showCreateForm)
  if (rmSelectPathBtn) rmSelectPathBtn.addEventListener('click', onSelectPathClicked)
  if (rmCreateBtn) rmCreateBtn.addEventListener('click', () => onCreateSubmit(onRepoSelected, showToast))
  if (rmCreateCancelBtn) rmCreateCancelBtn.addEventListener('click', hideCreateForm)

  // Batch create panel buttons
  if (rmBatchBtn) {
    rmBatchBtn.addEventListener('click', () => {
      showBatchCreatePanel()
      addWorktreeRow()
    })
  }
  if (rmBatchSelectPathBtn) rmBatchSelectPathBtn.addEventListener('click', onBatchSelectPathClicked)
  if (rmBatchAddRowBtn) rmBatchAddRowBtn.addEventListener('click', () => addWorktreeRow())
  if (rmBatchSubmitBtn) rmBatchSubmitBtn.addEventListener('click', () => onBatchCreateSubmit(onRepoSelected, showToast))
  if (rmBatchCancelBtn) rmBatchCancelBtn.addEventListener('click', hideBatchCreatePanel)

  window.loadRepoWorktreeTab = loadRepoWorktreeTab

  // Register re-render callback for language switching
  window.i18n.registerReRender(() => {
    if (lastWorktrees.length > 0) {
      renderWorktreeList(lastWorktrees)
    }
  })
})
