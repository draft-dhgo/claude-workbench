import { execFile } from 'child_process';
import path = require('path');
import fs = require('fs');
import { app, BrowserWindow, dialog } from 'electron';
import WorkdirSetStore = require('../services/workdirSetStore');
import RepoStore = require('../services/repoStore');
import { WorktreeInfo, WorktreeWithPushStatus } from '../../shared/types/models';

let _setStore: InstanceType<typeof WorkdirSetStore> | null;
let _repoStore: InstanceType<typeof RepoStore> | null;

function getSetStore() {
  if (!_setStore) {
    _setStore = new WorkdirSetStore(app.getPath('userData'))
  }
  return _setStore
}

function getRepoStore() {
  if (!_repoStore) {
    _repoStore = new RepoStore(app.getPath('userData'))
  }
  return _repoStore
}

function _resetStores() {
  _setStore = null
  _repoStore = null
}

/**
 * execFile 래퍼 (Promise)
 */
function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

/**
 * 세트 내 저장소들의 브랜치 목록 조회
 */
async function handleListBranches(event: any, data: { setId: string }) {
  const { setId } = data || {}
  const set = getSetStore().getById(setId)
  if (!set) return { success: false, error: 'NOT_FOUND' }

  const allRepos = getRepoStore().getAll()
  const repos = set.repositories
    .map(r => allRepos.find(repo => repo.id === r.id))
    .filter(Boolean) as { id: string; name: string; path: string; addedAt: string }[]

  if (repos.length === 0) {
    return { success: true, branches: [], commonBranches: [], repoBranches: [] }
  }

  // 각 저장소에서 브랜치 목록 수집 (오류 발생 시 해당 저장소 제외)
  const repoBranches: { repoId: string; branches: string[] }[] = []
  for (const repo of repos) {
    try {
      const output = await execGit(['branch', '-a', '--format=%(refname:short)'], repo.path)
      const branches = output
        .split('\n')
        .map(b => b.trim())
        .filter(Boolean)
      repoBranches.push({ repoId: repo.id, branches })
    } catch {
      // 해당 저장소 건너뜀
    }
  }

  if (repoBranches.length === 0) {
    return { success: true, branches: [], commonBranches: [], repoBranches: [] }
  }

  // 브랜치 등장 횟수 집계
  const branchCount = new Map<string, number>()
  for (const { branches } of repoBranches) {
    for (const b of branches) {
      branchCount.set(b, (branchCount.get(b) || 0) + 1)
    }
  }

  const totalRepos = repos.length
  const commonBranches: string[] = []
  const otherBranches: string[] = []

  const allBranchNames = [...branchCount.keys()]
  allBranchNames.sort()

  for (const b of allBranchNames) {
    if (branchCount.get(b) === totalRepos) {
      commonBranches.push(b)
    } else {
      otherBranches.push(b)
    }
  }

  const branches = [...commonBranches, ...otherBranches]

  return { success: true, branches, commonBranches, repoBranches }
}

/**
 * 세트 내 모든 저장소에 git fetch 실행
 */
async function handleFetch(event: any, data: { setId: string }) {
  const { setId } = data || {}
  const set = getSetStore().getById(setId)
  if (!set) return { success: false, error: 'NOT_FOUND' }

  const allRepos = getRepoStore().getAll()
  const repos = set.repositories
    .map(r => allRepos.find(repo => repo.id === r.id))
    .filter(Boolean) as { id: string; name: string; path: string; addedAt: string }[]

  // 병렬로 fetch 실행
  const fetchResults = await Promise.all(
    repos.map(async repo => {
      try {
        await execGit(['fetch', '--all'], repo.path)
        return { repoId: repo.id, repoName: repo.name, status: 'success' as const }
      } catch (err: any) {
        return { repoId: repo.id, repoName: repo.name, status: 'error' as const, message: err.message }
      }
    })
  )

  // fetch 후 갱신된 브랜치 목록 조회
  const branchResult = await handleListBranches(event, { setId })

  return {
    success: true,
    results: fetchResults,
    branches: branchResult.branches || [],
    commonBranches: branchResult.commonBranches || []
  }
}

/**
 * 워크트리 일괄 생성
 */
async function handleCreateAll(event: any, data: { setId: string; newBranch: string; targetPath: string; repos: { id: string; path: string; name: string; baseBranch: string }[] }) {
  const { setId, newBranch, targetPath, repos: repoSpecs } = data || {}
  const set = getSetStore().getById(setId)
  if (!set) return { success: false, error: 'NOT_FOUND' }

  const succeeded: string[] = []
  const failed: { repoId: string; repoName: string; error: string }[] = []

  const sendProgress = (payload: { repoId: string; repoName: string; status: string; message: string }) => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('worktree:progress', payload)
    }
  }

  for (const repoSpec of repoSpecs) {
    sendProgress({
      repoId: repoSpec.id,
      repoName: repoSpec.name,
      status: 'running',
      message: '처리 중...'
    })

    try {
      const worktreePath = path.join(targetPath, repoSpec.name, newBranch)
      await execGit(
        ['worktree', 'add', '-b', newBranch, worktreePath, repoSpec.baseBranch],
        repoSpec.path
      )
      succeeded.push(repoSpec.id)
      sendProgress({
        repoId: repoSpec.id,
        repoName: repoSpec.name,
        status: 'success',
        message: '완료'
      })
    } catch (err: any) {
      const errMsg = err.message || ''
      const userMessage = errMsg.includes('already exists')
        ? '브랜치 이미 존재'
        : `오류: ${errMsg}`
      failed.push({ repoId: repoSpec.id, repoName: repoSpec.name, error: userMessage })
      sendProgress({
        repoId: repoSpec.id,
        repoName: repoSpec.name,
        status: 'error',
        message: userMessage
      })
    }
  }

  return { success: true, succeeded, failed }
}

/**
 * 워크트리 생성 경로 선택 다이얼로그
 */
async function handleSelectPath(event: any) {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false }
  }
  return { success: true, path: result.filePaths[0] }
}

/**
 * git worktree list --porcelain 출력 파싱
 * 반환: [{ worktreePath, branch }]  (branch: null = detached HEAD)
 */
function parseWorktreeList(output: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = []
  const blocks = output.split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    if (lines.length === 0) continue
    const pathLine = lines.find(l => l.startsWith('worktree '))
    if (!pathLine) continue
    const worktreePath = pathLine.slice('worktree '.length)
    const branchLine = lines.find(l => l.startsWith('branch '))
    let branch: string | null = null
    if (branchLine) {
      const ref = branchLine.slice('branch '.length)
      branch = ref.replace(/^refs\/heads\//, '')
    }
    worktrees.push({ worktreePath, branch })
  }
  return worktrees
}

/**
 * git branch -vv 출력 파싱
 * 반환: Set<string> — upstream이 있고 [gone]이 아닌 브랜치명 집합
 */
function parsePushedBranches(output: string): Set<string> {
  const pushed = new Set<string>()
  const lines = output.split('\n').filter(Boolean)
  for (const line of lines) {
    // 포맷: "* branchname  hash [upstream] message" 또는 "  branchname  hash message"
    const match = line.match(/^\*?\s+(\S+)\s+\S+\s+(\[.*?\])?/)
    if (!match) continue
    const branchName = match[1]
    const upstreamInfo = match[2] || ''
    if (upstreamInfo && !upstreamInfo.includes('gone')) {
      pushed.add(branchName)
    }
  }
  return pushed
}

/**
 * 내부 헬퍼: 레포의 워크트리 목록 + push 상태를 반환
 */
async function getWorktreesWithPushStatus(repoPath: string): Promise<WorktreeWithPushStatus[]> {
  const worktreeOutput = await execGit(['worktree', 'list', '--porcelain'], repoPath)
  const worktrees = parseWorktreeList(worktreeOutput)
  const branchOutput = await execGit(['branch', '-vv'], repoPath)
  const pushedSet = parsePushedBranches(branchOutput)
  return worktrees.map(wt => ({
    worktreePath: wt.worktreePath,
    branch: wt.branch,
    isPushed: wt.branch ? pushedSet.has(wt.branch) : true
  }))
}

/**
 * 단일 레포의 워크트리 목록 및 push 여부 조회
 */
async function handleListByRepo(event: any, data: { repoId: string }) {
  const { repoId } = data || {}
  const allRepos = getRepoStore().getAll()
  const repo = allRepos.find(r => r.id === repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  const result = await getWorktreesWithPushStatus(repo.path)
  return { success: true, worktrees: result }
}

/**
 * 특정 워크트리 제거 및 로컬 브랜치 삭제
 */
async function handleDeleteWorktree(event: any, data: { repoId: string; worktreePath: string; branch: string }) {
  const { repoId, worktreePath, branch } = data || {}
  const allRepos = getRepoStore().getAll()
  const repo = allRepos.find(r => r.id === repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  try {
    await execGit(['worktree', 'remove', '--force', worktreePath], repo.path)
    await execGit(['branch', '-D', branch], repo.path)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 개별 레포 워크트리 클론
 * Channel: worktree:create-single
 */
async function handleCreateSingle(
  event: any,
  data: { repoId: string; baseBranch: string; newBranch: string; targetPath: string }
): Promise<{ success: boolean; worktreePath?: string; error?: string }> {
  const { repoId, baseBranch, newBranch, targetPath } = data || {}
  const repo = getRepoStore().getById(repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  const worktreePath = path.join(targetPath, repo.name, newBranch)

  const sendProgress = (payload: { repoId: string; repoName: string; status: string; message: string }) => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('worktree:progress', payload)
    }
  }

  sendProgress({ repoId, repoName: repo.name, status: 'running', message: '처리 중...' })

  try {
    await execGit(
      ['worktree', 'add', '-b', newBranch, worktreePath, baseBranch],
      repo.path
    )
    sendProgress({ repoId, repoName: repo.name, status: 'success', message: '완료' })
    return { success: true, worktreePath }
  } catch (err: any) {
    const errMsg = err.message || ''
    const userMessage = errMsg.includes('already exists')
      ? '브랜치 이미 존재'
      : `오류: ${errMsg}`
    sendProgress({ repoId, repoName: repo.name, status: 'error', message: userMessage })
    return { success: false, error: userMessage }
  }
}

/**
 * 단일 레포 브랜치 목록 조회
 * Channel: worktree:list-branches-single
 */
async function handleListBranchesSingle(
  event: any,
  data: { repoId: string }
): Promise<{ success: boolean; branches?: string[]; error?: string }> {
  const { repoId } = data || {}
  const repo = getRepoStore().getById(repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  try {
    const output = await execGit(['branch', '-a', '--format=%(refname:short)'], repo.path)
    const branches = output
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean)
    return { success: true, branches }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 단일 레포 git fetch --all
 * Channel: worktree:fetch-single
 */
async function handleFetchSingle(
  event: any,
  data: { repoId: string }
): Promise<{ success: boolean; error?: string }> {
  const { repoId } = data || {}
  const repo = getRepoStore().getById(repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  try {
    await execGit(['fetch', '--all'], repo.path)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * push되지 않은 워크트리 목록 조회
 * Channel: worktree:list-unpushed
 */
async function handleListUnpushed(
  event: any,
  data: { repoId: string }
): Promise<{ success: boolean; worktrees?: WorktreeWithPushStatus[]; error?: string }> {
  const { repoId } = data || {}
  const allRepos = getRepoStore().getAll()
  const repo = allRepos.find(r => r.id === repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  try {
    const allWorktrees = await getWorktreesWithPushStatus(repo.path)
    const unpushed = allWorktrees.filter(wt => !wt.isPushed)
    return { success: true, worktrees: unpushed }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 워크트리 연결 해제 (파일 보존, git 메타데이터만 제거)
 * Channel: worktree:detach
 */
async function handleDetachWorktree(
  event: any,
  data: { repoId: string; worktreePath: string; branch: string }
): Promise<{ success: boolean; error?: string }> {
  const { repoId, worktreePath, branch } = data || {}
  const allRepos = getRepoStore().getAll()
  const repo = allRepos.find(r => r.id === repoId)
  if (!repo) return { success: false, error: 'NOT_FOUND' }

  const sendProgress = (payload: { repoId: string; repoName: string; status: string; message: string }) => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('worktree:progress', payload)
    }
  }

  sendProgress({ repoId, repoName: repo.name, status: 'running', message: '연결 해제 중...' })

  // Step A: .git 파일 검증 및 읽기
  const dotGitPath = path.join(worktreePath, '.git')
  if (!fs.existsSync(dotGitPath)) {
    return { success: false, error: 'DOTGIT_NOT_FOUND' }
  }
  if (!fs.statSync(dotGitPath).isFile()) {
    return { success: false, error: 'NOT_WORKTREE' }
  }

  const dotGitContent = fs.readFileSync(dotGitPath, 'utf-8')
  const worktreeGitDir = dotGitContent.replace(/^gitdir:\s*/, '').trim()

  // Step B: git 메타데이터 제거
  try {
    fs.unlinkSync(dotGitPath)
  } catch (err: any) {
    return { success: false, error: err.message }
  }

  if (fs.existsSync(worktreeGitDir)) {
    try {
      fs.rmSync(worktreeGitDir, { recursive: true, force: true })
    } catch {
      // warning: .git/worktrees/ 정리 실패, git worktree prune으로 후속 정리 가능
    }
  }

  // Step C: 로컬 브랜치 삭제
  try {
    await execGit(['branch', '-D', branch], repo.path)
  } catch {
    // warning: 브랜치 삭제 실패, 수동 삭제 필요
  }

  // Step D: 완료
  sendProgress({ repoId, repoName: repo.name, status: 'success', message: '연결 해제 완료' })
  return { success: true }
}

/**
 * 레포 경로로 직접 워크트리 목록 조회 (workspaceHandlers 위임용)
 */
async function handleListByRepoPath(
  _event: any,
  data: { repoPath: string }
): Promise<{ success: boolean; worktrees?: WorktreeWithPushStatus[]; error?: string }> {
  const { repoPath } = data || {};
  if (!repoPath) return { success: false, error: 'REPO_PATH_REQUIRED' };

  try {
    const result = await getWorktreesWithPushStatus(repoPath);
    return { success: true, worktrees: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export {
  handleListBranches,
  handleFetch,
  handleCreateAll,
  handleSelectPath,
  handleListByRepo,
  handleListByRepoPath,
  handleDeleteWorktree,
  handleCreateSingle,
  handleListBranchesSingle,
  handleFetchSingle,
  handleListUnpushed,
  handleDetachWorktree,
  _resetStores
};
