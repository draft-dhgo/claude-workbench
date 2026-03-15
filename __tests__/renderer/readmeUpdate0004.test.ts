/**
 * Test Design-0004: README 업데이트 — UX 변경점 반영 및 스크린샷 교체 후 푸시
 * Source: SDD-0004
 * Strategy: Static file parsing — README.md text patterns + docs/ file existence
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const README_PATH = path.join(PROJECT_ROOT, 'README.md');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

let readmeContent: string;

beforeAll(() => {
  readmeContent = fs.readFileSync(README_PATH, 'utf-8');
});

// ---------------------------------------------------------------------------
// TC-README-01 ~ TC-README-09: README.md 텍스트 검증
// ---------------------------------------------------------------------------

describe('README.md — REQ-002 Command Queue 신규 항목', () => {
  test('TC-README-01: Log grouping 항목이 존재한다', () => {
    expect(readmeContent).toMatch(/Log grouping/);
  });

  test('TC-README-02: Color-coded logs 항목이 존재한다', () => {
    expect(readmeContent).toMatch(/Color-coded logs/);
  });

  test('TC-README-03: Expand / Collapse all 항목이 존재한다', () => {
    expect(readmeContent).toMatch(/Expand\s*\/\s*Collapse all/);
  });
});

describe('README.md — REQ-003 Workspace Management & Built-in Hosting 변경', () => {
  test('TC-README-04: in-app side panel 설명이 존재한다', () => {
    expect(readmeContent).toMatch(/in-app/);
  });

  test('TC-README-05: Open Wiki 버튼 항목이 존재한다', () => {
    expect(readmeContent).toMatch(/Open Wiki/);
  });

  test('TC-README-06: BrowserView 키워드가 존재한다', () => {
    expect(readmeContent).toMatch(/BrowserView/);
  });

  test('TC-README-07: Built-in Hosting 섹션에 In-app panel 항목이 존재한다', () => {
    expect(readmeContent).toMatch(/In-app panel/i);
  });

  test('TC-README-08: 서버 시작 시 자동 패널 열림 설명(automatically opens)이 존재한다', () => {
    expect(readmeContent).toMatch(/automatically opens/);
  });
});

describe('README.md — Regression: 기존 항목 유지', () => {
  test('TC-README-09: 기존 Wiki Hosting 항목이 여전히 존재한다', () => {
    expect(readmeContent).toMatch(/Wiki Hosting/);
  });
});

// ---------------------------------------------------------------------------
// TC-DOCS-01 ~ TC-DOCS-08: docs/ 스크린샷 파일 존재 확인
// ---------------------------------------------------------------------------

describe('docs/ — 교체 대상 스크린샷 파일 존재 확인', () => {
  const screenshotFiles = [
    'screenshot-workspace-create.png',
    'screenshot-queue.png',
    'screenshot-sets.png',
    'screenshot-wiki-hosting.png',
    'screenshot-main.png',
    'screenshot-worktree-manage.png',
    'screenshot-wiki-dashboard.png',
    'screenshot-wiki-trace.png',
  ];

  screenshotFiles.forEach((filename, idx) => {
    const tcId = `TC-DOCS-0${idx + 1}`;
    test(`${tcId}: ${filename} 파일이 존재한다`, () => {
      const filePath = path.join(DOCS_DIR, filename);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-README-REF-01: README 이미지 참조 파일 유효성 확인
// ---------------------------------------------------------------------------

describe('README.md — 이미지 참조 파일 유효성', () => {
  test('TC-README-REF-01: README의 모든 docs/ 이미지 참조가 실제 파일과 일치한다', () => {
    // Extract all docs/screenshot-*.png references (strip query strings like ?v=2)
    const imageRefRegex = /docs\/(screenshot-[^)?]+\.png)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = imageRefRegex.exec(readmeContent)) !== null) {
      matches.push(match[1]);
    }

    expect(matches.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const filename of matches) {
      const filePath = path.join(DOCS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        missing.push(filename);
      }
    }

    expect(missing).toEqual([]);
  });
});
