const mockWebContents = {
  openDevTools: jest.fn()
}

const mockWin = {
  loadFile: jest.fn(),
  webContents: mockWebContents
}

const MockBrowserWindow = jest.fn().mockImplementation(() => mockWin)
MockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([])

const mockApp = {
  quit: jest.fn(),
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn()
}

const mockIpcMain = {
  handle: jest.fn()
}

const mockContextBridge = {
  exposeInMainWorld: jest.fn()
}

const mockIpcRenderer = {
  send: jest.fn(),
  on: jest.fn(),
  invoke: jest.fn()
}

module.exports = {
  app: mockApp,
  BrowserWindow: MockBrowserWindow,
  ipcMain: mockIpcMain,
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
  _mockWin: mockWin
}
