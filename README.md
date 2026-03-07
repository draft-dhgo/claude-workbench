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

> 앱을 실행한 뒤 `docs/` 폴더에 스크린샷을 추가하세요.
>
> `docs/screenshot-mock.html`을 브라우저에서 열면 UI 미리보기를 확인할 수 있습니다.

<!-- 스크린샷 추가 시 아래 주석을 해제하세요
![Main Screen](docs/screenshot-main.png)
-->

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
- Claude Code 설정 파일 자동 재생성

### 워크트리 관리
- 저장소별 워크트리 목록 조회
- push 상태 확인 (pushed/unpushed 뱃지)
- 워크트리 개별 삭제 (unpushed 브랜치 경고 포함)

### 스크럼 개발 파이프라인 (Claude Code 스킬)
| 단계 | 스킬 | 설명 |
|------|------|------|
| 1 | `req-manage` | 요구사항 정의 및 PRD 작성 |
| 2 | `dev-design` | 개발 설계 문서(SDD) 작성 |
| 3 | `ui-mockup` | SDD 기반 HTML 목업 생성 |
| 4 | `test-design` | 테스트 설계 문서 작성 |
| 5 | `tdd-cycle` | Red-Green-Refactor TDD 구현 |
| 6 | `deploy` | 빌드 및 로컬 배포 |
| 7 | `bugfix` | 버그 원인 분석 및 수정 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Installation

```bash
git clone https://github.com/<your-username>/claude-workbench.git
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
