import crypto = require('crypto');
import path = require('path');
import fs = require('fs');
import { BrowserWindow } from 'electron';
import DockerService = require('./dockerService');
import GitService = require('./gitService');
import {
  DevContainer,
  ContainerStatus,
  ContainerPoolState,
  ContainerWorktree,
  ContainerLogEntry,
} from '../../shared/types/container';
import { Project, DevRepoRef } from '../../shared/types/project';
import { Issue } from '../../shared/types/issue';

/**
 * Dev Container Pool 관리 서비스
 * 프로젝트별 Docker 컨테이너 pool을 관리하고 이슈에 할당/반환
 */
class ContainerPoolService {
  private _pools: Map<string, ContainerPoolState> = new Map();
  private _docker: DockerService;
  private _git: GitService;
  private _containerLogs: Map<string, ContainerLogEntry[]> = new Map();

  constructor(docker?: DockerService, git?: GitService) {
    this._docker = docker || new DockerService();
    this._git = git || new GitService();
  }

  // --- Pool Management ---

  initPool(project: Project): void {
    if (!this._pools.has(project.id)) {
      this._pools.set(project.id, {
        projectId: project.id,
        maxContainers: project.settings.maxContainers,
        containers: [],
        queuedIssues: [],
      });
    }
  }

  getPoolState(projectId: string): ContainerPoolState | null {
    return this._pools.get(projectId) ?? null;
  }

  setMaxContainers(projectId: string, max: number): void {
    const pool = this._pools.get(projectId);
    if (pool) pool.maxContainers = max;
  }

  // --- Container Lifecycle ---

  async acquireContainer(project: Project, issue: Issue): Promise<DevContainer> {
    this.initPool(project);
    const pool = this._pools.get(project.id)!;

    // 1. idle 컨테이너 확인
    const idle = pool.containers.find(c => c.status === 'idle');
    if (idle) {
      idle.status = 'provisioning';
      idle.assignedIssueId = issue.id;
      idle.lastUsedAt = new Date().toISOString();
      this._sendPoolUpdate(project.id);
      return idle;
    }

    // 2. pool < max이면 새 컨테이너 생성
    if (pool.containers.length < pool.maxContainers) {
      const container = await this._createContainer(project, issue);
      pool.containers.push(container);
      this._sendPoolUpdate(project.id);
      return container;
    }

    // 3. pool == max이면 큐에 대기
    if (!pool.queuedIssues.includes(issue.id)) {
      pool.queuedIssues.push(issue.id);
    }
    this._sendPoolUpdate(project.id);
    throw new Error('CONTAINER_POOL_FULL');
  }

  async releaseContainer(projectId: string, containerId: string): Promise<void> {
    const pool = this._pools.get(projectId);
    if (!pool) return;

    const container = pool.containers.find(c => c.id === containerId);
    if (!container) return;

    // worktree 정리
    await this._cleanupWorktrees(container);

    container.status = 'idle';
    container.assignedIssueId = undefined;
    container.worktrees = [];
    this._sendPoolUpdate(projectId);
  }

  async destroyContainer(projectId: string, containerId: string): Promise<void> {
    const pool = this._pools.get(projectId);
    if (!pool) return;

    const idx = pool.containers.findIndex(c => c.id === containerId);
    if (idx === -1) return;

    const container = pool.containers[idx];
    container.status = 'destroying';
    this._sendPoolUpdate(projectId);

    // Docker 컨테이너 정리
    if (container.dockerContainerId) {
      try {
        await this._docker.removeContainer(container.dockerContainerId, true);
      } catch { /* ignore */ }
    }

    // worktree 정리
    await this._cleanupWorktrees(container);

    pool.containers.splice(idx, 1);
    this._containerLogs.delete(containerId);
    this._sendPoolUpdate(projectId);
  }

  async destroyAllContainers(projectId: string): Promise<void> {
    const pool = this._pools.get(projectId);
    if (!pool) return;

    const ids = pool.containers.map(c => c.id);
    for (const id of ids) {
      await this.destroyContainer(projectId, id);
    }
    pool.queuedIssues = [];
  }

  // --- Issue Assignment ---

  queueIssue(projectId: string, issueId: string): void {
    const pool = this._pools.get(projectId);
    if (!pool) return;
    if (!pool.queuedIssues.includes(issueId)) {
      pool.queuedIssues.push(issueId);
      this._sendPoolUpdate(projectId);
    }
  }

  dequeueIssue(projectId: string, issueId: string): boolean {
    const pool = this._pools.get(projectId);
    if (!pool) return false;
    const idx = pool.queuedIssues.indexOf(issueId);
    if (idx === -1) return false;
    pool.queuedIssues.splice(idx, 1);
    this._sendPoolUpdate(projectId);
    return true;
  }

  // --- Branch Setup ---

  async setupBranches(container: DevContainer, project: Project, issue: Issue): Promise<void> {
    this._log(container.id, 'info', `Setting up branches for ${issue.id}`, 'branch-setup');

    for (const repo of project.devRepos) {
      const repoPath = path.join(project.issueRepoPath, repo.submodulePath);

      if (!fs.existsSync(repoPath)) {
        this._log(container.id, 'warn', `Repo path not found: ${repoPath}`, 'branch-setup');
        continue;
      }

      // fetch latest
      try {
        await this._git.fetch(repoPath);
      } catch { /* ignore */ }

      // worktree 생성 경로
      const worktreePath = path.join(
        container.worktreeBasePath,
        repo.name,
        issue.issueBranch.replace(/\//g, '-')
      );

      try {
        fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
        await this._git.createWorktree(repoPath, worktreePath, issue.issueBranch, issue.baseBranch);

        container.worktrees.push({
          devRepoId: repo.id,
          devRepoName: repo.name,
          worktreePath,
          branch: issue.issueBranch,
        });

        this._log(container.id, 'info', `Worktree created: ${repo.name} → ${issue.issueBranch}`, 'branch-setup');
      } catch (err: any) {
        this._log(container.id, 'error', `Failed to create worktree for ${repo.name}: ${err.message}`, 'branch-setup');
        throw err;
      }
    }
  }

  // --- Status Queries ---

  getContainer(projectId: string, containerId: string): DevContainer | null {
    const pool = this._pools.get(projectId);
    return pool?.containers.find(c => c.id === containerId) ?? null;
  }

  getContainerByIssue(projectId: string, issueId: string): DevContainer | null {
    const pool = this._pools.get(projectId);
    return pool?.containers.find(c => c.assignedIssueId === issueId) ?? null;
  }

  getRunningContainers(projectId: string): DevContainer[] {
    const pool = this._pools.get(projectId);
    return pool?.containers.filter(c => c.status === 'running') ?? [];
  }

  getIdleContainers(projectId: string): DevContainer[] {
    const pool = this._pools.get(projectId);
    return pool?.containers.filter(c => c.status === 'idle') ?? [];
  }

  getContainerLogs(containerId: string): ContainerLogEntry[] {
    return this._containerLogs.get(containerId) ?? [];
  }

  updateContainerStatus(projectId: string, containerId: string, status: ContainerStatus): void {
    const container = this.getContainer(projectId, containerId);
    if (container) {
      container.status = status;
      this._sendPoolUpdate(projectId);
      this._sendContainerStatusChanged(containerId, status);
    }
  }

  // --- Orphaned Resource Cleanup ---

  /**
   * 앱 재시작 시 orphaned worktree와 Docker 컨테이너 정리
   * .containers/ 디렉토리의 잔여 폴더와 cwb- prefix Docker 컨테이너를 감지/삭제
   */
  async cleanupOrphaned(project: Project): Promise<{ worktreesRemoved: number; containersRemoved: number }> {
    let worktreesRemoved = 0;
    let containersRemoved = 0;

    // 1. .containers/ 디렉토리의 orphaned worktree 폴더 정리
    const containersDir = path.join(project.localBasePath, '.containers');
    if (fs.existsSync(containersDir)) {
      const pool = this._pools.get(project.id);
      const activeContainerIds = new Set(pool?.containers.map(c => c.id) ?? []);

      try {
        const entries = fs.readdirSync(containersDir);
        for (const entry of entries) {
          if (!activeContainerIds.has(entry)) {
            const orphanedPath = path.join(containersDir, entry);
            try {
              // worktree로 등록된 것이 있으면 git worktree remove 먼저 시도
              for (const repo of project.devRepos) {
                const repoPath = path.join(project.issueRepoPath, repo.submodulePath);
                if (fs.existsSync(repoPath)) {
                  try {
                    const worktrees = await this._git.listWorktrees(repoPath);
                    for (const wt of worktrees) {
                      if (wt.path.startsWith(orphanedPath)) {
                        await this._git.removeWorktree(repoPath, wt.path, true).catch(() => {});
                      }
                    }
                  } catch { /* ignore */ }
                }
              }
              fs.rmSync(orphanedPath, { recursive: true, force: true });
              worktreesRemoved++;
            } catch { /* ignore individual cleanup errors */ }
          }
        }
      } catch { /* ignore readdir errors */ }
    }

    // 2. orphaned Docker 컨테이너 정리 (cwb- prefix)
    const dockerAvailable = await this._docker.isDockerAvailable();
    if (dockerAvailable) {
      try {
        const pool = this._pools.get(project.id);
        const activeDockerIds = new Set(
          pool?.containers.map(c => c.dockerContainerId).filter(Boolean) ?? []
        );

        const projectPrefix = `cwb-${project.id.substring(0, 8)}-`;
        const containers = await this._docker.listContainers(projectPrefix);

        for (const container of containers) {
          if (!activeDockerIds.has(container.id)) {
            try {
              await this._docker.removeContainer(container.id, true);
              containersRemoved++;
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore docker errors */ }
    }

    return { worktreesRemoved, containersRemoved };
  }

  // --- Internal ---

  private async _createContainer(project: Project, issue: Issue): Promise<DevContainer> {
    const id = crypto.randomUUID();
    const worktreeBasePath = path.join(project.localBasePath, '.containers', id);
    fs.mkdirSync(worktreeBasePath, { recursive: true });

    const container: DevContainer = {
      id,
      projectId: project.id,
      status: 'provisioning',
      assignedIssueId: issue.id,
      worktreeBasePath,
      worktrees: [],
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    this._containerLogs.set(id, []);
    this._log(id, 'info', `Container ${id.substring(0, 8)} created`, 'provisioning');

    // Docker 컨테이너 생성 (가능한 경우)
    const dockerAvailable = await this._docker.isDockerAvailable();
    if (dockerAvailable) {
      try {
        const containerName = `cwb-${project.id.substring(0, 8)}-${id.substring(0, 8)}`;
        const dockerId = await this._docker.createContainer({
          image: 'node:20',
          name: containerName,
          mounts: [{
            hostPath: project.issueRepoPath,
            containerPath: '/workspace',
          }],
          env: {},
          workingDir: '/workspace',
        });
        await this._docker.startContainer(dockerId);
        container.dockerContainerId = dockerId;
        this._log(id, 'info', `Docker container started: ${dockerId}`, 'provisioning');
      } catch (err: any) {
        this._log(id, 'warn', `Docker unavailable, using local worktree mode: ${err.message}`, 'provisioning');
      }
    } else {
      this._log(id, 'info', 'Docker not available, using local worktree mode', 'provisioning');
    }

    return container;
  }

  private async _cleanupWorktrees(container: DevContainer): Promise<void> {
    for (const wt of container.worktrees) {
      try {
        // worktree 경로에서 상위 repo 경로 추출
        if (fs.existsSync(wt.worktreePath)) {
          // git worktree remove
          const parentDir = path.dirname(path.dirname(wt.worktreePath));
          await this._git.removeWorktree(parentDir, wt.worktreePath, true).catch(() => {});
        }
      } catch { /* ignore cleanup errors */ }
    }

    // 컨테이너 worktree 기본 경로 정리
    if (container.worktreeBasePath && fs.existsSync(container.worktreeBasePath)) {
      try {
        fs.rmSync(container.worktreeBasePath, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  }

  _log(containerId: string, level: ContainerLogEntry['level'], message: string, phase?: ContainerLogEntry['phase']): void {
    const entry: ContainerLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      phase,
    };

    const logs = this._containerLogs.get(containerId);
    if (logs) {
      logs.push(entry);
      // 최대 1000개 유지
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    }

    // Renderer에 실시간 전송
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('container:log', { containerId, entry });
    }
  }

  private _sendPoolUpdate(projectId: string): void {
    const pool = this._pools.get(projectId);
    if (!pool) return;
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('container:pool-updated', pool);
    }
  }

  private _sendContainerStatusChanged(containerId: string, status: ContainerStatus): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('container:status-changed', { containerId, status });
    }
  }
}

export = ContainerPoolService;
