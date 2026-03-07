import { execFile } from 'child_process';
import fs = require('fs');

/**
 * IPC 핸들러: terminal:open
 */
async function handleOpenTerminal(_event: any, data: { path: string } | null): Promise<{ success: boolean; error?: string }> {
  const dirPath = (data && data.path) ? data.path : null

  if (!dirPath) {
    return { success: false, error: '경로가 지정되지 않았습니다.' }
  }

  if (process.platform !== 'darwin') {
    return { success: false, error: '현재 macOS만 지원합니다.' }
  }

  if (!fs.existsSync(dirPath)) {
    return { success: false, error: `경로를 찾을 수 없습니다: ${dirPath}` }
  }

  return new Promise((resolve) => {
    execFile('open', ['-a', 'Terminal', dirPath], {}, (err) => {
      if (err) {
        resolve({ success: false, error: err.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}

export { handleOpenTerminal };
