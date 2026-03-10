/**
 * TC-AC-CSS: Renderer — Autocomplete CSS Styles (REQ-029)
 * Verifies that styles.css contains autocomplete-related CSS rules
 *
 * @jest-environment node
 */

import * as fs from 'fs'
import * as path from 'path'

const STYLES_CSS_PATH = path.resolve(__dirname, '../../src/renderer/styles.css')

let cssContent: string

beforeAll(() => {
  cssContent = fs.readFileSync(STYLES_CSS_PATH, 'utf-8')
})

describe('TC-AC-CSS: styles.css — Autocomplete 스타일 검증', () => {
  test('TC-AC-CSS-01: .cq-cmd-autocomplete CSS 규칙이 존재한다', () => {
    expect(cssContent).toMatch(/\.cq-cmd-autocomplete\s*\{/)
  })

  test('TC-AC-CSS-02: .cq-suggestions CSS 규칙이 존재한다', () => {
    expect(cssContent).toMatch(/\.cq-suggestions\s*\{/)
  })

  test('TC-AC-CSS-03: .cq-suggestions.open에 display: block 규칙이 있다', () => {
    expect(cssContent).toMatch(/\.cq-suggestions\.open\s*\{/)
    // Extract the .cq-suggestions.open block and check for display: block
    const openMatch = cssContent.match(/\.cq-suggestions\.open\s*\{([^}]*)\}/)
    expect(openMatch).not.toBeNull()
    expect(openMatch![1]).toMatch(/display\s*:\s*block/)
  })
})
