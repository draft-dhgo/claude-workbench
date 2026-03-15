import { app } from 'electron';
import { execFile } from 'child_process';
import SettingsStore = require('../services/settingsStore');

let _store: SettingsStore | null = null;

function getStore(): SettingsStore {
  if (!_store) _store = new SettingsStore(app.getPath('userData'));
  return _store;
}

async function handleSettingsGet(): Promise<{ success: boolean; settings?: any; error?: string }> {
  try {
    return { success: true, settings: getStore().get() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleSettingsUpdate(_event: any, data: any): Promise<{ success: boolean; settings?: any; error?: string }> {
  try {
    const settings = getStore().update(data);
    return { success: true, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleDockerCheck(): Promise<{ success: boolean; available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    execFile('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve({ success: true, available: false, error: err.message });
      } else {
        resolve({ success: true, available: true, version: (stdout || '').toString().trim() });
      }
    });
  });
}

function _resetStore(): void {
  _store = null;
}

export {
  handleSettingsGet,
  handleSettingsUpdate,
  handleDockerCheck,
  _resetStore,
};
