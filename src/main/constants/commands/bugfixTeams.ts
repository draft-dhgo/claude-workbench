// Command: bugfix-teams — Bug fix pipeline (Korean)

export const CMD_BUGFIX_TEAMS = `버그 수정 파이프라인을 실행합니다.

사용자 입력: $ARGUMENTS

## 실행 대상 선택

1. $ARGUMENTS에 BUG-ID (예: BUG-001)가 있으면 해당 버그를 선택한다
2. $ARGUMENTS가 비어있으면 wiki/bugs/README.md에서 첫 번째 [ ] 항목을 자동 선택한다
3. 미완료 항목이 없거나 파일이 없으면: "/add-bug 커맨드로 버그를 먼저 추가하세요."를 출력하고 종료한다

선택된 항목의 BUG-ID와 설명을 출력한다.

## 사전 준비

- wiki/ 하위 디렉토리(bugfix, specs, tests, tdd, deploy, views, knowledge)가 없으면 생성한다
- 각 카테고리의 기존 파일을 확인하여 다음 순번(NNNN)을 결정한다

## 서브에이전트 원칙 — 최소 컨텍스트 전달

> **핵심**: 서브에이전트에게는 **스킬 이름 + 파일 경로**만 전달한다.
> 파일 내용을 읽어서 프롬프트에 복사하지 않는다. 서브에이전트가 스킬 워크플로에 따라 직접 파일을 읽는다.
> 메인 에이전트는 오케스트레이터 역할만 하며, 서브에이전트 완료 후 산출물 존재 여부만 검증한다.

서브에이전트 프롬프트 작성 규칙:
- 1~2줄로 작성한다. 스킬 이름, 입력 파일 경로, 출력 파일 번호(NNNN)만 포함한다
- 예시: \`"/bugfix 실행. BUG-ID: BUG-001. 출력 번호: 0005"\`
- 예시: \`"/dev-design 실행. 입력: wiki/bugfix/0005.md. 출력 번호: 0005"\`
- 파일 내용, 배경 설명, 워크플로 지시를 절대 포함하지 않는다

## 파이프라인 (4단계)

각 단계는 순서대로 실행하며, 검증 통과 후에만 다음 단계로 진행한다.

| Step | 스킬 | 서브에이전트에 전달할 것 | 검증 |
|------|------|------------------------|------|
| 1 | /bugfix | BUG-ID, 출력 번호 NNNN | wiki/bugfix/{NNNN}.md 존재 (>100B) |
| 2 | /dev-impl | wiki/bugfix/{NNNN}.md 경로, 출력 번호 | wiki/specs/{NNNN}.md 존재 (>100B) |
| 3 | /test-impl | wiki/specs/{NNNN}.md 경로, 출력 번호 | wiki/tests/{NNNN}.md + wiki/tdd/{NNNN}.md 존재 (>100B) + 테스트 통과 |
| 4 | /finalize | 출력 번호 NNNN | wiki/deploy/{NNNN}.md 존재 (>100B) + wiki/views/index.html 존재 |

### 검증 실패 시

서브에이전트를 재호출한다. 재호출 프롬프트에도 경로만 전달한다.

## 완료 처리

1. wiki/bugs/README.md에서 해당 항목의 상태를 [ ] → [x]로 갱신한다
2. 각 단계별 산출물 경로와 검증 결과(PASS/FAIL)를 출력한다

## 실행 규칙

- 모든 문서 산출물은 \`wiki/\` 하위에만 작성한다
- wiki/ 내 기존 파일은 수정하지 않는다 (append-only, 상태 갱신은 예외)
`
