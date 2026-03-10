// Command: teams — Dev cycle pipeline (Korean)

export const CMD_TEAMS = `팀 개발 파이프라인을 실행합니다.

사용자 입력: $ARGUMENTS

## 실행 대상 선택

1. $ARGUMENTS에 REQ-ID (예: REQ-001)가 있으면 해당 요구사항을 선택한다
2. $ARGUMENTS가 비어있으면 wiki/requirements/README.md에서 첫 번째 [ ] 항목을 자동 선택한다
3. 미완료 항목이 없거나 파일이 없으면: "/add-req 커맨드로 요구사항을 먼저 추가하세요."를 출력하고 종료한다

선택된 항목의 REQ-ID와 제목을 출력한다.

## 사전 준비

- wiki/ 하위 디렉토리(prd, specs, tests, tdd, deploy, mockups, views, knowledge)가 없으면 생성한다
- 각 카테고리의 기존 파일을 확인하여 다음 순번(NNNN)을 결정한다

## 실행 원칙

### Step 1 인라인화
Step 1(req-manage)은 항상 메인 에이전트가 직접 실행한다. PRD 작성은 파일 읽기 + 문서 작성으로 가볍기 때문에 서브에이전트가 불필요하다.

### 모드 판단 — 적응형 파이프라인 (Adaptive Pipeline)

Step 1 완료 후 PRD 내용을 읽어 작업 규모를 판단한다. 영향 파일 수, 새 모듈 수, UI 존재 여부를 기준으로 Small/Medium/Large를 분류한다.

| 기준 | Small | Medium | Large |
|------|-------|--------|-------|
| 파일 변경 수 | ≤3 | 4~10 | >10 |
| 새 모듈 수 | 0 | 1~2 | ≥3 |
| UI 포함 | 없음 | 무관 | 있으면 자동 Large |

여러 기준 중 하나라도 상위 모드에 해당하면 상위 모드를 적용한다.
판단이 어려우면 Medium을 기본 적용한다.

모드 결정 후 출력한다: \`[Pipeline Mode: {Small|Medium|Large}] 서브에이전트 {N}개\`

### 서브에이전트 사용 규칙

서브에이전트 호출 시:
- 1~2줄 프롬프트: 스킬 이름 + 파일 경로 + 출력 번호(NNNN)만 전달한다
- 파일 내용, 배경 설명, 워크플로 지시를 절대 포함하지 않는다
- 메인 에이전트는 오케스트레이터 역할만 하며, 완료 후 산출물 존재 여부만 검증한다

메인 직접 실행 시:
- 해당 스킬의 워크플로를 메인 에이전트가 직접 수행한다

## 파이프라인 (4단계) — 모드별 실행

각 단계는 순서대로 실행하며, 검증 통과 후에만 다음 단계로 진행한다.

### 모드별 실행 매트릭스

| Step | 스킬 | Small | Medium | Large |
|------|------|-------|--------|-------|
| 1 | /req-manage | 메인 직접 | 메인 직접 | 메인 직접 |
| 2 | /dev-impl | 메인 직접 | 메인 직접 | 서브에이전트 |
| 3 | /test-impl | 메인 직접 | 서브에이전트 | 서브에이전트 |
| 4 | /finalize | 메인 직접 | 메인 직접 | 서브에이전트 |

### 검증 기준 (모든 모드 동일)

| Step | 검증 |
|------|------|
| 1 | wiki/prd/{NNNN}.md 존재 (>100B) + wiki/requirements/REQ-NNN.md 존재 |
| 2 | wiki/specs/{NNNN}.md 존재 (>100B). UI 기능이면 wiki/mockups/ 하위 HTML도 존재 |
| 3 | wiki/tests/{NNNN}.md + wiki/tdd/{NNNN}.md 존재 (>100B) + 테스트 통과 |
| 4 | wiki/deploy/{NNNN}.md 존재 (>100B) + wiki/views/index.html 존재 |

### 검증 실패 시

실행 방식(메인 직접/서브에이전트)에 관계없이 재실행한다.

## 완료 처리

1. wiki/requirements/README.md에서 해당 항목의 상태를 [ ] → [x]로 갱신한다
2. 각 단계별 산출물 경로와 검증 결과(PASS/FAIL)를 출력한다

## 실행 규칙

- 모든 문서 산출물은 \`wiki/\` 하위에만 작성한다
- wiki/ 내 기존 파일은 수정하지 않는다 (append-only, 상태 갱신은 예외)
`
