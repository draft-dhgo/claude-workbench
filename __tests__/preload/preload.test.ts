/**
 * TC-003: preload.js contextBridge API 노출 검증
 *
 * preload.js는 모듈 최상위에서 contextBridge.exposeInMainWorld를 호출하므로
 * jest.mock()으로 먼저 모킹 설정 후 require해야 캡처된다.
 */

const exposedAPIs = {}

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn((name, api) => {
      exposedAPIs[name] = api
    })
  },
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    invoke: jest.fn()
  }
}))

require('../../src/preload/index')

const { ipcRenderer } = require('electron')

describe('TC-003: preload electronAPI 노출', () => {
  const exposedAPI = exposedAPIs['electronAPI']

  test('electronAPI가 노출된다', () => {
    expect(exposedAPI).toBeDefined()
  })

  test('send 메서드가 함수로 노출된다', () => {
    expect(typeof exposedAPI.send).toBe('function')
  })

  test('on 메서드가 함수로 노출된다', () => {
    expect(typeof exposedAPI.on).toBe('function')
  })

  test('invoke 메서드가 함수로 노출된다', () => {
    expect(typeof exposedAPI.invoke).toBe('function')
  })

  test('허용된 채널로 invoke 호출 시 ipcRenderer.invoke를 호출한다', async () => {
    ipcRenderer.invoke.mockResolvedValue('pong')
    await exposedAPI.invoke('app:ping')
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('app:ping', undefined)
  })

  test('허용되지 않은 채널로 invoke 호출 시 에러를 반환한다', async () => {
    await expect(exposedAPI.invoke('dangerous:channel')).rejects.toThrow(
      'Channel not allowed: dangerous:channel'
    )
  })
})

describe('TC-016: repo 채널이 allowlist에 포함', () => {
  const exposedAPI = exposedAPIs['electronAPI']
  const repoChannels = ['repo:add', 'repo:list', 'repo:remove', 'repo:validate']

  repoChannels.forEach(channel => {
    test(`${channel} 채널이 허용된다`, async () => {
      ipcRenderer.invoke.mockResolvedValue({ success: true })
      await exposedAPI.invoke(channel, {})
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(channel, {})
    })
  })
})
