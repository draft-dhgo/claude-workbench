// Claude 구성 자동 세팅 시 기본으로 생성되는 스킬/커맨드/CLAUDE.md 내용
// handleReset에서 .claude/ 재생성 시 사용

import {
  SKILL_REQ_MANAGE, SKILL_REQ_MANAGE_EN,
  SKILL_DEV_DESIGN, SKILL_DEV_DESIGN_EN,
  SKILL_UI_MOCKUP, SKILL_UI_MOCKUP_EN,
  SKILL_TEST_DESIGN, SKILL_TEST_DESIGN_EN,
  SKILL_TDD_CYCLE, SKILL_TDD_CYCLE_EN,
  SKILL_DEPLOY, SKILL_DEPLOY_EN,
  SKILL_BUGFIX, SKILL_BUGFIX_EN,
  SKILL_PROJECT_KNOWLEDGE, SKILL_PROJECT_KNOWLEDGE_EN,
  SKILL_WIKI_VIEWS, SKILL_WIKI_VIEWS_EN,
  SKILL_RECORD_SKILL_RUN, SKILL_RECORD_SKILL_RUN_EN,
} from './skills'

import {
  CMD_ADD_REQ, CMD_ADD_BUG, CMD_TEAMS, CMD_BUGFIX_TEAMS,
  CMD_ADD_REQ_EN, CMD_ADD_BUG_EN, CMD_TEAMS_EN, CMD_BUGFIX_TEAMS_EN,
} from './commands'

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

// ── Builders ──

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
  // Default: English
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

export { buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands, DEFAULT_SKILLS, DEFAULT_COMMANDS }
