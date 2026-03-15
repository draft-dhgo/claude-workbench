// ContainerPoolService unit tests

import os = require('os');
import fs = require('fs');
import path = require('path');

// Mock electron before importing the service
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

// Mock DockerService
const mockDocker = {
  isDockerAvailable: jest.fn().mockResolvedValue(false),
  createContainer: jest.fn().mockResolvedValue('docker-abc123'),
  startContainer: jest.fn().mockResolvedValue(undefined),
  removeContainer: jest.fn().mockResolvedValue(undefined),
};

// Mock GitService
const mockGit = {
  fetch: jest.fn().mockResolvedValue(undefined),
  createWorktree: jest.fn().mockResolvedValue(undefined),
  removeWorktree: jest.fn().mockResolvedValue(undefined),
};

import ContainerPoolService = require('../../../src/main/services/containerPoolService');
import { Project } from '../../../src/shared/types/project';
import { Issue } from '../../../src/shared/types/issue';

let tmpDir: string;
let service: InstanceType<typeof ContainerPoolService>;
let testProject: Project;
let testIssue: Issue;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-test-pool-'));

  jest.clearAllMocks();
  mockDocker.isDockerAvailable.mockResolvedValue(false);

  service = new ContainerPoolService(mockDocker as any, mockGit as any);

  testProject = {
    id: 'proj-001',
    name: 'test-project',
    issueRepoPath: path.join(tmpDir, 'issue-repo'),
    devRepos: [],
    localBasePath: tmpDir,
    settings: {
      maxContainers: 3,
      lang: 'ko',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  testIssue = {
    id: 'ISSUE-001',
    title: 'Test Issue',
    description: 'desc',
    type: 'feature',
    status: 'created',
    baseBranch: 'main',
    issueBranch: 'issue/ISSUE-001',
    priority: 'medium',
    pipelineCommand: '/teams',
    labels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure localBasePath exists for worktree creation
  fs.mkdirSync(testProject.issueRepoPath, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ContainerPoolService.initPool', () => {
  it('initializes a new pool for a project', () => {
    service.initPool(testProject);
    const pool = service.getPoolState(testProject.id);
    expect(pool).not.toBeNull();
    expect(pool!.projectId).toBe('proj-001');
    expect(pool!.maxContainers).toBe(3);
    expect(pool!.containers).toEqual([]);
    expect(pool!.queuedIssues).toEqual([]);
  });

  it('does not reinitialize an existing pool', () => {
    service.initPool(testProject);
    // Modify pool state
    service.queueIssue(testProject.id, 'ISSUE-X');
    // Re-init should not reset
    service.initPool(testProject);
    const pool = service.getPoolState(testProject.id);
    expect(pool!.queuedIssues).toContain('ISSUE-X');
  });
});

describe('ContainerPoolService.getPoolState', () => {
  it('returns null for non-existent project', () => {
    expect(service.getPoolState('non-existent')).toBeNull();
  });
});

describe('ContainerPoolService.setMaxContainers', () => {
  it('updates the max container count for a pool', () => {
    service.initPool(testProject);
    service.setMaxContainers(testProject.id, 10);
    const pool = service.getPoolState(testProject.id);
    expect(pool!.maxContainers).toBe(10);
  });

  it('does nothing for non-existent pool', () => {
    // Should not throw
    service.setMaxContainers('non-existent', 5);
  });
});

describe('ContainerPoolService.acquireContainer', () => {
  it('creates a new container when pool is empty', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    expect(container).toBeDefined();
    expect(container.projectId).toBe(testProject.id);
    expect(container.status).toBe('provisioning');
    expect(container.assignedIssueId).toBe('ISSUE-001');
    expect(container.worktrees).toEqual([]);
  });

  it('reuses an idle container', async () => {
    // Create first container then release it
    const first = await service.acquireContainer(testProject, testIssue);
    await service.releaseContainer(testProject.id, first.id);

    // Acquire again should reuse the idle container
    const testIssue2 = { ...testIssue, id: 'ISSUE-002' };
    const second = await service.acquireContainer(testProject, testIssue2);
    expect(second.id).toBe(first.id);
    expect(second.assignedIssueId).toBe('ISSUE-002');
  });

  it('throws CONTAINER_POOL_FULL when at max capacity', async () => {
    // maxContainers = 3, fill up the pool
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-001' });
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-002' });
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-003' });

    await expect(
      service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-004' })
    ).rejects.toThrow('CONTAINER_POOL_FULL');
  });

  it('queues the issue when pool is full', async () => {
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-001' });
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-002' });
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-003' });

    try {
      await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-004' });
    } catch { /* expected */ }

    const pool = service.getPoolState(testProject.id);
    expect(pool!.queuedIssues).toContain('ISSUE-004');
  });

  it('creates worktreeBasePath directory', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    expect(fs.existsSync(container.worktreeBasePath)).toBe(true);
  });
});

describe('ContainerPoolService.releaseContainer', () => {
  it('sets container status to idle and clears assignment', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    await service.releaseContainer(testProject.id, container.id);

    const released = service.getContainer(testProject.id, container.id);
    expect(released!.status).toBe('idle');
    expect(released!.assignedIssueId).toBeUndefined();
    expect(released!.worktrees).toEqual([]);
  });

  it('does nothing for non-existent pool', async () => {
    // Should not throw
    await service.releaseContainer('non-existent', 'bad-id');
  });

  it('does nothing for non-existent container', async () => {
    service.initPool(testProject);
    await service.releaseContainer(testProject.id, 'bad-container-id');
  });
});

describe('ContainerPoolService.destroyContainer', () => {
  it('removes a container from the pool', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    await service.destroyContainer(testProject.id, container.id);

    const pool = service.getPoolState(testProject.id);
    expect(pool!.containers).toHaveLength(0);
  });

  it('calls docker removeContainer when dockerContainerId exists', async () => {
    mockDocker.isDockerAvailable.mockResolvedValue(true);
    const container = await service.acquireContainer(testProject, testIssue);

    // The container should have a dockerContainerId since docker is available
    await service.destroyContainer(testProject.id, container.id);
    expect(mockDocker.removeContainer).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('does nothing for non-existent container', async () => {
    service.initPool(testProject);
    // Should not throw
    await service.destroyContainer(testProject.id, 'non-existent');
  });

  it('cleans up container logs', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    // Logs should exist
    expect(service.getContainerLogs(container.id)).toEqual(expect.any(Array));
    await service.destroyContainer(testProject.id, container.id);
    // Logs should be cleaned up
    expect(service.getContainerLogs(container.id)).toEqual([]);
  });
});

describe('ContainerPoolService.destroyAllContainers', () => {
  it('destroys all containers in a pool', async () => {
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-001' });
    await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-002' });

    await service.destroyAllContainers(testProject.id);
    const pool = service.getPoolState(testProject.id);
    expect(pool!.containers).toHaveLength(0);
    expect(pool!.queuedIssues).toEqual([]);
  });
});

describe('ContainerPoolService.queueIssue', () => {
  it('adds an issue to the queue', () => {
    service.initPool(testProject);
    service.queueIssue(testProject.id, 'ISSUE-005');
    const pool = service.getPoolState(testProject.id);
    expect(pool!.queuedIssues).toContain('ISSUE-005');
  });

  it('does not add duplicate issue ids', () => {
    service.initPool(testProject);
    service.queueIssue(testProject.id, 'ISSUE-005');
    service.queueIssue(testProject.id, 'ISSUE-005');
    const pool = service.getPoolState(testProject.id);
    expect(pool!.queuedIssues.filter(id => id === 'ISSUE-005')).toHaveLength(1);
  });

  it('does nothing for non-existent pool', () => {
    // Should not throw
    service.queueIssue('non-existent', 'ISSUE-005');
  });
});

describe('ContainerPoolService.dequeueIssue', () => {
  it('removes an issue from the queue and returns true', () => {
    service.initPool(testProject);
    service.queueIssue(testProject.id, 'ISSUE-005');
    const result = service.dequeueIssue(testProject.id, 'ISSUE-005');
    expect(result).toBe(true);
    const pool = service.getPoolState(testProject.id);
    expect(pool!.queuedIssues).not.toContain('ISSUE-005');
  });

  it('returns false for non-queued issue', () => {
    service.initPool(testProject);
    expect(service.dequeueIssue(testProject.id, 'ISSUE-999')).toBe(false);
  });

  it('returns false for non-existent pool', () => {
    expect(service.dequeueIssue('non-existent', 'ISSUE-005')).toBe(false);
  });
});

describe('ContainerPoolService.getContainer / getContainerByIssue', () => {
  it('getContainer returns the container by id', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    const found = service.getContainer(testProject.id, container.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(container.id);
  });

  it('getContainerByIssue returns the container assigned to an issue', async () => {
    await service.acquireContainer(testProject, testIssue);
    const found = service.getContainerByIssue(testProject.id, 'ISSUE-001');
    expect(found).not.toBeNull();
    expect(found!.assignedIssueId).toBe('ISSUE-001');
  });

  it('getContainerByIssue returns null for non-assigned issue', async () => {
    service.initPool(testProject);
    expect(service.getContainerByIssue(testProject.id, 'ISSUE-999')).toBeNull();
  });
});

describe('ContainerPoolService.getRunningContainers / getIdleContainers', () => {
  it('returns filtered containers by status', async () => {
    const c1 = await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-001' });
    const c2 = await service.acquireContainer(testProject, { ...testIssue, id: 'ISSUE-002' });

    // Release c1 to make it idle
    await service.releaseContainer(testProject.id, c1.id);

    // Set c2 to running
    service.updateContainerStatus(testProject.id, c2.id, 'running');

    expect(service.getIdleContainers(testProject.id)).toHaveLength(1);
    expect(service.getRunningContainers(testProject.id)).toHaveLength(1);
  });

  it('returns empty array for non-existent pool', () => {
    expect(service.getRunningContainers('non-existent')).toEqual([]);
    expect(service.getIdleContainers('non-existent')).toEqual([]);
  });
});

describe('ContainerPoolService.updateContainerStatus', () => {
  it('updates the container status', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    service.updateContainerStatus(testProject.id, container.id, 'running');
    const updated = service.getContainer(testProject.id, container.id);
    expect(updated!.status).toBe('running');
  });
});

describe('ContainerPoolService.getContainerLogs', () => {
  it('returns logs for a container', async () => {
    const container = await service.acquireContainer(testProject, testIssue);
    const logs = service.getContainerLogs(container.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toContain('created');
  });

  it('returns empty array for unknown container', () => {
    expect(service.getContainerLogs('unknown')).toEqual([]);
  });
});
