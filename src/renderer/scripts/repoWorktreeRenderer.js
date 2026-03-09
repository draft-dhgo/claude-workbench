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
