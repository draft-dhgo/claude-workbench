/**
 * TC-AC-HTML: Renderer — Autocomplete HTML Structure (REQ-029)
 * Verifies that index.html uses <input> with autocomplete instead of <select>
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

describe('TC-AC-HTML: index.html — Command Autocomplete 구조 검증', () => {
  test('TC-AC-HTML-01: #cq-cmd-type이 <input> 요소이다', () => {
    const el = document.getElementById('cq-cmd-type')
    expect(el).not.toBeNull()
    expect(el!.tagName.toLowerCase()).toBe('input')
  })

  test('TC-AC-HTML-02: #cq-cmd-type의 type이 "text"이다', () => {
    const el = document.getElementById('cq-cmd-type') as HTMLInputElement
    expect(el).not.toBeNull()
    expect(el.type).toBe('text')
  })

  test('TC-AC-HTML-03: .cq-cmd-autocomplete 래퍼가 존재한다', () => {
    const el = document.querySelector('.cq-cmd-autocomplete')
    expect(el).not.toBeNull()
  })

  test('TC-AC-HTML-04: #cq-cmd-suggestions 컨테이너가 존재한다', () => {
    const el = document.getElementById('cq-cmd-suggestions')
    expect(el).not.toBeNull()
    expect(el!.classList.contains('cq-suggestions')).toBe(true)
  })

  test('TC-AC-HTML-05: <select id="cq-cmd-type">은 존재하지 않는다', () => {
    const el = document.querySelector('select#cq-cmd-type')
    expect(el).toBeNull()
  })
})
