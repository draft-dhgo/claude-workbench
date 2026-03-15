import { execFile } from 'child_process';
import fs = require('fs');
import path = require('path');
import {
  DockerContainerConfig,
  DockerExecResult,
  DockerStatus,
} from '../../shared/types/container';

/**
 * Docker CLI 래퍼 서비스
 * dockerode 대신 CLI 패턴 사용 (electron-builder 호환성)
 */
class DockerService {
  private _timeout = 300000; // 5min default

  // --- Docker Availability ---

  async isDockerAvailable(): Promise<boolean> {
    try {
      await this._exec(['version', '--format', '{{.Server.Version}}']);
      return true;
    } catch {
      return false;
    }
  }

  async getDockerStatus(): Promise<DockerStatus> {
    try {
      const version = await this._exec(['version', '--format', '{{.Server.Version}}']);
      return { available: true, version: version.trim() };
    } catch (err: any) {
      return { available: false, error: err.message };
    }
  }

  // --- Image Operations ---

  async buildImage(contextPath: string, tag: string, dockerfile?: string): Promise<string> {
    const args = ['build', '-t', tag];
    if (dockerfile) args.push('-f', dockerfile);
    args.push(contextPath);
    return this._exec(args, 600000); // 10min for build
  }

  async pullImage(image: string): Promise<void> {
    await this._exec(['pull', image], 600000);
  }

  async imageExists(image: string): Promise<boolean> {
    try {
      await this._exec(['image', 'inspect', image]);
      return true;
    } catch {
      return false;
    }
  }

  // --- Container Lifecycle ---

  async createContainer(config: DockerContainerConfig): Promise<string> {
    const args = ['create', '--name', config.name];

    // Mounts
    for (const mount of config.mounts || []) {
      const flag = mount.readonly
        ? `${mount.hostPath}:${mount.containerPath}:ro`
        : `${mount.hostPath}:${mount.containerPath}`;
      args.push('-v', flag);
    }

    // Env
    for (const [key, value] of Object.entries(config.env || {})) {
      args.push('-e', `${key}=${value}`);
    }

    // Working dir
    if (config.workingDir) {
      args.push('-w', config.workingDir);
    }

    // Network
    if (config.networkMode) {
      args.push('--network', config.networkMode);
    }

    // Init for proper signal handling
    args.push('--init');

    // Image + keep alive command
    args.push(config.image, 'tail', '-f', '/dev/null');

    const output = await this._exec(args);
    return output.trim().substring(0, 12); // container ID (short)
  }

  async startContainer(containerId: string): Promise<void> {
    await this._exec(['start', containerId]);
  }

  async stopContainer(containerId: string, timeout = 10): Promise<void> {
    await this._exec(['stop', '-t', String(timeout), containerId]);
  }

  async removeContainer(containerId: string, force = false): Promise<void> {
    const args = ['rm'];
    if (force) args.push('-f');
    args.push(containerId);
    await this._exec(args);
  }

  async getContainerStatus(containerId: string): Promise<'running' | 'stopped' | 'not_found'> {
    try {
      const output = await this._exec(['inspect', '--format', '{{.State.Status}}', containerId]);
      const status = output.trim();
      return status === 'running' ? 'running' : 'stopped';
    } catch {
      return 'not_found';
    }
  }

  /**
   * 특정 이름 prefix로 Docker 컨테이너 목록 조회
   */
  async listContainers(namePrefix?: string): Promise<Array<{ id: string; name: string; status: string }>> {
    try {
      const args = ['ps', '-a', '--format', '{{.ID}}|{{.Names}}|{{.Status}}'];
      if (namePrefix) {
        args.push('--filter', `name=${namePrefix}`);
      }
      const output = await this._exec(args);
      return output.trim().split('\n').filter(l => l.trim()).map(line => {
        const [id, name, status] = line.split('|');
        return { id: id.trim(), name: name.trim(), status: status.trim() };
      });
    } catch {
      return [];
    }
  }

  // --- Exec in Container ---

  async execInContainer(containerId: string, command: string[]): Promise<DockerExecResult> {
    return new Promise((resolve) => {
      const args = ['exec', containerId, ...command];
      execFile('docker', args, {
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: this._timeout,
      }, (err: any, stdout, stderr) => {
        resolve({
          exitCode: err ? (err.code || 1) : 0,
          stdout: (stdout || '').toString(),
          stderr: (stderr || '').toString(),
        });
      });
    });
  }

  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    return this._exec(['logs', '--tail', String(tail), containerId]);
  }

  // --- Devcontainer Support ---

  async buildDevcontainer(contextPath: string, tag: string): Promise<void> {
    const devcontainerDir = path.join(contextPath, '.devcontainer');
    const dockerfile = path.join(devcontainerDir, 'Dockerfile');

    if (fs.existsSync(dockerfile)) {
      await this.buildImage(contextPath, tag, dockerfile);
    } else {
      // Use default image from devcontainer.json
      const configPath = path.join(devcontainerDir, 'devcontainer.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.image) {
          await this.pullImage(config.image);
        }
      }
    }
  }

  // --- Internal ---

  private _exec(args: string[], timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('docker', args, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: timeout || this._timeout,
      }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message).toString().trim()));
        } else {
          resolve((stdout || '').toString());
        }
      });
    });
  }
}

export = DockerService;
