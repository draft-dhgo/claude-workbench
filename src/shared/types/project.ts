/** 프로젝트: 이슈 관리 repo + dev repo(submodule)들의 최상위 엔티티 */
export interface Project {
  id: string;
  name: string;
  /** 이슈 관리 repo 절대 경로 */
  issueRepoPath: string;
  /** submodule로 관리되는 dev repo 참조 목록 */
  devRepos: DevRepoRef[];
  /** 프로젝트 로컬 저장 기본 경로 */
  localBasePath: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

/** 프로젝트 내 dev repo(submodule) 참조 */
export interface DevRepoRef {
  id: string;
  name: string;
  /** git remote URL */
  remoteUrl: string;
  /** issue repo 내 상대 경로 (e.g., "repos/frontend") */
  submodulePath: string;
  addedAt: string;
}

/** 프로젝트 설정 */
export interface ProjectSettings {
  /** 동시 컨테이너 최대 수 (default: 3) */
  maxContainers: number;
  /** 커스텀 테스트 명령 (e.g., "npm test") */
  testCommand?: string;
  /** 프로젝트 언어 */
  lang: 'en' | 'ko';
  /** 파이프라인 최대 재시도 횟수 (default: 3) */
  maxPipelineRetries?: number;
}

/** 프로젝트 영속 파일(projects.json) 구조 */
export interface ProjectFile {
  version: number;
  projects: Project[];
}

/** 프로젝트 대시보드 데이터 */
export interface ProjectDashboard {
  project: Project;
  issueStats: {
    total: number;
    byStatus: Record<string, number>;
  };
  containerStats: {
    total: number;
    running: number;
    idle: number;
    max: number;
  };
  recentActivity: ActivityEntry[];
}

/** 최근 활동 항목 */
export interface ActivityEntry {
  timestamp: string;
  type: 'issue_created' | 'issue_started' | 'issue_completed' | 'issue_failed'
    | 'container_created' | 'container_destroyed' | 'merge_success' | 'merge_conflict';
  message: string;
  issueId?: string;
  containerId?: string;
}

/** 프로젝트 구성 상태 */
export interface ProjectConfigStatus {
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  hasCwbDir: boolean;
  hasProjectSettings: boolean;
  commandCount: number;
  skillCount: number;
  wikiAvailable: boolean;
  issueRepoValid: boolean;
  submodulesInitialized: boolean;
}

/**
 * .cwb/project-settings.json 구조
 * 이슈 repo 안에 저장되어 repo와 함께 공유됨
 */
export interface CwbProjectSettingsFile {
  version: number;
  name: string;
  settings: ProjectSettings;
  devRepos: DevRepoRef[];
}

/** .cwb/project-settings.json 경로 상수 */
export const CWB_DIR = '.cwb';
export const CWB_SETTINGS_FILE = 'project-settings.json';

/** 프로젝트 설정 기본값 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  maxContainers: 3,
  lang: 'ko',
};
