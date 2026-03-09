/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';

const THEME_INIT_PATH = path.resolve(__dirname, '../../src/renderer/scripts/theme-init.js');

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
  return jest.fn().mockReturnValue({
    matches,
    addEventListener: jest.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: jest.fn(),
    _trigger: (newMatches: boolean) => {
      listeners.forEach(cb => cb({ matches: newMatches }));
    },
  });
}

describe('theme-init.js', () => {
  let script: string;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeAll(() => {
    script = fs.readFileSync(THEME_INIT_PATH, 'utf-8');
  });

  beforeEach(() => {
    // DOM 초기화
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('no-transition');
    // localStorage mock 설정
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    // matchMedia 기본 mock (dark preference)
    window.matchMedia = createMatchMediaMock(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC-THM-01: localStorage에 저장된 테마가 있으면 해당 테마를 data-theme에 설정하는지
  test('TC-THM-01: localStorage에 저장된 테마가 있으면 해당 테마를 data-theme에 설정한다', () => {
    localStorageMock.getItem.mockReturnValue('light');
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });

  // TC-THM-02: localStorage에 테마가 없고 OS가 라이트 테마이면 "light"를 설정하는지
  test('TC-THM-02: localStorage에 테마가 없고 OS가 라이트 테마이면 light를 설정한다', () => {
    localStorageMock.getItem.mockReturnValue(null);
    window.matchMedia = createMatchMediaMock(true);
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // TC-THM-03: localStorage에 테마가 없고 OS가 다크 테마이면 "dark"를 설정하는지
  test('TC-THM-03: localStorage에 테마가 없고 OS가 다크 테마이면 dark를 설정한다', () => {
    localStorageMock.getItem.mockReturnValue(null);
    window.matchMedia = createMatchMediaMock(false);
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // TC-THM-04: localStorage 접근이 예외를 던지면 OS 테마로 폴백하는지
  test('TC-THM-04: localStorage 접근이 예외를 던지면 OS 테마로 폴백한다', () => {
    localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    window.matchMedia = createMatchMediaMock(true);
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // TC-THM-05: localStorage와 matchMedia 모두 실패하면 기본값 "dark"를 설정하는지
  test('TC-THM-05: localStorage와 matchMedia 모두 실패하면 기본값 dark를 설정한다', () => {
    localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    window.matchMedia = jest.fn(() => { throw new Error('matchMedia not supported'); }) as any;
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // TC-THM-06: theme-init.js 실행 후 no-transition 클래스가 html 요소에 추가되는지
  test('TC-THM-06: theme-init.js 실행 후 no-transition 클래스가 html 요소에 추가된다', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    eval(script);
    expect(document.documentElement.classList.contains('no-transition')).toBe(true);
  });

  // TC-THM-26: localStorage에 유효하지 않은 값(corrupted)이 저장된 경우
  test('TC-THM-26: localStorage에 유효하지 않은 값이 저장되면 그대로 설정한다', () => {
    localStorageMock.getItem.mockReturnValue('blue');
    eval(script);
    expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
  });
});
