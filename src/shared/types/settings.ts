/** 앱 전역 설정 */
export interface AppSettings {
  version: number;
  /**
   * 앱 데이터 루트 경로
   * 모든 프로젝트 repo, 컨테이너 worktree, devcontainer 캐시가 이 경로 아래에 관리됨
   * 구조: {dataRootPath}/projects/, {dataRootPath}/containers/, {dataRootPath}/devcontainers/
   */
  dataRootPath: string;
  /** Docker 소켓 경로 (default: /var/run/docker.sock) */
  dockerSocketPath: string;
  /** 전체 프로젝트 통합 최대 컨테이너 수 */
  maxGlobalContainers: number;
  /** 테마 */
  theme: 'light' | 'dark' | 'system';
  /** 언어 */
  lang: 'en' | 'ko';
}

/** 앱 설정 기본값 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  dataRootPath: '',
  dockerSocketPath: '/var/run/docker.sock',
  maxGlobalContainers: 10,
  theme: 'system',
  lang: 'ko',
};
