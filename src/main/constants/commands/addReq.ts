// Command: add-req — Register new requirements (Korean)

export const CMD_ADD_REQ = `신규 요구사항을 등록합니다.

사용자 입력: $ARGUMENTS

$ARGUMENTS가 비어있으면 어떤 요구사항을 추가할지 질문하세요.

## 등록 절차

1. wiki/requirements/README.md 파일을 읽는다
   - 파일이 없으면 아래 헤더로 새로 생성한다:
     \`\`\`
     # Requirements

     | ID | 제목 | 상태 |
     |----|------|------|
     \`\`\`
2. 기존 항목 수를 세어 다음 순번의 REQ-ID를 결정한다 (REQ-001, REQ-002, ...)
3. README.md 테이블에 **제목만** 추가한다: \`| REQ-NNN | {제목} | [ ] |\`
4. \`wiki/requirements/REQ-NNN.md\` 상세 파일을 생성한다:
   \`\`\`markdown
   # REQ-{NNN}: {제목}

   > Date: {YYYY-MM-DD}
   > Status: [ ]

   ## 설명

   {사용자가 입력한 상세 설명}

   ## 주요 기능

   - {기능 1}

   ## 제약 사항

   - {있으면 기재}

   ## 관련 요구사항

   - {있으면 기재}
   \`\`\`
5. 등록 완료 메시지와 함께 부여된 ID를 출력한다

## 규칙

- 항상 [ ] (미완료) 상태로 등록한다
- README.md에는 제목만 기재하고, 상세 내용은 \`wiki/requirements/REQ-NNN.md\`에 작성한다
- 기존 파일 내용은 수정하지 않는다 (append-only)
- /teams 커맨드로 파이프라인을 실행할 수 있음을 안내한다
`
