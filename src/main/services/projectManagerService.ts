import fs = require('fs');
import path = require('path');
import ProjectStore = require('./projectStore');
import IssueService = require('./issueService');
import GitService = require('./gitService');
import {
  Project, ProjectDashboard, ProjectConfigStatus, DevRepoRef,
  ProjectSettings, CwbProjectSettingsFile, CWB_DIR, CWB_SETTINGS_FILE,
  DEFAULT_PROJECT_SETTINGS,
} from '../../shared/types/project';

/**
 * 프로젝트 매니저 서비스
 * 활성 프로젝트 상태 + 프로젝트 생성/임포트 + 대시보드
 *
 * 프로젝트 설정은 이슈 repo 내 .cwb/project-settings.json에 저장되어
 * repo와 함께 공유됨
 */
class ProjectManagerService {
  private _projectStore: ProjectStore;
  private _issueService: IssueService;
  private _git: GitService;
  private _activeProjectId: string | null = null;

  constructor(projectStore: ProjectStore, issueService: IssueService, git: GitService) {
    this._projectStore = projectStore;
    this._issueService = issueService;
    this._git = git;
  }

  // --- Active Project ---

  setActiveProject(projectId: string): Project {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    this._activeProjectId = projectId;
    return project;
  }

  getActiveProject(): Project | null {
    if (!this._activeProjectId) return null;
    return this._projectStore.getById(this._activeProjectId);
  }

  getActiveProjectId(): string | null {
    return this._activeProjectId;
  }

  // --- Project Creation (새 이슈 repo 생성) ---

  async createProject(data: {
    name: string;
    localBasePath: string;
    lang?: 'en' | 'ko';
  }): Promise<Project> {
    const issueRepoPath = path.join(data.localBasePath, `${data.name}-issues`);

    if (fs.existsSync(issueRepoPath)) {
      throw new Error('DIRECTORY_ALREADY_EXISTS');
    }

    // issue repo 디렉토리 생성
    fs.mkdirSync(issueRepoPath, { recursive: true });

    // git init
    await this._git.init(issueRepoPath);

    const settings: ProjectSettings = { ...DEFAULT_PROJECT_SETTINGS, lang: data.lang || 'ko' };

    // 디렉토리 구조 스캐폴드 (.cwb/project-settings.json 포함)
    this._scaffoldIssueRepo(issueRepoPath, data.name, settings);

    // 초기 commit
    await this._git.addAll(issueRepoPath);
    await this._git.commit(issueRepoPath, 'init: project scaffolding');

    // 앱 내부 프로젝트 저장
    const project = this._projectStore.create({
      name: data.name,
      issueRepoPath,
      localBasePath: data.localBasePath,
      settings,
    });

    return project;
  }

  // --- Import Existing Project (기존 이슈 repo 경로 지정) ---

  async importProject(data: {
    issueRepoPath: string;
  }): Promise<Project> {
    const issueRepoPath = path.resolve(data.issueRepoPath);

    // 유효성 검증
    if (!fs.existsSync(issueRepoPath)) {
      throw new Error('DIRECTORY_NOT_FOUND');
    }
    if (!fs.existsSync(path.join(issueRepoPath, '.git'))) {
      throw new Error('NOT_A_GIT_REPO');
    }

    // .cwb/project-settings.json 확인
    const cwbSettingsPath = path.join(issueRepoPath, CWB_DIR, CWB_SETTINGS_FILE);
    if (!fs.existsSync(cwbSettingsPath)) {
      throw new Error('CWB_SETTINGS_NOT_FOUND');
    }

    // 설정 파일 읽기
    const cwbSettings = this._readCwbSettings(issueRepoPath);

    // submodule 동기화
    try {
      await this._git.initSubmodules(issueRepoPath);
      await this._git.updateSubmodules(issueRepoPath, true);
    } catch {
      // submodule 없거나 실패해도 import 진행
    }

    // 앱 내부 프로젝트 등록
    const project = this._projectStore.create({
      name: cwbSettings.name,
      issueRepoPath,
      localBasePath: path.dirname(issueRepoPath),
      settings: cwbSettings.settings,
    });

    // devRepos 동기화 (.cwb에 기록된 repo 정보를 store에 반영)
    for (const repo of cwbSettings.devRepos || []) {
      try {
        this._projectStore.addDevRepo(project.id, {
          name: repo.name,
          remoteUrl: repo.remoteUrl,
          submodulePath: repo.submodulePath,
        });
      } catch {
        // 중복 등 무시
      }
    }

    return this._projectStore.getById(project.id)!;
  }

  // --- Settings Sync (.cwb/project-settings.json ↔ store) ---

  /**
   * 프로젝트 설정을 .cwb/project-settings.json에 저장하고 git commit
   */
  async saveProjectSettings(projectId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    this._writeCwbSettings(project.issueRepoPath, {
      version: 1,
      name: project.name,
      settings: project.settings,
      devRepos: project.devRepos,
    });

    try {
      await this._git.addAll(project.issueRepoPath);
      const status = await this._git.status(project.issueRepoPath);
      if (status.trim()) {
        await this._git.commit(project.issueRepoPath, 'cwb: update project settings');
      }
    } catch {
      // git commit 실패 무시
    }
  }

  // --- Dev Repo Management ---

  async addDevRepo(projectId: string, repoUrl: string, name: string): Promise<DevRepoRef> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const submodulePath = `repos/${name}`;

    // git submodule add
    await this._git.addSubmodule(project.issueRepoPath, repoUrl, submodulePath);

    // store에 반영
    const devRepo = this._projectStore.addDevRepo(projectId, {
      name,
      remoteUrl: repoUrl,
      submodulePath,
    });

    // .cwb/project-settings.json 동기화
    await this.saveProjectSettings(projectId);

    return devRepo;
  }

  async removeDevRepo(projectId: string, repoId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const repo = project.devRepos.find(r => r.id === repoId);
    if (!repo) throw new Error('REPO_NOT_FOUND');

    // git submodule remove
    try {
      await this._git.removeSubmodule(project.issueRepoPath, repo.submodulePath);
    } catch {
      // submodule 제거 실패해도 store에서는 제거
    }

    this._projectStore.removeDevRepo(projectId, repoId);

    // .cwb/project-settings.json 동기화
    await this.saveProjectSettings(projectId);
  }

  // --- Dashboard ---

  async getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const issues = await this._issueService.listIssues(project.issueRepoPath);

    const byStatus: Record<string, number> = {};
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
    }

    return {
      project,
      issueStats: {
        total: issues.length,
        byStatus,
      },
      containerStats: {
        total: 0,
        running: 0,
        idle: 0,
        max: project.settings.maxContainers,
      },
      recentActivity: [],
    };
  }

  // --- Config Status ---

  async getProjectConfigStatus(projectId: string): Promise<ProjectConfigStatus> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const p = project.issueRepoPath;
    const hasClaudeDir = fs.existsSync(path.join(p, '.claude'));
    const hasClaudeMd = fs.existsSync(path.join(p, 'CLAUDE.md'));
    const hasCwbDir = fs.existsSync(path.join(p, CWB_DIR));
    const hasProjectSettings = fs.existsSync(path.join(p, CWB_DIR, CWB_SETTINGS_FILE));

    let commandCount = 0;
    let skillCount = 0;
    const commandsDir = path.join(p, '.claude', 'commands');
    const skillsDir = path.join(p, '.claude', 'skills');
    try {
      commandCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md')).length;
    } catch { /* ignore */ }
    try {
      skillCount = fs.readdirSync(skillsDir).filter(f => {
        return fs.statSync(path.join(skillsDir, f)).isDirectory();
      }).length;
    } catch { /* ignore */ }

    const wikiAvailable = fs.existsSync(path.join(p, 'wiki', 'views', 'index.html'));

    let submodulesInitialized = true;
    for (const repo of project.devRepos) {
      const repoPath = path.join(p, repo.submodulePath);
      if (!fs.existsSync(repoPath) || !fs.existsSync(path.join(repoPath, '.git'))) {
        submodulesInitialized = false;
        break;
      }
    }

    return {
      hasClaudeDir,
      hasClaudeMd,
      hasCwbDir,
      hasProjectSettings,
      commandCount,
      skillCount,
      wikiAvailable,
      issueRepoValid: fs.existsSync(path.join(p, '.git')),
      submodulesInitialized,
    };
  }

  // --- .cwb/project-settings.json 읽기/쓰기 ---

  private _readCwbSettings(issueRepoPath: string): CwbProjectSettingsFile {
    const filePath = path.join(issueRepoPath, CWB_DIR, CWB_SETTINGS_FILE);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      version: data.version || 1,
      name: data.name || path.basename(issueRepoPath).replace(/-issues$/, ''),
      settings: { ...DEFAULT_PROJECT_SETTINGS, ...data.settings },
      devRepos: data.devRepos || [],
    };
  }

  private _writeCwbSettings(issueRepoPath: string, data: CwbProjectSettingsFile): void {
    const dirPath = path.join(issueRepoPath, CWB_DIR);
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(
      path.join(dirPath, CWB_SETTINGS_FILE),
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  // --- Scaffold ---

  private _scaffoldIssueRepo(repoPath: string, projectName: string, settings: ProjectSettings): void {
    // .cwb/project-settings.json
    this._writeCwbSettings(repoPath, {
      version: 1,
      name: projectName,
      settings,
      devRepos: [],
    });

    // issues/
    const issuesDir = path.join(repoPath, 'issues');
    fs.mkdirSync(path.join(issuesDir, 'details'), { recursive: true });
    fs.writeFileSync(
      path.join(issuesDir, 'manifest.json'),
      JSON.stringify({ version: 1, nextId: 1, issues: [] }, null, 2),
      'utf-8'
    );

    // repos/ (submodule 마운트 포인트)
    fs.mkdirSync(path.join(repoPath, 'repos'), { recursive: true });
    fs.writeFileSync(path.join(repoPath, 'repos', '.gitkeep'), '', 'utf-8');

    // wiki/
    const wikiDirs = [
      'requirements', 'prd', 'specs', 'tests', 'tdd',
      'deploy', 'bugfix', 'bugs', 'knowledge', 'mockups', 'views'
    ];
    for (const d of wikiDirs) {
      fs.mkdirSync(path.join(repoPath, 'wiki', d), { recursive: true });
    }
    fs.writeFileSync(
      path.join(repoPath, 'wiki', 'requirements', 'README.md'),
      '# Requirements\n\n| ID | Title | Status |\n|----|-------|--------|\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(repoPath, 'wiki', 'bugs', 'README.md'),
      '# Bug Reports\n\n| ID | Description | Status |\n|----|-------------|--------|\n',
      'utf-8'
    );

    // .claude/ + CLAUDE.md
    try {
      const { buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands, buildWikiViewerHtml } =
        require('../constants/claudeConfigDefaults');

      fs.writeFileSync(
        path.join(repoPath, 'CLAUDE.md'),
        buildDefaultClaudeMd(projectName, settings.lang),
        'utf-8'
      );

      const claudeDir = path.join(repoPath, '.claude');
      const skills = buildDefaultSkills(settings.lang);
      for (const [name, content] of Object.entries(skills)) {
        const skillDir = path.join(claudeDir, 'skills', name);
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content as string, 'utf-8');
      }
      const commands = buildDefaultCommands(settings.lang);
      const commandsDir = path.join(claudeDir, 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      for (const [name, content] of Object.entries(commands)) {
        fs.writeFileSync(path.join(commandsDir, `${name}.md`), content as string, 'utf-8');
      }

      fs.writeFileSync(
        path.join(repoPath, 'wiki', 'views', 'index.html'),
        buildWikiViewerHtml(),
        'utf-8'
      );
    } catch {
      fs.mkdirSync(path.join(repoPath, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'CLAUDE.md'),
        `# ${projectName}\n\n## Workspace Rules\n\n- All documentation must be written under wiki/\n`,
        'utf-8'
      );
    }
  }
}

export = ProjectManagerService;
