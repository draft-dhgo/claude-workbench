import * as fs from 'fs';
import * as path from 'path';

const EN_PATH = path.resolve(__dirname, '../../src/renderer/locales/en.json');
const KO_PATH = path.resolve(__dirname, '../../src/renderer/locales/ko.json');

describe('i18n 테마 번역 키 검증', () => {
  let en: Record<string, string>;
  let ko: Record<string, string>;

  beforeAll(() => {
    en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    ko = JSON.parse(fs.readFileSync(KO_PATH, 'utf-8'));
  });

  const requiredKeys = ['theme.toggle', 'theme.dark', 'theme.light', 'theme.system'];

  // TC-THM-24: en.json에 테마 관련 번역 키 4개가 존재하는지
  test('TC-THM-24: en.json에 테마 관련 번역 키 4개가 존재한다', () => {
    for (const key of requiredKeys) {
      expect(key in en).toBe(true);
      expect(typeof en[key]).toBe('string');
      expect(en[key].trim()).not.toBe('');
    }
    expect(en['theme.toggle']).toBe('Toggle Theme');
  });

  // TC-THM-25: ko.json에 테마 관련 번역 키 4개가 존재하고 en.json과 키가 일치하는지
  test('TC-THM-25: ko.json에 테마 관련 번역 키 4개가 존재한다', () => {
    for (const key of requiredKeys) {
      expect(key in ko).toBe(true);
      expect(typeof ko[key]).toBe('string');
      expect(ko[key].trim()).not.toBe('');
    }
    expect(ko['theme.toggle']).toBe('테마 전환');
  });
});
