// Command: add-bug — Register new bugs (Korean)

export const CMD_ADD_BUG = `신규 버그를 wiki/bugs/README.md에 등록합니다.

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
