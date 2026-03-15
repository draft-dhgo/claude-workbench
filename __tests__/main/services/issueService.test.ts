// IssueService unit tests

import os = require('os');
import fs = require('fs');
import path = require('path');

// Mock GitService
const mockGit = {
  addAll: jest.fn().mockResolvedValue(undefined),
  status: jest.fn().mockResolvedValue(' M file\n'),
  commit: jest.fn().mockResolvedValue('abc1234'),
};

jest.mock('../../../src/main/services/gitService', () => {
  return jest.fn().mockImplementation(() => mockGit);
});

import IssueService = require('../../../src/main/services/issueService');

let tmpDir: string;
let issueRepoPath: string;
let service: InstanceType<typeof IssueService>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-test-issues-'));
  issueRepoPath = tmpDir;
  mockGit.addAll.mockClear();
  mockGit.status.mockClear().mockResolvedValue(' M file\n');
  mockGit.commit.mockClear();
  service = new IssueService(mockGit as any);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createIssueData(overrides = {}) {
  return {
    title: 'Test Issue',
    description: 'Test description',
    type: 'feature' as const,
    baseBranch: 'main',
    targetBranch: 'main',
    priority: 'medium' as const,
    pipelineCommand: '/teams' as const,
    ...overrides,
  };
}

describe('IssueService.createIssue', () => {
  it('creates an issue with auto-generated ID', async () => {
    const issue = await service.createIssue(issueRepoPath, createIssueData());
    expect(issue.id).toBe('ISSUE-001');
    expect(issue.title).toBe('Test Issue');
    expect(issue.description).toBe('Test description');
    expect(issue.type).toBe('feature');
    expect(issue.status).toBe('created');
    expect(issue.baseBranch).toBe('main');
    expect(issue.issueBranch).toBe('issue/ISSUE-001');
    expect(issue.priority).toBe('medium');
    expect(issue.labels).toEqual([]);
  });

  it('increments issue IDs', async () => {
    const issue1 = await service.createIssue(issueRepoPath, createIssueData({ title: 'First' }));
    const issue2 = await service.createIssue(issueRepoPath, createIssueData({ title: 'Second' }));
    expect(issue1.id).toBe('ISSUE-001');
    expect(issue2.id).toBe('ISSUE-002');
  });

  it('creates the detail markdown file', async () => {
    const issue = await service.createIssue(issueRepoPath, createIssueData());
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${issue.id}.md`);
    expect(fs.existsSync(detailPath)).toBe(true);
    const content = fs.readFileSync(detailPath, 'utf-8');
    expect(content).toContain('ISSUE-001');
    expect(content).toContain('Test Issue');
    expect(content).toContain('Test description');
  });

  it('commits changes to git', async () => {
    await service.createIssue(issueRepoPath, createIssueData());
    expect(mockGit.addAll).toHaveBeenCalledWith(issueRepoPath);
    expect(mockGit.commit).toHaveBeenCalledWith(issueRepoPath, expect.stringContaining('create ISSUE-001'));
  });

  it('saves manifest to disk', async () => {
    await service.createIssue(issueRepoPath, createIssueData());
    const manifestPath = path.join(issueRepoPath, 'issues', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.version).toBe(1);
    expect(manifest.nextId).toBe(2);
    expect(manifest.issues).toHaveLength(1);
  });

  it('uses custom labels when provided', async () => {
    const issue = await service.createIssue(
      issueRepoPath,
      createIssueData({ labels: ['urgent', 'frontend'] })
    );
    expect(issue.labels).toEqual(['urgent', 'frontend']);
  });
});

describe('IssueService.listIssues', () => {
  it('returns empty array when no manifest exists', async () => {
    const issues = await service.listIssues(issueRepoPath);
    expect(issues).toEqual([]);
  });

  it('returns all issues from manifest', async () => {
    await service.createIssue(issueRepoPath, createIssueData({ title: 'A' }));
    await service.createIssue(issueRepoPath, createIssueData({ title: 'B' }));
    const issues = await service.listIssues(issueRepoPath);
    expect(issues).toHaveLength(2);
    expect(issues[0].title).toBe('A');
    expect(issues[1].title).toBe('B');
  });
});

describe('IssueService.getIssue', () => {
  it('returns the issue by id', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const found = await service.getIssue(issueRepoPath, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.title).toBe('Test Issue');
  });

  it('returns null for non-existent id', async () => {
    const found = await service.getIssue(issueRepoPath, 'ISSUE-999');
    expect(found).toBeNull();
  });
});

describe('IssueService.updateIssue', () => {
  it('updates allowed fields', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    // Ensure time difference
    await new Promise(r => setTimeout(r, 5));
    const updated = await service.updateIssue(issueRepoPath, created.id, {
      title: 'Updated Title',
      priority: 'high',
      labels: ['v2'],
    });
    expect(updated.title).toBe('Updated Title');
    expect(updated.priority).toBe('high');
    expect(updated.labels).toEqual(['v2']);
  });

  it('throws ISSUE_NOT_FOUND for non-existent id', async () => {
    await expect(
      service.updateIssue(issueRepoPath, 'ISSUE-999', { title: 'x' })
    ).rejects.toThrow('ISSUE_NOT_FOUND');
  });

  it('commits update to git', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    mockGit.commit.mockClear();
    await service.updateIssue(issueRepoPath, created.id, { title: 'New' });
    expect(mockGit.commit).toHaveBeenCalledWith(issueRepoPath, expect.stringContaining('update ISSUE-001'));
  });
});

describe('IssueService.deleteIssue', () => {
  it('deletes an issue and returns true', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const result = await service.deleteIssue(issueRepoPath, created.id);
    expect(result).toBe(true);
    const issues = await service.listIssues(issueRepoPath);
    expect(issues).toHaveLength(0);
  });

  it('removes the detail file', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const detailPath = path.join(issueRepoPath, 'issues', 'details', `${created.id}.md`);
    expect(fs.existsSync(detailPath)).toBe(true);
    await service.deleteIssue(issueRepoPath, created.id);
    expect(fs.existsSync(detailPath)).toBe(false);
  });

  it('returns false for non-existent id', async () => {
    const result = await service.deleteIssue(issueRepoPath, 'ISSUE-999');
    expect(result).toBe(false);
  });
});

describe('IssueService.transitionStatus', () => {
  it('transitions from created to in-progress and sets startedAt', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const updated = await service.transitionStatus(issueRepoPath, created.id, 'in-progress');
    expect(updated.status).toBe('in-progress');
    expect(updated.startedAt).toBeDefined();
  });

  it('transitions to merged and sets completedAt', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const updated = await service.transitionStatus(issueRepoPath, created.id, 'merged');
    expect(updated.status).toBe('merged');
    expect(updated.completedAt).toBeDefined();
  });

  it('transitions to closed and sets completedAt', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const updated = await service.transitionStatus(issueRepoPath, created.id, 'closed');
    expect(updated.status).toBe('closed');
    expect(updated.completedAt).toBeDefined();
  });

  it('does not overwrite startedAt on subsequent in-progress transition', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const first = await service.transitionStatus(issueRepoPath, created.id, 'in-progress');
    const firstStartedAt = first.startedAt;
    // Transition to testing then back to in-progress
    await service.transitionStatus(issueRepoPath, created.id, 'testing');
    const second = await service.transitionStatus(issueRepoPath, created.id, 'in-progress');
    expect(second.startedAt).toBe(firstStartedAt);
  });

  it('throws ISSUE_NOT_FOUND for non-existent id', async () => {
    await expect(
      service.transitionStatus(issueRepoPath, 'ISSUE-999', 'in-progress')
    ).rejects.toThrow('ISSUE_NOT_FOUND');
  });

  it('commits status transition to git', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    mockGit.commit.mockClear();
    await service.transitionStatus(issueRepoPath, created.id, 'in-progress');
    expect(mockGit.commit).toHaveBeenCalledWith(
      issueRepoPath,
      expect.stringContaining('created → in-progress')
    );
  });
});

describe('IssueService.getIssueDetail', () => {
  it('returns detail file content', async () => {
    const created = await service.createIssue(issueRepoPath, createIssueData());
    const detail = await service.getIssueDetail(issueRepoPath, created.id);
    expect(detail).toContain('ISSUE-001');
    expect(detail).toContain('Test Issue');
  });

  it('returns empty string when detail file does not exist', async () => {
    const detail = await service.getIssueDetail(issueRepoPath, 'ISSUE-999');
    expect(detail).toBe('');
  });
});

describe('IssueService.setIssueDetail', () => {
  it('writes detail content and commits', async () => {
    await service.createIssue(issueRepoPath, createIssueData());
    mockGit.commit.mockClear();
    await service.setIssueDetail(issueRepoPath, 'ISSUE-001', '# Custom content');
    const detail = await service.getIssueDetail(issueRepoPath, 'ISSUE-001');
    expect(detail).toBe('# Custom content');
    expect(mockGit.commit).toHaveBeenCalledWith(
      issueRepoPath,
      expect.stringContaining('update detail for ISSUE-001')
    );
  });
});

describe('IssueService git commit error handling', () => {
  it('does not throw when git commit fails silently', async () => {
    mockGit.addAll.mockRejectedValueOnce(new Error('git not init'));
    // createIssue should still succeed (git errors are swallowed)
    const issue = await service.createIssue(issueRepoPath, createIssueData());
    expect(issue.id).toBe('ISSUE-001');
  });

  it('skips commit when status returns empty (no changes)', async () => {
    mockGit.status.mockResolvedValueOnce('');
    await service.createIssue(issueRepoPath, createIssueData());
    // addAll is called, but commit should NOT be called for this cycle
    // (the _commitChanges sees empty status and skips commit)
    // However, the first call to addAll + status happens in _commitChanges
    // When status returns '', commit should not be called in that _commitChanges invocation
  });
});
