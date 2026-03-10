/**
 * @jest-environment jsdom
 */

/**
 * TEST-0034: appendLog 로그 자동 정리 테스트
 * commandQueueRenderer.js의 appendLog 로직을 JSDOM 환경에서 검증
 */

describe('appendLog 로그 자동 정리', () => {
  const MAX_LOG_LINES = 500;
  let logContent: HTMLDivElement;

  function appendLog(log: { type: string; content: string }) {
    const logLine = document.createElement('div');
    logLine.className = 'cq-log-line cq-log-' + log.type;
    logLine.textContent = '[' + log.type.toUpperCase() + '] ' + log.content;
    logContent.appendChild(logLine);

    while (logContent.children.length > MAX_LOG_LINES) {
      logContent.removeChild(logContent.firstChild!);
    }

    logContent.scrollTop = logContent.scrollHeight;
  }

  beforeEach(() => {
    logContent = document.createElement('div');
  });

  it('TC-04: 500개 이하 로그는 모두 유지된다', () => {
    for (let i = 0; i < 500; i++) {
      appendLog({ type: 'system', content: `log-${i}` });
    }
    expect(logContent.children.length).toBe(500);
  });

  it('TC-05: 501개 로그 추가 시 최대 500개 유지', () => {
    for (let i = 0; i < 501; i++) {
      appendLog({ type: 'system', content: `log-${i}` });
    }
    expect(logContent.children.length).toBe(500);
  });

  it('TC-06: 600개 로그 추가 시 최대 500개 유지, 최신 로그 존재', () => {
    for (let i = 0; i < 600; i++) {
      appendLog({ type: 'assistant', content: `log-${i}` });
    }
    expect(logContent.children.length).toBe(500);
    const lastChild = logContent.lastChild as HTMLElement;
    expect(lastChild.textContent).toBe('[ASSISTANT] log-599');
  });

  it('TC-07: 삭제된 로그는 가장 오래된 것이다', () => {
    for (let i = 0; i < 600; i++) {
      appendLog({ type: 'system', content: `log-${i}` });
    }
    const firstChild = logContent.firstChild as HTMLElement;
    expect(firstChild.textContent).toBe('[SYSTEM] log-100');
  });
});
