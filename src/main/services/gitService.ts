import { execFile } from 'child_process';
import { BranchInfo } from '../../shared/types/models';

interface GitExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * 통합 Git 서비스
 * MergeService와 기존 worktreeHandlers에서 추출한 git 명령 래퍼
 */
class GitService {
  /**
   * git 명령 실행 — 성공 시 stdout 반환, 실패 시 reject
   */
  async exec(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message).toString().trim()));
        } else {
          resolve((stdout || '').toString());
        }
      });
    });
  }

  /**
   * git 명령 실행 — exit code + stdout + stderr 모두 반환 (reject하지 않음)
   */
  async execRaw(args: string[], cwd: string): Promise<GitExecResult> {
    return new Promise((resolve) => {
      execFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout, stderr) => {
        resolve({
          exitCode: err ? (err.code || 1) : 0,
          stdout: (stdout || '').toString(),
          stderr: (stderr || '').toString()
        });
      });
    });
  }

  // --- Repository ---

  async init(cwd: string): Promise<void> {
    await this.exec(['init'], cwd);
  }

  async clone(url: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('git', ['clone', url, targetPath], { maxBuffer: 10 * 1024 * 1024 }, (err) => {
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  // --- Branches ---

  async getCurrentBranch(cwd: string): Promise<string> {
    const output = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    return output.trim();
  }

  async listBranches(cwd: string): Promise<BranchInfo[]> {
    const output = await this.exec(
      ['branch', '-a', '--format=%(refname:short)|%(objectname:short)|%(subject)'],
      cwd
    );
    return output.trim().split('\n').filter(l => l.trim()).map(line => {
      const [name, , lastCommitMessage] = line.split('|');
      return {
        name: name.trim(),
        isRemote: name.trim().startsWith('origin/') || name.trim().startsWith('remotes/'),
        lastCommitMessage: lastCommitMessage?.trim()
      };
    });
  }

  async createBranch(cwd: string, name: string, startPoint?: string): Promise<void> {
    const args = ['branch', name];
    if (startPoint) args.push(startPoint);
    await this.exec(args, cwd);
  }

  async checkoutBranch(cwd: string, name: string): Promise<void> {
    await this.exec(['checkout', name], cwd);
  }

  async deleteBranch(cwd: string, name: string, force = false): Promise<void> {
    await this.exec(['branch', force ? '-D' : '-d', name], cwd);
  }

  // --- Worktrees ---

  async createWorktree(cwd: string, worktreePath: string, branch: string, baseBranch?: string): Promise<void> {
    const args = ['worktree', 'add'];
    if (baseBranch) {
      args.push('-b', branch, worktreePath, baseBranch);
    } else {
      args.push(worktreePath, branch);
    }
    await this.exec(args, cwd);
  }

  async listWorktrees(cwd: string): Promise<Array<{ path: string; branch: string | null }>> {
    const output = await this.exec(['worktree', 'list', '--porcelain'], cwd);
    const entries: Array<{ path: string; branch: string | null }> = [];
    let currentPath: string | null = null;
    let currentBranch: string | null = null;

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (currentPath) {
          entries.push({ path: currentPath, branch: currentBranch });
        }
        currentPath = line.replace('worktree ', '').trim();
        currentBranch = null;
      } else if (line.startsWith('branch ')) {
        currentBranch = line.replace('branch refs/heads/', '').trim();
      }
    }
    if (currentPath) {
      entries.push({ path: currentPath, branch: currentBranch });
    }
    return entries;
  }

  async removeWorktree(cwd: string, worktreePath: string, force = false): Promise<void> {
    const args = ['worktree', 'remove'];
    if (force) args.push('--force');
    args.push(worktreePath);
    await this.exec(args, cwd);
  }

  // --- Submodules ---

  async addSubmodule(cwd: string, url: string, submodulePath: string): Promise<void> {
    await this.exec(['submodule', 'add', url, submodulePath], cwd);
  }

  async initSubmodules(cwd: string): Promise<void> {
    await this.exec(['submodule', 'init'], cwd);
  }

  async updateSubmodules(cwd: string, recursive = true): Promise<void> {
    const args = ['submodule', 'update', '--init'];
    if (recursive) args.push('--recursive');
    await this.exec(args, cwd);
  }

  async removeSubmodule(cwd: string, submodulePath: string): Promise<void> {
    await this.exec(['submodule', 'deinit', '-f', submodulePath], cwd);
    await this.exec(['rm', '-f', submodulePath], cwd);
  }

  // --- Remote ---

  async fetch(cwd: string, remote = '--all'): Promise<void> {
    await this.exec(['fetch', remote], cwd);
  }

  async push(cwd: string, remote?: string, branch?: string): Promise<void> {
    const args = ['push'];
    if (remote) args.push(remote);
    if (branch) args.push(branch);
    await this.exec(args, cwd);
  }

  // --- Status ---

  async isClean(cwd: string): Promise<boolean> {
    const output = await this.exec(['status', '--porcelain'], cwd);
    return output.trim() === '';
  }

  async status(cwd: string): Promise<string> {
    return this.exec(['status', '--porcelain'], cwd);
  }

  // --- Commit ---

  async add(cwd: string, files: string[]): Promise<void> {
    await this.exec(['add', ...files], cwd);
  }

  async addAll(cwd: string): Promise<void> {
    await this.exec(['add', '-A'], cwd);
  }

  async commit(cwd: string, message: string): Promise<string> {
    await this.exec(['commit', '-m', message], cwd);
    const output = await this.exec(['rev-parse', '--short', 'HEAD'], cwd);
    return output.trim();
  }

  // --- Utilities ---

  async getHeadCommitHash(cwd: string): Promise<string> {
    const output = await this.exec(['rev-parse', '--short', 'HEAD'], cwd);
    return output.trim();
  }

  async isGitRepo(dirPath: string): Promise<boolean> {
    const result = await this.execRaw(['rev-parse', '--is-inside-work-tree'], dirPath);
    return result.exitCode === 0;
  }
}

export = GitService;
