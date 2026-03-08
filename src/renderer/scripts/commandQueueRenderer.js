window.addEventListener('DOMContentLoaded', async () => {
  await window._i18nReady
  const cmdTypeSelect = document.getElementById('cq-cmd-type')
  const cmdArgsInput = document.getElementById('cq-cmd-args')
  const cmdCwdSelect = document.getElementById('cq-cwd-select')
  const cmdAddBtn = document.getElementById('cq-add-btn')
  const queueList = document.getElementById('cq-queue-list')
  const queueEmpty = document.getElementById('cq-queue-empty')
  const logContent = document.getElementById('cq-log-content')
  const abortBtn = document.getElementById('cq-abort-btn')
  const toast = document.getElementById('toast')

  let selectedCwd = null

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
      if (result.success && result.entries) {
        cmdCwdSelect.innerHTML = '<option value="">-- Select workspace --</option>'
        result.entries.forEach(function (entry) {
          const opt = document.createElement('option')
          opt.value = entry.path
          opt.textContent = entry.name + ' (' + entry.path + ')'
          cmdCwdSelect.appendChild(opt)
        })
      }
    } catch (e) {
      // ignore
    }
  }

  cmdCwdSelect.addEventListener('change', function () {
    selectedCwd = cmdCwdSelect.value || null
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

  // Add command to queue
  async function addToQueue() {
    var command = cmdTypeSelect.value
    var args = cmdArgsInput.value.trim()
    if (!selectedCwd) {
      showToast('Please select a workspace.', 'warning')
      return
    }

    try {
      var result = await window.electronAPI.invoke('queue:enqueue', {
        command: command, args: args, cwd: selectedCwd
      })
      if (result.success) {
        cmdArgsInput.value = ''
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

  // Append log message
  function appendLog(log) {
    var logLine = document.createElement('div')
    logLine.className = 'cq-log-line cq-log-' + log.type
    logLine.textContent = '[' + log.type.toUpperCase() + '] ' + log.content
    logContent.appendChild(logLine)
    logContent.scrollTop = logContent.scrollHeight
  }

  // IPC event listeners
  window.electronAPI.on('queue:status-update', function (data) {
    renderQueue(data.items)
  })

  window.electronAPI.on('queue:log', function (log) {
    appendLog(log)
  })

  // UI event listeners
  cmdAddBtn.addEventListener('click', async function () {
    var allowed = await checkSecurityWarning()
    if (allowed) addToQueue()
  })

  abortBtn.addEventListener('click', async function () {
    await window.electronAPI.invoke('queue:abort')
  })

  queueList.addEventListener('click', async function (e) {
    var btn = e.target.closest('.cq-remove-btn')
    if (!btn) return
    await window.electronAPI.invoke('queue:dequeue', { itemId: btn.dataset.id })
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
