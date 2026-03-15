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
  const projectFormPath = document.getElementById('project-form-path');
  const projectFormBrowse = document.getElementById('project-form-browse');

  newProjectBtn.addEventListener('click', () => {
    projectFormName.value = '';
    projectFormPath.value = '';
    projectModalOverlay.style.display = 'flex';
  });

  projectModalCancel.addEventListener('click', () => {
    projectModalOverlay.style.display = 'none';
  });

  projectFormBrowse.addEventListener('click', async () => {
    try {
      const result = await api.invoke('dialog:select-directory');
      if (result && result.path) {
        projectFormPath.value = result.path;
      }
    } catch (e) { /* ignore */ }
  });

  projectModalSubmit.addEventListener('click', async () => {
    const name = projectFormName.value.trim();
    const localBasePath = projectFormPath.value.trim();
    if (!name || !localBasePath) return;
    try {
      const result = await api.invoke('project:create', { name, localBasePath });
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
  const importFormPath = document.getElementById('import-form-path');
  const importFormBrowse = document.getElementById('import-form-browse');

  importProjectBtn.addEventListener('click', () => {
    importFormPath.value = '';
    importModalOverlay.style.display = 'flex';
  });

  importModalCancel.addEventListener('click', () => {
    importModalOverlay.style.display = 'none';
  });

  importFormBrowse.addEventListener('click', async () => {
    try {
      const result = await api.invoke('dialog:select-directory');
      if (result && result.path) {
        importFormPath.value = result.path;
      }
    } catch (e) { /* ignore */ }
  });

  importModalSubmit.addEventListener('click', async () => {
    const issueRepoPath = importFormPath.value.trim();
    if (!issueRepoPath) return;
    try {
      const result = await api.invoke('project:import', { issueRepoPath });
      if (result && result.success) {
        importModalOverlay.style.display = 'none';
        await loadProjects();
        projectSelect.value = result.project.id;
        projectSelect.dispatchEvent(new Event('change'));
        showToast('Project imported successfully');
      } else {
        const errMsg = result?.error === 'CWB_SETTINGS_NOT_FOUND'
          ? 'No .cwb/project-settings.json found in this repo'
          : result?.error || 'Failed to import project';
        showToast(errMsg, 'error');
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
    const data = {
      title: document.getElementById('issue-form-title').value.trim(),
      description: document.getElementById('issue-form-description').value.trim(),
      type: document.getElementById('issue-form-type').value,
      priority: document.getElementById('issue-form-priority').value,
      baseBranch: document.getElementById('issue-form-base-branch').value.trim() || 'main',
      targetBranch: document.getElementById('issue-form-target-branch').value.trim() || 'main',
      pipelineCommand: document.getElementById('issue-form-pipeline').value,
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
        <td>${escapeHtml(issue.title)}</td>
        <td><span class="badge badge-${issue.type}">${issue.type}</span></td>
        <td><span class="badge badge-status-${issue.status}">${issue.status}</span></td>
        <td><span class="badge badge-priority-${issue.priority}">${issue.priority}</span></td>
        <td><code>${issue.issueBranch}</code></td>
        <td>
          ${issue.status === 'created' ? `<button class="btn btn-sm btn-primary" onclick="startIssue('${issue.id}')">Start</button>` : ''}
          ${['in-progress', 'testing', 'review'].includes(issue.status) ? `<button class="btn btn-sm btn-danger" onclick="abortIssue('${issue.id}')">Abort</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  function renderKanban(issues) {
    const statuses = ['created', 'in-progress', 'testing', 'review', 'merged', 'closed'];
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
  let pipelineLogs = [];

  function appendPipelineLog(entry) {
    pipelineLogs.push(entry);
    if (pipelineLogs.length > 500) pipelineLogs = pipelineLogs.slice(-500);
    renderPipelineLogs();
  }

  function renderPipelineLogs() {
    if (!pipelineLogContent) return;
    pipelineLogContent.innerHTML = pipelineLogs.map(l => {
      const color = l.type === 'error' ? 'var(--danger-text)' :
        l.type === 'assistant' ? 'var(--success-text)' :
          l.type === 'system' ? 'var(--info-text)' : 'var(--text-primary)';
      return `<div style="color:${color};">[${l.tag || ''}] ${escapeHtml(l.content)}</div>`;
    }).join('');
    pipelineLogContent.scrollTop = pipelineLogContent.scrollHeight;
  }

  const logCollapseAll = document.getElementById('log-collapse-all');
  const logExpandAll = document.getElementById('log-expand-all');
  if (logCollapseAll) logCollapseAll.addEventListener('click', () => { pipelineLogs = []; renderPipelineLogs(); });
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
        document.getElementById('settings-default-path').value = s.defaultProjectPath || '';
      }
    } catch (e) { /* ignore */ }

    // Project settings
    const project = await getActiveProject();
    if (project) {
      document.getElementById('settings-max-containers').value = project.settings.maxContainers;
      document.getElementById('settings-auto-merge').checked = project.settings.autoMerge;
      document.getElementById('settings-merge-strategy').value = project.settings.mergeStrategy;
      document.getElementById('settings-test-command').value = project.settings.testCommand || '';
      document.getElementById('settings-review-enabled').checked = project.settings.reviewEnabled;
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
  }

  document.getElementById('settings-browse-path')?.addEventListener('click', async () => {
    try {
      const result = await api.invoke('dialog:select-directory');
      if (result?.path) {
        document.getElementById('settings-default-path').value = result.path;
      }
    } catch (e) { /* ignore */ }
  });

  document.getElementById('settings-save-btn')?.addEventListener('click', async () => {
    const project = await getActiveProject();

    // Save app settings
    await api.invoke('app:settings:update', {
      defaultProjectPath: document.getElementById('settings-default-path').value,
    });

    // Save project settings
    if (project) {
      await api.invoke('project:update', {
        projectId: project.id,
        settings: {
          maxContainers: parseInt(document.getElementById('settings-max-containers').value) || 3,
          autoMerge: document.getElementById('settings-auto-merge').checked,
          mergeStrategy: document.getElementById('settings-merge-strategy').value,
          testCommand: document.getElementById('settings-test-command').value || undefined,
          reviewEnabled: document.getElementById('settings-review-enabled').checked,
        },
      });
    }
    showToast('Settings saved');
  });

  // ============================================================
  // Project Change Handler
  // ============================================================
  projectSelect.addEventListener('change', async () => {
    const projectId = projectSelect.value;
    if (projectId) {
      try {
        await api.invoke('project:set-active', { projectId });
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
  navigateTo('dashboard');
})();
