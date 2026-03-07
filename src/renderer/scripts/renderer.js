window.addEventListener('DOMContentLoaded', async () => {
  const versionEl = document.getElementById('version')
  const addBtn = document.getElementById('add-repo-btn')
  const searchInput = document.getElementById('repo-search')
  const repoTable = document.getElementById('repo-table')
  const repoTbody = document.getElementById('repo-tbody')
  const emptyState = document.getElementById('empty-state')
  const statusBar = document.getElementById('status-bar')
  const toast = document.getElementById('toast')

  // 버전 표시
  try {
    const version = await window.electronAPI.invoke('app:version')
    versionEl.textContent = `앱 버전: v${version}`
  } catch (e) {
    versionEl.textContent = '앱 버전: 알 수 없음'
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
      statusBar.textContent = '등록된 저장소가 없습니다'
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
        '<td class="col-action"><button class="btn btn-danger remove-btn" data-id="' + repo.id + '" title="등록 해제">&times;</button></td>'
      repoTbody.appendChild(tr)
    })

    statusBar.textContent = repos.length + '개의 저장소가 등록되어 있습니다'
  }

  async function loadRepos() {
    statusBar.textContent = '불러오는 중...'
    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (result.success) {
        allRepos = result.repos
        renderRepos(allRepos)
      }
    } catch (e) {
      showToast('저장소 목록을 불러올 수 없습니다.', 'error')
    }
  }

  addBtn.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.invoke('repo:add')
      if (result.success) {
        await loadRepos()
      } else if (result.error === 'NOT_GIT_REPO') {
        showToast('유효한 Git 저장소가 아닙니다. .git 디렉토리가 없습니다.', 'error')
      } else if (result.error === 'DUPLICATE_PATH') {
        showToast('이미 등록된 저장소입니다.', 'warning')
      }
    } catch (e) {
      showToast('저장소 추가 중 오류가 발생했습니다.', 'error')
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
      showToast('저장소 삭제 중 오류가 발생했습니다.', 'error')
    }
  })

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase()
    const filtered = allRepos.filter(r =>
      r.name.toLowerCase().includes(query) || r.path.toLowerCase().includes(query)
    )
    renderRepos(filtered)
  })

  // 탭 전환
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
    })
  })

  await loadRepos()
})
