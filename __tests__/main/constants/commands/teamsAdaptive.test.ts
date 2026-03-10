import { CMD_TEAMS } from '../../../../src/main/constants/commands/teams'
import { CMD_TEAMS_EN } from '../../../../src/main/constants/commands/teamsEn'

describe('Adaptive Pipeline — CMD_TEAMS', () => {
  test('TC-01: contains Small/Medium/Large mode keywords', () => {
    expect(CMD_TEAMS).toContain('Small')
    expect(CMD_TEAMS).toContain('Medium')
    expect(CMD_TEAMS).toContain('Large')
  })

  test('TC-02: contains mode execution matrix with inline and subagent', () => {
    expect(CMD_TEAMS).toContain('메인 직접')
    expect(CMD_TEAMS).toContain('서브에이전트')
    // Step 1 should always be inline
    expect(CMD_TEAMS).toMatch(/Step\s*1.*메인\s*직접|req-manage.*메인.*직접/s)
  })

  test('TC-04: Step 1 is always inline (no subagent for req-manage)', () => {
    // The prompt should state Step 1 is always main-direct
    expect(CMD_TEAMS).toMatch(/Step\s*1.*메인|req-manage.*항상.*메인|Step 1.*인라인/s)
  })
})

describe('Adaptive Pipeline — CMD_TEAMS_EN', () => {
  test('TC-03: contains Small/Medium/Large mode keywords in English', () => {
    expect(CMD_TEAMS_EN).toContain('Small')
    expect(CMD_TEAMS_EN).toContain('Medium')
    expect(CMD_TEAMS_EN).toContain('Large')
  })

  test('TC-03: contains Pipeline Mode text', () => {
    expect(CMD_TEAMS_EN).toMatch(/Pipeline Mode|pipeline mode/i)
  })

  test('TC-03: contains main direct / sub-agent keywords', () => {
    expect(CMD_TEAMS_EN).toMatch(/main.*direct|inline/i)
    expect(CMD_TEAMS_EN).toMatch(/sub-agent|subagent/i)
  })
})
