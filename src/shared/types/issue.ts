/** 이슈 상태 */
export type IssueStatus =
  | 'created'
  | 'in-progress'
  | 'completed'
  | 'merging'
  | 'merged'
  | 'failed'
  | 'closed';

/** 이슈 유형 */
export type IssueType = 'feature' | 'bugfix';

/** 이슈 우선순위 */
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

/** 이슈: 작업 단위 (신규 기능 또는 버그 수정) */
export interface Issue {
  /** 자동 생성 ID (e.g., "ISSUE-001") */
  id: string;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  /** 작업 시작 브랜치 (merge 대상도 동일) */
  baseBranch: string;
  /** 자동 생성 작업 브랜치 (e.g., "issue/ISSUE-001") */
  issueBranch: string;
  priority: IssuePriority;
  /** 현재 할당된 dev container ID */
  assignedContainerId?: string;
  /** 실행할 파이프라인 커맨드 */
  pipelineCommand: '/teams' | '/bugfix-teams';
  /** 파이프라인 추가 인자 */
  pipelineArgs?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: IssueResult;
}

/** Diff 파일 정보 */
export interface DiffFileSummary {
  path: string;
  insertions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted';
}

/** Diff 요약 */
export interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: DiffFileSummary[];
}

/** 이슈 실행 결과 */
export interface IssueResult {
  mergeCommitHash?: string;
  testsPassed?: boolean;
  reviewPassed?: boolean;
  costUsd?: number;
  durationMs?: number;
  errorMessage?: string;
  diffSummary?: DiffSummary;
  /** 파이프라인 실행 시도 횟수 */
  retryCount?: number;
}

/** 이슈 매니페스트: issue repo 내 issues/manifest.json 구조 */
export interface IssueManifest {
  version: number;
  /** 다음 이슈 ID 자동 증분 카운터 */
  nextId: number;
  issues: Issue[];
}

/** 이슈 생성 요청 데이터 */
export interface CreateIssueData {
  title: string;
  description: string;
  type: IssueType;
  baseBranch: string;
  priority: IssuePriority;
  pipelineCommand: '/teams' | '/bugfix-teams';
  pipelineArgs?: string;
  labels?: string[];
}

/** 이슈 목록 필터 */
export interface IssueFilter {
  status?: IssueStatus[];
  type?: IssueType;
  priority?: IssuePriority[];
  search?: string;
}
