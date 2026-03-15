import MergeService = require('../services/mergeService');
import { BranchInfo } from '../../shared/types/models';

let _mergeService: InstanceType<typeof MergeService> | null = null;

function getMergeService(): InstanceType<typeof MergeService> {
  if (!_mergeService) {
    _mergeService = new MergeService();
  }
  return _mergeService;
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

// TODO: handleResolveConflict, handleManualResolveComplete, handleAbortMerge
// will be restored when PipelineOrchestratorService is implemented (Phase 2)

function _resetMergeService(): void {
  _mergeService = null;
}

export {
  handleListMergeBranches,
  getMergeService,
  _resetMergeService
};
