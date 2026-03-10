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

/** 워크스페이스 타입 */
export type WorkspaceType = 'worktree' | 'empty';

/** 워크스페이스 항목 */
export interface WorkspaceEntry {
  id?: string;           // 빈 워크스페이스: UUID, 워크트리 기반: undefined
  path: string;
  name: string;
  type: WorkspaceType;   // 워크스페이스 유형 식별
  createdAt?: string;    // 빈 워크스페이스만 해당
  updatedAt?: string;    // 빈 워크스페이스만 해당
}

/** 워크스페이스 영속 저장소 파일(workspaces.json) 구조 */
export interface WorkspaceFile {
  version: number;
  workspaces: StoredWorkspace[];
}

/** 저장소에 영속되는 워크스페이스 데이터 */
export interface StoredWorkspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

/** 커맨드 큐 항목 상태 */
export type QueueItemStatus = 'pending' | 'running' | 'success' | 'failed' | 'aborted' | 'retrying' | 'conflict';

/** 지원하는 파이프라인 커맨드 타입 */
export type QueueCommandType = '/add-req' | '/bugfix' | '/teams' | '/bugfix-teams' | '/merge' | '/explain';

/** 큐 항목 실행 결과 */
export interface QueueItemResult {
  sessionId?: string;
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  errorMessage?: string;
  // merge 결과 필드
  mergeCommitHash?: string;
  changedFiles?: number;
  insertions?: number;
  deletions?: number;
  conflictInfo?: MergeConflictInfo;
  resolvedFiles?: number;
}

/** 커맨드 큐 항목 */
export interface QueueItem {
  id: string;
  command: QueueCommandType;
  args: string;
  cwd: string;
  status: QueueItemStatus;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: QueueItemResult;
}

/** queue:log 채널로 전송되는 로그 메시지 */
export interface QueueLogMessage {
  itemId: string;
  type: 'assistant' | 'user' | 'result' | 'system' | 'error';
  content: string;
  timestamp: string;
}

/** queue:status-update 채널로 전송되는 상태 업데이트 */
export interface QueueStatusUpdate {
  items: QueueItem[];
  retryInfo?: {
    itemId: string;
    retryCount: number;
    nextRetryAt: string;
    remainingMs: number;
  };
}

/** Wiki Viewer 호스팅 서버 상태 */
export interface WikiHostStatus {
  running: boolean;
  url?: string;
  port?: number;
}

/** 워크스페이스 커맨드 정보 */
export interface CommandInfo {
  name: string;
  slashName: string;
  filePath: string;
  exists: boolean;
  description?: string;
}

/** 워크스페이스 스킬 정보 */
export interface SkillInfo {
  name: string;
  dirPath: string;
  exists: boolean;
  description?: string;
}

/** 워크스페이스 Claude 구성 상태 */
export interface ConfigStatus {
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  commandCount: number;
  skillCount: number;
  wikiAvailable: boolean;
}

/** 커맨드 큐 요약 (워크스페이스별) */
export interface QueueSummary {
  pending: number;
  running: number;
  success: number;
  failed: number;
  aborted: number;
  conflict: number;
  total: number;
}

/** Rate Limit 상태 */
export interface RateLimitStatus {
  isWaiting: boolean;
  remainingMs: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
}

/** Rate Limit 초과 이벤트 페이로드 */
export interface RateLimitExhaustedPayload {
  itemId: string;
  retryCount: number;
  maxRetries: number;
}

/** 활성 워크스페이스 변경 이벤트 페이로드 */
export interface ActiveWorkspaceChangedPayload {
  activeWorkspacePath: string | null;
  wikiAvailable: boolean;
}


/** Merge 충돌 정보 */
export interface MergeConflictInfo {
  sourceBranch: string;
  targetBranch: string;
  conflictFiles: ConflictFile[];
}

/** 충돌 파일 */
export interface ConflictFile {
  filePath: string;
  conflictRegions?: ConflictRegion[];
}

/** 충돌 영역 (라인 범위) */
export interface ConflictRegion {
  startLine: number;
  endLine: number;
}

/** Merge 해결 전략 */
export type MergeResolveStrategy = 'ours' | 'theirs' | 'manual';

/** 브랜치 정보 */
export interface BranchInfo {
  name: string;
  isRemote: boolean;
  lastCommitMessage?: string;
}

/** 커맨드 히스토리 항목 */
export interface CommandHistoryEntry {
  id: string;
  command: string;
  args: string;
  cwd: string;
  status: 'success' | 'failed' | 'aborted';
  executedAt: string;
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  errorMessage?: string;
}
