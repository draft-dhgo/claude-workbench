// Claude 구성 자동 세팅 시 기본으로 생성되는 스킬/커맨드/CLAUDE.md 내용
// handleReset에서 .claude/ 재생성 시 사용

function buildDefaultClaudeMd(workspaceName: string): string {
  return `# Workspace: ${workspaceName}

## 워크스페이스 규칙

- 모든 문서 산출물은 반드시 wiki/ 하위에만 작성한다
- wiki/ 내 기존 파일은 수정하지 않는다 (append-only)
- 작업 중 발견한 프로젝트 지식은 wiki/knowledge/에 기록한다

## 사용 가능한 스킬

| 스킬 | 설명 |
|------|------|
| req-manage | This skill should be used when the user asks to "define requirements", "write a PRD", "manage requirements". Manage requirements definition and PRD writing, track progress status. |
| dev-design | This skill should be used when the user asks to "write a design document", "create an SDD", "design the implementation". Write development design documents (SDD). |
| ui-mockup | This skill should be used when the user asks to "create UI mockup", "design the screen", "make HTML mockup". Generate standalone HTML mockups from SDD UI specifications. |
| test-design | This skill should be used when the user asks to "design tests", "write test plan", "create test strategy". Write test design documents. |
| tdd-cycle | This skill should be used when the user asks to "implement with TDD", "run TDD cycle", "red-green-refactor". Execute TDD (Red-Green-Refactor) cycle implementation. |
| deploy | This skill should be used when the user asks to "deploy", "build for production", "run the build". Handle build, database integration, and local hosting. |
| bugfix | This skill should be used when the user asks to "fix a bug", "debug this issue", "investigate the error". Bug root cause analysis and fix pipeline entry point. |
| project-knowledge | This skill should be used when the user asks to "record project knowledge", "document architecture", "note a discovery". Investigate the project and progressively accumulate knowledge in wiki/knowledge/. |
| wiki-views | This skill should be used when the user asks to "generate wiki views", "create HTML views", "update wiki HTML". Generate a single-page wiki viewer that dynamically renders markdown files. |
| teams | This skill should be used when the user asks to "run the pipeline", "execute teams", "start development cycle". Run the full team development pipeline (req-manage → dev-design → ui-mockup → test-design → tdd-cycle → deploy → wiki-views → project-knowledge). |
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

## index.html 설계

### 핵심 구조

\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wiki Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>/* 전체 CSS 인라인 */</style>
</head>
<body>
  <div id="app">
    <nav id="sidebar"><!-- 사이드바: 카테고리 + 파일 트리 --></nav>
    <main id="content"><!-- 메인 컨텐츠 영역 --></main>
  </div>
  <script>
    // 파일 목록 (이 부분만 재생성 시 업데이트)
    const WIKI_FILES = { ... };
    // SPA 라우팅 + md 로드 + 렌더링 로직
  </script>
</body>
</html>
\`\`\`

### 사이드바 기능

- **Requirements, Cycles, Knowledge** 등 카테고리는 접기/펼치기(collapsible) 가능하게 구현
- 각 Cycle 내부 항목(PRD, SDD, Tests, TDD, Deploy, Mockups)도 접기/펼치기 가능
- 사이드바에 스크롤바 표시 (커스텀 스타일)
- 사이드바 상단에 stats bar (총 문서 수, REQ 완료 현황)

### JavaScript 로직

\`\`\`javascript
// 1. WIKI_FILES — 카테고리별 파일 목록 (생성 시 인라인)
const WIKI_FILES = {
  prd: ['0001.md', '0002.md', ...],
  specs: ['0001.md', ...],
  tests: ['0001.md', ...],
  tdd: ['0001.md', ...],
  deploy: ['0001.md', ...],
  bugfix: [],
  knowledge: ['architecture.md', 'conventions.md', ...],
  mockups: ['0001-main.html', ...],
  requirements: ['README.md', 'REQ-001.md', 'REQ-002.md', ...]
};

// 2. md 파일 로드 + marked.js 렌더링
async function loadMarkdown(category, filename) {
  const path = \\\`../\\\${category}/\\\${filename}\\\`;
  const res = await fetch(path);
  const md = await res.text();
  document.getElementById('content').innerHTML = \\\`
    <div class="breadcrumb">\\\${category} / \\\${filename}</div>
    <article class="markdown-body">\\\${marked.parse(md)}</article>
  \\\`;
}

// 3. 목업 로드 (iframe)
function loadMockup(filename) {
  document.getElementById('content').innerHTML = \\\`
    <div class="breadcrumb">mockups / \\\${filename}</div>
    <iframe src="../mockups/\\\${filename}" class="mockup-frame"></iframe>
  \\\`;
}

// 4. 대시보드 뷰
function showDashboard() {
  // 카테고리별 문서 수 카드
  // 최근 문서 목록
  // 요구사항 진행률 (requirements/README.md 파싱)
  // 목업 갤러리 썸네일
}

// 5. 추적성 뷰
async function showTraceability() {
  // requirements/README.md 로드
  // REQ별로 PRD → SDD → Test → TDD → Deploy 매핑 표시
  // 각 단계 문서 존재 여부를 WIKI_FILES에서 확인
}

// 6. 사이드바 클릭 이벤트
// 7. URL hash 기반 라우팅 (#/prd/0001.md, #/dashboard, #/traceability)
\`\`\`

### 로컬 서버로 실행

생성 후 브라우저에서 보려면:

\`\`\`bash
# 방법 1: npx serve
npx serve wiki -p 3000
# 브라우저에서 http://localhost:3000/views/index.html

# 방법 2: Python
python3 -m http.server 3000 -d wiki
# 브라우저에서 http://localhost:3000/views/index.html
\`\`\`

## Output

- \`wiki/views/index.html\` — 단일 SPA 뷰어 파일 (유일한 산출물)

## Completion Checklist

- [ ] \`wiki/views/index.html\` 파일이 존재한다
- [ ] WIKI_FILES 객체에 현재 wiki/ 의 모든 파일이 반영되어 있다
- [ ] marked.js CDN이 포함되어 있다
- [ ] 로컬 서버에서 md 파일이 정상 렌더링된다
- [ ] 대시보드, 카테고리 탐색, 추적성 뷰가 동작한다
- [ ] 목업 파일이 있는 경우 iframe으로 표시된다

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

1. \`wiki/views/index.html\`이 존재하지 않으면 **Agent 도구**로 서브에이전트를 생성하고, wiki-views 스킬을 \`claude-haiku-4-5-20251001\` 모델로 실행하도록 지시한다
2. 이미 존재하면 다음 절차로 직접 갱신한다:
   - Glob으로 \`wiki/mockups/{NNNN}-*.html\` 패턴을 검색하여 **실제 생성된 목업 파일명**을 확인한다
   - \`wiki/views/index.html\`에 해당 사이클 항목(\`<!-- Cycle: {NNNN} -->\`)이 이미 있으면 mockup 링크 경로만 실제 파일명과 일치하는지 확인하고 수정한다
   - 해당 사이클 항목이 없으면 현재 사이클(NNNN)에 대한 항목을 추가한다 (prd, specs, tests, tdd, deploy, mockup 링크 포함)
3. **검증**: \`wiki/views/index.html\` 파일이 존재하는지 확인한다

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

1. \`wiki/views/index.html\`이 존재하지 않으면 **Agent 도구**로 서브에이전트를 생성하고, wiki-views 스킬을 \`claude-haiku-4-5-20251001\` 모델로 실행하도록 지시한다
2. 이미 존재하면 다음 절차로 직접 갱신한다:
   - Glob으로 \`wiki/mockups/{NNNN}-*.html\` 패턴을 검색하여 **실제 생성된 목업 파일명**을 확인한다
   - \`wiki/views/index.html\`에 해당 사이클 항목(\`<!-- Cycle: {NNNN} -->\`)이 이미 있으면 mockup 링크 경로만 실제 파일명과 일치하는지 확인하고 수정한다
   - 해당 사이클 항목이 없으면 현재 사이클(NNNN)에 대한 항목을 추가한다 (prd, specs, tests, tdd, deploy, mockup 링크 포함)
3. **검증**: \`wiki/views/index.html\` 파일이 존재하는지 확인한다

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

// ── Export ──

const DEFAULT_SKILLS = {
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

const DEFAULT_COMMANDS = {
  'add-req': CMD_ADD_REQ,
  'add-bug': CMD_ADD_BUG,
  'teams': CMD_TEAMS,
  'bugfix-teams': CMD_BUGFIX_TEAMS
}

export { buildDefaultClaudeMd, DEFAULT_SKILLS, DEFAULT_COMMANDS }
