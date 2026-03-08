# 사이클 0021 — 빈 워크스페이스(repo 없이) 생성 아키텍처 지식

> 작성일: 2026-03-08 | REQ-019

---

## 1. JSON 기반 영속 저장소 패턴

프로젝트의 영속 데이터 저장소는 공통적으로 다음 패턴을 따른다.

| 항목 | 설명 |
|------|------|
| 위치 | `app.getPath('userData')` 하위 JSON 파일 |
| 초기화 | lazy-singleton (`_store` 변수를 `null`로 두고, getter에서 최초 접근 시 생성) |
| 구조 | `{ version: number, items: T[] }` 형태의 버전 관리 파일 포맷 |
| 직렬화 | `JSON.stringify(data, null, 2)` — 사람이 읽을 수 있는 pretty-print |
| 에러 처리 | `_load()`에서 파일 부재/파싱 오류 시 빈 배열 반환 (자동 복구) |

**기존 저장소**: `repoStore` → `repositories.json`, `workdirSetStore` → `workdirSets.json`
**신규 저장소**: `workspaceStore` → `workspaces.json`

세 저장소 모두 `crypto.randomUUID()`로 ID 생성, path 기준 중복 검사(`DUPLICATE_PATH` 에러)를 수행한다.

---

## 2. 다중 소스 데이터 병합 전략

`workspace:list` 핸들러는 두 개의 독립 데이터 소스를 하나의 목록으로 병합한다.

```
[워크트리 소스]  git worktree list --porcelain (각 repo별 실행)
       ↓ parseWorktreeList()
[빈 워크스페이스 소스]  workspaceStore.getAll()
       ↓
[병합]  path 기준 Set으로 중복 제거
       ↓
[출력]  WorkspaceEntry[] (type: 'worktree' | 'empty')
```

**핵심 규칙**:
- 워크트리가 먼저 순회되므로, 동일 path가 존재하면 워크트리 우선(빈 워크스페이스 레코드 무시)
- 메인 레포 경로(`candidate === repo.path`)는 워크스페이스 목록에서 제외
- 디스크에 존재하지 않는 워크트리(`!fs.existsSync`)도 제외

---

## 3. 빈 워크스페이스 생성 흐름

`workspace:create` 핸들러의 4단계 흐름:

1. **디렉토리 생성**: `fs.mkdirSync(dirPath, { recursive: true })`
2. **`.claude/` 폴더 생성**: 설정 디렉토리 준비
3. **`CLAUDE.md` 자동 생성**: `buildDefaultClaudeMd(name, lang)` 함수 재사용
4. **영속 저장소 등록**: `workspaceStore.create(name, dirPath)`

`buildDefaultClaudeMd()` 함수는 `src/main/constants/claudeConfigDefaults.ts`에 정의되어 있으며, 기존 claudeConfig 핸들러와 workspace 핸들러 양쪽에서 재사용된다.

---

## 4. 삭제 정책: 레코드만 삭제

빈 워크스페이스 삭제(`workspace:delete`)는 **디스크 디렉토리를 삭제하지 않고** WorkspaceStore 레코드만 제거한다. 이는 사용자 데이터 손실 방지를 위한 의도적 설계이다. 사용자가 디렉토리 자체를 삭제하려면 OS 파일 관리자를 통해 직접 수행해야 한다.

---

## 5. 타입 설계 — optional 필드를 통한 유연한 유니온

`WorkspaceEntry` 인터페이스는 TypeScript의 discriminated union이 아닌, `type` 필드 + optional 필드 조합으로 설계되었다.

- `type: 'worktree'`일 때: `id`, `createdAt`, `updatedAt`는 `undefined`
- `type: 'empty'`일 때: `id`, `createdAt`, `updatedAt`에 값 존재

이 접근은 단순하지만 타입 안전성이 약하다. 향후 워크스페이스 유형이 추가되면 discriminated union(`type`에 따라 별도 인터페이스)으로 전환을 고려할 수 있다.

---

## 6. IPC 채널 네이밍 컨벤션

기존 패턴과 동일하게 `리소스:동작` 형식을 따른다:

| 채널 | 동작 |
|------|------|
| `workspace:list` | 조회 (기존 확장) |
| `workspace:create` | 생성 |
| `workspace:update` | 수정 (이름 변경) |
| `workspace:delete` | 삭제 |

모든 핸들러는 `{ success: boolean, error?: string, ...data }` 형태의 일관된 응답 구조를 반환한다.

---

## 7. 테스트 전략

- WorkspaceStore 단위 테스트: 파일 I/O 직접 테스트 (실제 임시 디렉토리 사용)
- 핸들러 테스트: `_resetStores()` 함수를 export하여 테스트 간 싱글턴 상태 초기화
- 총 28개 신규 테스트 추가, 기존 240개 테스트와 합쳐 전체 268개 통과
