/**
 * TDD Tests for SDD-0001: Hosting Button CSS Classes
 * Verifies .hosting-btn, .hosting-btn-stopped, .hosting-btn-running,
 * .hosting-btn-pending, .hosting-btn-wrapper CSS classes are present in styles.css
 *
 * Category: UI / Structural
 */

import * as fs from 'fs'
import * as path from 'path'

const STYLES_CSS_PATH = path.resolve(__dirname, '../../src/renderer/styles.css')

let cssContent: string

beforeAll(() => {
  cssContent = fs.readFileSync(STYLES_CSS_PATH, 'utf-8')
})

describe('SDD-0001: styles.css — hosting button CSS classes', () => {
  test('.hosting-btn-wrapper 클래스가 존재한다', () => {
    expect(cssContent).toContain('.hosting-btn-wrapper')
  })

  test('.hosting-btn 클래스가 존재한다', () => {
    expect(cssContent).toContain('.hosting-btn {')
  })

  test('.hosting-btn-stopped 클래스가 존재한다', () => {
    expect(cssContent).toContain('.hosting-btn-stopped')
  })

  test('.hosting-btn-running 클래스가 존재한다', () => {
    expect(cssContent).toContain('.hosting-btn-running')
  })

  test('.hosting-btn-pending 클래스가 존재한다', () => {
    expect(cssContent).toContain('.hosting-btn-pending')
  })

  test('.hosting-btn에 min-width 속성이 정의된다', () => {
    expect(cssContent).toContain('min-width')
  })

  test('.hosting-btn-pending에 cursor: not-allowed 속성이 정의된다', () => {
    expect(cssContent).toContain('not-allowed')
  })
})
