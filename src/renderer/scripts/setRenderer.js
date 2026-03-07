window.addEventListener('DOMContentLoaded', () => {
  const setListView = document.getElementById('set-list-view')
  const setFormView = document.getElementById('set-form-view')
  const setDetailView = document.getElementById('set-detail-view')
  const setList = document.getElementById('set-list')
  const setEmptyState = document.getElementById('set-empty-state')
  const setStatusBar = document.getElementById('set-status-bar')
  const createSetBtn = document.getElementById('create-set-btn')
  const setFormTitle = document.getElementById('set-form-title')
  const setNameInput = document.getElementById('set-name-input')
  const setNameError = document.getElementById('set-name-error')
  const repoCheckboxList = document.getElementById('repo-checkbox-list')
  const setSaveBtn = document.getElementById('set-save-btn')
  const setCancelBtn = document.getElementById('set-cancel-btn')
  const setFormBack = document.getElementById('set-form-back')
  const setDetailName = document.getElementById('set-detail-name')
  const setDetailMeta = document.getElementById('set-detail-meta')
  const setDetailRepos = document.getElementById('set-detail-repos')
  const setDetailStatus = document.getElementById('set-detail-status')
  const setDetailBack = document.getElementById('set-detail-back')
  const setEditBtn = document.getElementById('set-edit-btn')
  const setDeleteBtn = document.getElementById('set-delete-btn')
  const toast = document.getElementById('toast')

  // 페이지네이션 상태 변수
  const PAGE_SIZE = 5
  let allSets = []
  let currentPage = 1

  // 페이지네이션 DOM 요소
  const setPagination = document.getElementById('set-pagination')
  const setPrevBtn = document.getElementById('set-prev-btn')
  const setNextBtn = document.getElementById('set-next-btn')
  const setPageInfo = document.getElementById('set-page-info')

  let editingSetId = null

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

  function showView(view) {
    setListView.style.display = view === 'list' ? 'block' : 'none'
    setFormView.style.display = view === 'form' ? 'block' : 'none'
    setDetailView.style.display = view === 'detail' ? 'block' : 'none'
  }

  function renderPage(page) {
    currentPage = page
    const totalPages = Math.ceil(allSets.length / PAGE_SIZE)
    const start = (page - 1) * PAGE_SIZE
    const pageItems = allSets.slice(start, start + PAGE_SIZE)

    setList.innerHTML = ''
    pageItems.forEach(set => {
      const card = document.createElement('div')
      card.className = 'set-card'
      card.dataset.id = set.id
      card.innerHTML =
        '<div class="set-card-info">' +
          '<div class="set-card-name">' + escapeHtml(set.name) + '</div>' +
          '<div class="set-card-meta">' +
            '<span>저장소 ' + set.repositoryIds.length + '개</span>' +
            '<span>생성일: ' + set.createdAt.slice(0, 10) + '</span>' +
          '</div>' +
        '</div>' +
        '<span class="set-card-badge">' + set.repositoryIds.length + ' repos</span>' +
        '<div class="set-card-actions">' +
          '<button class="btn btn-danger set-delete-card-btn" data-id="' + set.id + '" title="삭제">&times;</button>' +
        '</div>'
      setList.appendChild(card)
    })
    setStatusBar.textContent = allSets.length + '개의 세트가 있습니다'

    // 페이지네이션 UI 제어
    if (totalPages <= 1) {
      setPagination.style.display = 'none'
    } else {
      setPagination.style.display = 'flex'
      setPageInfo.textContent = page + ' / ' + totalPages
      setPrevBtn.disabled = page <= 1
      setNextBtn.disabled = page >= totalPages
    }
  }

  async function loadSets() {
    showView('list')
    currentPage = 1
    try {
      const result = await window.electronAPI.invoke('workdir-set:list')
      if (!result.success) return

      allSets = result.sets
      if (allSets.length === 0) {
        setList.innerHTML = ''
        setEmptyState.style.display = 'block'
        setPagination.style.display = 'none'
        setStatusBar.textContent = '워크디렉토리 세트가 없습니다'
        return
      }

      setEmptyState.style.display = 'none'
      renderPage(1)
    } catch (e) {
      showToast('세트 목록을 불러올 수 없습니다.', 'error')
    }
  }

  window.loadSets = loadSets

  // 페이지네이션 버튼 이벤트 리스너
  setPrevBtn.addEventListener('click', () => {
    if (currentPage > 1) renderPage(currentPage - 1)
  })
  setNextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(allSets.length / PAGE_SIZE)
    if (currentPage < totalPages) renderPage(currentPage + 1)
  })

  async function showCreateForm() {
    editingSetId = null
    setFormTitle.textContent = '세트 만들기'
    setNameInput.value = ''
    setNameError.style.display = 'none'
    setNameInput.classList.remove('error')
    await loadRepoCheckboxes([])
    showView('form')
  }

  async function showEditForm(setId) {
    editingSetId = setId
    setFormTitle.textContent = '세트 편집'
    setNameError.style.display = 'none'
    setNameInput.classList.remove('error')
    try {
      const result = await window.electronAPI.invoke('workdir-set:get', setId)
      if (!result.success) return
      setNameInput.value = result.set.name
      const selectedIds = result.set.repositories.map(r => r.id)
      await loadRepoCheckboxes(selectedIds)
      showView('form')
    } catch (e) {
      showToast('세트 정보를 불러올 수 없습니다.', 'error')
    }
  }

  async function loadRepoCheckboxes(selectedIds) {
    repoCheckboxList.innerHTML = ''
    try {
      const result = await window.electronAPI.invoke('repo:list')
      if (!result.success) return
      result.repos.forEach(repo => {
        const label = document.createElement('label')
        label.className = 'repo-checkbox-item'
        const checked = selectedIds.includes(repo.id) ? ' checked' : ''
        label.innerHTML =
          '<input type="checkbox" value="' + repo.id + '"' + checked + '>' +
          '<span class="repo-checkbox-name">' + escapeHtml(repo.name) + '</span>' +
          '<span class="repo-checkbox-path">' + escapeHtml(repo.path) + '</span>'
        repoCheckboxList.appendChild(label)
      })
    } catch (e) {
      showToast('저장소 목록을 불러올 수 없습니다.', 'error')
    }
  }

  async function saveSet() {
    const name = setNameInput.value.trim()
    if (!name) {
      setNameInput.classList.add('error')
      setNameError.textContent = '세트 이름을 입력해주세요.'
      setNameError.style.display = 'block'
      return
    }

    const checkboxes = repoCheckboxList.querySelectorAll('input[type="checkbox"]:checked')
    const repositoryIds = Array.from(checkboxes).map(cb => cb.value)

    try {
      let result
      if (editingSetId) {
        result = await window.electronAPI.invoke('workdir-set:update', {
          id: editingSetId, name, repositoryIds
        })
      } else {
        result = await window.electronAPI.invoke('workdir-set:create', {
          name, repositoryIds
        })
      }

      if (result.success) {
        await loadSets()
      } else if (result.error === 'DUPLICATE_NAME') {
        setNameInput.classList.add('error')
        setNameError.textContent = '이미 동일한 이름의 세트가 존재합니다.'
        setNameError.style.display = 'block'
      } else if (result.error === 'EMPTY_NAME') {
        setNameInput.classList.add('error')
        setNameError.textContent = '세트 이름을 입력해주세요.'
        setNameError.style.display = 'block'
      }
    } catch (e) {
      showToast('세트 저장 중 오류가 발생했습니다.', 'error')
    }
  }

  async function showSetDetail(setId) {
    try {
      const result = await window.electronAPI.invoke('workdir-set:get', setId)
      if (!result.success) {
        showToast('세트를 찾을 수 없습니다.', 'error')
        return
      }

      const set = result.set
      setDetailName.textContent = set.name
      setDetailMeta.innerHTML =
        '<span>생성일: ' + set.createdAt.slice(0, 10) + '</span>' +
        '<span>수정일: ' + set.updatedAt.slice(0, 10) + '</span>'

      setDetailRepos.innerHTML = ''
      set.repositories.forEach(repo => {
        const tr = document.createElement('tr')
        tr.innerHTML =
          '<td><span class="repo-name">' + escapeHtml(repo.name) + '</span></td>' +
          '<td><span class="repo-path">' + escapeHtml(repo.path) + '</span></td>' +
          '<td><button class="btn btn-secondary set-terminal-btn" data-path="' + escapeHtml(repo.path) + '">터미널</button></td>'
        setDetailRepos.appendChild(tr)
      })

      setDetailStatus.textContent = set.repositories.length + '개의 저장소가 포함되어 있습니다'

      setEditBtn.dataset.id = set.id
      setDeleteBtn.dataset.id = set.id
      showView('detail')
    } catch (e) {
      showToast('세트 상세 정보를 불러올 수 없습니다.', 'error')
    }
  }

  async function deleteSet(setId) {
    try {
      const result = await window.electronAPI.invoke('workdir-set:delete', setId)
      if (result.success) {
        await loadSets()
      } else {
        showToast('세트 삭제에 실패했습니다.', 'error')
      }
    } catch (e) {
      showToast('세트 삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  // Event listeners
  createSetBtn.addEventListener('click', showCreateForm)
  setSaveBtn.addEventListener('click', saveSet)
  setCancelBtn.addEventListener('click', loadSets)
  setFormBack.addEventListener('click', loadSets)
  setDetailBack.addEventListener('click', loadSets)

  setNameInput.addEventListener('input', () => {
    setNameInput.classList.remove('error')
    setNameError.style.display = 'none'
  })

  setEditBtn.addEventListener('click', () => {
    showEditForm(setEditBtn.dataset.id)
  })

  setDeleteBtn.addEventListener('click', () => {
    deleteSet(setDeleteBtn.dataset.id)
  })

  setList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.set-delete-card-btn')
    if (deleteBtn) {
      e.stopPropagation()
      deleteSet(deleteBtn.dataset.id)
      return
    }
    const card = e.target.closest('.set-card')
    if (card) {
      showSetDetail(card.dataset.id)
    }
  })

  // set-detail-repos 이벤트 위임: 터미널 버튼
  setDetailRepos.addEventListener('click', async (e) => {
    const termBtn = e.target.closest('.set-terminal-btn')
    if (!termBtn) return
    const dirPath = termBtn.dataset.path
    const result = await window.electronAPI.invoke('terminal:open', { path: dirPath })
    if (!result.success) {
      showToast('터미널 실행 실패: ' + (result.error || '알 수 없는 오류'), 'error')
    }
  })
})
