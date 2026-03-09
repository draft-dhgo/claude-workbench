// ─── Worktree Create Tab Renderer ──────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady

  const wcRepoList      = document.getElementById('wc-repo-list')
  const wcNoRepos       = document.getElementById('wc-no-repos')
  const wcBranchSection = document.getElementById('wc-branch-section')
  const wcBranchList    = document.getElementById('wc-branch-list')
  const wcConfigSection = document.getElementById('wc-config-section')
  const wcNewBranch     = document.getElementById('wc-new-branch')
  const wcTargetPath    = document.getElementById('wc-target-path')
  const wcBrowseBtn     = document.getElementById('wc-browse-btn')
  const wcError         = document.getElementById('wc-error')
  const wcCreateBtn     = document.getElementById('wc-create-btn')
  const wcResult        = document.getElementById('wc-result')

  let _allRepos = []
  let _selected = {} // repoId -> { id, name, path, baseBranch, branches[] }
  let _creating = false

  function showToast(message, type) {
    const toast = document.getElementById('toast')
    if (!toast) return
    toast.textContent = message
    toast.className = 'toast toast-' + type
    toast.style.display = 'block'
    setTimeout(() => { toast.style.display = 'none' }, 3000)
  }

  function renderRepoList() {
    wcRepoList.innerHTML = ''
    if (_allRepos.length === 0) {
      wcNoRepos.style.display = 'block'
      return
    }
    wcNoRepos.style.display = 'none'

    _allRepos.forEach(repo => {
      const label = document.createElement('label')
      label.className = 'wc-repo-item'

      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.value = repo.id
      if (_selected[repo.id]) cb.checked = true
      cb.addEventListener('change', () => onRepoToggle(repo, cb.checked))

      const nameEl = document.createElement('span')
      nameEl.className = 'wc-repo-name'
      nameEl.textContent = repo.name

      const pathEl = document.createElement('span')
      pathEl.className = 'wc-repo-path'
      pathEl.textContent = repo.path

      label.appendChild(cb)
      label.appendChild(nameEl)
      label.appendChild(pathEl)
      wcRepoList.appendChild(label)
    })
  }

  async function onRepoToggle(repo, checked) {
    if (checked) {
      _selected[repo.id] = { id: repo.id, name: repo.name, path: repo.path, baseBranch: null, branches: [] }
      // Fetch branches in background
      try {
        const res = await window.electronAPI.invoke('worktree:list-branches-single', { repoId: repo.id })
        if (res.success && _selected[repo.id]) {
          _selected[repo.id].branches = res.branches || []
          renderBranchSelectors() // re-render with fetched branches
        }
      } catch (e) { /* ignore */ }
    } else {
      delete _selected[repo.id]
    }
    updateVisibility()
    renderBranchSelectors()
  }

  function updateVisibility() {
    const hasSelection = Object.keys(_selected).length > 0
    wcBranchSection.style.display = hasSelection ? 'block' : 'none'
    wcConfigSection.style.display = hasSelection ? 'block' : 'none'
  }

  function renderBranchSelectors() {
    wcBranchList.innerHTML = ''
    Object.values(_selected).forEach(repo => {
      const row = document.createElement('div')
      row.className = 'wc-branch-row'

      const nameEl = document.createElement('span')
      nameEl.className = 'wc-branch-repo-name'
      nameEl.textContent = repo.name

      const wrapper = document.createElement('div')
      wrapper.className = 'wc-branch-input-wrapper'

      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'form-input wc-branch-input'
      input.placeholder = 'Search branch...'
      input.value = repo.baseBranch || ''

      const dropdown = document.createElement('div')
      dropdown.className = 'wc-branch-dropdown'
      dropdown.style.display = 'none'

      function showDropdown(filter) {
        dropdown.innerHTML = ''
        const list = repo.branches || []
        const filtered = filter
          ? list.filter(b => b.toLowerCase().includes(filter.toLowerCase()))
          : list
        if (filtered.length === 0) { dropdown.style.display = 'none'; return }
        filtered.slice(0, 50).forEach(b => {
          const item = document.createElement('div')
          item.className = 'wc-branch-dropdown-item'
          item.textContent = b
          item.addEventListener('mousedown', (e) => {
            e.preventDefault()
            input.value = b
            _selected[repo.id].baseBranch = b
            dropdown.style.display = 'none'
          })
          dropdown.appendChild(item)
        })
        dropdown.style.display = 'block'
      }

      input.addEventListener('focus', () => showDropdown(input.value))
      input.addEventListener('input', () => {
        _selected[repo.id].baseBranch = input.value
        showDropdown(input.value)
      })
      input.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none' }, 150)
      })

      wrapper.appendChild(input)
      wrapper.appendChild(dropdown)
      row.appendChild(nameEl)
      row.appendChild(wrapper)
      wcBranchList.appendChild(row)
    })
  }

  async function onBrowse() {
    const res = await window.electronAPI.invoke('worktree:select-path')
    if (res && res.success && res.path) {
      wcTargetPath.value = res.path
      if (wcError) wcError.style.display = 'none'
    }
  }

  async function onCreate() {
    if (_creating) return
    const repos = Object.values(_selected)
    if (repos.length === 0) return

    const newBranch = wcNewBranch.value.trim()
    const targetPath = wcTargetPath.value.trim()

    if (!newBranch || !targetPath) {
      wcError.textContent = 'Branch name and target path are required'
      wcError.style.display = 'block'
      return
    }

    for (const repo of repos) {
      if (!repo.baseBranch) {
        wcError.textContent = 'Select base branch for: ' + repo.name
        wcError.style.display = 'block'
        return
      }
    }

    wcError.style.display = 'none'
    _creating = true
    wcCreateBtn.disabled = true
    wcCreateBtn.textContent = 'Creating...'
    wcResult.innerHTML = ''
    wcResult.style.display = 'block'

    let successCount = 0
    for (const repo of repos) {
      const item = document.createElement('div')
      item.className = 'wc-result-item'
      item.textContent = repo.name + ': creating...'
      wcResult.appendChild(item)

      try {
        const res = await window.electronAPI.invoke('worktree:create-single', {
          repoId: repo.id,
          baseBranch: repo.baseBranch,
          newBranch,
          targetPath,
        })
        if (res && res.success) {
          item.textContent = repo.name + ': OK — ' + (res.worktreePath || '')
          item.className = 'wc-result-item wc-result-success'
          successCount++
        } else {
          item.textContent = repo.name + ': Failed — ' + (res?.error || 'unknown')
          item.className = 'wc-result-item wc-result-error'
        }
      } catch (e) {
        item.textContent = repo.name + ': Error — ' + (e.message || 'unknown')
        item.className = 'wc-result-item wc-result-error'
      }
    }

    _creating = false
    wcCreateBtn.disabled = false
    wcCreateBtn.textContent = 'Create Worktrees'

    if (successCount > 0) {
      showToast(successCount + ' worktree(s) created', 'success')
    }
  }

  async function loadWorktreeCreateTab() {
    _selected = {}
    _creating = false
    wcBranchSection.style.display = 'none'
    wcConfigSection.style.display = 'none'
    wcResult.style.display = 'none'
    wcResult.innerHTML = ''
    if (wcNewBranch) wcNewBranch.value = ''
    if (wcTargetPath) wcTargetPath.value = ''
    if (wcError) wcError.style.display = 'none'

    try {
      const res = await window.electronAPI.invoke('repo:list')
      if (!res.success) return
      _allRepos = res.repos || []
      renderRepoList()
    } catch (e) {
      showToast('Failed to load repos', 'error')
    }
  }

  wcBrowseBtn.addEventListener('click', onBrowse)
  wcCreateBtn.addEventListener('click', onCreate)

  window.loadWorktreeCreateTab = loadWorktreeCreateTab
})
