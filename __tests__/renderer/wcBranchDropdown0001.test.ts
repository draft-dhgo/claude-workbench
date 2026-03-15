// __tests__/renderer/wcBranchDropdown0001.test.ts
// Test Design-0001 / SDD-0001: 워크트리 생성 탭 BASE BRANCH 드롭다운 CSS 변수 참조 수정

import * as fs from 'fs';
import * as path from 'path';

const STYLES_PATH = path.resolve(__dirname, '../../src/renderer/styles.css');

describe('SDD-0001: styles.css — wc-branch-dropdown CSS 변수 참조 수정', () => {
  let css: string;

  beforeAll(() => {
    css = fs.readFileSync(STYLES_PATH, 'utf-8');
  });

  // --- TC-01/02: 올바른 변수가 선언되어 있는지 검증 (regression guard) ---

  test('TC-01: --bg-card 변수가 styles.css에 선언되어 있다', () => {
    expect(/--bg-card\s*:/.test(css)).toBe(true);
  });

  test('TC-02: --bg-hover 변수가 styles.css에 선언되어 있다', () => {
    expect(/--bg-hover\s*:/.test(css)).toBe(true);
  });

  // --- TC-03/04: .wc-branch-dropdown 배경색 수정 검증 ---

  test('TC-03: .wc-branch-dropdown이 background: var(--bg-card)를 사용한다', () => {
    // .wc-branch-dropdown { ... background: var(--bg-card); ... }
    expect(/\.wc-branch-dropdown\s*\{[^}]*background:\s*var\(--bg-card\)/.test(css)).toBe(true);
  });

  test('TC-04: .wc-branch-dropdown에 잘못된 var(--card-bg) 참조가 없다', () => {
    expect(/\.wc-branch-dropdown\s*\{[^}]*var\(--card-bg\)/.test(css)).toBe(false);
  });

  // --- TC-05/06: .wc-branch-dropdown-item:hover hover 피드백 수정 검증 ---

  test('TC-05: .wc-branch-dropdown-item:hover가 background: var(--bg-hover)를 사용한다', () => {
    expect(/\.wc-branch-dropdown-item:hover\s*\{[^}]*background:\s*var\(--bg-hover\)/.test(css)).toBe(true);
  });

  test('TC-06: .wc-branch-dropdown-item:hover에 잘못된 var(--hover-bg) 참조가 없다', () => {
    expect(/\.wc-branch-dropdown-item:hover\s*\{[^}]*var\(--hover-bg\)/.test(css)).toBe(false);
  });

  // --- TC-07/08: .wc-repo-item:hover hover 피드백 수정 검증 ---

  test('TC-07: .wc-repo-item:hover가 background: var(--bg-hover)를 사용한다', () => {
    expect(/\.wc-repo-item:hover\s*\{[^}]*background:\s*var\(--bg-hover\)/.test(css)).toBe(true);
  });

  test('TC-08: .wc-repo-item:hover에 잘못된 var(--hover-bg) 참조가 없다', () => {
    expect(/\.wc-repo-item:hover\s*\{[^}]*var\(--hover-bg\)/.test(css)).toBe(false);
  });
});
