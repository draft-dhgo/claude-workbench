import CommandQueueService = require('../services/commandQueueService');
import { QueueCommandType } from '../../shared/types/models';

let _service: CommandQueueService | null = null;

function getService(): CommandQueueService {
  if (!_service) {
    _service = new CommandQueueService();
  }
  return _service;
}

const VALID_COMMANDS: QueueCommandType[] = ['/add-req', '/bugfix', '/teams', '/bugfix-teams'];

async function handleEnqueue(
  _event: any,
  data: { command: string; args: string; cwd: string }
): Promise<{ success: boolean; item?: any; error?: string }> {
  const { command, args, cwd } = data || {};

  if (!command || !VALID_COMMANDS.includes(command as QueueCommandType)) {
    return { success: false, error: 'INVALID_COMMAND' };
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
  if (!removed) return { success: false, error: 'NOT_FOUND_OR_NOT_PENDING' };
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

function _resetService(): void {
  _service = null;
}

export {
  handleEnqueue,
  handleDequeue,
  handleAbort,
  handleStatus,
  handleSecurityWarning,
  _resetService
};
