/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';

const THEME_TOGGLE_PATH = path.resolve(__dirname, '../../src/renderer/scripts/themeToggle.js');

// localStorage mock
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
}

// matchMedia mock
function createMatchMediaMock(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mockFn = jest.fn().mockReturnValue({
    matches,
    addEventListener: jest.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: jest.fn(),
    _trigger: (newMatches: boolean) => {
      listeners.forEach(cb => cb({ matches: newMatches }));
    },
  });
  return mockFn;
}

describe('themeToggle.js', () => {
  let themeToggleScript: string;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeAll(() => {
    themeToggleScript = fs.readFileSync(THEME_TOGGLE_PATH, 'utf-8');
  });

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('no-transition');
    document.body.innerHTML = '';
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    // requestAnimationFrame mock - execute callbacks immediately
    window.requestAnimationFrame = jest.fn((cb) => { cb(0); return 0; }) as any;
    // matchMedia default mock
    window.matchMedia = createMatchMediaMock(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC-THM-07: 토글 버튼 클릭 시 다크 → 라이트로 전환되는지
  test('TC-THM-07: 토글 버튼 클릭 시 다크에서 라이트로 전환된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn">
        <span id="theme-icon">\uD83C\uDF19</span>
      </button>
    `;
    eval(themeToggleScript);
    document.getElementById('theme-toggle-btn')!.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // TC-THM-08: 토글 버튼 클릭 시 라이트 → 다크로 전환되는지
  test('TC-THM-08: 토글 버튼 클릭 시 라이트에서 다크로 전환된다', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\u2600\uFE0F</span></button>
    `;
    eval(themeToggleScript);
    document.getElementById('theme-toggle-btn')!.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // TC-THM-09: 토글 클릭 시 localStorage에 새 테마가 저장되는지
  test('TC-THM-09: 토글 클릭 시 localStorage에 새 테마가 저장된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\uD83C\uDF19</span></button>
    `;
    eval(themeToggleScript);
    localStorageMock.setItem.mockClear();
    document.getElementById('theme-toggle-btn')!.click();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  // TC-THM-10: localStorage.setItem이 예외를 던져도 테마 전환이 정상 동작하는지
  test('TC-THM-10: localStorage.setItem 예외에도 테마 전환이 동작한다', () => {
    localStorageMock.setItem.mockImplementation(() => { throw new Error('QuotaExceeded'); });
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\uD83C\uDF19</span></button>
    `;
    eval(themeToggleScript);
    document.getElementById('theme-toggle-btn')!.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // TC-THM-11: 토글 클릭 시 아이콘이 업데이트되는지 (다크→라이트: 달→해)
  test('TC-THM-11: 토글 클릭 시 아이콘이 달에서 해로 변경된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\uD83C\uDF19</span></button>
    `;
    eval(themeToggleScript);
    document.getElementById('theme-toggle-btn')!.click();
    const icon = document.getElementById('theme-icon')!.textContent;
    expect(icon).toBe('\u2600\uFE0F');
  });

  // TC-THM-12: 초기화 시 현재 테마에 맞는 아이콘이 설정되는지
  test('TC-THM-12: 초기화 시 다크 테마이면 달 아이콘이 설정된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon"></span></button>
    `;
    eval(themeToggleScript);
    expect(document.getElementById('theme-icon')!.textContent).toBe('\uD83C\uDF19');
  });

  test('TC-THM-12b: 초기화 시 라이트 테마이면 해 아이콘이 설정된다', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon"></span></button>
    `;
    eval(themeToggleScript);
    expect(document.getElementById('theme-icon')!.textContent).toBe('\u2600\uFE0F');
  });

  // TC-THM-13: OS 테마 변경 시 (localStorage 없음) 자동으로 테마가 전환되는지
  test('TC-THM-13: OS 테마 변경 시 localStorage 없으면 자동으로 테마가 전환된다', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const mediaQueryMock = createMatchMediaMock(false);
    window.matchMedia = mediaQueryMock;
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\u2600\uFE0F</span></button>
    `;
    eval(themeToggleScript);
    // OS 테마 변경 시뮬레이션 - dark으로 변경 (prefers-color-scheme: dark matches)
    const returnedMock = mediaQueryMock.mock.results[0].value;
    returnedMock._trigger(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.getElementById('theme-icon')!.textContent).toBe('\uD83C\uDF19');
  });

  // TC-THM-14: OS 테마 변경 시 (localStorage에 사용자 선택 있음) 무시되는지
  test('TC-THM-14: OS 테마 변경 시 localStorage에 사용자 선택 있으면 무시된다', () => {
    localStorageMock.getItem.mockReturnValue('light');
    const mediaQueryMock = createMatchMediaMock(false);
    window.matchMedia = mediaQueryMock;
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\u2600\uFE0F</span></button>
    `;
    eval(themeToggleScript);
    // OS 테마 변경 시뮬레이션
    const returnedMock = mediaQueryMock.mock.results[0].value;
    returnedMock._trigger(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.getElementById('theme-icon')!.textContent).toBe('\u2600\uFE0F');
  });

  // TC-THM-15: 초기화 시 no-transition 클래스가 제거되는지
  test('TC-THM-15: 초기화 시 no-transition 클래스가 제거된다', () => {
    document.documentElement.classList.add('no-transition');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\uD83C\uDF19</span></button>
    `;
    // Use immediate rAF mock (already set in beforeEach)
    eval(themeToggleScript);
    expect(document.documentElement.classList.contains('no-transition')).toBe(false);
  });

  // TC-THM-16: #theme-toggle-btn이 존재하지 않아도 에러 없이 초기화되는지
  test('TC-THM-16: 토글 버튼이 없어도 에러 없이 초기화된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = '';
    expect(() => eval(themeToggleScript)).not.toThrow();
  });

  // TC-THM-27: 빠른 연속 클릭 시 테마가 올바르게 토글되는지
  test('TC-THM-27: 빠른 연속 클릭 시 테마가 올바르게 토글된다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `
      <button id="theme-toggle-btn"><span id="theme-icon">\uD83C\uDF19</span></button>
    `;
    eval(themeToggleScript);
    localStorageMock.setItem.mockClear();
    const btn = document.getElementById('theme-toggle-btn')!;
    btn.click(); // dark → light
    btn.click(); // light → dark
    btn.click(); // dark → light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
  });

  // TC-THM-28: #theme-icon 요소가 없어도 토글이 정상 동작하는지
  test('TC-THM-28: 아이콘 요소가 없어도 토글이 정상 동작한다', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `<button id="theme-toggle-btn">Toggle</button>`;
    eval(themeToggleScript);
    expect(() => {
      document.getElementById('theme-toggle-btn')!.click();
    }).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });
});
