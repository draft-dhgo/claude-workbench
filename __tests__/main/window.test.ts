/**
 * TC-004, TC-005: IPC 핸들러 로직 테스트
 */
const { handlePing, handleVersion } = require('../../src/main/window')

describe('TC-004: app:ping IPC 핸들러', () => {
  test('pong 문자열을 반환한다', async () => {
    const result = await handlePing()
    expect(result).toBe('pong')
  })
})

describe('TC-005: app:version IPC 핸들러', () => {
  test('package.json의 version을 반환한다', async () => {
    const pkg = require('../../package.json')
    const result = await handleVersion()
    expect(result).toBe(pkg.version)
  })

  test('반환값이 문자열이다', async () => {
    const result = await handleVersion()
    expect(typeof result).toBe('string')
  })

  test('반환값이 semver 형식이다 (x.y.z)', async () => {
    const result = await handleVersion()
    expect(result).toMatch(/^\d+\.\d+\.\d+/)
  })
})
