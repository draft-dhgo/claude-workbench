import { InvokeChannel, SendChannel, ReceiveChannel } from './ipc';

export interface ElectronAPI {
  send(channel: string, data?: unknown): void;
  on(channel: string, callback: (...args: unknown[]) => void): void;
  invoke(channel: string, data?: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    /** 렌더러 글로벌 함수들 (탭 전환 등) */
    loadSets?: () => void;
    loadWorktreeSets?: () => void;
    loadWorkspaceTab?: () => void;
    loadRepoWorktreeTab?: () => void;
  }
}
