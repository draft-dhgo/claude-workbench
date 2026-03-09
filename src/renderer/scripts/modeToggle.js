;(function () {
  const MODE_KEY = 'appMode'
  const WORKSPACE_TAB_KEY = 'lastWorkspaceTab'
  const WORKTREE_TAB_KEY = 'lastWorktreeTab'

  const MODE_TABS = {
    workspace: ['tab-command-queue', 'tab-workspace-mgmt'],
    worktree: ['tab-repos', 'tab-repo-worktree']
  }
  const MODE_NAVS = {
    workspace: 'tab-nav-workspace',
    worktree: 'tab-nav-worktree'
  }
  const TAB_INDEX_KEYS = {
    workspace: WORKSPACE_TAB_KEY,
    worktree: WORKTREE_TAB_KEY
  }

  let _currentMode = 'workspace'

  function getCurrentMode() {
    return _currentMode
  }

  function saveCurrentTabIndex(mode) {
    const navId = MODE_NAVS[mode]
    const nav = document.getElementById(navId)
    if (!nav) return
    const btns = nav.querySelectorAll('.tab-btn')
    let activeIdx = 0
    btns.forEach(function (btn, idx) {
      if (btn.classList.contains('active')) activeIdx = idx
    })
    try {
      localStorage.setItem(TAB_INDEX_KEYS[mode], String(activeIdx))
    } catch (e) { /* ignore */ }
  }

  function restoreTabIndex(mode) {
    let idx = 0
    try {
      const stored = localStorage.getItem(TAB_INDEX_KEYS[mode])
      if (stored !== null) idx = parseInt(stored, 10) || 0
    } catch (e) { /* ignore */ }

    const navId = MODE_NAVS[mode]
    const nav = document.getElementById(navId)
    if (!nav) return
    const btns = nav.querySelectorAll('.tab-btn')
    if (btns.length === 0) return
    const targetBtn = btns[idx] || btns[0]
    targetBtn.click()
  }

  function showTabsForMode(mode) {
    // Hide all navs
    Object.values(MODE_NAVS).forEach(function (navId) {
      const el = document.getElementById(navId)
      if (el) el.style.display = 'none'
    })
    // Hide all tab contents
    Object.values(MODE_TABS).forEach(function (tabs) {
      tabs.forEach(function (tabId) {
        const el = document.getElementById(tabId)
        if (el) {
          el.style.display = 'none'
          el.classList.remove('active')
        }
      })
    })
    // Show this mode's nav
    const activeNav = document.getElementById(MODE_NAVS[mode])
    if (activeNav) activeNav.style.display = ''
  }

  function updateToggleUI(mode) {
    const btns = document.querySelectorAll('.mode-btn')
    btns.forEach(function (btn) {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }

  function switchMode(mode) {
    if (mode !== 'workspace' && mode !== 'worktree') return
    // Save current tab index before switching
    saveCurrentTabIndex(_currentMode)
    _currentMode = mode
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch (e) { /* ignore */ }
    showTabsForMode(mode)
    updateToggleUI(mode)
    restoreTabIndex(mode)
  }

  function init() {
    // Restore saved mode
    let savedMode = 'workspace'
    try {
      const stored = localStorage.getItem(MODE_KEY)
      if (stored === 'workspace' || stored === 'worktree') savedMode = stored
    } catch (e) { /* ignore */ }

    _currentMode = savedMode
    showTabsForMode(savedMode)
    updateToggleUI(savedMode)
    restoreTabIndex(savedMode)

    // Register mode toggle button events
    const modeBtns = document.querySelectorAll('.mode-btn')
    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mode = btn.dataset.mode
        if (mode && mode !== _currentMode) {
          switchMode(mode)
        }
      })
    })
  }

  window.modeToggle = {
    init: init,
    switchMode: switchMode,
    getCurrentMode: getCurrentMode,
    saveCurrentTabIndex: saveCurrentTabIndex,
    restoreTabIndex: restoreTabIndex,
    showTabsForMode: showTabsForMode,
    updateToggleUI: updateToggleUI
  }

  document.addEventListener('DOMContentLoaded', init)
})()
