import { app } from 'electron';
import GitHubTokenStore = require('../services/githubTokenStore');
import GitHubApiService = require('../services/githubApiService');
import { GitHubRepoListParams, GitHubRepoSearchParams } from '../../shared/types/github';

let _tokenStore: GitHubTokenStore | null = null;
let _apiService: GitHubApiService | null = null;

function getTokenStore(): GitHubTokenStore {
  if (!_tokenStore) _tokenStore = new GitHubTokenStore(app.getPath('userData'));
  return _tokenStore;
}

function getApiService(): GitHubApiService {
  if (!_apiService) {
    _apiService = new GitHubApiService(() => getTokenStore().getToken());
  }
  return _apiService;
}

/** PAT 저장 및 검증 */
async function handleGitHubSetToken(_event: any, data: { token: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { token } = data;
    if (!token || !token.trim()) {
      return { success: false, error: 'Token is required' };
    }
    getTokenStore().setToken(token.trim());

    // 즉시 검증
    const status = await getApiService().getAuthenticatedUser();
    if (!status.connected) {
      // 유효하지 않으면 삭제
      getTokenStore().removeToken();
      return { success: false, error: status.error || 'Invalid token' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** PAT 삭제 */
async function handleGitHubRemoveToken(): Promise<{ success: boolean; error?: string }> {
  try {
    getTokenStore().removeToken();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** 연결 상태 확인 */
async function handleGitHubCheckConnection(): Promise<{ success: boolean; status?: any; error?: string }> {
  try {
    if (!getTokenStore().hasToken()) {
      return { success: true, status: { connected: false } };
    }
    const status = await getApiService().getAuthenticatedUser();
    return { success: true, status };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** 사용자 repo 목록 */
async function handleGitHubListRepos(_event: any, data?: GitHubRepoListParams): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await getApiService().listRepos(data);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** repo 검색 */
async function handleGitHubSearchRepos(_event: any, data: GitHubRepoSearchParams): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await getApiService().searchRepos(data);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function _resetStores(): void {
  _tokenStore = null;
  _apiService = null;
}

export {
  handleGitHubSetToken,
  handleGitHubRemoveToken,
  handleGitHubCheckConnection,
  handleGitHubListRepos,
  handleGitHubSearchRepos,
  _resetStores,
};
