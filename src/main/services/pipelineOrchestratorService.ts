import { BrowserWindow } from 'electron';
import ContainerPoolService = require('./containerPoolService');
import IssueService = require('./issueService');
import PipelineExecutorService = require('./pipelineExecutorService');
import GitService = require('./gitService');
import MergeService = require('./mergeService');
import ProjectStore = require('./projectStore');
import { Project } from '../../shared/types/project';
import { Issue } from '../../shared/types/issue';

/**
 * Pipeline Orchestrator 서비스
 * 이슈 전체 생명주기 오케스트레이션:
 * Container 할당 → 브랜치 생성 → 파이프라인 실행 → completed → 정리
 * 사용자가 merge 승인 시: mergeIssue() 호출
 */
class PipelineOrchestratorService {
  private _containerPool: ContainerPoolService;
  private _issueService: IssueService;
  private _executor: PipelineExecutorService;
  private _git: GitService;
  private _merge: MergeService;
  private _projectStore: ProjectStore;
  private _runningIssues: Map<string, AbortController> = new Map();

  constructor(
    containerPool: ContainerPoolService,
    issueService: IssueService,
    executor: PipelineExecutorService,
    git: GitService,
    merge: MergeService,
    projectStore: ProjectStore,
  ) {
    this._containerPool = containerPool;
    this._issueService = issueService;
    this._executor = executor;
    this._git = git;
    this._merge = merge;
    this._projectStore = projectStore;
  }

  /**
   * 이슈 처리 전체 플로우
   */
  async processIssue(projectId: string, issueId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const issue = await this._issueService.getIssue(project.issueRepoPath, issueId);
    if (!issue) throw new Error('ISSUE_NOT_FOUND');

    const abortController = new AbortController();
    this._runningIssues.set(issueId, abortController);

    try {
      // 1. Container 할당
      const container = await this._containerPool.acquireContainer(project, issue);
      this._containerPool._log(container.id, 'info', `Assigned to issue ${issue.id}`, 'provisioning');

      // 이슈에 컨테이너 할당 기록
      await this._issueService.updateIssue(project.issueRepoPath, issueId, {
        assignedContainerId: container.id,
      });

      try {
        // 2. 브랜치 생성
        await this._containerPool.setupBranches(container, project, issue);
        this._containerPool.updateContainerStatus(projectId, container.id, 'running');

        // 이슈 상태 → in-progress
        await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'in-progress');
        this._notifyIssueUpdated();

        // Abort 체크
        if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // 3. 파이프라인 실행
        const primaryWorktree = container.worktrees[0];
        const cwd = primaryWorktree ? primaryWorktree.worktreePath : project.issueRepoPath;

        const pipelineResult = await this._executor.execute({
          command: issue.pipelineCommand,
          args: issue.pipelineArgs || issue.title,
          cwd,
          dockerContainerId: container.dockerContainerId,
          logTag: issue.id,
          signal: abortController.signal,
        });

        if (!pipelineResult.success) {
          await this._handleFailure(project, issue, container.id, pipelineResult.errorMessage || 'Pipeline failed');
          return;
        }

        // Abort 체크
        if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // 4. 파이프라인 완료 → completed (사용자 merge 승인 대기)
        await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'completed');
        await this._issueService.updateIssue(project.issueRepoPath, issueId, {
          result: {
            testsPassed: true,
            costUsd: pipelineResult.costUsd,
            durationMs: pipelineResult.durationMs,
          },
        });

        this._containerPool._log(container.id, 'info', `Issue ${issue.id} pipeline completed, waiting for merge approval`, 'cleanup');

      } finally {
        // 6. Container 반환
        this._containerPool.updateContainerStatus(projectId, container.id, 'idle');
        await this._containerPool.releaseContainer(projectId, container.id);
        this._notifyIssueUpdated();

        // 대기 중인 이슈 처리
        await this._processQueuedIssues(projectId);
      }

    } catch (err: any) {
      if (err.message === 'CONTAINER_POOL_FULL') {
        // 큐에 대기 — 컨테이너 반환 시 자동 처리됨
        this._containerPool._log('', 'info', `Issue ${issueId} queued (pool full)`, 'provisioning');
        return;
      }

      if (err.name === 'AbortError') {
        await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
        this._notifyIssueUpdated();
        return;
      }

      // 일반 오류
      await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
      await this._issueService.updateIssue(project.issueRepoPath, issueId, {
        result: { errorMessage: err.message },
      });
      this._notifyIssueUpdated();
    } finally {
      this._runningIssues.delete(issueId);
    }
  }

  /**
   * 이슈 처리 중단
   */
  async abortIssue(projectId: string, issueId: string): Promise<void> {
    const controller = this._runningIssues.get(issueId);
    if (controller) {
      controller.abort();
    }
    this._executor.abort();

    const project = this._projectStore.getById(projectId);
    if (project) {
      await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
      this._notifyIssueUpdated();
    }
  }

  /**
   * 이슈 재시도 (maxPipelineRetries 제한 적용)
   */
  async retryIssue(projectId: string, issueId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const issue = await this._issueService.getIssue(project.issueRepoPath, issueId);
    if (!issue) throw new Error('ISSUE_NOT_FOUND');

    const maxRetries = project.settings.maxPipelineRetries ?? 3;
    const currentRetryCount = issue.result?.retryCount ?? 0;

    if (currentRetryCount >= maxRetries) {
      throw new Error(`MAX_RETRIES_EXCEEDED: ${currentRetryCount}/${maxRetries}`);
    }

    // 재시도 카운트 증가
    await this._issueService.updateIssue(project.issueRepoPath, issueId, {
      result: { ...issue.result, retryCount: currentRetryCount + 1 },
    });

    await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
    this._notifyIssueUpdated();

    // 재시도 실행
    // processIssue를 비동기로 실행 (await하지 않음)
    this.processIssue(projectId, issueId).catch(() => {});
  }

  /**
   * 사용자 승인 후 이슈 merge 실행
   */
  async mergeIssue(projectId: string, issueId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const issue = await this._issueService.getIssue(project.issueRepoPath, issueId);
    if (!issue) throw new Error('ISSUE_NOT_FOUND');

    if (issue.status !== 'completed') {
      throw new Error('ISSUE_NOT_COMPLETED');
    }

    // merging 상태로 전환
    await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'merging');
    this._notifyIssueUpdated();

    try {
      for (const repo of project.devRepos) {
        const mainRepoPath = require('path').join(project.issueRepoPath, repo.submodulePath);

        await this._git.checkoutBranch(mainRepoPath, issue.baseBranch);
        const mergeResult = await this._merge.merge(mainRepoPath, issue.issueBranch);

        if (mergeResult.success) {
          // push
          await this._git.push(mainRepoPath);

          // 이슈 결과 업데이트
          await this._issueService.updateIssue(project.issueRepoPath, issueId, {
            result: { ...issue.result, mergeCommitHash: mergeResult.commitHash },
          });
        } else {
          const errorMsg = mergeResult.isConflict
            ? `Merge conflict in ${repo.name}`
            : `Merge failed for ${repo.name}: ${mergeResult.errorMessage}`;
          throw new Error(errorMsg);
        }
      }

      // 성공: merged 상태로 전환
      await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'merged');
      this._notifyIssueUpdated();

      // 컨테이너 정리
      const container = this._containerPool.getContainerByIssue(projectId, issueId);
      if (container) {
        this._containerPool.updateContainerStatus(projectId, container.id, 'idle');
        await this._containerPool.releaseContainer(projectId, container.id);
      }
    } catch (err: any) {
      // 실패: failed 상태로 전환
      await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'failed');
      await this._issueService.updateIssue(project.issueRepoPath, issueId, {
        result: { ...issue.result, errorMessage: err.message },
      });
      this._notifyIssueUpdated();
      throw err;
    }
  }

  /**
   * 사용자가 completed 이슈를 거부 — created 상태로 되돌림
   */
  async rejectIssue(projectId: string, issueId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const issue = await this._issueService.getIssue(project.issueRepoPath, issueId);
    if (!issue) throw new Error('ISSUE_NOT_FOUND');

    if (issue.status !== 'completed') {
      throw new Error('ISSUE_NOT_COMPLETED');
    }

    await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
    await this._issueService.updateIssue(project.issueRepoPath, issueId, {
      result: undefined,
      assignedContainerId: undefined,
    });
    this._notifyIssueUpdated();
  }

  // --- Internal ---

  private async _handleFailure(project: Project, issue: Issue, containerId: string, errorMessage: string): Promise<void> {
    this._containerPool._log(containerId, 'error', errorMessage, 'pipeline');

    await this._issueService.transitionStatus(project.issueRepoPath, issue.id, 'failed');
    await this._issueService.updateIssue(project.issueRepoPath, issue.id, {
      result: { errorMessage },
    });
    this._notifyIssueUpdated();
  }

  private async _processQueuedIssues(projectId: string): Promise<void> {
    const pool = this._containerPool.getPoolState(projectId);
    if (!pool || pool.queuedIssues.length === 0) return;

    const idleContainers = this._containerPool.getIdleContainers(projectId);
    if (idleContainers.length === 0) return;

    // 큐에서 다음 이슈를 꺼내서 처리
    const nextIssueId = pool.queuedIssues.shift();
    if (nextIssueId) {
      this.processIssue(projectId, nextIssueId).catch(() => {});
    }
  }

  private _notifyIssueUpdated(): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('issue:list-updated', {});
    }
  }
}

export = PipelineOrchestratorService;
