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
  on: jest.fn(),
  getPath: jest.fn().mockReturnValue('/tmp/mock-user-data')
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

const mockDialog = {
  showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/test-path'] }),
  showSaveDialog: jest.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/test-file' })
}

MockBrowserWindow.getFocusedWindow = jest.fn().mockReturnValue(mockWin)

const mockWebContentsSend = jest.fn()
mockWin.webContents.send = mockWebContentsSend

module.exports = {
  app: mockApp,
  BrowserWindow: MockBrowserWindow,
  ipcMain: mockIpcMain,
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
  dialog: mockDialog,
  _mockWin: mockWin,
  _mockWebContentsSend: mockWebContentsSend
}
