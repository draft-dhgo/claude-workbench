let _persistedCwd = null

// ── 로그 그룹 관리 ────────────────────────────────────────────────────────────

// itemId → { command: string, args: string } 매핑
const _queueItemMeta = {}

function getOrCreateLogGroup(itemId, commandSummary) {
  var logContent = document.getElementById('cq-log-content')
  var existing = logContent ? logContent.querySelector('[data-item-id="' + itemId + '"]') : null
  if (existing) return existing

  var group = document.createElement('div')
  group.className = 'cq-log-group collapsed'
  group.dataset.itemId = itemId

  var header = document.createElement('div')
  header.className = 'cq-log-group-header'

  var chevron = document.createElement('span')
  chevron.className = 'cq-log-group-chevron'
  chevron.textContent = '\u25B6'

  var title = document.createElement('span')
  title.className = 'cq-log-group-title'
  var titleText = commandSummary != null ? commandSummary : 'Item ' + itemId
  title.textContent = titleText

  header.appendChild(chevron)
  header.appendChild(title)
  header.addEventListener('click', function () { toggleGroup(group) })

  var body = document.createElement('div')
  body.className = 'cq-log-body'

  group.appendChild(header)
  group.appendChild(body)

  if (logContent) logContent.appendChild(group)

  return group
}

function toggleGroup(groupEl) {
  if (groupEl.classList.contains('expanded')) {
    groupEl.classList.remove('expanded')
    groupEl.classList.add('collapsed')
    var body = groupEl.querySelector('.cq-log-body')
    if (body) body.style.maxHeight = null
  } else {
    groupEl.classList.remove('collapsed')
    groupEl.classList.add('expanded')
    var body = groupEl.querySelector('.cq-log-body')
    if (body) body.style.maxHeight = body.scrollHeight + 'px'
  }
}

function collapseAll() {
  var groups = document.querySelectorAll('.cq-log-group')
  groups.forEach(function (g) {
    g.classList.remove('expanded')
    g.classList.add('collapsed')
    var body = g.querySelector('.cq-log-body')
    if (body) body.style.maxHeight = null
  })
}

function expandAll() {
  var groups = document.querySelectorAll('.cq-log-group')
  groups.forEach(function (g) {
    g.classList.remove('collapsed')
    g.classList.add('expanded')
    var body = g.querySelector('.cq-log-body')
    if (body) body.style.maxHeight = body.scrollHeight + 'px'
  })
}

window.getOrCreateLogGroup = getOrCreateLogGroup
window.toggleGroup = toggleGroup
window.collapseAll = collapseAll
window.expandAll = expandAll

// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const cmdTypeInput = document.getElementById('cq-cmd-type')
  const cmdSuggestions = document.getElementById('cq-cmd-suggestions')
  const cmdCwdSelect = document.getElementById('cq-cwd-select')
  const cmdAddBtn = document.getElementById('cq-add-btn')
  const bulkInput = document.getElementById('cq-bulk-input')
  const bulkBtn = document.getElementById('cq-bulk-btn')
  const queueList = document.getElementById('cq-queue-list')
  const queueEmpty = document.getElementById('cq-queue-empty')
  const logContent = document.getElementById('cq-log-content')
  const abortBtn = document.getElementById('cq-abort-btn')
  const toast = document.getElementById('toast')

  let selectedCwd = _persistedCwd

  // ── Command Autocomplete ──
  const ALL_COMMANDS = [
    '/add-req', '/explain', '/bugfix', '/teams', '/bugfix-teams',
    '/merge'
  ]
  const VALID_COMMANDS = ALL_COMMANDS
  let acIndex = -1
  let acFiltered = []
  let selectedCommand = ''

  function fuzzyMatch(query, target) {
    var qi = 0
    for (var ti = 0; ti < target.length && qi < query.length; ti++) {
      if (query[qi].toLowerCase() === target[ti].toLowerCase()) qi++
    }
    return qi === query.length
  }

  function getFirstToken(text) {
    var spaceIdx = text.indexOf(' ')
    return spaceIdx === -1 ? text : text.slice(0, spaceIdx)
  }

  function isCommandConfirmed(text) {
    var firstToken = getFirstToken(text)
    return ALL_COMMANDS.indexOf(firstToken) !== -1 && text.indexOf(' ') !== -1
  }

  function showSuggestions(filter) {
    var token = getFirstToken(filter)
    if (!token.startsWith('/') || isCommandConfirmed(filter)) {
      hideSuggestions()
      return
    }
    acFiltered = ALL_COMMANDS.filter(function (cmd) {
      return fuzzyMatch(token, cmd)
    })
    if (acFiltered.length === 0) {
      hideSuggestions()
      return
    }
    acIndex = 0
    renderSuggestions()
    cmdSuggestions.classList.add('open')
  }

  function hideSuggestions() {
    acFiltered = []
    acIndex = -1
    cmdSuggestions.classList.remove('open')
    cmdSuggestions.innerHTML = ''
  }

  function renderSuggestions() {
    cmdSuggestions.innerHTML = ''
    acFiltered.forEach(function (cmd, i) {
      var div = document.createElement('div')
      div.className = 'cq-suggestion-item' + (i === acIndex ? ' active' : '')
      div.textContent = cmd
      div.addEventListener('mousedown', function (e) {
        e.preventDefault()
        selectCommand(cmd)
      })
      cmdSuggestions.appendChild(div)
    })
  }

  function selectCommand(cmd) {
    selectedCommand = cmd
    cmdTypeInput.value = cmd + ' '
    hideSuggestions()
    cmdTypeInput.focus()
  }

  cmdTypeInput.addEventListener('input', function () {
    var val = cmdTypeInput.value
    if (isCommandConfirmed(val)) {
      selectedCommand = getFirstToken(val)
    } else {
      selectedCommand = ''
    }
    showSuggestions(val)
  })

  cmdTypeInput.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (cmdSuggestions.classList.contains('open') && acIndex >= 0 && acIndex < acFiltered.length) {
        selectCommand(acFiltered[acIndex])
      } else {
        var allowed = await checkSecurityWarning()
        if (allowed) addToQueue()
      }
      return
    }
    if (!cmdSuggestions.classList.contains('open')) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      acIndex = Math.min(acIndex + 1, acFiltered.length - 1)
      renderSuggestions()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      acIndex = Math.max(acIndex - 1, 0)
      renderSuggestions()
    } else if (e.key === 'Escape') {
      hideSuggestions()
    }
  })

  cmdTypeInput.addEventListener('blur', function () {
    // Delay to allow mousedown on suggestion
    setTimeout(hideSuggestions, 150)
  })

  cmdTypeInput.addEventListener('focus', function () {
    if (cmdTypeInput.value.startsWith('/')) {
      showSuggestions(cmdTypeInput.value)
    }
  })

  // ── Utility ──
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

  // Workspace list for cwd selection
  async function loadWorkspaces() {
    try {
      const result = await window.electronAPI.invoke('workspace:list')
      if (result.success && result.workspaces) {
        cmdCwdSelect.innerHTML = '<option value="">-- Select workspace --</option>'
        result.workspaces.forEach(function (entry) {
          const opt = document.createElement('option')
          opt.value = entry.path
          opt.textContent = entry.name + ' (' + entry.path + ')'
          cmdCwdSelect.appendChild(opt)
        })
        // Restore persisted workspace selection if it still exists in the new list
        if (_persistedCwd) {
          const exists = Array.from(cmdCwdSelect.options)
            .some(function (opt) { return opt.value === _persistedCwd })
          if (exists) {
            cmdCwdSelect.value = _persistedCwd
            selectedCwd = _persistedCwd
          } else {
            // Previously selected workspace no longer in list — reset
            _persistedCwd = null
            selectedCwd = null
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  cmdCwdSelect.addEventListener('change', function () {
    selectedCwd = cmdCwdSelect.value || null
    _persistedCwd = selectedCwd
  })

  // Security warning check
  async function checkSecurityWarning() {
    try {
      var result = await window.electronAPI.invoke('queue:security-warning')
      if (!result.shown) {
        var confirmed = window.confirm(
          'Security Warning\n\n' +
          'The command queue system runs Claude Agent SDK with\n' +
          'allowDangerouslySkipPermissions: true.\n\n' +
          'This skips permission checks for file writes, command execution, etc.\n' +
          'Project files may be modified automatically.\n\n' +
          'Continue?'
        )
        if (!confirmed) return false
      }
      return true
    } catch (e) {
      return false
    }
  }

  function parseCommandInput(text) {
    var trimmed = text.trim()
    var matched = VALID_COMMANDS.find(function (cmd) { return trimmed.startsWith(cmd) })
    if (!matched) return { command: trimmed.split(/\s+/)[0], args: '' }
    var args = trimmed.slice(matched.length).trim()
    return { command: matched, args: args }
  }

  // Add command to queue
  async function addToQueue() {
    var parsed = parseCommandInput(cmdTypeInput.value)
    if (!parsed.command) {
      showToast('Please select a command.', 'warning')
      return
    }
    if (!selectedCwd) {
      showToast('Please select a workspace.', 'warning')
      return
    }

    try {
      var result = await window.electronAPI.invoke('queue:enqueue', {
        command: parsed.command, args: parsed.args, cwd: selectedCwd
      })
      if (result.success) {
        cmdTypeInput.value = ''
        selectedCommand = ''
      } else {
        showToast('Queue add failed: ' + (result.error || ''), 'error')
      }
    } catch (e) {
      showToast('Queue add error', 'error')
    }
  }

  // Render queue list
  function renderQueue(items) {
    queueList.innerHTML = ''

    if (!items || items.length === 0) {
      queueEmpty.style.display = 'block'
      queueList.style.display = 'none'
      abortBtn.disabled = true
      return
    }

    queueEmpty.style.display = 'none'
    queueList.style.display = 'block'

    var hasRunning = items.some(function (i) {
      return i.status === 'running' || i.status === 'retrying'
    })
    abortBtn.disabled = !hasRunning

    items.forEach(function (item) {
      var row = document.createElement('div')
      row.className = 'cq-queue-row'
      row.innerHTML = buildQueueRowHTML(item)
      queueList.appendChild(row)
    })
  }

  function buildQueueRowHTML(item) {
    var statusLabel = {
      pending: 'Pending', running: 'Running', success: 'Done',
      failed: 'Failed', aborted: 'Aborted', retrying: 'Retrying'
    }

    var actionHTML = ''
    if (item.status === 'pending') {
      actionHTML = '<button class="btn btn-danger cq-remove-btn" data-id="' + item.id + '">&times;</button>'
    } else if (item.status === 'aborted' || item.status === 'failed') {
      actionHTML =
        '<button class="btn btn-secondary cq-requeue-btn" data-id="' + item.id + '" title="Retry">↺</button>' +
        '<button class="btn btn-danger cq-remove-btn" data-id="' + item.id + '" title="Remove">&times;</button>'
    }

    var resultHTML = ''
    if (item.result) {
      if (item.status === 'success') {
        var cost = item.result.costUsd != null ? '$' + item.result.costUsd.toFixed(4) : '-'
        var duration = item.result.durationMs != null ? Math.round(item.result.durationMs / 1000) + 's' : '-'
        var turns = item.result.numTurns != null ? item.result.numTurns + ' turns' : '-'
        resultHTML = '<div class="cq-result">' + cost + ' | ' + duration + ' | ' + turns + '</div>'
      } else if (item.result.errorMessage) {
        resultHTML = '<div class="cq-result cq-result-error">' + escapeHtml(item.result.errorMessage) + '</div>'
      }
    }

    return (
      '<div class="cq-row-header">' +
        '<span class="cq-badge cq-badge-' + item.status + '">' + (statusLabel[item.status] || item.status) + '</span>' +
        '<span class="cq-cmd">' + escapeHtml(item.command + (item.args ? ' ' + item.args : '')) + '</span>' +
        actionHTML +
      '</div>' +
      resultHTML
    )
  }

  // Append log message — group by itemId
  var MAX_LOG_LINES = 500

  function appendLog(log) {
    var meta = _queueItemMeta[log.itemId]
    var commandSummary = meta ? (meta.command + (meta.args ? ' ' + meta.args : '')) : undefined
    var group = getOrCreateLogGroup(log.itemId, commandSummary)
    var body = group.querySelector('.cq-log-body')
    var logLine = document.createElement('div')
    logLine.className = 'cq-log-line cq-log-' + log.type
    logLine.textContent = '[' + log.type.toUpperCase() + '] ' + log.content
    body.appendChild(logLine)
    // If group is expanded, update max-height to accommodate new line
    if (group.classList.contains('expanded')) {
      body.style.maxHeight = body.scrollHeight + 'px'
    }
  }
  window.appendLog = appendLog

  // IPC event listeners
  window.electronAPI.on('queue:status-update', function (data) {
    renderQueue(data.items)
  })

  window.electronAPI.on('queue:log', function (log) {
    appendLog(log)
  })

  // UI event listeners
  function parseBulkInput(text) {
    var lines = text.split('\n')
    var commands = []
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim()
      if (!line || line.startsWith('#')) continue
      var matched = VALID_COMMANDS.find(function (cmd) { return line.startsWith(cmd) })
      if (!matched) continue
      var args = line.slice(matched.length).trim()
      commands.push({ command: matched, args: args })
    }
    return commands
  }

  async function bulkAddToQueue() {
    if (!selectedCwd) {
      showToast('Please select a workspace.', 'warning')
      return
    }
    var text = bulkInput.value
    var commands = parseBulkInput(text)
    if (commands.length === 0) {
      showToast('No valid commands found. Lines must start with a valid slash command.', 'warning')
      return
    }
    var failed = 0
    for (var i = 0; i < commands.length; i++) {
      try {
        var result = await window.electronAPI.invoke('queue:enqueue', {
          command: commands[i].command, args: commands[i].args, cwd: selectedCwd
        })
        if (!result.success) failed++
      } catch (e) {
        failed++
      }
    }
    var added = commands.length - failed
    if (added > 0) {
      bulkInput.value = ''
      showToast(added + ' command(s) added to queue.' + (failed > 0 ? ' ' + failed + ' failed.' : ''), 'success')
    } else {
      showToast('All commands failed to add.', 'error')
    }
  }

  cmdAddBtn.addEventListener('click', async function () {
    var allowed = await checkSecurityWarning()
    if (allowed) addToQueue()
  })

  bulkBtn.addEventListener('click', async function () {
    var allowed = await checkSecurityWarning()
    if (allowed) bulkAddToQueue()
  })

  abortBtn.addEventListener('click', async function () {
    await window.electronAPI.invoke('queue:abort')
  })

  var collapseAllBtn = document.getElementById('cq-collapse-all-btn')
  var expandAllBtn = document.getElementById('cq-expand-all-btn')
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', function () { collapseAll() })
  if (expandAllBtn) expandAllBtn.addEventListener('click', function () { expandAll() })

  queueList.addEventListener('click', async function (e) {
    var removeBtn = e.target.closest('.cq-remove-btn')
    if (removeBtn) {
      await window.electronAPI.invoke('queue:dequeue', { itemId: removeBtn.dataset.id })
      return
    }
    var requeueBtn = e.target.closest('.cq-requeue-btn')
    if (requeueBtn) {
      await window.electronAPI.invoke('queue:requeue', { itemId: requeueBtn.dataset.id })
    }
  })

  // Tab load function
  async function loadCommandQueueTab() {
    await loadWorkspaces()
    try {
      var result = await window.electronAPI.invoke('queue:status')
      if (result.success) renderQueue(result.items)
    } catch (e) {
      // ignore
    }
  }

  window.loadCommandQueueTab = loadCommandQueueTab
})
