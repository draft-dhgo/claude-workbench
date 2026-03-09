// Skill: wiki-views — Wiki HTML viewer generation

export const SKILL_WIKI_VIEWS = `---
name: wiki-views
description: This skill should be used when the user asks to "generate wiki views", "create HTML views", "update wiki HTML". Generate a single-page wiki viewer that dynamically renders markdown files.
model: claude-haiku-4-5-20251001
---

# wiki-views

## Purpose

\`wiki/views/index.html\` 단일 파일을 생성한다. 이 파일은 브라우저에서 wiki/ 내 마크다운 파일들을 동적으로 로드하고 렌더링하는 SPA(Single Page Application) 뷰어다. 한 번만 생성하면 md 파일이 추가/변경될 때 자동으로 반영된다.

## Trigger

Activate when wiki HTML generation or view updates are requested. 최초 1회만 생성하면 이후에는 재생성 불필요.

## Model

이 스킬은 \`claude-haiku-4-5-20251001\` 모델로 실행한다.

## Prerequisites

\`\`\`bash
mkdir -p wiki/views
\`\`\`

## Workflow

1. **wiki 구조 스캔**
   - wiki/ 하위의 **모든** 카테고리를 빠짐없이 스캔한다: requirements, prd, specs, tests, tdd, deploy, bugfix, knowledge, mockups
   - 카테고리별 파일 목록 수집
   - **중요**: 파일이 존재하는 모든 카테고리는 반드시 사이드바에 표시한다. 특히 \`knowledge/\`와 \`requirements/\` 개별 파일(REQ-NNN.md)을 누락하지 않는다

2. **index.html 생성**
   - \`wiki/views/index.html\` — 아래 설계에 따라 단일 HTML 파일 생성
   - 파일 목록을 JS 배열로 인라인 삽입 (이 부분만 재생성 시 업데이트)

3. **Verify output**
   - \`wiki/views/index.html\` 존재 확인
   - 로컬 서버에서 정상 동작 확인: \`npx serve wiki\` 또는 \`python3 -m http.server -d wiki\`

## index.html 생성 방식

**아래 HTML 템플릿을 그대로 사용한다.** \`WIKI_FILES\` 블록만 wiki/ 스캔 결과로 채운다.

### 템플릿

\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wiki Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #24292f; line-height: 1.5; }
    #app { display: flex; height: 100vh; }
    #sidebar { width: 260px; background: #f6f8fa; border-right: 1px solid #d0d7de; overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; }
    #content { flex: 1; overflow-y: auto; padding: 32px 40px; background: #fff; }
    .sidebar-header { padding: 16px 16px 12px; border-bottom: 1px solid #d0d7de; }
    .sidebar-header h1 { font-size: 1.05em; font-weight: 700; color: #24292f; margin-bottom: 6px; }
    .sidebar-stats { display: flex; gap: 6px; font-size: 0.72em; }
    .sidebar-stat { padding: 2px 8px; border-radius: 10px; font-weight: 600; background: #e1e4e8; color: #57606a; }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
    .sidebar-divider { height: 1px; background: #d0d7de; margin: 6px 16px; }
    .nav-link { display: block; padding: 5px 16px; color: #24292f; font-size: 0.85em; font-weight: 600; cursor: pointer; border-radius: 4px; }
    .nav-link:hover { background: #eaeef2; }
    .nav-link.active { background: #ddf4ff; color: #0969da; }
    .group-title { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px 4px; font-size: 0.7em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #57606a; cursor: pointer; user-select: none; }
    .group-title:hover { color: #24292f; }
    .group-count { font-size: 1em; background: #e1e4e8; padding: 1px 7px; border-radius: 10px; }
    .cycle-row { display: flex; align-items: center; gap: 6px; padding: 4px 16px; font-size: 0.82em; font-weight: 600; color: #24292f; cursor: pointer; }
    .cycle-row:hover { background: #eaeef2; }
    .cycle-row.active { background: #ddf4ff; color: #0969da; }
    .cycle-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .cycle-dot.ok { background: #1a7f37; }
    .cycle-dot.wip { background: #bf8700; }
    .cycle-dot.empty { background: #d0d7de; }
    .cycle-meta { font-size: 0.85em; color: #8b949e; margin-left: auto; font-weight: 400; }
    .sub-item { display: flex; align-items: center; gap: 5px; padding: 2px 16px 2px 34px; font-size: 0.78em; color: #57606a; cursor: pointer; }
    .sub-item:hover { background: #eaeef2; color: #24292f; }
    .sub-item.active { background: #ddf4ff; color: #0969da; font-weight: 600; }
    .sub-item.disabled { cursor: default; color: #c9d1d9; }
    .sub-item.disabled:hover { background: transparent; color: #c9d1d9; }
    .sub-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .sub-dot.ok { background: #1a7f37; }
    .sub-dot.no { background: #d0d7de; }
    .breadcrumb { font-size: 0.85em; color: #57606a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
    .breadcrumb .tag { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 0.85em; font-weight: 600; background: #e1e4e8; color: #57606a; margin-right: 4px; }
    .markdown-body { max-width: 860px; font-size: 0.95em; }
    .markdown-body h1 { font-size: 1.8em; border-bottom: 2px solid #d0d7de; padding-bottom: 8px; margin-top: 0; margin-bottom: 16px; }
    .markdown-body h2 { font-size: 1.4em; border-bottom: 1px solid #d0d7de; padding-bottom: 6px; margin-top: 28px; margin-bottom: 12px; }
    .markdown-body h3 { font-size: 1.15em; margin-top: 24px; margin-bottom: 8px; }
    .markdown-body p { margin-bottom: 12px; }
    .markdown-body ul, .markdown-body ol { margin-bottom: 12px; padding-left: 24px; }
    .markdown-body li { margin-bottom: 4px; }
    .markdown-body table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    .markdown-body th, .markdown-body td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; }
    .markdown-body th { background: #f6f8fa; font-weight: 600; }
    .markdown-body tr:nth-child(even) { background: #f9fafb; }
    .markdown-body pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    .markdown-body code { background: #eff1f3; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    .markdown-body pre code { background: none; padding: 0; font-size: 0.88em; }
    .markdown-body blockquote { border-left: 4px solid #d0d7de; padding: 4px 16px; color: #57606a; margin: 12px 0; }
    .markdown-body img { max-width: 100%; }
    .markdown-body hr { border: none; border-top: 2px solid #d0d7de; margin: 24px 0; }
    .markdown-body a { color: #0969da; text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .page-title { font-size: 1.6em; font-weight: 700; margin-bottom: 6px; }
    .page-sub { font-size: 0.95em; color: #57606a; margin-bottom: 24px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 1.1em; font-weight: 600; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #d0d7de; }
    .overview-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .overview-card { border: 1px solid #d0d7de; border-radius: 8px; padding: 16px; text-align: center; }
    .overview-card .num { font-size: 2em; font-weight: 700; color: #24292f; }
    .overview-card .lbl { font-size: 0.78em; color: #57606a; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .card { border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
    .card:hover { border-color: #0969da; }
    .card-head { padding: 12px 14px; display: flex; align-items: center; gap: 8px; }
    .card-id { font-weight: 700; font-size: 0.9em; color: #24292f; }
    .card-badge { font-size: 0.7em; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: auto; }
    .card-badge.ok { background: #dafbe1; color: #1a7f37; }
    .card-badge.wip { background: #fff8c5; color: #9a6700; }
    .card-stages { padding: 8px 14px 12px; display: flex; gap: 4px; flex-wrap: wrap; }
    .chip { font-size: 0.7em; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
    .chip.ok { background: #dafbe1; color: #1a7f37; }
    .chip.no { background: #f0f2f5; color: #c9d1d9; }
    .pipeline-bar { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; padding: 14px; background: #f6f8fa; border-radius: 8px; border: 1px solid #d0d7de; margin-bottom: 20px; }
    .pipe-step { font-size: 0.82em; font-weight: 600; padding: 5px 10px; border-radius: 5px; cursor: pointer; }
    .pipe-step.ok { background: #dafbe1; color: #1a7f37; }
    .pipe-step.ok:hover { background: #aceebb; }
    .pipe-step.no { background: #f0f2f5; color: #c9d1d9; cursor: default; }
    .pipe-arrow { color: #c9d1d9; font-size: 0.85em; }
    .doc-link { display: block; padding: 6px 0; font-size: 0.9em; }
    .doc-link a { color: #0969da; cursor: pointer; text-decoration: none; }
    .doc-link a:hover { text-decoration: underline; }
    .doc-link.disabled { color: #c9d1d9; }
    .trace-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .trace-table th, .trace-table td { border: 1px solid #d0d7de; padding: 7px 10px; text-align: center; font-size: 0.85em; }
    .trace-table th { background: #f6f8fa; font-weight: 600; }
    .trace-ok { background: #dafbe1; color: #1a7f37; cursor: pointer; font-weight: 600; }
    .trace-ok:hover { background: #aceebb; }
    .trace-no { background: #f6f8fa; color: #c9d1d9; }
    .trace-req { text-align: left; font-weight: 600; cursor: pointer; color: #0969da; }
    .trace-req:hover { text-decoration: underline; }
    .mockup-frame { width: 100%; height: calc(100vh - 120px); border: 1px solid #d0d7de; border-radius: 6px; }
    .mockup-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .mockup-card { border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; cursor: pointer; }
    .mockup-card:hover { border-color: #0969da; }
    .mockup-card-body { height: 100px; background: #f6f8fa; display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: #57606a; padding: 8px; text-align: center; }
    .mockup-card-label { padding: 8px 10px; font-size: 0.82em; font-weight: 600; background: #f6f8fa; border-top: 1px solid #d0d7de; }
    .loading { text-align: center; padding: 60px 20px; color: #57606a; }
    .error-msg { text-align: center; padding: 60px 20px; color: #cf222e; }
    #sidebar::-webkit-scrollbar, #content::-webkit-scrollbar { width: 6px; }
    #sidebar::-webkit-scrollbar-thumb, #content::-webkit-scrollbar-thumb { background: #c8ccd1; border-radius: 3px; }
    @media (max-width: 768px) { #sidebar { width: 200px; } #content { padding: 20px; } }
  </style>
</head>
<body>
  <div id="app">
    <nav id="sidebar">
      <div class="sidebar-header">
        <h1>Wiki Dashboard</h1>
        <div class="sidebar-stats" id="sidebarStats"></div>
      </div>
      <div class="sidebar-nav" id="sidebarNav"></div>
    </nav>
    <main id="content"><div class="loading">Loading...</div></main>
  </div>
  <script>
    // ========== FILE REGISTRY (이 블록만 wiki/ 스캔 결과로 교체) ==========
    var WIKI_FILES = {
      requirements: [/* wiki/requirements/ 스캔 결과 */],
      prd: [/* wiki/prd/ 스캔 결과 */],
      specs: [/* wiki/specs/ 스캔 결과 */],
      tests: [/* wiki/tests/ 스캔 결과 */],
      tdd: [/* wiki/tdd/ 스캔 결과 */],
      deploy: [/* wiki/deploy/ 스캔 결과 */],
      bugfix: [/* wiki/bugfix/ 스캔 결과 */],
      bugs: [/* wiki/bugs/ 스캔 결과 */],
      knowledge: [/* wiki/knowledge/ 스캔 결과 */],
      mockups: [/* wiki/mockups/ 스캔 결과 */]
    };

    // ========== STAGES ==========
    var DEV_STAGES = [
      { key:'prd', label:'PRD', cat:'prd' },
      { key:'sdd', label:'SDD', cat:'specs' },
      { key:'tests', label:'Tests', cat:'tests' },
      { key:'tdd', label:'TDD', cat:'tdd' },
      { key:'deploy', label:'Deploy', cat:'deploy' },
      { key:'mockup', label:'Mockup', cat:'mockups', optional:true }
    ];
    var REQUIRED_DEV_COUNT = DEV_STAGES.filter(function(st){ return !st.optional; }).length;
    var BUG_STAGES = [
      { key:'bugfix', label:'Bugfix', cat:'bugfix' },
      { key:'sdd', label:'SDD', cat:'specs' },
      { key:'tests', label:'Tests', cat:'tests' },
      { key:'tdd', label:'TDD', cat:'tdd' },
      { key:'deploy', label:'Deploy', cat:'deploy' }
    ];

    // ========== BUILD ==========
    function makeSet(arr) { var s={}; for(var i=0;i<arr.length;i++) s[arr[i]]=true; return s; }
    var fileSets = {};
    ['prd','specs','tests','tdd','deploy','bugfix'].forEach(function(c) { fileSets[c] = makeSet(WIKI_FILES[c]||[]); });

    function findMockup(n) {
      var m = WIKI_FILES.mockups||[];
      for(var i=0;i<m.length;i++) if(m[i].indexOf(n+'-')===0) return m[i];
      return null;
    }

    function pad4(s) { while(s.length<4) s='0'+s; return s; }

    function buildDev() {
      var reqs = (WIKI_FILES.requirements||[]).filter(function(f){ return f.indexOf('REQ-')===0; });
      return reqs.map(function(f) {
        var id = f.replace('.md','');
        var n = pad4(id.replace('REQ-',''));
        var stages={}, reqDone=0;
        DEV_STAGES.forEach(function(st) {
          if(st.key==='mockup') {
            var m=findMockup(n); stages.mockup={ok:!!m,file:m};
          } else {
            var ok=!!fileSets[st.cat][n+'.md']; stages[st.key]={ok:ok,file:n+'.md'}; if(ok) reqDone++;
          }
        });
        return { id:id, n:n, stages:stages, done:reqDone, total:REQUIRED_DEV_COUNT, complete:reqDone===REQUIRED_DEV_COUNT };
      });
    }

    function buildBug() {
      return (WIKI_FILES.bugfix||[]).map(function(f) {
        var n=f.replace('.md',''), id='BUG-'+n, stages={}, done=0;
        BUG_STAGES.forEach(function(st) {
          var ok=!!fileSets[st.cat][n+'.md']; stages[st.key]={ok:ok,file:n+'.md'}; if(ok) done++;
        });
        return { id:id, n:n, stages:stages, done:done, total:BUG_STAGES.length, complete:done===BUG_STAGES.length };
      });
    }

    var devCycles = buildDev();
    var bugCycles = buildBug();

    // ========== STATE ==========
    var view = null;
    var expanded = {};

    // ========== SIDEBAR ==========
    function sidebar() {
      var nav = document.getElementById('sidebarNav');
      var stats = document.getElementById('sidebarStats');
      var devDone = devCycles.filter(function(c){return c.complete;}).length;
      stats.innerHTML = '<span class="sidebar-stat">'+devCycles.length+' DEV</span><span class="sidebar-stat">'+bugCycles.length+' BUG</span><span class="sidebar-stat">'+devDone+'/'+devCycles.length+' done</span>';

      var h = '';
      h += '<div style="padding:4px 0">';
      h += '<a class="nav-link'+(view==='dashboard'?' active':'')+'" onclick="go(\\'dashboard\\')">Dashboard</a>';
      h += '<a class="nav-link'+(view==='traceability'?' active':'')+'" onclick="go(\\'traceability\\')">Traceability</a>';
      h += '</div><div class="sidebar-divider"></div>';

      h += '<div class="group-title" onclick="toggle(\\'dev\\')"><span>'+(expanded.dev===false?'+ ':'- ')+'Dev Cycles</span><span class="group-count">'+devCycles.length+'</span></div>';
      if(expanded.dev!==false) {
        for(var i=0;i<devCycles.length;i++) {
          var c=devCycles[i], cv='dev-cycle/'+c.id;
          var ck='c-'+c.id, isOpen=!!expanded[ck];
          var dotCls = c.complete?'ok':(c.done>0?'wip':'empty');
          h += '<div class="cycle-row'+(isOpen?' active':'')+'" onclick="cycleToggle(\\''+ck+'\\',\\''+cv+'\\')">';
          h += '<span class="cycle-dot '+dotCls+'"></span>'+c.id+'<span class="cycle-meta">'+c.done+'/'+c.total+'</span></div>';
          if(isOpen) {
            h += '<a class="sub-item'+(view==='requirements/'+c.id+'.md'?' active':'')+'" onclick="goSub(\\'requirements/'+c.id+'.md\\',\\''+ck+'\\')"><span class="sub-dot ok"></span>REQ</a>';
            DEV_STAGES.forEach(function(st) {
              var sd=c.stages[st.key];
              if(sd.ok) {
                var sv = st.key==='mockup' ? 'mockups/'+sd.file : st.cat+'/'+sd.file;
                h += '<a class="sub-item'+(view===sv?' active':'')+'" onclick="goSub(\\''+sv+'\\',\\''+ck+'\\')"><span class="sub-dot ok"></span>'+st.label+'</a>';
              } else {
                h += '<span class="sub-item disabled"><span class="sub-dot no"></span>'+st.label+'</span>';
              }
            });
          }
        }
      }

      h += '<div class="sidebar-divider"></div>';

      h += '<div class="group-title" onclick="toggle(\\'bug\\')"><span>'+(expanded.bug===false?'+ ':'- ')+'Bug Cycles</span><span class="group-count">'+bugCycles.length+'</span></div>';
      if(expanded.bug!==false) {
        if(bugCycles.length===0) {
          h += '<div style="padding:3px 28px;font-size:0.78em;color:#8b949e;">None</div>';
        }
        for(var i=0;i<bugCycles.length;i++) {
          var c=bugCycles[i], cv='bug-cycle/'+c.id;
          var ck='c-'+c.id, isOpen=!!expanded[ck];
          var dotCls = c.complete?'ok':(c.done>0?'wip':'empty');
          h += '<div class="cycle-row'+(isOpen?' active':'')+'" onclick="cycleToggle(\\''+ck+'\\',\\''+cv+'\\')">';
          h += '<span class="cycle-dot '+dotCls+'"></span>'+c.id+'<span class="cycle-meta">'+c.done+'/'+c.total+'</span></div>';
          if(isOpen) {
            BUG_STAGES.forEach(function(st) {
              var sd=c.stages[st.key];
              if(sd.ok) {
                h += '<a class="sub-item'+(view===st.cat+'/'+sd.file?' active':'')+'" onclick="goSub(\\''+st.cat+'/'+sd.file+'\\',\\''+ck+'\\')"><span class="sub-dot ok"></span>'+st.label+'</a>';
              } else {
                h += '<span class="sub-item disabled"><span class="sub-dot no"></span>'+st.label+'</span>';
              }
            });
          }
        }
      }

      h += '<div class="sidebar-divider"></div>';

      var kn = WIKI_FILES.knowledge||[];
      h += '<div class="group-title" onclick="toggle(\\'kn\\')"><span>'+(expanded.kn===false?'+ ':'- ')+'Knowledge</span><span class="group-count">'+kn.length+'</span></div>';
      if(expanded.kn!==false) {
        kn.forEach(function(f) {
          var vk='knowledge/'+f;
          h += '<a class="sub-item'+(view===vk?' active':'')+'" onclick="go(\\''+vk+'\\')"><span class="sub-dot ok"></span>'+f.replace('.md','')+'</a>';
        });
      }

      nav.innerHTML = h;
    }

    function toggle(key) {
      if(expanded[key]===undefined) expanded[key]=false; else expanded[key]=!expanded[key];
      sidebar();
    }

    function cycleToggle(ck, cv) {
      if(expanded[ck]) { expanded[ck]=false; sidebar(); }
      else { expanded[ck]=true; go(cv); }
    }

    function goSub(v, ck) { expanded[ck]=true; go(v); }

    // ========== NAV ==========
    function go(v) {
      var target = '#/'+v;
      if(window.location.hash === target) route();
      else window.location.hash = target;
    }

    function route() {
      var hash = window.location.hash || '#/dashboard';
      var path = hash.replace('#/','');
      view = path;
      sidebar();
      if(path==='dashboard') showDash();
      else if(path==='traceability') showTrace();
      else if(path.indexOf('dev-cycle/')===0) showDevDetail(path.replace('dev-cycle/',''));
      else if(path.indexOf('bug-cycle/')===0) showBugDetail(path.replace('bug-cycle/',''));
      else {
        var si=path.indexOf('/');
        if(si>0) {
          var cat=path.substring(0,si), file=path.substring(si+1);
          if(cat==='mockups'&&file.endsWith('.html')) loadMockup(file);
          else loadMd(cat,file);
        } else showDash();
      }
    }

    window.addEventListener('hashchange', route);

    // ========== MD ==========
    async function loadMd(cat,file) {
      var el=document.getElementById('content');
      el.innerHTML='<div class="loading">Loading...</div>';
      try {
        var r=await fetch('../'+cat+'/'+file);
        if(!r.ok) throw new Error('HTTP '+r.status);
        var md=await r.text();
        var labels={requirements:'Requirements',prd:'PRD',specs:'SDD',tests:'Tests',tdd:'TDD',deploy:'Deploy',bugfix:'Bugfix',bugs:'Bugs',knowledge:'Knowledge'};
        el.innerHTML='<div class="breadcrumb"><span class="tag">'+(labels[cat]||cat)+'</span> '+file+'</div><article class="markdown-body">'+marked.parse(md)+'</article>';
      } catch(e) { el.innerHTML='<div class="error-msg">Failed: '+cat+'/'+file+' — '+e.message+'</div>'; }
    }

    function loadMockup(file) {
      document.getElementById('content').innerHTML='<div class="breadcrumb"><span class="tag">Mockup</span> '+file+'</div><iframe src="../mockups/'+file+'" class="mockup-frame"></iframe>';
    }

    // ========== DASHBOARD ==========
    function showDash() {
      var el=document.getElementById('content');
      var devDone=devCycles.filter(function(c){return c.complete;}).length;
      var h='<div class="page-title">Wiki Dashboard</div><div class="page-sub">Pipeline cycle overview</div>';
      h+='<div class="overview-row">';
      h+='<div class="overview-card"><div class="num">'+devCycles.length+'</div><div class="lbl">Dev Cycles</div></div>';
      h+='<div class="overview-card"><div class="num">'+bugCycles.length+'</div><div class="lbl">Bug Cycles</div></div>';
      h+='<div class="overview-card"><div class="num">'+devDone+'/'+devCycles.length+'</div><div class="lbl">Complete</div></div>';
      h+='</div>';
      h+='<div class="section"><h2>Dev Cycles</h2><div class="card-grid">';
      devCycles.forEach(function(c) {
        h+='<div class="card" onclick="go(\\'dev-cycle/'+c.id+'\\')">';
        h+='<div class="card-head"><span class="card-id">'+c.id+'</span><span class="card-badge '+(c.complete?'ok':'wip')+'">'+c.done+'/'+c.total+'</span></div>';
        h+='<div class="card-stages">';
        DEV_STAGES.forEach(function(st){ h+='<span class="chip '+(c.stages[st.key].ok?'ok':'no')+'">'+st.label+'</span>'; });
        h+='</div></div>';
      });
      h+='</div></div>';
      if(bugCycles.length) {
        h+='<div class="section"><h2>Bug Cycles</h2><div class="card-grid">';
        bugCycles.forEach(function(c) {
          h+='<div class="card" onclick="go(\\'bug-cycle/'+c.id+'\\')">';
          h+='<div class="card-head"><span class="card-id">'+c.id+'</span><span class="card-badge '+(c.complete?'ok':'wip')+'">'+c.done+'/'+c.total+'</span></div>';
          h+='<div class="card-stages">';
          BUG_STAGES.forEach(function(st){ h+='<span class="chip '+(c.stages[st.key].ok?'ok':'no')+'">'+st.label+'</span>'; });
          h+='</div></div>';
        });
        h+='</div></div>';
      }
      var mocks=WIKI_FILES.mockups||[];
      if(mocks.length) {
        h+='<div class="section"><h2>Mockup Gallery</h2><div class="mockup-gallery">';
        mocks.forEach(function(m) {
          var name=m.replace(/\\.html$/,'').replace(/^\\d+-/,'');
          h+='<div class="mockup-card" onclick="go(\\'mockups/'+m+'\\')"><div class="mockup-card-body">'+m+'</div><div class="mockup-card-label">'+name+'</div></div>';
        });
        h+='</div></div>';
      }
      el.innerHTML=h;
    }

    // ========== CYCLE DETAIL ==========
    function showDevDetail(reqId) {
      var el=document.getElementById('content'), c=null;
      for(var i=0;i<devCycles.length;i++) if(devCycles[i].id===reqId){c=devCycles[i];break;}
      if(!c){el.innerHTML='<div class="error-msg">Not found: '+reqId+'</div>';return;}
      var h='<div class="breadcrumb"><span class="tag">Dev Cycle</span> '+reqId+'</div>';
      h+='<div class="page-title">'+reqId+' Development Cycle</div>';
      h+='<div class="page-sub">'+c.done+'/'+c.total+' stages — '+(c.complete?'Complete':'In Progress')+'</div>';
      h+='<div class="pipeline-bar">';
      h+='<a class="pipe-step ok" onclick="go(\\'requirements/'+reqId+'.md\\')">REQ</a>';
      DEV_STAGES.forEach(function(st) {
        var sd=c.stages[st.key];
        h+='<span class="pipe-arrow">&rarr;</span>';
        if(sd.ok) {
          var sv=st.key==='mockup'?'mockups/'+sd.file:st.cat+'/'+sd.file;
          h+='<a class="pipe-step ok" onclick="go(\\''+sv+'\\')">'+st.label+'</a>';
        } else {
          h+='<span class="pipe-step no">'+st.label+'</span>';
        }
      });
      h+='</div>';
      h+='<div class="section"><h2>Documents</h2>';
      h+='<div class="doc-link"><a onclick="go(\\'requirements/'+reqId+'.md\\')">Requirements: '+reqId+'</a></div>';
      DEV_STAGES.forEach(function(st) {
        var sd=c.stages[st.key];
        if(sd.ok) {
          var sv=st.key==='mockup'?'mockups/'+sd.file:st.cat+'/'+sd.file;
          h+='<div class="doc-link"><span class="tag">'+st.label+'</span> <a onclick="go(\\''+sv+'\\')">'+sd.file+'</a></div>';
        } else {
          h+='<div class="doc-link disabled"><span class="tag">'+st.label+'</span> —</div>';
        }
      });
      h+='</div>';
      el.innerHTML=h;
    }

    function showBugDetail(bugId) {
      var el=document.getElementById('content'), c=null;
      for(var i=0;i<bugCycles.length;i++) if(bugCycles[i].id===bugId){c=bugCycles[i];break;}
      if(!c){el.innerHTML='<div class="error-msg">Not found: '+bugId+'</div>';return;}
      var h='<div class="breadcrumb"><span class="tag">Bug Cycle</span> '+bugId+'</div>';
      h+='<div class="page-title">'+bugId+' Bug Fix Cycle</div>';
      h+='<div class="page-sub">'+c.done+'/'+c.total+' stages — '+(c.complete?'Complete':'In Progress')+'</div>';
      h+='<div class="pipeline-bar">';
      BUG_STAGES.forEach(function(st,i) {
        var sd=c.stages[st.key];
        if(i>0) h+='<span class="pipe-arrow">&rarr;</span>';
        if(sd.ok) h+='<a class="pipe-step ok" onclick="go(\\''+st.cat+'/'+sd.file+'\\')">'+st.label+'</a>';
        else h+='<span class="pipe-step no">'+st.label+'</span>';
      });
      h+='</div>';
      h+='<div class="section"><h2>Documents</h2>';
      BUG_STAGES.forEach(function(st) {
        var sd=c.stages[st.key];
        if(sd.ok) h+='<div class="doc-link"><span class="tag">'+st.label+'</span> <a onclick="go(\\''+st.cat+'/'+sd.file+'\\')">'+sd.file+'</a></div>';
        else h+='<div class="doc-link disabled"><span class="tag">'+st.label+'</span> —</div>';
      });
      h+='</div>';
      el.innerHTML=h;
    }

    // ========== TRACEABILITY ==========
    function showTrace() {
      var el=document.getElementById('content');
      var stageKeys=['prd','specs','tests','tdd','deploy'];
      var stageLabels={prd:'PRD',specs:'SDD',tests:'Tests',tdd:'TDD',deploy:'Deploy'};
      var bugStageKeys=['bugfix','specs','tests','tdd','deploy'];
      var bugStageLabels={bugfix:'Bugfix',specs:'SDD',tests:'Tests',tdd:'TDD',deploy:'Deploy'};
      var h='<div class="breadcrumb">Traceability Matrix</div>';
      h+='<div class="page-title">Traceability Matrix</div>';
      var completeCnt=0;
      var tableH='<h2 style="font-size:1.1em;font-weight:600;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #d0d7de;">Dev Cycles</h2>';
      tableH+='<table class="trace-table"><thead><tr><th style="text-align:left">REQ</th>';
      stageKeys.forEach(function(s){tableH+='<th>'+stageLabels[s]+'</th>';});
      tableH+='<th>Mockup</th><th>Bugfix</th></tr></thead><tbody>';
      devCycles.forEach(function(c) {
        tableH+='<tr><td class="trace-req" onclick="go(\\'dev-cycle/'+c.id+'\\')">'+c.id+'</td>';
        var allOk=true;
        stageKeys.forEach(function(s) {
          if(fileSets[s][c.n+'.md']) tableH+='<td class="trace-ok" onclick="go(\\''+s+'/'+c.n+'.md\\')">OK</td>';
          else { tableH+='<td class="trace-no">-</td>'; allOk=false; }
        });
        if(allOk) completeCnt++;
        var m=findMockup(c.n);
        tableH+=m?'<td class="trace-ok" onclick="go(\\'mockups/'+m+'\\')">OK</td>':'<td class="trace-no">-</td>';
        tableH+=fileSets.bugfix[c.n+'.md']?'<td class="trace-ok" onclick="go(\\'bugfix/'+c.n+'.md\\')">OK</td>':'<td class="trace-no">-</td>';
        tableH+='</tr>';
      });
      tableH+='</tbody></table>';
      h+='<div class="page-sub">'+completeCnt+' / '+devCycles.length+' requirements have full pipeline coverage</div>';
      h+=tableH;
      if(bugCycles.length) {
        var bugCompleteCnt=0;
        var bugH='<h2 style="font-size:1.1em;font-weight:600;margin-top:28px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #d0d7de;">Bug Cycles</h2>';
        bugH+='<table class="trace-table"><thead><tr><th style="text-align:left">BUG</th>';
        bugStageKeys.forEach(function(s){bugH+='<th>'+bugStageLabels[s]+'</th>';});
        bugH+='</tr></thead><tbody>';
        bugCycles.forEach(function(c) {
          bugH+='<tr><td class="trace-req" onclick="go(\\'bug-cycle/'+c.id+'\\')">'+c.id+'</td>';
          var allOk=true;
          bugStageKeys.forEach(function(s) {
            if(fileSets[s][c.n+'.md']) bugH+='<td class="trace-ok" onclick="go(\\''+s+'/'+c.n+'.md\\')">OK</td>';
            else { bugH+='<td class="trace-no">-</td>'; allOk=false; }
          });
          if(allOk) bugCompleteCnt++;
          bugH+='</tr>';
        });
        bugH+='</tbody></table>';
        bugH+='<div class="page-sub" style="margin-top:8px;">'+bugCompleteCnt+' / '+bugCycles.length+' bugs have full pipeline coverage</div>';
        h+=bugH;
      }
      h+='<p style="margin-top:12px;font-size:0.8em;color:#8b949e;">Click a cell to view the document.</p>';
      el.innerHTML=h;
    }

    // ========== INIT ==========
    window.addEventListener('DOMContentLoaded', function() {
      if(!window.location.hash) window.location.hash='#/dashboard';
      route();
    });
  <\/script>
</body>
</html>
\`\`\`

### 사용 방법

1. wiki/ 하위 카테고리를 스캔하여 \`WIKI_FILES\` 블록의 각 배열을 실제 파일명으로 채운다
2. 나머지 HTML/CSS/JS 코드는 **위 템플릿을 그대로 복사**한다 (수정 금지)
3. 생성된 파일을 로컬 서버로 확인:

\`\`\`bash
npx serve wiki -p 3000
# http://localhost:3000/views/index.html
\`\`\`

## Output

- \`wiki/views/index.html\` — 단일 SPA 뷰어 파일 (유일한 산출물)

## Completion Checklist

- [ ] \`wiki/views/index.html\` 파일이 존재한다
- [ ] WIKI_FILES 객체에 현재 wiki/ 의 모든 파일이 반영되어 있다
- [ ] marked.js CDN이 포함되어 있다
- [ ] 로컬 서버에서 md 파일이 정상 렌더링된다
- [ ] 대시보드, 사이클 상세, 추적성 뷰가 동작한다
- [ ] 목업 파일이 있는 경우 iframe으로 표시된다
- [ ] 사이클 접기/펼치기가 독립적으로 동작한다 (cycleToggle/goSub)
- [ ] Mockup은 optional — 완료 판정은 필수 5단계(PRD,SDD,Tests,TDD,Deploy) 기준

## 재생성이 필요한 경우

index.html은 최초 1회 생성. 단, **WIKI_FILES 목록 업데이트**가 필요한 경우:
- 새 카테고리가 추가되었을 때
- 기존 파일 목록을 갱신하고 싶을 때

이 경우 index.html 내 \`const WIKI_FILES = { ... };\` 부분만 업데이트한다.

## Rules

- 산출물은 \`wiki/views/index.html\` 하나뿐이다.
- wiki/ source markdown files are read-only. Never modify them.
- marked.js는 CDN으로 로드한다 (\`https://cdn.jsdelivr.net/npm/marked/marked.min.js\`).
- 이 스킬은 haiku 모델로 실행한다.
`
