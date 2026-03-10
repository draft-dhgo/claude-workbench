// Test file for TC-I18N-01 through TC-I18N-17
// Tests buildDefaultClaudeMd, buildDefaultSkills, buildDefaultCommands lang parameter

let buildDefaultClaudeMd: (name: string, lang?: 'en' | 'ko') => string;
let buildDefaultSkills: (lang?: 'en' | 'ko') => Record<string, string>;
let buildDefaultCommands: (lang?: 'en' | 'ko') => Record<string, string>;

beforeEach(() => {
  jest.resetModules();
  const mod = require('../../../src/main/constants/claudeConfigDefaults');
  buildDefaultClaudeMd = mod.buildDefaultClaudeMd;
  buildDefaultSkills = mod.buildDefaultSkills;
  buildDefaultCommands = mod.buildDefaultCommands;
});

describe('buildDefaultClaudeMd', () => {
  it('lang=en 으로 호출 시 영어 콘텐츠를 반환한다 (TC-I18N-01)', () => {
    const result = buildDefaultClaudeMd('my-project', 'en');
    expect(typeof result).toBe('string');
    expect(result).toContain('my-project');
    expect(result.match(/[Rr]ules|[Cc]ommands|[Ss]kills/)).not.toBeNull();
    expect(result).not.toMatch(/워크스페이스 규칙|파이프라인 커맨드/);
  });

  it('lang=ko 으로 호출 시 한국어 콘텐츠를 반환한다 (TC-I18N-02)', () => {
    const result = buildDefaultClaudeMd('my-project', 'ko');
    expect(typeof result).toBe('string');
    expect(result).toContain('my-project');
    expect(result).toMatch(/워크스페이스 규칙|파이프라인/);
  });

  it('lang 미전달 시 영어 콘텐츠를 반환한다 (TC-I18N-03)', () => {
    const resultDefault = buildDefaultClaudeMd('test-workspace');
    const resultEn = buildDefaultClaudeMd('test-workspace', 'en');
    expect(resultDefault).toBe(resultEn);
    expect(resultDefault).toContain('test-workspace');
  });

  it('workspaceName이 en/ko 두 경우 모두 반환 문자열에 포함된다 (TC-I18N-04)', () => {
    const name = 'special-workspace-name';
    const enResult = buildDefaultClaudeMd(name, 'en');
    const koResult = buildDefaultClaudeMd(name, 'ko');
    expect(enResult).toContain(name);
    expect(koResult).toContain(name);
    expect(enResult).not.toBe(koResult);
  });

  it('workspaceName이 빈 문자열이어도 비어 있지 않은 Markdown을 반환한다 (TC-I18N-05)', () => {
    const enResult = buildDefaultClaudeMd('', 'en');
    const koResult = buildDefaultClaudeMd('', 'ko');
    expect(enResult.length).toBeGreaterThan(0);
    expect(koResult.length).toBeGreaterThan(0);
    expect(enResult.startsWith('#')).toBe(true);
    expect(koResult.startsWith('#')).toBe(true);
  });
});

describe('buildDefaultSkills', () => {
  it('lang=en 으로 호출 시 영어 콘텐츠 Record를 반환한다 (TC-I18N-06)', () => {
    const result = buildDefaultSkills('en');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(9);
    const values = Object.values(result);
    const hasEnglish = values.some(v => /[a-zA-Z]{5,}/.test(v));
    expect(hasEnglish).toBe(true);
  });

  it('lang=ko 으로 호출 시 한국어 콘텐츠 Record를 반환한다 (TC-I18N-07)', () => {
    const result = buildDefaultSkills('ko');
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(9);
    const values = Object.values(result);
    const hasKorean = values.some(v => /[가-힣]/.test(v));
    expect(hasKorean).toBe(true);
  });

  it('lang 미전달 시 buildDefaultSkills("en")과 동일한 결과를 반환한다 (TC-I18N-08)', () => {
    const defaultResult = buildDefaultSkills();
    const enResult = buildDefaultSkills('en');
    expect(JSON.stringify(defaultResult)).toBe(JSON.stringify(enResult));
  });

  it('en/ko 반환값이 서로 다르다 (실제 분기 확인) (TC-I18N-09)', () => {
    const enResult = buildDefaultSkills('en');
    const koResult = buildDefaultSkills('ko');
    expect(JSON.stringify(enResult)).not.toBe(JSON.stringify(koResult));
  });

  it('en/ko key 목록이 동일하다 (TC-I18N-16)', () => {
    const enKeys = Object.keys(buildDefaultSkills('en')).sort();
    const koKeys = Object.keys(buildDefaultSkills('ko')).sort();
    expect(enKeys).toEqual(koKeys);
  });
});

describe('buildDefaultCommands', () => {
  it('lang=en 으로 호출 시 영어 콘텐츠 Record를 반환한다 (TC-I18N-10)', () => {
    const result = buildDefaultCommands('en');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(Object.keys(result).length).toBe(6);
  });

  it('lang=ko 으로 호출 시 한국어 콘텐츠 Record를 반환한다 (TC-I18N-11)', () => {
    const result = buildDefaultCommands('ko');
    expect(Object.keys(result).length).toBe(6);
    const values = Object.values(result);
    const hasKorean = values.some(v => /[가-힣]/.test(v));
    expect(hasKorean).toBe(true);
  });

  it('lang 미전달 시 buildDefaultCommands("en")과 동일한 결과를 반환한다 (TC-I18N-12)', () => {
    const defaultResult = buildDefaultCommands();
    const enResult = buildDefaultCommands('en');
    expect(JSON.stringify(defaultResult)).toBe(JSON.stringify(enResult));
  });

  it('en/ko key 목록이 동일하고 value는 서로 다르다 (TC-I18N-17)', () => {
    const enResult = buildDefaultCommands('en');
    const koResult = buildDefaultCommands('ko');
    const enKeys = Object.keys(enResult).sort();
    const koKeys = Object.keys(koResult).sort();
    expect(enKeys).toEqual(koKeys);
    expect(JSON.stringify(enResult)).not.toBe(JSON.stringify(koResult));
  });
});
