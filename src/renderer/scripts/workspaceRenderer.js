window.addEventListener('DOMContentLoaded', () => {
  const wsList          = document.getElementById('ws-list')
  const wsEmptyMsg      = document.getElementById('ws-empty-msg')
  const wsSelectedSection = document.getElementById('ws-selected-section')
  const wsSelectedPath  = document.getElementById('ws-selected-path')
  const wsActionSection = document.getElementById('ws-action-section')
  const wsTerminalBtn   = document.getElementById('ws-terminal-btn')
  const wsClaudeBtn     = document.getElementById('ws-claude-btn')
  const wsResultBar     = document.getElementById('ws-result-bar')

  let selectedWorkspacePath = null
  let isWorking = false

  function setResult(message, isError) {
    wsResultBar.textContent = message
    wsResultBar.className = 'status-bar' + (isError ? ' status-error' : '')
  }

  function selectWorkspace(workspacePath) {
    selectedWorkspacePath = workspacePath

    // 모든 항목의 선택 상태 초기화
    wsList.querySelectorAll('.ws-item').forEach(item => {
      item.classList.remove('selected')
    })

    // 선택한 항목 하이라이트
    const selectedItem = wsList.querySelector('[data-path="' + CSS.escape(workspacePath) + '"]')
    if (selectedItem) selectedItem.classList.add('selected')

    // 선택 경로 표시
    wsSelectedSection.style.display = 'block'
    wsSelectedPath.textContent = workspacePath

    // 액션 버튼 활성화
    wsActionSection.style.display = 'flex'
    wsTerminalBtn.disabled = false
    wsClaudeBtn.disabled = false

    setResult('')
  }

  async function fetchAndRenderList() {
    wsList.innerHTML = ''
    wsEmptyMsg.style.display = 'none'
    wsSelectedSection.style.display = 'none'
    wsActionSection.style.display = 'none'
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    selectedWorkspacePath = null

    let result
    try {
      result = await window.electronAPI.invoke('workspace:list', {})
    } catch (e) {
      setResult('목록 조회 중 오류가 발생했습니다.', true)
      return
    }

    if (!result.success) {
      setResult('목록 조회 실패: ' + (result.error || ''), true)
      return
    }

    const workspaces = result.workspaces || []

    if (workspaces.length === 0) {
      wsEmptyMsg.style.display = 'block'
      return
    }

    workspaces.forEach(ws => {
      const item = document.createElement('div')
      item.className = 'ws-item'
      item.dataset.path = ws.path

      const nameSpan = document.createElement('span')
      nameSpan.className = 'ws-item-name'
      nameSpan.textContent = ws.name

      const pathSpan = document.createElement('span')
      pathSpan.className = 'ws-item-path'
      pathSpan.textContent = ws.path

      item.appendChild(nameSpan)
      item.appendChild(pathSpan)

      item.addEventListener('click', () => selectWorkspace(ws.path))
      wsList.appendChild(item)
    })
  }

  async function onOpenTerminal() {
    if (isWorking || !selectedWorkspacePath) return
    isWorking = true
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    setResult('')

    try {
      const result = await window.electronAPI.invoke('terminal:open', { path: selectedWorkspacePath })
      if (result.success) {
        setResult('터미널이 열렸습니다.')
      } else {
        setResult('터미널 실행 실패: ' + (result.error || '알 수 없는 오류'), true)
      }
    } catch (e) {
      setResult('터미널 실행 중 오류가 발생했습니다.', true)
    } finally {
      isWorking = false
      wsTerminalBtn.disabled = false
      wsClaudeBtn.disabled = false
    }
  }

  async function onRegenerateClaude() {
    if (isWorking || !selectedWorkspacePath) return

    const confirmMessage =
      'Claude 설정을 재생성하시겠습니까?\n\n' +
      '대상 워크스페이스:\n  ' + selectedWorkspacePath + '\n\n' +
      '아래 항목이 삭제 후 재생성됩니다:\n  - .claude/ 폴더\n  - CLAUDE.md 파일\n\n' +
      'wiki/ 및 기타 파일은 영향받지 않습니다.'

    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    isWorking = true
    wsTerminalBtn.disabled = true
    wsClaudeBtn.disabled = true
    setResult('')

    try {
      const result = await window.electronAPI.invoke('claude-config:reset', {
        workspacePath: selectedWorkspacePath
      })
      if (result.success) {
        setResult('재생성 완료')
      } else {
        setResult('재생성 실패: ' + (result.error || '알 수 없는 오류'), true)
      }
    } catch (e) {
      setResult('재생성 중 오류가 발생했습니다.', true)
    } finally {
      isWorking = false
      wsTerminalBtn.disabled = false
      wsClaudeBtn.disabled = false
    }
  }

  async function loadWorkspaceTab() {
    isWorking = false
    setResult('')
    await fetchAndRenderList()
  }

  // 이벤트 리스너
  wsTerminalBtn.addEventListener('click', onOpenTerminal)
  wsClaudeBtn.addEventListener('click', onRegenerateClaude)

  // 글로벌 함수 노출
  window.loadWorkspaceTab = loadWorkspaceTab
})
