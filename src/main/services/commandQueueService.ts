import crypto = require('crypto');
import { BrowserWindow } from 'electron';
import { QueueItem, QueueItemStatus, QueueCommandType, QueueItemResult, QueueLogMessage, QueueStatusUpdate } from '../../shared/types/models';

class CommandQueueService {
  private _queue: QueueItem[] = [];
  private _isProcessing: boolean = false;
  private _currentAbortController: AbortController | null = null;
  private _retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private _securityWarningShown: boolean = false;

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
    this._sendStatusUpdate();

    if (!this._isProcessing) {
      this._processQueue();
    }

    return item;
  }

  dequeue(itemId: string): boolean {
    const idx = this._queue.findIndex(i => i.id === itemId && i.status === 'pending');
    if (idx === -1) return false;
    this._queue.splice(idx, 1);
    this._sendStatusUpdate();
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

  private async _processQueue(): Promise<void> {
    if (this._isProcessing) return;
    this._isProcessing = true;

    while (true) {
      const nextItem = this._queue.find(i => i.status === 'pending');
      if (!nextItem) break;

      await this._executeItem(nextItem);
    }

    this._isProcessing = false;
  }

  private async _executeItem(item: QueueItem): Promise<void> {
    item.status = 'running';
    item.startedAt = new Date().toISOString();
    this._sendStatusUpdate();

    const prompt = this._buildPrompt(item.command, item.args);

    try {
      const abortController = new AbortController();
      this._currentAbortController = abortController;

      const { query } = require('@anthropic-ai/claude-agent-sdk');

      const conversation = query({
        prompt,
        options: {
          cwd: item.cwd,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          systemPrompt: { type: 'preset', preset: 'claude_code' },
          settingSources: ['project'],
          abortController
        }
      });

      let costUsd = 0;
      let numTurns = 0;
      let sessionId: string | undefined;

      for await (const message of conversation) {
        if (abortController.signal.aborted) break;

        if (message.type === 'assistant') {
          numTurns++;

          if (message.error === 'rate_limit') {
            const shouldContinue = await this._handleRateLimit(item);
            if (!shouldContinue) return;
            // After rate limit retry, re-execute the item
            await this._executeItem(item);
            return;
          }

          const contentText = typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
          this._sendLog({
            itemId: item.id,
            type: 'assistant',
            content: contentText,
            timestamp: new Date().toISOString()
          });
        }

        if (message.type === 'result') {
          sessionId = message.sessionId;
          costUsd = message.costUsd ?? 0;
          numTurns = message.numTurns ?? numTurns;
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
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
        const shouldContinue = await this._handleRateLimit(item);
        if (!shouldContinue) return;
        await this._executeItem(item);
        return;
      }

      if ((item.status as QueueItemStatus) !== 'aborted') {
        item.status = 'failed';
        item.completedAt = new Date().toISOString();
        item.result = { errorMessage: errMsg };
      }
    } finally {
      this._currentAbortController = null;
      this._sendStatusUpdate();
    }
  }

  private async _handleRateLimit(item: QueueItem): Promise<boolean> {
    item.retryCount++;
    item.status = 'retrying';

    const waitSeconds = Math.min(30 * Math.pow(2, item.retryCount - 1), 300);
    const waitMs = waitSeconds * 1000;
    const nextRetryAt = new Date(Date.now() + waitMs).toISOString();

    this._sendLog({
      itemId: item.id,
      type: 'system',
      content: `Rate limit 감지. ${waitSeconds}초 후 재시도 (시도 #${item.retryCount})`,
      timestamp: new Date().toISOString()
    });

    let remainingMs = waitMs;
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
    }, 1000);

    this._sendStatusUpdate({
      itemId: item.id,
      retryCount: item.retryCount,
      nextRetryAt,
      remainingMs: waitMs
    });

    return new Promise<boolean>((resolve) => {
      this._retryTimeoutId = setTimeout(() => {
        this._retryTimeoutId = null;
        if (this._countdownIntervalId) {
          clearInterval(this._countdownIntervalId);
          this._countdownIntervalId = null;
        }

        if (item.status === 'aborted') {
          resolve(false);
          return;
        }

        item.status = 'running';
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
    win.webContents.send('queue:log', log);
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
  }
}

export = CommandQueueService;
