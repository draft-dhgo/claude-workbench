// Claude 구성 자동 세팅 시 기본으로 생성되는 스킬/커맨드/CLAUDE.md 내용
// handleReset에서 .claude/ 재생성 시 사용

type Lang = 'en' | 'ko';

function buildDefaultClaudeMd(workspaceName: string, lang: Lang = 'en'): string {
  if (lang === 'ko') {
    return `# Workspace: ${workspaceName}

## 워크스페이스 규칙

- 모든 문서 산출물은 반드시 wiki/ 하위에만 작성한다
- wiki/ 내 기존 파일은 수정하지 않는다 (append-only)
- 작업 중 발견한 프로젝트 지식은 wiki/knowledge/에 기록한다

## 파이프라인 커맨드

| 커맨드 | 설명 |
|--------|------|
| /add-req | 신규 요구사항을 wiki/requirements/에 등록한다 |
| /teams | Dev 사이클 파이프라인 실행: REQ → PRD → SDD → Mockup → Tests → TDD → Deploy → Wiki Views |
| /add-bug | 신규 버그를 wiki/bugs/README.md에 등록한다 |
| /bugfix-teams | Bug 사이클 파이프라인 실행: Bugfix → SDD → Tests → TDD → Deploy → Wiki Views |

## 사용 가능한 스킬

| 스킬 | 설명 |
|------|------|
| req-manage | 요구사항 정의 및 PRD 작성. /teams 파이프라인의 Step 1. |
| dev-design | 개발 설계서(SDD) 작성. /teams Step 2, /bugfix-teams Step 2. |
| ui-mockup | SDD UI 설계 기반 HTML 목업 생성. /teams Step 2.5. |
| test-design | 테스트 설계서 작성. /teams Step 3, /bugfix-teams Step 3. |
| tdd-cycle | TDD(Red-Green-Refactor) 사이클 구현. /teams Step 4, /bugfix-teams Step 4. |
| deploy | 빌드, 검증, 배포. /teams Step 5, /bugfix-teams Step 5. |
| bugfix | 버그 원인 분석 및 수정 보고서 작성. /bugfix-teams Step 1. |
| project-knowledge | 프로젝트 지식 기록. /teams Step 7, /bugfix-teams Step 7. |
| wiki-views | wiki/views/index.html 사이클 기반 뷰어 갱신. /teams Step 6, /bugfix-teams Step 6. |
`
  }
  // Default: English
  return `# Workspace: ${workspaceName}

## Workspace Rules

- All documentation artifacts must be written only under wiki/
- Existing files in wiki/ must not be modified (append-only)
- Project knowledge discovered during work should be recorded in wiki/knowledge/

## Pipeline Commands

| Command | Description |
|---------|-------------|
| /add-req | Register new requirements in wiki/requirements/ |
| /teams | Dev cycle pipeline: REQ → PRD → SDD → Mockup → Tests → TDD → Deploy → Wiki Views |
| /add-bug | Register new bugs in wiki/bugs/README.md |
| /bugfix-teams | Bug cycle pipeline: Bugfix → SDD → Tests → TDD → Deploy → Wiki Views |

## Available Skills

| Skill | Description |
|-------|-------------|
| req-manage | Requirements definition and PRD writing. Step 1 of /teams pipeline. |
| dev-design | Write development design document (SDD). /teams Step 2, /bugfix-teams Step 2. |
| ui-mockup | Generate HTML mockup from SDD UI design. /teams Step 2.5. |
| test-design | Write test design document. /teams Step 3, /bugfix-teams Step 3. |
| tdd-cycle | TDD (Red-Green-Refactor) cycle implementation. /teams Step 4, /bugfix-teams Step 4. |
| deploy | Build, verify, and deploy. /teams Step 5, /bugfix-teams Step 5. |
| bugfix | Bug root cause analysis and fix report. /bugfix-teams Step 1. |
| project-knowledge | Record project knowledge. /teams Step 7, /bugfix-teams Step 7. |
| wiki-views | Update wiki/views/index.html cycle-based viewer. /teams Step 6, /bugfix-teams Step 6. |
`
}

// ── Skills ──

const SKILL_REQ_MANAGE = `---
name: req-manage
description: This skill should be used when the user asks to "define requirements", "write a PRD", "manage requirements". Manage requirements definition and PRD writing, track progress status.
---

# req-manage

## Purpose

Manage project requirements and produce PRD (Product Requirements Document) artifacts.

## Trigger

Activate when requirements gathering, PRD writing, or requirement status tracking is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/prd wiki/requirements
\`\`\`

## Workflow

1. **Read context**
   - Read \`wiki/requirements/README.md\` to understand existing requirements
   - Read \`wiki/prd/\` to check existing PRDs and determine the next sequential 4-digit number (0001, 0002, ...)
   - Read the detailed requirement file \`wiki/requirements/REQ-NNN.md\` if it exists

2. **Gather requirements**
   - Collect requirements from the user through structured questions
   - Organize into functional and non-functional categories
   - Assign a REQ-ID (REQ-001, REQ-002, ...) based on existing entries

3. **Write PRD**
   - Create \`wiki/prd/{NNNN}.md\` using the template below
   - Fill in all sections with meaningful content

4. **Write detailed requirement**
   - Create \`wiki/requirements/REQ-NNN.md\` with the full requirement details using the requirement detail template below
   - This file contains all the detailed context that the PRD references

5. **Update tracker**
   - Add or update the requirement row in \`wiki/requirements/README.md\`
   - README.md에는 **제목(한 줄 요약)만** 기재한다. 상세 내용은 개별 파일에 작성한다

6. **Verify output**
   - Confirm \`wiki/prd/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm \`wiki/requirements/REQ-NNN.md\` exists with detailed content
   - Confirm \`wiki/requirements/README.md\` contains the new/updated requirement row
   - If any check fails, fix the issue before reporting completion

## PRD Template

\`\`\`markdown
# PRD-{NNNN}: {Title}

> REQ-ID: {REQ-XXX}
> Date: {YYYY-MM-DD}
> Status: Draft

## 1. Overview

{Brief description of the requirement and its business value}

## 2. Background

{Context, motivation, and problem statement}

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | {description} | {Must/Should/Could} |

## 4. Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-01 | {description} | {measurable criteria} |

## 5. User Stories

- As a {role}, I want {action} so that {benefit}

## 6. Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}

## 7. Out of Scope

{Explicitly excluded items}

## 8. Dependencies

{External dependencies, related requirements}
\`\`\`

## Requirement Detail Template

\`wiki/requirements/REQ-NNN.md\` 파일 형식:

\`\`\`markdown
# REQ-{NNN}: {Title}

> Date: {YYYY-MM-DD}
> Status: [ ]
> PRD: PRD-{NNNN}

## 설명

{요구사항의 상세 설명}

## 배경

{왜 이 기능이 필요한지, 어떤 문제를 해결하는지}

## 주요 기능

- {기능 1}
- {기능 2}

## 제약 사항

- {제약 1}

## 관련 요구사항

- {관련 REQ-ID 목록}
\`\`\`

## Output

- \`wiki/prd/{NNNN}.md\` — PRD document
- \`wiki/requirements/REQ-NNN.md\` — Detailed requirement document
- \`wiki/requirements/README.md\` — Updated requirement tracker (title only)

## Completion Checklist

- [ ] \`wiki/prd/{NNNN}.md\` exists with all template sections filled
- [ ] \`wiki/requirements/REQ-NNN.md\` exists with detailed requirement content
- [ ] \`wiki/requirements/README.md\` has the requirement row (title only)

## Rules

- wiki/ files are append-only. Never modify existing files (except requirements/README.md status column).
- README.md에는 제목만 기재한다. 상세 내용은 \`wiki/requirements/REQ-NNN.md\`에 작성한다.
- Detect the project's actual tech stack automatically. Do not hardcode frameworks.
`

const SKILL_DEV_DESIGN = `---
name: dev-design
description: This skill should be used when the user asks to "write a design document", "create an SDD", "design the implementation". Write development design documents (SDD).
---

# dev-design

## Purpose

Create a Solution Design Document (SDD) that specifies architecture, module structure, interfaces, and data flow.

## Trigger

Activate when development design, architecture planning, or SDD creation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/specs wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read relevant PRD from \`wiki/prd/\`
   - Read \`wiki/specs/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known architecture, conventions, dependencies

2. **Analyze codebase**
   - Explore the existing codebase to understand current architecture
   - Identify tech stack, frameworks, patterns in use

3. **Design solution**
   - Define modules, interfaces, data flow, dependencies
   - Determine impact: which existing files change, which new files are created

4. **Write SDD**
   - Create \`wiki/specs/{NNNN}.md\` using the template below
   - UI가 있는 기능이면 UI Design 섹션을 포함한다 (목업 HTML은 별도 ui-mockup 스킬에서 생성)

5. **Verify output**
   - Confirm \`wiki/specs/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

## SDD Template

\`\`\`markdown
# SDD-{NNNN}: {Title}

> Source: PRD-{NNNN} / REQ-{XXX}
> Date: {YYYY-MM-DD}
> Status: Draft

## 1. Overview

{What this design accomplishes and why}

## 2. Architecture

{High-level architecture: components, layers, communication patterns}

## 3. Module Design

### 3.1 {Module Name}

- **Responsibility**: {what it does}
- **Location**: {file path}
- **Dependencies**: {what it depends on}

#### Interface

\\\`\\\`\\\`
// language-appropriate interface definition
\\\`\\\`\\\`

## 4. Data Flow

1. {Step 1}
2. {Step 2}

## 5. UI Design

> Skip this section if the feature has no user interface.
> HTML mockups are generated separately by the ui-mockup skill.

### Screens

| Screen | Description |
|--------|-------------|
| {Screen Name} | {purpose and key elements} |

### UI States

| State | Description |
|-------|-------------|
| Default | {normal state} |
| Loading | {loading indicator} |
| Empty | {no data state} |
| Error | {error display} |

### Component Hierarchy

\\\`\\\`\\\`
{ParentComponent}
├── {ChildA}
│   ├── {GrandchildA1}
│   └── {GrandchildA2}
└── {ChildB}
\\\`\\\`\\\`

## 6. Database / State Changes

{Schema changes, new tables, state management updates — if applicable}

## 7. Impact Analysis

| File | Change Type | Description |
|------|------------|-------------|
| {path} | New/Modified | {what changes} |

## 8. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| {edge case} | {how it's handled} |

## 9. Dependencies

{New packages, external services, or internal modules required}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/specs/{NNNN}.md\` — Solution Design Document

## Completion Checklist

- [ ] \`wiki/specs/{NNNN}.md\` exists with all template sections filled
- [ ] SDD references the source PRD/requirement
- [ ] Impact analysis section lists affected files
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's actual tech stack automatically. Do not hardcode frameworks.
`

const SKILL_UI_MOCKUP = `---
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

const SKILL_TEST_DESIGN = `---
name: test-design
description: This skill should be used when the user asks to "design tests", "write test plan", "create test strategy". Write test design documents.
---

# test-design

## Purpose

Create a test design document that specifies test strategy, test cases, and coverage goals.

## Trigger

Activate when test design, test planning, or test strategy creation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/tests wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read the relevant SDD from \`wiki/specs/\`
   - Read \`wiki/tests/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known conventions and gotchas

2. **Identify testable units**
   - Functions, modules, integrations, edge cases from the SDD

3. **Design test cases**
   - Create test cases with ID, description, preconditions, steps, expected result
   - Define coverage goals (unit, integration, edge cases)
   - Identify the test framework to use (detect from project)

4. **Write test design**
   - Create \`wiki/tests/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/tests/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

## Test Design Template

\`\`\`markdown
# Test Design-{NNNN}: {Title}

> Source: SDD-{NNNN}
> Date: {YYYY-MM-DD}
> Test Framework: {detected framework}

## 1. Test Strategy

{Overall approach: unit tests, integration tests, e2e tests}

## 2. Test Environment

- Runtime: {e.g., Node.js 20}
- Framework: {e.g., vitest, jest, pytest}
- Dependencies: {test utilities needed}

## 3. Test Cases

### TC-01: {Test Case Name}

- **Category**: Unit / Integration / E2E
- **Target**: {function/module being tested}
- **Preconditions**: {setup required}
- **Steps**:
  1. {step}
  2. {step}
- **Expected Result**: {what should happen}
- **Edge Cases**: {boundary conditions}

### TC-02: {Test Case Name}

...

## 4. Coverage Goals

| Category | Target |
|----------|--------|
| Unit | {e.g., core business logic 100%} |
| Integration | {e.g., API endpoints} |
| Edge Cases | {e.g., error paths, boundary values} |

## 5. Test Data

{Test fixtures, mock data, sample inputs}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/tests/{NNNN}.md\` — Test Design Document

## Completion Checklist

- [ ] \`wiki/tests/{NNNN}.md\` exists with all template sections filled
- [ ] Test cases reference the source SDD
- [ ] Each test case has ID, steps, and expected result
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's actual test framework automatically. Do not hardcode.
`

const SKILL_TDD_CYCLE = `---
name: tdd-cycle
description: This skill should be used when the user asks to "implement with TDD", "run TDD cycle", "red-green-refactor". Execute TDD (Red-Green-Refactor) cycle implementation.
---

# tdd-cycle

## Purpose

Implement features or fixes using the TDD cycle: Red (failing test) -> Green (make it pass) -> Refactor.

## Trigger

Activate when TDD implementation, red-green-refactor cycle, or test-first development is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/tdd wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read the test design from \`wiki/tests/{NNNN}.md\`
   - Read the SDD from \`wiki/specs/{NNNN}.md\`
   - Read \`wiki/tdd/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known conventions and gotchas

2. **Execute TDD cycles**
   For each test case from the test design:

   a. **RED** — Write a failing test. Run it. Confirm it fails.
   b. **GREEN** — Write minimal code to make the test pass. Run it. Confirm it passes.
   c. **REFACTOR** — Clean up code while keeping tests green. Run tests. Confirm all pass.

3. **Final verification**
   - Run the full test suite to confirm no regressions

4. **Write TDD log**
   - Create \`wiki/tdd/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/tdd/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm all tests pass
   - If any check fails, fix before reporting completion

## TDD Log Template

\`\`\`markdown
# TDD Log-{NNNN}: {Title}

> Source: SDD-{NNNN}, Test Design-{NNNN}
> Date: {YYYY-MM-DD}
> Test Framework: {framework}

## Summary

- Total cycles: {N}
- Tests written: {N}
- Tests passing: {N}
- Files created: {N}
- Files modified: {N}

## Cycles

### Cycle 1: {Test Case ID} — {Description}

**RED**
- Test file: \\\`{path}\\\`
- Test: \\\`{test name}\\\`
- Result: FAIL (expected)
- Error: \\\`{error message}\\\`

**GREEN**
- Implementation: \\\`{path}\\\`
- Changes: {what was added/changed}
- Result: PASS

**REFACTOR**
- Changes: {what was cleaned up}
- Result: All tests PASS

### Cycle 2: ...

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| {path} | Created/Modified | {what} |

## Final Test Results

\\\`\\\`\\\`
{paste full test runner output}
\\\`\\\`\\\`
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/tdd/{NNNN}.md\` — TDD cycle log

Source code and test files are written to the project's source directories (not wiki/).

## Completion Checklist

- [ ] All test cases from the test design are implemented
- [ ] All tests pass (full suite, no regressions)
- [ ] \`wiki/tdd/{NNNN}.md\` exists with RED/GREEN/REFACTOR details for each cycle
- [ ] Final test runner output is included in the log
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's test framework and build tools automatically.
- Each RED-GREEN-REFACTOR cycle must be atomic and documented.
`

const SKILL_DEPLOY = `---
name: deploy
description: This skill should be used when the user asks to "deploy", "build for production", "run the build". Handle build, database integration, and local hosting.
---

# deploy

## Purpose

Execute production build, verify deployment artifacts, and log results.

## Trigger

Activate when build, deployment, or local hosting is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/deploy
\`\`\`

## Workflow

1. **Detect build system**
   - Read \`package.json\`, \`Makefile\`, \`Cargo.toml\`, or equivalent
   - Identify build commands, type checker, test runner

2. **Read context**
   - Read \`wiki/deploy/\` to determine the next sequential 4-digit number

3. **Run checks**
   - Run type checking if available (e.g., \`tsc --noEmit\`)
   - Run the full test suite

4. **Build**
   - Run the production build command
   - Verify build artifacts exist (check output directory, file count, sizes)

5. **Write deploy log**
   - Create \`wiki/deploy/{NNNN}.md\` using the template below

6. **Verify output**
   - Confirm \`wiki/deploy/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm build artifacts exist
   - If any check fails, fix before reporting completion

## Deploy Log Template

\`\`\`markdown
# Deploy Log-{NNNN}: {Title}

> Date: {YYYY-MM-DD HH:mm}
> Status: {SUCCESS / FAILED}

## 1. Environment

- OS: {detected}
- Runtime: {e.g., Node.js 20.x}
- Build tool: {e.g., vite, webpack, tsc}

## 2. Type Check

- Command: \\\`{command}\\\`
- Result: {PASS / FAIL}
- Errors: {count or "none"}

## 3. Tests

- Command: \\\`{command}\\\`
- Result: {N passed, N failed, N skipped}

## 4. Build

- Command: \\\`{command}\\\`
- Result: {SUCCESS / FAILED}
- Duration: {if available}
- Error output: {if failed}

## 5. Artifacts

| Path | Size | Type |
|------|------|------|
| {path} | {size} | {file type} |

## 6. Notes

{Any issues encountered, warnings, manual steps needed}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/deploy/{NNNN}.md\` — Deployment log

## Completion Checklist

- [ ] Type check passes (if available)
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Build artifacts exist in the output directory
- [ ] \`wiki/deploy/{NNNN}.md\` exists with build details

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's build system automatically. Do not hardcode build commands.
- Report build errors clearly with actionable information.
`

const SKILL_BUGFIX = `---
name: bugfix
description: This skill should be used when the user asks to "fix a bug", "debug this issue", "investigate the error". Bug root cause analysis and fix pipeline entry point.
---

# bugfix

## Purpose

Entry point for the bugfix cycle. Collect bug report, investigate root cause, and document findings.

## Trigger

Activate when bug fixing, debugging, or error investigation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/bugfix wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read \`wiki/bugs/README.md\` for the bug description (if available)
   - Read \`wiki/bugfix/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known gotchas and architecture

2. **Collect bug report**
   - Symptoms, error messages, stack traces
   - Reproduction steps
   - Expected vs actual behavior

3. **Investigate root cause**
   - Explore code paths related to the bug
   - Analyze logs and error output
   - Reproduce the bug and confirm the issue

4. **Document findings**
   - Create \`wiki/bugfix/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/bugfix/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

## Bugfix Report Template

\`\`\`markdown
# Bugfix-{NNNN}: {Bug Title}

> Source: BUG-{XXX}
> Date: {YYYY-MM-DD}
> Severity: {Critical / High / Medium / Low}
> Status: Investigated

## 1. Bug Description

{What is happening — symptoms, error messages}

## 2. Reproduction Steps

1. {step}
2. {step}
3. {observe: error/unexpected behavior}

## 3. Expected vs Actual

- **Expected**: {what should happen}
- **Actual**: {what happens instead}

## 4. Root Cause Analysis

{Why the bug occurs — specific code path, logic error, race condition, etc.}

### Affected Code

| File | Line(s) | Issue |
|------|---------|-------|
| {path} | {lines} | {what's wrong} |

## 5. Proposed Fix

{How to fix it — approach, which files to change}

## 6. Risk Assessment

{What else might break, regression risk}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/bugfix/{NNNN}.md\` — Bug report and root cause analysis

## Completion Checklist

- [ ] \`wiki/bugfix/{NNNN}.md\` exists with root cause analysis
- [ ] Reproduction steps documented
- [ ] Affected files identified
- [ ] Proposed fix strategy described
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
`

const SKILL_PROJECT_KNOWLEDGE = `---
name: project-knowledge
description: This skill should be used when the user asks to "record project knowledge", "document architecture", "note a discovery". Investigate the project and progressively accumulate knowledge in wiki/knowledge/.
---

# project-knowledge

## Purpose

Progressively accumulate project knowledge discovered during development. Incremental additions as new facts are discovered.

## Trigger

Activate when project investigation findings need to be recorded, or when invoked by other skills.

## Prerequisites

Ensure the following directories and files exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/knowledge/discoveries
touch wiki/knowledge/architecture.md
touch wiki/knowledge/conventions.md
touch wiki/knowledge/dependencies.md
touch wiki/knowledge/gotchas.md
\`\`\`

If any of the category files are newly created (empty), initialize them with a header:
- \`architecture.md\` → \`# Architecture\\n\`
- \`conventions.md\` → \`# Conventions\\n\`
- \`dependencies.md\` → \`# Dependencies\\n\`
- \`gotchas.md\` → \`# Gotchas\\n\`

## Workflow

1. **Read existing knowledge**
   - Read all files in \`wiki/knowledge/\` to check for duplicates

2. **Classify the knowledge**
   - Determine the appropriate category:
     - \`architecture\` — Components, layers, patterns, data flow
     - \`conventions\` — Naming rules, coding style, file organization
     - \`dependencies\` — Packages, versions, external services
     - \`gotchas\` — Pitfalls, workarounds, non-obvious behavior

3. **Record**
   - If it fits an existing category: **append** to that file (never overwrite existing content)
   - If it's a standalone discovery: create \`wiki/knowledge/discoveries/{NNNN}.md\` using the template below

4. **Verify output**
   - Confirm the knowledge was written (file exists, new content appended)
   - Confirm it's not a duplicate of existing entries

## Category Append Format

When appending to a category file, use this format:

\`\`\`markdown

## {Discovery Title} ({YYYY-MM-DD})

{Specific finding}

- Evidence: {which code/file/config confirmed this}
- Impact: {how this affects future work}
\`\`\`

## Discovery Template

For standalone discoveries in \`wiki/knowledge/discoveries/{NNNN}.md\`:

\`\`\`markdown
# {Discovery Title}

> Category: {architecture|conventions|dependencies|gotchas}
> Discovered: {YYYY-MM-DD HH:mm}
> Context: {What task led to this discovery}

## Content

{Specific finding}

## Evidence

{Which code/file/config confirmed this}

## Impact

{How this knowledge affects future work}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/knowledge/{category}.md\` — Appended knowledge
- \`wiki/knowledge/discoveries/{NNNN}.md\` — Standalone discovery

## Completion Checklist

- [ ] Knowledge is not a duplicate of existing entries
- [ ] Knowledge was appended to the correct category or created as new discovery
- [ ] Content is specific and evidence-based (not vague)

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify or delete existing content.
- Check existing files before adding to avoid duplicates.
- Prefer appending to category files over creating standalone discoveries.
`

const SKILL_WIKI_VIEWS = `---
name: wiki-views
description: This skill should be used when the user asks to "generate wiki views", "create HTML views", "update wiki HTML". Generate a single-page wiki viewer that dynamically renders markdown files.
model: claude-haiku-4-5-20251001
---

# wiki-views

## Purpose

\`wiki/views/index.html\`의 \`WIKI_FILES\` 배열을 현재 wiki/ 파일 목록으로 갱신한다.
index.html 파일 자체는 워크스페이스 생성 시 자동으로 생성되므로, 이 스킬은 데이터만 갱신한다.

## Trigger

파이프라인 Step 6에서 새 사이클 산출물이 추가된 후 자동으로 실행된다.

## Model

이 스킬은 \`claude-haiku-4-5-20251001\` 모델로 실행한다.

## Workflow

1. **wiki 구조 스캔**
   - 각 카테고리 디렉토리의 파일 목록을 수집한다:
     - \`wiki/requirements/\` → .md 파일
     - \`wiki/prd/\` → .md 파일
     - \`wiki/specs/\` → .md 파일
     - \`wiki/tests/\` → .md 파일
     - \`wiki/tdd/\` → .md 파일
     - \`wiki/deploy/\` → .md 파일
     - \`wiki/bugfix/\` → .md 파일
     - \`wiki/bugs/\` → .md 파일
     - \`wiki/knowledge/\` → .md 파일 (discoveries/ 서브디렉토리 제외)
     - \`wiki/mockups/\` → .html 파일

2. **WIKI_FILES 블록 갱신**
   - \`wiki/views/index.html\` 파일을 읽는다
   - 아래 마커로 둘러싸인 \`var WIKI_FILES = { ... };\` 블록을 찾는다:
     \`// ========== FILE REGISTRY (wiki-views 스킬이 이 블록만 갱신) ==========\`
   - 스캔 결과로 WIKI_FILES 객체를 교체한다. 각 배열은 파일명만 포함 (경로 없이):
     \`\`\`javascript
     var WIKI_FILES = {
       requirements: ['README.md', 'REQ-001.md', ...],
       prd: ['0001.md', ...],
       specs: ['0001.md', ...],
       tests: ['0001.md', ...],
       tdd: ['0001.md', ...],
       deploy: ['0001.md', ...],
       bugfix: ['0001.md', ...],
       bugs: ['README.md'],
       knowledge: ['architecture.md', 'conventions.md', 'dependencies.md', 'gotchas.md'],
       mockups: ['0001-screen-name.html', ...]
     };
     \`\`\`
   - 나머지 HTML/CSS/JS는 절대 수정하지 않는다

3. **Verify output**
   - \`wiki/views/index.html\`이 존재하는지 확인한다
   - WIKI_FILES 블록이 올바르게 갱신되었는지 확인한다

## Output

- \`wiki/views/index.html\` — WIKI_FILES 블록만 갱신 (HTML 구조 유지)

## Completion Checklist

- [ ] \`wiki/views/index.html\` 파일이 존재한다
- [ ] WIKI_FILES 객체에 현재 wiki/ 의 모든 파일이 반영되어 있다
- [ ] HTML/CSS/JS 구조는 변경되지 않았다

## Rules

- WIKI_FILES 블록만 수정한다. 다른 코드는 절대 건드리지 않는다.
- wiki/ source markdown files are read-only.
- 이 스킬은 haiku 모델로 실행한다.
`
const SKILL_RECORD_SKILL_RUN = `# Skill: record-skill-run

## 목적

특정 작업 스킬의 수행 절차와 산출 결과를 \`wiki/skill-run/{4자리번호}.md\`에 append-only로 기록한다.

## 입력

- \`skillName\`: 기록할 스킬 이름 (e.g. \`tdd-cycle\`, \`req-manage\`)
- \`executedAt\`: 실행 시각 (ISO 8601, UTC, e.g. \`2026-03-07T12:00:00Z\`)
- \`procedureSummary\`: 수행한 절차 요약 (1~3문장)
- \`artifacts\`: 생성된 산출물 경로 목록

## 절차

1. \`wiki/skill-run/\` 디렉토리 내 기존 파일 확인하여 다음 4자리 번호 결정
   - 파일 없으면 \`0001\`, 있으면 최신 번호 + 1
2. \`wiki/skill-run/{번호}.md\` 파일 존재 여부 확인
   - 없으면 신규 생성
   - 있으면 기존 내용 뒤에 \`---\` 구분자와 함께 append (덮어쓰기 절대 금지)
3. 기록 형식으로 내용 작성:

\`\`\`markdown
## [{executedAt}] {skillName}

**절차 요약**: {procedureSummary}

**산출물**:
- {artifact1}
- {artifact2}
...
\`\`\`

4. 파일에 내용 저장

## 규칙

- append-only: 기존 파일 내용 절대 수정/삭제 금지
- \`wiki/skill-run/\` 디렉토리 없으면 자동 생성
- 타임스탬프는 반드시 ISO 8601 UTC 형식 사용

## 출력

- 기록된 파일 경로: \`wiki/skill-run/{번호}.md\`
- 신규 생성 또는 append 여부 보고
`

// ── Commands ──

const CMD_ADD_REQ = `신규 요구사항을 등록합니다.

사용자 입력: $ARGUMENTS

$ARGUMENTS가 비어있으면 어떤 요구사항을 추가할지 질문하세요.

## 등록 절차

1. wiki/requirements/README.md 파일을 읽는다
   - 파일이 없으면 아래 헤더로 새로 생성한다:
     \`\`\`
     # Requirements

     | ID | 제목 | 상태 |
     |----|------|------|
     \`\`\`
2. 기존 항목 수를 세어 다음 순번의 REQ-ID를 결정한다 (REQ-001, REQ-002, ...)
3. README.md 테이블에 **제목만** 추가한다: \`| REQ-NNN | {제목} | [ ] |\`
4. \`wiki/requirements/REQ-NNN.md\` 상세 파일을 생성한다:
   \`\`\`markdown
   # REQ-{NNN}: {제목}

   > Date: {YYYY-MM-DD}
   > Status: [ ]

   ## 설명

   {사용자가 입력한 상세 설명}

   ## 주요 기능

   - {기능 1}

   ## 제약 사항

   - {있으면 기재}

   ## 관련 요구사항

   - {있으면 기재}
   \`\`\`
5. 등록 완료 메시지와 함께 부여된 ID를 출력한다

## 규칙

- 항상 [ ] (미완료) 상태로 등록한다
- README.md에는 제목만 기재하고, 상세 내용은 \`wiki/requirements/REQ-NNN.md\`에 작성한다
- 기존 파일 내용은 수정하지 않는다 (append-only)
- /teams 커맨드로 파이프라인을 실행할 수 있음을 안내한다
`

const CMD_ADD_BUG = `신규 버그를 wiki/bugs/README.md에 등록합니다.

사용자 입력: $ARGUMENTS

$ARGUMENTS가 비어있으면 버그 증상을 질문하세요.

## 등록 절차

1. wiki/bugs/README.md 파일을 읽는다
   - 파일이 없으면 아래 헤더로 새로 생성한다:
     \`\`\`
     # Bug Reports

     | ID | 설명 | 상태 |
     |----|------|------|
     \`\`\`
2. 기존 항목 수를 세어 다음 순번의 BUG-ID를 결정한다 (BUG-001, BUG-002, ...)
3. 새 행을 테이블에 추가한다: \`| BUG-NNN | {설명} | [ ] |\`
4. 등록 완료 메시지와 함께 부여된 ID를 출력한다

## 규칙

- 항상 [ ] (미완료) 상태로 등록한다
- 기존 파일 내용은 수정하지 않는다 (append-only)
- /bugfix-teams 커맨드로 파이프라인을 실행할 수 있음을 안내한다
`

const CMD_TEAMS = `팀 개발 파이프라인을 실행합니다.

사용자 입력: $ARGUMENTS

## 실행 대상 선택

1. $ARGUMENTS에 REQ-ID (예: REQ-001)가 있으면 해당 요구사항을 선택한다
2. $ARGUMENTS가 비어있으면 wiki/requirements/README.md에서 첫 번째 [ ] 항목을 자동 선택한다
3. 미완료 항목이 없거나 파일이 없으면: "/add-req 커맨드로 요구사항을 먼저 추가하세요."를 출력하고 종료한다

선택된 항목의 ID와 제목을 출력한 뒤, \`wiki/requirements/REQ-NNN.md\` 상세 문서를 읽어 전체 맥락을 파악하고 파이프라인을 시작한다.

## 사전 준비

- wiki/ 하위 디렉토리 구조를 확인하고, 없는 디렉토리는 생성한다
- 각 카테고리(prd, specs, tests, tdd, deploy)의 기존 파일을 확인하여 다음 순번(NNNN)을 결정한다
- wiki/knowledge/ 파일들을 읽어 기존 프로젝트 지식을 파악한다

## 파이프라인

각 단계는 **반드시 순서대로** 실행하며, **이전 단계의 검증을 통과해야** 다음 단계로 진행한다.

> **서브에이전트 원칙**: 각 Step의 실제 작업은 \`Agent\` 도구로 서브에이전트를 생성하여 실행한다.
> 메인 에이전트는 오케스트레이터 역할만 하며, 서브에이전트 완료 후 산출물 파일 존재 여부만 검증한다.
> 이를 통해 메인 컨텍스트가 각 단계의 작업 세부사항으로 오염되지 않는다.

### Step 1: req-manage — 요구사항 정의 및 PRD 작성

1. **Agent 도구**로 서브에이전트를 생성하고, req-manage 스킬을 실행하도록 지시한다
   - 서브에이전트에게 선택된 요구사항 ID, 제목, REQ-NNN.md 내용을 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/prd/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
   - **검증**: \`wiki/requirements/README.md\`에 해당 요구사항 행이 존재하는지 확인한다
   - **검증**: \`wiki/requirements/REQ-NNN.md\` 상세 문서가 존재하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다. 통과할 때까지 다음 단계로 진행하지 않는다

### Step 2: dev-design — 개발 설계서(SDD) 작성

1. **Agent 도구**로 서브에이전트를 생성하고, dev-design 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/prd/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/specs/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다

### Step 2.5: ui-mockup — UI 목업 생성 (선택)

> UI가 있는 기능인 경우에만 실행한다. API, CLI, 백엔드 로직만 있는 기능이면 건너뛴다.

1. **Agent 도구**로 서브에이전트를 생성하고, ui-mockup 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/specs/{NNNN}.md\`의 UI Design 섹션 내용을 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/mockups/\` 하위에 HTML 파일이 존재하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 목업을 생성한다

### Step 3: test-design — 테스트 설계서 작성

1. **Agent 도구**로 서브에이전트를 생성하고, test-design 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/specs/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/tests/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다

### Step 4: tdd-cycle — TDD(Red-Green-Refactor) 사이클 구현

1. **Agent 도구**로 서브에이전트를 생성하고, tdd-cycle 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/specs/{NNNN}.md\`, \`wiki/tests/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/tdd/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
   - **검증**: 테스트 러너를 실행하여 모든 테스트가 통과하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 코드를 수정한다

### Step 5: deploy — 빌드, 검증

1. **Agent 도구**로 서브에이전트를 생성하고, deploy 스킬을 실행하도록 지시한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/deploy/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
   - **검증**: 빌드 산출물이 존재하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 빌드 오류를 수정한다

### Step 6: wiki-views — wiki 뷰어 갱신 (haiku 모델)

1. **Agent 도구**로 서브에이전트를 생성하고, wiki-views 스킬을 \`claude-haiku-4-5-20251001\` 모델로 실행하도록 지시한다
   - 서브에이전트는 wiki/ 카테고리를 스캔하여 \`wiki/views/index.html\`의 WIKI_FILES 블록을 갱신한다
2. **검증**: \`wiki/views/index.html\` 파일이 존재하는지 확인한다

### Step 7: project-knowledge — 프로젝트 지식 기록

1. **Agent 도구**로 서브에이전트를 생성하고, project-knowledge 스킬을 실행하도록 지시한다
   - 서브에이전트에게 파이프라인 전체 과정에서 발견한 주요 사항(아키텍처, 컨벤션, 의존성, 주의사항 등)을 요약하여 전달한다
2. **검증**: 새로 기록한 내용이 기존 항목과 중복되지 않는지 확인한다

## 완료 처리

1. wiki/requirements/README.md에서 해당 항목의 상태를 [ ] → [x]로 갱신한다
2. 최종 파이프라인 요약을 출력한다:
   - 각 단계별 생성된 산출물 경로
   - 검증 결과 (PASS/FAIL)

## 실행 규칙

- 모든 문서 산출물은 반드시 \`wiki/\` 하위에만 작성한다 — 다른 위치에 작성하지 않는다
- 각 단계의 스킬을 순서대로 실행하며, **검증 통과 후에만** 다음 단계로 진행한다
- 이전 단계의 산출물(wiki/ 문서)을 다음 단계의 입력으로 반드시 사용한다
- 요구사항 참조 시 README.md에서 제목을 확인한 뒤, \`wiki/requirements/REQ-NNN.md\` 상세 문서를 읽어 전체 내용을 파악한다
- wiki/ 내 기존 파일은 절대 수정하지 않는다 (append-only, 상태 갱신은 예외)
`

const CMD_BUGFIX_TEAMS = `버그 수정 파이프라인을 실행합니다.

사용자 입력: $ARGUMENTS

## 실행 대상 선택

1. $ARGUMENTS에 BUG-ID (예: BUG-001)가 있으면 해당 버그를 선택한다
2. $ARGUMENTS가 비어있으면 wiki/bugs/README.md에서 첫 번째 [ ] 항목을 자동 선택한다
3. 미완료 항목이 없거나 파일이 없으면: "/add-bug 커맨드로 버그를 먼저 추가하세요."를 출력하고 종료한다

선택된 항목의 ID와 설명을 출력하고 파이프라인을 시작한다.

## 사전 준비

- wiki/ 하위 디렉토리 구조를 확인하고, 없는 디렉토리는 생성한다
- 각 카테고리(bugfix, specs, tests, tdd, deploy)의 기존 파일을 확인하여 다음 순번(NNNN)을 결정한다
- wiki/knowledge/ 파일들을 읽어 기존 프로젝트 지식을 파악한다

## 파이프라인

각 단계는 **반드시 순서대로** 실행하며, **이전 단계의 검증을 통과해야** 다음 단계로 진행한다.

> **서브에이전트 원칙**: 각 Step의 실제 작업은 \`Agent\` 도구로 서브에이전트를 생성하여 실행한다.
> 메인 에이전트는 오케스트레이터 역할만 하며, 서브에이전트 완료 후 산출물 파일 존재 여부만 검증한다.
> 이를 통해 메인 컨텍스트가 각 단계의 작업 세부사항으로 오염되지 않는다.

### Step 1: bugfix — 버그 원인 파악

1. **Agent 도구**로 서브에이전트를 생성하고, bugfix 스킬을 실행하도록 지시한다
   - 서브에이전트에게 선택된 버그 ID와 wiki/bugs/README.md의 해당 항목 내용을 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/bugfix/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다. 통과할 때까지 다음 단계로 진행하지 않는다

### Step 2: dev-design — 수정 설계

1. **Agent 도구**로 서브에이전트를 생성하고, dev-design 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/bugfix/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/specs/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다

### Step 3: test-design — 회귀 테스트 설계

1. **Agent 도구**로 서브에이전트를 생성하고, test-design 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/specs/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/tests/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 산출물을 보완한다

### Step 4: tdd-cycle — TDD 기반 수정

1. **Agent 도구**로 서브에이전트를 생성하고, tdd-cycle 스킬을 실행하도록 지시한다
   - 서브에이전트에게 \`wiki/specs/{NNNN}.md\`, \`wiki/tests/{NNNN}.md\` 경로를 컨텍스트로 전달한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/tdd/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
   - **검증**: 테스트 러너를 실행하여 모든 테스트가 통과하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 코드를 수정한다

### Step 5: deploy — 빌드, 검증

1. **Agent 도구**로 서브에이전트를 생성하고, deploy 스킬을 실행하도록 지시한다
2. 서브에이전트 완료 후 메인 에이전트가 직접 검증한다:
   - **검증**: \`wiki/deploy/{NNNN}.md\` 파일이 존재하고 100바이트 이상인지 확인한다
   - **검증**: 빌드 산출물이 존재하는지 확인한다
3. 검증 실패 시: 서브에이전트를 재호출하여 빌드 오류를 수정한다

### Step 6: wiki-views — wiki 뷰어 갱신 (haiku 모델)

1. **Agent 도구**로 서브에이전트를 생성하고, wiki-views 스킬을 \`claude-haiku-4-5-20251001\` 모델로 실행하도록 지시한다
   - 서브에이전트는 wiki/ 카테고리를 스캔하여 \`wiki/views/index.html\`의 WIKI_FILES 블록을 갱신한다
2. **검증**: \`wiki/views/index.html\` 파일이 존재하는지 확인한다

### Step 7: project-knowledge — 프로젝트 지식 기록

1. **Agent 도구**로 서브에이전트를 생성하고, project-knowledge 스킬을 실행하도록 지시한다
   - 서브에이전트에게 파이프라인 전체 과정에서 발견한 주요 사항(아키텍처, 컨벤션, 의존성, 주의사항 등)을 요약하여 전달한다
2. **검증**: 새로 기록한 내용이 기존 항목과 중복되지 않는지 확인한다

## 완료 처리

1. wiki/bugs/README.md에서 해당 항목의 상태를 [ ] → [x]로 갱신한다
2. 최종 파이프라인 요약을 출력한다:
   - 각 단계별 생성된 산출물 경로
   - 검증 결과 (PASS/FAIL)

## 실행 규칙

- 모든 문서 산출물은 반드시 \`wiki/\` 하위에만 작성한다 — 다른 위치에 작성하지 않는다
- 각 단계의 스킬을 순서대로 실행하며, **검증 통과 후에만** 다음 단계로 진행한다
- 이전 단계의 산출물(wiki/ 문서)을 다음 단계의 입력으로 반드시 사용한다
- wiki/ 내 기존 파일은 절대 수정하지 않는다 (append-only, 상태 갱신은 예외)
`

// ── Skills: English versions ──
// For skills already written in English, reuse the same content.
// For skills with Korean sections (ui-mockup, wiki-views), provide English-only versions.

const SKILL_UI_MOCKUP_EN = `---
name: ui-mockup
description: This skill should be used when the user asks to "create UI mockup", "design the screen", "make HTML mockup". Generate standalone HTML mockups from SDD UI specifications.
---

# ui-mockup

## Purpose

Accept the UI design from an SDD (Solution Design Document) as input and generate a standalone HTML mockup
that can be viewed directly in a browser. Visually represents the layout and states of each screen,
similar to a storybook.

## Trigger

Activate when UI mockup creation, screen design visualization, or HTML prototype is requested. Typically runs after dev-design.

## Prerequisites

\`\`\`bash
mkdir -p wiki/mockups
\`\`\`

## Workflow

1. **Read context**
   - Read the relevant SDD from \`wiki/specs/{NNNN}.md\`
   - Identify screen list, component structure, and UI states from the SDD UI Design section
   - If no UI Design section, infer from Module Design and Data Flow
   - Read \`wiki/knowledge/\` for known UI conventions

2. **Identify screens**
   - List the screens/views to implement
   - Define UI states for each screen (default, loading, empty, error, etc.)

3. **Generate mockups**
   - Create \`wiki/mockups/{NNNN}-{screen-name}.html\` for each screen
   - Follow the mockup writing guidelines below

4. **Create gallery index**
   - Create \`wiki/mockups/index.html\` listing all mockups as cards
   - Include SDD number, screen name, and mockup link

5. **Verify output**
   - Confirm HTML files exist under \`wiki/mockups/\`
   - Confirm each file is a standalone file that can be opened in a browser
   - If check fails, fix before reporting completion

## Mockup Writing Guidelines

### Visual Representation Principles

- **Realistic data** — use scenario-appropriate data instead of lorem ipsum
- **All interactive elements** — buttons, input fields, dropdowns, toggles, checkboxes, etc.
- **Layout fidelity** — implement actual layout with flexbox/grid
- **Colors/Typography** — follow project design system if available; otherwise use system fonts + neutral colors
- **Responsive** — max-width container; mobile support is optional
- **Hover/focus states** — provide interaction hints via CSS :hover, :focus

## Output

- \`wiki/mockups/{NNNN}-{screen-name}.html\` — Standalone mockup files
- \`wiki/mockups/index.html\` — Gallery index

## Completion Checklist

- [ ] Mockup HTML files exist under \`wiki/mockups/\`
- [ ] Each file is standalone (no external dependencies)
- [ ] Gallery index \`wiki/mockups/index.html\` updated

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
`

const SKILL_WIKI_VIEWS_EN = SKILL_WIKI_VIEWS  // Same content as KO version

const SKILL_REQ_MANAGE_EN = SKILL_REQ_MANAGE  // Already in English
const SKILL_DEV_DESIGN_EN = SKILL_DEV_DESIGN  // Already in English
const SKILL_TEST_DESIGN_EN = SKILL_TEST_DESIGN // Already in English
const SKILL_TDD_CYCLE_EN = SKILL_TDD_CYCLE    // Already in English
const SKILL_DEPLOY_EN = SKILL_DEPLOY          // Already in English
const SKILL_BUGFIX_EN = SKILL_BUGFIX          // Already in English
const SKILL_PROJECT_KNOWLEDGE_EN = SKILL_PROJECT_KNOWLEDGE // Already in English
const SKILL_RECORD_SKILL_RUN_EN = SKILL_RECORD_SKILL_RUN  // Already in English

// ── Commands: English versions ──

const CMD_ADD_REQ_EN = `Register a new requirement.

User input: $ARGUMENTS

If $ARGUMENTS is empty, ask the user what requirement they want to add.

## Registration Steps

1. Read wiki/requirements/README.md
   - If the file does not exist, create it with the following header:
     \`\`\`
     # Requirements

     | ID | Title | Status |
     |----|-------|--------|
     \`\`\`
2. Count existing entries to determine the next REQ-ID (REQ-001, REQ-002, ...)
3. Add only the title to the README.md table: \`| REQ-NNN | {title} | [ ] |\`
4. Create the detailed file \`wiki/requirements/REQ-NNN.md\`:
   \`\`\`markdown
   # REQ-{NNN}: {Title}

   > Date: {YYYY-MM-DD}
   > Status: [ ]

   ## Description

   {Detailed description provided by user}

   ## Key Features

   - {Feature 1}

   ## Constraints

   - {If any}

   ## Related Requirements

   - {If any}
   \`\`\`
5. Output a registration complete message with the assigned ID

## Rules

- Always register with [ ] (incomplete) status
- Only record the title in README.md; detailed content goes in \`wiki/requirements/REQ-NNN.md\`
- Do not modify existing file content (append-only)
- Inform the user that the /teams command can run the pipeline
`

const CMD_ADD_BUG_EN = `Register a new bug in wiki/bugs/README.md.

User input: $ARGUMENTS

If $ARGUMENTS is empty, ask the user to describe the bug symptoms.

## Registration Steps

1. Read wiki/bugs/README.md
   - If the file does not exist, create it with the following header:
     \`\`\`
     # Bug Reports

     | ID | Description | Status |
     |----|-------------|--------|
     \`\`\`
2. Count existing entries to determine the next BUG-ID (BUG-001, BUG-002, ...)
3. Add a new row to the table: \`| BUG-NNN | {description} | [ ] |\`
4. Output a registration complete message with the assigned ID

## Rules

- Always register with [ ] (incomplete) status
- Do not modify existing file content (append-only)
- Inform the user that the /bugfix-teams command can run the pipeline
`

const CMD_TEAMS_EN = `Run the team development pipeline.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a REQ-ID (e.g., REQ-001), select that requirement
2. If $ARGUMENTS is empty, auto-select the first [ ] entry from wiki/requirements/README.md
3. If no incomplete entries exist or the file is missing: output "/add-req command to add requirements first." and exit

Output the selected item's ID and title, then read \`wiki/requirements/REQ-NNN.md\` to understand the full context and start the pipeline.

## Prerequisites

- Check wiki/ subdirectory structure and create missing directories
- Check existing files in each category (prd, specs, tests, tdd, deploy) to determine the next sequence number (NNNN)
- Read wiki/knowledge/ files to understand existing project knowledge

## Pipeline

Each step must be executed in order. Proceed to the next step only after verification passes.

> **Sub-agent principle**: Each step's actual work is executed by creating a sub-agent with the Agent tool.
> The main agent acts only as orchestrator and verifies output file existence after sub-agent completion.
> This prevents the main context from being polluted by step-level details.

### Step 1: req-manage — Requirements Definition and PRD Writing

1. Create a sub-agent with the **Agent tool** and instruct it to run the req-manage skill
   - Pass the selected requirement ID, title, and REQ-NNN.md content as context
2. After sub-agent completion, the main agent verifies directly:
   - **Verify**: \`wiki/prd/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: \`wiki/requirements/README.md\` contains the requirement row
   - **Verify**: \`wiki/requirements/REQ-NNN.md\` detail document exists
3. On verification failure: re-invoke sub-agent to complete the output. Do not proceed until passed.

### Step 2: dev-design — Development Design Document (SDD)

1. Create a sub-agent and instruct it to run the dev-design skill
   - Pass \`wiki/prd/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/specs/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 2.5: ui-mockup — UI Mockup Generation (optional)

> Run only if the feature has a user interface. Skip for API/CLI/backend-only features.

1. Create a sub-agent and instruct it to run the ui-mockup skill
   - Pass the UI Design section content from \`wiki/specs/{NNNN}.md\` as context
2. After sub-agent completion, verify:
   - **Verify**: HTML file(s) exist under \`wiki/mockups/\`
3. On failure: re-invoke sub-agent

### Step 3: test-design — Test Design Document

1. Create a sub-agent and instruct it to run the test-design skill
   - Pass \`wiki/specs/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tests/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 4: tdd-cycle — TDD (Red-Green-Refactor) Implementation

1. Create a sub-agent and instruct it to run the tdd-cycle skill
   - Pass \`wiki/specs/{NNNN}.md\` and \`wiki/tests/{NNNN}.md\` paths as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tdd/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Run the test runner and confirm all tests pass
3. On failure: re-invoke sub-agent to fix the code

### Step 5: deploy — Build and Verify

1. Create a sub-agent and instruct it to run the deploy skill
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/deploy/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Build artifacts exist
3. On failure: re-invoke sub-agent

### Step 6: wiki-views — Update Wiki Viewer (haiku model)

1. Create a sub-agent with the **Agent tool** and instruct it to run the wiki-views skill with \`claude-haiku-4-5-20251001\` model
   - The sub-agent scans wiki/ categories and updates the WIKI_FILES block in \`wiki/views/index.html\`
2. **Verify**: \`wiki/views/index.html\` file exists

### Step 7: project-knowledge — Record Project Knowledge

1. Create a sub-agent and instruct it to run the project-knowledge skill
   - Pass a summary of key findings from the entire pipeline (architecture, conventions, dependencies, notes)
2. **Verify**: Confirm new content does not duplicate existing entries

## Completion

1. Update the item status in wiki/requirements/README.md from [ ] to [x]
2. Output a final pipeline summary:
   - Output path for each step
   - Verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Execute each step in order; proceed to the next only after verification passes
- Always use the previous step's output (wiki/ docs) as input for the next step
- When referencing requirements, read the title from README.md then read \`wiki/requirements/REQ-NNN.md\` for full content
- Never modify existing wiki/ files (append-only, status updates are the exception)
`

const CMD_BUGFIX_TEAMS_EN = `Run the bug fix pipeline.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a BUG-ID (e.g., BUG-001), select that bug
2. If $ARGUMENTS is empty, auto-select the first [ ] entry from wiki/bugs/README.md
3. If no incomplete entries exist or the file is missing: output "/add-bug command to add bugs first." and exit

Output the selected item's ID and description, then start the pipeline.

## Prerequisites

- Check wiki/ subdirectory structure and create missing directories
- Check existing files in each category (bugfix, specs, tests, tdd, deploy) to determine the next sequence number (NNNN)
- Read wiki/knowledge/ files to understand existing project knowledge

## Pipeline

Each step must be executed in order. Proceed to the next step only after verification passes.

> **Sub-agent principle**: Each step's actual work is executed by creating a sub-agent with the Agent tool.
> The main agent acts only as orchestrator and verifies output file existence after sub-agent completion.
> This prevents the main context from being polluted by step-level details.

### Step 1: bugfix — Bug Root Cause Analysis

1. Create a sub-agent with the **Agent tool** and instruct it to run the bugfix skill
   - Pass the selected bug ID and the relevant entry from wiki/bugs/README.md as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/bugfix/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent to complete the output. Do not proceed until passed.

### Step 2: dev-design — Fix Design

1. Create a sub-agent and instruct it to run the dev-design skill
   - Pass \`wiki/bugfix/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/specs/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 3: test-design — Regression Test Design

1. Create a sub-agent and instruct it to run the test-design skill
   - Pass \`wiki/specs/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tests/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 4: tdd-cycle — TDD-Based Fix

1. Create a sub-agent and instruct it to run the tdd-cycle skill
   - Pass \`wiki/specs/{NNNN}.md\` and \`wiki/tests/{NNNN}.md\` paths as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tdd/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Run the test runner and confirm all tests pass
3. On failure: re-invoke sub-agent to fix the code

### Step 5: deploy — Build and Verify

1. Create a sub-agent and instruct it to run the deploy skill
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/deploy/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Build artifacts exist
3. On failure: re-invoke sub-agent

### Step 6: wiki-views — Update Wiki Viewer (haiku model)

1. Create a sub-agent with the **Agent tool** and instruct it to run the wiki-views skill with \`claude-haiku-4-5-20251001\` model
   - The sub-agent scans wiki/ categories and updates the WIKI_FILES block in \`wiki/views/index.html\`
2. **Verify**: \`wiki/views/index.html\` file exists

### Step 7: project-knowledge — Record Project Knowledge

1. Create a sub-agent and instruct it to run the project-knowledge skill
   - Pass a summary of key findings from the entire pipeline
2. **Verify**: Confirm new content does not duplicate existing entries

## Completion

1. Update the item status in wiki/bugs/README.md from [ ] to [x]
2. Output a final pipeline summary:
   - Output path for each step
   - Verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Execute each step in order; proceed to the next only after verification passes
- Always use the previous step's output (wiki/ docs) as input for the next step
- Never modify existing wiki/ files (append-only, status updates are the exception)
`

// ── Export ──

function buildDefaultSkills(lang: Lang = 'en'): Record<string, string> {
  if (lang === 'ko') {
    return {
      'req-manage': SKILL_REQ_MANAGE,
      'dev-design': SKILL_DEV_DESIGN,
      'ui-mockup': SKILL_UI_MOCKUP,
      'test-design': SKILL_TEST_DESIGN,
      'tdd-cycle': SKILL_TDD_CYCLE,
      'deploy': SKILL_DEPLOY,
      'bugfix': SKILL_BUGFIX,
      'project-knowledge': SKILL_PROJECT_KNOWLEDGE,
      'wiki-views': SKILL_WIKI_VIEWS,
      'record-skill-run': SKILL_RECORD_SKILL_RUN
    }
  }
  // Default: English (skills content is already in English)
  return {
    'req-manage': SKILL_REQ_MANAGE_EN,
    'dev-design': SKILL_DEV_DESIGN_EN,
    'ui-mockup': SKILL_UI_MOCKUP_EN,
    'test-design': SKILL_TEST_DESIGN_EN,
    'tdd-cycle': SKILL_TDD_CYCLE_EN,
    'deploy': SKILL_DEPLOY_EN,
    'bugfix': SKILL_BUGFIX_EN,
    'project-knowledge': SKILL_PROJECT_KNOWLEDGE_EN,
    'wiki-views': SKILL_WIKI_VIEWS_EN,
    'record-skill-run': SKILL_RECORD_SKILL_RUN_EN
  }
}

function buildDefaultCommands(lang: Lang = 'en'): Record<string, string> {
  if (lang === 'ko') {
    return {
      'add-req': CMD_ADD_REQ,
      'add-bug': CMD_ADD_BUG,
      'teams': CMD_TEAMS,
      'bugfix-teams': CMD_BUGFIX_TEAMS
    }
  }
  // Default: English
  return {
    'add-req': CMD_ADD_REQ_EN,
    'add-bug': CMD_ADD_BUG_EN,
    'teams': CMD_TEAMS_EN,
    'bugfix-teams': CMD_BUGFIX_TEAMS_EN
  }
}

// Backward-compatible constants (ko default to preserve existing behavior for callers)
const DEFAULT_SKILLS = buildDefaultSkills('ko')
const DEFAULT_COMMANDS = buildDefaultCommands('ko')

function buildWikiViewerHtml(): string {
  return `<!DOCTYPE html>
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
    // ========== FILE REGISTRY (wiki-views 스킬이 이 블록만 갱신) ==========
    var WIKI_FILES = {
      requirements: [],
      prd: [],
      specs: [],
      tests: [],
      tdd: [],
      deploy: [],
      bugfix: [],
      bugs: [],
      knowledge: [],
      mockups: []
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
          h += '<div class="cycle-row'+(isOpen?' active':'')+'" onclick="cycleToggle(\\''+ck+'\\',\\''+cv+'\\')">'+
               '<span class="cycle-dot '+dotCls+'"></span>'+c.id+'<span class="cycle-meta">'+c.done+'/'+c.total+'</span></div>';
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
          h += '<div class="cycle-row'+(isOpen?' active':'')+'" onclick="cycleToggle(\\''+ck+'\\',\\''+cv+'\\')">'+
               '<span class="cycle-dot '+dotCls+'"></span>'+c.id+'<span class="cycle-meta">'+c.done+'/'+c.total+'</span></div>';
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
        h+='<div class="card" onclick="go(\\'dev-cycle/'+c.id+'\\')">'+
           '<div class="card-head"><span class="card-id">'+c.id+'</span><span class="card-badge '+(c.complete?'ok':'wip')+'">'+c.done+'/'+c.total+'</span></div>'+
           '<div class="card-stages">';
        DEV_STAGES.forEach(function(st){ h+='<span class="chip '+(c.stages[st.key].ok?'ok':'no')+'">'+st.label+'</span>'; });
        h+='</div></div>';
      });
      h+='</div></div>';
      if(bugCycles.length) {
        h+='<div class="section"><h2>Bug Cycles</h2><div class="card-grid">';
        bugCycles.forEach(function(c) {
          h+='<div class="card" onclick="go(\\'bug-cycle/'+c.id+'\\')">'+
             '<div class="card-head"><span class="card-id">'+c.id+'</span><span class="card-badge '+(c.complete?'ok':'wip')+'">'+c.done+'/'+c.total+'</span></div>'+
             '<div class="card-stages">';
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
      var h='<div class="breadcrumb"><span class="tag">Dev Cycle</span> '+reqId+'</div>'+
             '<div class="page-title">'+reqId+' Development Cycle</div>'+
             '<div class="page-sub">'+c.done+'/'+c.total+' stages — '+(c.complete?'Complete':'In Progress')+'</div>';
      h+='<div class="pipeline-bar"><a class="pipe-step ok" onclick="go(\\'requirements/'+reqId+'.md\\')">REQ</a>';
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
      h+='</div><div class="section"><h2>Documents</h2>'+
         '<div class="doc-link"><a onclick="go(\\'requirements/'+reqId+'.md\\')">Requirements: '+reqId+'</a></div>';
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
      var h='<div class="breadcrumb"><span class="tag">Bug Cycle</span> '+bugId+'</div>'+
             '<div class="page-title">'+bugId+' Bug Fix Cycle</div>'+
             '<div class="page-sub">'+c.done+'/'+c.total+' stages — '+(c.complete?'Complete':'In Progress')+'</div>';
      h+='<div class="pipeline-bar">';
      BUG_STAGES.forEach(function(st,i) {
        var sd=c.stages[st.key];
        if(i>0) h+='<span class="pipe-arrow">&rarr;</span>';
        if(sd.ok) h+='<a class="pipe-step ok" onclick="go(\\''+st.cat+'/'+sd.file+'\\')">'+st.label+'</a>';
        else h+='<span class="pipe-step no">'+st.label+'</span>';
      });
      h+='</div><div class="section"><h2>Documents</h2>';
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
      var h='<div class="breadcrumb">Traceability Matrix</div><div class="page-title">Traceability Matrix</div>';
      var completeCnt=0;
      var tableH='<table class="trace-table"><thead><tr><th style="text-align:left">REQ</th>';
      stageKeys.forEach(function(s){tableH+='<th>'+stageLabels[s]+'</th>';});
      tableH+='<th>Mockup</th><th>Bugfix</th></tr></thead><tbody>';
      devCycles.forEach(function(c) {
        tableH+='<tr><td class="trace-req" onclick="go(\\'dev-cycle/'+c.id+'\\')">'+c.id+'</td>';
        var allOk=true;
        stageKeys.forEach(function(s) {
          var st=c.stages[s==='specs'?'sdd':s];
          if(st&&st.ok) tableH+='<td class="trace-ok" onclick="go(\\''+s+'/'+st.file+'\\')">OK</td>';
          else { tableH+='<td class="trace-no">-</td>'; allOk=false; }
        });
        if(allOk) completeCnt++;
        var ms=c.stages.mockup;
        tableH+=(ms&&ms.ok)?'<td class="trace-ok" onclick="go(\\'mockups/'+ms.file+'\\')">OK</td>':'<td class="trace-no">-</td>';
        tableH+=fileSets.bugfix[c.n+'.md']?'<td class="trace-ok" onclick="go(\\'bugfix/'+c.n+'.md\\')">OK</td>':'<td class="trace-no">-</td>';
        tableH+='</tr>';
      });
      tableH+='</tbody></table>';
      h+='<div class="page-sub">'+completeCnt+' / '+devCycles.length+' requirements have full pipeline coverage</div>';
      h+=tableH;
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
</html>`;
}

export { buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands, buildWikiViewerHtml, DEFAULT_SKILLS, DEFAULT_COMMANDS }
