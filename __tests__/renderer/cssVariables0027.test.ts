// claude-workbench/__tests__/renderer/cssVariables0027.test.ts
import * as fs from 'fs';
import * as path from 'path';

const STYLES_PATH = path.resolve(__dirname, '../../src/renderer/styles.css');

describe('SDD-0027: CSS 변수 통일 회귀 테스트', () => {
  let css: string;

  beforeAll(() => {
    css = fs.readFileSync(STYLES_PATH, 'utf-8');
  });

  // --- 신규 변수 선언 존재 검증 ---
  test('TC-01: dark 테마에 --badge-border: #5a4820 선언', () => {
    expect(/--badge-border:\s*#5a4820/.test(css)).toBe(true);
  });

  test('TC-02: light 테마에 --badge-border: #c8a870 선언', () => {
    expect(/--badge-border:\s*#c8a870/.test(css)).toBe(true);
  });

  test('TC-03: dark 테마에 --shadow-card-hover (0.12) 선언', () => {
    expect(/--shadow-card-hover:\s*0 2px 12px rgba\(196,\s*122,\s*42,\s*0\.12\)/.test(css)).toBe(true);
  });

  test('TC-04: light 테마에 --shadow-card-hover (0.18) 선언', () => {
    expect(/--shadow-card-hover:\s*0 2px 12px rgba\(196,\s*122,\s*42,\s*0\.18\)/.test(css)).toBe(true);
  });

  test('TC-05: dark 테마에 --danger-focus-ring (207,102,121,0.2) 선언', () => {
    expect(/--danger-focus-ring:\s*rgba\(207,\s*102,\s*121,\s*0\.2\)/.test(css)).toBe(true);
  });

  test('TC-06: light 테마에 --danger-focus-ring (192,57,43,0.18) 선언', () => {
    expect(/--danger-focus-ring:\s*rgba\(192,\s*57,\s*43,\s*0\.18\)/.test(css)).toBe(true);
  });

  // --- 하드코딩 제거 및 var() 참조 검증 ---
  test('TC-07/08: .dialog-warn — 하드코딩 제거, var(--danger-bg/border) 참조', () => {
    expect(/\.dialog-warn[\s\S]*?rgba\(207,\s*102,\s*121,\s*0\.12\)/.test(css)).toBe(false);
    expect(/\.dialog-warn[\s\S]*?var\(--danger-bg\)/.test(css)).toBe(true);
    expect(/\.dialog-warn[\s\S]*?var\(--danger-border\)/.test(css)).toBe(true);
  });

  test('TC-09: .wt-badge-running — #5a4820 제거, var(--badge-border) 참조', () => {
    expect(/\.wt-badge-running[\s\S]*?#5a4820/.test(css)).toBe(false);
    expect(/\.wt-badge-running[\s\S]*?var\(--badge-border\)/.test(css)).toBe(true);
  });

  test('TC-10: .cq-badge-running — #5a4820 제거, var(--badge-border) 참조', () => {
    expect(/\.cq-badge-running[\s\S]*?#5a4820/.test(css)).toBe(false);
    expect(/\.cq-badge-running[\s\S]*?var\(--badge-border\)/.test(css)).toBe(true);
  });

  test('TC-11: .set-card:hover — 리터럴 shadow 제거, var(--shadow-card-hover) 참조', () => {
    expect(/\.set-card:hover[\s\S]*?rgba\(196,\s*122,\s*42,\s*0\.12\)/.test(css)).toBe(false);
    expect(/\.set-card:hover[\s\S]*?var\(--shadow-card-hover\)/.test(css)).toBe(true);
  });

  test('TC-12: .wt-card:hover — 리터럴 shadow 제거, var(--shadow-card-hover) 참조', () => {
    expect(/\.wt-card:hover[\s\S]*?rgba\(196,\s*122,\s*42,\s*0\.12\)/.test(css)).toBe(false);
    expect(/\.wt-card:hover[\s\S]*?var\(--shadow-card-hover\)/.test(css)).toBe(true);
  });

  test('TC-13: .form-input.error — 리터럴 focus-ring 제거, var(--danger-focus-ring) 참조', () => {
    expect(/\.form-input\.error[\s\S]*?rgba\(207,\s*102,\s*121,\s*0\.2\)/.test(css)).toBe(false);
    expect(/\.form-input\.error[\s\S]*?var\(--danger-focus-ring\)/.test(css)).toBe(true);
  });
});
