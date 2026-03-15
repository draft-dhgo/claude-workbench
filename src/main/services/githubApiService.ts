import https = require('https');
import { GitHubAccountStatus, GitHubRepo, GitHubRepoListParams, GitHubRepoSearchParams, GitHubRepoListResult } from '../../shared/types/github';

interface HttpResponse {
  status: number;
  body: any;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * GitHub REST API 클라이언트
 * Node.js 내장 https 모듈 사용 (의존성 추가 없음)
 */
class GitHubApiService {
  private _getToken: () => string | null;

  constructor(getToken: () => string | null) {
    this._getToken = getToken;
  }

  /** 인증된 사용자 정보 조회 및 토큰 검증 */
  async getAuthenticatedUser(): Promise<GitHubAccountStatus> {
    const token = this._getToken();
    if (!token) {
      return { connected: false, error: 'No token configured' };
    }
    try {
      const res = await this._request('GET', '/user');
      if (res.status === 401) {
        return { connected: false, error: 'Invalid token' };
      }
      if (res.status === 403) {
        return { connected: false, error: 'Token forbidden or rate limited' };
      }
      if (res.status !== 200) {
        return { connected: false, error: `GitHub API error: ${res.status}` };
      }
      const scopeHeader = res.headers['x-oauth-scopes'];
      const scopes = typeof scopeHeader === 'string'
        ? scopeHeader.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      return {
        connected: true,
        username: res.body.login,
        avatarUrl: res.body.avatar_url,
        repoCount: res.body.public_repos + (res.body.total_private_repos || 0),
        scopes,
      };
    } catch (err: any) {
      return { connected: false, error: err.message || 'Network error' };
    }
  }

  /** 사용자의 repo 목록 조회 */
  async listRepos(params?: GitHubRepoListParams): Promise<GitHubRepoListResult> {
    const page = params?.page || 1;
    const perPage = params?.perPage || 20;
    const sort = params?.sort || 'updated';
    const type = params?.type || 'all';

    const qs = `page=${page}&per_page=${perPage}&sort=${sort}&type=${type}`;
    const res = await this._request('GET', `/user/repos?${qs}`);

    if (res.status !== 200) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const repos = this._mapRepos(res.body);
    const linkHeader = res.headers['link'];
    const hasNextPage = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

    return { repos, hasNextPage };
  }

  /** repo 검색 */
  async searchRepos(params: GitHubRepoSearchParams): Promise<GitHubRepoListResult> {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const q = encodeURIComponent(params.query);

    const qs = `q=${q}&page=${page}&per_page=${perPage}&sort=updated`;
    const res = await this._request('GET', `/search/repositories?${qs}`);

    if (res.status !== 200) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const repos = this._mapRepos(res.body.items || []);
    const totalCount = res.body.total_count || 0;
    const hasNextPage = page * perPage < totalCount;

    return { repos, totalCount, hasNextPage };
  }

  private _mapRepos(items: any[]): GitHubRepo[] {
    return (items || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      private: r.private,
      language: r.language,
      stargazersCount: r.stargazers_count || 0,
      updatedAt: r.updated_at,
      owner: {
        login: r.owner?.login || '',
        avatarUrl: r.owner?.avatar_url || '',
      },
    }));
  }

  private _request(method: string, apiPath: string): Promise<HttpResponse> {
    const token = this._getToken();
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'api.github.com',
        path: apiPath,
        method,
        headers: {
          'User-Agent': 'Claude-Workbench',
          'Accept': 'application/vnd.github.v3+json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          let body: any;
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
          const headers: Record<string, string | string[] | undefined> = {};
          for (const [key, val] of Object.entries(res.headers)) {
            headers[key] = val;
          }
          resolve({ status: res.statusCode || 0, body, headers });
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy(new Error('Request timeout'));
      });
      req.end();
    });
  }
}

export = GitHubApiService;
