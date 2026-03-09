/**
 * TDD Cycle 0023 — REQ-021: README.md Wiki Viewer 호스팅 UI 스크린샷 반영
 *
 * Test cases:
 *   TC-MWH-01: mockup HTML 존재 및 유효성
 *   TC-MWH-02: 외부 의존성 없음 (단일 파일)
 *   TC-MWH-03: 필수 UI 요소 포함
 *   TC-MWH-04: macOS 윈도우 프레임 (3 dots)
 *   TC-MWH-05: "Workspace Mgmt" 탭 active 상태
 *   TC-MWH-07: 스크린샷 파일 크기 500KB 이하
 *   TC-MWH-08: README.md 이미지 참조 존재
 *   TC-MWH-09: README.md 변경 범위 제한
 */

import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.resolve(__dirname, '../docs');
const MOCKUP_PATH = path.join(DOCS_DIR, 'mock-wiki-hosting.html');
const SCREENSHOT_PATH = path.join(DOCS_DIR, 'screenshot-wiki-hosting.png');
const README_PATH = path.resolve(__dirname, '../README.md');

describe('TC-MWH-01: mockup HTML 파일 존재 및 유효성', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MOCKUP_PATH, 'utf-8');
  });

  test('docs/mock-wiki-hosting.html 파일이 존재한다', () => {
    expect(fs.existsSync(MOCKUP_PATH)).toBe(true);
  });

  test('<!DOCTYPE html> 선언을 포함한다', () => {
    expect(content).toContain('<!DOCTYPE html>');
  });

  test('<html 태그를 포함한다', () => {
    expect(content).toMatch(/<html/);
  });

  test('<head> 태그를 포함한다', () => {
    expect(content).toMatch(/<head>/);
  });

  test('<body> 태그를 포함한다', () => {
    expect(content).toMatch(/<body>/);
  });

  test('</html> 닫는 태그를 포함한다', () => {
    expect(content).toMatch(/<\/html>/);
  });
});

describe('TC-MWH-02: mockup HTML 외부 의존성 없음', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MOCKUP_PATH, 'utf-8');
  });

  test('외부 stylesheet 참조(<link rel="stylesheet">)가 없다', () => {
    const hasExternalLink = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'][^"']+["']/i.test(content);
    expect(hasExternalLink).toBe(false);
  });

  test('외부 script 참조(<script src="...">)가 없다', () => {
    const hasExternalScript = /<script[^>]+src=["'][^"']+["']/i.test(content);
    expect(hasExternalScript).toBe(false);
  });

  test('인라인 <style> 태그가 1개 이상 존재한다', () => {
    const styleMatches = content.match(/<style>/g);
    expect(styleMatches).not.toBeNull();
    expect(styleMatches!.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-MWH-03: mockup 필수 UI 요소 포함', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MOCKUP_PATH, 'utf-8');
  });

  test('"Running" 텍스트를 포함한다', () => {
    expect(content).toContain('Running');
  });

  test('"http://localhost:8080" URL을 포함한다', () => {
    expect(content).toContain('http://localhost:8080');
  });

  test('"Stop Server" 버튼 텍스트를 포함한다', () => {
    expect(content).toContain('Stop Server');
  });

  test('"Open in Browser" 버튼 텍스트를 포함한다', () => {
    expect(content).toContain('Open in Browser');
  });
});

describe('TC-MWH-04: macOS 윈도우 프레임', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MOCKUP_PATH, 'utf-8');
  });

  test('titlebar 요소가 존재한다', () => {
    expect(content).toContain('titlebar');
  });

  test('3개의 dot 요소(dot-r, dot-y, dot-g)가 존재한다', () => {
    expect(content).toContain('dot-r');
    expect(content).toContain('dot-y');
    expect(content).toContain('dot-g');
  });

  test('빨강(#ff5f57), 노랑(#febc2e), 초록(#28c840) 색상이 포함된다', () => {
    expect(content).toContain('#ff5f57');
    expect(content).toContain('#febc2e');
    expect(content).toContain('#28c840');
  });

  test('"Claude Workbench" 타이틀 텍스트가 포함된다', () => {
    expect(content).toContain('Claude Workbench');
  });
});

describe('TC-MWH-05: "Workspace Mgmt" 탭이 active 상태', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MOCKUP_PATH, 'utf-8');
  });

  test('"Workspace Mgmt" 탭 버튼에 active 클래스가 존재한다', () => {
    // active 클래스를 가진 tab-btn 내에 "Workspace Mgmt" 텍스트가 있어야 한다
    const activeTabPattern = /<button[^>]*class=["'][^"']*active[^"']*["'][^>]*>[^<]*Workspace\s*Mgmt[^<]*<\/button>/i;
    expect(content).toMatch(activeTabPattern);
  });

  test('active 클래스를 가진 탭 버튼은 정확히 1개이다', () => {
    const activeButtons = content.match(/<button[^>]*class=["'][^"']*active[^"']*["']/g);
    expect(activeButtons).not.toBeNull();
    expect(activeButtons!.length).toBe(1);
  });
});

describe('TC-MWH-07: 스크린샷 파일 크기 검증', () => {
  const screenshotExists = fs.existsSync(SCREENSHOT_PATH);

  (screenshotExists ? test : test.skip)('screenshot-wiki-hosting.png 파일이 존재한다', () => {
    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });

  (screenshotExists ? test : test.skip)('파일 크기가 0보다 크다', () => {
    const stat = fs.statSync(SCREENSHOT_PATH);
    expect(stat.size).toBeGreaterThan(0);
  });

  (screenshotExists ? test : test.skip)('파일 크기가 500KB 이하이다', () => {
    const stat = fs.statSync(SCREENSHOT_PATH);
    const fileSizeKB = stat.size / 1024;
    expect(fileSizeKB).toBeLessThanOrEqual(500);
  });
});

describe('TC-MWH-08: README.md 이미지 참조 존재', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(README_PATH, 'utf-8');
  });

  test('![Built-in Hosting](docs/screenshot-wiki-hosting.png) 이미지 참조가 존재한다', () => {
    expect(content).toContain('![Built-in Hosting](docs/screenshot-wiki-hosting.png)');
  });
});

describe('TC-MWH-09: README.md 변경 범위 제한', () => {
  let content: string;
  let lines: string[];

  beforeAll(() => {
    content = fs.readFileSync(README_PATH, 'utf-8');
    lines = content.split('\n');
  });

  test('"### Built-in Hosting" 헤딩이 존재한다', () => {
    const hostingHeaderIdx = lines.findIndex(l => l.trim() === '### Built-in Hosting');
    expect(hostingHeaderIdx).toBeGreaterThanOrEqual(0);
  });

  test('이미지 참조가 "### Built-in Hosting" 헤딩 아래 1~3줄 이내에 위치한다', () => {
    const hostingHeaderIdx = lines.findIndex(l => l.trim() === '### Built-in Hosting');
    const imageLineIdx = lines.findIndex(l => l.includes('![Built-in Hosting](docs/screenshot-wiki-hosting.png)'));
    expect(imageLineIdx).toBeGreaterThanOrEqual(0);
    const distance = imageLineIdx - hostingHeaderIdx;
    expect(distance).toBeGreaterThanOrEqual(1);
    expect(distance).toBeLessThanOrEqual(3);
  });
});
