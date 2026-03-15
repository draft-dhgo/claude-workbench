import fs = require('fs');
import path = require('path');
import GitService = require('./gitService');
import { Issue, IssueManifest, IssueStatus, CreateIssueData } from '../../shared/types/issue';

/**
 * 이슈 관리 서비스
 * issue repo 내 issues/manifest.json에서 이슈 CRUD + git commit
 */
class IssueService {
  private _git: GitService;

  constructor(git?: GitService) {
    this._git = git || new GitService();
  }

  // --- CRUD ---

  async listIssues(issueRepoPath: string): Promise<Issue[]> {
    const manifest = this._loadManifest(issueRepoPath);
    return manifest.issues;
  }

  async getIssue(issueRepoPath: string, issueId: string): Promise<Issue | null> {
    const manifest = this._loadManifest(issueRepoPath);
    return manifest.issues.find(i => i.id === issueId) ?? null;
  }

  async createIssue(issueRepoPath: string, data: CreateIssueData): Promise<Issue> {
    const manifest = this._loadManifest(issueRepoPath);
    const id = `ISSUE-${String(manifest.nextId).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const issue: Issue = {
      id,
      title: data.title.trim(),
      description: data.description,
      type: data.type,
      status: 'created',
      baseBranch: data.baseBranch || 'main',
      targetBranch: data.targetBranch || 'main',
      issueBranch: `issue/${id}`,
      priority: data.priority || 'medium',
      pipelineCommand: data.pipelineCommand,
      pipelineArgs: data.pipelineArgs,
      labels: data.labels || [],
      createdAt: now,
      updatedAt: now,
    };

    manifest.nextId++;
    manifest.issues.push(issue);
    this._saveManifest(issueRepoPath, manifest);

    // 이슈 상세 파일 생성
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${id}.md`);
    fs.mkdirSync(path.dirname(detailPath), { recursive: true });
    fs.writeFileSync(detailPath, `# ${id}: ${issue.title}\n\n${issue.description}\n`, 'utf-8');

    // git commit
    await this._commitChanges(issueRepoPath, `issue: create ${id} - ${issue.title}`);

    return issue;
  }

  async updateIssue(issueRepoPath: string, issueId: string, updates: Partial<Issue>): Promise<Issue> {
    const manifest = this._loadManifest(issueRepoPath);
    const idx = manifest.issues.findIndex(i => i.id === issueId);
    if (idx === -1) throw new Error('ISSUE_NOT_FOUND');

    const issue = manifest.issues[idx];

    // 업데이트 가능 필드
    if (updates.title !== undefined) issue.title = updates.title.trim();
    if (updates.description !== undefined) issue.description = updates.description;
    if (updates.priority !== undefined) issue.priority = updates.priority;
    if (updates.pipelineArgs !== undefined) issue.pipelineArgs = updates.pipelineArgs;
    if (updates.labels !== undefined) issue.labels = updates.labels;
    if (updates.assignedContainerId !== undefined) issue.assignedContainerId = updates.assignedContainerId;
    if (updates.result !== undefined) issue.result = updates.result;
    if (updates.startedAt !== undefined) issue.startedAt = updates.startedAt;
    if (updates.completedAt !== undefined) issue.completedAt = updates.completedAt;

    issue.updatedAt = new Date().toISOString();
    this._saveManifest(issueRepoPath, manifest);

    await this._commitChanges(issueRepoPath, `issue: update ${issueId}`);

    return issue;
  }

  async deleteIssue(issueRepoPath: string, issueId: string): Promise<boolean> {
    const manifest = this._loadManifest(issueRepoPath);
    const idx = manifest.issues.findIndex(i => i.id === issueId);
    if (idx === -1) return false;

    manifest.issues.splice(idx, 1);
    this._saveManifest(issueRepoPath, manifest);

    // 상세 파일 삭제
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${issueId}.md`);
    if (fs.existsSync(detailPath)) {
      fs.rmSync(detailPath);
    }

    await this._commitChanges(issueRepoPath, `issue: delete ${issueId}`);
    return true;
  }

  // --- Status Transitions ---

  async transitionStatus(issueRepoPath: string, issueId: string, newStatus: IssueStatus): Promise<Issue> {
    const manifest = this._loadManifest(issueRepoPath);
    const issue = manifest.issues.find(i => i.id === issueId);
    if (!issue) throw new Error('ISSUE_NOT_FOUND');

    const oldStatus = issue.status;
    issue.status = newStatus;
    issue.updatedAt = new Date().toISOString();

    if (newStatus === 'in-progress' && !issue.startedAt) {
      issue.startedAt = issue.updatedAt;
    }
    if (newStatus === 'merged' || newStatus === 'closed') {
      issue.completedAt = issue.updatedAt;
    }

    this._saveManifest(issueRepoPath, manifest);
    await this._commitChanges(issueRepoPath, `issue: ${issueId} ${oldStatus} → ${newStatus}`);

    return issue;
  }

  // --- Detail file ---

  async getIssueDetail(issueRepoPath: string, issueId: string): Promise<string> {
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${issueId}.md`);
    try {
      return fs.readFileSync(detailPath, 'utf-8');
    } catch {
      return '';
    }
  }

  async setIssueDetail(issueRepoPath: string, issueId: string, content: string): Promise<void> {
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${issueId}.md`);
    fs.mkdirSync(path.dirname(detailPath), { recursive: true });
    fs.writeFileSync(detailPath, content, 'utf-8');
    await this._commitChanges(issueRepoPath, `issue: update detail for ${issueId}`);
  }

  // --- Internal ---

  private _loadManifest(issueRepoPath: string): IssueManifest {
    const manifestPath = path.join(issueRepoPath, 'issues', 'manifest.json');
    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { version: 1, nextId: 1, issues: [] };
    }
  }

  private _saveManifest(issueRepoPath: string, manifest: IssueManifest): void {
    const manifestPath = path.join(issueRepoPath, 'issues', 'manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  private async _commitChanges(issueRepoPath: string, message: string): Promise<void> {
    try {
      await this._git.addAll(issueRepoPath);
      const status = await this._git.status(issueRepoPath);
      if (status.trim()) {
        await this._git.commit(issueRepoPath, message);
      }
    } catch {
      // git commit 실패는 무시 (issue repo가 아직 init 안 된 경우 등)
    }
  }
}

export = IssueService;
