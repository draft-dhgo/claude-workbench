import * as fs from 'fs';
import * as path from 'path';

const STYLES_PATH = path.resolve(__dirname, '../../src/renderer/styles.css');

describe('styles.css 테마 변수 검증', () => {
  let css: string;

  beforeAll(() => {
    css = fs.readFileSync(STYLES_PATH, 'utf-8');
  });

  // TC-THM-17: styles.css에 [data-theme="dark"] 선택자 블록이 존재하는지
  test('TC-THM-17: [data-theme="dark"] 선택자 블록이 존재하고 필수 CSS 변수가 정의되어 있다', () => {
    expect(/\[data-theme="dark"\]\s*\{/.test(css)).toBe(true);
    expect(/--bg-primary:\s*#282420/.test(css)).toBe(true);
    expect(/--text-primary:\s*#f0e6d6/.test(css)).toBe(true);
    expect(/--accent-primary:\s*#c47a2a/.test(css)).toBe(true);
  });

  // TC-THM-18: styles.css에 [data-theme="light"] 선택자 블록이 존재하는지
  test('TC-THM-18: [data-theme="light"] 선택자 블록이 존재하고 필수 CSS 변수가 정의되어 있다', () => {
    expect(/\[data-theme="light"\]\s*\{/.test(css)).toBe(true);
    expect(/--bg-primary:\s*#f8f6f2/.test(css)).toBe(true);
    expect(/--text-primary:\s*#2c2418/.test(css)).toBe(true);
  });

  // TC-THM-19: styles.css에 .theme-toggle-btn 스타일이 정의되어 있는지
  test('TC-THM-19: .theme-toggle-btn 스타일이 정의되어 있다', () => {
    expect(/\.theme-toggle-btn\s*\{/.test(css)).toBe(true);
    expect(/\.theme-toggle-btn[^}]*cursor:\s*pointer/s.test(css)).toBe(true);
  });

  // TC-THM-20: styles.css에 no-transition 클래스와 전환 애니메이션 규칙이 정의되어 있는지
  test('TC-THM-20: transition 규칙과 no-transition 클래스가 정의되어 있다', () => {
    expect(/transition:[\s\S]*?background-color\s+0\.25s/.test(css)).toBe(true);
    expect(/html\.no-transition[\s\S]*?transition:\s*none\s*!important/.test(css)).toBe(true);
  });
});
