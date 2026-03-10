import CommandQueueService = require('../services/commandQueueService');
import CommandHistoryStore = require('../services/commandHistoryStore');
import { app } from 'electron';
import { QueueCommandType } from '../../shared/types/models';
import crypto = require('crypto');

let _service: CommandQueueService | null = null;
let _historyStore: CommandHistoryStore | null = null;

function getService(): CommandQueueService {
  if (!_service) {
    _service = new CommandQueueService(app.getPath('userData'));
  }
  return _service;
}

function getHistoryStore(): CommandHistoryStore {
  if (!_historyStore) {
    _historyStore = new CommandHistoryStore(app.getPath('userData'));
  }
  return _historyStore;
}

const VALID_COMMANDS: QueueCommandType[] = ['/add-req', '/explain', '/bugfix', '/teams', '/bugfix-teams', '/merge'];

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

async function handleHistoryList(
  _event: any
): Promise<{ success: boolean; entries: any[] }> {
  const entries = getHistoryStore().list();
  return { success: true, entries };
}

async function handleHistoryDelete(
  _event: any,
  data: { id?: string }
): Promise<{ success: boolean; error?: string }> {
  const { id } = data || {};
  if (!id) return { success: false, error: 'ID_REQUIRED' };

  const deleted = getHistoryStore().delete(id);
  if (!deleted) return { success: false, error: 'NOT_FOUND' };
  return { success: true };
}

async function handleHistoryClear(
  _event: any
): Promise<{ success: boolean }> {
  getHistoryStore().clear();
  return { success: true };
}

function initService(): void {
  // 앱 시작 시 서비스 초기화 + 디스크에서 큐 복구 후 pending 아이템 처리 시작
  getService().resumePendingOnStartup();
  // 히스토리 저장 콜백 등록
  getService().setCompletionCallback((item: any) => {
    getHistoryStore().add({
      id: crypto.randomUUID(),
      command: item.command,
      args: item.args,
      cwd: item.cwd,
      status: item.status as 'success' | 'failed' | 'aborted',
      executedAt: item.completedAt ?? new Date().toISOString(),
      costUsd: item.result?.costUsd,
      durationMs: item.result?.durationMs,
      numTurns: item.result?.numTurns,
      errorMessage: item.result?.errorMessage,
    });
  });
}

function _resetService(): void {
  _service = null;
  _historyStore = null;
}

export {
  handleEnqueue,
  handleDequeue,
  handleRequeue,
  handleAbort,
  handleStatus,
  handleSecurityWarning,
  handleHistoryList,
  handleHistoryDelete,
  handleHistoryClear,
  initService,
  _resetService,
  getService as getQueueServiceInstance
};
