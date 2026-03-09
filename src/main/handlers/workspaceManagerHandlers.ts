import fs = require('fs');
import WorkspaceManagerService = require('../services/workspaceManagerService');
import { CommandInfo, SkillInfo, ConfigStatus, QueueSummary } from '../../shared/types/models';
import { Lang } from '../../shared/types/ipc';

let _managerService: InstanceType<typeof WorkspaceManagerService> | null = null;

function getManagerService(): InstanceType<typeof WorkspaceManagerService> {
  if (!_managerService) {
    _managerService = new WorkspaceManagerService();
  }
  return _managerService;
}

async function handleSetActive(
  _event: any,
  data: { workspacePath?: string }
): Promise<{ success: boolean; activeWorkspacePath?: string; wikiAvailable?: boolean; error?: string }> {
  const { workspacePath } = data || {};

  if (!workspacePath) {
    return { success: false, error: 'PATH_REQUIRED' };
  }

  try {
    const result = getManagerService().setActiveWorkspace(workspacePath);
    return {
      success: true,
      activeWorkspacePath: workspacePath,
      wikiAvailable: result.wikiAvailable
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleGetActive(
  _event: any
): Promise<{ activeWorkspacePath: string | null }> {
  return { activeWorkspacePath: getManagerService().getActiveWorkspacePath() };
}

async function handleGetCommands(
  _event: any,
  data?: { workspacePath?: string }
): Promise<{ success: boolean; commands?: CommandInfo[]; error?: string }> {
  const wsPath = getManagerService().resolveWorkspacePath(data?.workspacePath);
  if (!wsPath) {
    return { success: false, error: 'NO_ACTIVE_WORKSPACE' };
  }

  if (!fs.existsSync(wsPath)) {
    return { success: false, error: 'PATH_NOT_FOUND' };
  }

  try {
    const commands = getManagerService().getCommands(wsPath);
    return { success: true, commands };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleGetSkills(
  _event: any,
  data?: { workspacePath?: string }
): Promise<{ success: boolean; skills?: SkillInfo[]; error?: string }> {
  const wsPath = getManagerService().resolveWorkspacePath(data?.workspacePath);
  if (!wsPath) {
    return { success: false, error: 'NO_ACTIVE_WORKSPACE' };
  }

  if (!fs.existsSync(wsPath)) {
    return { success: false, error: 'PATH_NOT_FOUND' };
  }

  try {
    const skills = getManagerService().getSkills(wsPath);
    return { success: true, skills };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleGetConfigStatus(
  _event: any,
  data?: { workspacePath?: string }
): Promise<{ success: boolean; configStatus?: ConfigStatus; error?: string }> {
  const wsPath = getManagerService().resolveWorkspacePath(data?.workspacePath);
  if (!wsPath) {
    return { success: false, error: 'NO_ACTIVE_WORKSPACE' };
  }

  try {
    const configStatus = getManagerService().getConfigStatus(wsPath);
    return { success: true, configStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleResetConfig(
  _event: any,
  data?: { workspacePath?: string; lang?: Lang }
): Promise<{ success: boolean; steps?: any[]; failedStep?: string; error?: string }> {
  const wsPath = getManagerService().resolveWorkspacePath(data?.workspacePath);
  if (!wsPath) {
    return { success: false, error: 'NO_ACTIVE_WORKSPACE' };
  }

  const { handleReset } = require('./claudeConfigHandlers');
  const result = await handleReset(null, {
    workspacePath: wsPath,
    lang: data?.lang
  });

  return result;
}

async function handleGetQueueSummary(
  _event: any,
  data?: { workspacePath?: string }
): Promise<{ success: boolean; summary?: QueueSummary; error?: string }> {
  const wsPath = getManagerService().resolveWorkspacePath(data?.workspacePath);
  if (!wsPath) {
    return { success: false, error: 'NO_ACTIVE_WORKSPACE' };
  }

  const { getQueueServiceInstance } = require('./commandQueueHandlers');
  const items = getQueueServiceInstance().getStatus();
  const summary = getManagerService().getQueueSummary(items, wsPath);
  return { success: true, summary };
}

async function handleRateLimitRetryNow(
  _event: any
): Promise<{ success: boolean; error?: string }> {
  const { getQueueServiceInstance } = require('./commandQueueHandlers');
  const service = getQueueServiceInstance();

  if (!service.isPaused()) {
    return { success: false, error: 'NOT_PAUSED' };
  }

  service.forceRetryNow();
  return { success: true };
}

async function handleRateLimitCancel(
  _event: any
): Promise<{ success: boolean; error?: string }> {
  const { getQueueServiceInstance } = require('./commandQueueHandlers');
  const service = getQueueServiceInstance();

  if (!service.isPaused()) {
    return { success: false, error: 'NOT_PAUSED' };
  }

  service.cancelRateLimitWait();
  return { success: true };
}

function _resetService(): void {
  if (_managerService) {
    _managerService._reset();
  }
  _managerService = null;
}

export {
  handleSetActive,
  handleGetActive,
  handleGetCommands,
  handleGetSkills,
  handleGetConfigStatus,
  handleResetConfig,
  handleGetQueueSummary,
  handleRateLimitRetryNow,
  handleRateLimitCancel,
  _resetService,
  getManagerService
};
