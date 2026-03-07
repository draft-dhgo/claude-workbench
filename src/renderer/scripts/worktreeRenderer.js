window.addEventListener('DOMContentLoaded', () => {
  // DOM 참조
  const wtSetSelect      = document.getElementById('wt-set-select')
  const wtNoSetsMsg      = document.getElementById('wt-no-sets-msg')
  const wtRepoSection    = document.getElementById('wt-repo-section')
  const wtRepoList       = document.getElementById('wt-repo-list')
  const wtFetchBtn       = document.getElementById('wt-fetch-btn')
  const wtBranchSection  = document.getElementById('wt-branch-section')
  const wtNewBranch      = document.getElementById('wt-new-branch')
  const wtBranchError    = document.getElementById('wt-branch-error')
  const wtPathSection    = document.getElementById('wt-path-section')
  const wtTargetPath     = document.getElementById('wt-target-path')
  const wtSelectPathBtn  = document.getElementById('wt-select-path-btn')
  const wtPathError      = document.getElementById('wt-path-error')
  const wtActionSection  = document.getElementById('wt-action-section')
  const wtCloneBtn       = document.getElementById('wt-clone-btn')
  const wtResultSection  = document.getElementById('wt-result-section')
  const wtProgressList   = document.getElementById('wt-progress-list')
  const wtSummary        = document.getElementById('wt-summary')

  // 상태 변수
  let currentSetId = null
  let currentSetRepos = []
  let selectedTargetPath = ''
  let isFetching = false
  let isCloning = false
  const progressMap = new Map()

  // ── 보조 함수 ────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function showSections(flags) {
    wtRepoSection.style.display   = flags.repo   ? 'block' : 'none'
    wtBranchSection.style.display = flags.branch ? 'block' : 'none'
    wtPathSection.style.display   = flags.path   ? 'block' : 'none'
    wtActionSection.style.display = flags.action ? 'block' : 'none'
    wtResultSection.style.display = flags.result ? 'block' : 'none'
  }

  function getSelectedBranch(repoId) {
    const sel = wtRepoList.querySelector('.wt-branch-select[data-repo-id="' + repoId + '"]')
    return sel ? sel.value : ''
  }

  function resetResultSection(repos) {
    progressMap.clear()
    repos.forEach(r => progressMap.set(r.id, { repoName: r.name, status: 'pending', message: '대기 중' }))
    wtSummary.textContent = ''
    renderProgressList()
  }

  function showSummary(succeeded, failed, total) {
    wtSummary.textContent = '완료: ' + succeeded + ' / 실패: ' + failed + ' / 전체: ' + total
  }

  // ── 렌더링 함수 ──────────────────────────────────────────────────────────────

  function renderRepoList(repos) {
    wtRepoList.innerHTML = ''
    repos.forEach(repo => {
      const row = document.createElement('div')
      row.className = 'wt-repo-row'
      const nameSpan = '<span class="wt-repo-name">' + escapeHtml(repo.name) + '</span>'
      let branchCell
      if (repo.baseBranch) {
        branchCell = '<span class="wt-branch-saved">' + escapeHtml(repo.baseBranch) + ' (저장됨)</span>'
      } else {
        branchCell =
          '<select class="wt-branch-select" data-repo-id="' + repo.id + '">' +
            '<option value="">(선택안됨)</option>' +
          '</select>'
      }
      row.innerHTML = nameSpan + branchCell
      wtRepoList.appendChild(row)
    })
  }

  function renderProgressList() {
    wtProgressList.innerHTML = ''
    progressMap.forEach((info) => {
      const row = document.createElement('div')
      row.className = 'wt-progress-row'
      const badgeClass = {
        pending: 'wt-badge-pending',
        running: 'wt-badge-running',
        success: 'wt-badge-success',
        error:   'wt-badge-error'
      }[info.status] || 'wt-badge-pending'
      const badgeLabel = {
        pending: '대기',
        running: '진행',
        success: '완료',
        error:   '실패'
      }[info.status] || '대기'
      row.innerHTML =
        '<span class="wt-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
        '<span class="wt-progress-name">' + escapeHtml(info.repoName) + '</span>' +
        '<span class="wt-progress-msg">' + escapeHtml(info.message) + '</span>'
      wtProgressList.appendChild(row)
    })
  }

  // ── 비동기 로직 함수 ─────────────────────────────────────────────────────────

  async function loadWorktreeSets() {
    currentSetId = null
    currentSetRepos = []
    selectedTargetPath = ''
    wtTargetPath.value = ''
    showSections({ repo: false, branch: false, path: false, action: false, result: false })

    const result = await window.electronAPI.invoke('workdir-set:list')
    if (!result.success) return

    wtSetSelect.innerHTML = '<option value="">-- 세트를 선택하세요 --</option>'

    if (result.sets.length === 0) {
      wtNoSetsMsg.style.display = 'block'
      wtSetSelect.style.display = 'none'
      return
    }

    wtNoSetsMsg.style.display = 'none'
    wtSetSelect.style.display = ''
    result.sets.forEach(set => {
      const opt = document.createElement('option')
      opt.value = set.id
      opt.textContent = set.name
      wtSetSelect.appendChild(opt)
    })
  }

  async function loadBranchesForUnset(repos) {
    const hasUnset = repos.some(r => !r.baseBranch)
    if (!hasUnset || !currentSetId) return

    const result = await window.electronAPI.invoke('worktree:list-branches', { setId: currentSetId })
    if (!result.success) return

    const repoBranches = result.repoBranches || []
    repos.filter(r => !r.baseBranch).forEach(repo => {
      const selectEl = wtRepoList.querySelector('.wt-branch-select[data-repo-id="' + repo.id + '"]')
      if (!selectEl) return
      const found = repoBranches.find(rb => rb.repoId === repo.id)
      if (!found) return
      found.branches.forEach(b => {
        const opt = document.createElement('option')
        opt.value = b
        opt.textContent = b
        selectEl.appendChild(opt)
      })
    })
  }

  async function onSetSelected(setId) {
    if (!setId) {
      showSections({ repo: false, branch: false, path: false, action: false, result: false })
      return
    }

    const result = await window.electronAPI.invoke('workdir-set:get', setId)
    if (!result.success) return

    currentSetId = setId
    currentSetRepos = result.set.repositories  // [{id, name, path, baseBranch}]

    renderRepoList(currentSetRepos)
    await loadBranchesForUnset(currentSetRepos)
    showSections({ repo: true, branch: true, path: true, action: true, result: false })
  }

  async function onFetchClick() {
    if (isFetching || !currentSetId) return
    isFetching = true
    wtFetchBtn.disabled = true
    wtFetchBtn.textContent = '업데이트 중...'

    await window.electronAPI.invoke('worktree:fetch', { setId: currentSetId })
    await loadBranchesForUnset(currentSetRepos)

    isFetching = false
    wtFetchBtn.disabled = false
    wtFetchBtn.textContent = '원격 업데이트'
  }

  async function onSelectPathClick() {
    const result = await window.electronAPI.invoke('worktree:select-path')
    if (result.success) {
      selectedTargetPath = result.path
      wtTargetPath.value = result.path
      wtPathError.style.display = 'none'
    }
  }

  async function onCloneClick() {
    if (isCloning) return

    // 유효성 검사
    const newBranch = wtNewBranch.value.trim()
    let valid = true
    if (!newBranch) {
      wtBranchError.textContent = '새 브랜치명을 입력해주세요.'
      wtBranchError.style.display = 'block'
      valid = false
    } else {
      wtBranchError.style.display = 'none'
    }
    if (!selectedTargetPath) {
      wtPathError.textContent = '워크트리 생성 경로를 선택해주세요.'
      wtPathError.style.display = 'block'
      valid = false
    } else {
      wtPathError.style.display = 'none'
    }
    if (!valid) return

    // repos 배열 조합
    const repos = currentSetRepos.map(repo => ({
      id:         repo.id,
      path:       repo.path,
      name:       repo.name,
      baseBranch: repo.baseBranch || getSelectedBranch(repo.id)
    }))

    // 결과 섹션 초기화 및 표시
    resetResultSection(repos)
    showSections({ repo: true, branch: true, path: true, action: true, result: true })

    isCloning = true
    wtCloneBtn.disabled = true

    const result = await window.electronAPI.invoke('worktree:create-all', {
      setId:      currentSetId,
      newBranch,
      targetPath: selectedTargetPath,
      repos
    })

    isCloning = false
    wtCloneBtn.disabled = false

    if (result.success) {
      showSummary(result.succeeded.length, result.failed.length, repos.length)
    }
  }

  function handleProgress(payload) {
    progressMap.set(payload.repoId, { repoName: payload.repoName, status: payload.status, message: payload.message })
    renderProgressList()
  }

  // ── 이벤트 리스너 등록 ────────────────────────────────────────────────────────

  wtSetSelect.addEventListener('change', () => onSetSelected(wtSetSelect.value))
  wtFetchBtn.addEventListener('click', onFetchClick)
  wtSelectPathBtn.addEventListener('click', onSelectPathClick)
  wtCloneBtn.addEventListener('click', onCloneClick)

  // worktree:progress 이벤트 수신 등록
  window.electronAPI.on('worktree:progress', handleProgress)

  // 전역 노출
  window.loadWorktreeSets = loadWorktreeSets
})
