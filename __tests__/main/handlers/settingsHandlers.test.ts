/**
 * settingsHandlers unit tests
 * Source: src/main/handlers/settingsHandlers.ts
 */

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockExecFile = jest.fn();

let handlers: typeof import('../../../src/main/handlers/settingsHandlers');

beforeEach(() => {
  jest.resetModules();

  jest.doMock('../../../src/main/services/settingsStore', () => {
    return jest.fn().mockImplementation(() => ({
      get: mockGet,
      update: mockUpdate,
    }));
  });

  jest.doMock('child_process', () => ({
    execFile: mockExecFile,
  }));

  handlers = require('../../../src/main/handlers/settingsHandlers');

  mockGet.mockReset();
  mockUpdate.mockReset();
  mockExecFile.mockReset();
});

describe('handleSettingsGet', () => {
  it('returns settings on success', async () => {
    const settings = { dockerEnabled: true, defaultProjectPath: '/home/user/projects' };
    mockGet.mockReturnValue(settings);

    const result = await handlers.handleSettingsGet();

    expect(result).toEqual({ success: true, settings });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('returns error when store throws', async () => {
    mockGet.mockImplementation(() => { throw new Error('FILE_READ_ERROR'); });

    const result = await handlers.handleSettingsGet();

    expect(result).toEqual({ success: false, error: 'FILE_READ_ERROR' });
  });
});

describe('handleSettingsUpdate', () => {
  it('updates settings and returns merged result', async () => {
    const merged = { dockerEnabled: false, defaultProjectPath: '/new/path' };
    mockUpdate.mockReturnValue(merged);

    const result = await handlers.handleSettingsUpdate(null, { dockerEnabled: false });

    expect(result).toEqual({ success: true, settings: merged });
    expect(mockUpdate).toHaveBeenCalledWith({ dockerEnabled: false });
  });

  it('handles partial update with multiple fields', async () => {
    const merged = { dockerEnabled: true, defaultProjectPath: '/updated' };
    mockUpdate.mockReturnValue(merged);

    const updates = { defaultProjectPath: '/updated' };
    const result = await handlers.handleSettingsUpdate(null, updates);

    expect(result).toEqual({ success: true, settings: merged });
    expect(mockUpdate).toHaveBeenCalledWith(updates);
  });

  it('returns error on update failure', async () => {
    mockUpdate.mockImplementation(() => { throw new Error('WRITE_FAIL'); });

    const result = await handlers.handleSettingsUpdate(null, { dockerEnabled: true });

    expect(result).toEqual({ success: false, error: 'WRITE_FAIL' });
  });
});

describe('handleDockerCheck', () => {
  it('returns available true with version when docker is available', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '24.0.7\n');
    });

    const result = await handlers.handleDockerCheck();

    expect(result).toEqual({ success: true, available: true, version: '24.0.7' });
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker',
      ['version', '--format', '{{.Server.Version}}'],
      { timeout: 5000 },
      expect.any(Function),
    );
  });

  it('returns available false when docker is not installed', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(new Error('docker: command not found'));
    });

    const result = await handlers.handleDockerCheck();

    expect(result).toEqual({
      success: true,
      available: false,
      error: 'docker: command not found',
    });
  });

  it('returns available false when docker daemon is not running', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(new Error('Cannot connect to the Docker daemon'));
    });

    const result = await handlers.handleDockerCheck();

    expect(result.success).toBe(true);
    expect(result.available).toBe(false);
    expect(result.error).toContain('Cannot connect to the Docker daemon');
  });

  it('trims whitespace from version output', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '  25.0.1  \n');
    });

    const result = await handlers.handleDockerCheck();

    expect(result.version).toBe('25.0.1');
  });

  it('handles empty stdout gracefully', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '');
    });

    const result = await handlers.handleDockerCheck();

    expect(result).toEqual({ success: true, available: true, version: '' });
  });
});
