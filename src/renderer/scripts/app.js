// App Router & Initialization
(function () {
  'use strict';

  const api = window.electronAPI;

  // --- Sidebar Navigation ---
  const sidebar = document.getElementById('sidebar');
  const pages = document.querySelectorAll('.page');

  function navigateTo(pageName) {
    // Update sidebar active state
    sidebar.querySelectorAll('.sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageName);
    });
    // Show/hide pages
    pages.forEach(page => {
      const id = page.id.replace('page-', '');
      page.style.display = id === pageName ? '' : 'none';
      page.classList.toggle('active', id === pageName);
    });
  }

  sidebar.addEventListener('click', (e) => {
    const btn = e.target.closest('.sidebar-btn');
    if (btn && btn.dataset.page) {
      navigateTo(btn.dataset.page);
    }
  });

  // --- Version ---
  api.invoke('app:version').then(v => {
    const el = document.getElementById('version-text');
    if (el) el.textContent = v || '?';
  }).catch(() => {});

  // --- Project Dropdown ---
  const projectSelect = document.getElementById('project-select');
  const newProjectBtn = document.getElementById('new-project-btn');

  async function loadProjects() {
    try {
      const result = await api.invoke('project:list');
      if (!result || !result.success) return;
      projectSelect.innerHTML = '<option value="">-- Select Project --</option>';
      for (const p of result.projects || []) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
      }
    } catch (e) {
      // Projects not yet implemented — ignore
    }
  }

  // --- New Project Modal ---
  const projectModalOverlay = document.getElementById('project-modal-overlay');
  const projectModalCancel = document.getElementById('project-modal-cancel');
  const projectModalSubmit = document.getElementById('project-modal-submit');
  const projectFormName = document.getElementById('project-form-name');
  const projectFormRemote = document.getElementById('project-form-remote');

  newProjectBtn.addEventListener('click', () => {
    projectFormName.value = '';
    projectFormRemote.value = '';
    projectModalOverlay.style.display = 'flex';
  });

  projectModalCancel.addEventListener('click', () => {
    projectModalOverlay.style.display = 'none';
  });

  projectModalSubmit.addEventListener('click', async () => {
    const name = projectFormName.value.trim();
    if (!name) return;
    const remoteUrl = projectFormRemote.value.trim() || undefined;
    try {
      const result = await api.invoke('project:create', { name, remoteUrl });
      if (result && result.success) {
        projectModalOverlay.style.display = 'none';
        await loadProjects();
        projectSelect.value = result.project.id;
        projectSelect.dispatchEvent(new Event('change'));
        showToast('Project created successfully');
      } else {
        showToast(result?.error || 'Failed to create project', 'error');
      }
    } catch (e) {
      showToast('Failed to create project', 'error');
    }
  });

  // --- Import Project Modal ---
  const importProjectBtn = document.getElementById('import-project-btn');
  const importModalOverlay = document.getElementById('import-modal-overlay');
  const importModalCancel = document.getElementById('import-modal-cancel');
  const importModalSubmit = document.getElementById('import-modal-submit');
  const importFormSource = document.getElementById('import-form-source');
  const importFormBrowse = document.getElementById('import-form-browse');

  importProjectBtn.addEventListener('click', () => {
    importFormSource.value = '';
    importModalOverlay.style.display = 'flex';
  });

  importModalCancel.addEventListener('click', () => {
    importModalOverlay.style.display = 'none';
  });

  importFormBrowse.addEventListener('click', async () => {
    try {
      const result = await api.invoke('dialog:select-directory');
      if (result && result.path) {
        importFormSource.value = result.path;
      }
    } catch (e) { /* ignore */ }
  });

  importModalSubmit.addEventListener('click', async () => {
    const source = importFormSource.value.trim();
    if (!source) return;
    try {
      const result = await api.invoke('project:import', { source });
      if (result && result.success) {
        importModalOverlay.style.display = 'none';
        await loadProjects();
        projectSelect.value = result.project.id;
        projectSelect.dispatchEvent(new Event('change'));
        showToast('Project imported successfully');
      } else {
        const errMap = {
          'CWB_SETTINGS_NOT_FOUND': 'No .cwb/project-settings.json found in this repo',
          'NOT_A_GIT_REPO': 'Not a valid git repository',
          'DIRECTORY_NOT_FOUND': 'Directory not found',
          'DIRECTORY_ALREADY_EXISTS': 'Directory already exists locally',
        };
        showToast(errMap[result?.error] || result?.error || 'Failed to import', 'error');
      }
    } catch (e) {
      showToast('Failed to import project', 'error');
    }
  });

  // --- Issue Create Modal ---
  const issueModalOverlay = document.getElementById('issue-modal-overlay');
  const issueModalCancel = document.getElementById('issue-modal-cancel');
  const issueModalSubmit = document.getElementById('issue-modal-submit');
  const issueCreateBtn = document.getElementById('issue-create-btn');

  if (issueCreateBtn) {
    issueCreateBtn.addEventListener('click', () => {
      document.getElementById('issue-form-title').value = '';
      document.getElementById('issue-form-description').value = '';
      document.getElementById('issue-form-pipeline-args').value = '';
      document.getElementById('issue-form-labels').value = '';
      issueModalOverlay.style.display = 'flex';
    });
  }

  issueModalCancel.addEventListener('click', () => {
    issueModalOverlay.style.display = 'none';
  });

  issueModalSubmit.addEventListener('click', async () => {
    const issueType = document.getElementById('issue-form-type').value;
    const data = {
      title: document.getElementById('issue-form-title').value.trim(),
      description: document.getElementById('issue-form-description').value.trim(),
      type: issueType,
      priority: document.getElementById('issue-form-priority').value,
      baseBranch: document.getElementById('issue-form-base-branch').value.trim() || 'main',
      pipelineCommand: issueType === 'bugfix' ? '/bugfix-teams' : '/teams',
      pipelineArgs: document.getElementById('issue-form-pipeline-args').value.trim(),
      labels: document.getElementById('issue-form-labels').value
        .split(',').map(s => s.trim()).filter(Boolean)
    };
    if (!data.title) return;
    try {
      const result = await api.invoke('issue:create', data);
      if (result && result.success) {
        issueModalOverlay.style.display = 'none';
        showToast('Issue created');
        loadIssues();
      } else {
        showToast(result?.error || 'Failed', 'error');
      }
    } catch (e) {
      showToast('Failed to create issue', 'error');
    }
  });

  // --- Issues List/Kanban Toggle ---
  const listViewBtn = document.getElementById('issues-list-view-btn');
  const kanbanViewBtn = document.getElementById('issues-kanban-view-btn');
  const listView = document.getElementById('issues-list-view');
  const kanbanView = document.getElementById('issues-kanban-view');

  if (listViewBtn && kanbanViewBtn) {
    listViewBtn.addEventListener('click', () => {
      listView.style.display = '';
      kanbanView.style.display = 'none';
      listViewBtn.classList.add('active');
      kanbanViewBtn.classList.remove('active');
    });
    kanbanViewBtn.addEventListener('click', () => {
      listView.style.display = 'none';
      kanbanView.style.display = '';
      kanbanViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    });
  }

  // --- Issue List Loading ---
  async function loadIssues() {
    try {
      const result = await api.invoke('issue:list');
      if (!result || !result.success) return;
      renderIssueList(result.issues || []);
      renderKanban(result.issues || []);
    } catch (e) { /* ignore */ }
  }

  function renderStepperHtml(status) {
    if (typeof getStepperState !== 'function') return '';
    var steps = getStepperState(status);
    return '<div class="issue-stepper">' + steps.map(function(s) {
      return '<span class="stepper-step stepper-' + s.status + '">' + escapeHtml(s.label) + '</span>';
    }).join('<span class="stepper-arrow">&rarr;</span>') + '</div>';
  }

  function renderDiffSummaryHtml(issue) {
    var r = issue.result;
    if (!r) return '';
    var parts = [];
    if (r.durationMs) {
      var sec = Math.round(r.durationMs / 1000);
      var min = Math.floor(sec / 60);
      parts.push(min > 0 ? min + 'm ' + (sec % 60) + 's' : sec + 's');
    }
    if (r.costUsd !== undefined) parts.push('$' + r.costUsd.toFixed(2));
    if (r.diffSummary) {
      var d = r.diffSummary;
      parts.push(d.filesChanged + ' files, +' + d.insertions + ' -' + d.deletions);
    }
    if (!parts.length) return '';
    return '<div class="issue-result-summary">' + parts.join(' &middot; ') + '</div>';
  }

  function renderIssueList(issues) {
    const tbody = document.getElementById('issue-list-tbody');
    const empty = document.getElementById('issues-empty');
    if (!issues.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = issues.map(issue => `
      <tr>
        <td><code>${issue.id}</code></td>
        <td>
          ${escapeHtml(issue.title)}
          ${renderDiffSummaryHtml(issue)}
          ${renderStepperHtml(issue.status)}
        </td>
        <td><span class="badge badge-${issue.type}">${issue.type}</span></td>
        <td><span class="badge badge-status-${issue.status}">${issue.status}</span></td>
        <td><span class="badge badge-priority-${issue.priority}">${issue.priority}</span></td>
        <td><code>${issue.issueBranch}</code></td>
        <td>
          ${issue.status === 'created' ? `<button class="btn btn-sm btn-primary" onclick="startIssue('${issue.id}')">Start</button>` : ''}
          ${issue.status === 'in-progress' ? `<button class="btn btn-sm btn-danger" onclick="abortIssue('${issue.id}')">Abort</button>` : ''}
          ${issue.status === 'completed' ? `<button class="btn btn-sm btn-primary" onclick="mergeIssue('${issue.id}')">Merge</button> <button class="btn btn-sm btn-danger" onclick="rejectIssue('${issue.id}')">Reject</button>` : ''}
          ${issue.status === 'completed' && issue.result && issue.result.diffSummary ? `<button class="btn btn-sm" onclick="showDiff('${issue.id}')">Diff</button>` : ''}
          ${issue.status === 'failed' ? `<button class="btn btn-sm btn-primary" onclick="startIssue('${issue.id}')">Retry</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  function renderKanban(issues) {
    const statuses = ['created', 'in-progress', 'completed', 'merging', 'merged', 'failed', 'closed'];
    for (const status of statuses) {
      const container = document.getElementById(`kanban-${status}`);
      if (!container) continue;
      const filtered = issues.filter(i => i.status === status);
      container.innerHTML = filtered.map(issue => `
        <div class="kanban-card">
          <div class="kanban-card-id">${issue.id}</div>
          <div class="kanban-card-title">${escapeHtml(issue.title)}</div>
          <div class="kanban-card-meta">
            <span class="badge badge-${issue.type}">${issue.type}</span>
            <span class="badge badge-priority-${issue.priority}">${issue.priority}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Global issue actions
  window.startIssue = async function (issueId) {
    try {
      const result = await api.invoke('issue:start', { issueId });
      if (result && result.success) {
        showToast('Issue started');
        loadIssues();
      } else {
        showToast(result?.error || 'Failed to start issue', 'error');
      }
    } catch (e) {
      showToast('Failed to start issue', 'error');
    }
  };

  window.abortIssue = async function (issueId) {
    try {
      const result = await api.invoke('issue:abort', { issueId });
      if (result && result.success) {
        showToast('Issue aborted');
        loadIssues();
      } else {
        showToast(result?.error || 'Failed', 'error');
      }
    } catch (e) {
      showToast('Failed to abort issue', 'error');
    }
  };

  window.mergeIssue = async function (issueId) {
    try {
      const result = await api.invoke('issue:merge', { issueId });
      if (result && result.success) {
        showToast('Issue merged');
        loadIssues();
      } else {
        showToast(result?.error || 'Failed to merge', 'error');
      }
    } catch (e) {
      showToast('Failed to merge issue', 'error');
    }
  };

  window.rejectIssue = async function (issueId) {
    try {
      const result = await api.invoke('issue:reject', { issueId });
      if (result && result.success) {
        showToast('Issue rejected — reset to created');
        loadIssues();
      } else {
        showToast(result?.error || 'Failed to reject', 'error');
      }
    } catch (e) {
      showToast('Failed to reject issue', 'error');
    }
  };

  window.showDiff = async function (issueId) {
    try {
      const result = await api.invoke('issue:get', { issueId });
      if (!result || !result.success || !result.issue.result || !result.issue.result.diffSummary) {
        showToast('No diff data available', 'error');
        return;
      }
      const diff = result.issue.result.diffSummary;
      const modal = document.getElementById('diff-modal-overlay');
      document.getElementById('diff-modal-title').textContent = issueId + ' — Diff Summary';
      document.getElementById('diff-modal-stats').innerHTML =
        '<strong>' + diff.filesChanged + '</strong> files changed, ' +
        '<span style="color:var(--success-text);">+' + diff.insertions + '</span> ' +
        '<span style="color:var(--danger-text);">-' + diff.deletions + '</span>';
      document.getElementById('diff-modal-files').innerHTML = diff.files.map(function(f) {
        var statusBadge = f.status === 'added' ? 'badge-status-created' :
          f.status === 'deleted' ? 'badge-status-failed' : 'badge-status-in-progress';
        return '<div class="diff-file-row">' +
          '<span class="badge ' + statusBadge + '">' + f.status + '</span> ' +
          '<code>' + escapeHtml(f.path) + '</code> ' +
          '<span style="color:var(--success-text);">+' + f.insertions + '</span> ' +
          '<span style="color:var(--danger-text);">-' + f.deletions + '</span>' +
          '</div>';
      }).join('');
      modal.style.display = 'flex';
    } catch (e) {
      showToast('Failed to load diff', 'error');
    }
  };

  document.getElementById('diff-modal-close')?.addEventListener('click', function() {
    document.getElementById('diff-modal-overlay').style.display = 'none';
  });

  // --- Toast ---
  function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // --- Utility ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ============================================================
  // Dashboard Page
  // ============================================================
  async function loadDashboard() {
    const project = await getActiveProject();
    const noProject = document.getElementById('dashboard-no-project');
    const content = document.getElementById('dashboard-content');
    if (!project) {
      noProject.style.display = '';
      content.style.display = 'none';
      return;
    }
    noProject.style.display = 'none';
    content.style.display = '';

    try {
      const result = await api.invoke('project:get-dashboard', { projectId: project.id });
      if (!result || !result.success) return;
      const d = result.dashboard;
      document.getElementById('stat-issues-value').textContent = d.issueStats.total;
      document.getElementById('stat-containers-value').textContent =
        `${d.containerStats.running}/${d.containerStats.max}`;
      document.getElementById('stat-merged-value').textContent =
        d.issueStats.byStatus['merged'] || 0;
      document.getElementById('stat-failed-value').textContent =
        d.issueStats.byStatus['created'] || 0;
    } catch (e) { /* ignore */ }
  }

  async function getActiveProject() {
    try {
      const result = await api.invoke('project:get-active');
      return result?.project || null;
    } catch { return null; }
  }

  // ============================================================
  // Container Monitor Page
  // ============================================================
  async function loadContainers() {
    try {
      const result = await api.invoke('container:pool-status');
      if (!result || !result.success || !result.pool) {
        document.getElementById('containers-empty').style.display = '';
        document.getElementById('container-grid').innerHTML = '';
        return;
      }
      const pool = result.pool;
      document.getElementById('pool-active').textContent =
        pool.containers.filter(c => c.status !== 'idle').length;
      document.getElementById('pool-max').textContent = pool.maxContainers;

      const grid = document.getElementById('container-grid');
      const empty = document.getElementById('containers-empty');

      if (!pool.containers.length) {
        grid.innerHTML = '';
        empty.style.display = '';
        return;
      }
      empty.style.display = 'none';

      grid.innerHTML = pool.containers.map(c => `
        <div class="stat-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <code style="font-size:0.78rem;">${c.id.substring(0, 8)}</code>
            <span class="badge badge-status-${c.status === 'idle' ? 'closed' : c.status === 'running' ? 'in-progress' : 'created'}">${c.status}</span>
          </div>
          ${c.assignedIssueId ? `<div style="font-size:0.82rem;">Issue: <strong>${c.assignedIssueId}</strong></div>` : '<div style="font-size:0.82rem;color:var(--text-muted);">Idle</div>'}
          <div style="margin-top:8px;">
            <button class="btn btn-sm btn-danger" onclick="destroyContainer('${c.id}')">Destroy</button>
          </div>
        </div>
      `).join('');

      // Queued issues
      const queueList = document.getElementById('container-queue-list');
      if (pool.queuedIssues.length) {
        queueList.innerHTML = pool.queuedIssues.map(id =>
          `<div style="padding:4px 0;font-size:0.85rem;">${id}</div>`
        ).join('');
      } else {
        queueList.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">No queued issues</div>';
      }
    } catch (e) { /* ignore */ }
  }

  window.destroyContainer = async function (containerId) {
    try {
      await api.invoke('container:destroy', { containerId });
      showToast('Container destroyed');
      loadContainers();
    } catch (e) {
      showToast('Failed to destroy container', 'error');
    }
  };

  // ============================================================
  // Pipeline Page
  // ============================================================
  const pipelineLogContent = document.getElementById('pipeline-log-content');
  const logFilterSelect = document.getElementById('log-filter-issue');
  let pipelineLogs = [];
  let logFilterTag = 'all';

  function appendPipelineLog(entry) {
    pipelineLogs.push(entry);
    if (pipelineLogs.length > 500) pipelineLogs = pipelineLogs.slice(-500);
    updateLogFilterOptions();
    renderPipelineLogs();
  }

  function updateLogFilterOptions() {
    if (!logFilterSelect) return;
    var tags = (typeof getUniqueTags === 'function') ? getUniqueTags(pipelineLogs) : [];
    var current = logFilterSelect.value;
    logFilterSelect.innerHTML = '<option value="all">All Issues</option>';
    tags.forEach(function(tag) {
      var opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      logFilterSelect.appendChild(opt);
    });
    logFilterSelect.value = current || 'all';
  }

  function renderPipelineLogs() {
    if (!pipelineLogContent) return;
    var filtered = (typeof filterLogsByIssue === 'function')
      ? filterLogsByIssue(pipelineLogs, logFilterTag)
      : pipelineLogs;
    pipelineLogContent.innerHTML = filtered.map(l => {
      const color = l.type === 'error' ? 'var(--danger-text)' :
        l.type === 'assistant' ? 'var(--success-text)' :
          l.type === 'system' ? 'var(--info-text)' : 'var(--text-primary)';
      return `<div style="color:${color};">[${l.tag || ''}] ${escapeHtml(l.content)}</div>`;
    }).join('');
    pipelineLogContent.scrollTop = pipelineLogContent.scrollHeight;
  }

  if (logFilterSelect) {
    logFilterSelect.addEventListener('change', function() {
      logFilterTag = logFilterSelect.value;
      renderPipelineLogs();
    });
  }

  const logCollapseAll = document.getElementById('log-collapse-all');
  const logExpandAll = document.getElementById('log-expand-all');
  if (logCollapseAll) logCollapseAll.addEventListener('click', () => { pipelineLogs = []; updateLogFilterOptions(); renderPipelineLogs(); });
  if (logExpandAll) logExpandAll.addEventListener('click', () => renderPipelineLogs());

  // ============================================================
  // Repositories Page
  // ============================================================
  async function loadRepos() {
    const project = await getActiveProject();
    if (!project) return;
    try {
      const result = await api.invoke('project:repo:list', { projectId: project.id });
      if (!result || !result.success) return;
      const repos = result.repos || [];
      const tbody = document.getElementById('repo-tbody');
      const empty = document.getElementById('repos-empty');
      if (!repos.length) {
        tbody.innerHTML = '';
        empty.style.display = '';
        return;
      }
      empty.style.display = 'none';
      tbody.innerHTML = repos.map(r => `
        <tr>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td><code style="font-size:0.78rem;">${escapeHtml(r.remoteUrl)}</code></td>
          <td><code style="font-size:0.78rem;">${escapeHtml(r.submodulePath)}</code></td>
          <td><button class="btn btn-sm btn-danger" onclick="removeRepo('${r.id}')">Remove</button></td>
        </tr>
      `).join('');
    } catch (e) { /* ignore */ }
  }

  document.getElementById('repo-add-btn')?.addEventListener('click', async () => {
    const repoUrl = prompt('Git remote URL:');
    if (!repoUrl) return;
    const name = prompt('Repository name:');
    if (!name) return;
    const project = await getActiveProject();
    if (!project) { showToast('No active project', 'error'); return; }
    try {
      const result = await api.invoke('project:repo:add', { projectId: project.id, repoUrl, name });
      if (result && result.success) { showToast('Repository added'); loadRepos(); }
      else showToast(result?.error || 'Failed', 'error');
    } catch (e) { showToast('Failed', 'error'); }
  });

  document.getElementById('repo-sync-btn')?.addEventListener('click', async () => {
    const project = await getActiveProject();
    if (!project) return;
    try {
      await api.invoke('project:repo:sync-submodules', { projectId: project.id });
      showToast('Submodules synced');
    } catch (e) { showToast('Sync failed', 'error'); }
  });

  window.removeRepo = async function (repoId) {
    const project = await getActiveProject();
    if (!project) return;
    try {
      await api.invoke('project:repo:remove', { projectId: project.id, repoId });
      showToast('Repository removed'); loadRepos();
    } catch (e) { showToast('Failed', 'error'); }
  };

  // ============================================================
  // Wiki Page
  // ============================================================
  const wikiHostBtn = document.getElementById('wiki-host-btn');
  const wikiPanelBtn = document.getElementById('wiki-panel-btn');
  const wikiStatusText = document.getElementById('wiki-status-text');
  let wikiRunning = false;

  async function checkWikiStatus() {
    try {
      const status = await api.invoke('wiki-host:status');
      wikiRunning = status?.running || false;
      wikiStatusText.textContent = wikiRunning ? `Running (${status.url})` : 'Stopped';
      wikiHostBtn.textContent = wikiRunning ? 'Stop Server' : 'Start Server';
    } catch (e) { /* ignore */ }
  }

  wikiHostBtn?.addEventListener('click', async () => {
    if (wikiRunning) {
      await api.invoke('wiki-host:stop');
    } else {
      const project = await getActiveProject();
      await api.invoke('wiki-host:start', { workspacePath: project?.issueRepoPath });
    }
    checkWikiStatus();
  });

  wikiPanelBtn?.addEventListener('click', async () => {
    await api.invoke('wiki-host:open-browser');
  });

  // ============================================================
  // Settings Page
  // ============================================================
  async function loadSettings() {
    try {
      const result = await api.invoke('app:settings:get');
      if (result?.success) {
        const s = result.settings;
        document.getElementById('settings-data-root').value = s.dataRootPath || '';
      }
    } catch (e) { /* ignore */ }

    // Project settings
    const project = await getActiveProject();
    if (project) {
      document.getElementById('settings-max-containers').value = project.settings.maxContainers;
      document.getElementById('settings-test-command').value = project.settings.testCommand || '';
    }

    // Docker status
    try {
      const dockerResult = await api.invoke('app:docker:check');
      const dockerEl = document.getElementById('docker-status-text');
      if (dockerResult?.available) {
        dockerEl.textContent = `Available (${dockerResult.version})`;
        dockerEl.style.color = 'var(--success-text)';
      } else {
        dockerEl.textContent = 'Not available';
        dockerEl.style.color = 'var(--danger-text)';
      }
    } catch (e) { /* ignore */ }

    // GitHub status
    loadGitHubStatus();
  }

  document.getElementById('settings-browse-path')?.addEventListener('click', async () => {
    try {
      const result = await api.invoke('dialog:select-directory');
      if (result?.path) {
        document.getElementById('settings-data-root').value = result.path;
      }
    } catch (e) { /* ignore */ }
  });

  document.getElementById('settings-save-btn')?.addEventListener('click', async () => {
    const project = await getActiveProject();

    // Save app settings
    await api.invoke('app:settings:update', {
      dataRootPath: document.getElementById('settings-data-root').value,
    });

    // Save project settings
    if (project) {
      await api.invoke('project:update', {
        projectId: project.id,
        settings: {
          maxContainers: parseInt(document.getElementById('settings-max-containers').value) || 3,
          testCommand: document.getElementById('settings-test-command').value || undefined,
        },
      });
    }
    showToast('Settings saved');
  });

  // ============================================================
  // GitHub Account Settings
  // ============================================================
  let _ghConnected = false;

  async function loadGitHubStatus() {
    try {
      const result = await api.invoke('github:check-connection');
      const dot = document.getElementById('github-dot');
      const statusText = document.getElementById('github-status-text');
      const usernameEl = document.getElementById('github-username');
      const tokenSection = document.getElementById('github-token-section');
      const connectedSection = document.getElementById('github-connected-section');
      const browseBtn = document.getElementById('repo-browse-github-btn');

      if (result?.success && result.status?.connected) {
        _ghConnected = true;
        dot.className = 'github-status-dot github-dot-connected';
        statusText.textContent = '';
        usernameEl.textContent = result.status.username;
        usernameEl.style.display = '';
        tokenSection.style.display = 'none';
        connectedSection.style.display = '';
        if (browseBtn) browseBtn.style.display = '';
      } else {
        _ghConnected = false;
        dot.className = 'github-status-dot github-dot-disconnected';
        statusText.setAttribute('data-i18n', 'settings.github.disconnected');
        statusText.textContent = 'Not connected';
        usernameEl.style.display = 'none';
        tokenSection.style.display = '';
        connectedSection.style.display = 'none';
        if (browseBtn) browseBtn.style.display = 'none';
        // Re-apply i18n if available
        if (typeof applyI18n === 'function') applyI18n();
      }
    } catch (e) { /* ignore */ }
  }

  document.getElementById('github-connect-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('github-token-input');
    const token = input.value.trim();
    if (!token) return;
    const btn = document.getElementById('github-connect-btn');
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const result = await api.invoke('github:set-token', { token });
      if (result?.success) {
        input.value = '';
        await loadGitHubStatus();
        showToast('GitHub connected');
      } else {
        showToast(result?.error || 'Failed to connect', 'error');
      }
    } catch (e) {
      showToast('Failed to connect', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Connect';
      if (typeof applyI18n === 'function') applyI18n();
    }
  });

  document.getElementById('github-disconnect-btn')?.addEventListener('click', async () => {
    try {
      await api.invoke('github:remove-token');
      await loadGitHubStatus();
      showToast('GitHub disconnected');
    } catch (e) {
      showToast('Failed to disconnect', 'error');
    }
  });

  // ============================================================
  // GitHub Repo Browser
  // ============================================================
  let ghRepoPage = 1;
  let ghRepoSearchQuery = '';
  let ghSearchTimer = null;

  document.getElementById('repo-browse-github-btn')?.addEventListener('click', async () => {
    if (!_ghConnected) {
      showToast('Connect GitHub account first in Settings', 'error');
      return;
    }
    ghRepoPage = 1;
    ghRepoSearchQuery = '';
    const searchInput = document.getElementById('github-repo-search');
    if (searchInput) searchInput.value = '';
    await loadGitHubRepos();
    document.getElementById('github-repo-modal-overlay').style.display = 'flex';
  });

  document.getElementById('github-repo-modal-cancel')?.addEventListener('click', () => {
    document.getElementById('github-repo-modal-overlay').style.display = 'none';
  });

  document.getElementById('github-repo-search')?.addEventListener('input', (e) => {
    if (ghSearchTimer) clearTimeout(ghSearchTimer);
    ghSearchTimer = setTimeout(() => {
      ghRepoSearchQuery = e.target.value.trim();
      ghRepoPage = 1;
      loadGitHubRepos();
    }, 300);
  });

  document.getElementById('github-repo-prev')?.addEventListener('click', () => {
    if (ghRepoPage > 1) { ghRepoPage--; loadGitHubRepos(); }
  });

  document.getElementById('github-repo-next')?.addEventListener('click', () => {
    ghRepoPage++;
    loadGitHubRepos();
  });

  async function loadGitHubRepos() {
    const listEl = document.getElementById('github-repo-list');
    listEl.innerHTML = '<div class="empty-state" style="padding:24px;">Loading...</div>';

    try {
      let result;
      if (ghRepoSearchQuery) {
        result = await api.invoke('github:search-repos', {
          query: ghRepoSearchQuery, page: ghRepoPage, perPage: 20
        });
      } else {
        result = await api.invoke('github:list-repos', {
          page: ghRepoPage, perPage: 20, sort: 'updated'
        });
      }

      if (!result?.success || !result.result) {
        listEl.innerHTML = '<div class="empty-state" style="padding:24px;">Failed to load</div>';
        return;
      }

      const repos = result.result.repos || [];
      const hasNext = result.result.hasNextPage;

      if (!repos.length) {
        listEl.innerHTML = '<div class="empty-state" style="padding:24px;">No repositories found</div>';
        document.getElementById('github-repo-pagination').style.display = 'none';
        return;
      }

      listEl.innerHTML = repos.map(r => `
        <div class="github-repo-item" data-clone-url="${escapeHtml(r.cloneUrl)}" data-name="${escapeHtml(r.name)}">
          <div class="github-repo-info">
            <div class="github-repo-name">${escapeHtml(r.fullName)}</div>
            <div class="github-repo-desc">${escapeHtml(r.description || '')}</div>
            <div class="github-repo-meta">
              ${r.language ? `<span>${escapeHtml(r.language)}</span>` : ''}
              <span>&#9733; ${r.stargazersCount}</span>
              ${r.private ? '<span class="badge">private</span>' : ''}
            </div>
          </div>
          <button class="btn btn-sm btn-primary github-repo-select-btn">Select</button>
        </div>
      `).join('');

      // Pagination
      const pag = document.getElementById('github-repo-pagination');
      if (ghRepoPage > 1 || hasNext) {
        pag.style.display = 'flex';
        document.getElementById('github-repo-prev').disabled = ghRepoPage <= 1;
        document.getElementById('github-repo-next').disabled = !hasNext;
        document.getElementById('github-repo-page-info').textContent = 'Page ' + ghRepoPage;
      } else {
        pag.style.display = 'none';
      }
    } catch (e) {
      listEl.innerHTML = '<div class="empty-state" style="padding:24px;">Error loading repos</div>';
    }
  }

  // Handle repo selection via event delegation
  document.getElementById('github-repo-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.github-repo-select-btn');
    if (!btn) return;
    const item = btn.closest('.github-repo-item');
    if (!item) return;

    const cloneUrl = item.dataset.cloneUrl;
    const name = item.dataset.name;

    document.getElementById('github-repo-modal-overlay').style.display = 'none';

    const project = await getActiveProject();
    if (!project) { showToast('No active project', 'error'); return; }

    try {
      const result = await api.invoke('project:repo:add', { projectId: project.id, repoUrl: cloneUrl, name });
      if (result?.success) { showToast('Repository added'); loadRepos(); }
      else showToast(result?.error || 'Failed to add repository', 'error');
    } catch (e) {
      showToast('Failed to add repository', 'error');
    }
  });

  // ============================================================
  // Project Change Handler
  // ============================================================
  projectSelect.addEventListener('change', async () => {
    const projectId = projectSelect.value;
    if (projectId) {
      try {
        await api.invoke('project:set-active', { projectId });
        // Auto sync (pull from remote)
        await api.invoke('project:sync', { projectId }).catch(() => {});
        // Reload all pages
        loadDashboard();
        loadIssues();
        loadContainers();
        loadRepos();
        checkWikiStatus();
        loadSettings();
      } catch (e) { /* ignore */ }
    }
  });

  // ============================================================
  // IPC Event Listeners
  // ============================================================
  api.on('issue:list-updated', () => { loadIssues(); loadDashboard(); });
  api.on('issue:status-changed', () => { loadIssues(); loadDashboard(); });
  api.on('container:pool-updated', () => loadContainers());
  api.on('container:status-changed', () => loadContainers());
  api.on('pipeline:log', (entry) => appendPipelineLog(entry));
  api.on('project:active-changed', () => {
    loadDashboard();
    loadIssues();
    loadContainers();
    loadRepos();
    checkWikiStatus();
    loadSettings();
  });

  // ============================================================
  // Init
  // ============================================================
  loadProjects();
  loadDashboard();
  checkWikiStatus();
  loadGitHubStatus();
  navigateTo('dashboard');
})();
