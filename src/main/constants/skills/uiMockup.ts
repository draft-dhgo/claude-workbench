// Skill: ui-mockup — HTML mockup generation from SDD UI specifications

export const SKILL_UI_MOCKUP = `---
name: ui-mockup
description: This skill should be used when the user asks to "create UI mockup", "design the screen", "make HTML mockup". Generate standalone HTML mockups from SDD UI specifications.
---

# ui-mockup

## Purpose

SDD(개발 설계서)의 UI 설계를 입력으로 받아, 브라우저에서 바로 확인할 수 있는 standalone HTML 목업을 생성한다. 실제 스토리북처럼 각 화면의 구성과 상태를 시각적으로 표현한다.

## Trigger

Activate when UI mockup creation, screen design visualization, or HTML prototype is requested. Typically runs after dev-design.

## Prerequisites

\`\`\`bash
mkdir -p wiki/mockups
\`\`\`

## Workflow

1. **Read context**
   - Read the relevant SDD from \`wiki/specs/{NNNN}.md\`
   - SDD의 UI Design 섹션에서 화면 목록, 컴포넌트 구조, UI 상태를 파악한다
   - UI Design 섹션이 없으면 SDD의 Module Design과 Data Flow에서 유추한다
   - Read \`wiki/knowledge/\` for known UI conventions

2. **화면 식별**
   - 구현해야 할 화면/뷰 목록을 정리한다
   - 각 화면의 UI 상태를 정의한다 (default, loading, empty, error 등)

3. **목업 생성**
   - 화면별로 \`wiki/mockups/{NNNN}-{screen-name}.html\` 생성
   - 아래 목업 작성 규칙에 따른다

4. **갤러리 인덱스 생성**
   - \`wiki/mockups/index.html\` 생성 — 모든 목업을 카드 형태로 나열
   - SDD 번호, 화면명, 목업 링크 포함

5. **Verify output**
   - \`wiki/mockups/\` 에 HTML 파일이 존재하는지 확인
   - 각 파일을 브라우저에서 열어볼 수 있는 standalone 파일인지 확인
   - If check fails, fix before reporting completion

## 목업 작성 규칙

### 파일 구조

각 목업 파일은 단일 standalone HTML:

\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SDD-NNNN} — {Screen Name}</title>
  <style>
    /* 모든 CSS를 여기에 인라인 */
  </style>
</head>
<body>
  <header class="mockup-header">
    <span class="mockup-badge">SDD-{NNNN}</span>
    <h1>{Screen Name}</h1>
    <nav>
      <a href="index.html">Gallery</a>
      <!-- 상태 전환 앵커 -->
      <a href="#state-default">Default</a>
      <a href="#state-loading">Loading</a>
      <a href="#state-empty">Empty</a>
      <a href="#state-error">Error</a>
    </nav>
  </header>

  <main>
    <section id="state-default">
      <h2>Default State</h2>
      <!-- 기본 상태 UI -->
    </section>

    <section id="state-loading">
      <h2>Loading State</h2>
      <!-- 로딩 상태 UI -->
    </section>

    <section id="state-empty">
      <h2>Empty State</h2>
      <!-- 빈 상태 UI -->
    </section>

    <section id="state-error">
      <h2>Error State</h2>
      <!-- 에러 상태 UI -->
    </section>
  </main>
</body>
</html>
\`\`\`

### 시각적 표현 원칙

- **실제 같은 데이터** — lorem ipsum 대신 실제 사용 시나리오에 맞는 데이터 사용
- **모든 인터랙티브 요소 표현** — 버튼, 입력 필드, 드롭다운, 토글, 체크박스 등
- **레이아웃 충실도** — flexbox/grid로 실제 배치를 구현
- **색상/타이포그래피** — 프로젝트 디자인 시스템이 있으면 따르고, 없으면 기본 시스템 폰트 + 중립적 색상
- **반응형** — max-width 컨테이너, 모바일 대응은 선택적
- **hover/focus 상태** — CSS :hover, :focus로 인터랙션 힌트 제공

### 어노테이션

HTML 주석으로 각 영역에 역할을 설명한다:

\`\`\`html
<!-- [Component: SearchBar] 사용자 검색 쿼리 입력. 엔터 또는 버튼 클릭 시 검색 실행 -->
<div class="search-bar">
  <input type="text" placeholder="검색어를 입력하세요">
  <button>검색</button>
</div>
\`\`\`

### 공통 CSS

\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1f2328; background: #f6f8fa; }
.mockup-header { background: #24292f; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
.mockup-header h1 { font-size: 1.1em; font-weight: 500; }
.mockup-header nav a { color: #7d8590; text-decoration: none; margin-left: 12px; font-size: 0.85em; }
.mockup-header nav a:hover { color: #fff; }
.mockup-badge { background: #238636; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; }
main { max-width: 1200px; margin: 0 auto; padding: 24px; }
section { background: #fff; border: 1px solid #d0d7de; border-radius: 6px; padding: 24px; margin-bottom: 24px; }
section h2 { font-size: 0.9em; color: #57606a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
button { cursor: pointer; padding: 6px 16px; border-radius: 6px; border: 1px solid #d0d7de; background: #f6f8fa; font-size: 0.9em; }
button:hover { background: #eaeef2; }
button.primary { background: #238636; color: #fff; border-color: #238636; }
button.primary:hover { background: #2ea043; }
input, select, textarea { padding: 6px 12px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 0.9em; width: 100%; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9,105,218,0.15); }
.card { border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; margin: 8px 0; background: #fff; }
.card:hover { border-color: #0969da; }
.skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; height: 16px; border-radius: 4px; margin: 8px 0; }
.empty-state { text-align: center; padding: 48px; color: #57606a; }
.error-state { background: #ffebe9; border: 1px solid #cf222e; border-radius: 6px; padding: 16px; color: #cf222e; }
\`\`\`

## 갤러리 인덱스 템플릿

\`wiki/mockups/index.html\`:

\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>UI Mockup Gallery</title>
  <style>
    /* 공통 CSS + 갤러리 전용 */
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 24px; }
    .gallery-card { border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; background: #fff; }
    .gallery-card:hover { border-color: #0969da; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .gallery-card .preview { height: 200px; overflow: hidden; border-bottom: 1px solid #d0d7de; }
    .gallery-card .preview iframe { width: 200%; height: 200%; transform: scale(0.5); transform-origin: 0 0; border: none; pointer-events: none; }
    .gallery-card .info { padding: 12px 16px; }
    .gallery-card .info h3 { font-size: 0.95em; margin-bottom: 4px; }
    .gallery-card .info p { font-size: 0.8em; color: #57606a; }
    .gallery-card .info a { color: #0969da; text-decoration: none; font-size: 0.85em; }
  </style>
</head>
<body>
  <header class="mockup-header">
    <h1>UI Mockup Gallery</h1>
  </header>
  <div class="gallery">
    <!-- 각 목업마다 카드 하나 -->
    <div class="gallery-card">
      <div class="preview">
        <iframe src="{NNNN}-{screen}.html"></iframe>
      </div>
      <div class="info">
        <h3>{Screen Name}</h3>
        <p>SDD-{NNNN}</p>
        <a href="{NNNN}-{screen}.html">Open Mockup</a>
      </div>
    </div>
  </div>
</body>
</html>
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/mockups/{NNNN}-{screen-name}.html\` — 화면별 HTML 목업
- \`wiki/mockups/index.html\` — 목업 갤러리 인덱스

## Completion Checklist

- [ ] \`wiki/mockups/\` 에 화면별 HTML 파일이 존재한다
- [ ] 각 HTML 파일이 standalone (외부 의존 없이 브라우저에서 열림)
- [ ] 각 화면에 최소 default 상태가 포함되어 있다
- [ ] \`wiki/mockups/index.html\` 갤러리 인덱스가 존재한다
- [ ] 어노테이션(HTML 주석)이 주요 컴포넌트에 포함되어 있다

## Rules

- ALL output goes under \`wiki/mockups/\` — nowhere else.
- wiki/ source files (specs, prd 등)은 read-only. 절대 수정하지 않는다.
- 외부 라이브러리, CDN, JavaScript 없이 순수 HTML+CSS만 사용한다.
- UI가 없는 기능(API, CLI, 백엔드 로직 등)에는 이 스킬을 실행하지 않는다.
`
