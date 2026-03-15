/** GitHub 계정 연결 상태 */
export interface GitHubAccountStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  /** 접근 가능한 repo 수 */
  repoCount?: number;
  /** 토큰에 부여된 스코프 목록 */
  scopes?: string[];
  error?: string;
}

/** GitHub 저장소 정보 */
export interface GitHubRepo {
  id: number;
  name: string;
  /** owner/repo-name 형태 */
  fullName: string;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  private: boolean;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

/** repo 목록 요청 파라미터 */
export interface GitHubRepoListParams {
  page?: number;
  perPage?: number;
  sort?: 'updated' | 'created' | 'pushed' | 'full_name';
  type?: 'all' | 'owner' | 'member';
}

/** repo 검색 요청 파라미터 */
export interface GitHubRepoSearchParams {
  query: string;
  page?: number;
  perPage?: number;
}

/** 페이지네이션 포함 repo 목록 응답 */
export interface GitHubRepoListResult {
  repos: GitHubRepo[];
  totalCount?: number;
  hasNextPage: boolean;
}
