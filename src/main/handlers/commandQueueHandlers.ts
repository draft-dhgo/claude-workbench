import CommandQueueService = require('../services/commandQueueService');
import { app } from 'electron';
import { QueueCommandType } from '../../shared/types/models';

let _service: CommandQueueService | null = null;

function getService(): CommandQueueService {
  if (!_service) {
    _service = new CommandQueueService(app.getPath('userData'));
  }
  return _service;
}

const VALID_COMMANDS: QueueCommandType[] = ['/add-req', '/bugfix', '/teams', '/bugfix-teams'];

async function handleEnqueue(
  _event: any,
  data: { command: string; args: string; cwd?: string }
): Promise<{ success: boolean; item?: any; error?: string }> {
  const { command, args } = data || {};
  let cwd = data?.cwd;

  if (!command || !VALID_COMMANDS.includes(command as QueueCommandType)) {
    return { success: false, error: 'INVALID_COMMAND' };
  }

  // cwd 미전달 시 활성 워크스페이스 경로 사용
  if (!cwd) {
    const { getManagerService } = require('./workspaceManagerHandlers');
    cwd = getManagerService().getActiveWorkspacePath() ?? undefined;
  }

  if (!cwd) {
    return { success: false, error: 'CWD_REQUIRED' };
  }

  try {
    const item = getService().enqueue(command as QueueCommandType, args || '', cwd);
    return { success: true, item };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleDequeue(
  _event: any,
  data: { itemId: string }
): Promise<{ success: boolean; error?: string }> {
  const { itemId } = data || {};
  if (!itemId) return { success: false, error: 'ITEM_ID_REQUIRED' };

  const removed = getService().dequeue(itemId);
  if (!removed) return { success: false, error: 'NOT_FOUND_OR_NOT_REMOVABLE' };
  return { success: true };
}

async function handleRequeue(
  _event: any,
  data: { itemId: string }
): Promise<{ success: boolean; error?: string }> {
  const { itemId } = data || {};
  if (!itemId) return { success: false, error: 'ITEM_ID_REQUIRED' };

  const requeued = getService().requeue(itemId);
  if (!requeued) return { success: false, error: 'NOT_FOUND_OR_NOT_REQUEUEABLE' };
  return { success: true };
}

async function handleAbort(
  _event: any
): Promise<{ success: boolean; error?: string }> {
  const aborted = getService().abort();
  if (!aborted) return { success: false, error: 'NO_RUNNING_TASK' };
  return { success: true };
}

async function handleStatus(
  _event: any
): Promise<{ success: boolean; items: any[] }> {
  const items = getService().getStatus();
  return { success: true, items };
}

async function handleSecurityWarning(
  _event: any
): Promise<{ shown: boolean }> {
  const service = getService();
  const shown = service.isSecurityWarningShown();
  if (!shown) {
    service.setSecurityWarningShown();
  }
  return { shown };
}

function initService(): void {
  // 앱 시작 시 서비스 초기화 + 디스크에서 큐 복구 후 pending 아이템 처리 시작
  getService().resumePendingOnStartup();
}

function _resetService(): void {
  _service = null;
}

export {
  handleEnqueue,
  handleDequeue,
  handleRequeue,
  handleAbort,
  handleStatus,
  handleSecurityWarning,
  initService,
  _resetService,
  getService as getQueueServiceInstance
};
