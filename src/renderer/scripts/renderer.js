window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const versionEl = document.getElementById('version')
  const addBtn = document.getElementById('add-repo-btn')
  const searchInput = document.getElementById('repo-search')
  const repoTable = document.getElementById('repo-table')
  const repoTbody = document.getElementById('repo-tbody')
  const emptyState = document.getElementById('empty-state')
  const statusBar = document.getElementById('status-bar')
  const toast = document.getElementById('toast')
  const t = window.i18n.t

  // Version display
  try {
    const version = await window.electronAPI.invoke('app:version')
    versionEl.textContent = t('app.version.prefix') + 'v' + version
  } catch (e) {
    versionEl.textContent = t('app.version.prefix') + t('app.version.unknown')
  }

  let allRepos = []

  function showToast(message, type) {
    toast.textContent = message
    toast.className = 'toast toast-' + type
    toast.style.display = 'block'
    setTimeout(() => { toast.style.display = 'none' }, 3000)
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function renderRepos(repos) {
    repoTbody.innerHTML = ''
    if (repos.length === 0) {
      repoTable.style.display = 'none'
      emptyState.style.display = 'block'
      statusBar.textContent = t('repos.empty')
      return
    }

    emptyState.style.display = 'none'
    repoTable.style.display = 'table'

    repos.forEach(repo => {
      const tr = document.createElement('tr')
      tr.innerHTML =
        '<td><span class="repo-name">' + escapeHtml(repo.name) + '</span></td>' +
        '<td><span class="repo-path">' + escapeHtml(repo.path) + '</span></td>' +
        '<td><span class="branch-badge">' + escapeHtml(repo.branch || 'unknown') + '</span></td>' +
        '<td class="col-action"><button class="btn btn-danger remove-btn" data-id="' + repo.id + '" title="' + t('repos.col.action.unregister') + '">&times;</button></td>'
      repoTbody.appendChild(tr)
    })

    statusBar.textContent = t('repos.count', { n: repos.length })
  }

  async function loadRepos() {
    statusBar.textContent = t('app.version.loading')
    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (result.success) {
        allRepos = result.repos
        renderRepos(allRepos)
      }
    } catch (e) {
      showToast(t('repos.error.load'), 'error')
    }
  }

  addBtn.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.invoke('repo:add')
      if (result.success) {
        await loadRepos()
      } else if (result.error === 'NOT_GIT_REPO') {
        showToast(t('repos.error.not_git'), 'error')
      } else if (result.error === 'DUPLICATE_PATH') {
        showToast(t('repos.error.duplicate'), 'warning')
      }
    } catch (e) {
      showToast(t('repos.error.add'), 'error')
    }
  })

  repoTbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('.remove-btn')
    if (!btn) return
    const id = btn.dataset.id
    try {
      const result = await window.electronAPI.invoke('repo:remove', id)
      if (result.success) {
        await loadRepos()
      }
    } catch (err) {
      showToast(t('repos.error.remove'), 'error')
    }
  })

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase()
    const filtered = allRepos.filter(r =>
      r.name.toLowerCase().includes(query) || r.path.toLowerCase().includes(query)
    )
    renderRepos(filtered)
  })

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.querySelectorAll('.tab-content').forEach(c => {
        c.style.display = 'none'
        c.classList.remove('active')
      })
      const tabId = 'tab-' + btn.dataset.tab
      const tabEl = document.getElementById(tabId)
      if (tabEl) {
        tabEl.style.display = 'block'
        tabEl.classList.add('active')
      }
      if (btn.dataset.tab === 'sets' && typeof window.loadSets === 'function') {
        window.loadSets()
      }
      if (btn.dataset.tab === 'worktree' && typeof window.loadWorktreeSets === 'function') {
        window.loadWorktreeSets()
      }
      if (btn.dataset.tab === 'workspace' && typeof window.loadWorkspaceTab === 'function') {
        window.loadWorkspaceTab()
      }
      if (btn.dataset.tab === 'repo-worktree' && typeof window.loadRepoWorktreeTab === 'function') {
        window.loadRepoWorktreeTab()
      }
      if (btn.dataset.tab === 'command-queue' && typeof window.loadCommandQueueTab === 'function') {
        window.loadCommandQueueTab()
      }
    })
  })

  // Register re-render callback for language switching
  window.i18n.registerReRender(() => {
    if (allRepos.length > 0) {
      renderRepos(allRepos)
    } else {
      statusBar.textContent = t('repos.empty')
    }
    // Re-render version
    window.electronAPI.invoke('app:version').then(version => {
      versionEl.textContent = t('app.version.prefix') + 'v' + version
    }).catch(() => {
      versionEl.textContent = t('app.version.prefix') + t('app.version.unknown')
    })
  })

  await loadRepos()
})
