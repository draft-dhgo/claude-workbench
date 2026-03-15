/**
 * UX Improvements — TDD Tests
 * 5 cycles: form simplification, log filter, diff summary, reject, stepper
 */

// ============================================================
// Cycle 1: Issue form simplification — auto-map type → pipelineCommand
// ============================================================

const mockGitAddAll = jest.fn().mockResolvedValue(undefined);
const mockGitStatus = jest.fn().mockResolvedValue('');
const mockGitCommit = jest.fn().mockResolvedValue(undefined);
const mockGitExec = jest.fn().mockResolvedValue('');
const mockGitPush = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/main/services/gitService', () => {
  return jest.fn().mockImplementation(() => ({
    addAll: mockGitAddAll,
    status: mockGitStatus,
    commit: mockGitCommit,
    exec: mockGitExec,
    push: mockGitPush,
  }));
});

import fs = require('fs');
import path = require('path');
import os = require('os');

let IssueService: typeof import('../../src/main/services/issueService');
let tmpDir: string;

beforeEach(() => {
  jest.clearAllMocks();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-ux-'));
  fs.mkdirSync(path.join(tmpDir, 'issues', 'details'), { recursive: true });

  IssueService = require('../../src/main/services/issueService');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Cycle 1: Issue form — auto-map type to pipelineCommand', () => {
  it('auto-maps type=feature to /teams when pipelineCommand is omitted', async () => {
    const svc = new IssueService();
    const issue = await svc.createIssue(tmpDir, {
      title: 'Add login',
      description: 'JWT login',
      type: 'feature',
      baseBranch: 'main',
      priority: 'medium',
    } as any);

    expect(issue.pipelineCommand).toBe('/teams');
  });

  it('auto-maps type=bugfix to /bugfix-teams when pipelineCommand is omitted', async () => {
    const svc = new IssueService();
    const issue = await svc.createIssue(tmpDir, {
      title: 'Fix crash',
      description: 'null ref',
      type: 'bugfix',
      baseBranch: 'main',
      priority: 'high',
    } as any);

    expect(issue.pipelineCommand).toBe('/bugfix-teams');
  });

  it('respects explicit pipelineCommand even if type differs', async () => {
    const svc = new IssueService();
    const issue = await svc.createIssue(tmpDir, {
      title: 'Hotfix via teams',
      description: 'using teams pipeline for bugfix',
      type: 'bugfix',
      baseBranch: 'main',
      priority: 'medium',
      pipelineCommand: '/teams',
    } as any);

    expect(issue.pipelineCommand).toBe('/teams');
  });
});

// ============================================================
// Cycle 2: Pipeline log filter by issue
// ============================================================

describe('Cycle 2: Pipeline log filter logic', () => {
  // Pure function that should be extracted for testability
  const { filterLogsByIssue } = require('../../src/renderer/scripts/logFilter');

  const logs = [
    { tag: 'ISSUE-001', type: 'system', content: 'Starting pipeline' },
    { tag: 'ISSUE-002', type: 'assistant', content: 'Writing code' },
    { tag: 'ISSUE-001', type: 'result', content: 'Pipeline completed' },
    { tag: '', type: 'system', content: 'Global message' },
    { tag: 'ISSUE-003', type: 'error', content: 'Failed' },
  ];

  it('returns all logs when filter is "all"', () => {
    expect(filterLogsByIssue(logs, 'all')).toEqual(logs);
  });

  it('filters logs by specific issue tag', () => {
    const filtered = filterLogsByIssue(logs, 'ISSUE-001');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((l: any) => l.tag === 'ISSUE-001')).toBe(true);
  });

  it('returns empty array when no logs match', () => {
    expect(filterLogsByIssue(logs, 'ISSUE-999')).toEqual([]);
  });

  it('extracts unique issue tags from logs', () => {
    const { getUniqueTags } = require('../../src/renderer/scripts/logFilter');
    const tags = getUniqueTags(logs);
    expect(tags).toEqual(['ISSUE-001', 'ISSUE-002', 'ISSUE-003']);
  });
});

// ============================================================
// Cycle 3: Diff summary — collect git diff --stat after pipeline completion
// ============================================================

describe('Cycle 3: Diff summary in IssueResult', () => {
  it('IssueResult supports diffSummary field', () => {
    // Type-level check: ensure IssueResult interface has diffSummary
    const result: import('../../src/shared/types/issue').IssueResult = {
      testsPassed: true,
      costUsd: 0.12,
      durationMs: 5000,
      diffSummary: {
        filesChanged: 3,
        insertions: 142,
        deletions: 23,
        files: [
          { path: 'src/auth/jwt.ts', insertions: 98, deletions: 0, status: 'added' },
          { path: 'src/routes/login.ts', insertions: 32, deletions: 15, status: 'modified' },
          { path: 'src/old.ts', insertions: 0, deletions: 8, status: 'deleted' },
        ],
      },
    };

    expect(result.diffSummary!.filesChanged).toBe(3);
    expect(result.diffSummary!.files).toHaveLength(3);
    expect(result.diffSummary!.files[0].status).toBe('added');
  });
});

// ============================================================
// Cycle 4: Reject action — reset completed issue back to created
// ============================================================

describe('Cycle 4: Reject action', () => {
  const mockGetById = jest.fn();
  const mockGetIssue = jest.fn();
  const mockTransitionStatus = jest.fn();
  const mockUpdateIssue = jest.fn();
  const mockWebContentsSend = jest.fn();

  let PipelineOrchestratorService: typeof import('../../src/main/services/pipelineOrchestratorService');

  beforeEach(() => {
    jest.resetModules();

    const electron = require('electron');
    electron.BrowserWindow.getAllWindows.mockReturnValue([
      { webContents: { send: mockWebContentsSend } },
    ]);

    PipelineOrchestratorService = require('../../src/main/services/pipelineOrchestratorService');
    mockGetById.mockReset();
    mockGetIssue.mockReset();
    mockTransitionStatus.mockReset();
    mockUpdateIssue.mockReset();
    mockWebContentsSend.mockReset();
  });

  it('rejects a completed issue back to created status', async () => {
    const project = { id: 'proj-1', issueRepoPath: '/tmp/issues', devRepos: [] };
    const issue = { id: 'ISSUE-001', status: 'completed', issueBranch: 'issue/ISSUE-001', baseBranch: 'main' };

    mockGetById.mockReturnValue(project);
    mockGetIssue.mockResolvedValue(issue);
    mockTransitionStatus.mockResolvedValue({ ...issue, status: 'created' });

    const orchestrator = new PipelineOrchestratorService(
      { getContainerByIssue: jest.fn(), updateContainerStatus: jest.fn(), releaseContainer: jest.fn() } as any,
      { getIssue: mockGetIssue, transitionStatus: mockTransitionStatus, updateIssue: mockUpdateIssue } as any,
      {} as any,
      {} as any,
      {} as any,
      { getById: mockGetById } as any,
    );

    await orchestrator.rejectIssue('proj-1', 'ISSUE-001');

    expect(mockTransitionStatus).toHaveBeenCalledWith('/tmp/issues', 'ISSUE-001', 'created');
  });

  it('throws when rejecting a non-completed issue', async () => {
    const project = { id: 'proj-1', issueRepoPath: '/tmp/issues', devRepos: [] };
    const issue = { id: 'ISSUE-001', status: 'in-progress' };

    mockGetById.mockReturnValue(project);
    mockGetIssue.mockResolvedValue(issue);

    const orchestrator = new PipelineOrchestratorService(
      {} as any,
      { getIssue: mockGetIssue, transitionStatus: mockTransitionStatus } as any,
      {} as any,
      {} as any,
      {} as any,
      { getById: mockGetById } as any,
    );

    await expect(orchestrator.rejectIssue('proj-1', 'ISSUE-001'))
      .rejects.toThrow('ISSUE_NOT_COMPLETED');
  });
});

// ============================================================
// Cycle 5: Status stepper — pure function for stepper state
// ============================================================

describe('Cycle 5: Status stepper logic', () => {
  const { getStepperState } = require('../../src/renderer/scripts/statusStepper');

  const STEPS = ['created', 'in-progress', 'completed', 'merged'];

  it('returns correct stepper for created status', () => {
    const state = getStepperState('created');
    expect(state).toEqual([
      { label: 'Created', status: 'active' },
      { label: 'In Progress', status: 'pending' },
      { label: 'Completed', status: 'pending' },
      { label: 'Merged', status: 'pending' },
    ]);
  });

  it('returns correct stepper for in-progress status', () => {
    const state = getStepperState('in-progress');
    expect(state).toEqual([
      { label: 'Created', status: 'done' },
      { label: 'In Progress', status: 'active' },
      { label: 'Completed', status: 'pending' },
      { label: 'Merged', status: 'pending' },
    ]);
  });

  it('returns correct stepper for completed status', () => {
    const state = getStepperState('completed');
    expect(state).toEqual([
      { label: 'Created', status: 'done' },
      { label: 'In Progress', status: 'done' },
      { label: 'Completed', status: 'active' },
      { label: 'Merged', status: 'pending' },
    ]);
  });

  it('returns correct stepper for merged status', () => {
    const state = getStepperState('merged');
    expect(state).toEqual([
      { label: 'Created', status: 'done' },
      { label: 'In Progress', status: 'done' },
      { label: 'Completed', status: 'done' },
      { label: 'Merged', status: 'done' },
    ]);
  });

  it('handles failed status — marks current step as failed', () => {
    const state = getStepperState('failed');
    expect(state).toEqual([
      { label: 'Created', status: 'done' },
      { label: 'In Progress', status: 'done' },
      { label: 'Failed', status: 'failed' },
      { label: 'Merged', status: 'pending' },
    ]);
  });
});
