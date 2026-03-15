/** Dev Container 상태 */
export type ContainerStatus =
  | 'idle'           // pool에서 대기 중
  | 'provisioning'   // 생성/브랜치 설정 중
  | 'running'        // 파이프라인 실행 중
  | 'completing'     // 테스트/리뷰/merge 진행 중
  | 'error'          // 오류 발생
  | 'destroying';    // 정리 중

/** Dev Container: Docker devcontainer + git worktree 기반 격리 작업 환경 */
export interface DevContainer {
  id: string;
  projectId: string;
  /** Docker 컨테이너 ID (미생성 시 undefined) */
  dockerContainerId?: string;
  status: ContainerStatus;
  /** 현재 할당된 이슈 ID */
  assignedIssueId?: string;
  /** worktree 기본 경로 */
  worktreeBasePath: string;
  /** 각 dev repo의 worktree 정보 */
  worktrees: ContainerWorktree[];
  createdAt: string;
  lastUsedAt?: string;
}

/** 컨테이너 내 dev repo worktree */
export interface ContainerWorktree {
  devRepoId: string;
  devRepoName: string;
  worktreePath: string;
  branch: string;
}

/** 컨테이너 로그 항목 */
export interface ContainerLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  /** 실행 단계 */
  phase?: 'provisioning' | 'branch-setup' | 'pipeline' | 'test' | 'review' | 'merge' | 'cleanup';
}

/** 컨테이너 풀 상태 */
export interface ContainerPoolState {
  projectId: string;
  maxContainers: number;
  containers: DevContainer[];
  /** 컨테이너 할당 대기 중인 이슈 ID 목록 */
  queuedIssues: string[];
}

/** Docker 컨테이너 생성 설정 */
export interface DockerContainerConfig {
  image: string;
  name: string;
  mounts: DockerMount[];
  env: Record<string, string>;
  workingDir?: string;
  networkMode?: string;
}

/** Docker 볼륨 마운트 */
export interface DockerMount {
  hostPath: string;
  containerPath: string;
  readonly?: boolean;
}

/** Docker 명령 실행 결과 */
export interface DockerExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Docker 상태 정보 */
export interface DockerStatus {
  available: boolean;
  version?: string;
  error?: string;
}

/** Devcontainer 설정 템플릿 */
export interface DevcontainerTemplate {
  name: string;
  image: string;
  features?: Record<string, unknown>;
  postCreateCommand?: string;
  mounts?: string[];
  runArgs?: string[];
  containerEnv?: Record<string, string>;
}
