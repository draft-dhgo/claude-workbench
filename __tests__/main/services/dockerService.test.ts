// DockerService unit tests

const mockExecFile = jest.fn();
jest.mock('child_process', () => ({ execFile: mockExecFile }));

import DockerService = require('../../../src/main/services/dockerService');

let docker: InstanceType<typeof DockerService>;

beforeEach(() => {
  mockExecFile.mockReset();
  docker = new DockerService();
});

function mockDockerSuccess(stdout = '') {
  mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
    cb(null, stdout, '');
  });
}

function mockDockerFailure(message: string) {
  mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
    const err: any = new Error(message);
    err.code = 1;
    cb(err, '', message);
  });
}

describe('DockerService.isDockerAvailable', () => {
  it('returns true when docker version succeeds', async () => {
    mockDockerSuccess('24.0.5');
    const result = await docker.isDockerAvailable();
    expect(result).toBe(true);
  });

  it('returns false when docker version fails', async () => {
    mockDockerFailure('docker: command not found');
    const result = await docker.isDockerAvailable();
    expect(result).toBe(false);
  });
});

describe('DockerService.getDockerStatus', () => {
  it('returns available status with version', async () => {
    mockDockerSuccess('24.0.5\n');
    const status = await docker.getDockerStatus();
    expect(status.available).toBe(true);
    expect(status.version).toBe('24.0.5');
  });

  it('returns unavailable status with error', async () => {
    mockDockerFailure('Cannot connect to the Docker daemon');
    const status = await docker.getDockerStatus();
    expect(status.available).toBe(false);
    expect(status.error).toBeDefined();
  });
});

describe('DockerService.imageExists', () => {
  it('returns true when image inspect succeeds', async () => {
    mockDockerSuccess('[]');
    const exists = await docker.imageExists('node:20');
    expect(exists).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['image', 'inspect', 'node:20'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('returns false when image inspect fails', async () => {
    mockDockerFailure('No such image');
    const exists = await docker.imageExists('nonexistent:latest');
    expect(exists).toBe(false);
  });
});

describe('DockerService.createContainer', () => {
  it('creates a container with basic config and returns short id', async () => {
    mockDockerSuccess('abc123def456789abcdef\n');
    const id = await docker.createContainer({
      image: 'node:20',
      name: 'test-container',
      mounts: [],
      env: {},
    });
    expect(id).toBe('abc123def456');
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('create');
    expect(args).toContain('--name');
    expect(args).toContain('test-container');
    expect(args).toContain('--init');
    expect(args).toContain('node:20');
    expect(args).toContain('tail');
  });

  it('adds volume mounts to args', async () => {
    mockDockerSuccess('container123456789\n');
    await docker.createContainer({
      image: 'node:20',
      name: 'test',
      mounts: [
        { hostPath: '/host/path', containerPath: '/container/path' },
        { hostPath: '/host/ro', containerPath: '/container/ro', readonly: true },
      ],
      env: {},
    });
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('-v');
    expect(args).toContain('/host/path:/container/path');
    expect(args).toContain('/host/ro:/container/ro:ro');
  });

  it('adds environment variables to args', async () => {
    mockDockerSuccess('container123456789\n');
    await docker.createContainer({
      image: 'node:20',
      name: 'test',
      mounts: [],
      env: { NODE_ENV: 'production', DEBUG: 'true' },
    });
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('-e');
    expect(args).toContain('NODE_ENV=production');
    expect(args).toContain('DEBUG=true');
  });

  it('adds working directory when specified', async () => {
    mockDockerSuccess('container123456789\n');
    await docker.createContainer({
      image: 'node:20',
      name: 'test',
      mounts: [],
      env: {},
      workingDir: '/workspace',
    });
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('-w');
    expect(args).toContain('/workspace');
  });

  it('adds network mode when specified', async () => {
    mockDockerSuccess('container123456789\n');
    await docker.createContainer({
      image: 'node:20',
      name: 'test',
      mounts: [],
      env: {},
      networkMode: 'host',
    });
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('--network');
    expect(args).toContain('host');
  });
});

describe('DockerService.startContainer', () => {
  it('calls docker start with container id', async () => {
    mockDockerSuccess();
    await docker.startContainer('abc123');
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['start', 'abc123'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('DockerService.stopContainer', () => {
  it('calls docker stop with default timeout', async () => {
    mockDockerSuccess();
    await docker.stopContainer('abc123');
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toEqual(['stop', '-t', '10', 'abc123']);
  });

  it('calls docker stop with custom timeout', async () => {
    mockDockerSuccess();
    await docker.stopContainer('abc123', 30);
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toEqual(['stop', '-t', '30', 'abc123']);
  });
});

describe('DockerService.removeContainer', () => {
  it('removes container without force', async () => {
    mockDockerSuccess();
    await docker.removeContainer('abc123');
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['rm', 'abc123'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('removes container with force flag', async () => {
    mockDockerSuccess();
    await docker.removeContainer('abc123', true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['rm', '-f', 'abc123'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('DockerService.getContainerStatus', () => {
  it('returns running when container is running', async () => {
    mockDockerSuccess('running\n');
    const status = await docker.getContainerStatus('abc123');
    expect(status).toBe('running');
  });

  it('returns stopped when container is exited', async () => {
    mockDockerSuccess('exited\n');
    const status = await docker.getContainerStatus('abc123');
    expect(status).toBe('stopped');
  });

  it('returns not_found when inspect fails', async () => {
    mockDockerFailure('No such container');
    const status = await docker.getContainerStatus('bad-id');
    expect(status).toBe('not_found');
  });
});

describe('DockerService.execInContainer', () => {
  it('returns exit code 0 and stdout on success', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      cb(null, 'command output\n', '');
    });
    const result = await docker.execInContainer('abc123', ['echo', 'hello']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('command output\n');
    expect(result.stderr).toBe('');
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['exec', 'abc123', 'echo', 'hello'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('returns non-zero exit code on failure without rejecting', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err: any = new Error('command failed');
      err.code = 1;
      cb(err, '', 'error output');
    });
    const result = await docker.execInContainer('abc123', ['bad-command']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('error output');
  });
});

describe('DockerService.getContainerLogs', () => {
  it('calls docker logs with default tail', async () => {
    mockDockerSuccess('log line 1\nlog line 2\n');
    const logs = await docker.getContainerLogs('abc123');
    expect(logs).toBe('log line 1\nlog line 2\n');
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['logs', '--tail', '100', 'abc123'],
      expect.any(Object), expect.any(Function)
    );
  });

  it('calls docker logs with custom tail', async () => {
    mockDockerSuccess('last line\n');
    await docker.getContainerLogs('abc123', 50);
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['logs', '--tail', '50', 'abc123'],
      expect.any(Object), expect.any(Function)
    );
  });
});

describe('DockerService.pullImage', () => {
  it('calls docker pull', async () => {
    mockDockerSuccess();
    await docker.pullImage('node:20');
    expect(mockExecFile).toHaveBeenCalledWith(
      'docker', ['pull', 'node:20'],
      expect.objectContaining({ timeout: 600000 }), expect.any(Function)
    );
  });
});

describe('DockerService.buildImage', () => {
  it('builds image with tag and context path', async () => {
    mockDockerSuccess('Successfully built abc123\n');
    const output = await docker.buildImage('/context', 'my-image:latest');
    expect(output).toContain('Successfully built');
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('build');
    expect(args).toContain('-t');
    expect(args).toContain('my-image:latest');
    expect(args).toContain('/context');
  });

  it('adds dockerfile flag when specified', async () => {
    mockDockerSuccess();
    await docker.buildImage('/context', 'my-image', '/context/Dockerfile.custom');
    const args = mockExecFile.mock.calls[0][1];
    expect(args).toContain('-f');
    expect(args).toContain('/context/Dockerfile.custom');
  });
});
