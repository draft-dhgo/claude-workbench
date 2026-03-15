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

  projectSelect.addEventListener('change', async () => {
    const projectId = projectSelect.value;
    if (projectId) {
      try {
        await api.invoke('project:set-active', { projectId });
      } catch (e) { /* ignore */ }
    }
  });

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

  // --- IPC Event Listeners ---
  api.on('issue:list-updated', () => loadIssues());
  api.on('issue:status-changed', () => loadIssues());

  // --- Init ---
  loadProjects();
  navigateTo('dashboard');
})();
