// TC-WMS-01 ~ TC-WMS-23: WorkspaceManagerService 단위 테스트

import os = require('os');
import path = require('path');
import fs = require('fs');

const mockSend = jest.fn();
const mockGetAllWindows = jest.fn(() => [{ webContents: { send: mockSend } }]);

let WorkspaceManagerService: any;
let service: any;
let tmpDir: string;

beforeEach(() => {
  jest.resetModules();
  mockSend.mockReset();
  mockGetAllWindows.mockReset();
  mockGetAllWindows.mockReturnValue([{ webContents: { send: mockSend } }]);

  jest.doMock('electron', () => ({
    BrowserWindow: {
      getAllWindows: mockGetAllWindows
    }
  }));

  // buildDefaultCommands / buildDefaultSkills 실제 구현 사용 (fs 기반 실제 테스트)
  WorkspaceManagerService = require('../../../src/main/services/workspaceManagerService');
  service = new WorkspaceManagerService();

  // 임시 디렉토리 생성
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wms-test-'));
});

afterEach(() => {
  if (service) service._reset();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  jest.restoreAllMocks();
});

// ── setActiveWorkspace / getActiveWorkspacePath ──

describe('TC-WMS-01: setActiveWorkspace() — 유효한 경로로 활성 설정', () => {
  it('유효한 경로로 활성 워크스페이스를 설정하면 activeWorkspacePath가 갱신된다', () => {
    service.setActiveWorkspace(tmpDir);
    expect(service.getActiveWorkspacePath()).toBe(tmpDir);
  });
});

describe('TC-WMS-02: setActiveWorkspace() — 빈 문자열 에러', () => {
  it('workspacePath가 빈 문자열이면 PATH_REQUIRED 에러가 발생한다', () => {
    expect(() => service.setActiveWorkspace('')).toThrow('PATH_REQUIRED');
  });
});

describe('TC-WMS-03: setActiveWorkspace() — 존재하지 않는 경로 에러', () => {
  it('존재하지 않는 경로를 전달하면 PATH_NOT_FOUND 에러가 발생한다', () => {
    expect(() => service.setActiveWorkspace('/nonexistent/path/xyz')).toThrow('PATH_NOT_FOUND');
  });
});

describe('TC-WMS-04: setActiveWorkspace() — workspace:active-changed push', () => {
  it('setActiveWorkspace 성공 시 workspace:active-changed 이벤트가 renderer에 push된다', () => {
    service.setActiveWorkspace(tmpDir);
    expect(mockSend).toHaveBeenCalledWith(
      'workspace:active-changed',
      expect.objectContaining({
        activeWorkspacePath: tmpDir,
        wikiAvailable: expect.any(Boolean)
      })
    );
  });
});

describe('TC-WMS-05: getActiveWorkspacePath() — 초기값 null', () => {
  it('활성 워크스페이스를 설정하기 전에는 null을 반환한다', () => {
    service._reset();
    expect(service.getActiveWorkspacePath()).toBeNull();
  });
});

describe('TC-WMS-06: getActiveWorkspacePath() — 설정 후 경로 반환', () => {
  it('setActiveWorkspace 성공 후 getActiveWorkspacePath()는 설정된 경로를 반환한다', () => {
    service.setActiveWorkspace(tmpDir);
    expect(service.getActiveWorkspacePath()).toBe(tmpDir);
  });
});

// ── getCommands ──

describe('TC-WMS-07: getCommands() — 파일 존재 시 exists true', () => {
  it('.claude/commands/teams.md가 존재하면 해당 항목의 exists가 true다', () => {
    const cmdDir = path.join(tmpDir, '.claude', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'teams.md'), '# teams command', 'utf-8');

    const commands = service.getCommands(tmpDir);
    const teamsCmd = commands.find((c: any) => c.name === 'teams');
    expect(teamsCmd).toBeDefined();
    expect(teamsCmd.exists).toBe(true);

    // 나머지는 false
    const others = commands.filter((c: any) => c.name !== 'teams');
    others.forEach((c: any) => expect(c.exists).toBe(false));
  });
});

describe('TC-WMS-08: getCommands() — 디렉토리 없으면 모두 false', () => {
  it('.claude/commands/ 디렉토리가 없으면 모든 커맨드의 exists가 false다', () => {
    const commands = service.getCommands(tmpDir);
    commands.forEach((c: any) => expect(c.exists).toBe(false));
  });
});

describe('TC-WMS-09: getCommands() — 기본 4개 커맨드', () => {
  it('getCommands()는 add-req, add-bug, teams, bugfix-teams 기본 4개 커맨드를 반환한다', () => {
    const commands = service.getCommands(tmpDir);
    expect(commands).toHaveLength(4);
    const names = commands.map((c: any) => c.name);
    expect(names).toContain('add-req');
    expect(names).toContain('add-bug');
    expect(names).toContain('teams');
    expect(names).toContain('bugfix-teams');
  });
});

// ── getSkills ──

describe('TC-WMS-10: getSkills() — SKILL.md 존재 시 exists true', () => {
  it('.claude/skills/req-manage/SKILL.md가 존재하면 해당 항목의 exists가 true다', () => {
    const skillDir = path.join(tmpDir, '.claude', 'skills', 'req-manage');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# req-manage skill', 'utf-8');

    const skills = service.getSkills(tmpDir);
    const reqManage = skills.find((s: any) => s.name === 'req-manage');
    expect(reqManage).toBeDefined();
    expect(reqManage.exists).toBe(true);
  });
});

describe('TC-WMS-11: getSkills() — 디렉토리 없으면 모두 false', () => {
  it('.claude/skills/ 디렉토리가 없으면 모든 스킬의 exists가 false다', () => {
    const skills = service.getSkills(tmpDir);
    skills.forEach((s: any) => expect(s.exists).toBe(false));
  });
});

describe('TC-WMS-12: getSkills() — 기본 10개 스킬', () => {
  it('getSkills()는 기본 스킬 10개를 반환한다', () => {
    const skills = service.getSkills(tmpDir);
    expect(skills).toHaveLength(10);
  });
});

// ── getConfigStatus ──

describe('TC-WMS-13: getConfigStatus() — .claude/ 와 CLAUDE.md 존재', () => {
  it('.claude/ 와 CLAUDE.md가 모두 존재하면 hasClaudeDir, hasClaudeMd가 모두 true다', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# claude', 'utf-8');

    const status = service.getConfigStatus(tmpDir);
    expect(status.hasClaudeDir).toBe(true);
    expect(status.hasClaudeMd).toBe(true);
  });
});

describe('TC-WMS-14: getConfigStatus() — .claude/ 없으면 false, count 0', () => {
  it('.claude/ 디렉토리가 없으면 hasClaudeDir === false이고 commandCount, skillCount가 0이다', () => {
    const status = service.getConfigStatus(tmpDir);
    expect(status.hasClaudeDir).toBe(false);
    expect(status.commandCount).toBe(0);
    expect(status.skillCount).toBe(0);
  });
});

describe('TC-WMS-15: getConfigStatus() — wiki/views/index.html 존재 시 wikiAvailable true', () => {
  it('wiki/views/index.html이 존재하면 getConfigStatus()에서 wikiAvailable === true다', () => {
    const wikiDir = path.join(tmpDir, 'wiki', 'views');
    fs.mkdirSync(wikiDir, { recursive: true });
    fs.writeFileSync(path.join(wikiDir, 'index.html'), '<html></html>', 'utf-8');

    const status = service.getConfigStatus(tmpDir);
    expect(status.wikiAvailable).toBe(true);
  });
});

// ── checkWikiAvailability ──

describe('TC-WMS-16: checkWikiAvailability() — index.html 존재 시 true', () => {
  it('wiki/views/index.html이 존재하면 checkWikiAvailability()가 true를 반환한다', () => {
    const wikiDir = path.join(tmpDir, 'wiki', 'views');
    fs.mkdirSync(wikiDir, { recursive: true });
    fs.writeFileSync(path.join(wikiDir, 'index.html'), '<html></html>', 'utf-8');

    expect(service.checkWikiAvailability(tmpDir)).toBe(true);
  });
});

describe('TC-WMS-17: checkWikiAvailability() — 디렉토리 없으면 false', () => {
  it('wiki/views/ 디렉토리가 없으면 checkWikiAvailability()가 false를 반환한다', () => {
    expect(service.checkWikiAvailability(tmpDir)).toBe(false);
  });
});

// ── getQueueSummary ──

describe('TC-WMS-18: getQueueSummary() — 필터링 및 상태별 카운트', () => {
  it('지정 workspacePath와 cwd가 일치하는 항목만 필터링하여 상태별 카운트를 반환한다', () => {
    const items = [
      { cwd: '/ws/a', status: 'pending' },
      { cwd: '/ws/a', status: 'pending' },
      { cwd: '/ws/a', status: 'running' },
      { cwd: '/ws/b', status: 'success' },
    ];
    const summary = service.getQueueSummary(items, '/ws/a');
    expect(summary.pending).toBe(2);
    expect(summary.running).toBe(1);
    expect(summary.success).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.aborted).toBe(0);
    expect(summary.total).toBe(3);
  });
});

describe('TC-WMS-19: getQueueSummary() — 해당 경로 항목 없으면 total 0', () => {
  it('지정 workspacePath와 cwd가 일치하는 항목이 없으면 total === 0이다', () => {
    const items = [
      { cwd: '/ws/other', status: 'pending' },
    ];
    const summary = service.getQueueSummary(items, '/ws/target');
    expect(summary.total).toBe(0);
    expect(summary.pending).toBe(0);
  });
});

// ── resolveWorkspacePath ──

describe('TC-WMS-20: resolveWorkspacePath() — 명시적 경로 반환', () => {
  it('명시적 경로가 전달되면 해당 경로를 반환한다', () => {
    expect(service.resolveWorkspacePath('/explicit/path')).toBe('/explicit/path');
  });
});

describe('TC-WMS-21: resolveWorkspacePath() — 활성 경로 반환', () => {
  it('명시적 경로 생략 + 활성 경로 설정 시 활성 경로를 반환한다', () => {
    service.setActiveWorkspace(tmpDir);
    expect(service.resolveWorkspacePath()).toBe(tmpDir);
  });
});

describe('TC-WMS-22: resolveWorkspacePath() — null 반환', () => {
  it('명시적 경로 생략 + 활성 경로 미설정 시 null을 반환한다', () => {
    service._reset();
    expect(service.resolveWorkspacePath()).toBeNull();
  });
});

// ── _reset ──

describe('TC-WMS-23: _reset() — activeWorkspacePath null로 초기화', () => {
  it('_reset() 호출 시 activeWorkspacePath가 null로 초기화된다', () => {
    service.setActiveWorkspace(tmpDir);
    service._reset();
    expect(service.getActiveWorkspacePath()).toBeNull();
  });
});
