/**
 * preload unit tests
 * Source: src/preload/index.ts
 *
 * The preload script calls contextBridge.exposeInMainWorld at module load time,
 * so we must use jest.resetModules() + fresh require for each test to capture
 * the mock calls properly.
 */

function loadPreloadAndGetAPI(): {
  api: {
    send: (channel: string, data?: unknown) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    invoke: (channel: string, data?: unknown) => Promise<unknown>;
  };
  contextBridge: { exposeInMainWorld: jest.Mock };
  ipcRenderer: { send: jest.Mock; on: jest.Mock; invoke: jest.Mock };
} {
  // After resetModules, require fresh electron mock + preload
  const electron = require('electron');
  require('../../src/preload/index');
  return {
    api: electron.contextBridge.exposeInMainWorld.mock.calls[0][1],
    contextBridge: electron.contextBridge,
    ipcRenderer: electron.ipcRenderer,
  };
}

beforeEach(() => {
  jest.resetModules();
});

describe('contextBridge.exposeInMainWorld', () => {
  it('is called with "electronAPI" as the API name', () => {
    const { contextBridge } = loadPreloadAndGetAPI();

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(contextBridge.exposeInMainWorld.mock.calls[0][0]).toBe('electronAPI');
  });

  it('exposes send, on, and invoke methods', () => {
    const { api } = loadPreloadAndGetAPI();

    expect(typeof api.send).toBe('function');
    expect(typeof api.on).toBe('function');
    expect(typeof api.invoke).toBe('function');
  });
});

describe('invoke — allowed channels', () => {
  it('forwards invoke for project:list channel', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    ipcRenderer.invoke.mockResolvedValue({ success: true, projects: [] });

    const result = await api.invoke('project:list', {});

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:list', {});
    expect(result).toEqual({ success: true, projects: [] });
  });

  it('forwards invoke for pipeline:status channel', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    ipcRenderer.invoke.mockResolvedValue({ success: true, running: false });

    await api.invoke('pipeline:status');

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('pipeline:status', undefined);
  });

  it('forwards invoke for issue:create channel', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    ipcRenderer.invoke.mockResolvedValue({ success: true });

    await api.invoke('issue:create', { title: 'Test' });

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('issue:create', { title: 'Test' });
  });

  it('forwards invoke for container:pool-status channel', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    ipcRenderer.invoke.mockResolvedValue({ success: true });

    await api.invoke('container:pool-status');

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('container:pool-status', undefined);
  });

  it('forwards invoke for dialog:select-directory channel', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    ipcRenderer.invoke.mockResolvedValue({ success: true, path: '/tmp' });

    await api.invoke('dialog:select-directory');

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('dialog:select-directory', undefined);
  });
});

describe('invoke — unauthorized channels are rejected', () => {
  it('rejects an unknown channel with an error', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();

    await expect(api.invoke('shell:exec', { cmd: 'rm -rf /' }))
      .rejects.toThrow('Channel not allowed: shell:exec');
    expect(ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('rejects a channel with similar prefix but not in allowlist', async () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();

    await expect(api.invoke('project:evil-command'))
      .rejects.toThrow('Channel not allowed: project:evil-command');
    expect(ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});

describe('on — allowed receive channels', () => {
  it('registers listener for issue:list-updated', () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    const callback = jest.fn();

    api.on('issue:list-updated', callback);

    expect(ipcRenderer.on).toHaveBeenCalledWith('issue:list-updated', expect.any(Function));
  });

  it('registers listener for pipeline:log', () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    const callback = jest.fn();

    api.on('pipeline:log', callback);

    expect(ipcRenderer.on).toHaveBeenCalledWith('pipeline:log', expect.any(Function));
  });

  it('does not register listener for unauthorized receive channel', () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();
    const callback = jest.fn();

    api.on('malicious:channel', callback);

    expect(ipcRenderer.on).not.toHaveBeenCalled();
  });
});

describe('send — allowed send channels', () => {
  it('does not send on unauthorized channel', () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();

    api.send('unauthorized:channel', { data: 'test' });

    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });

  it('ALLOWED_SEND_CHANNELS is empty so any send is blocked', () => {
    const { api, ipcRenderer } = loadPreloadAndGetAPI();

    // project:list is an invoke channel, not a send channel
    api.send('project:list', {});

    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });
});
