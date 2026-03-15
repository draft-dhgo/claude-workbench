import fs = require('fs');
import path = require('path');
import ProjectStore = require('./projectStore');
import IssueService = require('./issueService');
import GitService = require('./gitService');
import { Project, ProjectDashboard, ProjectConfigStatus, DevRepoRef } from '../../shared/types/project';
import { Issue } from '../../shared/types/issue';

/**
 * 프로젝트 매니저 서비스
 * 활성 프로젝트 상태 + 프로젝트 생성/클론 + 대시보드
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

  // --- Project Creation ---

  async createProject(data: {
    name: string;
    localBasePath: string;
    lang?: 'en' | 'ko';
  }): Promise<Project> {
    const issueRepoPath = path.join(data.localBasePath, `${data.name}-issues`);

    // issue repo 디렉토리 생성
    fs.mkdirSync(issueRepoPath, { recursive: true });

    // git init
    await this._git.init(issueRepoPath);

    // 디렉토리 구조 스캐폴드
    this._scaffoldIssueRepo(issueRepoPath, data.name, data.lang || 'ko');

    // 초기 commit
    await this._git.addAll(issueRepoPath);
    await this._git.commit(issueRepoPath, 'init: project scaffolding');

    // 프로젝트 저장
    const project = this._projectStore.create({
      name: data.name,
      issueRepoPath,
      localBasePath: data.localBasePath,
      settings: { lang: data.lang || 'ko' },
    });

    return project;
  }

  // --- Clone Existing Project ---

  async cloneProject(data: {
    issueRepoUrl: string;
    localBasePath: string;
  }): Promise<Project> {
    const repoName = path.basename(data.issueRepoUrl, '.git');
    const issueRepoPath = path.join(data.localBasePath, repoName);

    // clone issue repo
    await this._git.clone(data.issueRepoUrl, issueRepoPath);

    // submodule init + update
    await this._git.initSubmodules(issueRepoPath);
    await this._git.updateSubmodules(issueRepoPath, true);

    // manifest에서 프로젝트명 추출
    const name = repoName.replace(/-issues$/, '');

    const project = this._projectStore.create({
      name,
      issueRepoPath,
      localBasePath: data.localBasePath,
    });

    return project;
  }

  // --- Dev Repo Management ---

  async addDevRepo(projectId: string, repoUrl: string, name: string): Promise<DevRepoRef> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const submodulePath = `repos/${name}`;

    // git submodule add
    await this._git.addSubmodule(project.issueRepoPath, repoUrl, submodulePath);
    await this._git.addAll(project.issueRepoPath);
    await this._git.commit(project.issueRepoPath, `repo: add submodule ${name}`);

    // store에 반영
    return this._projectStore.addDevRepo(projectId, {
      name,
      remoteUrl: repoUrl,
      submodulePath,
    });
  }

  async removeDevRepo(projectId: string, repoId: string): Promise<void> {
    const project = this._projectStore.getById(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const repo = project.devRepos.find(r => r.id === repoId);
    if (!repo) throw new Error('REPO_NOT_FOUND');

    // git submodule remove
    try {
      await this._git.removeSubmodule(project.issueRepoPath, repo.submodulePath);
      await this._git.addAll(project.issueRepoPath);
      await this._git.commit(project.issueRepoPath, `repo: remove submodule ${repo.name}`);
    } catch {
      // submodule 제거 실패해도 store에서는 제거
    }

    this._projectStore.removeDevRepo(projectId, repoId);
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
      commandCount,
      skillCount,
      wikiAvailable,
      issueRepoValid: fs.existsSync(path.join(p, '.git')),
      submodulesInitialized,
    };
  }

  // --- Scaffold ---

  private _scaffoldIssueRepo(repoPath: string, projectName: string, lang: 'en' | 'ko'): void {
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

    // .claude/ + CLAUDE.md (claudeConfigDefaults 활용)
    try {
      const { buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands, buildWikiViewerHtml } =
        require('../constants/claudeConfigDefaults');

      // CLAUDE.md
      fs.writeFileSync(
        path.join(repoPath, 'CLAUDE.md'),
        buildDefaultClaudeMd(projectName, lang),
        'utf-8'
      );

      // .claude/skills + commands
      const claudeDir = path.join(repoPath, '.claude');
      const skills = buildDefaultSkills(lang);
      for (const [name, content] of Object.entries(skills)) {
        const skillDir = path.join(claudeDir, 'skills', name);
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content as string, 'utf-8');
      }
      const commands = buildDefaultCommands(lang);
      const commandsDir = path.join(claudeDir, 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      for (const [name, content] of Object.entries(commands)) {
        fs.writeFileSync(path.join(commandsDir, `${name}.md`), content as string, 'utf-8');
      }

      // wiki viewer
      fs.writeFileSync(
        path.join(repoPath, 'wiki', 'views', 'index.html'),
        buildWikiViewerHtml(),
        'utf-8'
      );
    } catch {
      // claudeConfigDefaults 없으면 기본 CLAUDE.md만
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
