/**
 * TC-MERGE: Renderer — Command Input Merge (REQ-031)
 * Verifies that command and args inputs are merged into a single input
 *
 * @jest-environment jsdom
 */

import * as fs from 'fs'
import * as path from 'path'

const INDEX_HTML_PATH = path.resolve(__dirname, '../../src/renderer/index.html')
const JS_PATH = path.resolve(__dirname, '../../src/renderer/scripts/commandQueueRenderer.js')
const CSS_PATH = path.resolve(__dirname, '../../src/renderer/styles.css')

let htmlContent: string
let jsContent: string
let cssContent: string

beforeAll(() => {
  htmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf-8')
  jsContent = fs.readFileSync(JS_PATH, 'utf-8')
  cssContent = fs.readFileSync(CSS_PATH, 'utf-8')
  document.documentElement.innerHTML = htmlContent
})

describe('TC-MERGE-HTML: HTML 구조 검증', () => {
  test('TC-MERGE-HTML-01: #cq-cmd-type input이 존재한다', () => {
    const el = document.getElementById('cq-cmd-type')
    expect(el).not.toBeNull()
    expect(el!.tagName.toLowerCase()).toBe('input')
  })

  test('TC-MERGE-HTML-02: #cq-cmd-args input이 존재하지 않는다', () => {
    const el = document.getElementById('cq-cmd-args')
    expect(el).toBeNull()
  })

  test('TC-MERGE-HTML-03: .cq-cmd-autocomplete 래퍼가 존재한다', () => {
    const el = document.querySelector('.cq-cmd-autocomplete')
    expect(el).not.toBeNull()
  })
})

describe('TC-MERGE-JS: JS 로직 검증', () => {
  test('TC-MERGE-JS-01: parseCommandInput 함수가 정의되어 있다', () => {
    expect(jsContent).toMatch(/function\s+parseCommandInput\s*\(/)
  })

  test('TC-MERGE-JS-02: getFirstToken 함수가 정의되어 있다', () => {
    expect(jsContent).toMatch(/function\s+getFirstToken\s*\(/)
  })

  test('TC-MERGE-JS-03: isCommandConfirmed 함수가 정의되어 있다', () => {
    expect(jsContent).toMatch(/function\s+isCommandConfirmed\s*\(/)
  })

  test('TC-MERGE-JS-04: cmdArgsInput 참조가 없다', () => {
    expect(jsContent).not.toContain('cmdArgsInput')
  })

  test('TC-MERGE-JS-05: selectCommand에서 커서를 입력란에 유지한다', () => {
    expect(jsContent).toContain('cmdTypeInput.focus()')
  })

  test('TC-MERGE-JS-06: VALID_COMMANDS가 ALL_COMMANDS를 참조한다', () => {
    expect(jsContent).toMatch(/VALID_COMMANDS\s*=\s*ALL_COMMANDS/)
  })
})

describe('TC-MERGE-CSS: CSS 검증', () => {
  test('TC-MERGE-CSS-01: .cq-cmd-autocomplete에 flex: 1이 설정되어 있다', () => {
    // Extract the .cq-cmd-autocomplete rule
    const match = cssContent.match(/\.cq-cmd-autocomplete\s*\{[^}]*\}/)
    expect(match).not.toBeNull()
    expect(match![0]).toMatch(/flex:\s*1/)
  })

  test('TC-MERGE-CSS-02: .cq-cmd-args 규칙이 없다', () => {
    expect(cssContent).not.toMatch(/\.cq-cmd-args\s*\{/)
  })
})
