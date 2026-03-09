import WikiHostService = require('../services/wikiHostService');
import path = require('path');
import { shell } from 'electron';
import { WikiHostStatus } from '../../shared/types/models';

let _service: WikiHostService | null = null;

function getService(): WikiHostService {
  if (!_service) {
    _service = new WikiHostService();
  }
  return _service;
}

async function handleWikiHostStart(
  _event: any,
  data: { workspacePath?: string }
): Promise<{ success: boolean; url?: string; port?: number; error?: string }> {
  let workspacePath = data?.workspacePath;

  // workspacePath 미전달 시 활성 워크스페이스 경로 사용
  if (!workspacePath) {
    const { getManagerService } = require('./workspaceManagerHandlers');
    workspacePath = getManagerService().getActiveWorkspacePath() ?? undefined;
  }

  if (!workspacePath) {
    return { success: false, error: 'WORKSPACE_PATH_REQUIRED' };
  }

  const viewsPath = path.join(workspacePath, 'wiki', 'views');

  try {
    const result = await getService().start(viewsPath);
    return { success: true, url: result.url, port: result.port };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleWikiHostStop(
  _event: any
): Promise<{ success: boolean; error?: string }> {
  try {
    await getService().stop();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleWikiHostStatus(
  _event: any
): Promise<WikiHostStatus> {
  return getService().getStatus();
}

async function handleWikiHostOpenBrowser(
  _event: any
): Promise<{ success: boolean; error?: string }> {
  const status = getService().getStatus();
  if (!status.running || !status.url) {
    return { success: false, error: 'SERVER_NOT_RUNNING' };
  }

  try {
    await shell.openExternal(status.url);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function cleanupWikiHost(): Promise<void> {
  if (_service) {
    await _service.cleanup();
  }
}

function _resetService(): void {
  if (_service) {
    _service._reset();
  }
  _service = null;
}

export {
  handleWikiHostStart,
  handleWikiHostStop,
  handleWikiHostStatus,
  handleWikiHostOpenBrowser,
  cleanupWikiHost,
  _resetService,
  getService as getWikiHostServiceInstance
};
