<p align="center">
  <img src="assets/icon.png" alt="Claude Workbench" width="128" />
</p>

<h1 align="center">Claude Workbench</h1>

<p align="center">
  Claude Code 기반 개발 워크스테이션 &mdash; Git 워크트리 관리와 스크럼 개발 파이프라인을 하나의 데스크톱 앱으로.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## Screenshots

| 저장소 관리 | 워크디렉토리 세트 |
|:-:|:-:|
| ![Repos](docs/screenshot-main.png) | ![Sets](docs/screenshot-sets.png) |

| 워크스페이스 생성 | 워크트리 관리 |
|:-:|:-:|
| ![Create](docs/screenshot-workspace-create.png) | ![Worktree](docs/screenshot-worktree-manage.png) |

---

## Features

### Git 저장소 관리
- 로컬 Git 저장소 등록/삭제
- 저장소별 현재 브랜치 확인
- 검색을 통한 빠른 저장소 탐색

### 워크디렉토리 세트
- 여러 저장소를 하나의 세트로 그룹핑
- 세트 단위 생성/편집/삭제
- 페이지네이션 지원

### 워크스페이스 생성 (일괄 워크트리 클론)
- 세트 선택 → 베이스 브랜치 확인 → 새 브랜치명 입력 → 경로 선택
- 선택한 세트의 모든 저장소에 대해 워크트리를 일괄 생성
- 실시간 진행 상태 표시

### 워크스페이스 관리
- 생성된 워크스페이스 목록 조회
- 워크스페이스에서 터미널 열기
- Claude Code 설정 파일(`CLAUDE.md`, 스킬 등) 자동 재생성

### 워크트리 관리
- 저장소별 워크트리 목록 조회
- push 상태 확인 (pushed/unpushed 뱃지)
- 워크트리 개별 삭제 (unpushed 브랜치 경고 포함)

---

## Usage Guide

### 1. 워크스페이스 설정 흐름

```
저장소 등록 → 세트 구성 → 워크스페이스 생성 → 개발 시작
```

**Step 1: 저장소 등록**

`저장소 관리` 탭에서 `+ 저장소 추가` 버튼을 클릭하고, 로컬 Git 저장소 경로를 선택합니다.

**Step 2: 워크디렉토리 세트 구성**

`워크디렉토리 세트` 탭에서 함께 작업할 저장소들을 하나의 세트로 묶습니다.
예를 들어, 마이크로서비스 프로젝트라면 `api-server`, `web-frontend`, `shared-lib`을 하나의 세트로 구성합니다.

**Step 3: 워크스페이스 생성**

`워크스페이스 생성` 탭에서:
1. 세트를 선택
2. 각 저장소의 베이스 브랜치를 확인
3. 새 브랜치명 입력 (예: `feature/login-api`)
4. 워크트리 생성 경로 선택
5. `일괄 클론 실행` 클릭

모든 저장소에 동일한 브랜치명으로 워크트리가 일괄 생성됩니다.

**Step 4: 개발 시작**

`워크스페이스 관리` 탭에서 생성된 워크스페이스를 선택하고:
- `터미널 열기`로 해당 경로에서 바로 작업 시작
- `Claude 설정 재생성`으로 CLAUDE.md 및 스킬 설정을 자동 배치

### 2. 워크트리 정리

`워크트리 관리` 탭에서 저장소를 선택하면 해당 저장소의 모든 워크트리를 확인할 수 있습니다.
- **pushed** 뱃지: 원격에 push된 브랜치 (삭제 비활성화)
- **unpushed** 뱃지: 아직 push되지 않은 브랜치 (삭제 시 경고 표시)

---

## Claude Code Commands

Claude Workbench는 Claude Code의 스킬 시스템과 연동하여 스크럼 개발 파이프라인을 지원합니다.
워크스페이스 생성 후 `Claude 설정 재생성` 버튼을 누르면, 아래 커맨드들이 자동으로 워크스페이스에 설정됩니다.

각 커맨드는 Claude Code CLI에서 슬래시 커맨드로 실행합니다.

### 핵심 파이프라인 커맨드

| 커맨드 | 설명 | 사용법 |
|--------|------|--------|
| `/teams` | 팀 개발 파이프라인 실행 | 요구사항 → 설계 → 구현 → 배포 전체 흐름을 자동 진행 |
| `/add-req` | 신규 요구사항 등록 | wiki/requirements/에 새 요구사항을 추가 |
| `/add-bug` | 신규 버그 등록 | wiki/bugs/README.md에 버그를 등록 |
| `/bugfix-teams` | 버그 수정 파이프라인 실행 | 등록된 버그에 대한 분석 → 수정 → 테스트 흐름 자동 진행 |

### 사용 예시

```bash
# 1. Claude Code를 워크스페이스 경로에서 실행
cd ~/worktrees/feature-login-api
claude

# 2. 요구사항 등록
> /add-req
> "로그인 API에 JWT 토큰 기반 인증을 구현해야 한다"

# 3. 팀 개발 파이프라인 실행 (요구사항 → 설계 → TDD → 배포)
> /teams
> "REQ-001 로그인 API를 구현해줘"

# 4. 버그 발견 시 등록
> /add-bug
> "로그인 시 refresh token이 갱신되지 않음"

# 5. 버그 수정 파이프라인 실행
> /bugfix-teams
> "BUG-001을 수정해줘"
```

### 파이프라인 산출물

모든 커맨드의 산출물은 `wiki/` 디렉토리에 자동 저장됩니다:

```
wiki/
├── requirements/    # PRD, 요구사항 문서
├── specs/           # SDD, 설계 문서
├── tests/           # 테스트 설계 문서
├── bugs/            # 버그 리포트
├── knowledge/       # 프로젝트 지식 기록
└── views/           # HTML 뷰어
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

### Build (패키징)

```bash
# macOS (DMG)
npm run build

# 크로스 플랫폼 빌드는 electron-builder 설정 참조
```

빌드 결과물은 `build/` 디렉토리에 생성됩니다.

---

## Project Structure

```
claude-workbench/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts        # 앱 진입점
│   │   ├── window.ts       # 윈도우 설정
│   │   ├── handlers/       # IPC 핸들러
│   │   ├── services/       # 비즈니스 로직
│   │   └── constants/      # 상수 정의
│   ├── preload/            # Context bridge (보안 IPC)
│   │   └── index.ts
│   ├── renderer/           # UI (HTML/CSS/JS)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── scripts/
│   └── shared/types/       # 공유 타입 정의
├── assets/                 # 앱 아이콘 (PNG, ICNS, ICO)
├── __tests__/              # Jest 테스트
├── docs/                   # 문서 및 스크린샷
└── package.json
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
