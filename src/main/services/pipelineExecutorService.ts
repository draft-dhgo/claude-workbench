import { BrowserWindow } from 'electron';
import { execFile } from 'child_process';
import fs = require('fs');
import path = require('path');
import DockerService = require('./dockerService');

interface PipelineResult {
  success: boolean;
  sessionId?: string;
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  errorMessage?: string;
}

interface ExecuteOptions {
  command: string;
  args: string;
  cwd: string;
  /** Docker 컨테이너 ID (있으면 컨테이너 내부에서 실행) */
  dockerContainerId?: string;
  /** 로그 태그 (이슈 ID 등) */
  logTag?: string;
  /** AbortSignal */
  signal?: AbortSignal;
}

/**
 * Pipeline Executor 서비스
 * Claude Code SDK를 통한 파이프라인 커맨드 실행
 * CommandQueueService에서 진화
 */
class PipelineExecutorService {
  private _docker: DockerService;
  private _currentAbortController: AbortController | null = null;
  private _isRunning = false;

  constructor(docker?: DockerService) {
    this._docker = docker || new DockerService();
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 파이프라인 커맨드 실행
   * Claude Code SDK (agent-sdk)를 사용하거나, Docker 컨테이너 내부에서 CLI 실행
   */
  async execute(options: ExecuteOptions): Promise<PipelineResult> {
    this._isRunning = true;
    this._currentAbortController = new AbortController();
    const startTime = Date.now();

    try {
      this._sendLog(options.logTag || '', 'system', `Starting pipeline: ${options.command} ${options.args}`);

      let result: PipelineResult;

      if (options.dockerContainerId) {
        result = await this._executeInContainer(options);
      } else {
        result = await this._executeLocal(options);
      }

      result.durationMs = Date.now() - startTime;
      this._sendLog(options.logTag || '', 'result',
        result.success ? 'Pipeline completed successfully' : `Pipeline failed: ${result.errorMessage}`);

      return result;
    } catch (err: any) {
      if (err.name === 'AbortError' || this._currentAbortController?.signal.aborted) {
        return { success: false, errorMessage: 'ABORTED', durationMs: Date.now() - startTime };
      }
      return { success: false, errorMessage: err.message, durationMs: Date.now() - startTime };
    } finally {
      this._isRunning = false;
      this._currentAbortController = null;
    }
  }

  /**
   * 현재 실행 중인 파이프라인 중단
   */
  abort(): void {
    if (this._currentAbortController) {
      this._currentAbortController.abort();
    }
  }

  // --- Local Execution (agent-sdk 또는 CLI) ---

  private async _executeLocal(options: ExecuteOptions): Promise<PipelineResult> {
    const claudePath = this._findClaudeCodePath();
    if (!claudePath) {
      return { success: false, errorMessage: 'Claude Code CLI not found' };
    }

    // agent-sdk 사용 시도
    try {
      const { query } = require('@anthropic-ai/claude-agent-sdk');

      const prompt = `${options.command} ${options.args}`.trim();
      const messages: any[] = [];

      const response = await query({
        prompt,
        options: {
          maxTurns: 200,
          systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const },
          cwd: options.cwd,
          permissionMode: 'bypassPermissions' as const,
          abortController: this._currentAbortController!,
        },
      });

      for await (const message of response) {
        if (this._currentAbortController?.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        if (message.type === 'assistant') {
          const text = this._extractText(message);
          if (text) {
            this._sendLog(options.logTag || '', 'assistant', text);
            messages.push(message);
          }
        } else if (message.type === 'result') {
          return {
            success: true,
            sessionId: (message as any).session_id,
            costUsd: (message as any).cost_usd,
            numTurns: messages.length,
          };
        }
      }

      return { success: true, numTurns: messages.length };
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;

      // SDK 실패 시 CLI fallback
      this._sendLog(options.logTag || '', 'system', 'agent-sdk unavailable, falling back to CLI');
      return this._executeCliLocal(options, claudePath);
    }
  }

  private _executeCliLocal(options: ExecuteOptions, claudePath: string): Promise<PipelineResult> {
    return new Promise((resolve) => {
      const args = [
        '--dangerously-skip-permissions',
        '-p', `${options.command} ${options.args}`.trim(),
      ];

      const proc = execFile(claudePath, args, {
        cwd: options.cwd,
        maxBuffer: 50 * 1024 * 1024,
        timeout: 3600000, // 1 hour
      }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, errorMessage: (stderr || err.message).toString().trim() });
        } else {
          this._sendLog(options.logTag || '', 'assistant', (stdout || '').toString());
          resolve({ success: true });
        }
      });

      // Abort 처리
      if (this._currentAbortController) {
        this._currentAbortController.signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
        });
      }
    });
  }

  // --- Container Execution ---

  private async _executeInContainer(options: ExecuteOptions): Promise<PipelineResult> {
    const containerId = options.dockerContainerId!;

    // 컨테이너 내부에서 claude 실행
    const result = await this._docker.execInContainer(containerId, [
      'claude',
      '--dangerously-skip-permissions',
      '-p', `${options.command} ${options.args}`.trim(),
    ]);

    if (result.stdout) {
      this._sendLog(options.logTag || '', 'assistant', result.stdout);
    }
    if (result.stderr) {
      this._sendLog(options.logTag || '', 'error', result.stderr);
    }

    return {
      success: result.exitCode === 0,
      errorMessage: result.exitCode !== 0 ? result.stderr || 'Non-zero exit code' : undefined,
    };
  }

  // --- Utility ---

  private _findClaudeCodePath(): string | null {
    // 자주 사용되는 경로들 확인
    const candidates = [
      'claude',
      path.join(process.env.HOME || '', '.nvm/versions/node', process.version, 'bin/claude'),
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
    ];

    for (const candidate of candidates) {
      try {
        const result = require('child_process').execFileSync('which', [candidate], { timeout: 3000 });
        if (result) return result.toString().trim();
      } catch { /* ignore */ }
    }

    // 'claude' in PATH
    try {
      const result = require('child_process').execFileSync('which', ['claude'], { timeout: 3000 });
      return result.toString().trim();
    } catch {
      return null;
    }
  }

  private _extractText(message: any): string {
    if (!message.content) return '';
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }
    return '';
  }

  private _sendLog(tag: string, type: string, content: string): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('pipeline:log', {
        tag,
        type,
        content,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export = PipelineExecutorService;
