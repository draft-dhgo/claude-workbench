import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SSDIR = path.join(ROOT, 'docs', 'screenshots');
const VP = { width: 1200, height: 800, deviceScaleFactor: 2 };

const css = fs.readFileSync(path.join(ROOT, 'src/renderer/styles.css'), 'utf-8');
const orig = fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf-8');
const locale = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/renderer/locales/en.json'), 'utf-8'));
const stepperJs = fs.readFileSync(path.join(ROOT, 'src/renderer/scripts/statusStepper.js'), 'utf-8');
const logFilterJs = fs.readFileSync(path.join(ROOT, 'src/renderer/scripts/logFilter.js'), 'utf-8');

const body = orig.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<script[^>]*><\/script>/g, '');

const tmpHtml = '/tmp/cwb-screenshots.html';
fs.writeFileSync(tmpHtml, `<!DOCTYPE html>
<html lang="en" data-theme="dark"><head><meta charset="UTF-8"><style>${css}</style></head>
<body>${body}<script>
var _l=${JSON.stringify(locale)};
document.querySelectorAll('[data-i18n]').forEach(function(e){if(_l[e.dataset.i18n])e.textContent=_l[e.dataset.i18n];});
document.querySelectorAll('[data-i18n-placeholder]').forEach(function(e){var k=e.dataset.i18nPlaceholder;if(_l[k])e.placeholder=_l[k];});
${stepperJs}
${logFilterJs}
</script></body></html>`);

const ISSUES = [
  { id:'ISSUE-001', title:'Add user authentication', type:'feature', status:'merged', priority:'high', issueBranch:'issue/ISSUE-001',
    result:{ costUsd:0.18, durationMs:154000, diffSummary:{ filesChanged:4, insertions:198, deletions:3, files:[
      {path:'src/auth/jwt.js',insertions:85,deletions:0,status:'added'},{path:'src/auth/middleware.js',insertions:42,deletions:0,status:'added'},
      {path:'src/routes/auth.js',insertions:68,deletions:0,status:'added'},{path:'src/index.js',insertions:3,deletions:3,status:'modified'}]}}},
  { id:'ISSUE-002', title:'Fix null pointer in config loader', type:'bugfix', status:'completed', priority:'critical', issueBranch:'issue/ISSUE-002',
    result:{ costUsd:0.05, durationMs:42000, diffSummary:{ filesChanged:2, insertions:12, deletions:5, files:[
      {path:'src/config.js',insertions:8,deletions:5,status:'modified'},{path:'tests/config.test.js',insertions:4,deletions:0,status:'added'}]}}},
  { id:'ISSUE-003', title:'Add rate limiting middleware', type:'feature', status:'created', priority:'medium', issueBranch:'issue/ISSUE-003' },
  { id:'ISSUE-004', title:'Refactor database connection pool', type:'feature', status:'in-progress', priority:'high', issueBranch:'issue/ISSUE-004' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper: show=setAttribute style block!important, hide=display:none!important
function showHideJS(showId, hideSelector) {
  return `document.querySelectorAll('${hideSelector}').forEach(function(e){e.setAttribute('style','display:none !important');});
  document.getElementById('${showId}').setAttribute('style','display:block !important');`;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VP);
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0' });
  await sleep(300);

  // Hide all overlays
  await page.evaluate(() => {
    document.querySelectorAll('.dialog-overlay').forEach(e => e.setAttribute('style','display:none !important'));
    document.getElementById('project-select').innerHTML = '<option value="p1" selected>sample-api</option>';
    var vt = document.getElementById('version-text'); if(vt) vt.textContent = '1.0.0';
  });

  async function nav(name) {
    await page.evaluate((n) => {
      document.querySelectorAll('.dialog-overlay').forEach(e => e.setAttribute('style','display:none !important'));
      document.querySelectorAll('.page').forEach(e => e.setAttribute('style','display:none !important'));
      document.getElementById('page-'+n).setAttribute('style','display:block !important');
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      var btn = document.querySelector('[data-page="'+n+'"]');
      if(btn) btn.classList.add('active');
    }, name);
  }

  // 1. Dashboard
  console.log('1/9 Dashboard');
  await nav('dashboard');
  await page.evaluate(() => {
    document.getElementById('dashboard-no-project').setAttribute('style','display:none !important');
    document.getElementById('dashboard-content').setAttribute('style','display:block !important');
    document.getElementById('stat-issues-value').textContent = '4';
    document.getElementById('stat-containers-value').textContent = '1/3';
    document.getElementById('stat-merged-value').textContent = '1';
    document.getElementById('stat-failed-value').textContent = '0';
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'dashboard.png') });

  // 2. Issues
  console.log('2/9 Issues');
  await nav('issues');
  await page.evaluate((issues) => {
    document.getElementById('issues-empty').setAttribute('style','display:none !important');
    document.getElementById('issues-list-view').removeAttribute('style');
    var kv = document.getElementById('issues-kanban-view');
    if(kv) kv.setAttribute('style','display:none !important');

    function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
    function stepHtml(st){
      if(typeof getStepperState!=='function')return '';
      return '<div class="issue-stepper">'+getStepperState(st).map(function(s){
        return '<span class="stepper-step stepper-'+s.status+'">'+esc(s.label)+'</span>';
      }).join('<span class="stepper-arrow">&rarr;</span>')+'</div>';
    }
    function diffHtml(iss){
      var r=iss.result;if(!r)return '';var p=[];
      if(r.durationMs){var s=Math.round(r.durationMs/1000),m=Math.floor(s/60);p.push(m>0?m+'m '+(s%60)+'s':s+'s');}
      if(r.costUsd!==undefined)p.push('$'+r.costUsd.toFixed(2));
      if(r.diffSummary){var d=r.diffSummary;p.push(d.filesChanged+' files, +'+d.insertions+' -'+d.deletions);}
      return p.length?'<div class="issue-result-summary">'+p.join(' · ')+'</div>':'';
    }
    document.getElementById('issue-list-tbody').innerHTML = issues.map(function(i){
      return '<tr><td><code>'+i.id+'</code></td>'+
        '<td>'+esc(i.title)+diffHtml(i)+stepHtml(i.status)+'</td>'+
        '<td><span class="badge badge-'+i.type+'">'+i.type+'</span></td>'+
        '<td><span class="badge badge-status-'+i.status+'">'+i.status+'</span></td>'+
        '<td><span class="badge badge-priority-'+i.priority+'">'+i.priority+'</span></td>'+
        '<td><code>'+i.issueBranch+'</code></td>'+
        '<td>'+(i.status==='created'?'<button class="btn btn-sm btn-primary">Start</button>':'')+
        (i.status==='in-progress'?'<button class="btn btn-sm btn-danger">Abort</button>':'')+
        (i.status==='completed'?'<button class="btn btn-sm btn-primary">Merge</button> <button class="btn btn-sm btn-danger">Reject</button> <button class="btn btn-sm">Diff</button>':'')+
        '</td></tr>';
    }).join('');
  }, ISSUES);
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'issues.png') });

  // 3. Issue Create
  console.log('3/9 Issue Create');
  await page.evaluate(() => {
    document.getElementById('issue-modal-overlay').setAttribute('style','display:flex !important');
    document.getElementById('issue-form-title').value = 'Add OAuth2 authentication';
    document.getElementById('issue-form-description').value = 'Google/GitHub OAuth login with JWT refresh tokens.';
    document.getElementById('issue-form-type').value = 'feature';
    document.getElementById('issue-form-priority').value = 'high';
    document.getElementById('issue-form-pipeline-args').value = 'Implement OAuth2 login flow with Google/GitHub providers. Include JWT refresh token rotation.';
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'issue-create.png') });
  await page.evaluate(() => { document.getElementById('issue-modal-overlay').setAttribute('style','display:none !important'); });

  // 4. Kanban
  console.log('4/9 Kanban');
  await page.evaluate((issues) => {
    document.getElementById('issues-list-view').setAttribute('style','display:none !important');
    document.getElementById('issues-kanban-view').setAttribute('style','display:block !important');
    function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
    ['created','in-progress','completed','merging','merged','failed','closed'].forEach(function(st){
      var c=document.getElementById('kanban-'+st);if(!c)return;
      c.innerHTML=issues.filter(function(i){return i.status===st;}).map(function(i){
        return '<div class="kanban-card"><div class="kanban-card-id">'+i.id+'</div>'+
          '<div class="kanban-card-title">'+esc(i.title)+'</div>'+
          '<div class="kanban-card-meta"><span class="badge badge-'+i.type+'">'+i.type+'</span> '+
          '<span class="badge badge-priority-'+i.priority+'">'+i.priority+'</span></div></div>';
      }).join('');
    });
  }, ISSUES);
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'issues-kanban.png') });

  // 5. Containers
  console.log('5/9 Containers');
  await nav('containers');
  await page.evaluate(() => {
    document.getElementById('containers-empty').setAttribute('style','display:none !important');
    document.getElementById('pool-active').textContent='1';
    document.getElementById('pool-max').textContent='3';
    document.getElementById('container-grid').innerHTML=[
      {id:'cnt-a1b2c3d4',st:'running',iss:'ISSUE-004'},{id:'cnt-e5f6g7h8',st:'idle',iss:null}
    ].map(function(c){
      return '<div class="stat-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
        '<code style="font-size:0.78rem;">'+c.id.substring(0,8)+'</code>'+
        '<span class="badge badge-status-'+(c.st==='idle'?'closed':'in-progress')+'">'+c.st+'</span></div>'+
        (c.iss?'<div style="font-size:0.82rem;">Issue: <strong>'+c.iss+'</strong></div>':'<div style="font-size:0.82rem;color:var(--text-muted);">Idle</div>')+
        '<div style="margin-top:8px;"><button class="btn btn-sm btn-danger">Destroy</button></div></div>';
    }).join('');
    document.getElementById('container-queue-list').innerHTML='<div style="color:var(--text-muted);font-size:0.85rem;">No queued issues</div>';
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'containers.png') });

  // 6. Pipeline
  console.log('6/9 Pipeline');
  await nav('pipeline');
  await page.evaluate(() => {
    var sel=document.getElementById('log-filter-issue');
    if(sel)sel.innerHTML='<option value="all">All Issues</option><option>ISSUE-002</option><option>ISSUE-004</option>';
    document.getElementById('pipeline-log-content').innerHTML=[
      {t:'ISSUE-004',y:'system',m:'Starting pipeline: /teams Refactor database connection pool'},
      {t:'ISSUE-004',y:'assistant',m:'Analyzing database connection pool implementation...'},
      {t:'ISSUE-004',y:'assistant',m:'Creating pool manager with configurable min/max connections...'},
      {t:'ISSUE-004',y:'system',m:'Writing src/db/pool.js (+125 lines)'},
      {t:'ISSUE-002',y:'system',m:'Starting pipeline: /bugfix-teams Fix null pointer in config loader'},
      {t:'ISSUE-002',y:'assistant',m:'Analyzing config.js for null reference issues...'},
      {t:'ISSUE-002',y:'assistant',m:'Adding defensive defaults for undefined environment variables'},
      {t:'ISSUE-002',y:'system',m:'Running tests... All 5 tests passed'},
      {t:'ISSUE-002',y:'result',m:'Pipeline completed successfully (42s, $0.05)'},
      {t:'ISSUE-004',y:'assistant',m:'Writing connection pool tests with mock database...'},
      {t:'ISSUE-004',y:'system',m:'Running tests... 8 tests passed'},
    ].map(function(l){
      var c=l.y==='assistant'?'var(--success-text)':l.y==='result'?'#c47a2a':'var(--info-text)';
      return '<div style="color:'+c+';">['+l.t+'] '+l.m+'</div>';
    }).join('');
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'pipeline.png') });

  // 7. Repositories
  console.log('7/9 Repositories');
  await nav('repositories');
  await page.evaluate(() => {
    document.getElementById('repos-empty').setAttribute('style','display:none !important');
    var bb = document.getElementById('repo-browse-github-btn'); if(bb) bb.setAttribute('style','display:inline-block !important');
    document.getElementById('repo-tbody').innerHTML='<tr><td><strong>sample-api</strong></td>'+
      '<td><code style="font-size:0.78rem;">https://github.com/draft-dhgo/sample-api.git</code></td>'+
      '<td><code style="font-size:0.78rem;">repos/sample-api</code></td>'+
      '<td><button class="btn btn-sm btn-danger">Remove</button></td></tr>';
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'repositories.png') });

  // 8. Wiki
  console.log('8/9 Wiki');
  await nav('wiki');
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'wiki.png') });

  // 9. Settings
  console.log('9/9 Settings');
  await nav('settings');
  await page.evaluate(() => {
    document.getElementById('settings-data-root').value='~/claude-workbench-data/';
    document.getElementById('settings-max-containers').value='3';
    document.getElementById('settings-test-command').value='npm test';
    var de=document.getElementById('docker-status-text');
    if(de){de.textContent='Available (Docker 27.5.1)';de.setAttribute('style','color:var(--success-text)');}
    var dot=document.getElementById('github-dot');if(dot)dot.className='github-status-dot github-dot-connected';
    var st=document.getElementById('github-status-text');if(st)st.textContent='';
    var un=document.getElementById('github-username');if(un){un.textContent='draft-dhgo';un.removeAttribute('style');}
    var ts=document.getElementById('github-token-section');if(ts)ts.setAttribute('style','display:none !important');
    var cs=document.getElementById('github-connected-section');if(cs)cs.setAttribute('style','display:block !important');
  });
  await sleep(100);
  await page.screenshot({ path: path.join(SSDIR, 'settings.png') });

  console.log('Done!');
  await browser.close();
  fs.unlinkSync(tmpHtml);
}
main().catch(e => { console.error(e); process.exit(1); });
