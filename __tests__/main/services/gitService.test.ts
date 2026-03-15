// GitService unit tests

const mockExecFile = jest.fn();
jest.mock('child_process', () => ({ execFile: mockExecFile }));

import GitService = require('../../../src/main/services/gitService');

let git: InstanceType<typeof GitService>;

beforeEach(() => {
  mockExecFile.mockReset();
  git = new GitService();
});

// Helper: simulate successful execFile
function mockExecSuccess(stdout = '', stderr = '') {
  mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
    cb(null, stdout, stderr);
  });
}

// Helper: simulate failed execFile
function mockExecFailure(message: string, code = 1) {
  mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
    const err: any = new Error(message);
    err.code = code;
    cb(err, '', message);
  });
}

describe('GitService.exec', () => {
  it('resolves with trimmed stdout on success', async () => {
    mockExecSuccess('hello world\n');
    const result = await git.exec(['status'], '/repo');
    expect(result).toBe('hello world\n');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['status'], expect.objectContaining({ cwd: '/repo' }), expect.any(Function)
    );
  });

  it('rejects with stderr message on failure', async () => {
    mockExecFailure('fatal: not a git repository');
    await expect(git.exec(['status'], '/repo')).rejects.toThrow('fatal: not a git repository');
  });

  it('rejects with err.message when stderr is empty', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err: any = new Error('command failed');
      err.code = 128;
      cb(err, '', '');
    });
    await expect(git.exec(['status'], '/repo')).rejects.toThrow('command failed');
  });
});

describe('GitService.execRaw', () => {
  it('returns exitCode 0, stdout, stderr on success', async () => {
    mockExecSuccess('output data', '');
    const result = await git.execRaw(['rev-parse', 'HEAD'], '/repo');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('output data');
    expect(result.stderr).toBe('');
  });

  it('returns non-zero exitCode on failure without rejecting', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err: any = new Error('fail');
      err.code = 128;
      cb(err, '', 'some error');
    });
    const result = await git.execRaw(['rev-parse', 'HEAD'], '/bad');
    expect(result.exitCode).toBe(128);
    expect(result.stderr).toBe('some error');
  });

  it('defaults exitCode to 1 when err.code is undefined', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err: any = new Error('fail');
      delete err.code;
      cb(err, '', '');
    });
    const result = await git.execRaw(['foo'], '/repo');
    expect(result.exitCode).toBe(1);
  });
});

describe('GitService.getCurrentBranch', () => {
  it('returns trimmed branch name', async () => {
    mockExecSuccess('main\n');
    const branch = await git.getCurrentBranch('/repo');
    expect(branch).toBe('main');
  });
});

describe('GitService.listBranches', () => {
  it('parses branch output into BranchInfo array', async () => {
    mockExecSuccess('main|abc1234|initial commit\norigin/main|abc1234|initial commit\nfeature/x|def5678|add feature\n');
    const branches = await git.listBranches('/repo');
    expect(branches).toHaveLength(3);
    expect(branches[0]).toEqual({ name: 'main', isRemote: false, lastCommitMessage: 'initial commit' });
    expect(branches[1]).toEqual({ name: 'origin/main', isRemote: true, lastCommitMessage: 'initial commit' });
    expect(branches[2]).toEqual({ name: 'feature/x', isRemote: false, lastCommitMessage: 'add feature' });
  });
});

describe('GitService.createBranch', () => {
  it('calls git branch with name only', async () => {
    mockExecSuccess();
    await git.createBranch('/repo', 'new-branch');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['branch', 'new-branch'], expect.any(Object), expect.any(Function)
    );
  });

  it('calls git branch with name and startPoint', async () => {
    mockExecSuccess();
    await git.createBranch('/repo', 'new-branch', 'main');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['branch', 'new-branch', 'main'], expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.deleteBranch', () => {
  it('uses -d flag by default', async () => {
    mockExecSuccess();
    await git.deleteBranch('/repo', 'old-branch');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['branch', '-d', 'old-branch'], expect.any(Object), expect.any(Function)
    );
  });

  it('uses -D flag when force=true', async () => {
    mockExecSuccess();
    await git.deleteBranch('/repo', 'old-branch', true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['branch', '-D', 'old-branch'], expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.createWorktree', () => {
  it('creates worktree with baseBranch using -b flag', async () => {
    mockExecSuccess();
    await git.createWorktree('/repo', '/wt/path', 'issue/001', 'main');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['worktree', 'add', '-b', 'issue/001', '/wt/path', 'main'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('creates worktree without baseBranch', async () => {
    mockExecSuccess();
    await git.createWorktree('/repo', '/wt/path', 'existing-branch');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['worktree', 'add', '/wt/path', 'existing-branch'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.listWorktrees', () => {
  it('parses porcelain output into worktree entries', async () => {
    const porcelainOutput = [
      'worktree /main/repo',
      'HEAD abc1234',
      'branch refs/heads/main',
      '',
      'worktree /wt/feature',
      'HEAD def5678',
      'branch refs/heads/feature/x',
      '',
    ].join('\n');
    mockExecSuccess(porcelainOutput);
    const worktrees = await git.listWorktrees('/repo');
    expect(worktrees).toEqual([
      { path: '/main/repo', branch: 'main' },
      { path: '/wt/feature', branch: 'feature/x' },
    ]);
  });

  it('handles detached HEAD (no branch line)', async () => {
    const porcelainOutput = [
      'worktree /main/repo',
      'HEAD abc1234',
      'detached',
      '',
    ].join('\n');
    mockExecSuccess(porcelainOutput);
    const worktrees = await git.listWorktrees('/repo');
    expect(worktrees).toEqual([{ path: '/main/repo', branch: null }]);
  });
});

describe('GitService.removeWorktree', () => {
  it('removes worktree without force', async () => {
    mockExecSuccess();
    await git.removeWorktree('/repo', '/wt/path');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['worktree', 'remove', '/wt/path'], expect.any(Object), expect.any(Function)
    );
  });

  it('removes worktree with force flag', async () => {
    mockExecSuccess();
    await git.removeWorktree('/repo', '/wt/path', true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['worktree', 'remove', '--force', '/wt/path'], expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.addSubmodule', () => {
  it('calls git submodule add with url and path', async () => {
    mockExecSuccess();
    await git.addSubmodule('/repo', 'https://github.com/test/repo.git', 'repos/test');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['submodule', 'add', 'https://github.com/test/repo.git', 'repos/test'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.updateSubmodules', () => {
  it('includes --recursive by default', async () => {
    mockExecSuccess();
    await git.updateSubmodules('/repo');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['submodule', 'update', '--init', '--recursive'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('excludes --recursive when set to false', async () => {
    mockExecSuccess();
    await git.updateSubmodules('/repo', false);
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['submodule', 'update', '--init'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('GitService.removeSubmodule', () => {
  it('calls deinit then rm', async () => {
    const calls: string[][] = [];
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      calls.push(args);
      cb(null, '', '');
    });
    await git.removeSubmodule('/repo', 'repos/test');
    expect(calls[0]).toEqual(['submodule', 'deinit', '-f', 'repos/test']);
    expect(calls[1]).toEqual(['rm', '-f', 'repos/test']);
  });
});

describe('GitService.isGitRepo', () => {
  it('returns true when exitCode is 0', async () => {
    mockExecSuccess('true');
    const result = await git.isGitRepo('/valid-repo');
    expect(result).toBe(true);
  });

  it('returns false when exitCode is non-zero', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err: any = new Error('not a repo');
      err.code = 128;
      cb(err, '', 'not a repo');
    });
    const result = await git.isGitRepo('/not-a-repo');
    expect(result).toBe(false);
  });
});

describe('GitService.isClean', () => {
  it('returns true when status output is empty', async () => {
    mockExecSuccess('');
    const clean = await git.isClean('/repo');
    expect(clean).toBe(true);
  });

  it('returns false when status output has changes', async () => {
    mockExecSuccess(' M src/index.ts\n');
    const clean = await git.isClean('/repo');
    expect(clean).toBe(false);
  });
});

describe('GitService.commit', () => {
  it('commits and returns short hash', async () => {
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      if (args[0] === 'commit') cb(null, '', '');
      else if (args.includes('--short')) cb(null, 'abc1234\n', '');
      else cb(null, '', '');
    });
    const hash = await git.commit('/repo', 'test commit');
    expect(hash).toBe('abc1234');
    expect(mockExecFile.mock.calls[0][1]).toEqual(['commit', '-m', 'test commit']);
  });
});

describe('GitService.pushWithRetry', () => {
  it('succeeds on first attempt', async () => {
    mockExecSuccess();
    const result = await git.pushWithRetry('/repo');
    expect(result).toEqual({ pushed: true, attempts: 1 });
  });

  it('retries with pull --rebase after push failure', async () => {
    let callCount = 0;
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, cb: any) => {
      callCount++;
      if (args[0] === 'push' && callCount === 1) {
        // First push fails
        const err: any = new Error('rejected');
        err.code = 1;
        cb(err, '', 'rejected');
      } else if (args[0] === 'pull') {
        // pull --rebase succeeds
        cb(null, '', '');
      } else {
        // Second push succeeds
        cb(null, '', '');
      }
    });
    const result = await git.pushWithRetry('/repo', 3);
    expect(result.pushed).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('returns failure after max retries', async () => {
    mockExecFailure('rejected');
    const result = await git.pushWithRetry('/repo', 2);
    expect(result.pushed).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.error).toContain('rejected');
  });

  it('continues retrying even when pull --rebase fails', async () => {
    // All push and pull attempts fail
    mockExecFailure('network error');
    const result = await git.pushWithRetry('/repo', 2);
    expect(result.pushed).toBe(false);
    expect(result.attempts).toBe(2);
  });
});

describe('GitService.clone', () => {
  it('resolves on success', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, '', '');
    });
    await expect(git.clone('https://github.com/test/repo.git', '/target')).resolves.toBeUndefined();
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['clone', 'https://github.com/test/repo.git', '/target'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('rejects on failure', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(new Error('clone failed'), '', '');
    });
    await expect(git.clone('bad-url', '/target')).rejects.toThrow('clone failed');
  });
});
