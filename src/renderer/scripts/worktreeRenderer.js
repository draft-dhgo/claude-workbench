window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
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
  const t = window.i18n.t

  let currentSetId = null
  let currentSetRepos = []
  let selectedTargetPath = ''
  let isFetching = false
  let isCloning = false
  const progressMap = new Map()

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
    repos.forEach(r => progressMap.set(r.id, { repoName: r.name, status: 'pending', message: t('worktree.status.pending') }))
    wtSummary.textContent = ''
    renderProgressList()
  }

  function showSummary(succeeded, failed, total) {
    wtSummary.textContent = t('worktree.summary', { s: succeeded, f: failed, t: total })
  }

  function renderRepoList(repos) {
    wtRepoList.innerHTML = ''
    repos.forEach(repo => {
      const row = document.createElement('div')
      row.className = 'wt-repo-row'
      const nameSpan = '<span class="wt-repo-name">' + escapeHtml(repo.name) + '</span>'
      let branchCell
      if (repo.baseBranch) {
        branchCell = '<span class="wt-branch-saved">' + escapeHtml(repo.baseBranch) + ' ' + t('worktree.branch.saved') + '</span>'
      } else {
        branchCell =
          '<select class="wt-branch-select" data-repo-id="' + repo.id + '">' +
            '<option value="">' + t('worktree.branch.none') + '</option>' +
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
        pending: t('worktree.progress.pending'),
        running: t('worktree.progress.running'),
        success: t('worktree.progress.success'),
        error:   t('worktree.progress.error')
      }[info.status] || t('worktree.progress.pending')
      row.innerHTML =
        '<span class="wt-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
        '<span class="wt-progress-name">' + escapeHtml(info.repoName) + '</span>' +
        '<span class="wt-progress-msg">' + escapeHtml(info.message) + '</span>'
      wtProgressList.appendChild(row)
    })
  }

  async function loadWorktreeSets() {
    currentSetId = null
    currentSetRepos = []
    selectedTargetPath = ''
    wtTargetPath.value = ''
    showSections({ repo: false, branch: false, path: false, action: false, result: false })

    const result = await window.electronAPI.invoke('workdir-set:list')
    if (!result.success) return

    wtSetSelect.innerHTML = '<option value="">' + t('worktree.select.placeholder') + '</option>'

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
    currentSetRepos = result.set.repositories

    renderRepoList(currentSetRepos)
    await loadBranchesForUnset(currentSetRepos)
    showSections({ repo: true, branch: true, path: true, action: true, result: false })
  }

  async function onFetchClick() {
    if (isFetching || !currentSetId) return
    isFetching = true
    wtFetchBtn.disabled = true
    wtFetchBtn.textContent = t('worktree.fetch.loading')

    await window.electronAPI.invoke('worktree:fetch', { setId: currentSetId })
    await loadBranchesForUnset(currentSetRepos)

    isFetching = false
    wtFetchBtn.disabled = false
    wtFetchBtn.textContent = t('worktree.fetch')
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

    const newBranch = wtNewBranch.value.trim()
    let valid = true
    if (!newBranch) {
      wtBranchError.textContent = t('worktree.error.branch_empty')
      wtBranchError.style.display = 'block'
      valid = false
    } else {
      wtBranchError.style.display = 'none'
    }
    if (!selectedTargetPath) {
      wtPathError.textContent = t('worktree.error.path_empty')
      wtPathError.style.display = 'block'
      valid = false
    } else {
      wtPathError.style.display = 'none'
    }
    if (!valid) return

    const repos = currentSetRepos.map(repo => ({
      id:         repo.id,
      path:       repo.path,
      name:       repo.name,
      baseBranch: repo.baseBranch || getSelectedBranch(repo.id)
    }))

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

  wtSetSelect.addEventListener('change', () => onSetSelected(wtSetSelect.value))
  wtFetchBtn.addEventListener('click', onFetchClick)
  wtSelectPathBtn.addEventListener('click', onSelectPathClick)
  wtCloneBtn.addEventListener('click', onCloneClick)

  window.electronAPI.on('worktree:progress', handleProgress)

  window.loadWorktreeSets = loadWorktreeSets

  // Register re-render callback for language switching
  window.i18n.registerReRender(() => {
    renderProgressList()
  })
})
