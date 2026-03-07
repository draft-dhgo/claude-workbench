/** 등록된 Git 저장소 */
export interface Repository {
  id: string;
  name: string;
  path: string;
  addedAt: string;
}

/** 저장소 파일(repositories.json) 구조 */
export interface RepoFile {
  version: number;
  repositories: Repository[];
}

/** 세트 내 저장소 참조 (baseBranch 포함) */
export interface RepoRef {
  id: string;
  baseBranch: string;
}

/** 워크디렉토리 세트 */
export interface WorkdirSet {
  id: string;
  name: string;
  repositories: RepoRef[];
  createdAt: string;
  updatedAt: string;
  targetPath?: string;
}

/** 세트 파일(workdir-sets.json) v2 구조 */
export interface WorkdirSetFileV2 {
  version: number;
  sets: WorkdirSet[];
}

/** v1 세트 (마이그레이션 전) */
export interface WorkdirSetV1 {
  id: string;
  name: string;
  repositoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 워크트리 정보 */
export interface WorktreeInfo {
  worktreePath: string;
  branch: string | null;
}

/** 워크트리 + push 상태 */
export interface WorktreeWithPushStatus extends WorktreeInfo {
  isPushed: boolean;
}

/** 워크스페이스 항목 */
export interface WorkspaceEntry {
  path: string;
  name: string;
}
