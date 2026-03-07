window.addEventListener('DOMContentLoaded', () => {
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

  let currentRepoId = null
  let pendingDelete  = null
  let isLoading     = false

  /**
   * HTML 이스케이프 유틸.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  /**
   * 로딩 상태 진입/해제.
   * @param {boolean} loading
   */
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

  /**
   * 화면 우하단 토스트 메시지 표시.
   * @param {string} message
   * @param {'success'|'error'|'warning'} type
   */
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

  /**
   * 인라인 모달 오버레이 표시.
   * @param {string} worktreePath
   * @param {string} branch
   * @param {boolean} isPushed
   */
  function showDeleteConfirm(worktreePath, branch, isPushed) {
    pendingDelete = { worktreePath, branch }

    // 브랜치명 표시
    rmConfirmBranch.textContent = branch || '(detached HEAD)'

    // push 상태 분기
    if (!isPushed) {
      rmConfirmWarn.textContent =
        '이 워크트리에 push되지 않은 커밋이 있습니다. 삭제하면 해당 작업 내용이 영구히 손실됩니다.'
      rmConfirmWarn.style.display = 'block'
      rmConfirmSafe.style.display = 'none'
    } else {
      rmConfirmSafe.textContent = '안전하게 삭제할 수 있습니다.'
      rmConfirmSafe.style.display = 'block'
      rmConfirmWarn.style.display = 'none'
    }

    rmConfirmOverlay.style.display = 'flex'
  }

  /**
   * 인라인 모달 오버레이 숨김.
   */
  function hideDeleteConfirm() {
    pendingDelete = null
    rmConfirmOverlay.style.display = 'none'
  }

  /**
   * 워크트리 배열을 카드 형태로 DOM에 렌더링.
   * @param {Array<{branch, worktreePath, isPushed}>} worktrees
   */
  function renderWorktreeList(worktrees) {
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
      const badgeLabel = wt.isPushed ? 'push됨' : '미push'
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
            disabledAttr + '>삭제</button>' +
        '</div>'

      rmWorktreeList.appendChild(card)
    })
  }

  /**
   * 레포 드롭다운 선택 변경 시 해당 레포의 워크트리 목록 로드.
   * @param {string} repoId
   */
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
        showToast('워크트리 목록 조회 실패: ' + (result.error || ''), 'error')
        return
      }

      renderWorktreeList(result.worktrees || [])
      if (rmRefreshBtn) rmRefreshBtn.style.display = 'inline-block'
    } catch (e) {
      setLoading(false)
      showToast('워크트리 목록 조회 중 오류가 발생했습니다.', 'error')
    }
  }

  /**
   * 삭제 확인 후 IPC 호출 실행.
   */
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
        showToast('워크트리가 삭제되었습니다.', 'success')
        await onRepoSelected(currentRepoId)
      } else {
        showToast('삭제 실패: ' + (result.error || ''), 'error')
        rmRepoSelect.disabled = false
        if (rmRefreshBtn) rmRefreshBtn.disabled = false
      }
    } catch (e) {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
      rmRepoSelect.disabled = false
      if (rmRefreshBtn) rmRefreshBtn.disabled = false
    }
  }

  /**
   * 현재 선택된 레포의 워크트리 목록 재로드 (새로고침 버튼 핸들러).
   */
  async function onRefresh() {
    if (!currentRepoId || isLoading) return
    await onRepoSelected(currentRepoId)
  }

  /**
   * 탭 진입 시 레포 목록 로드. window.loadRepoWorktreeTab() 으로 renderer.js가 호출.
   */
  async function loadRepoWorktreeTab() {
    // 상태 초기화
    currentRepoId = null
    pendingDelete = null
    isLoading = false
    rmListSection.style.display = 'none'
    rmLoading.style.display = 'none'
    rmConfirmOverlay.style.display = 'none'
    if (rmRefreshBtn) rmRefreshBtn.style.display = 'none'
    if (rmStatusBar) rmStatusBar.textContent = ''

    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (!result.success) return

      const repos = result.repos || []

      // 드롭다운 초기화
      rmRepoSelect.innerHTML = '<option value="">-- 레포를 선택하세요 --</option>'

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
      showToast('레포 목록을 불러올 수 없습니다.', 'error')
    }
  }

  // 이벤트 리스너
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

  window.loadRepoWorktreeTab = loadRepoWorktreeTab
})
