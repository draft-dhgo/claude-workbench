/**
 * TC-AC-JS: Renderer — Autocomplete JS Logic (REQ-029)
 * Verifies that commandQueueRenderer.js contains autocomplete logic
 *
 * @jest-environment node
 */

import * as fs from 'fs'
import * as path from 'path'

const JS_PATH = path.resolve(__dirname, '../../src/renderer/scripts/commandQueueRenderer.js')

let jsContent: string

beforeAll(() => {
  jsContent = fs.readFileSync(JS_PATH, 'utf-8')
})

describe('TC-AC-JS: commandQueueRenderer.js — Autocomplete 로직 검증', () => {
  test('TC-AC-JS-01: ALL_COMMANDS 배열에 7개 커맨드가 모두 포함된다', () => {
    const expectedCommands = [
      '/add-req', '/bugfix', '/teams', '/bugfix-teams',
      '/merge', '/update-readme', '/pull'
    ]
    for (const cmd of expectedCommands) {
      expect(jsContent).toContain(`'${cmd}'`)
    }
    // Verify the array declaration exists
    expect(jsContent).toMatch(/ALL_COMMANDS\s*=\s*\[/)
  })

  test('TC-AC-JS-02: fuzzyMatch 함수가 정의되어 있다', () => {
    expect(jsContent).toMatch(/function\s+fuzzyMatch\s*\(/)
  })

  test('TC-AC-JS-03: showSuggestions 함수가 정의되어 있다', () => {
    expect(jsContent).toMatch(/function\s+showSuggestions\s*\(/)
  })
})
