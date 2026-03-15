import { app, BrowserWindow } from 'electron';
import IssueService = require('../services/issueService');
import GitService = require('../services/gitService');
import ProjectStore = require('../services/projectStore');
import { getManager } from './projectHandlers';
import { IssueStatus } from '../../shared/types/issue';

let _issueService: IssueService | null = null;

function getIssueService(): IssueService {
  if (!_issueService) _issueService = new IssueService(new GitService());
  return _issueService;
}

function getActiveIssueRepoPath(): string {
  const project = getManager().getActiveProject();
  if (!project) throw new Error('NO_ACTIVE_PROJECT');
  return project.issueRepoPath;
}

function notifyIssueListUpdated(): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('issue:list-updated', {});
}

// --- Issue CRUD ---

async function handleIssueList(): Promise<{ success: boolean; issues?: any[]; error?: string }> {
  try {
    const issues = await getIssueService().listIssues(getActiveIssueRepoPath());
    return { success: true, issues };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueGet(_event: any, data: { issueId: string }): Promise<{ success: boolean; issue?: any; error?: string }> {
  try {
    const issue = await getIssueService().getIssue(getActiveIssueRepoPath(), data.issueId);
    if (!issue) return { success: false, error: 'ISSUE_NOT_FOUND' };
    return { success: true, issue };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueCreate(_event: any, data: any): Promise<{ success: boolean; issue?: any; error?: string }> {
  try {
    const issue = await getIssueService().createIssue(getActiveIssueRepoPath(), data);
    notifyIssueListUpdated();
    return { success: true, issue };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueUpdate(_event: any, data: { issueId: string; updates: any }): Promise<{ success: boolean; issue?: any; error?: string }> {
  try {
    const issue = await getIssueService().updateIssue(getActiveIssueRepoPath(), data.issueId, data.updates);
    notifyIssueListUpdated();
    return { success: true, issue };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueDelete(_event: any, data: { issueId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await getIssueService().deleteIssue(getActiveIssueRepoPath(), data.issueId);
    notifyIssueListUpdated();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueTransition(_event: any, data: { issueId: string; status: IssueStatus }): Promise<{ success: boolean; issue?: any; error?: string }> {
  try {
    const issue = await getIssueService().transitionStatus(getActiveIssueRepoPath(), data.issueId, data.status);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('issue:status-changed', { issueId: issue.id, status: issue.status });
    notifyIssueListUpdated();
    return { success: true, issue };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueGetDetail(_event: any, data: { issueId: string }): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const content = await getIssueService().getIssueDetail(getActiveIssueRepoPath(), data.issueId);
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueSetDetail(_event: any, data: { issueId: string; content: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await getIssueService().setIssueDetail(getActiveIssueRepoPath(), data.issueId, data.content);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Issue Start/Abort/Retry (PipelineOrchestrator 연동) ---

async function handleIssueStart(_event: any, data: { issueId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };

    const { startIssueProcessing } = require('./pipelineHandlers');
    await startIssueProcessing(project.id, data.issueId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueAbort(_event: any, data: { issueId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };

    const { abortIssueProcessing } = require('./pipelineHandlers');
    await abortIssueProcessing(project.id, data.issueId);
    notifyIssueListUpdated();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIssueRetry(_event: any, data: { issueId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const project = getManager().getActiveProject();
    if (!project) return { success: false, error: 'NO_ACTIVE_PROJECT' };

    const { retryIssueProcessing } = require('./pipelineHandlers');
    await retryIssueProcessing(project.id, data.issueId);
    notifyIssueListUpdated();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function _resetIssueService(): void {
  _issueService = null;
}

export {
  handleIssueList,
  handleIssueGet,
  handleIssueCreate,
  handleIssueUpdate,
  handleIssueDelete,
  handleIssueTransition,
  handleIssueGetDetail,
  handleIssueSetDetail,
  handleIssueStart,
  handleIssueAbort,
  handleIssueRetry,
  _resetIssueService,
};
