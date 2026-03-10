import MergeService = require('../services/mergeService');
import { getQueueServiceInstance } from './commandQueueHandlers';
import { BranchInfo } from '../../shared/types/models';

let _mergeService: InstanceType<typeof MergeService> | null = null;

function getMergeService(): InstanceType<typeof MergeService> {
  if (!_mergeService) {
    _mergeService = new MergeService();
  }
  return _mergeService;
}

/**
 * merge:resolve-conflict 핸들러
 */
async function handleResolveConflict(
  _event: any,
  data: { itemId: string; strategy: 'ours' | 'theirs'; files?: string[] }
): Promise<{ success: boolean; error?: string; mergeCommitHash?: string; changedFiles?: number }> {
  const { itemId, strategy, files } = data || {};
  if (!itemId || !strategy) {
    return { success: false, error: 'INVALID_PARAMS' };
  }

  const queueService = getQueueServiceInstance();
  const items = queueService.getStatus();
  const item = items.find((i: any) => i.id === itemId && i.status === 'conflict');
  if (!item) {
    return { success: false, error: 'ITEM_NOT_FOUND_OR_NOT_CONFLICT' };
  }

  const mergeService = getMergeService();

  try {
    const result = await mergeService.resolveConflicts(item.cwd, strategy, files);

    if (result.success) {
      queueService.updateMergeItemStatus(itemId, 'success', {
        mergeCommitHash: result.commitHash,
        changedFiles: result.changedFiles,
        durationMs: Date.now() - new Date(item.startedAt!).getTime(),
        resolvedFiles: files?.length ?? result.changedFiles
      });
      return {
        success: true,
        mergeCommitHash: result.commitHash,
        changedFiles: result.changedFiles
      };
    } else if (result.isConflict) {
      return { success: false, error: 'REMAINING_CONFLICTS' };
    } else {
      return { success: false, error: result.errorMessage };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * merge:manual-resolve-complete 핸들러
 */
async function handleManualResolveComplete(
  _event: any,
  data: { itemId: string }
): Promise<{ success: boolean; error?: string; mergeCommitHash?: string; unresolvedFiles?: string[] }> {
  const { itemId } = data || {};
  if (!itemId) return { success: false, error: 'ITEM_ID_REQUIRED' };

  const queueService = getQueueServiceInstance();
  const items = queueService.getStatus();
  const item = items.find((i: any) => i.id === itemId && i.status === 'conflict');
  if (!item) return { success: false, error: 'ITEM_NOT_FOUND_OR_NOT_CONFLICT' };

  const mergeService = getMergeService();

  try {
    const result = await mergeService.completeManualResolve(item.cwd);

    if (result.success) {
      queueService.updateMergeItemStatus(itemId, 'success', {
        mergeCommitHash: result.commitHash,
        changedFiles: result.changedFiles,
        durationMs: Date.now() - new Date(item.startedAt!).getTime()
      });
      return { success: true, mergeCommitHash: result.commitHash };
    } else {
      const unresolvedFiles = result.conflictFiles?.map((f: any) => f.filePath) ?? [];
      return { success: false, error: 'UNRESOLVED_CONFLICTS', unresolvedFiles };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * merge:abort 핸들러
 */
async function handleAbortMerge(
  _event: any,
  data: { itemId: string }
): Promise<{ success: boolean; error?: string }> {
  const { itemId } = data || {};
  if (!itemId) return { success: false, error: 'ITEM_ID_REQUIRED' };

  const queueService = getQueueServiceInstance();
  const items = queueService.getStatus();
  const item = items.find((i: any) => i.id === itemId && i.status === 'conflict');
  if (!item) return { success: false, error: 'ITEM_NOT_FOUND_OR_NOT_CONFLICT' };

  const mergeService = getMergeService();

  try {
    const result = await mergeService.abortMerge(item.cwd);
    if (result.success) {
      queueService.updateMergeItemStatus(itemId, 'aborted', {
        durationMs: Date.now() - new Date(item.startedAt!).getTime()
      });
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * merge:list-branches 핸들러
 */
async function handleListMergeBranches(
  _event: any,
  data: { cwd: string }
): Promise<{ success: boolean; branches?: BranchInfo[]; error?: string }> {
  const { cwd } = data || {};
  if (!cwd) return { success: false, error: 'CWD_REQUIRED' };

  const mergeService = getMergeService();

  try {
    const branches = await mergeService.listBranches(cwd);
    return { success: true, branches };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function _resetMergeService(): void {
  _mergeService = null;
}

export {
  handleResolveConflict,
  handleManualResolveComplete,
  handleAbortMerge,
  handleListMergeBranches,
  getMergeService,
  _resetMergeService
};
