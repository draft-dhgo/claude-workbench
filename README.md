<p align="center">
  <img src="assets/icon.png" alt="Claude Workbench" width="128" />
</p>

<h1 align="center">Claude Workbench</h1>

<p align="center">
  Project-centric development automation platform powered by Claude Code.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## Overview

Claude Workbench is a desktop application for managing development projects with Claude Code automation. It provides:

- **Project Management**: Create and manage projects with issue-tracking repos and dev repos (git submodules)
- **Issue Tracking**: File-based issue management within a git repository (base branch + target branch per issue)
- **Dev Containers**: Docker devcontainer + git worktree pool for isolated, concurrent issue processing
- **CI/CD Automation**: Automatic pipeline execution, testing, and merge via Claude Code
- **OAuth Authentication**: No API keys needed in containers

## Architecture

```
Project (issue-tracking repo)
  ├── repos/           # Dev repos as git submodules
  │   ├── frontend/
  │   └── backend/
  ├── issues/          # File-based issue tracking
  │   ├── manifest.json
  │   └── details/
  ├── .claude/         # Claude Code config
  ├── CLAUDE.md
  └── wiki/            # Pipeline artifacts
```

### Issue Lifecycle

```
Created → In Progress → Auto-Merge → Closed
           │
           ├── Container allocated from pool
           ├── Branches created (issue/ISSUE-XXX)
           ├── Pipeline command executed (/teams or /bugfix-teams)
           └── Auto-merge to target branch
```

### Dev Container Pool

- Configurable concurrency (max containers per project)
- Docker devcontainer with Claude Code `--dangerously-skip-permissions`
- Git worktrees for branch isolation within containers
- Automatic container recycling after issue completion

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (for dev containers)
- npm 9+

### Installation

```bash
git clone https://github.com/draft-dhgo/claude-workbench.git
cd claude-workbench
npm install
```

### Development

```bash
npm run build:ts
npm start

# Development mode
npm run dev

# Type check
npm run typecheck

# Tests
npm test
```

### Build

```bash
npm run build
```

## Project Structure

```
src/
  main/
    index.ts              # App entry, IPC registration
    window.ts             # BrowserWindow config
    services/
      projectStore.ts     # Project CRUD + persistence
      issueService.ts     # Issue lifecycle in issue repo
      gitService.ts       # Centralized git operations
      projectManagerService.ts  # Project creation/dashboard
      settingsStore.ts    # App settings
      mergeService.ts     # Git merge operations
      wikiHostService.ts  # Wiki HTTP server
      wikiPanelService.ts # BrowserView panel
    handlers/
      projectHandlers.ts  # project:* IPC
      issueHandlers.ts    # issue:* IPC
      settingsHandlers.ts # settings IPC
      mergeHandlers.ts    # merge IPC
      wikiHostHandlers.ts # wiki IPC
      terminalHandlers.ts # terminal IPC
      claudeConfigHandlers.ts  # config IPC
    constants/            # Pipeline commands & skills
  shared/types/
    project.ts            # Project, DevRepoRef, ProjectSettings
    issue.ts              # Issue, IssueManifest, IssueStatus
    container.ts          # DevContainer, ContainerPoolState
    settings.ts           # AppSettings
    ipc.ts                # IPC channel types
    models.ts             # Legacy shared models
  renderer/
    index.html            # Sidebar layout
    styles.css            # Theme-aware CSS
    scripts/
      app.js              # Router + page logic
      i18n.js             # Internationalization
      theme-init.js       # Theme initialization
      themeToggle.js      # Theme toggle
  preload/
    index.ts              # Secure IPC bridge
```

## Tech Stack

- **Runtime**: Electron 28
- **Language**: TypeScript 5.9
- **Testing**: Jest + ts-jest
- **Packaging**: electron-builder
- **Security**: Context Isolation + Preload Script
- **AI SDK**: @anthropic-ai/claude-agent-sdk
- **Containers**: Docker devcontainers

## License

MIT
