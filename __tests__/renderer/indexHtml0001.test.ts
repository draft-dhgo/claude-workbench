/**
 * TC-32: Renderer — index.html Has No wh-global-section
 * Source: SDD-0001, Test Design-0001
 * Category: UI / Structural
 *
 * @jest-environment jsdom
 */

import * as fs from 'fs'
import * as path from 'path'

const INDEX_HTML_PATH = path.resolve(__dirname, '../../src/renderer/index.html')

let htmlContent: string

beforeAll(() => {
  htmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf-8')
  document.documentElement.innerHTML = htmlContent
})

describe('TC-32: index.html — wh-global-section 제거 확인', () => {
  test('wh-global-section 엘리먼트가 존재하지 않는다', () => {
    const el = document.querySelector('#wh-global-section')
    expect(el).toBeNull()
  })

  test('wh-global-stop-btn 엘리먼트가 존재하지 않는다', () => {
    const el = document.querySelector('#wh-global-stop-btn')
    expect(el).toBeNull()
  })

  test('wh-global-indicator 엘리먼트가 존재하지 않는다', () => {
    const el = document.querySelector('#wh-global-indicator')
    expect(el).toBeNull()
  })

  test('wh-global-url 엘리먼트가 존재하지 않는다', () => {
    const el = document.querySelector('#wh-global-url')
    expect(el).toBeNull()
  })

  test('hostingButton.js 스크립트 태그가 포함된다', () => {
    const scripts = document.querySelectorAll('script[src]')
    const hostingScript = Array.from(scripts).find(s =>
      (s as HTMLScriptElement).src.includes('hostingButton.js')
    )
    expect(hostingScript).not.toBeUndefined()
  })
})
