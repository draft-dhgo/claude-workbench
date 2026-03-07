<p align="center">
  <img src="assets/icon.png" alt="Claude Workbench" width="128" />
</p>

<h1 align="center">Claude Workbench</h1>

<p align="center">
  Claude Code-powered development workstation &mdash; Git worktree management and scrum pipeline in one desktop app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## Repository Management

Register local Git repositories, check current branches, and find them quickly with search.

![Repository Management](docs/screenshot-main.png)

## Workdir Sets

Group multiple repositories into a single set. Useful for microservice projects where you work across several repos simultaneously.

![Workdir Sets](docs/screenshot-sets.png)

## Workspace Creation

Select a set and create worktrees across all repositories with the same branch name in one shot. Track progress in real time.

![Workspace Creation](docs/screenshot-workspace-create.png)

## Worktree Management

View the worktree list per repository and manage deletions based on push status. Shows a warning when deleting an unpushed branch.

![Worktree Management](docs/screenshot-worktree-manage.png)

---

## Claude Code Commands

Run Claude Code inside a workspace and automate the scrum development pipeline with slash commands.

```bash
cd ~/worktrees/feature-login-api
claude
```

| Command | Description | Usage |
|---------|-------------|-------|
| `/teams` | Run team development pipeline | Automates the full flow: requirements → design → implementation → deploy |
| `/add-req` | Register a new requirement | Adds a new requirement to `wiki/requirements/` |
| `/add-bug` | Register a new bug | Registers a bug in `wiki/bugs/README.md` |
| `/bugfix-teams` | Run bug-fix pipeline | Automates analysis → fix → test flow for a registered bug |

```bash
# Register a requirement then run the pipeline
> /add-req
> "JWT token-based auth needs to be implemented for the login API"

> /teams
> "Implement REQ-001 login API"

# Register a bug then run the fix pipeline
> /add-bug
> "Refresh token is not renewed on login"

> /bugfix-teams
> "Fix BUG-001"
```

Each pipeline step saves its artifact to the `wiki/` directory automatically:

```
wiki/
├── requirements/    # Requirement definitions
├── prd/             # Product requirement documents
├── specs/           # Design documents (SDD)
├── tests/           # Test design
├── tdd/             # TDD cycle reports
├── deploy/          # Build/deploy reports
├── bugfix/          # Bug fix analysis
├── bugs/            # Bug tracker
├── mockups/         # UI mockups (HTML)
├── knowledge/       # Project knowledge base
└── views/           # Wiki Viewer (dashboard)
```

---

## Wiki Viewer

A Wiki Viewer is included to browse all pipeline artifacts in your browser. The **cycle-based view** lets you track the pipeline progress for each requirement (REQ) and bug (BUG) at a glance.

### Dashboard

Displays Dev Cycle and Bug Cycle cards in a grid. See the completion status of each cycle (5 required stages: PRD → SDD → Tests → TDD → Deploy) and a Mockup Gallery.

![Wiki Dashboard](docs/screenshot-wiki-dashboard.png?v=2)

### Traceability Matrix

Tracks each requirement from REQ through PRD → SDD → Tests → TDD → Deploy → Mockup → Bugfix in a matrix view.

![Traceability Matrix](docs/screenshot-wiki-trace.png?v=2)

### Cycle Detail & Document Viewer

Click a cycle in the sidebar to visualize pipeline stages and open each stage's document directly. Markdown is rendered and mockups (HTML) are embedded as iframes.

### How to Run

Start a local server from the `wiki/` directory of your workspace and open it in a browser.

```bash
# From workspace root
npx serve wiki -p 3000

# Open in browser
open http://localhost:3000/views/index.html
```

Or with Python:

```bash
python3 -m http.server 3000 -d wiki
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Installation

```bash
git clone https://github.com/draft-dhgo/claude-workbench.git
cd claude-workbench
npm install
```

### Development

```bash
# Compile TypeScript then start the app
npm run build:ts
npm start

# Development mode (NODE_ENV=development)
npm run dev

# Type check
npm run typecheck

# Tests
npm test
```

### Build (Packaging)

```bash
npm run build
```

Build output is placed in the `build/` directory. (macOS DMG, Windows NSIS, Linux AppImage)

---

## Project Structure

```
claude-workbench/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts        # App entry point
│   │   ├── window.ts       # Window configuration
│   │   ├── handlers/       # IPC handlers
│   │   ├── services/       # Business logic
│   │   └── constants/      # Constants
│   ├── preload/            # Context bridge (secure IPC)
│   ├── renderer/           # UI (HTML/CSS/JS)
│   │   ├── locales/        # i18n locale files (en.json, ko.json)
│   │   └── scripts/        # Renderer scripts
│   └── shared/types/       # Shared type definitions
├── assets/                 # App icons (PNG, ICNS, ICO)
├── __tests__/              # Jest tests
└── docs/                   # Documentation & screenshots
```

---

## Tech Stack

- **Runtime**: Electron 28
- **Language**: TypeScript 5.9
- **Testing**: Jest + ts-jest
- **Packaging**: electron-builder
- **Security**: Context Isolation + Preload Script

---

## License

MIT

---

---

## 저장소 관리

로컬 Git 저장소를 등록하고, 현재 브랜치를 확인하고, 검색으로 빠르게 찾을 수 있습니다.

![저장소 관리](docs/screenshot-main.png)

## 워크디렉토리 세트

여러 저장소를 하나의 세트로 묶어 관리합니다. 마이크로서비스처럼 여러 레포를 동시에 다루는 프로젝트에 유용합니다.

![워크디렉토리 세트](docs/screenshot-sets.png)

## 워크스페이스 생성

세트를 선택하면, 모든 저장소에 동일한 브랜치명으로 워크트리를 일괄 생성합니다. 진행 상태를 실시간으로 확인할 수 있습니다.

![워크스페이스 생성](docs/screenshot-workspace-create.png)

## 워크트리 관리

저장소별 워크트리 목록을 확인하고, push 상태에 따라 삭제 여부를 관리합니다. unpushed 브랜치 삭제 시 경고를 표시합니다.

![워크트리 관리](docs/screenshot-worktree-manage.png)

---

## Claude Code 커맨드

워크스페이스에서 Claude Code를 실행하면, 슬래시 커맨드로 스크럼 개발 파이프라인을 자동화할 수 있습니다.

```bash
cd ~/worktrees/feature-login-api
claude
```

| 커맨드 | 설명 | 사용법 |
|--------|------|--------|
| `/teams` | 팀 개발 파이프라인 실행 | 요구사항 → 설계 → 구현 → 배포 전체 흐름을 자동 진행 |
| `/add-req` | 신규 요구사항 등록 | wiki/requirements/에 새 요구사항을 추가 |
| `/add-bug` | 신규 버그 등록 | wiki/bugs/README.md에 버그를 등록 |
| `/bugfix-teams` | 버그 수정 파이프라인 실행 | 등록된 버그에 대한 분석 → 수정 → 테스트 흐름 자동 진행 |

```bash
# 요구사항 등록 후 파이프라인 실행
> /add-req
> "로그인 API에 JWT 토큰 기반 인증을 구현해야 한다"

> /teams
> "REQ-001 로그인 API를 구현해줘"

# 버그 등록 후 수정 파이프라인 실행
> /add-bug
> "로그인 시 refresh token이 갱신되지 않음"

> /bugfix-teams
> "BUG-001을 수정해줘"
```

파이프라인이 실행되면 각 단계의 산출물이 `wiki/` 디렉토리에 자동 저장됩니다:

```
wiki/
├── requirements/    # 요구사항 정의
├── prd/             # 제품 요구사항 문서
├── specs/           # 설계 문서 (SDD)
├── tests/           # 테스트 설계
├── tdd/             # TDD 사이클 리포트
├── deploy/          # 빌드/배포 리포트
├── bugfix/          # 버그 수정 분석
├── bugs/            # 버그 트래커
├── mockups/         # UI 목업 (HTML)
├── knowledge/       # 프로젝트 지식
└── views/           # Wiki Viewer (대시보드)
```

---

## Wiki Viewer

파이프라인이 생성한 산출물을 브라우저에서 한눈에 확인할 수 있는 Wiki Viewer가 함께 제공됩니다. **사이클 기반 뷰**로 구성되어 있어, 각 요구사항(REQ)과 버그(BUG)의 파이프라인 진행 상태를 한눈에 파악할 수 있습니다.

### 대시보드

Dev Cycle과 Bug Cycle 카드를 그리드로 보여줍니다. 각 사이클의 완료 상태(필수 5단계: PRD → SDD → Tests → TDD → Deploy)와 Mockup Gallery를 확인할 수 있습니다.

![Wiki Dashboard](docs/screenshot-wiki-dashboard.png?v=2)

### 추적성 매트릭스

요구사항(REQ)부터 PRD → SDD → Tests → TDD → Deploy → Mockup → Bugfix까지, 각 요구사항이 파이프라인의 어디까지 진행되었는지를 매트릭스로 추적합니다.

![Traceability Matrix](docs/screenshot-wiki-trace.png?v=2)

### 사이클 상세 & 문서 뷰어

사이드바에서 사이클을 클릭하면 파이프라인 단계를 시각화하고, 각 단계의 문서를 바로 열어볼 수 있습니다. 마크다운은 렌더링되고, 목업(HTML)은 iframe으로 임베드됩니다.

### 실행 방법

워크스페이스의 `wiki/` 디렉토리에서 로컬 서버를 실행하면 브라우저에서 바로 확인할 수 있습니다.

```bash
# 워크스페이스 루트에서
npx serve wiki -p 3000

# 브라우저에서 열기
open http://localhost:3000/views/index.html
```

또는 Python으로도 실행할 수 있습니다.

```bash
python3 -m http.server 3000 -d wiki
```

---

## 시작하기

### 사전 요구사항

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### 설치

```bash
git clone https://github.com/draft-dhgo/claude-workbench.git
cd claude-workbench
npm install
```

### 개발

```bash
# TypeScript 컴파일 후 앱 실행
npm run build:ts
npm start

# 개발 모드 (NODE_ENV=development)
npm run dev

# 타입 체크
npm run typecheck

# 테스트
npm test
```

### 빌드 (패키징)

```bash
npm run build
```

빌드 결과물은 `build/` 디렉토리에 생성됩니다. (macOS DMG, Windows NSIS, Linux AppImage)

---

## 프로젝트 구조

```
claude-workbench/
├── src/
│   ├── main/              # Electron 메인 프로세스
│   │   ├── index.ts        # 앱 진입점
│   │   ├── window.ts       # 윈도우 설정
│   │   ├── handlers/       # IPC 핸들러
│   │   ├── services/       # 비즈니스 로직
│   │   └── constants/      # 상수 정의
│   ├── preload/            # Context bridge (보안 IPC)
│   ├── renderer/           # UI (HTML/CSS/JS)
│   │   ├── locales/        # i18n 로케일 파일 (en.json, ko.json)
│   │   └── scripts/        # 렌더러 스크립트
│   └── shared/types/       # 공유 타입 정의
├── assets/                 # 앱 아이콘 (PNG, ICNS, ICO)
├── __tests__/              # Jest 테스트
└── docs/                   # 문서 및 스크린샷
```

---

## 기술 스택

- **런타임**: Electron 28
- **언어**: TypeScript 5.9
- **테스트**: Jest + ts-jest
- **패키징**: electron-builder
- **보안**: Context Isolation + Preload Script

---

## 라이선스

MIT
