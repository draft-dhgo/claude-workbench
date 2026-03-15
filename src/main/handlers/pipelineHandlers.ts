import { app } from 'electron';
import PipelineExecutorService = require('../services/pipelineExecutorService');
import PipelineOrchestratorService = require('../services/pipelineOrchestratorService');
import ContainerPoolService = require('../services/containerPoolService');
import IssueService = require('../services/issueService');
import GitService = require('../services/gitService');
import MergeService = require('../services/mergeService');
import DockerService = require('../services/dockerService');
import ProjectStore = require('../services/projectStore');
import { getManager } from './projectHandlers';
import { getContainerPoolInstance } from './containerHandlers';

let _executor: PipelineExecutorService | null = null;
let _orchestrator: PipelineOrchestratorService | null = null;

function getExecutor(): PipelineExecutorService {
  if (!_executor) {
    _executor = new PipelineExecutorService(new DockerService());
  }
  return _executor;
}

function getOrchestrator(): PipelineOrchestratorService {
  if (!_orchestrator) {
    const git = new GitService();
    const docker = new DockerService();
    const pool = getContainerPoolInstance();
    const issueService = new IssueService(git);
    const executor = getExecutor();
    const merge = new MergeService();
    const projectStore = new ProjectStore(app.getPath('userData'));

    _orchestrator = new PipelineOrchestratorService(
      pool, issueService, executor, git, merge, projectStore
    );
  }
  return _orchestrator;
}

async function handlePipelineStatus(): Promise<{ success: boolean; running: boolean; error?: string }> {
  try {
    return { success: true, running: getExecutor().isRunning };
  } catch (err: any) {
    return { success: false, running: false, error: err.message };
  }
}

async function handlePipelineAbort(): Promise<{ success: boolean; error?: string }> {
  try {
    getExecutor().abort();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * issue:start 에서 호출되는 실제 파이프라인 실행
 */
async function startIssueProcessing(projectId: string, issueId: string): Promise<void> {
  const orchestrator = getOrchestrator();
  // 비동기로 실행 (블로킹하지 않음)
  orchestrator.processIssue(projectId, issueId).catch((err) => {
    console.error(`Pipeline processing failed for ${issueId}:`, err.message);
  });
}

async function abortIssueProcessing(projectId: string, issueId: string): Promise<void> {
  const orchestrator = getOrchestrator();
  await orchestrator.abortIssue(projectId, issueId);
}

async function retryIssueProcessing(projectId: string, issueId: string): Promise<void> {
  const orchestrator = getOrchestrator();
  await orchestrator.retryIssue(projectId, issueId);
}

function _resetPipelineServices(): void {
  _executor = null;
  _orchestrator = null;
}

export {
  handlePipelineStatus,
  handlePipelineAbort,
  startIssueProcessing,
  abortIssueProcessing,
  retryIssueProcessing,
  getOrchestrator,
  _resetPipelineServices,
};
