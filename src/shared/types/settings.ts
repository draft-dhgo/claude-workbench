/** 앱 전역 설정 */
export interface AppSettings {
  version: number;
  /** 프로젝트 기본 저장 경로 */
  defaultProjectPath: string;
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
  defaultProjectPath: '',
  dockerSocketPath: '/var/run/docker.sock',
  maxGlobalContainers: 10,
  theme: 'system',
  lang: 'ko',
};
