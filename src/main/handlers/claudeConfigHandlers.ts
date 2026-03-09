import fs = require('fs');
import path = require('path');
import { BrowserWindow } from 'electron';
import { buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands } from '../constants/claudeConfigDefaults';

async function handleDetect(event: any, data: { repoPaths: string[] }) {
  const sourcePath = data.repoPaths[0]
  const hasClaudeDir = fs.existsSync(path.join(sourcePath, '.claude'))
  const hasClaudeMd  = fs.existsSync(path.join(sourcePath, 'CLAUDE.md'))
  return { hasClaudeDir, hasClaudeMd }
}

async function handleCopyAll(event: any, data: { sourcePath: string; worktreePaths: string[]; overwrite: boolean }) {
  const { sourcePath, worktreePaths, overwrite } = data
  const succeeded: string[] = []
  const failed: { path: string; error: string }[] = []
  const skipped: string[] = []
  const hasClaudeDir = fs.existsSync(path.join(sourcePath, '.claude'))
  const hasClaudeMd  = fs.existsSync(path.join(sourcePath, 'CLAUDE.md'))

  const sendProgress = (payload: { worktreePath: string; status: string; message: string }) => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) windows[0].webContents.send('claude-config:progress', payload)
  }

  for (const worktreePath of worktreePaths) {
    sendProgress({ worktreePath, status: 'running', message: '복사 중...' })
    try {
      const dstClaudeDir = path.join(worktreePath, '.claude')
      const dstClaudeMd  = path.join(worktreePath, 'CLAUDE.md')
      const existsDir = fs.existsSync(dstClaudeDir)
      const existsMd  = fs.existsSync(dstClaudeMd)

      if ((existsDir || existsMd) && !overwrite) {
        skipped.push(worktreePath)
        sendProgress({ worktreePath, status: 'skipped', message: '이미 존재 (건너뜀)' })
        continue
      }

      if (hasClaudeDir) fs.cpSync(path.join(sourcePath, '.claude'), dstClaudeDir, { recursive: true })
      if (hasClaudeMd)  fs.copyFileSync(path.join(sourcePath, 'CLAUDE.md'), dstClaudeMd)
      succeeded.push(worktreePath)
      sendProgress({ worktreePath, status: 'success', message: '완료' })
    } catch (err: any) {
      failed.push({ path: worktreePath, error: err.message })
      sendProgress({ worktreePath, status: 'error', message: `오류: ${err.message}` })
    }
  }
  return { succeeded, failed, skipped }
}

type Lang = 'en' | 'ko';

function writeDefaultSkillsAndCommands(claudeDir: string, lang: Lang = 'en'): void {
  const skills = buildDefaultSkills(lang)
  const commands = buildDefaultCommands(lang)

  // Skills: .claude/skills/{name}/SKILL.md
  const skillsDir = path.join(claudeDir, 'skills')
  for (const [name, content] of Object.entries(skills)) {
    const skillDir = path.join(skillsDir, name)
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf8')
  }

  // Commands: .claude/commands/{name}.md
  const commandsDir = path.join(claudeDir, 'commands')
  fs.mkdirSync(commandsDir, { recursive: true })
  for (const [name, content] of Object.entries(commands)) {
    fs.writeFileSync(path.join(commandsDir, `${name}.md`), content, 'utf8')
  }
}

async function handleReset(event: any, data: { workspacePath?: string; lang?: Lang }) {
  const workspacePath = data && data.workspacePath
  if (!workspacePath) {
    return { success: false, failedStep: 'validation', error: '유효하지 않은 workspacePath' }
  }

  const lang: Lang = (data && data.lang) || 'en'
  const claudeDir = path.join(workspacePath, '.claude')
  const claudeMd = path.join(workspacePath, 'CLAUDE.md')
  const steps: { step: string; status: string; message: string }[] = []

  // Step 1: .claude/ 삭제
  const claudeDirExists = fs.existsSync(claudeDir)
  if (claudeDirExists) {
    try {
      fs.rmSync(claudeDir, { recursive: true, force: true })
      steps.push({ step: 'delete-claude-dir', status: 'success', message: '.claude/ 삭제 완료' })
    } catch (e: any) {
      return { success: false, failedStep: 'delete-claude-dir', error: e.message }
    }
  } else {
    steps.push({ step: 'delete-claude-dir', status: 'skipped', message: '.claude/ 폴더 없음' })
  }

  // Step 2: CLAUDE.md 삭제
  const claudeMdExists = fs.existsSync(claudeMd)
  if (claudeMdExists) {
    try {
      fs.rmSync(claudeMd, { force: true })
      steps.push({ step: 'delete-claude-md', status: 'success', message: 'CLAUDE.md 삭제 완료' })
    } catch (e: any) {
      return { success: false, failedStep: 'delete-claude-md', error: e.message }
    }
  } else {
    steps.push({ step: 'delete-claude-md', status: 'skipped', message: 'CLAUDE.md 없음' })
  }

  // Step 3: .claude/ 재생성 (skills + commands 포함)
  try {
    fs.mkdirSync(claudeDir, { recursive: true })
    writeDefaultSkillsAndCommands(claudeDir, lang)
    steps.push({ step: 'create-claude-dir', status: 'success', message: '.claude/ 재생성 완료 (skills 10개, commands 4개)' })
  } catch (e: any) {
    return { success: false, failedStep: 'create-claude-dir', error: e.message }
  }

  // Step 4: CLAUDE.md 재생성
  try {
    const workspaceName = path.basename(workspacePath)
    const defaultContent = buildDefaultClaudeMd(workspaceName, lang)
    fs.writeFileSync(claudeMd, defaultContent, 'utf8')
    steps.push({ step: 'create-claude-md', status: 'success', message: 'CLAUDE.md 재생성 완료' })
  } catch (e: any) {
    return { success: false, failedStep: 'create-claude-md', error: e.message }
  }

  // Step 5: wiki/ 전체 삭제 후 재생성
  try {
    const { buildWikiViewerHtml } = require('../constants/claudeConfigDefaults')
    const wikiDir = path.join(workspacePath, 'wiki')
    if (fs.existsSync(wikiDir)) {
      fs.rmSync(wikiDir, { recursive: true, force: true })
    }
    const wikiDirs = ['requirements', 'prd', 'specs', 'tests', 'tdd', 'deploy', 'bugfix', 'bugs', 'knowledge', 'mockups', 'views']
    for (const d of wikiDirs) {
      fs.mkdirSync(path.join(wikiDir, d), { recursive: true })
    }
    fs.writeFileSync(path.join(wikiDir, 'bugs', 'README.md'), '# Bug Reports\n\n| ID | 설명 | 상태 |\n|----|------|------|\n', 'utf-8')
    fs.writeFileSync(path.join(wikiDir, 'requirements', 'README.md'), '# Requirements\n\n| ID | 제목 | 상태 |\n|----|------|------|\n', 'utf-8')
    fs.writeFileSync(path.join(wikiDir, 'views', 'index.html'), buildWikiViewerHtml(), 'utf-8')
    steps.push({ step: 'rebuild-wiki', status: 'success', message: 'wiki/ 전체 재생성 완료' })
  } catch (e: any) {
    return { success: false, failedStep: 'rebuild-wiki', error: e.message }
  }

  return { success: true, steps }
}

export { handleDetect, handleCopyAll, handleReset };
