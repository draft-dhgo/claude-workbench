import * as fs from 'fs';
import * as path from 'path';

const INDEX_HTML_PATH = path.resolve(__dirname, '../../src/renderer/index.html');

describe('index.html 테마 구조 검증', () => {
  let html: string;

  beforeAll(() => {
    html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  });

  // TC-THM-21: index.html의 <head>에서 theme-init.js가 styles.css보다 먼저 로드되는지
  test('TC-THM-21: theme-init.js가 styles.css보다 먼저 로드된다', () => {
    const themeInitIdx = html.indexOf('theme-init.js');
    const stylesIdx = html.indexOf('styles.css');
    expect(themeInitIdx).toBeGreaterThan(-1);
    expect(stylesIdx).toBeGreaterThan(-1);
    expect(themeInitIdx).toBeLessThan(stylesIdx);
  });

  // TC-THM-22: index.html에 테마 토글 버튼 HTML이 존재하는지
  test('TC-THM-22: 테마 토글 버튼과 아이콘 요소가 존재한다', () => {
    expect(/id=["']theme-toggle-btn["']/.test(html)).toBe(true);
    expect(/id=["']theme-icon["']/.test(html)).toBe(true);
    expect(/data-i18n-title=["']theme\.toggle["']/.test(html)).toBe(true);
  });

  // TC-THM-23: index.html에 themeToggle.js 스크립트 태그가 존재하는지
  test('TC-THM-23: themeToggle.js 스크립트 태그가 존재한다', () => {
    expect(/scripts\/themeToggle\.js/.test(html)).toBe(true);
  });
});
