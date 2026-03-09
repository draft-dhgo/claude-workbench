import crypto = require('crypto');
import fs = require('fs');
import path = require('path');
import { BrowserWindow } from 'electron';
import { QueueItem, QueueItemStatus, QueueCommandType, QueueItemResult, QueueLogMessage, QueueStatusUpdate, RateLimitStatus } from '../../shared/types/models';
import { truncateLogContent } from '../utils/logFormatter';

const RATE_LIMIT_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5분 고정

class CommandQueueService {
  private _queue: QueueItem[] = [];
  private _isProcessing: boolean = false;
  private _currentAbortController: AbortController | null = null;
  private _retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private _securityWarningShown: boolean = false;
  private _persistPath: string | null = null;

  // Rate limit pause/resume state
  private _isPaused: boolean = false;
  private _pauseResolve: ((value: boolean) => void) | null = null;
  private _cancelResolve: ((value: boolean) => void) | null = null;
  private _maxRetries: number = 10;
  private _rateLimitRetryCount: number = 0;

  constructor(userDataPath?: string) {
    if (userDataPath) {
      this._persistPath = path.join(userDataPath, 'queue.json');
      this._loadFromDisk();
    }
  }

  private _loadFromDisk(): void {
    if (!this._persistPath) return;
    try {
      const raw = fs.readFileSync(this._persistPath, 'utf-8');
      const items: QueueItem[] = JSON.parse(raw);
      if (!Array.isArray(items)) return;
      // running/retrying 상태는 pending으로 복구 (재실행 대상)
      this._queue = items
        .filter(i => i.status !== 'success' && i.status !== 'failed' && i.status !== 'aborted')
        .map(i => {
          if (i.status === 'running' || i.status === 'retrying') {
            return { ...i, status: 'pending' as QueueItemStatus, startedAt: undefined, retryCount: 0 };
          }
          return i;
        });
    } catch {
      // 파일 없거나 파싱 실패 시 빈 큐로 시작
    }
  }

  private _saveToDisk(): void {
    if (!this._persistPath) return;
    try {
      fs.writeFileSync(this._persistPath, JSON.stringify(this._queue, null, 2), 'utf-8');
    } catch {
      // 저장 실패는 무시 (메모리 큐는 유지)
    }
  }

  resumePendingOnStartup(): void {
    const hasPending = this._queue.some(i => i.status === 'pending');
    if (hasPending && !this._isProcessing) {
      this._processQueue();
    }
  }

  enqueue(command: QueueCommandType, args: string, cwd: string): QueueItem {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      command,
      args,
      cwd,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };
    this._queue.push(item);
    this._saveToDisk();
    this._sendStatusUpdate();

    if (!this._isProcessing) {
      this._processQueue();
    }

    return item;
  }

  dequeue(itemId: string): boolean {
    const idx = this._queue.findIndex(i =>
      i.id === itemId && (i.status === 'pending' || i.status === 'aborted' || i.status === 'failed')
    );
    if (idx === -1) return false;
    this._queue.splice(idx, 1);
    this._saveToDisk();
    this._sendStatusUpdate();
    return true;
  }

  requeue(itemId: string): boolean {
    const item = this._queue.find(i =>
      i.id === itemId && (i.status === 'aborted' || i.status === 'failed')
    );
    if (!item) return false;
    item.status = 'pending';
    item.retryCount = 0;
    item.startedAt = undefined;
    item.completedAt = undefined;
    item.result = undefined;
    this._saveToDisk();
    this._sendStatusUpdate();
    if (!this._isProcessing) {
      this._processQueue();
    }
    return true;
  }

  abort(): boolean {
    const runningItem = this._queue.find(i => i.status === 'running' || i.status === 'retrying');
    if (!runningItem) return false;

    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
    if (this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
    }

    if (this._currentAbortController) {
      this._currentAbortController.abort();
      this._currentAbortController = null;
    }

    // pause 상태 해제 (rate limit 대기 중이었다면)
    this._isPaused = false;
    this._rateLimitRetryCount = 0;
    this._pauseResolve = null;
    this._cancelResolve = null;

    // rate limit 상태 push (해제)
    this._sendRateLimitStatus({
      isWaiting: false,
      remainingMs: 0,
      retryCount: 0,
      maxRetries: this._maxRetries,
      nextRetryAt: null
    });

    runningItem.status = 'aborted';
    runningItem.completedAt = new Date().toISOString();
    this._sendStatusUpdate();

    return true;
  }

  getStatus(): QueueItem[] {
    return this._queue;
  }

  isSecurityWarningShown(): boolean {
    return this._securityWarningShown;
  }

  setSecurityWarningShown(): void {
    this._securityWarningShown = true;
  }

  isPaused(): boolean {
    return this._isPaused;
  }

  setMaxRetries(maxRetries: number): void {
    this._maxRetries = Math.max(1, maxRetries);
  }

  getMaxRetries(): number {
    return this._maxRetries;
  }

  forceRetryNow(): void {
    if (!this._isPaused) return;

    // 타이머 정리
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
    if (this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
    }

    // retrying 항목을 running으로 복구
    const retryingItem = this._queue.find(i => i.status === 'retrying');
    if (retryingItem) {
      retryingItem.status = 'running';
    }

    this._isPaused = false;

    // rate limit 해제 push
    this._sendRateLimitStatus({
      isWaiting: false,
      remainingMs: 0,
      retryCount: this._rateLimitRetryCount,
      maxRetries: this._maxRetries,
      nextRetryAt: null
    });

    this._sendStatusUpdate();

    // 대기 중인 Promise를 resolve(true)
    if (this._pauseResolve) {
      this._pauseResolve(true);
      this._pauseResolve = null;
    }
    if (this._cancelResolve) {
      this._cancelResolve(true);
      this._cancelResolve = null;
    }
  }

  cancelRateLimitWait(): void {
    if (!this._isPaused) return;

    // 타이머 정리
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
    if (this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
    }

    // retrying 항목을 failed로 전환
    const retryingItem = this._queue.find(i => i.status === 'retrying');
    if (retryingItem) {
      retryingItem.status = 'failed';
      retryingItem.completedAt = new Date().toISOString();
      retryingItem.result = { errorMessage: 'Rate limit wait cancelled by user' };
    }

    this._isPaused = false;
    this._rateLimitRetryCount = 0;

    // rate limit 해제 push
    this._sendRateLimitStatus({
      isWaiting: false,
      remainingMs: 0,
      retryCount: 0,
      maxRetries: this._maxRetries,
      nextRetryAt: null
    });

    this._sendStatusUpdate();

    // 대기 중인 Promise를 resolve(false) — _handleRateLimit에서 return false
    if (this._cancelResolve) {
      this._cancelResolve(false);
      this._cancelResolve = null;
    }
    this._pauseResolve = null;
  }

  private async _processQueue(): Promise<void> {
    if (this._isProcessing) return;
    this._isProcessing = true;

    while (true) {
      // 큐가 일시 정지 상태면 재개될 때까지 대기
      if (this._isPaused) {
        const shouldContinue = await this._waitForResume();
        if (!shouldContinue) break;
      }

      const nextItem = this._queue.find(i => i.status === 'pending');
      if (!nextItem) break;

      await this._executeItem(nextItem);
    }

    this._isProcessing = false;
  }

  private _waitForResume(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._pauseResolve = resolve;
    });
  }

  private async _executeItem(item: QueueItem): Promise<void> {
    item.status = 'running';
    item.startedAt = new Date().toISOString();
    this._sendStatusUpdate();

    const prompt = this._buildPrompt(item.command, item.args);

    try {
      const abortController = new AbortController();
      this._currentAbortController = abortController;

      const { query } = await (new Function('specifier', 'return import(specifier)'))('@anthropic-ai/claude-agent-sdk');

      // 시스템에 설치된 claude-code cli.js 경로를 탐색 (symlink가 아닌 실제 JS 파일)
      const home = process.env.HOME || '';
      const candidatePaths: string[] = [];
      // nvm 버전 자동 탐색
      const nvmBase = `${home}/.nvm/versions/node`;
      try {
        if (fs.existsSync(nvmBase)) {
          const versions = fs.readdirSync(nvmBase).sort().reverse();
          for (const v of versions) {
            candidatePaths.push(path.join(nvmBase, v, 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'));
          }
        }
      } catch {}
      candidatePaths.push(
        '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js',
        '/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js',
      );
      const claudePath = candidatePaths.find(p => { try { return fs.existsSync(p); } catch { return false; } });

      // node 실행 경로 탐색
      const nodeCandidates: string[] = [];
      try {
        if (fs.existsSync(nvmBase)) {
          const versions = fs.readdirSync(nvmBase).sort().reverse();
          for (const v of versions) {
            nodeCandidates.push(path.join(nvmBase, v, 'bin', 'node'));
          }
        }
      } catch {}
      nodeCandidates.push('/usr/local/bin/node', '/opt/homebrew/bin/node');
      const nodePath = nodeCandidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });

      const conversation = query({
        prompt,
        options: {
          cwd: item.cwd,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          systemPrompt: { type: 'preset', preset: 'claude_code' },
          settingSources: ['project'],
          abortController,
          ...(claudePath ? { pathToClaudeCodeExecutable: claudePath } : {}),
          ...(nodePath ? { executable: nodePath } : {}),
          env: (() => {
            const e = { ...process.env };
            delete e['CLAUDECODE'];
            return e;
          })()
        }
      });

      let costUsd = 0;
      let numTurns = 0;
      let sessionId: string | undefined;

      for await (const message of conversation) {
        if (abortController.signal.aborted) break;

        if (message.type === 'rate_limit_event') {
          const rateLimitInfo = (message as any).rate_limit_info;
          if (rateLimitInfo?.status === 'rejected') {
            const shouldContinue = await this._handleRateLimit(item);
            if (!shouldContinue) return;
            await this._executeItem(item);
            return;
          }
          // status === 'allowed' 등은 무시
        }

        if (message.type === 'assistant') {
          numTurns++;

          const innerMsg = (message as any).message;
          // assistant-level error (e.g. rate_limit, billing_error)
          if (innerMsg?.error || (message as any).error) {
            const errVal = innerMsg?.error || (message as any).error;
            this._sendLog({
              itemId: item.id,
              type: 'system',
              content: `[Assistant error] ${errVal}`,
              timestamp: new Date().toISOString()
            });
          }

          const msgContent = innerMsg?.content;
          if (Array.isArray(msgContent)) {
            for (const block of msgContent) {
              let logContent: string | null = null;
              if (block.type === 'text' && block.text) {
                logContent = block.text;
              } else if (block.type === 'tool_use') {
                const inputStr = block.input ? JSON.stringify(block.input) : '';
                logContent = `[Tool: ${block.name}] ${inputStr}`;
              } else if (block.type === 'thinking' && block.thinking) {
                logContent = `[Thinking] ${block.thinking}`;
              } else if (block.type === 'tool_result') {
                // tool_result는 user 메시지에 오지만 혹시 assistant에 포함될 경우 대비
                const content = Array.isArray(block.content)
                  ? block.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
                  : typeof block.content === 'string' ? block.content : '';
                if (content) logContent = `[Tool result] ${content}`;
              }
              if (logContent) {
                this._sendLog({
                  itemId: item.id,
                  type: 'assistant',
                  content: logContent,
                  timestamp: new Date().toISOString()
                });
              }
            }
          } else if (typeof msgContent === 'string' && msgContent) {
            this._sendLog({
              itemId: item.id,
              type: 'assistant',
              content: msgContent,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (message.type === 'tool_progress') {
          const toolName = (message as any).tool_name;
          const elapsed = (message as any).elapsed_time_seconds;
          this._sendLog({
            itemId: item.id,
            type: 'system',
            content: `[Tool: ${toolName}] ${elapsed?.toFixed(1) ?? '?'}s`,
            timestamp: new Date().toISOString()
          });
        }

        if (message.type === 'result') {
          sessionId = message.session_id;
          costUsd = message.total_cost_usd ?? 0;
          numTurns = message.num_turns ?? numTurns;
          // 에러 subtype 로그
          if ((message as any).subtype && (message as any).subtype !== 'success') {
            const errors: string[] = (message as any).errors ?? [];
            this._sendLog({
              itemId: item.id,
              type: 'system',
              content: `[Result error] ${(message as any).subtype}${errors.length ? ': ' + errors.join(', ') : ''}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      if (item.status === 'running') {
        item.status = 'success';
        item.completedAt = new Date().toISOString();
        item.result = {
          sessionId,
          costUsd,
          durationMs: new Date().getTime() - new Date(item.startedAt!).getTime(),
          numTurns
        };
        // 성공 시 rate limit 카운터 리셋
        this._rateLimitRetryCount = 0;
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
        this._sendLog({
          itemId: item.id,
          type: 'system',
          content: `[DEBUG] rate limit catch: ${errMsg}`,
          timestamp: new Date().toISOString()
        });
        const shouldContinue = await this._handleRateLimit(item);
        if (!shouldContinue) return;
        await this._executeItem(item);
        return;
      }

      if ((item.status as QueueItemStatus) !== 'aborted') {
        item.status = 'failed';
        item.completedAt = new Date().toISOString();
        const detail = err.stderr ? `\nstderr: ${err.stderr}` : (err.stack ? `\n${err.stack}` : '');
        item.result = { errorMessage: errMsg + detail };
      }
    } finally {
      this._currentAbortController = null;
      this._saveToDisk();
      this._sendStatusUpdate();
    }
  }

  private async _handleRateLimit(item: QueueItem): Promise<boolean> {
    this._rateLimitRetryCount++;
    item.retryCount++;
    item.status = 'retrying';
    this._saveToDisk();

    // 최대 재시도 횟수 초과 검사 (FR-18)
    if (this._rateLimitRetryCount > this._maxRetries) {
      item.status = 'failed';
      item.completedAt = new Date().toISOString();
      item.result = { errorMessage: `Rate limit: max retries (${this._maxRetries}) exceeded` };

      this._isPaused = false;
      this._rateLimitRetryCount = 0;
      this._saveToDisk();

      // workspace:rate-limit-exhausted 이벤트 push
      this._sendRateLimitExhausted({
        itemId: item.id,
        retryCount: item.retryCount,
        maxRetries: this._maxRetries
      });

      this._sendStatusUpdate();
      return false;
    }

    // 큐 전체 일시 정지 (FR-14)
    this._isPaused = true;

    // 5분 고정 retry 간격
    const waitMs = RATE_LIMIT_RETRY_INTERVAL_MS;
    const nextRetryAt = new Date(Date.now() + waitMs).toISOString();

    this._sendLog({
      itemId: item.id,
      type: 'system',
      content: `Rate limit 감지. 큐 전체 일시 정지. 5분 후 재시도 (${new Date(Date.now() + waitMs).toLocaleTimeString()})`,
      timestamp: new Date().toISOString()
    });

    // workspace:rate-limit-status push (FR-16)
    let remainingMs = waitMs;
    this._sendRateLimitStatus({
      isWaiting: true,
      remainingMs,
      retryCount: this._rateLimitRetryCount,
      maxRetries: this._maxRetries,
      nextRetryAt
    });

    // 기존 queue:status-update retryInfo 하위 호환
    this._sendStatusUpdate({
      itemId: item.id,
      retryCount: item.retryCount,
      nextRetryAt,
      remainingMs: waitMs
    });

    // 카운트다운 (기존 queue:status-update + 신규 workspace:rate-limit-status 동시 push)
    this._countdownIntervalId = setInterval(() => {
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        if (this._countdownIntervalId) {
          clearInterval(this._countdownIntervalId);
          this._countdownIntervalId = null;
        }
        return;
      }

      this._sendStatusUpdate({
        itemId: item.id,
        retryCount: item.retryCount,
        nextRetryAt,
        remainingMs
      });

      this._sendRateLimitStatus({
        isWaiting: true,
        remainingMs,
        retryCount: this._rateLimitRetryCount,
        maxRetries: this._maxRetries,
        nextRetryAt
      });
    }, 1000);

    // 대기 후 재개
    return new Promise<boolean>((resolve) => {
      // Store both resolve functions so forceRetryNow/cancelRateLimitWait can trigger them
      this._pauseResolve = resolve;
      this._cancelResolve = resolve;

      this._retryTimeoutId = setTimeout(() => {
        this._retryTimeoutId = null;
        if (this._countdownIntervalId) {
          clearInterval(this._countdownIntervalId);
          this._countdownIntervalId = null;
        }

        if (item.status === 'aborted') {
          this._isPaused = false;
          this._pauseResolve = null;
          this._cancelResolve = null;
          resolve(false);
          return;
        }

        item.status = 'running';
        this._isPaused = false;
        this._pauseResolve = null;
        this._cancelResolve = null;

        // rate limit 해제 push
        this._sendRateLimitStatus({
          isWaiting: false,
          remainingMs: 0,
          retryCount: this._rateLimitRetryCount,
          maxRetries: this._maxRetries,
          nextRetryAt: null
        });

        this._sendStatusUpdate();
        resolve(true);
      }, waitMs);
    });
  }

  private _buildPrompt(command: QueueCommandType, args: string): string {
    if (args && args.trim()) {
      return `${command} ${args.trim()}`;
    }
    return command;
  }

  private _sendStatusUpdate(retryInfo?: QueueStatusUpdate['retryInfo']): void {
    const win = this._getWindow();
    if (!win) return;
    const update: QueueStatusUpdate = {
      items: this._queue,
      retryInfo
    };
    win.webContents.send('queue:status-update', update);
  }

  private _sendLog(log: QueueLogMessage): void {
    const win = this._getWindow();
    if (!win) return;
    const truncated: QueueLogMessage = {
      ...log,
      content: truncateLogContent(log.content)
    };
    win.webContents.send('queue:log', truncated);
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

  _reset(): void {
    if (this._retryTimeoutId) {
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = null;
    }
    if (this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
    }
    if (this._currentAbortController) {
      this._currentAbortController.abort();
      this._currentAbortController = null;
    }
    this._queue = [];
    this._isProcessing = false;
    this._securityWarningShown = false;
    this._isPaused = false;
    this._pauseResolve = null;
    this._cancelResolve = null;
    this._rateLimitRetryCount = 0;
    this._maxRetries = 10;
  }
}

export = CommandQueueService;
