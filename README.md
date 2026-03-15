<p align="center">
  <img src="assets/icon.png" alt="Claude Workbench" width="128" />
</p>

<h1 align="center">Claude Workbench</h1>

<p align="center">
  A desktop app that automates development issues with Claude Code.<br/>
  Create issue → Start → Claude writes code → Review & Merge. Done.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-379%20passing-brightgreen" alt="Tests" />
</p>

---

## 30-Second Overview

```
1. Create project    →  Issue management git repo is auto-generated
2. Add dev repo      →  Connected as submodule (backend, frontend, etc.)
3. Create issue      →  "Implement login API" (type selection auto-picks pipeline)
4. Click Start       →  Claude Code writes code in an isolated container
5. Review result     →  Check diff summary → Merge or Reject
6. Done              →  Merged to baseBranch + pushed to remote
```

---

## Installation

```bash
git clone https://github.com/draft-dhgo/claude-workbench.git
cd claude-workbench
npm install
npm run build:ts
npm start
```

Docker enables isolated container execution. Without Docker, it falls back to local worktree mode.

---

## Usage: Start to Finish

### Step 1. Create a Project

Two buttons at the bottom of the sidebar:

- **+ New Project** — Create a new project
- **Import Project** — Import an existing project

#### New Project

1. Click **+ New Project**
2. Enter project name (e.g., `my-saas-app`)
3. Enter Remote URL (optional — a pre-created empty repo URL on GitHub)
4. Click **Create**

An issue management git repo is auto-created at `~/claude-workbench-data/projects/my-saas-app-issues/` with `.cwb/project-settings.json`, `.claude/`, `wiki/`, `issues/`, etc.

#### Import Existing Project

If a teammate already created a project:

1. Click **Import Project**
2. Paste the git URL (e.g., `https://github.com/myorg/my-saas-app-issues.git`)
3. Click **Import**

Auto clones → syncs submodules → loads issues. Done.

![Dashboard](docs/screenshots/dashboard.png)

---

### Step 2. Connect Dev Repos

Connect repos containing actual code as submodules.

1. Click **Repositories** in the sidebar
2. Click **+ Add Repository** (or **Browse GitHub** if your GitHub account is connected)
3. Enter git URL (e.g., `https://github.com/myorg/backend-api.git`)
4. Enter name (e.g., `backend-api`)

Added as a submodule under `repos/backend-api/` in the issue repo. You can add multiple repos (backend, frontend, shared-lib, etc.).

**Sync Submodules** runs `git submodule update --init --recursive`.

![Repositories](docs/screenshots/repositories.png)

---

### Step 3. Create an Issue

1. Click **Issues** in the sidebar
2. Click **+ New Issue**
3. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | Issue title | `Add OAuth2 authentication` |
| **Description** | Detailed description | `Google, GitHub OAuth support needed` |
| **Type** | `Feature` or `Bugfix` — pipeline is auto-determined | `Feature` → `/teams` |
| **Priority** | `Low` / `Medium` / `High` / `Critical` | `High` |
| **Base Branch** | Starting point + merge target | `main` |
| **Work Instructions** | Instructions sent to Claude | `Implement JWT-based OAuth2 login` |
| **Labels** | Classification tags (comma-separated) | `auth, backend` |

> **Selecting Type automatically determines the Pipeline Command:**
> - `Feature` → `/teams` (Requirements → Design → Implementation → Tests → Deploy)
> - `Bugfix` → `/bugfix-teams` (Root cause analysis → Fix → Tests → Deploy)

4. Click **Create** → Issue is registered with `Created` status

View issues in **List** (default) or **Kanban** view.

![Issues](docs/screenshots/issues.png)

---

### Step 4. Run an Issue

Click the **Start** button on an issue in the list.

Here's what happens:

```
1. Container allocated from pool (or new one created if needed)
2. issue/ISSUE-001 branch created in each dev repo (branched from baseBranch)
3. Claude Code runs /teams or /bugfix-teams pipeline
4. On completion → issue status becomes "Completed"
```

**Multiple issues can be started simultaneously.** They run in parallel up to the `Max Containers` setting; excess issues queue automatically.

Pipeline logs are viewable in real-time on the **Pipeline** page. Use the **issue filter dropdown** to view logs for a specific issue.

![Pipeline](docs/screenshots/pipeline.png)

---

### Step 5. Review Result → Merge or Reject

When an issue reaches `Completed` status:

1. **Change summary** is displayed on the issue — files changed, lines added/removed, duration, cost
2. Click **Diff** to view the detailed list of changed files
3. Click **Merge** → merges to baseBranch + pushes to remote
4. Not satisfied? Click **Reject** → resets to `Created` status so you can start over

On failure, status becomes `Failed`, and you can retry with the **Retry** button.

#### Issue Status Flow

```
                                                    Reject
                                                   ┌──────┐
                                                   ▼      │
Created  ──Start──▶  In Progress  ──Done──▶  Completed  ──Merge──▶  Merged
                          │                                            │
                        Abort                                        Close
                          │                      Retry                 │
                          ▼                        ▲                   ▼
                       Created ◀──────────────  Failed              Closed
```

Each issue displays a **status stepper** showing progress through `Created → In Progress → Completed → Merged` at a glance. The `In Progress` state features a pulse animation to visually indicate active work.

| Button | When | Action |
|--------|------|--------|
| **Start** | `Created` status | Allocate container + run pipeline |
| **Abort** | `In Progress` status | Stop execution, revert to Created |
| **Diff** | `Completed` status | View changed files + stats |
| **Merge** | `Completed` status | Merge to baseBranch + push |
| **Reject** | `Completed` status | Reset to Created, start over |
| **Retry** | `Failed` status | Reset to Created, retry |

---

### Container Monitor

Click **Containers** in the sidebar to view pool status.

- Pool status: `2/5 active`
- Each container: ID, status, assigned issue
- Queued issues
- Force-destroy individual containers

If Docker is installed, runs in isolated Docker containers; otherwise falls back to local git worktrees.

![Containers](docs/screenshots/containers.png)

---

### Settings

Click **Settings** in the sidebar.

| Setting | Description | Default |
|---------|-------------|---------|
| **Max Containers** | Concurrent execution containers for this project | 3 |
| **Test Command** | Test command run during pipeline | (none) |
| **Data Root Path** | Storage path for all project/container data | `~/claude-workbench-data/` |
| **Docker Status** | Docker installation status + version | Auto-detected |
| **GitHub Account** | Connect GitHub for repo browsing | Optional |

![Settings](docs/screenshots/settings.png)

---

### Wiki

Each pipeline execution saves artifacts to the `wiki/` directory in the issue repo:

```
wiki/
  requirements/    PRDs, specs, test designs
  tdd/             TDD cycle reports
  deploy/          Build/deploy reports
  views/           Wiki dashboard (HTML)
```

Start a local HTTP server on the **Wiki** page and view it in an in-app panel.

---

### Using on Another PC

1. Install Claude Workbench
2. Click **Import Project**
3. Paste the issue repo URL
4. Click **Import**

Auto clones + syncs submodules + loads issues. Done.

Issue changes are automatically git committed + pushed. Project selection auto-pulls.

---

### Korean / English

Switch languages in the header dropdown.

---

## Architecture

<details>
<summary>Expand</summary>

### Data Structure

```
~/claude-workbench-data/
  projects/
    my-saas-app-issues/           # Issue management repo
      .cwb/project-settings.json  # Project settings (shared via git)
      .gitmodules                 # Submodule config
      repos/                     # Dev repo submodules
        backend-api/
        frontend-web/
      issues/
        manifest.json            # Issue DB
        details/ISSUE-001.md
      .claude/commands/          # Claude Code commands
      .claude/skills/            # Claude Code skills
      CLAUDE.md
      wiki/                      # Pipeline artifacts
  containers/                    # Container worktrees
  devcontainers/                 # Docker image cache
```

### Issue Processing Flow

```
User clicks "Start"
  → ContainerPoolService.acquireContainer()
    → Docker container or local worktree
  → GitService.createWorktree() for each dev repo
    → issue/ISSUE-XXX branch from baseBranch
  → PipelineExecutorService.execute()
    → Claude Code SDK or CLI with /teams or /bugfix-teams
  → Issue status → completed
  → User clicks "Merge" (or "Reject" to reset)
    → MergeService.merge() for each dev repo
    → GitService.push()
    → Issue status → merged
  → ContainerPoolService.releaseContainer()
```

### Service Layer

| Service | Role |
|---------|------|
| `ProjectStore` | Project CRUD, JSON persistence |
| `IssueService` | Issue lifecycle (manifest.json + git commit/push) |
| `ContainerPoolService` | Docker container pool management |
| `DockerService` | Docker CLI wrapper |
| `GitService` | Git command integration (branch/worktree/submodule/merge) |
| `PipelineExecutorService` | Claude Code SDK/CLI execution |
| `PipelineOrchestratorService` | Full issue processing orchestration |
| `ProjectManagerService` | Project creation/import/dashboard |
| `SettingsStore` | App settings persistence |
| `MergeService` | Git merge + conflict detection/resolution |

### Source Structure

```
src/
  main/           # Electron main process
    services/     # Business logic (11 services)
    handlers/     # IPC handlers (7 files)
    constants/    # Pipeline commands + skill definitions
    templates/    # Devcontainer templates
  shared/types/   # Shared type definitions
  renderer/       # UI (HTML + CSS + JS)
  preload/        # Secure IPC bridge
```

</details>

---

## Tech Stack

| | |
|---|---|
| **Runtime** | Electron 28 |
| **Language** | TypeScript 5.9 |
| **Tests** | Jest (23 suites, 379 tests) |
| **AI** | @anthropic-ai/claude-agent-sdk |
| **Containers** | Docker devcontainers |
| **i18n** | English / Korean |

---

## Development

```bash
npm run typecheck    # Type check
npm test             # Run tests
npm run dev          # Development mode
npm run build        # Production build
```

---

## License

MIT
