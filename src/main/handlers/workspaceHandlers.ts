import { execFile } from 'child_process';
import path = require('path');
import fs = require('fs');
import { app } from 'electron';
import WorkdirSetStore = require('../services/workdirSetStore');
import RepoStore = require('../services/repoStore');
import { WorktreeInfo, WorkspaceEntry, Repository } from '../../shared/types/models';

let _setStore: InstanceType<typeof WorkdirSetStore> | null = null;
let _repoStore: InstanceType<typeof RepoStore> | null = null;

function getSetStore() {
  if (!_setStore) {
    _setStore = new WorkdirSetStore(app.getPath('userData'));
  }
  return _setStore;
}

function getRepoStore() {
  if (!_repoStore) {
    _repoStore = new RepoStore(app.getPath('userData'));
  }
  return _repoStore;
}

function _resetStores() {
  _setStore = null;
  _repoStore = null;
}

/**
 * git worktree list --porcelain 출력 파싱
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
 * execFile 래퍼 (Promise, callback 기반)
 */
function execFilePromise(cmd: string, args: string[], opts: { cwd?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * IPC 핸들러: workspace:list
 * 생성된 워크스페이스(워크트리) 경로 목록 조회
 */
async function handleList(_event: any, _data: any) {
  try {
    const sets = getSetStore().getAll()
    const seen = new Set<string>()
    const workspaces: WorkspaceEntry[] = []

    for (const set of sets) {
      if (!set.targetPath) continue

      const repos = (set.repositories || [])
        .map((r: { id: string }) => getRepoStore().getById(r.id))
        .filter(Boolean) as { id: string; name: string; path: string; addedAt: string }[]

      for (const repo of repos) {
        let worktreeOutput: string
        try {
          worktreeOutput = await execFilePromise(
            'git',
            ['worktree', 'list', '--porcelain'],
            { cwd: repo.path }
          )
        } catch {
          // git 명령 오류 발생 시 해당 레포 건너뜀
          continue
        }

        const entries = parseWorktreeList(worktreeOutput)
        for (const entry of entries) {
          const candidate = entry.worktreePath
          // 메인 레포 경로 제외
          if (candidate === repo.path) continue
          // 실제 존재 여부 확인
          if (!fs.existsSync(candidate)) continue
          // 중복 제거
          if (seen.has(candidate)) continue
          seen.add(candidate)
          workspaces.push({ path: candidate, name: path.basename(candidate) })
        }
      }
    }

    return { success: true, workspaces }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

export { handleList, _resetStores };
