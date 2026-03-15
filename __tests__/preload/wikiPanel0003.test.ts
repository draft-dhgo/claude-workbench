// TC-WP-TYPE-01 ~ TC-WP-REND-01: Static file checks for SDD-0003 wiki panel additions

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

describe('TC-WP-TYPE-01: ipc.ts — InvokeChannel에 wiki-panel:open 포함', () => {
  it("ipc.ts에 'wiki-panel:open' 채널이 정의되어 있다", () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/shared/types/ipc.ts'), 'utf8')
    expect(content).toContain("'wiki-panel:open'")
  })
})

describe("TC-WP-TYPE-02: ipc.ts — InvokeChannel에 wiki-panel:close 포함", () => {
  it("ipc.ts에 'wiki-panel:close' 채널이 정의되어 있다", () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/shared/types/ipc.ts'), 'utf8')
    expect(content).toContain("'wiki-panel:close'")
  })
})

describe('TC-WP-TYPE-03: models.ts — WikiPanelStatus 인터페이스 존재', () => {
  it('models.ts에 WikiPanelStatus 인터페이스가 존재한다', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/shared/types/models.ts'), 'utf8')
    expect(content).toContain('WikiPanelStatus')
  })

  it('WikiPanelStatus에 visible 필드가 있다', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/shared/types/models.ts'), 'utf8')
    expect(content).toMatch(/WikiPanelStatus[\s\S]*?visible\s*:\s*boolean/)
  })

  it('WikiPanelStatus에 url 옵셔널 필드가 있다', () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/shared/types/models.ts'), 'utf8')
    // Should have url? or url after WikiPanelStatus definition
    expect(content).toMatch(/WikiPanelStatus[\s\S]{0,200}url\?/)
  })
})

describe('TC-WP-PRE-01: preload/index.ts — ALLOWED_INVOKE_CHANNELS에 wiki-panel:open 포함', () => {
  it("preload/index.ts에 'wiki-panel:open' 채널이 포함되어 있다", () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/preload/index.ts'), 'utf8')
    expect(content).toContain("'wiki-panel:open'")
  })
})

describe('TC-WP-PRE-02: preload/index.ts — ALLOWED_INVOKE_CHANNELS에 wiki-panel:close 포함', () => {
  it("preload/index.ts에 'wiki-panel:close' 채널이 포함되어 있다", () => {
    const content = fs.readFileSync(path.join(ROOT, 'src/preload/index.ts'), 'utf8')
    expect(content).toContain("'wiki-panel:close'")
  })
})

describe('TC-WP-REND-01: hostingButton.js — Start 성공 후 wiki-panel:open invoke 호출', () => {
  it("hostingButton.js에 'wiki-panel:open' invoke 패턴이 존재한다", () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'src/renderer/scripts/hostingButton.js'),
      'utf8'
    )
    expect(content).toContain('wiki-panel:open')
  })
})
