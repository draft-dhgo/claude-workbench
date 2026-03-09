import { execFile } from 'child_process';
import path = require('path');
import fs = require('fs');
import { app } from 'electron';
import WorkdirSetStore = require('../services/workdirSetStore');
import RepoStore = require('../services/repoStore');
import WorkspaceStore = require('../services/workspaceStore');
import { WorktreeInfo, WorkspaceEntry } from '../../shared/types/models';
import { buildDefaultClaudeMd, buildWikiViewerHtml } from '../constants/claudeConfigDefaults';

let _setStore: InstanceType<typeof WorkdirSetStore> | null = null;
let _repoStore: InstanceType<typeof RepoStore> | null = null;
let _workspaceStore: InstanceType<typeof WorkspaceStore> | null = null;

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

function getWorkspaceStore() {
  if (!_workspaceStore) {
    _workspaceStore = new WorkspaceStore(app.getPath('userData'));
  }
  return _workspaceStore;
}

function _resetStores() {
  _setStore = null;
  _repoStore = null;
  _workspaceStore = null;
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
 * 생성된 워크스페이스(워크트리 + 빈 워크스페이스) 경로 목록 조회
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
          workspaces.push({
            path: candidate,
            name: path.basename(candidate),
            type: 'worktree'
          })
        }
      }
    }

    // 빈 워크스페이스 병합
    const stored = getWorkspaceStore().getAll();
    for (const sw of stored) {
      if (seen.has(sw.path)) continue;  // 중복 제거 (path 기준)
      seen.add(sw.path);
      workspaces.push({
        id: sw.id,
        path: sw.path,
        name: sw.name,
        type: 'empty',
        createdAt: sw.createdAt,
        updatedAt: sw.updatedAt
      });
    }

    return { success: true, workspaces }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * IPC 핸들러: workspace:create
 * 빈 워크스페이스 생성
 */
async function handleCreate(_event: any, data: { name?: string; parentPath?: string; lang?: string }) {
  const name = (data?.name || '').trim();
  if (!name) {
    return { success: false, error: 'EMPTY_NAME' };
  }

  const parentPath = data?.parentPath;
  if (!parentPath) {
    return { success: false, error: 'PATH_REQUIRED' };
  }

  const dirPath = path.join(parentPath, name);

  try {
    // 1. 디렉토리 생성
    fs.mkdirSync(dirPath, { recursive: true });

    // 2. .claude/ 폴더 생성
    fs.mkdirSync(path.join(dirPath, '.claude'), { recursive: true });

    // 3. CLAUDE.md 생성
    const lang = (data?.lang === 'ko') ? 'ko' : 'en';
    const claudeMdContent = buildDefaultClaudeMd(name, lang as any);
    fs.writeFileSync(path.join(dirPath, 'CLAUDE.md'), claudeMdContent, 'utf-8');

    // 4. wiki/ 스캐폴딩
    const wikiDirs = ['requirements', 'prd', 'specs', 'tests', 'tdd', 'deploy', 'bugfix', 'bugs', 'knowledge', 'mockups', 'views'];
    for (const d of wikiDirs) {
      fs.mkdirSync(path.join(dirPath, 'wiki', d), { recursive: true });
    }
    fs.writeFileSync(path.join(dirPath, 'wiki', 'bugs', 'README.md'), '# Bug Reports\n\n| ID | 설명 | 상태 |\n|----|------|------|\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'requirements', 'README.md'), '# Requirements\n\n| ID | 제목 | 상태 |\n|----|------|------|\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'knowledge', 'architecture.md'), '# Architecture\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'knowledge', 'conventions.md'), '# Conventions\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'knowledge', 'dependencies.md'), '# Dependencies\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'knowledge', 'gotchas.md'), '# Gotchas\n', 'utf-8');
    fs.writeFileSync(path.join(dirPath, 'wiki', 'views', 'index.html'), buildWikiViewerHtml(), 'utf-8');

    // 5. 영속 저장소에 등록
    const workspace = getWorkspaceStore().create(name, dirPath);

    return {
      success: true,
      workspace: {
        id: workspace.id,
        path: workspace.path,
        name: workspace.name,
        type: 'empty' as const,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * IPC 핸들러: workspace:update
 * 워크스페이스 이름 변경
 */
async function handleUpdate(_event: any, data: { id?: string; name?: string }) {
  const id = data?.id;
  if (!id) {
    return { success: false, error: 'ID_REQUIRED' };
  }

  const name = (data?.name || '').trim();
  if (!name) {
    return { success: false, error: 'EMPTY_NAME' };
  }

  try {
    const workspace = getWorkspaceStore().update(id, { name });
    return {
      success: true,
      workspace: {
        id: workspace.id,
        path: workspace.path,
        name: workspace.name,
        type: 'empty' as const,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * IPC 핸들러: workspace:delete
 * 워크스페이스 삭제 (레코드만 제거)
 */
async function handleDelete(_event: any, data: { id?: string }) {
  const id = data?.id;
  if (!id) {
    return { success: false, error: 'ID_REQUIRED' };
  }

  try {
    const removed = getWorkspaceStore().remove(id);
    if (!removed) {
      return { success: false, error: 'NOT_FOUND' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export { handleList, handleCreate, handleUpdate, handleDelete, _resetStores };
