const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const PROJECT_ROOT = '/Users/godaehyeon/Desktop/abc/claude-workbench';
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'docs', 'screenshots');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(`file://${path.join(PROJECT_ROOT, 'src/renderer/index.html')}`, { waitUntil: 'domcontentloaded' });

  // Mock electronAPI
  await page.evaluate(() => {
    window.electronAPI = {
      invoke: async (ch, data) => {
        if (ch === 'app:version') return '2.0.0';
        if (ch === 'project:list') return { success: true, projects: [
          { id: '1', name: 'my-saas-app' }, { id: '2', name: 'mobile-client' }
        ]};
        if (ch === 'project:set-active') return { success: true };
        if (ch === 'project:sync') return { success: true, pulled: true };
        if (ch === 'project:get-active') return { success: true, project: {
          id: '1', name: 'my-saas-app', issueRepoPath: '/projects/my-saas-app-issues',
          settings: { maxContainers: 5, testCommand: 'npm test', lang: 'en' }, devRepos: []
        }};
        if (ch === 'project:get-dashboard') return { success: true, dashboard: {
          project: { id: '1', name: 'my-saas-app' },
          issueStats: { total: 8, byStatus: { created: 1, 'in-progress': 2, completed: 2, merging: 0, merged: 2, failed: 1, closed: 0 } },
          containerStats: { total: 3, running: 2, idle: 1, max: 5 },
          recentActivity: []
        }};
        if (ch === 'issue:list') return { success: true, issues: [
          { id: 'ISSUE-001', title: 'Add OAuth2 authentication', type: 'feature', status: 'completed', priority: 'high', issueBranch: 'issue/ISSUE-001', baseBranch: 'main' },
          { id: 'ISSUE-002', title: 'Fix session token expiry bug', type: 'bugfix', status: 'in-progress', priority: 'critical', issueBranch: 'issue/ISSUE-002', baseBranch: 'main' },
          { id: 'ISSUE-003', title: 'Implement user profile page', type: 'feature', status: 'merged', priority: 'medium', issueBranch: 'issue/ISSUE-003', baseBranch: 'main' },
          { id: 'ISSUE-004', title: 'Add rate limiting middleware', type: 'feature', status: 'in-progress', priority: 'medium', issueBranch: 'issue/ISSUE-004', baseBranch: 'develop' },
          { id: 'ISSUE-005', title: 'Database connection pool optimization', type: 'feature', status: 'completed', priority: 'low', issueBranch: 'issue/ISSUE-005', baseBranch: 'main' },
          { id: 'ISSUE-006', title: 'Fix CORS headers in API gateway', type: 'bugfix', status: 'failed', priority: 'high', issueBranch: 'issue/ISSUE-006', baseBranch: 'main' },
          { id: 'ISSUE-007', title: 'Setup CI/CD pipeline', type: 'feature', status: 'created', priority: 'medium', issueBranch: 'issue/ISSUE-007', baseBranch: 'main' },
          { id: 'ISSUE-008', title: 'Migrate to PostgreSQL 16', type: 'feature', status: 'merged', priority: 'high', issueBranch: 'issue/ISSUE-008', baseBranch: 'main' },
        ]};
        if (ch === 'container:pool-status') return { success: true, pool: {
          projectId: '1', maxContainers: 5,
          containers: [
            { id: 'a1b2c3d4-1111-2222-3333-444455556666', status: 'running', assignedIssueId: 'ISSUE-002' },
            { id: 'e5f6g7h8-1111-2222-3333-444455556666', status: 'running', assignedIssueId: 'ISSUE-004' },
            { id: 'i9j0k1l2-1111-2222-3333-444455556666', status: 'idle' },
          ],
          queuedIssues: ['ISSUE-007']
        }};
        if (ch === 'project:repo:list') return { success: true, repos: [
          { id: 'r1', name: 'backend-api', remoteUrl: 'https://github.com/myorg/backend-api.git', submodulePath: 'repos/backend-api' },
          { id: 'r2', name: 'frontend-web', remoteUrl: 'https://github.com/myorg/frontend-web.git', submodulePath: 'repos/frontend-web' },
          { id: 'r3', name: 'shared-types', remoteUrl: 'https://github.com/myorg/shared-types.git', submodulePath: 'repos/shared-types' },
        ]};
        if (ch === 'wiki-host:status') return { running: false };
        if (ch === 'app:settings:get') return { success: true, settings: { dataRootPath: '/Users/dev/claude-workbench-data' } };
        if (ch === 'app:docker:check') return { success: true, available: true, version: '24.0.7' };
        if (ch === 'pipeline:status') return { success: true, running: true };
        return { success: true };
      },
      on: () => {},
      send: () => {}
    };
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  // Apply i18n
  const enLocale = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'src/renderer/locales/en.json'), 'utf-8'));
  await page.evaluate((locale) => {
    document.querySelectorAll('[data-i18n]').forEach(el => { if (locale[el.dataset.i18n]) el.textContent = locale[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { if (locale[el.dataset.i18nPlaceholder]) el.placeholder = locale[el.dataset.i18nPlaceholder]; });
  }, enLocale);

  // Load app.js
  const appJs = fs.readFileSync(path.join(PROJECT_ROOT, 'src/renderer/scripts/app.js'), 'utf-8');
  await page.evaluate(appJs);
  await new Promise(r => setTimeout(r, 800));

  // Hide modals
  await page.evaluate(() => {
    ['project-modal-overlay', 'import-modal-overlay', 'issue-modal-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });
  await new Promise(r => setTimeout(r, 200));

  // 1. Dashboard
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dashboard.png') });
  console.log('1/8 dashboard.png');

  // 2. Issues (list)
  await page.evaluate(() => document.querySelector('[data-page="issues"]').click());
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    ['project-modal-overlay', 'import-modal-overlay', 'issue-modal-overlay'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'issues.png') });
  console.log('2/8 issues.png');

  // 3. Issues (kanban)
  await page.evaluate(() => { const b = document.getElementById('issues-kanban-view-btn'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'issues-kanban.png') });
  console.log('3/8 issues-kanban.png');

  // 4. Containers
  await page.evaluate(() => document.querySelector('[data-page="containers"]').click());
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'containers.png') });
  console.log('4/8 containers.png');

  // 5. Pipeline (with mock logs)
  await page.evaluate(() => document.querySelector('[data-page="pipeline"]').click());
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    const logContent = document.getElementById('pipeline-log-content');
    const pipelineList = document.getElementById('pipeline-list');
    if (pipelineList) {
      pipelineList.innerHTML = [
        '<div style="font-size:0.85rem;padding:8px 0;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;"><span><strong>ISSUE-002</strong> — Fix session token expiry bug</span><span class="badge badge-status-in-progress" style="padding:2px 8px;border-radius:10px;font-size:0.72rem;">running</span></div>',
        '<div style="font-size:0.85rem;padding:8px 0;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;"><span><strong>ISSUE-004</strong> — Add rate limiting middleware</span><span class="badge badge-status-in-progress" style="padding:2px 8px;border-radius:10px;font-size:0.72rem;">running</span></div>',
        '<div style="font-size:0.85rem;padding:8px 0;display:flex;justify-content:space-between;"><span><strong>ISSUE-001</strong> — Add OAuth2 authentication</span><span class="badge badge-status-completed" style="padding:2px 8px;border-radius:10px;font-size:0.72rem;">completed</span></div>',
      ].join('');
    }
    if (logContent) {
      logContent.innerHTML = [
        { c: 'var(--info-text)', t: '[ISSUE-002] [system] Starting pipeline: /bugfix-teams Fix session token expiry bug' },
        { c: 'var(--success-text)', t: '[ISSUE-002] [assistant] Analyzing bug: session tokens not refreshed on re-login...' },
        { c: 'var(--success-text)', t: '[ISSUE-002] [assistant] Root cause identified: TokenService.refresh() skips validation' },
        { c: 'var(--success-text)', t: '[ISSUE-002] [assistant] Writing fix in src/auth/tokenService.ts' },
        { c: 'var(--success-text)', t: '[ISSUE-002] [assistant] Adding test: tokenService.refresh.test.ts — 5 test cases' },
        { c: 'var(--info-text)', t: '[ISSUE-004] [system] Starting pipeline: /teams Add rate limiting middleware' },
        { c: 'var(--success-text)', t: '[ISSUE-004] [assistant] Designing token bucket rate limiter...' },
        { c: 'var(--success-text)', t: '[ISSUE-004] [assistant] Implementing RateLimiterMiddleware in src/middleware/rateLimiter.ts' },
        { c: 'var(--success-text)', t: '[ISSUE-001] [assistant] All tests passed (18/18). Pipeline complete.' },
        { c: 'var(--info-text)', t: '[ISSUE-001] [system] Pipeline completed successfully (cost: $0.38, duration: 2m 47s)' },
      ].map(l => `<div style="color:${l.c};padding:1px 0;">${l.t}</div>`).join('');
    }
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'pipeline.png') });
  console.log('5/8 pipeline.png');

  // 6. Repositories
  await page.evaluate(() => document.querySelector('[data-page="repositories"]').click());
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'repositories.png') });
  console.log('6/8 repositories.png');

  // 7. Settings
  await page.evaluate(() => document.querySelector('[data-page="settings"]').click());
  await new Promise(r => setTimeout(r, 400));
  // Fill in settings values
  await page.evaluate(() => {
    const mc = document.getElementById('settings-max-containers'); if (mc) mc.value = '5';
    const tc = document.getElementById('settings-test-command'); if (tc) tc.value = 'npm test';
    const dr = document.getElementById('settings-data-root'); if (dr) dr.value = '/Users/dev/claude-workbench-data';
    const ds = document.getElementById('docker-status-text');
    if (ds) { ds.textContent = 'Available (24.0.7)'; ds.style.color = 'var(--success-text)'; }
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings.png') });
  console.log('7/8 settings.png');

  // 8. Issue create modal
  await page.evaluate(() => document.querySelector('[data-page="issues"]').click());
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => { const b = document.getElementById('issues-list-view-btn'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = document.getElementById('issue-create-btn'); if (btn) btn.click();
    const mo = document.getElementById('project-modal-overlay'); if (mo) mo.style.display = 'none';
    const io = document.getElementById('import-modal-overlay'); if (io) io.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'issue-create.png') });
  console.log('8/8 issue-create.png');

  await browser.close();
  console.log('Done!');
}
main().catch(e => { console.error(e); process.exit(1); });
