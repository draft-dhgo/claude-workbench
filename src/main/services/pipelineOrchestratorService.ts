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
 * Container 할당 → 브랜치 생성 → 파이프라인 실행 → 자동 merge → 정리
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

        // 4. Auto-merge (설정된 경우)
        if (project.settings.autoMerge) {
          this._containerPool.updateContainerStatus(projectId, container.id, 'completing');

          const mergeSuccess = await this._autoMerge(project, issue, container.id);
          if (!mergeSuccess) return; // 충돌 시 이미 상태 업데이트됨
        }

        // 5. 성공 처리
        await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'merged');
        await this._issueService.updateIssue(project.issueRepoPath, issueId, {
          result: {
            testsPassed: true,
            reviewPassed: true,
            costUsd: pipelineResult.costUsd,
            durationMs: pipelineResult.durationMs,
          },
        });

        this._containerPool._log(container.id, 'info', `Issue ${issue.id} completed successfully`, 'cleanup');

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
   * 이슈 재시도
   */
  async retryIssue(projectId: string, issueId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    await this._issueService.transitionStatus(project.issueRepoPath, issueId, 'created');
    this._notifyIssueUpdated();

    // 재시도 실행
    // processIssue를 비동기로 실행 (await하지 않음)
    this.processIssue(projectId, issueId).catch(() => {});
  }

  // --- Internal ---

  private async _autoMerge(project: Project, issue: Issue, containerId: string): Promise<boolean> {
    this._containerPool._log(containerId, 'info', `Auto-merging ${issue.issueBranch} → ${issue.targetBranch}`, 'merge');

    for (const repo of project.devRepos) {
      const worktree = this._containerPool.getContainerByIssue(project.id, issue.id)
        ?.worktrees.find(wt => wt.devRepoId === repo.id);

      if (!worktree) continue;

      const repoPath = worktree.worktreePath;

      try {
        // target 브랜치로 전환하여 merge
        const mainRepoPath = require('path').join(project.issueRepoPath, repo.submodulePath);

        await this._git.checkoutBranch(mainRepoPath, issue.targetBranch);
        const mergeResult = await this._merge.merge(mainRepoPath, issue.issueBranch);

        if (mergeResult.success) {
          this._containerPool._log(containerId, 'info',
            `Merged ${repo.name}: ${mergeResult.commitHash} (+${mergeResult.insertions}/-${mergeResult.deletions})`, 'merge');

          // push
          try {
            await this._git.push(mainRepoPath);
            this._containerPool._log(containerId, 'info', `Pushed ${repo.name}`, 'merge');
          } catch (pushErr: any) {
            this._containerPool._log(containerId, 'warn', `Push failed for ${repo.name}: ${pushErr.message}`, 'merge');
          }

          // 이슈 결과 업데이트
          await this._issueService.updateIssue(project.issueRepoPath, issue.id, {
            result: { mergeCommitHash: mergeResult.commitHash },
          });
        } else if (mergeResult.isConflict) {
          this._containerPool._log(containerId, 'warn',
            `Merge conflict in ${repo.name}: ${mergeResult.conflictFiles?.length} files`, 'merge');

          // Claude에게 충돌 해결 시도
          const resolved = await this._tryResolveConflict(mainRepoPath, containerId);
          if (!resolved) {
            await this._handleFailure(project, issue, containerId,
              `Merge conflict in ${repo.name} (${mergeResult.conflictFiles?.map(f => f.filePath).join(', ')})`);
            return false;
          }
        } else {
          await this._handleFailure(project, issue, containerId,
            `Merge failed for ${repo.name}: ${mergeResult.errorMessage}`);
          return false;
        }
      } catch (err: any) {
        await this._handleFailure(project, issue, containerId, `Merge error in ${repo.name}: ${err.message}`);
        return false;
      }
    }

    return true;
  }

  private async _tryResolveConflict(repoPath: string, containerId: string): Promise<boolean> {
    try {
      // ours 전략으로 자동 해결 시도
      const result = await this._merge.resolveConflicts(repoPath, 'theirs');
      if (result.success) {
        this._containerPool._log(containerId, 'info', 'Conflict auto-resolved (theirs strategy)', 'merge');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async _handleFailure(project: Project, issue: Issue, containerId: string, errorMessage: string): Promise<void> {
    this._containerPool._log(containerId, 'error', errorMessage, 'pipeline');

    await this._issueService.transitionStatus(project.issueRepoPath, issue.id, 'created');
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
