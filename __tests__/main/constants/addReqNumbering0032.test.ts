/**
 * TC-NB: add-req Numbering Bug Fix (REQ-030)
 * Verifies that addReq.ts and addReqEn.ts use last REQ-ID parsing instead of counting
 *
 * @jest-environment node
 */

import { CMD_ADD_REQ } from '../../../src/main/constants/commands/addReq'
import { CMD_ADD_REQ_EN } from '../../../src/main/constants/commands/addReqEn'

describe('TC-NB-KO: addReq.ts — 한국어 프롬프트 검증', () => {
  test('TC-NB-KO-01: "마지막 REQ-ID" 문구가 포함된다', () => {
    expect(CMD_ADD_REQ).toMatch(/마지막 REQ-ID/)
  })

  test('TC-NB-KO-02: "항목 수를 세어" 문구가 포함되지 않는다', () => {
    expect(CMD_ADD_REQ).not.toMatch(/항목 수를 세어/)
  })

  test('TC-NB-KO-03: 규칙 섹션에 "cwd" 문구가 포함된다', () => {
    expect(CMD_ADD_REQ).toMatch(/cwd/)
  })
})

describe('TC-NB-EN: addReqEn.ts — 영어 프롬프트 검증', () => {
  test('TC-NB-EN-01: "last REQ-ID" 문구가 포함된다', () => {
    expect(CMD_ADD_REQ_EN).toMatch(/last REQ-ID/i)
  })

  test('TC-NB-EN-02: "count the items" 패턴이 포함되지 않는다', () => {
    expect(CMD_ADD_REQ_EN).not.toMatch(/count\s+(the\s+)?items/i)
  })

  test('TC-NB-EN-03: 규칙 섹션에 "cwd" 문구가 포함된다', () => {
    expect(CMD_ADD_REQ_EN).toMatch(/cwd/)
  })
})

describe('TC-NB-SYNC: 양 언어 동기화 검증', () => {
  test('TC-NB-SYNC-01: 양 파일 모두 NNN+1 순번 결정 로직을 명시한다', () => {
    expect(CMD_ADD_REQ).toMatch(/NNN\s*\+\s*1/)
    expect(CMD_ADD_REQ_EN).toMatch(/NNN\s*\+\s*1/)
  })
})
