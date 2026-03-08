/**
 * @jest-environment jsdom
 */
'use strict';

const EN_MOCK = {
  'app.title': 'Electron App',
  'repos.add': 'Add Repository',
  'repos.empty': 'No repositories registered.',
  'repos.count': '{n} repositories registered',
  'btn.cancel': 'Cancel',
  'btn.save': 'Save',
  'repos.search.placeholder': 'Search repositories...',
  'existing.key': 'value'
};

const KO_MOCK = {
  'app.title': 'Electron 앱',
  'repos.add': '+ 저장소 추가',
  'repos.empty': '등록된 저장소가 없습니다.',
  'repos.count': '{n}개의 저장소가 등록되어 있습니다',
  'btn.cancel': '취소',
  'btn.save': '저장',
  'repos.search.placeholder': '저장소 검색...',
  'existing.key': '값'
};

describe('i18n module', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    document.documentElement.lang = '';
    document.body.innerHTML = `
      <select id="lang-select">
        <option value="en">English</option>
        <option value="ko">한국어</option>
      </select>
      <button id="add-repo-btn" data-i18n="repos.add">Add Repository</button>
      <input id="repo-search" data-i18n-placeholder="repos.search.placeholder">
      <p id="empty-msg" data-i18n="repos.empty"></p>
    `;
    global.fetch = jest.fn((url) => {
      const locale = url.includes('ko') ? KO_MOCK : EN_MOCK;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...locale })
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete window.i18n;
  });

  // Helper: load module and wait for async init
  async function loadI18n() {
    require('../../src/renderer/scripts/i18n.js');
    // flush promises (init() is async)
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    return window.i18n;
  }

  describe('t()', () => {
    // TC-01: 로케일 로드 후 키에 대응하는 번역 문자열 반환
    test('TC-01: t() — 로케일 로드 후 키 반환', async () => {
      const i18n = await loadI18n();
      // after init, locale should be EN_MOCK
      expect(i18n.t('repos.add')).toBe('Add Repository');
    });

    // TC-02: 로케일 미로드 상태에서 키 문자열 폴백 반환
    test('TC-02: t() — 로케일 미로드 시 키 폴백', () => {
      // Load module but DON'T await init (synchronous check before fetch resolves)
      require('../../src/renderer/scripts/i18n.js');
      const i18n = window.i18n;
      // _locale is {} initially; t() returns key
      expect(i18n.t('repos.empty')).toBe('repos.empty');
    });

    // TC-03: 번역 키 누락 시 키 문자열 폴백 + 콘솔 경고 출력
    test('TC-03: t() — 번역 키 누락 시 키 폴백 + console.warn', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const i18n = await loadI18n();
      const result = i18n.t('non.existent.key');
      expect(result).toBe('non.existent.key');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/non\.existent\.key/);
    });
  });

  describe('init() 자동 실행', () => {
    // TC-04: DOMContentLoaded 이전 상태에서 이벤트 리스너 등록
    test('TC-04: init() — readyState loading 시 DOMContentLoaded 후 fetch 호출', async () => {
      Object.defineProperty(document, 'readyState', {
        get: () => 'loading',
        configurable: true
      });
      require('../../src/renderer/scripts/i18n.js');
      // fetch should not have been called yet
      expect(global.fetch).not.toHaveBeenCalled();
      // Dispatch DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // restore
      Object.defineProperty(document, 'readyState', {
        get: () => 'complete',
        configurable: true
      });
    });

    // TC-05: DOMContentLoaded 이후(readyState complete) 즉시 실행
    test('TC-05: init() — readyState complete 시 즉시 fetch 호출 (en)', async () => {
      // jsdom default readyState is 'complete'
      await loadI18n();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('en.json'));
    });

    // TC-06: localStorage에 저장된 언어로 로케일 복원
    test('TC-06: init() — localStorage에 ko 저장 시 ko.json 로드', async () => {
      localStorage.setItem('app-lang', 'ko');
      const i18n = await loadI18n();
      expect(i18n.currentLang).toBe('ko');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('ko.json'));
    });
  });

  describe('setLang()', () => {
    // TC-07: 언어 변경 시 로케일 재로드 및 applyAll() 실행
    test('TC-07: setLang() — 언어 변경 후 DOM/lang/localStorage 갱신', async () => {
      const i18n = await loadI18n();
      await i18n.setLang('ko');
      const cancelBtn = document.querySelector('[data-i18n="btn.cancel"]');
      // btn.cancel 키가 DOM fixture에 없으므로 repos.add로 확인
      const addBtn = document.getElementById('add-repo-btn');
      expect(addBtn.textContent).toBe('+ 저장소 추가');
      expect(document.documentElement.lang).toBe('ko');
      expect(localStorage.getItem('app-lang')).toBe('ko');
    });

    // TC-08: 언어 전환 후 registerReRender 콜백 실행
    test('TC-08: setLang() — registerReRender 콜백 호출', async () => {
      const i18n = await loadI18n();
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      i18n.registerReRender(cb1);
      i18n.registerReRender(cb2);
      await i18n.setLang('ko');
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    // TC-09: 콜백 예외 발생 시 나머지 콜백 계속 실행
    test('TC-09: setLang() — 예외 콜백 이후에도 정상 콜백 실행', async () => {
      const i18n = await loadI18n();
      const throwingCb = jest.fn(() => { throw new Error('test error'); });
      const normalCb = jest.fn();
      i18n.registerReRender(throwingCb);
      i18n.registerReRender(normalCb);
      await i18n.setLang('ko');
      expect(throwingCb).toHaveBeenCalledTimes(1);
      expect(normalCb).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyAll()', () => {
    // TC-10: data-i18n 속성 DOM 요소 일괄 텍스트 갱신
    test('TC-10: applyAll() — data-i18n 속성 요소 textContent 갱신', async () => {
      const i18n = await loadI18n();
      const addBtn = document.getElementById('add-repo-btn');
      const emptyMsg = document.getElementById('empty-msg');
      expect(addBtn.textContent).toBe('Add Repository');
      expect(emptyMsg.textContent).toBe('No repositories registered.');
    });

    // TC-11: data-i18n-placeholder 속성 DOM 요소 갱신
    test('TC-11: applyAll() — data-i18n-placeholder 속성 요소 placeholder 갱신', async () => {
      const i18n = await loadI18n();
      const searchInput = document.getElementById('repo-search');
      expect(searchInput.placeholder).toBe('Search repositories...');
    });
  });

  describe('registerReRender()', () => {
    // TC-12: 콜백 등록 및 currentLang 접근
    test('TC-12: registerReRender() — 콜백 실행 시점에 currentLang이 변경된 언어', async () => {
      const i18n = await loadI18n();
      let captured = null;
      i18n.registerReRender(() => {
        captured = i18n.currentLang;
      });
      await i18n.setLang('ko');
      expect(captured).toBe('ko');
    });
  });
});
