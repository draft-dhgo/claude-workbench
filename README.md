<p align="center">
  <img src="assets/icon.png" alt="Claude Workbench" width="128" />
</p>

<h1 align="center">Claude Workbench</h1>

<p align="center">
  Claude Code-powered development workstation &mdash; Git worktree management and scrum pipeline in one desktop app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## Workspace / Worktree Mode

Switch between two modes using the toggle in the header. **Workspace mode** focuses on running Claude Code pipelines; **Worktree mode** manages Git repositories and their worktrees.

![Repository Management](docs/screenshot-main.png?v=3)

---

## Workspace Mode

### Command Queue

Queue multiple Claude Code commands and execute them sequentially. Built on the `@anthropic-ai/claude-agent-sdk`, commands run with full permission bypass and auto-retry on rate limits.

![Command Queue](docs/screenshot-queue.png?v=3)

- **FIFO queue**: enqueue `/add-req`, `/teams`, `/bugfix-teams`, `/add-bug` commands
- **Workspace selector**: choose which workspace each command runs in
- **Bulk add**: paste multiple commands at once in the bulk input area
- **Rate limit retry**: exponential backoff (30s → 5min) with countdown timer
- **Abort**: cancel a running command mid-execution via AbortController
- **Dequeue**: remove pending commands before they start
- **Real-time logs**: IPC-based status updates and execution logs in the UI

### Workspace Management

Register existing directories or create new workspaces (with CLAUDE.md, skills, and slash commands pre-installed). Manage wiki viewer hosting from the same screen.

![Workspace Management](docs/screenshot-sets.png?v=3)

- **Add Workspace**: register any existing directory as a workspace
- **Create Workspace**: scaffold a new workspace with CLAUDE.md, `.claude/commands/`, and all pipeline skills installed automatically
- **Workspace list**: view and delete registered workspaces; WORKTREE and EMPTY badges indicate workspace type
- **Open Terminal**: open a terminal in the workspace directory
- **Wiki Hosting**: start/stop a local HTTP server to serve the wiki viewer

![Built-in Hosting](docs/screenshot-wiki-hosting.png?v=3)

---

## Worktree Mode

### Repository Management

Register local Git repositories, check current branches, and find them quickly with search.

![Repository Management](docs/screenshot-main.png?v=3)

### Worktree Management

View the worktree list per repository and manage deletions based on push status. Shows a warning when deleting an unpushed branch.

![Worktree Management](docs/screenshot-worktree-manage.png?v=3)

---

## Claude Code Commands

Run Claude Code inside a workspace and automate the scrum development pipeline with slash commands.

```bash
cd ~/workspaces/my-feature
claude
```

| Command | Description | Usage |
|---------|-------------|-------|
| `/teams` | Run team development pipeline | Automates the full flow: requirements → design → implementation → deploy |
| `/add-req` | Register a new requirement | Adds a new requirement to `wiki/requirements/` |
| `/add-bug` | Register a new bug | Registers a bug in `wiki/bugs/README.md` |
| `/bugfix-teams` | Run bug-fix pipeline | Automates analysis → fix → test flow for a registered bug |

```bash
# Register a requirement then run the pipeline
> /add-req
> "JWT token-based auth needs to be implemented for the login API"

> /teams
> "Implement REQ-001 login API"

# Register a bug then run the fix pipeline
> /add-bug
> "Refresh token is not renewed on login"

> /bugfix-teams
> "Fix BUG-001"
```

Each pipeline step saves its artifact to the `wiki/` directory automatically:

```
wiki/
├── requirements/    # Requirement definitions
├── prd/             # Product requirement documents
├── specs/           # Design documents (SDD)
├── tests/           # Test design
├── tdd/             # TDD cycle reports
├── deploy/          # Build/deploy reports
├── bugfix/          # Bug fix analysis
├── bugs/            # Bug tracker
├── mockups/         # UI mockups (HTML)
├── knowledge/       # Project knowledge base
└── views/           # Wiki Viewer (dashboard)
```

---

## Wiki Viewer

A Wiki Viewer is included to browse all pipeline artifacts in your browser. The **cycle-based view** lets you track the pipeline progress for each requirement (REQ) and bug (BUG) at a glance.

<table>
<tr>
<td width="50%"><strong>Dashboard</strong><br/>Dev/Bug Cycle cards, completion status, Mockup Gallery<br/><img src="docs/screenshot-wiki-dashboard.png?v=4" width="100%" /></td>
<td width="50%"><strong>Traceability Matrix</strong><br/>REQ → PRD → SDD → Tests → TDD → Deploy → Mockup → Bugfix<br/><img src="docs/screenshot-wiki-trace.png?v=4" width="100%" /></td>
</tr>
<tr>
<td width="50%"><strong>Cycle Detail</strong><br/>Pipeline stage visualization with document links<br/><img src="docs/screenshot-wiki-cycle-detail.png?v=4" width="100%" /></td>
<td width="50%"><strong>Document Viewer</strong><br/>Markdown rendering with breadcrumb navigation<br/><img src="docs/screenshot-wiki-doc-viewer.png?v=4" width="100%" /></td>
</tr>
<tr>
<td width="50%"><strong>Mockup Viewer</strong><br/>HTML mockups embedded as iframes<br/><img src="docs/screenshot-wiki-mockup.png?v=4" width="100%" /></td>
<td width="50%"></td>
</tr>
</table>

### Built-in Hosting

The Wiki Viewer can be hosted directly from the app. In the **Workspace Management** tab, use the **Wiki Viewer Hosting** section to start a local HTTP server.

- **One-click start/stop**: Start and stop the server from the Workspace Management tab
- **Auto port selection**: Automatically picks an available port in the 8080–8099 range
- **Open in browser**: Click the URL to open the hosted Wiki Viewer in your default browser
- **Status indicator**: Running/Not Running indicator with live URL
- **Auto cleanup**: Server shuts down automatically when the app quits
- **localhost only**: Bound to `127.0.0.1` for security

You can also host the Wiki Viewer manually:

```bash
# From workspace root
npx serve wiki -p 3000

# Open in browser
open http://localhost:3000/views/index.html
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Installation

```bash
git clone https://github.com/draft-dhgo/claude-workbench.git
cd claude-workbench
npm install
```

### Development

```bash
# Compile TypeScript then start the app
npm run build:ts
npm start

# Development mode (NODE_ENV=development)
npm run dev

# Type check
npm run typecheck

# Tests
npm test
```

### Build (Packaging)

```bash
npm run build
```

Build output is placed in the `build/` directory. (macOS DMG, Windows NSIS, Linux AppImage)

---

## Project Structure

```
claude-workbench/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts        # App entry point
│   │   ├── window.ts       # Window configuration
│   │   ├── handlers/       # IPC handlers
│   │   ├── services/       # Business logic
│   │   └── constants/      # Constants
│   ├── preload/            # Context bridge (secure IPC)
│   ├── renderer/           # UI (HTML/CSS/JS)
│   │   ├── locales/        # i18n locale files (en.json, ko.json)
│   │   └── scripts/        # Renderer scripts
│   └── shared/types/       # Shared type definitions
├── assets/                 # App icons (PNG, ICNS, ICO)
├── __tests__/              # Jest tests
└── docs/                   # Documentation & screenshots
```

---

## Tech Stack

- **Runtime**: Electron 28
- **Language**: TypeScript 5.9
- **Testing**: Jest + ts-jest
- **Packaging**: electron-builder
- **Security**: Context Isolation + Preload Script
- **AI SDK**: @anthropic-ai/claude-agent-sdk

---

## License

MIT
