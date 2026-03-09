// Test Design-0003: logFormatter.ts 단위 테스트
// TC-LF-01 ~ TC-LF-08

import { truncateLogContent, LOG_CONTENT_MAX_LENGTH } from '../../../src/main/utils/logFormatter';

describe('TC-LF-07: LOG_CONTENT_MAX_LENGTH 상수 값 검증', () => {
  it('LOG_CONTENT_MAX_LENGTH 는 100이어야 한다', () => {
    expect(LOG_CONTENT_MAX_LENGTH).toBe(100);
  });
});

describe('TC-LF-01: 100자 미만 문자열 — 원본 그대로 반환', () => {
  it('길이 50인 문자열은 원본 그대로 반환된다', () => {
    const input = 'a'.repeat(50);
    expect(truncateLogContent(input)).toBe(input);
  });

  it('길이 1인 문자열은 원본 그대로 반환된다', () => {
    expect(truncateLogContent('z')).toBe('z');
  });
});

describe('TC-LF-04: 빈 문자열 — 빈 문자열 반환', () => {
  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(truncateLogContent('')).toBe('');
  });
});

describe('TC-LF-02: 정확히 100자 문자열 — 원본 그대로 반환', () => {
  it('길이 100인 문자열은 말줄임표 없이 원본 반환된다', () => {
    const input = 'x'.repeat(100);
    expect(truncateLogContent(input)).toBe(input);
  });
});

describe('TC-LF-03: 101자 문자열 — 100자 + "..." = 103자 반환', () => {
  it('길이 101인 문자열은 앞 100자 + "..."로 반환된다', () => {
    const input = 'y'.repeat(101);
    const result = truncateLogContent(input);
    expect(result).toBe('y'.repeat(100) + '...');
    expect(result.length).toBe(103);
  });

  it('길이 200인 문자열도 앞 100자 + "..."로 반환된다', () => {
    const input = 'z'.repeat(200);
    const result = truncateLogContent(input);
    expect(result).toBe('z'.repeat(100) + '...');
  });
});

describe('TC-LF-05: maxLength=0 전달 — "..." 반환', () => {
  it('maxLength가 0이면 "..."를 반환한다', () => {
    expect(truncateLogContent('hello', 0)).toBe('...');
  });
});

describe('TC-LF-06: 커스텀 maxLength 사용', () => {
  it('maxLength=5이면 앞 5자 + "..."를 반환한다', () => {
    expect(truncateLogContent('abcdefghij', 5)).toBe('abcde...');
  });

  it('maxLength=5, 길이 4인 문자열은 원본 반환', () => {
    expect(truncateLogContent('abcd', 5)).toBe('abcd');
  });

  it('maxLength=5, 길이 5인 문자열은 원본 반환', () => {
    expect(truncateLogContent('abcde', 5)).toBe('abcde');
  });
});

describe('TC-LF-08: 멀티바이트(한글) 문자열 — UTF-16 코드 유닛 기준 축약', () => {
  it('한글 101자는 앞 100자 + "..."로 반환된다 (코드 유닛 기준)', () => {
    const input = '가'.repeat(101);
    const result = truncateLogContent(input);
    expect(result).toBe('가'.repeat(100) + '...');
  });

  it('한글 100자는 원본 그대로 반환된다', () => {
    const input = '가'.repeat(100);
    expect(truncateLogContent(input)).toBe(input);
  });
});
