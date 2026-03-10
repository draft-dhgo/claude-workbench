import { execFile } from 'child_process';
import { readFileSync } from 'fs';
import path = require('path');
import {
  ConflictFile,
  ConflictRegion,
  BranchInfo,
} from '../../shared/types/models';

interface MergeResult {
  success: boolean;
  commitHash?: string;
  changedFiles?: number;
  insertions?: number;
  deletions?: number;
  isConflict?: boolean;
  conflictFiles?: ConflictFile[];
  errorMessage?: string;
}

interface MergeStats {
  changedFiles: number;
  insertions: number;
  deletions: number;
}

class MergeService {
  /**
   * git 명령 실행 래퍼 (Promise) — 성공 시 stdout 반환, 실패 시 reject
   */
  private _execGit(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd }, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve((stdout || '').toString());
        }
      });
    });
  }

  /**
   * git 명령 실행 — exit code + stdout + stderr 모두 반환 (reject하지 않음)
   */
  private _execGitRaw(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      execFile('git', args, { cwd }, (err: any, stdout, stderr) => {
        const exitCode = err ? (err.code || 1) : 0;
        resolve({
          exitCode,
          stdout: (stdout || '').toString(),
          stderr: (stderr || '').toString()
        });
      });
    });
  }

  /**
   * 브랜치명 검증
   */
  private _validateBranchName(branch: string): void {
    if (!branch || !branch.trim()) {
      throw new Error('EMPTY_BRANCH_NAME');
    }
    if (branch.length > 256) {
      throw new Error('BRANCH_NAME_TOO_LONG');
    }
    const dangerousChars = /[;&|$`'"\\(){}\[\]!#~<>]/;
    if (dangerousChars.test(branch)) {
      throw new Error('INVALID_BRANCH_NAME');
    }
  }

  /**
   * 파일 경로 검증 — path traversal 방지
   */
  private _validateFilePaths(files: string[]): void {
    for (const file of files) {
      if (file.includes('..')) {
        throw new Error('INVALID_FILE_PATH');
      }
    }
  }

  /**
   * 워크트리 clean/dirty 확인
   */
  async checkClean(cwd: string): Promise<boolean> {
    const output = await this._execGit(['status', '--porcelain'], cwd);
    return output.trim() === '';
  }

  /**
   * 원격 브랜치면 fetch 실행
   */
  async fetchIfNeeded(cwd: string, sourceBranch: string): Promise<void> {
    if (sourceBranch.startsWith('origin/') || sourceBranch.includes('/')) {
      try {
        await this._execGit(['fetch', '--all'], cwd);
      } catch {
        // fetch 실패는 무시 (로컬 ref 사용)
      }
    }
  }

  /**
   * 병합 실행
   */
  async merge(cwd: string, sourceBranch: string): Promise<MergeResult> {
    this._validateBranchName(sourceBranch);

    // clean 확인
    const isClean = await this.checkClean(cwd);
    if (!isClean) {
      return { success: false, errorMessage: 'DIRTY_WORKING_TREE' };
    }

    // 원격 브랜치면 fetch
    await this.fetchIfNeeded(cwd, sourceBranch);

    // merge 실행
    const result = await this._execGitRaw(['merge', sourceBranch], cwd);

    if (result.exitCode === 0) {
      // 성공
      const commitHash = await this.getHeadCommitHash(cwd);
      const stats = await this.getMergeStats(cwd);
      return {
        success: true,
        commitHash,
        changedFiles: stats.changedFiles,
        insertions: stats.insertions,
        deletions: stats.deletions
      };
    }

    // 충돌 확인
    const combined = result.stdout + result.stderr;
    if (combined.includes('CONFLICT')) {
      const conflictFiles = await this.detectConflicts(cwd);
      return {
        success: false,
        isConflict: true,
        conflictFiles
      };
    }

    // 기타 에러
    return {
      success: false,
      errorMessage: result.stderr || result.stdout
    };
  }

  /**
   * 충돌 파일 목록 조회
   */
  async detectConflicts(cwd: string): Promise<ConflictFile[]> {
    const output = await this._execGit(['diff', '--name-only', '--diff-filter=U'], cwd);
    const files = output.trim().split('\n').filter(f => f.trim() !== '');

    return files.map(filePath => {
      let conflictRegions: ConflictRegion[] = [];
      try {
        conflictRegions = this._parseConflictRegions(path.join(cwd, filePath));
      } catch {
        // 파일 읽기 실패 시 빈 영역
      }
      return { filePath, conflictRegions };
    });
  }

  /**
   * 충돌 마커 영역 파싱
   */
  private _parseConflictRegions(filePath: string): ConflictRegion[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const regions: ConflictRegion[] = [];
    let startLine: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('<<<<<<<')) {
        startLine = i + 1; // 1-indexed
      } else if (lines[i].startsWith('>>>>>>>') && startLine !== null) {
        regions.push({ startLine, endLine: i + 1 });
        startLine = null;
      }
    }

    return regions;
  }

  /**
   * 충돌 해결 — ours 또는 theirs 전략 적용
   */
  async resolveConflicts(
    cwd: string,
    strategy: 'ours' | 'theirs',
    files?: string[]
  ): Promise<MergeResult> {
    if (files) {
      this._validateFilePaths(files);
    }

    // 대상 파일 결정
    const targetFiles = files ?? (await this.detectConflicts(cwd)).map(f => f.filePath);

    // 각 파일에 checkout --ours/--theirs
    for (const file of targetFiles) {
      await this._execGit(['checkout', `--${strategy}`, '--', file], cwd);
    }

    // git add
    await this._execGit(['add', ...targetFiles], cwd);

    // 남은 충돌 확인
    const remainingConflicts = await this.detectConflicts(cwd);

    if (remainingConflicts.length === 0) {
      // 모든 충돌 해결 — commit
      await this._execGit(['commit', '--no-edit'], cwd);
      const commitHash = await this.getHeadCommitHash(cwd);
      const stats = await this.getMergeStats(cwd);
      return {
        success: true,
        commitHash,
        changedFiles: stats.changedFiles,
        insertions: stats.insertions,
        deletions: stats.deletions
      };
    } else {
      // 아직 충돌 남음
      return {
        success: false,
        isConflict: true,
        conflictFiles: remainingConflicts
      };
    }
  }

  /**
   * 수동 해결 완료 처리
   */
  async completeManualResolve(cwd: string): Promise<MergeResult> {
    const remainingConflicts = await this.detectConflicts(cwd);

    if (remainingConflicts.length > 0) {
      return {
        success: false,
        errorMessage: 'UNRESOLVED_CONFLICTS',
        conflictFiles: remainingConflicts
      };
    }

    await this._execGit(['add', '.'], cwd);
    await this._execGit(['commit', '--no-edit'], cwd);
    const commitHash = await this.getHeadCommitHash(cwd);
    const stats = await this.getMergeStats(cwd);
    return {
      success: true,
      commitHash,
      changedFiles: stats.changedFiles,
      insertions: stats.insertions,
      deletions: stats.deletions
    };
  }

  /**
   * 병합 중단
   */
  async abortMerge(cwd: string): Promise<{ success: boolean; error?: string }> {
    const result = await this._execGitRaw(['merge', '--abort'], cwd);
    if (result.exitCode === 0) {
      return { success: true };
    }
    return { success: false, error: result.stderr };
  }

  /**
   * 브랜치 목록 조회
   */
  async listBranches(cwd: string): Promise<BranchInfo[]> {
    const output = await this._execGit(
      ['branch', '-a', '--format=%(refname:short)|%(objectname:short)|%(subject)'],
      cwd
    );

    const lines = output.trim().split('\n').filter(l => l.trim() !== '');
    return lines.map(line => {
      const [name, , lastCommitMessage] = line.split('|');
      return {
        name: name.trim(),
        isRemote: name.trim().startsWith('origin/') || name.trim().startsWith('remotes/'),
        lastCommitMessage: lastCommitMessage?.trim()
      };
    });
  }

  /**
   * 현재 브랜치명 조회
   */
  async getCurrentBranch(cwd: string): Promise<string> {
    const output = await this._execGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    return output.trim();
  }

  /**
   * 병합 결과 통계 조회
   */
  async getMergeStats(cwd: string): Promise<MergeStats> {
    const output = await this._execGit(['diff', '--stat', 'HEAD~1', 'HEAD'], cwd);
    const lines = output.trim().split('\n');
    const summaryLine = lines[lines.length - 1] || '';

    let changedFiles = 0;
    let insertions = 0;
    let deletions = 0;

    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    if (filesMatch) changedFiles = parseInt(filesMatch[1], 10);

    const insertionsMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
    if (insertionsMatch) insertions = parseInt(insertionsMatch[1], 10);

    const deletionsMatch = summaryLine.match(/(\d+) deletions?\(-\)/);
    if (deletionsMatch) deletions = parseInt(deletionsMatch[1], 10);

    return { changedFiles, insertions, deletions };
  }

  /**
   * 최신 커밋 해시(축약) 조회
   */
  async getHeadCommitHash(cwd: string): Promise<string> {
    const output = await this._execGit(['rev-parse', '--short', 'HEAD'], cwd);
    return output.trim();
  }
}

export = MergeService;
