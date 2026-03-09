import fs = require('fs');
import path = require('path');
import { BrowserWindow } from 'electron';
import { CommandInfo, SkillInfo, ConfigStatus, QueueSummary, RateLimitStatus } from '../../shared/types/models';
import { buildDefaultCommands, buildDefaultSkills } from '../constants/claudeConfigDefaults';

class WorkspaceManagerService {
  private _activeWorkspacePath: string | null = null;
  private _maxRetries: number = 10;

  /** 활성 워크스페이스 경로를 설정한다 (FR-02) */
  setActiveWorkspace(workspacePath: string): { wikiAvailable: boolean } {
    if (!workspacePath) {
      throw new Error('PATH_REQUIRED');
    }

    if (!fs.existsSync(workspacePath)) {
      throw new Error('PATH_NOT_FOUND');
    }

    this._activeWorkspacePath = workspacePath;
    const wikiAvailable = this.checkWikiAvailability(workspacePath);

    // Renderer에 상태 변경 push
    this._sendActiveChanged({ activeWorkspacePath: workspacePath, wikiAvailable });

    return { wikiAvailable };
  }

  /** 현재 활성 워크스페이스 경로를 반환한다 */
  getActiveWorkspacePath(): string | null {
    return this._activeWorkspacePath;
  }

  /** 워크스페이스의 커맨드 목록을 조회한다 (FR-04) */
  getCommands(workspacePath: string): CommandInfo[] {
    const defaultNames = Object.keys(buildDefaultCommands('en'));
    const commandsDir = path.join(workspacePath, '.claude', 'commands');

    return defaultNames.map(name => {
      const filePath = path.join(commandsDir, `${name}.md`);
      const exists = fs.existsSync(filePath);
      let description: string | undefined;

      if (exists) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const firstLine = content.split('\n')[0]?.trim();
          if (firstLine) description = firstLine;
        } catch { /* ignore */ }
      }

      return {
        name,
        slashName: `/${name}`,
        filePath: `.claude/commands/${name}.md`,
        exists,
        description
      };
    });
  }

  /** 워크스페이스의 스킬 목록을 조회한다 (FR-05) */
  getSkills(workspacePath: string): SkillInfo[] {
    const defaultNames = Object.keys(buildDefaultSkills('en'));
    const skillsDir = path.join(workspacePath, '.claude', 'skills');

    return defaultNames.map(name => {
      const dirPath = path.join(skillsDir, name);
      const skillFilePath = path.join(dirPath, 'SKILL.md');
      const exists = fs.existsSync(skillFilePath);
      let description: string | undefined;

      if (exists) {
        try {
          const content = fs.readFileSync(skillFilePath, 'utf-8');
          const firstLine = content.split('\n')[0]?.trim();
          if (firstLine) description = firstLine;
        } catch { /* ignore */ }
      }

      return {
        name,
        dirPath: `.claude/skills/${name}/`,
        exists,
        description
      };
    });
  }

  /** 워크스페이스의 Claude 구성 상태를 조회한다 (FR-06) */
  getConfigStatus(workspacePath: string): ConfigStatus {
    const claudeDir = path.join(workspacePath, '.claude');
    const claudeMd = path.join(workspacePath, 'CLAUDE.md');
    const commandsDir = path.join(claudeDir, 'commands');
    const skillsDir = path.join(claudeDir, 'skills');

    const hasClaudeDir = fs.existsSync(claudeDir);
    const hasClaudeMd = fs.existsSync(claudeMd);

    let commandCount = 0;
    if (fs.existsSync(commandsDir)) {
      try {
        commandCount = fs.readdirSync(commandsDir)
          .filter((f: string) => f.endsWith('.md')).length;
      } catch { /* ignore */ }
    }

    let skillCount = 0;
    if (fs.existsSync(skillsDir)) {
      try {
        skillCount = fs.readdirSync(skillsDir)
          .filter((d: string) => {
            const skillMd = path.join(skillsDir, d, 'SKILL.md');
            return fs.existsSync(skillMd);
          }).length;
      } catch { /* ignore */ }
    }

    const wikiAvailable = this.checkWikiAvailability(workspacePath);

    return { hasClaudeDir, hasClaudeMd, commandCount, skillCount, wikiAvailable };
  }

  /** wiki/views/index.html 존재 여부를 확인한다 (FR-08) */
  checkWikiAvailability(workspacePath: string): boolean {
    const indexPath = path.join(workspacePath, 'wiki', 'views', 'index.html');
    return fs.existsSync(indexPath);
  }

  /** 커맨드 큐 항목의 워크스페이스별 요약을 반환한다 (FR-12) */
  getQueueSummary(items: { cwd: string; status: string }[], workspacePath: string): QueueSummary {
    const filtered = items.filter(i => i.cwd === workspacePath);
    const summary: QueueSummary = {
      pending: 0, running: 0, success: 0,
      failed: 0, aborted: 0, total: filtered.length
    };

    for (const item of filtered) {
      switch (item.status) {
        case 'pending': summary.pending++; break;
        case 'running': case 'retrying': summary.running++; break;
        case 'success': summary.success++; break;
        case 'failed': summary.failed++; break;
        case 'aborted': summary.aborted++; break;
      }
    }

    return summary;
  }

  /** rate limit 최대 재시도 횟수를 설정한다 (FR-15) */
  setMaxRetries(maxRetries: number): void {
    this._maxRetries = Math.max(1, maxRetries);
  }

  /** rate limit 최대 재시도 횟수를 반환한다 */
  getMaxRetries(): number {
    return this._maxRetries;
  }

  /** 활성 워크스페이스 경로를 자동으로 resolve한다 */
  resolveWorkspacePath(explicitPath?: string): string | null {
    if (explicitPath) return explicitPath;
    return this._activeWorkspacePath;
  }

  /** 테스트 격리를 위한 상태 초기화 */
  _reset(): void {
    this._activeWorkspacePath = null;
    this._maxRetries = 10;
  }

  private _sendActiveChanged(payload: { activeWorkspacePath: string | null; wikiAvailable: boolean }): void {
    const win = this._getWindow();
    if (!win) return;
    win.webContents.send('workspace:active-changed', payload);
  }

  private _sendRateLimitStatus(status: RateLimitStatus): void {
    const win = this._getWindow();
    if (!win) return;
    win.webContents.send('workspace:rate-limit-status', status);
  }

  private _sendRateLimitExhausted(payload: { itemId: string; retryCount: number; maxRetries: number }): void {
    const win = this._getWindow();
    if (!win) return;
    win.webContents.send('workspace:rate-limit-exhausted', payload);
  }

  private _getWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
  }
}

export = WorkspaceManagerService;
