/**
 * issueHandlers unit tests
 * Source: src/main/handlers/issueHandlers.ts
 */

const mockListIssues = jest.fn();
const mockGetIssue = jest.fn();
const mockCreateIssue = jest.fn();
const mockDeleteIssue = jest.fn();
const mockTransitionStatus = jest.fn();
const mockUpdateIssue = jest.fn();
const mockGetIssueDetail = jest.fn();
const mockSetIssueDetail = jest.fn();

const mockGetActiveProject = jest.fn();
const mockSetActiveProject = jest.fn();

const mockWebContentsSend = jest.fn();

let handlers: typeof import('../../../src/main/handlers/issueHandlers');

beforeEach(() => {
  jest.resetModules();

  // Mock BrowserWindow to return a window with webContents.send
  const electron = require('electron');
  electron.BrowserWindow.getAllWindows.mockReturnValue([
    { webContents: { send: mockWebContentsSend } },
  ]);

  jest.doMock('../../../src/main/services/issueService', () => {
    return jest.fn().mockImplementation(() => ({
      listIssues: mockListIssues,
      getIssue: mockGetIssue,
      createIssue: mockCreateIssue,
      deleteIssue: mockDeleteIssue,
      transitionStatus: mockTransitionStatus,
      updateIssue: mockUpdateIssue,
      getIssueDetail: mockGetIssueDetail,
      setIssueDetail: mockSetIssueDetail,
    }));
  });

  jest.doMock('../../../src/main/services/gitService', () => {
    return jest.fn().mockImplementation(() => ({}));
  });

  jest.doMock('../../../src/main/services/projectStore', () => {
    return jest.fn().mockImplementation(() => ({
      getAll: jest.fn().mockReturnValue([]),
      getById: jest.fn(),
    }));
  });

  jest.doMock('../../../src/main/services/projectManagerService', () => {
    return jest.fn().mockImplementation(() => ({
      createProject: jest.fn(),
      getActiveProject: mockGetActiveProject,
      setActiveProject: mockSetActiveProject,
    }));
  });

  // Load projectHandlers first (issueHandlers imports getManager from it)
  require('../../../src/main/handlers/projectHandlers');
  handlers = require('../../../src/main/handlers/issueHandlers');

  mockListIssues.mockReset();
  mockGetIssue.mockReset();
  mockCreateIssue.mockReset();
  mockDeleteIssue.mockReset();
  mockTransitionStatus.mockReset();
  mockUpdateIssue.mockReset();
  mockGetIssueDetail.mockReset();
  mockSetIssueDetail.mockReset();
  mockGetActiveProject.mockReset();
  mockWebContentsSend.mockReset();
});

const ACTIVE_PROJECT = {
  id: 'proj-1',
  name: 'TestProject',
  issueRepoPath: '/tmp/test-issues',
};

describe('handleIssueList', () => {
  it('returns issues for active project', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const issues = [{ id: 'ISSUE-001', title: 'First' }];
    mockListIssues.mockResolvedValue(issues);

    const result = await handlers.handleIssueList();

    expect(result).toEqual({ success: true, issues });
    expect(mockListIssues).toHaveBeenCalledWith('/tmp/test-issues');
  });

  it('returns error when no active project', async () => {
    mockGetActiveProject.mockReturnValue(null);

    const result = await handlers.handleIssueList();

    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_ACTIVE_PROJECT');
  });

  it('returns error when service throws', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockListIssues.mockRejectedValue(new Error('MANIFEST_CORRUPT'));

    const result = await handlers.handleIssueList();

    expect(result).toEqual({ success: false, error: 'MANIFEST_CORRUPT' });
  });
});

describe('handleIssueCreate', () => {
  it('creates issue and notifies renderer', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const newIssue = { id: 'ISSUE-002', title: 'New Feature' };
    mockCreateIssue.mockResolvedValue(newIssue);

    const data = { title: 'New Feature', description: 'desc', type: 'feature' };
    const result = await handlers.handleIssueCreate(null, data);

    expect(result).toEqual({ success: true, issue: newIssue });
    expect(mockCreateIssue).toHaveBeenCalledWith('/tmp/test-issues', data);
    // Should notify renderer of list update
    expect(mockWebContentsSend).toHaveBeenCalledWith('issue:list-updated', {});
  });

  it('returns error on creation failure', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockCreateIssue.mockRejectedValue(new Error('TITLE_REQUIRED'));

    const result = await handlers.handleIssueCreate(null, { title: '' });

    expect(result).toEqual({ success: false, error: 'TITLE_REQUIRED' });
  });
});

describe('handleIssueGet', () => {
  it('returns issue when found', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const issue = { id: 'ISSUE-001', title: 'Bug' };
    mockGetIssue.mockResolvedValue(issue);

    const result = await handlers.handleIssueGet(null, { issueId: 'ISSUE-001' });

    expect(result).toEqual({ success: true, issue });
    expect(mockGetIssue).toHaveBeenCalledWith('/tmp/test-issues', 'ISSUE-001');
  });

  it('returns ISSUE_NOT_FOUND when issue does not exist', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockGetIssue.mockResolvedValue(null);

    const result = await handlers.handleIssueGet(null, { issueId: 'ISSUE-999' });

    expect(result).toEqual({ success: false, error: 'ISSUE_NOT_FOUND' });
  });
});

describe('handleIssueDelete', () => {
  it('deletes issue and notifies renderer', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockDeleteIssue.mockResolvedValue(undefined);

    const result = await handlers.handleIssueDelete(null, { issueId: 'ISSUE-001' });

    expect(result).toEqual({ success: true });
    expect(mockDeleteIssue).toHaveBeenCalledWith('/tmp/test-issues', 'ISSUE-001');
    expect(mockWebContentsSend).toHaveBeenCalledWith('issue:list-updated', {});
  });

  it('returns error when deletion fails', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockDeleteIssue.mockRejectedValue(new Error('DELETE_FAIL'));

    const result = await handlers.handleIssueDelete(null, { issueId: 'ISSUE-001' });

    expect(result).toEqual({ success: false, error: 'DELETE_FAIL' });
  });
});

describe('handleIssueTransition', () => {
  it('transitions status and sends status-changed + list-updated events', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    const transitioned = { id: 'ISSUE-001', status: 'in-progress' };
    mockTransitionStatus.mockResolvedValue(transitioned);

    const result = await handlers.handleIssueTransition(null, {
      issueId: 'ISSUE-001',
      status: 'in-progress',
    });

    expect(result).toEqual({ success: true, issue: transitioned });
    expect(mockTransitionStatus).toHaveBeenCalledWith('/tmp/test-issues', 'ISSUE-001', 'in-progress');
    expect(mockWebContentsSend).toHaveBeenCalledWith('issue:status-changed', {
      issueId: 'ISSUE-001',
      status: 'in-progress',
    });
    expect(mockWebContentsSend).toHaveBeenCalledWith('issue:list-updated', {});
  });

  it('returns error on invalid transition', async () => {
    mockGetActiveProject.mockReturnValue(ACTIVE_PROJECT);
    mockTransitionStatus.mockRejectedValue(new Error('INVALID_TRANSITION'));

    const result = await handlers.handleIssueTransition(null, {
      issueId: 'ISSUE-001',
      status: 'closed',
    });

    expect(result).toEqual({ success: false, error: 'INVALID_TRANSITION' });
  });
});
