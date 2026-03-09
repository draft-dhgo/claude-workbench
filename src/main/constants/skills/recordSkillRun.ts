// Skill: record-skill-run — Skill execution logging

export const SKILL_RECORD_SKILL_RUN = `# Skill: record-skill-run

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

export const SKILL_RECORD_SKILL_RUN_EN = SKILL_RECORD_SKILL_RUN  // Already in English
