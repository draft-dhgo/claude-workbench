import { app } from 'electron';
import ContainerPoolService = require('../services/containerPoolService');
import DockerService = require('../services/dockerService');
import GitService = require('../services/gitService');
import { getManager } from './projectHandlers';

let _pool: ContainerPoolService | null = null;

function getPool(): ContainerPoolService {
  if (!_pool) {
    _pool = new ContainerPoolService(new DockerService(), new GitService());
  }
  return _pool;
}

async function handlePoolStatus(_event: any, data?: { projectId?: string }): Promise<{ success: boolean; pool?: any; error?: string }> {
  try {
    const project = data?.projectId
      ? require('../services/projectStore') && getManager().getActiveProject()
      : getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };

    getPool().initPool(project);
    const pool = getPool().getPoolState(project.id);
    return { success: true, pool };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleContainerGet(_event: any, data: { containerId: string }): Promise<{ success: boolean; container?: any; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };
    const container = getPool().getContainer(project.id, data.containerId);
    if (!container) return { success: false, error: 'CONTAINER_NOT_FOUND' };
    return { success: true, container };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleContainerGetLogs(_event: any, data: { containerId: string }): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const logs = getPool().getContainerLogs(data.containerId);
    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleContainerDestroy(_event: any, data: { containerId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };
    await getPool().destroyContainer(project.id, data.containerId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleContainerDestroyAll(): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };
    await getPool().destroyAllContainers(project.id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleContainerSetMax(_event: any, data: { max: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };
    getPool().setMaxContainers(project.id, data.max);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function getContainerPoolInstance(): ContainerPoolService {
  return getPool();
}

export {
  handlePoolStatus,
  handleContainerGet,
  handleContainerGetLogs,
  handleContainerDestroy,
  handleContainerDestroyAll,
  handleContainerSetMax,
  getContainerPoolInstance,
};
