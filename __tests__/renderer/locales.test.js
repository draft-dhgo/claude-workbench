'use strict';
const fs = require('fs');
const path = require('path');

const EN_PATH = path.resolve(__dirname, '../../src/renderer/locales/en.json');
const KO_PATH = path.resolve(__dirname, '../../src/renderer/locales/ko.json');

describe('locales 파일 무결성', () => {
  let en, ko;

  beforeAll(() => {
    en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    ko = JSON.parse(fs.readFileSync(KO_PATH, 'utf-8'));
  });

  // TC-15: JSON 파싱 성공 (beforeAll에서 검증 — 파싱 실패 시 beforeAll에서 throw)
  test('TC-15: en.json과 ko.json이 유효한 JSON 형식', () => {
    expect(typeof en).toBe('object');
    expect(typeof ko).toBe('object');
    expect(en).not.toBeNull();
    expect(ko).not.toBeNull();
  });

  // TC-13: en.json과 ko.json의 최상위 키 집합 완전 일치
  test('TC-13: en.json과 ko.json의 최상위 키 집합 완전 일치', () => {
    const enKeys = new Set(Object.keys(en));
    const koKeys = new Set(Object.keys(ko));

    const onlyInEn = [...enKeys].filter(k => !koKeys.has(k));
    const onlyInKo = [...koKeys].filter(k => !enKeys.has(k));

    expect(onlyInEn).toEqual([]);
    expect(onlyInKo).toEqual([]);
  });

  // TC-14: en.json과 ko.json의 모든 값이 비어 있지 않음
  test('TC-14: en.json과 ko.json의 모든 값이 비어 있지 않음', () => {
    const emptyInEn = Object.entries(en)
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    const emptyInKo = Object.entries(ko)
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);

    expect(emptyInEn).toEqual([]);
    expect(emptyInKo).toEqual([]);
  });

  // TC-16: en.json의 보간 변수 패턴이 ko.json과 일치
  test('TC-16: en.json의 보간 변수 패턴이 ko.json과 일치', () => {
    const interpolationVarPattern = /\{(\w+)\}/g;

    function extractVars(str) {
      const vars = new Set();
      let m;
      while ((m = interpolationVarPattern.exec(str)) !== null) {
        vars.add(m[1]);
      }
      return vars;
    }

    const keysWithVarsInEn = Object.entries(en).filter(([, v]) =>
      typeof v === 'string' && /\{\w+\}/.test(v)
    );

    const mismatches = [];
    for (const [key, enVal] of keysWithVarsInEn) {
      const koVal = ko[key];
      if (!koVal) {
        mismatches.push({ key, reason: 'missing in ko' });
        continue;
      }
      // reset lastIndex between calls
      interpolationVarPattern.lastIndex = 0;
      const enVars = extractVars(enVal);
      interpolationVarPattern.lastIndex = 0;
      const koVars = extractVars(koVal);

      const onlyInEn = [...enVars].filter(v => !koVars.has(v));
      const onlyInKo = [...koVars].filter(v => !enVars.has(v));
      if (onlyInEn.length || onlyInKo.length) {
        mismatches.push({ key, onlyInEn, onlyInKo });
      }
    }

    expect(mismatches).toEqual([]);
  });
});
