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

## Git 저장소 관리

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

## Claude Code Commands

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

파이프라인이 생성한 산출물을 브라우저에서 한눈에 확인할 수 있는 Wiki Viewer가 함께 제공됩니다.

### Dashboard

카테고리별 문서 수 통계와 최근 문서 목록을 보여줍니다. 각 카테고리를 클릭하면 해당 문서로 바로 이동합니다.

![Wiki Dashboard](docs/screenshot-wiki-dashboard.png)

### Traceability Matrix

요구사항(REQ)부터 PRD → SDD → Tests → TDD → Deploy → Mockup → Bugfix까지, 각 요구사항이 파이프라인의 어디까지 진행되었는지를 매트릭스로 추적합니다. 완료율을 한눈에 파악할 수 있습니다.

![Traceability Matrix](docs/screenshot-wiki-trace.png)

### Document Viewer

사이드바에서 카테고리와 문서를 선택하면 마크다운이 렌더링됩니다. 목업(HTML)은 iframe으로 임베드하여 바로 확인할 수 있습니다.

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
npm run build
```

빌드 결과물은 `build/` 디렉토리에 생성됩니다. (macOS DMG, Windows NSIS, Linux AppImage)

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
│   ├── renderer/           # UI (HTML/CSS/JS)
│   └── shared/types/       # 공유 타입 정의
├── assets/                 # 앱 아이콘 (PNG, ICNS, ICO)
├── __tests__/              # Jest 테스트
└── docs/                   # 문서 및 스크린샷
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
