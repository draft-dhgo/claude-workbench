import path = require('path');

/**
 * BrowserWindow 생성 옵션 반환
 * 테스트 가능하도록 순수 함수로 분리
 */
function getWindowOptions() {
  return {
    title: 'Claude Workbench',
    width: 800,
    height: 600,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

/**
 * window-all-closed 이벤트 핸들러 로직
 */
function handleWindowAllClosed(app: { quit: () => void }) {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}

/**
 * IPC 핸들러: app:ping
 */
async function handlePing(): Promise<string> {
  return 'pong'
}

/**
 * IPC 핸들러: app:version
 */
async function handleVersion(): Promise<string> {
  const pkg = require('../../package.json')
  return pkg.version
}

export { getWindowOptions, handleWindowAllClosed, handlePing, handleVersion };
