import path = require('path');
import fs = require('fs');
import { app } from 'electron';
import WorkspaceStore = require('../services/workspaceStore');
import { WorktreeInfo, WorkspaceEntry } from '../../shared/types/models';
import { buildDefaultClaudeMd, buildWikiViewerHtml } from '../constants/claudeConfigDefaults';

let _workspaceStore: InstanceType<typeof WorkspaceStore> | null = null;

function getWorkspaceStore() {
  if (!_workspaceStore) {
    _workspaceStore = new WorkspaceStore(app.getPath('userData'));
  }
  return _workspaceStore;
}

function _resetStores() {
  _workspaceStore = null;
}

/**
 * IPC 핸들러: workspace:list
 * WorkspaceStore 직접 조회 (SDD-0027: Sets/Worktree 참조 제거)
 */
async function handleList(_event: any, _data: any) {
  try {
    const stored = getWorkspaceStore().getAll();
    const workspaces: WorkspaceEntry[] = stored.map(sw => ({
      id: sw.id,
      path: sw.path,
      name: sw.name,
      type: 'empty' as const,
      createdAt: sw.createdAt,
      updatedAt: sw.updatedAt
    }));
    return { success: true, workspaces };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * IPC 핸들러: workspace:register
 * 기존 디렉토리를 워크스페이스로 등록 (SDD-0027 신규)
 */
async function handleRegister(_event: any, data: { path?: string; name?: string }) {
  const dirPath = data?.path;
  if (!dirPath) return { success: false, error: 'PATH_REQUIRED' };
  const name = (data?.name || path.basename(dirPath)).trim();
  try {
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

export { handleList, handleRegister, handleCreate, handleUpdate, handleDelete, _resetStores };
